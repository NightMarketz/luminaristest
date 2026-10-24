/**
 * Lacuna deixada fora do #868 e do #870: a regra de formato da tabela `IBS_CBS` (`formatoLinha.ts`) só confere a linha
 * VENCIMENTO — a de alíquota passa com qualquer discriminador. O código só lê CBS/ALIQUOTA e IBS/ALIQUOTA_UF|ALIQUOTA_MUN
 * (`ibsCbsParams.ts`); uma linha com outro discriminador entra em vigor e nenhum cálculo a enxerga. SQLite real e HTTP.
 *
 * Comportamento esperado (dono, questionário 2026-10-23): publicar a linha de alíquota com discriminador fora de
 * CBS→ALIQUOTA / IBS→ALIQUOTA_UF|ALIQUOTA_MUN responde 400 e a linha segue DRAFT.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { Role } from '@/features/users/models/User.model';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const RASCUNHO = 'ibscbs-disc-invalido';
// O papel não existe no enum do domínio (L-2) — só no Prisma e no JWT (molde legalParameter.integration.test.ts).
const PADMIN = { id: 'discfmt-padmin', username: 'discfmt-padmin', role: 'PLATFORM_ADMIN' as Role };

describe('IBS_CBS × discriminador da alíquota', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.legalParameterRecalcJob.deleteMany({ where: { legalParameterId: RASCUNHO } });
    await prisma.legalParameter.deleteMany({ where: { id: RASCUNHO } });
    await getFactory().getLegalParameterService().aquecer();
    await prisma.$disconnect();
  });

  it('publicar a alíquota da CBS com discriminador fora de ALIQUOTA responde 400 e a linha segue DRAFT', async () => {
    // Rascunho gravado direto no banco, como os das migrações (o propose roda a mesma regra de formato).
    await prisma.legalParameter.create({
      data: {
        id: RASCUNHO, tabela: 'IBS_CBS', chave: 'CBS', discriminador: 'ALIQUOTA_UF', valorInt: 90,
        fonte: 'teste-guarda', vigenteDesde: '2099-01-01', status: 'DRAFT', motivo: 'teste-guarda', proposedById: PADMIN.id,
      },
    });

    const res = await request(app).post(`/api/legal-parameters/${RASCUNHO}/publish`).set(authHeader(PADMIN));
    const linha = await prisma.legalParameter.findUniqueOrThrow({ where: { id: RASCUNHO } });
    expect([res.status, linha.status]).toEqual([400, 'DRAFT']);
  });
});
