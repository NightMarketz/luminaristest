/**
 * BE-INCR-ESCALA-BASE item 45 (F-ESC-7, etapa a1) — projeta os afastamentos do DP como `scheduleExceptions`.
 *
 * Read-first: lê os afastamentos que tocam a janela (hoje → hoje + 400 dias) pela porta (`AbsenceSourcePort`, item 44)
 * e as projeções vivas que já existem (`sourceType: 'DP_ABSENCE'`), e só então cria, atualiza ou apaga, como sistema:
 * `kind: ABSENCE`, `origin: HR`, `sourceId` = id do afastamento, a pessoa (`employeeId` = `employeeRef`) e a unidade do
 * vínculo. A exceção com alvo vale em qualquer unidade (item 4): a pessoa afastada não atende em lugar nenhum.
 *
 * - Dia inteiro no fuso da unidade do vínculo, de `startDate` 00:00 até o dia seguinte ao `endDate`. Afastamento sem fim
 *   (`endDate: null`) vai até o fim da janela, e cada reconcile o renova (a janela anda com o dia).
 * - O fuso é o mesmo que o gate lê (`unitTimeZone`). Como a projeção é reescrita a cada rodada, um fuso que mude depois se
 *   corrige na rodada seguinte.
 * - Vínculo sem `employeeRef` (ou com a pessoa removida) é pulado e contado (`skippedNoEmployeeRef`). O vínculo cuja
 *   unidade não está viva também é pulado e contado (`skippedUnitNotLive`): a exceção não teria unidade válida.
 * - Projeção viva sem afastamento correspondente é apagada (o afastamento saiu do DP). A que terminou antes de hoje, no
 *   fuso da unidade, fica como está: o passado não é reconciliado (inclusive o afastamento que acabou ontem, que a porta
 *   já não devolve).
 * - O delete vai pelo repositório (`deleteAsSystem`): o delete do motor não leva `isSystem`, e o `SchedulesPlugin` recusa
 *   apagar `origin: HR` pela rota do usuário (item 15). Depois de qualquer escrita, o efeito pós-escrita do dono.
 */
import type { UserContext } from '../../../lib/authUtils';
import logger from '../../../lib/logger';
import { localMinuteToInstant } from '../models/availability';
import { addDays } from '../models/cycle';
import type { AbsenceSourcePort } from '../ports/AbsenceSourcePort';
import type { ISchedulingRowRepository } from '../repositories/ISchedulingRowRepository';
import type { DataWriteEffectsPort, ProjectionWriterPort } from './HolidayExceptionService';

export const HR_SOURCE_TYPE = 'DP_ABSENCE' as const;
export const PROJECTION_WINDOW_DAYS = 400;

export interface HrAbsenceReconcileResult {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  skippedNoEmployeeRef: number;
  skippedUnitNotLive: number;
}

/** O delete de sistema (repositório do motor com o contexto de versão `SYSTEM`; a factory liga). */
export interface ProjectionDeletePort {
  deleteAsSystem(dataId: string): Promise<void>;
}

const iso = (ms: number) => new Date(ms).toISOString();
/** Campos que a projeção controla; o resto da linha (colunas que o usuário criou) não entra na comparação. */
const OWNED = ['employeeId', 'unitId', 'kind', 'origin', 'startAt', 'endAt', 'sourceType', 'sourceId'] as const;
const instantOrText = (v: unknown) => {
  const t = v instanceof Date ? v.getTime() : typeof v === 'string' ? Date.parse(v) : NaN;
  return isFinite(t) ? iso(t) : String(v ?? '');
};

export class HrAbsenceProjectionService {
  constructor(
    private readonly rows: ISchedulingRowRepository,
    private readonly writer: ProjectionWriterPort,
    private readonly deleter: ProjectionDeletePort,
    private readonly effects: DataWriteEffectsPort,
    private readonly source: AbsenceSourcePort,
  ) {}

  /** `today` = date-only do dia da rodada (o início da janela). */
  async reconcile(user: UserContext, today: string): Promise<HrAbsenceReconcileResult> {
    const result: HrAbsenceReconcileResult = { created: 0, updated: 0, deleted: 0, unchanged: 0, skippedNoEmployeeRef: 0, skippedUnitNotLive: 0 };
    const tableId = await this.rows.tableId(user.userId, 'scheduleExceptions');
    if (!tableId) return result; // instância sem a escala (rollout não rodou)

    const windowEnd = addDays(today, PROJECTION_WINDOW_DAYS);
    const absences = await this.source.absencesFor(user.userId, today, windowEnd);
    const existing = new Map(
      (await this.rows.projectionRows(user.userId, HR_SOURCE_TYPE)).filter((r) => !r.deleted).map((r) => [r.sourceId, r]),
    );

    const zones = new Map<string, string>();
    const zoneOf = async (unitId: string) => {
      if (!zones.has(unitId)) zones.set(unitId, await this.rows.unitTimeZone(user.userId, unitId));
      return zones.get(unitId) as string;
    };
    const unitLive = new Map<string, boolean>();
    const isLive = async (unitId: string) => {
      if (!unitLive.has(unitId)) unitLive.set(unitId, (await this.rows.unitState(user.userId, unitId)) === 'live');
      return unitLive.get(unitId) as boolean;
    };

    const seen = new Set<string>();
    let wrote = false;
    try {
      for (const a of absences) {
        if (!a.employeeRef) {
          result.skippedNoEmployeeRef += 1;
          continue;
        }
        if (!(await isLive(a.unitId))) {
          result.skippedUnitNotLive += 1;
          continue;
        }
        seen.add(a.sourceId);
        const tz = await zoneOf(a.unitId);
        const desired: Record<string, unknown> = {
          employeeId: a.employeeRef,
          unitId: a.unitId,
          kind: 'ABSENCE',
          origin: 'HR',
          startAt: iso(localMinuteToInstant(a.startDate, 0, tz)),
          endAt: iso(localMinuteToInstant(addDays(a.endDate ?? windowEnd, 1), 0, tz)),
          sourceType: HR_SOURCE_TYPE,
          sourceId: a.sourceId,
        };
        const row = existing.get(a.sourceId);
        if (!row) {
          await this.writer.createTableData(user, tableId, { data: desired }, { isSystem: true });
          wrote = true;
          result.created += 1;
        } else if (OWNED.some((k) => instantOrText(row.data[k]) !== instantOrText(desired[k]))) {
          await this.writer.updateTableData(user, row.id, { data: desired }, { isSystem: true });
          wrote = true;
          result.updated += 1;
        } else {
          result.unchanged += 1;
        }
      }
      for (const [sourceId, row] of existing) {
        if (seen.has(sourceId)) continue;
        // Terminou antes de hoje (no fuso da unidade da exceção): o passado fica. O afastamento que acabou ontem sai da
        // porta hoje, e a exceção dele termina à meia-noite local de hoje, então ela não é apagada.
        const end = Date.parse(instantOrText(row.data.endAt));
        const unitId = typeof row.data.unitId === 'string' ? row.data.unitId : null;
        const todayStart = localMinuteToInstant(today, 0, unitId ? await zoneOf(unitId) : 'UTC');
        if (isFinite(end) && end <= todayStart) continue;
        await this.deleter.deleteAsSystem(row.id);
        wrote = true;
        result.deleted += 1;
      }
    } finally {
      if (wrote) this.effects.afterDataWrite(user.userId);
    }
    logger.info('HrAbsenceProjectionService: afastamentos do DP projetados na escala', { userId: user.userId, today, ...result });
    return result;
  }
}
