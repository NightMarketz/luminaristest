/**
 * RECALC-STATUS (docs/accounting/BE-INCR-LEGAL-PARAMS-RECALC-STATUS-brief.md, itens 1–4, 7) — `GET
 * /api/legal-parameters/recalc-jobs` sobre SQLite real: 401 sem login, 400 fora do DTO, qualquer autenticado lê (dono
 * 08/10), mais recentes primeiro, filtro por status e por linha, paginação e a linha legal junto.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const URL = '/api/legal-parameters/recalc-jobs';
let user: { id: string; username: string };

describe('GET /api/legal-parameters/recalc-jobs', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.legalParameterRecalcJob.deleteMany();
    user = await prisma.user.create({ data: { name: 'rs', username: 'rs-user', email: 'rs-user@test.local', password: 'x', role: 'USER' } });
    // 3 jobs: 2 da linha semeada do IRPJ (um DONE com resumo, um PENDING com erro) e 1 de uma linha que não existe.
    await prisma.legalParameterRecalcJob.create({ data: { legalParameterId: 'lp1-ta-irpj_aliq', evento: 'PUBLISHED', status: 'DONE', tentativas: 1, resumo: { reconfirmadas: 2, avisos: 1, inalteradas: 3 }, processedAt: new Date('2026-10-08T10:00:00Z'), createdAt: new Date('2026-10-08T09:00:00Z') } });
    await prisma.legalParameterRecalcJob.create({ data: { legalParameterId: 'lp1-ta-irpj_aliq', evento: 'REVOKED', status: 'PENDING', tentativas: 2, ultimoErro: 'falhou', createdAt: new Date('2026-10-08T11:00:00Z') } });
    await prisma.legalParameterRecalcJob.create({ data: { legalParameterId: 'nao-existe', evento: 'PUBLISHED', status: 'PENDING', createdAt: new Date('2026-10-08T12:00:00Z') } });
  }, 60000);

  afterAll(async () => {
    await prisma.legalParameterRecalcJob.deleteMany();
    await prisma.$disconnect();
  });

  it('sem login ⇒ 401; query fora do DTO ⇒ 400', async () => {
    expect((await request(app).get(URL)).status).toBe(401);
    for (const q of [{ status: 'FAILED' }, { pageSize: '101' }, { page: '0' }, { extra: '1' }]) {
      const r = await request(app).get(URL).set(authHeader(user)).query(q);
      expect([JSON.stringify(q), r.status]).toEqual([JSON.stringify(q), 400]);
    }
  });

  it('usuário comum lê; mais recentes primeiro; a linha legal vem junto (null se não existe)', async () => {
    const r = await request(app).get(URL).set(authHeader(user));
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ total: 3, page: 1, pageSize: 20 });
    const items = r.body.data.items as Array<Record<string, unknown>>;
    expect(items.map((i) => [i.evento, i.status])).toEqual([['PUBLISHED', 'PENDING'], ['REVOKED', 'PENDING'], ['PUBLISHED', 'DONE']]);
    expect(items[0].linha).toBeNull();
    expect(items[1]).toMatchObject({ tentativas: 2, ultimoErro: 'falhou', linha: { tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ' } });
    expect(items[2]).toMatchObject({ resumo: { reconfirmadas: 2, avisos: 1, inalteradas: 3 }, processedAt: '2026-10-08T10:00:00.000Z' });
  });

  it('filtro por status e por linha; paginação', async () => {
    const done = await request(app).get(URL).set(authHeader(user)).query({ status: 'DONE' });
    expect(done.body.data.items.map((i: { status: string }) => i.status)).toEqual(['DONE']);
    const linha = await request(app).get(URL).set(authHeader(user)).query({ legalParameterId: 'lp1-ta-irpj_aliq' });
    expect(linha.body.data.total).toBe(2);
    const p2 = await request(app).get(URL).set(authHeader(user)).query({ page: '2', pageSize: '2' });
    expect(p2.body.data).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(p2.body.data.items).toHaveLength(1);
  });
});
