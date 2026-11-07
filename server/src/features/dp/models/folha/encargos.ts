/**
 * Encargos do trabalhador — BE-INCR-DP-F2 itens 5–8 (PR-0): INSS do empregado (progressivo), INSS do contribuinte
 * individual, FGTS pela categoria e o adaptador do IRRF mensal.
 *
 * Funções puras. Faixas, teto, alíquotas e tabela do IRRF vêm de `parametrosFolha` (G2); a forma de arredondar e o que
 * cada categoria recolhe vêm de `RegrasFolha` (item 67). Aqui não há literal numérico de regra legal.
 */
import { calcularIrrfPf } from '../../../accounting/models/withholdingCalc';
import type { Dispensa } from '../../../accounting/models/withholdingCalc';
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';
import type { FaixaInss, ParametrosFolha } from '../parametrosFolha';
import type { EncargoCategoria, RegrasFolha, ValorRegra } from '../regrasFolha';
import { fonteLp, no, type CalcNode, type Calculo } from './calcNode';
import { arredondarCentavos, fracao, inteiro, somar, type Fracao, type ModoArredondamento } from './fracao';

const BP = 10_000n;
const min = (a: bigint, b: bigint) => (a < b ? a : b);
const max = (a: bigint, b: bigint) => (a > b ? a : b);

export type ModoInss = RegrasFolha['arredondamentoInss'];

/** O nó com o sinal trocado em toda a árvore (o "menos" da conta continua somando). */
const negar = (n: CalcNode): CalcNode => ({ ...n, valorCents: -n.valorCents, filhos: n.filhos.map(negar) });

/** O INSS progressivo sobre a base `x` (já limitada ao teto), faixa a faixa, no modo da linha `ARREDONDAMENTO_INSS`. */
function inssSobre(x: bigint, faixas: readonly FaixaInss[], tetoCents: bigint, modo: ModoInss): { valor: bigint; prova: CalcNode } {
  let piso = 0n;
  let exato: Fracao = fracao(0n);
  const filhos: CalcNode[] = [];
  for (const [i, f] of faixas.entries()) {
    const topo = f.ateCents ?? tetoCents;
    const parcela = max(0n, min(x, topo) - piso);
    const contrib = fracao(parcela * inteiro(f.aliquotaBp), BP);
    exato = somar(exato, contrib);
    const valorFaixa = arredondarCentavos(contrib, 'TRUNCA_CENTAVO');
    filhos.push(no(`Faixa ${i + 1}: ${parcela} × ${f.aliquotaBp} bp`, valorFaixa, { fonte: 'EC 103/2019 art. 28', soma: true }));
    piso = topo;
    if (x <= topo) break;
  }
  const truncadas = filhos.reduce((s, f) => s + f.valorCents, 0n);
  const valor = modo.valor === 'TRUNCAR_POR_FAIXA' ? truncadas : arredondarCentavos(exato, 'MEIO_PARA_CIMA_CENTAVO');
  if (valor !== truncadas) filhos.push(no('Ajuste do arredondamento no total', valor - truncadas, { fonte: fonteLp(modo), soma: true }));
  return { valor, prova: no(`INSS sobre ${x} (${modo.valor})`, valor, { fonte: fonteLp(modo), filhos }) };
}

/**
 * Item 5 (com o item 78) — INSS do empregado, progressivo por faixa (EC 103 art. 28 § 1º [F1-D01]). `jaContribuidoCents`
 * é o salário de contribuição já tributado antes na competência (outros vínculos da instância, item 41; outra empresa
 * com `ordem = ANTES`, item 78): a contribuição daqui é `INSS(min(A + base, teto)) − INSS(min(A, teto))`, continuando
 * as faixas, nunca negativa; `A ≥ teto` ⇒ zero. Arredondamento: `ARREDONDAMENTO_INSS` (F-DPF-3 revisto).
 */
export function inssEmpregado(baseCents: bigint, faixas: readonly FaixaInss[], tetoCents: bigint, jaContribuidoCents: bigint, modo: ModoInss): Calculo<bigint> {
  const a = min(max(0n, jaContribuidoCents), tetoCents);
  const total = inssSobre(min(a + max(0n, baseCents), tetoCents), faixas, tetoCents, modo);
  if (a === 0n) return { valor: total.valor, prova: { ...total.prova, rotulo: `INSS do empregado sobre ${baseCents} (teto ${tetoCents})` } };
  const antes = inssSobre(a, faixas, tetoCents, modo);
  const valor = max(0n, total.valor - antes.valor);
  return {
    valor,
    prova: no(`INSS do empregado sobre ${baseCents}, com ${a} já tributado antes (teto ${tetoCents})`, valor, {
      fonte: 'EC 103/2019 art. 28; IN RFB 2.110/2022 art. 36',
      filhos: [{ ...total.prova, soma: true }, { ...negar(antes.prova), rotulo: `menos ${antes.prova.rotulo}`, soma: true }],
    }),
  };
}

/**
 * Item 6 — INSS do contribuinte individual (pró-labore): `aliquotaBp` (`ciSeguradoBp`, G2) sobre a base limitada ao
 * teto descontado o que já contribuiu (Lei 8.212 art. 28 III [F1-D02]; Lei 10.666 [F1-D03]).
 */
export function inssContribuinteIndividual(
  baseCents: bigint,
  aliquotaBp: number,
  tetoCents: bigint,
  jaContribuidoCents: bigint,
  arredondamento: ValorRegra<ModoArredondamento>,
): Calculo<bigint> {
  const limite = max(0n, tetoCents - max(0n, jaContribuidoCents));
  const base = min(max(0n, baseCents), limite);
  const valor = arredondarCentavos(fracao(base * inteiro(aliquotaBp), BP), arredondamento.valor);
  return {
    valor,
    prova: no(`INSS do contribuinte individual: ${base} × ${aliquotaBp} bp`, valor, {
      fonte: 'Lei 8.212/1991 art. 28 III',
      filhos: [no(`Base limitada ao teto (${tetoCents}) menos o já contribuído (${jaContribuidoCents})`, base), no(`Arredondamento ${arredondamento.valor}`, 0n, { fonte: fonteLp(arredondamento) })],
    }),
  };
}

/** Item 7 — FGTS do mês: `bp` sobre a base (Lei 8.036 art. 15 [F1-D04]). */
export function fgts(baseCents: bigint, bp: number, arredondamento: ValorRegra<ModoArredondamento>, fonte = 'Lei 8.036/1990 art. 15'): Calculo<bigint> {
  const valor = arredondarCentavos(fracao(max(0n, baseCents) * inteiro(bp), BP), arredondamento.valor);
  return { valor, prova: no(`FGTS: ${baseCents} × ${bp} bp`, valor, { fonte, filhos: [no(`Arredondamento ${arredondamento.valor}`, 0n, { fonte: fonteLp(arredondamento) })] }) };
}

/**
 * Item 7 — o FGTS da categoria: a chave (`FGTS_BP` ou `FGTS_APRENDIZ_BP`) vem da linha `DP_CATEGORIA_ENCARGO` (item 66),
 * não de um `if` por categoria. Categoria sem FGTS ⇒ `null` (não calcula).
 */
export function fgtsDaCategoria(
  baseCents: bigint,
  encargo: ValorRegra<EncargoCategoria>,
  parametros: Pick<ParametrosFolha, 'fgtsBp' | 'fgtsAprendizBp'>,
  arredondamento: ValorRegra<ModoArredondamento>,
): Calculo<bigint> | null {
  const chave = encargo.valor.fgtsChave;
  if (chave === null) return null;
  const bp = { FGTS_BP: parametros.fgtsBp, FGTS_APRENDIZ_BP: parametros.fgtsAprendizBp }[chave];
  const c = fgts(baseCents, bp, arredondamento);
  return { valor: c.valor, prova: { ...c.prova, filhos: [...c.prova.filhos, no(`Categoria recolhe ${chave}`, 0n, { fonte: fonteLp(encargo) })] } };
}

export interface EntradaIrrfFolha {
  /** Soma das rubricas com incidência de IRRF pagas agora. */
  baseIrrfCents: bigint;
  /** INSS do mês (previdência oficial, Lei 9.250 art. 4º IV). */
  inssCents: bigint;
  dependentes: number;
  /** O que a mesma fonte já pagou e reteve no mês do pagamento (Lei 7.713 art. 7º § 1º [D06]). */
  rendimentoMesAntesCents: bigint;
  retidoMesAntesCents: bigint;
  /** A tabela é a da data de pagamento, não a da competência (D-3). */
  dataPagamento: string;
}

/**
 * Item 8 — IRRF mensal da folha. **Reusa** `calcularIrrfPf` (G3; `_REUSE-CRITERION`: mesmo objeto, a retenção de PF,
 * vivo nos dois lados); este adaptador só monta a entrada: pensão = 0 no F2 (pensão é F3). Dispensa ≤ R$ 10 vem do G3.
 */
export function irrfMensal(e: EntradaIrrfFolha, tabela: readonly LinhaLegal[]): Calculo<bigint> & { baseCents: bigint; dispensa: Dispensa | null } {
  const r = calcularIrrfPf(
    e.baseIrrfCents,
    { rendimentoMesAntesCents: e.rendimentoMesAntesCents, retidoMesAntesCents: e.retidoMesAntesCents, dependentes: e.dependentes, previdenciaCents: e.inssCents, pensaoCents: 0n },
    tabela,
    e.dataPagamento,
  );
  const d = r.pf;
  return {
    valor: r.amountCents,
    baseCents: r.baseCents,
    dispensa: r.dispensa,
    prova: no(`IRRF sobre ${e.baseIrrfCents} pago em ${e.dataPagamento}`, r.amountCents, {
      fonte: [...r.fontes, 'Lei 7.713/1988 art. 7º § 1º'].join('; '),
      filhos: [
        no('Base de cálculo', r.baseCents),
        no(`Dedução de ${d.dependentes} dependente(s)`, d.deducaoDependentesCents),
        no('Previdência oficial deduzida', d.previdenciaCents),
        no('Desconto simplificado', d.descontoSimplificadoCents),
        no('Redução do art. 3º-A', d.reducaoArt3ACents),
        no('Retido antes no mês', d.retidoAntesNoMesCents),
        ...(r.dispensa ? [no(`Dispensa ${r.dispensa}`, 0n, { fonte: 'Lei 9.430/1996 art. 67' })] : []),
      ],
    }),
  };
}
