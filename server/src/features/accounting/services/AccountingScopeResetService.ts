import { ConflictError, ForbiddenError, SystemResetBlockedByAccountingError } from '../../../lib/errors';
import { resolveAccountingScope } from '../scope/AccountingScope';
import { SystemResetBlockedDetailsSchema } from '../dtos/AccountingResetDto';
import type { AccountingResetOutcome } from '../models/accountingResetClassification';
import type { IAccountingScopeResetRepository, SetupCounts } from '../repositories/IAccountingScopeResetRepository';
import type { IAccountingScopeResetPolicy } from '../policies/IAccountingScopeResetPolicy';
import type { AuditService } from './AuditService';

export const ACCOUNTING_SCOPE_RESET = 'accounting.scope_reset';

export interface IAccountingScopeResetService {
  /**
   * Remove a configuração que o onboarding escreve (SETUP) de todas as unidades do usuário, desde que não haja movimento
   * (nenhuma linha BLOCKING). Trilha nunca apagada.
   * @throws SystemResetBlockedByAccountingError — gate DENTRO da tx; nada é removido
   * @throws ForbiddenError
   */
  purgeSetupIfNoMovement(userId: string): Promise<AccountingResetOutcome>;
}

/** JSON estável (chaves em ordem) — o canonicalizador da trilha guarda o valor como string (precedente `unit.rekeyed`). */
function stableJson(counts: SetupCounts): string {
  const sorted: Record<string, number> = {};
  for (const key of Object.keys(counts).sort()) sorted[key] = counts[key as keyof SetupCounts] as number;
  return JSON.stringify(sorted);
}

/**
 * BE-INCR-RESET-CONSISTENTE itens 11 e 13 (F-I7-1 → "409 só com movimento", F-I7-4 → evento na trilha). Tudo numa tx só
 * (`authoritative-gate-inside-tx`; o `tx` vai a toda chamada de repositório):
 *   1. conta BLOCKING em todas as unidades do usuário; 2. alguma > 0 ⇒ `SystemResetBlockedByAccountingError` (409);
 *   3. para cada unidade com SETUP, `accounting.scope_reset` com as contagens, ANTES dos deletes;
 *   4. apaga o SETUP na ordem segura de FK. `AuditEvent`/`AuditChainHead` não são tocados.
 * Nenhum delete sem evento: com `companyLevel` (perfil da EMPRESA, sem unitId), o evento vai também para toda unidade
 * do usuário que já tem cadeia na trilha (dono, questionário, 2026-10-16: "Evento na trilha da unidade") — `removed`
 * `{}` quando a unidade não tinha SETUP próprio. Sem nenhuma unidade com cadeia, falha fechado (409) e nada sai.
 */
export class AccountingScopeResetService implements IAccountingScopeResetService {
  constructor(
    private readonly repo: IAccountingScopeResetRepository,
    private readonly policy: IAccountingScopeResetPolicy,
    private readonly audit: Pick<AuditService, 'append'>,
  ) {}

  async purgeSetupIfNoMovement(userId: string): Promise<AccountingResetOutcome> {
    return this.repo.runTransaction(async (tx) => {
      const blocking = await this.repo.countBlocking(userId, tx);
      if (blocking.length > 0) {
        throw new SystemResetBlockedByAccountingError(SystemResetBlockedDetailsSchema.parse({ blocking }));
      }

      const { byUnit, userLevel } = await this.repo.countSetup(userId, tx);
      const hasCompanyLevel = Object.keys(userLevel).length > 0;
      const unitSet = new Set(byUnit.keys());
      if (hasCompanyLevel) {
        for (const unitId of await this.repo.listChainedUnits(userId, tx)) unitSet.add(unitId);
        if (unitSet.size === 0) {
          throw new ConflictError(
            'A configuração fiscal da empresa não tem trilha de auditoria em nenhuma unidade; o reset não a apaga sem registro.',
            'SYSTEM_RESET_COMPANY_LEVEL_WITHOUT_TRAIL',
          );
        }
      }
      const units = [...unitSet].sort();
      const scopes = units.map((unitId) => resolveAccountingScope({ userId }, unitId));
      for (const scope of scopes) {
        if (!this.policy.canPurgeSetup(scope)) {
          throw new ForbiddenError('Você não tem permissão para remover a configuração contábil desta unidade.');
        }
      }

      const removed: AccountingResetOutcome['removed'] = [];
      for (const scope of scopes) {
        const counts = byUnit.get(scope.unitId) ?? {};
        await this.audit.append(tx, scope, {
          actorUserId: userId,
          eventType: ACCOUNTING_SCOPE_RESET,
          targetType: 'accounting_scope',
          targetId: scope.unitId,
          payload: {
            removed: stableJson(counts),
            // Nível da EMPRESA: o mesmo valor em todo evento deste reset — não somar entre unidades (decisão do dono,
            // questionário, 2026-10-16: "Apaga, conta em toda unidade").
            ...(hasCompanyLevel ? { companyLevel: stableJson(userLevel) } : {}),
          },
        });
        removed.push({ unitId: scope.unitId, counts });
      }

      if (units.length > 0) {
        await this.repo.deleteSetup(userId, tx);
      }
      return { removed };
    });
  }
}
