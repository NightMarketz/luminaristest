import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IBankSettlementRepository } from '../repositories/IBankSettlementRepository';
import type { UpdateAccountingScopeSettingsInput } from '../dtos/AccountingScopeSettingsDto';

export interface AccountingScopeSettingsView {
  unitId: string;
  bankChargeExpenseAccountId: string | null;
  bankChargeIncomeAccountId: string | null;
  updatedAt: string | null;
}

/**
 * Configuração por escopo (`AccountingScopeSettings`, decisão do dono 2026-09-15). Nasceu dentro do F7
 * (as 2 contas de encargo bancário) e por isso o repositório é o do F7 — ponytail: divide quando um
 * segundo consumidor (X6 `FiscalProfile`, C6b perfil de pacote) aparecer, não antes.
 *
 * Regra de domínio (BRIEF F7 item 8): encargo PAGO debita conta de DESPESA (`nature = Expense`);
 * encargo RECEBIDO credita conta de RECEITA (`nature = Revenue`). Os CÓDIGOS são do contador (§5) —
 * aqui só se valida que a conta escolhida existe no escopo, aceita lançamento e tem a natureza certa.
 */
export class AccountingScopeSettingsService {
  constructor(
    private readonly repo: IBankSettlementRepository,
    private readonly accountRepo: IAccountRepository,
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
      updatedAt: row ? row.updatedAt.toISOString() : null,
    };
  }

  async update(scope: AccountingScope, input: UpdateAccountingScopeSettingsInput): Promise<AccountingScopeSettingsView> {
    if (!this.policy.canManageAccountingSettings(scope)) {
      throw new ForbiddenError('Você não tem permissão para alterar a configuração contábil.');
    }
    const data: { bankChargeExpenseAccountId?: string | null; bankChargeIncomeAccountId?: string | null } = {};
    if (input.bankChargeExpenseAccountId !== undefined) {
      if (input.bankChargeExpenseAccountId !== null) await this.assertAccount(scope, input.bankChargeExpenseAccountId, 'Expense', 'encargo pago');
      data.bankChargeExpenseAccountId = input.bankChargeExpenseAccountId;
    }
    if (input.bankChargeIncomeAccountId !== undefined) {
      if (input.bankChargeIncomeAccountId !== null) await this.assertAccount(scope, input.bankChargeIncomeAccountId, 'Revenue', 'encargo recebido');
      data.bankChargeIncomeAccountId = input.bankChargeIncomeAccountId;
    }
    await this.repo.upsertSettings(scope, data);
    return this.get(scope);
  }

  private async assertAccount(scope: AccountingScope, id: string, nature: 'Expense' | 'Revenue', label: string): Promise<void> {
    const account = await this.accountRepo.findById(scope, id);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`Conta de ${label} '${account.code}' não aceita lançamentos (não é folha).`);
    if (account.nature !== nature) {
      throw new ValidationError(`Conta de ${label} '${account.code}' tem natureza ${account.nature}; esperado ${nature} (BRIEF F7 item 8).`);
    }
  }
}
