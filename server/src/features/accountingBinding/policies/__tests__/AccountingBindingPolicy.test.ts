import { AccountingBindingPolicy } from '../AccountingBindingPolicy';
import type { BindingScope } from '../../repositories/IAccountingBindingRepository';

/**
 * Gate de forma da policy (Corpo C, item 9/15 do BRIEF) — mesmo padrão de `AccountingPolicy`:
 * ator autenticado (`actorUserId` truthy) pode; ator vazio não pode. Cada método é exercitado nos
 * DOIS lados (permite/nega) — um `!!x` que sempre devolvesse `true` passaria só no lado positivo.
 */
describe('AccountingBindingPolicy', () => {
  const policy = new AccountingBindingPolicy();
  const comAtor: BindingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1' };
  const semAtor: BindingScope = { ownerUserId: 'u1', actorUserId: '', unitId: 'unit-1' };

  it.each([
    ['canCompile', (s: BindingScope) => policy.canCompile(s)],
    ['canValidate', (s: BindingScope) => policy.canValidate(s)],
    ['canRead', (s: BindingScope) => policy.canRead(s)],
  ])('%s permite com ator autenticado e nega sem ator', (_name, call) => {
    expect(call(comAtor)).toBe(true);
    expect(call(semAtor)).toBe(false);
  });
});
