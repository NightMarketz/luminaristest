/**
 * POST /api/nfe/preview — contrato HTTP real (BE-INCR-NFE-PREVIEW, comportamentos 6, 7, 11 e 12;
 * F-PREV-4 → a). É a fronteira multipart que o FE-INCR-NFE (rodada 2b) consome às cegas: 3 casos
 * fixam o que o cliente pode esperar. App real (`makeApp`), auth real (JWT do helper), SQLite de teste.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { NfePreviewSchema } from '@/features/accounting/dtos/NfeDto';

const app = makeApp();
const FIXTURE = join(__dirname, '../../lib/__tests__/fixtures/nfe/purchase-multi-item.SYNTHETIC.xml');
const XML = readFileSync(FIXTURE);
const UNIT = 'unit-preview-1';

let ator: { id: string; username: string };

describe('POST /api/nfe/preview — dry-run do parser pela fronteira HTTP', () => {
  beforeAll(async () => {
    pushTestSchema();
    ator = await prisma.user.create({
      data: { name: 'nfe-preview', username: 'nfe-preview', email: 'nfe-preview@test.local', password: 'x', role: 'USER' },
    });
    // X6 (F-X6-6 a): o preview exige perfil fiscal — neutro (não-contribuinte, CUMULATIVO) mantém o contrato de antes.
    const perfil = await request(app).put('/api/accounting/fiscal-profile').set(authHeader(ator)).send({ unitId: UNIT, regimeTributario: 'PRESUMIDO', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' });
    expect(perfil.status).toBe(200);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('200 com o fixture: corpo bate com NfePreviewSchema, alreadyImported=false e nada é escrito', async () => {
    const before = await prisma.payable.count({ where: { userId: ator.id } });
    const res = await request(app)
      .post('/api/nfe/preview')
      .set(authHeader(ator))
      .field('unitId', UNIT)
      .attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const parsed = NfePreviewSchema.safeParse(res.body.data);
    expect(parsed.success).toBe(true);
    expect(res.body.data.alreadyImported).toBe(false);
    expect(res.body.data.itens).toHaveLength(3);
    // X6 item 12: o preview ecoa o regime e o custo — neutro = bruto = estoque = 19333, sem créditos
    expect(res.body.data.custo).toEqual(expect.objectContaining({ custoBrutoCents: 19333, custoEstoqueCents: 19333, creditoIcmsCents: 0, creditoPisCofinsCents: 0, regimeAplicado: 'NAO_CONTRIBUINTE', pisCofinsAplicado: 'SEM_CREDITO' }));
    expect(await prisma.payable.count({ where: { userId: ator.id } })).toBe(before);
  });

  it('X6 F-X6-6 (a): unidade SEM perfil fiscal → 400 fiscal_profile_missing (o preview não inventa custo)', async () => {
    const res = await request(app).post('/api/nfe/preview').set(authHeader(ator)).field('unitId', 'unit-sem-perfil').attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/fiscal_profile_missing/);
  });

  it('400 sem o campo file', async () => {
    const res = await request(app).post('/api/nfe/preview').set(authHeader(ator)).field('unitId', UNIT);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/File is required/);
  });

  it('400 (Zod) sem unitId', async () => {
    const res = await request(app)
      .post('/api/nfe/preview')
      .set(authHeader(ator))
      .attach('file', XML, { filename: 'nfe.xml', contentType: 'text/xml' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('401 sem token (auth deny-by-default)', async () => {
    const res = await request(app).post('/api/nfe/preview').field('unitId', UNIT);
    expect(res.status).toBe(401);
  });

  it('a rota usa o MESMO nfeUpload dos endpoints de escrita (comportamento 12 — reuso, não 2º multer)', () => {
    const src = readFileSync(join(__dirname, '../../routes/nfe.ts'), 'utf8');
    expect(src).toMatch(/router\.post\('\/preview', nfeUpload, previewNfe\)/);
    expect((src.match(/makeUploadMiddleware/g) ?? []).length).toBe(0);
  });
});
