import { notify } from '../notifications/notify';
import { multipartAuthHeaders, multipartBaseUrl, multipartParseError } from './multipart';
import type { Payable } from './accountsPayable.service';

/**
 * NF-e client (FE-INCR-NFE, rodada 2b) — thin typed client over the three multipart endpoints of
 * `/api/nfe`. Every call is `fetch` + `FormData` (apiClient is JSON-only); the server DTOs are
 * `.strict()`, so send EXACTLY the documented fields. `itemMappings` travels as a JSON STRING because
 * multipart fields are flat (the controller `JSON.parse`s it before Zod).
 *
 * Types mirror the server contracts (BRIEF FE-INCR-NFE §Backend real; NfePreviewSchema from
 * BE-INCR-NFE-PREVIEW). Money is INTEGER cents as `number` (not string like the reports).
 */

const CTX = 'NF-e';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface NfeParty {
  cnpj?: string;
  cpf?: string;
  nome?: string;
  ie?: string;
}

export interface NfePreviewItem {
  nItem: number;
  cProd: string;
  cEAN: string;
  xProd: string;
  ncm: string;
  cfop: string;
  uCom: string;
  qCom: string;
  vUnComStr: string;
  vProdCents: number;
  vDescCents: number;
  /** '0' = does not compose the note total (the import ignores it and reports it in `ignoredItems`). */
  indTot: '0' | '1';
}

export interface NfePreview {
  chaveAcesso: string;
  ide: { numero: string; serie: string; dhEmiDate: string; tpNF: string; natOp: string; mod: string };
  emit: NfeParty;
  dest: NfeParty;
  itens: NfePreviewItem[];
  totais: {
    vProdCents: number;
    vDescCents: number;
    vFreteCents: number;
    vSegCents: number;
    vOutroCents: number;
    vIPICents: number;
    vSTCents: number;
    vICMSCents: number;
    vNFCents: number;
  };
  protocolo: { cStat: string; nProt: string; dhRecbtoDate: string };
  /** A LIVE payable with documentNumber = chaveAcesso already exists in this unit (F-PREV-3 → b). */
  alreadyImported: boolean;
  existingPayableId: string | null;
}

export interface NfeItemMapping {
  cProd: string;
  productRef: string;
}

export interface NfeIgnoredItem {
  nItem: number;
  cProd: string;
  xProd: string;
  reason: 'indTot-0';
}

export interface NfePurchaseImportResult {
  payable: Payable;
  ignoredItems: NfeIgnoredItem[];
}

export interface NfeSaleReconciliationReport {
  matched: true;
  saleId: string;
  journalEntryId: string;
  chaveAcesso: string;
  sourceDocumentId: string;
  nfeTotalCents: number;
  saleTotalCents: number;
  nfeItemCount: number;
  totalMatches: boolean;
  differenceCents: number;
  divergences: string[];
}

export interface PreviewNfeParams {
  unitId: string;
}

export interface ImportPurchaseNfeParams {
  unitId: string;
  itemMappings: NfeItemMapping[];
  counterpartyId?: string;
  dueDate?: string;
}

export interface ReconcileSaleNfeParams {
  unitId: string;
  saleId: string;
}

async function postMultipart<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${multipartBaseUrl()}${path}`, {
    method: 'POST',
    headers: multipartAuthHeaders(), // no Content-Type — the browser sets the multipart boundary
    body: form,
  });
  if (!response.ok) throw await multipartParseError(response);
  const res = (await response.json()) as ApiEnvelope<T>;
  return res.data;
}

export const nfeService = {
  /** Dry-run parse — read-only, so it never notifies. */
  async previewNfe(params: PreviewNfeParams, file: File): Promise<NfePreview> {
    const form = new FormData();
    form.append('file', file);
    form.append('unitId', params.unitId);
    return postMultipart<NfePreview>('/nfe/preview', form);
  },

  /** Books ONE payable + stock inbounds (server side). `itemMappings` as JSON string (flat multipart). */
  async importPurchaseNfe(params: ImportPurchaseNfeParams, file: File): Promise<NfePurchaseImportResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('unitId', params.unitId);
    form.append('itemMappings', JSON.stringify(params.itemMappings));
    if (params.counterpartyId) form.append('counterpartyId', params.counterpartyId);
    if (params.dueDate) form.append('dueDate', params.dueDate);
    const result = await postMultipart<NfePurchaseImportResult>('/nfe/purchase', form);
    notify('NF-e de compra importada.', 'success', CTX);
    return result;
  },

  /** Crosses the note with the ALREADY-POSTED sale (explicit `saleId` anchor). Posts nothing. */
  async reconcileSaleNfe(params: ReconcileSaleNfeParams, file: File): Promise<NfeSaleReconciliationReport> {
    const form = new FormData();
    form.append('file', file);
    form.append('unitId', params.unitId);
    form.append('saleId', params.saleId);
    const report = await postMultipart<NfeSaleReconciliationReport>('/nfe/sale', form);
    notify('NF-e de venda anexada à venda.', 'success', 'Vendas');
    return report;
  },
};
