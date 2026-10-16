import type { AccountingScope } from '../scope/AccountingScope';

/** BE-INCR-RESET-CONSISTENTE item 11 — quem pode remover a configuração contábil de uma unidade. Só decisão. */
export interface IAccountingScopeResetPolicy {
  /** Só o dono do escopo remove o SETUP da própria unidade (o reset é do próprio sistema, E13). */
  canPurgeSetup(scope: AccountingScope): boolean;
}
