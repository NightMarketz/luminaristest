import { RECEITA_SERVICO_COMUM, type MemoriaLinha, type ModoApuracao } from './taxAssessmentCalc';
import { periodoBounds, type LalurPeriodo } from './Lalur.model';

/**
 * X7 Fase C — emenda C8 (BRIEF `BE-INCR-TAX-ASSESSMENT-C-brief.md` §1 C3 item 5, emenda de 03/11): cada passo da
 * memória de cálculo leva o registro e a linha da ECF que o contador confere. Decisão: nota `D-2026-11-02-DELEGACAO-DONO`
 * §9 (P-C1 respondida por pesquisa, dossiê `pesquisas-legais/pc1-memoria-calculo`). Fonte das linhas: Tabelas
 * Dinâmicas da ECF, leiaute 12, de 28/05/2026 (dossiê [D02], SHA-256 `366b8d90…`), abas P200/P300/P400/P500 (Presumido)
 * e N620/N630A/N660/N670 (Real; N630A e não B/C = PJ em geral, `COD_QUALIF_PJ` 01). `linha` = coluna CÓDIGO da aba,
 * como o catálogo `ecf-l12-linhas.json` a guarda (ex.: `25140`, `14.10`). Puro: sem I/O.
 *
 * Regra de leitura: o valor de uma linha da ECF é a SOMA das linhas da memória (da mesma apuração) marcadas com ela —
 * ex.: `PRESUNCAO_SERVICO` + `PRESUNCAO_REVENDA` → P200 10. Por isso, quando dois passos dão o mesmo número (CSLL:
 * `ALIQUOTA` e `DEVIDO` na estimativa), só um leva a linha. Passo sem linha na ECF fica vazio.
 *
 * Fora da tabela, de propósito (vazios): os passos do e-Lalur/e-Lacs (`LAIR`, `ADICOES`, `EXCLUSOES`, `LUCRO_AJUSTADO`,
 * `COMPENSACAO*` — registros M300/M350, fora dos registros da decisão §9); `GUARDA_CIRCULARIDADE`, `MESES_PERIODO`,
 * vencimentos e avisos; `RECEITA_HOSPITALAR` sem `RECEITA_SERVICO_COMUM` (memória anterior ao #1024); a dedução
 * `CSLL_RETIDA` (P500 9/10/11/12 dependem de quem reteve — o tipo não diz); as parcelas `DIFERENCA_POSTERGADA_<período>`
 * (o total vai em `DIFERENCA_POSTERGADA`); `SALDO_NEGATIVO` (a linha "a pagar" da ECF é com sinal, a memória separa).
 */

export interface LinhaEcf {
  registro: string;
  linha: string;
}

interface LinhaEcfDef extends LinhaEcf {
  /** DT_INI / DT_FIM da linha na aba (ISO); a linha só vale para a apuração cujo período a toca. */
  dtIni: string;
  dtFim: string | null;
}

const DESDE_2015 = '2015-01-01';
const L = (registro: string, linha: string, dtIni = DESDE_2015, dtFim: string | null = null): LinhaEcfDef => ({ registro, linha, dtIni, dtFim });

// LC 224/25 nas tabelas: P200/P300 desde 01/01/2026; P400/P500 desde 01/04/2026 (DT_INI das abas).
const LC224_IRPJ = '2026-01-01';
const LC224_CSLL = '2026-04-01';

type Tabela = Record<string, LinhaEcfDef>;

const PRESUMIDO_IRPJ: Tabela = {
  RECEITA_SERVICO: L('P200', '8'), // Receita Bruta Sujeita ao Percentual de 32%
  RECEITA_NAO_USO: L('P200', '8'), // a 3.4 entra na base de serviço (SpedEcfGenerationService, BE-INCR-H1-REFERENCIAL-3-4)
  RECEITA_REVENDA: L('P200', '4'), // … 8%
  RECEITA_SERVICO_COMUM: L('P200', '8'), // com hospitalar: o serviço a 32 % (a hospitalar vai à P200 4, abaixo)
  PRESUNCAO_SERVICO: L('P200', '10'), // RESULTADO DA APLICAÇÃO DOS PERCENTUAIS SOBRE A RECEITA BRUTA AJUSTADO
  PRESUNCAO_REDUZIDA_16: L('P200', '10'),
  PRESUNCAO_REVENDA: L('P200', '10'),
  PRESUNCAO_HOSPITALAR: L('P200', '10'),
  LC224_LIMITE_TRIMESTRE: L('P200', '25140', LC224_IRPJ), // Limite Individual no Trimestre (= limite + sobra)
  LC224_SOBRA_ANTERIOR: L('P200', '25140', LC224_IRPJ),
  LC224_EXCEDENTE: L('P200', '25200', LC224_IRPJ), // Base de Cálculo do Adicional da Receita Bruta
  LC224_RECEITA_ACUMULADA: L('P200', '25130', LC224_IRPJ), // Total de Receita Bruta Acumulada
  LC224_EXCEDENTES_ANTERIORES: L('P200', '25160', LC224_IRPJ), // Parcela Excedente ao Limite no(s) Trimestre(s) Anterior(es)
  LC224_LIMITE_ANUAL: L('P200', '25180', LC224_IRPJ), // Limite Anual
  LC224_EXCEDENTE_ANUAL: L('P200', '25190', LC224_IRPJ), // Parcela Excedente ao Limite Anual
  LC224_ACRESCIMO_SERVICO: L('P200', '25240', LC224_IRPJ), // Adicional - … 3,2% (10% de 32%); 25230 com o 16% (abaixo)
  LC224_ACRESCIMO_REVENDA: L('P200', '25220', LC224_IRPJ), // Adicional - … 0,8% (10% de 8%)
  LC224_ACRESCIMO_HOSPITALAR: L('P200', '25220', LC224_IRPJ), // serviço hospitalar = 8%
  BASE: L('P200', '26'), // BASE DE CÁLCULO DO IMPOSTO SOBRE O LUCRO PRESUMIDO
  ALIQUOTA: L('P300', '3'), // Alíquota de 15%
  ADICIONAL: L('P300', '4'), // Adicional
  LC224_ACERTO_T04: L('P300', '14.10', LC224_IRPJ), // (-) Tributo Pago em decorrência da LC 224/25
  A_PAGAR: L('P300', '15'), // IMPOSTO DE RENDA A PAGAR
  DIFERENCA_POSTERGADA: L('P300', '5'), // Diferença de IR Devida pela Mudança de Coeficiente sobre a Receita Bruta
};

const PRESUMIDO_CSLL: Tabela = {
  RECEITA_SERVICO: L('P400', '4'), // Receita Bruta Sujeita ao Percentual de 32%
  RECEITA_NAO_USO: L('P400', '4'),
  RECEITA_REVENDA: L('P400', '2'), // … 12%
  RECEITA_SERVICO_COMUM: L('P400', '4'),
  PRESUNCAO_SERVICO: L('P400', '6'), // RESULTADO DA APLICAÇÃO DOS PERCENTUAIS SOBRE A RECEITA BRUTA AJUSTADO
  PRESUNCAO_REVENDA: L('P400', '6'),
  PRESUNCAO_HOSPITALAR: L('P400', '6'),
  LC224_LIMITE_TRIMESTRE: L('P400', '20140', LC224_CSLL),
  LC224_SOBRA_ANTERIOR: L('P400', '20140', LC224_CSLL),
  LC224_EXCEDENTE: L('P400', '20200', LC224_CSLL),
  LC224_RECEITA_ACUMULADA: L('P400', '20130', LC224_CSLL),
  LC224_EXCEDENTES_ANTERIORES: L('P400', '20160', LC224_CSLL),
  LC224_LIMITE_ANUAL: L('P400', '20180', LC224_CSLL),
  LC224_EXCEDENTE_ANUAL: L('P400', '20190', LC224_CSLL),
  LC224_ACRESCIMO_SERVICO: L('P400', '20220', LC224_CSLL), // Adicional - … 3,2% (10% de 32%)
  LC224_ACRESCIMO_REVENDA: L('P400', '20210', LC224_CSLL), // Adicional - … 1,2% (10% de 12%)
  LC224_ACRESCIMO_HOSPITALAR: L('P400', '20210', LC224_CSLL), // serviço hospitalar = 12%
  BASE: L('P400', '21'), // BASE DE CÁLCULO DA CSLL
  ALIQUOTA: L('P500', '2'), // CSLL Apurada
  DEVIDO: L('P500', '4'), // TOTAL DA CONTRIBUIÇÃO SOCIAL SOBRE O LUCRO LÍQUIDO (= 2, sem a linha 3)
  LC224_ACERTO_T04: L('P500', '12.10', LC224_CSLL), // (-)Tributo Pago em decorrência da LC 224/25
  A_PAGAR: L('P500', '13'), // CSLL A PAGAR
};

const REAL_IRPJ: Tabela = {
  BASE: L('N630', '1'), // BASE DE CÁLCULO DO IRPJ
  ALIQUOTA: L('N630', '3'), // À Alíquota de 15%
  ADICIONAL: L('N630', '4'), // Adicional
  A_PAGAR: L('N630', '26'), // IMPOSTO DE RENDA A PAGAR
};
const REAL_CSLL: Tabela = {
  BASE: L('N670', '1'), // BASE DE CÁLCULO DA CSLL
  ALIQUOTA: L('N670', '2'), // Contribuição Social sobre o Lucro Líquido por Atividade
  DEVIDO: L('N670', '4'), // TOTAL DA CONTRIBUIÇÃO SOCIAL SOBRE O LUCRO LÍQUIDO
  A_PAGAR: L('N670', '21'), // CSLL A PAGAR
};

const ESTIMATIVA_IRPJ: Tabela = {
  BASE: L('N620', '1'), // Base de Cálculo do Imposto de Renda (= N500 2 na estimativa por receita bruta)
  ALIQUOTA: L('N620', '3'), // A Alíquota de 15%
  ADICIONAL: L('N620', '4'), // Adicional
  A_PAGAR: L('N620', '26'), // IMPOSTO DE RENDA DEVIDO NO MÊS
  DIFERENCA_POSTERGADA: L('N620', '5'), // Diferença de IR Devida pela Mudança de Coeficiente sobre a Receita Bruta
};
const ESTIMATIVA_CSLL: Tabela = {
  BASE: L('N660', '2'), // Base de Cálculo da CSLL
  ALIQUOTA: L('N660', '3'), // CSLL Apurada
  A_PAGAR: L('N660', '18'), // CSLL DEVIDA NO MÊS
};

const BALANCETE_IRPJ: Tabela = {
  ...ESTIMATIVA_IRPJ,
  DEVIDO_MESES_ANTERIORES: L('N620', '20'), // (-) Imposto de Renda Devido em Meses Anteriores
  REDUCAO: L('N620', '20.01'), // (-) Imposto de Renda Devido no Mês Antes de Retenções e Pagamentos
  SUSPENSAO: L('N620', '20.01'),
};
const BALANCETE_CSLL: Tabela = {
  ...ESTIMATIVA_CSLL,
  DEVIDO_MESES_ANTERIORES: L('N660', '12'), // (-) CSLL Devida em Meses Anteriores
  REDUCAO: L('N660', '12.01'), // CSLL Devida no Mês Antes de Retenções e Pagamentos
  SUSPENSAO: L('N660', '12.01'),
};

const POR_MODO: Record<ModoApuracao, { IRPJ: Tabela; CSLL: Tabela }> = {
  PRESUMIDO: { IRPJ: PRESUMIDO_IRPJ, CSLL: PRESUMIDO_CSLL },
  REAL_TRIMESTRAL: { IRPJ: REAL_IRPJ, CSLL: REAL_CSLL },
  AJUSTE_ANUAL: { IRPJ: REAL_IRPJ, CSLL: REAL_CSLL },
  ESTIMATIVA_RECEITA: { IRPJ: ESTIMATIVA_IRPJ, CSLL: ESTIMATIVA_CSLL },
  BALANCETE_SUSPENSAO_REDUCAO: { IRPJ: BALANCETE_IRPJ, CSLL: BALANCETE_CSLL },
};

/** Dedução `IRRF` (o tipo abre a descrição — `somarDeducoes`): a linha genérica do IRRF de cada registro. */
const DEDUCAO_IRRF: Partial<Record<ModoApuracao, LinhaEcfDef>> = {
  PRESUMIDO: L('P300', '10'), // (-) Imposto de Renda Retido na Fonte
  REAL_TRIMESTRAL: L('N630', '20'),
  AJUSTE_ANUAL: L('N630', '20'),
  ESTIMATIVA_RECEITA: L('N620', '21'),
  BALANCETE_SUSPENSAO_REDUCAO: L('N620', '21'),
};
/** Ajuste anual: as estimativas pagas, mês a mês (`ESTIMATIVA_PAGA_A01`…), somam na linha "pago por estimativa". */
const ESTIMATIVA_PAGA = { IRPJ: L('N630', '24'), CSLL: L('N670', '19') };

/** Linhas `RESUMO` (F-TC-6 a) com linha própria na ECF; as demais ficam vazias. */
const RESUMO: Record<ModoApuracao, { IRPJ: Tabela; CSLL: Tabela }> = {
  PRESUMIDO: {
    IRPJ: { base: L('P300', '1'), aPagar: L('P300', '15'), diferencaPostergada: L('P300', '5') },
    CSLL: { base: L('P500', '1'), devido: L('P500', '4'), aPagar: L('P500', '13') },
  },
  REAL_TRIMESTRAL: { IRPJ: { base: L('N630', '1'), aPagar: L('N630', '26') }, CSLL: { base: L('N670', '1'), devido: L('N670', '4'), aPagar: L('N670', '21') } },
  AJUSTE_ANUAL: { IRPJ: { base: L('N630', '1'), aPagar: L('N630', '26') }, CSLL: { base: L('N670', '1'), devido: L('N670', '4'), aPagar: L('N670', '21') } },
  ESTIMATIVA_RECEITA: {
    IRPJ: { base: L('N620', '1'), aPagar: L('N620', '26'), diferencaPostergada: L('N620', '5') },
    CSLL: { base: L('N660', '2'), devido: L('N660', '3'), aPagar: L('N660', '18') },
  },
  BALANCETE_SUSPENSAO_REDUCAO: {
    IRPJ: { base: L('N620', '1'), devido: L('N620', '20.01'), aPagar: L('N620', '26'), diferencaPostergada: L('N620', '5') },
    CSLL: { base: L('N660', '2'), devido: L('N660', '12.01'), aPagar: L('N660', '18') },
  },
};

export interface ApuracaoRef {
  anoCalendario: number;
  periodo: string;
  tributo: string;
  modo: string;
}

const isoDia = (d: Date): string => d.toISOString().slice(0, 10);

function vigente(def: LinhaEcfDef | undefined, r: ApuracaoRef): LinhaEcf | null {
  if (!def) return null;
  const b = periodoBounds(r.anoCalendario, r.periodo as LalurPeriodo);
  if (def.dtIni > isoDia(b.to) || (def.dtFim !== null && def.dtFim < isoDia(b.from))) return null;
  return { registro: def.registro, linha: def.linha };
}

const tabelas = (r: ApuracaoRef) => (r.tributo === 'IRPJ' || r.tributo === 'CSLL' ? POR_MODO[r.modo as ModoApuracao]?.[r.tributo] : undefined);

/** Linha da ECF de um passo `MEMORIA`; `null` = sem linha (fica vazio na planilha). PIS/COFINS não têm ECF. */
export function linhaEcfDoPasso(r: ApuracaoRef, passo: MemoriaLinha, memoria: readonly MemoriaLinha[]): LinhaEcf | null {
  const t = tabelas(r);
  if (!t) return null;
  const modo = r.modo as ModoApuracao;
  if (/^DEDUCAO_\d+$/.test(passo.codigo)) {
    return r.tributo === 'IRPJ' && passo.descricao.startsWith('IRRF') ? vigente(DEDUCAO_IRRF[modo], r) : null;
  }
  if (modo === 'AJUSTE_ANUAL' && /^ESTIMATIVA_PAGA_A\d{2}$/.test(passo.codigo)) return vigente(ESTIMATIVA_PAGA[r.tributo as 'IRPJ' | 'CSLL'], r);
  // O 16% (P200 6) leva o acréscimo do serviço para a linha de 1,6% (25230) e a receita de serviço para a P200 6.
  const com16 = r.tributo === 'IRPJ' && memoria.some((m) => m.codigo === 'PRESUNCAO_REDUZIDA_16');
  if (passo.codigo === 'LC224_ACRESCIMO_SERVICO' && com16) return vigente(L('P200', '25230', LC224_IRPJ), r);
  if ((passo.codigo === 'RECEITA_SERVICO' || passo.codigo === 'RECEITA_NAO_USO') && com16) return vigente(L('P200', '6'), r);
  // Com hospitalar, a P200 8 / P400 4 é a `RECEITA_SERVICO_COMUM` e a hospitalar vai com a revenda (8 %/12 %).
  const comHospitalar = memoria.some((m) => m.codigo === RECEITA_SERVICO_COMUM);
  if ((passo.codigo === 'RECEITA_SERVICO' || passo.codigo === 'RECEITA_NAO_USO') && comHospitalar) return null;
  if (passo.codigo === 'RECEITA_HOSPITALAR') return comHospitalar ? vigente(t.RECEITA_REVENDA, r) : null;
  return vigente(t[passo.codigo], r);
}

/** Linha da ECF de uma linha `RESUMO` (`base`, `devido`, `aPagar`, …); `null` = sem correspondência. */
export function linhaEcfDoResumo(r: ApuracaoRef, codigo: string): LinhaEcf | null {
  if (r.tributo !== 'IRPJ' && r.tributo !== 'CSLL') return null;
  return vigente(RESUMO[r.modo as ModoApuracao]?.[r.tributo][codigo], r);
}

/** Todas as linhas da tabela (o teste confere cada uma contra o catálogo da tabela dinâmica). */
export function linhasEcfDaTabela(): { modo: string; tributo: string; codigo: string; def: LinhaEcfDef }[] {
  const out: { modo: string; tributo: string; codigo: string; def: LinhaEcfDef }[] = [];
  for (const [modo, porTributo] of Object.entries({ ...POR_MODO })) {
    for (const tributo of ['IRPJ', 'CSLL'] as const) {
      for (const [codigo, def] of Object.entries(porTributo[tributo])) out.push({ modo, tributo, codigo, def });
      for (const [codigo, def] of Object.entries(RESUMO[modo as ModoApuracao][tributo])) out.push({ modo, tributo, codigo: `RESUMO:${codigo}`, def });
    }
  }
  for (const [modo, def] of Object.entries(DEDUCAO_IRRF)) out.push({ modo, tributo: 'IRPJ', codigo: 'DEDUCAO_n:IRRF', def: def! });
  out.push({ modo: 'AJUSTE_ANUAL', tributo: 'IRPJ', codigo: 'ESTIMATIVA_PAGA_Ann', def: ESTIMATIVA_PAGA.IRPJ });
  out.push({ modo: 'AJUSTE_ANUAL', tributo: 'CSLL', codigo: 'ESTIMATIVA_PAGA_Ann', def: ESTIMATIVA_PAGA.CSLL });
  out.push({ modo: 'PRESUMIDO', tributo: 'IRPJ', codigo: 'LC224_ACRESCIMO_SERVICO:16', def: L('P200', '25230', LC224_IRPJ) });
  out.push({ modo: 'PRESUMIDO', tributo: 'IRPJ', codigo: 'RECEITA_SERVICO:16', def: L('P200', '6') });
  out.push({ modo: 'PRESUMIDO', tributo: 'IRPJ', codigo: 'RECEITA_HOSPITALAR', def: L('P200', '4') });
  out.push({ modo: 'PRESUMIDO', tributo: 'CSLL', codigo: 'RECEITA_HOSPITALAR', def: L('P400', '2') });
  return out;
}
