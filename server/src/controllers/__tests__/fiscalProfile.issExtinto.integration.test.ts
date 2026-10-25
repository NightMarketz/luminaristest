/**
 * ISS-TRANSICAO-IBS PR-1 (BRIEF `docs/accounting/BE-INCR-ISS-TRANSICAO-IBS-brief.md` item 4; F-ISS-5 a; invariante §10.3):
 * PUT do perfil fiscal com o relógio em 01/01/2033 — a LC 116 está revogada (LC 214 art. 543 IV; art. 544 V) e a
 * ISS_LIMITE não tem linha. Com valor ⇒ 400 com a mensagem nomeada, não o "Sem linha vigente" genérico; com null ⇒ 200.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { ISS_EXTINTO_MENSAGEM } from '@/features/accounting/models/issTransicao';

const app = makeApp();
const UNIT = 'unit-iss-extinto';
let ator: { id: string; username: string };

/** Só o Date é falso (hoje do DTO = dia civil em São Paulo); timers reais. */
function hoje(iso: string): void {
  jest.useFakeTimers({ now: new Date(iso), doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'hrtime', 'performance'] });
}

const put = (body: Record<string, unknown>) =>
  request(app).put('/api/accounting/fiscal-profile').set(authHeader(ator)).send({ unitId: UNIT, regimeTributario: 'PRESUMIDO', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO', ...body });

describe('PUT /api/accounting/fiscal-profile — issAliquotaBp a partir de 2033', () => {
  beforeAll(async () => {
    pushTestSchema();
    ator = await prisma.user.create({ data: { name: 'iss-extinto', username: 'iss-extinto', email: 'iss-extinto@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: ator.id, id: UNIT });
  }, 120000);

  afterEach(() => jest.useRealTimers());

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('2032-12-31: 500 ainda é aceito (ISS_LIMITE vigente até o fim de 2032)', async () => {
    hoje('2032-12-31T12:00:00-03:00');
    const res = await put({ issAliquotaBp: 500 });
    expect(res.status).toBe(200);
  });

  it('2033-01-01 com valor ⇒ 400 com a mensagem nomeada; com null ⇒ 200', async () => {
    hoje('2033-01-01T12:00:00-03:00');
    const comValor = await put({ issAliquotaBp: 300 });
    expect(comValor.status).toBe(400);
    expect(comValor.body.error.fieldErrors.issAliquotaBp).toEqual([ISS_EXTINTO_MENSAGEM]);
    expect(JSON.stringify(comValor.body)).not.toContain('Sem linha vigente');
    const nulo = await put({ issAliquotaBp: null });
    expect(nulo.status).toBe(200);
    expect(nulo.body.data.issAliquotaBp).toBeNull();
  });
});
