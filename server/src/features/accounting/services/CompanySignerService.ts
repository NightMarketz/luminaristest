import { ConflictError, ForbiddenError, NotFoundError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ICompanySignerRepository } from '../repositories/ICompanySignerRepository';
import type { AuditService } from './AuditService';
import type { CreateCompanySignerInput } from '../dtos/CompanySignerDto';
import type { CompanySigner } from 'generated/prisma';

export const COMPANY_SIGNER_CREATED = 'company_signer.created';
export const COMPANY_SIGNER_UPDATED = 'company_signer.updated';
export const COMPANY_SIGNER_DELETED = 'company_signer.deleted';

export interface CompanySignerView {
  id: string;
  nome: string;
  cpf: string;
  qualifEcd: string;
  qualifEcf: string;
  email: string;
  fone: string;
  updatedAt: string;
}

/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF item 8; PRE-ADR F-OBP-9 → a) — signatários da empresa que não
 * são o contador. Policy: a mesma régua do perfil fiscal (BRIEF item 6). Tenancy pelo dono: id de outro dono → 404.
 * Excluir um signatário que é representante legal de perfil vivo → 409 (a FK é Restrict, mas o delete é SOFT e não a
 * aciona — o gate é deste serviço, dentro da tx). Auditoria só com qualificações (item 10).
 */
export class CompanySignerService {
  constructor(
    private readonly repo: ICompanySignerRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: AccountingScope): Promise<CompanySignerView[]> {
    this.assertRead(scope);
    return (await this.repo.list(scope)).map(toView);
  }

  async get(scope: AccountingScope, id: string): Promise<CompanySignerView> {
    this.assertRead(scope);
    const row = await this.repo.findById(scope, id);
    if (!row) throw new NotFoundError('Signatário não encontrado.');
    return toView(row);
  }

  async create(scope: AccountingScope, input: CreateCompanySignerInput): Promise<CompanySignerView> {
    this.assertManage(scope);
    const { unitId: _unitId, ...data } = input;
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.create(scope, data, tx);
      await this.audit(tx, scope, row, { eventType: COMPANY_SIGNER_CREATED });
      return toView(row);
    });
  }

  async update(scope: AccountingScope, id: string, input: CreateCompanySignerInput): Promise<CompanySignerView> {
    this.assertManage(scope);
    const { unitId: _unitId, ...data } = input;
    return this.repo.runTransaction(async (tx) => {
      if (!(await this.repo.findById(scope, id, tx))) throw new NotFoundError('Signatário não encontrado.');
      const row = await this.repo.update(scope, id, data, tx);
      await this.audit(tx, scope, row, { eventType: COMPANY_SIGNER_UPDATED });
      return toView(row);
    });
  }

  async remove(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      if (!(await this.repo.findById(scope, id, tx))) throw new NotFoundError('Signatário não encontrado.');
      if ((await this.repo.countLiveProfileRefs(scope, id, tx)) > 0) {
        throw new ConflictError('signer_in_use: o signatário é representante legal de um perfil fiscal da empresa — troque-o no perfil antes de excluir.');
      }
      await this.repo.softDelete(scope, id, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: COMPANY_SIGNER_DELETED,
        targetType: 'company_signer',
        targetId: id,
        payload: { signerId: id },
      });
    });
  }

  private async audit(
    tx: Parameters<AuditService['append']>[0],
    scope: AccountingScope,
    row: CompanySigner,
    opts: { eventType: typeof COMPANY_SIGNER_CREATED | typeof COMPANY_SIGNER_UPDATED },
  ): Promise<void> {
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType: opts.eventType,
      targetType: 'company_signer',
      targetId: row.id,
      payload: { signerId: row.id, qualifEcd: row.qualifEcd, qualifEcf: row.qualifEcf },
    });
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler os signatários da empresa.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar os signatários da empresa.');
  }
}

function toView(row: CompanySigner): CompanySignerView {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    qualifEcd: row.qualifEcd,
    qualifEcf: row.qualifEcf,
    email: row.email,
    fone: row.fone,
    updatedAt: row.updatedAt.toISOString(),
  };
}
