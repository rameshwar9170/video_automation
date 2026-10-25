import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { DIRS } from '../config/constants';
import { logger } from '../utils/logger';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

class VoiceProvider {
  private apiKey: string;
  private defaultVoiceId: string;

  constructor() {
    this.apiKey = env.ELEVENLABS_API_KEY;
    this.defaultVoiceId = env.ELEVENLABS_VOICE_ID;
  }

  /**
   * Convert text to speech via ElevenLabs and save to file.
   * Returns the output file path.
   */
  async textToSpeech(videoId: string, options: TTSOptions): Promise<string> {
    const voiceId = options.voiceId ?? this.defaultVoiceId;
    const outPath = path.join(DIRS.audio, `${videoId}.mp3`);
    await fs.mkdir(DIRS.audio, { recursive: true });

    logger.info(`[Voice] Generating audio for video ${videoId}`);

    // Use Liam (TX3LPaxmHKxFdv7VOQHJ) or configured voice for energetic human-like social media narration
    const targetVoiceId = options.voiceId || (this.defaultVoiceId === '21m00Tcm4TlvDq8ikWAM' ? 'TX3LPaxmHKxFdv7VOQHJ' : this.defaultVoiceId);

    const response = await axios.post(
      `${ELEVENLABS_BASE}/text-to-speech/${targetVoiceId}`,
      {
        text: options.text,
        model_id: options.modelId ?? 'eleven_turbo_v2_5',
        voice_settings: {
          stability: options.stability ?? 0.38,
          similarity_boost: options.similarityBoost ?? 0.82,
          style: 0.35,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
      }
    );

    await fs.writeFile(outPath, Buffer.from(response.data));
    logger.info(`[Voice] Audio saved: ${outPath}`);
    return outPath;
  }

  /** Get available voices from ElevenLabs. */
  async getVoices() {
    const res = await axios.get(`${ELEVENLABS_BASE}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });
    return res.data.voices;
  }
}

export const voiceProvider = new VoiceProvider();
