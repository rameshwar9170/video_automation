import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { schedulerService } from '../services/scheduler.service';
import { logger } from '../utils/logger';

export async function startScheduler(req: Request, res: Response): Promise<void> {
  try {
    const result = await schedulerService.start();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('[Scheduler] Start error', err);
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

export async function stopScheduler(req: Request, res: Response): Promise<void> {
  try {
    await schedulerService.stop();
    res.json({ success: true, message: 'Scheduler stopped' });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
}

export async function getSchedulerStatus(req: Request, res: Response): Promise<void> {
  try {
    const status = await schedulerService.getStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    logger.error('[Scheduler] Status error', err);
    res.json({ success: true, data: { enabled: false, running: false, nextRun: null } });
  }
}

export async function triggerNow(req: Request, res: Response): Promise<void> {
  try {
    await schedulerService.triggerNow();
    res.json({ success: true, message: 'Pipeline triggered manually' });
  } catch (err) {
    res.status(400).json({ success: false, message: (err as Error).message });
  }
}

export async function getResearchTopics(req: Request, res: Response): Promise<void> {
  try {
    const { date } = req.query;
    const start = date ? new Date(String(date)) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const topics = await prisma.topic.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { score: 'desc' },
    });

    res.json({ success: true, data: topics, meta: { count: topics.length } });
  } catch (err) {
    logger.error('[Research] getResearchTopics error', err);
    res.json({ success: true, data: [], meta: { count: 0 } });
  }
}
