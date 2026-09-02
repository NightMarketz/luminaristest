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
}

interface RawBalance {
  id: string;
  customerId: string;
  packageId: string;
  unitId: string;
  balanceCents: number | string;
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
    }));
  },
};
