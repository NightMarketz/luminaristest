import { Router } from 'express';
import {
  createParceria,
  deleteParceria,
  listParcerias,
  getSimplesHistorico,
  getSimplesSegregacao,
  putSimplesHistorico,
  putSimplesSegregacao,
  updateParceria,
  calcularApuracaoSimples,
  getApuracaoSimples,
  putDasSimples,
  getAliquotasSimples,
  getDasnSimei,
  putDasnSimei,
  getDefis,
  putDefis,
} from '../controllers/simplesController';

/**
 * Entradas da apuração do Simples Nacional (BE-INCR-SIMPLES-NACIONAL PR-2, nó X14, itens 10–13). Montada em
 * `/api/accounting/simples` (routes/index.ts, ANTES de `/accounting`); registro em 2 toques: a montagem e o bloco
 * OpenAPI em docs.paths.ts.
 */
const router = Router();

router.put('/historico/:competencia', putSimplesHistorico);
router.put('/segregacao/:competencia', putSimplesSegregacao);
// BE-INCR-SIMPLES-GET-ENTRADAS (itens 1–2) — leitura por competência; 404 sem registro (F-GE-1).
router.get('/historico/:competencia', getSimplesHistorico);
router.get('/segregacao/:competencia', getSimplesSegregacao);
router.post('/parcerias', createParceria);
router.get('/parcerias', listParcerias);
router.patch('/parcerias/:id', updateParceria);
router.delete('/parcerias/:id', deleteParceria);
// PR-3 (itens 17–19)
router.post('/apuracoes/:competencia/calcular', calcularApuracaoSimples);
router.get('/apuracoes/:competencia', getApuracaoSimples);
router.put('/apuracoes/:competencia/das', putDasSimples);
// PR-4 (itens 27–29)
router.get('/aliquotas/:competencia', getAliquotasSimples);
router.get('/dasn-simei/:ano', getDasnSimei);
router.put('/dasn-simei/:ano', putDasnSimei);
router.get('/defis/:ano', getDefis);
router.put('/defis/:ano', putDefis);

export default router;
