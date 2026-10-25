import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class AIProvider {
  private genAI: GoogleGenerativeAI;
  private modelNames: string[];

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    // Verified models with full available active quota
    this.modelNames = [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemma-4-31b-it',
    ];
  }

  /**
   * Send a prompt and return the text response with retry and multi-model failover.
   */
  async generate(prompt: string): Promise<string> {
    logger.debug(`AI generate: ${prompt.substring(0, 80)}…`);
    let lastError: any;

    for (const modelName of this.modelNames) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        logger.debug(`[AI ${modelName}] response: ${text.substring(0, 80)}…`);
        return text;
      } catch (err: any) {
        lastError = err;
        const msg = err.message ?? '';
        logger.warn(`[AI ${modelName}] error: ${msg.slice(0, 70)}. Trying next model…`);
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    throw lastError;
  }

  /**
   * Generate and parse JSON response. Wraps in a JSON-enforcing prompt with robust extraction.
   */
  async generateJSON<T>(prompt: string): Promise<T> {
    const jsonPrompt = `${prompt}

IMPORTANT: Respond with valid JSON only. No markdown, no code fences, no explanation — just the raw JSON object.`;
    const text = await this.generate(jsonPrompt);
    // Strip code fences
    let clean = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // In case there is surrounding text, try extracting json array or object
    const jsonArrayMatch = clean.match(/\[[\s\S]*\]/);
    const jsonObjectMatch = clean.match(/\{[\s\S]*\}/);

    try {
      return JSON.parse(clean) as T;
    } catch {
      if (jsonArrayMatch) {
        return JSON.parse(jsonArrayMatch[0]) as T;
      }
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]) as T;
      }
      throw new Error(`Failed to parse AI JSON response: ${clean.substring(0, 200)}`);
    }
  }
}

export const aiProvider = new AIProvider();
