import type { FiscalDocument, FiscalDocumentAttempt, FiscalDocumentPendingAttachment, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export const FISCAL_DOCUMENT_KINDS = ['NFSE', 'NFE'] as const;
export type FiscalDocumentKind = (typeof FISCAL_DOCUMENT_KINDS)[number];

// AUTHORIZED_DIVERGENT — BE-INCR-DFE-MANUAL F-MAN-2 (c): nota autorizada no ambiente nacional cuja releitura (XML ×
// DPS enviada) achou divergência de conteúdo. Só sai cancelando (F-MAN-2b → b).
export const FISCAL_DOCUMENT_STATUSES = ['SENT', 'PROCESSING', 'AUTHORIZED', 'AUTHORIZED_DIVERGENT', 'REJECTED', 'CANCELLED'] as const;
export type FiscalDocumentStatus = (typeof FISCAL_DOCUMENT_STATUSES)[number];

/** Documento autorizado no ambiente nacional — com ou sem divergência na releitura (F-MAN-2 c). */
export const AUTHORIZED_STATUSES: readonly FiscalDocumentStatus[] = ['AUTHORIZED', 'AUTHORIZED_DIVERGENT'];

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
  /**
   * BE-INCR-PACOTE-VALIDADE (§5.2 item 14a, F-PV-9d a): chave de unicidade do documento. Ausente = `saleId`
   * (toda NFS-e de venda); a NFS-e do saldo vencido usa a chave do movimento `expiry:<balanceId>:<expiresOn>`
   * — uma nota por vencimento pela `@@unique([userId, unitId, saleKey, kind, cTribNac])`.
   */
  saleKey?: string;
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
  /** BE-INCR-DFE-MANUAL (F-MAN-4 a): série da DPS atribuída pelo portal, lida do XML autorizado. */
  serie?: number;
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
  /**
   * Guarda autoritativa DENTRO da escrita (memória authoritative-gate-inside-tx): a transição só acontece se o status
   * atual estiver aqui; senão o repositório lança `fiscal_document_status_changed`.
   */
  whenStatusIn?: readonly FiscalDocumentStatus[];
  /** resultado gravado na tentativa corrente, quando houver. */
  attemptResult?: { attemptNo: number; resultStatus: string; resultJson: string | null };
}

export type FiscalDocumentWithAttempts = FiscalDocument & { attempts: FiscalDocumentAttempt[] };

/** BE-INCR-DFE-ANEXO-PENDENTE (BRIEF item 2) — criação da pendência, na tx da autorização. */
export interface CreatePendingAttachmentData {
  documentId: string;
  xmlBytes: Buffer | null;
  pdfBytes: Buffer | null;
  /** `PendingAttachmentResultSchema` serializado. */
  resultJson: string;
}

/** Progresso por passo (F-PA-3 a) e controle de retentativa (F-PA-6 a). */
export interface PendingAttachmentStepPatch {
  xmlAttachmentId?: string;
  pdfAttachmentId?: string;
  sourceDocumentId?: string;
  attempts?: number;
  nextAttemptAt?: Date;
  lastError?: string | null;
  status?: 'PENDING' | 'FAILED';
}

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
  /**
   * X14 PR-4 (item 31) — Σ `vServCents` das NFS-e AUTORIZADAS em produção (com ou sem divergência na releitura), vivas,
   * cuja `dCompet` cai na competência YYYY-MM.
   */
  somaNfseAutorizadaNaCompetencia(scope: AccountingScope, competencia: string, tx?: Prisma.TransactionClient): Promise<bigint>;
  /**
   * X7 Fase C PR-2 (BRIEF C item 14) — NFS-e vivas em produção do escopo, `dCompet` em [from, to] (AAAA-MM-DD), nos
   * `statuses` pedidos, cada uma com o `cLocPrestacao` lido do payload da tentativa CORRENTE (F-TC-1 a; null se o
   * payload não o tiver).
   */
  findForIssReport(scope: AccountingScope, from: string, to: string, statuses: readonly FiscalDocumentStatus[], tx?: Prisma.TransactionClient): Promise<Array<FiscalDocument & { cLocPrestacao: string | null }>>;
  /** SENT|PROCESSING mais velhos que `olderThan` — alvo do job de polling (BRIEF item 27). Sem escopo: o job varre todos. */
  listPending(olderThan: Date, tx?: Prisma.TransactionClient): Promise<FiscalDocument[]>;
  /**
   * BE-INCR-DFE (PR-3, item 28) — busca cross-tenant por `partnerRef`, mesmo desenho de
   * `listPending`: o webhook chega ANTES de o serviço saber a qual escopo pertence (a
   * identidade do documento é reconstruída DEPOIS, a partir do `userId`/`unitId` da linha —
   * mesmo padrão do job de polling). Só documentos vivos (`SENT`/`PROCESSING`) interessam.
   */
  findByPartnerRef(partnerRef: string, tx?: Prisma.TransactionClient): Promise<FiscalDocument | null>;
  /**
   * BE-INCR-DFE-MANUAL (item 11 ii) — documento vivo (deletedAt null) do escopo com esta chave de NFS-e. Chamado DENTRO
   * da tx do retorno manual (guarda autoritativa: a mesma nota não autoriza dois documentos).
   */
  findByChaveOuCodigo(scope: AccountingScope, chaveOuCodigo: string, tx?: Prisma.TransactionClient): Promise<FiscalDocument | null>;
  /** BE-INCR-PACOTE-VALIDADE (§5.2 item 9.5) — documento (deletedAt null, qualquer status) com este `saleKey`/kind. */
  findBySaleKey(scope: AccountingScope, saleKey: string, kind: FiscalDocumentKind, tx?: Prisma.TransactionClient): Promise<FiscalDocument | null>;
  /** Cria documento em SENT + tentativa 1 (`ref = <id>:1`). */
  createSent(scope: AccountingScope, data: CreateSentFiscalDocumentData, tx?: Prisma.TransactionClient): Promise<FiscalDocumentWithAttempts>;
  appendAttempt(scope: AccountingScope, data: AppendAttemptData, tx?: Prisma.TransactionClient): Promise<FiscalDocumentAttempt>;
  transition(scope: AccountingScope, id: string, data: TransitionData, tx?: Prisma.TransactionClient): Promise<FiscalDocument>;
  /** Próximo número por (escopo, kind, serie) — DENTRO da tx do SENT (ACC-015 por analogia). */
  nextNumber(scope: AccountingScope, kind: FiscalDocumentKind, serie: number, tx: Prisma.TransactionClient): Promise<bigint>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;

  // ---- BE-INCR-DFE-ANEXO-PENDENTE (BRIEF item 2) — único lugar com `prisma.fiscalDocumentPendingAttachment.*` ----
  /** Cria a pendência (PENDING) — chamado DENTRO da tx da autorização. `documentId @unique`. */
  createPendingAttachment(scope: AccountingScope, data: CreatePendingAttachmentData, tx?: Prisma.TransactionClient): Promise<FiscalDocumentPendingAttachment>;
  /** PENDING com `nextAttemptAt <= now`, mais antigas primeiro. Sem escopo: cross-tenant, mesmo desenho de `listPending`. */
  listDuePendingAttachments(now: Date, limit: number, tx?: Prisma.TransactionClient): Promise<FiscalDocumentPendingAttachment[]>;
  markPendingStep(id: string, patch: PendingAttachmentStepPatch, tx?: Prisma.TransactionClient): Promise<void>;
  /** DONE e bytes zerados (F-PA-6 a). */
  markPendingDone(id: string, tx?: Prisma.TransactionClient): Promise<void>;
  /**
   * Candidatos do backfill por reconsulta (BRIEF item 11, F-PA-7 b): AUTHORIZED|AUTHORIZED_DIVERGENT em produção, vivos,
   * com `xmlAttachmentId` e `sourceDocumentId` nulos e sem pendência. Cross-tenant.
   */
  listAttachmentBackfillCandidates(limit: number, tx?: Prisma.TransactionClient): Promise<FiscalDocument[]>;
}
