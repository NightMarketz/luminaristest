/**
 * SimplesApuracaoService — apuração mensal do Simples Nacional ME/EPP (nó X14, PR-3, BRIEF itens 17–21, 23). FIRST-CLASS
 * PRISMA (`SimplesApuracao`, B-1 → c). O cálculo é o puro do PR-1 (`apurar`); este serviço monta a entrada a partir das
 * entradas do PR-2 (subrazão, histórico, segregação, parcerias) e grava só no registro do DAS oficial (B-2 → a).
 *
 * atomicUntil: postEntry
 *   commit 1 — razão: estorno da provisão da substituída (tx própria, idempotente) e postEntry(sourceType=
 *              'simples.das.provision', sourceId=<id da apuração>) no último dia da competência, D dedução da receita /
 *              C Simples a recolher pelo valor OFICIAL (F-SN-10 → a); gate de período dentro do postEntry
 *              teste: simplesApuracao.integration.test.ts › "item 21: provisão pelo valor oficial; substituição estorna a anterior — 1 provisão viva"
 *              teste: simplesApuracao.integration.test.ts › "item 21: sem contas no perfil ⇒ o DAS fica registrado, provisão pendente"
 *   commit 2 — subrazão: CAS provisaoEntryId `where null`
 *              teste: simplesApuracao.integration.test.ts › "item 21 (reconcile): repetir o PUT com o mesmo DAS completa a provisão sem linha nova"
 *   reconcile — repetir o PUT com o mesmo número e valor não cria linha: só completa a provisão (idempotente pela fonte)
 *              teste: simplesApuracao.integration.test.ts › "item 21 (reconcile): repetir o PUT com o mesmo DAS completa a provisão sem linha nova"
 *   fora da tx — o registro (supersede + linha nova + auditoria) commita ANTES, num runTransaction próprio, com o gate
 *              re-checado dentro dele (as receitas mensais relidas na tx têm de ser as do cálculo); falha da provisão não o
 *              desfaz
 *              teste: simplesApuracao.integration.test.ts › "item 20: gate dentro da tx — entrada mudou entre o cálculo e o registro ⇒ 409, nada gravado"
 */
import type { Prisma, SimplesApuracao } from 'generated/prisma';
import { ConflictError, ForbiddenError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { ParametroLegalAusenteError, linhaLegalVigente, type LegalParameterTabela } from '../../legalParameters/models/legalParameter';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { INICIO_LC214, apurar, apurarSimei, janelaRbt12, type ApuracaoSimei, type ApuracaoCalculada, type AtividadeInput, type MesReceita, type NaturezaSimples } from '../models/simplesCalc';
import { espelhoPgdas, type EspelhoAtividade } from '../models/simplesEspelho';
import { mesBounds } from '../models/Lalur.model';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { IReceitaFiscalRepository } from '../repositories/IReceitaFiscalRepository';
import type { IServiceFiscalProfileRepository } from '../repositories/IServiceFiscalProfileRepository';
import type { ISimplesApuracaoRepository } from '../repositories/ISimplesApuracaoRepository';
import type { ISimplesEntradasRepository } from '../repositories/ISimplesEntradasRepository';
import type { IIssBeneficioMunicipalRepository } from '../repositories/IIssBeneficioMunicipalRepository';
import { beneficioDaAtividade, excecaoPisoIss, type BeneficioCadastrado } from '../models/issBeneficio';
import { toBeneficio } from './IssBeneficioMunicipalService';
import { TABELA_ANEXO_XI, anexoXiVigente, cnaesForaDoAnexo, enquadramentoDasOcupacoes, transportadorNaTabelaB, ocupacoesExcluidas, type OcupacaoAnexoXi } from '../models/meiAnexoXi';
import type { IssBeneficioTipo } from '../dtos/IssBeneficioMunicipalDto';
import type { AuditService } from './AuditService';
import type { PostingService } from './PostingService';
import type { ReceitaFiscalService } from './ReceitaFiscalService';
import type { SimplesEntradasService } from './SimplesEntradasService';
import { excluirDoMotivo, type AlertaSimples, type CodigoAlertaSimples, type SimplesDasRegistro, type SimplesSegregacaoParcela } from '../dtos/SimplesDto';

export const SIMPLES_DAS_PROVISION_SOURCE_TYPE = 'simples.das.provision';
/** BRIEF item 24: SIMPLES_DAS_REGISTRADO / SIMPLES_DAS_SUBSTITUIDO, no padrão de nome da allowlist. */
export const SIMPLES_DAS_REGISTRADO = 'tax.simples_das.registrado';
export const SIMPLES_DAS_SUBSTITUIDO = 'tax.simples_das.substituido';

const TABELAS: readonly LegalParameterTabela[] = ['SIMPLES_ANEXO_FAIXA', 'SIMPLES_ANEXO_REPARTICAO', 'SIMPLES_TETO_ISS', 'SIMPLES_ENQUADRAMENTO', 'SIMPLES_LIMITE'];

export type { AlertaSimples, CodigoAlertaSimples } from '../dtos/SimplesDto';
/** Última competência em que a ME/EPP ainda pode usar documento municipal (NFS-e nacional obrigatória desde 01/11/2026). */
const FIM_DOCUMENTO_MUNICIPAL = '2026-10';
/** Item 20: alertas que impedem o registro do DAS. */
const BLOQUEANTES: readonly CodigoAlertaSimples[] = ['TIEOUT_DIVERGENTE', 'RBT12_INCOMPLETO', 'ATIVIDADE_SEM_ANEXO'];

/** BRIEF §3 `ApuracaoSimples` — ME/EPP (o MEI é `ApuracaoMei`, PR-4). */
export interface ApuracaoSimples extends Omit<ApuracaoCalculada, 'mesesFaltantes'> {
  espelho: EspelhoAtividade[];
  dasOficial: { id: string; numeroDocumento: string; valorCents: number; vencimento: string; provisaoPendente: boolean } | null;
  divergenciaCents: number | null;
  tieOut: { subrazaoCents: number; razaoCents: number; ok: boolean };
  alertas: AlertaSimples[];
}

/** X14 PR-4 (itens 25, 26, 31) — a apuração do SIMEI: valor fixo, receita do ano para o limite e a conferência NFS-e. */
export interface ApuracaoMei extends ApuracaoSimei {
  enquadramento: { contribuinteIcms: boolean; contribuinteIss: boolean };
  receitaPaCents: number;
  receitaAcumuladaAnoCents: number;
  limiteAnoCents: number;
  dasOficial: ApuracaoSimples['dasOficial'];
  divergenciaCents: number | null;
  alertas: AlertaSimples[];
}

/**
 * X14 PR-4 (item 29; correções do dono 09/10, F-PR4-1..6) — SUGESTÃO da alíquota para o documento fiscal da prestação no
 * mês, com a memória de cálculo. Quem informa e responde pela alíquota é o prestador (LC 123 art. 21 § 4º VI).
 */
export interface AliquotasSimples {
  competencia: string;
  /** O PA cuja faixa vale (= `periodoApuracao`); no mês de início, a própria competência. */
  mesReferencia: string;
  sugestao: true;
  /** INICIO_ATIVIDADE (§ 4º II, 2%) · FAIXA_MES_ANTERIOR (§ 4º I red. LC 155, até 2026) · FAIXA_MES_PRESTACAO (red. LC 227, 2027+). */
  regra: 'INICIO_ATIVIDADE' | 'FAIXA_MES_ANTERIOR' | 'FAIXA_MES_PRESTACAO';
  periodoApuracao: string | null;
  rbt12Cents: number | null;
  janelaRbt12: ApuracaoCalculada['janelaRbt12'] | null;
  atividades: Array<{
    anexo: string | null;
    natureza: NaturezaSimples;
    cTribNac: string | null;
    faixa: number | null;
    fatorR: string | null;
    aliquotaEfetiva: string | null;
    issRetencao: string | null;
    /** SIMPLES-PISO-ANEXO-XI bloco 1 (item 4): o benefício municipal vigente — a legislação vai no documento (art. 27 § 1º). */
    beneficioMunicipal: { legislacao: string; tipo: IssBeneficioTipo; pisoAplicado: boolean; excecaoPiso: boolean } | null;
    pTotTribSNSugerido: string | null;
    creditoAdquirente: { ICMS: string | null; IBS: string | null; CBS: string | null } | null;
  }>;
  avisos: string[];
  alertas: AlertaSimples[];
}

/** F-PR4-6: a rota sugere; o prestador responde pela alíquota informada. */
const AVISOS_ALIQUOTA = [
  'Sugestão: a alíquota informada no documento fiscal é responsabilidade do prestador; informada a menor, a diferença é recolhida em guia do Município (LC 123 art. 21 § 4º VI; Res. CGSN 140 art. 27 VI).',
  'O Município pode fixar critério próprio de informação da alíquota (Res. CGSN 140 art. 27 § 2º).',
  'Isenção ou redução municipal do ISS cadastrada reduz o percentual efetivo do ISS da faixa (Res. CGSN 140 art. 32 § 1º), sem resultar em menos de 2%, exceto nos subitens 7.02, 7.05 e 16.01 (art. 31 p.ú.; LC 116 art. 8º-A § 1º); informe no documento a alíquota e a legislação concessiva (art. 27 § 1º). Valor fixo municipal não entra na sugestão.',
];
const AVISO_INICIO =
  'Mês de início de atividade (abertura do CNPJ, Res. CGSN 140 art. 2º V): 2% (LC 123 art. 21 § 4º II); a diferença para a alíquota apurada é recolhida no mês seguinte em guia do Município (§ 4º III).';

const proximo = (m: string, d: number): string => {
  const [a, mm] = m.split('-').map(Number);
  const t = a * 12 + (mm - 1) + d;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
const meses = (de: string, ate: string): string[] => {
  const out: string[] = [];
  for (let m = de; m <= ate; m = proximo(m, 1)) out.push(m);
  return out;
};
const fimDoMes = (comp: string): string => mesBounds(Number(comp.slice(0, 4)), Number(comp.slice(5, 7))).to.toISOString().slice(0, 10);

/** Receita mensal (centavos) que o cálculo usou, por competência — a impressão digital do gate dentro da tx. */
type Receitas = Map<string, bigint>;

interface Montagem {
  calculada: ApuracaoCalculada;
  entrada: AtividadeInput[];
  receitas: Receitas;
  /** Item 20 — as entradas lidas (histórico, subrazão, linhas do PA, contratos, segregação, início de atividade). */
  impressao: string;
  alertas: AlertaSimples[];
  tieOut: { subrazaoCents: number; razaoCents: number; ok: boolean };
  /** SIMPLES-PISO-ANEXO-XI bloco 1: benefício municipal por atividade (`natureza|cTribNac`). */
  beneficios: Map<string, BeneficioCadastrado>;
}

/** X14 PR-4 — o que a montagem do SIMEI devolve (a `impressao` é o gate do item 20, como na do ME/EPP). */
interface MontagemMei {
  calculada: ApuracaoSimei;
  impressao: string;
  alertas: AlertaSimples[];
  enquadramento: { contribuinteIcms: boolean; contribuinteIss: boolean };
  receitaPaCents: bigint;
  acumulado: bigint;
  limite: bigint;
}

export class SimplesApuracaoService {
  constructor(
    private readonly repo: ISimplesApuracaoRepository,
    private readonly entradasRepo: Pick<ISimplesEntradasRepository, 'findHistorico' | 'findHistoricoTx' | 'findSegregacao' | 'findParceriaMesmoRemovida'>,
    private readonly receitaRepo: Pick<IReceitaFiscalRepository, 'findByCompetencia' | 'somaPorCompetencia'>,
    private readonly receitaFiscal: Pick<ReceitaFiscalService, 'tieOut'>,
    private readonly entradas: Pick<SimplesEntradasService, 'segregacaoDaCompetencia'>,
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly fiscalProfileRepo: Pick<IFiscalProfileRepository, 'findByScope' | 'findManyByOwner'>,
    private readonly accountRepo: Pick<IAccountRepository, 'findById'>,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly postingService: Pick<PostingService, 'postEntry' | 'reverseEntry' | 'findEntryBySource'>,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    private readonly fiscalDocumentRepo: Pick<IFiscalDocumentRepository, 'somaNfseAutorizadaNaCompetencia'>,
    private readonly serviceFiscalRepo: Pick<IServiceFiscalProfileRepository, 'listByScope'>,
    /** SIMPLES-PISO-ANEXO-XI bloco 1 (F-PI-3 b): benefício municipal de ISS na retenção e na parcela ISS do DAS. */
    private readonly beneficioRepo: Pick<IIssBeneficioMunicipalRepository, 'listByScope'>,
  ) {}

  /** Item 17 — POST …/apuracoes/:competencia/calcular: calcula sob demanda, nada é gravado (B-2 → a). */
  async calcular(scope: AccountingScope, competencia: string): Promise<ApuracaoSimples | ApuracaoMei> {
    this.assertRead(scope);
    if (await this.ehMei(scope, competencia)) return this.visaoMei(scope, competencia, await this.montarMei(scope, competencia));
    return this.visao(scope, competencia, await this.montar(scope, competencia));
  }

  /** Item 18 — GET …/apuracoes/:competencia: o cálculo + espelho do PGDAS-D + DAS oficial registrado + divergência. */
  async obter(scope: AccountingScope, competencia: string): Promise<ApuracaoSimples | ApuracaoMei> {
    return this.calcular(scope, competencia);
  }

  /**
   * Item 19 — PUT …/apuracoes/:competencia/das: registra o DAS oficial e persiste a apuração (supersede da anterior).
   * O mesmo número e valor de novo = reconcile da provisão, sem linha nova.
   */
  async registrarDas(scope: AccountingScope, competencia: string, input: SimplesDasRegistro): Promise<ApuracaoSimples | ApuracaoMei> {
    this.assertManage(scope);
    const vigente = await this.repo.findConfirmada(scope, competencia);
    if (vigente && vigente.numeroDocumento === input.numeroDocumento && vigente.valorOficialCents === BigInt(input.valorCents)) {
      await this.provisionar(scope, vigente, null);
      return this.calcular(scope, competencia);
    }
    // Item 25: o DAS do MEI registra pela mesma rota (regime 'MEI'); o gate dentro da tx relê as entradas do SIMEI.
    const mei = await this.ehMei(scope, competencia);
    const m: { calculada: ApuracaoCalculada | ApuracaoSimei; impressao: string; alertas: AlertaSimples[] } = mei
      ? await this.montarMei(scope, competencia)
      : await this.montar(scope, competencia);
    const bloqueio = m.alertas.filter((a) => BLOQUEANTES.includes(a.codigo));
    if (bloqueio.length > 0) {
      throw new ValidationError(`A apuração de ${competencia} não pode ser registrada: ${bloqueio.map((b) => `${b.codigo} (${b.detalhe})`).join('; ')}.`, { alertas: bloqueio });
    }
    const valorOficial = BigInt(input.valorCents);
    const total = BigInt(m.calculada.totalCalculadoCents);
    const { nova, anterior } = await this.repo.runTransaction(async (tx) => {
      // Item 20 — gate autoritativo DENTRO da tx: TODAS as entradas relidas aqui têm de ser as que o cálculo usou
      // (review do PR-3, achados 3–4: só os totais mensais deixavam passar segregação, contrato, folha e o PA vazio).
      const releitura = mei ? await this.montarMei(scope, competencia, tx) : await this.montar(scope, competencia, tx);
      if (releitura.impressao !== m.impressao) throw new ConflictError(`As entradas de ${competencia} mudaram depois do cálculo — calcule de novo antes de registrar o DAS.`);
      const atual = await this.repo.findConfirmada(scope, competencia, tx);
      if (atual && (await this.repo.supersede(scope, atual.id, tx)) === 0) throw new ConflictError('Outra apuração foi registrada para esta competência ao mesmo tempo — tente de novo.');
      const row = await this.repo.create(
        scope,
        {
          competencia,
          regime: mei ? 'MEI' : 'SIMPLES',
          valorOficialCents: valorOficial,
          numeroDocumento: input.numeroDocumento,
          vencimento: input.vencimento,
          sourceDocumentId: input.sourceDocumentId ?? null,
          totalCalculadoCents: total,
          divergenciaCents: valorOficial - total,
          memoria: JSON.parse(JSON.stringify({ ...m.calculada, alertas: m.alertas })) as Prisma.InputJsonValue,
          tabelaVersao: m.calculada.tabela.map((t) => t.legalParameterId),
          supersedesId: atual?.id ?? null,
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: atual ? SIMPLES_DAS_SUBSTITUIDO : SIMPLES_DAS_REGISTRADO,
        targetType: 'simples_apuracao',
        targetId: row.id,
        payload: {
          apuracaoId: row.id,
          competencia,
          valorOficialCents: valorOficial.toString(),
          totalCalculadoCents: total.toString(),
          divergenciaCents: (valorOficial - total).toString(),
          ...(atual ? { supersedesId: atual.id } : {}),
        },
      });
      return { nova: row, anterior: atual };
    });
    await this.provisionar(scope, nova, anterior);
    return this.calcular(scope, competencia);
  }

  // ---- montagem da entrada (itens 17, 23) ----

  /** `catalogo` (só a rota de alíquotas, F-PR4-4): atividades do cadastro que entram mesmo sem receita no PA. */
  private async montar(
    scope: AccountingScope,
    competencia: string,
    tx?: Prisma.TransactionClient,
    catalogo: ReadonlyArray<Pick<AtividadeInput, 'natureza' | 'cTribNac'>> = [],
  ): Promise<Montagem> {
    const ano = Number(competencia.slice(0, 4));
    const perfil = await this.companyProfileRepo.findByYear(scope, ano, tx);
    if (!perfil || perfil.regime !== 'SIMPLES') {
      throw new ValidationError(`Cadastre o perfil fiscal de ${ano} com regime SIMPLES antes de apurar o Simples Nacional (o MEI é apurado pelo SIMEI).`);
    }
    const linhas = await this.legalParams.fotografia(TABELAS);
    const alertas: AlertaSimples[] = [];
    const inicio = perfil.inicioAtividadeEm ? perfil.inicioAtividadeEm.slice(0, 7) : null;

    // Receita mensal: o subrazão (receita − cota do parceiro) prevalece; o histórico pré-adoção vale para os meses sem
    // subrazão (decisão do dono 07/10 pelo BRIEF item 10: o histórico é da PRÉ-adoção). Os dois no mesmo mês ⇒ alerta.
    const janela = janelaRbt12(competencia);
    const todos = meses(`${ano - 1}-01` < janela.de ? `${ano - 1}-01` : janela.de, competencia);
    const [historico, subrazao] = await Promise.all([this.entradasRepo.findHistorico(scope, todos, tx), this.receitaRepo.somaPorCompetencia(scope, todos, tx)]);
    const hist = new Map(historico.map((h) => [h.competencia, h]));
    const receitas: Receitas = new Map();
    const historicoMes: MesReceita[] = [];
    const ignorados: string[] = [];
    for (const m of todos) {
      const s = subrazao.get(m);
      const h = hist.get(m);
      if (s) {
        receitas.set(m, s.receitaCents - s.cotaCents);
        if (h) ignorados.push(m);
      } else if (h) receitas.set(m, h.receitaBrutaCents);
      if (m < competencia && receitas.has(m)) {
        historicoMes.push({ competencia: m, receitaBrutaCents: Number(receitas.get(m)), folhaCents: h?.folhaCents === null || h?.folhaCents === undefined ? null : Number(h.folhaCents) });
      }
    }
    if (ignorados.length > 0) alertas.push({ severity: 'WARNING', codigo: 'HISTORICO_IGNORADO', detalhe: `histórico ignorado em ${ignorados.join(', ')} — o subrazão do mês prevalece` });

    // Atividades do PA a partir do subrazão (VENDA e linhas negativas de cancelamento/devolução).
    const linhasPa = await this.receitaRepo.findByCompetencia(scope, competencia, tx);
    const contratos = new Map(
      (await this.entradasRepo.findParceriaMesmoRemovida(scope, [...new Set(linhasPa.map((l) => l.parceriaContratoId).filter((x): x is string => !!x))], tx)).map((c) => [c.id, c]),
    );
    const grupos = new Map<string, { natureza: NaturezaSimples; cTribNac: string | null; receita: bigint }>();
    const somar = (natureza: NaturezaSimples, cTribNac: string | null, v: bigint) => {
      const k = `${natureza}|${cTribNac ?? ''}`;
      const g = grupos.get(k) ?? { natureza, cTribNac, receita: 0n };
      g.receita += v;
      grupos.set(k, g);
    };
    for (const l of linhasPa) {
      const contrato = l.parceriaContratoId ? contratos.get(l.parceriaContratoId) : undefined;
      if (contrato) {
        // Lei 12.592 art. 1º-A §§ 4º–5º: a receita do salão é a cota dele, a título de aluguel de bem móvel ou de gestão.
        somar(contrato.naturezaCota === 'ALUGUEL_BEM_MOVEL' ? 'LOCACAO_MOVEL' : 'PARCERIA_GESTAO', null, l.receitaCents - l.cotaProfissionalCents);
      } else {
        // Sem contrato achado, a cota já gravada continua fora da receita bruta (mesma regra do total do mês).
        somar(l.natureza === 'REVENDA' ? 'REVENDA' : 'SERVICO', l.natureza === 'REVENDA' ? null : l.cTribNac, l.receitaCents - l.cotaProfissionalCents);
      }
    }

    // Item 12: a segregação manual tira parcelas da receita da natureza (motivo → tributos excluídos).
    // SIMPLES-PISO-ANEXO-XI bloco 1: benefícios do Município da unidade (FiscalProfile.codMun), lidos com o resto da entrada.
    const codMun = (await this.fiscalProfileRepo.findByScope(scope, tx))?.codMun ?? null;
    const cadastrados = (await this.beneficioRepo.listByScope(scope, tx)).map(toBeneficio);
    const segRow = await this.entradasRepo.findSegregacao(scope, competencia, tx);
    const seg = { parcelas: ((segRow?.parcelas ?? []) as SimplesSegregacaoParcela[]) };
    if (seg.parcelas.length > 0) alertas.push({ severity: 'WARNING', codigo: 'SEGREGACAO_MANUAL', detalhe: `${seg.parcelas.length} parcela(s) segregada(s) por declaração manual` });
    const impressao = JSON.stringify({
      inicio: perfil.inicioAtividadeEm,
      historico: historico.map((h) => [h.competencia, String(h.receitaBrutaCents), h.folhaCents === null ? null : String(h.folhaCents)]),
      subrazao: [...subrazao.entries()].map(([k, v]) => [k, String(v.receitaCents), String(v.cotaCents)]).sort(),
      linhasPa: linhasPa.map((l) => [l.id, l.natureza, l.cTribNac, String(l.receitaCents), String(l.cotaProfissionalCents), l.parceriaContratoId]),
      contratos: [...contratos.values()].map((c) => [c.id, c.naturezaCota]).sort(),
      segregacao: seg.parcelas,
      beneficiosIss: { codMun, linhas: cadastrados },
    });
    // Review do PR-3 (achado 5): um grupo negativo (devolução/cancelamento de venda de outro mês) é compensado nos grupos
    // positivos — primeiro os da mesma natureza, depois o maior — para que Σ das atividades = receita do PA.
    const lista = [...grupos.values()];
    for (const neg of lista.filter((g) => g.receita < 0n)) {
      const alvos = lista.filter((g) => g.receita > 0n).sort((x, y) => (x.natureza === neg.natureza ? -1 : 0) - (y.natureza === neg.natureza ? -1 : 0) || (y.receita > x.receita ? 1 : -1));
      for (const alvo of alvos) {
        if (neg.receita >= 0n) break;
        const v = alvo.receita < -neg.receita ? alvo.receita : -neg.receita;
        alvo.receita -= v;
        neg.receita += v;
      }
    }
    // Review do PR-3 (achado 1): cada parcela segregada é consumida UMA vez, pelos grupos da natureza dela, em ordem.
    const sobra = seg.parcelas.map((p) => BigInt(p.receitaCents));
    const entrada: AtividadeInput[] = [];
    for (const g of lista) {
      if (g.receita <= 0n) continue;
      let disponivel = g.receita;
      const parcelas: AtividadeInput['parcelas'] = [];
      seg.parcelas.forEach((p, i) => {
        if (p.natureza !== g.natureza || disponivel <= 0n || sobra[i] <= 0n) return;
        const v = sobra[i] > disponivel ? disponivel : sobra[i];
        parcelas.push({ receitaCents: Number(v), excluir: excluirDoMotivo((p as SimplesSegregacaoParcela).motivo) });
        sobra[i] -= v;
        disponivel -= v;
      });
      if (disponivel > 0n) parcelas.push({ receitaCents: Number(disponivel), excluir: [] });
      entrada.push({ natureza: g.natureza, cTribNac: g.cTribNac, parcelas });
    }
    for (const a of catalogo) {
      if (!entrada.some((e) => e.natureza === a.natureza && e.cTribNac === a.cTribNac)) entrada.push({ ...a, parcelas: [{ receitaCents: 0, excluir: [] }] });
    }
    // SIMPLES-PISO-ANEXO-XI bloco 1 (itens 4-6): benefício vigente no 1º dia do PA que alcança o serviço. Valor fixo
    // (art. 31 II / art. 33) fica fora do cálculo — só alerta (F-PI-5 a).
    const beneficios = new Map<string, BeneficioCadastrado>();
    for (const e of entrada) {
      if (e.natureza !== 'SERVICO') continue;
      const b = beneficioDaAtividade(cadastrados, { codMun, cTribNac: e.cTribNac, data: `${competencia}-01` });
      if (!b) continue;
      beneficios.set(`${e.natureza}|${e.cTribNac ?? ''}`, b);
      if (b.tipo === 'VALOR_FIXO') {
        alertas.push({ severity: 'INFO', codigo: 'ISS_VALOR_FIXO_MUNICIPAL', detalhe: `serviço ${e.cTribNac}: valor fixo municipal de ISS (${b.legislacao}) — fora do cálculo do DAS (Res. CGSN 140 arts. 31 II e 33)` });
      } else {
        e.beneficioIss = { tipo: b.tipo, reducaoBpPorFaixa: b.reducaoBpPorFaixa };
      }
    }
    const naoAplicada = sobra.reduce((x, v) => x + v, 0n);
    if (naoAplicada > 0n) {
      alertas.push({ severity: 'WARNING', codigo: 'SEGREGACAO_MANUAL', detalhe: `R$ ${(Number(naoAplicada) / 100).toFixed(2)} declarados na segregação não têm receita da mesma natureza no mês e foram ignorados` });
    }

    // Item 23 — limites (LC 123 art. 3º I/II, §§ 9º, 9º-A; art. 13-A; Res. CGSN 140 art. 12 §§ 1º–2º).
    const sublimiteExcedido = this.limites(linhas, competencia, receitas, inicio, alertas);

    let calculada: ApuracaoCalculada;
    const receitaPa = receitas.get(competencia) ?? 0n;
    const folhaPa = hist.get(competencia)?.folhaCents ?? null;
    try {
      calculada = apurar(
        {
          competencia,
          historico: historicoMes,
          inicioAtividade: inicio && inicio <= competencia ? inicio : null,
          receitaPaCents: Number(receitaPa > 0n ? receitaPa : 0n),
          folhaPaCents: folhaPa === null ? 0 : Number(folhaPa),
          sublimiteExcedido,
          atividades: entrada.length > 0 ? entrada : [{ natureza: 'SERVICO', cTribNac: null, parcelas: [{ receitaCents: 0, excluir: [] }] }],
        },
        linhas,
      );
    } catch (e) {
      if ((e as { errorCode?: string }).errorCode !== 'ATIVIDADE_SEM_ANEXO') throw e;
      alertas.push({ severity: 'WARNING', codigo: 'ATIVIDADE_SEM_ANEXO', detalhe: (e as Error).message });
      calculada = { competencia, regime: 'SIMPLES', rbt12Cents: 0, janelaRbt12: janela, mesesFaltantes: [], atividades: [], totalCalculadoCents: 0, tabela: [] };
    }
    if (entrada.length === 0) calculada = { ...calculada, atividades: [], totalCalculadoCents: 0 };
    // F-PI-2 (dono, 10/10): o piso de 2% elevou o ISS acima do % puro da tabela — orientar a desmarcar o benefício na faixa.
    for (const a of calculada.atividades) {
      if (!a.beneficioIss?.desvantajoso) continue;
      alertas.push({
        severity: 'WARNING',
        codigo: 'BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO',
        detalhe: `serviço ${a.cTribNac} na ${a.faixa}ª faixa: com o benefício municipal o ISS fica em ${a.percentuais.ISS}% (piso de 2%, Res. CGSN 140 art. 31 p.ú.), acima dos ${a.beneficioIss.issTabela}% da tabela — desmarque o benefício nesta faixa`,
      });
    }
    if (calculada.mesesFaltantes.length > 0) alertas.push({ severity: 'WARNING', codigo: 'RBT12_INCOMPLETO', detalhe: `sem receita declarada em ${calculada.mesesFaltantes.join(', ')}` });
    // Item 16 → item 20: o tie-out do PA também bloqueia o registro.
    const tie = await this.receitaFiscal.tieOut(scope, competencia);
    if (tie.alerta) alertas.push({ ...tie.alerta, severity: 'WARNING' });
    // Review do PR-4 (achado 1): a cota do salão a título de aluguel de bem móvel não é serviço (sem ISS, sem NFS-e).
    const servicosPa = linhasPa.filter((l) => !(l.parceriaContratoId && contratos.get(l.parceriaContratoId)?.naturezaCota === 'ALUGUEL_BEM_MOVEL'));
    await this.conferirNfse(scope, competencia, servicosPa, alertas, { me: true, caixa: perfil.simplesRegimeApuracao === 'CAIXA' }, tx);
    return { calculada, entrada, receitas, impressao, alertas, tieOut: { subrazaoCents: tie.subrazaoCents, razaoCents: tie.razaoCents, ok: tie.ok }, beneficios };
  }

  /** Item 23. Devolve se o sublimite do ICMS/ISS (e IBS a partir de 2027) está excedido para o PA. */
  private limites(linhas: Awaited<ReturnType<LegalParameterService['fotografia']>>, competencia: string, receitas: Receitas, inicio: string | null, alertas: AlertaSimples[]): boolean {
    const data = `${competencia}-01`;
    // F-PR4-7 (dono 09/10): sem a linha, falha ruidoso — o zero calava o sublimite e o impedimento.
    const limite = (chave: string) => {
      const valor = linhaLegalVigente(linhas, 'SIMPLES_LIMITE', chave, data)?.valorInt;
      if (valor === null || valor === undefined) throw new ParametroLegalAusenteError('SIMPLES_LIMITE', data, chave);
      return BigInt(valor);
    };
    const ano = Number(competencia.slice(0, 4));
    const soma = (de: string, ate: string) => meses(de, ate).reduce((s, m) => s + (receitas.get(m) ?? 0n), 0n);
    const acumuladoAno = soma(`${ano}-01`, competencia);
    const anoAnterior = soma(`${ano - 1}-01`, `${ano - 1}-12`);
    const inicioNoAno = inicio !== null && inicio.startsWith(`${ano}-`);
    // Ano de início: limites proporcionais aos meses de atividade (LC 123 art. 3º § 2º; Res. CGSN 140 art. 12 § 2º).
    const fator = (l: bigint) => (inicioNoAno ? (l * BigInt(13 - Number(inicio!.slice(5, 7)))) / 12n : l);
    const me = fator(limite('ME'));
    const epp = fator(limite('EPP'));
    const sub = fator(limite('SUBLIMITE'));
    const fmt = (v: bigint) => `R$ ${(Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (me > 0n && acumuladoAno > me && acumuladoAno <= epp) alertas.push({ severity: 'WARNING', codigo: 'LIMITE_ME_EXCEDIDO', detalhe: `receita acumulada em ${ano} ${fmt(acumuladoAno)} acima de ${fmt(me)}: a empresa passa a EPP (LC 123 art. 3º I/II)` });
    if (epp > 0n && acumuladoAno > epp) {
      const efeito = acumuladoAno > (epp * 12n) / 10n ? 'exclusão a partir do mês seguinte ao excesso' : 'exclusão a partir de janeiro do ano seguinte';
      alertas.push({ severity: 'WARNING', codigo: 'LIMITE_EPP_EXCEDIDO', detalhe: `receita acumulada em ${ano} ${fmt(acumuladoAno)} acima de ${fmt(epp)}: ${efeito} (LC 123 art. 3º §§ 9º e 9º-A)` });
    }
    // Res. CGSN 140 art. 12 § 1º: excesso > 20% impede a partir do mês seguinte; ≤ 20%, a partir do ano seguinte.
    const acumuladoAteAnterior = competencia.endsWith('-01') ? 0n : soma(`${ano}-01`, proximo(competencia, -1));
    const impedidoEsteAno = sub > 0n && acumuladoAteAnterior > (sub * 12n) / 10n;
    const inicioNoAnterior = inicio !== null && inicio.startsWith(`${ano - 1}-`);
    const subAnterior = inicioNoAnterior ? (limite('SUBLIMITE') * BigInt(13 - Number(inicio!.slice(5, 7)))) / 12n : limite('SUBLIMITE');
    const impedidoPeloAnterior = sub > 0n && anoAnterior > subAnterior;
    if (sub > 0n && acumuladoAno > sub) {
      alertas.push({ severity: 'WARNING', codigo: 'SUBLIMITE_ICMS_ISS', detalhe: `receita acumulada em ${ano} ${fmt(acumuladoAno)} acima do sublimite ${fmt(sub)} (LC 123 art. 13-A; Res. CGSN 140 art. 12)` });
    }
    return impedidoEsteAno || impedidoPeloAnterior;
  }

  // ---- PR-4: SIMEI (itens 25–26) ----

  private async ehMei(scope: AccountingScope, competencia: string): Promise<boolean> {
    const perfil = await this.companyProfileRepo.findByYear(scope, Number(competencia.slice(0, 4)));
    return perfil?.regime === 'MEI';
  }

  private async montarMei(scope: AccountingScope, competencia: string, tx?: Prisma.TransactionClient): Promise<MontagemMei> {
    const ano = Number(competencia.slice(0, 4));
    const perfil = await this.companyProfileRepo.findByYear(scope, ano, tx);
    if (!perfil || perfil.regime !== 'MEI') throw new ValidationError(`O perfil fiscal de ${ano} não é MEI.`);
    if (perfil.meiContribuinteIcms === null || perfil.meiContribuinteIss === null) {
      throw new ValidationError(
        `Declare no perfil fiscal de ${ano} se o MEI é contribuinte de ICMS e de ISS (enquadramento do Anexo XI, Res. CGSN 140 art. 101 § 1º) antes de apurar o SIMEI.`,
      );
    }
    const enquadramento = { contribuinteIcms: perfil.meiContribuinteIcms, contribuinteIss: perfil.meiContribuinteIss };
    const anexo = await this.anexoXiDaCompetencia(scope, competencia, perfil, tx);
    const linhas = await this.legalParams.fotografia(['SALARIO_MINIMO', 'SIMEI_VALOR', 'SIMPLES_LIMITE']);
    const alertas: AlertaSimples[] = [];
    // SIMEI-TAC-12 item 4: o transportador efetivo é decidido ANTES do cálculo e o mesmo booleano alimenta a CPP (12%,
    // Res. CGSN 140 art. 101 I "c") e o limite (art. 100 § 1º-A) — F-TAC-2/F-TAC-3 (a), dono 10/10.
    let transportador = perfil.meiTransportadorCargas === true;
    if (anexo) {
      // Item 16: exclusão publicada e ainda sem efeito ⇒ alerta para comunicar no Portal do Simples.
      for (const e of anexo.aExcluir) {
        alertas.push({
          severity: 'WARNING',
          codigo: 'MEI_OCUPACAO_EXCLUIDA',
          detalhe: `a ocupação ${e.chave} deixa de constar do Anexo XI: desenquadramento do SIMEI a partir de ${e.efeitoDesde} (Res. CGSN 140 art. 101 § 3º II c/c art. 115 § 2º II "c"); comunique no Portal do Simples Nacional até o último dia útil do mês em que verificado o impedimento`,
        });
      }
      // Item 13 (M5, F-AX-3 b): o declarado manda; a divergência com o Anexo XI só alerta.
      const implicado = enquadramentoDasOcupacoes(anexo.ocupacoes);
      if (anexo.ocupacoes.length > 0 && (implicado.contribuinteIcms !== enquadramento.contribuinteIcms || implicado.contribuinteIss !== enquadramento.contribuinteIss)) {
        const sn = (b: boolean) => (b ? 'S' : 'N');
        alertas.push({
          severity: 'WARNING',
          codigo: 'MEI_ENQUADRAMENTO_DIVERGE',
          detalhe: `as ocupações declaradas indicam ICMS ${sn(implicado.contribuinteIcms)} / ISS ${sn(implicado.contribuinteIss)} no Anexo XI, e o perfil declara ICMS ${sn(enquadramento.contribuinteIcms)} / ISS ${sn(enquadramento.contribuinteIss)} — a parcela do DAS segue o enquadramento do CNPJ (Res. CGSN 140 art. 101 § 1º); o declarado foi mantido`,
        });
      }
      // Item 14 (M3/M4; decisão 5 do dono): o limite do transportador só com TODAS as ocupações na Tabela B.
      if (transportador && !transportadorNaTabelaB(anexo.ocupacoes).soTabelaB) {
        transportador = false;
        const semB = !transportadorNaTabelaB(anexo.ocupacoes).algumaB;
        alertas.push({
          severity: 'WARNING',
          codigo: 'MEI_TAC_COM_OCUPACAO_A',
          detalhe: `${semB ? 'transportador autônomo de cargas declarado sem ocupação da Tabela B do Anexo XI' : 'ocupação da Tabela A junto com a da Tabela B'}: apurado como MEI comum, no limite geral e CPP de 5% (Res. CGSN 140 art. 100 caput e §§ 1º-A e 1º-B; art. 101 I "b"-"c") — risco de desenquadramento do limite do transportador; revise as ocupações do perfil`,
        });
      }
    }
    let calculada: ApuracaoSimei;
    try {
      calculada = apurarSimei(competencia, enquadramento, linhas, { transportadorCargas: transportador });
    } catch (e) {
      throw new ValidationError(`Não há parâmetro legal publicado para o SIMEI de ${competencia}: ${(e as Error).message}.`);
    }

    // Item 26 — receita do ano até o PA: o subrazão (receita − cota) prevalece; o histórico cobre os meses sem subrazão.
    const doAno = meses(`${ano}-01`, competencia);
    const [historico, subrazao] = await Promise.all([this.entradasRepo.findHistorico(scope, doAno, tx), this.receitaRepo.somaPorCompetencia(scope, doAno, tx)]);
    const hist = new Map(historico.map((h) => [h.competencia, h.receitaBrutaCents]));
    const receita = (m: string): bigint => {
      const s = subrazao.get(m);
      return s ? s.receitaCents - s.cotaCents : (hist.get(m) ?? 0n);
    };
    const acumulado = doAno.reduce((t, m) => t + receita(m), 0n);
    const inicio = perfil.inicioAtividadeEm ? perfil.inicioAtividadeEm.slice(0, 7) : null;
    const limite = this.limiteMei(linhas, competencia, inicio, acumulado, alertas, transportador);

    const linhasPa = await this.receitaRepo.findByCompetencia(scope, competencia, tx);
    // F-PR4-11 (dono 09/10): o mesmo filtro do ME — a cota do salão a título de aluguel de bem móvel não tem NFS-e.
    const ids = [...new Set(linhasPa.map((l) => l.parceriaContratoId).filter((x): x is string => !!x))];
    const aluguel = new Set((await this.entradasRepo.findParceriaMesmoRemovida(scope, ids, tx)).filter((c) => c.naturezaCota === 'ALUGUEL_BEM_MOVEL').map((c) => c.id));
    // F-PR4-9 (dono 09/10): o MEI só deve NFS-e ao tomador CNPJ (LC 123 art. 26 § 6º II; Res. CGSN 140 art. 106 II).
    const devidas = linhasPa.filter((l) => l.tomadorTipo === 'CNPJ' && !(l.parceriaContratoId && aluguel.has(l.parceriaContratoId)));
    await this.conferirNfse(scope, competencia, devidas, alertas, { me: false, caixa: false }, tx);
    const impressao = JSON.stringify({
      enquadramento,
      // SIMEI-TAC-12 item 6: o transportador efetivo (CPP e limite) entra no gate da tx.
      transportador,
      inicio: perfil.inicioAtividadeEm,
      tabela: calculada.tabela.map((t) => t.legalParameterId),
      historico: historico.map((h) => [h.competencia, String(h.receitaBrutaCents)]),
      subrazao: [...subrazao.entries()].map(([k, v]) => [k, String(v.receitaCents), String(v.cotaCents)]).sort(),
    });
    return { calculada, impressao, alertas, enquadramento, receitaPaCents: receita(competencia), acumulado, limite };
  }

  /**
   * SIMPLES-PISO-ANEXO-XI itens 12 e 15 (decisões 2, 4 e 6 do dono, chat, 10/10) — o Anexo XI vigente na competência
   * apurada. Sem versão transcrita vigente (competência anterior à da tabela, F-AX-5 a) ⇒ `null`: nenhuma checagem.
   * - perfil MEI sem ocupações ⇒ 400 `MEI_OCUPACOES_NAO_DECLARADAS` (o campo é opcional no perfil; a apuração exige);
   * - CNAE do CNPJ (principal do declarante + o de cada unidade) fora do Anexo XI ⇒ 400 `SIMEI_CNAE_FORA_ANEXO_XI` com
   *   `cnaesImpeditivos` e `efeitoDesenquadramento` (F-AX-4; Res. CGSN 140 art. 115 § 2º II "b" c/c § 3º II e § 4º II).
   *   O regime não muda sozinho: a confirmação MEI → ME é do usuário/contador (fluxo de FE, fora deste PR).
   */
  private async anexoXiDaCompetencia(
    scope: AccountingScope,
    competencia: string,
    perfil: { meiOcupacoes: unknown; declarante: unknown },
    tx?: Prisma.TransactionClient,
  ): Promise<{ ocupacoes: OcupacaoAnexoXi[]; aExcluir: Array<{ chave: string; efeitoDesde: string }> } | null> {
    const linhasAnexo = await this.legalParams.fotografia([TABELA_ANEXO_XI]);
    const anexo = anexoXiVigente(linhasAnexo, `${competencia}-01`);
    if (!anexo) return null;
    const chaves = Array.isArray(perfil.meiOcupacoes) ? (perfil.meiOcupacoes as string[]) : [];
    if (chaves.length === 0) {
      throw new ValidationError(
        `Declare no perfil fiscal as ocupações do MEI (Anexo XI da Res. CGSN 140, art. 100 caput) antes de apurar o SIMEI de ${competencia}.`,
        { campo: 'meiOcupacoes', competencia },
        'MEI_OCUPACOES_NAO_DECLARADAS',
      );
    }
    const principal = (perfil.declarante as { cnaeFiscal?: unknown } | null)?.cnaeFiscal;
    const unidades = await this.fiscalProfileRepo.findManyByOwner(scope.ownerUserId, tx);
    const cnaes = [typeof principal === 'string' ? principal : null, ...unidades.map((u) => u.cnae ?? null)].filter((c): c is string => !!c && c.trim() !== '');
    const cnaesImpeditivos = cnaesForaDoAnexo(anexo, cnaes);
    if (cnaesImpeditivos.length > 0) {
      throw new ValidationError(
        `CNAE do CNPJ fora do Anexo XI da Res. CGSN 140 (${cnaesImpeditivos.join(', ')}): o SIMEI de ${competencia} não é gerado. Comunique o desenquadramento no Portal do Simples Nacional e confirme a transição do perfil para ME.`,
        {
          cnaesImpeditivos,
          efeitoDesenquadramento: {
            atividadeIncluidaDepoisDoIngresso: 'a partir do mês subsequente ao da alteração do CNPJ (Res. CGSN 140 art. 115 § 2º II "b" c/c § 3º II)',
            atividadeDesdeOIngresso: 'indeferido desde o início: os efeitos retroagem à data de ingresso no SIMEI (Res. CGSN 140 art. 115 § 4º II)',
          },
        },
        'SIMEI_CNAE_FORA_ANEXO_XI',
      );
    }
    // Item 16 (dono, 10/10: texto vigente da Res. 140): ocupação declarada sem linha vigente na competência ⇒ bloqueio.
    const { excluidas, aExcluir } = ocupacoesExcluidas(linhasAnexo, anexo, chaves, `${competencia}-01`);
    if (excluidas.length > 0) {
      throw new ValidationError(
        `Ocupação declarada que não consta do Anexo XI vigente em ${competencia} (${excluidas.map((e) => e.chave).join(', ')}): o SIMEI não é gerado. Comunique o desenquadramento no Portal do Simples Nacional (Res. CGSN 140 art. 101 § 3º II c/c art. 115 § 2º II "c").`,
        { ocupacoesExcluidas: excluidas },
        'MEI_OCUPACAO_EXCLUIDA',
      );
    }
    return { ocupacoes: chaves.map((c) => anexo.get(c)).filter((o): o is OcupacaoAnexoXi => o !== undefined), aExcluir };
  }

  /**
   * Item 26 — limite do MEI: R$ 81.000 no ano (Res. CGSN 140 art. 100 caput, em `SIMPLES_LIMITE`/MEI); no ano de início,
   * R$ 6.750 × meses do início ao fim do ano (§ 1º). Transportador autônomo de cargas (§ 1º-A; F-PR4-13): R$ 251.600 em
   * `SIMPLES_LIMITE`/MEI_TAC e, no início, R$ 20.966,67 × meses — o mensal é o anual ÷ 12 arredondado ao centavo. Excesso ⇒ desenquadramento obrigatório com
   * comunicação até o último dia útil do mês seguinte; efeitos pelo art. 115 § 2º II "a": ≤ 20% ⇒ 1º de janeiro do ano
   * seguinte (item 1); > 20% ⇒ retroativo a 1º de janeiro do ano (item 2) ou ao início de atividade (item 3).
   */
  private limiteMei(
    linhas: Awaited<ReturnType<LegalParameterService['fotografia']>>,
    competencia: string,
    inicio: string | null,
    acumulado: bigint,
    alertas: AlertaSimples[],
    transportadorCargas: boolean,
  ): bigint {
    const ano = Number(competencia.slice(0, 4));
    const chave = transportadorCargas ? 'MEI_TAC' : 'MEI';
    const valor = linhaLegalVigente(linhas, 'SIMPLES_LIMITE', chave, `${competencia}-01`)?.valorInt;
    if (valor === null || valor === undefined) throw new ParametroLegalAusenteError('SIMPLES_LIMITE', `${competencia}-01`, chave); // F-PR4-7
    const anual = BigInt(valor);
    const inicioNoAno = inicio !== null && inicio.startsWith(`${ano}-`);
    const limite = inicioNoAno ? ((anual + 6n) / 12n) * BigInt(13 - Number(inicio!.slice(5, 7))) : anual;
    if (limite > 0n && acumulado > limite) {
      const fmt = (v: bigint) => `R$ ${(Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      const efeito =
        acumulado * 10n <= limite * 12n
          ? `desenquadramento do SIMEI a partir de 1º/01/${ano + 1} (Res. CGSN 140 art. 115 § 2º II "a" 1)`
          : inicioNoAno
            ? 'desenquadramento retroativo ao início de atividade (Res. CGSN 140 art. 115 § 2º II "a" 3)'
            : `desenquadramento retroativo a 1º/01/${ano} (Res. CGSN 140 art. 115 § 2º II "a" 2)`;
      alertas.push({
        severity: 'WARNING',
        codigo: 'LIMITE_MEI_EXCEDIDO',
        detalhe: `receita acumulada em ${ano} ${fmt(acumulado)} acima do limite do MEI ${fmt(limite)}: ${efeito}; comunique até o último dia útil do mês seguinte ao do excesso`,
      });
    }
    return limite;
  }

  private async visaoMei(scope: AccountingScope, competencia: string, m: MontagemMei): Promise<ApuracaoMei> {
    const das = await this.repo.findConfirmada(scope, competencia);
    return {
      ...m.calculada,
      enquadramento: m.enquadramento,
      receitaPaCents: Number(m.receitaPaCents),
      receitaAcumuladaAnoCents: Number(m.acumulado),
      limiteAnoCents: Number(m.limite),
      dasOficial: das
        ? { id: das.id, numeroDocumento: das.numeroDocumento, valorCents: Number(das.valorOficialCents), vencimento: das.vencimento, provisaoPendente: das.provisaoEntryId === null }
        : null,
      divergenciaCents: das ? Number(das.valorOficialCents) - m.calculada.totalCalculadoCents : null,
      alertas: m.alertas,
    };
  }

  /**
   * Item 31 — conferência das NFS-e autorizadas em produção × receita de serviços da competência (subrazão, líquida da
   * cota do profissional-parceiro). Só alerta, nunca bloqueia (LC 123 art. 26 § 10 e art. 25 §§ 6º–8º, red. 2027).
   * Severidade (D-2026-10-10-X14-ALERTA-INFORMATIVO, dono, chat, 2026-10-10), só quando há divergência:
   * - ME/EPP optante pelo caixa: INFO / REGIME_CAIXA (a NFS-e é pela prestação, a receita pelo recebimento; item 2);
   * - ME/EPP com competência até 2026-10: INFO / DOCUMENTO_MUNICIPAL_TRANSIÇÃO (documento municipal ainda aceito,
   *   Res. CGSN 140 art. 59 § 1º; item 3). Base do corte: a Res. CGSN 191/2026 altera os arts. 59 e 79 da Res. CGSN
   *   140 e torna obrigatória a NFS-e nacional para ME/EPP a partir de 01/11/2026 — fonte do dono (chat, 10/10), não
   *   conferida no texto da resolução;
   * - demais casos (inclusive o MEI): WARNING.
   */
  private async conferirNfse(
    scope: AccountingScope,
    competencia: string,
    linhasPa: Awaited<ReturnType<IReceitaFiscalRepository['findByCompetencia']>>,
    alertas: AlertaSimples[],
    contexto: { me: boolean; caixa: boolean },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    // F-PR4-10 (a), dono 10/10: a locação de bem móvel já chega fora daqui — a linha de receita só é SERVICO | REVENDA, e
    // a locação é a cota ALUGUEL_BEM_MOVEL do salão-parceiro, tirada em `servicosPa` (ME) e no MEI (F-PR4-11).
    const servicos = linhasPa.filter((l) => l.natureza !== 'REVENDA').reduce((t, l) => t + l.receitaCents - l.cotaProfissionalCents, 0n);
    const nfse = await this.fiscalDocumentRepo.somaNfseAutorizadaNaCompetencia(scope, competencia, tx);
    if (nfse === servicos) return;
    const fmt = (v: bigint) => `R$ ${(Number(v) / 100).toFixed(2)}`;
    const detalhe = `NFS-e autorizadas em ${competencia} somam ${fmt(nfse)}; a receita de serviços do subrazão é ${fmt(servicos)}`;
    if (contexto.me && contexto.caixa) {
      alertas.push({ codigo: 'NFSE_DIVERGE_RECEITA', severity: 'INFO', motivoInformativo: 'REGIME_CAIXA', detalhe: `${detalhe} (regime de caixa: NFS-e pela data da prestação, receita pelo recebimento)` });
    } else if (contexto.me && competencia <= FIM_DOCUMENTO_MUNICIPAL) {
      alertas.push({ codigo: 'NFSE_DIVERGE_RECEITA', severity: 'INFO', motivoInformativo: 'DOCUMENTO_MUNICIPAL_TRANSIÇÃO', detalhe: `${detalhe} (documento municipal ainda aceito até 31/10/2026)` });
    } else {
      alertas.push({ codigo: 'NFSE_DIVERGE_RECEITA', severity: 'WARNING', detalhe });
    }
  }

  // ---- PR-4: saída para documentos (item 29) ----

  /**
   * GET …/aliquotas/:competencia — sugestão do % efetivo de ISS a reter pelo tomador na prestação da competência M
   * (LC 123 art. 21 § 4º; Res. CGSN 140 art. 27), por atividade do cadastro de serviços e das que tiveram receita no PA
   * (F-PR4-4: a faixa é a do RBT12 GLOBAL; a atividade não precisa de receita para aparecer):
   * - M = mês de abertura do CNPJ (F-PR4-1/3): 2% (§ 4º II);
   * - até 2026: faixa do mês anterior, PA = M−1 (§ 4º I red. LC 155) — o 2º mês usa a receita do 1º × 12 (F-PR4-2 a);
   * - a partir de 2027: faixa do mês da prestação, PA = M (red. LC 227 art. 169; efeitos art. 182 I "b"), janela
   *   M−13…M−2 (LC 214 art. 517) e tabelas vigentes em M.
   * Sem piso no percentual puro da tabela (F-PR4-5); benefício municipal cadastrado reduz o ISS com piso de 2% (SIMPLES-PISO-ANEXO-XI, F-PI-2). O `pTotTribSN` só é sugerido (B-4 → b). A partir de 2027, os % de
   * ICMS/IBS/CBS da faixa para o crédito do adquirente (art. 23 § 2º, red. LC 214).
   */
  async aliquotas(scope: AccountingScope, competencia: string): Promise<AliquotasSimples> {
    this.assertRead(scope);
    if (await this.ehMei(scope, competencia)) {
      throw new ValidationError('O MEI recolhe valores fixos pelo SIMEI: não há alíquota efetiva para retenção nem para crédito (Res. CGSN 140 art. 101).');
    }
    const catalogo = [...new Set((await this.serviceFiscalRepo.listByScope(scope)).map((p) => p.cTribNac))].map((cTribNac) => ({ natureza: 'SERVICO' as const, cTribNac }));
    const perfil = await this.companyProfileRepo.findByYear(scope, Number(competencia.slice(0, 4)));
    if (perfil?.regime === 'SIMPLES' && perfil.inicioAtividadeEm?.slice(0, 7) === competencia) {
      return {
        competencia,
        mesReferencia: competencia,
        sugestao: true,
        regra: 'INICIO_ATIVIDADE',
        periodoApuracao: null,
        rbt12Cents: null,
        janelaRbt12: null,
        atividades: catalogo.map((a) => ({ anexo: null, ...a, faixa: null, fatorR: null, aliquotaEfetiva: null, issRetencao: '2.0000', beneficioMunicipal: null, pTotTribSNSugerido: null, creditoAdquirente: null })),
        avisos: [AVISO_INICIO, ...AVISOS_ALIQUOTA],
        alertas: [],
      };
    }
    const mesPrestacao = competencia >= INICIO_LC214;
    const pa = mesPrestacao ? competencia : proximo(competencia, -1);
    const m = await this.montar(scope, pa, undefined, catalogo);
    return {
      competencia,
      mesReferencia: pa,
      sugestao: true,
      regra: mesPrestacao ? 'FAIXA_MES_PRESTACAO' : 'FAIXA_MES_ANTERIOR',
      periodoApuracao: pa,
      rbt12Cents: m.calculada.rbt12Cents,
      janelaRbt12: m.calculada.janelaRbt12,
      atividades: m.calculada.atividades.map((a) => ({
        anexo: a.anexo,
        natureza: a.natureza,
        cTribNac: a.cTribNac,
        faixa: a.faixa,
        fatorR: a.fatorR,
        aliquotaEfetiva: a.aliquotaEfetiva,
        issRetencao: a.percentuais.ISS ?? null,
        beneficioMunicipal: ((b) =>
          b ? { legislacao: b.legislacao, tipo: b.tipo, pisoAplicado: a.beneficioIss?.pisoAplicado ?? false, excecaoPiso: a.beneficioIss?.excecaoPiso ?? excecaoPisoIss(a.cTribNac) } : null)(
          m.beneficios.get(`${a.natureza}|${a.cTribNac ?? ''}`),
        ),
        pTotTribSNSugerido: a.aliquotaEfetiva,
        creditoAdquirente: mesPrestacao ? { ICMS: a.percentuais.ICMS ?? null, IBS: a.percentuais.IBS ?? null, CBS: a.percentuais.CBS ?? null } : null,
      })),
      avisos: AVISOS_ALIQUOTA,
      alertas: m.alertas,
    };
  }

  // ---- item 21: provisão ----

  private async provisionar(scope: AccountingScope, nova: SimplesApuracao, anterior: SimplesApuracao | null): Promise<void> {
    try {
      // Review do PR-3 (achado 2): estorna a provisão viva de TODA substituída da competência — não só a `anterior` —,
      // antes de postar: o reconcile (anterior = null) também conserta um estorno que falhou. Nunca 2 vivas.
      const substituidas = await this.repo.findSubstituidas(scope, nova.competencia);
      for (const sub of anterior && !substituidas.some((x) => x.id === anterior.id) ? [...substituidas, anterior] : substituidas) await this.estornarProvisao(scope, sub);
      if (nova.provisaoEntryId) return;
      let entry = await this.postingService.findEntryBySource(scope, SIMPLES_DAS_PROVISION_SOURCE_TYPE, nova.id);
      if (!entry) {
        const fp = await this.fiscalProfileRepo.findByScope(scope);
        const deducao = await this.conta(scope, fp?.simplesDasDeducaoAccountId, 'Simples Nacional (DAS) — dedução da receita');
        const recolher = await this.conta(scope, fp?.simplesRecolherAccountId, 'Simples Nacional a recolher');
        const valor = Number(nova.valorOficialCents);
        entry = await this.postingService.postEntry(scope, {
          unitId: scope.unitId,
          date: fimDoMes(nova.competencia),
          description: `Provisão do DAS do Simples Nacional — ${nova.competencia} (DAS ${nova.numeroDocumento}, apuração ${nova.id})`,
          sourceType: SIMPLES_DAS_PROVISION_SOURCE_TYPE,
          sourceId: nova.id,
          lines: [
            { accountCode: deducao, debitCents: valor, creditCents: 0 },
            { accountCode: recolher, debitCents: 0, creditCents: valor },
          ],
        });
      }
      await this.repo.setProvisaoEntryId(scope, nova.id, entry.id);
    } catch (error) {
      logger.warn('Simples: provisão pendente (o DAS fica registrado; repita o PUT com o mesmo DAS para completar)', {
        apuracaoId: nova.id,
        motivo: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async estornarProvisao(scope: AccountingScope, row: SimplesApuracao): Promise<void> {
    const entry = await this.postingService.findEntryBySource(scope, SIMPLES_DAS_PROVISION_SOURCE_TYPE, row.id);
    if (!entry || entry.reversedById || entry.status !== 'Posted') return;
    await this.postingService.reverseEntry(scope, {
      unitId: scope.unitId,
      lancamentoId: entry.id,
      reversalPostingDate: fimDoMes(row.competencia),
      reason: `apuração do Simples ${row.id} substituída`,
    });
  }

  private async conta(scope: AccountingScope, id: string | null | undefined, rotulo: string): Promise<string> {
    if (!id) throw new ValidationError(`Conta de ${rotulo} não configurada no perfil fiscal da unidade.`);
    const account = await this.accountRepo.findById(scope, id);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${rotulo} '${id}' não existe neste escopo.`);
    return account.code;
  }

  // ---- visão (item 18) ----

  private async visao(scope: AccountingScope, competencia: string, m: Montagem): Promise<ApuracaoSimples> {
    const das = await this.repo.findConfirmada(scope, competencia);
    const { mesesFaltantes: _f, ...calc } = m.calculada;
    return {
      ...calc,
      espelho: espelhoPgdas(m.entrada, m.calculada.atividades),
      dasOficial: das
        ? { id: das.id, numeroDocumento: das.numeroDocumento, valorCents: Number(das.valorOficialCents), vencimento: das.vencimento, provisaoPendente: das.provisaoEntryId === null }
        : null,
      divergenciaCents: das ? Number(das.valorOficialCents) - m.calculada.totalCalculadoCents : null,
      tieOut: m.tieOut,
      alertas: m.alertas,
    };
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para registrar a apuração do Simples Nacional.');
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler a apuração do Simples Nacional.');
  }
}
