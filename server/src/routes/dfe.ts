import { Router } from 'express';
import {
  cancelarFiscalDocument,
  consultarFiscalDocument,
  emitFiscalDocument,
  getDfeStatus,
  getFiscalDocument,
  listFiscalDocuments,
  previewFiscalDocument,
  receiveDfeWebhook,
  reenviarFiscalDocument,
  retornoManualUpload,
  eventoManualUpload,
  retornoManualFiscalDocument,
  rejeicaoManualFiscalDocument,
  cancelamentoManualFiscalDocument,
  getFichaFiscalDocument,
  substituirFiscalDocument,
  inutilizarNumeracao,
  listInutilizacoesPendentes,
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
router.post('/documents/:id/consultar', consultarFiscalDocument);
router.post('/documents/:id/reenviar', reenviarFiscalDocument);
router.post('/documents/:id/cancelar', cancelarFiscalDocument);
// BE-INCR-DFE-EVENTOS (nó X11, item 11) — substituição de NFS-e (DPS nova com o grupo subst; o e105102 vem do fisco).
router.post('/documents/:id/substituir', substituirFiscalDocument);
// BE-INCR-DFE-MANUAL (itens 11–14) — modo manual: o retorno vem do portal público, por upload do XML.
router.get('/documents/:id/ficha', getFichaFiscalDocument);
router.post('/documents/:id/retorno-manual', retornoManualUpload, retornoManualFiscalDocument);
router.post('/documents/:id/rejeicao-manual', rejeicaoManualFiscalDocument);
router.post('/documents/:id/cancelamento-manual', eventoManualUpload, cancelamentoManualFiscalDocument);
// BE-INCR-NFCE (nó X10a, itens 24–25) — inutilização de faixa de NF-e/NFC-e e lacunas de numeração (o sistema lista, o operador pede).
router.post('/inutilizacoes', inutilizarNumeracao);
router.get('/inutilizacoes/pendentes', listInutilizacoesPendentes);
// PÚBLICA (F-DFE-12) — listada em publicApiRoutes (middleware/auth.ts); NUNCA GET (HEAD deriva de
// GET no Express — memória critical-auth-bypass-case-sensitive-guard — por isso só POST aqui).
router.post('/webhook/:partner', receiveDfeWebhook);

export default router;
