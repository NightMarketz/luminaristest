import { apiClient } from '../api/api-client';

/**
 * Cadastro de contadores (`/api/accounting/contacts`, BE-INCR-CONTADOR-DELIVERY) — por ora só a leitura
 * que a tela do SPED usa para o select "contador do cadastro" (FE-INCR-SPED-SIGNERS, F-FE-SG-2 → d). O
 * CRUD da tela é do FE-INCR-DELIVERY. Resposta à mão (D11: respostas fora do contrato gerado).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface AccountingContact {
  id: string;
  unitId: string;
  name: string;
  email: string;
  cpf: string;
  phone: string | null;
  crcNumber: string;
  crcUf: string;
  deletedAt: string | null;
}

export const accountingContactsService = {
  async listContacts(unitId: string): Promise<AccountingContact[]> {
    return (await apiClient.get<Envelope<AccountingContact[]>>(`/accounting/contacts?unitId=${encodeURIComponent(unitId)}`)).data;
  },
};
