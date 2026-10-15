import { apiClient } from '../api/api-client';
import type {
  ActivateDefaultBindingRequestInput,
  ActivateDefaultBindingResultInput,
} from '@/types/contracts/accountingBinding/ActivateDefaultBindingDto.gen';

/**
 * Binding contábil da unidade (`/api/accounting-binding`, nó LAC-B — FE-INCR-BINDING-ACTIVATION-screen-brief item 1).
 * Corpo e resposta do `activate-default` pelo contrato gerado; a linha do `GET` é view à mão (D11), só com os campos
 * que a tela usa (o snapshot gera só os schemas de entrada e a resposta do `activate-default`).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

// espelha server/src/features/accountingBinding (linha `AccountingBinding` serializada) — só o que a tela lê
export interface ActiveBindingView {
  id: string;
  sectorKey: string;
  bindingVersion: number;
  status: 'Active';
}

export type { ActivateDefaultBindingRequestInput, ActivateDefaultBindingResultInput };

const BASE = '/accounting-binding';

export const accountingBindingService = {
  /** Versões `Active` da unidade, em qualquer setor (vazio = contabilidade automática inativa). */
  async listActive(unitId: string): Promise<ActiveBindingView[]> {
    const qs = new URLSearchParams({ unitId, status: 'Active' });
    return (await apiClient.get<Envelope<ActiveBindingView[]>>(`${BASE}?${qs.toString()}`)).data;
  },

  async activateDefault(body: ActivateDefaultBindingRequestInput): Promise<ActivateDefaultBindingResultInput> {
    return (await apiClient.post<Envelope<ActivateDefaultBindingResultInput>>(`${BASE}/activate-default`, body)).data;
  },
};
