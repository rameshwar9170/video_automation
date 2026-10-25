import { Router } from 'express';
import {
  connectYouTube,
  youtubeCallback,
  getYouTubeChannel,
  disconnectYouTube,
  toggleAutoPublish,
} from '../controllers/youtube.controller';

const router = Router();

router.get('/connect', connectYouTube);
router.get('/callback', youtubeCallback);
router.get('/channel', getYouTubeChannel);
router.delete('/disconnect', disconnectYouTube);
router.post('/auto-publish', toggleAutoPublish);

export default router;
