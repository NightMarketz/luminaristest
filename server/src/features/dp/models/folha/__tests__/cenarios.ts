/**
 * Cenários do motor (PR-4): monta um `DpSnapshot` válido a partir de entradas mínimas, sobre a fotografia real das
 * cargas versionadas (ou uma alterada), pelo mesmo caminho do `DpSnapshotService` (`lerOuAusente`, `parametrosFolha`,
 * `regrasFolha`, `feriadosDoMes`, `linhasIrrfNaData`). É o formato das `entradas` dos goldens.
 */
import type { LinhaLegal } from '../../../../legalParameters/models/legalParameter';
import type { Competencia } from '../../competencia';
import { feriadosDoMes, type DiaSemana } from '../../escala';
import { ultimoDia } from '../../competencia';
import { parametrosFolha } from '../../parametrosFolha';
import { regrasFolha } from '../../regrasFolha';
import type { CategoriaNucleo } from '../../vinculo';
import {
  DP_SNAPSHOT_VERSAO_FORMATO,
  DpSnapshotSchema,
  lerOuAusente,
  linhasIrrfNaData,
  normalizarSnapshot,
  parametrosParaJson,
  regrasParaJson,
  type DpSnapshot,
  type Roteiro,
  type VinculoSnapshot,
} from '../snapshot';
import { alterada, REAL } from './fotografias';

export interface EntradaJornada {
  nome?: string;
  diasTrabalho: DiaSemana[];
  minutosPorDia: number;
  tempoParcial?: boolean;
}
export interface EntradaVersao {
  vigenteDesde: string;
  vigenteAte?: string | null;
  salarioCents: string;
  unidadeSalario: string;
  jornada?: EntradaJornada | null;
  cargoId?: string | null;
  sindicatoId?: string | null;
}
export interface EntradaVinculo {
  id: string;
  trabalhadorId?: string;
  matricula: string;
  categoria: CategoriaNucleo;
  dataInicio: string;
  dataTermino?: string | null;
  unitId?: string;
  /** Atalho para uma versão só, do `dataInicio` em diante. */
  salarioCents?: string;
  unidadeSalario?: string;
  jornada?: EntradaJornada | null;
  versoes?: EntradaVersao[];
  cct?: VinculoSnapshot['cct'];
  lancamentos?: Array<{ id?: string | null; rubrica: string; quantidadeMin?: number; valorCents?: string; origem?: 'MANUAL' | 'MODULO'; data?: string }>;
  afastamentos?: Array<{ id?: string; motivo: string; inicio: string; fim: string | null }>;
  dependentesIrrf?: number;
  salarioFamilia?: Array<{ idade: number; invalido: boolean }>;
  jaPago?: { rendimentoCents: string; irrfRetidoCents: string };
  adiantamentoPagoCents?: string;
  outrasRemuneracoes?: VinculoSnapshot['outrasRemuneracoes'];
  jornadaApurada?: VinculoSnapshot['jornadaApurada'];
}
export interface EntradasCenario {
  competencia: string;
  roteiro?: Roteiro;
  dataPagamento: string;
  adiantamentoBp?: number;
  /** Linhas de FOLHA_REGRA/DP_CATEGORIA_ENCARGO trocadas (item 47: a mesma entrada com outra fotografia de regras). */
  troca?: Record<string, number | string | object>;
  vinculos: EntradaVinculo[];
}

function versao(e: EntradaVersao, i: number, vid: string): VinculoSnapshot['versoes'][number] {
  const j = e.jornada ?? null;
  return {
    id: `${vid}-v${i}`,
    vigenteDesde: e.vigenteDesde,
    vigenteAte: e.vigenteAte ?? null,
    salarioCents: e.salarioCents,
    unidadeSalario: e.unidadeSalario,
    jornada: j && {
      id: `${vid}-j${i}`,
      nome: j.nome ?? `${j.minutosPorDia * j.diasTrabalho.length} min`,
      minutosSemanais: j.minutosPorDia * j.diasTrabalho.length,
      tipoJornada: '1',
      escala: { diasTrabalho: j.diasTrabalho, minutosPorDia: j.minutosPorDia },
      tempoParcial: j.tempoParcial ?? false,
    },
    cargoId: e.cargoId ?? null,
    cargoNome: e.cargoId ? `Cargo ${e.cargoId}` : null,
    sindicatoId: e.sindicatoId ?? null,
  };
}

export function vinculoDe(e: EntradaVinculo): VinculoSnapshot {
  const versoes: EntradaVersao[] = e.versoes ?? [
    { vigenteDesde: e.dataInicio, vigenteAte: e.dataTermino ?? null, salarioCents: e.salarioCents ?? '0', unidadeSalario: e.unidadeSalario ?? '5', jornada: e.jornada ?? null },
  ];
  return {
    vinculoId: e.id,
    trabalhadorId: e.trabalhadorId ?? `t-${e.id}`,
    unitId: e.unitId ?? 'u1',
    matricula: e.matricula,
    categoria: e.categoria,
    dataInicio: e.dataInicio,
    dataTermino: e.dataTermino ?? null,
    idadeNaDataPagamento: 30,
    pcd: false,
    versoes: versoes.map((x, i) => versao(x, i, e.id)),
    cct: e.cct ?? [],
    afastamentos: (e.afastamentos ?? []).map((a, i) => ({ id: a.id ?? `${e.id}-a${i}`, motivo: a.motivo, inicio: a.inicio, fim: a.fim })),
    lancamentos: (e.lancamentos ?? []).map((l, i) => ({
      id: l.origem === 'MODULO' ? null : l.id ?? `${e.id}-l${i}`,
      rubrica: l.rubrica,
      ...(l.quantidadeMin !== undefined ? { quantidadeMin: l.quantidadeMin } : {}),
      ...(l.valorCents !== undefined ? { valorCents: l.valorCents } : {}),
      origem: l.origem ?? 'MANUAL',
      ...(l.data ? { data: l.data } : {}),
    })),
    jornadaApurada: e.jornadaApurada ?? { origem: 'NULO', motivo: 'sem DP-PONTO' },
    dependentes: { irrf: e.dependentesIrrf ?? 0, salarioFamilia: e.salarioFamilia ?? [] },
    jaPagoNoMesDePagamento: e.jaPago ?? { rendimentoCents: '0', irrfRetidoCents: '0' },
    ...(e.adiantamentoPagoCents !== undefined ? { adiantamentoPagoCents: e.adiantamentoPagoCents } : {}),
    outrasRemuneracoes: e.outrasRemuneracoes ?? [],
  };
}

/** O snapshot do cenário, validado pelo schema do contrato e normalizado (item 28), como o serviço devolve. */
export function snapshotDe(e: EntradasCenario, foto: readonly LinhaLegal[] = e.troca ? alterada(e.troca) : REAL): DpSnapshot {
  const competencia = e.competencia as Competencia;
  const ate = ultimoDia(competencia);
  const vinculos = e.vinculos.map(vinculoDe);
  const unidades = [...new Set(vinculos.map((v) => v.unitId))];
  const snap: DpSnapshot = {
    versaoFormato: DP_SNAPSHOT_VERSAO_FORMATO,
    competencia,
    roteiro: e.roteiro ?? 'MENSAL',
    dataPagamento: e.dataPagamento,
    parametros: {
      competencia: lerOuAusente(() => parametrosFolha(foto, ate), parametrosParaJson),
      pagamento: lerOuAusente(() => parametrosFolha(foto, e.dataPagamento), parametrosParaJson),
      irrfPagamento: linhasIrrfNaData(foto, e.dataPagamento),
      ...(e.adiantamentoBp !== undefined ? { adiantamentoBp: e.adiantamentoBp } : {}),
    },
    regras: lerOuAusente(() => regrasFolha(foto, ate), regrasParaJson),
    feriados: Object.fromEntries(unidades.map((u) => [u, feriadosDoMes(competencia, foto, null)])),
    modulosAtivos: [],
    vinculos,
  };
  return normalizarSnapshot(DpSnapshotSchema.parse(snap));
}

export const SEG_SAB: DiaSemana[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
export const SEG_SEX: DiaSemana[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
