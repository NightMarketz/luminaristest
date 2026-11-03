/**
 * FixedAssetParteBReader — o `IFixedAssetReader` do Bloco F (C8 emenda 3.2, E15/E16/E21). Repositórios falsos: aqui
 * se prova o filtro do E15, a série fiscal (taxa do Anexo sobre o custo, ou `nFiscal` da benfeitoria), a quota contábil
 * POSTADA e o saldo do bem antes do período. O Prisma real roda no teste de integração do controller do e-Lalur.
 */
import type { FixedAsset, FixedAssetClass } from 'generated/prisma';
import { FixedAssetParteBReader, parteBWindow } from '../FixedAssetParteBReader';
import { resolveAccountingScopeInternal } from '../../scope/resolveAccountingScopeInternal';
import { ValidationError } from '../../../../lib/errors';

const scope = resolveAccountingScopeInternal({ userId: 'owner-1' }, 'unit-1');
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const DEP = { id: 'cl-dep', kind: 'DEPRECIATION', depreciable: true } as FixedAssetClass;
const BENF = { id: 'cl-benf', kind: 'AMORTIZATION_LEASEHOLD', depreciable: true } as FixedAssetClass;

function bem(over: Partial<FixedAsset> & { class?: FixedAssetClass }): FixedAsset & { class: FixedAssetClass } {
  return {
    id: 'fa', code: 'BEM', costCents: 120_000n, residualValueCents: 0n, annualRateBp: 1000, bookAnnualRateBp: null,
    openingAccumulatedCents: 0n, status: 'ACTIVE', activatedAt: d('2025-01-01'), disposedAt: null, leaseEndDate: null, class: DEP, ...over,
  } as FixedAsset & { class: FixedAssetClass };
}

/** Quotas mensais postadas: `{ 'fa:2025-01': 2000n }` → entry no último dia do mês, debitando `acc`. */
function build(assets: Array<FixedAsset & { class: FixedAssetClass }>, quotas: Record<string, bigint> = {}, acc = 'acc-dep') {
  const assetRepo = { findForParteB: jest.fn(async () => assets) };
  const journalEntryRepo = {
    findDebitsBySourcePrefix: jest.fn(async (_s: unknown, _t: string, prefix: string, _st: unknown, to: Date) =>
      Object.entries(quotas)
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, v]) => {
          const [y, m] = k.slice(prefix.length).split('-').map(Number);
          return { id: `je-${k}`, sourceId: k, date: new Date(Date.UTC(y, m, 0)), debitCents: v, debitAccountIds: [acc] };
        })
        .filter((q) => q.date <= to),
    ),
  };
  return { reader: new FixedAssetParteBReader(assetRepo as never, journalEntryRepo as never), assetRepo, journalEntryRepo };
}
const meses = (id: string, de: [number, number], ate: [number, number], v: bigint) => {
  const out: Record<string, bigint> = {};
  for (let y = de[0], m = de[1]; y < ate[0] || (y === ate[0] && m <= ate[1]); m === 12 ? ((y += 1), (m = 1)) : (m += 1)) out[`${id}:${y}-${String(m).padStart(2, '0')}`] = v;
  return out;
};

describe('FixedAssetParteBReader.listForParteB (E15)', () => {
  it('E15/E20: só override, residual > 0 ou benfeitoria com nBook < nFiscal; o bem default e a benfeitoria curta ficam de fora', async () => {
    const { reader } = build([
      bem({ id: 'default', code: 'DEFAULT' }),
      bem({ id: 'override', code: 'OVR', bookAnnualRateBp: 2000 }),
      bem({ id: 'residual', code: 'RES', residualValueCents: 10_000n }),
      bem({ id: 'benf-longa', code: 'BL', class: BENF, leaseEndDate: d('2039-12-31') }), // 180 meses × vida 120
      bem({ id: 'benf-curta', code: 'BC', class: BENF, leaseEndDate: d('2026-12-31') }), // 24 meses = nBook = nFiscal
    ]);
    expect((await reader.listForParteB(scope, 2025, 'T01')).map((r) => r.code)).toEqual(['OVR', 'RES', 'BL']);
  });

  it('E21: benfeitoria 15 anos, taxa 10%, base 18.000 — T01: contábil postado 450, fiscal 300 (nFiscal = 180), nada antes', async () => {
    const id = 'benf';
    const { reader } = build([bem({ id, class: BENF, costCents: 18_000n, leaseEndDate: d('2039-12-31') })], meses(id, [2025, 1], [2025, 3], 150n), 'acc-amort');
    const [r] = await reader.listForParteB(scope, 2025, 'T01');
    expect(r).toMatchObject({ fiscalQuotaCents: 300n, bookQuotaCents: 450n, priorDiffCents: 0n, disposedInPeriod: false });
    expect(r.quotaEntries).toEqual([
      { id: 'je-benf:2025-01', debitAccountIds: ['acc-amort'] },
      { id: 'je-benf:2025-02', debitAccountIds: ['acc-amort'] },
      { id: 'je-benf:2025-03', debitAccountIds: ['acc-amort'] },
    ]);
  });

  it('E16: fiscal = taxa do Anexo sobre o CUSTO (nunca a contábil, nunca menos o residual); saldo do bem = fiscal − (abertura + quotas antes do período)', async () => {
    const id = 'ovr';
    const { reader } = build(
      [bem({ id, activatedAt: d('2024-01-01'), bookAnnualRateBp: 2000, residualValueCents: 20_000n, openingAccumulatedCents: 500n })],
      { ...meses(id, [2024, 1], [2024, 12], 2000n), ...meses(id, [2025, 1], [2025, 3], 2000n) },
    );
    const [r] = await reader.listForParteB(scope, 2025, 'T01');
    // fiscal: 120.000 × 10% ÷ 12 = 1.000/mês ⇒ T01 = 3.000; acumulado em 2024 = 12.000; contábil antes = 500 + 24.000
    expect(r).toMatchObject({ fiscalQuotaCents: 3_000n, bookQuotaCents: 6_000n, priorDiffCents: 12_000n - 24_500n });
    expect(r.quotaEntries).toHaveLength(3);
  });

  it('bem baixado no período: fiscal até o MÊS da baixa e disposedInPeriod; fiscal capado no custo', async () => {
    const { reader } = build([
      bem({ id: 'baixa', code: 'BX', bookAnnualRateBp: 2000, status: 'DISPOSED', disposedAt: d('2025-02-15') }),
      bem({ id: 'velho', code: 'VL', activatedAt: d('2015-01-01'), bookAnnualRateBp: 500, status: 'ACTIVE' }), // fiscal 10% esgotou em 2024
    ]);
    const [bx, vl] = await reader.listForParteB(scope, 2025, 'T01');
    expect(bx).toMatchObject({ fiscalQuotaCents: 2_000n, disposedInPeriod: true });
    expect(vl).toMatchObject({ fiscalQuotaCents: 0n, priorDiffCents: 120_000n });
  });

  it('review D1: bem baixado DEPOIS do período conta como vivo nele — fiscal até o fim do período e sem realização', async () => {
    const { reader } = build([bem({ id: 'depois', bookAnnualRateBp: 2000, status: 'DISPOSED', disposedAt: d('2025-04-20') })]);
    const [r] = await reader.listForParteB(scope, 2025, 'T01');
    expect(r).toMatchObject({ fiscalQuotaCents: 3_000n, disposedInPeriod: false });
  });

  it('A00 cobre o ano; período fora da Parte B (A05) é 400', async () => {
    expect(parteBWindow(2025, 'A00')).toEqual({ from: d('2025-01-01'), to: d('2025-12-31') });
    expect(parteBWindow(2025, 'T04')).toEqual({ from: d('2025-10-01'), to: d('2025-12-31') });
    const { reader, assetRepo } = build([bem({ bookAnnualRateBp: 2000 })]);
    const [r] = await reader.listForParteB(scope, 2025, 'A00');
    expect(r.fiscalQuotaCents).toBe(12_000n);
    expect(assetRepo.findForParteB).toHaveBeenCalledWith(scope, d('2025-01-01'), d('2025-12-31'), undefined);
    await expect(reader.listForParteB(scope, 2025, 'A05')).rejects.toBeInstanceOf(ValidationError);
  });
});
