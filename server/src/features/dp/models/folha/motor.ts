/**
 * Motor da folha — BE-INCR-DP-F2 itens 34–45 (PR-4). Função pura sobre o snapshot (PR-3): o mesmo snapshot dá sempre o
 * mesmo resultado (F-DP-8: "o cálculo antigo se reproduz pelo snapshot gravado").
 *
 * Ordem de avaliação fixa (item 35; F-DP-5 revisto: sem grafo e sem intérprete), em `ETAPAS`: contratual por fatia →
 * informados → afastamento → derivados (DSR, complementos, salário-família) → bases → INSS → IRRF → FGTS (informativa)
 * → desconto do adiantamento → totais. Todo número de regra vem de `RegrasFolha` (item 67) ou de `ParametrosFolha` (G2);
 * as bases somam pela incidência de cada rubrica (G4), nunca pelo nome.
 *
 * Leituras do PR-4 que nenhum item fixa (corpo do PR; cada uma atrás de uma função nomeada):
 * - `versaoDeReferencia`: o salário-hora e a escala dos lançamentos sem data (HE, noturno, comissão, horas normais) são
 *   os da versão vigente no último dia do vínculo no mês; a falta, que tem data (L1), usa a versão do dia dela;
 * - `minimoDeReferencia`: o mínimo e o piso são proporcionais aos dias pagos pela empresa na base do mensalista, e à
 *   jornada só no tempo parcial (F-DPF-6) e no aprendiz (CLT art. 428 § 2º); a remuneração comparada é o salário, o
 *   afastamento pago pela empresa, a comissão e o DSR dela (G4 do dossiê; pergunta (7) do §5 ao contador);
 * - `horasTrabalhadas` (Súm. 340): dias de trabalho da escala no período × minutos por dia − faltas + HE;
 * - o DSR do horista sai na linha `DSR_VARIAVEIS`, junto com o DSR das variáveis;
 * - vínculo do mesmo trabalhador com pendência bloqueante bloqueia os seguintes (`OUTRO_VINCULO_PENDENTE`): o teto do
 *   INSS e a soma do IRRF dependem do anterior.
 */
import { SemLinhaVigenteError, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { ultimoDia, type Competencia } from '../competencia';
import type { JornadaApurada } from '../../ports/JornadaApuradaPort';
import { diasDoMes, minutosSemanaisDaEscala, repousoSemanal, type EscalaJornada } from '../escala';
import { conflitosComPonto } from '../lancamento';
import { parametroCctVigente } from '../cadastros';
import type { ParametrosFolha } from '../parametrosFolha';
import type { RegrasFolha } from '../regrasFolha';
import { DP_RUBRICAS, type RubricaCodigo } from '../rubricas/catalogo';
import { versaoVigente } from '../vigencia';
import type { CategoriaNucleo } from '../vinculo';
import { adiantamento } from './adiantamento';
import { no, type CalcNode, type Calculo, type Cents } from './calcNode';
import { fgtsDaCategoria, inssContribuinteIndividual, irrfMensal } from './encargos';
import { descontoFaltas, diasRepousoPerdidos, dsrPerdido } from './faltas';
import { fatiar, periodoNoMes, UNIDADE_SALARIO_MENSAL, type Fatia } from './fatiar';
import { fracao, inteiro, multiplicar, type Fracao } from './fracao';
import { inssComOutrasFontes, OUTRA_REMUNERACAO_CATEGORIAS, OUTRA_REMUNERACAO_ORDENS, type OutraRemuneracaoNoMes } from './outrasRemuneracoes';
import type { DpPendenciaCodigo, DpPendenciaFolha } from './pendencias';
import { diasDevidosMensalista, proporcionalMensalista, salarioHora, salarioHorista } from './salario';
import { salarioFamilia } from './salarioFamilia';
import {
  parametrosDeJson,
  regrasDeJson,
  sha256Canonico,
  type DpSnapshot,
  type Roteiro,
  type VersaoSnapshot,
  type VinculoSnapshot,
} from './snapshot';
import { adicionalAplicavel, adicionalNoturno, complementoMinimo, dsrDoHorista, dsrSobreVariaveis, horaExtra, pisoProporcional, valorInformado } from './variaveis';

/** Item 49 — sobe a cada mudança de regra do motor (a reprodução do item 53 compara). */
export const MOTOR_VERSAO = 'dp-f2-motor-1';

/** `undSalFixo` do S-2200 (L3, dono 21/11): 1 hora e 5 mês calculam; 7 (só variável) calcula com fixo zero. */
export const UNIDADE_SALARIO_HORA = '1';
export const UNIDADE_SALARIO_VARIAVEL = '7';
const UNIDADES_COM_REGRA = [UNIDADE_SALARIO_HORA, UNIDADE_SALARIO_MENSAL, UNIDADE_SALARIO_VARIAVEL] as const;
/** As categorias com jornada e salário-hora no núcleo (as rubricas de jornada são só delas). */
const CATEGORIAS_COM_JORNADA: readonly CategoriaNucleo[] = ['101', '103'];
const APRENDIZ: CategoriaNucleo = '103';
/** A linha contratual de cada categoria no mês (item 4); o horista usa `HORAS_NORMAIS` (L2). */
const LINHA_CONTRATUAL: Record<CategoriaNucleo, RubricaCodigo> = { '101': 'SALARIO_BASE', '103': 'SALARIO_BASE', '901': 'BOLSA_ESTAGIO', '723': 'PRO_LABORE' };

/** Item 35 — a ordem de avaliação, em código. O teste garante que toda rubrica do catálogo tem lugar nela. */
export const ETAPAS = [
  { etapa: 'CONTRATUAL', rubricas: ['SALARIO_BASE', 'BOLSA_ESTAGIO', 'PRO_LABORE', 'HORAS_NORMAIS', 'ADIANTAMENTO'] },
  { etapa: 'INFORMADOS', rubricas: ['HORA_EXTRA_50', 'HORA_EXTRA_100', 'ADICIONAL_NOTURNO', 'COMISSAO', 'FALTAS'] },
  { etapa: 'AFASTAMENTO', rubricas: ['AFASTAMENTO_EMPRESA_15D'] },
  { etapa: 'DERIVADOS', rubricas: ['DSR_VARIAVEIS', 'DSR_PERDIDO', 'COMPLEMENTO_MINIMO', 'COMPLEMENTO_PISO', 'SALARIO_FAMILIA'] },
  { etapa: 'BASES', rubricas: [] },
  { etapa: 'INSS', rubricas: ['INSS_SEGURADO'] },
  { etapa: 'IRRF', rubricas: ['IRRF'] },
  { etapa: 'FGTS', rubricas: ['FGTS_MES'] },
  { etapa: 'DESCONTO_ADIANTAMENTO', rubricas: ['DESCONTO_ADIANTAMENTO'] },
  { etapa: 'TOTAIS', rubricas: [] },
] as const satisfies ReadonlyArray<{ etapa: string; rubricas: readonly RubricaCodigo[] }>;

/** Códigos de incidência que somam à base (S-1010: `codIncCP`/`codIncFGTS` 11 e `codIncIRRF` 11 = base mensal). */
const INCIDENCIA_BASE = { cp: ['11'], irrf: ['11'], fgts: ['11'] } as const;

export interface LinhaFolha {
  rubrica: RubricaCodigo;
  tipo: 'PROVENTO' | 'DESCONTO' | 'INFORMATIVA';
  referencia?: { minutos?: number; dias?: number };
  valorCents: Cents;
}
export interface Bases {
  cp: Cents;
  irrf: Cents;
  fgts: Cents;
}
export interface ResultadoVinculo {
  vinculoId: string;
  linhas: LinhaFolha[];
  bases: Bases;
  totais: { proventos: Cents; descontos: Cents; liquido: Cents };
  prova: CalcNode;
  pendencias: DpPendenciaFolha[];
}

/** Item 41 — o que os vínculos anteriores do mesmo trabalhador já somaram na competência e no mês do pagamento. */
export interface AcumuladoDoTrabalhador {
  /** Bases de CP já tributadas (a faixa continua de onde parou; dossiê §5), por tipo de contribuição. */
  basesCp: Array<{ baseCents: Cents; categoria: (typeof OUTRA_REMUNERACAO_CATEGORIAS)[number] }>;
  irrfRendimentoCents: Cents;
  irrfRetidoCents: Cents;
  previdenciaCents: Cents;
  /**
   * Revisor do #1326 (A2): as outras remunerações `ANTES` registradas nos vínculos anteriores (item 78) também contam
   * para o teto dos seguintes; o pagamento anterior do mês de cada vínculo entra em `irrf*` acima.
   */
  outrasAntes: OutraRemuneracaoNoMes[];
  /** Matrícula de um anterior com pendência bloqueante, se houver. */
  bloqueadoPor: string | null;
}
export const ACUMULADO_VAZIO: AcumuladoDoTrabalhador = { basesCp: [], irrfRendimentoCents: 0n, irrfRetidoCents: 0n, previdenciaCents: 0n, outrasAntes: [], bloqueadoPor: null };

/** O contexto da folha que todo vínculo lê (já na forma do leitor). */
export interface ContextoFolha {
  competencia: Competencia;
  roteiro: Roteiro;
  dataPagamento: string;
  regras: RegrasFolha;
  parametrosCompetencia: ParametrosFolha;
  parametrosPagamento: ParametrosFolha;
  irrfLinhas: readonly LinhaLegal[];
  feriadosPorUnidade: Readonly<Record<string, readonly string[]>>;
  adiantamentoBp?: number;
}

// ── Pendências ──────────────────────────────────────────────────────────────────────────────────────────────────────
const NAO_BLOQUEANTES: readonly DpPendenciaCodigo[] = ['SALARIO_FAMILIA_SEM_PARAMETRO'];
function pendencia(codigo: DpPendenciaCodigo, v: Pick<VinculoSnapshot, 'vinculoId'>, dado: string, mensagem: string): DpPendenciaFolha {
  return { codigo, vinculoId: v.vinculoId, bloqueante: !NAO_BLOQUEANTES.includes(codigo), dado, mensagem };
}
const textoAusencia = (a: { tabela: string; chave: string | null; data: string }) => `${a.tabela}${a.chave ? `/${a.chave}` : ''} em ${a.data}`;
function ausente(v: VinculoSnapshot, a: { tabela: string; chave: string | null; data: string }): DpPendenciaFolha {
  const dado = textoAusencia(a);
  return pendencia('PARAMETRO_LEGAL_AUSENTE', v, dado, `Vínculo ${v.matricula}: o parâmetro legal ${dado} não está cadastrado; o vínculo não calcula.`);
}

// ── Auxiliares de soma e de linha ───────────────────────────────────────────────────────────────────────────────────
const RUBRICA = new Map<string, (typeof DP_RUBRICAS)[number]>(DP_RUBRICAS.map((r) => [r.codigo, r]));
const negar = (n: CalcNode): CalcNode => ({ ...n, valorCents: -n.valorCents, filhos: n.filhos.map(negar) });
const somaBig = (xs: readonly bigint[]) => xs.reduce((s, x) => s + x, 0n);

interface Lancado {
  linha: LinhaFolha;
  prova: CalcNode;
}
class Holerite {
  readonly itens: Lancado[] = [];
  add(rubrica: RubricaCodigo, c: Calculo<bigint>, referencia?: LinhaFolha['referencia']): void {
    if (c.valor === 0n) return;
    const tipo = RUBRICA.get(rubrica)!.tipo;
    const atual = this.itens.find((i) => i.linha.rubrica === rubrica);
    if (atual) {
      atual.linha.valorCents += c.valor;
      atual.prova = no(atual.prova.rotulo, atual.linha.valorCents, { filhos: [...atual.prova.filhos, { ...c.prova, soma: true }] });
      return;
    }
    const linha: LinhaFolha = { rubrica, tipo, ...(referencia ? { referencia } : {}), valorCents: c.valor };
    this.itens.push({ linha, prova: no(`${rubrica}`, c.valor, { filhos: [{ ...c.prova, soma: true }] }) });
  }
  valor(rubrica: RubricaCodigo): bigint {
    return this.itens.find((i) => i.linha.rubrica === rubrica)?.linha.valorCents ?? 0n;
  }
  /** G4 — bases pela incidência da rubrica: provento soma, desconto subtrai (MOS S-5001 item 1.2 "a"). */
  bases(): Bases {
    const de = (campo: keyof Bases) =>
      somaBig(
        this.itens.map(({ linha }) => {
          const r = RUBRICA.get(linha.rubrica)!;
          if (!(INCIDENCIA_BASE[campo] as readonly string[]).includes(r.incidencia[campo])) return 0n;
          return linha.tipo === 'PROVENTO' ? linha.valorCents : linha.tipo === 'DESCONTO' ? -linha.valorCents : 0n;
        }),
      );
    return { cp: de('cp'), irrf: de('irrf'), fgts: de('fgts') };
  }
}

/** Ordena as linhas pela ordem de avaliação (item 35), para o holerite e o hash serem estáveis. */
const POSICAO = new Map<string, number>(ETAPAS.flatMap((e) => e.rubricas as readonly string[]).map((r, i) => [r, i]));

function resultado(v: VinculoSnapshot, h: Holerite, pendencias: DpPendenciaFolha[], extras: CalcNode[]): ResultadoVinculo {
  const bloqueado = pendencias.some((p) => p.bloqueante);
  const itens = bloqueado ? [] : [...h.itens].sort((a, b) => POSICAO.get(a.linha.rubrica)! - POSICAO.get(b.linha.rubrica)!);
  const linhas = itens.map((i) => i.linha);
  const proventos = somaBig(linhas.filter((l) => l.tipo === 'PROVENTO').map((l) => l.valorCents));
  const descontos = somaBig(linhas.filter((l) => l.tipo === 'DESCONTO').map((l) => l.valorCents));
  const bases = bloqueado ? { cp: 0n, irrf: 0n, fgts: 0n } : h.bases();
  const liquido = proventos - descontos;
  const filhos: CalcNode[] = [
    ...itens.map((i) => (i.linha.tipo === 'PROVENTO' ? { ...i.prova, soma: true } : i.linha.tipo === 'DESCONTO' ? { ...negar(i.prova), rotulo: `menos ${i.prova.rotulo}`, soma: true } : i.prova)),
    ...(bloqueado ? [] : [no(`Bases: CP ${bases.cp}, IRRF ${bases.irrf}, FGTS ${bases.fgts}`, 0n, { fonte: 'S-1010 (codIncCP/codIncIRRF/codIncFGTS 11)' })]),
    ...extras,
  ];
  const rotulo = bloqueado ? `Vínculo ${v.matricula}: não calculado (${pendencias.filter((p) => p.bloqueante).map((p) => p.codigo).join(', ')})` : `Líquido do vínculo ${v.matricula}`;
  return { vinculoId: v.vinculoId, linhas, bases, totais: { proventos, descontos, liquido }, prova: no(rotulo, bloqueado ? 0n : liquido, { filhos }), pendencias };
}

// ── Leituras do PR-4 (funções nomeadas) ─────────────────────────────────────────────────────────────────────────────
/** A versão vigente no último dia do vínculo no mês (a de referência dos lançamentos sem data). */
export function versaoDeReferencia(fatias: readonly Fatia[]): VersaoSnapshot | null {
  return [...fatias].reverse().find((f) => f.versao !== null)?.versao ?? null;
}

/** Os dias de trabalho e de repouso do mês dentro do período do vínculo (item 69 cortado pela admissão e o término). */
function diasNoPeriodo(competencia: Competencia, escala: EscalaJornada, feriados: readonly string[], periodo: { inicio: string; fim: string }) {
  const porDia = diasDoMes(competencia, escala, feriados).porDia.filter((d) => periodo.inicio <= d.data && d.data <= periodo.fim);
  const trabalho = porDia.filter((d) => d.tipo === 'TRABALHO').length;
  return { trabalho, repouso: porDia.length - trabalho, porDia };
}

/** Súm. 340 TST [D15] — horas efetivamente trabalhadas no mês: dias de trabalho × minutos por dia − faltas + HE. */
export function horasTrabalhadasMinutos(diasTrabalho: number, escala: EscalaJornada, faltasMin: number, heMin: number): number {
  return Math.max(0, diasTrabalho * escala.minutosPorDia - faltasMin + heMin);
}

// ── Pré-condições (pendências bloqueantes antes de calcular) ────────────────────────────────────────────────────────
interface Base {
  fatias: Fatia[];
  periodo: { inicio: string; fim: string };
  ref: VersaoSnapshot;
  unidade: string;
  escala: EscalaJornada | null;
}

function precondicoes(v: VinculoSnapshot, ctx: ContextoFolha): { base: Base | null; pendencias: DpPendenciaFolha[] } {
  const out: DpPendenciaFolha[] = [];
  const periodo = periodoNoMes(v, ctx.competencia);
  const fatias = periodo ? fatiar(v, ctx.competencia, ctx.regras) : [];
  if (periodo === null || fatias.length === 0 || fatias.some((f) => f.versao === null)) {
    out.push(pendencia('SEM_VERSAO_NA_COMPETENCIA', v, v.matricula, `Vínculo ${v.matricula}: há dias de ${ctx.competencia} sem versão do contrato (salário, cargo, jornada); o vínculo não calcula.`));
    return { base: null, pendencias: out };
  }
  const versoes = [...new Map(fatias.map((f) => [f.versao!.id, f.versao!])).values()];
  const unidades = [...new Set(versoes.map((x) => x.unidadeSalario))];
  const unidade = unidades[0];
  const comRegra = (UNIDADES_COM_REGRA as readonly string[]).includes(unidade);
  // L3: 2/3/4/6 travam; 901 e 723 só no mês (a bolsa e o pró-labore não têm regra por hora no F2); unidades diferentes
  // no mesmo mês também (cada uma tem a sua conta).
  const unidadeOk = unidades.length === 1 && comRegra && (CATEGORIAS_COM_JORNADA.includes(v.categoria) || unidade === UNIDADE_SALARIO_MENSAL);
  if (!unidadeOk) {
    const dado = `${v.matricula} (unidade ${unidades.join('/')})`;
    out.push(pendencia('UNIDADE_SALARIO_SEM_REGRA_NO_F2', v, dado, `Vínculo ${v.matricula}: a unidade de salário ${unidades.join('/')} não tem regra no F2 (só mês, hora e só variável, e uma por mês); o vínculo não calcula.`));
  }
  const ref = versaoDeReferencia(fatias)!;
  let escala: EscalaJornada | null = null;
  if (CATEGORIAS_COM_JORNADA.includes(v.categoria)) {
    for (const x of versoes) {
      if (x.jornada === null || x.jornada.escala === null) {
        const dado = x.jornada === null ? v.matricula : `${v.matricula} (jornada ${x.jornada.nome})`;
        out.push(pendencia('JORNADA_AUSENTE', v, dado, `Vínculo ${v.matricula}: a versão de ${x.vigenteDesde} não tem jornada com escala (dias de trabalho e minutos por dia); o vínculo não calcula.`));
        continue;
      }
      const e = x.jornada.escala;
      const semanais = minutosSemanaisDaEscala(e);
      const lim = ctx.regras.jornadaLimiteSemanalMin;
      if (semanais > lim.valor) {
        out.push(pendencia('JORNADA_ACIMA_DO_LIMITE', v, `${v.matricula} (jornada ${x.jornada.nome})`, `Vínculo ${v.matricula}: a jornada ${x.jornada.nome} soma ${semanais} minutos por semana, acima do limite de ${lim.valor} vigente em ${ultimoDia(ctx.competencia)} (${lim.fonte}).`));
      }
      const rep = ctx.regras.repousoDiasMin;
      if (repousoSemanal(e) < rep.valor) {
        out.push(pendencia('REPOUSO_ABAIXO_DO_MINIMO', v, `${v.matricula} (jornada ${x.jornada.nome})`, `Vínculo ${v.matricula}: a jornada ${x.jornada.nome} tem ${repousoSemanal(e)} dia(s) de repouso por semana, abaixo do mínimo de ${rep.valor} (${rep.fonte}).`));
      }
    }
    escala = ref.jornada?.escala ?? null;
  }
  for (const f of fatias) {
    const a = f.afastamento;
    if (a === null) continue;
    // F-DPF-5 (a): só doença do mensalista 101/103 tem regra; o horista, o só variável, a bolsa e o pró-labore travam.
    const semRegra = a.pagoPor === 'SEM_REGRA' || (a.pagoPor === 'EMPRESA' && (unidade !== UNIDADE_SALARIO_MENSAL || !CATEGORIAS_COM_JORNADA.includes(v.categoria)));
    if (!semRegra || out.some((p) => p.codigo === 'AFASTAMENTO_SEM_REGRA_NO_F2' && p.dado.startsWith(a.motivo))) continue;
    const quem = a.pagoPor === 'SEM_REGRA' ? '' : ` (${unidade === UNIDADE_SALARIO_MENSAL ? `categoria ${v.categoria}` : `unidade ${unidade}`})`;
    out.push(pendencia('AFASTAMENTO_SEM_REGRA_NO_F2', v, `${a.motivo}${quem}`, `Vínculo ${v.matricula}: o afastamento de motivo ${a.motivo}${quem} não tem regra no F2; o vínculo não calcula.`));
  }
  // Item 19 — precedência MANUAL × MODULO (nunca soma silenciosa).
  const doPonto = v.lancamentos.filter((l) => l.origem === 'MODULO');
  out.push(
    ...conflitosComPonto(
      v.vinculoId,
      ctx.competencia,
      v.lancamentos.filter((l) => l.id !== null).map((l) => ({ id: l.id!, rubrica: l.rubrica, origem: l.origem, data: l.data ?? null })),
      pontoDoSnapshot(v, doPonto),
    ).map((p) => ({ ...p, mensagem: `Vínculo ${v.matricula}: ${p.mensagem}` })),
  );
  // L2 — o horista precisa das horas normais; quem não é horista não as tem.
  const horas = somaBig(v.lancamentos.filter((l) => l.rubrica === 'HORAS_NORMAIS').map((l) => BigInt(l.quantidadeMin ?? 0)));
  if (unidade === UNIDADE_SALARIO_HORA && horas === 0n && CATEGORIAS_COM_JORNADA.includes(v.categoria)) {
    out.push(pendencia('HORAS_NORMAIS_INCOERENTES', v, `${v.matricula} (HORAS_NORMAIS)`, `Vínculo ${v.matricula}: horista sem o lançamento HORAS_NORMAIS em ${ctx.competencia}; o vínculo não calcula.`));
  }
  if (unidade !== UNIDADE_SALARIO_HORA && horas > 0n) {
    out.push(pendencia('HORAS_NORMAIS_INCOERENTES', v, `${v.matricula} (HORAS_NORMAIS)`, `Vínculo ${v.matricula}: HORAS_NORMAIS lançada em vínculo que não é horista (unidade ${unidade}); apague o lançamento.`));
  }
  // L1 — a falta sem data (lançamento anterior à coluna) não tem semana: fail closed.
  if (v.lancamentos.some((l) => l.rubrica === 'FALTAS' && !l.data)) {
    out.push(pendencia('FALTA_SEM_DATA', v, `${v.matricula} (FALTAS)`, `Vínculo ${v.matricula}: há lançamento de FALTAS sem a data do dia em ${ctx.competencia}; informe a data para o DSR da semana.`));
  }
  return { base: { fatias, periodo: periodo!, ref, unidade, escala }, pendencias: out };
}

/** A porta de jornada como o snapshot a guardou (item 18): a origem e os itens `MODULO`. */
function pontoDoSnapshot(v: VinculoSnapshot, doPonto: VinculoSnapshot['lancamentos']): JornadaApurada {
  return {
    origem: v.jornadaApurada.origem,
    ...(v.jornadaApurada.motivo ? { motivo: v.jornadaApurada.motivo } : {}),
    itens: doPonto.map((l) => ({ rubrica: l.rubrica as RubricaCodigo, quantidadeMin: l.quantidadeMin ?? 0, ...(l.data ? { data: l.data } : {}) })),
  };
}

// ── Mínimo de referência (item 12; F-DPF-6) ─────────────────────────────────────────────────────────────────────────
/**
 * O mínimo (salário mínimo, G2) e o piso da CCT (G7) de referência no mês, proporcionais aos dias pagos pela empresa
 * na base do mensalista (F-DPF-4 a; G2 do dossiê) e, no tempo parcial (F-DPF-6 a, dono 07/11) e no aprendiz (mínimo-hora,
 * CLT art. 428 § 2º [D02]), à jornada contratual sobre o limite semanal vigente.
 */
export function minimoDeReferencia(
  valorMensalCents: bigint,
  rotulo: string,
  fonte: string,
  dias: number,
  proporcionalAJornada: boolean,
  minutosSemanais: number,
  regras: RegrasFolha,
): { valorCents: bigint; rotulo: string; fonte: string } {
  const mensal = proporcionalAJornada ? pisoProporcional(valorMensalCents, minutosSemanais, regras.jornadaLimiteSemanalMin, regras.arredondamento).valor : valorMensalCents;
  const valorCents = proporcionalMensalista(mensal, regras.mensalistaBaseDias, dias, regras.arredondamento).valor;
  return { valorCents, rotulo: `${rotulo} (${dias}/${regras.mensalistaBaseDias.valor} dias${proporcionalAJornada ? `, ${minutosSemanais}/${regras.jornadaLimiteSemanalMin.valor} min` : ''})`, fonte };
}

// ── Roteiro MENSAL (itens 36–41, 43) ────────────────────────────────────────────────────────────────────────────────
function minutosDe(v: VinculoSnapshot, rubrica: RubricaCodigo): number {
  return v.lancamentos.filter((l) => l.rubrica === rubrica).reduce((s, l) => s + (l.quantidadeMin ?? 0), 0);
}
function valorDe(v: VinculoSnapshot, rubrica: RubricaCodigo): bigint {
  return somaBig(v.lancamentos.filter((l) => l.rubrica === rubrica).map((l) => BigInt(l.valorCents ?? '0')));
}

/** O salário-hora exato da versão (mensal: pelo divisor; hora: o contratual; só variável: zero). */
function salarioHoraDa(x: VersaoSnapshot, unidade: string, regras: RegrasFolha): Calculo<Fracao> {
  const salario = BigInt(x.salarioCents);
  if (unidade === UNIDADE_SALARIO_HORA) return { valor: fracao(salario), prova: no(`Salário-hora contratual ${salario}`, salario, { fonte: 'S-2200 undSalFixo 1' }) };
  if (unidade === UNIDADE_SALARIO_VARIAVEL) return { valor: fracao(0n), prova: no('Só variável: sem salário fixo', 0n, { fonte: 'S-2200 undSalFixo 7' }) };
  return salarioHora(salario, x.jornada!.escala!, regras.salarioHoraDivisor, regras.mensalistaBaseDias, regras.arredondamento);
}

function mensal(v: VinculoSnapshot, ctx: ContextoFolha, b: Base, acc: AcumuladoDoTrabalhador, h: Holerite, extras: CalcNode[], pend: DpPendenciaFolha[]): void {
  const r = ctx.regras;
  const arr = r.arredondamento;
  const jornada = CATEGORIAS_COM_JORNADA.includes(v.categoria);
  const feriados = ctx.feriadosPorUnidade[v.unitId] ?? [];

  // Contratual por fatia (item 4) e afastamento pago pela empresa (item 32).
  let diasPagos = 0;
  if (b.unidade === UNIDADE_SALARIO_MENSAL) {
    for (const f of b.fatias) {
      const dias = f.diasRemunerados ?? 0;
      if (dias === 0) continue;
      diasPagos += dias;
      const c = proporcionalMensalista(BigInt(f.versao!.salarioCents), r.mensalistaBaseDias, dias, arr);
      const rubrica = f.afastamento?.pagoPor === 'EMPRESA' ? 'AFASTAMENTO_EMPRESA_15D' : LINHA_CONTRATUAL[v.categoria];
      h.add(rubrica, { valor: c.valor, prova: { ...c.prova, rotulo: `${c.prova.rotulo} (${f.inicio} a ${f.fim})` } }, { dias });
    }
  } else {
    diasPagos = diasDevidosMensalista(ctx.competencia, b.periodo.inicio, b.periodo.fim, r.mensalistaBaseDias);
  }
  if (!jornada) return;

  const escala = b.escala!;
  const sh = salarioHoraDa(b.ref, b.unidade, r);
  extras.push({ ...sh.prova, rotulo: `Referência: ${sh.prova.rotulo}` });
  const dias = diasNoPeriodo(ctx.competencia, escala, feriados, b.periodo);

  // L2 / item 37 — horista: horas normais × salário-hora contratual; DSR do horista.
  const minNormais = minutosDe(v, 'HORAS_NORMAIS');
  let dsrHorista = 0n;
  if (b.unidade === UNIDADE_SALARIO_HORA) {
    h.add('HORAS_NORMAIS', salarioHorista(sh.valor, minNormais, arr), { minutos: minNormais });
    const c = dsrDoHorista(sh.valor, escala.minutosPorDia, dias.repouso, arr);
    dsrHorista = c.valor;
    h.add('DSR_VARIAVEIS', c, { dias: dias.repouso });
  }

  // Informados (itens 9, 10, 38).
  const comissao = valorDe(v, 'COMISSAO');
  const faltasMin = minutosDe(v, 'FALTAS');
  const he50 = minutosDe(v, 'HORA_EXTRA_50');
  const he100 = minutosDe(v, 'HORA_EXTRA_100');
  // Súm. 340 [D15]: sobre a comissão, só o adicional, pelo valor-hora da comissão (divisor = horas trabalhadas).
  const horasTrab = horasTrabalhadasMinutos(dias.trabalho, escala, faltasMin, he50 + he100);
  const horaComissao = comissao > 0n && horasTrab > 0 ? fracao(comissao * 60n, inteiro(horasTrab)) : null;
  for (const [rubrica, minutos, adicional] of [
    ['HORA_EXTRA_50', he50, adicionalAplicavel(r.heAdicionalBp, null)],
    ['HORA_EXTRA_100', he100, adicionalAplicavel(r.heRepousoAdicionalBp, null)],
  ] as const) {
    if (minutos === 0) continue;
    if (b.unidade !== UNIDADE_SALARIO_VARIAVEL) h.add(rubrica, horaExtra(sh.valor, minutos, adicional, arr), { minutos });
    if (horaComissao) {
      // horaExtra dá hora × (1 + adicional); o adicional sozinho = horaExtra − hora normal (Súm. 340).
      const cheio = horaExtra(horaComissao, minutos, adicional, arr);
      const normal = horaExtra(horaComissao, minutos, { ...adicional, valor: 0 }, arr);
      h.add(rubrica, { valor: cheio.valor - normal.valor, prova: no(`Súm. 340: só o adicional sobre a comissão (${horasTrab} min trabalhados)`, cheio.valor - normal.valor, { fonte: 'Súm. TST 340', filhos: [{ ...cheio.prova, soma: true }, { ...negar(normal.prova), soma: true }] }) }, { minutos });
    }
  }
  const noturnoMin = minutosDe(v, 'ADICIONAL_NOTURNO');
  if (noturnoMin > 0) h.add('ADICIONAL_NOTURNO', adicionalNoturno(sh.valor, noturnoMin, r.noturno.adicionalBp, r.noturno.horaSegundos, arr), { minutos: noturnoMin });
  if (comissao > 0n) h.add('COMISSAO', valorInformado('Comissão', comissao, 'lançamento COMISSAO'));

  // Faltas (L1: cada falta pelo salário-hora da versão do dia dela) e DSR perdido (item 36).
  const faltas = v.lancamentos.filter((l) => l.rubrica === 'FALTAS' && l.data);
  for (const l of faltas) {
    const x = versaoVigente(v.versoes, l.data!) ?? b.ref;
    h.add('FALTAS', descontoFaltas(salarioHoraDa(x, b.unidade, r).valor, l.quantidadeMin ?? 0, arr), { minutos: faltasMin });
  }
  if (faltas.length > 0 && b.unidade !== UNIDADE_SALARIO_VARIAVEL) {
    const perdidos = diasRepousoPerdidos(faltas.map((l) => l.data!), ctx.competencia, escala, feriados, r.semanaDsrInicio);
    const valorDia: Fracao =
      b.unidade === UNIDADE_SALARIO_HORA ? multiplicar(sh.valor, fracao(inteiro(escala.minutosPorDia), 60n)) : fracao(BigInt(b.ref.salarioCents), inteiro(r.mensalistaBaseDias.valor));
    h.add('DSR_PERDIDO', dsrPerdido(valorDia, perdidos, arr), { dias: perdidos.dias.length });
  }

  // Derivados: DSR sobre variáveis (item 11; Súm. 172 e 27), separado em HE+noturno e comissão (o da comissão entra no
  // mínimo, G4 do dossiê).
  const varHe = h.valor('HORA_EXTRA_50') + h.valor('HORA_EXTRA_100') + h.valor('ADICIONAL_NOTURNO');
  let dsrComissao = 0n;
  if (dias.trabalho > 0) {
    if (varHe > 0n) h.add('DSR_VARIAVEIS', dsrSobreVariaveis(varHe, dias, arr), { dias: dias.repouso });
    if (comissao > 0n) {
      const c = dsrSobreVariaveis(comissao, dias, arr);
      dsrComissao = c.valor;
      h.add('DSR_VARIAVEIS', { valor: c.valor, prova: { ...c.prova, rotulo: `${c.prova.rotulo} (comissão)` } }, { dias: dias.repouso });
    }
  }

  // Complementos (item 12; F-DPF-6). Remuneração comparada: salário, afastamento pela empresa, comissão e o DSR dela.
  const remuneracao = h.valor('SALARIO_BASE') + h.valor('HORAS_NORMAIS') + dsrHorista + h.valor('AFASTAMENTO_EMPRESA_15D') + comissao + dsrComissao;
  const minutosSemanais = minutosSemanaisDaEscala(escala);
  const tempoParcial = b.ref.jornada?.tempoParcial === true;
  const pMin = ctx.parametrosCompetencia.salarioMinimoCents;
  const minimo = minimoDeReferencia(pMin, 'salário mínimo', 'Lei do salário mínimo (G2)', diasPagos, tempoParcial || v.categoria === APRENDIZ, minutosSemanais, r);
  const cMin = complementoMinimo(remuneracao, minimo);
  h.add('COMPLEMENTO_MINIMO', cMin);
  const piso = b.ref.sindicatoId
    ? parametroCctVigente(
        v.cct.filter((c) => c.sindicatoId === b.ref.sindicatoId).map((c) => ({ ...c, valorInt: BigInt(c.valorInt) })),
        'PISO_SALARIAL_CENTS',
        b.ref.cargoId,
        b.periodo.fim,
      )
    : undefined;
  if (piso) {
    const ref = minimoDeReferencia(piso.valorInt, `piso da CCT (cargo ${b.ref.cargoNome ?? '—'})`, `CCT:${piso.id}`, diasPagos, tempoParcial, minutosSemanais, r);
    h.add('COMPLEMENTO_PISO', complementoMinimo(remuneracao + cMin.valor, ref));
  }

  // Salário-família (item 15; F-DPF-7 b: sem a tabela, calcula sem e avisa).
  const elegiveis = v.dependentes.salarioFamilia.filter((d) => d.invalido || d.idade <= r.salarioFamiliaIdadeMax.valor).length;
  const sf = salarioFamilia({ id: v.vinculoId, matricula: v.matricula }, elegiveis, h.bases().cp + somaBig(acc.basesCp.map((x) => x.baseCents)), null);
  if (sf?.tipo === 'SEM_PARAMETRO') pend.push(sf.pendencia);
  else if (sf?.tipo === 'CALCULADO') h.add('SALARIO_FAMILIA', sf.calculo);
}

/** INSS (itens 5, 6, 41, 78), IRRF (item 8, D-3) e FGTS (item 7) pela categoria (item 66). */
function encargos(v: VinculoSnapshot, ctx: ContextoFolha, acc: AcumuladoDoTrabalhador, h: Holerite, pend: DpPendenciaFolha[], extras: CalcNode[]): void {
  const r = ctx.regras;
  const encargo = r.encargoPorCategoria[v.categoria];
  const pc = ctx.parametrosCompetencia;
  let bases = h.bases();
  let inssCents = 0n;
  const outras: OutraRemuneracaoNoMes[] = [
    ...outrasDoVinculo(v),
    ...acc.outrasAntes,
    // Item 41: os vínculos anteriores do mesmo trabalhador na instância entram como fonte ANTES desta.
    ...acc.basesCp.map((x) => ({ remuneracaoCents: x.baseCents, ordem: 'ANTES' as const, categoriaOutraFonte: x.categoria })),
  ];
  if (encargo.valor.inss === 'EMPREGADO') {
    const c = inssComOutrasFontes(bases.cp, outras, pc.inssEmpregado, pc.tetoRgpsCents, r.arredondamentoInss);
    h.add('INSS_SEGURADO', c);
    inssCents = c.valor;
  } else if (encargo.valor.inss === 'CONTRIBUINTE_INDIVIDUAL') {
    const antes = somaBig(outras.filter((o) => o.ordem === 'ANTES').map((o) => o.remuneracaoCents));
    const c = inssContribuinteIndividual(bases.cp, pc.ciSeguradoBp, pc.tetoRgpsCents, antes, r.arredondamento);
    h.add('INSS_SEGURADO', c);
    inssCents = c.valor;
  }
  bases = h.bases();
  if (encargo.valor.irrf && bases.irrf > 0n) {
    try {
      const c = irrfMensal(
        {
          baseIrrfCents: bases.irrf,
          inssCents: acc.previdenciaCents + inssCents,
          dependentes: v.dependentes.irrf,
          rendimentoMesAntesCents: BigInt(v.jaPagoNoMesDePagamento.rendimentoCents) + acc.irrfRendimentoCents,
          retidoMesAntesCents: BigInt(v.jaPagoNoMesDePagamento.irrfRetidoCents) + acc.irrfRetidoCents,
          dataPagamento: ctx.dataPagamento,
        },
        ctx.irrfLinhas,
      );
      h.add('IRRF', c);
      if (c.valor === 0n) extras.push(c.prova); // A3 (revisor do #1326): a dispensa MINIMO_R10 fica na prova
    } catch (e) {
      if (!(e instanceof SemLinhaVigenteError)) throw e;
      pend.push(ausente(v, e));
    }
  }
  const f = fgtsDaCategoria(bases.fgts, encargo, pc, r.arredondamento);
  if (f) h.add('FGTS_MES', f);
}

/** Item 77 — as outras remunerações do vínculo na forma da calculadora (ordem e categoria do domínio fechado). */
function outrasDoVinculo(v: VinculoSnapshot): OutraRemuneracaoNoMes[] {
  return v.outrasRemuneracoes
    .filter((o) => (OUTRA_REMUNERACAO_ORDENS as readonly string[]).includes(o.ordem) && (OUTRA_REMUNERACAO_CATEGORIAS as readonly string[]).includes(o.categoriaOutraFonte))
    .map((o) => ({ remuneracaoCents: BigInt(o.remuneracaoCents), ordem: o.ordem as OutraRemuneracaoNoMes['ordem'], categoriaOutraFonte: o.categoriaOutraFonte as OutraRemuneracaoNoMes['categoriaOutraFonte'] }));
}

// ── Roteiro ADIANTAMENTO (item 42) ──────────────────────────────────────────────────────────────────────────────────
function roteiroAdiantamento(v: VinculoSnapshot, ctx: ContextoFolha, h: Holerite, pend: DpPendenciaFolha[]): void {
  if (!CATEGORIAS_COM_JORNADA.includes(v.categoria)) return; // a rubrica ADIANTAMENTO é só de 101/103
  if (ctx.adiantamentoBp === undefined) throw new Error('Roteiro ADIANTAMENTO sem DpParametrosFolha: o serviço responde 400 DP_ADIANTAMENTO_SEM_PARAMETRO antes do motor (item 50).');
  const x = versaoVigente(v.versoes, ctx.dataPagamento);
  if (x === null) {
    pend.push(pendencia('SEM_VERSAO_NA_COMPETENCIA', v, v.matricula, `Vínculo ${v.matricula}: sem versão do contrato no dia do pagamento do adiantamento (${ctx.dataPagamento}).`));
    return;
  }
  if (x.unidadeSalario !== UNIDADE_SALARIO_MENSAL) {
    const dado = `${v.matricula} (unidade ${x.unidadeSalario})`;
    pend.push(pendencia('UNIDADE_SALARIO_SEM_REGRA_NO_F2', v, dado, `Vínculo ${v.matricula}: o adiantamento é percentual do salário mensal; a unidade ${x.unidadeSalario} não tem regra no F2.`));
    return;
  }
  h.add('ADIANTAMENTO', adiantamento(BigInt(x.salarioCents), { bp: ctx.adiantamentoBp, fonte: 'DpParametrosFolha (item 50)' }, ctx.regras.arredondamento));
}

// ── Entrada do motor ────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Item 34 — o resultado de um vínculo. `acc` = o que os vínculos anteriores do mesmo trabalhador somaram (item 41);
 * vazio quando é o único. Vínculo com pendência bloqueante não tem linhas; os outros calculam normalmente (item 44).
 */
export function calcularVinculo(v: VinculoSnapshot, ctx: ContextoFolha, acc: AcumuladoDoTrabalhador = ACUMULADO_VAZIO): ResultadoVinculo {
  const h = new Holerite();
  const extras: CalcNode[] = [];
  if (acc.bloqueadoPor !== null) {
    const p = pendencia('OUTRO_VINCULO_PENDENTE', v, acc.bloqueadoPor, `Vínculo ${v.matricula}: o vínculo ${acc.bloqueadoPor} do mesmo trabalhador tem pendência; o teto do INSS e o IRRF do mês dependem dele.`);
    return resultado(v, h, [p], extras);
  }
  if (ctx.roteiro === 'ADIANTAMENTO') {
    const pend: DpPendenciaFolha[] = [];
    roteiroAdiantamento(v, ctx, h, pend);
    return resultado(v, h, pend, extras);
  }
  const { base, pendencias } = precondicoes(v, ctx);
  if (base === null || pendencias.some((p) => p.bloqueante)) return resultado(v, h, pendencias, extras);
  const pend = [...pendencias];
  mensal(v, ctx, base, acc, h, extras, pend);
  encargos(v, ctx, acc, h, pend, extras);
  if (v.adiantamentoPagoCents !== undefined && BigInt(v.adiantamentoPagoCents) > 0n) {
    h.add('DESCONTO_ADIANTAMENTO', valorInformado('Desconto do adiantamento pago na competência', BigInt(v.adiantamentoPagoCents), 'BRIEF DP-F2 item 43'));
  }
  const liquido = h.itens.reduce((s, i) => s + (i.linha.tipo === 'PROVENTO' ? i.linha.valorCents : i.linha.tipo === 'DESCONTO' ? -i.linha.valorCents : 0n), 0n);
  if (liquido < 0n) {
    pend.push(pendencia('LIQUIDO_NEGATIVO', v, v.matricula, `Vínculo ${v.matricula}: o líquido daria ${liquido} centavos (descontos acima dos proventos); o saldo e o limite de descontos são do F3.`));
  }
  return resultado(v, h, pend, extras);
}

/** O contexto do snapshot; parâmetro ou regra ausente vira a lista de ausências (cada vínculo recebe a pendência). */
export function contextoDoSnapshot(s: DpSnapshot): { ctx: ContextoFolha | null; ausencias: Array<{ tabela: string; chave: string | null; data: string }> } {
  // A3 (item 61 b: uma pendência por falta): a mesma tabela ausente na competência e no pagamento conta uma vez.
  const todas = [s.regras, s.parametros.competencia, s.parametros.pagamento].flatMap((x) => (x.ok ? [] : [x.ausente]));
  const ausencias = todas.filter((a, i) => todas.findIndex((b) => b.tabela === a.tabela && b.chave === a.chave) === i);
  if (!s.regras.ok || !s.parametros.competencia.ok || !s.parametros.pagamento.ok) return { ctx: null, ausencias };
  return {
    ctx: {
      competencia: s.competencia,
      roteiro: s.roteiro,
      dataPagamento: s.dataPagamento,
      regras: regrasDeJson(s.regras.valor),
      parametrosCompetencia: parametrosDeJson(s.parametros.competencia.valor),
      parametrosPagamento: parametrosDeJson(s.parametros.pagamento.valor),
      irrfLinhas: s.parametros.irrfPagamento,
      feriadosPorUnidade: s.feriados,
      ...(s.parametros.adiantamentoBp !== undefined ? { adiantamentoBp: s.parametros.adiantamentoBp } : {}),
    },
    ausencias,
  };
}

export interface ResultadoFolha {
  motorVersao: string;
  resultados: ResultadoVinculo[];
  /** Item 45 — SHA-256 da forma canônica (item 28) das linhas, bases, totais e pendências (sem a prova). */
  resultadoSha256: string;
}

/** Item 45 — o hash do resultado (a prova fica fora: é explicação, não valor). */
export function resultadoSha256(resultados: readonly ResultadoVinculo[]): string {
  return sha256Canonico([...resultados].sort((a, b) => (a.vinculoId < b.vinculoId ? -1 : 1)).map(({ prova: _prova, ...r }) => r));
}

/**
 * Itens 34, 41 e 45 — a folha inteira do snapshot. Vínculos do mesmo trabalhador em ordem estável (`dataInicio`,
 * `matricula`), cada um recebendo o acumulado dos anteriores (EC 103 art. 28 [F1-D01]; Lei 7.713 art. 7º § 1º [D06]);
 * vínculos de trabalhadores diferentes são independentes, e a ordem deles no snapshot não muda nada.
 */
export function calcularFolha(s: DpSnapshot): ResultadoFolha {
  const { ctx, ausencias } = contextoDoSnapshot(s);
  const resultados: ResultadoVinculo[] = [];
  if (ctx === null) {
    for (const v of s.vinculos) resultados.push(resultado(v, new Holerite(), ausencias.map((a) => ausente(v, a)), []));
    return { motorVersao: MOTOR_VERSAO, resultados: ordenar(resultados), resultadoSha256: resultadoSha256(resultados) };
  }
  const porTrabalhador = new Map<string, VinculoSnapshot[]>();
  for (const v of s.vinculos) porTrabalhador.set(v.trabalhadorId, [...(porTrabalhador.get(v.trabalhadorId) ?? []), v]);
  for (const grupo of porTrabalhador.values()) {
    const ordem = [...grupo].sort((a, b) => (a.dataInicio !== b.dataInicio ? (a.dataInicio < b.dataInicio ? -1 : 1) : a.matricula < b.matricula ? -1 : a.matricula > b.matricula ? 1 : 0));
    let acc = ACUMULADO_VAZIO;
    for (const v of ordem) {
      const r = calcularVinculo(v, ctx, acc);
      resultados.push(r);
      acc = acumular(acc, v, r, ctx.regras);
    }
  }
  return { motorVersao: MOTOR_VERSAO, resultados: ordenar(resultados), resultadoSha256: resultadoSha256(resultados) };
}

const ordenar = (rs: ResultadoVinculo[]) => [...rs].sort((a, b) => (a.vinculoId < b.vinculoId ? -1 : 1));

function acumular(acc: AcumuladoDoTrabalhador, v: VinculoSnapshot, r: ResultadoVinculo, regras: RegrasFolha): AcumuladoDoTrabalhador {
  if (r.pendencias.some((p) => p.bloqueante)) return { ...acc, bloqueadoPor: acc.bloqueadoPor ?? v.matricula };
  const inss = regras.encargoPorCategoria[v.categoria].valor.inss;
  const linha = (rub: RubricaCodigo) => r.linhas.find((l) => l.rubrica === rub)?.valorCents ?? 0n;
  return {
    basesCp: inss === 'NENHUM' ? acc.basesCp : [...acc.basesCp, { baseCents: r.bases.cp, categoria: inss === 'EMPREGADO' ? 'EMPREGADO' : 'CONTRIBUINTE_INDIVIDUAL' }],
    // A2 (revisor do #1326): o que a mesma fonte já pagou a este vínculo no mês entra na soma dos seguintes.
    irrfRendimentoCents: acc.irrfRendimentoCents + r.bases.irrf + BigInt(v.jaPagoNoMesDePagamento.rendimentoCents),
    irrfRetidoCents: acc.irrfRetidoCents + linha('IRRF') + BigInt(v.jaPagoNoMesDePagamento.irrfRetidoCents),
    previdenciaCents: acc.previdenciaCents + linha('INSS_SEGURADO'),
    outrasAntes: [...acc.outrasAntes, ...outrasDoVinculo(v).filter((o) => o.ordem === 'ANTES')],
    bloqueadoPor: null,
  };
}
