import { AppError, ValidationError } from '../../../lib/errors';
import type { ManualChangeIssue } from './ManualChanges';

/** W6 item 4: `tableKey` fora de `customizationState.tables` — 404, sem chamada ao modelo. */
export class TableNotInSessionError extends AppError {
  constructor() {
    super('Tabela não encontrada nesta sessão de customização.', 404, 'TABLE_NOT_IN_SESSION');
    Object.setPrototypeOf(this, TableNotInSessionError.prototype);
  }
}

/** W6 item 10: o `proposalId` não é o da proposta pendente (velho, já usado ou inexistente) — 409. */
export class ProposalStaleError extends AppError {
  constructor() {
    super('A proposta mudou ou já foi usada. Veja a proposta atual.', 409, 'PROPOSAL_STALE');
    Object.setPrototypeOf(this, ProposalStaleError.prototype);
  }
}

/**
 * W6 item 10 (F-W6-6 a): proposta com campo sensível exige `acknowledgeSensitive: true` — 400, nada aplicado.
 * `details.fields` diz quais campos pedem a ciência (revisão do #786: o servidor decide, o front não recalcula).
 */
export class SensitiveFieldNotAcknowledgedError extends ValidationError {
  constructor(fields: string[] = []) {
    super('A proposta tem campo de dado sensível: confirme antes de aplicar.', { fields }, 'SENSITIVE_FIELD_NOT_ACKNOWLEDGED');
    Object.setPrototypeOf(this, SensitiveFieldNotAcknowledgedError.prototype);
  }
}

/** W6 emenda item 3: o lote do modo manual tem mudança inválida — 400 com o motivo de cada uma, nada gravado. */
export class ManualChangeInvalidError extends ValidationError {
  constructor(issues: ManualChangeIssue[]) {
    super('Há campos inválidos nas alterações manuais.', { changes: issues }, 'MANUAL_CHANGE_INVALID');
    Object.setPrototypeOf(this, ManualChangeInvalidError.prototype);
  }
}
