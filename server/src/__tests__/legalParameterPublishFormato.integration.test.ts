/**
 * Lacuna deixada fora do #868 (achados da revisão do #861, "Fora de escopo"): o `publish` de um rascunho de parâmetro legal
 * não confere o formato da linha (`exigirFormato` só roda no `propose`). Caso concreto: o rascunho VAZIO da alíquota da CBS
 * de 2027 (`ibscbs-cbs-2027`, migração do IBS-CBS-2027 PR-1, `valorInt` NULL) publicado ⇒ `tabelaIbsCbsDe` lança e toda
 * prévia de IBS/CBS dá 500. SQLite real e HTTP.
 *
 * Asserção neutra quanto ao desenho do conserto (decisão do dono): recusar a publicação (400) ou tolerar a linha na leitura
 * (aviso) — nos dois a prévia segue respondendo 200.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { Role } from '@/features/users/models/User.model';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const RASCUNHO_CBS_2027 = 'ibscbs-cbs-2027';
// O papel não existe no enum do domínio (L-2) — só no Prisma e no JWT (molde legalParameter.integration.test.ts).
const PADMIN = { id: 'pubfmt-padmin', username: 'pubfmt-padmin', role: 'PLATFORM_ADMIN' as Role };

async function novoDono() {
  const u = await prisma.user.create({ data: { name: 'pubfmt-1', username: 'pubfmt-1', email: 'pubfmt-1@test.local', password: 'x', role: 'USER' } });
  await prisma.companyFiscalProfile.create({ data: { userId: u.id, anoCalendario: 2027, regime: 'REAL', ecfIndAliqCsll: '1', ecfIndRecReceita: '2', createdById: u.id, updatedById: u.id } });
  const unitId = 'unit-pubfmt-1';
  await seedUnit({ userId: u.id, id: unitId });
  return { ...u, unitId };
}

describe('publicar rascunho de parâmetro legal × formato da linha', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    // Devolve a linha da migração ao estado de rascunho (o teste a publica enquanto a lacuna existe).
    await prisma.legalParameterRecalcJob.deleteMany({ where: { legalParameterId: RASCUNHO_CBS_2027 } });
    await prisma.legalParameter.update({ where: { id: RASCUNHO_CBS_2027 }, data: { status: 'DRAFT', publishedById: null, publishedAt: null } });
    await getFactory().getLegalParameterService().aquecer();
    await prisma.$disconnect();
  });

  it('publicar o rascunho vazio da CBS 2027 não deixa a prévia do IBS/CBS em 500', async () => {
    const rascunho = await prisma.legalParameter.findUniqueOrThrow({ where: { id: RASCUNHO_CBS_2027 } });
    expect([rascunho.status, rascunho.valorInt, rascunho.valorTexto]).toEqual(['DRAFT', null, null]); // pré-condição: o rascunho da migração

    const dono = await novoDono();
    const previa = () =>
      request(app).post('/api/accounting/ibs-cbs-assessments/preview').set(authHeader(dono)).send({ unitId: dono.unitId, anoCalendario: 2027, mes: 1, tributo: 'IBS' });
    expect((await previa()).status).toBe(200); // controle: antes da publicação a prévia funciona

    await request(app).post(`/api/legal-parameters/${RASCUNHO_CBS_2027}/publish`).set(authHeader(PADMIN));

    const depois = await previa();
    expect([depois.status, depois.body.error?.message ?? depois.body.message ?? null]).toEqual([200, null]);
  });
});
