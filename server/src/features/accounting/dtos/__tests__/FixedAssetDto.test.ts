/**
 * Contratos da C8 emenda 3.2, Parte 2 (BE-INCR-FIXED-ASSETS-EMENDA-3-2-brief.md §3.2): `kind` da classe (E9),
 * `amortizationExpenseAccountId` (F-EM-7 → b) e `leaseEndDate`/`leaseIndemnifiable` do ativo (E8b/E10, F-EM-6 → a).
 * A obrigatoriedade dos campos de locação depende da classe — é regra do serviço, não do DTO.
 */
import { CreateFixedAssetClassSchema, UpdateFixedAssetClassSchema } from '../FixedAssetClassDto';
import { CreateFixedAssetSchema, UpdateFixedAssetSchema } from '../FixedAssetDto';

const classBase = { unitId: 'unit-1', code: 'BENF', name: 'Benfeitorias', depreciable: true, costAccountId: 'acc-cost', accumulatedDepreciationAccountId: 'acc-acc' };
const assetBase = {
  unitId: 'unit-1', classId: 'class-1', code: 'B-1', description: 'Reforma', costCents: 1_200_000, acquiredAt: '2026-01-01', annualRateBp: 1000,
};

describe('FixedAssetClassDto — kind e amortizationExpenseAccountId (E9, F-EM-7 → b)', () => {
  it('kind ausente → DEPRECIATION (default, como a migração das linhas existentes)', () => {
    expect(CreateFixedAssetClassSchema.parse(classBase).kind).toBe('DEPRECIATION');
  });

  it('aceita AMORTIZATION_LEASEHOLD com a conta de amortização', () => {
    const parsed = CreateFixedAssetClassSchema.parse({ ...classBase, kind: 'AMORTIZATION_LEASEHOLD', amortizationExpenseAccountId: 'acc-amort' });
    expect([parsed.kind, parsed.amortizationExpenseAccountId]).toEqual(['AMORTIZATION_LEASEHOLD', 'acc-amort']);
  });

  it('L1 (dono, 26/10): AMORTIZATION_LEASEHOLD com depreciable=false → erro', () => {
    const r = CreateFixedAssetClassSchema.safeParse({ ...classBase, depreciable: false, kind: 'AMORTIZATION_LEASEHOLD', amortizationExpenseAccountId: 'acc-amort' });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path.join('.'))).toContain('depreciable');
  });

  it('L2 (dono, 26/10): AMORTIZATION_LEASEHOLD sem amortizationExpenseAccountId → erro; conta em DEPRECIATION → erro', () => {
    const sem = CreateFixedAssetClassSchema.safeParse({ ...classBase, kind: 'AMORTIZATION_LEASEHOLD' });
    expect(sem.success).toBe(false);
    expect(sem.error!.issues.map((i) => i.path.join('.'))).toContain('amortizationExpenseAccountId');
    const sobra = CreateFixedAssetClassSchema.safeParse({ ...classBase, amortizationExpenseAccountId: 'acc-amort' });
    expect(sobra.success).toBe(false);
    expect(sobra.error!.issues.map((i) => i.path.join('.'))).toContain('amortizationExpenseAccountId');
  });

  it('kind fora do enum → erro', () => {
    expect(CreateFixedAssetClassSchema.safeParse({ ...classBase, kind: 'AMORTIZATION' }).success).toBe(false);
  });

  it('update parcial sem kind NÃO reaplica default (memória zod4-partial-aplica-default-reseta-campo)', () => {
    const parsed = UpdateFixedAssetClassSchema.parse({ unitId: 'unit-1', classId: 'class-1', name: 'x' });
    expect('kind' in parsed).toBe(false);
    expect(UpdateFixedAssetClassSchema.parse({ unitId: 'unit-1', classId: 'class-1', amortizationExpenseAccountId: null }).amortizationExpenseAccountId).toBeNull();
  });
});

describe('FixedAssetDto — leaseEndDate e leaseIndemnifiable (E8b, E10)', () => {
  it('leaseEndDate é date-only validado de calendário (2027-02-30 → erro, não rola para março)', () => {
    expect(CreateFixedAssetSchema.safeParse({ ...assetBase, leaseEndDate: '2027-02-30' }).success).toBe(false);
    expect(CreateFixedAssetSchema.safeParse({ ...assetBase, leaseEndDate: '2027-02-28', leaseIndemnifiable: false }).success).toBe(true);
  });

  it('leaseIndemnifiable não tem default — ausente continua ausente (o silêncio não vira false)', () => {
    expect(CreateFixedAssetSchema.parse(assetBase).leaseIndemnifiable).toBeUndefined();
  });

  it('update aceita null nos dois campos (sair de uma classe de benfeitoria ainda em rascunho)', () => {
    const parsed = UpdateFixedAssetSchema.parse({ unitId: 'unit-1', assetId: 'a-1', leaseEndDate: null, leaseIndemnifiable: null });
    expect([parsed.leaseEndDate, parsed.leaseIndemnifiable]).toEqual([null, null]);
  });
});
