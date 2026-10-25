import { prisma } from '../database/prisma';
import { aiProvider } from '../providers/ai.provider';
import { ResearchResult } from './research.service';
import { logger } from '../utils/logger';

export interface TopicCandidate {
  topic: string;
  freshness: number;
  interest: number;
  videoPotential: number;
  informationAvailable: number;
  originality: number;
  risk: number;
  score: number;
  sourceData: ResearchResult[];
}

export interface ChannelContext {
  niche: string;
  language: string;
  region: string;
  style: string;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'it', 'this', 'that', 'why', 'how', 'what', 'who',
  'when', 'where', 'will', 'can', 'new', 'top', 'best', 'year', '2026', 'about',
  'into', 'from', 'than', 'more', 'most', 'some', 'any', 'each', 'all', 'both'
]);

function extractKeywords(str: string): Set<string> {
  return new Set(
    str
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function isSimilarTopic(candidate: string, existing: string): boolean {
  const wordsA = extractKeywords(candidate);
  const wordsB = extractKeywords(existing);
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }

  const similarityA = common / wordsA.size;
  const similarityB = common / wordsB.size;
  // If more than 40% of key nouns/verbs overlap, it is duplicate/repetitive
  return Math.max(similarityA, similarityB) >= 0.40;
}

class TopicService {
  /**
   * Retrieve all previously covered topics and video titles to strictly avoid repeating.
   */
  async getPastTopics(): Promise<string[]> {
    const [pastTopics, pastVideos] = await Promise.all([
      prisma.topic.findMany({
        where: {
          OR: [
            { status: { in: ['USED', 'SELECTED'] } },
            { videos: { some: {} } },
            { usedAt: { not: null } },
            { selectedAt: { not: null } },
          ],
        },
        select: { topic: true },
        take: 60,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.video.findMany({
        select: { title: true },
        take: 40,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const all = [
      ...pastTopics.map((t) => t.topic.trim()),
      ...pastVideos.map((v) => (v.title || '').trim()),
    ].filter(Boolean);

    return Array.from(new Set(all));
  }

  /**
   * Extract candidate topics from research results using AI, strictly forbidding previously used topics.
   */
  async extractCandidates(
    results: ResearchResult[],
    context: ChannelContext,
    forbiddenTopics: string[] = []
  ): Promise<TopicCandidate[]> {
    const forbiddenSection =
      forbiddenTopics.length > 0
        ? `
PREVIOUSLY COVERED TOPICS (STRICTLY FORBIDDEN TO REPEAT OR REPHRASE):
${forbiddenTopics.slice(0, 30).map((t) => `- "${t}"`).join('\n')}

MANDATORY ANTI-DUPLICATION RULE:
You MUST NEVER propose any topic that repeats, summarizes, or resembles any topic from the list above!
If the research results talk about an already covered story (e.g. humanoid robots or Pentagon AI), SKIP IT entirely and extract unique, completely fresh topics or explore different cutting-edge technologies!
`
        : '';

    const prompt = `You are an elite YouTube Shorts topic strategist.
Channel Niche: ${context.niche}
Style: ${context.style}
Language: ${context.language}
${forbiddenSection}
Based on these research results, extract 8-12 completely FRESH, UNIQUE, and HIGH-INTRIGUE YouTube Shorts topics:
${results.map((r) => `- ${r.title}: ${r.summary.substring(0, 160)}`).join('\n')}

For each topic, score it (0-100) on:
- freshness: how recent/trending it is
- interest: audience interest level
- videoPotential: how well it works as a 30-60s short
- informationAvailable: how much factual content exists
- originality: uniqueness (must be 90+ if completely fresh)
- risk: content policy / copyright risk (lower = safer)

Calculate a composite score: (freshness*0.2 + interest*0.2 + videoPotential*0.25 + informationAvailable*0.2 + originality*0.1 - risk*0.05)

Return JSON array:
[{
  "topic": "...",
  "freshness": 85,
  "interest": 90,
  "videoPotential": 92,
  "informationAvailable": 88,
  "originality": 85,
  "risk": 10,
  "score": 87.5
}]`;

    let candidates: TopicCandidate[] = [];
    try {
      const parsed = await aiProvider.generateJSON<TopicCandidate[]>(prompt);
      if (Array.isArray(parsed) && parsed.length > 0) {
        candidates = parsed;
      }
    } catch (err) {
      logger.warn('[Topic] AI extraction failed, falling back to heuristic topic generation', err);
    }

    if (candidates.length === 0) {
      candidates = results.slice(0, 5).map((r, i) => ({
        topic: r.title.replace(/[^\w\s-]/gi, '').substring(0, 80).trim() || `${context.niche} Discovery #${i + 1}`,
        freshness: 90,
        interest: 85,
        videoPotential: 80,
        informationAvailable: 85,
        originality: 75,
        risk: 10,
        score: 82.5 - i * 2,
        sourceData: results,
      }));
    }

    return candidates.map((c) => ({ ...c, sourceData: results }));
  }

  /**
   * Remove topics already used or semantically similar to past channel topics.
   */
  async filterUsedTopics(
    candidates: TopicCandidate[],
    forbiddenTopics: string[]
  ): Promise<TopicCandidate[]> {
    const filtered = candidates.filter((c) => {
      if (c.risk >= 50) return false;

      const candLower = c.topic.toLowerCase().trim();

      for (const past of forbiddenTopics) {
        const pastLower = past.toLowerCase().trim();
        // Check exact match
        if (candLower === pastLower) {
          logger.info(`[Topic Deduplication] Rejected exact duplicate: "${c.topic}"`);
          return false;
        }

        // Check fuzzy semantic / keyword similarity
        if (isSimilarTopic(c.topic, past)) {
          logger.info(
            `[Topic Deduplication] Rejected similar topic: "${c.topic}" (collides with past topic: "${past}")`
          );
          return false;
        }
      }
      return true;
    });

    logger.info(`[Topic] ${filtered.length}/${candidates.length} candidates after strict deduplication`);
    return filtered;
  }

  /**
   * Select the best topic and persist to DB, guaranteeing no topic repetition.
   */
  async selectBestTopic(
    context: ChannelContext,
    rawResults: ResearchResult[]
  ): Promise<string> {
    const forbiddenTopics = await this.getPastTopics();
    logger.info(`[Topic Engine] Active anti-duplication registry: ${forbiddenTopics.length} previously covered topics`);

    const candidates = await this.extractCandidates(rawResults, context, forbiddenTopics);
    let filtered = await this.filterUsedTopics(candidates, forbiddenTopics);

    // If all research candidates collide, pick from emergency viral fresh topics
    if (filtered.length === 0) {
      logger.warn('[Topic Engine] All research candidates collided with past topics! Deploying fresh topic generator...');
      const freshIdeas = [
        'Top 3 Secret AI Websites in 2026 That Feel Illegal to Know',
        'How Quantum Computers Will Break Modern Passwords Overnight',
        '3 Hidden Smartphone Settings You Must Turn On Right Now',
        'The Bionic Eye Revolution: How Technology Cures Blindness',
        'Why 99% of People Are Using ChatGPT Completely Wrong',
        'The Mind-Bending Physics of Warp Drives and Faster Than Light Travel',
        '3 Free AI Coding Tools That Build Complete Apps In Seconds',
        'How Deepfake Voice Clones Are Bypassing Bank Security in 2026',
        'The Mystery of the James Webb Telescope: Galaxy Older Than The Universe?',
        'How AI Autonomous Agents Are Secretly Running Multimillion Dollar Companies',
      ];

      const novelIdea =
        freshIdeas.find((idea) => !forbiddenTopics.some((past) => isSimilarTopic(idea, past))) ||
        `Secret ${context.niche} Breakthrough: What You Must Know in ${new Date().getFullYear()}`;

      filtered = [
        {
          topic: novelIdea,
          freshness: 95,
          interest: 92,
          videoPotential: 94,
          informationAvailable: 90,
          originality: 95,
          risk: 5,
          score: 93.5,
          sourceData: rawResults,
        },
      ];
    }

    // Sort descending by score
    filtered.sort((a, b) => b.score - a.score);
    const best = filtered[0];

    logger.info(`[Topic Engine] Confirmed unique topic selected: "${best.topic}" (score: ${best.score})`);

    // Persist candidate and mark best as SELECTED
    await prisma.topic.create({
      data: {
        topic: best.topic,
        status: 'SELECTED',
        sourceData: JSON.stringify(best.sourceData ?? {}),
        freshness: best.freshness,
        interest: best.interest,
        videoPotential: best.videoPotential,
        informationAvailable: best.informationAvailable,
        originality: best.originality,
        risk: best.risk,
        score: best.score,
        selectedAt: new Date(),
      },
    });

    return best.topic;
  }
}

export const topicService = new TopicService();
