import { Router } from 'express';
import {
  emitFiscalDocument,
  getDfeStatus,
  getFiscalDocument,
  listFiscalDocuments,
  previewFiscalDocument,
} from '../controllers/fiscalDocumentController';

/**
 * BE-INCR-DFE (nó X10b, BRIEF item 38). Montada em `/api/nfe/dfe` a partir de `routes/nfe.ts`
 * (2º toque) — registro de rota em 2 TOQUES: este arquivo + o `router.use('/dfe', ...)` em nfe.ts.
 * Auth é deny-by-default no middleware — todas as rotas aqui nascem protegidas; a única pública
 * (webhook, F-DFE-12) é PR-3 e mora em `publicApiRoutes`, nunca aqui.
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
