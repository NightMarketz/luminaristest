/**
 * EFICIENCIA-FISCAL PR-1 itens 6, 8 e 10 (BRIEF §3; ADR-INCR-EFICIENCIA-FISCAL D4.2, D5, D6, I-4b) — guarda fiscal da venda
 * sobre o repositório do DynamicTable (falso aqui; a montagem da NFS-e tem a sua suíte).
 */
jest.mock('../../../../lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

import { SaleFiscalGuardService } from '../SaleFiscalGuardService';
import { POLITICA_PADRAO } from '../../../accounting/models/taxOptimization';
import type { AccountingScope } from '../../../accounting/scope/AccountingScope';

const scope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', timeZone: 'America/Sao_Paulo' } as unknown as AccountingScope;

type Row = { id: string; dynamicTableId: string; data: Record<string, unknown> };
function build(opts: {
  sale?: Record<string, unknown>;
  items: Array<Record<string, unknown> & { id: string }>;
  inventory?: Record<string, { qtyOnHand: number; totalValueCents: bigint }>;
  politica?: Partial<typeof POLITICA_PADRAO>;
  contador?: boolean;
  carga?: Record<string, number>;
}) {
  const sale: Row = { id: 'sale-1', dynamicTableId: 'sales-t', data: { unitId: 'unit-1', status: 'Finalized', date: '2026-10-20', discountAmount: 0, ...opts.sale } };
  const rows: Row[] = opts.items.map(({ id, ...data }) => ({ id, dynamicTableId: 'items-t', data: { saleId: 'sale-1', ...data } }));
  const repository = {
    findTableByInternalName: jest.fn(async (_u: string, name: string) => ({ id: name === 'sales' ? 'sales-t' : 'items-t' })),
    findDataById: jest.fn(async (id: string) => (id === 'sale-1' ? sale : rows.find((r) => r.id === id) ?? null)),
    findRowsByFieldValue: jest.fn(async () => rows),
  };
  const dynamicTableService = {
    updateTableData: jest.fn(async (_u: unknown, id: string, dto: { data: Record<string, unknown> }) => {
      const row = rows.find((r) => r.id === id)!;
      await Promise.resolve();
      row.data = { ...row.data, ...dto.data };
      return row;
    }),
  };
  const writeEffects = { afterDataWrite: jest.fn() };
  const inventoryRepo = {
    findByProductRef: jest.fn(async (_s: AccountingScope, ref: string) => {
      const i = opts.inventory?.[ref];
      return i ? ({ qtyOnHand: i.qtyOnHand, totalValueCents: i.totalValueCents } as never) : null;
    }),
  };
  const tax = {
    politicaVigente: jest.fn(async () => ({ ...POLITICA_PADRAO, ...opts.politica })),
    custosDeServicoVigentes: jest.fn(async () => new Map()),
    hasActiveAccountant: jest.fn(async () => opts.contador ?? false),
    proposeSystem: jest.fn(async () => 'sug-1'),
    aceita: jest.fn(async () => false),
    auditGuardBlocked: jest.fn(async () => undefined),
    assertCanCheckSale: jest.fn(),
  };
  const carga = opts.carga;
  const svc = new SaleFiscalGuardService(
    dynamicTableService as never,
    repository as never,
    writeEffects,
    inventoryRepo,
    tax,
    carga ? (i) => carga[i.productRef ?? i.serviceRef ?? ''] ?? null : undefined,
  );
  return { svc, dynamicTableService, tax, writeEffects, repository, rows };
}

const combo = [
  { id: 'a', serviceId: 'srv-1', quantity: 1, unitPrice: 100, catalogUnitPrice: 100 },
  { id: 'b', productId: 'prod-1', quantity: 1, unitPrice: 100, catalogUnitPrice: 100 },
];

describe('SaleFiscalGuardService.check', () => {
  it('legado (desconto só no cabeçalho): rateio proporcional calculado pelo fiscal-check + aviso DESCONTO_FORA_DO_DOCUMENTO', async () => {
    const { svc } = build({ sale: { discountAmount: 40, discountKind: 'UNCONDITIONAL' }, items: combo, inventory: { 'prod-1': { qtyOnHand: 10, totalValueCents: 60_000n } } });
    const r = await svc.check(scope, 'sale-1');
    expect(r.criterio).toBe('PROPORCIONAL_CATALOGO');
    expect(r.alocacao).toEqual([
      { itemRef: 'a', discountCents: 2_000n, pisoCents: null, cargaBp: null },
      { itemRef: 'b', discountCents: 2_000n, pisoCents: 6_000n, cargaBp: null },
    ]);
    expect(r.violations.map((v) => v.code).sort()).toEqual(['DESCONTO_FORA_DO_DOCUMENTO', 'SEM_CUSTO']);
    expect(r.ok).toBe(true); // WARN não bloqueia
  });

  it('I-4b: custo do produto gravado na 1ª verificação depois do finalize, por escrita isSystem só dessa coluna', async () => {
    const { svc, dynamicTableService, writeEffects } = build({ items: combo, inventory: { 'prod-1': { qtyOnHand: 4, totalValueCents: 25_000n } } });
    await svc.check(scope, 'sale-1');
    expect(dynamicTableService.updateTableData).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }), 'b', { data: { custoSnapshotCents: 6_250 } }, { isSystem: true });
    expect(writeEffects.afterDataWrite).toHaveBeenCalledWith('u1');
  });

  it('I-4b: custo já gravado não é recalculado; venda em rascunho não grava', async () => {
    const gravado = build({ items: [combo[0], { ...combo[1], custoSnapshotCents: 5_000 }], inventory: { 'prod-1': { qtyOnHand: 1, totalValueCents: 99_000n } } });
    const r = await gravado.svc.check(scope, 'sale-1');
    expect(gravado.dynamicTableService.updateTableData).not.toHaveBeenCalled();
    expect(r.alocacao.find((a) => a.itemRef === 'b')!.pisoCents).toBe(5_000n);

    const rascunho = build({ sale: { status: 'Draft' }, items: combo, inventory: { 'prod-1': { qtyOnHand: 1, totalValueCents: 6_000n } } });
    await rascunho.svc.check(scope, 'sale-1');
    expect(rascunho.dynamicTableService.updateTableData).not.toHaveBeenCalled();
  });

  it('preço ≠ catálogo ⇒ BLOCK, ok=false; na emissão a trilha registra sale.fiscal_guard.blocked', async () => {
    const { svc, tax } = build({ items: [{ ...combo[0], unitPrice: 90 }] });
    const r = await svc.check(scope, 'sale-1', { forEmission: true });
    expect(r.ok).toBe(false);
    expect(tax.auditGuardBlocked).toHaveBeenCalledWith(scope, 'sale-1', 'PROPORCIONAL_CATALOGO', ['PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO']);
  });

  it('venda de outra unidade ⇒ NotFound (o escopo é a unidade da venda)', async () => {
    const { svc } = build({ sale: { unitId: 'outra' }, items: combo });
    await expect(svc.check(scope, 'sale-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('política CARGA sem carga por item ⇒ proporcional + ORDEM_DE_CARGA_INDETERMINADA (D5)', async () => {
    const { svc } = build({
      sale: { discountAmount: 40, discountKind: 'UNCONDITIONAL' },
      items: combo,
      politica: { criterioAlocacao: 'CARGA_TRIBUTARIA' },
      inventory: { 'prod-1': { qtyOnHand: 1, totalValueCents: 6_000n } },
    });
    const r = await svc.check(scope, 'sale-1');
    expect(r.criterio).toBe('PROPORCIONAL_CATALOGO');
    expect(r.violations.map((v) => v.code)).toContain('ORDEM_DE_CARGA_INDETERMINADA');
  });
});

describe('review do #913', () => {
  it('F1: persistSnapshot=false (prévia da NFS-e) não grava o custo nem audita, mesmo com BLOCK', async () => {
    const { svc, dynamicTableService, tax } = build({ items: [{ ...combo[1], unitPrice: 90 }], inventory: { 'prod-1': { qtyOnHand: 1, totalValueCents: 6_000n } } });
    const r = await svc.check(scope, 'sale-1', { forEmission: false, persistSnapshot: false });
    expect(r.ok).toBe(false);
    expect(dynamicTableService.updateTableData).not.toHaveBeenCalled();
    expect(tax.auditGuardBlocked).not.toHaveBeenCalled();
  });

  it('F3: duas verificações concorrentes gravam o custo UMA vez e ambas usam o mesmo valor', async () => {
    const inv = { 'prod-1': { qtyOnHand: 1, totalValueCents: 6_000n } };
    const { svc, dynamicTableService } = build({ items: combo, inventory: inv });
    const [a, b] = await Promise.all([svc.check(scope, 'sale-1'), svc.check(scope, 'sale-1')]);
    expect(dynamicTableService.updateTableData).toHaveBeenCalledTimes(1);
    expect(a.alocacao.find((x) => x.itemRef === 'b')!.pisoCents).toBe(6_000n);
    expect(b.alocacao.find((x) => x.itemRef === 'b')!.pisoCents).toBe(6_000n);
  });

  it('F3: se o plugin recusa (CUSTO_JA_GRAVADO), o guard relê e usa o custo gravado', async () => {
    const { svc, dynamicTableService, rows } = build({ items: combo, inventory: { 'prod-1': { qtyOnHand: 1, totalValueCents: 9_900n } } });
    dynamicTableService.updateTableData.mockImplementationOnce(async () => {
      rows.find((r) => r.id === 'b')!.data.custoSnapshotCents = 6_000;
      throw Object.assign(new Error('CUSTO_JA_GRAVADO'), { errorCode: 'CUSTO_JA_GRAVADO' });
    });
    const r = await svc.check(scope, 'sale-1');
    expect(r.alocacao.find((x) => x.itemRef === 'b')!.pisoCents).toBe(6_000n);
  });

  it('peso = catálogo × quantidade, o mesmo das pontes contábeis (razão/subrazão/DPS)', async () => {
    const { svc } = build({
      sale: { discountAmount: 30, discountKind: 'UNCONDITIONAL' },
      items: [
        { id: 'a', serviceId: 'srv-1', quantity: 3, unitPrice: 100, catalogUnitPrice: 100 },
        { id: 'b', productId: 'prod-1', quantity: 2, unitPrice: 100, catalogUnitPrice: 100 },
      ],
    });
    const r = await svc.check(scope, 'sale-1');
    // pesos 300 (serviço × 3) e 200 (produto × 2) ⇒ R$ 18 e R$ 12
    expect(r.alocacao.map((x) => x.discountCents)).toEqual([1_800n, 1_200n]);
  });

  it('F6: com a venda já lida pelo chamador, não relê a venda', async () => {
    const { svc, repository } = build({ items: combo });
    await svc.check(scope, 'sale-1', { sale: { unitId: 'unit-1', status: 'Finalized', date: '2026-10-20', discountAmount: 0 } });
    expect(repository.findDataById).not.toHaveBeenCalledWith('sale-1');
  });
});

describe('item 8 — sugestão CRITERIO_CARGA por unidade', () => {
  const venda = { sale: { discountAmount: 40, discountKind: 'UNCONDITIONAL' }, items: combo, inventory: { 'prod-1': { qtyOnHand: 1, totalValueCents: 6_000n } }, carga: { 'srv-1': 1_500, 'prod-1': 600 } };

  it('com contador ACTIVE: grava (ou reaproveita) a sugestão da UNIDADE e devolve o id', async () => {
    const { svc, tax } = build({ ...venda, contador: true });
    // serviço sem piso ⇒ não passa da cota proporcional; economia vem só se a carga mover desconto — aqui o piso do
    // serviço é nulo, então a carga dá a mesma alocação: sem economia, sem sugestão.
    const semPiso = await svc.check(scope, 'sale-1');
    expect(semPiso.economiaPotencialCents).toBe(0n);
    expect(tax.proposeSystem).not.toHaveBeenCalled();

    tax.custosDeServicoVigentes.mockResolvedValue(new Map([['srv-1', { custoCents: null, catalogoMinimoCents: 7_000n }]]) as never);
    const r = await svc.check(scope, 'sale-1');
    expect(r.economiaPotencialCents).toBe(90n);
    expect(r.suggestionId).toBe('sug-1');
    expect(tax.proposeSystem).toHaveBeenCalledWith(scope, expect.objectContaining({ practice: 'CRITERIO_CARGA', subjectType: 'UNIT', subjectId: 'unit-1', estimatedSavingCents: 90n }));
  });

  it('sem contador: devolve o número com o aviso CRITERIO_CARGA_EXIGE_CONTADOR e não grava', async () => {
    const { svc, tax } = build({ ...venda, contador: false });
    tax.custosDeServicoVigentes.mockResolvedValue(new Map([['srv-1', { custoCents: null, catalogoMinimoCents: 7_000n }]]) as never);
    const r = await svc.check(scope, 'sale-1');
    expect(r.economiaPotencialCents).toBe(90n);
    expect(r.suggestionId).toBeNull();
    expect(tax.proposeSystem).not.toHaveBeenCalled();
    expect(r.violations).toContainEqual(expect.objectContaining({ code: 'CRITERIO_CARGA_EXIGE_CONTADOR', severity: 'WARN' }));
  });
});

describe('item 10 — kit', () => {
  it('kit com naturezas diferentes sem principal ⇒ KIT_SEM_PRINCIPAL (WARN)', async () => {
    const { svc } = build({ items: combo.map((c) => ({ ...c, kitRef: 'kit-1' })) });
    const r = await svc.check(scope, 'sale-1');
    expect(r.violations).toContainEqual(expect.objectContaining({ code: 'KIT_SEM_PRINCIPAL', severity: 'WARN' }));
    expect(r.ok).toBe(true);
  });
});
