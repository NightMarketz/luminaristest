/**
 * BE-INCR-ACCOUNTING-POLICY-VERSION (nó GOV-CONTADOR, BRIEF item 15j) — matriz dos 3 métodos novos: dono, contador
 * ativo do par, contador ativo de outro par, terceiro. A matriz do 17a (AccountingPolicy.governance.test.ts) segue
 * verde sem edição (P-14).
 */
import { AccountingPolicy } from '../AccountingPolicy';
import type { ActiveAccountant } from '../IAccountingPolicy';
import { resolveAccountingScope, type AccountingScope } from '../../scope/AccountingScope';

const policy = new AccountingPolicy();
const owner = resolveAccountingScope({ userId: 'dono' }, 'unit-1');
const delegated: AccountingScope = { ...owner, actorUserId: 'contador' };
const otherPair: AccountingScope = { ...owner, actorUserId: 'contador-2' };
const third: AccountingScope = { ...owner, actorUserId: 'terceiro' };
const active: ActiveAccountant = {
  id: 'asg-1', ownerUserId: 'dono', unitId: 'unit-1', accountantUserId: 'contador', crcNumber: 'SP-123456/O-1',
};

type Row = [string, AccountingScope, ActiveAccountant | null, { propor: boolean; decidir: boolean; ler: boolean }];
const matrix: Row[] = [
  ['dono sem atribuição', owner, null, { propor: true, decidir: false, ler: true }],
  ['dono com atribuição ativa', owner, active, { propor: true, decidir: false, ler: true }],
  ['contador ativo do par', delegated, active, { propor: false, decidir: true, ler: true }],
  ['contador já encerrado (active = null)', delegated, null, { propor: false, decidir: false, ler: false }],
  ['contador ativo de outro par', otherPair, active, { propor: false, decidir: false, ler: false }],
  ['contador do par, atribuição de outro dono', delegated, { ...active, ownerUserId: 'outro-dono' }, { propor: false, decidir: false, ler: false }],
  ['terceiro', third, active, { propor: false, decidir: false, ler: false }],
];

describe('AccountingPolicy — política versionada (15j)', () => {
  for (const [actor, scope, a, expected] of matrix) {
    it(`${actor}: propor=${expected.propor} decidir=${expected.decidir} ler=${expected.ler}`, () => {
      for (const target of ['FISCAL_PROFILE', 'SCOPE_SETTINGS'] as const) {
        expect(policy.canProposePolicyVersion(scope, target)).toBe(expected.propor);
      }
      expect(policy.canDecidePolicyVersion(scope, a)).toBe(expected.decidir);
      expect(policy.canReadPolicyVersions(scope, a)).toBe(expected.ler);
    });
  }

  it('propor segue o canManage… do alvo', () => {
    const p = new AccountingPolicy();
    jest.spyOn(p, 'canManageFiscalProfile').mockReturnValue(false);
    expect(p.canProposePolicyVersion(owner, 'FISCAL_PROFILE')).toBe(false);
    expect(p.canProposePolicyVersion(owner, 'SCOPE_SETTINGS')).toBe(true);
  });
});
