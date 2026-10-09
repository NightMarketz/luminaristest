import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CollectionProviderError,
  type ChargeResult,
  type CollectionCapabilities,
  type CollectionProviderPort,
  type CreateChargeInput,
  type ResolvedAccount,
  type WebhookRequest,
  type WebhookVerification,
} from './CollectionProviderPort';
import { MP_MAX_DAYS_TO_DUE, PAYMENT_WEBHOOK_MAX_AGE_MS } from '../models/CollectionCharge.model';

/**
 * MercadoPagoCollectionProvider — 1º adaptador da porta (BE-INCR-PAYMENT-PROVIDER PR-2, P2-1; F-PP-4 a: Orders API).
 * Fontes (doc oficial, relida em 10/10): POST /v1/orders boleto (M1) e Pix (M4), GET /v1/orders/{id} (M5),
 * POST /v1/orders/{id}/cancel (M7), notificações da Orders (M8) e o validador do SDK oficial `mercadopago@3.6.1`
 * (`dist/utils/webhook/index.js`) para o template HMAC (M9).
 *
 * Assinatura (decisões do dono de 10/10, D-2026-10-10-F5-PR2-FORKS):
 * - F1 (a): o HMAC usa o `data.id` da query COMO CHEGA (o SDK oficial não passa para minúsculo; o spec do SDK tem o
 *   caso "uppercase dataId is preserved in HMAC").
 * - F2 (a): `ts` com 13 dígitos = milissegundos; com 10 dígitos = segundos; outro tamanho ⇒ malformed.
 * - Template `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` — par ausente sai do template; SHA-256 hex; comparação em
 *   tempo constante. Janela |now − ts| ≤ 15 dias (F-PP-8 c).
 *
 * O status devolvido é o CRU da ordem (raiz `status`/`status_detail`, M6); o mapa para `CollectionCharge.status` é do
 * serviço. HTTP via `fetch` global (Node ≥ 18) — os testes trocam o `fetch`, nunca chamam o MP de verdade.
 */
export const MP_API_BASE = 'https://api.mercadopago.com';

export class MercadoPagoCollectionProvider implements CollectionProviderPort {
  public readonly name = 'MERCADO_PAGO' as const;
  public readonly capabilities: CollectionCapabilities = {
    boleto: true,
    pix: true,
    webhook: true,
    cancel: true,
    releaseReport: true,
    interestAndFine: false,
    protest: false,
    bankRegistration: false,
    maxDaysToDue: MP_MAX_DAYS_TO_DUE,
  };

  constructor(private readonly baseUrl: string = MP_API_BASE) {}

  async createCharge(account: ResolvedAccount, input: CreateChargeInput): Promise<ChargeResult> {
    const amount = formatCents(input.amountCents);
    const payer: Record<string, unknown> = {
      email: input.payer.email,
      first_name: input.payer.firstName,
      last_name: input.payer.lastName,
      identification: { type: input.payer.identification.type, number: input.payer.identification.number },
    };
    if (input.payer.address) {
      const a = input.payer.address;
      payer.address = {
        street_name: a.streetName,
        street_number: a.streetNumber,
        zip_code: a.zipCode,
        neighborhood: a.neighborhood,
        state: a.state,
        city: a.city,
      };
    }
    const paymentMethod = input.kind === 'BOLETO' ? { id: 'boleto', type: 'ticket' } : { id: 'pix', type: 'bank_transfer' };
    const body = {
      type: 'online',
      external_reference: input.externalReference,
      processing_mode: 'automatic',
      total_amount: amount,
      description: input.description,
      payer,
      transactions: { payments: [{ amount, payment_method: paymentMethod, expiration_time: input.expiresIn }] },
    };
    return toResult(await this.call(account, 'POST', '/v1/orders', input.idempotencyKey, body));
  }

  async getCharge(account: ResolvedAccount, providerRef: string): Promise<ChargeResult> {
    return toResult(await this.call(account, 'GET', `/v1/orders/${encodeURIComponent(providerRef)}`));
  }

  async cancelCharge(account: ResolvedAccount, providerRef: string, idempotencyKey: string): Promise<ChargeResult> {
    return toResult(await this.call(account, 'POST', `/v1/orders/${encodeURIComponent(providerRef)}/cancel`, idempotencyKey));
  }

  verifyWebhook(req: WebhookRequest, secret: string, now: Date): WebhookVerification {
    const xSignature = first(req.headers['x-signature']);
    const xRequestId = first(req.headers['x-request-id']);
    const dataId = first(req.query['data.id']);
    if (!xSignature || !dataId) return { ok: false, reason: 'malformed' };
    let ts: string | undefined;
    let v1: string | undefined;
    for (const part of xSignature.split(',')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const key = part.slice(0, eq).trim().toLowerCase();
      const value = part.slice(eq + 1).trim();
      if (key === 'ts') ts = value;
      else if (key === 'v1') v1 = value;
    }
    if (!ts || !v1 || !/^\d+$/.test(ts)) return { ok: false, reason: 'malformed' };
    let tsMs: number;
    if (ts.length === 13) tsMs = Number(ts);
    else if (ts.length === 10) tsMs = Number(ts) * 1000;
    else return { ok: false, reason: 'malformed' };

    const parts: string[] = [`id:${dataId}`];
    if (xRequestId) parts.push(`request-id:${xRequestId}`);
    parts.push(`ts:${ts}`);
    const computed = createHmac('sha256', secret).update(parts.join(';') + ';').digest('hex');
    const a = Buffer.from(computed);
    const b = Buffer.from(v1);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'signature' };
    if (Math.abs(now.getTime() - tsMs) > PAYMENT_WEBHOOK_MAX_AGE_MS) return { ok: false, reason: 'replay_window' };
    return { ok: true, resourceRef: dataId };
  }

  private async call(
    account: ResolvedAccount,
    method: 'GET' | 'POST',
    path: string,
    idempotencyKey?: string,
    body?: unknown,
  ): Promise<MpOrder> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      Authorization: `Bearer ${account.credential.accessToken}`,
    };
    if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      // Mensagem sem o token: só o motivo de rede (P1-7 / invariante 10).
      throw new CollectionProviderError(`Mercado Pago inacessível: ${error instanceof Error ? error.name : 'erro de rede'}`, null);
    }
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const code = isRecord(json) && typeof json.errors === 'object' && Array.isArray(json.errors) && isRecord(json.errors[0])
        ? String(json.errors[0].code ?? '')
        : isRecord(json) && typeof json.error === 'string'
          ? json.error
          : undefined;
      throw new CollectionProviderError(`Mercado Pago respondeu ${res.status}${code ? ` (${code})` : ''}`, res.status, code || undefined);
    }
    if (!isRecord(json) || typeof json.id !== 'string') {
      throw new CollectionProviderError('Mercado Pago respondeu sem order id', res.status);
    }
    return json as unknown as MpOrder;
  }
}

interface MpOrder {
  id: string;
  status?: string;
  status_detail?: string;
  transactions?: {
    payments?: Array<{
      id?: string;
      payment_method?: {
        ticket_url?: string;
        barcode_content?: string;
        digitable_line?: string;
        qr_code?: string;
        qr_code_base64?: string;
      };
    }>;
  };
}

function toResult(order: MpOrder): ChargeResult {
  const payment = order.transactions?.payments?.[0];
  const pm = payment?.payment_method;
  const instrument = pm
    ? Object.fromEntries(
        Object.entries({
          digitableLine: pm.digitable_line,
          barcode: pm.barcode_content,
          qrCode: pm.qr_code,
          qrCodeBase64: pm.qr_code_base64,
          ticketUrl: pm.ticket_url,
        }).filter(([, v]) => typeof v === 'string'),
      )
    : undefined;
  return {
    providerStatus: order.status ?? '',
    providerStatusDetail: order.status_detail ?? '',
    providerRef: order.id,
    ...(payment?.id ? { providerPaymentRef: payment.id } : {}),
    ...(instrument && Object.keys(instrument).length > 0 ? { instrument } : {}),
  };
}

/** Centavos → "123.45" sem float (M1: `total_amount` string decimal). */
export function formatCents(cents: bigint): string {
  if (cents < 0n) throw new Error('valor negativo');
  const s = cents.toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}

function first(v: unknown): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v;
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
