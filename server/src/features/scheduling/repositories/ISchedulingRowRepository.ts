import type { ExceptionSourceType } from '../dtos/rows';
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

  // ── Projeções (PR-4 feriado, PR-5 afastamento): só leitura; quem escreve é o serviço, pelo motor ─────────────────
  /** Id da tabela `internalName` do dono, ou `null` se a instância não a tem. */
  tableId(ownerUserId: string, internalName: SchedulingTableName): Promise<string | null>;
  /** Ids das unidades vivas do dono. */
  liveUnitIds(ownerUserId: string): Promise<string[]>;
  /** O `units.timeZone` gravado quando é IANA válido; `null` sem fuso (o serviço grava o padrão da borda, F-ESC-18). */
  unitTimeZoneSetting(ownerUserId: string, unitId: string): Promise<string | null>;
  /**
   * As `scheduleExceptions` com `sourceType` = `sourceType`, **inclusive as apagadas** (a chave idempotente das projeções
   * conta a linha que o usuário apagou, item 39). A linha purgada (90 dias) não volta.
   */
  projectionRows(ownerUserId: string, sourceType: ExceptionSourceType): Promise<ProjectionRow[]>;
  /** Os donos que têm a tabela `internalName` (varredura dos jobs da escala). */
  ownersWithTable(internalName: SchedulingTableName): Promise<string[]>;
}

/** Uma linha de projeção da escala, viva ou apagada, com o `data` cru (o serviço compara e reescreve). */
export interface ProjectionRow {
  id: string;
  sourceId: string;
  deleted: boolean;
  data: Record<string, unknown>;
}
