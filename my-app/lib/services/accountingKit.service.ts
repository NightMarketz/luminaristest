import { apiClient } from '../api/api-client';
import type {
  DecideKitPendingRequestInput,
  KitInstallationViewInput,
  KitUpgradePendingViewInput,
} from '@/types/contracts/sectorKits/KitUpgradeDto.gen';

/**
 * Kit de setor da unidade (`/api/accounting-kit`, nó LAC-B — FE-INCR-BINDING-ACTIVATION-EMENDA-2-brief item 1).
 * Tipos pelo contrato gerado do `KitUpgradeDto` (a view e a pendência são schemas do snapshot).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

export type KitInstallationView = KitInstallationViewInput;
export type KitUpgradePendingView = KitUpgradePendingViewInput;
export type KitPendingStatus = KitUpgradePendingView['status'];
export type DecideKitPendingRequest = DecideKitPendingRequestInput;

const BASE = '/accounting-kit';

export const accountingKitService = {
  /** A instalação do kit da unidade; `null` quando a unidade não tem kit. */
  async getKit(unitId: string): Promise<KitInstallationView | null> {
    const qs = new URLSearchParams({ unitId });
    return (await apiClient.get<Envelope<KitInstallationView | null>>(`${BASE}?${qs.toString()}`)).data;
  },

  /** Pendências da atualização do kit, filtradas pelo status quando vier. */
  async listPending(unitId: string, status?: KitPendingStatus): Promise<KitUpgradePendingView[]> {
    const qs = new URLSearchParams({ unitId, ...(status ? { status } : {}) });
    return (await apiClient.get<Envelope<KitUpgradePendingView[]>>(`${BASE}/pending?${qs.toString()}`)).data;
  },

  /** PR-2 (item 15): aceitar aplica o valor do kit; `motivo` 10–500. */
  async acceptPending(id: string, body: DecideKitPendingRequest): Promise<KitUpgradePendingView> {
    return (await apiClient.post<Envelope<KitUpgradePendingView>>(`${BASE}/pending/${encodeURIComponent(id)}/accept`, body)).data;
  },

  /** PR-2 (item 15): recusar mantém o valor da unidade; `motivo` 10–500. */
  async rejectPending(id: string, body: DecideKitPendingRequest): Promise<KitUpgradePendingView> {
    return (await apiClient.post<Envelope<KitUpgradePendingView>>(`${BASE}/pending/${encodeURIComponent(id)}/reject`, body)).data;
  },
};
