import { AccountingPeriodNotOpenError, AppError, ForbiddenError, MaxCentsExceededError, NotFoundError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { Prisma } from 'generated/prisma';
import type { Account, SourceDocument } from 'generated/prisma';
import { CANONICAL_ACCOUNTS } from '../fixtures/ChartOfAccountsFixture';
import { CLOSING_SOURCE_TYPE, reversedClosingSourceId } from '../models/closing';
import { MAX_CENTS } from '../models/money';
import type { CreateAccountInput, PostEntryInput, ReverseEntryInput } from '../dtos/PostingDto';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type {
  IJournalEntryRepository,
  JournalEntryWithFullPostings,
  JournalEntryWithPostings,
} from '../repositories/IJournalEntryRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountingPeriodRepository } from '../repositories/IAccountingPeriodRepository';
import type {
  ISourceProvenanceRepository,
  JournalEntrySourceWithDocument,
} from '../repositories/ISourceProvenanceRepository';
import type { IDimensionRepository } from '../repositories/IDimensionRepository';
import type { AuditService } from './AuditService';
import { assertLegDimensions, resolveLineDimensions } from './dimensionTagging';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';

/**
 * Uma linha de lançamento já resolvida (conta-folha + tags de dimensão), pré-tx — shape antes
 * anônimo dentro de `postEntry`, nomeado aqui porque `resolveEntryLines` (F-P1-6b1) agora é
 * compartilhado por `postEntry` e `validateEntry`.
 */
/**
 * Descriptor for BE-INCR-PROVENANCE-ATTACH (NFE-X) — attaching formal provenance to an
 * ALREADY-POSTED entry. Mirrors the `sourceDocument` descriptor `postEntry` accepts, plus an
 * optional `sourceType` (defaults to the target entry's own sourceType — the D5 "origin mirrors
 * the entry" convention).
 *
 * `externalRef` is the HUMAN document reference (the NF-e access key), never an idempotency
 * `sourceId` (T7). `documentDate` is a date-only string (YYYY-MM-DD) already validated at the
 * DTO boundary by `isValidDateOnly` — the bare regex accepts `2026-02-30`, which `new Date()`
 * silently rolls to 02-mar (class-fix `date-only-regex-nao-valida-calendario`).
 */
export interface AttachSourceDocumentInput {
  externalRef?: string | null;
  documentDate?: string | null;
  description?: string | null;
  attachmentId?: string | null;
  rawJson?: string | null;
  sourceType?: string | null;
}

interface ResolvedPostingLine {
  accountId: string;
  accountCode: string;
  requiresDimension: boolean;
  debitCents: number;
  creditCents: number;
  dimensions: Array<{ definitionId: string; valueId: string }>;
}

/**
 * PostingService — double-entry posting engine, FIRST-CLASS PRISMA (no DynamicTable).
 *
 * All public methods receive an AccountingScope (resolved by the controller from the
 * authenticated user + unitId). Services use scope.ownerUserId for data tenancy and
 * scope.actorUserId for authorship (createdById, postedById on JournalEntry).
 *
 * Contract §2.1 invariants honored here:
 * - money is INTEGER CENTS; the balance check is EXACT integer equality (no epsilon);
 * - posted/reversed entries are immutable — corrections via a reversing entry (estorno);
 * - idempotency is closed by REAL DB constraints (@@unique([userId,unitId,code]) on
 *   accounts and @@unique([userId,unitId,sourceType,sourceId]) on journal entries) —
 *   P2002 unique violations are caught and resolved by re-fetch.
 */
export class PostingService {
  constructor(
    private readonly accountRepo: IAccountRepository,
    private readonly journalEntryRepo: IJournalEntryRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly policy: IAccountingPolicy,
    private readonly periodRepo: IAccountingPeriodRepository,
    private readonly auditService: AuditService,
    private readonly sourceProvenanceRepo: ISourceProvenanceRepository,
    private readonly dimensionRepo: IDimensionRepository,
  ) {}

  /** Derive year+month from an ISO date string using UTC (no tz shift for date-only strings). */
  private extractYearMonth(dateStr: string): { year: number; month: number } {
    // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by JS — no tz conversion needed.
    const d = new Date(dateStr);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  }

  /**
   * Fiscal year from a posting date (ADR-INCR3 Emenda 3: numbering must match the
   * calendar year of the posting date, never drift to the prior/next year at the
   * boundary). Must use the SAME UTC-only parsing as extractYearMonth — both read the
   * same date-only `input.date` string, and the period gate (extractYearMonth) is
   * authoritative for which year/month a posting belongs to. Converting to
   * America/Sao_Paulo here (as a prior version did) shifts UTC midnight on Jan 1 back
   * to Dec 31 21:00 BRT, so entries dated 2026-01-01 were numbered under fiscal year
   * 2025 even though the period gate correctly placed them in 2026-01 — the two
   * disagreed on the fiscal year of the exact same date.
   */
  private fiscalYearFrom(dateStr: string): number {
    return new Date(dateStr).getUTCFullYear();
  }

  /**
   * Preflight period gate (outside tx) — fast rejection before opening a transaction.
   * The authoritative gate lives in assertPeriodOpenTx (inside the tx).
   */
  private async assertPeriodOpen(scope: AccountingScope, dateStr: string): Promise<void> {
    const { year, month } = this.extractYearMonth(dateStr);
    const period = await this.periodRepo.findByYearMonth(scope, year, month);
    if (!period || period.status !== 'OPEN') {
      throw new AccountingPeriodNotOpenError(year, month);
    }
  }

  /**
   * Authoritative period gate (inside tx) — re-checks AFTER the tx is open, immediately
   * before the Posted write, to close the TOCTOU window where an admin could close the
   * period between the preflight check and the commit.
   */
  private async assertPeriodOpenTx(
    tx: Prisma.TransactionClient,
    scope: AccountingScope,
    dateStr: string,
  ): Promise<void> {
    const { year, month } = this.extractYearMonth(dateStr);
    const period = await this.periodRepo.findByYearMonth(scope, year, month, tx);
    if (!period || period.status !== 'OPEN') {
      throw new AccountingPeriodNotOpenError(year, month);
    }
  }

  /**
   * Idempotently ensure the canonical chart of accounts exists for the scope.
   * Definitions live in CANONICAL_ACCOUNTS; only creates the missing ones.
   * Backed by @@unique([userId,unitId,code]) — a concurrent create that loses the
   * race throws P2002.
   *
   * P2002 is NOT unconditionally benign: the @@unique is on the RAW columns and does not
   * exclude soft-deleted rows, while findByCode filters deletedAt:null. So if a canonical
   * account exists ONLY as a soft-deleted row, findByCode returns null → create trips P2002
   * → and swallowing it would leave the leaf permanently missing. We therefore try to
   * RESTORE the soft-deleted row on P2002.
   */
  private async ensureChartOfAccounts(scope: AccountingScope): Promise<void> {
    const { userId, unitId } = accountingScopeWhere(scope);
    for (const account of CANONICAL_ACCOUNTS) {
      const existing = await this.accountRepo.findByCode(scope, account.code);
      if (existing) continue;
      try {
        await this.accountRepo.create({
          userId,
          unitId,
          code: account.code,
          name: account.name,
          nature: account.nature,
          acceptsEntries: account.acceptsEntries,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const restored = await this.accountRepo.restoreByCode(scope, account.code);
          if (restored) {
            logger.info('Canonical account restored from soft-deleted row', {
              userId,
              unitId,
              code: account.code,
            });
            continue;
          }
          continue;
        }
        throw error;
      }
    }
  }

  /** Resolve a leaf account by code, asserting it exists and accepts ledger lines. */
  private async resolveLeafAccount(scope: AccountingScope, code: string): Promise<Account> {
    const account = await this.accountRepo.findByCode(scope, code);
    if (!account) {
      throw new ValidationError(`Conta '${code}' não existe no plano de contas.`);
    }
    if (account.acceptsEntries === false) {
      throw new ValidationError(
        `Conta '${code}' é sintética e não aceita partidas (use uma conta analítica).`,
      );
    }
    return account;
  }

  /**
   * Cents choke-point guard (Council 1.5 / ACC-014) + Σdébito=Σcrédito balance invariant —
   * EXTRACTED VERBATIM from the original `postEntry` body (F-P1-6b1, ADR-P1 §8 emenda) so
   * `postEntry` and `validateEntry` can never drift on what counts as "balanced": both call this
   * SAME function, same order (cents guard first, then the sum), same error types/messages.
   * Pure/sync, throws on the first violation.
   */
  private assertCentsAndBalance(input: PostEntryInput): { sumDebit: number; sumCredit: number } {
    for (const line of input.lines) {
      if (
        !Number.isInteger(line.debitCents) ||
        !Number.isInteger(line.creditCents) ||
        line.debitCents < 0 ||
        line.creditCents < 0
      ) {
        throw new ValidationError(
          `Partida da conta '${line.accountCode}' com centavos inválidos — inteiro >= 0 obrigatório.`,
        );
      }
      const magnitude = Math.max(line.debitCents, line.creditCents);
      if (magnitude > MAX_CENTS) {
        throw new MaxCentsExceededError(line.accountCode, magnitude, MAX_CENTS);
      }
    }

    const sumDebit = input.lines.reduce((acc, line) => acc + line.debitCents, 0);
    const sumCredit = input.lines.reduce((acc, line) => acc + line.creditCents, 0);
    if (sumDebit !== sumCredit || sumDebit <= 0) {
      throw new ValidationError('Lançamento desbalanceado: Σdébito deve igualar Σcrédito.');
    }
    return { sumDebit, sumCredit };
  }

  /**
   * Resolve every line's account (leaf-only) AND its dimension tags — EXTRACTED VERBATIM from
   * the original `postEntry` body (F-P1-6b1). Read-only, no persistence. Shared by `postEntry`
   * and `validateEntry` so a binding validated OK is guaranteed to resolve identically when the
   * real post runs later.
   */
  private async resolveEntryLines(
    scope: AccountingScope,
    input: PostEntryInput,
  ): Promise<ResolvedPostingLine[]> {
    const resolvedLines: ResolvedPostingLine[] = [];
    for (const line of input.lines) {
      const account = await this.resolveLeafAccount(scope, line.accountCode);
      const dimensions = line.dimensions?.length
        ? await resolveLineDimensions(this.dimensionRepo, scope, line.dimensions)
        : [];
      resolvedLines.push({
        accountId: account.id,
        accountCode: account.code,
        requiresDimension: account.requiresDimension,
        debitCents: line.debitCents,
        creditCents: line.creditCents,
        dimensions,
      });
    }
    return resolvedLines;
  }

  /**
   * SEC-B1-1 mandatory-dimension gate wrapper — EXTRACTED VERBATIM from the original in-tx call
   * (`if (sourceType !== CLOSING_SOURCE_TYPE) assertLegDimensions(...)`, F-P1-6b1). Pure function
   * over already-resolved lines (the account's `requiresDimension` and each line's
   * `dimensions.length` were already read by `resolveEntryLines`) — safe to call outside a
   * transaction with the EXACT verdict a real post would reach in-tx, since nothing it reads is
   * re-fetched from the DB at call time.
   */
  private assertDimensionGateForLines(sourceType: string, resolvedLines: ResolvedPostingLine[]): void {
    if (sourceType !== CLOSING_SOURCE_TYPE) {
      assertLegDimensions(
        resolvedLines.map((l) => ({
          accountCode: l.accountCode,
          requiresDimension: l.requiresDimension,
          dimensionCount: l.dimensions.length,
        })),
      );
    }
  }

  /**
   * Post a balanced double-entry journal entry. Creates a `journal_entries` row in
   * status `Posted` plus its `postings` legs, atomically. Σdebit must EXACTLY equal
   * Σcredit (integer cents) and be > 0. When `sourceId` is given, posting is idempotent.
   */
  async postEntry(scope: AccountingScope, input: PostEntryInput): Promise<JournalEntryWithPostings> {
    if (!this.policy.canPost(scope)) {
      throw new ForbiddenError('Você não tem permissão para postar lançamentos.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);

    // PERIOD GATE — preflight (fast rejection before tx); authoritative gate is inside the tx.
    await this.assertPeriodOpen(scope, input.date);

    await this.ensureChartOfAccounts(scope);

    // CENTS CHOKE-POINT GUARD (Council 1.5 / ACC-014) + BALANCE INVARIANT — shared with
    // validateEntry (F-P1-6b1); see assertCentsAndBalance above for the rejection rationale.
    const { sumDebit } = this.assertCentsAndBalance(input);

    const sourceType = input.sourceType ?? 'manual';

    // IDEMPOTENCY (read side) — if an entry already exists for this source, return it.
    if (input.sourceId) {
      const existing = await this.journalEntryRepo.findBySource(scope, sourceType, input.sourceId);
      if (existing) {
        logger.info('Posting skipped — idempotent hit', {
          sourceType,
          sourceId: input.sourceId,
          entryId: existing.id,
        });
        return existing;
      }
    }

    // Resolve every line's account (leaf-only) AND its dimension tags BEFORE opening the transaction.
    // Dimension resolution is metadata-only and runs AFTER the balance check above — it can NEVER
    // change Σdébito=Σcrédito (ACC-024). Shared with validateEntry (F-P1-6b1).
    const resolvedLines = await this.resolveEntryLines(scope, input);

    try {
      // ATOMIC — entry header + all legs commit/roll back together.
      const entry = await this.postingRepo.runTransaction(async (tx) => {
        // AUTHORITATIVE PERIOD GATE — inside the tx, before Posted. Closes the TOCTOU window.
        await this.assertPeriodOpenTx(tx, scope, input.date);

        // MANDATORY-DIMENSION GATE (SEC-B1-1, INCR-DIM-COMPLETENESS) — in-tx (T6), authoritative at
        // commit: a leg to a `requiresDimension` account with NO tag is rejected + rolls back. This
        // is the FIRST of the three write-paths covered by the shared choke-point (the other two are
        // reverseEntry — copy-only — and EntryApprovalService.approveEntry). PROSPECTIVE (SEC-B1-5).
        //
        // MACHINE-WRITER EXEMPTION (Council 1.7/N6) — a closing entry (sourceType='closing',
        // ExerciseClosingService) composes its legs FROM aggregated ledger balances: there is no
        // per-leg dimension fact to tag, and gating it would DEADLOCK the year-end close the moment
        // any result account is flagged (exercício inencerrável → no PVA-clean ECD). This mirrors
        // the reversal exemption (SEC-B1-2): both are derived-content writers, not original economic
        // content. The apuração I350/I355 path IS this closing entry (SPED gen is read-only, D7), so
        // no other machine writer needs the exemption. Boundary note: sourceType is caller-supplied,
        // but a caller forging 'closing' only skips a METADATA completeness gate (ACC-024 — no ledger
        // value) at the cost of mislabeling its entry as DRE-excluded — audited like every post.
        this.assertDimensionGateForLines(sourceType, resolvedLines);

        const fiscalYear = this.fiscalYearFrom(input.date);
        const entryNumber = await this.postingRepo.nextEntryNumber(scope, fiscalYear, tx);

        const created = await this.journalEntryRepo.create(
          {
            userId,
            unitId,
            date: new Date(input.date),
            description: input.description,
            status: 'Posted',
            sourceType,
            sourceId: input.sourceId ?? null,
            createdById: scope.actorUserId,
            postedById: scope.actorUserId,
            fiscalYear,
            entryNumber,
          },
          tx,
        );

        for (const line of resolvedLines) {
          const posting = await this.postingRepo.create(
            {
              userId,
              unitId,
              entryId: created.id,
              accountId: line.accountId,
              debitCents: line.debitCents,
              creditCents: line.creditCents,
            },
            tx,
          );
          // INCR-DIM — tag the leg (metadata; same tx, T6). The @@unique([postingId,definitionId]) is
          // the authoritative one-value-per-axis backstop; resolveLineDimensions already rejected dups
          // and non-leaf/archived values pre-tx. Writes NO ledger value (ACC-024).
          for (const tag of line.dimensions) {
            await this.dimensionRepo.createPostingDimension(
              { userId, unitId, postingId: posting.id, definitionId: tag.definitionId, valueId: tag.valueId },
              tx,
            );
          }
        }

        const postings = await this.postingRepo.findByEntryId(scope, created.id, tx);
        // TRIAGEM-AUDIT-2026-08-15 A2(b) — the audit payload is PII-clean by construction: pick
        // `auditDescription` when the caller supplied one (subledgers whose row `description` embeds
        // a supplier/customer name — PayableService/ReceivableService), otherwise fall back to
        // `description` (manual posts, machine writers with nothing to sanitize). The JournalEntry
        // ROW created above always keeps the original `description` — this substitution touches ONLY
        // the immutable hash-chained payload, never the ledger fact or the ECD I250 hist.
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType:   'entry.posted',
          targetType:  'journal_entry',
          targetId:    created.id,
          payload:     { sourceType, sourceId: input.sourceId, description: input.auditDescription ?? input.description, sumDebitCents: String(sumDebit), lineCount: String(resolvedLines.length) },
        });

        // BE-INCR-8 — formal provenance (ADR-INCR8 D5). When the caller passes an origin
        // descriptor, record a SourceDocument + JournalEntrySource in THIS tx — atomic with
        // the entry (ACC-011/012), tx propagated (T6). Absent ⇒ no origin: manual (no
        // descriptor) and reversal (a separate path that never sets one) get NONE. This layer
        // writes NO ledger value; idempotency stays in JournalEntry.@@unique (T7/D2) and a
        // re-post short-circuits before the tx, so no SourceDocument is ever duplicated.
        if (input.sourceDocument) {
          const sd = input.sourceDocument;
          const sourceDocument = await this.sourceProvenanceRepo.createSourceDocument(
            {
              userId,
              unitId,
              sourceType,
              externalRef: sd.externalRef ?? null,
              documentDate: sd.documentDate ? new Date(sd.documentDate) : null,
              description: sd.description ?? null,
              attachmentId: sd.attachmentId ?? null,
              rawJson: sd.rawJson ?? null,
              createdById: scope.actorUserId,
            },
            tx,
          );
          await this.sourceProvenanceRepo.linkEntry(
            { userId, unitId, journalEntryId: created.id, sourceDocumentId: sourceDocument.id },
            tx,
          );
          await this.auditService.append(tx, scope, {
            actorUserId: scope.actorUserId,
            eventType:   'entry.source_recorded',
            targetType:  'journal_entry',
            targetId:    created.id,
            payload:     { journalEntryId: created.id, sourceDocumentId: sourceDocument.id, externalRef: sd.externalRef, sourceType },
          });
        }

        return { ...created, postings };
      });

      logger.info('Journal entry posted', {
        entryId: entry.id,
        lines: resolvedLines.length,
        sumDebit,
      });
      return entry;
    } catch (error) {
      // ponytail: authoritative race-close — @@unique([userId,unitId,sourceType,sourceId])
      // is a REAL DB constraint. A concurrent poster that wins the race trips P2002;
      // re-fetch and return its entry.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        input.sourceId
      ) {
        const existing = await this.journalEntryRepo.findBySource(scope, sourceType, input.sourceId);
        if (existing) {
          logger.info('Posting race closed by unique constraint — returning existing', {
            sourceType,
            sourceId: input.sourceId,
            entryId: existing.id,
          });
          return existing;
        }
      }
      throw error;
    }
  }

  /**
   * Modo VALIDATE-ONLY de `postEntry` (BE-INCR-BINDING-PRESS, F-P1-6b1 — emenda §8 do
   * ADR-P1-binding-press.md, ÚNICA refatoração interna permitida no núcleo imutável). Roda TODAS
   * as validações que `postEntry` roda antes de gravar — policy (`canPost`), preflight de período,
   * guarda de centavos + teto `MAX_CENTS`, invariante Σdébito=Σcrédito, resolução de conta-folha
   * ativa por linha e o gate de dimensão obrigatória (SEC-B1-1) — reusando as MESMAS funções
   * privadas que `postEntry` usa (`assertCentsAndBalance`/`resolveEntryLines`/
   * `assertDimensionGateForLines`), então as duas rotas nunca podem divergir sobre o que é válido.
   * NÃO PERSISTE: nenhuma transação é aberta, nenhuma `JournalEntry`/`Posting` é gravada, nenhum
   * `AuditEvent` é emitido, nenhum `entryNumber` é consumido (a numeração só é obtida DENTRO da tx
   * de `postEntry`, nunca aqui). Resolve `void` em sucesso; rejeita (throw) no primeiro erro, com
   * o MESMO tipo/mensagem que `postEntry` lançaria para o mesmo input.
   *
   * Design source: `docs/accounting/P1-DOSSIER-validador.md` §2.2/§2.3 (opção A — reuso read-only
   * das validações pré-tx, sem abrir transação nenhuma — compatível ao pé da letra com o
   * não-objetivo §8 do ADR-P1: "não toca PostingService" lido como "não muda o contrato/
   * comportamento público de `postEntry`", não como "zero linha do arquivo muda").
   *
   * Duas divergências DELIBERADAS em relação a `postEntry`, ambas necessárias para o contrato
   * "sem persistir" e ambas rastreáveis ao dossiê:
   *   1. NÃO chama `ensureChartOfAccounts` — o dossiê §2.2 não lista esse passo entre os que já
   *      rodam pré-tx e são reaproveitáveis; ele GRAVA contas canônicas ausentes (efeito colateral
   *      de escrita), o que violaria "sem persistir" se rodasse aqui. Consequência: uma conta
   *      canônica ainda não semeada é reportada como erro de conta inexistente por este modo,
   *      mesmo que um `postEntry` real a criasse sob demanda — aceitável porque o validador da
   *      Prensa roda sobre o chart JÁ compilado do tenant (Corpo C do BRIEF), não sobre um tenant
   *      vazio.
   *   2. NÃO faz o check de idempotência (`journalEntryRepo.findBySource`) nem abre a tx que
   *      fecha o TOCTOU de período (`assertPeriodOpenTx`) — nenhum dos dois é uma "validação" do
   *      INPUT: o primeiro decide se retorna um lançamento já existente (irrelevante para "este
   *      input validaria?"), o segundo só faz sentido dentro de uma transação de escrita real.
   *      O `postEntry` real continua sendo a autoridade de período quando o binding compilado
   *      roda em produção (T6 intocado) — o dossiê §2.2 trata isso como aceitável por desenho,
   *      já que o validador roda no momento da compilação do binding, não a cada postagem.
   */
  async validateEntry(scope: AccountingScope, input: PostEntryInput): Promise<void> {
    if (!this.policy.canPost(scope)) {
      throw new ForbiddenError('Você não tem permissão para postar lançamentos.');
    }
    await this.assertPeriodOpen(scope, input.date);
    this.assertCentsAndBalance(input);
    const sourceType = input.sourceType ?? 'manual';
    const resolvedLines = await this.resolveEntryLines(scope, input);
    this.assertDimensionGateForLines(sourceType, resolvedLines);
  }

  /**
   * Reverse a posted entry (estorno): create a mirror entry with debit/credit SWAPPED,
   * move the original to `Reversed`, and link them. Only `Posted` entries reverse.
   */
  async reverseEntry(
    scope: AccountingScope,
    input: ReverseEntryInput,
  ): Promise<{ reversal: JournalEntryWithPostings; original: JournalEntryWithPostings }> {
    if (!this.policy.canPost(scope)) {
      throw new ForbiddenError('Você não tem permissão para estornar lançamentos.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);

    // PERIOD GATE — gate on the REVERSAL date (not the original entry date).
    await this.assertPeriodOpen(scope, input.reversalPostingDate);

    const original = await this.journalEntryRepo.findById(scope, input.lancamentoId);
    if (!original) {
      throw new NotFoundError(`Lançamento '${input.lancamentoId}' não foi encontrado.`);
    }

    // IDEMPOTENCY — must come BEFORE the status gate: a reversed entry has status 'Reversed',
    // so checking status first would throw instead of returning the prior reversal.
    if (original.reversedById) {
      const existing = await this.journalEntryRepo.findById(scope, original.reversedById);
      if (existing) {
        logger.info('Reversal skipped — original already reversed', {
          originalId: original.id,
          reversalId: existing.id,
        });
        return { reversal: existing, original };
      }
    }
    const priorReversal = await this.journalEntryRepo.findBySource(scope, 'reversal', original.id);
    if (priorReversal) {
      logger.info('Reversal skipped — idempotent hit', {
        originalId: original.id,
        reversalId: priorReversal.id,
      });
      return { reversal: priorReversal, original };
    }

    // INCR4-B (ADR-INCR7 D5): a Reconciled entry must be un-reconciled first — a
    // clear error instead of silently reversing over reconciled state.
    if (original.status === 'Reconciled') {
      throw new ValidationError(
        'Lançamento conciliado — desfaça a conciliação (unmatch) antes de estornar.',
      );
    }
    if (original.status !== 'Posted') {
      throw new ValidationError('Apenas lançamentos postados podem ser estornados.');
    }

    // Re-assert the original is balanced before mirroring.
    const origDebit = original.postings.reduce((acc, p) => acc + p.debitCents, 0);
    const origCredit = original.postings.reduce((acc, p) => acc + p.creditCents, 0);
    if (origDebit !== origCredit || origDebit <= 0) {
      throw new ValidationError(
        `Lançamento '${original.id}' está desbalanceado ou sem partidas — estorno abortado.`,
      );
    }

    // Reversing a CLOSING entry is itself part of the closing mechanism (D3/D5): the reversal
    // inherits sourceType='closing' so it too is EXCLUDED from the DRE — otherwise its
    // result-account legs would leak back into the operational result. Hoisted so the P2002
    // race-close catch below looks the reversal up under the RIGHT sourceType.
    const isClosingReversal = original.sourceType === CLOSING_SOURCE_TYPE;
    const reversalSourceType = isClosingReversal ? CLOSING_SOURCE_TYPE : 'reversal';

    // ATOMIC — reversal header + swapped legs + original→Reversed + link commit together.
    let result: JournalEntryWithPostings;
    try {
      result = await this.postingRepo.runTransaction(async (tx) => {
        // AUTHORITATIVE PERIOD GATE — inside the tx, on the reversal date.
        await this.assertPeriodOpenTx(tx, scope, input.reversalPostingDate);

        const reversalFiscalYear = this.fiscalYearFrom(input.reversalPostingDate);
        const reversalEntryNumber = await this.postingRepo.nextEntryNumber(
          scope,
          reversalFiscalYear,
          tx,
        );

        const reversal = await this.journalEntryRepo.create(
          {
            userId,
            unitId,
            date: new Date(input.reversalPostingDate),
            description: input.reason ? `Estorno de ${original.id} — ${input.reason}` : `Estorno de ${original.id}`,
            status: 'Posted',
            sourceType: reversalSourceType,
            sourceId: original.id,
            createdById: scope.actorUserId,
            postedById: scope.actorUserId,
            fiscalYear: reversalFiscalYear,
            entryNumber: reversalEntryNumber,
          },
          tx,
        );

        for (const leg of original.postings) {
          const mirror = await this.postingRepo.create(
            {
              userId,
              unitId,
              entryId: reversal.id,
              accountId: leg.accountId,
              // SWAP: a debit leg becomes a credit leg and vice-versa.
              debitCents: leg.creditCents,
              creditCents: leg.debitCents,
            },
            tx,
          );
          // SEC-B1-2 (INCR-DIM-COMPLETENESS) — COPY the original leg's dimension tags onto the mirror
          // leg so the reversal is dimensionally IDENTICAL to the original: the DRE-by-dimension slice
          // reconciles (the reversal cancels the original in the same bucket), and a `requiresDimension`
          // account's estorno inherits its tags instead of failing. The reversal path is NOT hard-gated
          // (SEC-B1-5): it mirrors an already-accepted-or-historical entry, and gating it would
          // retro-reject the estorno of a legitimately-untagged historical leg. Same tx (T6).
          const originalTags = await this.dimensionRepo.findPostingDimensions(scope, leg.id, tx);
          for (const tag of originalTags) {
            await this.dimensionRepo.createPostingDimension(
              { userId, unitId, postingId: mirror.id, definitionId: tag.definitionId, valueId: tag.valueId },
              tx,
            );
          }
        }

        await this.journalEntryRepo.setStatus(scope, original.id, 'Reversed', tx);
        await this.journalEntryRepo.setReversedBy(scope, original.id, reversal.id, tx);

        // FREE THE IDEMPOTENCY KEY (D5): a closing entry keys on sourceId=String(year); once
        // reversed, rename it so the @@unique(...,sourceType,sourceId) is available again and a
        // fresh closeExercise(year) produces a NEW entry instead of tripping P2002 on the
        // reversed one. Same tx as the status flip (ACC-011/019). The renamed entry keeps
        // sourceType='closing' → still DRE-excluded.
        if (isClosingReversal) {
          await this.journalEntryRepo.setSourceId(
            scope,
            original.id,
            // original is guarded status==='Posted' above ⇒ always numbered (fiscalYear non-null,
            // ADR-INCR-APPROVAL made the column nullable only for Draft/PendingApproval).
            reversedClosingSourceId(original.fiscalYear!, original.id),
            tx,
          );
        }

        const reversalPostings = await this.postingRepo.findByEntryId(scope, reversal.id, tx);
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType:   'entry.reversed',
          targetType:  'journal_entry',
          targetId:    reversal.id,
          payload:     { originalId: original.id, reversalId: reversal.id, reason: input.reason },
        });
        return { ...reversal, postings: reversalPostings };
      });
    } catch (error) {
      // ponytail: authoritative race-close — @@unique([userId,unitId,sourceType,sourceId]) blocks
      // a second reversal. A concurrent reverser that loses the race trips P2002; re-fetch under the
      // reversal's actual sourceType (='closing' when reversing a closing entry — N1).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.journalEntryRepo.findBySource(scope, reversalSourceType, original.id);
        if (existing) {
          const racedOriginal =
            (await this.journalEntryRepo.findById(scope, original.id)) ?? original;
          logger.info('Reversal race closed by unique constraint — returning existing', {
            originalId: original.id,
            reversalId: existing.id,
          });
          return { reversal: existing, original: racedOriginal };
        }
      }
      throw error;
    }

    logger.info('Journal entry reversed', { originalId: original.id, reversalId: result.id });

    const refreshedOriginal =
      (await this.journalEntryRepo.findById(scope, original.id)) ?? original;
    return { reversal: result, original: refreshedOriginal };
  }

  /**
   * Find a single journal entry by its business source (sourceType + sourceId).
   * Used by integration hooks (e.g. accountingSync) that need the entry id to reverse.
   */
  async findEntryBySource(
    scope: AccountingScope,
    sourceType: string,
    sourceId: string,
  ): Promise<JournalEntryWithPostings | null> {
    if (!this.policy.canRead(scope)) return null;
    return this.journalEntryRepo.findBySource(scope, sourceType, sourceId);
  }

  /**
   * BE-INCR-PROVENANCE-ATTACH (NFE-X) — attach formal provenance to an ALREADY-POSTED entry
   * WITHOUT re-posting. Creates a SourceDocument + JournalEntrySource + audit event in ONE tx,
   * reusing the exact seam `postEntry` uses (createSourceDocument/linkEntry). Writes NO ledger
   * value; posts NOTHING; the balance/period gates are irrelevant because no Posting is created.
   *
   * PERMISSION (F-PA1→(b), ratified 2026-08-28): gated by `canManage`, NOT `canPost`. Attaching
   * evidence to an entry is not a ledger write — `canPost` in this codebase gates only the
   * writers of VALUE (postEntry, ExerciseClosingService). The sibling that attaches evidence to
   * the same target (DocumentAttachmentService) already uses `canManage` to write and `canRead`
   * to list; this keeps ONE rule for both ways of attaching evidence to a journal entry.
   *
   * Idempotent on the HUMAN externalRef (T7 — the NF-e access key, never a sourceId): a
   * re-attach of the same fiscal document to the same entry finds the existing link and returns
   * its SourceDocument.
   *
   * HONEST LIMIT of that idempotency (do not read more into it than the code gives): the
   * existence check runs INSIDE `runTransaction` with the tx handle propagated
   * (authoritative-gate-inside-tx), which is what a SEQUENTIAL re-attach needs; but there is NO
   * `@@unique(journalEntryId, externalRef)` behind it, so two CONCURRENT attaches of the same
   * key can still both miss and create two SourceDocuments (SQLite's default isolation does not
   * serialize the read against the other tx's uncommitted insert). Closing that fully requires
   * the unique index (a migration) — DELIBERATELY NOT DONE HERE: F-D4→(b), declared debt, ratified
   * by the owner 2026-08-28. The `postEntry` variant above carries the SAME exposure today.
   * Sequentially — the real operator flow — exactly one SourceDocument exists per (entry, externalRef).
   */
  async attachSourceDocument(
    scope: AccountingScope,
    entryId: string,
    doc: AttachSourceDocumentInput,
  ): Promise<SourceDocument> {
    if (!this.policy.canManage(scope)) {
      throw new ForbiddenError('Você não tem permissão para anexar proveniência a lançamentos.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);

    // Confirm the target entry exists within the scope before attaching (no orphan provenance).
    const entry = await this.journalEntryRepo.findById(scope, entryId);
    if (!entry) {
      throw new NotFoundError(`Lançamento '${entryId}' não foi encontrado.`);
    }

    const sourceType = doc.sourceType ?? entry.sourceType;

    return this.postingRepo.runTransaction(async (tx) => {
      // IDEMPOTENCY (T7) — keyed on the human externalRef, re-checked INSIDE the tx with `tx`
      // propagated to the repo (authoritative-gate-inside-tx). Reading it before opening the tx
      // leaves a window in which two sequential-but-interleaved requests both pass the check and
      // create two SourceDocuments; the gate shares the transaction with the write it guards.
      if (doc.externalRef) {
        const existingLinks = await this.sourceProvenanceRepo.findSourcesByEntry(scope, entry.id, tx);
        const already = existingLinks.find((l) => l.sourceDocument.externalRef === doc.externalRef);
        if (already) {
          logger.info('attachSourceDocument skipped — provenance already recorded', {
            entryId: entry.id,
            externalRef: doc.externalRef,
          });
          return already.sourceDocument;
        }
      }

      const sourceDocument = await this.sourceProvenanceRepo.createSourceDocument(
        {
          userId,
          unitId,
          sourceType,
          externalRef: doc.externalRef ?? null,
          documentDate: doc.documentDate ? new Date(doc.documentDate) : null,
          description: doc.description ?? null,
          attachmentId: doc.attachmentId ?? null,
          rawJson: doc.rawJson ?? null,
          createdById: scope.actorUserId,
        },
        tx,
      );
      await this.sourceProvenanceRepo.linkEntry(
        { userId, unitId, journalEntryId: entry.id, sourceDocumentId: sourceDocument.id },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType:   'entry.source_recorded',
        targetType:  'journal_entry',
        targetId:    entry.id,
        payload:     { journalEntryId: entry.id, sourceDocumentId: sourceDocument.id, externalRef: doc.externalRef, sourceType },
      });
      logger.info('Provenance attached to posted entry', {
        entryId: entry.id,
        sourceDocumentId: sourceDocument.id,
        externalRef: doc.externalRef,
      });
      return sourceDocument;
    });
  }

  /**
   * Drill-down read of the origin documents linked to an entry (BE-INCR-PROVENANCE-ATTACH, NFE-X).
   *
   * Thin by design: it exists so the HTTP edge honours the layer chain
   * `Route → Controller → Service → Repository` (Contrato §2/§3) instead of the controller
   * reaching into `ISourceProvenanceRepository` directly. Gated by `canRead`, mirroring
   * `DocumentAttachmentService.listByTarget` — the same precedent that put `canManage` on the
   * write above.
   */
  async listSourceDocuments(
    scope: AccountingScope,
    entryId: string,
  ): Promise<JournalEntrySourceWithDocument[]> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler a proveniência de lançamentos.');
    }
    return this.sourceProvenanceRepo.findSourcesByEntry(scope, entryId);
  }

  /**
   * List all active accounts for the scope. Idempotently seeds the canonical
   * chart of accounts first so the caller always gets a non-empty list on first access.
   */
  async listAccounts(scope: AccountingScope): Promise<Account[]> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para listar contas.');
    }
    await this.ensureChartOfAccounts(scope);
    return this.accountRepo.findManyByUnit(scope);
  }

  /**
   * List journal entries for the scope, paginated, with postings including
   * account code and name. Ordered by date descending.
   */
  async listEntries(
    scope: AccountingScope,
    params: { page?: number; limit?: number },
  ): Promise<{ entries: JournalEntryWithFullPostings[]; total: number }> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para listar lançamentos.');
    }
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const skip = (page - 1) * limit;
    return this.journalEntryRepo.findManyByUnit(scope, skip, limit);
  }

  /**
   * Create a user-defined account in the chart of accounts (non-canonical).
   * Duplicate codes are blocked by the @@unique constraint; P2002 → ValidationError.
   */
  async createAccount(scope: AccountingScope, dto: CreateAccountInput): Promise<Account> {
    if (!this.policy.canManage(scope)) {
      throw new ForbiddenError('Você não tem permissão para criar contas.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);
    try {
      return await this.postingRepo.runTransaction(async (tx) => {
        const account = await this.accountRepo.create({
          userId,
          unitId,
          code: dto.code,
          name: dto.name,
          nature: dto.nature,
          acceptsEntries: dto.acceptsEntries ?? true,
        }, tx);
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType:   'account.created',
          targetType:  'account',
          targetId:    account.id,
          payload:     { code: account.code, name: account.name, nature: account.nature, acceptsEntries: String(account.acceptsEntries) },
        });
        return account;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ValidationError(
          `Já existe uma conta com o código '${dto.code}' nesta unidade.`,
        );
      }
      throw error;
    }
  }

  /**
   * Soft-delete a user-defined account. Guards:
   * 1. Account must exist within this scope (ownerUserId + unitId).
   * 2. Account must not be a canonical/seeded account.
   * 3. Account must have no postings.
   *
   * The lookup is unit-scoped (Contract §2 tenancy): an account can only be deleted
   * while acting in its own unit, so there is no cross-unit-by-id deletion path.
   */
  async deleteAccount(scope: AccountingScope, accountId: string): Promise<void> {
    if (!this.policy.canManage(scope)) {
      throw new ForbiddenError('Você não tem permissão para excluir contas.');
    }

    const account = await this.accountRepo.findById(scope, accountId);
    if (!account) {
      throw new NotFoundError(`Conta '${accountId}' não encontrada.`);
    }

    // Guard: cannot delete canonical (seeded) accounts.
    const isCanonical = CANONICAL_ACCOUNTS.some((c) => c.code === account.code);
    if (isCanonical) {
      throw new AppError(
        'Contas padrão do plano de contas não podem ser excluídas.',
        409,
        'CONFLICT',
      );
    }

    // Guard: cannot delete an account that has postings.
    const postings = await this.postingRepo.findByAccount(scope, accountId);
    if (postings.length > 0) {
      throw new AppError(
        'Conta possui lançamentos e não pode ser excluída.',
        409,
        'CONFLICT',
      );
    }

    await this.postingRepo.runTransaction(async (tx) => {
      await this.accountRepo.softDelete(scope, accountId, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType:   'account.deleted',
        targetType:  'account',
        targetId:    accountId,
        payload:     { code: account.code },
      });
    });
    logger.info('Account soft-deleted', { accountId, userId: scope.ownerUserId });
  }

  /**
   * Toggle an account's `requiresDimension` flag (INCR-DIM-COMPLETENESS SEC-B1-4). Behind
   * `canManage`, and EVERY mutation emits an AuditEvent in the hash-chain — so the off→post→on
   * evasion (turn the flag off, post an untagged leg, turn it back on) is permanently VISIBLE in
   * the append-only trail. The flip + its audit event commit atomically in one tx (T8). Only
   * mutates a boolean column — never a ledger value (ACC-024); the gate itself lives in the
   * posting/approval write-paths (SEC-B1-1), never here.
   */
  async setAccountRequiresDimension(
    scope: AccountingScope,
    accountId: string,
    requiresDimension: boolean,
  ): Promise<Account> {
    if (!this.policy.canManage(scope)) {
      throw new ForbiddenError('Você não tem permissão para configurar contas.');
    }
    const account = await this.accountRepo.findById(scope, accountId);
    if (!account) {
      throw new NotFoundError(`Conta '${accountId}' não encontrada.`);
    }
    return this.postingRepo.runTransaction(async (tx) => {
      const updated = await this.accountRepo.setRequiresDimension(scope, accountId, requiresDimension, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType:   'account.requires_dimension_changed',
        targetType:  'account',
        targetId:    accountId,
        payload:     { code: account.code, from: String(account.requiresDimension), to: String(requiresDimension) },
      });
      logger.info('Account requiresDimension changed', {
        accountId,
        code: account.code,
        from: account.requiresDimension,
        to: requiresDimension,
      });
      return updated;
    });
  }
}
