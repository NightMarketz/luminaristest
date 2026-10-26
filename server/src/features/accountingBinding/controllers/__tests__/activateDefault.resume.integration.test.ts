/**
 * EMENDA-2 da LAC-B (FE-INCR-BINDING-ACTIVATION-EMENDA-2-brief.md), PR-0, itens 0 e 0b — app Express REAL sobre
 * supertest + SQLite REAL, kit PUBLICADO do salão (o mesmo que a tela instala).
 *
 * Item 0: falha injetada no passo 7 ⇒ `GET /api/accounting-kit` traz `status: 'FAILED'` e `steps.lastCompletedStep: 6`.
 * Item 0b: com binding `Active` e kit `FAILED` no passo 7, `POST /accounting-binding/activate-default` com o MESMO setor
 * retoma: 2xx, kit `INSTALLED`, `steps.lastCompletedStep: 7`, sem segundo `Active` e sem refazer os passos 1–6 — é a
 * rota que o botão "Retomar instalação" (item 8) chama. O serviço já tinha esse teste
 * (`KitInstallService.integration.test.ts`, "retoma do passo 7"); pela rota, não.
 *
 * A falha entra no próprio passo 7 (`stepReferential`, privado): o kit publicado só traz referencial de 2025, então no
 * ano corrente o passo não chama porta nenhuma que desse para quebrar de fora.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { KitInstallService } from '@/features/sectorKits/services/KitInstallService';

const app = makeApp();
const ACTIVATE = '/api/accounting-binding/activate-default';
const UNIT = 'unit-emenda2-retomada';

type StepSpy = Record<'stepCanonicalChart' | 'stepChartExtension' | 'stepRoleDefaults' | 'stepPeriod' | 'stepCompile' | 'stepReferential', () => Promise<unknown>>;
const proto = KitInstallService.prototype as unknown as StepSpy;

let dono: { id: string; username: string };

const where = () => ({ userId: dono.id, unitId: UNIT });
/** Tudo que os passos 1–6 escrevem: a retomada não pode mudar nada disto. */
const foto = async () => ({
  contas: await prisma.account.count({ where: where() }),
  periodos: await prisma.accountingPeriod.count({ where: where() }),
  bindings: await prisma.accountingBinding.count({ where: where() }),
  settings: await prisma.accountingScopeSettings.count({ where: where() }),
  perfilFiscal: await prisma.fiscalProfile.findFirst({ where: where(), select: { pisDespesaAccountId: true, cofinsDespesaAccountId: true } }),
});

const ativar = () =>
  request(app)
    .post(ACTIVATE)
    .set(authHeader(dono))
    .send({ unitId: UNIT, sectorKey: 'beautySalon', installChartIfEmpty: true, openCurrentPeriodIfMissing: true });
const lerKit = () => request(app).get('/api/accounting-kit').query({ unitId: UNIT }).set(authHeader(dono));

describe('EMENDA-2 LAC-B PR-0 — kit FAILED no passo 7: view com steps e retomada pela rota activate-default', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'emenda2', username: 'emenda2-dono', email: 'emenda2@test.local', password: 'x', role: 'USER' },
    });
    // E-5: o kit vigente preenche contas do perfil fiscal — o perfil vem antes.
    await prisma.fiscalProfile.create({
      data: { ...where(), regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', d1fConfirmado: false },
    });
  }, 120000);

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => prisma.$disconnect());

  it('item 0: falha no passo 7 ⇒ Draft KIT_INSTALL_STEP_FAILED, binding Active, e a view traz FAILED com steps 6', async () => {
    jest.spyOn(proto, 'stepReferential').mockRejectedValueOnce(new Error('falha injetada'));

    const res = await ativar();
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'Draft',
      blocking: [{ code: 'KIT_INSTALL_STEP_FAILED', step: 7 }],
      kit: { kitKey: 'beautySalon', status: 'FAILED' },
    });
    // F6 do BRIEF: o compile é o passo 5 — o Active já existe com o kit FAILED
    expect(await prisma.accountingBinding.count({ where: { ...where(), status: 'Active' } })).toBe(1);

    const view = await lerKit();
    expect(view.status).toBe(200);
    expect(view.body.data).toMatchObject({ kitKey: 'beautySalon', status: 'FAILED', steps: { lastCompletedStep: 6, warnings: [] } });
  });

  it('item 0b: mesmo setor ⇒ retoma do passo 7, kit INSTALLED, steps 7, um só Active e passos 1–6 intocados', async () => {
    const antes = await foto();
    const ativoAntes = await prisma.accountingBinding.findFirstOrThrow({ where: { ...where(), status: 'Active' } });
    // sondas: os passos são idempotentes, então só a sonda distingue "retomou do 7" de "refez tudo"
    const sondas = (['stepCanonicalChart', 'stepChartExtension', 'stepRoleDefaults', 'stepPeriod', 'stepCompile'] as const).map((m) =>
      jest.spyOn(proto, m),
    );
    const passo7 = jest.spyOn(proto, 'stepReferential');

    const res = await ativar();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      status: 'Active',
      bindingVersion: ativoAntes.bindingVersion,
      kit: { kitKey: 'beautySalon', kitVersion: expect.any(Number), status: 'INSTALLED' },
    });
    for (const s of sondas) expect(s).not.toHaveBeenCalled();
    expect(passo7).toHaveBeenCalledTimes(1);

    expect(await foto()).toEqual(antes);
    const ativos = await prisma.accountingBinding.findMany({ where: { ...where(), status: 'Active' } });
    expect(ativos.map((b) => b.id)).toEqual([ativoAntes.id]);

    const view = await lerKit();
    expect(view.body.data).toMatchObject({ status: 'INSTALLED', steps: { lastCompletedStep: 7 } });
  });
});
