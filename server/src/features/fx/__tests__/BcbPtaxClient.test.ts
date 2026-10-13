/**
 * BE-INCR-CRM-REPORT-BUILDER PR-1 — item 22: o client do BCB, sem rede. Fixtures em `__fixtures__/` gravadas da API
 * Olinda em 13/10 para as mesmas datas do BRIEF §8 (24–28/09): o período USD com 5 boletins por dia útil, o fim de
 * semana vazio, o EUR de 28/09 e o `CotacaoMoedaDia` com o rótulo `Fechamento PTAX`. O "dia corrente antes das 13h"
 * não se grava depois do fato: `periodo-usd-0924-antes-das-13h-derivado.json` = os 3 primeiros boletins de 24/09.
 */
import { BcbPtaxClient, parseClosings, PtaxClientError } from '../clients/BcbPtaxClient';
import periodoUsd from './__fixtures__/periodo-usd-0924-0928.json';
import fimDeSemana from './__fixtures__/periodo-eur-0926-0927-fim-de-semana.json';
import periodoEur from './__fixtures__/periodo-eur-0928.json';
import diaUsd from './__fixtures__/dia-usd-0928.json';
import antesDas13h from './__fixtures__/periodo-usd-0924-antes-das-13h-derivado.json';

describe('parseClosings (item 22)', () => {
  it('dia útil com 5 boletins → só o fechamento, × 10⁵, um por dia, em ordem de data', () => {
    const quotes = parseClosings('USD', periodoUsd);
    expect(quotes.map((q) => [q.rateDate, q.sellRateE5, q.buyRateE5])).toEqual([
      ['2026-09-24', 517950, 517890],
      ['2026-09-25', 519910, 519850],
      ['2026-09-28', 521320, 521260],
    ]);
    expect(quotes.every((q) => q.currency === 'USD')).toBe(true);
  });

  it('dataHoraCotacao sem fuso é hora de Brasília (UTC−3)', () => {
    const [q] = parseClosings('USD', diaUsd);
    expect(q.quotedAt.toISOString()).toBe('2026-09-28T16:03:11.358Z');
  });

  it("aceita o rótulo 'Fechamento PTAX' do CotacaoMoedaDia", () => {
    expect(parseClosings('USD', diaUsd).map((q) => [q.rateDate, q.sellRateE5])).toEqual([['2026-09-28', 521320]]);
  });

  it('EUR vem direto em reais', () => {
    expect(parseClosings('EUR', periodoEur).map((q) => [q.currency, q.rateDate, q.sellRateE5])).toEqual([['EUR', '2026-09-28', 592530]]);
  });

  it('fim de semana (value: []) → nenhum fechamento', () => {
    expect(parseClosings('EUR', fimDeSemana)).toEqual([]);
  });

  it('antes das 13h (Abertura + Intermediários) → nenhum fechamento', () => {
    expect(antesDas13h.value.map((b) => b.tipoBoletim)).toEqual(['Abertura', 'Intermediário', 'Intermediário']);
    expect(parseClosings('USD', antesDas13h)).toEqual([]);
  });

  it('payload fora do contrato → PtaxClientError', () => {
    expect(() => parseClosings('USD', { erro: 'x' })).toThrow(PtaxClientError);
    expect(() => parseClosings('USD', { value: [{ cotacaoCompra: '5,1', cotacaoVenda: 5, dataHoraCotacao: 'x', tipoBoletim: 'Fechamento' }] })).toThrow(PtaxClientError);
    expect(() => parseClosings('USD', { value: [{ cotacaoCompra: 5, cotacaoVenda: 5, dataHoraCotacao: '28/09/2026 13:03', tipoBoletim: 'Fechamento' }] })).toThrow(PtaxClientError);
  });
});

describe('BcbPtaxClient.fetchClosing (item 22)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('monta o CotacaoMoedaPeriodo com datas MM-DD-YYYY e devolve os fechamentos', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => periodoUsd });
    global.fetch = fetchMock as unknown as typeof fetch;
    const quotes = await new BcbPtaxClient('https://bcb.test/odata').fetchClosing('USD', '2026-09-24', '2026-09-28');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://bcb.test/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)" +
        "?@moeda='USD'&@dataInicial='09-24-2026'&@dataFinalCotacao='09-28-2026'&$format=json",
    );
    expect(quotes).toHaveLength(3);
  });

  it('HTTP não-2xx → PtaxClientError', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }) as unknown as typeof fetch;
    await expect(new BcbPtaxClient().fetchClosing('USD', '2026-09-24', '2026-09-28')).rejects.toThrow(/503/);
  });

  it('erro de rede ou timeout (abort) → PtaxClientError', async () => {
    global.fetch = jest.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
    ) as unknown as typeof fetch;
    await expect(new BcbPtaxClient('https://bcb.test', 5).fetchClosing('EUR', '2026-09-24', '2026-09-28')).rejects.toBeInstanceOf(PtaxClientError);
  });

  it('data inválida no intervalo → PtaxClientError sem chamar a rede', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(new BcbPtaxClient().fetchClosing('USD', '2026-02-30', '2026-03-01')).rejects.toBeInstanceOf(PtaxClientError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
