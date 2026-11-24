/**
 * API pública de `accountingBinding` — só tipo (ADR-MODULE-BOUNDARIES §10, F-MBE-3 a).
 * Arquivo `*.types.ts`: é o que policy e model de outra feature podem importar. A definição mora em
 * `scope/BindingScope`; aqui só se reexporta.
 */
export type { BindingScope } from '../scope/BindingScope';
