/**
 * BE-INCR-DP-PONTE-RAZAO item 18 (centro; ADR-PAIS-NA-BORDA R1) — papéis contábeis que existem em qualquer folha, em
 * inglês. O lançamento da folha troca o papel pela conta configurada no `AccountingScopeSettings` (item 19, PR-P3); os
 * papéis do Brasil (INSS, RAT, terceiros, FGTS, IRRF, 13º) são instância e moram em `paises/br/models/contabil/papeis.ts`.
 *
 * `VACATION_*` são do PR-P4 (provisões), declarados aqui porque o catálogo é fechado (F-PES-9).
 *
 * Encargos sobre a provisão divididos por provisão (dono, chat, 2026-11-26, repassado pela sessão da ponte: "encargos
 * divididos em férias e 13º"): o referencial da ECF põe a despesa de encargos junto da provisão de cada uma (L300A
 * 3.01.01.07.01.26 e .27, "inclusive encargos sociais"). Férias são universais e ficam no centro
 * (`VACATION_PROVISION_CHARGES`, `VACATION_CHARGES_EXPENSE`); o 13º é lei BR e fica na borda (`ENCARGOS_PROVISAO_13`,
 * `DESPESA_ENCARGOS_13` em `paises/br/models/contabil/papeis.ts`).
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
  'VACATION_PROVISION_CHARGES',
  'VACATION_CHARGES_EXPENSE',
] as const;
export type PayrollAccountRole = (typeof PAYROLL_ACCOUNT_ROLES)[number];
