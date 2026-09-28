import { Router } from 'express';
import { getFactory } from '../lib/factory';
import { createAccountingBindingController } from '../features/accountingBinding/controllers/accountingBindingController';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, item 15 do BRIEF) — mounted at `/api/accounting-binding`
 * (`routes/index.ts`). 2-touch registration: this mount plus the OpenAPI doc blocks in
 * `docs.paths.ts` (do NOT write the literal jsdoc-openapi tag in this prose — the generator globs
 * routes/ and would spread the comment string into the spec).
 *
 * F-BP-1(b) ratificado: as 3 rotas — sem uma rota `activate` separada (F-BP-2b: a ativação é
 * efeito do `compile`). LAC-B acrescenta `activate-default`: não é uma rota `activate` de uma
 * versão existente — é o compile do binding PADRÃO do setor, com o payload embutido server-side.
 */
const controller = createAccountingBindingController({
  buildCompileService: (scope) => getFactory().getAccountingBindingCompileService(scope),
  buildActivationService: (scope) => getFactory().getAccountingBindingActivationService(scope),
});

const router = Router();

router.post('/compile', controller.compileBinding);
router.post('/validate', controller.validateBinding);
router.post('/activate-default', controller.activateDefaultBinding);
router.get('/', controller.listBindings);

export default router;
