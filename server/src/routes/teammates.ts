import { Router } from 'express';
import { createLlmCredential, deleteLlmCredential, listLlmCredentials } from '@/controllers/llmCredentialController';

/** /api/teammates (BE-INCR-TEAMMATES §2.4). PR-1: credenciais de IA (item 7). */
const router = Router();

router.get('/credentials', listLlmCredentials);
router.post('/credentials', createLlmCredential);
router.delete('/credentials/:id', deleteLlmCredential);

export default router;
