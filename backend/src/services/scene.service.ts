import { Scene } from './script.service';
import { aiProvider } from '../providers/ai.provider';
import { logger } from '../utils/logger';

export interface SceneInstruction extends Scene {
  imagePrompt: string; // Optimized image generation prompt
  videoQuery?: string; // 1-3 concise keywords matching narration for real stock video search
  backupQuery?: string; // 1-2 broad fallback keywords (e.g. 'technology', 'phone', 'money')
}

class SceneService {
  /**
   * Enhance scene visual instructions into optimized video search keywords and image prompts
   * tightly aligned with the script's spoken narration.
   */
  async buildSceneInstructions(
    topic: string,
    scenes: Scene[],
    style: string
  ): Promise<SceneInstruction[]> {
    logger.info(`[Scene] Building ${scenes.length} script-aligned scene instructions (video + image)`);

    const prompt = `You are an elite stock footage director for viral YouTube Shorts.

Topic: "${topic}"
Style: ${style}

Your mission:
For each scene below, look at the SPOKEN NARRATION and generate concise, high-volume English search keywords so stock video engines (Pexels, Mixkit, Pixabay) find an exact real motion video clip matching the narration.

Rules:
1. "videoQuery": 1 to 3 SIMPLE, COMMON ENGLISH keywords depicting the physical action or subject mentioned in the narration.
   Examples:
   - If narration talks about scrolling on phone / checking phone -> "person phone" or "smartphone screen"
   - If narration talks about coding / programming / software -> "developer coding" or "typing laptop"
   - If narration talks about money / rich / finance -> "cash money" or "wallet credit card"
   - If narration talks about AI / robot / future -> "robot technology" or "artificial intelligence"
   - If narration talks about music / songs -> "headphones music" or "sound waves"
   - If narration talks about thinking / shock -> "thinking man" or "shocked person"
   ALWAYS in English, short & common. Avoid obscure words.
2. "backupQuery": 1 to 2 broad universal category keywords (e.g. "technology", "phone", "business", "computer", "money").
3. "imagePrompt": Detailed, cinematic prompt in English for 9:16 portrait visual fallback (vibrant lighting, ultra HD).

Scenes to analyze:
${scenes
  .map(
    (s, i) =>
      `Scene ${i + 1}:
- Spoken Narration: "${s.narration}"
- Visual Concept: "${s.visualInstruction}"`
  )
  .join('\n\n')}

Return JSON array:
[
  {
    "sceneNumber": 1,
    "videoQuery": "smartphone using",
    "backupQuery": "phone",
    "imagePrompt": "cinematic 9:16 portrait of..."
  }
]`;

    try {
      const enhanced = await aiProvider.generateJSON<
        { sceneNumber: number; videoQuery: string; backupQuery: string; imagePrompt: string }[]
      >(prompt);

      return scenes.map((scene) => {
        const item = enhanced.find((e) => e.sceneNumber === scene.sceneNumber);
        return {
          ...scene,
          videoQuery: item?.videoQuery || scene.visualInstruction,
          backupQuery: item?.backupQuery || 'technology',
          imagePrompt: item?.imagePrompt || scene.visualInstruction,
        };
      });
    } catch (err) {
      logger.warn(`[Scene] AI scene enhancement fallback: ${(err as Error).message}`);
      return scenes.map((scene) => ({
        ...scene,
        videoQuery: scene.visualInstruction,
        backupQuery: 'technology',
        imagePrompt: scene.visualInstruction,
      }));
    }
  }
}

export const sceneService = new SceneService();
