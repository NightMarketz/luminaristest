import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type {
  ArchiveLalurInput,
  CreateLalurParteBMovementInput,
  UpdateLalurParteBMovementInput,
  LalurParteBPeriodInput,
  CreateLalurEntryInput,
  UpdateLalurEntryInput,
  CreateLalurParteBAccountInput,
  UpdateLalurParteBAccountInput,
} from '@/types/contracts/accounting/LalurDto.gen';

/**
 * e-Lalur / e-Lacs service — thin typed client over `/api/lalur/*` (BE-INCR-SPED-ECF-FASE3B
 * item 11, PR #313) + the read-only catalog `GET /api/lalur/catalog` (FE-INCR-LALUR, Fork
 * F-FE-1 → a). FIRST-CLASS Prisma on the backend (`LalurService`); this only shapes requests/
 * responses. Request bodies are the GENERATED contract of `LalurDto.ts`
 * (`@/types/contracts/accounting/LalurDto.gen`, PRE-ADR-FE-CONTRACT-TYPES — the old by-hand mirror is
 * revoked); `valorCents`/`saldoIniCents` travel as integer cents (BigInt on the server, number on the wire). Archive is a COMMAND (POST …/archive),
 * never a DELETE. `includeArchived` is sent as `'true'` or omitted — NEVER `'false'` (the server
 * reads it with `queryBoolean`, same contract as `overdue` in the AP/AR filter bar).
 */

const CTX = 'e-Lalur';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ── Domain unions (LALUR_* in server/src/features/accounting/models/Lalur.model.ts) ──────────────
export type LalurLivro = 'lalur' | 'lacs' | 'n500' | 'n630' | 'n670';
export type LalurQuarter = 'T01' | 'T02' | 'T03' | 'T04';
export type LalurIndRelacao = '1' | '2' | '3' | '4';
export type LalurTributo = 'I' | 'C';
export type LalurIndSaldo = 'D' | 'C';
/** M410.IND_VAL_LAN_LALB_PB — CR crédito · DB débito · PF prejuízo do exercício · BC base negativa da CSLL. */
export type LalurIndicador = CreateLalurParteBMovementInput['indicador'];
export type LalurIndLanAnt = CreateLalurParteBMovementInput['indLanAnt'];

export const LALUR_LIVROS: readonly LalurLivro[] = ['lalur', 'lacs', 'n500', 'n630', 'n670'];
export const LALUR_QUARTERS: readonly LalurQuarter[] = ['T01', 'T02', 'T03', 'T04'];
export const LALUR_IND_RELACAO: readonly LalurIndRelacao[] = ['1', '2', '3', '4'];
export const LALUR_INDICADORES: readonly LalurIndicador[] = ['CR', 'DB', 'PF', 'BC'];
/** REGRA_NAO_PREENCHER_CTP (Manual p.269, `LalurDto.ts` `refineLalurMovement`): PF/BC não têm contrapartida. */
export const isPrejuizoIndicador = (i: string): i is 'PF' | 'BC' => i === 'PF' || i === 'BC';
/** Livros whose lines carry M300/M350 fields (indRelacao, Parte B, conta, histórico) — D-M3. */
export const isParteALivro = (livro: string): livro is 'lalur' | 'lacs' => livro === 'lalur' || livro === 'lacs';
/** livro → tributo da conta da Parte B que ele pode relacionar (REGRA_PARTE_B_PARTE_A, p.237/p.250). */
export const LIVRO_TRIBUTO: Record<'lalur' | 'lacs', LalurTributo> = { lalur: 'I', lacs: 'C' };

// ── Rows (Prisma models on the wire) ──────────────────────────────────────────────────────────────
export interface LalurEntry {
  id: string;
  userId: string;
  unitId: string;
  year: number;
  quarter: LalurQuarter;
  livro: LalurLivro;
  /** Archived rows come back rewritten as `deleted:<id>:<codigo>` (rename-on-key, D-M2). */
  codigo: string;
  valorCents: number;
  indRelacao: LalurIndRelacao | null;
  histLancamento: string | null;
  parteBId: string | null;
  accountId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LalurParteBAccount {
  id: string;
  userId: string;
  unitId: string;
  /** Archived rows come back rewritten as `deleted:<id>:<codCtaB>` (rename-on-key, D-M2). */
  codCtaB: string;
  descricao: string;
  /** ISO datetime from Prisma; only the date part (YYYY-MM-DD) is meaningful — use `.slice(0, 10)`. */
  dtCriacao: string;
  codPbRfb: string;
  dtLimite: string | null;
  codTributo: LalurTributo;
  saldoIniCents: number;
  indSaldoIni: LalurIndSaldo;
  cnpjSitEsp: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ── Request payloads — contrato gerado (LalurDto.ts, `.strict()`) ─────────────────────────────────
export type {
  CreateLalurParteBMovementInput,
  UpdateLalurParteBMovementInput,
  LalurParteBPeriodInput,
  CreateLalurEntryInput,
  UpdateLalurEntryInput,
  CreateLalurParteBAccountInput,
  UpdateLalurParteBAccountInput,
} from '@/types/contracts/accounting/LalurDto.gen';

export interface ListLalurEntriesQuery {
  unitId: string;
  year?: number;
  quarter?: LalurQuarter;
  livro?: LalurLivro;
  includeArchived?: boolean;
}

export interface ListLalurParteBQuery {
  unitId: string;
  codTributo?: LalurTributo;
  includeArchived?: boolean;
}

// ── Parte B — movimentos (M410), fechamento e diagnóstico (ECF Fase 3C) — RESPOSTAS ──────────────────
// Respostas ficam fora do contrato gerado (D11 do PLANO-FE-CONTRACT-TYPES); espelham o model Prisma
// `LalurParteBMovement` e `LalurParteBBalancesDiagnostic` (`LalurService.ts`).
export interface LalurParteBMovement {
  id: string;
  unitId: string;
  parteBId: string;
  year: number;
  quarter: LalurQuarter;
  codTributo: LalurTributo;
  /** BigInt no servidor, number no fio (jsonBigintReplacer). */
  valorCents: number;
  indicador: LalurIndicador;
  contrapartidaId: string | null;
  historico: string;
  indLanAnt: LalurIndLanAnt;
  /** 'system' = PF/BC derivado no fechamento — só arquiva, não edita valor/indicador. */
  origem: 'user' | 'system';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ListLalurMovementsQuery {
  unitId: string;
  year?: number;
  quarter?: LalurQuarter;
  parteBId?: string;
  includeArchived?: boolean;
}

/** Valores em STRING (BigInt seguro no JSON) — centavos, com sinal. */
export interface LalurBalanceView { sdIni: string; vlA: string; vlB: string; sdFim: string }

export interface LalurParteBBalancesDiagnostic {
  year: number;
  periods: Array<{
    quarter: LalurQuarter;
    closed: boolean;
    closedAt?: string;
    accounts: Array<{
      parteBId: string;
      codCtaB: string;
      codTributo: string;
      materialized?: LalurBalanceView;
      recomputed: LalurBalanceView;
      divergent: boolean;
    }>;
  }>;
  divergences: Array<{ quarter: LalurQuarter; codCtaB: string; codTributo: string; field: string; materialized: string; recomputed: string }>;
  /** X4-14: AVISO, nunca erro — a igualdade exata só o PVA fecha. */
  warnings: Array<{
    code: 'M312_MISSING_FOR_PARTIAL_ADJUSTMENT';
    quarter: LalurQuarter;
    livro: string;
    codigo: string;
    entryId: string;
    accountCode: string;
    valorCents: string;
    aggregates: { sumDebitCents: string; sumCreditCents: string; saldoPeriodoCents: string; saldoFinalCents: string };
    message: string;
  }>;
}

// ── Catalog (GET /api/lalur/catalog — §2.2) ───────────────────────────────────────────────────────
/** One ENTRY line (tipo E, in force for the year) of the livro's Tabela Dinâmica sheet. */
export interface LalurCatalogLinha {
  codigo: string;
  descricao: string;
  tipo: 'E';
  /** M300/M350.TIPO_LANCAMENTO (A adição · E exclusão · P compensação · L …); absent on Bloco N sheets. */
  tipoLanc?: 'A' | 'E' | 'P' | 'L';
  vigencia: { de: string | null; ate: string | null };
}
/** One PARTEB_PADRAO row — the M010.COD_PB_RFB universe. */
export interface LalurCatalogParteB {
  codigo: string;
  descricao: string;
  tributo: 'I' | 'C' | 'A';
}

/** Build a `?a=x&b=y` query string, dropping undefined/empty values and encoding. */
function buildQuery(params: Record<string, string | undefined>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

const enc = encodeURIComponent;
const archiveBody = (unitId: string): ArchiveLalurInput => ({ unitId });
const periodBody = (unitId: string, year: number, quarter: LalurQuarter): LalurParteBPeriodInput => ({ unitId, year, quarter });

export const lalurService = {
  // ── Parte A (M300/M350 + linhas E do Bloco N) ──────────────────────────────
  async listEntries(query: ListLalurEntriesQuery): Promise<LalurEntry[]> {
    const qs = buildQuery({
      unitId: query.unitId,
      year: query.year === undefined ? undefined : String(query.year),
      quarter: query.quarter,
      livro: query.livro,
      includeArchived: query.includeArchived ? 'true' : undefined,
    });
    return (await apiClient.get<ApiEnvelope<LalurEntry[]>>(`/lalur/entries${qs}`)).data;
  },

  async createEntry(payload: CreateLalurEntryInput): Promise<LalurEntry> {
    const res = await apiClient.post<ApiEnvelope<LalurEntry>>('/lalur/entries', payload);
    notify('Ajuste registrado.', 'success', CTX);
    return res.data;
  },

  async updateEntry(id: string, payload: UpdateLalurEntryInput): Promise<LalurEntry> {
    const res = await apiClient.patch<ApiEnvelope<LalurEntry>>(`/lalur/entries/${enc(id)}`, payload);
    notify('Ajuste atualizado.', 'success', CTX);
    return res.data;
  },

  async archiveEntry(id: string, unitId: string): Promise<LalurEntry> {
    const res = await apiClient.post<ApiEnvelope<LalurEntry>>(`/lalur/entries/${enc(id)}/archive`, archiveBody(unitId));
    notify('Ajuste arquivado.', 'success', CTX);
    return res.data;
  },

  // ── Parte B (M010) ─────────────────────────────────────────────────────────
  async listParteB(query: ListLalurParteBQuery): Promise<LalurParteBAccount[]> {
    const qs = buildQuery({
      unitId: query.unitId,
      codTributo: query.codTributo,
      includeArchived: query.includeArchived ? 'true' : undefined,
    });
    return (await apiClient.get<ApiEnvelope<LalurParteBAccount[]>>(`/lalur/parte-b${qs}`)).data;
  },

  async createParteB(payload: CreateLalurParteBAccountInput): Promise<LalurParteBAccount> {
    const res = await apiClient.post<ApiEnvelope<LalurParteBAccount>>('/lalur/parte-b', payload);
    notify('Conta da Parte B cadastrada.', 'success', CTX);
    return res.data;
  },

  async updateParteB(id: string, payload: UpdateLalurParteBAccountInput): Promise<LalurParteBAccount> {
    const res = await apiClient.patch<ApiEnvelope<LalurParteBAccount>>(`/lalur/parte-b/${enc(id)}`, payload);
    notify('Conta da Parte B atualizada.', 'success', CTX);
    return res.data;
  },

  async archiveParteB(id: string, unitId: string): Promise<LalurParteBAccount> {
    const res = await apiClient.post<ApiEnvelope<LalurParteBAccount>>(`/lalur/parte-b/${enc(id)}/archive`, archiveBody(unitId));
    notify('Conta da Parte B arquivada.', 'success', CTX);
    return res.data;
  },

  // ── Parte B — movimentos (M410) ──────────────────────────────────────────────
  async listMovements(query: ListLalurMovementsQuery): Promise<LalurParteBMovement[]> {
    const qs = buildQuery({
      unitId: query.unitId,
      year: query.year === undefined ? undefined : String(query.year),
      quarter: query.quarter,
      parteBId: query.parteBId,
      includeArchived: query.includeArchived ? 'true' : undefined,
    });
    return (await apiClient.get<ApiEnvelope<LalurParteBMovement[]>>(`/lalur/parte-b/movements${qs}`)).data;
  },

  async createMovement(payload: CreateLalurParteBMovementInput): Promise<LalurParteBMovement> {
    const res = await apiClient.post<ApiEnvelope<LalurParteBMovement>>('/lalur/parte-b/movements', payload);
    notify('Movimento da Parte B registrado.', 'success', CTX);
    return res.data;
  },

  async updateMovement(id: string, payload: UpdateLalurParteBMovementInput): Promise<LalurParteBMovement> {
    const res = await apiClient.patch<ApiEnvelope<LalurParteBMovement>>(`/lalur/parte-b/movements/${enc(id)}`, payload);
    notify('Movimento da Parte B atualizado.', 'success', CTX);
    return res.data;
  },

  async archiveMovement(id: string, unitId: string): Promise<LalurParteBMovement> {
    const res = await apiClient.post<ApiEnvelope<LalurParteBMovement>>(`/lalur/parte-b/movements/${enc(id)}/archive`, archiveBody(unitId));
    notify('Movimento da Parte B arquivado.', 'success', CTX);
    return res.data;
  },

  // ── Parte B — fechamento trimestral (materializa o M500 e deriva o PF/BC) ────
  async closeParteB(unitId: string, year: number, quarter: LalurQuarter): Promise<void> {
    await apiClient.post<ApiEnvelope<unknown>>('/lalur/parte-b/close', periodBody(unitId, year, quarter));
    notify(`Parte B: ${quarter}/${year} fechado.`, 'success', CTX);
  },

  async reopenParteB(unitId: string, year: number, quarter: LalurQuarter): Promise<void> {
    await apiClient.post<ApiEnvelope<unknown>>('/lalur/parte-b/reopen', periodBody(unitId, year, quarter));
    notify(`Parte B: ${quarter}/${year} reaberto.`, 'success', CTX);
  },

  /** Diagnóstico materializado × recomputado + avisos X4-14. Leitura; sem notificação. */
  async getParteBBalances(unitId: string, year: number): Promise<LalurParteBBalancesDiagnostic> {
    const qs = buildQuery({ unitId, year: String(year) });
    return (await apiClient.get<ApiEnvelope<LalurParteBBalancesDiagnostic>>(`/lalur/parte-b/balances${qs}`)).data;
  },

  // ── Catálogo (Leiaute 12) ──────────────────────────────────────────────────
  /** Linhas E do livro em vigor no exercício — o mesmo predicado do POST /entries. */
  async getCatalog(unitId: string, livro: LalurLivro, year: number, q?: string): Promise<LalurCatalogLinha[]> {
    const qs = buildQuery({ unitId, livro, year: String(year), q });
    return (await apiClient.get<ApiEnvelope<{ rows: LalurCatalogLinha[] }>>(`/lalur/catalog${qs}`)).data.rows;
  },

  /** PARTEB_PADRAO, opcionalmente filtrada por tributo (A casa com os dois). Sem year: o write path não aplica vigência ao COD_PB_RFB. */
  async getParteBPadrao(unitId: string, tributo?: LalurTributo, q?: string): Promise<LalurCatalogParteB[]> {
    const qs = buildQuery({ unitId, aba: 'PARTEB_PADRAO', tributo, q });
    return (await apiClient.get<ApiEnvelope<{ rows: LalurCatalogParteB[] }>>(`/lalur/catalog${qs}`)).data.rows;
  },
};
