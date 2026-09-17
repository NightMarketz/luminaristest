import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import type { ServiceFiscalProfile } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IServiceFiscalProfileRepository } from '../repositories/IServiceFiscalProfileRepository';
import type { AuditService } from './AuditService';
import type { UpsertServiceFiscalProfileInput } from '../dtos/ServiceFiscalProfileDto';
import { findLc116 } from '../models/lc116ListaNacional';

export const SERVICE_FISCAL_PROFILE_UPDATED = 'service_fiscal_profile.updated';
export const SERVICE_FISCAL_PROFILE_DELETED = 'service_fiscal_profile.deleted';

export interface ServiceFiscalProfileView {
  serviceRef: string;
  cTribNac: string;
  /** descrição do subitem na lista nacional (transcrição) — informativo. */
  cTribNacDescricao: string;
  cTribMun: string | null;
  cNBS: string | null;
  cIndOp: string;
  cLocPrestacao: string | null;
  xDescServ: string | null;
  updatedAt: string;
}

/**
 * BE-INCR-DFE (nó X10b, BRIEF item 8) — perfil fiscal DO SERVIÇO (F-DFE-6 a): item da lista nacional LC 116,
 * NBS, INDOP e local da prestação por `serviceRef` (linha `services`). `upsert` idempotente por serviceRef;
 * `delete` = soft com rename-on-delete (repositório). O serviço NÃO lê o preset `services` — a existência
 * da linha é responsabilidade do chamador/FE (regra 3: nó vizinho); a emissão (PR-2) cruza os dois.
 */
export class ServiceFiscalProfileService {
  constructor(
    private readonly repo: IServiceFiscalProfileRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: AccountingScope): Promise<ServiceFiscalProfileView[]> {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler o perfil fiscal de serviços.');
    const rows = await this.repo.listByScope(scope);
    return rows.map((r) => this.toView(r));
  }

  async get(scope: AccountingScope, serviceRef: string): Promise<ServiceFiscalProfileView> {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler o perfil fiscal de serviços.');
    const row = await this.repo.findByServiceRef(scope, serviceRef);
    if (!row) throw new NotFoundError(`Perfil fiscal do serviço '${serviceRef}' não cadastrado.`);
    return this.toView(row);
  }

  async upsert(scope: AccountingScope, serviceRef: string, input: UpsertServiceFiscalProfileInput): Promise<ServiceFiscalProfileView> {
    if (!this.policy.canManageServiceFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar o perfil fiscal de serviços.');
    const { unitId: _unitId, ...data } = input;
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.upsert(scope, serviceRef, data, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: SERVICE_FISCAL_PROFILE_UPDATED,
        targetType: 'service_fiscal_profile',
        targetId: row.id,
        payload: {
          serviceRef: row.serviceRef,
          cTribNac: row.cTribNac,
          cTribMun: row.cTribMun ?? '',
          cNBS: row.cNBS ?? '',
          cIndOp: row.cIndOp,
          cLocPrestacao: row.cLocPrestacao ?? '',
        },
      });
      return this.toView(row);
    });
  }

  async delete(scope: AccountingScope, serviceRef: string): Promise<void> {
    if (!this.policy.canManageServiceFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar o perfil fiscal de serviços.');
    const row = await this.repo.findByServiceRef(scope, serviceRef);
    if (!row) throw new NotFoundError(`Perfil fiscal do serviço '${serviceRef}' não cadastrado.`);
    await this.repo.runTransaction(async (tx) => {
      await this.repo.softDelete(scope, serviceRef, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: SERVICE_FISCAL_PROFILE_DELETED,
        targetType: 'service_fiscal_profile',
        targetId: row.id,
        payload: { serviceRef, cTribNac: row.cTribNac },
      });
    });
  }

  private toView(row: ServiceFiscalProfile): ServiceFiscalProfileView {
    return {
      serviceRef: row.serviceRef,
      cTribNac: row.cTribNac,
      cTribNacDescricao: findLc116(row.cTribNac)?.descricao ?? '',
      cTribMun: row.cTribMun,
      cNBS: row.cNBS,
      cIndOp: row.cIndOp,
      cLocPrestacao: row.cLocPrestacao,
      xDescServ: row.xDescServ,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
