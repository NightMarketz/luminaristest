/**
 * Fatiamento da competência — BE-INCR-DP-F2 itens 30–32 (PR-3). Função pura sobre o vínculo do snapshot.
 *
 * O mês do vínculo é cortado nos dias em que muda a versão, começa ou termina o vínculo, começa ou termina um
 * afastamento ou acaba o trecho do afastamento pago pela empresa (item 32). Cada fatia tem a versão vigente, o
 * afastamento que a cobre (com quem paga), os dias de calendário e os dias remunerados na base do mensalista (item 31).
 */
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../../../accounting/models/dates';
import { primeiroDia, ultimoDia, type Competencia } from '../competencia';
import type { RegrasFolha } from '../regrasFolha';
import { versaoVigente } from '../vigencia';
import { vespera } from '../vinculo';
import { trechoPagoPelaEmpresa } from './afastamento';
import { diasDevidosMensalista } from './salario';
import type { AfastamentoSnapshot, VersaoSnapshot, VinculoSnapshot } from './snapshot';

/**
 * Item 32 / F-DPF-5 (a) — o único motivo da Tabela 18 com regra no F2: 03, "Acidente/doença não relacionada ao trabalho"
 * (`legal_parameters_dp_v1.sql`, linha `esoc-afast-03-2014-01-01`). Os `AFASTAMENTO_DIAS_EMPRESA` primeiros dias são
 * pagos pela empresa (Lei 8.213/1991 art. 60 § 3º [D03]); qualquer outro motivo fica sem regra (pendência no motor).
 */
export const MOTIVOS_AFASTAMENTO_PAGO_PELA_EMPRESA = ['03'] as const;

/** `undSalFixo` 5 (por mês): o único com dias remunerados na base de 30 (item 31; L3 da cédula de 21/11). */
export const UNIDADE_SALARIO_MENSAL = '5';

export type PagoPor = 'EMPRESA' | 'PREVIDENCIA' | 'SEM_REGRA';

export interface Fatia {
  inicio: string;
  fim: string;
  /** Dias de calendário. */
  dias: number;
  versao: VersaoSnapshot | null;
  afastamento: { id: string; motivo: string; pagoPor: PagoPor } | null;
  /**
   * Item 31 — dias devidos na base de `MENSALISTA_BASE_DIAS` (F-DPF-4 a) para a unidade 5; 0 no trecho que a previdência
   * paga; `null` fora do mensalista (o horista vem do lançamento, L2), sem versão ou com afastamento sem regra.
   */
  diasRemunerados: number | null;
}

const proximoDia = (d: string) => dateOnlyFromDayNumber(dayNumberFromDateOnly(d) + 1);
const diasEntre = (de: string, ate: string) => dayNumberFromDateOnly(ate) - dayNumberFromDateOnly(de) + 1;

/** O período do vínculo dentro da competência; `null` se o vínculo não toca o mês. */
export function periodoNoMes(v: Pick<VinculoSnapshot, 'dataInicio' | 'dataTermino'>, competencia: Competencia): { inicio: string; fim: string } | null {
  const inicio = [v.dataInicio, primeiroDia(competencia)].sort()[1];
  const fim = [v.dataTermino ?? ultimoDia(competencia), ultimoDia(competencia)].sort()[0];
  return inicio > fim ? null : { inicio, fim };
}

/** Item 32 — quem paga o dia `data` do afastamento `a`. */
function pagoPor(a: AfastamentoSnapshot, data: string, competencia: Competencia, diasEmpresa: RegrasFolha['afastamentoDiasEmpresa']): PagoPor {
  if (!(MOTIVOS_AFASTAMENTO_PAGO_PELA_EMPRESA as readonly string[]).includes(a.motivo)) return 'SEM_REGRA';
  const trecho = trechoPagoPelaEmpresa(competencia, a, diasEmpresa);
  return trecho !== null && trecho.inicio <= data && data <= trecho.fim ? 'EMPRESA' : 'PREVIDENCIA';
}

const cobre = (a: AfastamentoSnapshot, d: string) => a.inicio <= d && (a.fim === null || d <= a.fim);

/**
 * Item 30 — as fatias cobrem exatamente o período do vínculo no mês, sem buraco nem sobreposição. Afastamentos que se
 * sobrepõem (o cadastro do F1 não deixa) cobrem a fatia pelo de início mais antigo.
 */
export function fatiar(
  v: VinculoSnapshot,
  competencia: Competencia,
  regras: Pick<RegrasFolha, 'afastamentoDiasEmpresa' | 'mensalistaBaseDias'>,
): Fatia[] {
  const periodo = periodoNoMes(v, competencia);
  if (periodo === null) return [];
  const dentro = (d: string) => periodo.inicio < d && d <= periodo.fim;
  const cortes = new Set<string>([periodo.inicio]);
  const corte = (d: string | null) => {
    if (d !== null && dentro(d)) cortes.add(d);
  };
  for (const x of v.versoes) {
    corte(x.vigenteDesde);
    corte(x.vigenteAte && proximoDia(x.vigenteAte));
  }
  for (const a of v.afastamentos) {
    corte(a.inicio);
    corte(a.fim && proximoDia(a.fim));
    if ((MOTIVOS_AFASTAMENTO_PAGO_PELA_EMPRESA as readonly string[]).includes(a.motivo)) {
      const trecho = trechoPagoPelaEmpresa(competencia, a, regras.afastamentoDiasEmpresa);
      if (trecho) corte(proximoDia(trecho.fim));
    }
  }
  const inicios = [...cortes].sort();
  const afastamentos = [...v.afastamentos].sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0));
  // Dias comerciais acumulados desde o início do período: a soma das fatias telescopa para o período inteiro (F-DPF-4 a).
  const acumulado = (ate: string) => diasDevidosMensalista(competencia, periodo.inicio, ate, regras.mensalistaBaseDias);
  return inicios.map((inicio, i) => {
    const fim = i + 1 < inicios.length ? vespera(inicios[i + 1]) : periodo.fim;
    const versao = versaoVigente(v.versoes, inicio);
    const a = afastamentos.find((x) => cobre(x, inicio)) ?? null;
    const afastamento = a && { id: a.id, motivo: a.motivo, pagoPor: pagoPor(a, inicio, competencia, regras.afastamentoDiasEmpresa) };
    const comerciais = acumulado(fim) - (inicio === periodo.inicio ? 0 : acumulado(vespera(inicio)));
    let diasRemunerados: number | null = null;
    if (versao !== null && versao.unidadeSalario === UNIDADE_SALARIO_MENSAL && afastamento?.pagoPor !== 'SEM_REGRA') {
      diasRemunerados = afastamento?.pagoPor === 'PREVIDENCIA' ? 0 : comerciais;
    }
    return { inicio, fim, dias: diasEntre(inicio, fim), versao, afastamento, diasRemunerados };
  });
}
