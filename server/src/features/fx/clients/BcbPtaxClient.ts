import { isValidDateOnly } from '../../accounting/models/dates';
import { outboundFetch } from '../../../lib/outboundHttp';
import type { IPtaxClient } from '../ports/IPtaxClient';
import {
  BcbPtaxResponseSchema,
  PTAX_CLOSING_LABELS,
  PTAX_RATE_SCALE,
  type PtaxClosingQuote,
  type PtaxCurrency,
} from '../models/ptax';

export const BCB_PTAX_BASE_URL = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata';
const DEFAULT_TIMEOUT_MS = 10_000;

/** Falha de chamada ou de payload do BCB. O job loga e tenta de novo no tick seguinte (item 23). */
export class PtaxClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PtaxClientError';
  }
}

/**
 * BcbPtaxClient — BE-INCR-CRM-REPORT-BUILDER PR-1 (nó CRM-RB; BRIEF item 22, evidência §8).
 * Endpoint `CotacaoMoedaPeriodo` da API Olinda (leitura sem autenticação). Pede o intervalo inteiro, sem `$filter`,
 * e fica **só** com o boletim de fechamento (`'Fechamento'` / `'Fechamento PTAX'`), recusando `Abertura`/`Intermediário`.
 * Datas `MM-DD-YYYY` na URL; `dataHoraCotacao` vem sem fuso e é hora de Brasília (UTC−3); cotação × 10⁵ com `Math.round`.
 * HTTP via `outboundFetch` (portão P5, ADR-OBSERVABILIDADE OBS-R10) + `AbortController` com timeout (precedente `app.ts:90`).
 */
export class BcbPtaxClient implements IPtaxClient {
  constructor(
    private readonly baseUrl: string = BCB_PTAX_BASE_URL,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  async fetchClosing(currency: PtaxCurrency, fromDate: string, toDate: string): Promise<PtaxClosingQuote[]> {
    if (!isValidDateOnly(fromDate) || !isValidDateOnly(toDate)) throw new PtaxClientError(`Intervalo inválido: '${fromDate}'..'${toDate}'.`);
    const url =
      `${this.baseUrl}/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
      `?@moeda='${currency}'&@dataInicial='${toBcbDate(fromDate)}'&@dataFinalCotacao='${toBcbDate(toDate)}'&$format=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    let body: unknown;
    try {
      const res = await outboundFetch('bcb_ptax', url, { headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!res.ok) throw new PtaxClientError(`BCB PTAX respondeu ${res.status} para ${currency} ${fromDate}..${toDate}.`);
      body = await res.json();
    } catch (error) {
      if (error instanceof PtaxClientError) throw error;
      throw new PtaxClientError(`Falha ao consultar a PTAX ${currency} ${fromDate}..${toDate}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timeoutId);
    }
    return parseClosings(currency, body);
  }
}

/** Payload do `CotacaoMoedaPeriodo`/`CotacaoMoedaDia` → fechamentos por dia, em ordem de data. Exportado para teste. */
export function parseClosings(currency: PtaxCurrency, body: unknown): PtaxClosingQuote[] {
  const parsed = BcbPtaxResponseSchema.safeParse(body);
  if (!parsed.success) throw new PtaxClientError(`Payload da PTAX fora do contrato: ${parsed.error.issues[0]?.message ?? 'inválido'}.`);
  const quotes = parsed.data.value
    .filter((b) => PTAX_CLOSING_LABELS.includes(b.tipoBoletim))
    .map((b): PtaxClosingQuote => {
      const quotedAt = parseBrasiliaDateTime(b.dataHoraCotacao);
      return {
        currency,
        rateDate: b.dataHoraCotacao.slice(0, 10),
        buyRateE5: Math.round(b.cotacaoCompra * PTAX_RATE_SCALE),
        sellRateE5: Math.round(b.cotacaoVenda * PTAX_RATE_SCALE),
        quotedAt,
      };
    });
  return quotes.sort((a, b) => a.rateDate.localeCompare(b.rateDate));
}

/** `YYYY-MM-DD` → `MM-DD-YYYY` (formato da URL do BCB). */
function toBcbDate(date: string): string {
  return `${date.slice(5, 7)}-${date.slice(8, 10)}-${date.slice(0, 4)}`;
}

/** `'2026-09-28 13:03:11.35885'` (hora de Brasília, sem fuso) → instante UTC (+3 h). */
function parseBrasiliaDateTime(raw: string): Date {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(raw);
  if (!m || !isValidDateOnly(m[1])) throw new PtaxClientError(`dataHoraCotacao inválida: '${raw}'.`);
  const ms = m[5] ? Number(m[5].slice(0, 3).padEnd(3, '0')) : 0;
  return new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${String(ms).padStart(3, '0')}-03:00`);
}
