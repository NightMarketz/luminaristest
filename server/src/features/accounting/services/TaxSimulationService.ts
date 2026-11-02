import type { CompanyFiscalProfile } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import { SemLinhaVigenteError, linhaLegalVigente, type LegalParameterTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type {
  FatorRSimulacao,
  FatorRSimulacaoQuery,
  RegimeSimulacao,
  RegimeSimulacaoQuery,
  RemuneracaoSocioQuery,
  RemuneracaoSocioSimulacao,
  SimulacaoSugestao,
} from '../dtos/TaxSimulationDto';
import { tabelaIbsCbsDe, tabelaProvisoriaCbsDe } from '../models/ibsCbsParams';
import { issAliquotaMaxBp } from '../models/issLimite';
import { mesBounds } from '../models/Lalur.model';
import { tabelaPisCofinsDe } from '../models/pisCofinsParams';
import type { AtividadeInput, MesReceita, NaturezaSimples, TributoSimples } from '../models/simplesCalc';
import { tabelaApuracaoDe } from '../models/taxAssessmentParams';
import type { PeriodoJcp } from '../models/interestOnEquity';
import { canonicalSha256, type TaxPractice } from '../models/taxOptimization';
import {
  aliquotaMarginalReal,
  encargosFolhaDe,
  simularFatorR,
  simularRegimeAno,
  simularRemuneracao,
  type EntradaRegime,
  type MesRegimeEntrada,
  type SimulacaoAnoCalc,
} from '../models/taxSimulation';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IPartnerRepository } from '../repositories/IPartnerRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { IReceitaFiscalRepository } from '../repositories/IReceitaFiscalRepository';
import type { ISimplesEntradasRepository } from '../repositories/ISimplesEntradasRepository';
import type { AccountingScope } from '../scope/AccountingScope';
import type { AccountingReportService } from './AccountingReportService';
import { formaEfetiva } from './CompanyFiscalProfileService';
import type { InterestOnEquityService } from './InterestOnEquityService';
import { receitaBrutaPorAtividade } from './receitaBrutaPorAtividade';
import type { SimplesApuracaoService } from './SimplesApuracaoService';
import { quarterWindows } from './SpedEcfGenerationService';
import type { TaxOptimizationService } from './TaxOptimizationService';

const TABELAS_REGIME: readonly LegalParameterTabela[] = [
  'SIMPLES_ANEXO_FAIXA',
  'SIMPLES_ANEXO_REPARTICAO',
  'SIMPLES_TETO_ISS',
  'SIMPLES_ENQUADRAMENTO',
  'SIMPLES_LIMITE',
  'TAX_ASSESSMENT',
  'CSLL_ALIQUOTA',
  'CODIGO_RECEITA',
  'PIS_COFINS',
  'IBS_CBS',
  'IBS_CBS_PROVISORIA',
  'ENCARGO_FOLHA',
  'ISS_LIMITE',
];
const TABELAS_REMUNERACAO: readonly LegalParameterTabela[] = ['IRRF_PF_MENSAL', 'IRRF_DISTRIBUICAO', 'ENCARGO_FOLHA', 'SALARIO_MINIMO', 'TAX_ASSESSMENT', 'CSLL_ALIQUOTA', 'CODIGO_RECEITA'];

/** Item 18 — base legal de cada prática simulada, copiada do BRIEF/ADR (nunca texto livre). */
const LEGAL_BASIS: Record<'FATOR_R_FOLHA' | 'TROCA_DE_REGIME' | 'REMUNERACAO_SOCIO', ReadonlyArray<{ norma: string; artigo: string }>> = {
  FATOR_R_FOLHA: [
    { norma: 'LC 123/2006', artigo: 'art. 18 §§ 5º-J, 5º-K, 5º-M e 24 (L11)' },
    { norma: 'Res. CGSN 140/2018', artigo: 'art. 26' },
  ],
  TROCA_DE_REGIME: [
    { norma: 'LC 123/2006', artigo: 'art. 16 caput e § 2º (opção irretratável no ano, em janeiro)' },
    { norma: 'IN RFB 1.700/2017', artigo: 'art. 215 (presunção do Presumido)' },
    { norma: 'LC 214/2025', artigo: 'arts. 343–348 (CBS/IBS de 2026 a 2028)' },
  ],
  REMUNERACAO_SOCIO: [
    { norma: 'Lei 8.212/1991', artigo: 'arts. 21, 22 III, 28 § 5º e 30 § 4º' },
    { norma: 'Lei 9.250/1995', artigo: 'art. 6º-A (IRRF de 10% acima de R$ 50 mil no mês)' },
    { norma: 'Lei 9.249/1995', artigo: 'art. 9º § 2º (IRRF de 17,5% no JCP)' },
  ],
};

const meses = (de: string, ate: string): string[] => {
  const out: string[] = [];
  let [a, m] = de.split('-').map(Number);
  for (;;) {
    const c = `${a}-${String(m).padStart(2, '0')}`;
    if (c > ate) return out;
    out.push(c);
    m += 1;
    if (m === 13) [a, m] = [a + 1, 1];
  }
};
const marcas = (excluir: unknown): TributoSimples[] => (Array.isArray(excluir) ? [...(excluir as TributoSimples[])].sort() : []);
const idsDasLinhas = (linhas: readonly LinhaLegal[]): string[] => [...new Set(linhas.map((l) => l.id))].sort();

const viewAno = (s: SimulacaoAnoCalc) => ({
  ano: s.ano,
  receitaBrutaCents: s.receitaBrutaCents.toString(),
  cenarios: s.cenarios.map((c) => ({
    regime: c.regime,
    disponivel: c.disponivel,
    motivoIndisponivel: c.motivoIndisponivel,
    cargaTotalCents: c.cargaTotalCents.toString(),
    componentes: Object.fromEntries(Object.entries(c.componentes).map(([k, v]) => [k, v.toString()])) as Record<keyof typeof c.componentes, string>,
  })),
  melhor: s.melhor,
  avisos: s.avisos,
});

/**
 * EFICIENCIA-FISCAL PR-3 itens 15–18 (BRIEF BE-INCR-EFICIENCIA-FISCAL; ADR-INCR-EFICIENCIA-FISCAL D8) — monta a entrada dos
 * simuladores a partir do razão, do subrazão e do histórico do Simples, e chama as funções puras de `models/taxSimulation`.
 * FIRST-CLASS PRISMA; não chama `postEntry`; os GETs não gravam nada (D3). O POST `…/sugestao` grava a sugestão do SYSTEM
 * pelo `TaxOptimizationService` (decisão 5 de D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO; a viva nunca é recalculada —
 * I-10). `parametrosSha256` = sha do `calc` gravado na sugestão (I-10); `folhaAlvoCents` nunca entra no `calc` (I-5).
 */
export class TaxSimulationService {
  constructor(
    private readonly simples: Pick<SimplesApuracaoService, 'entradaParaSimulacao'>,
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly fiscalProfileRepo: Pick<IFiscalProfileRepository, 'findByScope'>,
    private readonly accountRepo: IAccountRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly receitaRepo: Pick<IReceitaFiscalRepository, 'findByCompetencia' | 'somaPorCompetencia'>,
    private readonly entradasRepo: Pick<ISimplesEntradasRepository, 'findHistorico'>,
    private readonly reportService: Pick<AccountingReportService, 'resultadoAntesIrpjCsll'>,
    private readonly partnerRepo: Pick<IPartnerRepository, 'findById'>,
    private readonly jcp: Pick<InterestOnEquityService, 'calcular'>,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly taxOptimization: Pick<TaxOptimizationService, 'proposeSystemDetalhado'>,
    private readonly policy: IAccountingPolicy,
  ) {}

  // ---- item 15 ----

  async fatorR(scope: AccountingScope, q: FatorRSimulacaoQuery): Promise<FatorRSimulacao> {
    this.assertRead(scope);
    return (await this.calcularFatorR(scope, q)).view;
  }

  private async calcularFatorR(scope: AccountingScope, q: FatorRSimulacaoQuery): Promise<{ view: FatorRSimulacao; calc: Record<string, unknown>; economia: bigint }> {
    const { input, linhas } = await this.simples.entradaParaSimulacao(scope, q.competencia);
    const tabelas = await this.legalParams.fotografia(['ENCARGO_FOLHA']);
    const encargos = encargosFolhaDe(tabelas, `${q.competencia}-01`);
    const r = simularFatorR(input, linhas, q.folhaAlvoCents, q.tipoFolha, encargos);
    const resultado = {
      competencia: q.competencia,
      tipoFolha: q.tipoFolha,
      rAtual: r.rAtual,
      rSimulado: r.rSimulado,
      anexoAtual: r.anexoAtual,
      anexoSimulado: r.anexoSimulado,
      fs12AtualCents: r.fs12AtualCents.toString(),
      folhaAdicionalCents: r.folhaAdicionalCents.toString(),
      dasAtualCents: r.dasAtualCents.toString(),
      dasSimuladoCents: r.dasSimuladoCents.toString(),
      custoFolhaAdicionalCents: r.custoFolhaAdicionalCents.toString(),
      economiaLiquidaCents: r.economiaLiquidaCents.toString(),
      avisos: r.avisos,
    };
    // I-5: o calc leva a folha ADICIONAL e a FS12 atual, nunca a folha-alvo como campo.
    const calc = { simulacao: 'FATOR_R', resultado, parametrosLegais: idsDasLinhas([...linhas, ...tabelas]) };
    return { view: { ...resultado, parametrosSha256: canonicalSha256(calc) }, calc, economia: r.economiaLiquidaCents };
  }

  // ---- item 16 ----

  async regime(scope: AccountingScope, q: RegimeSimulacaoQuery): Promise<RegimeSimulacao> {
    this.assertRead(scope);
    return (await this.calcularRegime(scope, q)).view;
  }

  private async calcularRegime(scope: AccountingScope, q: RegimeSimulacaoQuery): Promise<{ view: RegimeSimulacao; calc: Record<string, unknown>; economia: bigint }> {
    const ano = q.ano;
    const perfil = await this.companyProfileRepo.findByYear(scope, ano);
    if (perfil?.regime === 'MEI') throw new ValidationError(`${ano}: MEI recolhe valor fixo pelo SIMEI — a simulação de regime é para ME/EPP e demais PJ.`);
    const fp = await this.fiscalProfileRepo.findByScope(scope);
    const linhas = await this.legalParams.fotografia(TABELAS_REGIME);
    const avisos: string[] = [];

    let issAliquotaBp = fp?.issAliquotaBp ?? null;
    if (issAliquotaBp === null) {
      try {
        issAliquotaBp = issAliquotaMaxBp(linhas, `${ano}-12-31`);
      } catch (e) {
        if (!(e instanceof SemLinhaVigenteError)) throw e;
        issAliquotaBp = 500; // LC 116 art. 8º II
      }
      avisos.push(`ISS fora do Simples pela alíquota máxima (${issAliquotaBp / 100}% — LC 116/2003 art. 8º II): o perfil fiscal da unidade não informa a alíquota do município`);
    }
    if (!perfil?.ecfIndAliqCsll) avisos.push('CSLL fora do Simples a 9% (ecfIndAliqCsll = 1): o perfil fiscal do ano não informa o indicador');
    if (perfil?.ecfIndRecReceita === '1') avisos.push('Presumido simulado pelo regime de competência: o perfil do ano está no caixa');

    // Receita do Simples: subrazão (receita − cota) prevalece; o histórico pré-adoção vale nos meses sem subrazão (molde da apuração X14).
    const janela = meses(`${ano - 2}-12`, `${ano}-12`);
    const [historico, subrazao] = await Promise.all([this.entradasRepo.findHistorico(scope, janela), this.receitaRepo.somaPorCompetencia(scope, janela)]);
    const hist = new Map(historico.map((h) => [h.competencia, h]));
    const receitaSimples = (m: string): bigint | null => {
      const s = subrazao.get(m);
      if (s) return s.receitaCents - s.cotaCents;
      const h = hist.get(m);
      return h ? h.receitaBrutaCents : null;
    };
    const folha = (m: string): bigint | null => {
      const f = hist.get(m)?.folhaCents;
      return f === null || f === undefined ? null : f;
    };
    const historicoAnterior: MesReceita[] = [];
    for (const m of meses(`${ano - 2}-12`, `${ano - 1}-12`)) {
      const r = receitaSimples(m);
      if (r !== null) historicoAnterior.push({ competencia: m, receitaBrutaCents: Number(r > 0n ? r : 0n), folhaCents: folha(m) === null ? null : Number(folha(m)) });
    }

    const deps = { accountRepo: this.accountRepo, postingRepo: this.postingRepo, fiscalProfileRepo: this.fiscalProfileRepo };
    const mesesAno: MesRegimeEntrada[] = [];
    let semCTribNac = false;
    let parceria = false;
    for (let k = 1; k <= 12; k += 1) {
      const competencia = `${ano}-${String(k).padStart(2, '0')}`;
      const b = mesBounds(ano, k);
      const rec = await receitaBrutaPorAtividade(deps, scope, b.from, b.to);
      const linhasPa = await this.receitaRepo.findByCompetencia(scope, competencia);
      const grupos = new Map<string, { natureza: NaturezaSimples; cTribNac: string | null; porMarca: Map<string, { excluir: TributoSimples[]; receita: bigint }> }>();
      for (const l of linhasPa) {
        const natureza: NaturezaSimples = l.natureza === 'REVENDA' ? 'REVENDA' : 'SERVICO';
        const cTribNac = natureza === 'REVENDA' ? null : l.cTribNac;
        if (natureza === 'SERVICO' && !cTribNac) semCTribNac = true;
        if (l.parceriaContratoId) parceria = true;
        const g = grupos.get(`${natureza}|${cTribNac ?? ''}`) ?? { natureza, cTribNac, porMarca: new Map() };
        const ex = marcas(l.excluir);
        const p = g.porMarca.get(ex.join('+')) ?? { excluir: ex, receita: 0n };
        p.receita += l.receitaCents - l.cotaProfissionalCents;
        g.porMarca.set(ex.join('+'), p);
        grupos.set(`${natureza}|${cTribNac ?? ''}`, g);
      }
      const atividadesSimples: AtividadeInput[] = [];
      for (const g of grupos.values()) {
        const parcelas = [...g.porMarca.values()].filter((p) => p.receita > 0n).map((p) => ({ receitaCents: Number(p.receita), excluir: p.excluir }));
        if (parcelas.length > 0) atividadesSimples.push({ natureza: g.natureza, cTribNac: g.cTribNac, parcelas });
      }
      const rs = receitaSimples(competencia);
      mesesAno.push({
        competencia,
        servicoCents: BigInt(rec.servicoCents),
        revendaCents: BigInt(rec.revendaCents),
        naoUsoCents: BigInt(rec.naoUsoCents),
        atividadesSimples,
        receitaSimplesCents: rs ?? 0n,
        folhaCents: folha(competencia),
      });
    }
    if (semCTribNac) avisos.push('Simples: venda de serviço sem cTribNac no subrazão — a atividade fica sem anexo e o cenário pode ficar indisponível');
    if (parceria) avisos.push('Simples: a cota do salão-parceiro entra como serviço (sem a natureza de locação/gestão do contrato)');

    const despesaIds = [fp?.irpjDespesaAccountId, fp?.csllDespesaAccountId].filter((x): x is string => !!x);
    const resultadoAntesPorTrimestre: bigint[] = [];
    for (const w of quarterWindows(ano)) resultadoAntesPorTrimestre.push(BigInt(await this.reportService.resultadoAntesIrpjCsll(scope, w.from, w.to, despesaIds)));

    const sublimite = linhaLegalVigente(linhas, 'SIMPLES_LIMITE', 'SUBLIMITE', `${ano}-01-01`)?.valorInt;
    const epp = linhaLegalVigente(linhas, 'SIMPLES_LIMITE', 'EPP', `${ano}-01-01`)?.valorInt;
    const entrada: EntradaRegime = {
      ano,
      meses: mesesAno,
      historicoAnterior,
      inicioAtividade: perfil?.inicioAtividadeEm ? perfil.inicioAtividadeEm.slice(0, 7) : null,
      perfil: perfilSimulado(perfil),
      resultadoAntesPorTrimestre,
      issAliquotaBp,
      sublimiteCents: BigInt(sublimite ?? 0),
      linhas,
      tabelaApuracao: tabelaApuracaoDe(linhas),
      tabelaPisCofins: tabelaPisCofinsDe(linhas),
      tabelaIbsCbs: tabelaIbsCbsDe(linhas),
      tabelaCbsProvisoria: tabelaProvisoriaCbsDe(linhas),
      encargos: encargosFolhaDe(linhas, `${ano}-12-31`),
    };
    const simulacao = simularRegimeAno(entrada);
    // Decisão 4: ano ≤ 2026 ⇒ a mesma receita sob as regras de 2027 (o ano simulado vira o histórico do RBT12).
    const projecao2027 = ano <= 2026 ? simularRegimeAno(projetar2027(entrada)) : null;

    const regimeAtual = perfil?.regime ?? null;
    const atual = simulacao.cenarios.find((c) => c.regime === regimeAtual && c.disponivel);
    const melhor = simulacao.cenarios.find((c) => c.regime === simulacao.melhor);
    const economia = atual && melhor ? atual.cargaTotalCents - melhor.cargaTotalCents : 0n;
    if (!regimeAtual) avisos.push(`sem perfil fiscal de ${ano}: a economia fica 0 (não há regime atual para comparar)`);

    const alertas: RegimeSimulacao['alertas'] = [];
    const receita = simulacao.receitaBrutaCents;
    const fmt = (v: bigint) => `R$ ${(Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (epp && receita > BigInt(epp)) {
      alertas.push({ codigo: 'LIMITE_EPP_EXCEDIDO', detalhe: `receita de ${ano} ${fmt(receita)} acima do limite da EPP ${fmt(BigInt(epp))} — fora do Simples (LC 123 art. 3º II)` });
    } else if (sublimite && receita > BigInt(sublimite)) {
      alertas.push({ codigo: 'SUBLIMITE_EXCEDIDO', detalhe: `receita de ${ano} ${fmt(receita)} acima do sublimite ${fmt(BigInt(sublimite))}: ICMS e ISS (e o IBS a partir de 2027) saem do DAS (LC 123 art. 13-A)` });
    } else if (sublimite && receita * 10n >= BigInt(sublimite) * 8n) {
      alertas.push({ codigo: 'SUBLIMITE_80', detalhe: `receita de ${ano} ${fmt(receita)} em 80% ou mais do sublimite ${fmt(BigInt(sublimite))} (LC 123 art. 13-A)` });
    }
    alertas.push({
      codigo: 'JANELA_OPCAO',
      detalhe: 'a opção pelo Simples é feita em janeiro, até o último dia útil, com efeitos desde 1º de janeiro, e é irretratável para todo o ano-calendário (LC 123 art. 16 caput e § 2º)',
    });

    const resultado = {
      ano,
      regimeAtual,
      simulacao: viewAno(simulacao),
      projecao2027: projecao2027 ? viewAno(projecao2027) : null,
      economiaCents: economia.toString(),
      alertas,
      avisos,
    };
    const calc = { simulacao: 'REGIME', resultado, parametrosLegais: idsDasLinhas(linhas) };
    return { view: { ...resultado, parametrosSha256: canonicalSha256(calc) }, calc, economia };
  }

  // ---- item 17 ----

  async remuneracaoSocio(scope: AccountingScope, q: RemuneracaoSocioQuery): Promise<RemuneracaoSocioSimulacao> {
    this.assertRead(scope);
    return (await this.calcularRemuneracao(scope, q)).view;
  }

  private async calcularRemuneracao(scope: AccountingScope, q: RemuneracaoSocioQuery): Promise<{ view: RemuneracaoSocioSimulacao; calc: Record<string, unknown>; economia: bigint }> {
    const partner = await this.partnerRepo.findById(scope, q.partnerId);
    if (!partner) throw new NotFoundError(`Sócio '${q.partnerId}' não encontrado.`);
    if (partner.tipoPessoa !== 'PF' || !partner.residenteBrasil) {
      throw new ValidationError('A simulação de remuneração é para sócio pessoa física residente no Brasil (pró-labore, IRPF e o IRRF do art. 6º-A).', null, 'SOCIO_FORA_DO_ESCOPO');
    }
    if (partner.entradaEm > `${q.ano}-12-31` || (partner.saidaEm !== null && partner.saidaEm < `${q.ano}-01-01`)) {
      throw new ValidationError(`O sócio não está no quadro em ${q.ano} (entrada ${partner.entradaEm}${partner.saidaEm ? `, saída ${partner.saidaEm}` : ''}).`, null, 'SOCIO_FORA_DO_ANO');
    }
    const perfil = await this.companyProfileRepo.findByYear(scope, q.ano);
    if (!perfil) throw new ValidationError(`Cadastre o perfil fiscal da empresa de ${q.ano} antes de simular a remuneração do sócio.`);
    if (perfil.regime === 'MEI') throw new ValidationError('MEI: o titular não recebe pró-labore nem dividendos da forma simulada.');
    const linhas = await this.legalParams.fotografia(TABELAS_REMUNERACAO);
    const salarioMinimo = linhaLegalVigente(linhas, 'SALARIO_MINIMO', 'NACIONAL', `${q.ano}-01-01`)?.valorInt;
    if (!salarioMinimo) throw new SemLinhaVigenteError('SALARIO_MINIMO', `${q.ano}-01-01`, 'NACIONAL');

    const avisos: string[] = [];
    let jcpLimiteSocio: bigint | null = null;
    let aliquotaMarginal: number | null = null;
    if (perfil.regime === 'REAL') {
      aliquotaMarginal = aliquotaMarginalReal(tabelaApuracaoDe(linhas), perfil.ecfIndAliqCsll, q.ano);
      const periodos = formaEfetiva(perfil.regime, perfil.formaApuracaoIrpjCsll) === 'ANUAL' ? [['A00', `${q.ano}-12-31`]] : [['T01', `${q.ano}-03-31`], ['T02', `${q.ano}-06-30`], ['T03', `${q.ano}-09-30`], ['T04', `${q.ano}-12-31`]];
      try {
        let limite = 0n;
        for (const [periodo, dataCredito] of periodos) {
          const c = await this.jcp.calcular(scope, { unitId: scope.unitId, anoCalendario: q.ano, periodo: periodo as PeriodoJcp, dataCredito, forma: 'DESPESA', totalCents: 1 });
          limite += c.limiteDedutivelCents;
        }
        jcpLimiteSocio = (limite * BigInt(partner.participacaoBp)) / 10_000n;
      } catch (e) {
        if (!(e instanceof ValidationError)) throw e;
        avisos.push(`JCP fora do mix: o limite dedutível não foi calculado (${e.message})`);
      }
    }
    const r = simularRemuneracao({
      ano: q.ano,
      valorAnualCents: q.valorAnualCents,
      regime: perfil.regime,
      cppForaDoDas: perfil.regime !== 'SIMPLES',
      salarioMinimoCents: BigInt(salarioMinimo),
      encargos: encargosFolhaDe(linhas, `${q.ano}-12-31`),
      linhas,
      jcpLimiteSocioCents: jcpLimiteSocio,
      aliquotaMarginalBp: aliquotaMarginal,
    });
    const s = (v: bigint) => v.toString();
    const resultado = {
      ano: q.ano,
      partnerId: q.partnerId,
      regime: perfil.regime,
      valorAnualCents: s(q.valorAnualCents),
      mixes: r.mixes.map((m) => ({
        mix: m.mix,
        proLaboreCents: s(m.proLaboreCents),
        dividendosCents: s(m.dividendosCents),
        jcpCents: s(m.jcpCents),
        inssSocioCents: s(m.inssSocioCents),
        cppEmpresaCents: s(m.cppEmpresaCents),
        irpfProLaboreCents: s(m.irpfProLaboreCents),
        irrfDividendosCents: s(m.irrfDividendosCents),
        irrfJcpCents: s(m.irrfJcpCents),
        economiaIrpjCsllJcpCents: s(m.economiaIrpjCsllJcpCents),
        cargaTotalCents: s(m.cargaTotalCents),
        liquidoSocioCents: s(m.liquidoSocioCents),
      })),
      melhor: r.melhor,
      economiaCents: s(r.economiaCents),
      avisos: [...r.avisos, ...avisos],
    };
    const calc = { simulacao: 'REMUNERACAO_SOCIO', resultado, parametrosLegais: idsDasLinhas(linhas) };
    return { view: { ...resultado, parametrosSha256: canonicalSha256(calc) }, calc, economia: r.economiaCents };
  }

  // ---- item 18 ----

  async proporFatorR(scope: AccountingScope, q: FatorRSimulacaoQuery): Promise<SimulacaoSugestao> {
    this.assertManage(scope);
    const r = await this.calcularFatorR(scope, q);
    return this.propor(scope, 'FATOR_R_FOLHA', 'COMPETENCIA', q.competencia, r);
  }

  async proporRegime(scope: AccountingScope, q: RegimeSimulacaoQuery): Promise<SimulacaoSugestao> {
    this.assertManage(scope);
    const r = await this.calcularRegime(scope, q);
    return this.propor(scope, 'TROCA_DE_REGIME', 'ANO', String(q.ano), r);
  }

  async proporRemuneracao(scope: AccountingScope, q: RemuneracaoSocioQuery): Promise<SimulacaoSugestao> {
    this.assertManage(scope);
    const r = await this.calcularRemuneracao(scope, q);
    return this.propor(scope, 'REMUNERACAO_SOCIO', 'PARTNER', q.partnerId, r);
  }

  /** Decisão 5: economia ≤ 0 ⇒ 400; a PROPOSED viva com outros parâmetros fica como está, com aviso (I-10). */
  private async propor(
    scope: AccountingScope,
    practice: Extract<TaxPractice, 'FATOR_R_FOLHA' | 'TROCA_DE_REGIME' | 'REMUNERACAO_SOCIO'>,
    subjectType: string,
    subjectId: string,
    r: { calc: Record<string, unknown>; economia: bigint },
  ): Promise<SimulacaoSugestao> {
    if (r.economia <= 0n) throw new ValidationError('A simulação não mostra economia — não há sugestão a registrar.', null, 'SIMULACAO_SEM_ECONOMIA');
    const p = await this.taxOptimization.proposeSystemDetalhado(scope, { practice, subjectType, subjectId, legalBasis: LEGAL_BASIS[practice], estimatedSavingCents: r.economia, calc: r.calc });
    const avisos = p.parametrosDivergentes
      ? ['já existe sugestão PROPOSED deste assunto calculada com outros parâmetros ou tabelas; ela não foi recalculada (I-10) — rejeite-a para registrar a nova simulação']
      : [];
    return { suggestionId: p.id, reaproveitada: p.reaproveitada, avisos };
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para simular regime e tributos desta unidade.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para registrar sugestões de simulação desta unidade.');
  }
}

/** O perfil do ano como as funções puras do X7 o leem; sem perfil, os padrões (9%, competência, sem LC 224, sem 16%). */
function perfilSimulado(p: CompanyFiscalProfile | null): EntradaRegime['perfil'] {
  return {
    ecfIndAliqCsll: p?.ecfIndAliqCsll ?? '1',
    ecfIndRecReceita: p?.ecfIndRecReceita === '1' ? '2' : (p?.ecfIndRecReceita ?? null),
    lc224AcrescimoSuspenso: p?.lc224AcrescimoSuspenso ?? false,
    lc224LiminarReferencia: p?.lc224LiminarReferencia ?? null,
    inicioAtividadeEm: p?.inicioAtividadeEm ?? null,
    encerramentoAtividadeEm: p?.encerramentoAtividadeEm ?? null,
    prestadoraExclusivaServicos: p?.prestadoraExclusivaServicos ?? false,
    declaraNaoProfissaoRegulamentada: p?.declaraNaoProfissaoRegulamentada ?? false,
    lucroRealObrigatorio: p?.lucroRealObrigatorio ?? null,
  };
}

/** Decisão 4 — a projeção de 2027: os meses do ano simulado viram 2027; eles mesmos viram o histórico de 2026; o dezembro anterior, 2025-12. */
function projetar2027(e: EntradaRegime): EntradaRegime {
  const mm = (c: string) => c.slice(5);
  const dezembro = e.historicoAnterior.find((h) => h.competencia === `${e.ano - 1}-12`);
  return {
    ...e,
    ano: 2027,
    meses: e.meses.map((m) => ({ ...m, competencia: `2027-${mm(m.competencia)}` })),
    historicoAnterior: [
      ...(dezembro ? [{ ...dezembro, competencia: '2025-12' }] : []),
      ...e.meses.map((m) => ({ competencia: `2026-${mm(m.competencia)}`, receitaBrutaCents: Number(m.receitaSimplesCents > 0n ? m.receitaSimplesCents : 0n), folhaCents: m.folhaCents === null ? null : Number(m.folhaCents) })),
    ],
    encargos: { ...e.encargos, data: '2027-12-31' },
  };
}
