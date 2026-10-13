/**
 * BE-INCR-CRM-REPORT-BUILDER PR-1 — itens 20 e 21 contra o SQLite real: idempotência pelo `@@unique`, a busca "última ≤
 * data" e a migração reaplicável (prólogo idempotente — memória migracao-sqlite-nao-e-transacional).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { applyMigrations } from '@test/helpers/migrations';
import { PtaxRateRepository } from '../repositories/PtaxRateRepository';
import type { PtaxClosingQuote } from '../models/ptax';

const quote = (rateDate: string, sellRateE5: number, currency: 'USD' | 'EUR' = 'USD'): PtaxClosingQuote => ({
  currency, rateDate, buyRateE5: sellRateE5 - 60, sellRateE5, quotedAt: new Date(`${rateDate}T16:03:00.000Z`),
});

describe('PtaxRateRepository (itens 20–21)', () => {
  const repo = new PtaxRateRepository();
  beforeAll(() => pushTestSchema());
  afterEach(() => resetDb());
  afterAll(() => disconnectDb());

  it('a segunda gravação da mesma (currency, rateDate) não duplica nem sobrescreve', async () => {
    await repo.upsertClosing(quote('2026-09-28', 521320));
    await repo.upsertClosing(quote('2026-09-28', 999999));
    const rows = await prisma.ptaxRate.findMany({ where: { currency: 'USD' } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ sellRateE5: 521320, buyRateE5: 521260, source: 'BCB_PTAX_FECHAMENTO' });
    expect(rows[0].rateDate.toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });

  it('consulta com data de sábado devolve a de sexta; antes da primeira → null; moedas não se misturam', async () => {
    await repo.upsertClosing(quote('2026-09-24', 517950));
    await repo.upsertClosing(quote('2026-09-25', 519910));
    await repo.upsertClosing(quote('2026-09-28', 592530, 'EUR'));
    const sabado = await repo.findLatestOnOrBefore('USD', '2026-09-26');
    expect(sabado?.sellRateE5).toBe(519910);
    expect(sabado?.rateDate.toISOString().slice(0, 10)).toBe('2026-09-25');
    expect((await repo.findLatestOnOrBefore('USD', '2026-09-25'))?.sellRateE5).toBe(519910);
    expect(await repo.findLatestOnOrBefore('USD', '2026-09-23')).toBeNull();
    expect(await repo.findLatestOnOrBefore('EUR', '2026-09-26')).toBeNull();
  });

  it('findLatestDate: maior rateDate por moeda, null com a tabela vazia', async () => {
    expect(await repo.findLatestDate('USD')).toBeNull();
    await repo.upsertClosing(quote('2026-09-25', 519910));
    await repo.upsertClosing(quote('2026-09-24', 517950));
    expect(await repo.findLatestDate('USD')).toBe('2026-09-25');
    expect(await repo.findLatestDate('EUR')).toBeNull();
  });
});

describe('migração 20261013120000_add_ptax_rates', () => {
  const SERVER_ROOT = path.resolve(__dirname, '../../../..');
  const exec = (db: string, sql: string): void => {
    execSync(`npx prisma db execute --url "file:${db}" --stdin`, { cwd: SERVER_ROOT, input: sql, stdio: 'pipe' });
  };
  const insert = (id: string): string =>
    `INSERT INTO ptax_rates (id,currency,rateDate,buyRateE5,sellRateE5,quotedAt,source) VALUES ('${id}','USD',0,1,1,0,'x');`;

  it('reaplicada sobre si mesma converge (IF NOT EXISTS), com o índice único no lugar', () => {
    const db = path.join(os.tmpdir(), `ptax-migration-${process.pid}-${Date.now()}.db`);
    try {
      applyMigrations(db, ['20261013120000_add_ptax_rates', '20261013120000_add_ptax_rates']);
      exec(db, insert('a'));
      expect(() => exec(db, insert('b'))).toThrow(/UNIQUE/i);
    } finally {
      for (const f of [db, `${db}-journal`]) fs.rmSync(f, { force: true });
    }
  }, 60000);
});
