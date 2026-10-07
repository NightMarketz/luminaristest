import { Router } from 'express';
import { createMitExport, listMitExports } from '../controllers/mitExportController';

/**
 * Arquivo JSON de importação do MIT (BE-INCR-MIT-EXPORT PR-2, nó X9, item 12). Montada em
 * `/api/accounting/mit-exports` (routes/index.ts, ANTES de `/accounting`); registro em 2 toques: a montagem e o
 * bloco OpenAPI em docs.paths.ts.
 */
const router = Router();

router.post('/', createMitExport);
router.get('/', listMitExports);

export default router;
