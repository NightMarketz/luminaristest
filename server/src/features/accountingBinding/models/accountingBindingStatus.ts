/**
 * A Prensa (BE-INCR-BINDING-PRESS, Fase P1) — os 3 estados do binding compilado
 * (`AccountingBinding.status`, `schema.prisma:1177` — "Draft | Active | Superseded (ver
 * ACCOUNTING_BINDING_STATUSES)"). Corpo C (item 9 do BRIEF), consumido por
 * `services/BindingCompileService.ts` e `repositories/AccountingBindingRepository.ts`.
 *
 * Máquina de estados (F-BP-2b, RATIFICADA — validador PASS sem bloqueante ⇒ auto-ativa):
 *   compile() SEM bloqueante  → nova versão nasce 'Active'; a versão Active anterior (se
 *                                existir) vira 'Superseded' ATOMICAMENTE na mesma tx (T6).
 *   compile() COM bloqueante  → nova versão nasce 'Draft' — nunca ativa, nunca supersede
 *                                a versão Active vigente.
 * Nenhuma transição edita uma linha existente (invariante 4 do ADR — recompilar é SEMPRE
 * uma linha nova, `bindingVersion` monotônico). 'Superseded' é terminal — nada volta a
 * 'Active' por update; só uma NOVA compilação bem-sucedida assume o posto.
 */
export const ACCOUNTING_BINDING_STATUSES = ['Draft', 'Active', 'Superseded'] as const;

export type AccountingBindingStatus = (typeof ACCOUNTING_BINDING_STATUSES)[number];

export function isAccountingBindingStatus(value: unknown): value is AccountingBindingStatus {
  return typeof value === 'string' && (ACCOUNTING_BINDING_STATUSES as readonly string[]).includes(value);
}
