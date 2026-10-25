import { aiProvider } from '../providers/ai.provider';
import { ResearchResult } from './research.service';
import { logger } from '../utils/logger';

export interface Scene {
  sceneNumber: number;
  duration: number;
  narration: string;
  visualInstruction: string;
  caption: string;
}

export interface ScriptOutput {
  hook: string;
  script: string;
  scenes: Scene[];
  totalDuration: number;
}

export interface ScriptContext {
  topic: string;
  researchFacts: ResearchResult[];
  style: string;
  language: string;
  durationMin: number;
  durationMax: number;
  niche: string;
  tone?: string;
  seriesTitle?: string;
  partNumber?: number;
  totalParts?: number;
}

class ScriptService {
  async generateScript(context: ScriptContext): Promise<ScriptOutput> {
    logger.info(`[Script] Generating for topic: "${context.topic}"`);

    const facts = context.researchFacts
      .slice(0, 8)
      .map((r) => `- ${r.title}: ${r.summary.substring(0, 200)}`)
      .join('\n');

    const isHindi =
      (context.language || '').toLowerCase().includes('hindi') ||
      (context.language || '').toLowerCase().includes('hinglish');

    const languageDirective = isHindi
      ? `Language: Natural, high-energy conversational Hindi / Hinglish. Write narration in Devanagari Hindi with popular English tech terms (like 'AI', 'tools', 'phone', 'future') that sound punchy and viral for Indian YouTube Shorts audiences.`
      : `Language: ${context.language}`;

    const seriesDirective =
      context.seriesTitle && context.partNumber && context.totalParts
        ? `
VIRAL MULTI-PART SERIES DIRECTIVE:
- This video is PART ${context.partNumber} OF ${context.totalParts} in the series: "${context.seriesTitle}".
- ${
            context.partNumber === 1
              ? `HOOK: Start with "Part 1: [Shocking Hook]". Establish the massive mystery or challenge.`
              : context.partNumber < context.totalParts
              ? `HOOK: Start with "Part ${context.partNumber}: [Twist/Escalation]". Recall the tension from Part ${context.partNumber - 1} instantly!`
              : `HOOK: Start with "Part ${context.partNumber} Final: [The Climax]". Deliver the ultimate payoff!`
          }
- ${
            context.partNumber < context.totalParts
              ? `ENDING CLIFFHANGER (MUST-HAVE): End abruptly with a massive curiosity cliffhanger pointing to Part ${context.partNumber + 1}! Example in Hindi: "Lekin iska sabse dangerous twist dekhne ke liye Part ${context.partNumber + 1} abhi check karo aur subscribe karo!"`
              : `FINAL CALL TO ACTION: Deliver the final answer clearly, and ask viewers to comment which topic series they want next and subscribe!`
          }
`
        : '';

    const prompt = `You are an elite viral YouTube Shorts scriptwriter.

Topic: "${context.topic}"
Niche: ${context.niche}
Style: ${context.style}
Tone: ${context.tone ?? 'Engaging'}
${languageDirective}
${seriesDirective}
Target duration: ${context.durationMin}-${context.durationMax} seconds

Research facts:
${facts || 'Use verified top facts on this topic.'}

Viral Scriptwriting Guidelines:
1. Hook (First 3 seconds): Must be an intense pattern interrupt or curiosity gap. NEVER start with "Hello dosto" or "Welcome". Jump straight into the shock value or core mystery!
2. Pacing: Short, energetic sentences. Every second must keep viewer hooked.
3. Call to Action: Exciting and concise.
4. Visual Instructions: Concrete visual motion descriptions in English (e.g. "close-up of person walking hurriedly in city", "robot moving hands").

Break it into 5-8 scenes. Each scene: 3-6 seconds.

Return JSON:
{
  "hook": "opening hook sentence",
  "script": "full narration text",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": 5,
      "narration": "exactly what is said",
      "visualInstruction": "detailed description for image generation (be specific, cinematic, 9:16 portrait)",
      "caption": "on-screen text (short)"
    }
  ],
  "totalDuration": 45
}`;

    const result = await aiProvider.generateJSON<ScriptOutput>(prompt);

    // Validate scenes exist
    if (!result.scenes || result.scenes.length === 0) {
      throw new Error('Script generation returned no scenes');
    }

    logger.info(
      `[Script] Generated ${result.scenes.length} scenes, ~${result.totalDuration}s`
    );
    return result;
  }
}

export const scriptService = new ScriptService();
