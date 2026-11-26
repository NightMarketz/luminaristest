/**
 * Porta pública da feature `accounting` para o contrato do mapper de evento contábil, que o intérprete e o
 * alimentador do `accountingBinding` implementam e entregam ao sync.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.9; dono, questionário, 25/11/2026: "Portas e lista ajustada"). Só
 * reexporta o tipo; a interface mora em `sync/mappers/IAccountingEventMapper`. Não é `*.types.ts` porque a `M4` só
 * aceita `models/` e `dtos/` da feature.
 */
export type { IAccountingEventMapper } from '../sync/mappers/IAccountingEventMapper';
