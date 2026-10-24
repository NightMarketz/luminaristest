/**
 * Lacuna achada pelo `check:legal-params-formato` (#877): as tabelas SIMPLES_ANEXO_FAIXA, SIMPLES_ANEXO_REPARTICAO,
 * SIMPLES_TETO_ISS e SIMPLES_ENQUADRAMENTO não têm regra em `formatoLinha.ts` e caem no fallback do PR-1, que exige
 * valorInt — mas a semente (X14 #573) e o `simplesCalc` usam valorJson. Propor qualquer linha delas pela API dá 400.
 *
 * Comportamento esperado (dono, questionário 2026-10-24, "Autorizo (Recomendado)"): a linha no formato da semente é
 * aceita pelo `propose`. SQLite real e HTTP.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { Role } from '@/features/users/models/User.model';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const FONTE_TESTE = 'teste-guarda-simples-formato';
// O papel não existe no enum do domínio (L-2) — só no Prisma e no JWT (molde legalParameter.integration.test.ts).
const PADMIN = { id: 'snfmt-padmin', username: 'snfmt-padmin', role: 'PLATFORM_ADMIN' as Role };

// Uma linha de cada tabela, copiada da migração 20261008090000_seed_simples_legal_parameters.
const SEMENTE = [
  { tabela: 'SIMPLES_ANEXO_FAIXA', chave: 'I', discriminador: 'F2', valorJson: { receitaAteCents: 36000000, aliquotaNominalBp: 730, parcelaDeduzirCents: 594000 } },
  { tabela: 'SIMPLES_ANEXO_REPARTICAO', chave: 'III', discriminador: 'F1', valorJson: { IRPJ: 400, CSLL: 350, COFINS: 1282, PIS: 278, CPP: 4340, ISS: 3350 } },
  { tabela: 'SIMPLES_TETO_ISS', chave: 'III', valorJson: { percentualBp: 500, limiarAliquotaEfetiva: '14.92537', transfereAIbs: false, transferencia: { IRPJ: 602, CSLL: 526, COFINS: 1928, PIS: 418, CPP: 6526 } } },
  { tabela: 'SIMPLES_ENQUADRAMENTO', chave: 'SERVICO:060101', valorJson: { anexo: 'III', fatorR: false, semIss: false } },
];

describe('tabelas do Simples × regra de formato', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.legalParameter.deleteMany({ where: { fonte: FONTE_TESTE } });
    await getFactory().getLegalParameterService().aquecer();
    await prisma.$disconnect();
  });

  it('propor uma linha de cada tabela SIMPLES_* no formato da semente é aceito', async () => {
    const status: Record<string, number> = {};
    for (const l of SEMENTE) {
      const res = await request(app)
        .post('/api/legal-parameters')
        .set(authHeader(PADMIN))
        .send({ ...l, fonte: FONTE_TESTE, vigenteDesde: '2099-01-01', motivo: 'teste-guarda' });
      status[l.tabela] = res.status;
    }
    expect(status).toEqual({ SIMPLES_ANEXO_FAIXA: 201, SIMPLES_ANEXO_REPARTICAO: 201, SIMPLES_TETO_ISS: 201, SIMPLES_ENQUADRAMENTO: 201 });
  });
});
