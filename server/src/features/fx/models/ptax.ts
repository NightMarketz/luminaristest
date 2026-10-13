import { z } from 'zod';
import { CURRENCIES } from '../../crm/constants';

/**
 * Módulo neutro de câmbio (BE-INCR-CRM-REPORT-BUILDER PR-1, nó CRM-RB; BRIEF §1.1 e item 26). Mora fora de
 * `features/crm` porque o ADR de moeda no Contas a Receber e o monitor de câmbio vão reusar tabela, client e job
 * (D-2026-09-29-CRM-RB-MOEDA-REALIZADO). Até esse ADR ser ratificado, nada em `features/accounting/**` importa daqui.
 */

/** Moedas cotadas pela PTAX = `CURRENCIES` − BRL (item 23; `crm/constants.ts:1`). */
export type PtaxCurrency = Exclude<(typeof CURRENCIES)[number], 'BRL'>;
export const PTAX_CURRENCIES: readonly PtaxCurrency[] = CURRENCIES.filter((c): c is PtaxCurrency => c !== 'BRL');

export const PTAX_SOURCE = 'BCB_PTAX_FECHAMENTO' as const;

/** Escala da cotação guardada: inteiro × 10⁵ (a API devolve 5 casas — BRIEF §8, item 20). */
export const PTAX_RATE_SCALE = 100_000;

/**
 * Rótulos do boletim de fechamento: `'Fechamento'` no endpoint `CotacaoMoedaPeriodo` e `'Fechamento PTAX'` no
 * `CotacaoMoedaDia` (verificado 29/09 e de novo 13/10; item 22). `Abertura`/`Intermediário` são recusados.
 */
export const PTAX_CLOSING_LABELS: readonly string[] = ['Fechamento', 'Fechamento PTAX'];

/** Fuso da PTAX: `dataHoraCotacao` vem sem fuso e é hora de Brasília (item 22). */
export const PTAX_TIME_ZONE = 'America/Sao_Paulo';

/** Contrato de entrada do BCB (o que o client lê de cada boletim). Campos extras do payload passam. */
export const BcbPtaxBulletinSchema = z.object({
  cotacaoCompra: z.number().positive(),
  cotacaoVenda: z.number().positive(),
  dataHoraCotacao: z.string(),
  tipoBoletim: z.string(),
});
export const BcbPtaxResponseSchema = z.object({ value: z.array(BcbPtaxBulletinSchema) });

/** Fechamento de um dia útil, já convertido para a escala guardada (BRIEF §3). */
export interface PtaxClosingQuote {
  currency: PtaxCurrency;
  rateDate: string; // YYYY-MM-DD
  buyRateE5: number;
  sellRateE5: number;
  quotedAt: Date;
}

/** Dia civil e minuto do dia em Brasília (o job decide a lacuna e o horário de publicação por eles). */
export function brasiliaNow(now: Date): { date: string; minuteOfDay: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PTAX_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minuteOfDay: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Soma `days` dias corridos a um dia `YYYY-MM-DD` (aritmética em UTC, sem fuso). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** `true` se há ao menos um dia de segunda a sexta em [from, to] (fim de semana nunca tem boletim). */
export function hasWeekdayBetween(from: string, to: string): boolean {
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const wd = new Date(`${d}T00:00:00.000Z`).getUTCDay();
    if (wd !== 0 && wd !== 6) return true;
  }
  return false;
}

/** Dia `YYYY-MM-DD` ↔ `DateTime` date-only guardado (meia-noite UTC — o dia escrito). */
export const dateOnlyToDb = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
export const dbToDateOnly = (d: Date): string => d.toISOString().slice(0, 10);
