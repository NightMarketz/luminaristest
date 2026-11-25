import { centsFromReais } from '../../features/accountingBinding/interpreter/money';
import { ValidationError } from '../errors';
import { reaisToCents } from '../saleLine';

/**
 * CENTAVOS-EXATOS PR-0 (BRIEF `docs/accounting/BE-INCR-CENTAVOS-EXATOS-brief.md` §3 itens 1 e 2; forks F-CE-1..9 em
 * `D-2026-11-24-CENTAVOS-EXATOS-FORKS`; lacuna L-20261124-062159-5b0a). NÃO muda comportamento: este arquivo
 *  1. escreve um oráculo independente (texto decimal → BigInt, meio-para-cima sobre a magnitude) e confere a si mesmo;
 *  2. fixa o que os conversores de reais → centavos fazem HOJE (`Math.round(x*100)`, em float);
 *  3. fixa o CONJUNTO EXATO de entradas em que legado e oráculo divergem, para o PR-3 (a virada) alterá-lo de propósito.
 *
 * "Decimal exato" aqui = o decimal que o usuário vê (`String(x)`, o texto mais curto que reproduz o double), não o valor
 * binário do double (que é o que o float de hoje já usa). Premissa assumida do F-CE-1 (b).
 */

/** Oráculo: texto mais curto do double → centavos, meio-para-cima sobre a magnitude. Independente dos conversores. */
function oraculoCentavos(n: number): bigint {
  const neg = n < 0;
  let t = String(Math.abs(n));
  const exp = /^(\d+)(?:\.(\d+))?e([+-]\d+)$/i.exec(t);
  if (exp) {
    // Notação científica só abaixo de 1e-6 ou a partir de 1e21: expande por escala em BigInt.
    const digitos = exp[1] + (exp[2] ?? '');
    const casasFrac = (exp[2]?.length ?? 0) - Number(exp[3]);
    t = casasFrac > 0 ? `0.${digitos.padStart(casasFrac, '0')}` : digitos + '0'.repeat(-casasFrac);
  }
  const [int, frac = ''] = t.split('.');
  let cents = BigInt(int) * 100n + BigInt((frac + '00').slice(0, 2));
  if ((frac[2] ?? '0') >= '5') cents += 1n; // terceiro dígito >= 5 ⇒ meio-centavo ou mais ⇒ sobe
  return neg ? -cents : cents;
}

/** [entrada, oráculo, legado (Math.round(x*100))] — a tabela do BRIEF §3 item 1/2, conferida nesta sessão. */
const TABELA: ReadonlyArray<readonly [string, number, number, number]> = [
  ['1.005', 1.005, 101, 100],
  ['0.285', 0.285, 29, 28],
  ['86.655 (literal)', 86.655, 8666, 8666],
  ['0.1 + 0.2', 0.1 + 0.2, 30, 30],
  ['1.00499999999999', 1.00499999999999, 100, 100],
  ['8.665', 8.665, 867, 866],
  ['2.675', 2.675, 268, 268],
  ['1e-7', 1e-7, 0, 0],
  ['123456.785', 123456.785, 12345679, 12345679],
];

describe('CENTAVOS-EXATOS PR-0 — o oráculo confere a si mesmo', () => {
  it.each(TABELA)('oráculo(%s) bate com a tabela do BRIEF', (_nome, x, esperadoOraculo) => {
    expect(oraculoCentavos(x)).toBe(BigInt(esperadoOraculo));
  });

  it('notação científica nos dois sentidos: 1e21 reais = 10^23 centavos; -1e-7 vira 0', () => {
    expect(oraculoCentavos(1e21)).toBe(10n ** 23n);
    expect(oraculoCentavos(-1e-7)).toBe(0n);
  });

  it('negativo: o meio afasta de zero (F-CE-6 a) — o legado (Math.round) iria para +∞', () => {
    expect(oraculoCentavos(-1.005)).toBe(-101n);
    expect(Math.round(-1.005 * 100)).toBe(-100);
    expect(Math.round(-100.5)).toBe(-100);
  });

  it('1.0049999999999999 é o MESMO double de 1.005 (o texto mais curto é "1.005"): não serve de contraexemplo', () => {
    expect(1.0049999999999999).toBe(1.005);
    expect(String(1.0049999999999999)).toBe('1.005');
  });
});

describe('CENTAVOS-EXATOS PR-0 — caracterização do legado (o que os conversores fazem hoje)', () => {
  it.each(TABELA)('reaisToCents(%s) = legado', (_nome, x, _oraculo, legado) => {
    expect(reaisToCents(x)).toBe(legado);
  });

  it.each(TABELA.filter(([, x]) => Math.round(x * 100) > 0))('centsFromReais(%s) = legado (só positivos: a borda recusa ≤ 0)', (_nome, x, _oraculo, legado) => {
    expect(centsFromReais(x, 'ctx')).toBe(legado);
  });

  it('a borda A2 recusa o que dá 0 centavo (1e-7) e o negativo; A1 (sem a guarda de > 0) devolve o legado', () => {
    expect(() => centsFromReais(1e-7, 'ctx')).toThrow(ValidationError);
    expect(() => centsFromReais(-1.005, 'ctx')).toThrow(ValidationError);
    expect(reaisToCents(-1.005)).toBe(-100); // Math.round: o meio de um negativo vai para +∞ (o F-CE-6 muda isto no PR-3)
  });

  it('o legado dos varridos abaixo é o do conversor vivo A1, não só a fórmula: reaisToCents(x) == Math.round(x*100) na faixa', () => {
    for (let k = 5; k < 100_000; k += 10) {
      const x = Number((k / 1000).toFixed(3));
      expect(reaisToCents(x)).toBe(Math.round(x * 100));
    }
  });
});

describe('CENTAVOS-EXATOS PR-0 — o conjunto exato de divergências legado × oráculo (o PR-3 muda isto de propósito)', () => {
  it('na tabela, divergem exatamente 1.005, 0.285 e 8.665', () => {
    const divergentes = TABELA.filter(([, x]) => BigInt(reaisToCents(x)) !== oraculoCentavos(x)).map(([nome]) => nome);
    expect(divergentes).toEqual(['1.005', '0.285', '8.665']);
  });

  it('varredura de 10 000 valores x,xx5 (0,005 … 99,995): 572 divergem (5,7 %) — medida de 24/11/2026', () => {
    let divergem = 0;
    let total = 0;
    for (let k = 5; k < 100_000; k += 10) {
      const x = Number((k / 1000).toFixed(3));
      total += 1;
      if (BigInt(reaisToCents(x)) !== oraculoCentavos(x)) divergem += 1;
    }
    expect(total).toBe(10_000);
    expect(divergem).toBe(572);
  });

  it('a virada NÃO muda venda ordinária: para todo valor de 2 casas (R$ 0,01 … 2.000,00) legado == oráculo', () => {
    const diferentes: number[] = [];
    for (let k = 1; k <= 200_000; k += 1) {
      const x = k / 100;
      if (BigInt(reaisToCents(x)) !== oraculoCentavos(x)) diferentes.push(k);
    }
    expect(diferentes).toEqual([]);
  });

  it('valor CALCULADO em float que traz o erro no texto (o "86,655" do teste do #1360) dá 8665 nos dois', () => {
    const calculado = 0.333 * 10 + 2.5 * 33.33;
    expect(String(calculado)).toBe('86.65499999999999');
    expect(Math.round(calculado * 100)).toBe(8665);
    expect(oraculoCentavos(calculado)).toBe(8665n);
    expect(reaisToCents(calculado)).toBe(8665);
  });
});
