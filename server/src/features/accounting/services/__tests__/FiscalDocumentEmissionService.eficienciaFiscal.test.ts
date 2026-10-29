/**
 * EFICIENCIA-FISCAL PR-1 item 6 + F-EF-16 a (BRIEF §3; ADR-INCR-EFICIENCIA-FISCAL D4.2, §12; D-2026-10-22-EFICIENCIA-
 * FISCAL-FORKS) — a guarda fiscal é pré-condição da NFS-e (BLOCK vira pendência do 400 `emissao_bloqueada`, WARN não
 * bloqueia) e o desconto incondicional por item é destacado em `vDescIncond`, com Σ (vServ − vDescIncond) = crédito 3.1.
 * Mesmo arnês de `FiscalDocumentEmissionService.test.ts` (repositório do DynamicTable pela factory falsa).
 */
const findTableByInternalName = jest.fn();
const findDataById = jest.fn();
const existsByIdInTable = jest.fn();
const findRowsByFieldValue = jest.fn();

jest.mock('../../../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({
    getDynamicTableRepository: () => ({ findTableByInternalName, findDataById, existsByIdInTable, findRowsByFieldValue }),
    getPackageBalanceService: () => ({ getExpiryContext: jest.fn() }),
  }),
}));

import { FiscalDocumentEmissionService } from '../FiscalDocumentEmissionService';
import type { AccountingScope } from '../../scope/AccountingScope';
import { legalParamsSemente } from '@test/helpers/legalParams';

const SCOPE: AccountingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };
const SALE_ID = 'sale-1';
const hoje = () => new Date().toISOString().slice(0, 10);

const perfil = {
  unitId: 'unit-1', regimeTributario: 'PRESUMIDO', codMun: '3550308', dpsSerie: 1, regEspTrib: 0, regApTribSN: null, issAliquotaBp: null,
  issRetidoTomadorPj: false, pacoteFatoGerador: 'CONSUMO', ibsCbsInformar: false, ibsCbsCst: null, ibsCbsClassTrib: null,
  pTotTribFedCent: 1000, pTotTribEstCent: 500, pTotTribMunCent: 200, pTotTribSNCent: null, emissaoForaDoMes: 'AVISAR',
  d1fConfirmado: true, emissao: { completo: true, faltantes: [], pendingExternalValidation: [], opSimpNac: 1 }, updatedAt: new Date().toISOString(),
};

function arrange(sale: Record<string, unknown>, items: Array<Record<string, unknown>>) {
  findTableByInternalName.mockImplementation(async (_u: string, name: string) => ({ id: `tbl-${name}` }));
  existsByIdInTable.mockResolvedValue(true);
  findRowsByFieldValue.mockResolvedValue(items.map((data, i) => ({ id: `it-${i}`, data })));
  findDataById.mockImplementation(async (id: string) => {
    if (id === SALE_ID) return { id, dynamicTableId: 'tbl-sales', data: { status: 'Finalized', unitId: 'unit-1', customerId: 'c1', date: hoje(), ...sale } };
    if (id === 'c1') return { id, data: { name: 'Cliente', taxId: '11144477735' } };
    if (id === 'unit-1') return { id, data: { cnpj: '11222333000181' } };
    return null;
  });
}

function makeService(guardViolations: Array<{ code: string; severity: string; legalBasis: string }> | null, credit31: bigint) {
  const repo = {
    findLiveBySale: jest.fn().mockResolvedValue([]),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };
  const guard = guardViolations === null ? undefined : { check: jest.fn(async () => ({ violations: guardViolations })) };
  const service = new FiscalDocumentEmissionService(
    repo as never,
    { findByCode: jest.fn(async (_s: unknown, code: string) => ({ id: `acc-${code}`, code })) } as never,
    { findBySource: jest.fn().mockResolvedValue({ id: 'entry-1', postings: [{ accountId: 'acc-3.1', debitCents: 0n, creditCents: credit31 }] }) } as never,
    { get: jest.fn().mockResolvedValue(perfil) } as never,
    { get: jest.fn(async (_s: unknown, ref: string) => ({ cTribNac: ref === 'srv-B' ? '060201' : '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null })) } as never,
    { canEmitFiscalDocument: () => true, canReadFiscalDocument: () => true } as never,
    { append: jest.fn() } as never,
    legalParamsSemente,
    { list: jest.fn().mockResolvedValue([]) } as never, // productFiscalProfileService (X10a) — fora da NFS-e
    guard,
  );
  return { service, guard };
}

describe('guarda fiscal como pré-condição da NFS-e (item 6)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
    arrange({ totalAmount: 100 }, [{ serviceId: 'srv-A', quantity: 1, unitPrice: 100 }]);
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('BLOCK ⇒ pendência `fiscal_guard: <código> (<base legal>)` no 400 emissao_bloqueada existente', async () => {
    const { service, guard } = makeService([{ code: 'ITEM_ACIMA_DO_CATALOGO', severity: 'BLOCK', legalBasis: 'CTN art. 148' }], 10_000n);
    const r = await service.preview(SCOPE, SALE_ID, 'NFSE');
    expect(r.ok).toBe(false);
    expect(r.faltantes).toContain('fiscal_guard: ITEM_ACIMA_DO_CATALOGO (CTN art. 148)');
    // Review do #913: a prévia não grava custo nem trilha; recebe a venda já lida (sem reler).
    expect(guard!.check).toHaveBeenCalledWith(SCOPE, SALE_ID, {
      forEmission: false,
      persistSnapshot: false,
      sale: expect.objectContaining({ status: 'Finalized', unitId: 'unit-1' }),
    });
  });

  it('WARN não bloqueia a emissão', async () => {
    const { service } = makeService([{ code: 'SEM_CUSTO', severity: 'WARN', legalBasis: 'CTN art. 148' }], 10_000n);
    expect((await service.preview(SCOPE, SALE_ID, 'NFSE')).ok).toBe(true);
  });

  it('venda de outra unidade (NotFound da guarda) vira pendência nomeada, não 500', async () => {
    const { service, guard } = makeService([], 10_000n);
    const { NotFoundError } = jest.requireActual('../../../../lib/errors');
    guard!.check.mockRejectedValueOnce(new NotFoundError("Sale 'sale-1' não foi encontrada."));
    const r = await service.preview(SCOPE, SALE_ID, 'NFSE');
    expect(r.faltantes).toContain("fiscal_guard: Sale 'sale-1' não foi encontrada.");
  });
  // "Venda sem documento não passa pela guarda" (ADR §12) é estrutural: o único chamador da guarda fora da rota é esta
  // montagem — o finalize (SalesPlugin) não a importa (I-12, teste de fronteira de rules/plugins/**).
});

describe('F-EF-16 a — vDescIncond destacado por grupo, tie-out Σ (vServ − vDescIncond) = crédito 3.1', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  // Dois grupos: A = 2 linhas de R$ 100 (desconto R$ 30,01) e B R$ 100 (desconto R$ 9,99) ⇒ crédito 3.1 = R$ 260,00.
  // Serviço conta quantidade 1 (convenção do subtotal), então o grupo A tem duas linhas.
  const itens = [
    { serviceId: 'srv-A', quantity: 1, unitPrice: 100, catalogUnitPrice: 100, discountCents: 1_500 },
    { serviceId: 'srv-A', quantity: 1, unitPrice: 100, catalogUnitPrice: 100, discountCents: 1_501 },
    { serviceId: 'srv-B', quantity: 1, unitPrice: 100, catalogUnitPrice: 100, discountCents: 999 },
  ];
  const valores = (p: { infDPS: { valores: { vServPrest: { vServ: string }; vDescCondIncond?: { vDescIncond?: string } } } }) => ({
    vServ: Math.round(parseFloat(p.infDPS.valores.vServPrest.vServ) * 100),
    vDesc: Math.round(parseFloat(p.infDPS.valores.vDescCondIncond?.vDescIncond ?? '0') * 100),
  });

  it('UNCONDITIONAL: vServ = catálogo do grupo, vDescIncond = Σ discountCents do grupo', async () => {
    arrange({ discountKind: 'UNCONDITIONAL', discountAmount: 40, totalAmount: 260 }, itens);
    const r = await makeService(null, 26_000n).service.preview(SCOPE, SALE_ID, 'NFSE');
    expect(r.ok).toBe(true);
    expect((r.payloads as unknown as Parameters<typeof valores>[0][]).map(valores)).toEqual([
      { vServ: 20_000, vDesc: 3_001 },
      { vServ: 10_000, vDesc: 999 },
    ]);
    expect(r.tieOut).toEqual({ vServCents: '26000', ledgerCents: '26000', matches: true });
  });

  it('CONDITIONAL: sem destaque (o condicional não abate a base) — vServ = parcela do crédito pelo peso bruto', async () => {
    arrange({ discountKind: 'CONDITIONAL', discountAmount: 40, totalAmount: 260 }, itens);
    const r = await makeService(null, 26_000n).service.preview(SCOPE, SALE_ID, 'NFSE');
    expect((r.payloads as unknown as Parameters<typeof valores>[0][]).map(valores)).toEqual([
      { vServ: 17_333, vDesc: 0 },
      { vServ: 8_667, vDesc: 0 },
    ]);
    expect(r.tieOut.matches).toBe(true);
  });
});
