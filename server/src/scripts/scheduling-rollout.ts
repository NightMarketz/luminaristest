/**
 * BE-INCR-ESCALA-BASE itens 12, 22, 23 e 27 + F-ESC-18 — leva a escala a cada instância existente. Idempotente.
 *
 * Por dono de tabela `employees`, nesta ordem:
 *  1. `ensureInstalled`: as quatro tabelas da escala e os campos novos de `units` e `appointments` (sync aditivo);
 *  2. `applySchemaChanges`: `employees.workSchedule` readOnly e o `noOverlap` por pessoa/recurso (emenda 1db262968);
 *  3. `fillUnitTimeZones`: o fuso padrão da borda BR nas unidades sem fuso (F-ESC-18);
 *  4. `WorkScheduleMigrationService.migrate`: o `workSchedule` vira `schedules` + `scheduleShifts`;
 *  5. o efeito pós-escrita do dono (`afterStructureWrite`: KPI e KnowledgeGraph), porque o script é quem orquestra as
 *     escritas (IDynamicTableWriteEffects). O grafo é persistido, então vale mesmo fora do processo do servidor.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/scheduling-rollout.ts
 * (aponta para o banco do `DATABASE_URL`; rode antes sobre uma cópia do banco real).
 *
 * O contexto é o do próprio dono com papel ADMIN: é processo interno do servidor, e o `PresetSyncService` exige quem
 * administre preset. As linhas migradas passam pelo `DynamicTableService` e pelo `SchedulesPlugin` como escrita do dono.
 */
import prisma from '../lib/prisma';
import type { UserContext } from '../lib/authUtils';
import { Role } from '../features/users/models/User.model';
import { DynamicTableRepository } from '../features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '../features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '../features/dynamicTables/services/DynamicTableService';
import { PresetSyncService } from '../features/dynamicTables/services/PresetSyncService';
import { SchedulingRolloutService } from '../features/scheduling/services/SchedulingRolloutService';
import { WorkScheduleMigrationService, type WorkScheduleMigrationResult } from '../features/scheduling/services/WorkScheduleMigrationService';
import { isSupportedTimeZone } from '../features/scheduling/models/timeZone';
import { localDay } from '../features/scheduling/models/availability';
import { BR_DEFAULT_TIME_ZONE } from '../features/scheduling/paises/br/models/timeZone';
import type { IDynamicTableWriteEffects } from '../features/integration/services/IDynamicTableWriteEffects';
import { getFactory } from '../lib/factory';

function ownerContext(user: { id: string; username: string; email: string; createdAt: Date; updatedAt: Date }): UserContext {
  return {
    id: user.id,
    userId: user.id,
    name: user.username,
    username: user.username,
    email: user.email,
    userEmail: user.email,
    role: Role.ADMIN,
    userRole: Role.ADMIN,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export interface InstanceRollout {
  userId: string;
  installed: string[];
  patched: string[];
  unitsWithDefaultTimeZone: number;
  migration: WorkScheduleMigrationResult;
}

export async function runSchedulingRollout(now: Date = new Date(), effects?: IDynamicTableWriteEffects): Promise<InstanceRollout[]> {
  const writeEffects = effects ?? getFactory().getDynamicTableWriteEffects();
  const repo = new DynamicTableRepository();
  const policy = new DynamicTablePolicy();
  const tables = new DynamicTableService(repo, policy);
  const rollout = new SchedulingRolloutService(new PresetSyncService(tables, repo, policy), repo, tables, {
    findAllDataByTableId: (id) => repo.findAllDataByTableId(id),
    updateTableData: (user, id, dto, options) => tables.updateTableData(user, id, dto as never, options),
  });
  const migration = new WorkScheduleMigrationService(repo, {
    createTableData: (user, tableId, dto) => tables.createTableData(user, tableId, dto as never),
    deleteTableData: (user, id) => tables.deleteTableData(user, id),
  });
  const today = localDay(now.getTime(), BR_DEFAULT_TIME_ZONE);

  const owners = await prisma.dynamicTable.findMany({ where: { internalName: 'employees' }, select: { userId: true }, distinct: ['userId'] });
  const out: InstanceRollout[] = [];
  for (const { userId } of owners) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, email: true, createdAt: true, updatedAt: true } });
    if (!user) continue;
    const ctx = ownerContext(user);
    const { installed } = await rollout.ensureInstalled(ctx);
    const patched = await rollout.applySchemaChanges(ctx);
    const unitsWithDefaultTimeZone = await rollout.fillUnitTimeZones(ctx, BR_DEFAULT_TIME_ZONE, isSupportedTimeZone);
    const migrationResult = await migration.migrate(ctx, today);
    await writeEffects.afterStructureWrite(userId);
    out.push({ userId, installed, patched, unitsWithDefaultTimeZone, migration: migrationResult });
  }
  return out;
}

if (require.main === module) {
  runSchedulingRollout()
    .then((rows) => process.stdout.write(`${JSON.stringify({ instances: rows.length, perInstance: rows }, null, 2)}\n`))
    .catch((e) => {
      process.stderr.write(`${String(e)}\n`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
