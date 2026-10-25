import axios from 'axios';
import { env } from '../config/env';
import { aiProvider } from '../providers/ai.provider';
import { logger } from '../utils/logger';

export interface ResearchResult {
  source: string;
  title: string;
  url: string;
  publishedAt?: string;
  summary: string;
  topicSignals: string[];
}

export interface ResearchContext {
  niche: string;
  language: string;
  region: string;
}

class ResearchService {
  /**
   * Step 1: Search Tavily for trending topics in the niche.
   */
  async searchTavily(query: string, maxResults = 10): Promise<ResearchResult[]> {
    logger.info(`[Research] Tavily search: "${query}"`);
    const res = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: env.TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const results: ResearchResult[] = res.data.results.map((r: any) => ({
      source: new URL(r.url).hostname,
      title: r.title,
      url: r.url,
      publishedAt: r.published_date,
      summary: r.content?.substring(0, 500) ?? '',
      topicSignals: [],
    }));

    return results;
  }

  /**
   * Step 2: Use Gemini to extract topic signals from raw results.
   */
  async extractTopicSignals(
    results: ResearchResult[],
    context: ResearchContext
  ): Promise<ResearchResult[]> {
    const prompt = `You are a YouTube Shorts topic researcher.
Niche: ${context.niche}
Language: ${context.language}
Region: ${context.region}

Here are recent web search results:
${results.map((r, i) => `${i + 1}. Title: ${r.title}\nSummary: ${r.summary}`).join('\n\n')}

For each result, extract 3-5 topic signals (keywords/themes relevant to creating a short video).
Return a JSON array: [{"index": 0, "topicSignals": ["signal1","signal2"]}, ...]`;

    try {
      const signals = await aiProvider.generateJSON<{ index: number; topicSignals: string[] }[]>(prompt);
      if (Array.isArray(signals)) {
        signals.forEach(({ index, topicSignals }) => {
          if (results[index] && Array.isArray(topicSignals)) results[index].topicSignals = topicSignals;
        });
      }
    } catch (err) {
      logger.warn('[Research] extractTopicSignals non-fatal error, using fallback signals', err);
      results.forEach((r) => {
        if (!r.topicSignals || r.topicSignals.length === 0) {
          r.topicSignals = [context.niche, 'News', 'Trending'];
        }
      });
    }
    return results;
  }

  /**
   * Main entry: research trending topics for the given niche.
   */
  async researchTrendingTopics(context: ResearchContext): Promise<ResearchResult[]> {
    // Rotate across diverse viral tech angles to ensure fresh discovery every run
    const currentHour = new Date().getHours();
    const day = new Date().getDate();
    const queryPools = [
      [
        `secret AI websites tools you never knew existed ${new Date().getFullYear()}`,
        `free AI tools that feel illegal to know trending`,
        `mind blowing AI websites ${context.niche}`,
      ],
      [
        `futuristic gadgets technology inventions ${new Date().getFullYear()}`,
        `shocking new technology breakthroughs this week`,
        `next generation tech innovations changing the world`,
      ],
      [
        `crazy space astronomy discoveries ${new Date().getFullYear()}`,
        `quantum computer physics breakthrough science`,
        `James Webb mystery discovery universe`,
      ],
      [
        `hidden smartphone features tricks you must turn on`,
        `secret software hacks and tips ${new Date().getFullYear()}`,
        `computer lifehacks tools to save hours`,
      ],
      [
        `dark side of technology cyber mystery`,
        `AI automation and futuristic robotics breakthroughs`,
        `latest ${context.niche} viral innovations this week`,
      ],
    ];

    const selectedPool = queryPools[(day + currentHour) % queryPools.length];
    const queries = selectedPool;

    const allResults: ResearchResult[] = [];
    for (const q of queries) {
      try {
        const r = await this.searchTavily(q, 5);
        allResults.push(...r);
      } catch (err) {
        logger.warn(`[Research] Tavily query failed: ${q}`, err);
      }
    }

    const unique = this.deduplicateResults(allResults);
    const withSignals = await this.extractTopicSignals(unique, context);
    logger.info(`[Research] Found ${withSignals.length} unique research results`);
    return withSignals;
  }

  /**
   * Deep research a specific selected topic for script facts.
   */
  async researchSelectedTopic(
    topic: string,
    context: ResearchContext
  ): Promise<ResearchResult[]> {
    logger.info(`[Research] Deep research: "${topic}"`);
    const queries = [
      `${topic} detailed explanation`,
      `${topic} facts and statistics`,
      `${topic} ${context.niche} impact`,
    ];

    const results: ResearchResult[] = [];
    for (const q of queries) {
      try {
        const r = await this.searchTavily(q, 5);
        results.push(...r);
      } catch (err) {
        logger.warn(`[Research] Deep search failed: ${q}`, err);
      }
    }

    return this.deduplicateResults(results);
  }

  private deduplicateResults(results: ResearchResult[]): ResearchResult[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  }
}

export const researchService = new ResearchService();
