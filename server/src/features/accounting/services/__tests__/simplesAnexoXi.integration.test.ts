/**
 * SIMPLES-PISO-ANEXO-XI bloco 2 (BRIEF §3 itens 12-15 + decisões do dono, chat, 10/10) — o Anexo XI da Res. CGSN 140
 * (tabela MEI_ANEXO_XI, semente v6, vigente desde 2025-10-01) no perfil e na apuração do SIMEI.
 * Chaves usadas (fixture anexo-xi-res-cgsn-140-2018.json): A-0002 acabador de calçados (ISS S / ICMS S, 1531-9/02);
 * A-0050 cabeleireiro (ISS S / ICMS N, 9602-5/01); B-0001 transportador de carga municipal (Tabela B, 4930-2/01).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { ApplicationFactory } from '@/lib/factory';

const app = makeApp();
const S = '/api/accounting/simples';
const f = () => ApplicationFactory.getInstance();
type Cenario = { user: { id: string; username: string }; unit: string };

const cenario = async (nome: string): Promise<Cenario> => {
  const u = await prisma.user.create({ data: { name: nome, username: nome, email: `${nome}@test.local`, password: 'x', role: 'USER' } });
  const c = { user: { id: u.id, username: u.username }, unit: `unit-${nome}` };
  await f().getPostingService().ensureChartOfAccounts(resolveAccountingScope({ userId: u.id }, c.unit));
  return c;
};
const perfil = (c: Cenario, ano: number, extra: Record<string, unknown>) =>
  request(app).put(`/api/accounting/company-fiscal-profile/${ano}`).set(authHeader(c.user)).send({ unitId: c.unit, regime: 'MEI', ...extra });
const calcular = (c: Cenario, comp: string) => request(app).post(`${S}/apuracoes/${comp}/calcular`).set(authHeader(c.user)).send({ unitId: c.unit });
const alerta = (body: { data: { alertas: Array<{ codigo: string; detalhe: string }> } }, codigo: string) => body.data.alertas.find((a) => a.codigo === codigo);
const unidadeComCnae = (c: Cenario, cnae: string) =>
  prisma.fiscalProfile.create({ data: { userId: c.user.id, unitId: c.unit, regimeTributario: 'SIMPLES', pisCofinsRegime: 'SIMPLES', cnae } });

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

describe('item 12 — meiOcupacoes no perfil (opcional; chave inexistente ⇒ 400; apuração exige)', () => {
  let c: Cenario;
  beforeAll(async () => {
    c = await cenario('axi12');
  });

  it('chave fora do Anexo XI ⇒ 400 listando a chave (decisão 2)', async () => {
    const r = await perfil(c, 2026, { meiContribuinteIcms: false, meiContribuinteIss: true, meiOcupacoes: ['A-0050', 'A-9999'] });
    expect([r.status, r.body.details]).toEqual([400, { meiOcupacoes: ['A-9999'] }]);
  });

  it('fora do regime MEI ⇒ 400 (o enquadramento do Anexo XI é do MEI)', async () => {
    expect((await perfil(c, 2026, { regime: 'SIMPLES', meiOcupacoes: ['A-0050'] })).status).toBe(400);
  });

  it('perfil MEI sem ocupações é aceito (onboarding F-OBP-6 c), mas o SIMEI bloqueia com erro estruturado (decisão 4)', async () => {
    const p = await perfil(c, 2026, { meiContribuinteIcms: false, meiContribuinteIss: true });
    expect([p.status, p.body.data.meiOcupacoes]).toEqual([200, null]);
    const r = await calcular(c, '2026-03');
    expect([r.status, r.body.code, r.body.details]).toEqual([400, 'MEI_OCUPACOES_NAO_DECLARADAS', { campo: 'meiOcupacoes', competencia: '2026-03' }]);
  });

  it('com ocupação válida: grava, devolve e apura (valores do X14 PR-4 inalterados)', async () => {
    const p = await perfil(c, 2026, { meiContribuinteIcms: false, meiContribuinteIss: true, meiOcupacoes: ['A-0050'] });
    expect([p.status, p.body.data.meiOcupacoes]).toEqual([200, ['A-0050']]);
    const r = await calcular(c, '2026-03');
    expect([r.status, r.body.data.tributos]).toEqual([200, { CPP: 8_105, ISS: 500 }]);
  });

  it('competência anterior à versão transcrita do Anexo XI (2025-10-01): sem checagem, como antes', async () => {
    expect((await perfil(c, 2025, { meiContribuinteIcms: false, meiContribuinteIss: true })).status).toBe(200);
    expect((await calcular(c, '2025-03')).status).toBe(200);
  });
});

describe('item 13 — ICMS/ISS das ocupações × declarado (alerta, o declarado manda)', () => {
  it('cabeleireiro (ISS S / ICMS N) declarado ICMS S ⇒ MEI_ENQUADRAMENTO_DIVERGE e a parcela de ICMS continua', async () => {
    const c = await cenario('axi13');
    expect((await perfil(c, 2026, { meiContribuinteIcms: true, meiContribuinteIss: true, meiOcupacoes: ['A-0050'] })).status).toBe(200);
    const r = await calcular(c, '2026-03');
    expect(r.status).toBe(200);
    expect(r.body.data.tributos).toEqual({ CPP: 8_105, ICMS: 100, ISS: 500 });
    expect(alerta(r.body, 'MEI_ENQUADRAMENTO_DIVERGE')?.detalhe).toContain('ICMS N / ISS S');
  });

  it('ocupações coerentes com o declarado ⇒ sem alerta (ICMS S de uma ocupação basta)', async () => {
    const c = await cenario('axi13b');
    expect((await perfil(c, 2026, { meiContribuinteIcms: true, meiContribuinteIss: true, meiOcupacoes: ['A-0050', 'A-0002'] })).status).toBe(200);
    expect(alerta((await calcular(c, '2026-03')).body, 'MEI_ENQUADRAMENTO_DIVERGE')).toBeUndefined();
  });
});

describe('item 14 — transportador autônomo de cargas × Tabela B (decisão 5)', () => {
  it('só Tabela B ⇒ limite MEI_TAC (R$ 251.600)', async () => {
    const c = await cenario('axi14b');
    expect((await perfil(c, 2026, { meiContribuinteIcms: false, meiContribuinteIss: true, meiTransportadorCargas: true, meiOcupacoes: ['B-0001'] })).status).toBe(200);
    const r = await calcular(c, '2026-03');
    expect([r.status, r.body.data.limiteAnoCents, alerta(r.body, 'MEI_TAC_COM_OCUPACAO_A')]).toEqual([200, 25_160_000, undefined]);
  });

  it('Tabela B + Tabela A ⇒ limite geral (R$ 81.000) e MEI_TAC_COM_OCUPACAO_A (§ 1º-B)', async () => {
    const c = await cenario('axi14ab');
    expect((await perfil(c, 2026, { meiContribuinteIcms: false, meiContribuinteIss: true, meiTransportadorCargas: true, meiOcupacoes: ['B-0001', 'A-0050'] })).status).toBe(200);
    const r = await calcular(c, '2026-03');
    expect([r.status, r.body.data.limiteAnoCents]).toEqual([200, 8_100_000]);
    expect(alerta(r.body, 'MEI_TAC_COM_OCUPACAO_A')?.detalhe).toContain('ocupação da Tabela A');
  });

  it('flag sem nenhuma ocupação da Tabela B ⇒ NÃO é 400: MEI comum, limite geral e alerta de risco', async () => {
    const c = await cenario('axi14a');
    expect((await perfil(c, 2026, { meiContribuinteIcms: false, meiContribuinteIss: true, meiTransportadorCargas: true, meiOcupacoes: ['A-0050'] })).status).toBe(200);
    const r = await calcular(c, '2026-03');
    expect([r.status, r.body.data.limiteAnoCents, r.body.data.tributos]).toEqual([200, 8_100_000, { CPP: 8_105, ISS: 500 }]);
    expect(alerta(r.body, 'MEI_TAC_COM_OCUPACAO_A')?.detalhe).toContain('sem ocupação da Tabela B');
  });
});

describe('item 15 — CNAE do CNPJ fora do Anexo XI ⇒ SIMEI bloqueado (F-AX-4; decisões 1 e 2)', () => {
  it('CNAE da unidade fora ⇒ 400 SIMEI_CNAE_FORA_ANEXO_XI com cnaesImpeditivos e efeitoDesenquadramento; o regime não muda', async () => {
    const c = await cenario('axi15');
    expect((await perfil(c, 2026, { meiContribuinteIcms: false, meiContribuinteIss: true, meiOcupacoes: ['A-0050'] })).status).toBe(200);
    await unidadeComCnae(c, '6201501');
    const r = await calcular(c, '2026-03');
    expect([r.status, r.body.code, r.body.details.cnaesImpeditivos]).toEqual([400, 'SIMEI_CNAE_FORA_ANEXO_XI', ['6201501']]);
    expect(r.body.details.efeitoDesenquadramento.atividadeIncluidaDepoisDoIngresso).toContain('art. 115 § 2º II "b" c/c § 3º II');
    expect(r.body.details.efeitoDesenquadramento.atividadeDesdeOIngresso).toContain('art. 115 § 4º II');
    const p = await request(app).get('/api/accounting/company-fiscal-profile/2026').query({ unitId: c.unit }).set(authHeader(c.user));
    expect(p.body.data.regime).toBe('MEI');
  });

  it('CNAE da unidade no Anexo XI (com máscara) ⇒ apura', async () => {
    const c = await cenario('axi15ok');
    expect((await perfil(c, 2026, { meiContribuinteIcms: false, meiContribuinteIss: true, meiOcupacoes: ['A-0050'] })).status).toBe(200);
    await unidadeComCnae(c, '9602-5/01');
    expect((await calcular(c, '2026-03')).status).toBe(200);
  });
});
