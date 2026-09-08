import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { IPayableRepository } from '../repositories/IPayableRepository';
import type { IReceivableRepository } from '../repositories/IReceivableRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AccountingScope } from '../scope/AccountingScope';
import { isValidDateOnly, scopeToday, toUtcDayNumber, dayNumberFromDateOnly, dateOnlyFromDayNumber } from '../models/dates';
import {
  loadOutstandingPayables,
  loadOutstandingReceivables,
  type OutstandingLine,
} from '../models/outstandingLines';
import type { AccountingReportService } from './AccountingReportService';
import { isCashAccount } from './CashFlowReportService';

// ─── Horizonte (F-CF1→a, FIXO — YAGNI, mesma filosofia de AGING_BUCKETS fixas F-AG2→a) ─────────

/**
 * Horizonte de projeção FIXO em dias, sem parâmetro (F-CF1→a, ratificado
 * `docs/accounting/CEDULA-DECISAO-2026-09-07-forks-sdd.md`). Evoluir para configurável (fork
 * F-CF1→b/c) é um redeploy pequeno (trocar esta constante) — não abrir a superfície de validação
 * sem demanda real.
 */
export const CASH_FORECAST_HORIZON_DAYS = 90;

// ─── Report shapes (money em INTEGER CENTS, serializado como string — convenção INCR-4) ────────

export type CashForecastDocumentKind = 'payable' | 'receivable';

/** Uma linha do drill por documento dentro de um dia da projeção (F-CF9→a, sempre expandido). */
export interface CashForecastDocumentLine {
  id: string;
  kind: CashForecastDocumentKind;
  documentNumber: string | null;
  /** date-only `YYYY-MM-DD` do vencimento. */
  dueDate: string;
  /** Outstanding da linha = `amountCents` (pagamento full-only, sem saldo parcial — achado 4 do BRIEF). */
  amountCents: string;
}

/** Uma linha diária da projeção (F-CF3→a: granularidade diária, `periodStart === periodEnd`). */
export interface CashForecastLine {
  /** date-only `YYYY-MM-DD` — o dia-calendário desta linha. */
  periodStart: string;
  periodEnd: string;
  /** Σ amountCents das Receivable outstanding com dueDate neste dia (sempre ≥ 0). */
  inflowCents: string;
  /** Σ amountCents das Payable outstanding com dueDate neste dia (sempre ≥ 0). */
  outflowCents: string;
  /** inflowCents − outflowCents (líquido do dia; pode ser negativo). */
  netCents: string;
  /** Saldo projetado acumulado ATÉ o fim deste dia (F-CF2→a: saldo inicial derivado do razão). */
  projectedBalanceCents: string;
  /** Títulos (AP/AR) que compõem o inflow/outflow deste dia (F-CF9→a, sempre expandido). */
  documents: CashForecastDocumentLine[];
}

/** Envelope do relatório de fluxo de caixa projetado (read-only, sem migração). */
export interface CashForecastReport {
  unitId: string;
  /** date-only `YYYY-MM-DD` — data-base da projeção (default hoje). */
  asOf: string;
  /** Saldo de caixa na `asOf`, derivado do razão (F-CF2→a: `AccountingReportService.balancesAsOf` + `isCashAccount`). */
  openingBalanceCents: string;
  /** Uma linha por dia-calendário, de `asOf` até `asOf + CASH_FORECAST_HORIZON_DAYS` (inclusive). */
  lines: CashForecastLine[];
  totalInflowCents: string;
  totalOutflowCents: string;
  /** totalInflowCents − totalOutflowCents (inteiro exato). */
  totalNetCents: string;
}

/** Acumulador mutável por dia-calendário (chave = dia UTC, ver `models/dates.ts`). */
interface DayAccumulator {
  inflowCents: number;
  outflowCents: number;
  documents: CashForecastDocumentLine[];
}

function toDocumentLine(line: OutstandingLine, kind: CashForecastDocumentKind): CashForecastDocumentLine {
  return {
    id: line.id,
    kind,
    documentNumber: line.documentNumber,
    dueDate: line.dueDate.toISOString().slice(0, 10),
    amountCents: String(line.amountCents),
  };
}

/**
 * CashForecastReportService — fluxo de caixa PROJETADO, read-only, FIRST-CLASS PRISMA, ZERO
 * migração (FE-INCR-CASH-FORECAST, `docs/accounting/FE-INCR-CASH-FORECAST-brief.md`). Responde
 * "vou ficar sem caixa?" agregando, dia a dia a partir de `asOf`, os vencimentos de AP/AR EM
 * ABERTO (`PAYABLE_OUTSTANDING_STATUSES`/`RECEIVABLE_OUTSTANDING_STATUSES` via o helper
 * compartilhado `models/outstandingLines.ts` — mesmo par de repositórios que `AgingReportService`,
 * Etapa 1 do critério de reuso: mesmo objeto de domínio).
 *
 * NÃO É O `CashFlowReportService` (DFC método indireto, histórico, `year_to_date`) — são dois
 * relatórios com semânticas de tempo opostas (achado 1 do BRIEF); este nunca lê `dueDate` retroativo
 * nem estende aquele service. O padrão espelhado é `AgingReportService` (achado 2 do BRIEF).
 *
 * JANELA: cada linha diária cobre EXATAMENTE o dia-calendário `[asOf, asOf + 90]` (inclusive nos dois
 * extremos, F-CF1→a/F-CF3→a). Um título JÁ VENCIDO (`dueDate < asOf`) — que a Aging já reporta nas
 * faixas de atraso — NÃO aparece em nenhuma linha nem nos totais: a projeção responde "o que vai
 * vencer daqui pra frente", não "o que já venceu". Isto é uma leitura literal do contrato esboçado
 * do BRIEF ("Σ amountCents das Receivable/Payable outstanding com dueDate NO período") — não uma
 * escolha desta sessão — e está registrada como risco silencioso nº 1 no relatório de implementação:
 * quem quiser saber "quanto tenho vencido e ainda não pago" precisa cruzar com a Aging.
 *
 * INVARIANTE (inteiro exato, sem epsilon): totalInflowCents/totalOutflowCents === Σ das linhas;
 * cada `projectedBalanceCents` = openingBalanceCents + Σ netCents dos dias até ali, inclusive.
 *
 * O cálculo de dia-calendário é component-based em UTC (`toUtcDayNumber`/`dayNumberFromDateOnly`/
 * `dateOnlyFromDayNumber`, `models/dates.ts`), imune ao bug de classe UTC-shift
 * (date-only-rendering-utc-shift-class-bug) — nunca `new Date().getTime()` ingênuo.
 */
export class CashForecastReportService {
  constructor(
    private readonly payableRepo: IPayableRepository,
    private readonly receivableRepo: IReceivableRepository,
    private readonly reportService: AccountingReportService,
    private readonly policy: IAccountingPolicy,
  ) {}

  /**
   * Projeção de caixa a partir de `asOf` (date-only `YYYY-MM-DD`, default hoje quando omitido).
   * @throws ForbiddenError se a policy negar leitura de AP OU AR (F-CF5→a: exige as DUAS — falha
   *   fechada, nunca serve um relatório "incompleto" sem aviso).
   * @throws ValidationError se `asOf` não for uma data real YYYY-MM-DD.
   */
  async forecast(scope: AccountingScope, params: { asOf?: string }): Promise<CashForecastReport> {
    // Policy-check ANTES de qualquer acesso a dados (Contract §2, SVC-001). F-CF5→a: AND das duas
    // permissões — o forecast cruza AP e AR sem `kind` selecionável, então falta uma delas basta
    // para negar o relatório inteiro.
    if (!this.policy.canReadPayable(scope) || !this.policy.canReadReceivable(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler o fluxo de caixa projetado.');
    }

    // as_of: default hoje NO FUSO DO ESCOPO; se fornecido, precisa ser data real (defensivo — o DTO já valida).
    const asOf = params.asOf ?? scopeToday(scope);
    if (!isValidDateOnly(asOf)) {
      throw new ValidationError('asOf deve ser uma data real YYYY-MM-DD.');
    }
    const asOfDay = dayNumberFromDateOnly(asOf);
    const horizonEndDay = asOfDay + CASH_FORECAST_HORIZON_DAYS;

    const [payables, receivables] = await Promise.all([
      loadOutstandingPayables(scope, this.payableRepo),
      loadOutstandingReceivables(scope, this.receivableRepo),
    ]);

    // F-CF2→a: saldo inicial derivado do razão (mesma fonte que o tie-out da Aging já usa).
    const openingBalanceCents = await this.computeOpeningBalance(scope, asOf);

    // Agrega por dia-calendário UTC (F-CF3→a: granularidade diária). Título vencido (day < asOfDay)
    // ou além do horizonte (day > horizonEndDay) fica FORA da janela — ver doc do service.
    const byDay = new Map<number, DayAccumulator>();
    const dayInWindow = (day: number) => day >= asOfDay && day <= horizonEndDay;

    const accumulate = (line: OutstandingLine, kind: CashForecastDocumentKind) => {
      const day = toUtcDayNumber(line.dueDate);
      if (!dayInWindow(day)) return;
      let acc = byDay.get(day);
      if (!acc) {
        acc = { inflowCents: 0, outflowCents: 0, documents: [] };
        byDay.set(day, acc);
      }
      if (kind === 'receivable') acc.inflowCents += line.amountCents;
      else acc.outflowCents += line.amountCents;
      acc.documents.push(toDocumentLine(line, kind));
    };

    for (const line of receivables) accumulate(line, 'receivable');
    for (const line of payables) accumulate(line, 'payable');

    let runningBalance = openingBalanceCents;
    let totalInflow = 0;
    let totalOutflow = 0;
    const lines: CashForecastLine[] = [];

    for (let day = asOfDay; day <= horizonEndDay; day++) {
      const acc = byDay.get(day);
      const inflowCents = acc?.inflowCents ?? 0;
      const outflowCents = acc?.outflowCents ?? 0;
      const netCents = inflowCents - outflowCents;
      runningBalance += netCents;
      totalInflow += inflowCents;
      totalOutflow += outflowCents;

      const dateOnly = dateOnlyFromDayNumber(day);
      lines.push({
        periodStart: dateOnly,
        periodEnd: dateOnly,
        inflowCents: String(inflowCents),
        outflowCents: String(outflowCents),
        netCents: String(netCents),
        projectedBalanceCents: String(runningBalance),
        // Ordem determinística: por id (documentNumber pode ser null; kind desempata visualmente no FE).
        documents: (acc?.documents ?? []).slice().sort((a, b) => a.id.localeCompare(b.id)),
      });
    }

    return {
      unitId: scope.unitId,
      asOf,
      openingBalanceCents: String(openingBalanceCents),
      lines,
      totalInflowCents: String(totalInflow),
      totalOutflowCents: String(totalOutflow),
      totalNetCents: String(totalInflow - totalOutflow),
    };
  }

  /**
   * Saldo de caixa na `asOf` (F-CF2→a): soma o `balanceCents` de toda conta cuja `code` é caixa
   * (`isCashAccount`, `CASH_ACCOUNT_CODE_PREFIXES` — Banco 1.1.1 / Caixa 1.1.3), lendo de
   * `AccountingReportService.balancesAsOf` — a MESMA fonte que o tie-out da Aging já usa
   * (`AgingReportService.computeTieOut`) e que o `CashFlowReportService.sumCash` usa para o
   * fechamento do DFC. Nenhuma nova agregação de saldo é inventada aqui.
   *
   * `balancesAsOf` já aplica sua própria policy-gate (`canRead`) e já resolve o `code` de cada
   * conta internamente (`AccountingReportService.getAccountBalances` via o `IAccountRepository`
   * QUE ELE JÁ injeta) — por isso este service não precisa receber `IAccountRepository` próprio
   * (divergência do esboço "só se F-CF2→a IAccountRepository" do BRIEF: o dado já vem resolvido
   * no retorno de `balancesAsOf`, injetar um repo que nunca seria chamado seria código morto).
   */
  private async computeOpeningBalance(scope: AccountingScope, asOf: string): Promise<number> {
    // Fim-do-dia UTC: inclui o dia inteiro no snapshot (mesma convenção da Aging/BP).
    const rows = await this.reportService.balancesAsOf(scope, new Date(`${asOf}T23:59:59.999Z`));
    return rows.reduce((acc, r) => (isCashAccount(r.code) ? acc + r.balanceCents : acc), 0);
  }
}
