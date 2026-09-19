import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IBankSettlementRepository } from '../repositories/IBankSettlementRepository';
import type { ILalurRepository } from '../repositories/ILalurRepository';
import type { UpdateAccountingScopeSettingsInput } from '../dtos/AccountingScopeSettingsDto';

export interface AccountingScopeSettingsView {
  unitId: string;
  bankChargeExpenseAccountId: string | null;
  bankChargeIncomeAccountId: string | null;
  depreciationExpenseAccountId: string | null;
  disposalGainAccountId: string | null;
  disposalLossAccountId: string | null;
  depreciationParteBAccountId: string | null;
  updatedAt: string | null;
}

/**
 * Configuração por escopo (`AccountingScopeSettings`, decisão do dono 2026-09-15). Nasceu dentro do F7
 * (as 2 contas de encargo bancário) e por isso o repositório é o do F7 — ponytail: divide quando um
 * segundo consumidor (X6 `FiscalProfile`, C6b perfil de pacote) aparecer, não antes.
 *
 * BE-INCR-FIXED-ASSETS (nó C8) acrescenta 4 contas (item 5 + item 24): despesa de depreciação
 * (Expense), ganho/perda na baixa (sem natureza fixa — o parecer não amarra; valida só existência +
 * folha) e a conta da Parte B (`LalurParteBAccount`, não `Account` — FK diferente).
 *
 * Regra de domínio (BRIEF F7 item 8): encargo PAGO debita conta de DESPESA (`nature = Expense`);
 * encargo RECEBIDO credita conta de RECEITA (`nature = Revenue`). Os CÓDIGOS são do contador (§5) —
 * aqui só se valida que a conta escolhida existe no escopo, aceita lançamento e tem a natureza certa.
 */
export class AccountingScopeSettingsService {
  constructor(
    private readonly repo: IBankSettlementRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly lalurRepo: ILalurRepository,
    private readonly policy: IAccountingPolicy,
  ) {}

  async get(scope: AccountingScope): Promise<AccountingScopeSettingsView> {
    if (!this.policy.canReadAccountingSettings(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler a configuração contábil.');
    }
    const row = await this.repo.getSettings(scope);
    return {
      unitId: scope.unitId,
      bankChargeExpenseAccountId: row?.bankChargeExpenseAccountId ?? null,
      bankChargeIncomeAccountId: row?.bankChargeIncomeAccountId ?? null,
      depreciationExpenseAccountId: row?.depreciationExpenseAccountId ?? null,
      disposalGainAccountId: row?.disposalGainAccountId ?? null,
      disposalLossAccountId: row?.disposalLossAccountId ?? null,
      depreciationParteBAccountId: row?.depreciationParteBAccountId ?? null,
      updatedAt: row ? row.updatedAt.toISOString() : null,
    };
  }

  async update(scope: AccountingScope, input: UpdateAccountingScopeSettingsInput): Promise<AccountingScopeSettingsView> {
    if (!this.policy.canManageAccountingSettings(scope)) {
      throw new ForbiddenError('Você não tem permissão para alterar a configuração contábil.');
    }
    const data: {
      bankChargeExpenseAccountId?: string | null;
      bankChargeIncomeAccountId?: string | null;
      depreciationExpenseAccountId?: string | null;
      disposalGainAccountId?: string | null;
      disposalLossAccountId?: string | null;
      depreciationParteBAccountId?: string | null;
    } = {};
    if (input.bankChargeExpenseAccountId !== undefined) {
      if (input.bankChargeExpenseAccountId !== null) await this.assertAccount(scope, input.bankChargeExpenseAccountId, 'Expense', 'encargo pago');
      data.bankChargeExpenseAccountId = input.bankChargeExpenseAccountId;
    }
    if (input.bankChargeIncomeAccountId !== undefined) {
      if (input.bankChargeIncomeAccountId !== null) await this.assertAccount(scope, input.bankChargeIncomeAccountId, 'Revenue', 'encargo recebido');
      data.bankChargeIncomeAccountId = input.bankChargeIncomeAccountId;
    }
    if (input.depreciationExpenseAccountId !== undefined) {
      if (input.depreciationExpenseAccountId !== null) await this.assertAccount(scope, input.depreciationExpenseAccountId, 'Expense', 'despesa de depreciação');
      data.depreciationExpenseAccountId = input.depreciationExpenseAccountId;
    }
    if (input.disposalGainAccountId !== undefined) {
      if (input.disposalGainAccountId !== null) await this.assertAccount(scope, input.disposalGainAccountId, null, 'ganho na baixa de imobilizado');
      data.disposalGainAccountId = input.disposalGainAccountId;
    }
    if (input.disposalLossAccountId !== undefined) {
      if (input.disposalLossAccountId !== null) await this.assertAccount(scope, input.disposalLossAccountId, null, 'perda na baixa de imobilizado');
      data.disposalLossAccountId = input.disposalLossAccountId;
    }
    if (input.depreciationParteBAccountId !== undefined) {
      if (input.depreciationParteBAccountId !== null) {
        const parteB = await this.lalurRepo.findParteBById(scope, input.depreciationParteBAccountId);
        if (!parteB || parteB.deletedAt) {
          throw new ValidationError(`Conta da Parte B '${input.depreciationParteBAccountId}' não existe neste escopo.`);
        }
      }
      data.depreciationParteBAccountId = input.depreciationParteBAccountId;
    }
    await this.repo.upsertSettings(scope, data);
    return this.get(scope);
  }

  /** `nature=null` não amarra a natureza da conta (ganho/perda na baixa — o parecer não fixa um lado). */
  private async assertAccount(scope: AccountingScope, id: string, nature: 'Expense' | 'Revenue' | null, label: string): Promise<void> {
    const account = await this.accountRepo.findById(scope, id);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`Conta de ${label} '${account.code}' não aceita lançamentos (não é folha).`);
    if (nature && account.nature !== nature) {
      throw new ValidationError(`Conta de ${label} '${account.code}' tem natureza ${account.nature}; esperado ${nature} (BRIEF F7 item 8).`);
    }
  }
}
