import type { MyAccountantAssignmentView } from '../../../lib/services/accountantAssignments.service';

/**
 * Contexto do modo cliente (F-FE-GOV-1 b): o livro de OUTRO usuário em que o contador age. Montado a partir de
 * uma linha ACTIVE do `/mine` e passado como prop `governance?` aos painéis — prop, não React Context: são 2
 * consumidores e a prop deixa o modo delegado visível na assinatura (BRIEF item 3).
 */
export interface GovernanceScope {
  assignmentId: string;
  ownerUserId: string;
  ownerEmail: string;
  unitId: string;
  crcNumber: string;
  crcUf: string;
}

/** Só ACTIVE entra no modo cliente; o chamador filtra. Retorno declarado (regra do mapper). */
export function toGovernanceScope(a: MyAccountantAssignmentView): GovernanceScope {
  return {
    assignmentId: a.id,
    ownerUserId: a.ownerUserId,
    ownerEmail: a.ownerEmail,
    unitId: a.unitId,
    crcNumber: a.crcNumber,
    crcUf: a.crcUf,
  };
}

/** `unitId` abreviado do rótulo do cliente (F-FE-GOV-2 a: e-mail do dono + `unitId` abreviado, zero BE). */
export const shortUnit = (unitId: string): string => `${unitId.slice(0, 8)}…`;

/**
 * Mapa `code` do servidor → chave i18n (um só lugar, consumido pelos painéis; BRIEF §4). O fallback inline
 * pt-BR de cada chave mora em `GOVERNANCE_ERROR_FALLBACK`, no padrão `t(key, fallback)` do módulo.
 */
export const GOVERNANCE_ERROR_KEYS: Record<string, string> = {
  ACCOUNTANT_REQUIRED: 'governance.error.accountantRequired',
  ACCOUNTANT_NOT_ASSIGNED: 'governance.error.notAssigned',
  REVIEWER_CRC_MISMATCH: 'governance.error.crcMismatch',
  PERIOD_STATUS_CHANGED: 'governance.error.periodChanged',
  ACCOUNTANT_USER_NOT_FOUND: 'governance.error.userNotFound',
  SELF_ASSIGNMENT: 'governance.error.selfAssignment',
  ASSIGNMENT_PENDING_EXISTS: 'governance.error.pendingExists',
  ASSIGNMENT_STATUS_CHANGED: 'governance.error.assignmentChanged',
  // Política versionada (FE-INCR-ACCOUNTING-POLICY-VERSION item 3).
  POLICY_APPROVAL_REQUIRED: 'governance.error.policyApprovalRequired',
  POLICY_NO_ACCOUNTANT: 'governance.error.policyNoAccountant',
  POLICY_VERSION_STATUS_CHANGED: 'governance.error.policyVersionChanged',
};

export const GOVERNANCE_ERROR_FALLBACK: Record<string, string> = {
  ACCOUNTANT_REQUIRED:
    'Este escopo tem contador responsável ativo ({{name}}, {{crc}}). Só ele reabre períodos e assina revisões. Para fazer você mesmo, encerre a atribuição na aba Compliance.',
  ACCOUNTANT_NOT_ASSIGNED: 'Sua atribuição com este cliente não está mais ativa.',
  REVIEWER_CRC_MISMATCH: 'O CRC informado não confere com o da atribuição ({{crc}}).',
  PERIOD_STATUS_CHANGED: 'O período mudou de estado enquanto você agia; recarregado.',
  ACCOUNTANT_USER_NOT_FOUND: 'Não há usuário cadastrado com este e-mail. O contador precisa criar a conta antes do convite.',
  SELF_ASSIGNMENT: 'Você não pode se atribuir como contador do próprio escopo.',
  ASSIGNMENT_PENDING_EXISTS: 'Já existe um convite pendente para este escopo. Encerre-o antes de convidar de novo.',
  ASSIGNMENT_STATUS_CHANGED: 'O convite mudou de estado; recarregue a tela.',
  POLICY_APPROVAL_REQUIRED: 'Este escopo tem contador responsável ativo: a mudança precisa da aprovação dele.',
  POLICY_NO_ACCOUNTANT: 'Este escopo não tem mais contador responsável ativo: não há quem aprove a proposta.',
  POLICY_VERSION_STATUS_CHANGED: 'Esta proposta mudou (o dono enviou outra ou ela já foi decidida); recarregado.',
};

/**
 * `ACCOUNTANT_REQUIRED` no contexto da política: o texto do mapa fala de período/revisão, então o painel de versões
 * escolhe esta chave própria (item 3).
 */
export const POLICY_ACCOUNTANT_REQUIRED_KEY = 'governance.error.policyAccountantRequired';
export const POLICY_ACCOUNTANT_REQUIRED_FALLBACK = 'Só o contador responsável ativo deste escopo aprova ou rejeita propostas de política.';
