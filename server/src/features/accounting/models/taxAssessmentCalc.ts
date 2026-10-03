import { z } from 'zod';
import { ValidationError } from '../../../lib/errors';
import { findLinha } from './Lalur.model';
import {
  ALIQUOTA_CSLL_BP,
  CODIGOS_RECEITA,
  CODIGOS_RECEITA_FONTE,
  TAX_ASSESSMENT_TABELA_VERSAO,
  arred,
  linhaVigente,
  mulBp,
  parametroVigente,
} from './taxAssessmentParams';

/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF itens 8–11) — funções PURAS `(entrada, tabela vigente) → memória` da
 * apuração trimestral de IRPJ/CSLL (Presumido e Real). Sem I/O: quem lê razão, perfil, e-Lalur e memórias
 * confirmadas é o serviço do PR-2. Erros de entrada = `ValidationError` (400).
 *
 * Toda linha da memória guarda o valor já arredondado pela função única `arred` (F-TA-2 a).
 */

// ─── Contrato de saída: memória de cálculo (contrato §2, `MemoriaLinha` / `MemoriaCalculoSchema`) ───────────────

export const MemoriaLinhaSchema = z
  .object({
    codigo: z.string().min(1),
    descricao: z.string(),
    valorCents: z.string().regex(/^-?\d+$/),
    fonte: z.string(),
  })
  .strict();
export const MemoriaCalculoSchema = z.array(MemoriaLinhaSchema);
export type MemoriaLinha = z.infer<typeof MemoriaLinhaSchema>;

export const PERIODOS_TRIMESTRAIS = ['T01', 'T02', 'T03', 'T04'] as const;
export type PeriodoTrimestral = (typeof PERIODOS_TRIMESTRAIS)[number];
export type TributoApuracao = 'IRPJ' | 'CSLL';
export type ModoApuracao = 'PRESUMIDO' | 'REAL_TRIMESTRAL';

/** Dedução informada pelo operador (F-X7-11 a; shape do `TaxAssessmentPreviewSchema.deducoes` do contrato §2). */
export interface DeducaoInformada {
  tributo: TributoApuracao;
  tipo: 'IRRF' | 'CSLL_RETIDA' | 'OUTRA';
  valorCents: string;
  documento?: string;
}

/** Memória CONFIRMADA de um trimestre anterior do mesmo tributo e ano (F-TA-3 a: a fonte é a memória, não o razão). */
export interface MemoriaAnterior {
  periodo: PeriodoTrimestral;
  memoria: MemoriaLinha[];
}

export interface ResultadoApuracao {
  tributo: TributoApuracao;
  modo: ModoApuracao;
  codigoReceita: string;
  baseCents: bigint;
  devidoCents: bigint;
  deducoesCents: bigint;
  aPagarCents: bigint;
  saldoNegativoCents: bigint;
  memoria: MemoriaLinha[];
  tabelaVersao: string;
}

const MESES_TRIMESTRE = 3n;

// ─── helpers ────────────────────────────────────────────────────────────────────────────────────────────────

const indice = (p: PeriodoTrimestral): number => PERIODOS_TRIMESTRAIS.indexOf(p) + 1;

/** Último dia do trimestre (date-only) — a data em que a tabela de parâmetros é consultada. */
export function fimDoTrimestre(ano: number, periodo: PeriodoTrimestral): string {
  return `${ano}-${['03-31', '06-30', '09-30', '12-31'][indice(periodo) - 1]}`;
}

/**
 * IN RFB 2.305/2025 art. 15 § 9º (F-TA-4 b): trimestres do ano que tocam o intervalo [início, encerramento] de
 * atividade. Datas nulas = atividade desde antes / até depois do ano.
 */
export function trimestresEmAtividade(ano: number, inicioAtividadeEm: string | null, encerramentoAtividadeEm: string | null): PeriodoTrimestral[] {
  const ini = inicioAtividadeEm ?? `${ano}-01-01`;
  const fim = encerramentoAtividadeEm ?? `${ano}-12-31`;
  return PERIODOS_TRIMESTRAIS.filter((p) => {
    const q = indice(p);
    const qIni = `${ano}-${String(q * 3 - 2).padStart(2, '0')}-01`;
    return qIni <= fim && fimDoTrimestre(ano, p) >= ini;
  });
}

function valorLinha(memoria: MemoriaLinha[], codigo: string, periodo: string): bigint {
  const l = memoria.find((m) => m.codigo === codigo);
  if (!l) throw new ValidationError(`memória confirmada de ${periodo} sem a linha ${codigo}.`);
  return BigInt(l.valorCents);
}

const temLinha = (memoria: MemoriaLinha[], codigo: string): boolean => memoria.some((m) => m.codigo === codigo);
const maxZero = (v: bigint): bigint => (v > 0n ? v : 0n);
const minB = (a: bigint, b: bigint): bigint => (a < b ? a : b);
const linha = (codigo: string, descricao: string, valorCents: bigint, fonte: string): MemoriaLinha => ({
  codigo,
  descricao,
  valorCents: valorCents.toString(),
  fonte,
});

function anteriorDe(anteriores: MemoriaAnterior[], periodo: PeriodoTrimestral): MemoriaAnterior | undefined {
  const q = indice(periodo);
  return anteriores.find((a) => indice(a.periodo) === q - 1);
}

// ─── Item 9 — acréscimo da LC 224 (IN RFB 2.305/2025 art. 15, redação da IN 2.306/2026) ─────────────────────

const F_15_2 = 'IN RFB 2.305/2025 art. 15 § 2º';
const F_15_3 = 'IN RFB 2.305/2025 art. 15 § 3º';
const F_15_4 = 'IN RFB 2.305/2025 art. 15 § 4º';
const F_15_5 = 'IN RFB 2.305/2025 art. 15 § 5º';
const F_15_9 = 'IN RFB 2.305/2025 art. 15 § 9º';

export interface EntradaLc224 {
  ano: number;
  periodo: PeriodoTrimestral;
  receitaTrimestreCents: bigint;
  anteriores: MemoriaAnterior[];
  inicioAtividadeEm: string | null;
  encerramentoAtividadeEm: string | null;
}

export interface ResultadoLc224 {
  /** `false` ⇒ limite sem linha vigente (ano anterior a 2026): nenhuma linha LC 224 na memória. */
  vigente: boolean;
  limiteTrimestreCents: bigint;
  sobraAnteriorCents: bigint;
  /** Parcela excedente do trimestre JÁ com a regra do T04 aplicada (§ 3º; § 5º no T04). */
  excedenteCents: bigint;
  /** T04 (§ 5º): o ramo e, nos ramos I/II, a parcela excedente recalculada de cada trimestre anterior. */
  t04?: {
    ramo: 'I' | 'II' | 'III';
    receitaAcumuladaCents: bigint;
    limiteAnualCents: bigint;
    excedenteAnualCents: bigint;
    somaExcedentesAnterioresCents: bigint;
    excedentesRecalculados: { periodo: PeriodoTrimestral; excedenteCents: bigint }[];
  };
  memoria: MemoriaLinha[];
}

/**
 * Parcela da receita bruta do trimestre sobre a qual incide o acréscimo de 10% nos percentuais de presunção. Comum a
 * IRPJ e CSLL (o limite conta igual para os dois — P-2); o acréscimo de cada tributo sai da tabela (item 4).
 *
 *  - limite do trimestre = R$ 1.250.000,00 (§ 2º) + a sobra NÃO USADA do trimestre anterior (§ 4º), lida da memória
 *    confirmada (F-TA-3 a): sobra = max(0, limite + sobra anterior − receita) daquele trimestre;
 *  - parcela excedente = max(0, receita − limite) (§ 3º);
 *  - T04 (§ 5º), com limite anual = trimestres em atividade × 1.250.000 (§ 9º), E = max(0, receita acumulada − limite
 *    anual) e S = Σ parcelas excedentes de T01..T03 (memórias):
 *      E ≥ S ⇒ excedente do T04 = min(excedente do trimestre, E − S) — ramo III (ou I, se a acumulada ≤ limite anual,
 *              quando E = S = 0);
 *      E < S ⇒ sem acréscimo no T04 e cada trimestre anterior é recalculado com excedente' = arred(exc × E / S) —
 *              ramo II (item 1–3 do § 5º II b) ou I (acumulada ≤ limite ⇒ E = 0 ⇒ excedente' = 0, § 5º I b).
 *    Nas igualdades que a IN não nomeia (acumulada = limite anual; E = S) os dois ramos vizinhos dão o mesmo número
 *    (teste `§ 5º — fronteiras`). O "poderá" dos ramos I-b e II-b vira sempre aplicar (P-3).
 */
export function parcelaExcedenteLc224(e: EntradaLc224): ResultadoLc224 {
  const dataFim = fimDoTrimestre(e.ano, e.periodo);
  const limiteParam = linhaVigente('LC224_LIMITE_TRIMESTRE_CENTS', dataFim);
  if (!limiteParam) return { vigente: false, limiteTrimestreCents: 0n, sobraAnteriorCents: 0n, excedenteCents: 0n, memoria: [] };

  const limite = BigInt(limiteParam.valor);
  const ant = anteriorDe(e.anteriores, e.periodo);
  let sobra = 0n;
  if (ant && temLinha(ant.memoria, 'LC224_LIMITE_TRIMESTRE')) {
    const limiteAnt = valorLinha(ant.memoria, 'LC224_LIMITE_TRIMESTRE', ant.periodo) + valorLinha(ant.memoria, 'LC224_SOBRA_ANTERIOR', ant.periodo);
    sobra = maxZero(limiteAnt - receitaDaMemoria(ant));
  }
  const excedenteTrimestre = maxZero(e.receitaTrimestreCents - (limite + sobra));
  const memoria: MemoriaLinha[] = [
    linha('LC224_LIMITE_TRIMESTRE', 'Limite proporcional do trimestre', limite, F_15_2),
    linha('LC224_SOBRA_ANTERIOR', 'Diferença não usada dos trimestres anteriores', sobra, F_15_4),
  ];

  if (e.periodo !== 'T04') {
    memoria.push(linha('LC224_EXCEDENTE', 'Parcela da receita bruta que excede o limite do trimestre', excedenteTrimestre, F_15_3));
    return { vigente: true, limiteTrimestreCents: limite, sobraAnteriorCents: sobra, excedenteCents: excedenteTrimestre, memoria };
  }

  const anteriores = e.anteriores.filter((a) => a.periodo !== 'T04');
  const n = BigInt(trimestresEmAtividade(e.ano, e.inicioAtividadeEm, e.encerramentoAtividadeEm).length);
  const limiteAnual = n * limite;
  const acumulada = anteriores.reduce((s, a) => s + receitaDaMemoria(a), 0n) + e.receitaTrimestreCents;
  const excedenteAnual = maxZero(acumulada - limiteAnual);
  const somaAnteriores = anteriores.reduce((s, a) => s + valorLinha(a.memoria, 'LC224_EXCEDENTE', a.periodo), 0n);

  let excedente: bigint;
  let ramo: 'I' | 'II' | 'III';
  let excedentesRecalculados: { periodo: PeriodoTrimestral; excedenteCents: bigint }[] = [];
  if (excedenteAnual >= somaAnteriores) {
    excedente = minB(excedenteTrimestre, excedenteAnual - somaAnteriores);
    ramo = acumulada <= limiteAnual ? 'I' : 'III';
  } else {
    excedente = 0n;
    ramo = acumulada <= limiteAnual ? 'I' : 'II';
    excedentesRecalculados = anteriores.map((a) => ({
      periodo: a.periodo,
      excedenteCents: arred(valorLinha(a.memoria, 'LC224_EXCEDENTE', a.periodo) * excedenteAnual, somaAnteriores),
    }));
  }
  memoria.push(
    linha('LC224_LIMITE_ANUAL', `Limite anual: ${n} trimestre(s) em atividade × limite do trimestre`, limiteAnual, F_15_9),
    linha('LC224_RECEITA_ACUMULADA', 'Receita bruta acumulada do ano-calendário', acumulada, F_15_5),
    linha('LC224_EXCEDENTE_ANUAL', 'Parcela da receita acumulada que excede o limite anual', excedenteAnual, F_15_5),
    linha('LC224_EXCEDENTES_ANTERIORES', 'Soma das parcelas excedentes dos trimestres anteriores', somaAnteriores, F_15_5),
    linha('LC224_EXCEDENTE', `Parcela excedente do último trimestre (§ 5º ${ramo})`, excedente, `${F_15_5} ${ramo}`),
  );
  return {
    vigente: true,
    limiteTrimestreCents: limite,
    sobraAnteriorCents: sobra,
    excedenteCents: excedente,
    t04: { ramo, receitaAcumuladaCents: acumulada, limiteAnualCents: limiteAnual, excedenteAnualCents: excedenteAnual, somaExcedentesAnterioresCents: somaAnteriores, excedentesRecalculados },
    memoria,
  };
}

function receitaDaMemoria(a: MemoriaAnterior): bigint {
  return valorLinha(a.memoria, 'RECEITA_SERVICO', a.periodo) + valorLinha(a.memoria, 'RECEITA_REVENDA', a.periodo);
}

// ─── Item 8 — Presumido trimestral ────────────────────────────────────────────────────────────────────────────

export interface PerfilApuracaoPresumido {
  ecfIndAliqCsll: string | null;
  ecfIndRecReceita: string | null;
  lc224AcrescimoSuspenso: boolean;
  lc224LiminarReferencia: string | null;
  inicioAtividadeEm: string | null;
  encerramentoAtividadeEm: string | null;
}

export interface EntradaPresumido {
  ano: number;
  periodo: PeriodoTrimestral;
  tributo: TributoApuracao;
  /** Item 6 — `receitaBrutaPorAtividade` do trimestre (o gate de exaustividade já rodou). */
  receitaServicoCents: bigint;
  receitaRevendaCents: bigint;
  perfil: PerfilApuracaoPresumido;
  anteriores: MemoriaAnterior[];
  deducoes: DeducaoInformada[];
}

/** D8: alíquota da CSLL do perfil; nula ⇒ 400 (perfil incompleto). */
function aliquotaCsll(ind: string | null): { valor: number; fonte: string } {
  const a = ind ? ALIQUOTA_CSLL_BP[ind] : undefined;
  if (!a) throw new ValidationError('perfil incompleto: informe ecf.indAliqCsll (alíquota da CSLL) no perfil fiscal da empresa do ano (ADR D8).');
  return a;
}

const PRESUNCAO = { IRPJ: 'PRESUNCAO_IRPJ', CSLL: 'PRESUNCAO_CSLL' } as const;
const ACRESCIMO = { IRPJ: 'LC224_ACRESCIMO_IRPJ', CSLL: 'LC224_ACRESCIMO_CSLL' } as const;

/**
 * Base e devido do Presumido de UM trimestre (usada no trimestre apurado e no recálculo do § 5º): base por atividade =
 * receita × percentual + parcela excedente da atividade × percentual × acréscimo (§ 3º: percentual acrescido em 10%
 * só sobre a parcela excedente; leitura multiplicativa = P-1); parcela excedente repartida pela receita de cada
 * atividade no trimestre (§§ 1º II e 6º).
 */
function basePresumido(
  tributo: TributoApuracao,
  dataFim: string,
  receitaServico: bigint,
  receitaRevenda: bigint,
  excedente: bigint,
  suspenso: boolean,
  aliqCsll: { valor: number; fonte: string },
): { baseCents: bigint; devidoCents: bigint; memoria: MemoriaLinha[] } {
  const receita = receitaServico + receitaRevenda;
  const excServico = receita > 0n ? arred(excedente * receitaServico, receita) : 0n;
  const excRevenda = excedente - excServico;
  const acrescimo = suspenso ? 0 : parametroVigente(ACRESCIMO[tributo], dataFim);
  const pS = linhaVigente(PRESUNCAO[tributo], dataFim, 'SERVICO')!;
  const pR = linhaVigente(PRESUNCAO[tributo], dataFim, 'REVENDA')!;
  const presS = mulBp(receitaServico, pS.valor);
  const presR = mulBp(receitaRevenda, pR.valor);
  const acrS = mulBp(excServico, pS.valor, acrescimo);
  const acrR = mulBp(excRevenda, pR.valor, acrescimo);
  const base = presS + presR + acrS + acrR;
  const fonteAcr = linhaVigente(ACRESCIMO[tributo], dataFim)?.fonte ?? `${ACRESCIMO[tributo]} sem linha vigente (acréscimo 0)`;
  const memoria = [
    linha('PRESUNCAO_SERVICO', `Receita de serviço × ${pS.valor / 100}%`, presS, pS.fonte),
    linha('PRESUNCAO_REVENDA', `Receita de revenda × ${pR.valor / 100}%`, presR, pR.fonte),
    linha('LC224_ACRESCIMO_SERVICO', `Parcela excedente do serviço (${excServico} centavos) × ${pS.valor / 100}% × ${acrescimo / 100}%`, acrS, `${fonteAcr}; IN RFB 2.305/2025 art. 15 §§ 1º II e 6º`),
    linha('LC224_ACRESCIMO_REVENDA', `Parcela excedente da revenda (${excRevenda} centavos) × ${pR.valor / 100}% × ${acrescimo / 100}%`, acrR, `${fonteAcr}; IN RFB 2.305/2025 art. 15 §§ 1º II e 6º`),
    linha('BASE', 'Base de cálculo', base, 'Lei 9.430/1996 art. 25 I'),
  ];
  const imposto = impostoSobreBase(tributo, dataFim, base, aliqCsll);
  return { baseCents: base, devidoCents: imposto.devidoCents, memoria: [...memoria, ...imposto.memoria] };
}

/** IRPJ = 15% + adicional de 10% sobre o que exceder R$ 20.000 × 3 (D7); CSLL = alíquota do perfil (D8). */
function impostoSobreBase(
  tributo: TributoApuracao,
  dataFim: string,
  base: bigint,
  aliqCsll: { valor: number; fonte: string } | null,
): { devidoCents: bigint; memoria: MemoriaLinha[] } {
  if (tributo === 'CSLL') {
    const a = aliqCsll!;
    const v = mulBp(base, a.valor);
    return { devidoCents: v, memoria: [linha('ALIQUOTA', `Base × ${a.valor / 100}%`, v, a.fonte), linha('DEVIDO', 'CSLL devida', v, a.fonte)] };
  }
  const aliq = linhaVigente('IRPJ_ALIQ', dataFim)!;
  const adicAliq = linhaVigente('IRPJ_ADIC_ALIQ', dataFim)!;
  const limiteMes = linhaVigente('IRPJ_ADIC_LIMITE_MES_CENTS', dataFim)!;
  const normal = mulBp(base, aliq.valor);
  const adicional = mulBp(maxZero(base - BigInt(limiteMes.valor) * MESES_TRIMESTRE), adicAliq.valor);
  return {
    devidoCents: normal + adicional,
    memoria: [
      linha('ALIQUOTA', `Base × ${aliq.valor / 100}%`, normal, aliq.fonte),
      linha('ADICIONAL', `${adicAliq.valor / 100}% × (base − ${limiteMes.valor} centavos × 3 meses)`, adicional, limiteMes.fonte),
      linha('DEVIDO', 'IRPJ devido', normal + adicional, aliq.fonte),
    ],
  };
}

/**
 * Item 8 (A4) — Presumido trimestral. Recusas (400): `ecfIndAliqCsll` nulo (D8); `ecfIndRecReceita = '1'` (caixa —
 * IN 1.700 art. 223, fora da Fase A). A receita fora de 3.1/3.3 já foi recusada pelo gate do item 6.
 */
export function apurarPresumidoTrimestral(e: EntradaPresumido): ResultadoApuracao {
  const aliqCsll = aliquotaCsll(e.perfil.ecfIndAliqCsll);
  if (e.perfil.ecfIndRecReceita === '1') {
    throw new ValidationError(
      'Presumido pelo regime de caixa (ecf.indRecReceita = 1) fica fora da Fase A: a segregação lê o razão por competência (IN RFB 1.700/2017 art. 223).',
    );
  }
  const dataFim = fimDoTrimestre(e.ano, e.periodo);
  const receita = e.receitaServicoCents + e.receitaRevendaCents;
  const lc = parcelaExcedenteLc224({
    ano: e.ano,
    periodo: e.periodo,
    receitaTrimestreCents: receita,
    anteriores: e.anteriores,
    inicioAtividadeEm: e.perfil.inicioAtividadeEm,
    encerramentoAtividadeEm: e.perfil.encerramentoAtividadeEm,
  });
  const suspenso = e.perfil.lc224AcrescimoSuspenso;
  const memoria: MemoriaLinha[] = [
    linha('RECEITA_SERVICO', 'Receita bruta de serviço do trimestre (conta 3.1)', e.receitaServicoCents, 'IN RFB 1.700/2017 art. 215 caput'),
    linha('RECEITA_REVENDA', 'Receita bruta de revenda do trimestre (conta 3.3)', e.receitaRevendaCents, 'IN RFB 1.700/2017 art. 215 caput'),
    ...lc.memoria,
  ];
  if (suspenso && lc.vigente) {
    memoria.push(
      linha('LC224_SUSPENSO', `Acréscimo da LC 224 suspenso por liminar (processo ${e.perfil.lc224LiminarReferencia ?? '—'}); limite e sobra continuam contados`, 0n, 'F-TA-5 (a) — chave do perfil fiscal da empresa'),
    );
  }
  const calc = basePresumido(e.tributo, dataFim, e.receitaServicoCents, e.receitaRevendaCents, lc.excedenteCents, suspenso, aliqCsll);
  memoria.push(...calc.memoria);

  // § 5º I-b / II-b: recalcula os trimestres anteriores com a parcela excedente' e deduz a diferença no T04.
  let acerto = 0n;
  if (lc.t04 && lc.t04.excedentesRecalculados.length > 0) {
    for (const r of lc.t04.excedentesRecalculados) {
      const a = e.anteriores.find((x) => x.periodo === r.periodo)!;
      const recalc = basePresumido(
        e.tributo,
        fimDoTrimestre(e.ano, a.periodo),
        valorLinha(a.memoria, 'RECEITA_SERVICO', a.periodo),
        valorLinha(a.memoria, 'RECEITA_REVENDA', a.periodo),
        r.excedenteCents,
        temLinha(a.memoria, 'LC224_SUSPENSO'), // o trimestre suspenso foi apurado (e é recalculado) sem acréscimo
        aliqCsll,
      );
      acerto += valorLinha(a.memoria, 'DEVIDO', a.periodo) - recalc.devidoCents;
    }
    memoria.push(
      linha(
        'LC224_ACERTO_T04',
        `Diferença entre o devido apurado e o recalculado (§ 5º ${lc.t04.ramo}) dos trimestres anteriores, deduzida no último trimestre`,
        acerto,
        `${F_15_5} ${lc.t04.ramo} b (P-3: sempre aplicada)`,
      ),
    );
  }
  const codigoReceita = e.tributo === 'IRPJ' ? CODIGOS_RECEITA.IRPJ_PRESUMIDO : CODIGOS_RECEITA.CSLL_PRESUMIDO;
  return fecharComDeducoes(e.tributo, 'PRESUMIDO', codigoReceita, calc.baseCents, calc.devidoCents, acerto, e.deducoes, memoria);
}

// ─── Item 10 — Real trimestral ────────────────────────────────────────────────────────────────────────────────

export interface EntradaReal {
  ano: number;
  periodo: PeriodoTrimestral;
  tributo: TributoApuracao;
  /** Item 7 — `resultadoAntesIrpjCsll` do trimestre (sem encerramento, sem as despesas da provisão). */
  resultadoAntesCents: bigint;
  /** Item 7 — `false` ⇒ as contas da provisão não estão configuradas e a guarda de circularidade não excluiu nada. */
  contasProvisaoConfiguradas: boolean;
  /** Linhas vivas da Parte A do trimestre: livro `lalur` (IRPJ) ou `lacs` (CSLL). */
  linhasParteA: { codigo: string; valorCents: bigint }[];
  /** Existe `LalurParteBClosing` da unidade × ano × trimestre (mesma pré-condição da ECF). */
  parteBFechada: boolean;
  perfil: { ecfIndAliqCsll: string | null; lucroRealObrigatorio: boolean | null };
  deducoes: DeducaoInformada[];
}

const F_M300 = 'ECF Leiaute 12, Tabela Dinâmica M300A/M350A (TIPO LANÇ A/E/P)';

/**
 * Item 10 (A5) — Real trimestral. L = resultado (já antes da CSLL: a linha 9 `CA` da M300A não se soma) + Σ linhas
 * `A` − Σ linhas `E`; C = Σ linhas `P` (173/174). D6: L > 0 e C > arred(30% × L), ou L ≤ 0 e C > 0 ⇒ 400 por tributo.
 * Lucro real = L − C; ≤ 0 ⇒ imposto 0 (o prejuízo é da Parte B).
 */
export function apurarRealTrimestral(e: EntradaReal): ResultadoApuracao {
  if (!e.parteBFechada) {
    throw new ValidationError(`Feche a Parte B do e-Lalur/e-Lacs de ${e.periodo}/${e.ano} antes de apurar o Real (mesma pré-condição da ECF).`);
  }
  let codigoReceita: string;
  if (e.tributo === 'IRPJ') {
    if (e.perfil.lucroRealObrigatorio === null) {
      throw new ValidationError('perfil incompleto: informe lucroRealObrigatorio no perfil fiscal da empresa do ano (código 0220 × 3373).');
    }
    codigoReceita = e.perfil.lucroRealObrigatorio ? CODIGOS_RECEITA.IRPJ_REAL_TRIMESTRAL_OBRIGADA : CODIGOS_RECEITA.IRPJ_REAL_TRIMESTRAL_OPTANTE;
  } else {
    codigoReceita = CODIGOS_RECEITA.CSLL_REAL_TRIMESTRAL;
  }
  const aliqCsll = e.tributo === 'CSLL' ? aliquotaCsll(e.perfil.ecfIndAliqCsll) : null;
  const livro = e.tributo === 'IRPJ' ? 'lalur' : 'lacs';
  const dataFim = fimDoTrimestre(e.ano, e.periodo);

  let adicoes = 0n;
  let exclusoes = 0n;
  let compensacao = 0n;
  const linhasP: string[] = [];
  for (const l of e.linhasParteA) {
    const cat = findLinha(livro, l.codigo);
    if (!cat || cat.tipo !== 'E') throw new ValidationError(`linha ${livro}/${l.codigo} não é linha de entrada (E) da tabela dinâmica.`);
    if (cat.tipoLanc === 'A') adicoes += l.valorCents;
    else if (cat.tipoLanc === 'E') exclusoes += l.valorCents;
    else if (cat.tipoLanc === 'P') {
      compensacao += l.valorCents;
      if (l.valorCents > 0n) linhasP.push(l.codigo);
    } else throw new ValidationError(`linha ${livro}/${l.codigo} tem TIPO LANÇ ${cat.tipoLanc} — fora de A/E/P.`);
  }
  const lucroAjustado = e.resultadoAntesCents + adicoes - exclusoes;
  const teto = linhaVigente('COMPENSACAO_TETO', dataFim)!;
  const tetoCents = lucroAjustado > 0n ? mulBp(lucroAjustado, teto.valor) : 0n;
  if (compensacao > tetoCents) {
    throw new ValidationError(
      `${e.tributo}: compensação de ${compensacao} centavos (linha(s) ${livro}/${linhasP.join(', ')}) acima do teto de ${tetoCents} centavos ` +
        `(${teto.valor / 100}% do lucro ajustado de ${lucroAjustado} centavos — ${teto.fonte}).`,
    );
  }
  const base = maxZero(lucroAjustado - compensacao);
  const memoria: MemoriaLinha[] = [
    linha('LAIR', 'Resultado antes de IRPJ/CSLL no trimestre (sem encerramento, sem as despesas da provisão)', e.resultadoAntesCents, 'ADR-INCR-TAX-ASSESSMENT D4'),
  ];
  if (!e.contasProvisaoConfiguradas) {
    memoria.push(linha('GUARDA_CIRCULARIDADE', 'guarda de circularidade sem contas configuradas', 0n, 'BRIEF X7 item 7'));
  }
  memoria.push(
    linha('ADICOES', `Σ linhas A do ${livro}`, adicoes, F_M300),
    linha('EXCLUSOES', `Σ linhas E do ${livro}`, exclusoes, F_M300),
    linha('LUCRO_AJUSTADO', 'Lucro ajustado (LAIR + adições − exclusões)', lucroAjustado, F_M300),
    linha('COMPENSACAO', `Σ linhas P do ${livro}`, compensacao, F_M300),
    linha('COMPENSACAO_TETO', `${teto.valor / 100}% do lucro ajustado`, tetoCents, teto.fonte),
    linha('BASE', 'Lucro real / base de cálculo (≥ 0)', base, F_M300),
  );
  const imposto = impostoSobreBase(e.tributo, dataFim, base, aliqCsll);
  memoria.push(...imposto.memoria);
  return fecharComDeducoes(e.tributo, 'REAL_TRIMESTRAL', codigoReceita, base, imposto.devidoCents, 0n, e.deducoes, memoria);
}

// ─── Item 11 — deduções (F-X7-11 a) + excedente (F-TA-9 a / § 7º) ────────────────────────────────────────────

/**
 * a pagar = max(0, devido − deduções − dedução do § 5º); o que sobrar vai para `saldoNegativoCents` com a linha
 * SALDO_NEGATIVO (restituição/compensação fora do sistema — F-TA-9 a; IN 2.305 art. 15 § 7º). Só as deduções do
 * próprio tributo entram. Incentivos (PAT etc.) ficam fora, declarados (ADR F-X7-11).
 */
function fecharComDeducoes(
  tributo: TributoApuracao,
  modo: ModoApuracao,
  codigoReceita: string,
  base: bigint,
  devido: bigint,
  acertoT04: bigint,
  deducoes: DeducaoInformada[],
  memoria: MemoriaLinha[],
): ResultadoApuracao {
  let deducoesCents = 0n;
  deducoes
    .filter((d) => d.tributo === tributo)
    .forEach((d, i) => {
      const v = BigInt(d.valorCents);
      deducoesCents += v;
      memoria.push(linha(`DEDUCAO_${i + 1}`, `${d.tipo}${d.documento ? ` — ${d.documento}` : ''}`, v, 'Lei 9.430/1996 art. 2º § 4º III; ADR F-X7-11 (a)'));
    });
  const liquido = devido - deducoesCents - acertoT04;
  const aPagar = maxZero(liquido);
  const saldoNegativo = maxZero(-liquido);
  memoria.push(linha('A_PAGAR', 'Valor a pagar', aPagar, `código de receita ${codigoReceita} (${CODIGOS_RECEITA_FONTE})`));
  if (saldoNegativo > 0n) {
    const fonte = acertoT04 > 0n ? 'IN RFB 2.305/2025 art. 15 § 7º — pedido fora do sistema' : 'F-TA-9 (a) — restituição/compensação fora do sistema';
    memoria.push(linha('SALDO_NEGATIVO', 'Deduções acima do devido — restituição/compensação fora do sistema', saldoNegativo, fonte));
  }
  return {
    tributo,
    modo,
    codigoReceita,
    baseCents: base,
    devidoCents: devido,
    deducoesCents,
    aPagarCents: aPagar,
    saldoNegativoCents: saldoNegativo,
    memoria,
    tabelaVersao: TAX_ASSESSMENT_TABELA_VERSAO,
  };
}
