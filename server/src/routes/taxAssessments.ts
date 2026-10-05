import { Router } from 'express';
import {
  confirmTaxAssessment,
  getTaxAssessment,
  listTaxAssessments,
  previewTaxAssessment,
  reconcileTaxAssessmentProvisao,
} from '../controllers/taxAssessmentController';

/**
 * Apuração trimestral de IRPJ/CSLL (BE-INCR-TAX-ASSESSMENT Fase A PR-2, nó X7, itens 13, 14, 17). Montada em
 * `/api/accounting/tax-assessments` (routes/index.ts, ANTES de `/accounting`); registro em 2 toques: a montagem e os
 * blocos OpenAPI em docs.paths.ts. `/preview` estático antes de `/:id`. `/:id/provisao` = reconcile da provisão (PR-3, item 16).
 */
const router = Router();

router.post('/preview', previewTaxAssessment);
router.get('/', listTaxAssessments);
router.post('/', confirmTaxAssessment);
router.get('/:id', getTaxAssessment);
router.post('/:id/provisao', reconcileTaxAssessmentProvisao);

export default router;
