/**
 * TESTE-GUARDA — ITG 2000 (R1) item 36 pela fronteira HTTP: `POST /api/accounting/post` em período fechado e reaberto
 * exige a razão do registro extemporâneo, QUALQUER que seja o `sourceType` do corpo.
 *
 * Origem: brecha do #907 registrada no handoff `docs/accounting/HANDOFF-2026-11-02-delegacao-dono.md` §C1 — a razão
 * automática dependia do `sourceType`, que o cliente HTTP escolhe (`PostEntrySchema.sourceType` é `z.string()`), então
 * um POST com `sourceType: 'x'` escapava da razão digitada. Decisão (D-2026-11-02-DELEGACAO-DONO §3.6, delegação do
 * dono de 02/11): a razão automática vale só para chamada interna; pelo HTTP a razão é sempre exigida.
 *
 * App Express REAL sobre supertest + SQLite REAL, sem mock: a brecha está na costura controller → serviço, que um
 * teste de serviço não atravessa.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';

const app = makeApp();

const UNIT = 'unit-itg2000-http';

let dono: { id: string; username: string };

const lancamento = (descricao: string, data: string, extra: object = {}) => ({
  unitId: UNIT,
  date: data,
  description: descricao,
  lines: [
    { accountCode: '4.1', debitCents: 4000, creditCents: 0 },
    { accountCode: '1.1.1.01', debitCents: 0, creditCents: 4000 },
  ],
  ...extra,
});

const post = (body: object) => request(app).post('/api/accounting/post').set(authHeader(dono)).send(body);

const contarLancamentos = () => prisma.journalEntry.count({ where: { userId: dono.id, unitId: UNIT } });

describe('POST /api/accounting/post — ITG 2000 item 36 em período fechado e reaberto', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'itg2000-http', username: 'itg2000-http', email: 'itg2000-http@test.local', password: 'x', role: 'USER' },
    });
    await seedUnit({ userId: dono.id, id: UNIT });
    const junho = await prisma.accountingPeriod.create({
      data: { userId: dono.id, unitId: UNIT, year: 2026, month: 6, status: 'OPEN', openedAt: new Date(), openedById: dono.id },
    });
    const scope = resolveAccountingScopeInternal({ userId: dono.id }, UNIT);
    await getFactory().getPeriodService().softClosePeriod(scope, junho.id, 'fechamento de junho');
    const reaberto = await getFactory().getPeriodService().reopenPeriod(scope, junho.id, 'ajuste após o fechamento');
    expect(reaberto.status).toBe('OPEN');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('CONTROLE: com a razão digitada o POST grava (201) e o histórico consigna data e razão', async () => {
    const res = await post(lancamento('despesa esquecida de junho', '2026-06-20', { extemporaneousReason: 'nota recebida depois do fechamento' }));

    expect(res.status).toBe(201);
    expect(res.body.data.description).toContain('ocorrência em 20/06/2026');
    expect(res.body.data.description).toContain('razão: nota recebida depois do fechamento');
  });

  it('CONTROLE: sem razão e sem sourceType (manual) o POST é recusado com 400 da razão extemporânea', async () => {
    const antes = await contarLancamentos();
    const res = await post(lancamento('sem razão, manual', '2026-06-21'));

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('registro extemporâneo');
    expect(await contarLancamentos()).toBe(antes);
  });

  it.each(['x', 'ap.payment', 'closing'])(
    'sem razão, com sourceType %p escolhido pelo cliente, o POST é recusado (400) e nada é gravado',
    async (sourceType) => {
      const antes = await contarLancamentos();
      const res = await post(lancamento(`sem razão, sourceType ${sourceType}`, '2026-06-22', { sourceType, sourceId: `itg2000-http-${sourceType}` }));

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('registro extemporâneo');
      expect(await contarLancamentos()).toBe(antes);
    },
  );

  it('o marcador interno de gravador automático enviado no corpo é descartado: continua 400', async () => {
    const antes = await contarLancamentos();
    const res = await post(
      lancamento('sem razão, marcador forjado', '2026-06-23', { sourceType: 'ap.payment', sourceId: 'itg2000-http-forjado', automaticWriter: true }),
    );

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('registro extemporâneo');
    expect(await contarLancamentos()).toBe(antes);
  });
});
