import { Router } from 'express';
import { listServiceFiscalSuggestions, previewServiceFiscalSuggestion } from '../controllers/serviceFiscalSuggestionController';

/**
 * Sugestão fiscal por serviço (BE-INCR-KIT-SETOR-EMENDA-1 PR-K3, 7e/7f). Registro em 2 toques: a montagem em
 * routes/index.ts e os blocos OpenAPI em docs.paths.ts. Só leitura.
 */
const router = Router();
router.get('/', listServiceFiscalSuggestions);
router.post('/preview', previewServiceFiscalSuggestion);

export default router;
