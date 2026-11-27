/**
 * API pública de `accounting` — o tipo `AccountingScope` (dono lógico, ator, unidade), que as features vizinhas
 * (`dp`, `packages`, `sales`, `legalParameters`, `teammates`) recebem nos seus serviços, policies e contratos.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.10; dono, questionário, 27/11/2026: "Destinos propostos").
 * Arquivo `*.types.ts`: pela `M4` só reexporta de `models/` e `dtos/` desta feature; o tipo mora em
 * `models/AccountingScope`. Policy e model de outra feature importam por aqui (`L5`/`L6`).
 */
export type { AccountingScope } from '../models/AccountingScope';
