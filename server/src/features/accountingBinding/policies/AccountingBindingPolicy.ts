import type { BindingScope } from '../repositories/IAccountingBindingRepository';
import type { IAccountingBindingPolicy } from './IAccountingBindingPolicy';

/**
 * Implementação padrão da casa (`!!actorUserId`), espelhando `AccountingPolicy` — qualquer ator
 * autenticado opera dentro do PRÓPRIO silo `userId`; um `unitId` errado só cria uma sub-partição
 * separada sob o mesmo dono, nunca um vazamento cross-tenant (Contrato §2).
 */
export class AccountingBindingPolicy implements IAccountingBindingPolicy {
  canCompile(scope: BindingScope): boolean {
    return !!scope.actorUserId;
  }

  canValidate(scope: BindingScope): boolean {
    return !!scope.actorUserId;
  }

  canRead(scope: BindingScope): boolean {
    return !!scope.actorUserId;
  }
}
