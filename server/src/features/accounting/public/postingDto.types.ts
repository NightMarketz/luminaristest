/**
 * API pública de `accounting` — o contrato de entrada do `postEntry` (ADR-MODULE-BOUNDARIES §10, F-MBE-3 a; §11.9).
 * Arquivo `*.types.ts`: pela `M4` só reexporta de `models/` e `dtos/` desta feature; o tipo mora em `dtos/PostingDto`.
 * É um dos contratos nomeados que `accountingBinding` pode importar (BRIEF BINDING-PRESS item 13).
 */
export type { PostEntryInput } from '../dtos/PostingDto';
