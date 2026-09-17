import type { AccountingDeliveryItem, AccountingDeliveryLog, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** Dados para criar um log de entrega. Escalares apenas; `status` vem de `DELIVERY_STATUSES`. */
export interface CreateDeliveryLogData {
  userId: string;
  unitId: string;
  contactId: string;
  ecdJobId: string;
  ecfJobId: string;
  /** Período coberto, copiado do job de origem (Fork Novo A → b). */
  periodStart: Date;
  periodEnd: Date;
  manifestSha256Ecd: string;
  manifestSha256Ecf: string;
  status: string;
  attemptCount: number;
  requestedById: string;
  sentAt: Date | null;
}

/**
 * Um item do pacote (C6b PR-3, Bloco A — BRIEF item 1/4). `position 0/1` = núcleo (ECD/ECF,
 * espelha as colunas fixas do log); `position 2..n` = extras. `kind` é `ExportKind` como string
 * (mesma disciplina da coluna `kind` de `AccountingDataExchangeJob`).
 */
export interface CreateDeliveryItemData {
  jobId: string;
  kind: string;
  sha256: string;
  position: number;
}

/**
 * Contrato do repositório do log de entrega (`accounting_delivery_logs`). Único lugar com
 * `prisma.accountingDeliveryLog.*` (item 4 do BRIEF).
 *
 * `findByJobsAndContact` é a metade de LEITURA da idempotência (item 10): a chave é
 * `[ecdJobId, ecfJobId, contactId]`, garantida por `@@unique` no banco. A leitura NÃO fecha a
 * corrida sozinha (memória: `@@unique` é o que fecha o TOCTOU; o preflight só evita o erro no
 * caminho feliz) — o service trata o P2002 como caminho normal e relê a linha vencedora.
 */
export interface IAccountingDeliveryRepository {
  create(data: CreateDeliveryLogData, tx?: Prisma.TransactionClient): Promise<AccountingDeliveryLog>;

  /** Point lookup escopado — `null` quando o id não é deste escopo (cross-tenant → null). */
  findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryLog | null>;

  /** Leitura pela chave de idempotência, escopada. */
  findByJobsAndContact(
    scope: AccountingScope,
    ecdJobId: string,
    ecfJobId: string,
    contactId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryLog | null>;

  update(
    scope: AccountingScope,
    id: string,
    data: Prisma.AccountingDeliveryLogUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryLog>;

  /**
   * Cria os itens do pacote (núcleo + extras) para uma entrega recém-criada. Chamado na MESMA tx
   * do `create` (gate autoritativo — `authoritative-gate-inside-tx`): o pacote nunca existe sem
   * seus itens, nem por uma janela de tempo dentro da mesma transação.
   */
  createItems(
    deliveryId: string,
    items: CreateDeliveryItemData[],
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryItem[]>;

  /** Os itens de uma entrega, ESCOPADOS (join no log — o item em si não carrega userId/unitId),
   *  ordenados por `position` (núcleo primeiro, extras depois). */
  listItems(
    scope: AccountingScope,
    deliveryId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDeliveryItem[]>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
