/**
 * BE-INCR-KIT-SETOR PR-3 — ajuste papel→conta (itens 18–25; emenda §11 do BRIEF) pela API REAL: app Express sobre
 * supertest + SQLite real, sem mock. O kit é instalado pelo `activate-default` (kit vigente do salão), o ajuste pelas
 * rotas `/api/accounting-kit/role-overrides`, e o binding pelo MESMO `BindingCompileService.compile()`.
 *
 * Todo caso recusado confere a BASE (ajustes vivos, versões de binding, auditoria), não só o status HTTP.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { resetDb } from '@test/helpers/db';
import { latestKit } from '@/features/sectorKits/registry';
import { getFactory } from '@/lib/factory';
import { BindingCompileService } from '@/features/accountingBinding/services/BindingCompileService';

const app = makeApp();
const UNIT = 'unit-ajuste';
const BASE = '/api/accounting-kit/role-overrides';
const MOTIVO = 'conta própria de receita de serviço, pedido do contador';

let dono: { id: string; username: string };
const where = () => ({ userId: dono.id, unitId: UNIT });
const auth = () => authHeader(dono);

async function novaConta(code: string, nature: string, acceptsEntries = true): Promise<string> {
  return (await prisma.account.create({ data: { ...where(), code, name: `Conta ${code}`, nature, acceptsEntries } })).id;
}
const contaId = async (code: string) => (await prisma.account.findFirstOrThrow({ where: { ...where(), code, deletedAt: null } })).id;

/** `role → accountCode` do binding Active (o primeiro roleSlot de cada papel). */
async function activeBinding(): Promise<{ bindingVersion: number; codes: Record<string, string> }> {
  const row = await prisma.accountingBinding.findFirstOrThrow({ where: { ...where(), status: 'Active' } });
  const payload = JSON.parse(row.payload) as { eventBindings: Array<{ roleSlots: Array<{ role: string; accountCode: string }> }> };
  const codes: Record<string, string> = {};
  for (const eb of payload.eventBindings) for (const r of eb.roleSlots) codes[r.role] ??= r.accountCode;
  return { bindingVersion: row.bindingVersion, codes };
}

const vivos = () =>
  prisma.roleAccountOverride.findMany({ where: { ...where(), deletedAt: null }, select: { role: true, accountId: true } });
const eventosDeAjuste = () =>
  prisma.auditEvent.findMany({
    where: { scopeUserId: dono.id, eventType: { in: ['kit.role_override_set', 'kit.role_override_removed'] } },
    orderBy: { seq: 'asc' },
    select: { eventType: true, payload: true },
  });
const payloads = async () => (await eventosDeAjuste()).map((e) => ({ eventType: e.eventType, payload: JSON.parse(e.payload) }));

const put = (role: string, body: Record<string, unknown>) =>
  request(app).put(`${BASE}/${encodeURIComponent(role)}`).set(auth()).send({ unitId: UNIT, motivo: MOTIVO, ...body });
const del = (role: string, unitId = UNIT) => request(app).delete(`${BASE}/${encodeURIComponent(role)}`).query({ unitId }).set(auth());

describe('ajuste papel→conta do kit (PR-3)', () => {
  beforeAll(() => pushTestSchema(), 120000);
  afterAll(async () => prisma.$disconnect());

  beforeEach(async () => {
    await resetDb();
    dono = await prisma.user.create({
      data: { name: 'ajuste', username: 'ajuste-dono', email: 'ajuste@test.local', password: 'x', role: 'USER' },
    });
    await prisma.fiscalProfile.create({
      data: { ...where(), regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false },
    });
    const res = await request(app)
      .post('/api/accounting-binding/activate-default')
      .set(auth())
      .send({ unitId: UNIT, installChartIfEmpty: true, openCurrentPeriodIfMissing: true });
    expect(res.body.data).toMatchObject({ status: 'Active', bindingVersion: 1, kit: { status: 'INSTALLED' } });
  });

  it('PUT grava o ajuste, recompila e a versão Active usa a conta nova', async () => {
    const id35 = await novaConta('3.9', 'Revenue');
    const res = await put('receita-serviço', { accountId: id35 });

    expect(res.status).toBe(200);
    expect(res.body.data.binding).toEqual({ status: 'Active', bindingVersion: 2 });
    expect(res.body.data.override).toMatchObject({
      role: 'receita-serviço',
      accountId: id35,
      accountCode: '3.9',
      kitAccountCode: '3.1',
      motivo: MOTIVO,
      setById: dono.id,
    });
    const active = await activeBinding();
    expect(active.bindingVersion).toBe(2);
    expect(active.codes['receita-serviço']).toBe('3.9');
    expect(active.codes['receita-revenda']).toBe('3.3'); // só o papel ajustado muda
    expect(await vivos()).toEqual([{ role: 'receita-serviço', accountId: id35 }]);
    // item 24: papel + ids; o motivo NUNCA vai ao payload (`previousAccountId: null` some na canonicalização do audit)
    expect(await payloads()).toEqual([{ eventType: 'kit.role_override_set', payload: { role: 'receita-serviço', accountId: id35 } }]);

    const list = await request(app).get(BASE).query({ unitId: UNIT }).set(auth());
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([res.body.data.override]);
  });

  it('natureza incompatível: 422 sem gravar nada (e os outros gates do item 20 e do §3.4)', async () => {
    const fora = await prisma.user.create({ data: { name: 'f', username: 'fora', email: 'fora@test.local', password: 'x', role: 'USER' } });
    const contaAlheia = (await prisma.account.create({ data: { userId: fora.id, unitId: UNIT, code: '3.9', name: 'x', nature: 'Revenue' } })).id;
    const sintetica = await contaId('3');
    const despesa = await contaId('4.2');
    const id35 = await novaConta('3.9', 'Revenue');

    const casos: Array<[string, Record<string, unknown>, string]> = [
      ['receita-serviço', { accountId: despesa }, 'ROLE_ACCOUNT_NATURE_MISMATCH'],
      ['receita-serviço', { accountId: sintetica }, 'ACCOUNT_NOT_LEAF'],
      ['receita-serviço', { accountId: contaAlheia }, 'ACCOUNT_NOT_FOUND'],
      ['receita-serviço', { accountId: 'nao-existe' }, 'ACCOUNT_NOT_FOUND'],
      ['passivo-adiantamento', { accountId: await contaId('2.1.2') }, 'ROLE_NOT_IN_KIT'],
      ['caixa-por-metodo', { accountId: await contaId('1.1.1') }, 'ROLE_NOT_IN_KIT'], // o kit só usa sub-chaves
      ['receita-serviço', { accountId: id35, unitId: 'unidade-sem-kit' }, 'KIT_NOT_INSTALLED'],
    ];
    for (const [role, body, code] of casos) {
      const res = await put(role, body);
      expect({ role, code: res.body.code, status: res.status }).toEqual({ role, code, status: 422 });
    }
    expect(await vivos()).toEqual([]);
    expect(await prisma.accountingBinding.count({ where: where() })).toBe(1);
    expect(await eventosDeAjuste()).toEqual([]);

    const curto = await put('receita-serviço', { accountId: id35, motivo: 'curto' });
    expect(curto.status).toBe(400);
    expect(await vivos()).toEqual([]);
  });

  it('trocar a conta duas vezes: uma linha viva por papel, auditoria com a conta anterior', async () => {
    const id35 = await novaConta('3.9', 'Revenue');
    const id36 = await novaConta('3.8', 'Revenue');
    expect((await put('receita-serviço', { accountId: id35 })).status).toBe(200);
    const res = await put('receita-serviço', { accountId: id36 });

    expect(res.body.data.binding).toEqual({ status: 'Active', bindingVersion: 3 });
    expect(await vivos()).toEqual([{ role: 'receita-serviço', accountId: id36 }]);
    expect(await prisma.roleAccountOverride.count({ where: where() })).toBe(2); // a anterior fica, soft-deleted
    expect((await activeBinding()).codes['receita-serviço']).toBe('3.8');
    expect((await payloads())[1]).toEqual({
      eventType: 'kit.role_override_set',
      payload: { role: 'receita-serviço', accountId: id36, previousAccountId: id35 },
    });
  });

  it('sub-chave: caixa-por-metodo:Pix muda só o Pix', async () => {
    const id117 = await novaConta('1.1.7', 'Asset');
    const res = await put('caixa-por-metodo:Pix', { accountId: id117 });

    expect(res.status).toBe(200);
    expect(res.body.data.override).toMatchObject({ role: 'caixa-por-metodo:Pix', accountCode: '1.1.7', kitAccountCode: '1.1.1.01' }); // v6: binding V2 (L8)
    const { codes } = await activeBinding();
    expect(codes['caixa-por-metodo:Pix']).toBe('1.1.7');
    expect(codes['caixa-por-metodo:Cash']).toBe('1.1.1.02');
  });

  it('DELETE recompila de volta ao código do kit', async () => {
    const id35 = await novaConta('3.9', 'Revenue');
    await put('receita-serviço', { accountId: id35 });
    const res = await del('receita-serviço');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ binding: { status: 'Active', bindingVersion: 3 } });
    expect((await activeBinding()).codes['receita-serviço']).toBe('3.1');
    expect(await vivos()).toEqual([]);
    expect((await payloads())[1]).toEqual({ eventType: 'kit.role_override_removed', payload: { role: 'receita-serviço' } });

    // remover e recriar o mesmo papel não morre em P2002 (unicidade viva no serviço, não @@unique)
    expect((await put('receita-serviço', { accountId: id35 })).status).toBe(200);
    expect(await vivos()).toEqual([{ role: 'receita-serviço', accountId: id35 }]);

    const semAjuste = await del('receita-revenda');
    expect({ status: semAjuste.status, code: semAjuste.body.code }).toEqual({ status: 404, code: 'ROLE_OVERRIDE_NOT_FOUND' });
  });

  it('compile Draft: compensa, audita o desfazer e devolve 422', async () => {
    const id35 = await novaConta('3.9', 'Revenue');
    const id36 = await novaConta('3.8', 'Revenue');
    await put('receita-serviço', { accountId: id35 });
    // Mês fechado: o dry-run do validador reprova ⇒ o compile grava Draft.
    const today = new Date().toISOString().slice(0, 10);
    await prisma.accountingPeriod.updateMany({
      where: { ...where(), year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) },
      data: { status: 'SOFT_CLOSED' },
    });

    const res = await put('receita-serviço', { accountId: id36 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ROLE_OVERRIDE_COMPILE_DRAFT');
    expect(res.body.details.binding).toEqual({ status: 'Draft', bindingVersion: 3 });
    expect(res.body.details.blocking.length).toBeGreaterThan(0);
    // o ajuste anterior volta a valer; a Active segue a v2 com 3.5
    expect(await vivos()).toEqual([{ role: 'receita-serviço', accountId: id35 }]);
    expect(await activeBinding()).toMatchObject({ bindingVersion: 2, codes: { 'receita-serviço': '3.9' } });
    expect((await payloads()).slice(1)).toEqual([
      { eventType: 'kit.role_override_set', payload: { role: 'receita-serviço', accountId: id36, previousAccountId: id35 } },
      { eventType: 'kit.role_override_set', payload: { role: 'receita-serviço', accountId: id35, previousAccountId: id36 } },
    ]);

    // DELETE reprovado também desfaz: o ajuste volta a viver
    const d = await del('receita-serviço');
    expect({ status: d.status, code: d.body.code }).toEqual({ status: 422, code: 'ROLE_OVERRIDE_COMPILE_DRAFT' });
    expect(await vivos()).toEqual([{ role: 'receita-serviço', accountId: id35 }]);
    expect((await payloads()).slice(3)).toEqual([
      { eventType: 'kit.role_override_removed', payload: { role: 'receita-serviço' } },
      { eventType: 'kit.role_override_set', payload: { role: 'receita-serviço', accountId: id35 } },
    ]);

    // PUT novo de papel sem ajuste anterior, reprovado: a linha nova some e o desfazer é um `removed`
    const id117 = await novaConta('1.1.7', 'Asset');
    expect((await put('caixa-por-metodo:Pix', { accountId: id117 })).status).toBe(422);
    expect(await vivos()).toEqual([{ role: 'receita-serviço', accountId: id35 }]);
    expect((await payloads()).slice(5).map((e) => e.eventType)).toEqual(['kit.role_override_set', 'kit.role_override_removed']);
  });

  it('compile lança no meio de um PUT concorrente: a compensação não revive a linha antiga', async () => {
    // Review independente (achado 1): P vivo → PUT A grava A → antes do compile de A, PUT B grava B e compila
    // Active → o compile de A lança. Desfazer às cegas reviveria P ao lado de B.
    const [idP, idA, idB] = [await novaConta('3.9', 'Revenue'), await novaConta('3.8', 'Revenue'), await novaConta('3.7', 'Revenue')];
    await put('receita-serviço', { accountId: idP });
    const scope = { ownerUserId: dono.id, actorUserId: dono.id, unitId: UNIT };
    const spy = jest.spyOn(BindingCompileService.prototype, 'compile').mockImplementationOnce(async () => {
      await getFactory().getRoleAccountOverrideService(scope).set(scope, 'receita-serviço', { unitId: UNIT, accountId: idB, motivo: MOTIVO });
      throw new Error('falha injetada no compile de A');
    });
    try {
      await expect(
        getFactory().getRoleAccountOverrideService(scope).set(scope, 'receita-serviço', { unitId: UNIT, accountId: idA, motivo: MOTIVO }),
      ).rejects.toThrow('falha injetada no compile de A');
    } finally {
      spy.mockRestore();
    }
    expect(await vivos()).toEqual([{ role: 'receita-serviço', accountId: idB }]);
    expect((await activeBinding()).codes['receita-serviço']).toBe('3.7');
    // sem evento de desfazer: a escrita de B já é o estado vigente
    expect((await payloads()).map((e) => e.payload.accountId)).toEqual([idP, idA, idB]);
  });

  it('compile lança num PUT de papel sem ajuste: a linha nova some e o desfazer é auditado', async () => {
    const id117 = await novaConta('1.1.7', 'Asset');
    const scope = { ownerUserId: dono.id, actorUserId: dono.id, unitId: UNIT };
    const spy = jest.spyOn(BindingCompileService.prototype, 'compile').mockRejectedValueOnce(new Error('falha injetada'));
    try {
      await expect(
        getFactory().getRoleAccountOverrideService(scope).set(scope, 'caixa-por-metodo:Pix', { unitId: UNIT, accountId: id117, motivo: MOTIVO }),
      ).rejects.toThrow('falha injetada');
    } finally {
      spy.mockRestore();
    }
    expect(await vivos()).toEqual([]);
    expect((await payloads()).map((e) => e.eventType)).toEqual(['kit.role_override_set', 'kit.role_override_removed']);
    expect(JSON.stringify(await eventosDeAjuste())).not.toContain(MOTIVO);
  });

  it('item 25: recompilar pelo POST /accounting-binding/compile com sectorKey de kit não perde o ajuste', async () => {
    const id35 = await novaConta('3.9', 'Revenue');
    await put('receita-serviço', { accountId: id35 });
    const kit = latestKit('beautySalon')!;
    const chart = (await prisma.account.findMany({ where: { ...where(), deletedAt: null } })).map((a) => ({
      code: a.code,
      nature: a.nature,
      acceptsEntries: a.acceptsEntries,
    }));
    const compile = (sectorKey: string) =>
      request(app)
        .post('/api/accounting-binding/compile')
        .set(auth())
        .send({ unitId: UNIT, sectorKey, operationalSchema: kit.operationalSchema, chart, eventBindings: kit.binding.eventBindings });

    // o cliente manda o binding do kit com 3.1; o ajuste vivo prevalece
    const res = await compile('beautySalon');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Active');
    expect(await activeBinding()).toMatchObject({ bindingVersion: 3, codes: { 'receita-serviço': '3.9' } });

    // sectorKey que não é de kit: identidade. LAC-B: o compile recusa 2º setor Active na unidade (409), então o
    // binding do kit sai antes — o ajuste vivo da unidade continua lá para provar que não é aplicado.
    await prisma.accountingBinding.updateMany({ where: { ...where(), sectorKey: 'beautySalon' }, data: { deletedAt: new Date() } });
    const outro = await compile('setorSemKit');
    expect(outro.body.data.status).toBe('Active');
    const row = await prisma.accountingBinding.findFirstOrThrow({ where: { ...where(), sectorKey: 'setorSemKit', status: 'Active' } });
    expect(row.payload).toContain('"role":"receita-serviço","accountCode":"3.1"');
  });
});
