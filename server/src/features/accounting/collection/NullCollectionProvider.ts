import type {
  ChargeResult,
  CollectionCapabilities,
  CollectionProviderPort,
  CreateChargeInput,
  ReleaseReportFile,
  ResolvedAccount,
  WebhookVerification,
} from './CollectionProviderPort';

/**
 * NullCollectionProvider — adaptador de desenvolvimento/teste (BE-INCR-PAYMENT-PROVIDER PR-2, P2-1; invariante 12).
 * Responde sem rede: a cobrança nasce `action_required/waiting_payment`. **Recusa `NODE_ENV=production`** no
 * construtor, como o `NullEmissor` (S14). Sem webhook real: `verifyWebhook` sempre recusa.
 */
export class NullCollectionProvider implements CollectionProviderPort {
  public readonly name = 'NULL' as const;
  public readonly capabilities: CollectionCapabilities = {
    boleto: true,
    pix: true,
    webhook: false,
    cancel: true,
    releaseReport: false,
    interestAndFine: false,
    protest: false,
    bankRegistration: false,
    maxDaysToDue: 30,
  };

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NullCollectionProvider não pode rodar sob NODE_ENV=production (ADR-PAYMENT-PROVIDER invariante 12).');
    }
  }

  async createCharge(_account: ResolvedAccount, input: CreateChargeInput): Promise<ChargeResult> {
    return { providerStatus: 'action_required', providerStatusDetail: 'waiting_payment', providerRef: `NULL-${input.externalReference}` };
  }

  async getCharge(_account: ResolvedAccount, providerRef: string): Promise<ChargeResult> {
    return { providerStatus: 'action_required', providerStatusDetail: 'waiting_payment', providerRef };
  }

  async cancelCharge(_account: ResolvedAccount, providerRef: string): Promise<ChargeResult> {
    return { providerStatus: 'canceled', providerStatusDetail: 'canceled', providerRef };
  }

  verifyWebhook(): WebhookVerification {
    return { ok: false, reason: 'signature' };
  }

  // PR-3 (P3-5): sem relatório — o adaptador nulo anuncia `releaseReport: false`.
  async requestReleaseReport(): Promise<void> {
    return undefined;
  }

  async listReleaseReports(): Promise<ReleaseReportFile[]> {
    return [];
  }

  async downloadReleaseReport(): Promise<Buffer> {
    return Buffer.alloc(0);
  }
}
