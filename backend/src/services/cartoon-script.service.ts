import { aiProvider } from '../providers/ai.provider';
import { logger } from '../utils/logger';

export interface CartoonScene {
  sceneNumber: number;
  duration: number;
  narration: string;
  characterName?: string; // e.g. "Chintu", "Motu Halwai", "Kalu Bandar", "Narrator"
  voiceTone?: 'kid_squeaky' | 'uncle_funny_deep' | 'dramatic_narrator';
  characterAction: string;
  visualInstruction: string;
  caption: string;
}

export interface CartoonScriptOutput {
  title: string;
  hook: string;
  moralLesson?: string;
  script: string;
  scenes: CartoonScene[];
  totalDuration: number;
  episodeNumber?: number;
  totalEpisodes?: number;
}

export interface CartoonScriptContext {
  topic?: string;
  theme?: string; // e.g. "Indian Village Fables", "Clever Animals", "Magical Inventions", "Superhero Kids"
  language?: string;
  style?: string; // e.g. "3D Pixar Disney Style Animation", "Indian 3D Cartoon Animation"
  tone?: string;
  durationMin?: number;
  durationMax?: number;
  seriesTitle?: string;
  episodeNumber?: number;
  totalEpisodes?: number;
}

class CartoonScriptService {
  async generateCartoonScript(context: CartoonScriptContext): Promise<CartoonScriptOutput> {
    const topicOrTheme = context.topic || context.theme || 'Chintu and the Magical Jalebi';
    logger.info(`[Cartoon Script] Generating cartoon story for: "${topicOrTheme}" (Ep: ${context.episodeNumber || 1}/${context.totalEpisodes || 1})`);

    const isHindi =
      (context.language || 'Hindi').toLowerCase().includes('hindi') ||
      (context.language || '').toLowerCase().includes('hinglish');

    const languageDirective = isHindi
      ? `Language: High-energy, expressive conversational Hindi / Hinglish with popular Indian cartoon tropes (like Chhota Bheem / Motu Patlu / Akbar Birbal vibe). Use funny dialogues, witty punchlines, and dramatic Indian character exclamations like "Arre baap re!", "Yeh kya ho gaya bhai!", "Kamaal ho gaya!"`
      : `Language: ${context.language || 'English'}. Lively, expressive Indian cartoon storytelling with funny character dialogues.`;

    const episodicDirective =
      context.episodeNumber && context.totalEpisodes && context.totalEpisodes > 1
        ? `
EPISODIC CARTOON SERIES DIRECTIVE:
- This is EPISODE ${context.episodeNumber} OF ${context.totalEpisodes} in the series: "${context.seriesTitle || topicOrTheme}".
- Title format: "${context.seriesTitle || topicOrTheme} - Episode ${context.episodeNumber}"
- ${
            context.episodeNumber === 1
              ? `HOOK: Start with "Episode 1: [Dramatic Indian Cartoon Hook]". Set up the funny character dilemma.`
              : context.episodeNumber < context.totalEpisodes
              ? `HOOK: Start with "Episode ${context.episodeNumber}: [Escalation]". Recall the hilarious trouble from Episode ${context.episodeNumber - 1} instantly!`
              : `HOOK: Start with "Episode ${context.episodeNumber} (Final): [The Climax]". Deliver the ultimate funny resolution!`
          }
- ${
            context.episodeNumber < context.totalEpisodes
              ? `ENDING CLIFFHANGER (MUST-HAVE): End with a high-stakes funny cliffhanger! In Hindi: "Ab Chintu is musibat se kaise bachega? Janne ke liye Episode ${context.episodeNumber + 1} abhi dekho aur subscribe karo!"`
              : `ENDING: Give the hilarious moral conclusion and tell viewers to comment their favorite character and subscribe for the next series!`
          }
`
        : '';

    const isFactOrMystery =
      /fact|mystery|secret|theory|dark|power|battle|gadget|quiz|test|doraemon|shinchan|oggy/i.test(
        `${topicOrTheme} ${context.theme || ''}`
      );

    const factMysteryDirective = isFactOrMystery
      ? `
VIRAL CARTOON MYSTERY & POWER FACTS DIRECTIVE:
- This is a high-retention viral YouTube Shorts episode revealing dark secrets, hidden facts, or superpower/gadget mysteries from legendary cartoons (like Doraemon, Shinchan, Motu Patlu, Tom & Jerry, Chhota Bheem).
- Structure:
  * SCENE 1 (0-5s): High-voltage HOOK. Example: "Kya aapko pata hai Doraemon ka ye shocking secret 99% log nahi jante?" or "Doraemon ke pocket ka sabse dangerous gadget konsa hai?"
  * SCENE 2-3: The shocking reveal / dark theory or secret backstory explained vividly with 3D animated scene instructions.
  * SCENE 4-5: Power / Gadget breakdown or shocking twist that blows viewers' minds.
  * FINAL SCENE: Fact Test / interactive challenge to drive viral comments: "Ab aap batao: [Intriguing question about this cartoon]? Comment your answer! Subscribe to KathaCraft 3D for more cartoon secrets!"
- Dialogue: Narrator and cartoon characters reacting with shock, excitement, and comic intensity.
`
      : '';

    const prompt = `You are a legendary Indian 3D cartoon animator and director (in the style of modern 3D Pixar meets Indian animated fables).

Story Premise: "${topicOrTheme}"
Theme Category: ${context.theme || 'Indian 3D Cartoon Story'}
Animation Style: ${context.style || '3D Pixar Disney Style Indian Animation'}
Tone: ${context.tone || 'Playful, Funny & Dramatic with a great twist'}
Target Duration: ${context.durationMin || 35}-${context.durationMax || 50} seconds
${languageDirective}
${episodicDirective}
${factMysteryDirective}

Cartoon Character & Visual Alignment Rules:
1. CHARACTERS MUST STRICTLY MATCH THE STORY TOPIC:
   - If the premise is about a famous cartoon (e.g., Shinchan, Doraemon, Motu Patlu, Tom & Jerry, Oggy, Chhota Bheem): Use the ACTUAL characters from that franchise! (e.g. For Shinchan -> Shinchan, Misae, Hiroshi. For Doraemon -> Doraemon, Nobita, Gian. For Motu Patlu -> Motu, Patlu, Dr. Jhatka). DO NOT introduce Chintu or random unrelated characters into a famous cartoon story!
   - If the premise is an original Indian fable: Use original characters (e.g. Chintu, Motu Halwai, Kalu Bandar).
2. "characterName": The exact character speaking in this scene (e.g. "Shinchan", "Doraemon", "Nobita", "Chintu", or "Narrator").
3. "visualInstruction": MUST EXPLICITLY NAME AND VISUALLY DESCRIBE THE SPECIFIC CARTOON CHARACTER in this scene (e.g. "3D Pixar animation of Shinchan in red t-shirt and yellow shorts with funny shocked expression, Kasukabe house background, 9:16 vertical portrait" OR "3D Pixar animation of blue robot cat Doraemon pulling glowing gadget from 4D pocket, Nobita in round glasses screaming, 9:16 vertical portrait").
   CRITICAL: ALWAYS include the character name and their visual look in EVERY scene's visualInstruction!

Break into 5-7 scenes. Each scene: 4-6 seconds.

Return JSON:
{
  "title": "catchy title with episode tag if series",
  "hook": "opening 3 seconds hook",
  "moralLesson": "short funny or moral takeaway",
  "script": "full combined narration text with all character lines",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": 5,
      "narration": "opening story line",
      "characterName": "Narrator",
      "voiceTone": "dramatic_narrator",
      "characterAction": "Chintu looking shocked at a glowing sweet in the sweet shop",
      "visualInstruction": "3D Pixar Disney style animation of a cute Indian boy named Chintu with big expressive eyes and colorful kurta looking amazed at a glowing jalebi, vibrant Indian sweet shop bazaar, 9:16 vertical portrait",
      "caption": "[Narrator]: Chintu ki aisi kismat kabhi nahi dekhi hogi!"
    }
  ],
  "totalDuration": 45
}`;

    const result = await aiProvider.generateJSON<CartoonScriptOutput>(prompt);

    if (!result.scenes || result.scenes.length === 0) {
      throw new Error('Cartoon script generation returned no scenes');
    }

    logger.info(
      `[Cartoon Script] Generated ${result.scenes.length} animated scenes, ~${result.totalDuration}s`
    );
    return result;
  }
}

export const cartoonScriptService = new CartoonScriptService();
