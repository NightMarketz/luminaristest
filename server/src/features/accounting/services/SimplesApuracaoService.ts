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
import { linhaLegalVigente, type LegalParameterTabela } from '../../legalParameters/models/legalParameter';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { apurar, janelaRbt12, type ApuracaoCalculada, type AtividadeInput, type MesReceita, type NaturezaSimples } from '../models/simplesCalc';
import { espelhoPgdas, type EspelhoAtividade } from '../models/simplesEspelho';
import { mesBounds } from '../models/Lalur.model';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IReceitaFiscalRepository } from '../repositories/IReceitaFiscalRepository';
import type { ISimplesApuracaoRepository } from '../repositories/ISimplesApuracaoRepository';
import type { ISimplesEntradasRepository } from '../repositories/ISimplesEntradasRepository';
import type { AuditService } from './AuditService';
import type { PostingService } from './PostingService';
import type { ReceitaFiscalService } from './ReceitaFiscalService';
import type { SimplesEntradasService } from './SimplesEntradasService';
import { excluirDoMotivo, type SimplesDasRegistro, type SimplesSegregacaoParcela } from '../dtos/SimplesDto';

export const SIMPLES_DAS_PROVISION_SOURCE_TYPE = 'simples.das.provision';
/** BRIEF item 24: SIMPLES_DAS_REGISTRADO / SIMPLES_DAS_SUBSTITUIDO, no padrão de nome da allowlist. */
export const SIMPLES_DAS_REGISTRADO = 'tax.simples_das.registrado';
export const SIMPLES_DAS_SUBSTITUIDO = 'tax.simples_das.substituido';

const TABELAS: readonly LegalParameterTabela[] = ['SIMPLES_ANEXO_FAIXA', 'SIMPLES_ANEXO_REPARTICAO', 'SIMPLES_TETO_ISS', 'SIMPLES_ENQUADRAMENTO', 'SIMPLES_LIMITE'];

export type CodigoAlertaSimples =
  | 'ATIVIDADE_SEM_ANEXO'
  | 'RBT12_INCOMPLETO'
  | 'LIMITE_ME_EXCEDIDO'
  | 'LIMITE_EPP_EXCEDIDO'
  | 'SUBLIMITE_ICMS_ISS'
  | 'SEGREGACAO_MANUAL'
  | 'TIEOUT_DIVERGENTE'
  | 'HISTORICO_IGNORADO';
export type AlertaSimples = { codigo: CodigoAlertaSimples; detalhe: string };
/** Item 20: alertas que impedem o registro do DAS. */
const BLOQUEANTES: readonly CodigoAlertaSimples[] = ['TIEOUT_DIVERGENTE', 'RBT12_INCOMPLETO', 'ATIVIDADE_SEM_ANEXO'];

/** BRIEF §3 `ApuracaoSimples` (o `MEI` é do PR-4). */
export interface ApuracaoSimples extends Omit<ApuracaoCalculada, 'mesesFaltantes'> {
  espelho: EspelhoAtividade[];
  dasOficial: { id: string; numeroDocumento: string; valorCents: number; vencimento: string; provisaoPendente: boolean } | null;
  divergenciaCents: number | null;
  tieOut: { subrazaoCents: number; razaoCents: number; ok: boolean };
  alertas: AlertaSimples[];
}

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
}

export class SimplesApuracaoService {
  constructor(
    private readonly repo: ISimplesApuracaoRepository,
    private readonly entradasRepo: Pick<ISimplesEntradasRepository, 'findHistorico' | 'findHistoricoTx' | 'findSegregacao' | 'findParceriaMesmoRemovida'>,
    private readonly receitaRepo: Pick<IReceitaFiscalRepository, 'findByCompetencia' | 'somaPorCompetencia'>,
    private readonly receitaFiscal: Pick<ReceitaFiscalService, 'tieOut'>,
    private readonly entradas: Pick<SimplesEntradasService, 'segregacaoDaCompetencia'>,
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly fiscalProfileRepo: Pick<IFiscalProfileRepository, 'findByScope'>,
    private readonly accountRepo: Pick<IAccountRepository, 'findById'>,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly postingService: Pick<PostingService, 'postEntry' | 'reverseEntry' | 'findEntryBySource'>,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  /** Item 17 — POST …/apuracoes/:competencia/calcular: calcula sob demanda, nada é gravado (B-2 → a). */
  async calcular(scope: AccountingScope, competencia: string): Promise<ApuracaoSimples> {
    this.assertRead(scope);
    return this.visao(scope, competencia, await this.montar(scope, competencia));
  }

  /** Item 18 — GET …/apuracoes/:competencia: o cálculo + espelho do PGDAS-D + DAS oficial registrado + divergência. */
  async obter(scope: AccountingScope, competencia: string): Promise<ApuracaoSimples> {
    return this.calcular(scope, competencia);
  }

  /**
   * Item 19 — PUT …/apuracoes/:competencia/das: registra o DAS oficial e persiste a apuração (supersede da anterior).
   * O mesmo número e valor de novo = reconcile da provisão, sem linha nova.
   */
  async registrarDas(scope: AccountingScope, competencia: string, input: SimplesDasRegistro): Promise<ApuracaoSimples> {
    this.assertManage(scope);
    const vigente = await this.repo.findConfirmada(scope, competencia);
    if (vigente && vigente.numeroDocumento === input.numeroDocumento && vigente.valorOficialCents === BigInt(input.valorCents)) {
      await this.provisionar(scope, vigente, null);
      return this.calcular(scope, competencia);
    }
    const m = await this.montar(scope, competencia);
    const bloqueio = m.alertas.filter((a) => BLOQUEANTES.includes(a.codigo));
    if (bloqueio.length > 0) {
      throw new ValidationError(`A apuração de ${competencia} não pode ser registrada: ${bloqueio.map((b) => `${b.codigo} (${b.detalhe})`).join('; ')}.`, { alertas: bloqueio });
    }
    const valorOficial = BigInt(input.valorCents);
    const total = BigInt(m.calculada.totalCalculadoCents);
    const { nova, anterior } = await this.repo.runTransaction(async (tx) => {
      // Item 20 — gate autoritativo DENTRO da tx: TODAS as entradas relidas aqui têm de ser as que o cálculo usou
      // (review do PR-3, achados 3–4: só os totais mensais deixavam passar segregação, contrato, folha e o PA vazio).
      const releitura = await this.montar(scope, competencia, tx);
      if (releitura.impressao !== m.impressao) throw new ConflictError(`As entradas de ${competencia} mudaram depois do cálculo — calcule de novo antes de registrar o DAS.`);
      const atual = await this.repo.findConfirmada(scope, competencia, tx);
      if (atual && (await this.repo.supersede(scope, atual.id, tx)) === 0) throw new ConflictError('Outra apuração foi registrada para esta competência ao mesmo tempo — tente de novo.');
      const row = await this.repo.create(
        scope,
        {
          competencia,
          regime: 'SIMPLES',
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

  private async montar(scope: AccountingScope, competencia: string, tx?: Prisma.TransactionClient): Promise<Montagem> {
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
    if (ignorados.length > 0) alertas.push({ codigo: 'HISTORICO_IGNORADO', detalhe: `histórico ignorado em ${ignorados.join(', ')} — o subrazão do mês prevalece` });

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
    const segRow = await this.entradasRepo.findSegregacao(scope, competencia, tx);
    const seg = { parcelas: ((segRow?.parcelas ?? []) as SimplesSegregacaoParcela[]) };
    if (seg.parcelas.length > 0) alertas.push({ codigo: 'SEGREGACAO_MANUAL', detalhe: `${seg.parcelas.length} parcela(s) segregada(s) por declaração manual` });
    const impressao = JSON.stringify({
      inicio: perfil.inicioAtividadeEm,
      historico: historico.map((h) => [h.competencia, String(h.receitaBrutaCents), h.folhaCents === null ? null : String(h.folhaCents)]),
      subrazao: [...subrazao.entries()].map(([k, v]) => [k, String(v.receitaCents), String(v.cotaCents)]).sort(),
      linhasPa: linhasPa.map((l) => [l.id, l.natureza, l.cTribNac, String(l.receitaCents), String(l.cotaProfissionalCents), l.parceriaContratoId]),
      contratos: [...contratos.values()].map((c) => [c.id, c.naturezaCota]).sort(),
      segregacao: seg.parcelas,
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
    const naoAplicada = sobra.reduce((x, v) => x + v, 0n);
    if (naoAplicada > 0n) {
      alertas.push({ codigo: 'SEGREGACAO_MANUAL', detalhe: `R$ ${(Number(naoAplicada) / 100).toFixed(2)} declarados na segregação não têm receita da mesma natureza no mês e foram ignorados` });
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
      alertas.push({ codigo: 'ATIVIDADE_SEM_ANEXO', detalhe: (e as Error).message });
      calculada = { competencia, regime: 'SIMPLES', rbt12Cents: 0, janelaRbt12: janela, mesesFaltantes: [], atividades: [], totalCalculadoCents: 0, tabela: [] };
    }
    if (entrada.length === 0) calculada = { ...calculada, atividades: [], totalCalculadoCents: 0 };
    if (calculada.mesesFaltantes.length > 0) alertas.push({ codigo: 'RBT12_INCOMPLETO', detalhe: `sem receita declarada em ${calculada.mesesFaltantes.join(', ')}` });
    // Item 16 → item 20: o tie-out do PA também bloqueia o registro.
    const tie = await this.receitaFiscal.tieOut(scope, competencia);
    if (tie.alerta) alertas.push(tie.alerta);
    return { calculada, entrada, receitas, impressao, alertas, tieOut: { subrazaoCents: tie.subrazaoCents, razaoCents: tie.razaoCents, ok: tie.ok } };
  }

  /** Item 23. Devolve se o sublimite do ICMS/ISS (e IBS a partir de 2027) está excedido para o PA. */
  private limites(linhas: Awaited<ReturnType<LegalParameterService['fotografia']>>, competencia: string, receitas: Receitas, inicio: string | null, alertas: AlertaSimples[]): boolean {
    const data = `${competencia}-01`;
    const limite = (chave: string) => BigInt(linhaLegalVigente(linhas, 'SIMPLES_LIMITE', chave, data)?.valorInt ?? 0);
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
    if (me > 0n && acumuladoAno > me && acumuladoAno <= epp) alertas.push({ codigo: 'LIMITE_ME_EXCEDIDO', detalhe: `receita acumulada em ${ano} ${fmt(acumuladoAno)} acima de ${fmt(me)}: a empresa passa a EPP (LC 123 art. 3º I/II)` });
    if (epp > 0n && acumuladoAno > epp) {
      const efeito = acumuladoAno > (epp * 12n) / 10n ? 'exclusão a partir do mês seguinte ao excesso' : 'exclusão a partir de janeiro do ano seguinte';
      alertas.push({ codigo: 'LIMITE_EPP_EXCEDIDO', detalhe: `receita acumulada em ${ano} ${fmt(acumuladoAno)} acima de ${fmt(epp)}: ${efeito} (LC 123 art. 3º §§ 9º e 9º-A)` });
    }
    // Res. CGSN 140 art. 12 § 1º: excesso > 20% impede a partir do mês seguinte; ≤ 20%, a partir do ano seguinte.
    const acumuladoAteAnterior = competencia.endsWith('-01') ? 0n : soma(`${ano}-01`, proximo(competencia, -1));
    const impedidoEsteAno = sub > 0n && acumuladoAteAnterior > (sub * 12n) / 10n;
    const inicioNoAnterior = inicio !== null && inicio.startsWith(`${ano - 1}-`);
    const subAnterior = inicioNoAnterior ? (limite('SUBLIMITE') * BigInt(13 - Number(inicio!.slice(5, 7)))) / 12n : limite('SUBLIMITE');
    const impedidoPeloAnterior = sub > 0n && anoAnterior > subAnterior;
    if (sub > 0n && acumuladoAno > sub) {
      alertas.push({ codigo: 'SUBLIMITE_ICMS_ISS', detalhe: `receita acumulada em ${ano} ${fmt(acumuladoAno)} acima do sublimite ${fmt(sub)} (LC 123 art. 13-A; Res. CGSN 140 art. 12)` });
    }
    return impedidoEsteAno || impedidoPeloAnterior;
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
