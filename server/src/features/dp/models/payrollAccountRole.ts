/**
 * BE-INCR-DP-PONTE-RAZAO item 18 (centro; ADR-PAIS-NA-BORDA R1) — papéis contábeis que existem em qualquer folha, em
 * inglês. O lançamento da folha troca o papel pela conta configurada no `AccountingScopeSettings` (item 19, PR-P3); os
 * papéis do Brasil (INSS, RAT, terceiros, FGTS, IRRF, 13º) são instância e moram em `paises/br/models/contabil/papeis.ts`.
 *
 * `VACATION_*` e `PROVISION_CHARGES*` são do PR-P4 (provisões), declarados aqui porque o catálogo é fechado (F-PES-9).
 */
export const PAYROLL_ACCOUNT_ROLES = [
  'SALARIES_EXPENSE',
  'OWNER_PAY_EXPENSE',
  'INTERNSHIP_STIPEND_EXPENSE',
  'SALARIES_PAYABLE',
  'OWNER_PAY_PAYABLE',
  'SALARY_ADVANCES',
  'VACATION_PROVISION',
  'VACATION_EXPENSE',
  'PROVISION_CHARGES',
  'PROVISION_CHARGES_EXPENSE',
] as const;
export type PayrollAccountRole = (typeof PAYROLL_ACCOUNT_ROLES)[number];
