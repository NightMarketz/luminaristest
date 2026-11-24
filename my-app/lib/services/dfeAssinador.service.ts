import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type { DfeSignerCodigoViewInput, DfeSignerViewInput } from '@/types/contracts/accounting/DfeSignerDto.gen';

/**
 * Assinador local da unidade (FE-INCR-NFCE-ASSINADOR FA-1; rotas de usuário do X10a EMENDA-4 §4.2): gerar código de
 * pareamento, ler o estado e revogar o vínculo da unidade. Tipos só do contrato gerado (`DfeSignerDto.gen.ts`); as
 * rotas `/api/dfe-assinador/v1/*` são do dispositivo e o FE não as toca.
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

export type DfeSignerCodigoView = DfeSignerCodigoViewInput;
export type DfeSignerView = DfeSignerViewInput;

const CTX = 'Assinador local';
const enc = encodeURIComponent;

export const dfeAssinadorService = {
  /** Código de pareamento — aparece uma vez (o servidor guarda só o hash). */
  async gerarCodigo(unitId: string): Promise<DfeSignerCodigoView> {
    const res = await apiClient.post<Envelope<DfeSignerCodigoView>>(`/accounting/dfe-assinador/${enc(unitId)}/codigos`, {});
    notify('Código de pareamento gerado.', 'success', CTX);
    return res.data;
  },

  /** Estado do assinador da unidade; `null` quando não há assinador pareado. */
  async getEstado(unitId: string): Promise<DfeSignerView | null> {
    return (await apiClient.get<Envelope<DfeSignerView | null>>(`/accounting/dfe-assinador/${enc(unitId)}`)).data ?? null;
  },

  /** Revoga só o vínculo desta unidade (o servidor responde 204). */
  async revogar(unitId: string): Promise<void> {
    await apiClient.delete(`/accounting/dfe-assinador/${enc(unitId)}`);
    notify('Assinador local revogado nesta unidade.', 'success', CTX);
  },
};
