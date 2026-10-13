import type { UserContext } from '../../../types/UserContext';

/**
 * Autorização das definições de relatório do CRM (BE-INCR-CRM-REPORT-BUILDER PR-2, item 3). Decisões booleanas puras
 * por papel + posse — sem acesso a dado, sem throw.
 */
export interface ICrmReportDefinitionPolicy {
  /** Ler e rodar (F-RB4=(c): dono ou ADMIN). */
  canView(actor: UserContext | null, ownerId: string): boolean;
  /** Editar (complemento F-RB4, 26/09: ADMIN com controle total). */
  canUpdate(actor: UserContext | null, ownerId: string): boolean;
  /** Apagar (soft-delete). */
  canDelete(actor: UserContext | null, ownerId: string): boolean;
  /** Listar todos os relatórios, não só os próprios (ADMIN). */
  canListAll(actor: UserContext | null): boolean;
}
