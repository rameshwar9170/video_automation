import { Router } from 'express';
import { getSettings, saveSettings } from '../controllers/settings.controller';

const router = Router();

router.get('/', getSettings);
router.post('/', saveSettings);
router.put('/', saveSettings);

export default router;
