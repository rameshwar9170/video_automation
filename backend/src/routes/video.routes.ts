import { Router } from 'express';
import {
  getVideos,
  getVideoStats,
  getVideoById,
  getVideoStatus,
  generateVideo,
  retryVideo,
  publishVideoToYouTube,
} from '../controllers/video.controller';

const router = Router();

router.get('/stats', getVideoStats);
router.get('/', getVideos);
router.post('/generate', generateVideo);
router.get('/:id', getVideoById);
router.get('/:id/status', getVideoStatus);
router.post('/:id/retry', retryVideo);
router.post('/:id/publish', publishVideoToYouTube);

export default router;
