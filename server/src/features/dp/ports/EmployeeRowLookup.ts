/**
 * Porta de leitura `EmployeeRowLookup` — BE-INCR-DP-F0-F1 item 38 (PR-4; F-DP-1 → a, D-2 e D-6 do BRIEF).
 *
 * O `employeeRef` do trabalhador aponta para uma linha do preset `employees` do Core (DynamicTable). O DP não importa
 * `dynamicTables`: a porta é declarada aqui e implementada no `lib/factory.ts` sobre o motor (a direção permitida pelo
 * Contrato §2.1 é Prisma LER o motor; o proibido é o inverso). Guarda contra órfão = verificação no read: linha apagada
 * depois vira `pessoaOperacionalRemovida: true`, sem erro; nenhum cálculo do DP lê `employees`.
 */
export interface EmployeeRowLookup {
  /** true ⟺ a linha `employeeRef` existe (viva) na tabela `employees` do dono. */
  employeeRowExists(ownerUserId: string, employeeRef: string): Promise<boolean>;
}
