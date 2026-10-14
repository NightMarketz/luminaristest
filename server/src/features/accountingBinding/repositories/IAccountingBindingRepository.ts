import type { AccountingBinding, Prisma } from 'generated/prisma';
import type { AccountingBindingStatus } from '../models/accountingBindingStatus';

import type { BindingScope } from '../scope/BindingScope';

export { type BindingScope, resolveBindingScope, bindingScopeWhere } from '../scope/BindingScope';

/** Payload de criação de uma nova versão de binding (Draft ou Active — o service decide qual). */
export interface CreateAccountingBindingInput {
  sectorKey: string;
  bindingVersion: number;
  compiledAt: Date;
  compiledFromHash: string;
  /** JSON serializado do `AccountingBindingV1` (ver `dtos/AccountingBindingDto.ts`). */
  payload: string;
  status: AccountingBindingStatus;
  createdById: string | null;
}

/**
 * Contrato de acesso a dado do binding compilado (`accounting_bindings`). Único lugar com
 * `prisma.accountingBinding.*` (padrão da casa — mesmo princípio de
 * `IReferentialMappingRepository`). Toda leitura/escrita é escopada por `BindingScope`
 * (userId+unitId). Soft-delete (`deletedAt`) — filtrado nas leituras "vivas"; a leitura de
 * versão MÁXIMA ignora soft-delete de propósito (ver `findMaxVersion`) para que o
 * `@@unique([userId,unitId,sectorKey,bindingVersion])` nunca colida mesmo com uma versão antiga
 * apagada. Todo write aceita um handle de tx opcional para o service compor
 * gate-in-tx + escrita atomicamente (T6).
 */
export interface IAccountingBindingRepository {
  /**
   * Maior `bindingVersion` já emitido para (scope, sectorKey), INCLUINDO linhas soft-deleted
   * (a unicidade da coluna não exclui `deletedAt` — reemitir uma versão apagada colidiria em
   * P2002). Devolve 0 quando nenhuma versão existe ainda (próxima é 1).
   */
  findMaxVersion(scope: BindingScope, sectorKey: string, tx?: Prisma.TransactionClient): Promise<number>;

  /**
   * A versão `Active` vigente de (scope, sectorKey), ou null se nenhuma. Ignora soft-deleted
   * (uma linha apagada nunca é "a ativa"). Chamado DENTRO da tx pelo compilador antes do CAS
   * (T6 — gate re-checado in-tx, nunca a partir de uma leitura pré-tx).
   */
  findActive(scope: BindingScope, sectorKey: string, tx?: Prisma.TransactionClient): Promise<AccountingBinding | null>;

  /** Cria uma nova linha de versão (Draft ou Active — nunca edita uma existente, invariante 4). */
  create(
    scope: BindingScope,
    data: CreateAccountingBindingInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingBinding>;

  /**
   * CAS: rebaixa a versão `id` para `Superseded` SE E SOMENTE SE ela ainda estiver `Active` no
   * momento da escrita (`updateMany` com `status: 'Active'` na cláusula `where`). Devolve a
   * contagem de linhas afetadas (0 ou 1) — 0 significa "já não estava Active" (alguém chegou
   * primeiro; o chamador NÃO deve tratar isso como erro, é o próprio ponto do CAS: a segunda
   * corrida converge sem duplicar Active, não sem completar).
   */
  supersedeIfActive(
    scope: BindingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  /** Busca uma versão por id, dentro do escopo (null se não existe ou é de outro dono). */
  findById(scope: BindingScope, id: string, tx?: Prisma.TransactionClient): Promise<AccountingBinding | null>;

  /**
   * Lista as versões (vivas) de um sectorKey dentro do escopo, mais recente primeiro — a leitura
   * por trás de `GET /accounting-binding`. `sectorKey` omitido lista todos os setores do escopo.
   */
  findMany(
    scope: BindingScope,
    filters: { sectorKey?: string; status?: AccountingBindingStatus },
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingBinding[]>;

  /** Roda `fn` dentro de uma tx do Prisma — único ponto de entrada de tx para o service. */
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;

  /**
   * BE-INCR-BINDING-FEEDER (F-FEEDER-3 → (c), leitura GLOBAL — sem `BindingScope`). Todas as
   * linhas `Active` vivas (não soft-deleted), de TODO `userId`/`unitId` — ao contrário de todo
   * outro método desta interface, que é escopado. Único consumidor: o alimentador
   * (`AccountingBindingFeederService`), que monta o array de `IAccountingEventMapper` do
   * dispatcher a partir de QUALQUER binding ativo, não de um tenant específico (nós vizinhos:
   * "só leitura nova" — BE-INCR-BINDING-FEEDER-brief.md, "Nós vizinhos").
   */
  findAllActive(tx?: Prisma.TransactionClient): Promise<AccountingBinding[]>;
}
