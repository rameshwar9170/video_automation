import './config/env'; // Validates env vars first
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import { ensureDirectories } from './utils/file-manager';

import settingsRoutes from './routes/settings.routes';
import videoRoutes from './routes/video.routes';
import youtubeRoutes from './routes/youtube.routes';
import researchRoutes from './routes/research.routes';
import cartoonRoutes from './routes/cartoon.routes';

const app = express();

import path from 'path';

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin === env.FRONTEND_URL
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/generated', express.static(path.resolve(__dirname, '../generated')));

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/settings', settingsRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/cartoon', cartoonRoutes);
app.use('/api', researchRoutes);

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────────────────────
async function cleanupStaleVideosOnStartup() {
  try {
    const { prisma } = await import('./database/prisma');
    const result = await prisma.video.updateMany({
      where: {
        status: {
          notIn: ['PUBLISHED', 'FAILED', 'READY_TO_PUBLISH'],
        },
      },
      data: {
        status: 'FAILED',
        errorMessage: 'Generation interrupted by system restart or process shutdown',
      },
    });
    if (result.count > 0) {
      logger.warn(`🧹 Cleaned up ${result.count} interrupted video generation(s) on startup`);
    }
  } catch (err) {
    logger.error('Failed to cleanup interrupted videos on startup', err);
  }
}

async function bootstrap() {
  await ensureDirectories();
  logger.info('📁 Generated directories ready');

  await cleanupStaleVideosOnStartup();

  // Periodic check for stalled generations (>15 mins without progress)
  setInterval(async () => {
    try {
      const { prisma } = await import('./database/prisma');
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const res = await prisma.video.updateMany({
        where: {
          status: {
            notIn: ['PUBLISHED', 'FAILED', 'READY_TO_PUBLISH'],
          },
          updatedAt: {
            lt: fifteenMinutesAgo,
          },
        },
        data: {
          status: 'FAILED',
          errorMessage: 'Generation timed out (stalled for more than 15 minutes)',
        },
      });
      if (res.count > 0) {
        logger.warn(`🧹 Automatically marked ${res.count} stalled generation(s) as FAILED`);
      }
    } catch (err) {
      logger.error('Error in periodic stale video cleanup', err);
    }
  }, 60 * 1000);

  app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`🚀 Backend running at http://localhost:${env.PORT}`);
    logger.info(`   Health: http://localhost:${env.PORT}/api/health`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', err);
  process.exit(1);
});
