import { Router } from 'express';
import { getFactory } from '../lib/factory';
import { createKitRoleOverrideController } from '../features/sectorKits/controllers/kitRoleOverrideController';
import { getKitTrace } from '../controllers/accountingKitController';

/**
 * Kit de setor (BE-INCR-KIT-SETOR, PR-3, item 22) — mounted at `/api/accounting-kit` (`routes/index.ts`). 2-touch
 * registration: this mount plus the OpenAPI doc blocks in `docs.paths.ts` (do NOT write the literal jsdoc-openapi
 * tag in this prose — the generator globs routes/ and would spread the comment string into the spec).
 */
const controller = createKitRoleOverrideController({
  buildService: (scope) => getFactory().getRoleAccountOverrideService(scope),
});

const router = Router();

router.get('/role-overrides', controller.listRoleOverrides);
router.put('/role-overrides/:role', controller.setRoleOverride);
router.delete('/role-overrides/:role', controller.removeRoleOverride);
router.get('/trace', getKitTrace); // PR-6, item 50

export default router;
