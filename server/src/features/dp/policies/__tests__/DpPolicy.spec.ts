/**
 * BE-INCR-DP-F0-F1 item 14 (PR-1) — matriz da DpPolicy (FEATURE_TEMPLATE §10 nível 1): mesma régua de hoje do
 * `canManageFiscalProfile` (ator do escopo).
 */
import type { AccountingScope } from '../../../accounting/scope/AccountingScope';
import { AccountingPolicy } from '../../../accounting/policies/AccountingPolicy';
import { DpPolicy } from '../DpPolicy';

const scope = (actorUserId: string): AccountingScope => ({
  ownerUserId: 'dono',
  actorUserId,
  unitId: 'u1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
});

describe('DpPolicy', () => {
  const policy = new DpPolicy();
  const contabil = new AccountingPolicy();

  it.each([
    ['ator presente', 'dono', true],
    ['ator vazio', '', false],
  ])('%s', (_caso, actor, esperado) => {
    expect(policy.canRead(scope(actor))).toBe(esperado);
    expect(policy.canManage(scope(actor))).toBe(esperado);
    // D-7: a regra é a mesma do perfil fiscal hoje; se uma divergir, o teste mostra.
    expect(policy.canManage(scope(actor))).toBe(contabil.canManageFiscalProfile(scope(actor)));
    expect(policy.canRead(scope(actor))).toBe(contabil.canReadFiscalProfile(scope(actor)));
  });
});
