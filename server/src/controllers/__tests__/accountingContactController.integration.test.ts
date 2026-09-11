/**
 * CONTRATO HTTP do cadastro de contador + entrega ao contador (BE-INCR-CONTADOR-DELIVERY) — app
 * Express REAL sobre supertest + SQLite REAL (molde: `spedController.ecfReal.integration.test.ts`).
 *
 * Nasceu do review independente de 2026-09-10 (achados F7 e F1): as 8 rotas não tinham NENHUM teste
 * de nível HTTP — os guards de divergência `:id × body` (a defesa contra a classe
 * `param-aceito-e-ignorado`) podiam ser apagados sem que a suíte notasse, e o rate limit por escopo
 * do item 20 do BRIEF simplesmente não existia. As invariantes daqui moram na FIAÇÃO (auth
 * deny-by-default → limiter → rota → DTO → controller), não no corpo do handler — por isso
 * integração, não unit. Cada negativo carrega o seu controle positivo.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-contact-http';

let dono: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

const contatoBody = (over: Record<string, unknown> = {}) => ({
  unitId: UNIT,
  name: 'Contabilidade HTTP',
  email: 'http@exemplo.com.br',
  crcNumber: 'SP-000777/O-1',
  crcUf: 'SP',
  ...over,
});

describe('/api/accounting/contacts + /delivery — contrato HTTP', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await criarUsuario('contact-http-a');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------------ deny-by-default
  it('sem Bearer, as rotas novas respondem 401 (nascem protegidas)', async () => {
    expect((await request(app).get('/api/accounting/contacts').query({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).post('/api/accounting/contacts').send(contatoBody())).status).toBe(401);
    expect((await request(app).post('/api/accounting/delivery/build').send({})).status).toBe(401);
  });

  // ------------------------------------------------------------------ controle positivo
  it('CONTROLE: POST /contacts cria (201) e GET /contacts lista a linha', async () => {
    const created = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send(contatoBody());
    expect(created.status).toBe(201);
    expect(created.body.data.crcUf).toBe('SP');

    const listed = await request(app).get('/api/accounting/contacts').set(authHeader(dono)).query({ unitId: UNIT });
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((c: { id: string }) => c.id === created.body.data.id)).toBe(true);
  });

  it('.strict() vira 400 de verdade na borda (chave desconhecida no corpo)', async () => {
    const res = await request(app)
      .post('/api/accounting/contacts')
      .set(authHeader(dono))
      .send(contatoBody({ crc: 'campo-antigo' }));
    expect(res.status).toBe(400);
  });

  // ------------------------------------------------------------------ review F7 — guards :id × body
  it('PATCH /contacts/:id com contactId do corpo DIVERGENTE do :id é 400 — nunca um dos dois ignorado', async () => {
    const created = await request(app).post('/api/accounting/contacts').set(authHeader(dono)).send(contatoBody());
    const id = created.body.data.id as string;

    const divergente = await request(app)
      .patch(`/api/accounting/contacts/${id}`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, contactId: 'outro-id', email: 'novo@exemplo.com.br' });
    expect(divergente.status).toBe(400);
    expect(String(divergente.body.error)).toMatch(/diverge/);

    // controle: com os dois iguais, o PATCH escreve
    const ok = await request(app)
      .patch(`/api/accounting/contacts/${id}`)
      .set(authHeader(dono))
      .send({ unitId: UNIT, contactId: id, email: 'novo@exemplo.com.br' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.email).toBe('novo@exemplo.com.br');
  });

  it('POST /delivery/:id/retry com deliveryId divergente do :id é 400 antes de tocar o serviço', async () => {
    const res = await request(app)
      .post('/api/accounting/delivery/qualquer-id/retry')
      .set(authHeader(dono))
      .send({ unitId: UNIT, deliveryId: 'outro-id' });
    expect(res.status).toBe(400);
    expect(String(res.body.error)).toMatch(/diverge/);
  });

  // ------------------------------------------------------------------ review F1 — item 20 do BRIEF
  /**
   * Rate limit POR ESCOPO no comando `confirmDelivery`. O limiter global de `app.ts` é por IP e
   * frouxo de propósito (5000/15min); este é o freio do comando que escreve no log de entrega. O
   * teto é lido do ambiente A CADA REQUISIÇÃO (`DELIVERY_CONFIRM_RATE_LIMIT`), o que permite
   * apertá-lo aqui sem reconstruir o app. Corpo inválido de propósito: o limiter conta a
   * requisição ANTES do DTO — é o que impede o loop de custar 12 leituras de período por chamada.
   */
  it('POST /delivery/confirm devolve 429 na (N+1)-ésima chamada do mesmo escopo dentro da janela', async () => {
    process.env.DELIVERY_CONFIRM_RATE_LIMIT = '3';
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 4; i += 1) {
        const res = await request(app)
          .post('/api/accounting/delivery/confirm')
          .set(authHeader(dono))
          .send({ unitId: `${UNIT}-rl` });
        statuses.push(res.status);
      }
      // 3 passam pelo limiter (e caem no DTO, 400); a 4ª é barrada pelo limiter (429).
      expect(statuses.slice(0, 3)).toEqual([400, 400, 400]);
      expect(statuses[3]).toBe(429);
    } finally {
      delete process.env.DELIVERY_CONFIRM_RATE_LIMIT;
    }
  });
});
