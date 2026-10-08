import { Router } from 'express';
import {
  createParceria,
  deleteParceria,
  listParcerias,
  putSimplesHistorico,
  putSimplesSegregacao,
  updateParceria,
} from '../controllers/simplesController';

/**
 * Entradas da apuração do Simples Nacional (BE-INCR-SIMPLES-NACIONAL PR-2, nó X14, itens 10–13). Montada em
 * `/api/accounting/simples` (routes/index.ts, ANTES de `/accounting`); registro em 2 toques: a montagem e o bloco
 * OpenAPI em docs.paths.ts.
 */
const router = Router();

router.put('/historico/:competencia', putSimplesHistorico);
router.put('/segregacao/:competencia', putSimplesSegregacao);
router.post('/parcerias', createParceria);
router.get('/parcerias', listParcerias);
router.patch('/parcerias/:id', updateParceria);
router.delete('/parcerias/:id', deleteParceria);

export default router;
