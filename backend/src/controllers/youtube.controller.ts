import { Request, Response } from 'express';
import { youtubeService } from '../services/youtube.service';
import { logger } from '../utils/logger';

export async function connectYouTube(req: Request, res: Response): Promise<void> {
  try {
    const { env } = await import('../config/env');
    if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === 'placeholder-client-id') {
      res.status(400).json({
        success: false,
        needsSetup: true,
        message: 'Google OAuth Client ID is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env',
      });
      return;
    }
    const target = typeof req.query.target === 'string' ? req.query.target : 'tech';
    const url = youtubeService.getConnectUrl(target);
    res.json({ success: true, data: { authUrl: url } });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

export async function youtubeCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code, state } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, message: 'Missing OAuth code' });
      return;
    }
    const targetChannel = state === 'cartoon' ? 'cartoon' : 'tech';
    const result = await youtubeService.handleCallback(code, targetChannel);
    // Redirect to respective frontend page after successful OAuth
    if (targetChannel === 'cartoon') {
      res.redirect(`${process.env.FRONTEND_URL}/cartoon?connected=true&channel=${encodeURIComponent(result.channelName)}`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/youtube?connected=true&channel=${encodeURIComponent(result.channelName)}`);
    }
  } catch (err) {
    logger.error('[YouTube] Callback error', err);
    res.redirect(`${process.env.FRONTEND_URL}/youtube?error=oauth_failed`);
  }
}

export async function getYouTubeChannel(req: Request, res: Response): Promise<void> {
  try {
    const target =
      typeof req.query.channelType === 'string'
        ? req.query.channelType
        : typeof req.query.target === 'string'
        ? req.query.target
        : 'tech';
    const status = await youtubeService.getChannelStatus(target);
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

export async function disconnectYouTube(req: Request, res: Response): Promise<void> {
  try {
    const target =
      typeof req.query.channelType === 'string'
        ? req.query.channelType
        : typeof req.query.target === 'string'
        ? req.query.target
        : 'tech';
    await youtubeService.disconnectChannel(target);
    res.json({ success: true, message: `YouTube (${target}) disconnected` });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

export async function toggleAutoPublish(req: Request, res: Response): Promise<void> {
  try {
    const target = typeof req.query.target === 'string' ? req.query.target : (req.body?.target || 'tech');
    const autoPublish = Boolean(req.body?.autoPublish);
    await youtubeService.updateAutoPublish(target, autoPublish);
    res.json({ success: true, autoPublish, target });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}
