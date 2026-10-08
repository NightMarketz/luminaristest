import { Router } from 'express';
import {
  getVigenteLegalParameter,
  listLegalParameters,
  listLegalParameterRecalcJobs,
  proposeLegalParameter,
  publishLegalParameter,
  revokeLegalParameter,
} from '../controllers/legalParameterController';

/**
 * Coeficientes de lei da plataforma (BE-INCR-LEGAL-PARAMS PR-1, item 11). Montada em `/api/legal-parameters`
 * (routes/index.ts); registro em 2 toques: a montagem e o bloco OpenAPI em docs.paths.ts. `/vigente` antes de `/:id`.
 */
const router = Router();

router.get('/', listLegalParameters);
router.get('/vigente', getVigenteLegalParameter);
router.get('/recalc-jobs', listLegalParameterRecalcJobs); // RECALC-STATUS — estático, antes de qualquer /:id
router.post('/', proposeLegalParameter);
router.post('/:id/publish', publishLegalParameter);
router.post('/:id/revoke', revokeLegalParameter);

export default router;
