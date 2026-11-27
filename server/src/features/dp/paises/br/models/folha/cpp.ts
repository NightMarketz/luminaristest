import { exigirLinhaVigente, ParametroLegalAusenteError, type LinhaLegal } from '../../../../../legalParameters/models/legalParameter';
import { fonteLp, no, type CalcNode, type Calculo, type Cents } from '../../../../models/folha/calcNode';
import { arredondarCentavos, fracao, inteiro, multiplicar, textoFracao, type Fracao } from '../../../../models/folha/fracao';
import type { RegrasFolha } from '../../../../models/regrasFolha';
import { TerceirosFpasJson } from './terceiros';

/**
 * BE-INCR-DP-PONTE-RAZAO PR-P0 item 4 — a CPP patronal da competência (Lei 8.212/1991 art. 22), função pura sobre a
 * fotografia de `LegalParameter`. Borda do Brasil (ADR-PAIS-NA-BORDA): importa do centro só `LinhaLegal`, `RegrasFolha`,
 * o `CalcNode` e a `Fracao` do F2.
 *
 * Nenhuma alíquota é literal aqui (item 5): a patronal vem de `ENCARGO_FOLHA/PATRONAL_BP`, o RAT de `RAT_ALIQUOTA`, os
 * limites do FAP de `FAP_LIMITES` e os terceiros de `TERCEIROS_FPAS`. O código guarda só a forma da conta: `10000` é a
 * unidade do bp e do FAP (`fapX10000`), não uma alíquota.
 *
 * - `GERAL`: patronal = alíquota × (empregados + CI) (art. 22 I e III); RAT = ratBp × FAP × empregados (art. 22 II;
 *   Dec. 3.048 art. 202-A); terceiros = totalBp(FPAS) × empregados (IN RFB 2.110 art. 81 § 6º I).
 * - `ANEXO_IV`: patronal e RAT como `GERAL`; terceiros = 0 (LC 123/2006 art. 13 § 3º e art. 18 § 5º-C).
 * - `NO_DAS`: tudo zero; a CPP está no DAS (LC 123/2006 art. 13 VI).
 *
 * Sem teto (item 6): o teto do RGPS limita só o segurado. Arredondamento só no total de cada parcela, pelo modo da linha
 * `FOLHA_REGRA/ARREDONDAMENTO`; o FAP chega truncado na 4ª casa (`fapX10000` inteiro, art. 202-A § 1º) e o produto
 * ratBp × FAP fica em fração exata.
 */

export type RegimeCpp = 'NO_DAS' | 'ANEXO_IV' | 'GERAL';

/** As tabelas que `cppPatronal` lê — o que o chamador pede à `fotografia`. */
export const TABELAS_CPP = ['ENCARGO_FOLHA', 'RAT_ALIQUOTA', 'FAP_LIMITES', 'TERCEIROS_FPAS'] as const;

export interface EntradaCpp {
  regimeCpp: RegimeCpp;
  /** Soma das bases de CP dos empregados (101/103), sem teto. */
  baseEmpregadosCents: Cents;
  /** Soma das bases de CP dos contribuintes individuais (723), sem teto. */
  baseContribuinteIndividualCents: Cents;
  /** `null` só com `NO_DAS`. */
  ratGrau: 1 | 2 | 3 | null;
  /** FAP × 10000, já truncado na 4ª casa (art. 202-A § 1º); dentro de `FAP_LIMITES`. `null` só com `NO_DAS`. */
  fapX10000: number | null;
  /** Código FPAS (3 dígitos). `null` só com `NO_DAS` ou `ANEXO_IV`. */
  fpas: string | null;
  /**
   * Fotografia na data da competência. `encargo` = linhas da `ENCARGO_FOLHA` (a alíquota patronal; a tabela é da
   * contabilidade, o DP só lê — F-F3-2 a). O §5.1 do BRIEF não a lista: ver lacuna de spec no PR.
   */
  tabelas: { encargo: readonly LinhaLegal[]; rat: readonly LinhaLegal[]; fap: readonly LinhaLegal[]; terceiros: readonly LinhaLegal[]; regras: RegrasFolha; data: string };
}

export interface CppResultado {
  patronalCents: Cents;
  ratCents: Cents;
  terceirosCents: Cents;
  totalCents: Cents;
  /** ratBp × fapX10000 / 10000, em bp, exato (só o valor da parcela arredonda). */
  ratAjustado: Fracao;
  terceirosPorEntidade: Array<{ codigo: string; bp: number; valorCents: Cents }>;
}

/** O enquadramento que a competência precisa e não veio (item 4; o chamador vira pendência, item 9). */
export class CppEnquadramentoIncompletoError extends Error {
  constructor(
    readonly campo: 'ratGrau' | 'fapX10000' | 'fpas',
    readonly regimeCpp: RegimeCpp,
    detalhe: string,
  ) {
    super(`CPP ${regimeCpp}: ${detalhe}`);
    Object.setPrototypeOf(this, CppEnquadramentoIncompletoError.prototype);
    this.name = 'CppEnquadramentoIncompletoError';
  }
}

const UNIDADE = 10_000n; // denominador do bp e do fapX10000

function valorIntExigido(linhas: readonly LinhaLegal[], tabela: string, chave: string, data: string): { valor: number; linha: LinhaLegal } {
  const linha = exigirLinhaVigente(linhas, tabela, chave, data);
  if (linha.valorInt === null) throw new ParametroLegalAusenteError(tabela, data, chave);
  return { valor: linha.valorInt, linha };
}

const bpDaBase = (baseCents: Cents, bp: Fracao): Fracao => multiplicar(fracao(baseCents), multiplicar(bp, fracao(1n, UNIDADE)));

/** Item 4 — a CPP patronal (patronal, RAT × FAP e terceiros) com a prova. */
export function cppPatronal(e: EntradaCpp): Calculo<CppResultado> {
  if (e.baseEmpregadosCents < 0n || e.baseContribuinteIndividualCents < 0n) throw new Error('cppPatronal: base negativa.');
  const { data } = e.tabelas;

  if (e.regimeCpp === 'NO_DAS') {
    const valor: CppResultado = { patronalCents: 0n, ratCents: 0n, terceirosCents: 0n, totalCents: 0n, ratAjustado: fracao(0n), terceirosPorEntidade: [] };
    return { valor, prova: no('CPP patronal', 0n, { filhos: [no('CPP no DAS (LC 123 art. 13 VI)', 0n, { fonte: 'LC 123/2006 art. 13 VI', soma: true })] }) };
  }

  if (e.ratGrau === null) throw new CppEnquadramentoIncompletoError('ratGrau', e.regimeCpp, 'grau de risco do RAT não informado');
  if (e.fapX10000 === null) throw new CppEnquadramentoIncompletoError('fapX10000', e.regimeCpp, 'FAP do estabelecimento não informado');
  const modo = e.tabelas.regras.arredondamento.valor;

  // Patronal: art. 22 I (empregados) e III (contribuintes individuais), sem teto.
  const aliqPatronal = valorIntExigido(e.tabelas.encargo, 'ENCARGO_FOLHA', 'PATRONAL_BP', data);
  const basePatronal = e.baseEmpregadosCents + e.baseContribuinteIndividualCents;
  const patronalCents = arredondarCentavos(bpDaBase(basePatronal, fracao(inteiro(aliqPatronal.valor))), modo);
  const noPatronal = no('Patronal (Lei 8.212 art. 22 I e III)', patronalCents, {
    fonte: fonteLp({ linhaId: aliqPatronal.linha.id }),
    soma: true,
    filhos: [no(`base (empregados + CI), alíquota ${aliqPatronal.valor} bp`, basePatronal)],
  });

  // RAT × FAP: art. 22 II e Dec. 3.048 art. 202-A; o FAP fora dos limites da lei é enquadramento inválido.
  const rat = valorIntExigido(e.tabelas.rat, 'RAT_ALIQUOTA', `GRAU_${e.ratGrau}`, data);
  const fapMin = valorIntExigido(e.tabelas.fap, 'FAP_LIMITES', 'MIN_X10000', data);
  const fapMax = valorIntExigido(e.tabelas.fap, 'FAP_LIMITES', 'MAX_X10000', data);
  if (!Number.isInteger(e.fapX10000) || e.fapX10000 < fapMin.valor || e.fapX10000 > fapMax.valor) {
    throw new CppEnquadramentoIncompletoError('fapX10000', e.regimeCpp, `FAP ${e.fapX10000} fora de ${fapMin.valor}..${fapMax.valor} (FAP_LIMITES)`);
  }
  const ratAjustado = multiplicar(fracao(inteiro(rat.valor)), fracao(inteiro(e.fapX10000), UNIDADE));
  const ratCents = arredondarCentavos(bpDaBase(e.baseEmpregadosCents, ratAjustado), modo);
  const noRat = no('RAT × FAP (Lei 8.212 art. 22 II; Dec. 3.048 art. 202-A)', ratCents, {
    fonte: fonteLp({ linhaId: rat.linha.id }),
    soma: true,
    filhos: [
      no(`base (empregados), RAT ${rat.valor} bp × FAP ${e.fapX10000}/10000 = ${textoFracao(ratAjustado)} bp`, e.baseEmpregadosCents),
      no(`FAP entre ${fapMin.valor} e ${fapMax.valor}`, 0n, { fonte: fonteLp({ linhaId: fapMin.linha.id }) }),
    ],
  });

  // Terceiros: só no regime geral, sobre empregados (IN RFB 2.110 art. 81 § 6º I); no Anexo IV, zero.
  let terceirosCents = 0n;
  let terceirosPorEntidade: CppResultado['terceirosPorEntidade'] = [];
  let noTerceiros: CalcNode;
  if (e.regimeCpp === 'ANEXO_IV') {
    noTerceiros = no('Terceiros: não devidos no Anexo IV (LC 123 art. 13 § 3º)', 0n, { fonte: 'LC 123/2006 art. 13 § 3º e art. 18 § 5º-C', soma: true });
  } else {
    if (e.fpas === null) throw new CppEnquadramentoIncompletoError('fpas', e.regimeCpp, 'FPAS da empresa não informado');
    const linha = exigirLinhaVigente(e.tabelas.terceiros, 'TERCEIROS_FPAS', e.fpas, data);
    const lido = TerceirosFpasJson.safeParse(JSON.parse(linha.valorJson ?? 'null'));
    if (!lido.success) throw new ParametroLegalAusenteError('TERCEIROS_FPAS', data, e.fpas);
    terceirosCents = arredondarCentavos(bpDaBase(e.baseEmpregadosCents, fracao(inteiro(lido.data.totalBp))), modo);
    terceirosPorEntidade = Object.entries(lido.data.entidades)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([codigo, bp]) => ({ codigo, bp, valorCents: arredondarCentavos(bpDaBase(e.baseEmpregadosCents, fracao(inteiro(bp))), modo) }));
    noTerceiros = no(`Terceiros do FPAS ${e.fpas} (IN RFB 2.110 art. 81 § 6º I)`, terceirosCents, {
      fonte: fonteLp({ linhaId: linha.id }),
      soma: true,
      filhos: [
        no(`base (empregados), total ${lido.data.totalBp} bp`, e.baseEmpregadosCents),
        ...terceirosPorEntidade.map((t) => no(`terceiro ${t.codigo}: ${t.bp} bp`, t.valorCents)),
      ],
    });
  }

  const totalCents = patronalCents + ratCents + terceirosCents;
  return {
    valor: { patronalCents, ratCents, terceirosCents, totalCents, ratAjustado, terceirosPorEntidade },
    prova: no('CPP patronal', totalCents, { filhos: [noPatronal, noRat, noTerceiros] }),
  };
}
