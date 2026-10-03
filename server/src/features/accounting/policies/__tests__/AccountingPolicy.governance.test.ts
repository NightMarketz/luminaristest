/**
 * BE-INCR-ACCOUNTANT-GOVERNANCE (nó GOV-CONTADOR, BRIEF item 17a) — matriz da policy: 3 atores × 7 ações.
 * As 4 últimas (fechar, configurações, perfil fiscal, imobilizado) ficam IGUAIS a hoje para o dono com
 * atribuição ativa — trava a família de `canClosePeriod` (F-GOV-3 a: só reabertura e assinatura mudam).
 */
import { AccountingPolicy } from '../AccountingPolicy';
import type { ActiveAccountant } from '../IAccountingPolicy';
import { resolveAccountingScope, type AccountingScope } from '../../scope/AccountingScope';

const policy = new AccountingPolicy();
const owner = resolveAccountingScope({ userId: 'dono' }, 'unit-1');
const delegated: AccountingScope = { ...owner, actorUserId: 'contador' };
const active: ActiveAccountant = {
  id: 'asg-1', ownerUserId: 'dono', unitId: 'unit-1', accountantUserId: 'contador', crcNumber: 'SP-123456/O-1',
};

type Action = 'reabrir' | 'assinar' | 'rejeitar' | 'fechar' | 'configuracoes' | 'perfilFiscal' | 'imobilizado';

const actions: Record<Action, (s: AccountingScope, a: ActiveAccountant | null) => boolean> = {
  reabrir: (s, a) => policy.canReopenPeriod(s, a),
  assinar: (s, a) => policy.canSignOffReview(s, a),
  rejeitar: (s, a) => policy.canSignOffReview(s, a), // reject usa o mesmo método (I-4)
  fechar: (s) => policy.canClosePeriod(s),
  configuracoes: (s) => policy.canManageAccountingSettings(s),
  perfilFiscal: (s) => policy.canManageFiscalProfile(s),
  imobilizado: (s) => policy.canManageFixedAssets(s),
};

const ALL = { reabrir: true, assinar: true, rejeitar: true, fechar: true, configuracoes: true, perfilFiscal: true, imobilizado: true };

const matrix: Array<[string, AccountingScope, ActiveAccountant | null, Record<Action, boolean>]> = [
  ['dono sem atribuição', owner, null, ALL],
  ['dono com atribuição ativa', owner, active, { ...ALL, reabrir: false, assinar: false, rejeitar: false }],
  ['contador delegado', delegated, active, ALL],
];

describe('AccountingPolicy — matriz de governança do contador (17a)', () => {
  for (const [actor, scope, a, expected] of matrix) {
    for (const action of Object.keys(actions) as Action[]) {
      it(`${actor} × ${action} → ${expected[action]}`, () => {
        expect(actions[action](scope, a)).toBe(expected[action]);
      });
    }
  }

  it('ex-contador com escopo delegado e atribuição já encerrada (active = null) não reabre nem assina (item 4)', () => {
    expect(policy.canReopenPeriod(delegated, null)).toBe(false);
    expect(policy.canSignOffReview(delegated, null)).toBe(false);
  });

  it('contador ativo de OUTRO dono não reabre neste livro', () => {
    expect(policy.canReopenPeriod(delegated, { ...active, ownerUserId: 'outro-dono' })).toBe(false);
  });

  it('canManageAccountantAssignment: só o dono no próprio livro, nunca em escopo delegado', () => {
    expect(policy.canManageAccountantAssignment(owner)).toBe(true);
    expect(policy.canManageAccountantAssignment(delegated)).toBe(false);
  });

  it('canRespondToAssignment: só o contador convidado', () => {
    expect(policy.canRespondToAssignment('contador', { accountantUserId: 'contador' })).toBe(true);
    expect(policy.canRespondToAssignment('dono', { accountantUserId: 'contador' })).toBe(false);
  });

  it('canEndAssignment: dono ou contador (F-GOV-10 a), terceiro não', () => {
    const a = { userId: 'dono', accountantUserId: 'contador' };
    expect(policy.canEndAssignment('dono', a)).toBe(true);
    expect(policy.canEndAssignment('contador', a)).toBe(true);
    expect(policy.canEndAssignment('terceiro', a)).toBe(false);
  });
});
