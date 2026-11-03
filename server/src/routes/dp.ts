import { Router } from 'express';
import { activateDpModule, endDpModuleActivation, listDpModuleActivations, listDpModules } from '../controllers/dpModuleController';

/**
 * Departamento Pessoal, núcleo (nó PES-4, BE-INCR-DP-F0-F1). Montada em `/api/dp` (routes/index.ts); registro em 2
 * toques: a montagem e o bloco OpenAPI em `routes/docs/dp.paths.ts`. Estáticas antes de `/:id`.
 */
const router = Router();

// PR-1 (item 15) — submódulos opcionais e ativação por competência.
router.get('/modules', listDpModules);
router.get('/modules/activations', listDpModuleActivations);
router.post('/modules/activations', activateDpModule);
router.post('/modules/activations/:id/end', endDpModuleActivation);

export default router;
