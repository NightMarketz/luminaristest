import { Router } from 'express';
import { getKitTrace } from '../controllers/accountingKitController';

/**
 * Kit de setor (BE-INCR-KIT-SETOR, BRIEF §3.4). Registro em 2 toques: a montagem em routes/index.ts e os blocos OpenAPI
 * em docs.paths.ts. PR-6: só o rastro (as rotas de ajuste e de pendência são do PR-3/PR-4).
 */
const router = Router();
router.get('/trace', getKitTrace);

export default router;
