/**
 * BE-INCR-ESCALA-BASE item 43 (F-ESC-7, etapa a1) — a fonte dos afastamentos que a escala projeta (§3.2).
 *
 * A porta mora no centro da escala e não sabe do DP: o adaptador (`adapters/DpAbsenceSourceAdapter.ts`, item 44) lê os
 * serviços que o DP já expõe na factory, sem tocar `features/dp/**`. As datas são date-only (`YYYY-MM-DD`), `endDate`
 * inclusive; `null` = afastamento em aberto.
 *
 * `employeeRef` é `string | null` (o §3.2 escreve `string`): o item 45 conta o vínculo sem `employeeRef`
 * (`skippedNoEmployeeRef`), então o registro tem de chegar ao serviço mesmo sem a pessoa operacional.
 */
export interface AbsenceRecord {
  /** Id do afastamento no DP — vira o `sourceId` da exceção. */
  sourceId: string;
  /** A linha `employees` do Core (`DpTrabalhador.employeeRef`); `null` = sem pessoa operacional (ou removida). */
  employeeRef: string | null;
  /** Estabelecimento do vínculo (= unidade). */
  unitId: string;
  startDate: string;
  endDate: string | null;
}

export interface AbsenceSourcePort {
  /** Os afastamentos vivos do dono que tocam `[from, to]` (date-only, inclusive). */
  absencesFor(userId: string, from: string, to: string): Promise<AbsenceRecord[]>;
}
