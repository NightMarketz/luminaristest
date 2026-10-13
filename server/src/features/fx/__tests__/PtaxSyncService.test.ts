/**
 * BE-INCR-CRM-REPORT-BUILDER PR-1 — item 23: o job da PTAX com repositório e client falsos (sem banco, sem rede).
 * "Agora" é sempre um instante UTC explícito; Brasília = UTC−3.
 */
import type { PtaxRate } from 'generated/prisma';
import { PtaxSyncService } from '../services/PtaxSyncService';
import type { IPtaxRateRepository } from '../repositories/IPtaxRateRepository';
import type { IPtaxClient } from '../ports/IPtaxClient';
import { addDays, type PtaxClosingQuote, type PtaxCurrency } from '../models/ptax';

class FakeRepo implements IPtaxRateRepository {
  rows = new Map<string, PtaxClosingQuote>();
  constructor(seed: Partial<Record<PtaxCurrency, string>> = {}) {
    for (const [currency, rateDate] of Object.entries(seed)) this.put({ currency: currency as PtaxCurrency, rateDate, buyRateE5: 1, sellRateE5: 1, quotedAt: new Date() });
  }
  private put(q: PtaxClosingQuote): void {
    const k = `${q.currency}|${q.rateDate}`;
    if (!this.rows.has(k)) this.rows.set(k, q);
  }
  async upsertClosing(q: PtaxClosingQuote): Promise<PtaxRate> {
    this.put(q);
    return {} as PtaxRate;
  }
  async findLatestOnOrBefore(): Promise<PtaxRate | null> {
    return null;
  }
  async findLatestDate(currency: PtaxCurrency): Promise<string | null> {
    const dates = [...this.rows.values()].filter((q) => q.currency === currency).map((q) => q.rateDate).sort();
    return dates.at(-1) ?? null;
  }
}

/** Client falso: devolve um fechamento por dia útil do intervalo pedido e registra as chamadas. */
class FakeClient implements IPtaxClient {
  calls: Array<[PtaxCurrency, string, string]> = [];
  constructor(private readonly failFor: PtaxCurrency[] = []) {}
  async fetchClosing(currency: PtaxCurrency, from: string, to: string): Promise<PtaxClosingQuote[]> {
    this.calls.push([currency, from, to]);
    if (this.failFor.includes(currency)) throw new Error('BCB fora do ar');
    const out: PtaxClosingQuote[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
      if (wd !== 0 && wd !== 6) out.push({ currency, rateDate: d, buyRateE5: 500000, sellRateE5: 500060, quotedAt: new Date(`${d}T16:05:00Z`) });
    }
    return out;
  }
}

// Quinta 01/10/2026, 14h de Brasília (já publicou o dia) e 10h (ainda não).
const QUI_14H = new Date('2026-10-01T17:00:00Z');
const QUI_10H = new Date('2026-10-01T13:00:00Z');

describe('PtaxSyncService.syncClosings (item 23)', () => {
  it('lacuna de 3 dias úteis fechada numa chamada por moeda', async () => {
    const repo = new FakeRepo({ USD: '2026-09-28', EUR: '2026-09-28' }); // segunda; faltam ter, qua, qui
    const client = new FakeClient();
    const summary = await new PtaxSyncService(repo, client).syncClosings(QUI_14H);
    expect(client.calls).toEqual([
      ['USD', '2026-09-29', '2026-10-01'],
      ['EUR', '2026-09-29', '2026-10-01'],
    ]);
    expect(summary).toMatchObject({ calls: 2, saved: 6, failed: 0 });
    expect(await repo.findLatestDate('USD')).toBe('2026-10-01');
  });

  it('sem lacuna → zero chamadas ao client', async () => {
    const client = new FakeClient();
    const summary = await new PtaxSyncService(new FakeRepo({ USD: '2026-10-01', EUR: '2026-10-01' }), client).syncClosings(QUI_14H);
    expect(client.calls).toEqual([]);
    expect(summary).toMatchObject({ calls: 0, saved: 0, failed: 0 });
  });

  it('antes do horário de publicação o dia corrente não entra: guardado até ontem → zero chamadas', async () => {
    const client = new FakeClient();
    await new PtaxSyncService(new FakeRepo({ USD: '2026-09-30', EUR: '2026-09-30' }), client).syncClosings(QUI_10H);
    expect(client.calls).toEqual([]);
  });

  it('antes da publicação, lacuna anterior é pedida só até ontem', async () => {
    const client = new FakeClient();
    await new PtaxSyncService(new FakeRepo({ USD: '2026-09-28', EUR: '2026-09-30' }), client).syncClosings(QUI_10H);
    expect(client.calls).toEqual([['USD', '2026-09-29', '2026-09-30']]);
  });

  it('fim de semana sem dia útil na lacuna → zero chamadas', async () => {
    const client = new FakeClient();
    // domingo 04/10 às 15h de Brasília; guardado até sexta 02/10
    await new PtaxSyncService(new FakeRepo({ USD: '2026-10-02', EUR: '2026-10-02' }), client).syncClosings(new Date('2026-10-04T18:00:00Z'));
    expect(client.calls).toEqual([]);
  });

  it('primeira execução (tabela vazia) busca hoje − 10 dias .. hoje', async () => {
    const client = new FakeClient();
    await new PtaxSyncService(new FakeRepo(), client).syncClosings(QUI_14H);
    expect(client.calls).toEqual([
      ['USD', '2026-09-21', '2026-10-01'],
      ['EUR', '2026-09-21', '2026-10-01'],
    ]);
  });

  it('o "hoje" é o de Brasília: 01h UTC de sexta ainda é quinta às 22h', async () => {
    const client = new FakeClient();
    await new PtaxSyncService(new FakeRepo({ USD: '2026-09-30', EUR: '2026-09-30' }), client).syncClosings(new Date('2026-10-02T01:00:00Z'));
    expect(client.calls.map((c) => c[2])).toEqual(['2026-10-01', '2026-10-01']);
  });

  it('client lança → o serviço não lança, conta a falha e a outra moeda segue', async () => {
    const repo = new FakeRepo({ USD: '2026-09-30', EUR: '2026-09-30' });
    const summary = await new PtaxSyncService(repo, new FakeClient(['USD'])).syncClosings(QUI_14H);
    expect(summary.failed).toBe(1);
    expect(summary.saved).toBe(1);
    expect(summary.currencies.find((c) => c.currency === 'USD')?.error).toBe('BCB fora do ar');
    expect(await repo.findLatestDate('EUR')).toBe('2026-10-01');
    expect(await repo.findLatestDate('USD')).toBe('2026-09-30');
  });
});
