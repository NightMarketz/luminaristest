import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { DfeSignerPareamentoBodySchema, DfeSignerResultadoBodySchema, DfeSignerTarefasQuerySchema } from '../features/accounting/dtos/DfeSignerDto';
import type { RequestComDispositivo } from '../middleware/dfeSignerDeviceAuth';

/**
 * Assinador local (X10a EMENDA-4 AL-3, AL-4, AL-12; tabela de rotas §4.2) — borda HTTP fina: auth → Zod → escopo →
 * service → handleApiError. Nenhuma resposta carrega o hash do token, o certificado inteiro nem o subject.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

/** POST /api/accounting/dfe-assinador/:unitId/codigos — código de pareamento (mostrado uma vez). */
export const gerarCodigoDfeSigner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'write' });
    return res.status(201).json({ success: true, data: await getFactory().getDfeSignerService().gerarCodigo(scope) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/dfe-assinador/:unitId — view do estado (AL-12), ou `null` sem assinador. */
export const getDfeSigner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'read' });
    return res.json({ success: true, data: await getFactory().getDfeSignerService().get(scope) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** DELETE /api/accounting/dfe-assinador/:unitId — revoga só o vínculo da unidade (L-AL-3). */
export const revogarDfeSigner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'write' });
    await getFactory().getDfeSignerService().revogar(scope);
    return res.status(204).end();
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/dfe-assinador/v1/pareamento — rota do ASSINADOR (sem JWT; `publicApiRoutes`). Sem Bearer: dispositivo novo.
 * Com o Bearer de um dispositivo já pareado (validado pelo `optionalDfeSignerDevice`): 2º vínculo (L-AL-2).
 */
export const parearDfeSigner = async (req: Request, res: Response) => {
  try {
    const parsed = DfeSignerPareamentoBodySchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.flatten());
    const existente = (req as RequestComDispositivo).dfeSignerDevice ?? null;
    const data = await getFactory().getDfeSignerService().parear(parsed.data, existente);
    return res.status(existente ? 200 : 201).json(data);
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * GET /api/dfe-assinador/v1/tarefas?espera=25&versaoAssinador=&tokenPresente=&certThumbprintSha256= — o long-poll do
 * assinador (AL-7; F-AL-2 a). O poll é o heartbeat (AL-12). Com tarefa ⇒ 200 na hora; sem tarefa até `espera` s ⇒ 204.
 * A conexão que cai antes solta a espera.
 */
export const pollDfeSignerTarefas = async (req: Request, res: Response) => {
  try {
    const device = (req as RequestComDispositivo).dfeSignerDevice!;
    const parsed = DfeSignerTarefasQuerySchema.safeParse(req.query);
    if (!parsed.success) return bad(res, parsed.error.flatten());
    const { espera, ...hb } = parsed.data;
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    const tarefas = await getFactory().getDfeSignerTaskService().poll(device, hb, espera, abort.signal);
    if (!tarefas.length) return res.status(204).end();
    return res.json({ tarefas });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/dfe-assinador/v1/tarefas/:id/resultado — o resultado de uma tarefa (AL-6): idempotente por id (mesmo corpo ⇒
 * 200 sem efeito; outro ⇒ 409), tarefa vencida ⇒ 409. A resposta não ecoa o resultado.
 */
export const registrarResultadoDfeSigner = async (req: Request, res: Response) => {
  try {
    const device = (req as RequestComDispositivo).dfeSignerDevice!;
    const parsed = DfeSignerResultadoBodySchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.flatten());
    const r = await getFactory().getDfeSignerTaskService().registrarResultado(device, req.params.id, parsed.data);
    return res.json({ success: true, data: r });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/dfe-assinador/v1/tarefas/:id/heartbeat — o caixa renova o lease da tarefa entregue a ele (AL-6). Só a tarefa
 * do próprio dispositivo (outra ⇒ 404); entregue e não vencida (vencida ⇒ 409). Sem heartbeat, a tarefa volta ao poll.
 */
export const heartbeatDfeSignerTarefa = async (req: Request, res: Response) => {
  try {
    const device = (req as RequestComDispositivo).dfeSignerDevice!;
    const r = await getFactory().getDfeSignerTaskService().renovarLease(device, req.params.id);
    return res.json({ success: true, data: r });
  } catch (error) {
    return handleApiError(error, res);
  }
};
