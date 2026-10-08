import type { SalaoParceriaContrato, SimplesHistoricoMensal } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import { janelaRbt12 } from '../models/simplesCalc';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ISimplesEntradasRepository, ParceriaData } from '../repositories/ISimplesEntradasRepository';
import {
  excluirDoMotivo,
  type SalaoParceriaContratoInput,
  type SalaoParceriaContratoPatch,
  type SalaoParceriaContratoView,
  type SimplesHistoricoUpsert,
  type SimplesHistoricoView,
  type SimplesSegregacaoParcela,
  type SimplesSegregacaoUpsert,
  type SimplesSegregacaoView,
} from '../dtos/SimplesDto';

/** Alertas que as entradas produzem para a apuração (BRIEF §3, `ApuracaoSimples.alertas`). */
export type AlertaEntradaSimples = { codigo: 'RBT12_INCOMPLETO' | 'SEGREGACAO_MANUAL'; detalhe: string };

/**
 * BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, BRIEF itens 10–13) — entradas da apuração do Simples que o sistema ainda não
 * produz sozinho: receita/folha pré-adoção (itens 10–11), segregação manual interina (item 12, F-SN-6 → b) e contratos
 * salão-parceiro (item 13, F-SN-12 → b). Escrita = `canManageTaxAssessment`; leitura = `canReadTaxAssessment`.
 */
export class SimplesEntradasService {
  constructor(
    private readonly repo: ISimplesEntradasRepository,
    private readonly policy: IAccountingPolicy,
  ) {}

  // ---- itens 10–11: histórico pré-adoção ----

  async upsertHistorico(scope: AccountingScope, competencia: string, input: SimplesHistoricoUpsert): Promise<SimplesHistoricoView> {
    this.assertManage(scope);
    const sourceDocumentId = input.sourceDocumentId ?? null;
    if (sourceDocumentId && !(await this.repo.sourceDocumentExists(scope, sourceDocumentId))) {
      throw new NotFoundError(`Documento de origem '${sourceDocumentId}' não encontrado nesta unidade.`);
    }
    const row = await this.repo.upsertHistorico(scope, competencia, {
      receitaBrutaCents: BigInt(input.receitaBrutaCents),
      folhaCents: input.folhaCents === undefined || input.folhaCents === null ? null : BigInt(input.folhaCents),
      sourceDocumentId,
    });
    return historicoView(row);
  }

  /**
   * Item 10 — meses da janela do RBT12 do PA (`janelaRbt12`, PR-1) sem receita declarada no histórico NEM no subrazão
   * (`mesesComSubrazao`, do `ReceitaFiscalService`) ⇒ `RBT12_INCOMPLETO`; a apuração não confirma (PR-3, item 20).
   */
  async alertaRbt12(scope: AccountingScope, competencia: string, mesesComSubrazao: ReadonlySet<string>): Promise<AlertaEntradaSimples | null> {
    this.assertRead(scope);
    const j = janelaRbt12(competencia);
    const meses: string[] = [];
    for (let m = j.de; m <= j.ate; m = proximoMes(m)) meses.push(m);
    const declarados = new Set((await this.repo.findHistorico(scope, meses)).map((h) => h.competencia));
    const faltantes = meses.filter((m) => !declarados.has(m) && !mesesComSubrazao.has(m));
    return faltantes.length === 0 ? null : { codigo: 'RBT12_INCOMPLETO', detalhe: `sem receita declarada em ${faltantes.join(', ')}` };
  }

  // ---- item 12: segregação manual ----

  async upsertSegregacao(scope: AccountingScope, competencia: string, input: SimplesSegregacaoUpsert): Promise<SimplesSegregacaoView> {
    this.assertManage(scope);
    const row = await this.repo.upsertSegregacao(scope, competencia, input.parcelas);
    return { id: row.id, unitId: row.unitId, competencia: row.competencia, parcelas: comExcluir(input.parcelas), updatedAt: row.updatedAt.toISOString() };
  }

  /** Item 12 — a declaração da competência (com os tributos excluídos derivados do motivo) e o alerta `SEGREGACAO_MANUAL`. */
  async segregacaoDaCompetencia(scope: AccountingScope, competencia: string): Promise<{ parcelas: SimplesSegregacaoView['parcelas']; alerta: AlertaEntradaSimples | null }> {
    this.assertRead(scope);
    const row = await this.repo.findSegregacao(scope, competencia);
    const parcelas = comExcluir((row?.parcelas ?? []) as SimplesSegregacaoParcela[]);
    return {
      parcelas,
      alerta: parcelas.length === 0 ? null : { codigo: 'SEGREGACAO_MANUAL', detalhe: `${parcelas.length} parcela(s) segregada(s) por declaração manual` },
    };
  }

  // ---- item 13: contratos de parceria ----

  async createParceria(scope: AccountingScope, input: SalaoParceriaContratoInput): Promise<SalaoParceriaContratoView> {
    this.assertManage(scope);
    const data = parceriaData(input);
    return this.repo.runTransaction(async (tx) => {
      await this.assertSemSobreposicao(scope, data, null, tx);
      return parceriaView(await this.repo.createParceria(scope, data, tx));
    });
  }

  async updateParceria(scope: AccountingScope, id: string, patch: SalaoParceriaContratoPatch): Promise<SalaoParceriaContratoView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const atual = await this.repo.findParceria(scope, id, tx);
      if (!atual) throw new NotFoundError(`Contrato de parceria '${id}' não encontrado.`);
      const { unitId: _unitId, ...campos } = patch;
      const novo: ParceriaData = { ...parceriaData(atual), ...campos } as ParceriaData;
      if (novo.vigenteAte !== null && novo.vigenteAte < novo.vigenteDesde) throw new ValidationError('vigenteAte antes de vigenteDesde');
      await this.assertSemSobreposicao(scope, novo, id, tx);
      return parceriaView(await this.repo.updateParceria(scope, id, campos, tx));
    });
  }

  async deleteParceria(scope: AccountingScope, id: string): Promise<void> {
    this.assertManage(scope);
    if (!(await this.repo.findParceria(scope, id))) throw new NotFoundError(`Contrato de parceria '${id}' não encontrado.`);
    await this.repo.softDeleteParceria(scope, id);
  }

  async listParcerias(scope: AccountingScope): Promise<SalaoParceriaContratoView[]> {
    this.assertRead(scope);
    return (await this.repo.listParcerias(scope)).map(parceriaView);
  }

  /**
   * Item 13 / B-3 → a — o contrato que produz efeito no `dia` para o profissional do item: vigente e já homologado (sem
   * homologação o contrato não produz efeito — Lei 12.592 art. 1º-A § 8º). Leitura interna da ponte de receita.
   */
  async contratoEmEfeito(scope: AccountingScope, profissionalContactId: string, dia: string): Promise<SalaoParceriaContrato | null> {
    const contratos = await this.repo.findParceriasDoProfissional(scope, profissionalContactId);
    return (
      contratos.find((c) => c.homologadoEm <= dia && c.vigenteDesde <= dia && (c.vigenteAte === null || dia <= c.vigenteAte)) ?? null
    );
  }

  /**
   * Dois contratos vigentes ao mesmo tempo para o mesmo profissional deixariam a cota do item ambígua — recusa (409).
   */
  private async assertSemSobreposicao(scope: AccountingScope, d: ParceriaData, ignorarId: string | null, tx: Parameters<ISimplesEntradasRepository['findParceriasDoProfissional']>[2]): Promise<void> {
    const outros = (await this.repo.findParceriasDoProfissional(scope, d.profissionalContactId, tx)).filter((c) => c.id !== ignorarId);
    const fim = (x: string | null) => x ?? '9999-12-31';
    const choca = outros.find((c) => c.vigenteDesde <= fim(d.vigenteAte) && d.vigenteDesde <= fim(c.vigenteAte));
    if (choca) {
      throw new ConflictError(`O profissional já tem contrato de parceria vigente no período (${choca.vigenteDesde} a ${choca.vigenteAte ?? 'sem fim'}).`);
    }
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para alterar as entradas do Simples Nacional.');
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler as entradas do Simples Nacional.');
  }
}

function proximoMes(m: string): string {
  const [a, mm] = m.split('-').map(Number);
  return mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}`;
}

function comExcluir(parcelas: readonly SimplesSegregacaoParcela[]): SimplesSegregacaoView['parcelas'] {
  return parcelas.map((p) => ({ ...p, excluir: excluirDoMotivo(p.motivo) }));
}

function parceriaData(v: ParceriaData | SalaoParceriaContratoInput): ParceriaData {
  return {
    profissionalContactId: v.profissionalContactId,
    cotaSalaoBp: v.cotaSalaoBp,
    naturezaCota: v.naturezaCota,
    homologadoEm: v.homologadoEm,
    sindicato: v.sindicato,
    vigenteDesde: v.vigenteDesde,
    vigenteAte: v.vigenteAte,
  };
}

function historicoView(r: SimplesHistoricoMensal): SimplesHistoricoView {
  return {
    id: r.id,
    unitId: r.unitId,
    competencia: r.competencia,
    receitaBrutaCents: Number(r.receitaBrutaCents),
    folhaCents: r.folhaCents === null ? null : Number(r.folhaCents),
    sourceDocumentId: r.sourceDocumentId,
    updatedAt: r.updatedAt.toISOString(),
  };
}

function parceriaView(r: SalaoParceriaContrato): SalaoParceriaContratoView {
  return {
    id: r.id,
    unitId: r.unitId,
    profissionalContactId: r.profissionalContactId,
    cotaSalaoBp: r.cotaSalaoBp,
    naturezaCota: r.naturezaCota as SalaoParceriaContratoView['naturezaCota'],
    homologadoEm: r.homologadoEm,
    sindicato: r.sindicato,
    vigenteDesde: r.vigenteDesde,
    vigenteAte: r.vigenteAte,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
