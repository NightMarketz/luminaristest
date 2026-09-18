import { Router } from 'express';
import {
  emitFiscalDocument,
  getDfeStatus,
  getFiscalDocument,
  listFiscalDocuments,
  previewFiscalDocument,
} from '../controllers/fiscalDocumentController';

/**
 * BE-INCR-DFE (nó X10b, BRIEF item 38). Montada em `/api/nfe/dfe` direto em `routes/index.ts`
 * (2º toque, mesmo padrão flat de todo outro arquivo em routes/ — checado por
 * skill-audit/check-registries.mjs, que espera cada arquivo referenciado no índice central, não
 * aninhado dentro de outro router de feature). Auth é deny-by-default no middleware — todas as
 * rotas aqui nascem protegidas; a única pública (webhook, F-DFE-12) é PR-3 e mora em
 * `publicApiRoutes`, nunca aqui.
 *
 * A documentação OpenAPI destes paths vive em `docs.paths.ts` (não escreva jsdoc-openapi aqui).
 */
const router = Router();

router.get('/status', getDfeStatus);
router.post('/preview', previewFiscalDocument);
router.post('/documents', emitFiscalDocument);
router.get('/documents', listFiscalDocuments);
router.get('/documents/:id', getFiscalDocument);

export default router;
