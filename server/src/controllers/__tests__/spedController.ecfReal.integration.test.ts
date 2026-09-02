/**
 * CONTRATO HTTP de `POST /api/accounting/sped/ecf/real/generate` — app Express REAL sobre
 * supertest + SQLite REAL (molde: `accountingController.integration.test.ts`).
 *
 * BRIEF-FASE3 item 1 (Fork 1→(b), rota dedicada): a rota responde 201 com `job.kind` correto.
 * BRIEF item 4: o job criado com o `kind` novo (`EXPORT_SPED_ECF_REAL`, coluna String, zero
 * migração) é LIDO DE VOLTA pela rota de job existente sem erro de tipo.
 * BRIEF item 17: o artefato de um dono não existe para o outro (NotFoundError → 404 na rota de
 * job reusada — mesmo padrão dos outros serviços de export).
 *
 * As três invariantes moram na FIAÇÃO (authMiddleware deny-by-default → rota → DTO → controller
 * → serviço → Prisma), não no corpo do handler — por isso integração, não unit. Cada negativo
 * carrega o seu controle positivo.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();

const UNIT = 'unit-ecf-real';

let donoA: { id: string; username: string };
let donoB: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });

const body = (over: Record<string, unknown> = {}) => ({
  unitId: UNIT,
  year: 2025,
  declarant: {
    cnpj: '11222333000181', nome: 'INDUSTRIA TESTE LTDA', codNat: '2062', cnaeFiscal: '9602501',
    endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'DF', codMun: '5300108',
    cep: '70000000', email: 'industria@teste.com',
  },
  // Placeholders de teste — o dígito/código do regime é informado pelo caller (sem default).
  fiscal: { formaTrib: '1', formaTribPer: 'XXXX' },
  signers: [
    { identNom: 'CONTADOR', identCpfCnpj: '12345678900', identQualif: '900', indCrc: '1DF123', email: 'c@d.com', fone: '6133334444' },
    { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
  ],
  ...over,
});

const post = (ator: { id: string; username: string } | null, payload: object) => {
  const req = request(app).post('/api/accounting/sped/ecf/real/generate');
  return ator ? req.set(authHeader(ator)).send(payload) : req.send(payload);
};

describe('POST /api/accounting/sped/ecf/real/generate — contrato HTTP (esqueleto Lucro Real)', () => {
  beforeAll(async () => {
    pushTestSchema();
    donoA = await criarUsuario('ecf-real-a');
    donoB = await criarUsuario('ecf-real-b');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem token: 401 (auth deny-by-default) e nenhum job gravado', async () => {
    const res = await post(null, body());
    expect(res.status).toBe(401);
    expect(await prisma.accountingDataExchangeJob.count()).toBe(0);
  });

  it('item 1: 201 com job.kind = EXPORT_SPED_ECF_REAL, status EXPORTED (CONTROLE dos negativos)', async () => {
    const res = await post(donoA, body());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kind).toBe('EXPORT_SPED_ECF_REAL');
    expect(res.body.data.direction).toBe('EXPORT');
    expect(res.body.data.status).toBe('EXPORTED');
    expect(res.body.data.fileName).toBe('ecf_real_11222333000181_2025.txt');
    expect(typeof res.body.data.sha256).toBe('string');

    // item 4: o kind novo é persistido na coluna String e lido de volta sem erro de tipo.
    const row = await prisma.accountingDataExchangeJob.findUnique({ where: { id: res.body.data.id } });
    expect(row?.kind).toBe('EXPORT_SPED_ECF_REAL');
    expect(row?.userId).toBe(donoA.id);
    expect(row?.unitId).toBe(UNIT);
    expect(row?.storageKey).toBeTruthy();

    const read = await request(app)
      .get(`/api/accounting/data-exchange/jobs/${res.body.data.id}`)
      .query({ unitId: UNIT })
      .set(authHeader(donoA));
    expect(read.status).toBe(200);
    expect(read.body.data.kind).toBe('EXPORT_SPED_ECF_REAL');

    // item 13: o audit reusa sped.ecf_generated e o payload carrega o kind (sem PII).
    const audit = await prisma.auditEvent.findFirst({
      where: { scopeUserId: donoA.id, unitId: UNIT, eventType: 'sped.ecf_generated' },
    });
    expect(audit).not.toBeNull();
    expect(audit!.payload).toContain('EXPORT_SPED_ECF_REAL');
    expect(audit!.payload).not.toContain('11222333000181');
    expect(audit!.payload).not.toContain('INDUSTRIA');
  });

  it('item 17 — tenancy: o job/artefato do dono A não existe para o dono B (404), mas existe para A', async () => {
    const created = await post(donoA, body());
    expect(created.status).toBe(201);
    const jobId = created.body.data.id as string;

    const mine = await request(app)
      .get(`/api/accounting/data-exchange/jobs/${jobId}/download`)
      .query({ unitId: UNIT })
      .set(authHeader(donoA));
    expect(mine.status).toBe(200);

    const theirs = await request(app)
      .get(`/api/accounting/data-exchange/jobs/${jobId}/download`)
      .query({ unitId: UNIT })
      .set(authHeader(donoB));
    expect(theirs.status).toBe(404);
    const theirsMeta = await request(app)
      .get(`/api/accounting/data-exchange/jobs/${jobId}`)
      .query({ unitId: UNIT })
      .set(authHeader(donoB));
    expect(theirsMeta.status).toBe(404);
  });

  it('400 quando fiscal.formaTrib está ausente — o servidor NÃO chuta o dígito do regime (sem job)', async () => {
    const antes = await prisma.accountingDataExchangeJob.count();
    const res = await post(donoA, body({ fiscal: { formaTribPer: 'XXXX' } }));
    expect(res.status).toBe(400);
    // `flatten()` agrupa o erro do campo aninhado sob `fieldErrors.fiscal` (a chave folha não aparece).
    expect(res.body.error.fieldErrors.fiscal).toEqual(expect.arrayContaining([expect.any(String)]));
    expect(await prisma.accountingDataExchangeJob.count()).toBe(antes);
  });

  it('400 quando fiscal está ausente e quando formaApur não é T (Fork 5 anual não ratificado)', async () => {
    const antes = await prisma.accountingDataExchangeJob.count();
    const { fiscal: _omit, ...semFiscal } = body();
    expect((await post(donoA, semFiscal)).status).toBe(400);
    expect((await post(donoA, body({ fiscal: { formaTrib: '1', formaTribPer: 'XXXX', formaApur: 'A' } }))).status).toBe(400);
    expect(await prisma.accountingDataExchangeJob.count()).toBe(antes);
  });
});
