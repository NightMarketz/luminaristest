/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, PR-1, BRIEF itens 6–10; F-XP-2/3 a) — contrato HTTP ponta a ponta do
 * perfil fiscal da EMPRESA por ano, dos signatários não-contador e do endpoint de obrigações.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-x13';
const BASE = '/api/accounting/company-fiscal-profile';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let contadorId: string;

const SIGNER = { unitId: UNIT, nome: 'Maria Sócia', cpf: '529.982.247-25', qualifEcd: '205', qualifEcf: '205', email: 'maria@empresa.com.br', fone: '11987654321' };
const DECLARANTE_COMPLETO = {
  nome: 'Salao Bela LTDA', cnpj: '12345678000195', uf: 'SP', codMun: '3550308', codNat: '2062', cnaeFiscal: '9602501',
  endereco: 'Rua A', bairro: 'Centro', cep: '01001000', email: 'contato@bela.com.br',
};

const put = (ano: number, body: Record<string, unknown>, who = dono) =>
  request(app).put(`${BASE}/${ano}`).set(authHeader(who)).send({ unitId: UNIT, ...body });
const get = (ano: number, who = dono) => request(app).get(`${BASE}/${ano}`).set(authHeader(who)).query({ unitId: UNIT });
const obrigacoes = (ano: number) => request(app).get(`${BASE}/${ano}/obligations`).set(authHeader(dono)).query({ unitId: UNIT });
const eventos = (eventType: string) => prisma.auditEvent.findMany({ where: { eventType }, orderBy: { seq: 'asc' } });
// AuditEvent.seq é BigInt — JSON.stringify puro lança; o replacer só existe para inspecionar a linha inteira.
const dump = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? String(x) : x));

describe('X13 PR-1 — perfil fiscal da empresa, signatários e obrigações', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'x13', username: 'x13-dono', email: 'x13@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'x13b', username: 'x13-outro', email: 'x13b@test.local', password: 'x', role: 'USER' } });
    const c = await prisma.accountingContact.create({
      data: { userId: dono.id, unitId: UNIT, name: 'Contabil Silva', email: 'silva@c.com', cpf: '52998224725', phone: '1133334444', crcNumber: 'SP-123456/O-1', crcUf: 'SP' },
    });
    contadorId = c.id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET sem perfil → 404 company_fiscal_profile_missing; obrigações → 200 perfil AUSENTE (item 9)', async () => {
    expect((await get(2026)).status).toBe(404);
    const r = await obrigacoes(2026);
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ ano: 2026, perfil: 'AUSENTE', obrigacoes: [], avisos: [] });
  });

  it('PUT recusa corpo inválido: ecf em SIMPLES, ano < 2014, chave extra (item 5)', async () => {
    expect((await put(2026, { regime: 'SIMPLES', ecf: { indAliqCsll: '1', indRecReceita: '2' } })).status).toBe(400);
    expect((await put(2013, { regime: 'REAL' })).status).toBe(400);
    expect((await put(2026, { regime: 'REAL', foo: 1 })).status).toBe(400);
  });

  it('MEI: ECD FACULTATIVA sem faltantes, ECF NAO_SE_APLICA → perfil COMPLETO (LC 123 art. 18-A; IN 2.004 art. 1º §1º I)', async () => {
    expect((await put(2024, { regime: 'MEI' })).status).toBe(200);
    const r = await obrigacoes(2024);
    expect(r.body.data.perfil).toBe('COMPLETO');
    expect(r.body.data.obrigacoes).toEqual([
      expect.objectContaining({ obrigacao: 'ECD', status: 'FACULTATIVA', faltantes: [] }),
      expect.objectContaining({ obrigacao: 'ECF', status: 'NAO_SE_APLICA', faltantes: [] }),
    ]);
  });

  it('signatário: CRUD, 900 recusado, CPF normalizado; auditoria só com qualificações (itens 8 e 10)', async () => {
    expect((await request(app).post('/api/accounting/company-signers').set(authHeader(dono)).send({ ...SIGNER, qualifEcd: '900' })).status).toBe(400);
    const c = await request(app).post('/api/accounting/company-signers').set(authHeader(dono)).send(SIGNER);
    expect(c.status).toBe(201);
    expect(c.body.data.cpf).toBe('52998224725');
    const list = await request(app).get('/api/accounting/company-signers').set(authHeader(dono)).query({ unitId: UNIT });
    expect(list.body.data.map((s: { id: string }) => s.id)).toEqual([c.body.data.id]);
    const u = await request(app).put(`/api/accounting/company-signers/${c.body.data.id}`).set(authHeader(dono)).send({ ...SIGNER, qualifEcd: '203' });
    expect(u.status).toBe(200);
    expect(u.body.data.qualifEcd).toBe('203');
    const ev = [...(await eventos('company_signer.created')), ...(await eventos('company_signer.updated'))];
    expect(ev).toHaveLength(2);
    for (const e of ev) {
      const p = dump(e);
      for (const pii of ['Maria', '52998224725', 'maria@empresa', '11987654321']) expect(p).not.toContain(pii);
    }
  });

  it('PRESUMIDO incompleto → faltantes nomeados; contador/signatário de outro dono → 404 (item 7, 9)', async () => {
    const signerId = (await prisma.companySigner.findFirstOrThrow({ where: { userId: dono.id } })).id;
    expect((await put(2025, { regime: 'PRESUMIDO', contadorContactId: 'nao-existe' })).status).toBe(404);
    // signatário do dono não é visível ao outro usuário
    expect((await put(2025, { regime: 'PRESUMIDO', representanteLegalSignerId: signerId }, outro)).status).toBe(404);

    expect((await put(2025, { regime: 'PRESUMIDO' })).status).toBe(200);
    const r = await obrigacoes(2025);
    const [ecd, ecf] = r.body.data.obrigacoes;
    expect(r.body.data.perfil).toBe('INCOMPLETO');
    // condições null → CONDICIONAL e as 3 perguntas viram faltantes
    expect(ecd.status).toBe('CONDICIONAL');
    expect(ecd.faltantes).toEqual(expect.arrayContaining([
      'condicoes.aporteInvestidorAnjo', 'condicoes.livroCaixaSemEscrituracao', 'condicoes.distribuicaoAcimaBase',
      'declarante.nome', 'declarante.cnpj', 'grandePorte', 'ecd.numOrd', 'representanteLegalSignerId', 'contadorContactId',
    ]));
    expect(ecf).toMatchObject({ status: 'OBRIGATORIA' });
    expect(ecf.faltantes).toEqual(expect.arrayContaining(['ecf.indAliqCsll', 'ecf.indRecReceita', 'declarante.codNat', 'representanteLegalSignerId']));
  });

  it('PRESUMIDO completo → COMPLETO; GET devolve o perfil; evento sem declarante (itens 6, 9, 10)', async () => {
    const signerId = (await prisma.companySigner.findFirstOrThrow({ where: { userId: dono.id } })).id;
    const body = {
      regime: 'PRESUMIDO',
      grandePorte: false,
      condicoes: { aporteInvestidorAnjo: false, livroCaixaSemEscrituracao: false, distribuicaoAcimaBase: false },
      declarante: DECLARANTE_COMPLETO,
      ecd: { indNire: '1', nire: '35200000000', numOrd: '7', natLivr: 'DIARIO GERAL' },
      ecf: { indAliqCsll: '1', indRecReceita: '2' },
      contadorContactId: contadorId,
      representanteLegalSignerId: signerId,
    };
    expect((await put(2025, body)).status).toBe(200);
    const g = await get(2025);
    expect(g.body.data).toMatchObject({ ano: 2025, regime: 'PRESUMIDO', ecd: { numOrd: '7' }, declarante: { cnpj: '12345678000195' } });
    const r = await obrigacoes(2025);
    expect(r.body.data.perfil).toBe('COMPLETO');
    expect(r.body.data.obrigacoes.map((o: { status: string }) => o.status)).toEqual(['OBRIGATORIA', 'OBRIGATORIA']);
    const ev = await eventos('company_fiscal_profile.updated');
    const ultimo = dump(ev[ev.length - 1]);
    for (const pii of ['Salao Bela', '12345678000195', 'contato@bela', 'DIARIO GERAL']) expect(ultimo).not.toContain(pii);
    expect(ultimo).toContain('PRESUMIDO');
  });

  it('outro dono não enxerga o perfil (chave = dono, R8): GET → 404', async () => {
    expect((await get(2025, outro)).status).toBe(404);
  });

  it('cópia do ano anterior (F-XP-2/3 a): 201 sem numOrd; destino existente → 409; origem ausente → 404', async () => {
    const c = await request(app).post(`${BASE}/2026/copiar-de/2025`).set(authHeader(dono)).send({ unitId: UNIT });
    expect(c.status).toBe(201);
    expect(c.body.data).toMatchObject({ ano: 2026, regime: 'PRESUMIDO', ecd: { numOrd: null, natLivr: 'DIARIO GERAL' }, declarante: { cnpj: '12345678000195' } });
    expect((await obrigacoes(2026)).body.data.obrigacoes[0].faltantes).toEqual(['ecd.numOrd']);
    expect((await request(app).post(`${BASE}/2026/copiar-de/2025`).set(authHeader(dono)).send({ unitId: UNIT })).status).toBe(409);
    expect((await request(app).post(`${BASE}/2027/copiar-de/2019`).set(authHeader(dono)).send({ unitId: UNIT })).status).toBe(404);
    const ev = await eventos('company_fiscal_profile.updated');
    expect(dump(ev[ev.length - 1])).toContain('2025'); // copiadoDe
  });

  it('signatário em uso → 409; depois de soltar do perfil, exclusão soft funciona (item 8)', async () => {
    const signerId = (await prisma.companySigner.findFirstOrThrow({ where: { userId: dono.id } })).id;
    const del = () => request(app).delete(`/api/accounting/company-signers/${signerId}`).set(authHeader(dono)).query({ unitId: UNIT });
    expect((await del()).status).toBe(409);
    await put(2025, { regime: 'PRESUMIDO' });
    await put(2026, { regime: 'PRESUMIDO' });
    expect((await del()).status).toBe(200);
    expect((await prisma.companySigner.findUniqueOrThrow({ where: { id: signerId } })).deletedAt).not.toBeNull();
    expect((await del()).status).toBe(404);
  });

  it('DELETE do perfil é soft; o PUT seguinte revive a linha (mesma @@unique); DELETE repetido → 404', async () => {
    const d = () => request(app).delete(`${BASE}/2024`).set(authHeader(dono)).query({ unitId: UNIT });
    expect((await d()).status).toBe(200);
    expect((await get(2024)).status).toBe(404);
    expect((await d()).status).toBe(404);
    expect((await put(2024, { regime: 'SIMPLES' })).status).toBe(200);
    expect(await prisma.companyFiscalProfile.count({ where: { userId: dono.id, anoCalendario: 2024 } })).toBe(1);
    expect((await eventos('company_fiscal_profile.deleted')).length).toBe(1);
  });
});
