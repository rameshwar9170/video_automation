import { Router } from 'express';
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerNow,
  getResearchTopics,
} from '../controllers/research.controller';

const router = Router();

// Scheduler
router.post('/scheduler/start', startScheduler);
router.post('/scheduler/stop', stopScheduler);
router.get('/scheduler/status', getSchedulerStatus);
router.post('/scheduler/trigger', triggerNow);

// Research / Topics
router.get('/topics', getResearchTopics);

export default router;
