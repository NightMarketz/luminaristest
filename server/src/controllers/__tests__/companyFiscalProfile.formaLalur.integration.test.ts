/**
 * X7 Fase B PR-4 — liberação do `ANUAL` pelo caminho real do perfil (BRIEF-B itens 1 e 2; teste 26 l), sobre o app
 * Express REAL + SQLite REAL. Até o PR-3 os testes semeavam o perfil `ANUAL` pelo Prisma (custo assumido no
 * BRIEF-B §3.1); aqui ele passa pelo DTO + service. O que só a fiação prova: o perfil (da empresa) enxerga o e-Lalur
 * de OUTRA unidade do dono (decisão do dono, 05/10 — lacuna 2 do PR-4) e recusa a troca de forma que deixaria linha
 * órfã (F-TB-6 a), nos dois sentidos.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT_PERFIL = 'unit-forma-a';
const UNIT_LALUR = 'unit-forma-b';
const ANO = 2027;
const ECF = { indAliqCsll: '1', indRecReceita: '2' };
let dono: { id: string; username: string };

const putPerfil = (formaApuracaoIrpjCsll: string | null) =>
  request(app)
    .put(`/api/accounting/company-fiscal-profile/${ANO}`)
    .set(authHeader(dono))
    .send({ unitId: UNIT_PERFIL, regime: 'REAL', ecf: ECF, formaApuracaoIrpjCsll, lucroRealObrigatorio: false });
const lalur = (quarter: string) =>
  request(app).post('/api/lalur/entries').set(authHeader(dono)).send({
    unitId: UNIT_LALUR, year: ANO, quarter, livro: 'lalur', codigo: '7', valorCents: 1000, indRelacao: '4', histLancamento: 'nd',
  });
const archive = (id: string) => request(app).post(`/api/lalur/entries/${id}/archive`).set(authHeader(dono)).send({ unitId: UNIT_LALUR });

describe('perfil fiscal × e-Lalur do ano (X7 Fase B PR-4, itens 1–2; teste 26 l)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'forma', username: 'forma-lalur', email: 'forma-lalur@test.local', password: 'x', role: 'USER' } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('TRIMESTRAL → ANUAL com linha T01 em outra unidade ⇒ 400 listando período, livro e quantidade; nada gravado', async () => {
    const t01 = await lalur('T01'); // sem perfil ⇒ e-Lalur trimestral (D-2026-10-05-X7-FASE-B-PR2-LACUNAS §1)
    expect(t01.status).toBe(201);
    const r = await putPerfil('ANUAL');
    expect(r.status).toBe(400);
    expect(String(r.body.message)).toMatch(/FORMA_COM_LALUR: 2027 tem e-Lalur na forma TRIMESTRAL \(T01 lalur: 1\)/);
    expect(await prisma.companyFiscalProfile.count({ where: { userId: dono.id, anoCalendario: ANO } })).toBe(0);
    // mesma forma efetiva não é troca: REAL TRIMESTRAL (ou nula) passa com a linha lá
    expect((await putPerfil('TRIMESTRAL')).status).toBe(200);
    expect((await putPerfil(null)).status).toBe(200);
    // arquivada a linha, o ANUAL passa pelo DTO e pelo service (item 1)
    expect((await archive(t01.body.data.id)).status).toBe(200);
    const anual = await putPerfil('ANUAL');
    expect(anual.status).toBe(200);
    expect(anual.body.data).toMatchObject({ formaApuracaoIrpjCsll: 'ANUAL' });
  });

  it('ANUAL → TRIMESTRAL com linha A03 ⇒ 400; o e-Lalur da forma nova continua coerente', async () => {
    const a03 = await lalur('A03');
    expect(a03.status).toBe(201);
    const r = await putPerfil('TRIMESTRAL');
    expect(r.status).toBe(400);
    expect(String(r.body.message)).toMatch(/FORMA_COM_LALUR: 2027 tem e-Lalur na forma ANUAL \(A03 lalur: 1\)/);
    const perfil = await prisma.companyFiscalProfile.findFirst({ where: { userId: dono.id, anoCalendario: ANO } });
    expect(perfil?.formaApuracaoIrpjCsll).toBe('ANUAL');
    expect((await lalur('T02')).status).toBe(400); // período × forma (item 12) segue valendo
  });
});
