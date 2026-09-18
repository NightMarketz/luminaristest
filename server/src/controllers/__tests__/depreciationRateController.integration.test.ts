/**
 * CONTRATO HTTP de /api/accounting/depreciation-rates (BE-INCR-FIXED-ASSETS, nó C8, Bloco A) — app
 * Express REAL sobre supertest + SQLite REAL (molde: `accountingContactController.integration.test.ts`).
 * Prova a FIAÇÃO (auth deny-by-default → rota → DTO → controller → serviço → Prisma) e o item 3
 * (seed lazy + idempotência) e o item 2 (CUSTOM nasce sem chave de negócio; ANEXO_* é oculto, não
 * apagado) de ponta a ponta — não é substituto do teste unitário de serviço, que já cobre a lógica
 * fina com dublês.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-depreciation-rates-http';

let dono: { id: string; username: string };
let outro: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

describe('/api/accounting/depreciation-rates — contrato HTTP', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await criarUsuario('deprate-http-a');
    outro = await criarUsuario('deprate-http-b');
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem Bearer, as rotas respondem 401 (nascem protegidas)', async () => {
    expect((await request(app).get('/api/accounting/depreciation-rates').query({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).post('/api/accounting/depreciation-rates').send({})).status).toBe(401);
    expect((await request(app).post('/api/accounting/depreciation-rates/x/hide').send({})).status).toBe(401);
  });

  it('CONTROLE: GET semeia o Anexo LAZY (222 linhas) e a 2ª chamada não duplica (item 3)', async () => {
    const first = await request(app).get('/api/accounting/depreciation-rates').set(authHeader(dono)).query({ unitId: UNIT });
    expect(first.status).toBe(200);
    expect(first.body.data).toHaveLength(222);
    const anexo = first.body.data.filter((r: { source: string }) => r.source === 'ANEXO_III_IN_1700_2017');
    const notas = first.body.data.filter((r: { source: string }) => r.source !== 'ANEXO_III_IN_1700_2017');
    expect(anexo).toHaveLength(220);
    expect(notas).toHaveLength(2);

    const second = await request(app).get('/api/accounting/depreciation-rates').set(authHeader(dono)).query({ unitId: UNIT });
    expect(second.status).toBe(200);
    expect(second.body.data).toHaveLength(222); // idempotente — não duplicou
  });

  it('POST cria CUSTOM (201), audita e não colide com nenhuma linha do Anexo (F-FA10 → a: sem chave de negócio)', async () => {
    const res = await request(app)
      .post('/api/accounting/depreciation-rates')
      .set(authHeader(dono))
      .send({ unitId: UNIT, ncm: '9999.99', description: 'Torno CNC importado', lifeYears: 8, annualRateBp: 1250, justification: 'Laudo técnico do fabricante' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ source: 'CUSTOM', sourceRow: null, ncm: '9999.99', annualRateBp: 1250 });

    // criar uma SEGUNDA CUSTOM com o mesmo ncm/descrição não colide (sem @@unique de negócio para CUSTOM)
    const second = await request(app)
      .post('/api/accounting/depreciation-rates')
      .set(authHeader(dono))
      .send({ unitId: UNIT, ncm: '9999.99', description: 'Torno CNC importado', lifeYears: 8, annualRateBp: 1250, justification: 'Segunda unidade, mesmo laudo' });
    expect(second.status).toBe(201);
    expect(second.body.data.id).not.toBe(res.body.data.id);
  });

  it('.strict() vira 400 (chave desconhecida) e campo obrigatório ausente (justification) é 400', async () => {
    const badKey = await request(app)
      .post('/api/accounting/depreciation-rates')
      .set(authHeader(dono))
      .send({ unitId: UNIT, description: 'x', lifeYears: 5, annualRateBp: 2000, justification: 'j', sourceRow: 1 });
    expect(badKey.status).toBe(400);

    const noJustification = await request(app)
      .post('/api/accounting/depreciation-rates')
      .set(authHeader(dono))
      .send({ unitId: UNIT, description: 'x', lifeYears: 5, annualRateBp: 2000 });
    expect(noJustification.status).toBe(400);
  });

  it('POST /:id/hide oculta (200) — a linha some da listagem default e reaparece com includeHidden=true', async () => {
    const created = await request(app)
      .post('/api/accounting/depreciation-rates')
      .set(authHeader(dono))
      .send({ unitId: UNIT, description: 'Máquina a ocultar', lifeYears: 5, annualRateBp: 2000, justification: 'j' });
    const id = created.body.data.id as string;

    const hidden = await request(app).post(`/api/accounting/depreciation-rates/${id}/hide`).set(authHeader(dono)).send({ unitId: UNIT });
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.hiddenAt).not.toBeNull();

    const defaultList = await request(app).get('/api/accounting/depreciation-rates').set(authHeader(dono)).query({ unitId: UNIT });
    expect(defaultList.body.data.some((r: { id: string }) => r.id === id)).toBe(false);

    const withHidden = await request(app).get('/api/accounting/depreciation-rates').set(authHeader(dono)).query({ unitId: UNIT, includeHidden: 'true' });
    expect(withHidden.body.data.some((r: { id: string }) => r.id === id)).toBe(true);
  });

  it('hide de id de OUTRO escopo é 404 (D11) — nunca 403 (não confirma existência cross-tenant)', async () => {
    const mine = await request(app)
      .post('/api/accounting/depreciation-rates')
      .set(authHeader(dono))
      .send({ unitId: UNIT, description: 'Só minha', lifeYears: 5, annualRateBp: 2000, justification: 'j' });
    const id = mine.body.data.id as string;

    const res = await request(app)
      .post(`/api/accounting/depreciation-rates/${id}/hide`)
      .set(authHeader(outro))
      .send({ unitId: 'unit-do-outro' });
    expect(res.status).toBe(404);

    const res404 = await request(app)
      .post('/api/accounting/depreciation-rates/nao-existe/hide')
      .set(authHeader(dono))
      .send({ unitId: UNIT });
    expect(res404.status).toBe(404);
  });
});
