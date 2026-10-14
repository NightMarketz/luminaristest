/**
 * A Prensa (BE-INCR-BINDING-PRESS, Fase P1) — escopo de tenancy do módulo IRMÃO
 * `accountingBinding` (F-P1-7). Espelha deliberadamente o SHAPE de
 * `features/accounting/scope/AccountingScope` (ownerUserId/actorUserId/unitId) — MESMO padrão de
 * tenancy do resto do domínio contábil — mas é uma definição PRÓPRIA, não um import: o teste de
 * fronteira do item 13 do BRIEF (espelho de `no-accounting-imports.boundary.test.ts`) proíbe
 * `features/accountingBinding/` de importar de `features/accounting` além de DTO/`IAccountingEventMapper`,
 * e `AccountingScope` não está nessa lista. Duplicar esta forma pequena (3 campos) é o preço barato
 * da fronteira; ver `.claude/skills/_REUSE-CRITERION.md` — divergência de POSSE (módulo dono
 * diferente), não de shape, é fork sancionado pelo critério.
 *
 * Mora em `scope/` (como `AccountingScope`), não em `repositories/`: controller resolve o escopo e não pode importar
 * repositório (ADR-ARCH-BOUNDARIES, regra L2-controller-not-repository).
 */
export interface BindingScope {
  /** Dono lógico do binding — vira `userId` na linha. */
  ownerUserId: string;
  /** Ator que está operando — carimbado em `createdById`. */
  actorUserId: string;
  /** Unidade de negócio (string de escopo simples, mesma convenção de AccountingScope.unitId). */
  unitId: string;
}

/** Resolve um `BindingScope` a partir de um usuário autenticado (owner === actor hoje). */
export function resolveBindingScope(user: { userId: string }, unitId: string): BindingScope {
  return { ownerUserId: user.userId, actorUserId: user.userId, unitId };
}

/** Where-clause Prisma-compatível derivado do escopo — mesmo padrão de `accountingScopeWhere`. */
export function bindingScopeWhere(scope: BindingScope): { userId: string; unitId: string } {
  return { userId: scope.ownerUserId, unitId: scope.unitId };
}
