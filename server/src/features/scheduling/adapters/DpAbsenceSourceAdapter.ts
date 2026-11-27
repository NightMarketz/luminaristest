/**
 * BE-INCR-ESCALA-BASE item 44 (F-ESC-7 a1) — os afastamentos do DP como `AbsenceRecord`, pelos serviços que o DP já
 * expõe na factory (`DpVinculoService.listVinculos`/`listTrabalhadores`, `DpAfastamentoFeriasService.listAfastamentos`).
 * A pessoa é achada por `DpTrabalhador.employeeRef` (F-DP-1). Não edita nada em `features/dp/**`; o `check:arch` aceita
 * `scheduling → dp` (sonda da passagem 2 e o import real deste arquivo).
 *
 * - O trabalhador sem `employeeRef`, ou com a linha `employees` removida (`pessoaOperacionalRemovida`, D-6 do DP), vai
 *   com `employeeRef: null`: não há pessoa na agenda para afastar, e o serviço conta (item 45).
 * - As listas do DP não paginam (só `limit`). Lista cheia = truncada, e afastamento truncado seria pessoa afastada
 *   agendável sem aviso: o adaptador falha alto (o job alerta) em vez de devolver a lista parcial.
 * - O escopo: `listVinculos`/`listTrabalhadores` leem por dono (`ownerUserId`), e a policy do DP olha só o ator; o
 *   `unitId` do escopo dessas duas não é lido. O `listAfastamentos` recebe o escopo da unidade do vínculo.
 *
 * Nada de PII sai daqui: só ids e datas (o `DpTrabalhadorView` traz CPF e nome, que ficam no adaptador).
 */
import { resolveAccountingScopeInternal } from '../../accounting/scope/resolveAccountingScopeInternal';
import type { DpAfastamentoFeriasService } from '../../dp/services/DpAfastamentoFeriasService';
import type { DpVinculoService } from '../../dp/services/DpVinculoService';
import type { AbsenceRecord, AbsenceSourcePort } from '../ports/AbsenceSourcePort';

export const DP_LIST_LIMIT = 10_000;
/** As duas listas por dono não leem o `unitId` do escopo (ver acima). */
const OWNER_WIDE_UNIT = '';

export type DpVinculoReader = Pick<DpVinculoService, 'listVinculos' | 'listTrabalhadores'>;
export type DpAfastamentoReader = Pick<DpAfastamentoFeriasService, 'listAfastamentos'>;

export class DpListTruncatedError extends Error {
  constructor(list: string) {
    super(`DpAbsenceSourceAdapter: a lista ${list} do DP veio com ${DP_LIST_LIMIT} itens (teto); a projeção não roda com lista parcial.`);
    this.name = 'DpListTruncatedError';
  }
}

export class DpAbsenceSourceAdapter implements AbsenceSourcePort {
  constructor(
    private readonly vinculos: DpVinculoReader,
    private readonly afastamentos: DpAfastamentoReader,
  ) {}

  async absencesFor(userId: string, from: string, to: string): Promise<AbsenceRecord[]> {
    const ownerScope = resolveAccountingScopeInternal({ userId }, OWNER_WIDE_UNIT);
    const [vinculos, trabalhadores] = await Promise.all([
      this.vinculos.listVinculos(ownerScope, DP_LIST_LIMIT),
      this.vinculos.listTrabalhadores(ownerScope, DP_LIST_LIMIT),
    ]);
    if (vinculos.length >= DP_LIST_LIMIT) throw new DpListTruncatedError('de vínculos');
    if (trabalhadores.length >= DP_LIST_LIMIT) throw new DpListTruncatedError('de trabalhadores');

    const refOf = new Map(trabalhadores.map((t) => [t.id, t.employeeRef && !t.pessoaOperacionalRemovida ? t.employeeRef : null]));
    const out: AbsenceRecord[] = [];
    for (const v of vinculos) {
      const employeeRef = refOf.get(v.trabalhadorId) ?? null;
      for (const a of await this.afastamentos.listAfastamentos(resolveAccountingScopeInternal({ userId }, v.unitId), v.id)) {
        // Toca [from, to]: começa até `to` e não terminou antes de `from` (date-only compara como texto).
        if (a.inicio > to || (a.fim !== null && a.fim < from)) continue;
        out.push({ sourceId: a.id, employeeRef, unitId: v.unitId, startDate: a.inicio, endDate: a.fim });
      }
    }
    return out;
  }
}
