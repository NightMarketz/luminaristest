import { Router } from 'express';
import {
  confirmBankSettlement,
  listBankSettlements,
  rejectBankSettlement,
  retryBankSettlement,
  scanBankSettlements,
} from '../controllers/bankSettlementController';

/**
 * BE-INCR-BANK-SETTLEMENT (nó F7). Mounted at `/api/bank-settlements` (routes/index.ts) — registro em 2
 * toques: o mount aqui + os blocos de doc em docs.paths.ts. `/scan` é segmento estático declarado ANTES
 * de `/:id/*` (mesmo cuidado de `/api/reconcile-pending/rescan`). Não escreva o literal jsdoc-openapi
 * nesta prosa: o gerador globa routes/ e espalharia o comentário em `paths`.
 */
const router = Router();

router.get('/', listBankSettlements);
router.post('/scan', scanBankSettlements);
router.post('/:id/confirm', confirmBankSettlement);
router.post('/:id/reject', rejectBankSettlement);
router.post('/:id/retry', retryBankSettlement);

export default router;
