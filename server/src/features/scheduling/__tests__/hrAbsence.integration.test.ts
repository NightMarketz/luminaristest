/**
 * BE-INCR-ESCALA-BASE itens 47 e 48 — o afastamento do DP na agenda, ponta a ponta: o vínculo e o afastamento gravados
 * nas tabelas do DP → `HrAbsenceProjectionService.reconcile` (adaptador real sobre os serviços do DP da factory) → o gate
 * do `AppointmentsPlugin`. O teste só escreve nas tabelas do DP pelo Prisma (dado de entrada); nada em `features/dp/**`
 * muda.
 *
 * Run: npx jest src/features/scheduling/__tests__/hrAbsence.integration.test.ts --selectProjects integration --runInBand
 */
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import { CoreSystemPreset } from '@/features/dynamicTables/presets';
import { composeModuleTables } from '@/features/dynamicTables/presets/modules/registry';
import { resolveModuleSelection } from '@/features/dynamicTables/presets/modules/moduleSelection';
import { addDays } from '@/features/scheduling/models/cycle';
import { Role } from '@/features/users/models/User.model';
import type { UserContext } from '@/lib/authUtils';

const repo = new DynamicTableRepository();
const service = new DynamicTableService(repo, new DynamicTablePolicy());
const ctxOf = (id: string): UserContext => ({ id, userId: id, name: id, username: id, email: `${id}@t.co`, userEmail: `${id}@t.co`, role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date() });

const TODAY = new Date().toISOString().slice(0, 10);
const DAY = addDays(TODAY, 10); // dentro da janela de projeção
const at = (day: string, hhmm: string) => `${day}T${hhmm}:00-03:00`; // America/Sao_Paulo

const A = 'ownerA';

async function seed() {
  await prisma.user.create({ data: { id: A, username: A, email: `${A}@t.co`, password: 'x', role: Role.USER } });
  await service.installPresetAsSystem(A, { tables: { ...CoreSystemPreset.tables, ...composeModuleTables(resolveModuleSelection(['VEN-SERV', 'AGE-0'])) } });
  const tid = async (t: string) => (await repo.findTableByInternalName(A, t))!.id;
  const mk = async (t: string, data: Record<string, unknown>) => service.createTableData(ctxOf(A), await tid(t), { data } as never);
  const unit = await mk('units', { name: 'Loja', timeZone: 'America/Sao_Paulo' });
  const clt = await mk('employees', { name: 'Ana', role: 'x', email: 'ana@a.co', unitId: unit.id });
  const parceira = await mk('employees', { name: 'Bia', role: 'x', email: 'bia@a.co', unitId: unit.id });
  const svc = await mk('services', { name: 'Corte', category: 'Hair', price: 50, duration: 60 });
  // As duas atendem todo dia, 08:00–18:00 (ciclo de 1 dia): só a exceção tira a disponibilidade.
  for (const employeeId of [clt.id, parceira.id]) {
    const s = await mk('schedules', { employeeId, unitId: unit.id, cycleLengthDays: 1, cycleAnchorDate: '2024-01-01', validFrom: '2024-01-01' });
    await mk('scheduleShifts', { scheduleId: s.id, dayOfCycle: 1, startMinute: 480, durationMinutes: 600 });
  }
  // A CLT tem vínculo no DP; a parceira não tem DpTrabalhador (item 48).
  const trab = await prisma.dpTrabalhador.create({
    data: { userId: A, cpf: '52998224725', nome: 'Ana', nascimento: '1990-01-01', employeeRef: clt.id, origem: 'DIGITADA', createdById: A },
  });
  const vinculo = await prisma.dpVinculo.create({
    data: { userId: A, trabalhadorId: trab.id, unitId: unit.id, matricula: 'M-1', categoria: '101', dataInicio: '2024-01-01', origem: 'DIGITADA' },
  });
  const book = (employeeId: string, startAt: string, endAt: string) =>
    mk('appointments', { unitId: unit.id, serviceId: svc.id, responsibleEmployeeId: employeeId, simpleCustomer: true, simpleCustomerName: 'C', startAt, endAt });
  const exceptions = async () => (await repo.findAllDataByTableId(await tid('scheduleExceptions'))).map((r) => r.data as Record<string, unknown>);
  return { unitId: unit.id, cltId: clt.id, parceiraId: parceira.id, vinculoId: vinculo.id, book, exceptions, mk };
}
const codeOf = (p: Promise<unknown>) => p.then(() => 'OK', (e: { errorCode?: string; message?: string }) => e.errorCode ?? `THROWN: ${e.message}`);
const reconcile = () => getFactory().getHrAbsenceProjectionService().reconcile(ctxOf(A), TODAY);

beforeAll(() => {
  pushTestSchema();
}, 120000);
afterEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await disconnectDb();
});

describe('afastamento do DP na agenda (itens 47 e 48)', () => {
  it('item 47: afastamento no DP → reconcile → agendar naquele dia é recusado; afastamento apagado → reconcile → passa', async () => {
    const s = await seed();
    const afast = await prisma.dpAfastamento.create({ data: { vinculoId: s.vinculoId, motivo: '01', inicio: DAY, fim: addDays(DAY, 2) } });

    await expect(reconcile()).resolves.toMatchObject({ created: 1, skippedNoEmployeeRef: 0 });
    expect(await s.exceptions()).toEqual([
      expect.objectContaining({ employeeId: s.cltId, unitId: s.unitId, kind: 'ABSENCE', origin: 'HR', sourceType: 'DP_ABSENCE', sourceId: afast.id }),
    ]);
    expect(await codeOf(s.book(s.cltId, at(DAY, '10:00'), at(DAY, '11:00')))).toBe('OUTSIDE_AVAILABILITY');
    // O dia seguinte ao fim do afastamento atende.
    expect(await codeOf(s.book(s.cltId, at(addDays(DAY, 3), '10:00'), at(addDays(DAY, 3), '11:00')))).toBe('OK');

    // O DP apaga o afastamento (soft delete, como o serviço do DP faz).
    await prisma.dpAfastamento.update({ where: { id: afast.id }, data: { deletedAt: new Date() } });
    await expect(reconcile()).resolves.toMatchObject({ deleted: 1 });
    expect(await s.exceptions()).toEqual([]);
    expect(await codeOf(s.book(s.cltId, at(DAY, '10:00'), at(DAY, '11:00')))).toBe('OK');
  });

  it('a 2ª rodada sem mudança no DP não escreve (idempotente)', async () => {
    const s = await seed();
    await prisma.dpAfastamento.create({ data: { vinculoId: s.vinculoId, motivo: '01', inicio: DAY, fim: null } });
    await reconcile();
    await expect(reconcile()).resolves.toMatchObject({ created: 0, updated: 0, deleted: 0, unchanged: 1 });
  });

  it('item 48: a parceira (sem DpTrabalhador) não é tocada — a exceção dela continua, e ela atende no dia do afastamento da CLT', async () => {
    const s = await seed();
    await prisma.dpAfastamento.create({ data: { vinculoId: s.vinculoId, motivo: '01', inicio: DAY, fim: DAY } });
    await s.mk('scheduleExceptions', { employeeId: s.parceiraId, unitId: s.unitId, kind: 'BLOCK', startAt: at(addDays(DAY, 5), '08:00'), endAt: at(addDays(DAY, 5), '12:00') });

    await reconcile();
    const exc = await s.exceptions();
    expect(exc.filter((e) => e.employeeId === s.parceiraId)).toEqual([expect.objectContaining({ kind: 'BLOCK', origin: 'USER' })]);
    expect(exc.filter((e) => e.origin === 'HR').map((e) => e.employeeId)).toEqual([s.cltId]);
    expect(await codeOf(s.book(s.parceiraId, at(DAY, '10:00'), at(DAY, '11:00')))).toBe('OK');
  });

  it('trabalhador sem employeeRef é pulado e contado; nada vai à agenda', async () => {
    const s = await seed();
    await prisma.dpTrabalhador.updateMany({ where: { userId: A }, data: { employeeRef: null } });
    await prisma.dpAfastamento.create({ data: { vinculoId: s.vinculoId, motivo: '01', inicio: DAY, fim: DAY } });
    await expect(reconcile()).resolves.toMatchObject({ created: 0, skippedNoEmployeeRef: 1 });
    expect(await s.exceptions()).toEqual([]);
  });
});
