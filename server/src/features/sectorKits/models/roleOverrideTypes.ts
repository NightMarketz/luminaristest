import { AppError } from '../../../lib/errors';

/**
 * Ajuste papel→conta do contador (BE-INCR-KIT-SETOR, PR-3, itens 18–25; emenda §11 do BRIEF).
 */

/** Eventos de auditoria (item 24) — na allowlist do `auditCanonical.ts`. O `motivo` nunca vai ao payload. */
export const KIT_ROLE_OVERRIDE_SET = 'kit.role_override_set';
export const KIT_ROLE_OVERRIDE_REMOVED = 'kit.role_override_removed';

/** Emenda E-11.3: a unidade não tem kit `INSTALLED` — não há binding de kit para ajustar. 422. */
export class KitNotInstalledError extends AppError {
  constructor() {
    super('A unidade não tem kit de setor instalado; instale o kit antes de ajustar papel→conta.', 422, 'KIT_NOT_INSTALLED');
    Object.setPrototypeOf(this, KitNotInstalledError.prototype);
  }
}

/** O papel não aparece em nenhum `roleSlot` do binding do kit instalado (§3.4). 422. */
export class RoleNotInKitError extends AppError {
  constructor(role: string, kitKey: string) {
    super(`O papel '${role}' não é usado pelo binding do kit '${kitKey}'.`, 422, 'ROLE_NOT_IN_KIT');
    Object.setPrototypeOf(this, RoleNotInKitError.prototype);
  }
}

/** Item 20: a natureza da conta não é a que o papel aceita (tabela do validador do binding). 422. */
export class RoleAccountNatureMismatchError extends AppError {
  constructor(role: string, nature: string, allowed: readonly string[]) {
    super(
      `A conta tem natureza ${nature}, e o papel '${role}' aceita ${allowed.join(' ou ')}.`,
      422,
      'ROLE_ACCOUNT_NATURE_MISMATCH',
    );
    Object.setPrototypeOf(this, RoleAccountNatureMismatchError.prototype);
  }
}

/**
 * Item 20: a conta não existe, está apagada ou é de outro escopo (`ACCOUNT_NOT_FOUND`, indistinguíveis de
 * propósito, como no validador), ou é sintética (`ACCOUNT_NOT_LEAF`). Mesmos códigos do validador do binding. 422.
 */
export class RoleOverrideAccountInvalidError extends AppError {
  constructor(code: 'ACCOUNT_NOT_FOUND' | 'ACCOUNT_NOT_LEAF') {
    super(
      code === 'ACCOUNT_NOT_FOUND'
        ? 'A conta não existe no plano de contas da unidade.'
        : 'A conta é sintética (não aceita partidas); o ajuste exige conta-folha.',
      422,
      code,
    );
    Object.setPrototypeOf(this, RoleOverrideAccountInvalidError.prototype);
  }
}

/** DELETE de papel sem ajuste vivo. 404. */
export class RoleOverrideNotFoundError extends AppError {
  constructor(role: string) {
    super(`O papel '${role}' não tem ajuste.`, 404, 'ROLE_OVERRIDE_NOT_FOUND');
    Object.setPrototypeOf(this, RoleOverrideNotFoundError.prototype);
  }
}
