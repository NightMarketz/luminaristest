/**
 * API pública de `accounting` — o teto de centavos (`MAX_CENTS`) que o intérprete do binding aplica aos valores
 * (ADR-MODULE-BOUNDARIES §10, F-MBE-3 a; §11.9).
 * Arquivo `*.types.ts`: pela `M4` só reexporta de `models/` e `dtos/` desta feature; a constante mora em `models/money`.
 * É um dos contratos nomeados que `accountingBinding` pode importar (BRIEF BINDING-PRESS item 13).
 */
export { MAX_CENTS } from '../models/money';
