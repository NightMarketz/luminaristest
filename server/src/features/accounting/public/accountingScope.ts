/**
 * Porta pública da feature `accounting` para o where-builder do escopo contábil (`accountingScopeWhere`), que os
 * repositórios de `packages` usam para filtrar por dono e unidade do mesmo jeito que os da contabilidade.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.10; dono, questionário, 27/11/2026: "Destinos propostos"). Só reexporta
 * por nome; a função mora em `models/AccountingScope`. O tipo sai por `accountingScope.types.ts`.
 */
export { accountingScopeWhere } from '../models/AccountingScope';
