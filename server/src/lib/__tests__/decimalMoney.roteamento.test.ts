import { centsFromReais } from '../../features/accountingBinding/interpreter/money';
import { reaisToCents } from '../saleLine';

/**
 * CENTAVOS-EXATOS PR-1 (BRIEF §3 item 6/8) — PROVA DE ROTEAMENTO: as duas bordas vivas, `reaisToCents` (A1) e `centsFromReais`
 * (A2, o conversor do razão em produção via `InterpretedEventMapper`), chamam o núcleo `lib/decimalMoney`. Se alguma delas
 * voltasse a fazer `Math.round(x*100)` por conta própria, este teste falharia: o núcleo é trocado aqui pelo corpo exato e as
 * bordas têm de segui-lo. Que NENHUM valor muda com o modo vigente é provado em `decimalMoney.bordas.test.ts` (sem mock, nas bordas reais).
 */
jest.mock('../decimalMoney', () => {
  const real = jest.requireActual<typeof import('../decimalMoney')>('../decimalMoney');
  return { ...real, roundReaisToCents: (n: number) => Number(real.reaisToCentsHalfUp(n)) };
});

describe('CENTAVOS-EXATOS PR-1 — as bordas A1 e A2 seguem o núcleo', () => {
  it('A1 reaisToCents(1,005) segue o núcleo (101 com o corpo exato; o legado daria 100)', () => {
    expect(reaisToCents(1.005)).toBe(101);
    expect(reaisToCents(0.285)).toBe(29);
  });

  it('A2 centsFromReais(1,005) segue o núcleo (101 com o corpo exato; o legado daria 100)', () => {
    expect(centsFromReais(1.005, 'ctx')).toBe(101);
    expect(centsFromReais(0.285, 'ctx')).toBe(29);
  });

  it('guarda de contrato (não prova roteamento): A2 recusa o que dá 0 centavo e A1 mantém ausente ⇒ 0, com o núcleo trocado', () => {
    expect(() => centsFromReais(1e-7, 'ctx')).toThrow(/maior que zero/);
    expect(reaisToCents(undefined)).toBe(0);
  });
});
