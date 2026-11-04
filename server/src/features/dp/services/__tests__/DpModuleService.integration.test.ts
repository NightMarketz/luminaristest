/**
 * BE-INCR-DP-F0-F1 itens 12, 13 e 19 (PR-1) — ativação por competência no SQLite real, com registro fixture: no F0 o
 * registro real tem todos os opcionais `disponivel: false`, então só um fixture exercita ativar/encerrar/reativar.
 */
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { pushTestSchema, resetDb } from '@test/helpers';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { CompetenciaSchema } from '../../models/competencia';
import { DP_MODULE_REGISTRY, type DpModuleRegistry } from '../../models/moduleRegistry';
import { DpPolicy } from '../../policies/DpPolicy';
import { DpModuloAtivacaoRepository } from '../../repositories/DpModuloAtivacaoRepository';
import { DpModuleService } from '../DpModuleService';
import type { AppError } from '@/lib/errors';

const c = (s: string) => CompetenciaSchema.parse(s);
const REG: DpModuleRegistry = {
  ...DP_MODULE_REGISTRY,
  'DP-PONTO': { ...DP_MODULE_REGISTRY['DP-PONTO'], disponivel: true },
  'DP-APP': { ...DP_MODULE_REGISTRY['DP-APP'], disponivel: true, dependsOn: ['DP-PONTO'] },
};

async function erro(p: Promise<unknown>): Promise<{ status: number; code: string }> {
  try {
    await p;
  } catch (e) {
    const err = e as AppError;
    return { status: err.statusCode, code: err.errorCode };
  }
  throw new Error('não lançou');
}

describe('DpModuleService (itens 12, 13, 19)', () => {
  let dono: string;
  let outro: string;
  let svc: DpModuleService;
  const scopeDe = (userId: string) => resolveAccountingScopeInternal({ userId }, `unit-${userId}`);

  beforeAll(() => pushTestSchema(), 120000);
  beforeEach(async () => {
    await resetDb();
    dono = (await prisma.user.create({ data: { name: 'dp', username: 'dp-dono', email: 'dp@test.local', password: 'x', role: 'USER' } })).id;
    outro = (await prisma.user.create({ data: { name: 'dp2', username: 'dp-outro', email: 'dp2@test.local', password: 'x', role: 'USER' } })).id;
    svc = new DpModuleService(new DpModuloAtivacaoRepository(), new DpPolicy(), getFactory().getAuditService(), REG);
  });
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  const ativar = (moduleKey: 'DP-PONTO' | 'DP-APP', inicio: string, userId = dono) =>
    svc.activate(scopeDe(userId), { unitId: `unit-${userId}`, moduleKey, competenciaInicio: c(inicio), motivo: 'teste do DP' });

  it('item 12: ativar, encerrar e reativar numa competência posterior; modulosAtivosEm segue a vigência', async () => {
    const a = await ativar('DP-PONTO', '2027-01');
    const fim = await svc.end(scopeDe(dono), a.id, { unitId: `unit-${dono}`, competenciaFim: c('2027-03'), motivo: 'pausa' });
    expect(fim).toMatchObject({ competenciaInicio: '2027-01', competenciaFim: '2027-03', motivoFim: 'pausa' });
    await ativar('DP-PONTO', '2027-06');
    expect(await svc.modulosAtivosEm(dono, c('2027-03'))).toEqual(['DP-PONTO']);
    expect(await svc.modulosAtivosEm(dono, c('2027-04'))).toEqual([]);
    expect(await svc.modulosAtivosEm(dono, c('2027-06'))).toEqual(['DP-PONTO']);
    const linhas = await prisma.dpModuloAtivacao.findMany({ where: { userId: dono } });
    expect(linhas).toHaveLength(2);
    expect(linhas.every((l) => l.deletedAt === null)).toBe(true);
  });

  it('item 12: sobreposição ⇒ 409 DP_MODULE_ACTIVATION_OVERLAP (na criação e ao estender o fim)', async () => {
    const a = await ativar('DP-PONTO', '2027-01');
    expect(await erro(ativar('DP-PONTO', '2027-05'))).toEqual({ status: 409, code: 'DP_MODULE_ACTIVATION_OVERLAP' });
    await svc.end(scopeDe(dono), a.id, { unitId: `unit-${dono}`, competenciaFim: c('2027-03'), motivo: 'pausa' });
    await ativar('DP-PONTO', '2027-05');
    const estender = svc.end(scopeDe(dono), a.id, { unitId: `unit-${dono}`, competenciaFim: c('2027-05'), motivo: 'estende' });
    expect(await erro(estender)).toEqual({ status: 409, code: 'DP_MODULE_ACTIVATION_OVERLAP' });
  });

  it('item 13: dependência faltante na competência ⇒ 400; com ela ativa ⇒ ok; encerrar a dependência com dependente depois ⇒ 409', async () => {
    expect(await erro(ativar('DP-APP', '2027-02'))).toEqual({ status: 400, code: 'DP_MODULE_MISSING_DEPENDENCY' });
    const ponto = await ativar('DP-PONTO', '2027-01');
    const app = await ativar('DP-APP', '2027-02');
    const encerrarPonto = (fim: string) => svc.end(scopeDe(dono), ponto.id, { unitId: `unit-${dono}`, competenciaFim: c(fim), motivo: 'fim' });
    expect(await erro(encerrarPonto('2027-04'))).toEqual({ status: 409, code: 'DP_MODULE_DEPENDENT_ACTIVE' });
    await svc.end(scopeDe(dono), app.id, { unitId: `unit-${dono}`, competenciaFim: c('2027-04'), motivo: 'fim' });
    expect((await encerrarPonto('2027-04')).competenciaFim).toBe('2027-04');
  });

  it('item 13: competenciaFim antes do início ⇒ 400; módulo indisponível ⇒ 409', async () => {
    const a = await ativar('DP-PONTO', '2027-05');
    const antes = svc.end(scopeDe(dono), a.id, { unitId: `unit-${dono}`, competenciaFim: c('2027-04'), motivo: 'erro' });
    expect((await erro(antes)).status).toBe(400);
    const real = new DpModuleService(new DpModuloAtivacaoRepository(), new DpPolicy(), getFactory().getAuditService());
    const indisp = real.activate(scopeDe(dono), { unitId: `unit-${dono}`, moduleKey: 'DP-PONTO', competenciaInicio: c('2027-01'), motivo: 'x x x' });
    expect(await erro(indisp)).toEqual({ status: 409, code: 'DP_MODULE_UNAVAILABLE' });
  });

  it('Tier-0: ativação de outro dono ⇒ 404 ao encerrar e fora da lista', async () => {
    const a = await ativar('DP-PONTO', '2027-01', outro);
    const alheio = svc.end(scopeDe(dono), a.id, { unitId: `unit-${dono}`, competenciaFim: c('2027-02'), motivo: 'invasão' });
    expect(await erro(alheio)).toEqual({ status: 404, code: 'NOT_FOUND' });
    expect(await svc.listActivations(scopeDe(dono))).toEqual([]);
    expect(await svc.modulosAtivosEm(dono, c('2027-01'))).toEqual([]);
  });

  it('item 19: created e ended gravam AuditEvent só com id, chave e competência (sem motivo)', async () => {
    const a = await ativar('DP-PONTO', '2027-01');
    await svc.end(scopeDe(dono), a.id, { unitId: `unit-${dono}`, competenciaFim: c('2027-02'), motivo: 'motivo secreto' });
    const eventos = await prisma.auditEvent.findMany({ where: { eventType: { startsWith: 'dp.module_activation.' } }, orderBy: { seq: 'asc' } });
    expect(eventos.map((e) => [e.eventType, JSON.parse(e.payload)])).toEqual([
      ['dp.module_activation.created', { activationId: a.id, moduleKey: 'DP-PONTO', competenciaInicio: '2027-01' }],
      ['dp.module_activation.ended', { activationId: a.id, moduleKey: 'DP-PONTO', competenciaFim: '2027-02' }],
    ]);
    expect(eventos.map((e) => e.payload).join()).not.toContain('secreto');
  });
});
