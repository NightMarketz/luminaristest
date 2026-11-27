/**
 * BE-INCR-ESCALA-BASE item 39 (F-ESC-6 a) — projeta os feriados da unidade como `scheduleExceptions`.
 *
 * Para cada feriado que a porta (`HolidayCalendarPort`, borda BR no item 38) devolve no ano, uma exceção da unidade
 * inteira: `kind: HOLIDAY`, `origin: HOLIDAY_CALENDAR`, o dia inteiro no fuso da unidade, `sourceType: 'HOLIDAY'`,
 * `sourceId: '<unitId>:<date>'`. A chave idempotente é `(sourceType, sourceId)`, contando a linha desligada e a apagada:
 * o feriado que o usuário abriu não volta. F-ESC-23 (C, emenda 4 corrigida em 97540313c): o usuário desliga o feriado
 * (`disabled: true`, item 15), não o apaga, então a linha nunca chega à purga de 90 dias do `PurgeDeletedRecords`. A
 * linha apagada conta só para o dado de antes da emenda. As duas somam em `deletedByUser` ("o usuário abriu").
 *
 * Escreve pelo `DynamicTableService` com `isSystem` (só o sistema grava `origin ≠ USER`, item 15), então o
 * `SchedulesPlugin` valida a linha como em qualquer escrita. Depois de gravar, chama o efeito pós-escrita do dono.
 *
 * F-ESC-18 (emenda 1db262968): a unidade sem fuso recebe antes o fuso padrão da borda (injetado pela factory; o centro
 * não importa `paises/`). O instante da exceção é dado persistido com chave idempotente: gravado no fuso errado, nunca
 * se corrigiria.
 */
import type { UserContext } from '../../../lib/authUtils';
import { NotFoundError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { localMinuteToInstant } from '../models/availability';
import { addDays } from '../models/cycle';
import type { HolidayCalendarPort } from '../ports/HolidayCalendarPort';
import type { ISchedulingPolicy } from '../policies/ISchedulingPolicy';
import type { ISchedulingRowRepository } from '../repositories/ISchedulingRowRepository';

export interface HolidaySyncResult {
  created: number;
  skipped: number;
  deletedByUser: number;
}

/** O que o serviço usa do motor para escrever (interface estreita; a factory liga o `DynamicTableService`). */
export interface ProjectionWriterPort {
  createTableData(user: UserContext, tableId: string, dto: { data: Record<string, unknown> }, options: { isSystem: boolean }): Promise<{ id: string }>;
  updateTableData(user: UserContext, dataId: string, dto: { data: Record<string, unknown> }, options: { isSystem: boolean }): Promise<unknown>;
}
/** O efeito pós-escrita do motor (`IDynamicTableWriteEffects.afterDataWrite`: cache de KPI do dono). */
export interface DataWriteEffectsPort {
  afterDataWrite(ownerUserId: string): void;
}

export const HOLIDAY_SOURCE_TYPE = 'HOLIDAY' as const;
export const holidaySourceId = (unitId: string, date: string) => `${unitId}:${date}`;

const iso = (ms: number) => new Date(ms).toISOString();

export class HolidayExceptionService {
  constructor(
    private readonly rows: ISchedulingRowRepository,
    private readonly writer: ProjectionWriterPort,
    private readonly effects: DataWriteEffectsPort,
    private readonly calendar: HolidayCalendarPort,
    private readonly policy: ISchedulingPolicy,
    /** F-ESC-18: o fuso padrão da borda do país da instância (BR: `America/Sao_Paulo`). */
    private readonly defaultTimeZone: string,
  ) {}

  /** Item 39 — `unitId` ausente = todas as unidades vivas do dono. */
  async sync(user: UserContext, input: { unitId?: string; year: number }): Promise<HolidaySyncResult> {
    const result: HolidaySyncResult = { created: 0, skipped: 0, deletedByUser: 0 };
    let units: string[];
    if (input.unitId) {
      if (!this.policy.canManage(user, await this.rows.unitState(user.userId, input.unitId))) throw new NotFoundError('Unit not found');
      units = [input.unitId];
    } else {
      units = await this.rows.liveUnitIds(user.userId);
    }
    const tableId = await this.rows.tableId(user.userId, 'scheduleExceptions');
    if (!tableId || units.length === 0) return result; // instância sem a escala (rollout não rodou) ou sem unidade

    // `true` = o usuário abriu o feriado (desligou, F-ESC-23; ou apagou, dado de antes da emenda); `false` = vivo.
    const known = new Map((await this.rows.projectionRows(user.userId, HOLIDAY_SOURCE_TYPE)).map((r) => [r.sourceId, r.deleted || r.data.disabled === true]));
    let wrote = false;
    try {
      for (const unitId of units) {
        const timeZone = await this.unitTimeZone(user, unitId, () => (wrote = true));
        for (const date of await this.calendar.holidaysFor(user.userId, unitId, input.year)) {
          const sourceId = holidaySourceId(unitId, date);
          const openedByUser = known.get(sourceId);
          if (openedByUser === true) {
            result.deletedByUser += 1;
            continue;
          }
          if (openedByUser === false) {
            result.skipped += 1;
            continue;
          }
          await this.writer.createTableData(
            user,
            tableId,
            {
              data: {
                unitId,
                kind: 'HOLIDAY',
                origin: 'HOLIDAY_CALENDAR',
                startAt: iso(localMinuteToInstant(date, 0, timeZone)),
                endAt: iso(localMinuteToInstant(addDays(date, 1), 0, timeZone)),
                sourceType: HOLIDAY_SOURCE_TYPE,
                sourceId,
              },
            },
            { isSystem: true },
          );
          known.set(sourceId, false);
          wrote = true;
          result.created += 1;
        }
      }
    } finally {
      // O que já foi gravado antes de uma falha também invalida o cache do dono.
      if (wrote) this.effects.afterDataWrite(user.userId);
    }
    logger.info('HolidayExceptionService: feriados projetados na escala', { userId: user.userId, year: input.year, units: units.length, ...result });
    return result;
  }

  /** O fuso gravado da unidade; sem ele, grava antes o padrão da borda (F-ESC-18) e usa esse. */
  private async unitTimeZone(user: UserContext, unitId: string, onWrite: () => void): Promise<string> {
    const tz = await this.rows.unitTimeZoneSetting(user.userId, unitId);
    if (tz) return tz;
    await this.writer.updateTableData(user, unitId, { data: { timeZone: this.defaultTimeZone } }, { isSystem: true });
    onWrite();
    return this.defaultTimeZone;
  }
}
