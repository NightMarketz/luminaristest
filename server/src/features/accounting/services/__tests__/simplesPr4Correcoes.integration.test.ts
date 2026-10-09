/**
 * X14 PR-4 — correções decididas pelo dono em 2026-10-09 (docs/accounting/PESQUISA-X14-PR4-LACUNAS-2026-10-09.md,
 * questionário do fim). Um cenário por usuário: o perfil fiscal é por (usuário, ano). Os valores esperados são
 * aritmética sobre a lei, não oráculo — o oráculo é o DAS do portal e a NFS-e real (gates humanos).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import { resolveAccountingScope, type AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { LegalParameterService } from '@/features/legalParameters/services/LegalParameterService';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';

const app = makeApp();
const S = '/api/accounting/simples';
const f = () => ApplicationFactory.getInstance();

interface Cenario {
  user: { id: string; username: string };
  unit: string;
  scope: () => AccountingScope;
}
let n = 0;
async function cenario(nome: string): Promise<Cenario> {
  const u = await prisma.user.create({ data: { name: nome, username: nome, email: `${nome}@test.local`, password: 'x', role: 'USER' } });
  const c: Cenario = { user: { id: u.id, username: u.username }, unit: `unit-${nome}`, scope: () => resolveAccountingScope({ userId: u.id }, `unit-${nome}`) };
  await f().getPostingService().ensureChartOfAccounts(c.scope());
  return c;
}
const perfil = (c: Cenario, ano: number, body: Record<string, unknown>) =>
  request(app).put(`/api/accounting/company-fiscal-profile/${ano}`).set(authHeader(c.user)).send({ unitId: c.unit, ...body });
const historico = (c: Cenario, competencia: string, cents: number) =>
  f().getSimplesEntradasService().upsertHistorico(c.scope(), competencia, { unitId: c.unit, receitaBrutaCents: cents });
const servico = (c: Cenario, serviceRef: string, cTribNac: string) =>
  prisma.serviceFiscalProfile.create({ data: { userId: c.user.id, unitId: c.unit, serviceRef, cTribNac } });
const linha = (c: Cenario, competencia: string, cents: number, extra: Record<string, unknown> = {}) =>
  prisma.receitaFiscalLinha.create({
    data: { userId: c.user.id, unitId: c.unit, competencia, dia: `${competencia}-10`, saleId: `sale-${++n}`, itemRef: `item-${n}`, natureza: 'SERVICO', cTribNac: '060101', receitaCents: BigInt(cents), excluir: [], ...extra },
  });
const aliquotas = (c: Cenario, m: string) => request(app).get(`${S}/aliquotas/${m}`).query({ unitId: c.unit }).set(authHeader(c.user));
const calcular = (c: Cenario, m: string) => request(app).post(`${S}/apuracoes/${m}/calcular`).set(authHeader(c.user)).send({ unitId: c.unit });
type Atividade = { natureza: string; cTribNac: string | null; aliquotaEfetiva: string; issRetencao: string | null; faixa?: number; percentuais?: Record<string, string>; creditoAdquirente?: Record<string, string | null> | null };
const doServico = (body: { data: { atividades: Atividade[] } }, cTribNac = '060101') => body.data.atividades.find((a) => a.natureza === 'SERVICO' && a.cTribNac === cTribNac);
const codigos = (body: { data: { alertas: Array<{ codigo: string }> } }) => body.data.alertas.map((a) => a.codigo);

/** Tira da fotografia as linhas de uma tabela — simula a carga incompleta do F-PR4-7. */
function semTabela(tabela: string) {
  const original = LegalParameterService.prototype.fotografia;
  return jest.spyOn(LegalParameterService.prototype, 'fotografia').mockImplementation(async function (this: LegalParameterService, tabelas) {
    return (await original.call(this, tabelas)).filter((l) => l.tabela !== tabela);
  });
}

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

describe('F-PR4-1/F-PR4-3 — mês de início de atividade (LC 123 art. 21 § 4º II; Res. CGSN 140 art. 2º V e art. 27 II)', () => {
  let c: Cenario;
  beforeAll(async () => {
    c = await cenario('pr4inicio');
    expect((await perfil(c, 2026, { regime: 'SIMPLES', inicioAtividadeEm: '2026-08-15' })).status).toBe(200);
    await servico(c, 'srv-corte', '060101');
  });

  it('prestação no mês de abertura do CNPJ: 2% por atividade do cadastro, com o aviso da diferença no mês seguinte', async () => {
    const r = await aliquotas(c, '2026-08');
    expect(r.status).toBe(200);
    expect(doServico(r.body)?.issRetencao).toBe('2.0000');
  });

  it('2º mês (F-PR4-2 a): receita do mês de início × 12 — R$ 10.000 × 12 = R$ 120.000, 1ª faixa do Anexo III: 6% × 33,5% = 2,0100%', async () => {
    await linha(c, '2026-08', 1_000_000);
    const r = await aliquotas(c, '2026-09');
    expect(r.status).toBe(200);
    expect(doServico(r.body)).toMatchObject({ aliquotaEfetiva: '6.0000', issRetencao: '2.0100' });
  });
});

describe('F-PR4-4/F-PR4-6 — atividade do cadastro sem receita no mês anterior; a rota sugere com memória de cálculo', () => {
  let c: Cenario;
  beforeAll(async () => {
    c = await cenario('pr4semreceita');
    expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
    await servico(c, 'srv-corte', '060101');
    // R$ 50.000/mês de 2025-06 a 2026-05 → RBT12 de 2026-06 = R$ 600.000; nenhuma venda em 2026-06.
    for (let i = 0; i < 12; i++) await historico(c, new Date(Date.UTC(2025, 5 + i, 1)).toISOString().slice(0, 7), 5_000_000);
  });

  it('F-PR4-4: a atividade aparece pela faixa do RBT12 global (10,56% × 32,50% = 3,4320%) sem receita em 2026-06', async () => {
    const r = await aliquotas(c, '2026-07');
    expect(r.status).toBe(200);
    expect(doServico(r.body)).toMatchObject({ aliquotaEfetiva: '10.5600', issRetencao: '3.4320' });
  });

  it('F-PR4-6: payload de sugestão — PA, RBT12, janela, faixa, regra e o aviso de responsabilidade do prestador', async () => {
    const r = await aliquotas(c, '2026-07');
    expect(r.body.data).toMatchObject({
      sugestao: true,
      periodoApuracao: '2026-06',
      rbt12Cents: 60_000_000,
      janelaRbt12: { de: '2025-06', ate: '2026-05' },
      regra: 'FAIXA_MES_ANTERIOR',
    });
    expect(doServico(r.body)?.faixa).toBe(3);
    expect(r.body.data.avisos.join(' ')).toContain('LC 123 art. 21 § 4º VI');
  });
});

describe('F-PR4-5 — sem piso de 2% no percentual da tabela', () => {
  it('RBT12 de R$ 180.000,01 (2ª faixa do Anexo III): ISS = 6% × 32% = 1,9200%, não 2%', async () => {
    const c = await cenario('pr4piso');
    expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
    await servico(c, 'srv-corte', '060101');
    await historico(c, '2025-06', 18_000_001);
    const r = await aliquotas(c, '2026-07');
    expect(r.status).toBe(200);
    expect(doServico(r.body)?.issRetencao).toBe('1.9200');
  });
});

describe('F-PR4-2 (2027) — a faixa é a do mês da prestação (LC 227 art. 169; LC 214 art. 517): janela M−13…M−2, tabelas de M', () => {
  let c: Cenario;
  beforeAll(async () => {
    c = await cenario('pr42027');
    expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
    expect((await perfil(c, 2027, { regime: 'SIMPLES' })).status).toBe(200);
    for (let m = 1; m <= 11; m++) await historico(c, `2026-${String(m).padStart(2, '0')}`, 5_000_000);
    await linha(c, '2026-12', 5_000_000);
    await linha(c, '2027-01', 1_000_000);
    await linha(c, '2027-02', 1_000_000);
  });

  it('2027-02: a alíquota sugerida é a da apuração do próprio mês (RBT12 de 2026-01…2026-12), não a de 2027-01', async () => {
    const apurada = (await calcular(c, '2027-02')).body.data.atividades[0] as Atividade;
    const r = await aliquotas(c, '2027-02');
    expect(r.status).toBe(200);
    expect(doServico(r.body)).toMatchObject({ aliquotaEfetiva: apurada.aliquotaEfetiva, issRetencao: apurada.percentuais?.ISS });
  });

  it('2027-01: as tabelas são as de 2027 — o crédito do adquirente traz a CBS da faixa', async () => {
    const apurada = (await calcular(c, '2027-01')).body.data.atividades[0] as Atividade;
    expect(apurada.percentuais?.CBS).toBeDefined();
    const r = await aliquotas(c, '2027-01');
    expect(doServico(r.body)?.creditoAdquirente?.CBS).toBe(apurada.percentuais?.CBS);
  });
});

describe('F-PR4-7 — linha de SIMPLES_LIMITE ausente falha ruidoso (sem `?? 0`)', () => {
  it('ME/EPP: calcular sem SIMPLES_LIMITE ⇒ 400 PARAMETRO_LEGAL_AUSENTE', async () => {
    const c = await cenario('pr4limme');
    expect((await perfil(c, 2026, { regime: 'SIMPLES' })).status).toBe(200);
    await linha(c, '2026-06', 1_000_000);
    const spy = semTabela('SIMPLES_LIMITE');
    const r = await calcular(c, '2026-06');
    spy.mockRestore();
    expect([r.status, r.body.code]).toEqual([400, 'PARAMETRO_LEGAL_AUSENTE']);
  });

  it('MEI: calcular sem SIMPLES_LIMITE ⇒ 400 PARAMETRO_LEGAL_AUSENTE', async () => {
    const c = await cenario('pr4limmei');
    expect((await perfil(c, 2026, { regime: 'MEI', meiContribuinteIcms: false, meiContribuinteIss: true })).status).toBe(200);
    const spy = semTabela('SIMPLES_LIMITE');
    const r = await calcular(c, '2026-03');
    spy.mockRestore();
    expect([r.status, r.body.code]).toEqual([400, 'PARAMETRO_LEGAL_AUSENTE']);
  });
});

describe('F-PR4-13 — MEI transportador autônomo de cargas (Res. CGSN 140 art. 100 § 1º-A)', () => {
  let c: Cenario;
  beforeAll(async () => {
    c = await cenario('pr4tac');
  });

  it('limite anual de R$ 251.600,00: R$ 100.000 no ano não excede', async () => {
    expect((await perfil(c, 2025, { regime: 'MEI', meiContribuinteIcms: true, meiContribuinteIss: false, meiTransportadorCargas: true })).status).toBe(200);
    await historico(c, '2025-01', 10_000_000);
    const r = await calcular(c, '2025-01');
    expect(r.status).toBe(200);
    expect(r.body.data.limiteAnoCents).toBe(25_160_000);
    expect(codigos(r.body)).not.toContain('LIMITE_MEI_EXCEDIDO');
  });

  it('ano de início (julho): R$ 20.966,67 × 6 = R$ 125.800,02', async () => {
    expect((await perfil(c, 2024, { regime: 'MEI', meiContribuinteIcms: true, meiContribuinteIss: false, meiTransportadorCargas: true, inicioAtividadeEm: '2024-07-01' })).status).toBe(200);
    const r = await calcular(c, '2024-07');
    expect(r.body.data.limiteAnoCents).toBe(12_580_002);
  });
});

describe('F-PR4-9 — NFS-e do MEI: só a receita de serviço a tomador CNPJ exige nota (LC 123 art. 26 § 6º II; Res. CGSN 140 art. 106 II)', () => {
  let c: Cenario;
  let tables: Record<'sales' | 'saleItems' | 'customers' | 'units', string>;
  const row = async (table: keyof typeof tables, data: Record<string, unknown>) => {
    const stored = typeof data.date === 'string' ? { ...data, date: `${data.date}T00:00:00.000Z` } : data;
    return prisma.dynamicTableData.create({ data: { dynamicTableId: tables[table], data: stored as never } });
  };
  const vender = async (date: string, reais: number, customerId?: string) => {
    const sale = await row('sales', { status: 'Finalized', unitId: c.unit, totalAmount: reais, currency: 'BRL', date, paymentStatus: 'Pending', ...(customerId ? { customerId } : {}) });
    await row('saleItems', { saleId: sale.id, type: 'Service', serviceId: 'srv-corte', description: 'Corte', quantity: 1, unitPrice: reais });
    await maybeSyncSaleFinalized({ userId: c.user.id }, tables.sales, { id: sale.id, data: sale.data });
  };
  const nfseDiverge = async () => ((await calcular(c, '2026-03')).body.data.alertas as Array<{ codigo: string; detalhe: string }>).find((a) => a.codigo === 'NFSE_DIVERGE_RECEITA');

  beforeAll(async () => {
    const u = await prisma.user.create({ data: { name: 'pr4tomador', username: 'pr4tomador', email: 'pr4tomador@test.local', password: 'x', role: 'USER' } });
    const user = { id: u.id, username: u.username };
    expect((await request(app).post('/api/dashboard/create').set(authHeader(user)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' } })).status).toBe(201);
    const byName = async (nome: string) => (await prisma.dynamicTable.findFirstOrThrow({ where: { userId: u.id, internalName: nome } })).id;
    tables = { sales: await byName('sales'), saleItems: await byName('saleItems'), customers: await byName('customers'), units: await byName('units') };
    const unit = (await prisma.dynamicTableData.create({ data: { dynamicTableId: tables.units, data: { name: 'Matriz', cnpj: '11222333000181' } as never } })).id;
    c = { user, unit, scope: () => resolveAccountingScope({ userId: u.id }, unit) };
    await f().getPostingService().ensureChartOfAccounts(c.scope());
    await prisma.accountingPeriod.create({ data: { userId: u.id, unitId: unit, year: 2026, month: 3, status: 'OPEN', openedAt: new Date() } });
    await servico(c, 'srv-corte', '060101');
    expect((await perfil(c, 2026, { regime: 'MEI', meiContribuinteIcms: false, meiContribuinteIss: true })).status).toBe(200);
  });

  it('serviço a consumidor pessoa física (CPF) sem NFS-e: dispensado, sem alerta', async () => {
    const pf = (await row('customers', { name: 'Ana', taxId: '52998224725' })).id;
    await vender('2026-03-10', 500, pf);
    expect(await nfseDiverge()).toBeUndefined();
  });

  it('serviço a tomador CNPJ sem NFS-e: o alerta compara só a receita a CNPJ (R$ 300), não a da pessoa física', async () => {
    const pj = (await row('customers', { name: 'Empresa', taxId: '11444777000161' })).id;
    await vender('2026-03-11', 300, pj);
    expect((await nfseDiverge())?.detalhe).toContain('R$ 300.00');
  });
});

describe('F-PR4-11 — cota de aluguel do salão-parceiro fora da conferência NFS-e também no MEI (Lei 12.592 art. 1º-A §§ 4º–5º)', () => {
  it('serviço de R$ 1.000 com cota do profissional R$ 600 e cota do salão a título de aluguel de bem móvel: sem NFS-e devida, sem alerta', async () => {
    const c = await cenario('pr4meicota');
    expect((await perfil(c, 2026, { regime: 'MEI', meiContribuinteIcms: false, meiContribuinteIss: true })).status).toBe(200);
    const contrato = await prisma.salaoParceriaContrato.create({
      data: { userId: c.user.id, unitId: c.unit, profissionalContactId: 'prof-1', cotaSalaoBp: 4_000, naturezaCota: 'ALUGUEL_BEM_MOVEL', homologadoEm: '2026-01-02', sindicato: 'MTE', vigenteDesde: '2026-01-01', createdById: c.user.id, updatedById: c.user.id },
    });
    await linha(c, '2026-03', 100_000, { parceriaContratoId: contrato.id, cotaProfissionalCents: 60_000n, tomadorTipo: 'CNPJ' }); // CNPJ: sem o F-PR4-9 decidir
    const r = await calcular(c, '2026-03');
    expect(r.status).toBe(200);
    expect(codigos(r.body)).not.toContain('NFSE_DIVERGE_RECEITA');
  });
});
