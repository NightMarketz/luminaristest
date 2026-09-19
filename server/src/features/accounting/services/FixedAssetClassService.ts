import type { FixedAssetClass } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { CreateFixedAssetClassInput, UpdateFixedAssetClassInput } from '../dtos/FixedAssetClassDto';
import type { IFixedAssetClassRepository } from '../repositories/IFixedAssetClassRepository';
import type { IFixedAssetRepository } from '../repositories/IFixedAssetRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';

/**
 * FixedAssetClassService — classe de bem do imobilizado (BE-INCR-FIXED-ASSETS, nó C8, item 1/7).
 * FIRST-CLASS PRISMA. Leitura sob `canRead`; escrita sob `canManageFixedAssets`.
 *
 * `depreciable=true` exige `accumulatedDepreciationAccountId` — já fechado no DTO (`superRefine`);
 * aqui só se confirma que as contas informadas existem no escopo (D11: cross-tenant é 404, não a
 * mensagem de "conta não existe" — a conta de OUTRO tenant nem aparece pro `findById`).
 */
export class FixedAssetClassService {
  constructor(
    private readonly classRepo: IFixedAssetClassRepository,
    private readonly assetRepo: IFixedAssetRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly policy: IAccountingPolicy,
  ) {}

  async listClasses(scope: AccountingScope): Promise<FixedAssetClass[]> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para listar classes de bem.');
    }
    return this.classRepo.findManyByUnit(scope);
  }

  async getClass(scope: AccountingScope, id: string): Promise<FixedAssetClass> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler classes de bem.');
    }
    return this.requireClass(scope, id);
  }

  async requireClass(scope: AccountingScope, id: string): Promise<FixedAssetClass> {
    const found = await this.classRepo.findById(scope, id);
    if (!found) throw new NotFoundError(`Classe de bem '${id}' não foi encontrada.`);
    return found;
  }

  async createClass(scope: AccountingScope, dto: CreateFixedAssetClassInput): Promise<FixedAssetClass> {
    if (!this.policy.canManageFixedAssets(scope)) {
      throw new ForbiddenError('Você não tem permissão para criar classes de bem.');
    }
    await this.assertAccount(scope, dto.costAccountId, 'conta do bem (costAccountId)');
    if (dto.accumulatedDepreciationAccountId) {
      await this.assertAccount(scope, dto.accumulatedDepreciationAccountId, 'conta de depreciação acumulada');
    }
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.classRepo.create({
      userId,
      unitId,
      code: dto.code,
      name: dto.name,
      depreciable: dto.depreciable,
      costAccountId: dto.costAccountId,
      accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId ?? null,
    });
  }

  async updateClass(scope: AccountingScope, id: string, dto: UpdateFixedAssetClassInput): Promise<FixedAssetClass> {
    if (!this.policy.canManageFixedAssets(scope)) {
      throw new ForbiddenError('Você não tem permissão para editar classes de bem.');
    }
    const current = await this.requireClass(scope, id);
    if (dto.costAccountId) await this.assertAccount(scope, dto.costAccountId, 'conta do bem (costAccountId)');
    if (dto.accumulatedDepreciationAccountId) {
      await this.assertAccount(scope, dto.accumulatedDepreciationAccountId, 'conta de depreciação acumulada');
    }
    const nextDepreciable = dto.depreciable ?? current.depreciable;
    const nextAccumulatedAccountId =
      dto.accumulatedDepreciationAccountId !== undefined
        ? dto.accumulatedDepreciationAccountId
        : current.accumulatedDepreciationAccountId;
    if (nextDepreciable && !nextAccumulatedAccountId) {
      throw new ValidationError('accumulatedDepreciationAccountId é obrigatório quando depreciable=true (BRIEF item 1).');
    }
    return this.classRepo.update(scope, id, {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.depreciable !== undefined ? { depreciable: dto.depreciable } : {}),
      ...(dto.costAccountId !== undefined ? { costAccountId: dto.costAccountId } : {}),
      ...(dto.accumulatedDepreciationAccountId !== undefined
        ? { accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId }
        : {}),
    });
  }

  /** Soft-delete bloqueado com ativo vivo (item 7): qualquer `FixedAsset` não soft-deleted na
   *  classe, em qualquer status, impede o delete — o vínculo `classId` (FK Restrict) ficaria
   *  ilustrado sem sentido (classe apagada, ativo vivo apontando pra ela). */
  async deleteClass(scope: AccountingScope, id: string): Promise<FixedAssetClass> {
    if (!this.policy.canManageFixedAssets(scope)) {
      throw new ForbiddenError('Você não tem permissão para remover classes de bem.');
    }
    await this.requireClass(scope, id);
    const liveAssets = await this.assetRepo.countByClass(scope, id);
    if (liveAssets > 0) {
      throw new ValidationError(`Classe '${id}' tem ${liveAssets} ativo(s) vivo(s) — remova ou baixe-os antes.`);
    }
    return this.classRepo.softDelete(scope, id);
  }

  private async assertAccount(scope: AccountingScope, id: string, label: string): Promise<void> {
    const account = await this.accountRepo.findById(scope, id);
    if (!account || account.deletedAt) throw new ValidationError(`${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`${label} '${account.code}' não aceita lançamentos (não é folha).`);
  }
}
