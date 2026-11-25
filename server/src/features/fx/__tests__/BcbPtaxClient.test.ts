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

  it('HTTP não-2xx → PtaxClientError (5xx é GET idempotente: o wrapper tenta 2× (OUTBOUND_POLICY.bcbPtax, dono 24/11) antes de entregar o 503)', async () => {
    const fetchMock = jest.fn(async () => new Response('{}', { status: 503 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(new BcbPtaxClient().fetchClosing('USD', '2026-09-24', '2026-09-28')).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('HTTP 404 é permanente → 1 chamada só', async () => {
    const fetchMock = jest.fn(async () => new Response('{}', { status: 404 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(new BcbPtaxClient().fetchClosing('USD', '2026-09-24', '2026-09-28')).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

/**
 * Onda 4 / 4.2 (ressalvas 3 e 7 do revisor, PR #1395) — o prazo TOTAL (`deadlineMs` 25 s) da política `bcbPtax` chega ao
 * wrapper e CORTA a chamada: o relógio (`Date.now`) é adiantado dentro do fetch falso, sem esperar 25 s de verdade.
 */
describe('BcbPtaxClient — prazo total da política (deadlineMs de ponta a ponta)', () => {
  const realFetch = global.fetch;
  const realNow = Date.now.bind(Date);
  let skew = 0;
  /** `fetch` falso que responde 503 e adianta o relógio em `adianta[n]` ms na n-ésima chamada. */
  const fetch503 = (adianta: number[]) => {
    let n = 0;
    const mock = jest.fn(async () => {
      skew += adianta[n] ?? 0;
      n += 1;
      return new Response('{}', { status: 503 });
    });
    global.fetch = mock as unknown as typeof fetch;
    return mock;
  };
  const consulta = () => new BcbPtaxClient().fetchClosing('USD', '2026-09-24', '2026-09-28');

  beforeEach(() => {
    skew = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + skew);
  });
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('controle: 503 rápido ⇒ 2 tentativas (a política tem retry de 1 vez)', async () => {
    const mock = fetch503([]);
    await expect(consulta()).rejects.toThrow(/503/);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('1ª tentativa consome quase todo o prazo de 25 s ⇒ NÃO há 2ª (o backoff não cabe no que resta)', async () => {
    const mock = fetch503([24_950]);
    await expect(consulta()).rejects.toThrow(/503/);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('1ª tentativa consome 20 s ⇒ a 2ª recebe só o que resta do prazo (≤ 5 s), não os 10 s do timeout', async () => {
    const abortTimeout = jest.spyOn(AbortSignal, 'timeout');
    const mock = fetch503([20_000]);
    await expect(consulta()).rejects.toThrow(/503/);
    expect(mock).toHaveBeenCalledTimes(2);
    // O último `AbortSignal.timeout` criado é o que governa a 2ª tentativa: ≤ o que resta do prazo, não os 10 s do timeout.
    const ultimo = abortTimeout.mock.calls.at(-1)?.[0] ?? 0;
    expect(ultimo).toBeGreaterThan(0);
    expect(ultimo).toBeLessThanOrEqual(5_000);
  });
});

describe('BcbPtaxClient — guarda do timeoutMs (invariante 2 × timeout + 5 s <= prazo total)', () => {
  it('aceita o padrão e o teto exato (10 s); testes com timeout curto continuam valendo', () => {
    expect(() => new BcbPtaxClient()).not.toThrow();
    expect(() => new BcbPtaxClient('https://bcb.test', 10_000)).not.toThrow();
    expect(() => new BcbPtaxClient('https://bcb.test', 5)).not.toThrow();
  });

  it('recusa timeout acima do teto (a 2ª tentativa seria truncada em silêncio) com erro claro', () => {
    expect(() => new BcbPtaxClient('https://bcb.test', 10_001)).toThrow(RangeError);
    expect(() => new BcbPtaxClient('https://bcb.test', 15_000)).toThrow(/timeoutMs=15000 viola 2 × timeoutMs \+ 5000 ms <= prazo total \(25000 ms\)/);
  });

  it('recusa timeout não positivo ou não finito', () => {
    for (const ruim of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new BcbPtaxClient('https://bcb.test', ruim)).toThrow(RangeError);
    }
  });
});
