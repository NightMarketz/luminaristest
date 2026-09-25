import type { AccountingDataExchangeJob, AccountingDataExchangeRow, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type {
  CreateJobInput,
  UpdateJobInput,
  CreateRowInput,
  UpdateRowInput,
} from '../models/DataExchange.model';

/**
 * Repository contract for the accounting Data Exchange staging tables. Only place with
 * prisma.accountingDataExchangeJob.* / accountingDataExchangeRow.* access. Two-level
 * tenancy via AccountingScope on every read/update.
 */
export interface IDataExchangeRepository {
  createJob(data: CreateJobInput, tx?: Prisma.TransactionClient): Promise<AccountingDataExchangeJob>;
  findJobById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDataExchangeJob | null>;
  updateJob(
    scope: AccountingScope,
    id: string,
    data: UpdateJobInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDataExchangeJob>;
  /** BE-INCR-FIXED-ASSETS PR-4 (item 21): resolve o sucessor já registrado do job original, se
   * houver — usado como pré-cheque legível antes do P2002 da unique (que fecha o TOCTOU). */
  findJobBySupersedesJobId(
    scope: AccountingScope,
    supersedesJobId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDataExchangeJob | null>;
  /** BE-INCR-FIXED-ASSETS PR-4 (item 23, F-FA15 a): lista paginada de jobs do escopo. */
  listJobs(
    scope: AccountingScope,
    filter: { direction?: string; kind?: string; status?: string; year?: number; page: number; limit: number },
    tx?: Prisma.TransactionClient,
  ): Promise<{ items: AccountingDataExchangeJob[]; total: number }>;
  /**
   * BE-INCR-FIXED-ASSETS PR-4 (item 21, review PR #368) — TODAS as ECDs EXPORTED do ano com
   * `ecfRectificationRequired=true` e ainda não dispensadas (`ecfRectificationWaivedAt IS NULL`).
   * Sem paginação de propósito: uma ECF retificadora do ano tem de zerar a flag em CADA ECD
   * pendente do ano, nunca só nas 100 primeiras — o universo esperado por escopo/ano é pequeno
   * (poucas substituições por ano), então uma consulta sem `take` é segura aqui.
   */
  findEcdJobsPendingRectificationForYear(
    scope: AccountingScope,
    year: number,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDataExchangeJob[]>;
  /**
   * BE-INCR-FIXED-ASSETS PR-4 (item 23, review PR #368) — resolve, EM LOTE, o sucessor de cada
   * id em `jobIds` (evita N+1 no `listJobs`: 1 consulta `IN` em vez de 1 por item da página).
   * Devolve um Map `supersedesJobId -> id do sucessor`.
   */
  findSuccessorsByJobIds(
    scope: AccountingScope,
    jobIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<Map<string, string>>;
  createRows(rows: CreateRowInput[], tx?: Prisma.TransactionClient): Promise<number>;
  findRowsByJob(
    scope: AccountingScope,
    jobId: string,
    opts?: { status?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<AccountingDataExchangeRow[]>;
  updateRow(
    scope: AccountingScope,
    id: string,
    data: UpdateRowInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
