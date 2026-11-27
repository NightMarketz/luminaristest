import type { ExceptionRow } from '../models/rows';
import type { Interval, ScheduleTarget } from '../models/availability';
import type { ScheduleInZone } from '../models/scheduleOverlap';

/** Tabelas da escala e as que a leitura consulta (todas DynamicTable do dono). */
export type SchedulingTableName = 'units' | 'employees' | 'resources' | 'services' | 'schedules' | 'scheduleShifts' | 'scheduleExceptions' | 'appointments';

/**
 * BE-INCR-ESCALA-BASE item 31 — leitura das linhas da escala **fora do motor** (rotas de disponibilidade e horário livre).
 * Só leitura; toda consulta é do dono (`ownerUserId`), e id de outro dono não é achado.
 */
export interface ISchedulingRowRepository {
  /** Estado da unidade do dono: `live`, `deleted` ou `null` (não existe ou é de outro dono). */
  unitState(ownerUserId: string, unitId: string): Promise<'live' | 'deleted' | null>;
  /** A linha viva `id` está na tabela `internalName` do dono. */
  isOwnRow(ownerUserId: string, internalName: SchedulingTableName, id: string): Promise<boolean>;
  /** Fuso da unidade (`units.timeZone`), com o fuso do processo quando ausente. */
  unitTimeZone(ownerUserId: string, unitId: string | null): Promise<string>;
  /** Os padrões vivos do alvo, com os turnos e o fuso de cada um (o da unidade do padrão; sem unidade, `fallbackUnitId`). */
  targetSchedules(ownerUserId: string, target: ScheduleTarget, fallbackUnitId: string | null): Promise<ScheduleInZone[]>;
  /** As exceções vivas do alvo (qualquer unidade) e as sem alvo da unidade (item 4). */
  applicableExceptions(ownerUserId: string, target: ScheduleTarget, unitId: string | null): Promise<ExceptionRow[]>;
  /** Agendamentos vivos `Scheduled` do alvo (pessoa ou recurso, em qualquer unidade) que tocam `range`. */
  busy(ownerUserId: string, target: ScheduleTarget, range: Interval): Promise<Interval[]>;
  /** Profissionais da unidade: `employees.unitId` = unidade, mais quem tem padrão vivo com `unitId` = unidade. */
  employeesOfUnit(ownerUserId: string, unitId: string): Promise<string[]>;
  /** `services.duration` em minutos, ou `null` sem duração válida. */
  serviceDurationMinutes(ownerUserId: string, serviceId: string): Promise<number | null>;
}
