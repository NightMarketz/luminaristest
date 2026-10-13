import { Role } from '../../users/models/User.model';
import type { UserContext } from '../../../types/UserContext';
import type { ICrmReportDefinitionPolicy } from './ICrmReportDefinitionPolicy';

/**
 * F-RB4=(c) + complemento ratificado 26/09 (AskUserQuestion): **ler/rodar/editar/apagar** = dono **ou** `ADMIN`
 * (qualquer relatório). Só o papel global `ADMIN` que já existe — sem equipe, sem compartilhamento par-a-par (D4 não
 * reaberto). O serviço traduz `false` em 404 (anti-enumeração, como `SavedTableViewService`).
 */
export class CrmReportDefinitionPolicy implements ICrmReportDefinitionPolicy {
  public canView(actor: UserContext | null, ownerId: string): boolean {
    return this.isOwnerOrAdmin(actor, ownerId);
  }

  public canUpdate(actor: UserContext | null, ownerId: string): boolean {
    return this.isOwnerOrAdmin(actor, ownerId);
  }

  public canDelete(actor: UserContext | null, ownerId: string): boolean {
    return this.isOwnerOrAdmin(actor, ownerId);
  }

  public canListAll(actor: UserContext | null): boolean {
    return actor?.role === Role.ADMIN;
  }

  private isOwnerOrAdmin(actor: UserContext | null, ownerId: string): boolean {
    if (!actor) return false;
    if (actor.role === Role.ADMIN) return true;
    return actor.userId === ownerId;
  }
}
