import type { IPtaxClient } from '../ports/IPtaxClient';
import type { IPtaxRateRepository } from '../repositories/IPtaxRateRepository';
import { addDays, brasiliaNow, hasWeekdayBetween, PTAX_CURRENCIES, type PtaxCurrency } from '../models/ptax';

/** Na primeira execução (tabela vazia para a moeda) o job busca os últimos 10 dias (item 23). */
export const PTAX_FIRST_RUN_LOOKBACK_DAYS = 10;
/**
 * Antes deste minuto de Brasília o dia corrente não entra no intervalo: o fechamento saiu às 13h03–13h10 nas amostras de
 * 24–28/09 (BRIEF §8). 13h00 é o limite inferior observado — pedir entre 13h00 e a publicação só devolve nada e o tick
 * seguinte tenta de novo.
 */
export const PTAX_PUBLICATION_MINUTE = 13 * 60;

export interface PtaxSyncCurrencyResult {
  currency: PtaxCurrency;
  from: string | null; // null = sem lacuna (nenhuma chamada ao BCB)
  to: string | null;
  saved: number;
  error?: string;
}

export interface PtaxSyncSummary {
  calls: number;
  saved: number;
  failed: number;
  currencies: PtaxSyncCurrencyResult[];
}

/**
 * PtaxSyncService — BE-INCR-CRM-REPORT-BUILDER PR-1 (nó CRM-RB; BRIEF item 23). Uma cotação por moeda por dia útil:
 * cada execução pede ao BCB o intervalo [último `rateDate` guardado + 1 dia (ou hoje − 10 dias na primeira vez) .. hoje
 * em Brasília] e grava os fechamentos que vierem — lacuna de servidor parado se fecha sozinha. Só chama o BCB se houver
 * lacuna com dia útil (segunda a sexta) e, para o dia corrente, depois do horário de publicação. Falha do BCB numa moeda
 * vira `error` no resultado e a outra moeda segue; o serviço não lança por causa do client.
 */
export class PtaxSyncService {
  constructor(
    private readonly repository: IPtaxRateRepository,
    private readonly client: IPtaxClient,
  ) {}

  async syncClosings(now: Date = new Date()): Promise<PtaxSyncSummary> {
    const { date: today, minuteOfDay } = brasiliaNow(now);
    const to = minuteOfDay >= PTAX_PUBLICATION_MINUTE ? today : addDays(today, -1);
    const summary: PtaxSyncSummary = { calls: 0, saved: 0, failed: 0, currencies: [] };

    for (const currency of PTAX_CURRENCIES) {
      const last = await this.repository.findLatestDate(currency);
      const from = last ? addDays(last, 1) : addDays(today, -PTAX_FIRST_RUN_LOOKBACK_DAYS);
      if (from > to || !hasWeekdayBetween(from, to)) {
        summary.currencies.push({ currency, from: null, to: null, saved: 0 });
        continue;
      }
      summary.calls += 1;
      try {
        const quotes = await this.client.fetchClosing(currency, from, to);
        for (const quote of quotes) await this.repository.upsertClosing(quote);
        summary.saved += quotes.length;
        summary.currencies.push({ currency, from, to, saved: quotes.length });
      } catch (error) {
        summary.failed += 1;
        summary.currencies.push({ currency, from, to, saved: 0, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return summary;
  }
}
