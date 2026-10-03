/**
 * AccountantAssignment — constantes de domínio (BE-INCR-ACCOUNTANT-GOVERNANCE, nó GOV-CONTADOR, BRIEF
 * itens 1 e 16). Estados em `ledgerStatus.ts` (`ASSIGNMENT_STATUSES`).
 */
export const ACCOUNTANT_ASSIGNMENT_INVITED = 'accountant_assignment.invited';
export const ACCOUNTANT_ASSIGNMENT_ACCEPTED = 'accountant_assignment.accepted';
export const ACCOUNTANT_ASSIGNMENT_ENDED = 'accountant_assignment.ended';

/** `endReason` gravado quando o aceite de um novo contador encerra o anterior (item 7). */
export const ASSIGNMENT_SUPERSEDED_REASON = 'SUPERSEDED';
