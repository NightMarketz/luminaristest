/**
 * Lacuna L-20261121-034041-ad40 (nó ITEM-DESTINATION) — o plano padrão é create-if-missing por código: se o escopo já tem
 * uma conta do usuário com um código que depois virou canônico (outro nome ou outra natureza), `ensureChartOfAccounts`
 * a deixa no lugar. O complemento de sistema não pode tratá-la como a folha canônica: nem o papel do perfil fiscal
 * (`PERFIL_FISCAL_PLANO_PADRAO`, por código) nem o referencial RFB (`REFERENCIAL_PLANO_PADRAO`, por código).
 * Evidência real: dev.db, escopo C7 com 4.7 "Perda na Baixa de Imobilizado C7" criada à mão.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT_NOME = 'unit-colisao-nome';
const UNIT_NATUREZA = 'unit-colisao-natureza';
const CODIGO = '2.1.7.03'; // folha canônica "IRRF a Recolher" (Liability): papel retencaoIrrfRecolherAccountId + referencial 2.01.01.09.01

let dono: { id: string; username: string };

const scope = (unitId: string): AccountingScope => ({
  ownerUserId: dono.id, actorUserId: dono.id, unitId, ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo',
});

/** Escopo em que o usuário criou a conta com o código antes de ele entrar no plano padrão. */
const contaDoUsuario = async (unitId: string, name: string, nature: string) => {
  await prisma.account.deleteMany({ where: { userId: dono.id, unitId, code: CODIGO } });
  const conta = await prisma.account.create({ data: { userId: dono.id, unitId, code: CODIGO, name, nature, acceptsEntries: true } });
  const r = await request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId }); // ensureChartOfAccounts
  expect(r.status).toBe(200);
  const atual = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId, code: CODIGO } });
  expect(atual.id).toBe(conta.id); // create-if-missing: a do usuário fica no lugar
  return conta;
};

const putPerfil = (unitId: string) =>
  request(app)
    .put('/api/accounting/fiscal-profile')
    .set(authHeader(dono))
    .send({ unitId, regimeTributario: 'PRESUMIDO', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' });

/** Simula o escopo com o kit instalado: outra folha já mapeada em 2025, para o complemento ter versão onde gravar. */
const mapearOutraFolha = async (unitId: string) => {
  const outra = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId, acceptsEntries: true, code: { not: CODIGO }, deletedAt: null } });
  await prisma.referentialMapping.create({ data: { userId: dono.id, unitId, accountId: outra.id, referentialCode: '9.99', label: 'x', mappingVersion: '2025' } });
};

describe('lacuna ad40 — conta do usuário com código canônico não herda papel nem referencial', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'colisao', username: 'colisao-dono', email: 'colisao@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT_NOME });
    await seedUnit({ userId: dono.id, id: UNIT_NATUREZA });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('mesmo código e natureza, outro nome: o perfil fiscal não recebe a conta como IRRF a recolher', async () => {
    const conta = await contaDoUsuario(UNIT_NOME, 'Empréstimo do Sócio', 'Liability');
    expect((await putPerfil(UNIT_NOME)).status).toBe(200);
    await getFactory().getFiscalProfileService().ensureCanonicalAccounts(scope(UNIT_NOME));
    const fp = await prisma.fiscalProfile.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT_NOME } });
    expect(fp.retencaoIrrfRecolherAccountId).not.toBe(conta.id);
  });

  it('mesmo código e natureza, outro nome: o referencial do plano padrão não mapeia a conta', async () => {
    const conta = await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT_NOME, code: CODIGO } });
    await mapearOutraFolha(UNIT_NOME);
    await getFactory().getReferentialMappingService().ensureCanonicalMappings(scope(UNIT_NOME));
    expect(await prisma.referentialMapping.count({ where: { userId: dono.id, unitId: UNIT_NOME, accountId: conta.id } })).toBe(0);
  });

  it('mesmo código, outra natureza: o complemento não grava papel nem referencial e não derruba quem chamou', async () => {
    const conta = await contaDoUsuario(UNIT_NATUREZA, 'Despesa Diversa', 'Expense');
    expect((await putPerfil(UNIT_NATUREZA)).status).toBe(200);
    await expect(getFactory().getFiscalProfileService().ensureCanonicalAccounts(scope(UNIT_NATUREZA))).resolves.toBeDefined();
    const fp = await prisma.fiscalProfile.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT_NATUREZA } });
    expect(fp.retencaoIrrfRecolherAccountId).not.toBe(conta.id);
    await mapearOutraFolha(UNIT_NATUREZA);
    await getFactory().getReferentialMappingService().ensureCanonicalMappings(scope(UNIT_NATUREZA));
    expect(await prisma.referentialMapping.count({ where: { userId: dono.id, unitId: UNIT_NATUREZA, accountId: conta.id } })).toBe(0);
  });

  // Dono, chat, 2026-11-21 ("Nome/natureza + recusar"): além do complemento, a criação manual com código do plano padrão
  // é recusada — o código canônico é do sistema, que o cria (ou restaura) pelo `ensureChartOfAccounts`.
  it('criação manual com código do plano padrão ausente no escopo → 400, nenhuma conta criada', async () => {
    await request(app).get('/api/accounting/accounts').set(authHeader(dono)).query({ unitId: UNIT_NATUREZA }); // plano padrão (a sintética 2.1.7 existe)
    await prisma.referentialMapping.deleteMany({ where: { userId: dono.id, unitId: UNIT_NATUREZA, account: { code: CODIGO } } });
    await prisma.fiscalProfile.updateMany({ where: { userId: dono.id, unitId: UNIT_NATUREZA }, data: { retencaoIrrfRecolherAccountId: null } });
    await prisma.account.deleteMany({ where: { userId: dono.id, unitId: UNIT_NATUREZA, code: CODIGO } });
    const r = await request(app)
      .post('/api/accounting/accounts')
      .set(authHeader(dono))
      .send({ unitId: UNIT_NATUREZA, code: CODIGO, name: 'Conta Minha', nature: 'Liability', acceptsEntries: true });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('plano padrão');
    expect(await prisma.account.count({ where: { userId: dono.id, unitId: UNIT_NATUREZA, code: CODIGO, name: 'Conta Minha' } })).toBe(0);
  });
});
