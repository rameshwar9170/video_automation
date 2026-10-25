import cron from 'node-cron';
import { prisma } from '../database/prisma';
import { pipelineService } from './pipeline.service';
import { logger } from '../utils/logger';

class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  /**
   * Start the autonomous scheduler based on channel settings.
   */
  async start(): Promise<{ enabled: boolean; nextRun: string; schedule: string }> {
    let settings = await prisma.channelSettings.findFirst();
    if (!settings) {
      settings = await prisma.channelSettings.create({
        data: {
          niche: 'AI & Technology',
          language: 'English',
          region: 'Global',
          preferredTimes: JSON.stringify(['01:00', '13:00']),
        },
      });
    }

    // Parse preferred times and build cron expressions
    const rawTimes = settings.preferredTimes;
    let times: string[] = ['01:00', '13:00'];
    if (Array.isArray(rawTimes)) {
      times = rawTimes as string[];
    } else if (typeof rawTimes === 'string') {
      try {
        const parsed = JSON.parse(rawTimes);
        if (Array.isArray(parsed)) times = parsed;
        else times = rawTimes.split(',').map((s) => s.trim());
      } catch {
        times = rawTimes.split(',').map((s) => s.trim());
      }
    }
    times = times.filter((t) => typeof t === 'string' && t.includes(':'));
    if (times.length === 0) times = ['01:00', '13:00'];

    const schedules: string[] = times.map((t) => {
      const [hour, minute] = t.split(':').map(Number);
      return `${minute} ${hour} * * *`;
    });

    // Clear existing tasks
    await this.stop();

    schedules.forEach((schedule, i) => {
      const task = cron.schedule(schedule, async () => {
        if (this.isRunning) {
          logger.warn('[Scheduler] Pipeline already running — skipping this slot');
          return;
        }
        logger.info(`[Scheduler] Triggered at ${times[i]}`);
        this.isRunning = true;
        try {
          await pipelineService.runPipeline();
        } finally {
          this.isRunning = false;
        }
      });
      this.tasks.set(schedule, task);
      logger.info(`[Scheduler] Task registered: ${schedule} (${times[i]})`);
    });

    // Update settings
    const nextTime = times[0];
    const [h, m] = nextTime.split(':').map(Number);
    const nextRun = new Date();
    nextRun.setHours(h, m, 0, 0);
    if (nextRun < new Date()) nextRun.setDate(nextRun.getDate() + 1);

    await prisma.channelSettings.update({
      where: { id: settings.id },
      data: { autonomousModeEnabled: true, schedulerNextRun: nextRun },
    });

    logger.info(`[Scheduler] Started — next run: ${nextRun.toISOString()}`);
    return {
      enabled: true,
      nextRun: nextRun.toISOString(),
      schedule: schedules.join(', '),
    };
  }

  /**
   * Stop all scheduled tasks.
   */
  async stop(): Promise<void> {
    this.tasks.forEach((task) => task.stop());
    this.tasks.clear();

    const settings = await prisma.channelSettings.findFirst();
    if (settings) {
      await prisma.channelSettings.update({
        where: { id: settings.id },
        data: { autonomousModeEnabled: false, schedulerNextRun: null },
      });
    }
    logger.info('[Scheduler] Stopped');
  }

  /**
   * Get current scheduler status.
   */
  async getStatus(): Promise<{ enabled: boolean; running: boolean; nextRun?: string | null }> {
    const settings = await prisma.channelSettings.findFirst();
    return {
      enabled: settings?.autonomousModeEnabled ?? false,
      running: this.isRunning,
      nextRun: settings?.schedulerNextRun?.toISOString() ?? null,
    };
  }

  /**
   * Manually trigger one pipeline run immediately.
   */
  async triggerNow(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Pipeline is already running');
    }
    this.isRunning = true;
    pipelineService.runPipeline(undefined, true).finally(() => {
      this.isRunning = false;
    });
  }
}

export const schedulerService = new SchedulerService();
