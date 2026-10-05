import { ValidationError } from '../../../lib/errors';
import { LALUR_MESES, type LalurMes } from './Lalur.model';
import {
  ajustesParteA,
  aliquotaCsll,
  fecharComDeducoes,
  impostoSobreBase,
  linha,
  maxZero,
  somarDeducoes,
  temLinha,
  valorLinha,
  type DeducaoInformada,
  type MemoriaLinha,
  type ResultadoApuracao,
  type TributoApuracao,
} from './taxAssessmentCalc';
import { CODIGOS_RECEITA, CODIGOS_RECEITA_FONTE, TAX_ASSESSMENT_TABELA_VERSAO, linhaVigente, mulBp } from './taxAssessmentParams';

/**
 * BE-INCR-TAX-ASSESSMENT Fase B PR-1 (nó X7, BRIEF B itens 3, 7, 8, 9, 10; F-TB-8 a) — funções PURAS do Lucro Real
 * anual: estimativa mensal por receita bruta (com o 16% do prestador exclusivo), balancete de suspensão/redução e
 * ajuste anual. Sem I/O: quem lê razão, perfil, e-Lalur e as linhas confirmadas é o serviço do PR-3. Reusa a Fase A
 * (`ajustesParteA`, `impostoSobreBase`, `fecharComDeducoes`) e a tabela versionada; erros de entrada = 400.
 *
 * O número só tem oráculo quando o X5 conciliar X7 × PVA mês a mês (P-B9): um teste verde prova a aritmética contra a
 * tabela, não contra a lei.
 */

export type ModoMensal = 'ESTIMATIVA_RECEITA' | 'BALANCETE_SUSPENSAO_REDUCAO';

/** Linha `CONFIRMED` de um mês `A0k` do mesmo ano (F-TA-3 a aplicado a meses: o que foi confessado não se relê). */
export interface MesConfirmado {
  id: string;
  periodo: LalurMes;
  tributo: TributoApuracao;
  modo: ModoMensal;
  devidoCents: bigint;
  deducoesCents: bigint;
  aPagarCents: bigint;
  diferencaPostergadaCents: bigint;
  memoria: MemoriaLinha[];
}

export interface PerfilApuracaoAnual {
  ecfIndAliqCsll: string | null;
  lucroRealObrigatorio: boolean | null;
  prestadoraExclusivaServicos: boolean;
  inicioAtividadeEm: string | null;
  encerramentoAtividadeEm: string | null;
}

/** `ResultadoApuracao` + a diferença postergada do 16% (item 9; só IRPJ, só no mês do excesso). */
export interface ResultadoApuracaoAnual extends ResultadoApuracao {
  diferencaPostergadaCents: bigint;
}

// ─── helpers ────────────────────────────────────────────────────────────────────────────────────────────────

const numMes = (p: LalurMes): number => LALUR_MESES.indexOf(p) + 1;
const nomeMes = (m: number): LalurMes => LALUR_MESES[m - 1];
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Último dia do mês (date-only) — a data em que a tabela de parâmetros é consultada. */
export function fimDoMes(ano: number, m: number): string {
  return new Date(Date.UTC(ano, m, 0)).toISOString().slice(0, 10);
}

/** Meses do ano (1..12) que tocam [início, encerramento] de atividade (F-TA-4 b). Datas nulas = o ano inteiro. */
export function mesesEmAtividade(ano: number, inicioAtividadeEm: string | null, encerramentoAtividadeEm: string | null): number[] {
  const ini = inicioAtividadeEm ?? `${ano}-01-01`;
  const fim = encerramentoAtividadeEm ?? `${ano}-12-31`;
  return Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => `${ano}-${pad2(m)}-01` <= fim && fimDoMes(ano, m) >= ini);
}

function assertMesEmAtividade(ano: number, m: number, perfil: PerfilApuracaoAnual): number[] {
  const meses = mesesEmAtividade(ano, perfil.inicioAtividadeEm, perfil.encerramentoAtividadeEm);
  if (!meses.includes(m)) throw new ValidationError(`${nomeMes(m)}/${ano} está fora do período de atividade da PJ (F-TA-4 b).`);
  return meses;
}

// ─── Item 3 — códigos de receita (ADR §3; obrigada × optante pelo `lucroRealObrigatorio`) ───────────────────

export type CodigoAnual = 'ESTIMATIVA' | 'AJUSTE_ANUAL' | 'DIFERENCA_POSTERGADA_16';

/**
 * Item 3. A estimativa por receita bruta e o balancete usam o código da estimativa (P-B2). IRPJ com
 * `lucroRealObrigatorio` nulo ⇒ 400 (A-1); a diferença postergada do 16% é só do IRPJ (item 9).
 */
export function codigoReceitaAnual(tributo: TributoApuracao, codigo: CodigoAnual, lucroRealObrigatorio: boolean | null): string {
  if (tributo === 'CSLL') {
    if (codigo === 'DIFERENCA_POSTERGADA_16') throw new Error('codigoReceitaAnual: a diferença postergada do 16% é só do IRPJ');
    return codigo === 'ESTIMATIVA' ? CODIGOS_RECEITA.CSLL_ESTIMATIVA : CODIGOS_RECEITA.CSLL_AJUSTE_ANUAL;
  }
  if (lucroRealObrigatorio === null) {
    throw new ValidationError('perfil incompleto: informe lucroRealObrigatorio no perfil fiscal da empresa do ano (código obrigada × optante).');
  }
  const o = lucroRealObrigatorio;
  if (codigo === 'ESTIMATIVA') return o ? CODIGOS_RECEITA.IRPJ_ESTIMATIVA_OBRIGADA : CODIGOS_RECEITA.IRPJ_ESTIMATIVA_OPTANTE;
  if (codigo === 'AJUSTE_ANUAL') return o ? CODIGOS_RECEITA.IRPJ_AJUSTE_ANUAL_OBRIGADA : CODIGOS_RECEITA.IRPJ_AJUSTE_ANUAL_OPTANTE;
  return o ? CODIGOS_RECEITA.IRPJ_DIFERENCA_POSTERGADA_16_OBRIGADA : CODIGOS_RECEITA.IRPJ_DIFERENCA_POSTERGADA_16_OPTANTE;
}

// ─── Itens 7 e 9 — estimativa por receita bruta (B2) + 16% do prestador exclusivo (F-TB-5 b) ─────────────────

const F_ART2 = 'Lei 9.430/1996 art. 2º; IN RFB 1.700/2017 arts. 33, 34 e 38';
const F_16_8 = 'IN RFB 1.700/2017 art. 33 § 8º';

export interface ReceitaMes {
  periodo: LalurMes;
  servicoCents: bigint;
  revendaCents: bigint;
}

export interface EntradaEstimativa {
  ano: number;
  periodo: LalurMes;
  tributo: TributoApuracao;
  /** Item 5 — `receitaBrutaPorAtividade` do MÊS (`mesBounds`), com o gate de exaustividade já rodado. */
  receitaServicoCents: bigint;
  receitaRevendaCents: bigint;
  /** Item 9 — receita dos meses em atividade ANTERIORES do ano, mês a mês (só o 16% lê). */
  receitasMesesAnteriores: ReceitaMes[];
  /** Item 9 — meses `CONFIRMED` do ano, do mesmo tributo (só a diferença postergada lê). */
  confirmados: MesConfirmado[];
  perfil: PerfilApuracaoAnual;
  deducoes: DeducaoInformada[];
}

/**
 * Item 7 (B2) — `A0m`, modo `RECEITA_BRUTA`. Base IRPJ = Σ por atividade (receita do mês × `PRESUNCAO_IRPJ`), ou o
 * 16% do item 9; IRPJ = 15% + 10% × max(0, base − 20.000,00 × 1) (Lei 9.430 art. 2º §§ 1º–2º; IN 1.700 art. 42); CSLL =
 * alíquota do perfil × Σ (receita × `PRESUNCAO_CSLL`) (IN 1.700 arts. 34 e 45). Sem acréscimo da LC 224 (P-B3). Não
 * lê o e-Lalur nem o devido dos meses anteriores: é a garantia, por construção, do art. 47 § 2º.
 *
 * Item 9 (IN 1.700 art. 33 §§ 7º–10; Lei 9.250 art. 40) — só IRPJ: com `prestadoraExclusivaServicos`, receita de
 * revenda no ano até m ⇒ 400; receita acumulada do ano até m ≤ limite ⇒ 16%, acima ⇒ 32%. No mês do excesso m* (a 1ª
 * vez que a acumulada passa do limite), grava `diferencaPostergadaCents` = Σ, para cada mês k < m* confirmado por
 * receita bruta a 16%, de [IRPJ(k) a 32%, adicional de 1 mês incluído] − `devidoCents(k)` (§ 8º). Meses por balancete
 * ficam fora (a base deles é o lucro real).
 */
export function apurarEstimativaReceitaBruta(e: EntradaEstimativa): ResultadoApuracaoAnual {
  const m = numMes(e.periodo);
  assertMesEmAtividade(e.ano, m, e.perfil);
  const codigoReceita = codigoReceitaAnual(e.tributo, 'ESTIMATIVA', e.perfil.lucroRealObrigatorio);
  const aliqCsll = e.tributo === 'CSLL' ? aliquotaCsll(e.perfil.ecfIndAliqCsll) : null;
  const dataFim = fimDoMes(e.ano, m);
  const chave = e.tributo === 'IRPJ' ? 'PRESUNCAO_IRPJ' : 'PRESUNCAO_CSLL';
  const pS = linhaVigente(chave, dataFim, 'SERVICO')!;
  const pR = linhaVigente(chave, dataFim, 'REVENDA')!;

  const memoria: MemoriaLinha[] = [
    linha('RECEITA_SERVICO', 'Receita bruta de serviço do mês (conta 3.1)', e.receitaServicoCents, F_ART2),
    linha('RECEITA_REVENDA', 'Receita bruta de revenda do mês (conta 3.3)', e.receitaRevendaCents, F_ART2),
    linha('RECEITA_MES', 'Receita bruta do mês', e.receitaServicoCents + e.receitaRevendaCents, F_ART2),
  ];

  let presServico = mulBp(e.receitaServicoCents, pS.valor);
  let codigoServico = 'PRESUNCAO_SERVICO';
  let descServico = `Receita de serviço × ${pS.valor / 100}%`;
  let fonteServico = pS.fonte;
  let diferenca: { total: bigint; linhas: MemoriaLinha[] } | null = null;

  if (e.tributo === 'IRPJ' && e.perfil.prestadoraExclusivaServicos) {
    const anteriores = e.receitasMesesAnteriores.filter((r) => numMes(r.periodo) < m);
    const revendaAno = anteriores.reduce((s, r) => s + r.revendaCents, 0n) + e.receitaRevendaCents;
    if (revendaAno > 0n) {
      throw new ValidationError(
        'declarou prestadora exclusiva de serviços, mas há receita de revenda no ano — exclusividade é condição do 16% (IN RFB 1.700/2017 art. 33 § 7º).',
      );
    }
    const acumuladaAnterior = anteriores.reduce((s, r) => s + r.servicoCents + r.revendaCents, 0n);
    const acumulada = acumuladaAnterior + e.receitaServicoCents + e.receitaRevendaCents;
    const limite = linhaVigente('RECEITA_LIMITE_REDUZIDA_ANO_CENTS', dataFim)!;
    const reduzida = linhaVigente('PRESUNCAO_IRPJ_REDUZIDA', dataFim)!;
    memoria.push(linha('RECEITA_ACUMULADA_ANO', `Receita bruta acumulada do ano até ${e.periodo} (limite ${limite.valor} centavos)`, acumulada, limite.fonte));
    if (acumulada <= BigInt(limite.valor)) {
      presServico = mulBp(e.receitaServicoCents, reduzida.valor);
      codigoServico = 'PRESUNCAO_REDUZIDA_16';
      descServico = `Receita de serviço × ${reduzida.valor / 100}% (prestadora exclusiva, acumulada ≤ limite)`;
      fonteServico = reduzida.fonte;
    } else if (acumuladaAnterior <= BigInt(limite.valor)) {
      diferenca = diferencaPostergada16(e.ano, e.confirmados, m);
    }
  }

  const presRevenda = mulBp(e.receitaRevendaCents, pR.valor);
  const base = presServico + presRevenda;
  memoria.push(
    linha(codigoServico, descServico, presServico, fonteServico),
    linha('PRESUNCAO_REVENDA', `Receita de revenda × ${pR.valor / 100}%`, presRevenda, pR.fonte),
    linha('BASE', 'Base de cálculo estimada do mês', base, F_ART2),
  );
  const imposto = impostoSobreBase(e.tributo, dataFim, base, aliqCsll, 1n);
  memoria.push(...imposto.memoria);
  const r = fecharComDeducoes(e.tributo, 'ESTIMATIVA_RECEITA', codigoReceita, base, imposto.devidoCents, 0n, e.deducoes, memoria);
  if (diferenca) r.memoria.push(...memoriaDiferenca(diferenca, e.ano, m, e.perfil.lucroRealObrigatorio));
  return { ...r, diferencaPostergadaCents: diferenca?.total ?? 0n };
}

function memoriaDiferenca(d: { total: bigint; linhas: MemoriaLinha[] }, ano: number, m: number, lucroRealObrigatorio: boolean | null): MemoriaLinha[] {
  const cod = codigoReceitaAnual('IRPJ', 'DIFERENCA_POSTERGADA_16', lucroRealObrigatorio);
  const mesSeguinte = m === 12 ? `01/${ano + 1}` : `${pad2(m + 1)}/${ano}`;
  return [
    ...d.linhas,
    linha('DIFERENCA_POSTERGADA', `Diferença do imposto postergado (código de receita ${cod})`, d.total, F_16_8),
    linha('DIFERENCA_POSTERGADA_VENCIMENTO', `Vencimento: último dia útil de ${mesSeguinte}, sem acréscimos no prazo (informativo)`, 0n, 'IN RFB 1.700/2017 art. 33 §§ 9º–10'),
  ];
}

/** Item 9 — § 8º: "em relação a cada mês transcorrido", lido das memórias confirmadas (mesma razão do F-TA-3 a). */
function diferencaPostergada16(ano: number, confirmados: MesConfirmado[], mExcesso: number): { total: bigint; linhas: MemoriaLinha[] } {
  let total = 0n;
  const linhas: MemoriaLinha[] = [];
  const meses = confirmados
    .filter((c) => c.tributo === 'IRPJ' && c.modo === 'ESTIMATIVA_RECEITA' && numMes(c.periodo) < mExcesso && temLinha(c.memoria, 'PRESUNCAO_REDUZIDA_16'))
    .sort((a, b) => numMes(a.periodo) - numMes(b.periodo));
  for (const c of meses) {
    const k = numMes(c.periodo);
    const dataFimK = fimDoMes(ano, k);
    const pS = linhaVigente('PRESUNCAO_IRPJ', dataFimK, 'SERVICO')!;
    const base32 = mulBp(valorLinha(c.memoria, 'RECEITA_SERVICO', c.periodo), pS.valor);
    const devido32 = impostoSobreBase('IRPJ', dataFimK, base32, null, 1n).devidoCents;
    const dif = devido32 - c.devidoCents;
    total += dif;
    linhas.push(
      linha(`DIFERENCA_POSTERGADA_${c.periodo}`, `${c.periodo}: IRPJ a ${pS.valor / 100}% (${devido32} centavos) − devido confirmado (${c.devidoCents} centavos)`, dif, F_16_8),
    );
  }
  return { total, linhas };
}

// ─── Item 8 — balancete de suspensão/redução (B3) ────────────────────────────────────────────────────────────

export interface EntradaBalancete {
  ano: number;
  periodo: LalurMes;
  tributo: TributoApuracao;
  /** Item 6 — `resultadoAntesIrpjCsll` do PERÍODO EM CURSO (`periodoBounds(ano, 'A0m')`). */
  resultadoAntesCents: bigint;
  contasProvisaoConfiguradas: boolean;
  /** Linhas vivas da Parte A com `quarter = 'A0m'`: livro `lalur` (IRPJ) ou `lacs` (CSLL). */
  linhasParteA: { codigo: string; valorCents: bigint }[];
  /** Meses `CONFIRMED` do ano, do mesmo tributo (entram só os anteriores a m). */
  anteriores: MesConfirmado[];
  perfil: PerfilApuracaoAnual;
  deducoes: DeducaoInformada[];
  /**
   * X7 Fase B PR-3 (decisão do dono 05/10, [[D-2026-10-05-X7-FASE-B-PR3-LACUNAS]] 1) — receita do mês m e dos meses
   * anteriores do ano: só o IRPJ do prestador exclusivo lê, para achar o mês do excesso m* do 16% (item 9).
   */
  receitaMes?: ReceitaMes;
  receitasMesesAnteriores?: ReceitaMes[];
}

/**
 * Item 8 (B3) — `A0m`, modo `BALANCETE`. L/C/D6 pela Parte A da Fase A, com o LAIR do período em curso. Devido do
 * período em curso: IRPJ = 15% × base + 10% × max(0, base − 20.000,00 × n), n = meses do período em curso (IN 1.700
 * art. 49 II e art. 29 § 1º; P-B4); CSLL = alíquota × base. Anteriores = Σ (`devidoCents` + `diferencaPostergadaCents`)
 * dos meses confirmados 01..m−1 — o DEVIDO, não o pago (IN 1.700 art. 47 § 5º I / § 6º I; P-B1, P-B6). Devido do mês
 * = max(0, período − anteriores): 0 ⇒ `SUSPENSAO` (art. 47 I/III; prejuízo desde janeiro, art. 48 p.ú., cai aqui);
 * > 0 ⇒ `REDUCAO` (II/IV). O gate de fechamento dos meses anteriores é do item 15 (PR-3); o teto pela Parte B, do
 * item 12 (PR-2).
 *
 * Mês do excesso por balancete (decisão do dono 05/10, contra a recomendação de 400): se m é o m* do 16% (prestador
 * exclusivo, receita acumulada passa do limite em m), o balancete CALCULA e grava a diferença postergada dos meses
 * k < m* confirmados a 16% (IN 1.700 art. 33 § 8º), com a mesma conta do item 9; ela entra nos "anteriores" dos
 * balancetes seguintes. Se o balancete já absorve a diferença (cobrança em dobro) é o P-B6, do contador.
 */
export function apurarBalancete(e: EntradaBalancete): ResultadoApuracaoAnual {
  const m = numMes(e.periodo);
  const ativos = assertMesEmAtividade(e.ano, m, e.perfil);
  const codigoReceita = codigoReceitaAnual(e.tributo, 'ESTIMATIVA', e.perfil.lucroRealObrigatorio);
  const aliqCsll = e.tributo === 'CSLL' ? aliquotaCsll(e.perfil.ecfIndAliqCsll) : null;
  const dataFim = fimDoMes(e.ano, m);
  const n = m - ativos[0] + 1;

  const ajustes = ajustesParteA(e.tributo, e.resultadoAntesCents, e.linhasParteA, dataFim);
  const memoria: MemoriaLinha[] = [
    linha('LAIR_PERIODO_EM_CURSO', `Resultado antes de IRPJ/CSLL de ${nomeMes(ativos[0])} a ${e.periodo} (sem encerramento, sem as despesas da provisão)`, e.resultadoAntesCents, 'IN RFB 1.700/2017 art. 49 I e § 1º'),
  ];
  if (!e.contasProvisaoConfiguradas) {
    memoria.push(linha('GUARDA_CIRCULARIDADE', 'guarda de circularidade sem contas configuradas', 0n, 'BRIEF X7 item 7'));
  }
  memoria.push(...ajustes.memoria, linha('MESES_PERIODO', `Meses do período em curso (quantidade, não centavos)`, BigInt(n), 'IN RFB 1.700/2017 art. 29 § 1º; art. 49 II'));
  const periodo = impostoSobreBase(e.tributo, dataFim, ajustes.base, aliqCsll, BigInt(n), 'DEVIDO_PERIODO_EM_CURSO');
  memoria.push(...periodo.memoria);

  const lidos = e.anteriores.filter((c) => c.tributo === e.tributo && numMes(c.periodo) < m).sort((a, b) => numMes(a.periodo) - numMes(b.periodo));
  const anteriores = lidos.reduce((s, c) => s + c.devidoCents + c.diferencaPostergadaCents, 0n);
  memoria.push(
    linha(
      'DEVIDO_MESES_ANTERIORES',
      `Σ devido confirmado dos meses anteriores (${lidos.map((c) => `${c.periodo}:${c.id}`).join(', ') || 'nenhum'})`,
      anteriores,
      'IN RFB 1.700/2017 art. 47 § 5º I / § 6º I',
    ),
  );
  const devidoMes = maxZero(periodo.devidoCents - anteriores);
  memoria.push(
    devidoMes === 0n
      ? linha('SUSPENSAO', 'Devido do período em curso ≤ devido dos meses anteriores: pagamento suspenso', 0n, 'IN RFB 1.700/2017 art. 47 I e III; art. 48 p.ú.')
      : linha('REDUCAO', 'Devido do mês = devido do período em curso − devido dos meses anteriores', devidoMes, 'IN RFB 1.700/2017 art. 47 II e IV'),
  );
  const r = fecharComDeducoes(e.tributo, 'BALANCETE_SUSPENSAO_REDUCAO', codigoReceita, ajustes.base, devidoMes, 0n, e.deducoes, memoria);
  const diferenca = e.tributo === 'IRPJ' && e.perfil.prestadoraExclusivaServicos && e.receitaMes ? excessoNoBalancete(e, m, dataFim, r.memoria) : null;
  if (diferenca) r.memoria.push(...memoriaDiferenca(diferenca, e.ano, m, e.perfil.lucroRealObrigatorio));
  return { ...r, diferencaPostergadaCents: diferenca?.total ?? 0n };
}

/** Decisão 1 do PR-3: a diferença do § 8º quando m é o mês do excesso (mesma regra de m* do item 9); senão null. */
function excessoNoBalancete(e: EntradaBalancete, m: number, dataFim: string, memoria: MemoriaLinha[]): { total: bigint; linhas: MemoriaLinha[] } | null {
  const anteriores = (e.receitasMesesAnteriores ?? []).filter((r) => numMes(r.periodo) < m);
  const acumuladaAnterior = anteriores.reduce((s, r) => s + r.servicoCents + r.revendaCents, 0n);
  const acumulada = acumuladaAnterior + e.receitaMes!.servicoCents + e.receitaMes!.revendaCents;
  const limite = linhaVigente('RECEITA_LIMITE_REDUZIDA_ANO_CENTS', dataFim)!;
  if (!(acumuladaAnterior <= BigInt(limite.valor) && acumulada > BigInt(limite.valor))) return null;
  memoria.push(linha('RECEITA_ACUMULADA_ANO', `Receita bruta acumulada do ano até ${e.periodo} (limite ${limite.valor} centavos)`, acumulada, limite.fonte));
  return diferencaPostergada16(e.ano, e.anteriores, m);
}

// ─── Item 10 — ajuste anual (B6; F-TB-2 b) ───────────────────────────────────────────────────────────────────

export interface EstimativaPaga {
  periodo: LalurMes;
  tributo: TributoApuracao;
  valorCents: string;
}

export interface EntradaAjusteAnual {
  ano: number;
  tributo: TributoApuracao;
  /** Item 6 — `resultadoAntesIrpjCsll` do ano (`periodoBounds(ano, 'A00')`). */
  resultadoAntesCents: bigint;
  contasProvisaoConfiguradas: boolean;
  /** Linhas vivas da Parte A com `quarter = 'A00'`. */
  linhasParteA: { codigo: string; valorCents: bigint }[];
  /** Existe o `LalurParteBClosing` do `A00` (mesma pré-condição do A-10). */
  parteBFechada: boolean;
  /** Meses `CONFIRMED` do ano, do mesmo tributo. */
  meses: MesConfirmado[];
  /** F-TB-2 (b) — o pago informado por mês; ausente ⇒ assume o confirmado. */
  estimativasPagas?: EstimativaPaga[];
  perfil: PerfilApuracaoAnual;
  /** A-11 — o retido do ano ainda não deduzido. */
  deducoes: DeducaoInformada[];
}

const F_ART2_4 = 'Lei 9.430/1996 art. 2º § 4º';
/** Código da linha da memória do `A00` com o valor (com sinal) da provisão do ajuste — item 16. */
export const PROVISAO_AJUSTE_ANUAL = 'PROVISAO_AJUSTE_ANUAL';

/**
 * Item 10 (B6) — `A00`, modo `AJUSTE_ANUAL`. Pré-condições: todos os meses em atividade confirmados e a Parte B do
 * `A00` fechada. L/C/D6 pela Parte A. Devido: IRPJ = 15% + 10% × max(0, base − 20.000,00 × meses em atividade) (D7);
 * CSLL = alíquota do perfil. Deduções (Lei 9.430 art. 2º § 4º): (IV) as estimativas PAGAS — informadas, ou o
 * `aPagarCents + diferencaPostergadaCents` confirmado do mês com a linha `ESTIMATIVA_PAGA_ASSUMIDA` (P-B10); pago menor
 * que o confirmado ⇒ `ESTIMATIVA_NAO_PAGA` e a diferença não é deduzida; (III) o retido já usado nos meses
 * (`RETIDO_MESES`, para o pago + o retido reconstruírem o devido mensal, nunca em dobro) e o retido do ano (A-11).
 * Saldo > 0 ⇒ a pagar (quota única até o último dia útil de março, Selic desde 1º/fev — art. 6º §§ 1º–2º); < 0 ⇒
 * `saldoNegativoCents` (art. 6º § 1º II), restituição/compensação fora do sistema.
 */
export function apurarAjusteAnual(e: EntradaAjusteAnual): ResultadoApuracaoAnual {
  if (!e.parteBFechada) {
    throw new ValidationError(`Feche a Parte B do e-Lalur/e-Lacs de A00/${e.ano} antes do ajuste anual (mesma pré-condição da ECF).`);
  }
  const ativos = mesesEmAtividade(e.ano, e.perfil.inicioAtividadeEm, e.perfil.encerramentoAtividadeEm);
  const meses = e.meses.filter((c) => c.tributo === e.tributo && ativos.includes(numMes(c.periodo)));
  const faltam = ativos.filter((k) => !meses.some((c) => numMes(c.periodo) === k)).map(nomeMes);
  if (faltam.length > 0) {
    throw new ValidationError(`${e.tributo}: confirme os meses em atividade antes do ajuste anual de ${e.ano} — faltam ${faltam.join(', ')}.`);
  }
  const codigoReceita = codigoReceitaAnual(e.tributo, 'AJUSTE_ANUAL', e.perfil.lucroRealObrigatorio);
  const aliqCsll = e.tributo === 'CSLL' ? aliquotaCsll(e.perfil.ecfIndAliqCsll) : null;
  const dataFim = `${e.ano}-12-31`;

  const ajustes = ajustesParteA(e.tributo, e.resultadoAntesCents, e.linhasParteA, dataFim);
  const memoria: MemoriaLinha[] = [
    linha('LAIR', 'Resultado antes de IRPJ/CSLL do ano (sem encerramento, sem as despesas da provisão)', e.resultadoAntesCents, 'IN RFB 1.700/2017 art. 31 §§ 3º–4º'),
  ];
  if (!e.contasProvisaoConfiguradas) {
    memoria.push(linha('GUARDA_CIRCULARIDADE', 'guarda de circularidade sem contas configuradas', 0n, 'BRIEF X7 item 7'));
  }
  memoria.push(...ajustes.memoria);
  const imposto = impostoSobreBase(e.tributo, dataFim, ajustes.base, aliqCsll, BigInt(ativos.length));
  memoria.push(...imposto.memoria);

  // (IV) estimativas pagas
  let pagas = 0n;
  let assumidas = 0n;
  let naoPagas = 0n;
  const mesesAssumidos: string[] = [];
  const mesesNaoPagos: string[] = [];
  for (const c of [...meses].sort((a, b) => numMes(a.periodo) - numMes(b.periodo))) {
    const confirmado = c.aPagarCents + c.diferencaPostergadaCents;
    const informado = e.estimativasPagas?.find((p) => p.periodo === c.periodo && p.tributo === e.tributo);
    const pago = informado ? BigInt(informado.valorCents) : confirmado;
    if (!informado) {
      assumidas += confirmado;
      mesesAssumidos.push(c.periodo);
    } else if (pago < confirmado) {
      naoPagas += confirmado - pago;
      mesesNaoPagos.push(c.periodo);
    }
    pagas += pago;
    memoria.push(linha(`ESTIMATIVA_PAGA_${c.periodo}`, `${c.periodo}: estimativa ${informado ? 'paga (informada)' : 'assumida paga = confirmado'}`, pago, `${F_ART2_4} IV`));
  }
  if (mesesAssumidos.length > 0) {
    memoria.push(linha('ESTIMATIVA_PAGA_ASSUMIDA', `Pago não informado — assumido o confirmado de ${mesesAssumidos.join(', ')} (P-B10)`, assumidas, 'BRIEF X7 B item 10; F-TB-2 (b)'));
  }
  if (mesesNaoPagos.length > 0) {
    memoria.push(
      linha('ESTIMATIVA_NAO_PAGA', `Estimativa paga a menor em ${mesesNaoPagos.join(', ')} — a diferença não é deduzida (multa isolada, não modelada)`, naoPagas, 'IN RFB 1.700/2017 art. 52'),
    );
  }
  // (III) retido já usado nos meses + o do ano
  const retidoMeses = meses.reduce((s, c) => s + c.deducoesCents, 0n);
  memoria.push(linha('RETIDO_MESES', 'Retenções já deduzidas nas estimativas mensais confirmadas', retidoMeses, `${F_ART2_4} III`));
  const retidoAno = somarDeducoes(e.tributo, e.deducoes, memoria);

  const deducoesCents = pagas + retidoMeses + retidoAno;
  const saldo = imposto.devidoCents - deducoesCents;
  const aPagar = maxZero(saldo);
  const saldoNegativo = maxZero(-saldo);
  memoria.push(
    linha('SALDO_AJUSTE', 'Devido anual − estimativas pagas − retenções', saldo, F_ART2_4),
    linha('A_PAGAR', 'Valor a pagar', aPagar, `código de receita ${codigoReceita} (${CODIGOS_RECEITA_FONTE})`),
  );
  if (aPagar > 0n) {
    memoria.push(linha('VENCIMENTO_QUOTA_UNICA', `Quota única até o último dia útil de março/${e.ano + 1}, Selic desde 1º/fev (informativo)`, 0n, 'Lei 9.430/1996 art. 6º §§ 1º–2º'));
  }
  if (saldoNegativo > 0n) {
    memoria.push(linha('SALDO_NEGATIVO', 'Saldo negativo — restituição/compensação fora do sistema', saldoNegativo, 'Lei 9.430/1996 art. 6º § 1º II'));
  }
  // X7 Fase B PR-3 (item 16, F-TB-3 a): o A00 provisiona só a diferença entre o devido anual e o que os meses já
  // provisionaram (devido + diferença postergada). Com sinal: > 0 ⇒ D despesa / C a recolher; < 0 ⇒ D saldo negativo
  // a compensar / C despesa; 0 ⇒ nada.
  const provisionadoMeses = meses.reduce((s, c) => s + c.devidoCents + c.diferencaPostergadaCents, 0n);
  memoria.push(
    linha(PROVISAO_AJUSTE_ANUAL, 'Provisão do ajuste = devido anual − Σ (devido + diferença postergada) dos meses confirmados', imposto.devidoCents - provisionadoMeses, 'BRIEF X7 B item 16; F-TB-3 (a)'),
  );
  return {
    tributo: e.tributo,
    modo: 'AJUSTE_ANUAL',
    codigoReceita,
    baseCents: ajustes.base,
    devidoCents: imposto.devidoCents,
    deducoesCents,
    aPagarCents: aPagar,
    saldoNegativoCents: saldoNegativo,
    diferencaPostergadaCents: 0n,
    memoria,
    tabelaVersao: TAX_ASSESSMENT_TABELA_VERSAO,
  };
}
