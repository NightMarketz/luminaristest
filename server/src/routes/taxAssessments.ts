import { Router } from 'express';
import {
  confirmPisCofins,
  confirmTaxAssessment,
  getTaxAssessment,
  listTaxAssessments,
  previewPisCofins,
  previewTaxAssessment,
  reconcileTaxAssessmentProvisao,
} from '../controllers/taxAssessmentController';

/**
 * Apuração trimestral de IRPJ/CSLL (BE-INCR-TAX-ASSESSMENT Fase A PR-2, nó X7, itens 13, 14, 17). Montada em
 * `/api/accounting/tax-assessments` (routes/index.ts, ANTES de `/accounting`); registro em 2 toques: a montagem e os
 * blocos OpenAPI em docs.paths.ts. `/preview` estático antes de `/:id`. `/:id/provisao` = reconcile da provisão (PR-3, item 16).
 * X8 PR-2 (BE-INCR-PIS-COFINS itens 13, 14, 20): `/pis-cofins/preview` e `/pis-cofins`, estáticos, antes de `/:id`.
 */
const router = Router();

router.post('/preview', previewTaxAssessment);
router.post('/pis-cofins/preview', previewPisCofins);
router.post('/pis-cofins', confirmPisCofins);
router.get('/', listTaxAssessments);
router.post('/', confirmTaxAssessment);
router.get('/:id', getTaxAssessment);
router.post('/:id/provisao', reconcileTaxAssessmentProvisao);

export default router;
