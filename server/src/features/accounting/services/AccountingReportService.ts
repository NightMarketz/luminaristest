import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import { metrics } from '../../../lib/monitoring';
import { REPORT_WARN_THRESHOLDS_MS } from '../../../lib/reportThresholds';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AccountingScope } from '../scope/AccountingScope';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { centsFromDb } from '../models/money';
import { CLOSING_SOURCE_TYPE } from '../models/closing';
import { scopeToday } from '../models/dates';
import {
  STATEMENT_MAPPING_VERSION,
  findMappingRule,
  applySign,
} from './StatementMappingFixture';

// ─── Trial balance ────────────────────────────────────────────────────────────

/** One trial-balance row, all money in INTEGER CENTS. */
export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  nature: string;
  debitCents: number;
  creditCents: number;
  balanceCents: number;
}

/** Trial-balance report shape: rows + grand total + an audit flag. */
export interface TrialBalanceReport {
  unitId: string;
  rows: TrialBalanceRow[];
  totals: { debitCents: number; creditCents: number; balanceCents: number };
  /** Audit flag: Σdebit === Σcredit across all rows (exact integer equality). */
  balanced: boolean;
}

// ─── Account ledger ───────────────────────────────────────────────────────────

/** One ledger row for a single account, with running balance (INTEGER CENTS). */
export interface AccountLedgerRow {
  postingId: string;
  entryId: string;
  date: Date;
  description: string;
  status: string;
  debitCents: number;
  creditCents: number;
  runningBalanceCents: number;
}

/** Account-ledger report shape. */
export interface AccountLedgerReport {
  unitId: string;
  account: { accountId: string; code: string; name: string; nature: string };
  rows: AccountLedgerRow[];
  closingBalanceCents: number;
}

/**
 * One row of the "razão geral" (all accounts with movement in a window, C6b PR-1 Passo 7,
 * F-C6b-7 a). One `OPENING_BALANCE` row per account (saldo antes de `window.from`), followed
 * by its legs in the window with a running balance. Accounts with zero legs in the window are
 * absent entirely (never a bare opening row with nothing after it).
 */
export interface GeneralLedgerRow {
  accountCode: string;
  accountName: string;
  date: Date;
  entryId: string;
  entryNumber: number | null;
  description: string;
  /** 'OPENING_BALANCE' for the synthetic opening row, else the JournalEntry status. */
  status: string;
  debitCents: number;
  creditCents: number;
  runningBalanceCents: number;
}

// ─── BP / DRE shared types ────────────────────────────────────────────────────

interface BpDreLine {
  accountId: string;
  code: string;
  name: string;
  /** Signed cents, serialised as string (ADR-INCR4 §"Tudo em centavos"). */
  amountCents: string;
}

interface StatementSection {
  accounts: BpDreLine[];
  totalCents: string;
}

interface DiagnosticsShape {
  mappingVersion: string;
  unmappedAccounts: Array<{
    accountId: string;
    code: string;
    name: string;
    nature: string;
    balanceCents: number;
  }>;
  removedAccountsReferenced: Array<{ accountId: string; balanceCents: number }>;
  hasUnclosedPriorYearResult: boolean;
  priorYearResultCents: number;
  warnings: string[];
}

// ─── Balance sheet ────────────────────────────────────────────────────────────

export interface BalanceSheetReport {
  unitId: string;
  periodSemantics: 'as_of';
  asOf: string;
  mappingVersion: string;
  assets: StatementSection;
  liabilities: StatementSection;
  equity: StatementSection;
  /** Net income injected into PL; computed from DRE with the same window as toDate. */
  netResultLine: {
    amountCents: string;
    isComputed: true;
    computation: 'income_statement_net_result';
    fromDate: string;
    toDate: string;
  };
  /** assets.totalCents === liabilities.totalCents + equity.totalCents + netResultCents (exact int). */
  balanced: boolean;
  reportStatus: 'OK' | 'WARNING' | 'INVALID';
  diagnostics: DiagnosticsShape;
}

// ─── Income statement ─────────────────────────────────────────────────────────

export interface IncomeStatementReport {
  unitId: string;
  periodSemantics: 'year_to_date';
  fromDate: string;
  toDate: string;
  mappingVersion: string;
  grossRevenue: StatementSection;
  revenueDeductions: StatementSection;
  /** Custo das Mercadorias Vendidas (4.2, INCR-INVENTORY Body 2) — segregated from `expenses`
   *  so the DRE reports gross profit; negative (a cost). Rows route here via the dre.cogs rule. */
  costOfGoodsSold: StatementSection;
  expenses: StatementSection;
  netResult: {
    amountCents: string;
    isComputed: true;
    computation: 'income_statement_net_result';
  };
  reportStatus: 'OK' | 'WARNING' | 'INVALID';
  diagnostics: DiagnosticsShape;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * AccountingReportService — read-only ledger reporting, FIRST-CLASS PRISMA.
 *
 * CRITICAL (Contract §2.1): aggregates include 'Posted', 'Reconciled' AND 'Reversed'
 * parent statuses (exclude only 'Draft'), so a reversed entry + its reversal net to
 * zero — summing only 'Posted' would count just the reversal and break the ledger.
 * 'Reconciled' (ADR-INCR7 D5, emenda INCR4-A) is economically identical to 'Posted' —
 * a reversible bank-reconciliation marker, NOT a money change; omitting it would make
 * a reconciled entry vanish from BP/DRE/razão/balancete.
 */
/** X4-14: agregados K155/K355 de uma conta numa janela (valores ABSOLUTOS — o VL_CTA do e-Lalur é >= 0). */
export interface AccountAggregates {
  sumDebitCents: number;
  sumCreditCents: number;
  saldoPeriodoCents: number;
  saldoFinalCents: number;
}

export class AccountingReportService {
  constructor(
    private readonly accountRepo: IAccountRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly journalEntryRepo: IJournalEntryRepository,
    private readonly policy: IAccountingPolicy,
  ) {}

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Core balance aggregation. When `from`/`to` are omitted the query is identical to
   * the pre-INCR-4 groupByAccount call, preserving trialBalance byte-identical output.
   */
  private async getAccountBalances(
    scope: AccountingScope,
    from?: Date,
    to?: Date,
    excludeSourceTypes?: string[],
  ): Promise<TrialBalanceRow[]> {
    const hasExclusion = !!excludeSourceTypes && excludeSourceTypes.length > 0;
    const totals = await this.postingRepo.groupByAccount(
      scope,
      LEDGER_STATUSES,
      from || to || hasExclusion ? { from, to, excludeSourceTypes } : undefined,
    );
    const accounts = await this.accountRepo.findManyByUnit(scope);
    const accountById = new Map(accounts.map((a) => [a.id, a]));

    return totals
      .map((t) => {
        const account = accountById.get(t.accountId);
        return {
          accountId: t.accountId,
          code: account?.code ?? '?',
          name: account?.name ?? '(conta removida)',
          nature: account?.nature ?? '?',
          debitCents: t.debitCents,
          creditCents: t.creditCents,
          balanceCents: t.debitCents - t.creditCents,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  /**
   * Saldo (débito - crédito) de TODAS as contas do escopo com movimento ANTES de `before`
   * (exclusive) — usado como abertura de janela pelo razão (accountLedger/generalLedger, C6b
   * PR-1 Passo 7, F-C6b-7 a). `before.getTime() - 1` é o fim do dia ANTERIOR (mesma convenção
   * de `to` inclusivo de `groupByAccount`), então um lançamento exatamente EM `before` não entra
   * na abertura — ele é o primeiro leg DENTRO da janela.
   */
  private async openingBalances(scope: AccountingScope, before: Date): Promise<Map<string, number>> {
    const to = new Date(before.getTime() - 1);
    const totals = await this.postingRepo.groupByAccount(scope, LEDGER_STATUSES, { to });
    return new Map(totals.map((t) => [t.accountId, t.debitCents - t.creditCents]));
  }

  /**
   * Computes the DRE net result (grossRevenue - deductions - expenses) from a set of
   * already-fetched balance rows. Used internally by both balanceSheet and
   * incomeStatement to guarantee they share the same window.
   */
  private computeDreNet(rows: TrialBalanceRow[]): {
    grossRevenueCents: number;
    deductionsCents: number;
    cogsCents: number;
    expensesCents: number;
    netCents: number;
  } {
    let grossRevenueCents = 0;
    let deductionsCents = 0;
    let cogsCents = 0;
    let expensesCents = 0;

    for (const row of rows) {
      const rule = findMappingRule(row.nature, row.code, 'DRE');
      if (!rule) continue;
      const signed = applySign(row.balanceCents, rule.sign);
      if (rule.section === 'grossRevenue') grossRevenueCents += signed;
      else if (rule.section === 'revenueDeductions') deductionsCents += signed;
      else if (rule.section === 'costOfGoodsSold') cogsCents += signed;
      else if (rule.section === 'expenses') expensesCents += signed;
    }

    return {
      grossRevenueCents,
      deductionsCents,
      cogsCents,
      expensesCents,
      netCents: grossRevenueCents + deductionsCents + cogsCents + expensesCents,
    };
  }

  /** Builds a StatementSection from rows that matched a given section name. */
  private buildSection(
    rows: TrialBalanceRow[],
    statement: 'BP' | 'DRE',
    sectionName: string,
  ): StatementSection {
    let total = 0;
    const accounts: BpDreLine[] = [];
    for (const row of rows) {
      const rule = findMappingRule(row.nature, row.code, statement);
      if (!rule || rule.section !== sectionName) continue;
      const signed = applySign(row.balanceCents, rule.sign);
      total += signed;
      accounts.push({
        accountId: row.accountId,
        code: row.code,
        name: row.name,
        amountCents: String(signed),
      });
    }
    return { accounts, totalCents: String(total) };
  }

  /** Builds diagnostics for a set of rows classified under `statement`. */
  private buildDiagnostics(
    rows: TrialBalanceRow[],
    statement: 'BP' | 'DRE',
    priorYearResultCents: number,
  ): { diagnostics: DiagnosticsShape; reportStatus: 'OK' | 'WARNING' | 'INVALID' } {
    const unmappedAccounts: DiagnosticsShape['unmappedAccounts'] = [];
    const removedAccountsReferenced: DiagnosticsShape['removedAccountsReferenced'] = [];

    for (const row of rows) {
      if (row.nature === '?') {
        if (row.balanceCents !== 0) {
          removedAccountsReferenced.push({ accountId: row.accountId, balanceCents: row.balanceCents });
        }
        continue;
      }
      const rule = findMappingRule(row.nature, row.code, statement);
      if (!rule && row.balanceCents !== 0) {
        // For BP diagnostics: Revenue/Expense accounts are DRE accounts represented via
        // netResultLine — they are not "unmapped", they just live on the other statement.
        if (statement === 'BP' && findMappingRule(row.nature, row.code, 'DRE')) continue;
        // For DRE diagnostics: Asset/Liability/Equity accounts are BP accounts representing
        // patrimonial position — they are not "unmapped", they just live on the other statement.
        if (statement === 'DRE' && findMappingRule(row.nature, row.code, 'BP')) continue;
        unmappedAccounts.push({
          accountId: row.accountId,
          code: row.code,
          name: row.name,
          nature: row.nature,
          balanceCents: row.balanceCents,
        });
      }
    }

    const hasUnclosedPriorYearResult = priorYearResultCents !== 0;
    const warnings: string[] = [];
    if (hasUnclosedPriorYearResult) {
      warnings.push(
        `Resultado do exercício anterior não encerrado: ${priorYearResultCents} centavos.`,
      );
    }
    if (removedAccountsReferenced.length > 0) {
      warnings.push(
        `${removedAccountsReferenced.length} conta(s) removida(s) com saldo não-zero referenciada(s).`,
      );
    }

    let reportStatus: 'OK' | 'WARNING' | 'INVALID' = 'OK';
    if (unmappedAccounts.length > 0) reportStatus = 'INVALID';
    else if (warnings.length > 0) reportStatus = 'WARNING';

    return {
      diagnostics: {
        mappingVersion: STATEMENT_MAPPING_VERSION,
        unmappedAccounts,
        removedAccountsReferenced,
        hasUnclosedPriorYearResult,
        priorYearResultCents,
        warnings,
      },
      reportStatus,
    };
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Trial balance for a scope unit: per-account debit/credit totals (cents) joined to
   * the chart, plus a grand total and a `balanced` audit flag (Σdebit === Σcredit exact).
   */
  /**
   * X4-14 (BRIEF 3C item 14, follow-up ratificado 2026-09-13): os 4 agregados que o K155/K355 da ECD
   * expõe por conta numa janela — Σ débitos, Σ créditos, saldo do período e saldo FINAL (acumulado
   * até `to`) — a régua da `REGRA_REGISTRO_M312_OBRIGATORIO` (Manual ECF L12 p.253). Qual dos 4 vale
   * depende do COD_NAT da conta e é decisão do CHAMADOR (`LalurService.partialAdjustmentWarnings`):
   * patrimonial compara com os 4 (K155), resultado só com o saldo final (K355). Devolve TODAS as contas
   * do escopo com movimento (Map por accountId) — o groupBy já agrega o escopo inteiro, então 1 chamada
   * por janela custa o mesmo que 1 por conta (review #329 S2). Mesmos statuses do balancete
   * (`LEDGER_STATUSES`); saldos em valor ABSOLUTO (o VL_CTA do e-Lalur é ≥ 0, p.244). Leitura pura.
   */
  async accountAggregates(scope: AccountingScope, from: Date, to: Date): Promise<Map<string, AccountAggregates>> {
    // Review #329 S2: 2 groupBy por JANELA (máx. 8 por ano), nunca por ajuste — o groupBy já agrega o escopo inteiro.
    const [period, cumulative] = await Promise.all([
      this.postingRepo.groupByAccount(scope, LEDGER_STATUSES, { from, to }),
      this.postingRepo.groupByAccount(scope, LEDGER_STATUSES, { to }),
    ]);
    const out = new Map<string, AccountAggregates>();
    for (const t of period) {
      out.set(t.accountId, { sumDebitCents: t.debitCents, sumCreditCents: t.creditCents, saldoPeriodoCents: Math.abs(t.debitCents - t.creditCents), saldoFinalCents: 0 });
    }
    for (const c of cumulative) {
      const row = out.get(c.accountId) ?? { sumDebitCents: 0, sumCreditCents: 0, saldoPeriodoCents: 0, saldoFinalCents: 0 };
      row.saldoFinalCents = Math.abs(c.debitCents - c.creditCents);
      out.set(c.accountId, row);
    }
    return out;
  }

  /**
   * `asOf` OPCIONAL (C6b PR-1 Passo 6, F-C6b-6 a): omitido ⇒ balancete acumulado (comportamento
   * histórico, idêntico a antes desta mudança). Informado ⇒ delega em `balancesAsOf` — fecha o
   * `asOf` que `EXPORT_TRIAL_BALANCE` já aceitava no DTO mas IGNORAVA silenciosamente
   * (`param-aceito-e-ignorado-e-bug`): antes desta mudança um balancete pedido com `asOf=2026-06-30`
   * devolvia o acumulado até HOJE, não até `asOf`.
   */
  async trialBalance(scope: AccountingScope, asOf?: Date): Promise<TrialBalanceReport> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler o balancete.');
    }

    // BRIEF-W2-D (F4, layer 3): starts AFTER the policy gate — measures the report's own read
    // cost, not an authorization decision (a 403 would otherwise log a near-zero-duration
    // "failure" on every denied request, which is noise, not a slow-report signal). Mirrors the
    // canonical try/catch pattern already in DocumentProcessingService (extends
    // Metrics.startTimer, not a new helper).
    const endTimer = metrics.startTimer('report_trialBalance');
    try {
      const rows = asOf ? await this.balancesAsOf(scope, asOf) : await this.getAccountBalances(scope);

      const grandDebit = rows.reduce((acc, r) => acc + r.debitCents, 0);
      const grandCredit = rows.reduce((acc, r) => acc + r.creditCents, 0);

      const report: TrialBalanceReport = {
        unitId: scope.unitId,
        rows,
        totals: {
          debitCents: grandDebit,
          creditCents: grandCredit,
          balanceCents: grandDebit - grandCredit,
        },
        // EXACT integer equality (Contract §2.1) — never float/epsilon.
        balanced: grandDebit === grandCredit,
      };
      endTimer({ success: true, warnThresholdMs: REPORT_WARN_THRESHOLDS_MS.trialBalance, unitId: scope.unitId });
      return report;
    } catch (error) {
      endTimer({ success: false, warnThresholdMs: REPORT_WARN_THRESHOLDS_MS.trialBalance, unitId: scope.unitId });
      throw error;
    }
  }

  /**
   * Per-account balances as-of a date (INTEGER CENTS): the whole history of postings up
   * to `asOf` inclusive, identical window to `balanceSheet`'s patrimonial snapshot. Thin
   * policy-gated wrapper over the shared aggregation so composed read-only reports (e.g.
   * the comparative trial balance / PeriodComparisonReportService) reuse the exact same
   * balance math instead of re-deriving it. Rows are sorted by account `code`.
   */
  async balancesAsOf(scope: AccountingScope, asOf: Date): Promise<TrialBalanceRow[]> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler o balancete.');
    }
    return this.getAccountBalances(scope, undefined, asOf);
  }

  /**
   * Ledger of a single account (by code) for the scope: each leg with a running balance.
   * Includes Posted + Reversed legs (excludes only Draft) so reversals net to zero.
   *
   * `window` OPCIONAL (C6b PR-1 Passo 6/7, F-C6b-7 a): omitido ⇒ comportamento histórico
   * (toda a história da conta, sem linha de abertura — idêntico a antes desta mudança).
   * Informado ⇒ as legs são filtradas a `[window.from, window.to]` (ambos inclusive) e uma
   * linha sintética `OPENING_BALANCE` (saldo antes de `window.from`) abre o relatório, para
   * que `runningBalanceCents` comece do saldo real da conta, não de zero.
   */
  async accountLedger(
    scope: AccountingScope,
    accountCode: string,
    window?: { from: Date; to: Date },
  ): Promise<AccountLedgerReport> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler o razão.');
    }

    // BRIEF-W2-D (F4, layer 3) — see trialBalance() for why this starts after the policy gate.
    const endTimer = metrics.startTimer('report_accountLedger');
    try {
      const account = await this.accountRepo.findByCode(scope, accountCode);
      if (!account) {
        throw new NotFoundError(`Conta '${accountCode}' não foi encontrada.`);
      }

      const opening = window ? ((await this.openingBalances(scope, window.from)).get(account.id) ?? 0) : 0;

      // This account's raw legs (tenant+unit scoped), then hydrate each parent entry for
      // date/description/status and drop Draft entries (keep Posted + Reversed so reversals net).
      const postings = await this.postingRepo.findByAccount(scope, account.id);
      const entryCache = new Map<string, { date: Date; description: string; status: string }>();

      const hydrated: Array<{
        postingId: string;
        entryId: string;
        date: Date;
        description: string;
        status: string;
        debitCents: number;
        creditCents: number;
      }> = [];
      for (const p of postings) {
        let entry = entryCache.get(p.entryId);
        if (!entry) {
          const head = await this.journalEntryRepo.findById(scope, p.entryId);
          if (!head || !LEDGER_STATUSES.includes(head.status)) continue;
          entry = { date: head.date, description: head.description, status: head.status };
          entryCache.set(p.entryId, entry);
        }
        // Janela opcional (C6b PR-1): fora de [from, to] a leg não pertence a este relatório —
        // ela já está representada pelo saldo de abertura (se anterior) ou fica de fora (se posterior).
        if (window && (entry.date < window.from || entry.date > window.to)) continue;
        hydrated.push({
          postingId: p.id,
          entryId: p.entryId,
          date: entry.date,
          description: entry.description,
          status: entry.status,
          debitCents: centsFromDb(p.debitCents),
          creditCents: centsFromDb(p.creditCents),
        });
      }

      hydrated.sort((a, b) => a.date.getTime() - b.date.getTime());

      let running = opening;
      const rows: AccountLedgerRow[] = [];
      if (window) {
        rows.push({
          postingId: 'OPENING_BALANCE',
          entryId: '',
          date: window.from,
          description: 'Saldo de abertura',
          status: 'OPENING_BALANCE',
          debitCents: 0,
          creditCents: 0,
          runningBalanceCents: opening,
        });
      }
      for (const leg of hydrated) {
        running += leg.debitCents - leg.creditCents;
        rows.push({ ...leg, runningBalanceCents: running });
      }

      const report: AccountLedgerReport = {
        unitId: scope.unitId,
        account: {
          accountId: account.id,
          code: account.code,
          name: account.name,
          nature: account.nature,
        },
        rows,
        closingBalanceCents: running,
      };
      endTimer({ success: true, warnThresholdMs: REPORT_WARN_THRESHOLDS_MS.accountLedger, unitId: scope.unitId, accountCode });
      return report;
    } catch (error) {
      endTimer({ success: false, warnThresholdMs: REPORT_WARN_THRESHOLDS_MS.accountLedger, unitId: scope.unitId, accountCode });
      throw error;
    }
  }

  /**
   * "Razão geral" — todas as contas com movimento numa janela (C6b PR-1 Passo 7, F-C6b-7 a):
   * o que um contador chama de razão quando não pede 1 conta específica. Fonte: o MESMO read
   * que a ECD usa para o Diário (`findManyForExport`, A6 do plano) + `openingBalances` para a
   * linha de abertura por conta. Conta sem NENHUMA leg na janela não aparece — a lista é
   * "contas com movimento", não "todas as contas do plano".
   */
  async generalLedger(scope: AccountingScope, window: { from: Date; to: Date }): Promise<GeneralLedgerRow[]> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler o razão.');
    }

    const endTimer = metrics.startTimer('report_generalLedger');
    try {
      const [openingByAccount, entries, accounts] = await Promise.all([
        this.openingBalances(scope, window.from),
        this.journalEntryRepo.findManyForExport(scope, LEDGER_STATUSES, window),
        this.accountRepo.findManyByUnit(scope),
      ]);
      const accountById = new Map(accounts.map((a) => [a.id, a]));

      // Agrupa as legs por conta, preservando a ordem cronológica de `entries` (o repositório
      // já devolve (date, entryNumber) ASC — não há por que reordenar aqui).
      const legsByAccount = new Map<string, Array<{ entry: (typeof entries)[number]; leg: (typeof entries)[number]['postings'][number] }>>();
      for (const entry of entries) {
        for (const leg of entry.postings) {
          const bucket = legsByAccount.get(leg.accountId);
          if (bucket) bucket.push({ entry, leg });
          else legsByAccount.set(leg.accountId, [{ entry, leg }]);
        }
      }

      const accountIds = [...legsByAccount.keys()].sort((a, b) => {
        const codeA = accountById.get(a)?.code ?? '';
        const codeB = accountById.get(b)?.code ?? '';
        return codeA.localeCompare(codeB);
      });

      const rows: GeneralLedgerRow[] = [];
      for (const accountId of accountIds) {
        const account = accountById.get(accountId);
        const accountCode = account?.code ?? '?';
        const accountName = account?.name ?? '(conta removida)';
        let running = openingByAccount.get(accountId) ?? 0;
        rows.push({
          accountCode,
          accountName,
          date: window.from,
          entryId: '',
          entryNumber: null,
          description: 'Saldo de abertura',
          status: 'OPENING_BALANCE',
          debitCents: 0,
          creditCents: 0,
          runningBalanceCents: running,
        });
        for (const { entry, leg } of legsByAccount.get(accountId) ?? []) {
          const debitCents = centsFromDb(leg.debitCents);
          const creditCents = centsFromDb(leg.creditCents);
          running += debitCents - creditCents;
          rows.push({
            accountCode,
            accountName,
            date: entry.date,
            entryId: entry.id,
            entryNumber: entry.entryNumber,
            description: entry.description,
            status: entry.status,
            debitCents,
            creditCents,
            runningBalanceCents: running,
          });
        }
      }

      endTimer({ success: true, warnThresholdMs: REPORT_WARN_THRESHOLDS_MS.accountLedger, unitId: scope.unitId });
      return rows;
    } catch (error) {
      endTimer({ success: false, warnThresholdMs: REPORT_WARN_THRESHOLDS_MS.accountLedger, unitId: scope.unitId });
      throw error;
    }
  }

  /**
   * Balanço Patrimonial — snapshot posição `as_of` (toda a história de postagens até
   * `asOf` inclusive). `netResultLine` = resultado AINDA-NÃO-encerrado: janela DRE YTD
   * closing-INCLUSIVE (BE-INCR-SPED-APURACAO D3), então após o encerramento ela auto-zera
   * (o resultado migra para o PL via a conta postada) e `balanced = A === L + PL + 0`
   * continua exato. Difere de `incomeStatement.netResult` (operacional, closing-EXCLUSIVE)
   * a partir do encerramento — divergência contábil correta: o BP mostra o resultado dentro
   * do PL, a DRE reporta a performance do ano.
   */
  /**
   * `asOf` OPCIONAL: omitido ⇒ hoje no fuso do ESCOPO via `scopeToday` (fim do dia, para incluir o
   * dia inteiro — mesma semântica do caminho explícito). Nunca derivar o dia com `toISOString()`: em
   * UTC-3 o dia UTC já virou das 21h às 00h e o relatório afirmaria a posição de amanhã — em 31/12 a
   * janela year-to-date pularia para o ano seguinte, devolvendo relatório VAZIO. O default mora AQUI,
   * no Service, e não no DTO (que congelaria o dia no parse) — F1(a), GAP-MAP nº 5.
   */
  async balanceSheet(scope: AccountingScope, asOfInput?: Date): Promise<BalanceSheetReport> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler o balanço patrimonial.');
    }

    const asOf = asOfInput ?? new Date(scopeToday(scope) + 'T23:59:59.999Z');

    // BRIEF-W2-D (F4, layer 3) — see trialBalance() for why this starts after the policy gate.
    const endTimer = metrics.startTimer('report_balanceSheet');
    try {
      const asOfIso = asOf.toISOString().slice(0, 10);
      const dreFromDate = new Date(Date.UTC(asOf.getUTCFullYear(), 0, 1)); // 1 Jan UTC
      const dreFromIso = dreFromDate.toISOString().slice(0, 10);

      // BP = toda a história até asOf; DRE = year_to_date com mesma janela
      const [allRows, dreRows, priorRows] = await Promise.all([
        this.getAccountBalances(scope, undefined, asOf),
        this.getAccountBalances(scope, dreFromDate, asOf),
        this.getAccountBalances(
          scope,
          undefined,
          new Date(Date.UTC(asOf.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999)),
        ),
      ]);

      const assets = this.buildSection(allRows, 'BP', 'assets');
      const liabilities = this.buildSection(allRows, 'BP', 'liabilities');
      const equity = this.buildSection(allRows, 'BP', 'equity');

      const { netCents: dreNetCents } = this.computeDreNet(dreRows);
      const { netCents: priorNetCents } = this.computeDreNet(priorRows);

      const assetsCents = parseInt(assets.totalCents, 10);
      const liabilitiesCents = parseInt(liabilities.totalCents, 10);
      const equityCents = parseInt(equity.totalCents, 10);
      // balanced: A = P + PL + Resultado do Exercício (inteiro exato)
      const balanced = assetsCents === liabilitiesCents + equityCents + dreNetCents;

      const { diagnostics, reportStatus } = this.buildDiagnostics(allRows, 'BP', priorNetCents);

      const report: BalanceSheetReport = {
        unitId: scope.unitId,
        periodSemantics: 'as_of',
        asOf: asOfIso,
        mappingVersion: STATEMENT_MAPPING_VERSION,
        assets,
        liabilities,
        equity,
        netResultLine: {
          amountCents: String(dreNetCents),
          isComputed: true,
          computation: 'income_statement_net_result',
          fromDate: dreFromIso,
          toDate: asOfIso,
        },
        balanced,
        reportStatus,
        diagnostics,
      };
      endTimer({ success: true, warnThresholdMs: REPORT_WARN_THRESHOLDS_MS.balanceSheet, unitId: scope.unitId });
      return report;
    } catch (error) {
      endTimer({ success: false, warnThresholdMs: REPORT_WARN_THRESHOLDS_MS.balanceSheet, unitId: scope.unitId });
      throw error;
    }
  }

  /**
   * Demonstração do Resultado do Exercício — year_to_date: de 1 Jan do ano de `asOf`
   * até `asOf` inclusive. Não aceita `from`/`to` externos (ADR-INCR4 Q3).
   */
  /**
   * `asOf` OPCIONAL: omitido ⇒ hoje no fuso do ESCOPO via `scopeToday` (fim do dia, para incluir o
   * dia inteiro — mesma semântica do caminho explícito). Nunca derivar o dia com `toISOString()`: em
   * UTC-3 o dia UTC já virou das 21h às 00h e o relatório afirmaria a posição de amanhã — em 31/12 a
   * janela year-to-date pularia para o ano seguinte, devolvendo relatório VAZIO. O default mora AQUI,
   * no Service, e não no DTO (que congelaria o dia no parse) — F1(a), GAP-MAP nº 5.
   */
  async incomeStatement(scope: AccountingScope, asOfInput?: Date): Promise<IncomeStatementReport> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler a DRE.');
    }

    const asOf = asOfInput ?? new Date(scopeToday(scope) + 'T23:59:59.999Z');

    // BRIEF-W2-D (F4, layer 3) — see trialBalance() for why this starts after the policy gate.
    const endTimer = metrics.startTimer('report_incomeStatement');
    try {
      const asOfIso = asOf.toISOString().slice(0, 10);
      const dreFromDate = new Date(Date.UTC(asOf.getUTCFullYear(), 0, 1));
      const dreFromIso = dreFromDate.toISOString().slice(0, 10);

      // DRE = performance operacional do exercício ⇒ EXCLUI o lançamento de encerramento
      // (BE-INCR-SPED-APURACAO D3): sem isso, um encerramento em 31/12 zera cada conta de
      // resultado na janela e a DRE se auto-cancela. priorRows fica closing-INCLUSIVE de
      // propósito: um exercício anterior encerrado tem resultado 0 (não gera o warning de
      // "resultado anterior não encerrado").
      const [dreRows, priorRows] = await Promise.all([
        this.getAccountBalances(scope, dreFromDate, asOf, [CLOSING_SOURCE_TYPE]),
        this.getAccountBalances(
          scope,
          undefined,
          new Date(Date.UTC(asOf.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999)),
        ),
      ]);

      const grossRevenue = this.buildSection(dreRows, 'DRE', 'grossRevenue');
      const revenueDeductions = this.buildSection(dreRows, 'DRE', 'revenueDeductions');
      const costOfGoodsSold = this.buildSection(dreRows, 'DRE', 'costOfGoodsSold');
      const expenses = this.buildSection(dreRows, 'DRE', 'expenses');

      const { netCents: dreNetCents } = this.computeDreNet(dreRows);
      const { netCents: priorNetCents } = this.computeDreNet(priorRows);

      const { diagnostics, reportStatus } = this.buildDiagnostics(dreRows, 'DRE', priorNetCents);

      const report: IncomeStatementReport = {
        unitId: scope.unitId,
        periodSemantics: 'year_to_date',
        fromDate: dreFromIso,
        toDate: asOfIso,
        mappingVersion: STATEMENT_MAPPING_VERSION,
        grossRevenue,
        revenueDeductions,
        costOfGoodsSold,
        expenses,
        netResult: {
          amountCents: String(dreNetCents),
          isComputed: true,
          computation: 'income_statement_net_result',
        },
        reportStatus,
        diagnostics,
      };
      endTimer({ success: true, warnThresholdMs: REPORT_WARN_THRESHOLDS_MS.incomeStatement, unitId: scope.unitId });
      return report;
    } catch (error) {
      endTimer({ success: false, warnThresholdMs: REPORT_WARN_THRESHOLDS_MS.incomeStatement, unitId: scope.unitId });
      throw error;
    }
  }
}
