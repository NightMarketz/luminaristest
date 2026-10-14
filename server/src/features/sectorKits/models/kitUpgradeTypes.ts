import { AppError } from '../../../lib/errors';

/**
 * Atualização do kit em 3 níveis (BE-INCR-KIT-SETOR, PR-4, itens 26–40; emenda §12 do BRIEF).
 *
 * (a) `additive` aplica sozinho, porque não muda onde um lançamento cai; (b) `forward` aplica com aviso e muda só o
 * futuro; (c) `conflict` vira pendência e não aplica. Serviço fiscal por serviço não entra no diff (emenda E-12.1:
 * desde o PR-K3 o catálogo é só sugestão, lida do kit instalado) — as mudanças dele viram `notices`.
 */
export const ADDITIVE_KINDS = ['account', 'roleDefault', 'referential'] as const;
export type AdditiveKind = (typeof ADDITIVE_KINDS)[number];

/** `changed_account` = emenda E-12.2: conta da extensão que veio do kit, sem partida, com nome/natureza mudados. */
export const FORWARD_KINDS = ['new_binding', 'changed_binding', 'changed_account'] as const;
export type ForwardKind = (typeof FORWARD_KINDS)[number];

export const CONFLICT_REASONS = [
  'override',
  'account_deleted_by_user',
  'account_changed_in_use',
  'field_set_by_user',
  'referential_year_frozen',
  'referential_mapped_differently',
] as const;
export type ConflictReason = (typeof CONFLICT_REASONS)[number];

export const KIT_UPGRADE_MODES = ['DRY_RUN', 'APPLY'] as const;
export type KitUpgradeMode = (typeof KIT_UPGRADE_MODES)[number];

/** Por unidade: `PLANNED` (dry-run), `APPLIED` ou `FAILED`. `PARTIAL` é o resumo do CLI quando alguma unidade falhou. */
export const KIT_UPGRADE_RUN_STATUSES = ['PLANNED', 'APPLIED', 'PARTIAL', 'FAILED'] as const;
export type KitUpgradeRunStatus = (typeof KIT_UPGRADE_RUN_STATUSES)[number];

export const KIT_PENDING_STATUSES = ['OPEN', 'ACCEPTED', 'REJECTED'] as const;
export type KitPendingStatus = (typeof KIT_PENDING_STATUSES)[number];

/** Ator gravado no `KitUpgradeRun` quando quem roda é o passo do deploy. */
export const DEPLOY_CLI_ACTOR = 'deploy-cli';

/** Eventos de auditoria (item 39) — na allowlist do `auditCanonical.ts`. O dry-run não audita. */
export const KIT_UPGRADE_APPLIED = 'kit.upgrade_applied';
export const KIT_UPGRADE_PENDING_ACCEPTED = 'kit.upgrade_pending_accepted';
export const KIT_UPGRADE_PENDING_REJECTED = 'kit.upgrade_pending_rejected';

/** Item 34: `--apply` sem um DRY_RUN da mesma (unidade, from→to) no mesmo deploy. 409. */
export class KitUpgradeDryRunRequiredError extends AppError {
  constructor(unitId: string, from: number, to: number, deployId: string) {
    super(
      `A unidade '${unitId}' não tem dry-run v${from}→v${to} gravado no deploy '${deployId}'; rode --dry-run antes do --apply.`,
      409,
      'KIT_UPGRADE_DRY_RUN_REQUIRED',
    );
    Object.setPrototypeOf(this, KitUpgradeDryRunRequiredError.prototype);
  }
}

/** Item 37: decidir uma pendência que já não está `OPEN`. 409. */
export class KitPendingNotOpenError extends AppError {
  constructor(status: string) {
    super(`A pendência já foi decidida (status ${status}).`, 409, 'KIT_PENDING_NOT_OPEN');
    Object.setPrototypeOf(this, KitPendingNotOpenError.prototype);
  }
}

/** Pendência inexistente ou de outro escopo (indistinguíveis de propósito). 404. */
export class KitPendingNotFoundError extends AppError {
  constructor() {
    super('Pendência não encontrada.', 404, 'KIT_PENDING_NOT_FOUND');
    Object.setPrototypeOf(this, KitPendingNotFoundError.prototype);
  }
}

/** Emenda E-12.3: aceitar mudança de referencial em ano congelado não existe — só recusar. 422. */
export class KitPendingFrozenYearError extends AppError {
  constructor(itemKey: string) {
    super(
      `O item '${itemKey}' é de um ano congelado (ECF transmitida ou período fechado); só dá para recusar.`,
      422,
      'KIT_PENDING_FROZEN_YEAR',
    );
    Object.setPrototypeOf(this, KitPendingFrozenYearError.prototype);
  }
}
