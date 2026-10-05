/**
 * BE-INCR-ACCOUNTING-POLICY-VERSION (nó GOV-CONTADOR, F-GOV-6 b) — app Express REAL sobre supertest + SQLite REAL.
 * Cobre os testes 15a (sem contador = hoje + versão APPLIED), 15b (contador ativo → 409 nos dois PUT, linha intocada),
 * 15d (fluxo F-PC-1 b ponta a ponta), 15e (rejeição), 15f (concorrência lógica + slot unique) e 15g (re-validação na
 * aprovação). O gate dentro da tx (15c) é determinístico com dublê, em AccountingPolicyVersionService.test.ts.
 */
import request from 'supertest';
import { Role } from '@/features/users/models/User.model';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, resetDb, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-pol';

type Actor = { id: string; username: string; role?: Role };
let dono: Actor;
let contador: Actor;
let terceiro: Actor;

const criarUsuario = async (username: string): Promise<Actor> => {
  const u = await prisma.user.create({
    data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' },
  });
  return { id: u.id, username: u.username, role: Role.USER };
};

const conta = (code: string, nature: string) =>
  prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: `Conta ${code}`, nature, acceptsEntries: true } });

const PERFIL = { unitId: UNIT, regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO' };

/** Convida + aceita pelo HTTP; devolve o id da atribuição ACTIVE. */
async function atribuir(): Promise<string> {
  const contato = await prisma.accountingContact.create({
    data: {
      userId: dono.id, unitId: UNIT, name: 'Maria Contadora', email: 'maria@cont.local', cpf: '52998224725',
      crcNumber: 'SP-123456/O-1', crcUf: 'SP',
    },
  });
  const inv = await request(app)
    .post('/api/accounting/accountant-assignments')
    .set(authHeader(dono))
    .send({ unitId: UNIT, accountingContactId: contato.id, accountantEmail: `${contador.username}@test.local` });
  expect(inv.status).toBe(201);
  const acc = await request(app)
    .post(`/api/accounting/accountant-assignments/${inv.body.data.id}/accept`)
    .set(authHeader(contador))
    .send({ declaresWrittenContract: true });
  expect(acc.status).toBe(200);
  return inv.body.data.id;
}

const propor = (body: Record<string, unknown>) =>
  request(app).post('/api/accounting/policy-versions').set(authHeader(dono)).send({ unitId: UNIT, ...body });
const aprovar = (actor: Actor, id: string, owner?: Actor) =>
  request(app).post(`/api/accounting/policy-versions/${id}/approve`).set(authHeader(actor))
    .send({ unitId: UNIT, ...(owner && { ownerUserId: owner.id }) });
const rejeitar = (actor: Actor, id: string, reason: string, owner?: Actor) =>
  request(app).post(`/api/accounting/policy-versions/${id}/reject`).set(authHeader(actor))
    .send({ unitId: UNIT, reason, ...(owner && { ownerUserId: owner.id }) });
const perfil = () => prisma.fiscalProfile.findFirst({ where: { userId: dono.id, unitId: UNIT } });
const versao = (id: string) => prisma.accountingPolicyVersion.findUniqueOrThrow({ where: { id } });

describe('BE-INCR-ACCOUNTING-POLICY-VERSION — política versionada pelo HTTP', () => {
  beforeAll(() => pushTestSchema(), 120000);

  beforeEach(async () => {
    await resetDb();
    dono = await criarUsuario('pol-dono');
    contador = await criarUsuario('pol-contador');
    terceiro = await criarUsuario('pol-terceiro');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('15a: sem contador, os dois PUT aplicam como hoje e gravam uma versão APPLIED com assignmentId = null', async () => {
    const fp = await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send(PERFIL);
    expect(fp.status).toBe(200);
    expect(fp.body.data).toMatchObject({ regimeTributario: 'REAL', pisCofinsCreditFromSimplesSupplier: false });
    const desp = await conta('6.1.1', 'Expense');
    const st = await request(app).put('/api/accounting/settings').set(authHeader(dono))
      .send({ unitId: UNIT, depreciationExpenseAccountId: desp.id });
    expect(st.status).toBe(200);
    expect(st.body.data).toMatchObject({ unitId: UNIT, depreciationExpenseAccountId: desp.id });

    const versoes = await prisma.accountingPolicyVersion.findMany({ where: { userId: dono.id }, orderBy: { target: 'asc' } });
    expect(versoes).toHaveLength(2);
    for (const v of versoes) {
      expect(v).toMatchObject({ status: 'APPLIED', version: 1, assignmentId: null, proposedById: null, decidedById: dono.id, pendingSlot: null });
      expect(v.decidedAt).not.toBeNull();
      expect(v.payload).not.toHaveProperty('unitId');
    }
    expect(versoes[1].appliedSnapshot).toMatchObject({ depreciationExpenseAccountId: desp.id });
    const ev = await prisma.auditEvent.findFirst({ where: { eventType: 'fiscal_profile.updated' } });
    expect(JSON.parse(ev!.payload)).toMatchObject({ policyVersionId: versoes[0].id });
  });

  it('15b: com contador ativo, os dois PUT dão 409 POLICY_APPROVAL_REQUIRED e não mudam a linha', async () => {
    await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send(PERFIL).expect(200);
    await atribuir();
    const antes = await perfil();

    const fp = await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono))
      .send({ ...PERFIL, pisCofinsCreditFromSimplesSupplier: true });
    expect(fp.status).toBe(409);
    expect(fp.body.code).toBe('POLICY_APPROVAL_REQUIRED');
    const st = await request(app).put('/api/accounting/settings').set(authHeader(dono))
      .send({ unitId: UNIT, disposalGainAccountId: null });
    expect(st.status).toBe(409);
    expect(st.body.code).toBe('POLICY_APPROVAL_REQUIRED');

    expect(await perfil()).toEqual(antes);
    expect(await prisma.accountingScopeSettings.count()).toBe(0);
    expect(await prisma.accountingPolicyVersion.count()).toBe(1); // só a do 1º PUT, sem contador
  });

  it('15d: fluxo F-PC-1 (b) ponta a ponta — proposta, perfil intocado, aprovação do contador aplica', async () => {
    await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send(PERFIL).expect(200);
    const assignmentId = await atribuir();

    const { unitId: _u, ...payload } = PERFIL;
    const prop = await propor({ target: 'FISCAL_PROFILE', payload: { ...payload, pisCofinsCreditFromSimplesSupplier: true } });
    expect(prop.status).toBe(201);
    expect(prop.body.data).toMatchObject({ status: 'PROPOSED', target: 'FISCAL_PROFILE', version: 2, proposedById: dono.id });
    expect(prop.body.data.payload).not.toHaveProperty('unitId');
    expect((await perfil())!.pisCofinsCreditFromSimplesSupplier).toBe(false);

    // O contador lê o detalhe pelo par (contador, dono): payload, estado atual e rótulos.
    const det = await request(app).get(`/api/accounting/policy-versions/${prop.body.data.id}?unitId=${UNIT}&ownerUserId=${dono.id}`)
      .set(authHeader(contador));
    expect(det.status).toBe(200);
    expect(det.body.data.current).toMatchObject({ pisCofinsCreditFromSimplesSupplier: false });
    expect(det.body.data.payload).toMatchObject({ pisCofinsCreditFromSimplesSupplier: true });

    const ap = await aprovar(contador, prop.body.data.id, dono);
    expect(ap.status).toBe(200);
    expect(ap.body.data).toMatchObject({ status: 'APPLIED', assignmentId, decidedById: contador.id });
    expect(ap.body.data.appliedSnapshot).toMatchObject({ pisCofinsCreditFromSimplesSupplier: true });
    expect((await perfil())!.pisCofinsCreditFromSimplesSupplier).toBe(true);

    const upd = await prisma.auditEvent.findFirst({ where: { eventType: 'fiscal_profile.updated' }, orderBy: { seq: 'desc' } });
    expect(upd).toMatchObject({ actorUserId: contador.id, scopeUserId: dono.id });
    expect(JSON.parse(upd!.payload)).toMatchObject({ policyVersionId: prop.body.data.id, pisCofinsCreditFromSimplesSupplier: 'true' });
    const applied = await prisma.auditEvent.findFirst({ where: { eventType: 'policy_version.applied' } });
    expect(applied).toMatchObject({ actorUserId: contador.id, scopeUserId: dono.id });
    expect(JSON.parse(applied!.payload)).toMatchObject({ policyVersionId: prop.body.data.id, assignmentId, version: '2' });

    const list = await request(app).get(`/api/accounting/policy-versions?unitId=${UNIT}`).set(authHeader(dono));
    expect(list.body.data.map((v: { version: number }) => v.version)).toEqual([2, 1]);

    const chain = await request(app).get(`/api/accounting/audit/verify-chain?unitId=${UNIT}`).set(authHeader(dono));
    expect(chain.body.data.ok).toBe(true);
  });

  it('sem contador, a proposta dá 409 POLICY_NO_ACCOUNTANT', async () => {
    const r = await propor({ target: 'SCOPE_SETTINGS', payload: { disposalGainAccountId: null } });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('POLICY_NO_ACCOUNTANT');
  });

  it('15e: rejeição — perfil intocado; reason vazio 400; terceiro 403; o dono não decide', async () => {
    await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono)).send(PERFIL).expect(200);
    await atribuir();
    const { unitId: _u, ...payload } = PERFIL;
    const prop = await propor({ target: 'FISCAL_PROFILE', payload: { ...payload, pisCofinsCreditFromSimplesSupplier: true } });

    expect((await rejeitar(contador, prop.body.data.id, '   ', dono)).status).toBe(400);
    expect((await rejeitar(terceiro, prop.body.data.id, 'não', dono)).status).toBe(403); // ACCOUNTANT_NOT_ASSIGNED
    expect((await rejeitar(dono, prop.body.data.id, 'não')).status).toBe(403); // ACCOUNTANT_REQUIRED
    expect((await aprovar(dono, prop.body.data.id)).status).toBe(403);

    const r = await rejeitar(contador, prop.body.data.id, 'sem base legal para o crédito', dono);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: 'REJECTED', decisionReason: 'sem base legal para o crédito', decidedById: contador.id });
    expect((await perfil())!.pisCofinsCreditFromSimplesSupplier).toBe(false);
    expect((await versao(prop.body.data.id)).pendingSlot).toBeNull();
    expect((await aprovar(contador, prop.body.data.id, dono)).status).toBe(409);
  });

  it('15f: segunda proposta substitui a primeira; aprovar a SUPERSEDED dá 409 POLICY_VERSION_STATUS_CHANGED', async () => {
    await atribuir();
    const p1 = await propor({ target: 'SCOPE_SETTINGS', payload: { disposalGainAccountId: null } });
    const p2 = await propor({ target: 'SCOPE_SETTINGS', payload: { disposalLossAccountId: null } });
    expect(p2.status).toBe(201);
    expect(await versao(p1.body.data.id)).toMatchObject({ status: 'SUPERSEDED', pendingSlot: null, supersededById: p2.body.data.id });
    const ev = await prisma.auditEvent.findFirst({ where: { eventType: 'policy_version.proposed', targetId: p2.body.data.id } });
    expect(JSON.parse(ev!.payload)).toMatchObject({ supersededId: p1.body.data.id });

    const r = await aprovar(contador, p1.body.data.id, dono);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('POLICY_VERSION_STATUS_CHANGED');
    expect((await aprovar(contador, p2.body.data.id, dono)).status).toBe(200);
  });

  it('15f: o slot unique segura 2 PROPOSED do mesmo alvo mesmo sem o check do serviço', async () => {
    const base = { userId: dono.id, unitId: UNIT, target: 'SCOPE_SETTINGS', status: 'PROPOSED', pendingSlot: 'PROPOSED', payload: {} };
    await prisma.accountingPolicyVersion.create({ data: { ...base, version: 1 } });
    await expect(prisma.accountingPolicyVersion.create({ data: { ...base, version: 2 } })).rejects.toMatchObject({ code: 'P2002' });
    // Outro alvo e linhas fora de PROPOSED (slot NULL) não colidem.
    await prisma.accountingPolicyVersion.create({ data: { ...base, target: 'FISCAL_PROFILE', version: 1 } });
    await prisma.accountingPolicyVersion.create({ data: { ...base, version: 3, status: 'APPLIED', pendingSlot: null } });
    await prisma.accountingPolicyVersion.create({ data: { ...base, version: 4, status: 'REJECTED', pendingSlot: null } });
  });

  it('15g: conta apagada entre a proposta e a aprovação → 400, proposta segue PROPOSED, settings intocadas', async () => {
    const desp = await conta('6.1.2', 'Expense');
    await atribuir();
    const prop = await propor({ target: 'SCOPE_SETTINGS', payload: { depreciationExpenseAccountId: desp.id } });
    expect(prop.status).toBe(201);
    await prisma.account.update({ where: { id: desp.id }, data: { deletedAt: new Date() } });

    const r = await aprovar(contador, prop.body.data.id, dono);
    expect(r.status).toBe(400);
    expect(await versao(prop.body.data.id)).toMatchObject({ status: 'PROPOSED', pendingSlot: 'PROPOSED', decidedAt: null });
    expect(await prisma.accountingScopeSettings.count()).toBe(0);
    expect(await prisma.auditEvent.count({ where: { eventType: 'policy_version.applied' } })).toBe(0);
  });

  it('item 11: proposta órfã — encerrada a atribuição, o PUT do dono aplica e a marca SUPERSEDED', async () => {
    const assignmentId = await atribuir();
    const prop = await propor({ target: 'SCOPE_SETTINGS', payload: { disposalGainAccountId: null } });
    await request(app).post(`/api/accounting/accountant-assignments/${assignmentId}/end`).set(authHeader(dono))
      .send({ reason: 'troca de escritório' }).expect(200);

    const put = await request(app).put('/api/accounting/settings').set(authHeader(dono)).send({ unitId: UNIT, disposalLossAccountId: null });
    expect(put.status).toBe(200);
    const direta = await prisma.accountingPolicyVersion.findFirstOrThrow({ where: { status: 'APPLIED' } });
    expect(await versao(prop.body.data.id)).toMatchObject({ status: 'SUPERSEDED', supersededById: direta.id });
    expect(direta).toMatchObject({ version: 2, assignmentId: null });
  });
});
