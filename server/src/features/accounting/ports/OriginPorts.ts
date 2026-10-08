import type { UserContext } from '../../../types/UserContext';

/**
 * Portas de ORIGEM do núcleo contábil (BE-INCR-KIT-SETOR PR-5, item 43; F-KS-6 → a).
 *
 * O núcleo nunca importa o módulo de origem (`core-boundary.test.ts`). O que ele lê/escreve no catálogo
 * operacional do tenant entra por estas portas, declaradas aqui e implementadas em `lib/factory.ts`
 * (neste app sobre o `IDynamicTableRepository` + `DynamicTableService`; noutro projeto, sobre o vertical
 * rígido — `docs/accounting/NUCLEO-PORTAVEL.md`). São subconjuntos estruturais do que o motor já expõe:
 * zero mudança de comportamento.
 */

/** Uma tabela do catálogo operacional, achada pelo nome interno (`products`, `stockMovements`…). */
export interface OriginTableRef {
  id: string;
}

/** Uma linha do catálogo operacional. `data` é o JSON da linha. */
export interface OriginRow {
  id: string;
  dynamicTableId: string;
  data: unknown;
}

/** Leitura do estoque físico (`stockMovements`, `productUnits`). */
export interface StockRowPort {
  findTableByInternalName(ownerUserId: string, internalName: string): Promise<OriginTableRef | null>;
  findRowsByFieldValue(tableId: string, fieldName: string, value: string): Promise<OriginRow[]>;
}

/**
 * Escrita do estoque físico — sempre como sistema, pelo caminho que roda as regras da origem (aqui o
 * `StockMovementsApplyPlugin` aplica o delta; escrever direto no repositório pularia o plugin).
 */
export interface StockRowWriterPort {
  createTableData(
    user: UserContext,
    tableId: string,
    body: { data: Record<string, unknown> },
    options: { isSystem: true },
  ): Promise<unknown>;
}

/** Existência de produto no catálogo (`products`) do dono. */
export interface ProductRefPort {
  findTableByInternalName(ownerUserId: string, internalName: string): Promise<OriginTableRef | null>;
  /** Busca GLOBAL por id — quem chama confere `dynamicTableId` (guarda cross-tenant). */
  findDataById(rowId: string): Promise<OriginRow | null>;
}
