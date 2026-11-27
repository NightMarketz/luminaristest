/**
 * BE-INCR-ESCALA-BASE item 22 (F-ESC-12) — migra o `employees.workSchedule` legado para a escala.
 *
 * Cada funcionário vivo cujo `workSchedule` tem ao menos um dia de trabalho válido (`shiftsFromWorkSchedule`) vira um
 * `schedules` semanal (N = 7, âncora `2024-01-01`, `validFrom` = data da migração, `origin: DECLARED`,
 * `unitId` = `employees.unitId` ou vazio = qualquer unidade) e os turnos dele. Escreve pelo `DynamicTableService` com o
 * contexto do dono, então o `SchedulesPlugin` valida tudo (item 13/14), como numa escrita do usuário.
 *
 * Idempotente pela marca `migratedFrom = 'workSchedule'` + `employeeId`: o funcionário que já tem um padrão vivo com a
 * marca é pulado. Nunca SQL cru (BRIEF §6 item 5).
 */
import type { UserContext } from '../../../lib/authUtils';
import logger from '../../../lib/logger';
import { MIGRATED_FROM_WORK_SCHEDULE, WEEKLY_ANCHOR, WEEKLY_CYCLE_DAYS, shiftsFromWorkSchedule } from '../models/workScheduleMigration';

export interface MigrationRow {
  id: string;
  data: unknown;
}

/** O que a migração usa do motor (interface estreita; a factory/o script ligam `DynamicTableRepository` + `DynamicTableService`). */
export interface MigrationTablesPort {
  findTableByInternalName(userId: string, internalName: string): Promise<{ id: string } | null>;
  findAllDataByTableId(tableId: string): Promise<MigrationRow[]>;
}
export interface MigrationWriterPort {
  createTableData(user: UserContext, tableId: string, dto: { data: Record<string, unknown> }): Promise<{ id: string }>;
  deleteTableData(user: UserContext, dataId: string): Promise<unknown>;
}

export interface WorkScheduleMigrationResult {
  migrated: number;
  alreadyMigrated: number;
  withoutWorkDays: number;
  shifts: number;
}

const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

export class WorkScheduleMigrationService {
  constructor(
    private readonly tables: MigrationTablesPort,
    private readonly writer: MigrationWriterPort,
  ) {}

  /** `today` = data date-only da migração (o `validFrom` do padrão). */
  async migrate(user: UserContext, today: string): Promise<WorkScheduleMigrationResult> {
    const result: WorkScheduleMigrationResult = { migrated: 0, alreadyMigrated: 0, withoutWorkDays: 0, shifts: 0 };
    const employees = await this.tables.findTableByInternalName(user.userId, 'employees');
    const schedules = await this.tables.findTableByInternalName(user.userId, 'schedules');
    const shiftsTable = await this.tables.findTableByInternalName(user.userId, 'scheduleShifts');
    if (!employees || !schedules || !shiftsTable) return result;

    const migratedEmployees = new Set(
      (await this.tables.findAllDataByTableId(schedules.id))
        .map((r) => asRecord(r.data))
        .filter((d) => d.migratedFrom === MIGRATED_FROM_WORK_SCHEDULE && typeof d.employeeId === 'string')
        .map((d) => String(d.employeeId)),
    );

    for (const emp of await this.tables.findAllDataByTableId(employees.id)) {
      const data = asRecord(emp.data);
      const shifts = shiftsFromWorkSchedule(data.workSchedule);
      if (shifts.length === 0) {
        result.withoutWorkDays += 1;
        continue;
      }
      if (migratedEmployees.has(emp.id)) {
        result.alreadyMigrated += 1;
        continue;
      }
      const unitId = typeof data.unitId === 'string' && data.unitId.trim() !== '' ? data.unitId : undefined;
      const schedule = await this.writer.createTableData(user, schedules.id, {
        data: {
          employeeId: emp.id,
          ...(unitId ? { unitId } : {}),
          cycleLengthDays: WEEKLY_CYCLE_DAYS,
          cycleAnchorDate: WEEKLY_ANCHOR,
          validFrom: today,
          origin: 'DECLARED',
          migratedFrom: MIGRATED_FROM_WORK_SCHEDULE,
        },
      });
      try {
        for (const s of shifts) {
          await this.writer.createTableData(user, shiftsTable.id, { data: { scheduleId: schedule.id, ...s } });
        }
      } catch (e) {
        // Compensa: sem isto o padrão com a marca e sem os turnos faria a próxima rodada pular o funcionário.
        await this.writer.deleteTableData(user, schedule.id);
        throw e;
      }
      result.migrated += 1;
      result.shifts += shifts.length;
    }
    logger.info('WorkScheduleMigration: workSchedule migrado para a escala', { userId: user.userId, ...result });
    return result;
  }
}
