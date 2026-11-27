import type { UserContext } from '../../../lib/authUtils';

/**
 * BE-INCR-ESCALA-BASE item 34 — quem lê a escala. A régua é a de leitura das tabelas do motor
 * (`DynamicTablePolicy.canView`: o dono das tabelas): a leitura só consulta as tabelas do próprio usuário, e a unidade
 * pedida tem de ser uma unidade viva dele (`findUnitRowState`, o mesmo guarda do I6).
 */
export interface ISchedulingPolicy {
  canRead(user: UserContext, unitState: 'live' | 'deleted' | null): boolean;
  /**
   * Item 40 — quem sincroniza os feriados da unidade (`POST /api/scheduling/holidays/sync`): o dono das tabelas, na
   * unidade viva dele (a mesma régua do `canManageData` do motor, que só confere o dono).
   */
  canManage(user: UserContext, unitState: 'live' | 'deleted' | null): boolean;
}
