import type { EventBinding } from '../../accountingBinding/dtos/AccountingBindingDto';

/** Um ajuste papel→conta já resolvido para o código da conta (o binding guarda `accountCode` literal, F-P1-5a). */
export interface ResolvedRoleOverride {
  role: string;
  accountCode: string;
}

export interface ApplyRoleOverridesResult {
  eventBindings: EventBinding[];
  /** Papéis com ajuste que nenhum `roleSlot` do binding usa — ignorados, só listados (item 19). */
  unusedOverrides: string[];
}

/**
 * Ajuste papel→conta aplicado ao binding do kit (BE-INCR-KIT-SETOR, PR-3, item 19). Função PURA: troca o
 * `accountCode` de todo `roleSlot` cujo `role` tem ajuste, comparando o papel inteiro (a sub-chave
 * `caixa-por-metodo:<método>` é um papel próprio). Sem ajuste = identidade. Não muta a entrada.
 */
export function applyRoleOverrides(
  eventBindings: EventBinding[],
  overrides: readonly ResolvedRoleOverride[],
): ApplyRoleOverridesResult {
  const byRole = new Map(overrides.map((o) => [o.role, o.accountCode]));
  const used = new Set<string>();
  const out = eventBindings.map((eb) => ({
    ...eb,
    roleSlots: eb.roleSlots.map((slot) => {
      const accountCode = byRole.get(slot.role);
      if (accountCode === undefined) return slot;
      used.add(slot.role);
      return { ...slot, accountCode };
    }),
  }));
  return { eventBindings: out, unusedOverrides: [...byRole.keys()].filter((role) => !used.has(role)) };
}
