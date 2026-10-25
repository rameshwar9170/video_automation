import { voiceProvider } from '../providers/voice.provider';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { fileExists } from '../utils/file-manager';

class VoiceService {
  /**
   * Generate voice audio for all narration and save the audio file.
   * Returns the path to the generated audio file.
   */
  async generateVoice(videoId: string, fullNarration: string): Promise<string> {
    logger.info(`[Voice] Starting TTS for video ${videoId}`);

    const audioPath = await voiceProvider.textToSpeech(videoId, {
      text: fullNarration,
    });

    const exists = await fileExists(audioPath);
    if (!exists) {
      throw new Error(`Audio file not created: ${audioPath}`);
    }

    // Update video record
    await prisma.video.update({
      where: { id: videoId },
      data: { audioPath },
    });

    logger.info(`[Voice] Audio ready: ${audioPath}`);
    return audioPath;
  }
}

export const voiceService = new VoiceService();
