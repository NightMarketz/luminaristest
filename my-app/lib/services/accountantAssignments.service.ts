import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type {
  AcceptAccountantAssignmentInput,
  EndAccountantAssignmentInput,
  InviteAccountantInput,
} from '@/types/contracts/accounting/AccountantAssignmentDto.gen';

/**
 * Atribuição do contador responsável (`/api/accounting/accountant-assignments`, BE do #482 — nó GOV-CONTADOR,
 * FE-INCR-ACCOUNTANT-GOVERNANCE item 1). Bodies pelo contrato gerado; as views de resposta são à mão
 * (o snapshot gera só os schemas de entrada), transcritas de `AccountantAssignmentDto.ts`.
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

const CTX = 'Contador responsável';

export type AssignmentStatus = 'PENDING' | 'ACTIVE' | 'ENDED';

export interface AccountantAssignmentView {
  id: string;
  unitId: string;
  status: AssignmentStatus;
  accountingContactId: string;
  accountantUserId: string;
  crcNumber: string;
  crcUf: string;
  activeFrom: string | null;
  activeUntil: string | null;
  endReason: string | null;
  createdAt: string;
}

/** O que o contador vê: a linha + quem é o dono (o `ownerUserId` é o que ele manda nos 9 handlers do F-GOV-7). */
export interface MyAccountantAssignmentView extends AccountantAssignmentView {
  ownerEmail: string;
  ownerUserId: string;
}

export type { AcceptAccountantAssignmentInput, EndAccountantAssignmentInput, InviteAccountantInput };

const enc = encodeURIComponent;
const BASE = '/accounting/accountant-assignments';

/** Corpo fixo do aceite: o tipo gerado é o literal `true` (F-GOV-8 a reforçada). */
const ACCEPT_BODY = { declaresWrittenContract: true } satisfies AcceptAccountantAssignmentInput;

export const accountantAssignmentsService = {
  async invite(body: InviteAccountantInput): Promise<AccountantAssignmentView> {
    const res = await apiClient.post<Envelope<AccountantAssignmentView>>(BASE, body);
    notify('Convite enviado ao contador.', 'success', CTX);
    return res.data;
  },

  /** Histórico do escopo (dono). */
  async listByScope(unitId: string): Promise<AccountantAssignmentView[]> {
    return (await apiClient.get<Envelope<AccountantAssignmentView[]>>(`${BASE}?unitId=${enc(unitId)}`)).data;
  },

  /** Carteira do contador: PENDING + ACTIVE. */
  async listMine(): Promise<MyAccountantAssignmentView[]> {
    return (await apiClient.get<Envelope<MyAccountantAssignmentView[]>>(`${BASE}/mine`)).data;
  },

  async accept(id: string): Promise<AccountantAssignmentView> {
    const res = await apiClient.post<Envelope<AccountantAssignmentView>>(`${BASE}/${enc(id)}/accept`, ACCEPT_BODY);
    notify('Atribuição aceita.', 'success', CTX);
    return res.data;
  },

  async end(id: string, body: EndAccountantAssignmentInput): Promise<AccountantAssignmentView> {
    const res = await apiClient.post<Envelope<AccountantAssignmentView>>(`${BASE}/${enc(id)}/end`, body);
    notify('Atribuição encerrada.', 'success', CTX);
    return res.data;
  },
};
