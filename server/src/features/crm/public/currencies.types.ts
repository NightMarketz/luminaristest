/**
 * API pública de `crm` — a lista de moedas (ADR-MODULE-BOUNDARIES §10, F-MBE-3 a; §11.9).
 * Arquivo `*.types.ts`: é o que policy, model e DTO de outra feature podem importar. Pela `M4` só reexporta de
 * `models/` e `dtos/` desta feature; a definição mora em `models/currencies`.
 */
export { CURRENCIES } from '../models/currencies';
