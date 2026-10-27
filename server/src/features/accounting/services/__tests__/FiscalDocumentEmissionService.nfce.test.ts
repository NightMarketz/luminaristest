// --- Mock do repositório de DynamicTable que a montagem lê pela factory (mesmo padrão do FiscalDocumentEmissionService.test.ts) ---
const findTableByInternalName = jest.fn();
const findDataById = jest.fn();
const existsByIdInTable = jest.fn();
const findRowsByFieldValue = jest.fn();

jest.mock('../../../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({
    getDynamicTableRepository: () => ({ findTableByInternalName, findDataById, existsByIdInTable, findRowsByFieldValue }),
  }),
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { FiscalDocumentEmissionService } from '../FiscalDocumentEmissionService';
import type { AccountingScope } from '../../scope/AccountingScope';
import { NfePayloadSchema, type NfePayloadSemNumeracao } from '../../dtos/NfePayloadDto';
import type { DpsPayload } from '../../dtos/DpsPayloadDto';
import { isValidNfeChave } from '../../../../lib/cnpj';
import { parseNfe } from '../../../../lib/nfe';
import { acquisitionCost } from '../../../../lib/nfeCost';
import { LEGAIS_SEMENTE, legalParamsSemente } from '@test/helpers/legalParams';
import { CRT3_ICMS_SEM_SPEC } from '../../models/nfeIbsCbsMontagem';

/**
 * BE-INCR-NFCE (nó X10a, PR-3 — itens 8, 11, 13–19, 21–22) — emissão da NFC-e 65 / NF-e 55 do Simples pelo serviço, com o
 * `NullEmissor` (DFE_PARTNER=null). Decisões do dono de 26/10 (questionário): emitente no FiscalProfile, NF-e 55 recusada
 * até haver o cMun do destinatário, PIS/COFINS zerado com o CST do perfil, destinatário da NFC-e pela A9.
 */
const SCOPE: AccountingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };
const SALE_ID = 'sale-1';
const CUSTOMER_ID = 'cust-1';
const TABLES: Record<string, { id: string }> = {
  sales: { id: 'tbl-sales' },
  customers: { id: 'tbl-customers' },
  units: { id: 'tbl-units' },
  saleItems: { id: 'tbl-items' },
  products: { id: 'tbl-products' },
};

function perfilSimples(over: Record<string, unknown> = {}) {
  return {
    unitId: 'unit-1',
    regimeTributario: 'SIMPLES',
    codMun: '3550308',
    inscricaoEstadual: '111222333444',
    razaoSocial: 'Salao Exemplo Ltda',
    enderLogradouro: 'Rua Exemplo',
    enderNumero: '100',
    enderComplemento: null,
    enderBairro: 'Centro',
    enderMunicipio: 'Sao Paulo',
    enderCep: '01001000',
    nfeSerie: 1,
    nfceSerie: 3,
    dpsSerie: 1,
    partnerAccountRef: null,
    icmsContribuinte: false,
    pisCofinsRegime: 'SIMPLES',
    emissao: { completo: true, faltantes: [], pendingExternalValidation: [] },
    ...over,
  };
}

function perfilProduto(productRef: string, over: Record<string, unknown> = {}) {
  return {
    productRef, ncm: '33051000', cest: null, origem: 0, cfopPadrao: '5102', csosn: '102', cstIcms: null, uCom: 'UN', cEan: 'SEM GTIN',
    cstPis: '49', cstCofins: '49', ibsCbsCst: null, ibsCbsClassTrib: null, xProd: null, updatedAt: '2026-10-26T00:00:00.000Z', ...over,
  };
}

interface Cenario {
  fiscalProfile?: ReturnType<typeof perfilSimples> | null;
  produtos?: ReturnType<typeof perfilProduto>[];
  itens?: Array<Record<string, unknown>>;
  postings?: Array<{ accountId: string; debitCents: bigint; creditCents: bigint }>;
  sale?: Record<string, unknown>;
  customer?: Record<string, unknown> | null;
  /** EFICIENCIA-FISCAL PR-1 item 6: guarda fiscal da venda (porta estrutural). */
  guard?: { check: jest.Mock };
}

function montar(c: Cenario = {}) {
  findTableByInternalName.mockImplementation(async (_u: string, name: string) => TABLES[name] ?? null);
  existsByIdInTable.mockResolvedValue(true);
  findRowsByFieldValue.mockResolvedValue(
    (c.itens ?? [{ productId: 'prod-1', type: 'Product', quantity: 2, unitPrice: 30 }]).map((d, i) => ({ id: `item-${i + 1}`, data: d })),
  );
  findDataById.mockImplementation(async (id: string) => {
    if (id === SALE_ID) return { id, data: { status: 'Finalized', customerId: CUSTOMER_ID, paymentMethod: 'Pix', date: '2026-10-26', ...c.sale } };
    if (id === CUSTOMER_ID) return c.customer === null ? null : { id, data: { name: 'Maria Cliente', taxId: '11144477735', ...c.customer } };
    if (id === 'unit-1') return { id, data: { cnpj: '11222333000181' } };
    if (id.startsWith('prod-')) return { id, data: { name: `Produto ${id}` } };
    return null;
  });
  const repo = {
    findLiveBySale: jest.fn().mockResolvedValue([]),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
    nextNumber: jest.fn().mockResolvedValue(1n),
    createSent: jest.fn(async (_s: unknown, data: Record<string, unknown>) => ({
      id: 'doc-1', ...data, status: 'SENT', currentAttemptNo: 1, errorsJson: null, authorizedAt: null, cancelledAt: null, sourceDocumentId: null,
      attempts: [{ attemptNo: 1, ref: 'doc-1:1', payloadJson: data.payloadJson as string, sentAt: new Date(), resultStatus: null }],
    })),
    transition: jest.fn(),
    listBySale: jest.fn().mockResolvedValue([]),
  };
  const accountRepo = { findByCode: jest.fn(async (_s: unknown, code: string) => ({ id: `acc-${code}`, code })) };
  const journalEntryRepo = {
    findBySource: jest.fn().mockResolvedValue({ id: 'entry-1', postings: c.postings ?? [{ accountId: 'acc-3.3', debitCents: 0n, creditCents: 6000n }] }),
  };
  const fiscalProfileService = { get: jest.fn().mockResolvedValue(c.fiscalProfile === undefined ? perfilSimples() : c.fiscalProfile) };
  const productFiscalProfileService = { list: jest.fn().mockResolvedValue(c.produtos ?? [perfilProduto('prod-1')]) };
  const auditService = { append: jest.fn() };
  const service = new FiscalDocumentEmissionService(
    repo as never,
    accountRepo as never,
    journalEntryRepo as never,
    fiscalProfileService as never,
    { get: jest.fn() } as never,
    { canEmitFiscalDocument: () => true, canReadFiscalDocument: () => true } as never,
    auditService as never,
    legalParamsSemente,
    productFiscalProfileService as never,
    c.guard,
  );
  return { service, repo, auditService };
}

const nfce = (r: { payloads: unknown[] }) => (r.payloads as NfePayloadSemNumeracao[])[0].infNFe;

describe('BE-INCR-NFCE PR-3 — emissão da NFC-e do Simples (NullEmissor)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-10-26T15:00:00Z'));
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
  });
  afterEach(() => jest.useRealTimers());
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('item 14 — Σ vProd = crédito 3.3 exato, com desconto de cabeçalho e resíduo de centavo na última linha', async () => {
    const { service } = montar({
      itens: [
        { productId: 'prod-1', type: 'Product', quantity: 1, unitPrice: 10 },
        { productId: 'prod-2', type: 'Product', quantity: 1, unitPrice: 10 },
        { productId: 'prod-3', type: 'Product', quantity: 1, unitPrice: 10 },
      ],
      produtos: [perfilProduto('prod-1'), perfilProduto('prod-2'), perfilProduto('prod-3')],
      postings: [{ accountId: 'acc-3.3', debitCents: 0n, creditCents: 2900n }], // 30,00 − 1,00 de desconto de cabeçalho
    });
    const r = await service.preview(SCOPE, SALE_ID, 'NFCE');
    expect(r.ok).toBe(true);
    const inf = nfce(r);
    const somaItens = inf.det.reduce((s, d) => s + Math.round(Number(d.prod.vProd) * 100), 0);
    expect(somaItens).toBe(2900);
    expect(inf.det.map((d) => d.prod.vProd)).toEqual(['9.67', '9.67', '9.66']); // round(966,67) = 967 ×2; resíduo −1 na última (splitCents)
    expect(inf.total.ICMSTot.vNF).toBe('29.00');
    expect(r.tieOut).toEqual({ vServCents: '2900', ledgerCents: '2900', matches: true });
  });

  it('item 13 — venda mista: NFS-e (3.1) + NFC-e (3.3) fecham o total da venda, cada uma só com a sua natureza', async () => {
    const itens = [
      { serviceId: 'srv-A', type: 'Service', description: 'Corte', quantity: 1, unitPrice: 200 },
      { productId: 'prod-1', type: 'Product', quantity: 2, unitPrice: 30 },
    ];
    const postings = [
      { accountId: 'acc-3.1', debitCents: 0n, creditCents: 19000n },
      { accountId: 'acc-3.3', debitCents: 0n, creditCents: 5700n },
    ];
    const { service } = montar({ itens, postings, sale: { totalAmount: 247 } });
    const rNfce = await service.preview(SCOPE, SALE_ID, 'NFCE');
    expect(rNfce.ok).toBe(true);
    expect(nfce(rNfce).det).toHaveLength(1); // só o produto
    // A NFS-e da mesma venda (mesmo lançamento) pega o 3.1 — o invariante do ADR §9.2 item 6: Σ NFS-e + Σ NFC-e = total − pacote.
    const nfseCents = 19000;
    expect(nfseCents + Number(rNfce.tieOut.vServCents)).toBe(24700);
  });

  it('item 17 (A9) — cliente com CPF válido ⇒ dest/CPF + indIEDest 9; xNome do cliente', async () => {
    const { service } = montar();
    const inf = nfce(await service.preview(SCOPE, SALE_ID, 'NFCE'));
    expect(inf.dest).toEqual({ CPF: '11144477735', xNome: 'Maria Cliente', indIEDest: 9 });
  });

  it('item 17 (A9) — sem cliente abaixo de R$ 10.000 ⇒ NFC-e sem dest', async () => {
    const { service } = montar({ sale: { customerId: undefined } });
    const r = await service.preview(SCOPE, SALE_ID, 'NFCE');
    expect(r.ok).toBe(true);
    expect(nfce(r).dest).toBeUndefined();
  });

  it('item 17 (A9) — sem cliente a partir de R$ 10.000 ⇒ 400 (rej. 750), nada enviado', async () => {
    const { service, repo } = montar({ sale: { customerId: undefined }, postings: [{ accountId: 'acc-3.3', debitCents: 0n, creditCents: 1_000_000n }] });
    await expect(service.emit(SCOPE, SALE_ID, 'NFCE')).rejects.toMatchObject({ details: { faltantes: [expect.stringContaining('750')] } });
    expect(repo.createSent).not.toHaveBeenCalled();
  });

  it('item 17 (A9) — CPF com DV errado ⇒ 400, nunca emite sem destinatário', async () => {
    const { service } = montar({ customer: { taxId: '11144477736' } });
    const r = await service.preview(SCOPE, SALE_ID, 'NFCE');
    expect(r.ok).toBe(false);
    expect(r.faltantes.join(' ')).toContain('dígito verificador');
  });

  it('itens 21 e 8 — emite com Simples COM IE: número da sequência, chave com DV válido, payload no schema, porta chamada', async () => {
    const { service, repo, auditService } = montar();
    const docs = await service.emit(SCOPE, SALE_ID, 'NFCE');
    expect(docs).toHaveLength(1);
    expect(repo.nextNumber).toHaveBeenCalledWith(SCOPE, 'NFCE', 'homologacao', 3, {}); // PR-4 item 23: o ambiente entra na chave
    const data = repo.createSent.mock.calls[0][1] as Record<string, unknown>;
    expect(data).toMatchObject({ kind: 'NFCE', serie: 3, numero: 1n, cTribNac: '', vServCents: 6000n });
    const payload = NfePayloadSchema.parse(JSON.parse(data.payloadJson as string));
    expect(payload.infNFe.emit).toMatchObject({ IE: '111222333444', CRT: 1, xNome: 'Salao Exemplo Ltda' });
    expect(payload.infNFe.ide.nNF).toBe(1);
    expect(isValidNfeChave(payload.infNFe.Id.slice(3))).toBe(true);
    expect(payload.infNFe.ide.tpAmb).toBe(2);
    expect(payload.infNFe.det[0].prod.xProd).toBe('NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL');
    expect(auditService.append).toHaveBeenCalledWith(expect.anything(), SCOPE, expect.objectContaining({ eventType: 'dfe.emitted' }));
  });

  it('item 8 — a compra do MESMO perfil Simples segue sem crédito de ICMS (nfeCost: creditoIcms = 0)', () => {
    const p = perfilSimples();
    const xml = readFileSync(join(__dirname, '../../../../lib/__tests__/fixtures/nfe/purchase-pis-cofins.SYNTHETIC.xml'), 'utf8');
    const compra = parseNfe(xml, LEGAIS_SEMENTE, { allowHomologacao: true });
    const itens = compra.itens.filter((it) => it.indTot !== '0');
    expect(itens.some((it) => it.vICMSCents > 0)).toBe(true);
    const custo = acquisitionCost(
      compra,
      itens,
      { icmsContribuinte: p.icmsContribuinte, pisCofinsRegime: 'SIMPLES', pisCofinsCreditExcludesIcms: true, pisCofinsCreditIncludesIpi: false, pisCofinsCreditFromSimplesSupplier: false },
      undefined,
      LEGAIS_SEMENTE,
    );
    expect(custo.itens.every((it) => it.creditoIcmsCents === 0)).toBe(true);
  });

  it('item 22 — prévia de venda com perfil sem IE ⇒ faltantes, nada gravado', async () => {
    const { service, repo } = montar({ fiscalProfile: perfilSimples({ inscricaoEstadual: null, enderCep: null }) });
    const r = await service.preview(SCOPE, SALE_ID, 'NFCE');
    expect(r.ok).toBe(false);
    expect(r.faltantes).toEqual(expect.arrayContaining(["perfil fiscal da unidade: falta 'inscricaoEstadual'", "perfil fiscal da unidade: falta 'enderCep'"]));
    expect(repo.createSent).not.toHaveBeenCalled();
    expect(repo.nextNumber).not.toHaveBeenCalled();
  });

  it('item 11 — produto sem perfil fiscal ⇒ 400 nomeado, porta não chamada', async () => {
    const { service, repo } = montar({ itens: [{ productId: 'prod-1', type: 'Product', quantity: 1, unitPrice: 60 }, { productId: 'prod-2', type: 'Product', quantity: 1, unitPrice: 1 }] });
    await expect(service.emit(SCOPE, SALE_ID, 'NFCE')).rejects.toMatchObject({ details: { faltantes: ['produto prod-2: perfil fiscal'] } });
    expect(repo.createSent).not.toHaveBeenCalled();
  });

  it('item 12 — CSOSN 102 com CFOP de ST volta como faltante com o código da SEFAZ (rej. 386)', async () => {
    const { service } = montar({ produtos: [perfilProduto('prod-1', { cfopPadrao: '5405' })] });
    const r = await service.preview(SCOPE, SALE_ID, 'NFCE');
    expect(r.faltantes.join(' ')).toContain('rej. 386');
  });

  it('PIS/COFINS — CST 01 no CRT 1 ⇒ faltante (decisão do dono: CST do perfil, zerado)', async () => {
    const { service } = montar({ produtos: [perfilProduto('prod-1', { cstPis: '01' })] });
    const r = await service.preview(SCOPE, SALE_ID, 'NFCE');
    expect(r.faltantes).toEqual([expect.stringContaining('produto prod-1: CST PIS 01')]);
  });

  it('item 18 — Package Balance ⇒ recusa nomeada', async () => {
    const { service } = montar({ sale: { paymentMethod: 'Package Balance' } });
    expect((await service.preview(SCOPE, SALE_ID, 'NFCE')).faltantes.join(' ')).toContain('Package Balance');
  });

  it('item 19 — a partir de 04/01/2027 o Simples é recusado com rtc_simples_nao_transcrito', async () => {
    jest.setSystemTime(new Date('2027-01-04T15:00:00Z'));
    const { service } = montar();
    expect((await service.preview(SCOPE, SALE_ID, 'NFCE')).faltantes.join(' ')).toContain('rtc_simples_nao_transcrito');
  });

  it('item 19 — em 2026 o Simples sai sem o grupo IBSCBS', async () => {
    const { service } = montar();
    expect(nfce(await service.preview(SCOPE, SALE_ID, 'NFCE')).det[0].imposto).not.toHaveProperty('IBSCBS');
  });

  it('item 20 — perfil PRESUMIDO + produto sem CST do IBS/CBS ⇒ ibsCbsCst/ibsCbsClassTrib nos faltantes, ao lado da recusa do ICMS', async () => {
    const { service } = montar({ fiscalProfile: perfilSimples({ regimeTributario: 'PRESUMIDO' }), produtos: [perfilProduto('prod-1', { csosn: null, cstIcms: '00' })] });
    const { faltantes } = await service.preview(SCOPE, SALE_ID, 'NFCE');
    expect(faltantes).toEqual(expect.arrayContaining([CRT3_ICMS_SEM_SPEC, 'produto prod-1: ibsCbsCst (CRT 3, UB13)', 'produto prod-1: ibsCbsClassTrib (CRT 3, UB14)']));
  });

  it('item 20 — perfil PRESUMIDO + produto com CST/cClassTrib ⇒ o IBS/CBS não falta; a nota para só no ICMS (questionário 27/10)', async () => {
    const produtos = [perfilProduto('prod-1', { csosn: null, cstIcms: '00', ibsCbsCst: '000', ibsCbsClassTrib: '000001' })];
    const { service } = montar({ fiscalProfile: perfilSimples({ regimeTributario: 'PRESUMIDO' }), produtos });
    expect((await service.preview(SCOPE, SALE_ID, 'NFCE')).faltantes).toEqual([CRT3_ICMS_SEM_SPEC]);
  });

  it('item 20 — cClassTrib que exige subgrupo sem dado no perfil (diferimento) ⇒ faltante nomeado', async () => {
    const produtos = [perfilProduto('prod-1', { csosn: null, cstIcms: '00', ibsCbsCst: '510', ibsCbsClassTrib: '510001' })];
    const { service } = montar({ fiscalProfile: perfilSimples({ regimeTributario: 'PRESUMIDO' }), produtos });
    expect((await service.preview(SCOPE, SALE_ID, 'NFCE')).faltantes.join(' ')).toContain('diferimento');
  });

  it('NF-e 55 ⇒ para nos faltantes pelo cMun do destinatário (questionário 26/10: recusa nomeada na 55)', async () => {
    const { service } = montar();
    const r = await service.preview(SCOPE, SALE_ID, 'NFE');
    expect(r.ok).toBe(false);
    expect(r.faltantes).toEqual([expect.stringContaining('enderDest/cMun')]);
  });

  it('venda só de serviço ⇒ NFC-e recusada (o serviço segue na NFS-e)', async () => {
    const { service } = montar({ itens: [{ serviceId: 'srv-A', type: 'Service', quantity: 1, unitPrice: 100 }] });
    expect((await service.preview(SCOPE, SALE_ID, 'NFCE')).faltantes.join(' ')).toContain('venda sem linhas de produto');
  });

  it('a NFS-e da venda segue pela montagem da DPS (sem regressão de tipo)', async () => {
    const { service } = montar();
    const r = await service.preview(SCOPE, SALE_ID, 'NFSE');
    expect((r.payloads as DpsPayload[]).length).toBe(0); // venda sem serviço: a NFS-e recusa como antes
    expect(r.ok).toBe(false);
  });
});

describe('BE-INCR-NFCE PR-4 — remontagem do reenvio (EMENDA-3 E3-2 a)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-11-02T13:00:00Z'));
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
  });
  afterEach(() => jest.useRealTimers());
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('o documento vivo é o próprio rejeitado: a prévia recusa, a remontagem do reenvio passa (sem numerar, dhEmi do reenvio)', async () => {
    const { service, repo } = montar();
    repo.findLiveBySale.mockResolvedValue([{ id: 'doc-65', status: 'REJECTED' }]);
    expect((await service.preview(SCOPE, SALE_ID, 'NFCE')).faltantes.join(' ')).toContain('documento vivo já existe');
    const r = await service.reassembleNfeForReenvio(SCOPE, SALE_ID, 'NFCE', 'homologacao');
    expect(r.vServCents).toBe(6000);
    expect(r.payload.infNFe.ide).not.toHaveProperty('nNF');
    expect(r.payload.infNFe.ide.dhEmi).toBe('2026-11-02T10:00:00-03:00');
    expect(repo.nextNumber).not.toHaveBeenCalled();
    expect(repo.createSent).not.toHaveBeenCalled();
  });

  it('a remontagem do reenvio roda as MESMAS pré-condições (perfil sem IE ⇒ faltante)', async () => {
    const { service } = montar({ fiscalProfile: perfilSimples({ inscricaoEstadual: null }) });
    await expect(service.reassembleNfeForReenvio(SCOPE, SALE_ID, 'NFCE', 'homologacao')).rejects.toMatchObject({
      details: { faltantes: ["perfil fiscal da unidade: falta 'inscricaoEstadual'"] },
    });
  });
});

describe('EFICIENCIA-FISCAL PR-1 item 6 — guarda fiscal na NF-e/NFC-e', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-10-26T15:00:00Z'));
    process.env = { ...OLD_ENV, DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' };
  });
  afterEach(() => jest.useRealTimers());
  afterAll(() => {
    process.env = OLD_ENV;
  });
  const guarda = (violations: Array<{ code: string; severity: string; legalBasis: string }>) => ({ check: jest.fn().mockResolvedValue({ violations }) });

  it('BLOCK ⇒ pendência `fiscal_guard: …` no 400 da NFC-e; a prévia roda sem gravar custo nem trilha', async () => {
    const guard = guarda([{ code: 'ITEM_ABAIXO_DO_PISO', severity: 'BLOCK', legalBasis: 'CTN art. 148' }]);
    const { service } = montar({ guard });
    const r = await service.preview(SCOPE, SALE_ID, 'NFCE');
    expect(r.ok).toBe(false);
    expect(r.faltantes).toContain('fiscal_guard: ITEM_ABAIXO_DO_PISO (CTN art. 148)');
    expect(guard.check).toHaveBeenCalledWith(SCOPE, SALE_ID, expect.objectContaining({ forEmission: false, persistSnapshot: false }));
  });

  it('a emissão roda a guarda com efeito (grava o custo, audita o bloqueio) e não chama a porta', async () => {
    const guard = guarda([{ code: 'PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO', severity: 'BLOCK', legalBasis: 'LC 214 art. 12 § 3º' }]);
    const { service, repo } = montar({ guard });
    await expect(service.emit(SCOPE, SALE_ID, 'NFCE')).rejects.toMatchObject({
      details: { faltantes: ['fiscal_guard: PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO (LC 214 art. 12 § 3º)'] },
    });
    expect(guard.check).toHaveBeenCalledWith(SCOPE, SALE_ID, expect.objectContaining({ forEmission: true, persistSnapshot: true }));
    expect(repo.createSent).not.toHaveBeenCalled();
  });

  it('WARN não bloqueia a NFC-e', async () => {
    const { service } = montar({ guard: guarda([{ code: 'SEM_CUSTO', severity: 'WARN', legalBasis: 'CTN art. 148' }]) });
    expect((await service.preview(SCOPE, SALE_ID, 'NFCE')).ok).toBe(true);
  });

  it('venda só de serviço não chega à guarda pela NFC-e (já recusada por não ter produto)', async () => {
    const guard = guarda([]);
    const { service } = montar({ guard, itens: [{ serviceId: 'srv-A', type: 'Service', quantity: 1, unitPrice: 50 }] });
    expect((await service.preview(SCOPE, SALE_ID, 'NFCE')).ok).toBe(false);
    expect(guard.check).not.toHaveBeenCalled();
  });
});
