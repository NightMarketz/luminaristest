import { Router } from 'express';
import { listReconcilePending, rescanReconcilePending } from '../controllers/reconcilePendingController';

/**
 * BE-INCR-RECONCILE-PENDING (nó C7, Fork 3-b). Mounted at `/api/reconcile-pending`
 * (routes/index.ts) — remember the 2-touch registration: the mount plus the OpenAPI doc blocks
 * in docs.paths.ts. `/rescan` is declared as its own static segment (mirrors `/api/payables/reconcile`)
 * — do NOT write the literal jsdoc-openapi tag in this prose, the generator globs routes/ and
 * would spread the comment string into `paths`.
 */
const router = Router();

router.get('/', listReconcilePending);
router.post('/rescan', rescanReconcilePending);

export default router;
