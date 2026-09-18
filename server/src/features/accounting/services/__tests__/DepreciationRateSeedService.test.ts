/**
 * DepreciationRateSeedService — seed LAZY do Anexo III (BE-INCR-FIXED-ASSETS, item 3). Unit: o
 * repositório é dublê; o que se prova é a IDEMPOTÊNCIA (2ª chamada = 0 inserts) e que o seed lê o
 * fixture inteiro (222 linhas: 220 do Anexo + 2 Notas).
 */
import { DepreciationRateSeedService } from '@/features/accounting/services/DepreciationRateSeedService';
import type { IDepreciationRateRepository } from '@/features/accounting/repositories/IDepreciationRateRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';

const scope = resolveAccountingScope({ userId: 'dono-a' }, 'unit-1');

function build(hasAnexoSeed: boolean) {
  const createMany = jest.fn(async (rows: unknown[]) => rows.length);
  const hasAnexoSeedFn = jest.fn(async () => hasAnexoSeed);
  const repo = { createMany, hasAnexoSeed: hasAnexoSeedFn } as unknown as IDepreciationRateRepository;
  return { service: new DepreciationRateSeedService(repo), createMany, hasAnexoSeedFn };
}

describe('DepreciationRateSeedService.seed', () => {
  it('escopo novo: semeia as 222 linhas do fixture (220 Anexo + 2 Notas) numa chamada só', async () => {
    const { service, createMany, hasAnexoSeedFn } = build(false);
    await service.seed(scope);
    expect(hasAnexoSeedFn).toHaveBeenCalledWith(scope);
    expect(createMany).toHaveBeenCalledTimes(1);
    const rows = createMany.mock.calls[0][0] as Array<{ userId: string; unitId: string; source: string }>;
    expect(rows).toHaveLength(222);
    expect(rows.every((r) => r.userId === 'dono-a' && r.unitId === 'unit-1')).toBe(true);
    expect(rows.filter((r) => r.source === 'ANEXO_III_IN_1700_2017')).toHaveLength(220);
    expect(rows.filter((r) => r.source.startsWith('ANEXO_III_NOTA'))).toHaveLength(2);
  });

  it('escopo já semeado: 2ª chamada é 0 inserts (idempotente, ASSERE createMany nunca chamado)', async () => {
    const { service, createMany } = build(true);
    await service.seed(scope);
    expect(createMany).not.toHaveBeenCalled();
  });
});
