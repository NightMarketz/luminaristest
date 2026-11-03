import { ValidationError } from '../../../lib/errors';
import { ParametroLegalAusenteError, linhaLegalVigente, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import type { MixRemuneracao, RegimeSimulado, TipoFolha } from '../dtos/TaxSimulationDto';
import { parametroIbsCbsVigente, type ParametroIbsCbs } from './ibsCbsParams';
import { apurarPisCofinsMensal, periodoDoMes } from './pisCofinsCalc';
import type { ParametroPisCofins } from './pisCofinsParams';
import { calcularMes } from './profitDistribution';
import { apurar, fatorR, rbt12, type ApuracaoCalculada, type ApuracaoInput, type AtividadeInput, type MesReceita } from './simplesCalc';
import { PERIODOS_TRIMESTRAIS, aliquotaCsll, apurarPresumidoTrimestral, apurarRealTrimestral, fimDoTrimestre, type MemoriaAnterior, type PerfilApuracaoPresumido } from './taxAssessmentCalc';
import { mulBp, parametroVigente, type TabelaApuracao } from './taxAssessmentParams';
import { calcularIrrfPf } from './withholdingCalc';

/**
 * EFICIENCIA-FISCAL PR-3 itens 15–17 (BRIEF BE-INCR-EFICIENCIA-FISCAL §3 PR-3; ADR-INCR-EFICIENCIA-FISCAL D8, L11, L16) —
 * simuladores PUROS: recebem a entrada montada pelo `TaxSimulationService` e a fotografia das tabelas de lei, e devolvem o
 * cálculo. Nunca gravam apuração nem folha (I-5). Decisões do dono no AskUserQuestion de 28/10
 * (D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO): 1 tabela ENCARGO_FOLHA + tipoFolha; 2 folhaAlvo = FS12 da janela;
 * 3 carga completa com avisos; 4 projeção 2027; 6 montante informado em 3 mixes.
 */

/** I-5 — texto da P-EF-5 (BRIEF item 15), fixo em toda simulação de fator r. */
export const AVISO_FOLHA_REAL = 'pró-labore pode subir se efetivamente pago e com INSS recolhido; não flutue para bater 28 %';

// ---- encargos da folha (decisão 1; Lei 8.212 arts. 21, 22, 28 § 5º e 30 § 4º; Lei 10.666 art. 4º; Lei 8.036 art. 15) ----

export interface EncargosFolha {
  ciSeguradoBp: number;
  patronalBp: number;
  fgtsBp: number;
  /** null antes da 1ª linha publicada (2026): o INSS do sócio então não é calculável (400 ao usá-lo). */
  tetoRgpsCents: bigint | null;
  data: string;
}

export function encargosFolhaDe(linhas: readonly LinhaLegal[], data: string): EncargosFolha {
  const v = (chave: string): number => {
    const l = linhaLegalVigente(linhas, 'ENCARGO_FOLHA', chave, data);
    if (l?.valorInt === null || l?.valorInt === undefined) throw new ParametroLegalAusenteError('ENCARGO_FOLHA', data, chave);
    return l.valorInt;
  };
  const teto = linhaLegalVigente(linhas, 'ENCARGO_FOLHA', 'TETO_RGPS_CENTS', data)?.valorInt;
  return { ciSeguradoBp: v('CI_SEGURADO_BP'), patronalBp: v('PATRONAL_BP'), fgtsBp: v('FGTS_BP'), tetoRgpsCents: teto === null || teto === undefined ? null : BigInt(teto), data };
}

/** INSS do sócio (contribuinte individual a serviço da empresa) no mês: 11% até o teto do RGPS. */
export function inssContribuinteIndividual(remuneracaoMensalCents: bigint, e: EncargosFolha): bigint {
  if (e.tetoRgpsCents === null) throw new ParametroLegalAusenteError('ENCARGO_FOLHA', e.data, 'TETO_RGPS_CENTS');
  const base = remuneracaoMensalCents < e.tetoRgpsCents ? remuneracaoMensalCents : e.tetoRgpsCents;
  return base > 0n ? mulBp(base, e.ciSeguradoBp) : 0n;
}

/** Um valor anual repartido em 12 meses: a sobra da divisão vai para dezembro. */
export function porMes(anualCents: bigint): bigint[] {
  const m = anualCents / 12n;
  return Array.from({ length: 12 }, (_, i) => (i === 11 ? anualCents - m * 11n : m));
}

/**
 * Decisão 1 — custo da folha adicional dos 12 meses: PRO_LABORE ⇒ INSS de 11% do sócio mês a mês, até o teto;
 * EMPREGADO ⇒ FGTS de 8%. CPP patronal de 20% só quando ela não está no DAS (fora do Simples ou Anexo IV — LC 123 art. 13
 * VI e art. 18 § 5º-C). O valor bruto da folha não entra: o pró-labore substitui a distribuição de lucro.
 */
export function custoFolhaAdicional(adicionalCents: bigint, tipo: TipoFolha, e: EncargosFolha, cppForaDoDas: boolean): bigint {
  if (adicionalCents <= 0n) return 0n;
  const proprio = tipo === 'PRO_LABORE' ? porMes(adicionalCents).reduce((s, m) => s + inssContribuinteIndividual(m, e), 0n) : mulBp(adicionalCents, e.fgtsBp);
  return proprio + (cppForaDoDas ? mulBp(adicionalCents, e.patronalBp) : 0n);
}

// ---- item 15: fator r ----

type Razao = ReturnType<typeof fatorR>;
/** Razão em 4 casas, meio para cima. */
const razao4 = (r: Razao): number => Number((r.n * 20_000n + r.d) / (2n * r.d)) / 10_000;

const anexosDoFatorR = (c: ApuracaoCalculada): string => [...new Set(c.atividades.filter((a) => a.fatorR !== null).map((a) => a.anexo))].sort().join('+');

export interface SimulacaoFatorRCalc {
  rAtual: number;
  rSimulado: number;
  anexoAtual: string;
  anexoSimulado: string;
  fs12AtualCents: bigint;
  folhaAdicionalCents: bigint;
  dasAtualCents: bigint;
  dasSimuladoCents: bigint;
  custoFolhaAdicionalCents: bigint;
  economiaLiquidaCents: bigint;
  avisos: string[];
}

/**
 * Item 15 (L11: LC 123 art. 18 §§ 5º-J, 5º-K, 5º-M e 24; Res. CGSN 140 art. 26) — r atual × r com a folha-alvo. Decisão 2:
 * `folhaAlvoCents` é a FS12 da janela do RBT12 da competência; a folha simulada vai inteira no último mês da janela que tem
 * histórico (o r só lê a soma). No mês de início (art. 26 § 6º) a folha-alvo é a do próprio PA.
 */
export function simularFatorR(input: ApuracaoInput, linhas: readonly LinhaLegal[], folhaAlvoCents: bigint, tipo: TipoFolha, e: EncargosFolha): SimulacaoFatorRCalc {
  const atual = apurar(input, linhas);
  const anexoAtual = anexosDoFatorR(atual);
  if (anexoAtual === '') {
    throw new ValidationError(`${input.competencia}: nenhuma atividade do PA está sujeita ao fator r (LC 123 art. 18 § 5º-J) — não há o que simular.`, null, 'SEM_ATIVIDADE_SUJEITA_AO_FATOR_R');
  }
  const base = rbt12(input.historico, input.competencia, input.inicioAtividade, input.receitaPaCents);
  const avisos = [AVISO_FOLHA_REAL];
  let fs12: bigint;
  let simulada: ApuracaoInput = input;
  if (base.metodo === 'INICIO_PRIMEIRA_FAIXA') {
    fs12 = BigInt(input.folhaPaCents);
    avisos.push('nos 2 primeiros meses de atividade a partir de 2027 o fator r é 0,28 por lei (Res. CGSN 140 art. 26 § 6º, red. Res. CGSN 190/2026) — a folha não muda o anexo');
  } else if (base.metodo === 'INICIO_PRIMEIRO_MES') {
    fs12 = BigInt(input.folhaPaCents);
    simulada = { ...input, folhaPaCents: Number(folhaAlvoCents) };
  } else {
    const janela = new Set(base.meses);
    const comHistorico = input.historico.filter((h) => janela.has(h.competencia));
    fs12 = comHistorico.reduce((s, h) => s + BigInt(h.folhaCents ?? 0), 0n);
    const ultimo = comHistorico.map((h) => h.competencia).sort().pop();
    if (ultimo) {
      simulada = { ...input, historico: input.historico.map((h) => (janela.has(h.competencia) ? { ...h, folhaCents: h.competencia === ultimo ? Number(folhaAlvoCents) : 0 } : h)) };
    } else {
      avisos.push('sem histórico na janela do RBT12: a folha-alvo não tem mês onde entrar');
    }
  }
  const sim = apurar(simulada, linhas);
  const baseSim = rbt12(simulada.historico, simulada.competencia, simulada.inicioAtividade, simulada.receitaPaCents);
  const folhaAdicional = folhaAlvoCents > fs12 ? folhaAlvoCents - fs12 : 0n;
  const custo = custoFolhaAdicional(folhaAdicional, tipo, e, false);
  avisos.push(
    tipo === 'PRO_LABORE'
      ? 'custo = INSS de 11% do sócio sobre o pró-labore adicional, até o teto do RGPS por mês (Lei 8.212 arts. 21, 28 § 5º e 30 § 4º); a CPP está no DAS dos Anexos III e V (LC 123 art. 13 VI); o IRPF do pró-labore está na simulação de remuneração do sócio'
      : 'custo = FGTS de 8% sobre a folha adicional (Lei 8.036 art. 15); a CPP está no DAS dos Anexos III e V (LC 123 art. 13 VI); o salário em si não entra no custo',
  );
  const dasAtual = BigInt(atual.totalCalculadoCents);
  const dasSim = BigInt(sim.totalCalculadoCents);
  return {
    rAtual: razao4(fatorR(input.historico, base, input.receitaPaCents, input.folhaPaCents)),
    rSimulado: razao4(fatorR(simulada.historico, baseSim, simulada.receitaPaCents, simulada.folhaPaCents)),
    anexoAtual,
    anexoSimulado: anexosDoFatorR(sim),
    fs12AtualCents: fs12,
    folhaAdicionalCents: folhaAdicional,
    dasAtualCents: dasAtual,
    dasSimuladoCents: dasSim,
    custoFolhaAdicionalCents: custo,
    economiaLiquidaCents: dasAtual - dasSim - custo,
    avisos,
  };
}

// ---- item 16: regime ----

export interface MesRegimeEntrada {
  competencia: string;
  /** Razão (`receitaBrutaPorAtividade`): base do Presumido, do Real e de PIS/COFINS/CBS/IBS. */
  servicoCents: bigint;
  revendaCents: bigint;
  naoUsoCents: bigint;
  /** Subrazão (natureza × cTribNac, receita − cota): atividades e receita do Simples. */
  atividadesSimples: AtividadeInput[];
  receitaSimplesCents: bigint;
  folhaCents: bigint | null;
}

export interface EntradaRegime {
  ano: number;
  meses: readonly MesRegimeEntrada[];
  /** Os meses anteriores ao ano (RBT12 do Simples). */
  historicoAnterior: readonly MesReceita[];
  inicioAtividade: string | null;
  perfil: PerfilApuracaoPresumido & { lucroRealObrigatorio: boolean | null };
  resultadoAntesPorTrimestre: readonly bigint[];
  issAliquotaBp: number;
  sublimiteCents: bigint;
  linhas: readonly LinhaLegal[];
  tabelaApuracao: TabelaApuracao;
  tabelaPisCofins: readonly ParametroPisCofins[];
  tabelaIbsCbs: readonly ParametroIbsCbs[];
  tabelaCbsProvisoria: readonly ParametroIbsCbs[];
  encargos: EncargosFolha;
}

export interface Componentes {
  das: bigint;
  irpj: bigint;
  csll: bigint;
  pis: bigint;
  cofins: bigint;
  cbs: bigint;
  ibs: bigint;
  cpp: bigint;
  iss: bigint;
}
export interface CenarioRegime {
  regime: RegimeSimulado;
  disponivel: boolean;
  motivoIndisponivel: string | null;
  cargaTotalCents: bigint;
  componentes: Componentes;
}
export interface SimulacaoAnoCalc {
  ano: number;
  receitaBrutaCents: bigint;
  cenarios: CenarioRegime[];
  melhor: RegimeSimulado | null;
  avisos: string[];
}

const zero = (): Componentes => ({ das: 0n, irpj: 0n, csll: 0n, pis: 0n, cofins: 0n, cbs: 0n, ibs: 0n, cpp: 0n, iss: 0n });
const soma = (c: Componentes): bigint => Object.values(c).reduce((s, v) => s + v, 0n);
const fimDoMes = (comp: string): string => {
  const [a, m] = comp.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};
const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** O que não muda entre Presumido e Real: CPP sobre a folha, ISS e o tributo sobre o consumo (PIS/COFINS até 2026; CBS/IBS a partir de 2027). */
function cargaComum(e: EntradaRegime, modalidade: 'CUMULATIVO' | 'NAO_CUMULATIVO', c: Componentes): void {
  for (const m of e.meses) {
    const receita = m.servicoCents + m.naoUsoCents + m.revendaCents;
    if (m.folhaCents !== null) c.cpp += mulBp(m.folhaCents, e.encargos.patronalBp);
    c.iss += mulBp(m.servicoCents + m.naoUsoCents > 0n ? m.servicoCents + m.naoUsoCents : 0n, e.issAliquotaBp);
    if (e.ano < 2027) {
      const r = apurarPisCofinsMensal({
        tabela: e.tabelaPisCofins,
        ano: e.ano,
        periodo: periodoDoMes(Number(m.competencia.slice(5))),
        modalidade,
        receitaServicoCents: m.servicoCents,
        receitaRevendaCents: m.revendaCents,
        receitaNaoUsoCents: m.naoUsoCents,
        ajustesBase: [],
        outrosCreditos: [],
        retencoes: [],
        creditosNfe: [],
        saldoAnterior: { tipo: 'NENHUM' },
      });
      c.pis += r.PIS.aPagarCents;
      c.cofins += r.COFINS.aPagarCents;
    } else if (receita > 0n) {
      const data = fimDoMes(m.competencia);
      c.cbs += mulBp(receita, cbsBp(e, data));
      c.ibs += mulBp(receita, parametroIbsCbsVigente(e.tabelaIbsCbs, 'IBS', 'ALIQUOTA_UF', data).aliquotaBp) + mulBp(receita, parametroIbsCbsVigente(e.tabelaIbsCbs, 'IBS', 'ALIQUOTA_MUN', data).aliquotaBp);
    }
  }
}

/** CBS de 2027+: a linha oficial; DRAFT (sem resolução do Senado — LC 214 art. 349 I) ⇒ a provisória da plataforma; sem ela, 0 (aviso). */
function cbsBp(e: EntradaRegime, data: string): number {
  try {
    return parametroIbsCbsVigente(e.tabelaIbsCbs, 'CBS', 'ALIQUOTA', data).aliquotaBp;
  } catch {
    const p = e.tabelaCbsProvisoria.find((l) => l.vigenteDesde <= data && (l.vigenteAte === null || data <= l.vigenteAte));
    return p ? p.aliquotaBp : 0;
  }
}

function cenarioSimples(e: EntradaRegime): CenarioRegime {
  const c = zero();
  try {
    const historico: MesReceita[] = [...e.historicoAnterior];
    const anoAnterior = e.historicoAnterior.filter((h) => h.competencia.startsWith(`${e.ano - 1}-`)).reduce((s, h) => s + BigInt(h.receitaBrutaCents), 0n);
    let acumulado = 0n;
    for (const m of e.meses) {
      // Res. CGSN 140 art. 12: o sublimite do ano anterior, ou o excesso > 20% no ano, tira ICMS/ISS do DAS.
      const sublimiteExcedido = anoAnterior > e.sublimiteCents || acumulado * 10n > e.sublimiteCents * 12n;
      const calc = apurar(
        {
          competencia: m.competencia,
          historico,
          inicioAtividade: e.inicioAtividade && e.inicioAtividade <= m.competencia ? e.inicioAtividade : null,
          receitaPaCents: Number(m.receitaSimplesCents > 0n ? m.receitaSimplesCents : 0n),
          folhaPaCents: Number(m.folhaCents ?? 0n),
          sublimiteExcedido,
          atividades: m.atividadesSimples.length > 0 ? m.atividadesSimples : [{ natureza: 'SERVICO', cTribNac: null, parcelas: [{ receitaCents: 0, excluir: [] }] }],
        },
        e.linhas,
      );
      c.das += BigInt(calc.totalCalculadoCents);
      // Anexo IV: a CPP fica fora do DAS (LC 123 art. 18 § 5º-C).
      if (calc.atividades.some((a) => a.anexo === 'IV') && m.folhaCents !== null) c.cpp += mulBp(m.folhaCents, e.encargos.patronalBp);
      historico.push({ competencia: m.competencia, receitaBrutaCents: Number(m.receitaSimplesCents > 0n ? m.receitaSimplesCents : 0n), folhaCents: m.folhaCents === null ? null : Number(m.folhaCents) });
      acumulado += m.receitaSimplesCents;
    }
  } catch (err) {
    return { regime: 'SIMPLES', disponivel: false, motivoIndisponivel: msg(err), cargaTotalCents: 0n, componentes: zero() };
  }
  return { regime: 'SIMPLES', disponivel: true, motivoIndisponivel: null, cargaTotalCents: soma(c), componentes: c };
}

const somaTrimestre = (e: EntradaRegime, q: number, campo: 'servicoCents' | 'revendaCents' | 'naoUsoCents'): bigint =>
  e.meses.filter((m) => Math.ceil(Number(m.competencia.slice(5)) / 3) === q).reduce((s, m) => s + m[campo], 0n);

function cenarioPresumido(e: EntradaRegime): CenarioRegime {
  const c = zero();
  try {
    const anteriores: Record<'IRPJ' | 'CSLL', MemoriaAnterior[]> = { IRPJ: [], CSLL: [] };
    PERIODOS_TRIMESTRAIS.forEach((periodo, i) => {
      for (const tributo of ['IRPJ', 'CSLL'] as const) {
        const r = apurarPresumidoTrimestral({
          tabela: e.tabelaApuracao,
          ano: e.ano,
          periodo,
          tributo,
          receitaServicoCents: somaTrimestre(e, i + 1, 'servicoCents'),
          receitaRevendaCents: somaTrimestre(e, i + 1, 'revendaCents'),
          receitaNaoUsoCents: somaTrimestre(e, i + 1, 'naoUsoCents'),
          perfil: e.perfil,
          anteriores: anteriores[tributo],
          deducoes: [],
        });
        c[tributo === 'IRPJ' ? 'irpj' : 'csll'] += r.aPagarCents;
        anteriores[tributo].push({ periodo, memoria: r.memoria });
      }
    });
    cargaComum(e, 'CUMULATIVO', c);
  } catch (err) {
    return { regime: 'PRESUMIDO', disponivel: false, motivoIndisponivel: msg(err), cargaTotalCents: 0n, componentes: zero() };
  }
  return { regime: 'PRESUMIDO', disponivel: true, motivoIndisponivel: null, cargaTotalCents: soma(c), componentes: c };
}

function cenarioReal(e: EntradaRegime): CenarioRegime {
  const c = zero();
  try {
    PERIODOS_TRIMESTRAIS.forEach((periodo, i) => {
      for (const tributo of ['IRPJ', 'CSLL'] as const) {
        const r = apurarRealTrimestral({
          tabela: e.tabelaApuracao,
          ano: e.ano,
          periodo,
          tributo,
          resultadoAntesCents: e.resultadoAntesPorTrimestre[i] ?? 0n,
          contasProvisaoConfiguradas: true,
          linhasParteA: [],
          parteBFechada: true,
          perfil: { ecfIndAliqCsll: e.perfil.ecfIndAliqCsll, lucroRealObrigatorio: e.perfil.lucroRealObrigatorio ?? false, inicioAtividadeEm: e.perfil.inicioAtividadeEm, encerramentoAtividadeEm: e.perfil.encerramentoAtividadeEm },
          deducoes: [],
        });
        c[tributo === 'IRPJ' ? 'irpj' : 'csll'] += r.aPagarCents;
      }
    });
    cargaComum(e, 'NAO_CUMULATIVO', c);
  } catch (err) {
    return { regime: 'REAL', disponivel: false, motivoIndisponivel: msg(err), cargaTotalCents: 0n, componentes: zero() };
  }
  return { regime: 'REAL', disponivel: true, motivoIndisponivel: null, cargaTotalCents: soma(c), componentes: c };
}

/**
 * Item 16 (F-EF-7 a; decisão 3) — a carga do ano em cada regime sobre a MESMA receita. Simples = DAS mês a mês (`apurar`;
 * CPP à parte só no Anexo IV). Presumido = IRPJ/CSLL trimestrais (`apurarPresumidoTrimestral`) + PIS/COFINS cumulativo.
 * Real = IRPJ/CSLL sobre o resultado contábil do razão, sem LALUR (`apurarRealTrimestral`) + PIS/COFINS não cumulativo sem
 * créditos. Fora do Simples: CPP de 20% sobre a folha informada e ISS pela alíquota do perfil. A partir de 2027 (LC 214 arts.
 * 343–347 e 542), CBS/IBS no lugar de PIS/COFINS. Cada aproximação vira aviso.
 */
export function simularRegimeAno(e: EntradaRegime): SimulacaoAnoCalc {
  const cenarios = [cenarioSimples(e), cenarioPresumido(e), cenarioReal(e)];
  const disponiveis = cenarios.filter((c) => c.disponivel);
  const melhor = disponiveis.length === 0 ? null : disponiveis.reduce((a, b) => (b.cargaTotalCents < a.cargaTotalCents ? b : a)).regime;
  const avisos = [
    'Real: IRPJ/CSLL sobre o resultado contábil do razão, sem adições/exclusões do e-Lalur, sem compensação de prejuízo entre trimestres, e com as despesas tributárias do regime atual já lançadas',
    'Real: PIS/COFINS não cumulativo sem créditos (Leis 10.637 e 10.833 art. 3º) — a carga está superestimada',
  ];
  if (e.meses.some((m) => m.revendaCents > 0n)) avisos.push('ICMS da revenda fora do Simples não entra (alíquota e crédito por UF e produto) — a comparação o omite');
  if (e.meses.some((m) => m.folhaCents === null)) avisos.push('meses sem folha informada no histórico do Simples: CPP de 20% fora do DAS calculada só nos meses com folha (Lei 8.212 art. 22 I e III)');
  avisos.push('CPP fora do Simples sem RAT/FAP e sem terceiros (Lei 8.212 art. 22 II; sistema S) — a carga do Presumido e do Real está subestimada');
  if (e.ano === 2026) avisos.push('2026 é o ano-teste da CBS (0,9%) e do IBS (0,1%), dispensado de recolhimento para quem cumpre as obrigações acessórias (LC 214 art. 348 § 1º) — fora da carga');
  if (e.ano >= 2027) {
    const data = `${e.ano}-01-31`;
    try {
      parametroIbsCbsVigente(e.tabelaIbsCbs, 'CBS', 'ALIQUOTA', data);
    } catch {
      const provisoria = e.tabelaCbsProvisoria.some((l) => l.vigenteDesde <= data && (l.vigenteAte === null || data <= l.vigenteAte));
      avisos.push(
        provisoria
          ? 'CBS de 2027: linha oficial DRAFT (alíquota de referência não publicada — LC 214 art. 349 I); usada a taxa PROVISÓRIA da plataforma'
          : 'CBS de 2027: linha oficial DRAFT (alíquota de referência não publicada — LC 214 art. 349 I) e sem taxa provisória — CBS fora da carga do Presumido e do Real',
      );
    }
    avisos.push('CBS/IBS fora do Simples sobre a receita bruta, sem créditos das aquisições (LC 214 art. 47) — a carga está superestimada');
  }
  return { ano: e.ano, receitaBrutaCents: e.meses.reduce((s, m) => s + m.servicoCents + m.naoUsoCents + m.revendaCents, 0n), cenarios, melhor, avisos };
}

// ---- item 17: remuneração do sócio ----

export interface EntradaRemuneracao {
  ano: number;
  valorAnualCents: bigint;
  regime: string;
  /** CPP de 20% sobre o pró-labore fora do DAS (Presumido, Real, Anexo IV). */
  cppForaDoDas: boolean;
  salarioMinimoCents: bigint;
  encargos: EncargosFolha;
  /** IRRF_PF_MENSAL e IRRF_DISTRIBUICAO. */
  linhas: readonly LinhaLegal[];
  /** Parte do sócio no limite dedutível do JCP do ano (só no Real — F-IRD-12); null ⇒ JCP sem benefício. */
  jcpLimiteSocioCents: bigint | null;
  /** IRPJ + adicional + CSLL marginais (bp) para a dedução do JCP; null fora do Real. */
  aliquotaMarginalBp: number | null;
}

export interface MixCalc {
  mix: MixRemuneracao;
  proLaboreCents: bigint;
  dividendosCents: bigint;
  jcpCents: bigint;
  inssSocioCents: bigint;
  cppEmpresaCents: bigint;
  irpfProLaboreCents: bigint;
  irrfDividendosCents: bigint;
  irrfJcpCents: bigint;
  economiaIrpjCsllJcpCents: bigint;
  cargaTotalCents: bigint;
  liquidoSocioCents: bigint;
}

function exigirInt(linhas: readonly LinhaLegal[], tabela: string, chave: string, data: string): number {
  const v = linhaLegalVigente(linhas, tabela, chave, data)?.valorInt;
  if (v === null || v === undefined) throw new ParametroLegalAusenteError(tabela, data, chave);
  return v;
}

function mix(e: EntradaRemuneracao, nome: MixRemuneracao, proLabore: bigint, jcp: bigint): MixCalc {
  const dividendos = e.valorAnualCents - proLabore - jcp;
  const meio = (i: number) => `${e.ano}-${String(i + 1).padStart(2, '0')}-15`;
  let inss = 0n;
  let irpf = 0n;
  porMes(proLabore).forEach((m, i) => {
    const inssMes = inssContribuinteIndividual(m, e.encargos);
    inss += inssMes;
    if (m > 0n) irpf += calcularIrrfPf(m, { rendimentoMesAntesCents: 0n, retidoMesAntesCents: 0n, dependentes: 0, previdenciaCents: inssMes, pensaoCents: 0n }, e.linhas, meio(i)).amountCents;
  });
  const p = { aliquotaBp: exigirInt(e.linhas, 'IRRF_DISTRIBUICAO', 'ALIQUOTA_PF_BP', meio(0)), limiteMensalCents: BigInt(exigirInt(e.linhas, 'IRRF_DISTRIBUICAO', 'LIMITE_MENSAL_PF_CENTS', meio(0))) };
  const irrfDiv = porMes(dividendos).reduce((s, m) => s + calcularMes([], { brutoCents: m, origemLucro: 'CORRENTE' }, p, 'PF').irrfEventoCents, 0n);
  const irrfJcp = jcp > 0n ? mulBp(jcp, exigirInt(e.linhas, 'IRRF_DISTRIBUICAO', 'ALIQUOTA_JCP_BP', meio(0))) : 0n;
  const economiaJcp = jcp > 0n && e.aliquotaMarginalBp !== null ? mulBp(jcp, e.aliquotaMarginalBp) : 0n;
  const cpp = e.cppForaDoDas ? mulBp(proLabore, e.encargos.patronalBp) : 0n;
  return {
    mix: nome,
    proLaboreCents: proLabore,
    dividendosCents: dividendos,
    jcpCents: jcp,
    inssSocioCents: inss,
    cppEmpresaCents: cpp,
    irpfProLaboreCents: irpf,
    irrfDividendosCents: irrfDiv,
    irrfJcpCents: irrfJcp,
    economiaIrpjCsllJcpCents: economiaJcp,
    cargaTotalCents: inss + cpp + irpf + irrfDiv + irrfJcp - economiaJcp,
    liquidoSocioCents: e.valorAnualCents - inss - irpf - irrfDiv - irrfJcp,
  };
}

/**
 * Item 17 (decisão 6) — o mesmo montante anual pago de 3 formas: 100% pró-labore; pró-labore de 1 salário mínimo +
 * dividendos; pró-labore mínimo + JCP até a parte do sócio no limite dedutível (só no Real) + dividendos. INSS 11% até o
 * teto (Lei 8.212 arts. 21, 28 § 5º e 30 § 4º), CPP 20% fora do DAS (art. 22 III), IRRF do pró-labore pela tabela mensal
 * (Lei 11.482 art. 1º; Lei 9.250 arts. 3º-A e 4º), IRRF de 10% sobre o total do mês acima de R$ 50 mil nos dividendos
 * (Lei 9.250 art. 6º-A), IRRF de 17,5% no JCP (Lei 9.249 art. 9º § 2º) e a dedução do JCP pela alíquota marginal.
 */
export function simularRemuneracao(e: EntradaRemuneracao): { mixes: MixCalc[]; melhor: MixRemuneracao; economiaCents: bigint; avisos: string[] } {
  const minimoAnual = e.salarioMinimoCents * 12n;
  const proLaboreMinimo = e.valorAnualCents < minimoAnual ? e.valorAnualCents : minimoAnual;
  const restante = e.valorAnualCents - proLaboreMinimo;
  const jcp = e.jcpLimiteSocioCents === null ? 0n : e.jcpLimiteSocioCents < restante ? e.jcpLimiteSocioCents : restante;
  const mixes = [
    mix(e, 'PRO_LABORE_INTEGRAL', e.valorAnualCents, 0n),
    mix(e, 'PRO_LABORE_MINIMO_DIVIDENDOS', proLaboreMinimo, 0n),
    mix(e, 'PRO_LABORE_MINIMO_JCP_DIVIDENDOS', proLaboreMinimo, jcp),
  ];
  const melhor = mixes.reduce((a, b) => (b.cargaTotalCents < a.cargaTotalCents ? b : a));
  const pior = mixes.reduce((a, b) => (b.cargaTotalCents > a.cargaTotalCents ? b : a));
  const avisos = [
    'pró-labore de 1 salário mínimo é o piso do mix; pró-labore irrisório diante do trabalho do sócio é zona cinzenta (SC Cosit 228/2023 — ADR-INCR-EFICIENCIA-FISCAL A3)',
    'dividendos isentos só até o lucro apurado e escriturado; a distribuição acima dele é tributada como rendimento (Lei 9.249 art. 10)',
    'dividendos repartidos igualmente pelos 12 meses: concentrar num mês acima de R$ 50 mil muda o IRRF (Lei 9.250 art. 6º-A); a tributação mínima anual da Lei 15.270/2025 e o ajuste anual do IRPF não são simulados',
    'dedutibilidade do pró-labore no Real não considerada',
  ];
  if (e.jcpLimiteSocioCents === null) avisos.push('JCP sem benefício fora do lucro real (F-IRD-12): o mix com JCP fica igual ao de dividendos');
  if (!e.cppForaDoDas) avisos.push('CPP de 20% sobre o pró-labore dentro do DAS (LC 123 art. 13 VI); no Anexo IV ela fica fora (art. 18 § 5º-C)');
  return { mixes, melhor: melhor.mix, economiaCents: pior.cargaTotalCents - melhor.cargaTotalCents, avisos };
}

/** IRPJ + adicional + CSLL (bp) no fim do ano — a dedução marginal do JCP no Real. */
export function aliquotaMarginalReal(t: TabelaApuracao, indCsll: string | null, ano: number): number {
  const data = fimDoTrimestre(ano, 'T04');
  return parametroVigente(t, 'IRPJ_ALIQ', data) + parametroVigente(t, 'IRPJ_ADIC_ALIQ', data) + aliquotaCsll(t, indCsll, data).valor;
}

