/**
 * EFICIENCIA-FISCAL PR-1 item 9 + F-EF-15 a (BRIEF §3; D-2026-10-22-EFICIENCIA-FISCAL-FORKS; ADR I-4) — com desconto
 * INCONDICIONAL destacado por item, o razão (`revenueByNature` → `splitRevenueCredit`) e a subrazão (`ratearReceita`) usam
 * o MESMO peso líquido e fecham entre si; CONDITIONAL e venda legada seguem no peso bruto.
 */
const findTableByInternalName = jest.fn();
const findRowsByFieldValue = jest.fn();
const findDataById = jest.fn();

jest.mock('../../../../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({ getDynamicTableRepository: () => ({ findTableByInternalName, findRowsByFieldValue, findDataById }) }),
}));

import { loadSalePackageInfo, loadSaleRevenueLines, loadSaleServiceLines } from '../saleItems';
import { ratearReceita } from '../../../services/ReceitaFiscalService';
import { splitRevenueCredit } from '../../mappers/revenueSplit';

// Combo: serviço catálogo R$ 100 (desconto R$ 30) + produto R$ 100 (desconto R$ 10) ⇒ total R$ 160.
const itens = [
  { id: 'a', data: { serviceId: 'srv-1', quantity: 1, unitPrice: 100, catalogUnitPrice: 100, discountCents: 3_000 } },
  { id: 'b', data: { productId: 'prod-1', quantity: 1, unitPrice: 100, catalogUnitPrice: 100, discountCents: 1_000 } },
];
function venda(discountKind: 'UNCONDITIONAL' | 'CONDITIONAL' | null) {
  findTableByInternalName.mockImplementation(async (_u: string, name: string) => ({ id: `${name}-t` }));
  findRowsByFieldValue.mockResolvedValue(itens);
  findDataById.mockResolvedValue({ id: 's1', dynamicTableId: 'sales-t', data: { discountKind, discountAmount: 40, totalAmount: 160 } });
}
const somaNat = (r: ReturnType<typeof ratearReceita>, n: string) => r.filter((x) => x.natureza === n).reduce((s, x) => s + x.receitaCents, 0);

describe('peso da receita por item (F-EF-15 a)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('UNCONDITIONAL: razão e subrazão no peso líquido (R$ 70 serviço × R$ 90 produto) e Σ subrazão = crédito do razão', async () => {
    venda('UNCONDITIONAL');
    const info = await loadSalePackageInfo('u1', 's1');
    expect(info.revenueByNature).toEqual({ serviceReais: 70, productReais: 90 });
    const razao = splitRevenueCredit(16_000, info.revenueByNature);
    expect(razao).toEqual([
      { accountCode: '3.1', debitCents: 0, creditCents: 7_000 },
      { accountCode: '3.3', debitCents: 0, creditCents: 9_000 },
    ]);
    const sub = ratearReceita(160, await loadSaleRevenueLines('u1', 's1'));
    expect([somaNat(sub, 'SERVICO'), somaNat(sub, 'REVENDA')]).toEqual([7_000, 9_000]);
  });

  it('CONDITIONAL: peso bruto (R$ 100 × R$ 100) — o condicional não é destacado por item (I-4)', async () => {
    venda('CONDITIONAL');
    expect((await loadSalePackageInfo('u1', 's1')).revenueByNature).toEqual({ serviceReais: 100, productReais: 100 });
    const sub = ratearReceita(160, await loadSaleRevenueLines('u1', 's1'));
    expect([somaNat(sub, 'SERVICO'), somaNat(sub, 'REVENDA')]).toEqual([8_000, 8_000]);
  });

  it('venda legada (sem discountCents nos itens): bruto e nenhuma leitura do cabeçalho', async () => {
    findTableByInternalName.mockResolvedValue({ id: 'items-t' });
    findRowsByFieldValue.mockResolvedValue([{ id: 'a', data: { serviceId: 'srv-1', quantity: 1, unitPrice: 100 } }]);
    expect((await loadSalePackageInfo('u1', 's1')).revenueByNature).toEqual({ serviceReais: 100, productReais: 0 });
    expect(findDataById).not.toHaveBeenCalled();
  });

  it('review do #913: sem a coluna quantity o peso líquido não fica negativo (clamp em 0)', async () => {
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => ({ id: `${name}-t` }));
    findRowsByFieldValue.mockResolvedValue([
      { id: 'a', data: { serviceId: 'srv-1', unitPrice: 100, discountCents: 1_000 } },
      { id: 'b', data: { productId: 'prod-1', quantity: 2, unitPrice: 10 } },
    ]);
    findDataById.mockResolvedValue({ id: 's1', dynamicTableId: 'sales-t', data: { discountKind: 'UNCONDITIONAL' } });
    expect((await loadSalePackageInfo('u1', 's1')).revenueByNature).toEqual({ serviceReais: 0, productReais: 20 });
  });

  it('a linha de serviço da DPS carrega o desconto destacado do item (F-EF-16 a)', async () => {
    venda('UNCONDITIONAL');
    expect(await loadSaleServiceLines('u1', 's1')).toEqual([{ serviceRef: 'srv-1', description: '', quantity: 1, unitPrice: 100, discountCents: 3_000 }]);
  });
});
