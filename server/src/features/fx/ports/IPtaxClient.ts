import type { PtaxClosingQuote, PtaxCurrency } from '../models/ptax';

/**
 * Porta do BCB (BRIEF §3, item 22). O teste usa fake ou `fetch` trocado com os payloads gravados; o CI não acessa a rede.
 */
export interface IPtaxClient {
  /** CotacaoMoedaPeriodo filtrado no fechamento; dia sem boletim (fim de semana, feriado) simplesmente não vem. */
  fetchClosing(currency: PtaxCurrency, fromDate: string, toDate: string): Promise<PtaxClosingQuote[]>;
}
