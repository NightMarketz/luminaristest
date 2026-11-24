/**
 * Conversão PURA reais → centavos, numa fonte só (BE-INCR-CENTAVOS-EXATOS, PR-1; forks F-CE-1..9 ratificados em
 * `docs/plano/decisoes/D-2026-11-24-CENTAVOS-EXATOS-FORKS.md`; lacuna L-20261124-062159-5b0a).
 *
 * Sem import: o motor (`SalesPlugin`), o razão, o subrazão e o binding alcançam este módulo sem passar pelo núcleo contábil
 * (F-CE-9 a). As BORDAS (`lib/saleLine.reaisToCents`, `accountingBinding/interpreter/money.centsFromReais`) seguem donas do
 * seu contrato de erro e do teto `MAX_CENTS`; aqui só mora o arredondamento.
 *
 * Dois corpos coexistem de propósito, e UMA constante escolhe qual vale (F-CE-5 a: corte único, sem flag de ambiente):
 *   - `FLOAT_LEGADO` — `Math.round(reais * 100)`, o que razão e subrazão fazem hoje (1,005 → 100);
 *   - `MEIO_PARA_CIMA_DECIMAL` — meio-para-cima sobre a magnitude do texto mais curto do double (1,005 → 101; F-CE-1 b, F-CE-6 a).
 * No PR-1 a constante é `FLOAT_LEGADO`: nenhum valor muda. A virada é a troca dessa linha, no PR-3, junto com
 * `splitRevenueCredit` e os pins dos testes — nunca antes (razão e subrazão têm de arredondar igual; o `tieOut` depende disso).
 */

export type ModoReaisParaCentavos = 'FLOAT_LEGADO' | 'MEIO_PARA_CIMA_DECIMAL';

/** O corte único. PR-3 troca para `MEIO_PARA_CIMA_DECIMAL`; o teste do PR-1 fixa o valor atual para a troca ser consciente. */
export const MODO_REAIS_PARA_CENTAVOS: ModoReaisParaCentavos = 'FLOAT_LEGADO';

/** Corpo legado, verbatim dos conversores de hoje. `n` finito é pré-condição do chamador. */
export function reaisToCentsLegado(n: number): number {
  return Math.round(n * 100);
}

/**
 * Meio-para-cima decimal: lê o texto mais curto que reproduz o double (`String(n)`, ECMAScript `Number::toString`), toma as
 * duas primeiras casas e sobe 1 centavo quando o terceiro dígito é ≥ 5, sobre a MAGNITUDE (o meio de um negativo se afasta
 * de zero: −1,005 → −101, ao contrário de `Math.round`). "Exato" = o decimal que o usuário vê, não o valor binário do double.
 * Não finito lança `RangeError` — quem converte dinheiro valida antes e dá a mensagem da sua borda.
 */
export function reaisToCentsHalfUp(n: number): bigint {
  if (!Number.isFinite(n)) throw new RangeError('reaisToCentsHalfUp: valor não finito');
  const negativo = n < 0;
  let texto = String(Math.abs(n));
  // Notação científica só abaixo de 1e-6 ou a partir de 1e21: expande por escala em BigInt.
  const expoente = /^(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(texto);
  if (expoente) {
    const digitos = expoente[1] + (expoente[2] ?? '');
    const casasFracionarias = (expoente[2]?.length ?? 0) - Number(expoente[3]);
    texto = casasFracionarias > 0 ? `0.${digitos.padStart(casasFracionarias, '0')}` : digitos + '0'.repeat(-casasFracionarias);
  }
  const [inteira, fracao = ''] = texto.split('.');
  let centavos = BigInt(inteira) * 100n + BigInt((fracao + '00').slice(0, 2));
  if ((fracao[2] ?? '0') >= '5') centavos += 1n;
  return negativo ? -centavos : centavos;
}

/**
 * O ponto de entrada das bordas: devolve centavos (inteiro) pelo corpo que `MODO_REAIS_PARA_CENTAVOS` escolhe. `n` finito é
 * pré-condição. O teto (`MAX_CENTS`) e o ">0" são das bordas; um valor acima do seguro sai fora da faixa e a borda recusa.
 */
export function roundReaisToCents(n: number): number {
  return MODO_REAIS_PARA_CENTAVOS === 'FLOAT_LEGADO' ? reaisToCentsLegado(n) : Number(reaisToCentsHalfUp(n));
}
