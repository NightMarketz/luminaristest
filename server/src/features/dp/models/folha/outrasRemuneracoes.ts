/**
 * INSS de quem tem outro emprego fora da instância — BE-INCR-DP-F2 itens 77–78 (PR-1; F-DPF-8, dono 06/11).
 *
 * IN RFB 2.110/2022 art. 36 § 1º I e art. 49 § 2º II "a" (visão vigente, dossiê
 * `pesquisas-legais/brief-pes4-f2-contador/relatorio.md` §5): cada empregador, na ordem da declaração do segurado,
 * aplica as alíquotas "observadas as faixas já tributadas nas empresas anteriores, até o limite máximo do salário de
 * contribuição". Só a remuneração das fontes `ANTES` desta empresa entra; a de `DEPOIS`, não. A de contribuinte
 * individual (§ 2º II "b" e § 6º) conta só para o teto, não para o enquadramento nas faixas. A `contribuicaoCents`
 * informada não entra na conta (só conferência). Função pura; faixas e teto vêm do G2, o modo de arredondar do item 67.
 */
import type { FaixaInss } from '../parametrosFolha';
import { no, type Calculo } from './calcNode';
import { inssEmpregado, type ModoInss } from './encargos';

export const OUTRA_REMUNERACAO_ORDENS = ['ANTES', 'DEPOIS'] as const;
export const OUTRA_REMUNERACAO_CATEGORIAS = ['EMPREGADO', 'CONTRIBUINTE_INDIVIDUAL'] as const;

export interface OutraRemuneracaoNoMes {
  remuneracaoCents: bigint;
  ordem: (typeof OUTRA_REMUNERACAO_ORDENS)[number];
  categoriaOutraFonte: (typeof OUTRA_REMUNERACAO_CATEGORIAS)[number];
}

const max = (a: bigint, b: bigint) => (a > b ? a : b);
const min = (a: bigint, b: bigint) => (a < b ? a : b);
const soma = (xs: readonly OutraRemuneracaoNoMes[]) => xs.reduce((s, x) => s + max(0n, x.remuneracaoCents), 0n);

/**
 * Item 78 — a contribuição do vínculo daqui com as outras fontes do mês. Seja `A` a soma das remunerações de empregado
 * `ANTES` e `C` a de contribuinte individual `ANTES`: a base daqui fica limitada a `teto − A − C` e a contribuição é
 * `INSS(min(A + base, teto)) − INSS(min(A, teto))`, continuando as faixas de `A` (item 5); nunca negativa;
 * `A + C ≥ teto` ⇒ zero. Sem fonte `ANTES`, é o INSS do vínculo sozinho.
 */
export function inssComOutrasFontes(
  baseCents: bigint,
  outras: readonly OutraRemuneracaoNoMes[],
  faixas: readonly FaixaInss[],
  tetoCents: bigint,
  modo: ModoInss,
): Calculo<bigint> {
  const antes = outras.filter((o) => o.ordem === 'ANTES');
  const a = soma(antes.filter((o) => o.categoriaOutraFonte === 'EMPREGADO'));
  const c = soma(antes.filter((o) => o.categoriaOutraFonte === 'CONTRIBUINTE_INDIVIDUAL'));
  const baseLimitada = min(max(0n, baseCents), max(0n, tetoCents - a - c));
  const r = inssEmpregado(baseLimitada, faixas, tetoCents, a, modo);
  const ignoradas = outras.length - antes.length;
  const filhos = [
    no(`Outras fontes ANTES desta empresa: empregado ${a}, contribuinte individual ${c} (só teto)`, 0n, { fonte: 'IN RFB 2.110/2022 art. 49 § 2º II' }),
    ...(ignoradas ? [no(`${ignoradas} fonte(s) DEPOIS desta empresa: fora da conta daqui`, 0n, { fonte: 'IN RFB 2.110/2022 art. 36 § 1º I' })] : []),
    ...(baseLimitada !== baseCents ? [no(`Base daqui limitada a ${baseLimitada} (teto ${tetoCents} − ${a} − ${c})`, 0n, { fonte: 'IN RFB 2.110/2022 art. 49 § 2º II' })] : []),
    { ...r.prova, soma: true },
  ];
  return { valor: r.valor, prova: no(`INSS do vínculo com outras fontes no mês`, r.valor, { fonte: 'IN RFB 2.110/2022 arts. 36 e 49', filhos }) };
}
