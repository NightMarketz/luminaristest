import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type {
  BuildDeliveryPackageInput,
  ConfirmDeliveryInput,
  PackageProfileInput,
  RetryDeliveryInput,
} from '@/types/contracts/accounting/AccountingDeliveryDto.gen';

/**
 * Entrega do pacote ao contador (`/api/accounting/delivery/*`, C6/C6b) — FE-INCR-DELIVERY. Bodies pelo
 * contrato GERADO; respostas à mão (D11), transcritas de `AccountingDelivery.model.ts` e do service.
 * `manifest.files[].kind` é `ExportKind` (`EXPORT_SPED_ECD`…), NUNCA `ECD|ECF`. `SENT` = o operador
 * confirmou que despachou (F-CD1-a): o sistema não envia nada.
 */
const CTX = 'Entrega ao contador';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type DeliveryStatus = 'QUEUED' | 'SENT' | 'FAILED';
export type DeliverableExportKind = PackageProfileInput['kinds'][number];
/** `DELIVERABLE_EXPORT_KINDS` (`models/AccountingDelivery.model.ts`) — SPED nunca é extra. */
export const DELIVERABLE_EXPORT_KINDS: readonly DeliverableExportKind[] = [
  'EXPORT_TRIAL_BALANCE', 'EXPORT_GENERAL_LEDGER', 'EXPORT_BALANCE_SHEET', 'EXPORT_INCOME_STATEMENT', 'EXPORT_BANK_RECONCILIATION', 'EXPORT_ENTRY_SAMPLE',
];

export interface DeliveryManifestFile { kind: string; jobId: string; sha256: string }
export interface DeliveryManifestPreview {
  scope: { unitId: string; ledgerCode: string };
  period: { start: string; end: string };
  core: { ecd: DeliveryManifestFile; ecf: DeliveryManifestFile };
  files: DeliveryManifestFile[];
  generatedAt: string;
}
export interface ConfirmDeliveryResult {
  deliveryId: string;
  status: DeliveryStatus;
  statusMeaning: string;
  contact: { name: string; crcNumber: string; crcUf: string };
  signer: Record<string, string>;
  manifest: DeliveryManifestPreview & { contactId: string };
}
export interface AccountingDeliveryItem { id: string; jobId: string; kind: string; sha256: string; position: number }
export interface AccountingDeliveryLog {
  id: string;
  unitId: string;
  contactId: string;
  ecdJobId: string;
  ecfJobId: string;
  periodStart: string;
  periodEnd: string;
  manifestSha256Ecd: string;
  manifestSha256Ecf: string;
  status: DeliveryStatus;
  attemptCount: number;
  requestedById: string;
  sentAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}
export type DeliveryWithItems = AccountingDeliveryLog & { items: AccountingDeliveryItem[] };

const enc = encodeURIComponent;
const profileQs = (unitId: string, contactId: string) => `?unitId=${enc(unitId)}&contactId=${enc(contactId)}`;

export const accountingDeliveryService = {
  async getProfile(unitId: string, contactId: string): Promise<{ kinds: DeliverableExportKind[] }> {
    return (await apiClient.get<Envelope<{ kinds: DeliverableExportKind[] }>>(`/accounting/delivery/profile${profileQs(unitId, contactId)}`)).data;
  },

  /** Perfil = SUGESTÃO, não gate (F-C6b-2 a): pré-marca os extras no build. Body só `{ kinds }`. */
  async setProfile(unitId: string, contactId: string, kinds: DeliverableExportKind[]): Promise<{ kinds: DeliverableExportKind[] }> {
    const body: PackageProfileInput = { kinds };
    const res = await apiClient.put<Envelope<{ kinds: DeliverableExportKind[] }>>(`/accounting/delivery/profile${profileQs(unitId, contactId)}`, body);
    notify('Perfil de pacote salvo.', 'success', CTX);
    return res.data;
  },

  /** Preflight: valida o par + extras e devolve o manifesto SEM registrar nada. */
  async build(body: BuildDeliveryPackageInput): Promise<DeliveryManifestPreview> {
    return (await apiClient.post<Envelope<DeliveryManifestPreview>>('/accounting/delivery/build', body)).data;
  },

  /** `confirmed: true` é literal no tipo gerado — o FE não tem como mandar outra coisa. */
  async confirm(body: ConfirmDeliveryInput): Promise<ConfirmDeliveryResult> {
    const res = await apiClient.post<Envelope<ConfirmDeliveryResult>>('/accounting/delivery/confirm', body);
    notify('Despacho registrado.', 'success', CTX);
    return res.data;
  },

  async list(
    unitId: string,
    filter: { status?: DeliveryStatus; year?: number; page?: number; limit?: number } = {},
  ): Promise<{ items: DeliveryWithItems[]; total: number; page: number; limit: number }> {
    const params = new URLSearchParams({ unitId });
    for (const [k, v] of Object.entries(filter)) if (v !== undefined) params.set(k, String(v));
    return (await apiClient.get<Envelope<{ items: DeliveryWithItems[]; total: number; page: number; limit: number }>>(`/accounting/delivery?${params.toString()}`)).data;
  },

  async get(id: string, unitId: string): Promise<AccountingDeliveryLog> {
    return (await apiClient.get<Envelope<AccountingDeliveryLog>>(`/accounting/delivery/${enc(id)}?unitId=${enc(unitId)}`)).data;
  },

  /** O BE exige `deliveryId` == `:id`; só FAILED → QUEUED. */
  async retry(id: string, unitId: string): Promise<AccountingDeliveryLog> {
    const body: RetryDeliveryInput = { unitId, deliveryId: id };
    const res = await apiClient.post<Envelope<AccountingDeliveryLog>>(`/accounting/delivery/${enc(id)}/retry`, body);
    notify('Entrega reenfileirada.', 'success', CTX);
    return res.data;
  },
};
