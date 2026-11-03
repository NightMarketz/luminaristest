import { Router } from 'express';
import { createReinfBatch, getReinfBatch, listReinfBatches } from '../controllers/reinfBatchController';

/**
 * Lotes da EFD-Reinf (BE-INCR-EFD-REINF PR-1, nó EFD-REINF, item 11). Montada em `/api/accounting/reinf/batches`
 * (routes/index.ts, ANTES de `/accounting`); registro em 2 toques: a montagem e o bloco OpenAPI em docs.paths.ts.
 */
const router = Router();

router.post('/', createReinfBatch);
router.get('/', listReinfBatches);
router.get('/:id', getReinfBatch);

export default router;
