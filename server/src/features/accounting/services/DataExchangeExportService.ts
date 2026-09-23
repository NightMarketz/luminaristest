import { createHash } from 'node:crypto';
import type { AccountingDataExchangeJob, BankStatementLine } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import * as storage from '../../../lib/attachmentStorage';
import { sendAlertWebhook } from '../../../lib/alertWebhook';
import { metrics } from '../../../lib/monitoring';
import { serializeTable, type OutTable } from '../../../lib/spreadsheet';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IDataExchangeRepository } from '../repositories/IDataExchangeRepository';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { CandidatePosting, MatchedLineForExport } from '../models/Reconciliation.model';
import type { AuditService } from './AuditService';
import type { ExportRequestDto } from '../dtos/DataExchangeDto';
import type { ImportKind } from '../models/DataExchange.model';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { centsFromDb } from '../models/money';
import { sampleEntries, type SampleableLeg } from '../models/entrySample';
import { toJobResponse, toJobListItem, type DataExchangeJobResponse, type DataExchangeJobListItem } from './dataExchangeMappers';
import type {
  TrialBalanceReport,
  AccountLedgerReport,
  GeneralLedgerRow,
  BalanceSheetReport,
  IncomeStatementReport,
} from './AccountingReportService';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** A date-only window in UTC-day boundaries (C6b PR-1, F-C6b-3/6/7 a). */
export interface ExportWindow {
  from: Date;
  to: Date;
}

/** Minimal read surface the exporter needs — satisfied structurally by AccountingReportService. */
export interface IReportReader {
  trialBalance(scope: AccountingScope, asOf?: Date): Promise<TrialBalanceReport>;
  accountLedger(scope: AccountingScope, accountCode: string, window?: ExportWindow): Promise<AccountLedgerReport>;
  generalLedger(scope: AccountingScope, window: ExportWindow): Promise<GeneralLedgerRow[]>;
  balanceSheet(scope: AccountingScope, asOf: Date): Promise<BalanceSheetReport>;
  incomeStatement(scope: AccountingScope, asOf: Date): Promise<IncomeStatementReport>;
}

/** Minimal read surface `EXPORT_BANK_RECONCILIATION` needs (C6b PR-2 Passo 8) — same narrowing
 *  pattern as `IReportReader`, satisfied structurally by `IReconciliationRepository` (injected
 *  directly; a service-level `ReconciliationService` wrapper would also satisfy it, but none of
 *  these 4 reads live on the service today — they are repo-level). */
export interface IReconciliationReader {
  findScopeBankAccountIds(scope: AccountingScope): Promise<string[]>;
  findUnmatchedLinesByAccount(
    scope: AccountingScope,
    glAccountId: string,
    options?: { from?: Date; to?: Date },
  ): Promise<BankStatementLine[]>;
  findUnmatchedBankPostings(
    scope: AccountingScope,
    glAccountId: string,
    options?: { from?: Date; to?: Date },
  ): Promise<CandidatePosting[]>;
  findMatchedLinesByWindow(
    scope: AccountingScope,
    glAccountIds: string[],
    window: ExportWindow,
  ): Promise<MatchedLineForExport[]>;
}

/**
 * Minimal read surface for resolving a bank account's CODE (C6b PR-2 Passo 8, review F1 —
 * ALTO). `findScopeBankAccountIds` only returns ids; `IReportReader.trialBalance` only covers
 * accounts WITH movement (a freshly-registered bank account with an imported statement and
 * ZERO postings resolves to nothing there — the `'?'` sentinel this used to fall back to was
 * reachable, not defensive). This reads the chart of accounts directly (every ACTIVE account
 * in the unit, regardless of movement) — satisfied structurally by `IAccountRepository`.
 */
export interface IAccountReader {
  findManyByUnit(scope: AccountingScope): Promise<Array<{ id: string; code: string }>>;
}

/** `[YYYY-MM-DD, YYYY-MM-DD]` → `{from: T00:00:00.000Z, to: T00:00:00.000Z}` — job-column
 *  storage convention (period-as-marker, not a query bound; matches SpedGenerationService). */
function periodColumns(periodStart: string, periodEnd: string): { periodStart: Date; periodEnd: Date } {
  return {
    periodStart: new Date(`${periodStart}T00:00:00.000Z`),
    periodEnd: new Date(`${periodEnd}T00:00:00.000Z`),
  };
}

/** `[YYYY-MM-DD, YYYY-MM-DD]` → query window with a whole-day-inclusive `to` — same convention
 *  as `SpedGenerationService`/`DailyJournalReportService`'s own `findManyForExport` calls. */
function queryWindow(periodStart: string, periodEnd: string): ExportWindow {
  return {
    from: new Date(`${periodStart}T00:00:00.000Z`),
    to: new Date(`${periodEnd}T23:59:59.999Z`),
  };
}

/** Período gravado no job (C6b PR-1 Passo 6) — null/null para kinds que nunca entram no pacote
 *  do contador (F-C6b-3 a) ou quando a entrada opcional que determina o período não veio. */
type JobPeriod = { periodStart: Date | null; periodEnd: Date | null };
const NO_PERIOD: JobPeriod = { periodStart: null, periodEnd: null };

/** Metadata + resolved absolute path for streaming an export artifact. */
export interface ArtifactDownloadTarget {
  job: AccountingDataExchangeJob;
  absPath: string;
  fileName: string;
  mimeType: string;
}

/** Blank-template header rows, keyed by import kind. */
const TEMPLATE_HEADERS: Record<ImportKind, string[]> = {
  IMPORT_CHART_OF_ACCOUNTS: ['code', 'name', 'nature', 'acceptsEntries', 'parentCode'],
  IMPORT_OPENING_BALANCES: ['accountCode', 'postingDate', 'description', 'debitCents', 'creditCents'],
  IMPORT_JOURNAL_ENTRIES: [
    'entryKey', 'documentDate', 'postingDate', 'description',
    'accountCode', 'debitCents', 'creditCents', 'lineDescription', 'externalReference',
  ],
};

/**
 * Export half of the accounting Data Exchange (BE-INCR-6). Renders read-only report data
 * or blank import templates to CSV/XLSX, persists the artifact via the reused disk store,
 * and records an EXPORT job + `data_exchange.export_generated` audit in one tx. No prisma.*
 * and no Express here. Cross-tenant access surfaces as NotFoundError.
 */
export class DataExchangeExportService {
  constructor(
    private readonly reports: IReportReader,
    private readonly policy: IAccountingPolicy,
    private readonly repo: IDataExchangeRepository,
    private readonly audit: AuditService,
    // C6b PR-2 Passo 8/9: fonte de EXPORT_BANK_RECONCILIATION (leituras de conciliação) e
    // EXPORT_ENTRY_SAMPLE (findManyForExport — o MESMO read que a ECD usa para o Diário, A6
    // do plano). Injeção direta do repositório (plano Passo 9: "injetar IJournalEntryRepository
    // ou expor via reader" — escolhido injetar, zero mudança em AccountingReportService).
    private readonly reconciliation: IReconciliationReader,
    private readonly journalEntryRepo: IJournalEntryRepository,
    // Review #338 F1 (ALTO): código da conta bancária para EXPORT_BANK_RECONCILIATION — NUNCA
    // via trialBalance (só cobre conta COM movimento; ver IAccountReader acima).
    private readonly accountRepo: IAccountReader,
  ) {}

  /**
   * Builds the tabular payload for a given export kind, PLUS the period the artifact covers
   * (C6b PR-1 Passo 6, F-C6b-3/6/7 a) — the caller records it on the job so the contador
   * package (C6b PR-3) can validate that an extra's period is contained in the delivery's.
   * "Regra de período por kind" (plano, Passo 6): BP/DRE/balancete = `[Jan-1 do ano(asOf), asOf]`;
   * razão = a janela do DTO; template = null. Entrada ausente (sem asOf / sem janela) ⇒ null/null
   * — nunca inventa um período que ninguém pediu. C6b PR-2 Passo 8/9: conciliação e amostra também
   * gravam a janela EXPLÍCITA do DTO (igual ao razão) — mas para elas a janela é OBRIGATÓRIA na
   * fronteira do DTO (superRefine), então nunca chegam aqui com `periodStart`/`periodEnd` ausentes.
   */
  private async buildTable(scope: AccountingScope, dto: ExportRequestDto): Promise<{ table: OutTable; period: JobPeriod }> {
    switch (dto.kind) {
      case 'EXPORT_TRIAL_BALANCE': {
        const asOf = dto.asOf ? new Date(dto.asOf) : undefined;
        const r = await this.reports.trialBalance(scope, asOf);
        const table: OutTable = {
          headers: ['code', 'name', 'nature', 'debitCents', 'creditCents', 'balanceCents'],
          rows: r.rows.map((row) => [row.code, row.name, row.nature, row.debitCents, row.creditCents, row.balanceCents]),
        };
        const period = dto.asOf
          ? periodColumns(`${asOf!.getUTCFullYear()}-01-01`, dto.asOf)
          : NO_PERIOD;
        return { table, period };
      }
      case 'EXPORT_GENERAL_LEDGER': {
        const window = dto.periodStart && dto.periodEnd ? queryWindow(dto.periodStart, dto.periodEnd) : undefined;
        const period = dto.periodStart && dto.periodEnd
          ? periodColumns(dto.periodStart, dto.periodEnd)
          : NO_PERIOD;

        if (dto.accountCode) {
          const r = await this.reports.accountLedger(scope, dto.accountCode, window);
          const table: OutTable = {
            headers: ['date', 'entryId', 'description', 'status', 'debitCents', 'creditCents', 'runningBalanceCents'],
            rows: r.rows.map((row) => [
              row.date.toISOString().slice(0, 10), row.entryId, row.description, row.status,
              row.debitCents, row.creditCents, row.runningBalanceCents,
            ]),
          };
          return { table, period };
        }

        // Razão geral (sem accountCode, F-C6b-7 a): exige janela — `findManyForExport` (o read
        // que `generalLedger` reusa da ECD) não tem modo "sem bound". O DTO PERMITE omitir a
        // janela (Passo 5 T: "razão sem accountCode → válido") porque essa é uma regra de FORMA;
        // esta é a regra de CONSTRUÇÃO do artefato — 400 nomeado, nunca um scan sem fim.
        if (!window) {
          throw new ValidationError(
            'periodStart e periodEnd são obrigatórios para exportar o razão geral (sem accountCode).',
          );
        }
        const rows = await this.reports.generalLedger(scope, window);
        const table: OutTable = {
          headers: [
            'accountCode', 'accountName', 'date', 'entryId', 'entryNumber',
            'description', 'status', 'debitCents', 'creditCents', 'runningBalanceCents',
          ],
          rows: rows.map((row) => [
            row.accountCode, row.accountName, row.date.toISOString().slice(0, 10), row.entryId,
            row.entryNumber ?? '', row.description, row.status, row.debitCents, row.creditCents,
            row.runningBalanceCents,
          ]),
        };
        return { table, period };
      }
      case 'EXPORT_BALANCE_SHEET': {
        const asOf = new Date(dto.asOf as string);
        const r = await this.reports.balanceSheet(scope, asOf);
        const rows: OutTable['rows'] = [];
        const push = (section: string, lines: { code: string; name: string; amountCents: string }[]) =>
          lines.forEach((l) => rows.push([section, l.code, l.name, l.amountCents]));
        push('ASSETS', r.assets.accounts);
        push('LIABILITIES', r.liabilities.accounts);
        push('EQUITY', r.equity.accounts);
        rows.push(['NET_RESULT', '', 'Resultado do período', r.netResultLine.amountCents]);
        const table: OutTable = { headers: ['section', 'code', 'name', 'amountCents'], rows };
        const period = periodColumns(`${asOf.getUTCFullYear()}-01-01`, dto.asOf as string);
        return { table, period };
      }
      case 'EXPORT_INCOME_STATEMENT': {
        const asOf = new Date(dto.asOf as string);
        const r = await this.reports.incomeStatement(scope, asOf);
        const rows: OutTable['rows'] = [];
        const push = (section: string, lines: { code: string; name: string; amountCents: string }[]) =>
          lines.forEach((l) => rows.push([section, l.code, l.name, l.amountCents]));
        push('GROSS_REVENUE', r.grossRevenue.accounts);
        push('REVENUE_DEDUCTIONS', r.revenueDeductions.accounts);
        // COST_OF_GOODS_SOLD (INCR-INVENTORY Body 2): 4.2 accounts moved out of EXPENSES into their
        // own DRE section — push them so the export keeps every DRE account (no silent drop).
        push('COST_OF_GOODS_SOLD', r.costOfGoodsSold.accounts);
        push('EXPENSES', r.expenses.accounts);
        rows.push(['NET_RESULT', '', 'Resultado líquido', r.netResult.amountCents]);
        const table: OutTable = { headers: ['section', 'code', 'name', 'amountCents'], rows };
        const period = periodColumns(`${asOf.getUTCFullYear()}-01-01`, dto.asOf as string);
        return { table, period };
      }
      case 'EXPORT_TEMPLATE': {
        const table: OutTable = { headers: TEMPLATE_HEADERS[dto.templateKind as ImportKind], rows: [] };
        return { table, period: NO_PERIOD };
      }
      case 'EXPORT_BANK_RECONCILIATION': {
        // DTO superRefine já garante periodStart/periodEnd presentes para este kind.
        const periodStart = dto.periodStart as string;
        const periodEnd = dto.periodEnd as string;
        const window = queryWindow(periodStart, periodEnd);
        const period = periodColumns(periodStart, periodEnd);

        const bankAccountIds = await this.reconciliation.findScopeBankAccountIds(scope);
        // Review #338 F1 (ALTO): código da conta bancária por id via IAccountReader — NUNCA
        // trialBalance, que só cobre conta COM movimento; uma conta bancária recém-cadastrada
        // com extrato importado e ZERO postings some de lá (o '?' que caía aqui era alcançável
        // em produção, não defensivo). findManyByUnit cobre toda conta ATIVA do escopo.
        const codeByAccountId = new Map(
          (await this.accountRepo.findManyByUnit(scope)).map((a) => [a.id, a.code]),
        );
        const resolveBankAccountCode = (glAccountId: string): string => {
          const code = codeByAccountId.get(glAccountId);
          if (!code) {
            // Conta sem código resolvido = erro de dado (a conta some do plano ativo enquanto
            // o extrato ainda a referencia) — nunca uma sentinela silenciosa num CSV ao contador.
            throw new ValidationError(
              `Conta bancária '${glAccountId}' não foi encontrada no plano de contas ativo — não é possível montar a conciliação.`,
            );
          }
          return code;
        };

        const rows: OutTable['rows'] = [];
        const matched = await this.reconciliation.findMatchedLinesByWindow(scope, bankAccountIds, window);
        for (const m of matched) {
          rows.push([
            'MATCHED', m.bankAccountCode, m.statementId, m.lineDate.toISOString().slice(0, 10),
            m.amountCents, m.memo, m.entryId, m.entryNumber ?? '', m.matchType,
          ]);
        }

        for (const glAccountId of bankAccountIds) {
          const code = resolveBankAccountCode(glAccountId);
          const [unmatchedLines, unmatchedPostings] = await Promise.all([
            this.reconciliation.findUnmatchedLinesByAccount(scope, glAccountId, { from: window.from, to: window.to }),
            this.reconciliation.findUnmatchedBankPostings(scope, glAccountId, { from: window.from, to: window.to }),
          ]);
          for (const line of unmatchedLines) {
            rows.push([
              'UNMATCHED_LINE', code, line.statementId, line.date.toISOString().slice(0, 10),
              centsFromDb(line.amountCents), line.description, '', '', '',
            ]);
          }
          for (const posting of unmatchedPostings) {
            const signed = centsFromDb(posting.debitCents) - centsFromDb(posting.creditCents);
            rows.push([
              'UNMATCHED_POSTING', code, '', posting.entry.date.toISOString().slice(0, 10),
              signed, posting.entry.description, posting.entry.id, posting.entry.entryNumber ?? '', '',
            ]);
          }
        }

        const table: OutTable = {
          headers: ['section', 'bankAccountCode', 'statementId', 'lineDate', 'amountCents', 'memo', 'entryId', 'entryNumber', 'matchType'],
          rows,
        };
        return { table, period };
      }
      case 'EXPORT_ENTRY_SAMPLE': {
        // DTO superRefine já garante periodStart/periodEnd/seed presentes para este kind.
        const periodStart = dto.periodStart as string;
        const periodEnd = dto.periodEnd as string;
        const seed = dto.seed as string;
        const perAccount = dto.perAccount ?? 5; // default do BRIEF §4 — aplicado aqui, não no DTO (ver comentário no schema).
        const window = queryWindow(periodStart, periodEnd);
        const period = periodColumns(periodStart, periodEnd);

        const [entries, trialBalance] = await Promise.all([
          this.journalEntryRepo.findManyForExport(scope, LEDGER_STATUSES, window),
          this.reports.trialBalance(scope),
        ]);
        const natureByCode = new Map(trialBalance.rows.map((r) => [r.code, r.nature]));

        const legs: SampleableLeg[] = [];
        for (const entry of entries) {
          for (const leg of entry.postings) {
            legs.push({
              accountCode: leg.account.code,
              entryId: entry.id,
              entryNumber: entry.entryNumber,
              date: entry.date,
              description: entry.description,
              sourceType: entry.sourceType,
              sourceId: entry.sourceId,
              debitCents: centsFromDb(leg.debitCents),
              creditCents: centsFromDb(leg.creditCents),
            });
          }
        }

        const sampled = sampleEntries(legs, { perAccount, seed })
          // Ordem de EXIBIÇÃO apenas (não afeta QUAIS linhas foram escolhidas, só a ordem no
          // arquivo) — determinística por si (accountCode, date, entryId), sem depender do hash.
          .sort((a, b) =>
            a.accountCode.localeCompare(b.accountCode) ||
            a.date.getTime() - b.date.getTime() ||
            a.entryId.localeCompare(b.entryId),
          );

        // F-C6b-8 a: semente + algoritmo na 1ª linha do arquivo (rastreável pelo contador sem
        // depender do metadado do job). Como `OutTable.headers` é literalmente a 1ª linha
        // renderizada (serializeTable não trata headers/rows de forma especial), os nomes de
        // coluna REAIS viram a 1ª linha de `rows` — a única forma de ter DUAS linhas de cabeçalho
        // físicas com este formato de tabela.
        const metaLine = `# seed=${seed}; algorithm=sha256-rank-v1; perAccount=${perAccount}`;
        const columnHeaders = [
          'accountCode', 'accountNature', 'entryId', 'entryNumber', 'date',
          'description', 'sourceType', 'sourceId', 'debitCents', 'creditCents',
        ];
        const dataRows: OutTable['rows'] = sampled.map((leg) => [
          leg.accountCode, natureByCode.get(leg.accountCode) ?? '?', leg.entryId, leg.entryNumber ?? '',
          leg.date.toISOString().slice(0, 10), leg.description, leg.sourceType, leg.sourceId ?? '',
          leg.debitCents, leg.creditCents,
        ]);
        const table: OutTable = { headers: [metaLine], rows: [columnHeaders, ...dataRows] };
        return { table, period };
      }
      default:
        // Exhaustiveness guard — the DTO enum should prevent reaching here.
        // EXPORT_IMPORT_ERRORS (CSV) is a declared-but-deferred kind: the error rows are
        // already served as JSON by GET /jobs/{id}/rows?status=INVALID.
        throw new NotFoundError(`Tipo de exportação não suportado: ${dto.kind}`);
    }
  }

  /** Renders + persists an export artifact and records the job + audit. Returns the job summary. */
  public async export(scope: AccountingScope, dto: ExportRequestDto): Promise<DataExchangeJobResponse> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Não autorizado a exportar dados contábeis.');
    }

    const { table, period } = await this.buildTable(scope, dto);
    const buffer = await serializeTable(table, dto.format);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const fileName = `${dto.kind.toLowerCase()}.${dto.format}`;
    const mimeType = dto.format === 'csv' ? 'text/csv' : XLSX_MIME;

    const job = await this.repo.createJob({
      userId: scope.ownerUserId,
      unitId: scope.unitId,
      direction: 'EXPORT',
      kind: dto.kind,
      status: 'PROCESSING', // A1: só vira EXPORTED depois que o arquivo existe (abaixo).
      requestedById: scope.actorUserId,
      // C6b PR-1 (F-C6b-3/6/7 a): período coberto pelo artefato — as colunas já existiam
      // (job SPED as preenche desde BE-INCR-CONTADOR-DELIVERY); os exports de relatório
      // passam a preenchê-las também, para o pacote do contador (C6b PR-3) validar período.
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      originalName: fileName,
      mimeType,
      sizeBytes: buffer.length,
      sha256,
      totalRows: table.rows.length,
    });

    // BRIEF-W2-D (F4, layer 1): spans job PROCESSING -> the return below, or the throw in the
    // catch FAILED right after. No warnThresholdMs — see SpedGenerationService.generate() for why.
    const endTimer = metrics.startTimer('data_exchange_export');

    let storageKey: string;
    try {
      ({ storageKey } = await storage.saveFile(
        scope.ownerUserId, scope.unitId, job.id, fileName, buffer,
      ));
    } catch (error) {
      // A1: a falha de escrita não pode deixar a linha afirmando sucesso.
      await this.repo.updateJob(scope, job.id, { status: 'FAILED' });
      // Fire-and-forget — never awaited, never throws (see alertWebhook.ts). No-op when
      // ALERT_WEBHOOK_URL is unset.
      sendAlertWebhook({
        source: 'data_exchange_export',
        event: 'generation_failed',
        timestamp: new Date().toISOString(),
        jobId: job.id,
        kind: job.kind,
        unitId: scope.unitId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      endTimer({ success: false, jobId: job.id, kind: job.kind, unitId: scope.unitId });
      throw error;
    }

    const updated = await this.repo.runTransaction(async (tx) => {
      const j = await this.repo.updateJob(scope, job.id, { storageKey, status: 'EXPORTED' }, tx);
      await this.audit.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'data_exchange.export_generated',
        targetType: 'data_exchange_job',
        targetId: job.id,
        payload: {
          jobId: job.id,
          kind: dto.kind,
          direction: 'EXPORT',
          sha256,
          totalRows: String(table.rows.length),
          validRows: String(table.rows.length),
          invalidRows: '0',
        },
      });
      return j;
    });

    endTimer({ success: true, jobId: job.id, kind: job.kind, unitId: scope.unitId });
    return toJobResponse(updated);
  }

  /** Fetches a single job summary (scoped). */
  public async getJob(scope: AccountingScope, id: string): Promise<DataExchangeJobResponse> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Não autorizado a consultar jobs de dados contábeis.');
    }
    const job = await this.repo.findJobById(scope, id);
    if (!job) throw new NotFoundError('Job não encontrado.');
    return toJobResponse(job);
  }

  /**
   * BE-INCR-FIXED-ASSETS PR-4 (item 23, F-FA15 a). `GET /data-exchange/jobs` — lista paginada,
   * escopada, com `supersedesJobId`/`supersededByJobId` (item 21). A regra "quem cria" (F-FA15
   * fork, ratificado 2026-09-18): quem mergear primeiro cria a rota; o segundo estende. Nasce
   * aqui porque `origin/main` não a tinha (achado A2 do execution-plan).
   */
  public async listJobs(
    scope: AccountingScope,
    filter: { direction?: string; kind?: string; status?: string; year?: number; page: number; limit: number },
  ): Promise<{ items: DataExchangeJobListItem[]; total: number; page: number; limit: number }> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Não autorizado a consultar jobs de dados contábeis.');
    }
    const { items, total } = await this.repo.listJobs(scope, filter);
    const listItems: DataExchangeJobListItem[] = [];
    for (const job of items) {
      const successor = await this.repo.findJobBySupersedesJobId(scope, job.id);
      listItems.push(toJobListItem(job, successor?.id ?? null));
    }
    return { items: listItems, total, page: filter.page, limit: filter.limit };
  }

  /**
   * Resolves metadata + absolute path for streaming an export artifact. Download audit is
   * feature-flagged (AUDIT_DATA_EXCHANGE_DOWNLOADS=true) like attachment downloads.
   */
  public async getArtifactForDownload(scope: AccountingScope, id: string): Promise<ArtifactDownloadTarget> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Não autorizado a baixar artefatos contábeis.');
    }
    const job = await this.repo.findJobById(scope, id);
    if (!job || !job.storageKey) throw new NotFoundError('Artefato não encontrado.');

    if (process.env.AUDIT_DATA_EXCHANGE_DOWNLOADS === 'true') {
      await this.repo.runTransaction(async (tx) => {
        await this.audit.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: 'data_exchange.artifact_downloaded',
          targetType: 'data_exchange_job',
          targetId: job.id,
          payload: { jobId: job.id, kind: job.kind, direction: job.direction, sha256: job.sha256 ?? '' },
        });
      });
    }

    return {
      job,
      absPath: storage.resolveReadPath(job.storageKey),
      fileName: job.originalName ?? `${job.kind.toLowerCase()}`,
      mimeType: job.mimeType ?? 'application/octet-stream',
    };
  }

  /**
   * BE-INCR-FIXED-ASSETS PR-4 (item 22). Dispensa a exigência de ECF retificadora que uma ECD
   * substituta gravou no PRÓPRIO job (`ecfRectificationRequired`). Idempotente: uma 2ª chamada
   * sobre um job já dispensado devolve o mesmo job sem reemitir o evento (nunca duas dispensas
   * na trilha para a mesma decisão).
   */
  public async waiveEcfRectification(
    scope: AccountingScope,
    jobId: string,
    justification: string,
  ): Promise<DataExchangeJobResponse> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Não autorizado a dispensar retificação de ECF.');
    }
    const job = await this.repo.findJobById(scope, jobId);
    if (!job) throw new NotFoundError(`Job '${jobId}' não encontrado.`);
    if (!job.ecfRectificationRequired) {
      throw new ValidationError(
        `O job '${jobId}' não exige retificação de ECF — nada a dispensar.`,
      );
    }
    if (job.ecfRectificationWaivedAt) {
      return toJobResponse(job); // idempotente: já dispensado.
    }

    const year = job.periodStart ? job.periodStart.getUTCFullYear() : undefined;
    const updated = await this.repo.runTransaction(async (tx) => {
      const j = await this.repo.updateJob(
        scope,
        jobId,
        { ecfRectificationWaivedAt: new Date(), ecfRectificationWaiverReason: justification },
        tx,
      );
      await this.audit.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'sped.ecf_rectification_waived',
        targetType: 'data_exchange_job',
        targetId: jobId,
        // `justification` NUNCA entra no payload (texto livre do operador) — só jobId/year (item 22).
        payload: { jobId, year: year !== undefined ? String(year) : '' },
      });
      return j;
    });
    return toJobResponse(updated);
  }
}
