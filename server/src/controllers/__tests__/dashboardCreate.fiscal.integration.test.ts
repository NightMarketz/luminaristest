/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, PR-3, BRIEF itens 19, 21, 22) — o onboarding captura regime e porte:
 * `POST /dashboard/create` com `fiscal` cria o perfil fiscal da EMPRESA do ano corrente depois da primeira unidade (I1),
 * e a resposta traz as obrigações resolvidas. `NAO_SEI`/ausente ⇒ `pendente`, nada criado. Falha ⇒ compensação.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { CompanyFiscalProfileService, anoCorrente } from '@/features/accounting/services/CompanyFiscalProfileService';

const app = makeApp();
const HOJE = anoCorrente({ timeZone: 'America/Sao_Paulo' } as never);
let n = 0;
const novoUsuario = () => {
  n += 1;
  return prisma.user
    .create({ data: { name: `x13o-${n}`, username: `x13-onb-${n}`, email: `x13o-${n}@test.local`, password: 'x', role: 'USER' } })
    .then((u) => ({ id: u.id, username: u.username }));
};
const criar = (who: { id: string; username: string }, extra: Record<string, unknown>) =>
  request(app).post('/api/dashboard/create').set(authHeader(who)).send({ suiteKey: 'beautySalon', unit: { name: 'Matriz' }, ...extra });

describe('X13 PR-3 — regime e porte no onboarding', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 19: bloco fiscal inválido → 400 e nada instalado (regime fora da lista; chave extra — .strict)', async () => {
    const u = await novoUsuario();
    expect((await criar(u, { fiscal: { regime: 'ARBITRADO' } })).status).toBe(400);
    expect((await criar(u, { fiscal: { regime: 'MEI', cnae: '1' } })).status).toBe(400);
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);
  });

  it('itens 19 e 21: PRESUMIDO + porte "não" → perfil do ano corrente criado; resposta com obrigações resolvidas', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { fiscal: { regime: 'PRESUMIDO', grandePorte: false } });
    expect(r.status).toBe(201);
    expect(r.body.data.fiscal).toEqual({
      status: 'criado',
      ano: HOJE,
      obrigacoes: [
        // condições ainda sem resposta no onboarding ⇒ a ECD do Presumido fica CONDICIONAL (IN 2.003 art. 3º)
        expect.objectContaining({ obrigacao: 'ECD', status: 'CONDICIONAL' }),
        expect.objectContaining({ obrigacao: 'ECF', status: 'OBRIGATORIA' }),
      ],
    });
    const perfil = await prisma.companyFiscalProfile.findUniqueOrThrow({ where: { userId_anoCalendario: { userId: u.id, anoCalendario: HOJE } } });
    expect(perfil).toMatchObject({ regime: 'PRESUMIDO', grandePorte: false });
    // o perfil nasceu pelo serviço da contabilidade (auditado), não por escrita direta
    expect(await prisma.auditEvent.count({ where: { eventType: 'company_fiscal_profile.updated' } })).toBeGreaterThanOrEqual(1);
    // a unidade da empresa (I1) é o escopo: o endpoint de obrigações responde com ela
    const ob = await request(app).get(`/api/accounting/company-fiscal-profile/${HOJE}/obligations`).set(authHeader(u)).query({ unitId: r.body.data.unitId });
    expect(ob.body.data).toMatchObject({ ano: HOJE, regime: 'PRESUMIDO', perfil: 'INCOMPLETO' });
  });

  it('item 21: MEI → ECD FACULTATIVA e ECF NAO_SE_APLICA já na resposta do create', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { fiscal: { regime: 'MEI' } });
    expect(r.status).toBe(201);
    expect(r.body.data.fiscal.obrigacoes.map((o: { status: string }) => o.status)).toEqual(['FACULTATIVA', 'NAO_SE_APLICA']);
  });

  it('item 19: NAO_SEI ou sem bloco fiscal → pendente, nenhum perfil criado', async () => {
    for (const extra of [{ fiscal: { regime: 'NAO_SEI' } }, {}]) {
      const u = await novoUsuario();
      const r = await criar(u, extra);
      expect(r.status).toBe(201);
      expect(r.body.data.fiscal).toEqual({ status: 'pendente', ano: HOJE });
      expect(await prisma.companyFiscalProfile.count({ where: { userId: u.id } })).toBe(0);
    }
  });

  it('item 19 (compensação F-I1-4 b): falha ao criar o perfil → 500 ONBOARDING_ROLLED_BACK, sistema desfeito, retry funciona', async () => {
    const u = await novoUsuario();
    jest.spyOn(CompanyFiscalProfileService.prototype, 'upsert').mockRejectedValueOnce(new Error('falha injetada'));
    const r = await criar(u, { fiscal: { regime: 'REAL' } });
    expect(r.status).toBe(500);
    expect(r.body.errorCode).toBe('ONBOARDING_ROLLED_BACK');
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);

    jest.restoreAllMocks();
    const retry = await criar(u, { fiscal: { regime: 'REAL' } });
    expect(retry.status).toBe(201);
    expect(retry.body.data.fiscal.status).toBe('criado');
  });
});
