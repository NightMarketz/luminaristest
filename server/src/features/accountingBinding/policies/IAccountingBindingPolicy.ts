import type { BindingScope } from '../repositories/IAccountingBindingRepository';

/**
 * Contrato de autorização do módulo `accountingBinding` (Corpo C, item 9/15 do BRIEF). Mesmo
 * escopo grosso de `IAccountingPolicy` (ator autenticado) — RBAC por papel fica para quando os
 * papéis existirem no produto (mesmo `ponytail` registrado em `AccountingPolicy.ts`).
 */
export interface IAccountingBindingPolicy {
  /** Pode compilar/recompilar um binding (POST /accounting-binding/compile). */
  canCompile(scope: BindingScope): boolean;

  /** Pode rodar o validador sem persistir (POST /accounting-binding/validate). */
  canValidate(scope: BindingScope): boolean;

  /** Pode listar/ler os bindings do escopo (GET /accounting-binding). */
  canRead(scope: BindingScope): boolean;
}
