import { Router } from 'express';
import { heartbeatDfeSignerTarefa, parearDfeSigner, pollDfeSignerTarefas, registrarResultadoDfeSigner } from '../controllers/dfeSignerController';
import { dfeSignerDeviceLimiter, optionalDfeSignerDevice, requireDfeSignerDevice } from '../middleware/dfeSignerDeviceAuth';

/**
 * X10a EMENDA-4 (AL-3, AL-5; §4.2) — rotas do ASSINADOR LOCAL, montadas em `/api/dfe-assinador` em `routes/index.ts`.
 * Não passam pelo JWT (`publicApiRoutes` de `middleware/auth.ts`): a prova é o código de pareamento ou o
 * `Authorization: Bearer <token de dispositivo>` (`dfeSignerDeviceAuth.ts`), com limite de taxa por dispositivo.
 * AL-PR-3: a fila (`GET /v1/tarefas` long-poll, `POST /v1/tarefas/:id/resultado`), com Bearer obrigatório.
 */
const router = Router();

router.post('/v1/pareamento', optionalDfeSignerDevice, dfeSignerDeviceLimiter, parearDfeSigner);
router.get('/v1/tarefas', requireDfeSignerDevice, dfeSignerDeviceLimiter, pollDfeSignerTarefas);
router.post('/v1/tarefas/:id/resultado', requireDfeSignerDevice, dfeSignerDeviceLimiter, registrarResultadoDfeSigner);
router.post('/v1/tarefas/:id/heartbeat', requireDfeSignerDevice, dfeSignerDeviceLimiter, heartbeatDfeSignerTarefa);

export default router;
