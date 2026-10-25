import { Router } from 'express';
import {
  generateCartoonVideo,
  generateCartoonSeries,
  getCartoonVideos,
  getCartoonThemes,
  getCartoonChannelStatus,
  toggleCartoonAutoPublish,
  previewCartoonScript,
} from '../controllers/cartoon.controller';

const router = Router();

router.get('/videos', getCartoonVideos);
router.get('/themes', getCartoonThemes);
router.post('/generate', generateCartoonVideo);
router.post('/generate-series', generateCartoonSeries);
router.get('/channel', getCartoonChannelStatus);
router.post('/channel/auto-publish', toggleCartoonAutoPublish);
router.post('/script-preview', previewCartoonScript);

export default router;
