import { Router } from 'express';
import { parearDfeSigner } from '../controllers/dfeSignerController';
import { dfeSignerDeviceLimiter, optionalDfeSignerDevice } from '../middleware/dfeSignerDeviceAuth';

/**
 * X10a EMENDA-4 (AL-3, AL-5; §4.2) — rotas do ASSINADOR LOCAL, montadas em `/api/dfe-assinador` em `routes/index.ts`.
 * Não passam pelo JWT (`publicApiRoutes` de `middleware/auth.ts`): a prova é o código de pareamento ou o
 * `Authorization: Bearer <token de dispositivo>` (`dfeSignerDeviceAuth.ts`), com limite de taxa por dispositivo.
 * As rotas de tarefas (`GET /v1/tarefas`, `POST /v1/tarefas/:id/resultado`) entram no AL-PR-3.
 */
const router = Router();

router.post('/v1/pareamento', optionalDfeSignerDevice, dfeSignerDeviceLimiter, parearDfeSigner);

export default router;
