import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const settings = await prisma.channelSettings.findFirst();
    if (!settings) {
      res.json({ success: true, data: null });
      return;
    }
    let preferredTimes = ['01:00', '13:00'];
    if (typeof settings.preferredTimes === 'string') {
      try { preferredTimes = JSON.parse(settings.preferredTimes); } catch { /* ignore */ }
    } else if (Array.isArray(settings.preferredTimes)) {
      preferredTimes = settings.preferredTimes;
    }
    res.json({ success: true, data: { ...settings, preferredTimes } });
  } catch (err) {
    logger.error('[Settings] getSettings error', err);
    res.json({ success: true, data: null });
  }
}

export async function saveSettings(req: Request, res: Response): Promise<void> {
  try {
    const data = { ...req.body };
    if (Array.isArray(data.preferredTimes)) {
      data.preferredTimes = JSON.stringify(data.preferredTimes);
    }
    const existing = await prisma.channelSettings.findFirst();

    const settings = existing
      ? await prisma.channelSettings.update({ where: { id: existing.id }, data })
      : await prisma.channelSettings.create({ data });

    res.json({ success: true, data: settings });
  } catch (err) {
    logger.error('[Settings] saveSettings error', err);
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}
