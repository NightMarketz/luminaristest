import { Router } from 'express';
import { getAvailability, getFreeSlots, postHolidaySync } from '../controllers/schedulingController';

const router = Router();

// BE-INCR-ESCALA-BASE PR-3 — leitura da escala (itens 31–33).
router.get('/availability', getAvailability);
router.get('/free-slots', getFreeSlots);
// PR-4 — projeção dos feriados da borda na escala (item 40).
router.post('/holidays/sync', postHolidaySync);

export default router;
