import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import type { AccountingScope } from '../features/accounting/scope/AccountingScope';
import { backfillRecebimentos } from '../features/accounting/sync/bridges/ReceitaFiscalRecebimentoBridge';
import {
  CompetenciaParamSchema,
  SalaoParceriaContratoPatchSchema,
  SalaoParceriaContratoSchema,
  SimplesDasRegistroSchema,
  SimplesHistoricoUpsertSchema,
  SimplesIdParamSchema,
  SimplesSegregacaoUpsertSchema,
  SimplesUnitQuerySchema,
  AnoParamSchema,
  SimplesDasnUpsertSchema,
  SimplesDefisUpsertSchema,
  RegistroValoresAReceberQuerySchema,
  SimplesCreditoIncobravelCreateSchema,
} from '../features/accounting/dtos/SimplesDto';

/**
 * BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, itens 10–13) — borda HTTP fina: auth → Zod safeParse → escopo → service →
 * handleApiError.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });
const service = () => getFactory().getSimplesEntradasService();

/** PUT /api/accounting/simples/historico/:competencia */
export const putSimplesHistorico = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompetenciaParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = SimplesHistoricoUpsertSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await service().upsertHistorico(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), p.data.competencia, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/simples/historico/:competencia?unitId= — 404 sem registro (BE-INCR-SIMPLES-GET-ENTRADAS, F-GE-1). */
export const getSimplesHistorico = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompetenciaParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await service().obterHistorico(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), p.data.competencia);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PUT /api/accounting/simples/segregacao/:competencia */
export const putSimplesSegregacao = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompetenciaParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = SimplesSegregacaoUpsertSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await service().upsertSegregacao(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), p.data.competencia, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/simples/segregacao/:competencia?unitId= — 404 sem registro (BE-INCR-SIMPLES-GET-ENTRADAS, F-GE-1). */
export const getSimplesSegregacao = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompetenciaParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await service().obterSegregacao(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), p.data.competencia);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/simples/parcerias */
export const createParceria = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = SalaoParceriaContratoSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await service().createParceria(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/simples/parcerias?unitId= */
export const listParcerias = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await service().listParcerias(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }));
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PATCH /api/accounting/simples/parcerias/:id */
export const updateParceria = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = SimplesIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = SalaoParceriaContratoPatchSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await service().updateParceria(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), p.data.id, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** DELETE /api/accounting/simples/parcerias/:id?unitId= — soft-delete. */
export const deleteParceria = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = SimplesIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    await service().deleteParceria(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'write' }), p.data.id);
    return res.status(204).send();
  } catch (error) {
    return handleApiError(error, res);
  }
};

// ---- BE-INCR-SIMPLES-NACIONAL PR-3 (nó X14, itens 17–19) ----

const apuracao = () => getFactory().getSimplesApuracaoService();

/**
 * X14-CAIXA item 4 — backfill sob demanda dos recebimentos antes da apuração CAIXA (cobre as vendas pagas antes do PR-1,
 * fora da janela do job de reconcile). Integração cross-módulo no controller, nunca no motor (Contrato §2.1).
 */
async function backfillSeCaixa(scope: AccountingScope, competencia: string): Promise<void> {
  // I6 (dono, questionário, 2026-10-16: "Lê sem gravar"): unidade apagada lê a apuração sem gravar recebimentos —
  // molde do F-I6-10 (listAccounts). Só chega aqui com access 'read'; a escrita (PUT /das) já parou no 409.
  if (scope.unitDeleted) return;
  if ((await apuracao().regimeApuracaoDoPa(scope, competencia)) === 'CAIXA') await backfillRecebimentos(scope);
}

/** POST /api/accounting/simples/apuracoes/:competencia/calcular — sob demanda; no regime CAIXA grava o backfill de recebimentos (exceto em unidade apagada). */
export const calcularApuracaoSimples = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompetenciaParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = SimplesUnitQuerySchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'read' });
    await backfillSeCaixa(scope, p.data.competencia);
    const data = await apuracao().calcular(scope, p.data.competencia);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/simples/apuracoes/:competencia?unitId= — espelho do PGDAS-D + DAS oficial + divergência. */
export const getApuracaoSimples = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompetenciaParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' });
    await backfillSeCaixa(scope, p.data.competencia);
    const data = await apuracao().obter(scope, p.data.competencia);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PUT /api/accounting/simples/apuracoes/:competencia/das — registra o DAS oficial e persiste a apuração. */
export const putDasSimples = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompetenciaParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = SimplesDasRegistroSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' });
    await backfillSeCaixa(scope, p.data.competencia);
    const data = await apuracao().registrarDas(scope, p.data.competencia, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

// ---- BE-INCR-SIMPLES-NACIONAL PR-4 (nó X14, itens 27–29) ----

const declaracao = () => getFactory().getSimplesDeclaracaoService();

/** GET /api/accounting/simples/aliquotas/:competencia?unitId= — ISS a reter e pTotTribSN sugerido (mês anterior). */
export const getAliquotasSimples = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompetenciaParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await apuracao().aliquotas(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), p.data.competencia);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/simples/dasn-simei/:ano?unitId= — espelho da DASN-SIMEI. */
export const getDasnSimei = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = AnoParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await declaracao().dasnSimei(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), p.data.ano);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PUT /api/accounting/simples/dasn-simei/:ano — grava o campo digitado (contratação de empregado). */
export const putDasnSimei = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = AnoParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = SimplesDasnUpsertSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await declaracao().upsertDasnSimei(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), p.data.ano, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/simples/defis/:ano?unitId= — espelho mínimo da DEFIS. */
export const getDefis = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = AnoParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await declaracao().defis(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), p.data.ano);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PUT /api/accounting/simples/defis/:ano — grava os campos digitados (empregados, sócios, renda variável). */
export const putDefis = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = AnoParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = SimplesDefisUpsertSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await declaracao().upsertDefis(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), p.data.ano, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

// ---- BE-INCR-SIMPLES-CAIXA PR-3 (nó X14-CAIXA, itens 19–20) ----

const registroCaixa = () => getFactory().getSimplesRegistroCaixaService();

/** GET /api/accounting/simples/registro-valores-a-receber?unitId=&ano= — registro do Anexo IX (ano ≤ 2026). */
export const getRegistroValoresAReceber = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = RegistroValoresAReceberQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await registroCaixa().registro(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), q.data.ano);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/simples/creditos-incobraveis — crédito incobrável (art. 77 VI, §§ 5º–6º). */
export const createCreditoIncobravel = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = SimplesCreditoIncobravelCreateSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await registroCaixa().registrarIncobravel(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** DELETE /api/accounting/simples/creditos-incobraveis/:id?unitId= — soft-delete. */
export const deleteCreditoIncobravel = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = SimplesIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    await registroCaixa().removerIncobravel(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'write' }), p.data.id);
    return res.status(204).send();
  } catch (error) {
    return handleApiError(error, res);
  }
};
