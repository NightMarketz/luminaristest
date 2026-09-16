import { createHash } from 'node:crypto';
import type { AccountingDataExchangeJob } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import * as storage from '../../../lib/attachmentStorage';
import { sendAlertWebhook } from '../../../lib/alertWebhook';
import { metrics } from '../../../lib/monitoring';
import { serializeTable, type OutTable } from '../../../lib/spreadsheet';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IDataExchangeRepository } from '../repositories/IDataExchangeRepository';
import type { AuditService } from './AuditService';
import type { ExportRequestDto } from '../dtos/DataExchangeDto';
import type { ImportKind } from '../models/DataExchange.model';
import { toJobResponse, type DataExchangeJobResponse } from './dataExchangeMappers';
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
  ) {}

  /**
   * Builds the tabular payload for a given export kind, PLUS the period the artifact covers
   * (C6b PR-1 Passo 6, F-C6b-3/6/7 a) — the caller records it on the job so the contador
   * package (C6b PR-3) can validate that an extra's period is contained in the delivery's.
   * "Regra de período por kind" (plano, Passo 6): BP/DRE/balancete = `[Jan-1 do ano(asOf), asOf]`;
   * razão = a janela do DTO; template = null. Entrada ausente (sem asOf / sem janela) ⇒ null/null
   * — nunca inventa um período que ninguém pediu.
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
}
