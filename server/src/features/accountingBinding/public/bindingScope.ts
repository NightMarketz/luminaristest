/**
 * API pública de `accountingBinding` — funções de escopo (ADR-MODULE-BOUNDARIES §10, F-MBE-3 a).
 * O tipo `BindingScope` sai por `./bindingScope.types`. A definição mora em `models/BindingScope`; aqui só se
 * reexporta.
 */
export { bindingScopeWhere, resolveBindingScope } from '../models/BindingScope';
