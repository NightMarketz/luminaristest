import type { EventBinding } from '../../accountingBinding/dtos/AccountingBindingDto';

/**
 * Ajuste papel→conta aplicado ao binding do kit antes do compile (BE-INCR-KIT-SETOR, item 10.4 / item 19).
 *
 * No PR-2 ainda não existe ajuste (`RoleAccountOverride` é do PR-3), então a função é a identidade. O PR-3 a
 * troca pela versão pura com `overrides` (item 19) sem mexer em quem chama.
 */
export function applyRoleOverrides(eventBindings: EventBinding[]): EventBinding[] {
  return eventBindings;
}
