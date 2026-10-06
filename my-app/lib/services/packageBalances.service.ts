import { apiClient } from '../api/api-client';

/**
 * Package balances read client (`GET /api/package-balances`) — LAC-C (carona da LAC-A).
 * `balanceCents` chega serializado (o model é BigInt no servidor); normalizamos para number
 * defensivamente (string | number) — dinheiro segue em CENTAVOS inteiros.
 */

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface CustomerPackageBalance {
  id: string;
  customerId: string;
  packageId: string;
  unitId: string;
  balanceCents: number;
  /** Último dia válido, `YYYY-MM-DD` (date-only); null = sem validade. Formate com `formatDateBR`, nunca `new Date(iso)`. */
  expiresOn: string | null;
}

interface RawBalance {
  id: string;
  customerId: string;
  packageId: string;
  unitId: string;
  balanceCents: number | string;
  /** FE-INCR-PACOTE-VALIDADE (F1): `expiresAt` chega como ISO à meia-noite UTC (date-only); null = sem validade. */
  expiresAt?: string | null;
}

export const packageBalancesService = {
  async listBalances(unitId: string, customerId?: string): Promise<CustomerPackageBalance[]> {
    const params = new URLSearchParams({ unitId });
    if (customerId) params.set('customerId', customerId);
    const res = await apiClient.get<ApiEnvelope<{ balances: RawBalance[] }>>(
      `/package-balances?${params.toString()}`,
    );
    return (res.data.balances ?? []).map((b) => ({
      id: b.id,
      customerId: b.customerId,
      packageId: b.packageId,
      unitId: b.unitId,
      balanceCents: Number(b.balanceCents),
      expiresOn: b.expiresAt ? b.expiresAt.slice(0, 10) : null,
    }));
  },
};
