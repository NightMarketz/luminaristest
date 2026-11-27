/**
 * BE-INCR-ESCALA-BASE item 30 — regressão: a escala semanal migrada do `workSchedule` aceita o mesmo horário que o
 * `workSchedule` aceitava nos dias `active`, com o processo em `TZ=UTC` e em `TZ=America/Sao_Paulo`.
 *
 * O `assertWithinEmployeeHours` antigo lia `getHours()` (fuso do processo). Agora o horário é o da unidade (item 11); sem
 * fuso na unidade, o do processo — os dois casos estão aqui. O `TZ` muda em tempo de execução (o Node relê o fuso do ICU
 * ao atribuir `process.env.TZ`); a guarda abaixo prova que a troca pegou antes de cada caso.
 *
 * Run: npx jest src/features/scheduling/__tests__/workScheduleRegression.integration.test.ts --selectProjects integration --runInBand
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import { CoreSystemPreset } from '@/features/dynamicTables/presets';
import { composeModuleTables } from '@/features/dynamicTables/presets/modules/registry';
import { resolveModuleSelection } from '@/features/dynamicTables/presets/modules/moduleSelection';
import { WorkScheduleMigrationService } from '@/features/scheduling/services/WorkScheduleMigrationService';
import { processTimeZone } from '@/features/scheduling/models/timeZone';
import { Role } from '@/features/users/models/User.model';
import type { UserContext } from '@/lib/authUtils';

const repo = new DynamicTableRepository();
const service = new DynamicTableService(repo, new DynamicTablePolicy());
const A = 'ownerA';
const ctx: UserContext = { id: A, userId: A, name: A, username: A, email: 'a@t.co', userEmail: 'a@t.co', role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date() };
const tid = async (t: string) => (await repo.findTableByInternalName(A, t))!.id;
const mk = async (t: string, data: Record<string, unknown>) => service.createTableData(ctx, await tid(t), { data } as never);
const codeOf = (p: Promise<unknown>) => p.then(() => 'OK', (e: { errorCode?: string; message?: string }) => e.errorCode ?? `THROWN: ${e.message}`);

const originalTz = process.env.TZ;
beforeAll(() => {
  pushTestSchema();
}, 120000);
afterEach(async () => {
  process.env.TZ = originalTz;
  await resetDb();
});
afterAll(async () => {
  await disconnectDb();
});

/** Instante de `hh:mm` locais do processo em 2027-01-04 (segunda), como o `getHours()` antigo o lia. */
const processLocal = (h: number, m = 0) => new Date(2027, 0, 4, h, m).toISOString();
const saoPaulo = (hhmm: string) => `2027-01-04T${hhmm}:00-03:00`;

async function setup(unitTimeZone?: string) {
  await prisma.user.create({ data: { id: A, username: A, email: 'a@t.co', password: 'x', role: Role.USER } });
  await service.installPresetAsSystem(A, { tables: { ...CoreSystemPreset.tables, ...composeModuleTables(resolveModuleSelection(['VEN-SERV', 'AGE-0'])) } });
  const unit = await mk('units', { name: 'Loja', ...(unitTimeZone ? { timeZone: unitTimeZone } : {}) });
  const emp = await mk('employees', { name: 'Ana', role: 'x', email: 'ana@a.co', unitId: unit.id, workSchedule: { monday: { start: '09:00', end: '18:00' } } });
  const svc = await mk('services', { name: 'Corte', category: 'Hair', price: 50, duration: 60 });
  await new WorkScheduleMigrationService(repo, { createTableData: (u, t, d) => service.createTableData(u, t, d as never), deleteTableData: (u, id) => service.deleteTableData(u, id) }).migrate(ctx, '2026-11-27');
  const book = (startAt: string, endAt: string) =>
    mk('appointments', { unitId: unit.id, serviceId: svc.id, responsibleEmployeeId: emp.id, simpleCustomer: true, simpleCustomerName: 'C', startAt, endAt });
  return { book };
}

describe.each(['UTC', 'America/Sao_Paulo'])('item 30 — processo em TZ=%s', (tz) => {
  beforeEach(() => {
    process.env.TZ = tz;
    expect(processTimeZone()).toBe(tz);
  });

  it('unidade sem fuso: 09:00–18:00 locais do processo continuam aceitos, como no workSchedule; 18:00–19:00 recusado', async () => {
    const { book } = await setup();
    expect(await codeOf(book(processLocal(9), processLocal(10)))).toBe('OK');
    expect(await codeOf(book(processLocal(17), processLocal(18)))).toBe('OK');
    expect(await codeOf(book(processLocal(18), processLocal(19)))).toBe('OUTSIDE_AVAILABILITY');
  });

  it('unidade em America/Sao_Paulo: o horário é o da unidade, qualquer que seja o fuso do processo', async () => {
    const { book } = await setup('America/Sao_Paulo');
    expect(await codeOf(book(saoPaulo('09:00'), saoPaulo('10:00')))).toBe('OK');
    expect(await codeOf(book(saoPaulo('08:30'), saoPaulo('09:30')))).toBe('OUTSIDE_AVAILABILITY');
  });
});
