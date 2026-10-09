import type { ChargeKind } from '../models/CollectionCharge.model';
import type { CredentialSource } from '../models/PaymentAccount.model';

/**
 * CollectionProviderPort — porta da cobrança por provedor (BE-INCR-PAYMENT-PROVIDER PR-2, P2-1; BRIEF §4.2, que
 * prevalece sobre o esboço do ADR §5). O adaptador é burro: devolve o status CRU do provedor; quem mapeia para
 * `CollectionCharge.status` é o serviço (`mapMercadoPagoStatus`, P2-7). Os métodos de relatório (`requestReleaseReport`,
 * `listReleaseReports`, `downloadReleaseReport`) entram no PR-3 (P3-5; M10 do BRIEF).
 */

export interface CollectionCapabilities {
  boleto: boolean;
  pix: boolean;
  webhook: boolean;
  cancel: boolean;
  releaseReport: boolean;
  interestAndFine: boolean;
  protest: boolean;
  bankRegistration: boolean;
  maxDaysToDue: number | null;
}

/** Decifrada só em memória, no serviço. */
export interface ResolvedAccount {
  id: string;
  credentialSource: CredentialSource;
  credential: { accessToken: string; webhookSecret: string };
}

export interface PayerAddressInput {
  streetName: string;
  streetNumber: string;
  zipCode: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface PayerInput {
  firstName: string;
  lastName: string;
  email: string;
  identification: { type: 'CPF' | 'CNPJ'; number: string };
  address?: PayerAddressInput;
}

export interface CreateChargeInput {
  idempotencyKey: string; // `${charge.id}:${attempt}`
  externalReference: string; // charge.id
  kind: ChargeKind;
  amountCents: bigint; // o adaptador formata "123.45" (M1) sem float
  expiresIn: string; // ISO 8601: P{1..30}D boleto · PT30M..P30D Pix
  payer: PayerInput;
  description: string;
}

export interface ChargeInstrument {
  digitableLine?: string;
  barcode?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
}

export interface ChargeResult {
  providerStatus: string;
  providerStatusDetail: string;
  providerRef: string;
  providerPaymentRef?: string;
  instrument?: ChargeInstrument;
}

export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
}

export type WebhookVerification =
  | { ok: true; resourceRef: string }
  | { ok: false; reason: 'signature' | 'replay_window' | 'malformed' };

/** Erro do provedor com o status HTTP — o serviço decide 401 (P2-4) × definitivo (P2-3) × transitório. */
export class CollectionProviderError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number | null, // null = falha de rede/timeout
    public readonly providerCode?: string,
  ) {
    super(message);
    this.name = 'CollectionProviderError';
  }
}

export interface CollectionProviderPort {
  readonly name: 'MERCADO_PAGO' | 'NULL';
  readonly capabilities: CollectionCapabilities;
  createCharge(account: ResolvedAccount, input: CreateChargeInput): Promise<ChargeResult>;
  getCharge(account: ResolvedAccount, providerRef: string): Promise<ChargeResult>;
  cancelCharge(account: ResolvedAccount, providerRef: string, idempotencyKey: string): Promise<ChargeResult>;
  verifyWebhook(req: WebhookRequest, secret: string, now: Date): WebhookVerification;
  /** PR-3 (P3-5, M10): pede o relatório de liberações da faixa `[fromUtc, toUtc)` (ISO UTC `…Z`); o MP responde 202. */
  requestReleaseReport(account: ResolvedAccount, range: { fromUtc: string; toUtc: string }): Promise<void>;
  listReleaseReports(account: ResolvedAccount): Promise<ReleaseReportFile[]>;
  downloadReleaseReport(account: ResolvedAccount, fileName: string): Promise<Buffer>;
}

/** Um arquivo da lista do relatório de liberações (M10). Datas ISO como o MP devolve. */
export interface ReleaseReportFile {
  fileName: string;
  beginDate: string;
  endDate: string;
}
