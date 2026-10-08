import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IBankSettlementRepository } from '../repositories/IBankSettlementRepository';
import type { ILalurRepository } from '../repositories/ILalurRepository';
import type { IAccountantAssignmentRepository } from '../repositories/IAccountantAssignmentRepository';
import type { IAccountingPolicyVersionRepository } from '../repositories/IAccountingPolicyVersionRepository';
import { applyDirectInTx, assertNoActiveAccountant } from './policyVersionApply';
import type { UpdateAccountingScopeSettingsInput, ScopeSettingsPolicyPayload } from '../dtos/AccountingScopeSettingsDto';
import type { AccountingScopeSettings, Prisma } from 'generated/prisma';

type SettingsData = {
  bankChargeExpenseAccountId?: string | null;
  bankChargeIncomeAccountId?: string | null;
  depreciationExpenseAccountId?: string | null;
  disposalGainAccountId?: string | null;
  disposalLossAccountId?: string | null;
  depreciationParteBAccountId?: string | null;
};

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
 *
 * BE-INCR-ACCOUNTING-POLICY-VERSION (itens 5–6): parâmetro governado — com contador ACTIVE o PUT dá 409 e a mudança
 * vai por proposta. Toda aplicação passa por `applyInTx` (efeito declarado: o PUT agora roda em tx e valida as contas
 * dentro dela) e grava a versão APPLIED com o snapshot — é o histórico das settings, que não têm evento próprio (P-5).
 */
export class AccountingScopeSettingsService {
  constructor(
    private readonly repo: IBankSettlementRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly lalurRepo: ILalurRepository,
    private readonly policy: IAccountingPolicy,
    // GOV-CONTADOR política versionada (item 13): gate do PUT com contador ativo + versão APPLIED.
    private readonly assignmentRepo: IAccountantAssignmentRepository,
    private readonly policyVersionRepo: IAccountingPolicyVersionRepository,
  ) {}

  async get(scope: AccountingScope): Promise<AccountingScopeSettingsView> {
    if (!this.policy.canReadAccountingSettings(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler a configuração contábil.');
    }
    return this.toView(scope, await this.repo.getSettings(scope));
  }

  async update(scope: AccountingScope, input: UpdateAccountingScopeSettingsInput): Promise<AccountingScopeSettingsView> {
    if (!this.policy.canManageAccountingSettings(scope)) {
      throw new ForbiddenError('Você não tem permissão para alterar a configuração contábil.');
    }
    const { unitId: _unitId, ...patch } = input;
    await assertNoActiveAccountant(this.assignmentRepo, scope); // preflight (item 6)
    return this.policyVersionRepo.runTransaction(async (tx) => {
      await assertNoActiveAccountant(this.assignmentRepo, scope, tx); // autoritativo, dentro da tx
      return applyDirectInTx(this.policyVersionRepo, scope, 'SCOPE_SETTINGS', patch, tx, (policyVersionId) =>
        this.applyInTx(scope, patch, tx, policyVersionId),
      );
    });
  }

  /**
   * BE-INCR-KIT-SETOR PR-2 (item 10, passo 3): contas-padrão do kit de setor, **só nos campos nulos** (regra Odoo:
   * o modelo preenche, nunca sobrescreve). Sem linha, cria só com essas contas (emenda E-5). Mesmo caminho de
   * escrita do PUT (policy, gate do contador ativo dentro da tx, versão APPLIED, validação in-tx); o campo nulo é
   * lido DENTRO da tx, então uma escrita concorrente do usuário nunca é sobrescrita. Devolve os campos gravados.
   */
  async fillNullAccounts(
    scope: AccountingScope,
    accountIds: Partial<Record<'bankChargeExpenseAccountId' | 'bankChargeIncomeAccountId' | 'depreciationExpenseAccountId' | 'disposalGainAccountId' | 'disposalLossAccountId', string>>,
  ): Promise<string[]> {
    if (!this.policy.canManageAccountingSettings(scope)) {
      throw new ForbiddenError('Você não tem permissão para alterar a configuração contábil.');
    }
    await assertNoActiveAccountant(this.assignmentRepo, scope);
    return this.policyVersionRepo.runTransaction(async (tx) => {
      await assertNoActiveAccountant(this.assignmentRepo, scope, tx);
      const current = await this.repo.getSettings(scope, tx);
      const patch = Object.fromEntries(
        Object.entries(accountIds).filter(([field]) => current?.[field as keyof typeof accountIds] == null),
      ) as ScopeSettingsPolicyPayload;
      const fields = Object.keys(patch);
      if (fields.length === 0) return [];
      await applyDirectInTx(this.policyVersionRepo, scope, 'SCOPE_SETTINGS', patch, tx, (policyVersionId) =>
        this.applyInTx(scope, patch, tx, policyVersionId),
      );
      return fields;
    });
  }

  /** Asserções das contas do patch (só leitura); a proposta usa sem `tx` (item 7.3), `applyInTx` com. */
  async validate(scope: AccountingScope, input: ScopeSettingsPolicyPayload, tx?: Prisma.TransactionClient): Promise<SettingsData> {
    const data: SettingsData = {};
    if (input.bankChargeExpenseAccountId !== undefined) {
      if (input.bankChargeExpenseAccountId !== null) await this.assertAccount(scope, input.bankChargeExpenseAccountId, 'Expense', 'encargo pago', tx);
      data.bankChargeExpenseAccountId = input.bankChargeExpenseAccountId;
    }
    if (input.bankChargeIncomeAccountId !== undefined) {
      if (input.bankChargeIncomeAccountId !== null) await this.assertAccount(scope, input.bankChargeIncomeAccountId, 'Revenue', 'encargo recebido', tx);
      data.bankChargeIncomeAccountId = input.bankChargeIncomeAccountId;
    }
    if (input.depreciationExpenseAccountId !== undefined) {
      if (input.depreciationExpenseAccountId !== null) await this.assertAccount(scope, input.depreciationExpenseAccountId, 'Expense', 'despesa de depreciação', tx);
      data.depreciationExpenseAccountId = input.depreciationExpenseAccountId;
    }
    if (input.disposalGainAccountId !== undefined) {
      if (input.disposalGainAccountId !== null) await this.assertAccount(scope, input.disposalGainAccountId, null, 'ganho na baixa de imobilizado', tx);
      data.disposalGainAccountId = input.disposalGainAccountId;
    }
    if (input.disposalLossAccountId !== undefined) {
      if (input.disposalLossAccountId !== null) await this.assertAccount(scope, input.disposalLossAccountId, null, 'perda na baixa de imobilizado', tx);
      data.disposalLossAccountId = input.disposalLossAccountId;
    }
    if (input.depreciationParteBAccountId !== undefined) {
      if (input.depreciationParteBAccountId !== null) {
        const parteB = await this.lalurRepo.findParteBById(scope, input.depreciationParteBAccountId, tx);
        if (!parteB || parteB.deletedAt) {
          throw new ValidationError(`Conta da Parte B '${input.depreciationParteBAccountId}' não existe neste escopo.`);
        }
      }
      data.depreciationParteBAccountId = input.depreciationParteBAccountId;
    }
    return data;
  }

  /**
   * BE-INCR-ACCOUNTING-POLICY-VERSION item 5: o único caminho de escrita (PUT sem contador e aprovação). Re-valida as
   * contas dentro da tx. `policyVersionId` não vai a evento: as settings não têm auditoria própria (P-5, §9).
   */
  async applyInTx(
    scope: AccountingScope,
    patch: ScopeSettingsPolicyPayload,
    tx: Prisma.TransactionClient,
    _policyVersionId: string,
  ): Promise<AccountingScopeSettingsView> {
    const data = await this.validate(scope, patch, tx);
    return this.toView(scope, await this.repo.upsertSettings(scope, data, tx));
  }

  private toView(scope: AccountingScope, row: AccountingScopeSettings | null): AccountingScopeSettingsView {
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

  /** `nature=null` não amarra a natureza da conta (ganho/perda na baixa — o parecer não fixa um lado). */
  private async assertAccount(
    scope: AccountingScope,
    id: string,
    nature: 'Expense' | 'Revenue' | null,
    label: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const account = await this.accountRepo.findById(scope, id, tx);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${label} '${id}' não existe neste escopo.`);
    if (!account.acceptsEntries) throw new ValidationError(`Conta de ${label} '${account.code}' não aceita lançamentos (não é folha).`);
    if (nature && account.nature !== nature) {
      throw new ValidationError(`Conta de ${label} '${account.code}' tem natureza ${account.nature}; esperado ${nature} (BRIEF F7 item 8).`);
    }
  }
}
