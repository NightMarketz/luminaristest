/**
 * AccountingPolicyVersion — constantes de domínio (BE-INCR-ACCOUNTING-POLICY-VERSION, nó GOV-CONTADOR, BRIEF itens 1
 * e 14). Estados em `ledgerStatus.ts` (`POLICY_VERSION_STATUSES`). Alvos = F-POL-2 (b): as duas linhas únicas de
 * parâmetro por `(userId, unitId)`.
 */
export const POLICY_TARGETS = ['FISCAL_PROFILE', 'SCOPE_SETTINGS'] as const;
export type PolicyTarget = (typeof POLICY_TARGETS)[number];

export const POLICY_VERSION_PROPOSED = 'policy_version.proposed';
export const POLICY_VERSION_APPLIED = 'policy_version.applied';
export const POLICY_VERSION_REJECTED = 'policy_version.rejected';
