import { Router } from 'express';
import { activateDpModule, endDpModuleActivation, listDpModuleActivations, listDpModules } from '../controllers/dpModuleController';
import { dpCargos, dpConvencaoParametros, dpConvencoes, dpJornadas, dpLotacoes, dpSindicatos } from '../controllers/dpCadastrosController';
import { dpTrabalhadores, dpVinculos } from '../controllers/dpVinculoController';
import { listDpRubricas } from '../controllers/dpRubricaController';

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

// PR-3 (item 35) — cadastros de estrutura: CRUD de lotação, cargo, jornada, sindicato e convenção (+ parâmetros).
const cadastros = { lotacoes: dpLotacoes, cargos: dpCargos, jornadas: dpJornadas, sindicatos: dpSindicatos, convencoes: dpConvencoes };
for (const [path, c] of Object.entries(cadastros)) {
  router.get(`/${path}`, c.list);
  router.post(`/${path}`, c.create);
  router.get(`/${path}/:id`, c.get);
  router.patch(`/${path}/:id`, c.update);
  router.delete(`/${path}/:id`, c.remove);
}
router.get('/convencoes/:id/parametros', dpConvencaoParametros.list);
router.post('/convencoes/:id/parametros', dpConvencaoParametros.create);
router.patch('/convencoes/:id/parametros/:parametroId', dpConvencaoParametros.update);
router.delete('/convencoes/:id/parametros/:parametroId', dpConvencaoParametros.remove);

// PR-4 (item 46) — trabalhador, vínculo (+ 1ª versão numa tx) e versões do vínculo.
router.get('/trabalhadores', dpTrabalhadores.list);
router.post('/trabalhadores', dpTrabalhadores.create);
router.get('/trabalhadores/:id', dpTrabalhadores.get);
router.patch('/trabalhadores/:id', dpTrabalhadores.update);
router.delete('/trabalhadores/:id', dpTrabalhadores.remove);
router.get('/vinculos', dpVinculos.list);
router.post('/vinculos', dpVinculos.create);
router.get('/vinculos/:id', dpVinculos.get);
router.delete('/vinculos/:id', dpVinculos.remove);
router.post('/vinculos/:id/versoes', dpVinculos.createVersao);
router.patch('/vinculos/:id/versoes/:versaoId', dpVinculos.corrigirVersao);

// PR-5 (item 54) — catálogo de rubricas do núcleo, só leitura.
router.get('/rubricas', listDpRubricas);

export default router;
