import { Router } from 'express';
import { createLlmCredential, deleteLlmCredential, listLlmCredentials } from '@/controllers/llmCredentialController';
import { createTeammate, deleteTeammate, getTeammate, listTeammates, updateTeammate } from '@/controllers/teammateController';

/** /api/teammates (BE-INCR-TEAMMATES §2.4). PR-1: credenciais de IA (item 7). PR-2: CRUD do teammate (item 10). */
const router = Router();

// Rotas fixas antes de `/:id`, senão `credentials` vira id.
router.get('/credentials', listLlmCredentials);
router.post('/credentials', createLlmCredential);
router.delete('/credentials/:id', deleteLlmCredential);

router.get('/', listTeammates);
router.post('/', createTeammate);
router.get('/:id', getTeammate);
router.patch('/:id', updateTeammate);
router.delete('/:id', deleteTeammate);

export default router;
