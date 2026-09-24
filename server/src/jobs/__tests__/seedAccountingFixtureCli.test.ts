const disconnect = jest.fn(async () => {});
const getInstance = jest.fn();

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: { $disconnect: () => disconnect() },
}));

jest.mock('../../lib/factory', () => ({
  __esModule: true,
  ApplicationFactory: { getInstance: () => getInstance() },
}));

import { assertSafeEnvironment, buildMonthPlan, parseArgs, runCli, tieOutPasses } from '../seedAccountingFixtureCli';
import { PostEntrySchema } from '../../features/accounting/dtos/PostingDto';

const SAFE_ENV = { DATABASE_URL: 'file:./prisma/dev.db', NODE_ENV: 'development' } as NodeJS.ProcessEnv;

describe('seedAccountingFixtureCli', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  describe('parseArgs (contrato de entrada)', () => {
    it('exige --i-have-a-backup (F-SEED-2 → a)', () => {
      expect(() => parseArgs(['--years', '2025'])).toThrow(/--i-have-a-backup/);
    });

    it('defaults: anos 2025,2026, tenant salon, seed 1, unit seed-unit', () => {
      expect(parseArgs(['--i-have-a-backup'])).toEqual({ years: [2025, 2026], tenant: 'salon', seed: 1, unitId: 'seed-unit', iHaveABackup: true });
    });

    it('ordena e deduplica os anos', () => {
      expect(parseArgs(['--years', '2026,2025,2026', '--i-have-a-backup']).years).toEqual([2025, 2026]);
    });

    it('rejeita ano não numérico', () => {
      expect(() => parseArgs(['--years', '20x5', '--i-have-a-backup'])).toThrow(/years/);
    });

    it('recusa --tenant clinic (fica para o H3)', () => {
      expect(() => parseArgs(['--tenant', 'clinic', '--i-have-a-backup'])).toThrow(/clinic/);
    });
  });

  describe('assertSafeEnvironment (recusas de ambiente)', () => {
    it('recusa NODE_ENV=production', () => {
      expect(() => assertSafeEnvironment({ ...SAFE_ENV, NODE_ENV: 'production' })).toThrow(/production/);
    });

    it('recusa DATABASE_URL que não é file:', () => {
      expect(() => assertSafeEnvironment({ ...SAFE_ENV, DATABASE_URL: 'postgresql://x' })).toThrow(/file:/);
    });

    it('aceita SQLite local fora de produção', () => {
      expect(() => assertSafeEnvironment(SAFE_ENV)).not.toThrow();
    });
  });

  describe('runCli — recusa ANTES de tocar o banco, exit 1', () => {
    it('sem backup: exit 1 e nunca monta a factory', async () => {
      expect(await runCli(['--years', '2025'], SAFE_ENV)).toBe(1);
      expect(getInstance).not.toHaveBeenCalled();
    });

    it('em produção: exit 1 e nunca monta a factory', async () => {
      expect(await runCli(['--i-have-a-backup'], { ...SAFE_ENV, NODE_ENV: 'production' })).toBe(1);
      expect(getInstance).not.toHaveBeenCalled();
    });
  });

  describe('buildMonthPlan', () => {
    const plan = buildMonthPlan(7, 0, 2025, 3, 31, 12_345);

    it('todo lançamento passa no contrato do postEntry e fecha débito=crédito', () => {
      for (const e of plan.entries) {
        const parsed = PostEntrySchema.parse({ ...e, unitId: 'u' });
        const d = parsed.lines.reduce((s, l) => s + l.debitCents, 0);
        const c = parsed.lines.reduce((s, l) => s + l.creditCents, 0);
        expect(d).toBe(c);
        expect(parsed.sourceType).toBe('seed');
      }
    });

    it('é determinístico por seed e muda com a seed', () => {
      expect(buildMonthPlan(7, 0, 2025, 3, 31, 12_345)).toEqual(plan);
      expect(buildMonthPlan(8, 0, 2025, 3, 31, 12_345)).not.toEqual(plan);
    });

    it('estoque nunca negativo: compra ≥ CMV no mês', () => {
      const compra = plan.entries.find((e) => e.sourceId === '2025-03-estoque')!.lines[0].debitCents;
      const cmv = plan.entries.find((e) => e.sourceId === '2025-03-cmv')!.lines[0].debitCents;
      expect(compra).toBeGreaterThanOrEqual(cmv);
    });

    it('reconhece o pacote do mês anterior (D 2.1.1 / C 3.1) só quando há pacote', () => {
      const consumo = plan.entries.find((e) => e.sourceId === '2025-03-pacote-consumo')!;
      expect(consumo.lines).toEqual([
        { accountCode: '2.1.1', debitCents: 12_345, creditCents: 0 },
        { accountCode: '3.1', debitCents: 0, creditCents: 12_345 },
      ]);
      expect(buildMonthPlan(7, 0, 2025, 1, 31, 0).entries.some((e) => e.sourceId?.endsWith('pacote-consumo'))).toBe(false);
    });

    it('banco (1.1.1) e estoque (1.1.6) nunca negativos em NENHUM dia — 20 seeds × 2 tenants × 2025..set/2026, partindo de zero', () => {
      for (let seed = 0; seed < 20; seed++) {
        for (const tenant of [0, 1]) {
          const bal: Record<string, number> = { '1.1.1': 0, '1.1.6': 0 };
          let prior = 0;
          for (const [year, lastMonth] of [[2025, 12], [2026, 9]] as const) {
            for (let month = 1; month <= lastMonth; month++) {
              const lastDay = year === 2026 && month === 9 ? 4 : 28;
              const p = buildMonthPlan(seed, tenant, year, month, lastDay, prior);
              prior = p.packageSoldCents;
              // movimentos datados: lançamentos + pagamentos/recebimentos (Pix → 1.1.1)
              const moves: { date: string; code: string; delta: number }[] = [];
              for (const e of p.entries) for (const l of e.lines) moves.push({ date: e.date, code: l.accountCode, delta: l.debitCents - l.creditCents });
              for (const ap of p.payables) moves.push({ date: ap.paidAt, code: '1.1.1', delta: -ap.paidCents });
              for (const ar of p.receivables) if (ar.receivedCents > 0) moves.push({ date: ar.receivedAt, code: '1.1.1', delta: ar.receivedCents });
              const days = [...new Set(moves.map((m) => m.date))].sort();
              for (const d of days) {
                for (const m of moves) if (m.date === d && m.code in bal) bal[m.code] += m.delta;
                expect({ seed, tenant, d, bank: bal['1.1.1'] >= 0, stock: bal['1.1.6'] >= 0 }).toEqual({ seed, tenant, d, bank: true, stock: true });
              }
            }
          }
        }
      }
    });

    it('fornecedor parcial continua parcial mesmo com o teto de caixa (0 < pago < valor)', () => {
      for (let seed = 0; seed < 20; seed++) {
        const ap2 = buildMonthPlan(seed, 0, 2025, 1, 31, 0).payables[1];
        expect(ap2.paidCents).toBeGreaterThan(0);
        expect(ap2.paidCents).toBeLessThan(ap2.amountCents);
      }
    });

    it('AP: 1 liquidado + 1 parcial; AR: 1 recebido + 1 aberto', () => {
      expect(plan.payables[0].paidCents).toBe(plan.payables[0].amountCents);
      expect(plan.payables[1].paidCents).toBeGreaterThan(0);
      expect(plan.payables[1].paidCents).toBeLessThan(plan.payables[1].amountCents);
      expect(plan.receivables[0].receivedCents).toBe(plan.receivables[0].amountCents);
      expect(plan.receivables[1].receivedCents).toBe(0);
    });

    it('nenhuma data passa de lastDay (mês corrente não lança no futuro)', () => {
      const p = buildMonthPlan(7, 0, 2026, 9, 4, 100);
      const dates = [...p.entries.map((e) => e.date), ...p.payables.flatMap((a) => [a.issueDate, a.dueDate, a.paidAt]), ...p.receivables.flatMap((a) => [a.issueDate, a.dueDate, a.receivedAt])];
      expect(dates.every((d) => d <= '2026-09-04')).toBe(true);
    });
  });

  describe('tieOutPasses', () => {
    const base = { username: 'x', regime: 'REAL' as const, userId: 'u', unitId: 'n', entriesCreated: 0, entriesExisting: 0, payablesCreated: 0, receivablesCreated: 0, closedYears: [] };
    const ok = { asOf: '2025-12-31', debitCents: 1, creditCents: 1, trialBalanceBalanced: true, balanceSheetBalanced: true };

    it('falha se qualquer BP não fecha', () => {
      expect(tieOutPasses([{ ...base, tieOut: [ok, { ...ok, balanceSheetBalanced: false }] }])).toBe(false);
    });

    it('falha sem nenhuma linha de tie-out (nada foi conferido)', () => {
      expect(tieOutPasses([{ ...base, tieOut: [] }])).toBe(false);
    });

    it('passa quando tudo fecha', () => {
      expect(tieOutPasses([{ ...base, tieOut: [ok] }])).toBe(true);
    });
  });
});
