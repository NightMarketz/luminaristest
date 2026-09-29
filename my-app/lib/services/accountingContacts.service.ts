import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type { RegisterContactInput, UpdateContactInput } from '@/types/contracts/accounting/AccountingContactDto.gen';

/**
 * Cadastro de contadores (`/api/accounting/contacts`, BE-INCR-CONTADOR-DELIVERY). Usado pelo select
 * "contador do cadastro" do SPED (FE-INCR-SPED-SIGNERS) e pela sub-seção "Contadores" da entrega
 * (FE-INCR-DELIVERY, F-FE-DL-1 → a). Bodies pelo contrato gerado; resposta à mão (D11).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

const CTX = 'Contadores';

export interface AccountingContact {
  id: string;
  unitId: string;
  name: string;
  email: string;
  cpf: string;
  phone: string | null;
  crcNumber: string;
  crcUf: string;
  crcCertificate?: string | null;
  crcCertificateValidUntil?: string | null;
  deletedAt: string | null;
}

export type { RegisterContactInput, UpdateContactInput };

const enc = encodeURIComponent;

export const accountingContactsService = {
  async listContacts(unitId: string): Promise<AccountingContact[]> {
    return (await apiClient.get<Envelope<AccountingContact[]>>(`/accounting/contacts?unitId=${enc(unitId)}`)).data;
  },

  async registerContact(body: RegisterContactInput): Promise<AccountingContact> {
    const res = await apiClient.post<Envelope<AccountingContact>>('/accounting/contacts', body);
    notify('Contador cadastrado.', 'success', CTX);
    return res.data;
  },

  /** `contactId` do corpo TEM de ser o `:id` (o BE responde 400 se divergir); `null` limpa fone/certidão. */
  async updateContact(id: string, body: UpdateContactInput): Promise<AccountingContact> {
    const res = await apiClient.patch<Envelope<AccountingContact>>(`/accounting/contacts/${enc(id)}`, body);
    notify('Contador atualizado.', 'success', CTX);
    return res.data;
  },

  /** Arquivar = DELETE soft; o contato some da lista e do select do despacho. */
  async archiveContact(id: string, unitId: string): Promise<void> {
    await apiClient.delete<Envelope<unknown>>(`/accounting/contacts/${enc(id)}?unitId=${enc(unitId)}`);
    notify('Contador arquivado.', 'success', CTX);
  },
};
