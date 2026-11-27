import { Router } from 'express';
import { getAvailability, getFreeSlots } from '../controllers/schedulingController';

const router = Router();

// BE-INCR-ESCALA-BASE PR-3 — leitura da escala (itens 31–33).
router.get('/availability', getAvailability);
router.get('/free-slots', getFreeSlots);

export default router;
