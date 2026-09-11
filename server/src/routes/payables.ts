import { Router } from 'express';
import {
  createPayable,
  listPayables,
  getPayable,
  registerPayment,
  cancelPayable,
  cancelPayment,
  cancelSettlement,
  reconcilePayables,
} from '../controllers/payableController';

/**
 * Contas a Pagar (INCR-AP). Mounted at `/api/payables` (routes/index.ts) — remember the 2-touch
 * registration: the mount plus the
 * OpenAPI doc blocks in docs.paths.ts (do NOT write the literal jsdoc-openapi tag in this prose —
 * the generator globs routes/ and would spread the comment string into `paths`). `/reconcile` is
 * declared before the `/:id` routes so the static segment is never captured as an id.
 */
const router = Router();

router.post('/reconcile', reconcilePayables);
router.post('/', createPayable);
router.get('/', listPayables);
router.get('/:id', getPayable);
router.post('/:id/pay', registerPayment);
router.post('/:id/cancel', cancelPayable);
router.post('/:id/payments/:paymentId/cancel', cancelPayment);
// BE-INCR-PARTIAL-SETTLEMENT (F-PS10 → b, ACC-016): rota-irmã do comando de liquidação — mesmo serviço
// (`registerPayment`/`cancelPayment`, agora ≤ saldo). `/pay` e `/payments/:paymentId/cancel` ficam
// como estão (consumidor real: my-app/lib/services/accountsPayable.service.ts); a UI de parcial
// (F-PS6 → b, diferida) nasce contra estas.
router.post('/:id/settlements', registerPayment);
router.post('/:id/settlements/:settlementId/cancel', cancelSettlement);

export default router;
