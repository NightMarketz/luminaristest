// --- Mock the DynamicTable repository the assembler reads through (factory) — same pattern as
// saleItems.test.ts. `findDataById` is keyed by id across sales/customers/units rows in one map. ---
const findTableByInternalName = jest.fn();
const findDataById = jest.fn();
const existsByIdInTable = jest.fn();
const findRowsByFieldValue = jest.fn();
const getExpiryContext = jest.fn();

jest.mock('../../../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({
    getDynamicTableRepository: () => ({
      findTableByInternalName,
      findDataById,
      existsByIdInTable,
      findRowsByFieldValue,
    }),
    getPackageBalanceService: () => ({ getExpiryContext }),
  }),
}));

import { FiscalDocumentEmissionService } from '../FiscalDocumentEmissionService';
import { NullEmissor } from '../../dfe/NullEmissor';
import { SERVICE_REVENUE_ACCOUNT } from '../../sync/mappers/revenueSplit';
import type { AccountingScope } from '../../scope/AccountingScope';
import { PackageExpiryNfsePendingError } from '../../../../lib/errors';

import { legalParamsSemente } from '@test/helpers/legalParams';
const SCOPE: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

const SALES_TABLE = { id: 'tbl-sales', internalName: 'sales' };
const CUSTOMERS_TABLE = { id: 'tbl-customers', internalName: 'customers' };
const UNITS_TABLE = { id: 'tbl-units', internalName: 'units' };
const ITEMS_TABLE = { id: 'tbl-items', internalName: 'saleItems' };

const SALE_ID = 'sale-1';
const CUSTOMER_ID = 'cust-1';
const ANCHOR_ID = 'entry-1';

function todayDateOnly(): string {
  // scopeToday(scope) — usa o mesmo fuso do escopo; casa a fixture com "hoje" pra não disparar
  // emissaoForaDoMes por acidente no teste (classe teste-de-hoje-quebra-em-janela-utc).
  return new Date().toISOString().slice(0, 10);
}

function baseFiscalProfileView(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    unitId: 'unit-1',
    regimeTributario: 'PRESUMIDO',
    codMun: '3550308',
    dpsSerie: 1,
    regEspTrib: 0,
    regApTribSN: null,
    issAliquotaBp: null,
    issRetidoTomadorPj: false,
    pacoteFatoGerador: 'CONSUMO',
    ibsCbsInformar: false,
    ibsCbsCst: null,
    ibsCbsClassTrib: null,
    pTotTribFedCent: 1000,
    pTotTribEstCent: 500,
    pTotTribMunCent: 200,
    pTotTribSNCent: null,
    emissaoForaDoMes: 'AVISAR',
    d1fConfirmado: true,
    emissao: { completo: true, faltantes: [], pendingExternalValidation: [] },
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeService(opts: {
  fiscalProfile?: ReturnType<typeof baseFiscalProfileView> | null;
  serviceProfiles?: Record<string, { cTribNac: string; cTribMun: string | null; cNBS: string | null; cIndOp: string; cLocPrestacao: string | null }>;
  ledgerPostings?: Array<{ accountId: string; debitCents: bigint; creditCents: bigint }>;
  liveDocs?: Array<{ id: string; status: string; cTribNac: string }>;
  emitir?: jest.Mock;
  anchorSourceType?: string;
}) {
  const repo = {
    findBySaleKey: jest.fn().mockResolvedValue(null),
    findLiveBySale: jest.fn().mockResolvedValue(opts.liveDocs ?? []),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
    nextNumber: jest.fn().mockResolvedValue(1n),
    createSent: jest.fn(async (_scope: unknown, data: Record<string, unknown>) => ({
      id: 'doc-' + data.cTribNac,
      ...data,
      status: 'SENT',
      currentAttemptNo: 1,
      errorsJson: null,
      authorizedAt: null,
      cancelledAt: null,
      sourceDocumentId: null,
      vIssCents: null,
      vIbsCents: null,
      vCbsCents: null,
      attempts: [{ attemptNo: 1, ref: `doc-${data.cTribNac}:1`, payloadJson: JSON.stringify((data as { payloadJson: string }).payloadJson ? JSON.parse((data as { payloadJson: string }).payloadJson) : {}), sentAt: new Date(), resultStatus: null }],
    })),
    transition: jest.fn(),
    findById: jest.fn(),
    listBySale: jest.fn().mockResolvedValue([]),
    listByStatus: jest.fn().mockResolvedValue([]),
  };
  const accountRepo = {
    findByCode: jest.fn(async (_scope: unknown, code: string) => ({ id: `acc-${code}`, code })),
  };
  const journalEntryRepo = {
    findBySource: jest.fn().mockResolvedValue({ id: ANCHOR_ID, sourceType: opts.anchorSourceType ?? 'sale.finalized', postings: opts.ledgerPostings ?? [] }),
  };
  const fiscalProfileService = { get: jest.fn().mockResolvedValue(opts.fiscalProfile === undefined ? baseFiscalProfileView() : opts.fiscalProfile) };
  const serviceFiscalProfileService = {
    get: jest.fn(async (_scope: unknown, serviceRef: string) => {
      const p = opts.serviceProfiles?.[serviceRef];
      if (!p) throw new Error('not found');
      return p;
    }),
  };
  const policy = { canEmitFiscalDocument: () => true, canReadFiscalDocument: () => true };
  const auditService = { append: jest.fn() };

  const service = new FiscalDocumentEmissionService(
    repo as never,
    accountRepo as never,
    journalEntryRepo as never,
    fiscalProfileService as never,
    serviceFiscalProfileService as never,
    policy as never,
    auditService as never, legalParamsSemente,
  );
  return { service, repo, accountRepo, journalEntryRepo, fiscalProfileService, serviceFiscalProfileService, policy, auditService };
}

describe('FiscalDocumentEmissionService — tie-out (item 16, fixture MISTA)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'customers') return CUSTOMERS_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    existsByIdInTable.mockResolvedValue(true);
    findDataById.mockImplementation(async (id: string) => {
      if (id === SALE_ID) {
        return { id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', customerId: CUSTOMER_ID, date: todayDateOnly(), totalAmount: 375.44 } };
      }
      if (id === CUSTOMER_ID) {
        return { id: CUSTOMER_ID, data: { name: 'Cliente Teste', taxId: '11144477735' } }; // CPF válido (DV ok)
      }
      if (id === 'unit-1') {
        return { id: 'unit-1', data: { cnpj: '11222333000181' } }; // CNPJ válido (DV ok)
      }
      return null;
    });
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('splits the EXACT posted 3.1 credit across 2 cTribNac groups, sum exact, even with a discount that does not divide evenly', async () => {
    // Venda MISTA: 2 grupos de serviço com cTribNac distintos + 1 produto — o produto NÃO entra no
    // tie-out de serviço (vai para 3.3, outro posting, não somado aqui). Total líquido creditado em
    // 3.1 (já com desconto de header aplicado a montante, F-DFE-15 a): 375.44 -> 37544 centavos.
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 2, unitPrice: 100 } }, // peso 200
      { data: { serviceId: 'srv-B', type: 'Service', description: 'Escova', quantity: 1, unitPrice: 100 } }, // peso 100
      { data: { productId: 'prod-1', type: 'Product', quantity: 1, unitPrice: 50 } },
    ]);
    const { service, journalEntryRepo, accountRepo } = makeService({
      serviceProfiles: {
        'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null },
        'srv-B': { cTribNac: '060201', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null },
      },
      ledgerPostings: [
        { accountId: 'acc-3.1', debitCents: 0n, creditCents: 37544n }, // crédito líquido de serviço (já com desconto)
        { accountId: 'acc-3.3', debitCents: 0n, creditCents: 5000n }, // crédito de produto — fora do tie-out de serviço
      ],
    });

    const result = await service.preview(SCOPE, SALE_ID, 'NFSE');

    expect(result.ok).toBe(true);
    expect(result.payloads).toHaveLength(2); // um por cTribNac (F-DFE-16 b)
    const total = result.payloads.reduce((sum, p) => sum + Math.round(parseFloat(p.infDPS.valores.vServPrest.vServ) * 100), 0);
    expect(total).toBe(37544); // Σ vServCents dos N documentos == crédito 3.1 exato (nenhum centavo perdido)
    expect(result.tieOut.matches).toBe(true);
    expect(journalEntryRepo.findBySource).toHaveBeenCalledWith(SCOPE, 'sale.finalized', SALE_ID);
    expect(accountRepo.findByCode).toHaveBeenCalledWith(SCOPE, SERVICE_REVENUE_ACCOUNT);
  });

  // NOTA (revisão independente do PR-2): havia aqui um teste chamado "MUTATION TARGET" que mockava
  // `accountRepo.findByCode` diretamente — não exercitava `SERVICE_REVENUE_ACCOUNT` do código de
  // produção, então uma mutação real na constante o deixaria passando (falso positivo de proteção).
  // Removido: a proteção real contra essa classe de mutação é o teste acima ('splits the EXACT
  // posted 3.1 credit...'), confirmado por mutação de verdade no código-fonte durante a revisão.
});

describe('FiscalDocumentEmissionService — pré-condições (item 14, porta nunca chamada)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...process.env, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    existsByIdInTable.mockResolvedValue(true);
  });

  it('venda não Finalized -> 400 agregado, porta nunca tocada (spy)', async () => {
    findDataById.mockResolvedValue({ id: SALE_ID, data: { status: 'Draft', unitId: 'unit-1' } });
    findRowsByFieldValue.mockResolvedValue([]);
    const { service, repo } = makeService({});
    await expect(service.emit(SCOPE, SALE_ID, 'NFSE')).rejects.toThrow(/emissao_bloqueada/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  it('kind=NFE (Fase E pendente-insumo) recusa loud sem tocar a porta', async () => {
    const { service, repo } = makeService({});
    await expect(service.emit(SCOPE, SALE_ID, 'NFE')).rejects.toThrow(/nfe_nao_implementada/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  // As 6 pré-condições restantes (revisão independente do PR-2, achado MÉDIO) — cada uma prova,
  // com spy, que `repo.runTransaction` (logo `porta.emitir`) nunca é alcançado quando ela falha.
  function setupFinalizedSaleFixtures(overrides: { customerTaxId?: string; unitCnpj?: string } = {}) {
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'customers') return CUSTOMERS_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    findDataById.mockImplementation(async (id: string) => {
      if (id === SALE_ID) return { id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', customerId: CUSTOMER_ID, date: todayDateOnly() } };
      if (id === CUSTOMER_ID) return { id: CUSTOMER_ID, data: { name: 'Cliente', taxId: overrides.customerTaxId ?? '11144477735' } };
      if (id === 'unit-1') return { id: 'unit-1', data: { cnpj: overrides.unitCnpj ?? '11222333000181' } };
      return null;
    });
  }

  it('perfil fiscal incompleto (emissao.completo=false) -> 400, porta nunca tocada', async () => {
    setupFinalizedSaleFixtures();
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
    const { service, repo } = makeService({
      fiscalProfile: baseFiscalProfileView({ emissao: { completo: false, faltantes: ['codMun'], pendingExternalValidation: [] } }),
    });
    await expect(service.emit(SCOPE, SALE_ID, 'NFSE')).rejects.toThrow(/emissao_bloqueada/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  it("serviço sem ServiceFiscalProfile cadastrado -> 400, porta nunca tocada", async () => {
    setupFinalizedSaleFixtures();
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-sem-perfil', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
    const { service, repo } = makeService({ serviceProfiles: {} }); // get() rejeita para qualquer serviceRef
    await expect(service.emit(SCOPE, SALE_ID, 'NFSE')).rejects.toThrow(/emissao_bloqueada/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  it('ibsCbsInformar=true sem cNBS no ServiceFiscalProfile -> 400 (E0322), porta nunca tocada', async () => {
    setupFinalizedSaleFixtures();
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
    const { service, repo } = makeService({
      fiscalProfile: baseFiscalProfileView({ ibsCbsInformar: true }),
      serviceProfiles: { 'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null } },
    });
    await expect(service.emit(SCOPE, SALE_ID, 'NFSE')).rejects.toThrow(/emissao_bloqueada/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  it('venda sem cliente vinculado (F-DFE-7 b) -> 400, porta nunca tocada', async () => {
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    findDataById.mockImplementation(async (id: string) => {
      if (id === SALE_ID) return { id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', date: todayDateOnly() } }; // sem customerId
      if (id === 'unit-1') return { id: 'unit-1', data: { cnpj: '11222333000181' } };
      return null;
    });
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
    const { service, repo } = makeService({
      serviceProfiles: { 'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null } },
    });
    await expect(service.emit(SCOPE, SALE_ID, 'NFSE')).rejects.toThrow(/emissao_bloqueada/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  it('taxId do cliente inválido por DV -> 400, porta nunca tocada', async () => {
    setupFinalizedSaleFixtures({ customerTaxId: '11111111111' }); // 11 dígitos repetidos: CPF inválido por DV
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
    const { service, repo } = makeService({
      serviceProfiles: { 'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null } },
    });
    await expect(service.emit(SCOPE, SALE_ID, 'NFSE')).rejects.toThrow(/emissao_bloqueada/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  it('já existe documento vivo para (venda, kind, cTribNac) -> 400, porta nunca tocada', async () => {
    setupFinalizedSaleFixtures();
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
    const { service, repo } = makeService({
      serviceProfiles: { 'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null } },
      liveDocs: [{ id: 'doc-existente', status: 'SENT', cTribNac: '060101' }],
    });
    await expect(service.emit(SCOPE, SALE_ID, 'NFSE')).rejects.toThrow(/emissao_bloqueada/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  it('emissaoForaDoMes=BLOQUEAR com competência fora do mês corrente -> 400, porta nunca tocada', async () => {
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'customers') return CUSTOMERS_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    findDataById.mockImplementation(async (id: string) => {
      if (id === SALE_ID) return { id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', customerId: CUSTOMER_ID, date: '2000-01-15' } }; // mês certamente diferente de hoje
      if (id === CUSTOMER_ID) return { id: CUSTOMER_ID, data: { name: 'Cliente', taxId: '11144477735' } };
      if (id === 'unit-1') return { id: 'unit-1', data: { cnpj: '11222333000181' } };
      return null;
    });
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
    const { service, repo } = makeService({
      fiscalProfile: baseFiscalProfileView({ emissaoForaDoMes: 'BLOQUEAR' }),
      serviceProfiles: { 'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null } },
    });
    await expect(service.emit(SCOPE, SALE_ID, 'NFSE')).rejects.toThrow(/emissao_bloqueada/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  it('porta desabilitada (DFE_PARTNER ausente) -> 400, porta nunca tocada', async () => {
    process.env = { ...process.env, DFE_PARTNER: '', DFE_PARTNER_ENV: '', NODE_ENV: 'test' };
    setupFinalizedSaleFixtures();
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
    const { service, repo } = makeService({
      serviceProfiles: { 'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null } },
    });
    await expect(service.emit(SCOPE, SALE_ID, 'NFSE')).rejects.toThrow(/emissao_bloqueada/);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });
});

describe('FiscalDocumentEmissionService — pacote VENDA (item 21; destravado pelo pacoteCTribNac, BE-INCR-PACOTE-VALIDADE 13a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...process.env, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    existsByIdInTable.mockResolvedValue(true);
    findDataById.mockResolvedValue({ id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', date: todayDateOnly() } });
  });

  it('venda 100% pacote com pacoteFatoGerador=VENDA e SEM pacoteCTribNac bloqueia com 400 nomeado — NUNCA emite um cTribNac fake', async () => {
    findRowsByFieldValue.mockResolvedValue([
      { data: { packageId: 'pkg-1', type: 'Package', quantity: 1, unitPrice: 200 } },
    ]);
    const { service, repo } = makeService({
      fiscalProfile: baseFiscalProfileView({ pacoteFatoGerador: 'VENDA' }),
    });
    let caught: unknown;
    try {
      await service.emit(SCOPE, SALE_ID, 'NFSE');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    const faltantes = (caught as { details?: { faltantes?: string[] } }).details?.faltantes ?? [];
    expect(faltantes.some((f) => f.includes('cTribNac do pacote'))).toBe(true);
    expect(faltantes.some((f) => f.includes("falta 'pacoteCTribNac'"))).toBe(true);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  it('13a: com pacoteCTribNac no perfil, a NFS-e do pacote VENDA sai com esse código e o valor do débito 1.1.2', async () => {
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'customers') return CUSTOMERS_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    findDataById.mockImplementation(async (id: string) => {
      if (id === SALE_ID) return { id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', customerId: CUSTOMER_ID, date: todayDateOnly() } };
      if (id === CUSTOMER_ID) return { id: CUSTOMER_ID, data: { name: 'Cliente Teste', taxId: '11144477735' } };
      if (id === 'unit-1') return { id: 'unit-1', data: { cnpj: '11222333000181' } };
      return null;
    });
    findRowsByFieldValue.mockResolvedValue([{ data: { packageId: 'pkg-1', type: 'Package', quantity: 1, unitPrice: 200 } }]);
    const { service } = makeService({
      fiscalProfile: baseFiscalProfileView({ pacoteFatoGerador: 'VENDA', pacoteCTribNac: '060101', pacoteCNBS: null }),
      ledgerPostings: [{ accountId: 'acc-1.1.2', debitCents: 20000n, creditCents: 0n }],
      anchorSourceType: 'sale.package.sold',
    });
    const result = await service.preview(SCOPE, SALE_ID, 'NFSE');
    expect(result.faltantes).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.payloads).toHaveLength(1);
    expect(result.payloads[0].infDPS.serv.cServ.cTribNac).toBe('060101');
    expect(result.payloads[0].infDPS.valores.vServPrest.vServ).toBe('200.00');
  });
});

describe('FiscalDocumentEmissionService.emitPackageExpiry (BE-INCR-PACOTE-VALIDADE §5.2 item 14a / 9.5)', () => {
  const KEY = 'expiry:bal-1:2026-03-31';
  const PACKAGES_TABLE = { id: 'tbl-packages', internalName: 'packages' };
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'customers') return CUSTOMERS_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'packages') return PACKAGES_TABLE;
      return null;
    });
    existsByIdInTable.mockResolvedValue(true);
    findDataById.mockImplementation(async (id: string) => {
      if (id === CUSTOMER_ID) return { id: CUSTOMER_ID, data: { name: 'Cliente Teste', taxId: '11144477735' } };
      if (id === 'unit-1') return { id: 'unit-1', data: { cnpj: '11222333000181' } };
      if (id === 'pkg-1') return { id: 'pkg-1', data: { name: '10 escovas', validityDays: 30 } };
      return null;
    });
    getExpiryContext.mockResolvedValue({ customerId: CUSTOMER_ID, packageId: 'pkg-1', releasedCents: 7000, originSaleId: 'sale-origem' });
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  const consumo = () => baseFiscalProfileView({ pacoteFatoGerador: 'CONSUMO', pacoteCTribNac: '060101', pacoteCNBS: null });
  const anchorPostings = [
    { accountId: 'acc-2.1.1', debitCents: 7000n, creditCents: 0n },
    { accountId: 'acc-3.4', debitCents: 0n, creditCents: 7000n },
  ];

  it('perfil CONSUMO: emite com âncora no lançamento do vencimento, saleId = venda de origem, saleKey = chave, dCompet = expiresOn+1', async () => {
    const { service, repo, journalEntryRepo } = makeService({ fiscalProfile: consumo(), ledgerPostings: anchorPostings, anchorSourceType: 'sale.package.expired' });
    expect(await service.emitPackageExpiry(SCOPE, KEY)).toBe('emitted');
    expect(journalEntryRepo.findBySource).toHaveBeenCalledWith(SCOPE, 'sale.package.expired', KEY);
    const data = (repo.createSent as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
    expect(data).toMatchObject({
      kind: 'NFSE',
      saleId: 'sale-origem',
      saleKey: KEY,
      cTribNac: '060101',
      anchorEntryId: ANCHOR_ID,
      dCompet: '2026-04-01',
      vServCents: 7000n,
    });
    const payload = JSON.parse(data.payloadJson as string);
    expect(payload.infDPS.valores.vServPrest.vServ).toBe('70.00'); // tie-out exato com o crédito 3.4
    expect(payload.infDPS.serv.cServ.xDescServ).toBe('Pacote 10 escovas — saldo não utilizado, vencido em 2026-03-31'); // L7
    expect(payload.infDPS.toma).toMatchObject({ CPF: '11144477735' });
  });

  it.each([
    ['perfil VENDA (a nota saiu cheia na venda)', baseFiscalProfileView({ pacoteFatoGerador: 'VENDA', pacoteCTribNac: '060101' })],
    ['sem perfil fiscal', null],
  ])('%s → not_applicable, nada criado', async (_l, profile) => {
    const { service, repo } = makeService({ fiscalProfile: profile as never });
    expect(await service.emitPackageExpiry(SCOPE, KEY)).toBe('not_applicable');
    expect(repo.createSent).not.toHaveBeenCalled();
  });

  it('documento já existente com o saleKey → exists (idempotente)', async () => {
    const { service, repo } = makeService({ fiscalProfile: consumo() });
    (repo.findBySaleKey as jest.Mock).mockResolvedValue({ id: 'doc-x' });
    expect(await service.emitPackageExpiry(SCOPE, KEY)).toBe('exists');
    expect(repo.createSent).not.toHaveBeenCalled();
  });

  it.each([
    ['perfil sem pacoteCTribNac', { profile: { pacoteCTribNac: null } }, "falta 'pacoteCTribNac'"],
    ['cliente sem CPF/CNPJ', { customerTaxId: '' }, 'taxId ausente ou inválido'],
  ])('faltante (%s) → PACKAGE_EXPIRY_NFSE_PENDING com o motivo nomeado; nada criado', async (_l, over, motivo) => {
    if ('customerTaxId' in over) {
      findDataById.mockImplementation(async (id: string) =>
        id === CUSTOMER_ID ? { id, data: { name: 'Sem doc', taxId: over.customerTaxId } } : id === 'unit-1' ? { id, data: { cnpj: '11222333000181' } } : null,
      );
    }
    const profile = 'profile' in over ? baseFiscalProfileView({ pacoteFatoGerador: 'CONSUMO', ...over.profile }) : consumo();
    const { service, repo } = makeService({ fiscalProfile: profile, ledgerPostings: anchorPostings, anchorSourceType: 'sale.package.expired' });
    const err = await service.emitPackageExpiry(SCOPE, KEY).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PackageExpiryNfsePendingError);
    expect((err as PackageExpiryNfsePendingError).errorCode).toBe('PACKAGE_EXPIRY_NFSE_PENDING');
    expect((err as Error).message).toContain(motivo);
    expect(repo.createSent).not.toHaveBeenCalled();
  });

  it('porta desabilitada → pendência nomeada', async () => {
    process.env = { ...OLD_ENV, DFE_PARTNER: '', NODE_ENV: 'test' };
    const { service } = makeService({ fiscalProfile: consumo(), ledgerPostings: anchorPostings, anchorSourceType: 'sale.package.expired' });
    await expect(service.emitPackageExpiry(SCOPE, KEY)).rejects.toBeInstanceOf(PackageExpiryNfsePendingError);
  });

  it('tie-out quebrado (valor vencido ≠ crédito 3.4) falha ALTO — não vira pendência', async () => {
    const { service, repo } = makeService({
      fiscalProfile: consumo(),
      ledgerPostings: [{ accountId: 'acc-3.4', debitCents: 0n, creditCents: 6999n }],
      anchorSourceType: 'sale.package.expired',
    });
    const err = await service.emitPackageExpiry(SCOPE, KEY).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(PackageExpiryNfsePendingError);
    expect((err as Error).message).toContain('tie-out');
    expect(repo.createSent).not.toHaveBeenCalled();
  });

  it('L2 (dono 03/10): o reenvio de nota de vencido remonta pelo vencimento, não pela venda de origem', async () => {
    const { service } = makeService({ fiscalProfile: consumo(), ledgerPostings: anchorPostings, anchorSourceType: 'sale.package.expired' });
    const r = await service.reassembleGroupForReenvio(SCOPE, 'sale-origem', 'NFSE', '060101', 'homologacao', KEY);
    expect(r.vServCents).toBe(7000);
    expect(r.payload.infDPS.dCompet).toBe('2026-04-01');
  });
});

describe('FiscalDocumentEmissionService — Simples Nacional (item 22)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...process.env, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'customers') return CUSTOMERS_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    existsByIdInTable.mockResolvedValue(true);
    findDataById.mockImplementation(async (id: string) => {
      if (id === SALE_ID) return { id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', customerId: CUSTOMER_ID, date: todayDateOnly() } };
      if (id === CUSTOMER_ID) return { id: CUSTOMER_ID, data: { name: 'Cliente', taxId: '11144477735' } };
      if (id === 'unit-1') return { id: 'unit-1', data: { cnpj: '11222333000181' } };
      return null;
    });
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
  });

  it('gera payload sem IBSCBS e com pTotTribSN quando o regime é SIMPLES', async () => {
    const { service } = makeService({
      fiscalProfile: baseFiscalProfileView({ regimeTributario: 'SIMPLES', pTotTribSNCent: 400, ibsCbsInformar: false }),
      serviceProfiles: { 'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null } },
      ledgerPostings: [{ accountId: 'acc-3.1', debitCents: 0n, creditCents: 10000n }],
    });
    const result = await service.preview(SCOPE, SALE_ID, 'NFSE');
    expect(result.ok).toBe(true);
    const payload = result.payloads[0];
    expect(payload.infDPS.prest.regTrib.opSimpNac).toBe(3);
    expect('pTotTribSN' in payload.infDPS.valores.trib.totTrib).toBe(true);
    expect(payload.infDPS.IBSCBS).toBeUndefined();
  });
});

describe('FiscalDocumentEmissionService — Id da DPS [102] (GAP-MAP: tpInsc do Id)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...process.env, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'customers') return CUSTOMERS_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    existsByIdInTable.mockResolvedValue(true);
    findDataById.mockImplementation(async (id: string) => {
      if (id === SALE_ID) return { id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', customerId: CUSTOMER_ID, date: todayDateOnly() } };
      if (id === CUSTOMER_ID) return { id: CUSTOMER_ID, data: { name: 'Cliente', taxId: '11144477735' } };
      if (id === 'unit-1') return { id: 'unit-1', data: { cnpj: '11222333000181' } };
      return null;
    });
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
  });

  // Anexo I v1.01, aba LEIAUTE, linha 102: "Tipo de inscrição Federal = 1 / CPF …; = 2 / CNPJ".
  // Spec X10b (BE-INCR-DFE-brief.md §1 [102]): "DPS" + cLocEmi(7) + "2" + CNPJ(14) + serie(5) + nDPS(15).
  it('emitente CNPJ: o tipo de inscrição do Id é 2 (CNPJ), não 1 (CPF)', async () => {
    const { service } = makeService({
      serviceProfiles: { 'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null } },
      ledgerPostings: [{ accountId: 'acc-3.1', debitCents: 0n, creditCents: 10000n }],
    });
    const result = await service.preview(SCOPE, SALE_ID, 'NFSE');
    expect(result.ok).toBe(true);
    const id = result.payloads[0].infDPS.id;
    expect({ tpInsc: id.slice(10, 11), id }).toEqual({
      tpInsc: '2',
      id: 'DPS' + '3550308' + '2' + '11222333000181' + '00001' + '0'.repeat(15),
    });
  });
});

describe('FiscalDocumentEmissionService — tpAmb [103] = ambiente do documento (BE-INCR-DFE-TPAMB itens 1-4)', () => {
  function setup(partner: 'manual' | 'null' | '', ambiente: 'producao' | 'homologacao' | '') {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    process.env = { ...process.env, DFE_PARTNER: partner, DFE_PARTNER_ENV: ambiente, NODE_ENV: 'test' };
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'customers') return CUSTOMERS_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    existsByIdInTable.mockResolvedValue(true);
    findDataById.mockImplementation(async (id: string) => {
      if (id === SALE_ID) return { id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', customerId: CUSTOMER_ID, date: todayDateOnly() } };
      if (id === CUSTOMER_ID) return { id: CUSTOMER_ID, data: { name: 'Cliente', taxId: '11144477735' } };
      if (id === 'unit-1') return { id: 'unit-1', data: { cnpj: '11222333000181' } };
      return null;
    });
    // Dois cTribNac distintos → dois grupos: a prévia precisa acertar TODOS os payloads (item 4).
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
      { data: { serviceId: 'srv-B', type: 'Service', description: 'Escova', quantity: 1, unitPrice: 100 } },
    ]);
    return makeService({
      serviceProfiles: {
        'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null },
        'srv-B': { cTribNac: '060201', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null },
      },
      ledgerPostings: [{ accountId: 'acc-3.1', debitCents: 0n, creditCents: 20000n }],
    });
  }

  function createSentArgs(repo: ReturnType<typeof makeService>['repo']) {
    return (repo.createSent.mock.calls as unknown as Array<[unknown, { ambiente: string; payloadJson: string }]>).map((c) => c[1]);
  }

  it('item 1 — emissão em homologacao (null): createSent grava tpAmb 2 junto de ambiente homologacao, e a porta recebe tpAmb 2', async () => {
    const { service, repo } = setup('null', 'homologacao');
    const emitir = jest.spyOn(NullEmissor.prototype, 'emitir');
    await service.emit(SCOPE, SALE_ID, 'NFSE');
    const gravados = createSentArgs(repo).map((d) => ({ ambiente: d.ambiente, tpAmb: JSON.parse(d.payloadJson).infDPS.tpAmb }));
    const enviados = emitir.mock.calls.map((c) => ({ ambiente: c[0].ambiente, tpAmb: (c[0].payload as { infDPS: { tpAmb: number } }).infDPS.tpAmb }));
    expect({ gravados, enviados }).toEqual({
      gravados: [{ ambiente: 'homologacao', tpAmb: 2 }, { ambiente: 'homologacao', tpAmb: 2 }],
      enviados: [{ ambiente: 'homologacao', tpAmb: 2 }, { ambiente: 'homologacao', tpAmb: 2 }],
    });
  });

  it('item 2 — controle: emissão em producao (null) grava e envia tpAmb 1', async () => {
    const { service, repo } = setup('null', 'producao');
    const emitir = jest.spyOn(NullEmissor.prototype, 'emitir');
    await service.emit(SCOPE, SALE_ID, 'NFSE');
    const gravados = createSentArgs(repo).map((d) => ({ ambiente: d.ambiente, tpAmb: JSON.parse(d.payloadJson).infDPS.tpAmb }));
    const enviados = emitir.mock.calls.map((c) => (c[0].payload as { infDPS: { tpAmb: number } }).infDPS.tpAmb);
    expect({ gravados, enviados }).toEqual({
      gravados: [{ ambiente: 'producao', tpAmb: 1 }, { ambiente: 'producao', tpAmb: 1 }],
      enviados: [1, 1],
    });
  });

  it('item 3 — modo manual em homologacao: a DPS gravada e a ficha mostram tpAmb 2', async () => {
    const { service, repo } = setup('manual', 'homologacao');
    const views = await service.emit(SCOPE, SALE_ID, 'NFSE');
    const createdDocs = await Promise.all(
      (repo.createSent.mock.results as Array<{ value: Promise<Record<string, unknown>> }>).map((r) => r.value),
    );
    repo.findById.mockImplementation(async (_s: unknown, id: string) => createdDocs.find((d) => d.id === id) ?? null);
    const gravados = createSentArgs(repo).map((d) => JSON.parse(d.payloadJson).infDPS.tpAmb);
    const fichas = await Promise.all(views.map((v) => service.ficha(SCOPE, v.id)));
    expect({ gravados, ficha: fichas.map((f) => (f.payload as { infDPS: { tpAmb: number } }).infDPS.tpAmb) }).toEqual({
      gravados: [2, 2],
      ficha: [2, 2],
    });
  });

  it('item 4 — prévia em homologacao: todo payload sai com tpAmb 2', async () => {
    const { service } = setup('null', 'homologacao');
    const result = await service.preview(SCOPE, SALE_ID, 'NFSE');
    expect(result.ok).toBe(true);
    expect(result.payloads.map((p) => p.infDPS.tpAmb)).toEqual([2, 2]);
  });

  it('item 4 — prévia com porta desabilitada: ok=false, nenhum payload montado (nenhum tpAmb "neutro")', async () => {
    const { service } = setup('', '');
    const result = await service.preview(SCOPE, SALE_ID, 'NFSE');
    expect(result.ok).toBe(false);
    expect(result.payloads).toEqual([]);
  });

  it('item 7 (F-AMB-3 a) — tpAmb adulterado na montagem: emit lança dfe_tpamb_invariant e createSent nunca é chamado', async () => {
    const { service, repo } = setup('null', 'homologacao');
    type Assembled = { groups: Array<{ payload: { infDPS: { tpAmb: number } } }> };
    const internals = service as unknown as { assemble: (...args: unknown[]) => Promise<Assembled> };
    const original = internals.assemble.bind(service);
    jest.spyOn(internals, 'assemble').mockImplementation(async (...args: unknown[]) => {
      const assembled = await original(...args);
      for (const g of assembled.groups) g.payload.infDPS.tpAmb = 1; // um 3º caminho de montagem que errasse o tpAmb
      return assembled;
    });
    await expect(service.emit(SCOPE, SALE_ID, 'NFSE')).rejects.toThrow(/dfe_tpamb_invariant/);
    expect(repo.createSent).not.toHaveBeenCalled();
  });
});

describe('FiscalDocumentEmissionService — modo manual (BE-INCR-DFE-MANUAL item 8, F-MAN-4 a)', () => {
  function setup(partner: 'manual' | 'null') {
    jest.clearAllMocks();
    process.env = { ...process.env, DFE_PARTNER: partner, DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'customers') return CUSTOMERS_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    existsByIdInTable.mockResolvedValue(true);
    findDataById.mockImplementation(async (id: string) => {
      if (id === SALE_ID) return { id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', customerId: CUSTOMER_ID, date: todayDateOnly() } };
      if (id === CUSTOMER_ID) return { id: CUSTOMER_ID, data: { name: 'Cliente', taxId: '11144477735' } };
      if (id === 'unit-1') return { id: 'unit-1', data: { cnpj: '11222333000181' } };
      return null;
    });
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
    return makeService({
      serviceProfiles: { 'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: '126021000', cIndOp: '030101', cLocPrestacao: null } },
      ledgerPostings: [{ accountId: 'acc-3.1', debitCents: 0n, creditCents: 10000n }],
    });
  }

  it('o portal numera: a sequência local NÃO é consumida e a DPS sai sem id/serie/nDPS', async () => {
    const { service, repo } = setup('manual');
    await service.emit(SCOPE, SALE_ID, 'NFSE');
    expect(repo.nextNumber).not.toHaveBeenCalled();
    const data = repo.createSent.mock.calls[0][1] as { numero: bigint | null; payloadJson: string };
    expect(data.numero).toBeNull();
    const infDPS = JSON.parse(data.payloadJson).infDPS;
    expect(infDPS).not.toHaveProperty('id');
    expect(infDPS).not.toHaveProperty('serie');
    expect(infDPS).not.toHaveProperty('nDPS');
    expect(infDPS.prest.CNPJ).toBe('11222333000181'); // o resto da DPS continua lá
  });

  it('contraprova: com numeração local (NullEmissor) a sequência é consumida e a DPS sai numerada', async () => {
    const { service, repo } = setup('null');
    await service.emit(SCOPE, SALE_ID, 'NFSE');
    expect(repo.nextNumber).toHaveBeenCalledTimes(1);
    const data = repo.createSent.mock.calls[0][1] as { payloadJson: string };
    expect(JSON.parse(data.payloadJson).infDPS.nDPS).toBe(1);
  });
});


describe('FiscalDocumentEmissionService — pendências do status divergente e ficha (BE-INCR-DFE-MANUAL F-MAN-2 c, item 14)', () => {
  function docRow(status: string) {
    return {
      id: 'doc-m', kind: 'NFSE', status, saleId: SALE_ID, cTribNac: '060101', anchorEntryId: ANCHOR_ID, ambiente: 'producao',
      partner: 'manual', partnerRef: 'doc-m:1', serie: 70001, numero: 15n, nNFSe: '42', chaveOuCodigo: 'X', dCompet: '2026-09-15',
      vServCents: 15000n, tpRetISSQN: 1, vIssCents: null, vIbsCents: null, vCbsCents: null, currentAttemptNo: 1,
      authorizedAt: new Date(), cancelledAt: null, errorsJson: null, sourceDocumentId: 'src-1',
      attempts: [{ attemptNo: 1, ref: 'doc-m:1', payloadJson: JSON.stringify({ versao: '1.01', infDPS: { dCompet: '2026-09-15' } }), sentAt: new Date(), resultStatus: 'AUTHORIZED' }],
    };
  }
  function setup(status: string, saleStatus: string) {
    jest.clearAllMocks();
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => (name === 'sales' ? SALES_TABLE : null));
    findDataById.mockResolvedValue({ id: SALE_ID, data: { status: saleStatus } });
    const s = makeService({});
    s.repo.findById.mockResolvedValue(docRow(status));
    s.repo.listBySale.mockResolvedValue([docRow(status)]);
    return s;
  }

  it('AUTHORIZED_DIVERGENT mostra a pendência releitura_divergente', async () => {
    const { service } = setup('AUTHORIZED_DIVERGENT', 'Finalized');
    expect((await service.getById(SCOPE, 'doc-m')).pendencias).toEqual(['releitura_divergente']);
  });

  it('venda cancelada com nota DIVERGENTE viva também acusa sale_cancelled_with_live_document (a nota existe no fisco)', async () => {
    const { service } = setup('AUTHORIZED_DIVERGENT', 'Cancelled');
    expect((await service.getById(SCOPE, 'doc-m')).pendencias).toEqual(['sale_cancelled_with_live_document', 'releitura_divergente']);
  });

  it('contraprova: AUTHORIZED sem divergência não tem pendência de releitura', async () => {
    const { service } = setup('AUTHORIZED', 'Finalized');
    expect((await service.getById(SCOPE, 'doc-m')).pendencias).toEqual([]);
  });

  it('ficha devolve a DPS CRUA da tentativa corrente', async () => {
    const { service } = setup('SENT', 'Finalized');
    expect(await service.ficha(SCOPE, 'doc-m')).toEqual({
      documentId: 'doc-m',
      status: 'SENT',
      currentAttemptNo: 1,
      payload: { versao: '1.01', infDPS: { dCompet: '2026-09-15' } },
    });
  });
});

// GAP-MAP L-PR2-1 / L-PR2-2 (achadas em 06/10 na verificação de browser do PR-2 do FE-INCR-DFE, PR #547).
// Testes-guarda: VERMELHOS até a sessão de correção. Autorização: dono em chat 06/10 ("Autorizo as duas").
describe('FiscalDocumentEmissionService — GAP-MAP L-PR2 (verificação de browser 06/10)', () => {
  const SRV = { 'srv-A': { cTribNac: '060101', cTribMun: null, cNBS: null, cIndOp: '030101', cLocPrestacao: null } };
  const POSTINGS = [{ accountId: 'acc-3.1', debitCents: 0n, creditCents: 10000n }];
  let saleDate: string;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...process.env, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
    saleDate = todayDateOnly();
    findTableByInternalName.mockImplementation(async (_u: string, name: string) => {
      if (name === 'sales') return SALES_TABLE;
      if (name === 'customers') return CUSTOMERS_TABLE;
      if (name === 'units') return UNITS_TABLE;
      if (name === 'saleItems') return ITEMS_TABLE;
      return null;
    });
    existsByIdInTable.mockResolvedValue(true);
    findDataById.mockImplementation(async (id: string) => {
      if (id === SALE_ID) return { id: SALE_ID, data: { status: 'Finalized', unitId: 'unit-1', customerId: CUSTOMER_ID, date: saleDate } };
      if (id === CUSTOMER_ID) return { id: CUSTOMER_ID, data: { name: 'Cliente', taxId: '11144477735' } };
      if (id === 'unit-1') return { id: 'unit-1', data: { cnpj: '11222333000181' } };
      return null;
    });
    findRowsByFieldValue.mockResolvedValue([
      { data: { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 100 } },
    ]);
  });

  it('L-PR2-1: venda gravada pelo motor com date ISO UTC — infDPS.dCompet sai date-only com o dia escrito', async () => {
    // O motor DynamicTable grava `date` como ISO UTC (memória motor-grava-date-como-iso-utc): é isto que a venda
    // criada pela tela carrega. O dia escrito é o slice(0, 10). A fixture date-only das suítes acima escondia a lacuna.
    saleDate = '2026-10-06T00:00:00.000Z';
    const { service } = makeService({ serviceProfiles: SRV, ledgerPostings: POSTINGS });
    const result = await service.preview(SCOPE, SALE_ID, 'NFSE');
    expect(result.ok).toBe(true);
    // Hoje sai '2026-10-06T00:00:00.000Z' e o emit morre em DpsPayloadSchema ([108] /^\d{4}-\d{2}-\d{2}$/) → 400.
    expect(result.payloads[0].infDPS.dCompet).toBe('2026-10-06');
  });

  it('L-PR2-2: reenvio de documento REJECTED remonta — o próprio rejeitado não conta como documento vivo', async () => {
    // findLiveBySale exclui só CANCELLED: o documento REJECTED que está sendo reenviado volta na lista.
    // (A emissão nova com documento SENT/REJECTED vivo continua bloqueada — teste 'já existe documento vivo…' acima.)
    const { service } = makeService({
      serviceProfiles: SRV,
      ledgerPostings: POSTINGS,
      liveDocs: [{ id: 'doc-rejeitado', status: 'REJECTED', cTribNac: '060101' }],
    });
    await expect(service.reassembleGroupForReenvio(SCOPE, SALE_ID, 'NFSE', '060101', 'homologacao')).resolves.toMatchObject({
      vServCents: 10000,
    });
  });
});
