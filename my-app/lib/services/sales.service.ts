import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';

/**
 * Sales lifecycle service — thin typed client over the DEDICATED sale-transition endpoints
 * (`/api/sales/pay|cancel|return`). FE-INCR-SALE-ACTIONS (LAC-A): these are the ONLY legitimate
 * paths for settle/cancel/return of a Finalized sale — the generic DynamicTable PUT hits the
 * `immutableAfter` freeze and, worse, would skip the accounting bridges (settlement posting,
 * reversal, contra-revenue). The server DTOs are `.strict()`: send EXACTLY these fields.
 */

const CTX = 'Vendas';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type SalePaymentMethod = 'Credit Card' | 'Debit Card' | 'Cash' | 'Pix' | 'Package Balance';

export const SALE_PAYMENT_METHODS: readonly SalePaymentMethod[] = [
  'Cash',
  'Pix',
  'Credit Card',
  'Debit Card',
  'Package Balance',
];

export interface PaySalePayload {
  tableId: string;
  saleId: string;
  paymentMethod: SalePaymentMethod;
  /** ISO datetime; server defaults to "now" when omitted. */
  paidAt?: string;
  paymentReference?: string;
  /** REQUIRED iff paymentMethod === 'Package Balance'; FORBIDDEN otherwise (server superRefine). */
  packageId?: string;
}

export interface CancelOrReturnSalePayload {
  tableId: string;
  saleId: string;
  reason?: string;
}

/** The endpoints return the updated raw DynamicTable row — treat as opaque and refetch. */
type RawSaleRow = { id: string; data: Record<string, unknown> };

export const salesService = {
  /** Settle a Finalized sale — isSystem whitelist write + post-commit settlement bridge. */
  async paySale(payload: PaySalePayload): Promise<RawSaleRow> {
    const res = await apiClient.post<ApiEnvelope<RawSaleRow>>('/sales/pay', payload);
    notify('Pagamento registrado.', 'success', CTX);
    return res.data;
  },

  /** Cancel a Finalized sale — reverses the revenue entry via the reversal bridge. */
  async cancelSale(payload: CancelOrReturnSalePayload): Promise<RawSaleRow> {
    const res = await apiClient.post<ApiEnvelope<RawSaleRow>>('/sales/cancel', payload);
    notify('Venda cancelada.', 'success', CTX);
    return res.data;
  },

  /** Return a Finalized sale — books the 3.2 contra-revenue (original entry untouched). */
  async returnSale(payload: CancelOrReturnSalePayload): Promise<RawSaleRow> {
    const res = await apiClient.post<ApiEnvelope<RawSaleRow>>('/sales/return', payload);
    notify('Devolução registrada.', 'success', CTX);
    return res.data;
  },
};
