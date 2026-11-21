import type { Prisma } from 'generated/prisma';
import type { IFiscalProfileRepository } from '../../accounting/repositories/IFiscalProfileRepository';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { LegalParameterTabela } from '../../legalParameters/models/legalParameter';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { primeiroDia, ultimoDia, type Competencia } from '../models/competencia';
import { dependentesIrrfNaData } from '../models/dependente';
import { escalaDaJornada, feriadosDoMes } from '../models/escala';
import {
  DP_SNAPSHOT_VERSAO_FORMATO,
  DpSnapshotSchema,
  lerOuAusente,
  normalizarSnapshot,
  parametrosParaJson,
  regrasParaJson,
  type DpSnapshot,
  type Roteiro,
  type VinculoSnapshot,
} from '../models/folha/snapshot';
import { parametrosFolha, TABELAS_PARAMETROS_FOLHA } from '../models/parametrosFolha';
import { regrasFolha, TABELAS_REGRAS_FOLHA } from '../models/regrasFolha';
import { vigenteEm } from '../models/vigencia';
import { CATEGORIAS_NUCLEO, idadeEm, type CategoriaNucleo } from '../models/vinculo';
import type { DpPortResolver, ModulosAtivosEm } from '../ports/DpPortResolver';
import type { IDpAfastamentoFeriasRepository } from '../repositories/IDpAfastamentoFeriasRepository';
import type { IDpCadastroRepository } from '../repositories/IDpCadastroRepository';
import type { IDpDependenteRepository } from '../repositories/IDpDependenteRepository';
import type { IDpLancamentoRepository } from '../repositories/IDpLancamentoRepository';
import type { IDpVinculoRepository } from '../repositories/IDpVinculoRepository';

/** As tabelas legais que o snapshot lê da fotografia (G2, item 67 e os feriados do item 69). */
export const TABELAS_SNAPSHOT = [...TABELAS_PARAMETROS_FOLHA, ...TABELAS_REGRAS_FOLHA, 'FERIADO_NACIONAL', 'FERIADO_LOCAL'] as const satisfies readonly LegalParameterTabela[];

/** Itens 8 e 43 — o que a mesma fonte já pagou ao vínculo no mês do pagamento e o último adiantamento da competência. */
export interface PagamentosAnterioresDoVinculo {
  rendimentoCents: bigint;
  irrfRetidoCents: bigint;
  adiantamentoPagoCents?: bigint;
}

/**
 * A fonte destes números são as execuções persistidas (PR-5: `DpFolha`/`DpExecucaoCalculo`) e o percentual do
 * adiantamento da instância (item 50, `DpParametrosFolha`). Vínculo ausente do mapa = nada pago antes no mês.
 */
export interface DpFolhaAnterioresReader {
  pagamentosAnteriores(
    ownerUserId: string,
    vinculoIds: readonly string[],
    competencia: Competencia,
    roteiro: Roteiro,
    dataPagamento: string,
  ): Promise<ReadonlyMap<string, PagamentosAnterioresDoVinculo>>;
  adiantamentoBp(ownerUserId: string, competencia: Competencia): Promise<number | undefined>;
}

export interface DpSnapshotDeps {
  vinculos: Pick<IDpVinculoRepository, 'listVinculosCompletosNoPeriodo'>;
  cadastros: Pick<IDpCadastroRepository, 'listParametrosCctNoPeriodo'>;
  afastamentos: Pick<IDpAfastamentoFeriasRepository, 'listAfastamentosDosVinculos'>;
  lancamentos: Pick<IDpLancamentoRepository, 'listLancamentosDosVinculos' | 'listOutrasRemuneracoesDosVinculos'>;
  dependentes: Pick<IDpDependenteRepository, 'listDosTrabalhadores'>;
  fiscalProfiles: Pick<IFiscalProfileRepository, 'findManyByOwner'>;
  legalParams: Pick<LegalParameterService, 'fotografia'>;
  modulosAtivosEm: ModulosAtivosEm;
  portas: Pick<DpPortResolver, 'resolver'>;
  anteriores: DpFolhaAnterioresReader;
}

const agrupar = <T>(linhas: readonly T[], chave: (x: T) => string): Map<string, T[]> => {
  const m = new Map<string, T[]>();
  for (const l of linhas) m.set(chave(l), [...(m.get(chave(l)) ?? []), l]);
  return m;
};
const tocaMes = (v: { vigenteDesde: string; vigenteAte: string | null }, de: string, ate: string) =>
  v.vigenteDesde <= ate && (v.vigenteAte === null || v.vigenteAte >= de);

/**
 * BE-INCR-DP-F2 itens 27–29 e 33 (PR-3) — monta o snapshot da competência: só lê e serializa, sem cálculo (item 33).
 * Lê os vínculos vivos que tocam o mês com todas as versões que o tocam (G5) e os cadastros delas, os parâmetros da CCT
 * dos sindicatos das versões (G7), os afastamentos que tocam o mês (G8), os lançamentos da competência (item 16), os
 * itens da porta de jornada (item 18), os dependentes vigentes na data de pagamento (item 13), os módulos ativos (G10),
 * as outras remunerações (item 77), os parâmetros legais no último dia da competência e na data de pagamento (item 8;
 * L4 da cédula `D-2026-11-21-PES4-F2-PR3-PR4-LACUNAS`) e as regras no último dia da competência. Nenhuma leitura de
 * `employees` (D-2 do F0+F1). O resultado passa pelo schema do contrato e sai normalizado (item 28).
 */
/** `tx`: a transação do `calcular` (item 51, PR-5) — as leituras de DP passam por ela (gate dentro da tx). */
export class DpSnapshotService {
  constructor(private readonly deps: DpSnapshotDeps) {}

  async montar(scope: AccountingScope, competencia: Competencia, roteiro: Roteiro, dataPagamento: string, tx?: Prisma.TransactionClient): Promise<DpSnapshot> {
    const d = this.deps;
    const dono = scope.ownerUserId;
    const de = primeiroDia(competencia);
    const ate = ultimoDia(competencia);
    const fontes = (await d.vinculos.listVinculosCompletosNoPeriodo(dono, de, ate, tx)).filter((v) =>
      (CATEGORIAS_NUCLEO as readonly string[]).includes(v.categoria),
    );
    const vinculoIds = fontes.map((v) => v.id);
    const versoesDoMes = new Map(fontes.map((v) => [v.id, v.versoes.filter((x) => tocaMes(x, de, ate))]));
    const sindicatoIds = [...new Set([...versoesDoMes.values()].flat().flatMap((x) => (x.sindicatoId ? [x.sindicatoId] : [])))];
    const [cct, afastamentos, lancamentos, outras, dependentes, perfis, fotografia, modulosAtivos, portas, anteriores, adiantamentoBp] = await Promise.all([
      d.cadastros.listParametrosCctNoPeriodo(dono, sindicatoIds, de, ate, tx),
      d.afastamentos.listAfastamentosDosVinculos(vinculoIds, de, ate, tx),
      d.lancamentos.listLancamentosDosVinculos(vinculoIds, competencia, tx),
      d.lancamentos.listOutrasRemuneracoesDosVinculos(vinculoIds, competencia, tx),
      d.dependentes.listDosTrabalhadores([...new Set(fontes.map((v) => v.trabalhadorId))], tx),
      d.fiscalProfiles.findManyByOwner(dono, tx),
      d.legalParams.fotografia([...TABELAS_SNAPSHOT]),
      d.modulosAtivosEm(dono, competencia),
      d.portas.resolver(dono, competencia),
      d.anteriores.pagamentosAnteriores(dono, vinculoIds, competencia, roteiro, dataPagamento),
      d.anteriores.adiantamentoBp(dono, competencia),
    ]);
    const cctPorSindicato = agrupar(cct, (p) => p.convencao.sindicatoId);
    const afastPorVinculo = agrupar(afastamentos, (a) => a.vinculoId);
    const lancPorVinculo = agrupar(lancamentos, (l) => l.vinculoId);
    const outrasPorVinculo = agrupar(outras, (o) => o.vinculoId);
    const depPorTrabalhador = agrupar(dependentes, (x) => x.trabalhadorId);
    const codMun = new Map(perfis.map((p) => [p.unitId, p.codMun ?? null]));

    const vinculos: VinculoSnapshot[] = [];
    for (const v of fontes) {
      const versoes = versoesDoMes.get(v.id) ?? [];
      const sindicatos = new Set(versoes.flatMap((x) => (x.sindicatoId ? [x.sindicatoId] : [])));
      const apurada = await portas.JORNADA_APURADA.apurar(dono, v.id, competencia);
      const deps = depPorTrabalhador.get(v.trabalhadorId) ?? [];
      const pago = anteriores.get(v.id);
      vinculos.push({
        vinculoId: v.id,
        trabalhadorId: v.trabalhadorId,
        unitId: v.unitId,
        matricula: v.matricula,
        categoria: v.categoria as CategoriaNucleo,
        dataInicio: v.dataInicio,
        dataTermino: v.dataTermino,
        idadeNaDataPagamento: idadeEm(v.trabalhador.nascimento, dataPagamento),
        pcd: v.trabalhador.pcd,
        versoes: versoes.map((x) => ({
          id: x.id,
          vigenteDesde: x.vigenteDesde,
          vigenteAte: x.vigenteAte,
          salarioCents: x.salarioCents.toString(),
          unidadeSalario: x.unidadeSalario,
          jornada: x.jornada && {
            id: x.jornada.id,
            nome: x.jornada.nome,
            minutosSemanais: x.jornada.minutosSemanais,
            tipoJornada: x.jornada.tipoJornada,
            escala: escalaDaJornada(x.jornada),
          },
          cargoId: x.cargoId,
          cargoNome: x.cargo?.nome ?? null,
          sindicatoId: x.sindicatoId,
        })),
        cct: [...sindicatos].flatMap((s) =>
          (cctPorSindicato.get(s) ?? []).map((p) => ({
            id: p.id,
            sindicatoId: s,
            chave: p.chave,
            discriminador: p.discriminador,
            valorInt: p.valorInt.toString(),
            vigenteDesde: p.vigenteDesde,
            vigenteAte: p.vigenteAte,
          })),
        ),
        afastamentos: (afastPorVinculo.get(v.id) ?? []).map((a) => ({ id: a.id, motivo: a.motivo, inicio: a.inicio, fim: a.fim })),
        lancamentos: [
          ...(lancPorVinculo.get(v.id) ?? []).map((l) => ({
            id: l.id,
            rubrica: l.rubrica,
            ...(l.quantidadeMin !== null ? { quantidadeMin: l.quantidadeMin } : {}),
            ...(l.valorCents !== null ? { valorCents: l.valorCents.toString() } : {}),
            origem: l.origem as 'MANUAL' | 'MODULO',
          })),
          ...apurada.itens.map((i) => ({ id: null, rubrica: i.rubrica, quantidadeMin: i.quantidadeMin, origem: 'MODULO' as const, ...(i.data ? { data: i.data } : {}) })),
        ],
        jornadaApurada: { origem: apurada.origem, ...(apurada.motivo ? { motivo: apurada.motivo } : {}) },
        dependentes: {
          irrf: dependentesIrrfNaData(deps, dataPagamento),
          salarioFamilia: deps
            .filter((x) => x.salarioFamilia && vigenteEm(x, dataPagamento))
            .map((x) => ({ idade: idadeEm(x.nascimento, dataPagamento), invalido: x.invalido })),
        },
        jaPagoNoMesDePagamento: { rendimentoCents: (pago?.rendimentoCents ?? 0n).toString(), irrfRetidoCents: (pago?.irrfRetidoCents ?? 0n).toString() },
        ...(pago?.adiantamentoPagoCents !== undefined ? { adiantamentoPagoCents: pago.adiantamentoPagoCents.toString() } : {}),
        outrasRemuneracoes: (outrasPorVinculo.get(v.id) ?? []).map((o) => ({
          id: o.id,
          remuneracaoCents: o.remuneracaoCents.toString(),
          contribuicaoCents: o.contribuicaoCents.toString(),
          ordem: o.ordem,
          categoriaOutraFonte: o.categoriaOutraFonte,
        })),
      });
    }

    const unidades = [...new Set(fontes.map((v) => v.unitId))];
    const snap: DpSnapshot = {
      versaoFormato: DP_SNAPSHOT_VERSAO_FORMATO,
      competencia,
      roteiro,
      dataPagamento,
      parametros: {
        competencia: lerOuAusente(() => parametrosFolha(fotografia, ate), parametrosParaJson),
        pagamento: lerOuAusente(() => parametrosFolha(fotografia, dataPagamento), parametrosParaJson),
        ...(adiantamentoBp !== undefined ? { adiantamentoBp } : {}),
      },
      regras: lerOuAusente(() => regrasFolha(fotografia, ate), regrasParaJson),
      feriados: Object.fromEntries(unidades.map((u) => [u, feriadosDoMes(competencia, fotografia, codMun.get(u) ?? null)])),
      modulosAtivos: [...modulosAtivos],
      vinculos,
    };
    return normalizarSnapshot(DpSnapshotSchema.parse(snap));
  }
}
