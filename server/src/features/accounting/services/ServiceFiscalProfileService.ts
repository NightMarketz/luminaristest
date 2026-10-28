import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { ServiceFiscalProfile } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IServiceFiscalProfileRepository } from '../repositories/IServiceFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { AuditService } from './AuditService';
import { HOSPITALAR_SO_TERAPEUTICA, hospitalarValido, type UpsertServiceFiscalProfileInput } from '../dtos/ServiceFiscalProfileDto';
import { findLc116, listaLc116De, type ListaLc116 } from '../models/lc116ListaNacional';
import { scopeToday } from '../models/dates';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';

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
  /** IBS-CBS-2027 PR-1 (F-IBS-10 a): null => a emissão usa FiscalProfile.ibsCbsClassTrib. */
  cClassTrib: string | null;
  /** EFICIENCIA-FISCAL PR-5 (item 25): null = não informada ⇒ tratada como ESTETICA (I-17). */
  finalidade: string | null;
  elegivelHospitalar: boolean;
  fundamentoHospitalar: string | null;
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
    /** BE-INCR-LEGAL-PARAMS PR-2 (F-LP-4 a): fotografia `LC116_SERVICO` (descrição do cTribNac na view). */
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    /** IBS-CBS-2027 PR-1 (L1 ratificada 21/10: E0959 ao salvar) — o CST do IBS/CBS mora no perfil da unidade. */
    private readonly fiscalProfiles: Pick<IFiscalProfileRepository, 'findByScope'>,
  ) {}

  private async lc116(scope: AccountingScope): Promise<ListaLc116> {
    return listaLc116De(await this.legalParams.fotografia(['LC116_SERVICO']), scopeToday(scope));
  }

  async list(scope: AccountingScope): Promise<ServiceFiscalProfileView[]> {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler o perfil fiscal de serviços.');
    const rows = await this.repo.listByScope(scope);
    const lista = await this.lc116(scope);
    return rows.map((r) => this.toView(r, lista));
  }

  async get(scope: AccountingScope, serviceRef: string): Promise<ServiceFiscalProfileView> {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler o perfil fiscal de serviços.');
    const row = await this.repo.findByServiceRef(scope, serviceRef);
    if (!row) throw new NotFoundError(`Perfil fiscal do serviço '${serviceRef}' não cadastrado.`);
    return this.toView(row, await this.lc116(scope));
  }

  async upsert(scope: AccountingScope, serviceRef: string, input: UpsertServiceFiscalProfileInput): Promise<ServiceFiscalProfileView> {
    if (!this.policy.canManageServiceFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar o perfil fiscal de serviços.');
    const { unitId: _unitId, ...data } = input;
    const lista = await this.lc116(scope);
    return this.repo.runTransaction(async (tx) => {
      // IBS-CBS-2027 PR-1, L1 (dono, questionário, 21/10: conferir ao salvar) — RN E0959 do leiaute da DPS: os 3
      // primeiros dígitos do cClassTrib = CST do IBS/CBS do perfil da unidade. Perfil sem CST: nada a conferir (o grupo
      // IBSCBS só sai com CST — FiscalDocumentEmissionService). Lido dentro da tx (gate autoritativo).
      if (data.cClassTrib) {
        const cst = (await this.fiscalProfiles.findByScope(scope, tx))?.ibsCbsCst ?? null;
        if (cst && !data.cClassTrib.startsWith(cst)) {
          throw new ValidationError(`Os 3 primeiros dígitos de cClassTrib (${data.cClassTrib}) devem ser iguais ao CST do IBS/CBS do perfil fiscal (${cst}) (RN E0959).`);
        }
      }
      // EFICIENCIA-FISCAL PR-5 (item 25): campo omitido mantém o gravado — a combinação final é conferida aqui, na tx.
      const atual = await this.repo.findByServiceRef(scope, serviceRef, tx);
      const final = {
        finalidade: data.finalidade !== undefined ? data.finalidade : (atual?.finalidade ?? null),
        elegivelHospitalar: data.elegivelHospitalar ?? atual?.elegivelHospitalar ?? false,
        fundamentoHospitalar: data.fundamentoHospitalar !== undefined ? data.fundamentoHospitalar : (atual?.fundamentoHospitalar ?? null),
      };
      if (!hospitalarValido(final)) {
        throw new ValidationError(`${HOSPITALAR_SO_TERAPEUTICA}: a equiparação hospitalar (Lei 9.249/1995 art. 15 § 1º III "a") só cabe a serviço de finalidade TERAPEUTICA com o fundamento informado (item da Atribuição 4 da RDC Anvisa 50).`);
      }
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
          cClassTrib: row.cClassTrib ?? '', // IBS-CBS-2027 PR-1, L2 (dono, 21/10): a troca entra na trilha
          finalidade: row.finalidade ?? '', // EFICIENCIA-FISCAL PR-5 (item 25); o fundamento (texto livre) fica fora
          elegivelHospitalar: String(row.elegivelHospitalar),
        },
      });
      return this.toView(row, lista);
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

  private toView(row: ServiceFiscalProfile, lista: ListaLc116): ServiceFiscalProfileView {
    return {
      serviceRef: row.serviceRef,
      cTribNac: row.cTribNac,
      cTribNacDescricao: findLc116(row.cTribNac, lista)?.descricao ?? '',
      cTribMun: row.cTribMun,
      cNBS: row.cNBS,
      cIndOp: row.cIndOp,
      cLocPrestacao: row.cLocPrestacao,
      xDescServ: row.xDescServ,
      cClassTrib: row.cClassTrib,
      finalidade: row.finalidade,
      elegivelHospitalar: row.elegivelHospitalar,
      fundamentoHospitalar: row.fundamentoHospitalar,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
