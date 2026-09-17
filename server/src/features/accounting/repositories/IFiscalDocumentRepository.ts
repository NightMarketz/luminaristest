import type { FiscalDocument, FiscalDocumentAttempt, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export const FISCAL_DOCUMENT_KINDS = ['NFSE', 'NFE'] as const;
export type FiscalDocumentKind = (typeof FISCAL_DOCUMENT_KINDS)[number];

export const FISCAL_DOCUMENT_STATUSES = ['SENT', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED'] as const;
export type FiscalDocumentStatus = (typeof FISCAL_DOCUMENT_STATUSES)[number];

/** Dados do documento no `SENT` inicial (BRIEF item 20 — criado junto com a tentativa 1 e o número). */
export interface CreateSentFiscalDocumentData {
  kind: FiscalDocumentKind;
  saleId: string;
  /** F-DFE-16 (b): código de serviço do documento; '' para NFE. */
  cTribNac: string;
  anchorEntryId: string;
  ambiente: 'producao' | 'homologacao';
  partner: string;
  serie: number;
  /** null quando o adaptador numera (capabilities.numbersDps). */
  numero: bigint | null;
  dCompet: string;
  vServCents: bigint;
  tpRetISSQN: number;
  /** payload da tentativa 1 (imutável — ADR §9.1). */
  payloadJson: string;
}

export interface AppendAttemptData {
  documentId: string;
  attemptNo: number;
  payloadJson: string;
}

/** Campos que uma transição de status pode gravar (BRIEF item 24 — a máquina de estados é do serviço). */
export interface TransitionData {
  status: FiscalDocumentStatus;
  partnerRef?: string | null;
  nNFSe?: string | null;
  chaveOuCodigo?: string | null;
  numero?: bigint | null;
  baseIssCents?: bigint | null;
  aliqIssBp?: number | null;
  vIssCents?: bigint | null;
  vIbsCents?: bigint | null;
  vCbsCents?: bigint | null;
  authorizedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelMotivo?: number | null;
  cancelReason?: string | null;
  errorsJson?: string | null;
  xmlAttachmentId?: string | null;
  pdfAttachmentId?: string | null;
  sourceDocumentId?: string | null;
  currentAttemptNo?: number;
  /** rename-on-cancel: `cancelled:<id>:<saleId>` libera o @@unique (memória unique-de-idempotencia-x-soft-delete). */
  saleKey?: string;
  /** resultado gravado na tentativa corrente, quando houver. */
  attemptResult?: { attemptNo: number; resultStatus: string; resultJson: string | null };
}

export type FiscalDocumentWithAttempts = FiscalDocument & { attempts: FiscalDocumentAttempt[] };

/**
 * BE-INCR-DFE (nó X10b, BRIEF item 5) — único lugar com `prisma.fiscalDocument.*`, `prisma.fiscalDocumentAttempt.*`
 * e `prisma.fiscalDocumentSequence.*`. `tx?` em todos. O repositório NÃO expõe update de `payloadJson`
 * (F-DFE-10 a: imutável por tentativa) nem de `status` fora de `transition`.
 */
export interface IFiscalDocumentRepository {
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<FiscalDocumentWithAttempts | null>;
  findAttemptById(scope: AccountingScope, attemptId: string, tx?: Prisma.TransactionClient): Promise<FiscalDocumentAttempt | null>;
  /** Documentos VIVOS (status ≠ CANCELLED, deletedAt null) da venda, opcionalmente por kind. */
  findLiveBySale(scope: AccountingScope, saleId: string, kind?: FiscalDocumentKind, tx?: Prisma.TransactionClient): Promise<FiscalDocument[]>;
  listBySale(scope: AccountingScope, saleId: string, tx?: Prisma.TransactionClient): Promise<FiscalDocumentWithAttempts[]>;
  listByStatus(scope: AccountingScope, status: FiscalDocumentStatus, tx?: Prisma.TransactionClient): Promise<FiscalDocument[]>;
  /** SENT|PROCESSING mais velhos que `olderThan` — alvo do job de polling (BRIEF item 27). Sem escopo: o job varre todos. */
  listPending(olderThan: Date, tx?: Prisma.TransactionClient): Promise<FiscalDocument[]>;
  /** Cria documento em SENT + tentativa 1 (`ref = <id>:1`). */
  createSent(scope: AccountingScope, data: CreateSentFiscalDocumentData, tx?: Prisma.TransactionClient): Promise<FiscalDocumentWithAttempts>;
  appendAttempt(scope: AccountingScope, data: AppendAttemptData, tx?: Prisma.TransactionClient): Promise<FiscalDocumentAttempt>;
  transition(scope: AccountingScope, id: string, data: TransitionData, tx?: Prisma.TransactionClient): Promise<FiscalDocument>;
  /** Próximo número por (escopo, kind, serie) — DENTRO da tx do SENT (ACC-015 por analogia). */
  nextNumber(scope: AccountingScope, kind: FiscalDocumentKind, serie: number, tx: Prisma.TransactionClient): Promise<bigint>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
