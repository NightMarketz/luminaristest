import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type {
  CreateFixedAssetInput,
  UpdateFixedAssetInput,
  ActivateFixedAssetInput,
  DisposeFixedAssetInput,
  DeleteFixedAssetInput,
} from '@/types/contracts/accounting/FixedAssetDto.gen';
import type {
  CreateFixedAssetClassInput,
  UpdateFixedAssetClassInput,
  DeleteFixedAssetClassInput,
} from '@/types/contracts/accounting/FixedAssetClassDto.gen';
import type { UpsertDepreciationRateInput, HideDepreciationRateInput } from '@/types/contracts/accounting/DepreciationRateDto.gen';
import type { RunDepreciationInput, ReconcileFixedAssetsInput } from '@/types/contracts/accounting/DepreciationDto.gen';

/**
 * Imobilizado (C8) service — thin typed client over `/api/accounting/{fixed-assets,fixed-asset-classes,
 * depreciation-rates}` (BE-INCR-FIXED-ASSETS, FE-INCR-FIXED-ASSETS PR-1). FIRST-CLASS Prisma on the
 * backend; this only shapes requests/responses. Request bodies are the GENERATED contract
 * (`@/types/contracts/accounting/*.gen`); responses are declared by hand (decisão 9 de
 * D-2026-09-28 — respostas ficam fora do gerador). `*Cents` são BigInt no servidor, `number` no fio
 * (`jsonBigintReplacer`); datas date-only chegam como ISO `…T00:00:00.000Z` — renderize com `formatDate`.
 * Os dois DELETEs levam o alvo no CORPO JSON (o BE lê `req.body`; sem corpo = 400).
 */

const CTX = 'Imobilizado';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ── Responses (Prisma models on the wire) ─────────────────────────────────────────────────────────
export type FixedAssetStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED';
export const FIXED_ASSET_STATUSES: readonly FixedAssetStatus[] = ['PENDING_ACTIVATION', 'ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED'];

export interface FixedAsset {
  id: string;
  unitId: string;
  classId: string;
  code: string;
  description: string;
  ncmPrefix: string | null;
  quantity: number;
  costCents: number;
  residualValueCents: number;
  rateId: string | null;
  annualRateBp: number;
  bookAnnualRateBp: number | null;
  bookRateJustification: string | null;
  openingAccumulatedCents: number;
  accumulatedDepreciationCents: number;
  status: FixedAssetStatus;
  acquiredAt: string;
  activatedAt: string | null;
  disposedAt: string | null;
  disposalEntryId: string | null;
  sourceDocumentId: string | null;
  payableId: string | null;
  sourceItemRef: string | null;
  /** CAS counter — ativar/baixar o devolvem no corpo; 409 se divergir. */
  version: number;
}

export interface FixedAssetClass {
  id: string;
  code: string;
  name: string;
  depreciable: boolean;
  costAccountId: string;
  accumulatedDepreciationAccountId: string | null;
}

export type DepreciationRateSource = 'ANEXO_III_IN_1700_2017' | 'ANEXO_III_NOTA_1' | 'ANEXO_III_NOTA_2' | 'CUSTOM';

export interface DepreciationRate {
  id: string;
  ncm: string | null;
  description: string;
  lifeYears: number;
  annualRateBp: number;
  source: DepreciationRateSource;
  sourceUrl: string | null;
  justification: string | null;
  hiddenAt: string | null;
}

export interface RunDepreciationResult {
  yearMonth: string;
  posted: number;
  skipped: number;
  failed: Array<{ assetId: string; code: 'PERIOD_NOT_OPEN'; message: string }>;
}

export interface ReconcileFixedAssetsResult {
  checked: number;
  repaired: number;
  draftsCreated: number;
}

// ── Request payloads — contrato gerado ────────────────────────────────────────────────────────────
export type {
  CreateFixedAssetInput,
  UpdateFixedAssetInput,
  ActivateFixedAssetInput,
  DisposeFixedAssetInput,
} from '@/types/contracts/accounting/FixedAssetDto.gen';
export type {
  CreateFixedAssetClassInput,
  UpdateFixedAssetClassInput,
} from '@/types/contracts/accounting/FixedAssetClassDto.gen';
export type { UpsertDepreciationRateInput } from '@/types/contracts/accounting/DepreciationRateDto.gen';

export interface ListFixedAssetsQuery {
  unitId: string;
  status?: FixedAssetStatus;
  classId?: string;
}

// ── Conversões puras taxa % ↔ basis points ────────────────────────────────────────────────────────
/** "33,3" (ou "33.3") → 3330. `NaN` quando não é um número finito — o chamador valida o intervalo. */
export function percentToBp(input: string): number {
  const n = Number(input.trim().replace(',', '.'));
  return input.trim() === '' || !Number.isFinite(n) ? NaN : Math.round(n * 100);
}

/** 3330 → "33,3"; 1000 → "10" (sem zeros à direita, vírgula decimal BR). */
export function bpToPercent(bp: number): string {
  return String(bp / 100).replace('.', ',');
}

/** Build a `?a=x&b=y` query string, dropping undefined/empty values and encoding. */
function buildQuery(params: Record<string, string | undefined>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

const enc = encodeURIComponent;
const deleteInit = (body: object): RequestInit => ({ body: JSON.stringify(body) });
const assetDeleteBody = (unitId: string, assetId: string): DeleteFixedAssetInput => ({ unitId, assetId });
const classDeleteBody = (unitId: string, classId: string): DeleteFixedAssetClassInput => ({ unitId, classId });
const reconcileBody = (unitId: string): ReconcileFixedAssetsInput => ({ unitId });
const hideBody = (unitId: string): HideDepreciationRateInput => ({ unitId });

export const fixedAssetsService = {
  // ── Bens ───────────────────────────────────────────────────────────────────
  /** O BE devolve o array inteiro, sem paginação — a tela pagina no cliente. */
  async listAssets(query: ListFixedAssetsQuery): Promise<FixedAsset[]> {
    const qs = buildQuery({ unitId: query.unitId, status: query.status, classId: query.classId });
    return (await apiClient.get<ApiEnvelope<FixedAsset[]>>(`/accounting/fixed-assets${qs}`)).data;
  },

  async createAsset(input: CreateFixedAssetInput): Promise<FixedAsset> {
    const res = await apiClient.post<ApiEnvelope<FixedAsset>>('/accounting/fixed-assets', input);
    notify('Bem cadastrado.', 'success', CTX);
    return res.data;
  },

  async updateAsset(id: string, input: UpdateFixedAssetInput): Promise<FixedAsset> {
    const res = await apiClient.put<ApiEnvelope<FixedAsset>>(`/accounting/fixed-assets/${enc(id)}`, input);
    notify('Bem atualizado.', 'success', CTX);
    return res.data;
  },

  async deleteAsset(id: string, unitId: string): Promise<FixedAsset> {
    const res = await apiClient.delete<ApiEnvelope<FixedAsset>>(`/accounting/fixed-assets/${enc(id)}`, deleteInit(assetDeleteBody(unitId, id)));
    notify('Bem removido.', 'success', CTX);
    return res.data;
  },

  async activateAsset(id: string, input: ActivateFixedAssetInput): Promise<FixedAsset> {
    const res = await apiClient.post<ApiEnvelope<FixedAsset>>(`/accounting/fixed-assets/${enc(id)}/activate`, input);
    notify('Bem ativado.', 'success', CTX);
    return res.data;
  },

  async disposeAsset(id: string, input: DisposeFixedAssetInput): Promise<FixedAsset> {
    const res = await apiClient.post<ApiEnvelope<FixedAsset>>(`/accounting/fixed-assets/${enc(id)}/dispose`, input);
    notify('Bem baixado.', 'success', CTX);
    return res.data;
  },

  // ── Depreciação e reconciliação ────────────────────────────────────────────
  async runDepreciation(input: RunDepreciationInput): Promise<RunDepreciationResult> {
    const res = await apiClient.post<ApiEnvelope<RunDepreciationResult>>('/accounting/fixed-assets/depreciation/run', input);
    return res.data;
  },

  async reconcile(unitId: string): Promise<ReconcileFixedAssetsResult> {
    const res = await apiClient.post<ApiEnvelope<ReconcileFixedAssetsResult>>('/accounting/fixed-assets/reconcile', reconcileBody(unitId));
    return res.data;
  },

  // ── Classes ────────────────────────────────────────────────────────────────
  async listClasses(unitId: string): Promise<FixedAssetClass[]> {
    const qs = buildQuery({ unitId });
    return (await apiClient.get<ApiEnvelope<FixedAssetClass[]>>(`/accounting/fixed-asset-classes${qs}`)).data;
  },

  async createClass(input: CreateFixedAssetClassInput): Promise<FixedAssetClass> {
    const res = await apiClient.post<ApiEnvelope<FixedAssetClass>>('/accounting/fixed-asset-classes', input);
    notify('Classe cadastrada.', 'success', CTX);
    return res.data;
  },

  async updateClass(id: string, input: UpdateFixedAssetClassInput): Promise<FixedAssetClass> {
    const res = await apiClient.patch<ApiEnvelope<FixedAssetClass>>(`/accounting/fixed-asset-classes/${enc(id)}`, input);
    notify('Classe atualizada.', 'success', CTX);
    return res.data;
  },

  async deleteClass(id: string, unitId: string): Promise<FixedAssetClass> {
    const res = await apiClient.delete<ApiEnvelope<FixedAssetClass>>(`/accounting/fixed-asset-classes/${enc(id)}`, deleteInit(classDeleteBody(unitId, id)));
    notify('Classe removida.', 'success', CTX);
    return res.data;
  },

  // ── Taxas ──────────────────────────────────────────────────────────────────
  /** O 1º GET semeia o Anexo III do escopo (lazy, no BE). `includeHidden` vai como `'true'` ou é omitido — NUNCA `'false'`. */
  async listRates(unitId: string, includeHidden?: boolean): Promise<DepreciationRate[]> {
    const qs = buildQuery({ unitId, includeHidden: includeHidden ? 'true' : undefined });
    return (await apiClient.get<ApiEnvelope<DepreciationRate[]>>(`/accounting/depreciation-rates${qs}`)).data;
  },

  async createRate(input: UpsertDepreciationRateInput): Promise<DepreciationRate> {
    const res = await apiClient.post<ApiEnvelope<DepreciationRate>>('/accounting/depreciation-rates', input);
    notify('Taxa cadastrada.', 'success', CTX);
    return res.data;
  },

  async hideRate(id: string, unitId: string): Promise<DepreciationRate> {
    const res = await apiClient.post<ApiEnvelope<DepreciationRate>>(`/accounting/depreciation-rates/${enc(id)}/hide`, hideBody(unitId));
    notify('Taxa oculta.', 'success', CTX);
    return res.data;
  },
};
