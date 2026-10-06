import { apiClient } from '../api/api-client';
import { postMultipart } from './multipart';
import type {
  CancelamentoManualInput,
  EmitFiscalDocumentInput,
  FiscalDocumentActionBodyInput,
  PreviewFiscalDocumentInput,
  RejeicaoManualInput,
} from '@/types/contracts/accounting/FiscalDocumentDto.gen';
import type { DpsManualPayloadInput } from '@/types/contracts/accounting/DpsPayloadDto.gen';

/**
 * Emissão de DF-e — NFS-e no modo manual (`/api/nfe/dfe`, nós X10b + DFE-MANUAL; FE-INCR-DFE PR-2, item 14).
 * Corpos de escrita pelos tipos gerados; as respostas são `interface` à mão (o BE não as descreve em Zod —
 * `PLANO-FE-CONTRACT-TYPES` D11), cada uma com `// espelha`. Sem `notify` de sucesso aqui: a tela redesenha o
 * documento que voltou, e o erro já é notificado pelo `apiClient` (o multipart não notifica — a tela mostra).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

// espelha server/src/lib/nfseReadback.ts:13-26
export type CampoComparado =
  | 'prest.CNPJ'
  | 'toma.doc'
  | 'cTribNac'
  | 'cNBS'
  | 'cLocPrestacao'
  | 'dCompet'
  | 'vServ'
  | 'vDescIncond'
  | 'vDescCond'
  | 'tpRetISSQN'
  | 'pAliq'
  | 'IBSCBS.CST'
  | 'IBSCBS.cClassTrib';

// espelha server/src/lib/nfseReadback.ts:106-111 — `enviado`/`autorizado` AUSENTES quando o campo é PII (toma.doc).
export interface Releitura {
  status: 'IGUAL' | 'DIVERGENTE';
  divergencias: Array<{
    campo: CampoComparado;
    grupo: 'identidade' | 'conteudo';
    tipo: 'diferente' | 'ausente';
    enviado?: string;
    autorizado?: string;
  }>;
}

export type FiscalDocumentStatus = 'SENT' | 'PROCESSING' | 'AUTHORIZED' | 'AUTHORIZED_DIVERGENT' | 'REJECTED' | 'CANCELLED';
export type FiscalDocumentPendencia = 'releitura_divergente' | 'sale_cancelled_with_live_document' | 'cancelled_without_replacement';
export type DfeAmbiente = 'homologacao' | 'producao';

// espelha server/src/features/accounting/services/FiscalDocumentEmissionService.ts:60-93 (+ PR-1, item 10).
// O BE declara status/ambiente/pendencias como `string`; aqui são as uniões que ele grava.
export interface FiscalDocumentView {
  id: string;
  kind: 'NFSE' | 'NFE';
  status: FiscalDocumentStatus;
  saleId: string;
  cTribNac: string;
  anchorEntryId: string;
  ambiente: DfeAmbiente;
  /** 'manual' | 'null' | 'disabled' | parceiro (dfe/*Emissor.ts `name`). */
  partner: string;
  partnerRef: string | null;
  serie: number;
  numero: string | null;
  nNFSe: string | null;
  chaveOuCodigo: string | null;
  /** AAAA-MM-DD (date-only: nunca `new Date()`). */
  dCompet: string;
  vServCents: string;
  tpRetISSQN: number;
  vIssCents: string | null;
  vIbsCents: string | null;
  vCbsCents: string | null;
  currentAttemptNo: number;
  authorizedAt: string | null;
  cancelledAt: string | null;
  errors: Array<{ code: string; message: string }>;
  sourceDocumentId: string | null;
  attempts: Array<{ attemptNo: number; ref: string; sentAt: string; resultStatus: string | null }>;
  pendencias: FiscalDocumentPendencia[];
  xmlAttachmentId: string | null;
  pdfAttachmentId: string | null;
  /** Releitura da TENTATIVA CORRENTE; `null` sem retorno manual (e de novo `null` depois de um reenvio). */
  releitura: Releitura | null;
}

// espelha FiscalDocumentEmissionService.ts:52-58 — a tela usa de `payloads` só o tamanho.
export interface PreviewResult {
  ok: boolean;
  /** Texto do BE em pt-BR, exibido íntegro (F4). */
  faltantes: string[];
  competenciaAlerta: boolean;
  payloads: unknown[];
  tieOut: { vServCents: string; ledgerCents: string; matches: boolean };
}

// espelha FiscalDocumentEmissionService.ts:145-154
export interface DfeStatus {
  enabled: boolean;
  partner: string | null;
  ambiente: DfeAmbiente | null;
  reason?: string;
  capabilities?: { numbersDps: boolean; consultar: boolean; cancelar: boolean; webhook: boolean };
}

// espelha FiscalDocumentEmissionService.ts:385-392 — payload validado por DpsManualPayloadSchema antes de persistir (F16).
export interface FichaView {
  documentId: string;
  status: FiscalDocumentStatus;
  currentAttemptNo: number;
  payload: DpsManualPayloadInput;
}

const enc = encodeURIComponent;
const BASE = '/nfe/dfe';

export const dfeService = {
  async getStatus(): Promise<DfeStatus> {
    return (await apiClient.get<Envelope<DfeStatus>>(`${BASE}/status`)).data;
  },

  async preview(body: PreviewFiscalDocumentInput): Promise<PreviewResult> {
    return (await apiClient.post<Envelope<PreviewResult>>(`${BASE}/preview`, body)).data;
  },

  /** Um documento por código de serviço (F-DFE-16 b). */
  async emit(body: EmitFiscalDocumentInput): Promise<FiscalDocumentView[]> {
    return (await apiClient.post<Envelope<FiscalDocumentView[]>>(`${BASE}/documents`, body)).data;
  },

  async listBySale(unitId: string, saleId: string): Promise<FiscalDocumentView[]> {
    return (await apiClient.get<Envelope<FiscalDocumentView[]>>(`${BASE}/documents?unitId=${enc(unitId)}&saleId=${enc(saleId)}`)).data;
  },

  async get(id: string, unitId: string): Promise<FiscalDocumentView> {
    return (await apiClient.get<Envelope<FiscalDocumentView>>(`${BASE}/documents/${enc(id)}?unitId=${enc(unitId)}`)).data;
  },

  async ficha(id: string, unitId: string): Promise<FichaView> {
    return (await apiClient.get<Envelope<FichaView>>(`${BASE}/documents/${enc(id)}/ficha?unitId=${enc(unitId)}`)).data;
  },

  async reenviar(id: string, body: FiscalDocumentActionBodyInput): Promise<FiscalDocumentView> {
    return (await apiClient.post<Envelope<FiscalDocumentView>>(`${BASE}/documents/${enc(id)}/reenviar`, body)).data;
  },

  /** `body.errors` é `[T, ...T[]]` — quem chama monta com `nonEmpty()`. */
  async rejeicaoManual(id: string, body: RejeicaoManualInput): Promise<FiscalDocumentView> {
    return (await apiClient.post<Envelope<FiscalDocumentView>>(`${BASE}/documents/${enc(id)}/rejeicao-manual`, body)).data;
  },

  /** Multipart: `file` = XML da NFS-e autorizada; `pdf` = DANFSe opcional. */
  async retornoManual(id: string, unitId: string, xml: File, pdf?: File): Promise<FiscalDocumentView> {
    const form = new FormData();
    form.append('file', xml);
    if (pdf) form.append('pdf', pdf);
    form.append('unitId', unitId);
    return postMultipart<FiscalDocumentView>(`${BASE}/documents/${enc(id)}/retorno-manual`, form);
  },

  /** Multipart: `file` = XML do evento e101101. `cMotivo` vai como texto — o controller converte (fiscalDocumentController.ts:234-238). */
  async cancelamentoManual(id: string, fields: CancelamentoManualInput, xml: File): Promise<FiscalDocumentView> {
    const form = new FormData();
    form.append('file', xml);
    form.append('unitId', fields.unitId);
    form.append('cMotivo', String(fields.cMotivo));
    form.append('xMotivo', fields.xMotivo);
    return postMultipart<FiscalDocumentView>(`${BASE}/documents/${enc(id)}/cancelamento-manual`, form);
  },
};
