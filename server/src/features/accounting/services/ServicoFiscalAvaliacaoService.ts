import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IServiceFiscalProfileRepository } from '../repositories/IServiceFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IReceitaFiscalRepository } from '../repositories/IReceitaFiscalRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type { TaxOptimizationService } from './TaxOptimizationService';
import type { ServicoFiscalAvaliacaoView } from '../dtos/ServicoFiscalAvaliacaoDto';
import { receitaBrutaPorAtividade } from './receitaBrutaPorAtividade';
import { quarterWindows } from './SpedEcfGenerationService';
import { alertaPacote, alertasDeEnquadramento, cargaIbsCbsDoServico, IBS_CBS_REDUCAO_NBS_DESDE, type AlertaServico } from '../models/servicoFiscalAvaliacao';
import { repartirReceitaHospitalar, type LinhaServicoReceita } from '../models/presuncaoHospitalar';
import { atividadeDoServico, tabelaApuracaoDe } from '../models/taxAssessmentParams';
import { apurarPresumidoTrimestral, type MemoriaAnterior, type PeriodoTrimestral, type TributoApuracao } from '../models/taxAssessmentCalc';
import type { CompanyFiscalProfile } from 'generated/prisma';

const BASE_HOSPITALAR = [
  { norma: 'Lei 9.249/1995', artigo: 'art. 15 § 1º III "a" e § 2º (ADR L18/L19)' },
  { norma: 'Lei 9.249/1995', artigo: 'art. 20 III' },
] as const;
const BASE_NBS_SAUDE = [{ norma: 'LC 214/2025', artigo: 'art. 130 e Anexo III (ADR L24)' }] as const;


/**
 * EFICIENCIA-FISCAL PR-5 (BRIEF itens 27, 30, 31, 32; D-2026-10-28-EFICIENCIA-FISCAL-PR5-EXECUCAO lacuna 4) — avaliação dos
 * serviços da unidade no ano: alertas de enquadramento (puros, `servicoFiscalAvaliacao.ts`) e as sugestões do sistema
 * `PRESUNCAO_HOSPITALAR` (por serviço TERAPEUTICA com receita a 32 %) e `NBS_SAUDE_2027` (serviço estético com NBS de saúde),
 * idempotentes pelo `TaxOptimizationService.proposeSystem` (1 PROPOSED viva por assunto). Nunca apura nem muda o perfil: a
 * sugestão é para decisão humana (ADR D1/D3).
 */
export class ServicoFiscalAvaliacaoService {
  constructor(
    private readonly policy: IAccountingPolicy,
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly serviceFiscalRepo: Pick<IServiceFiscalProfileRepository, 'listByScope'>,
    private readonly fiscalProfileRepo: IFiscalProfileRepository,
    private readonly receitaFiscalRepo: Pick<IReceitaFiscalRepository, 'findServicosEntreDias'>,
    private readonly accountRepo: IAccountRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly taxOptimization: Pick<TaxOptimizationService, 'proposeSystem'>,
  ) {}

  async avaliar(scope: AccountingScope, ano: number): Promise<ServicoFiscalAvaliacaoView> {
    if (!this.policy.canManageTaxOptimization(scope)) throw new ForbiddenError('Você não tem permissão para a avaliação de eficiência fiscal desta unidade.');
    const empresa = await this.companyProfileRepo.findByYear(scope, ano);
    if (!empresa) throw new ValidationError(`perfil fiscal da empresa de ${ano} ausente — cadastre-o antes de avaliar os serviços.`);
    const [servicos, fp, linhasLegais, receitas] = await Promise.all([
      this.serviceFiscalRepo.listByScope(scope),
      this.fiscalProfileRepo.findByScope(scope),
      this.legalParams.fotografia(['TAX_ASSESSMENT', 'CSLL_ALIQUOTA', 'CODIGO_RECEITA', 'IBS_CBS', 'IBS_CBS_REDUCAO_NBS']),
      this.receitaFiscalRepo.findServicosEntreDias(scope, `${ano}-01-01`, `${ano}-12-31`),
    ]);
    const avisos: string[] = [];
    const alertas: AlertaServico[] = alertasDeEnquadramento(servicos, empresa);
    const pacote = alertaPacote(fp?.pacoteFatoGerador ?? null, empresa.regime);
    if (pacote) alertas.push(pacote);

    const sugestoes: ServicoFiscalAvaliacaoView['sugestoes'] = [];
    const receitaDe = (ref: string) => receitas.filter((l) => l.serviceRef === ref).reduce((s, l) => s + l.receitaCents - l.cotaProfissionalCents, 0n);
    const checklist = { sociedadeEmpresaria: empresa.sociedadeEmpresaria, alvaraSanitarioValidoAte: empresa.alvaraSanitarioValidoAte };

    // Item 27 — PRESUNCAO_HOSPITALAR: só no Presumido, serviço TERAPEUTICA com receita que foi a 32 % no ano.
    if (empresa.regime === 'PRESUMIDO') {
      const rep = repartirReceitaHospitalar(receitas, servicos, checklist);
      for (const s of servicos.filter((x) => x.finalidade === 'TERAPEUTICA')) {
        const r = rep.porServico.find((p) => p.serviceRef === s.serviceRef);
        if (!r || r.servicoCents <= 0n) continue;
        const faltando = new Set<string>(s.elegivelHospitalar ? r.faltando : ['ELEGIVEL_HOSPITALAR']);
        for (const f of atividadeDoServico({ finalidade: s.finalidade, elegivelHospitalar: true }, checklist, `${ano}-12-31`).faltando) faltando.add(f);
        const economia = await this.economiaHospitalar(scope, empresa, ano, receitas, servicos, checklist, s.serviceRef, linhasLegais, avisos);
        const suggestionId = await this.taxOptimization.proposeSystem(scope, {
          practice: 'PRESUNCAO_HOSPITALAR',
          subjectType: 'SERVICO',
          subjectId: s.serviceRef,
          legalBasis: BASE_HOSPITALAR,
          estimatedSavingCents: economia,
          calc: { ano, serviceRef: s.serviceRef, receitaA32Cents: r.servicoCents, faltando: [...faltando], ajuda: 'P-EF-7: sala cirúrgica/ambulatorial; consulta e toxina/preenchimento simples = 32 %' },
        });
        sugestoes.push({ practice: 'PRESUNCAO_HOSPITALAR', serviceRef: s.serviceRef, suggestionId, estimatedSavingCents: economia.toString(), faltando: [...faltando] });
      }
    }

    // Item 32 — NBS_SAUDE_2027: serviço estético (ou sem finalidade, I-17) com NBS de saúde ⇒ alíquota cheia + decisão humana.
    const data2027 = ano >= 2027 ? `${ano}-01-01` : IBS_CBS_REDUCAO_NBS_DESDE; // ano anterior ⇒ projeção sobre 01/01/2027
    for (const s of servicos) {
      if ((s.finalidade ?? 'ESTETICA') !== 'ESTETICA') continue;
      const carga = cargaIbsCbsDoServico({ cNBS: s.cNBS, finalidade: s.finalidade }, data2027, linhasLegais);
      if (!carga.nbsSaude) continue;
      const receita = receitaDe(s.serviceRef);
      if (receita <= 0n) continue;
      const comReducao = cargaIbsCbsDoServico({ cNBS: s.cNBS, finalidade: 'TERAPEUTICA' }, data2027, linhasLegais);
      for (const a of carga.avisos) if (!avisos.includes(a)) avisos.push(a);
      const economia = carga.cargaBp !== null && comReducao.cargaBp !== null ? (receita * BigInt(carga.cargaBp - comReducao.cargaBp)) / 10000n : 0n;
      const suggestionId = await this.taxOptimization.proposeSystem(scope, {
        practice: 'NBS_SAUDE_2027',
        subjectType: 'SERVICO',
        subjectId: s.serviceRef,
        legalBasis: BASE_NBS_SAUDE,
        estimatedSavingCents: economia,
        calc: { ano, serviceRef: s.serviceRef, cNBS: s.cNBS, finalidade: s.finalidade, receitaAnoCents: receita, cargaCheiaBp: carga.cargaBp, cargaReduzidaBp: comReducao.cargaBp, memoria: carga.memoria },
      });
      sugestoes.push({ practice: 'NBS_SAUDE_2027', serviceRef: s.serviceRef, suggestionId, estimatedSavingCents: economia.toString(), faltando: ['FINALIDADE_NAO_ESTETICA'] });
    }
    return { ano, regime: empresa.regime, alertas, sugestoes, avisos };
  }

  /**
   * Item 27 — economia estimada = Σ por trimestre do (IRPJ + CSLL) do Presumido como está − o mesmo com a receita do serviço a
   * 8 %/12 %, pelas funções puras do X7 (com adicional e LC 224; ADR §6 item 27). Receita do razão não segregável ou perfil
   * incompleto ⇒ 0 e aviso (a sugestão não é apuração).
   */
  private async economiaHospitalar(
    scope: AccountingScope,
    empresa: CompanyFiscalProfile,
    ano: number,
    receitas: readonly LinhaServicoReceita[],
    servicos: Parameters<typeof repartirReceitaHospitalar>[1],
    checklist: Parameters<typeof repartirReceitaHospitalar>[2],
    serviceRef: string,
    linhasLegais: Awaited<ReturnType<LegalParameterService['fotografia']>>,
    avisos: string[],
  ): Promise<bigint> {
    const tabela = tabelaApuracaoDe(linhasLegais);
    const deps = { accountRepo: this.accountRepo, postingRepo: this.postingRepo, fiscalProfileRepo: this.fiscalProfileRepo };
    let economia = 0n;
    try {
      for (const tributo of ['IRPJ', 'CSLL'] as TributoApuracao[]) {
        const antA: MemoriaAnterior[] = [];
        const antB: MemoriaAnterior[] = [];
        for (const w of quarterWindows(ano)) {
          const periodo = w.perApur as PeriodoTrimestral;
          const rec = await receitaBrutaPorAtividade(deps, scope, w.from, w.to);
          const doTrimestre = receitas.filter((l) => l.dia >= w.dtIni && l.dia <= w.dtFin);
          const rep = repartirReceitaHospitalar(doTrimestre, servicos, checklist);
          const extra = rep.porServico.find((p) => p.serviceRef === serviceRef)?.servicoCents ?? 0n;
          const base = { tabela, ano, periodo, tributo, receitaServicoCents: BigInt(rec.servicoCents), receitaRevendaCents: BigInt(rec.revendaCents), receitaNaoUsoCents: BigInt(rec.naoUsoCents), perfil: empresa, deducoes: [] };
          const a = apurarPresumidoTrimestral({ ...base, receitaHospitalarCents: rep.hospitalarCents, anteriores: [...antA] });
          const b = apurarPresumidoTrimestral({ ...base, receitaHospitalarCents: rep.hospitalarCents + (extra > 0n ? extra : 0n), anteriores: [...antB] });
          antA.push({ periodo, memoria: a.memoria });
          antB.push({ periodo, memoria: b.memoria });
          economia += a.devidoCents - b.devidoCents;
        }
      }
    } catch (e) {
      if (!(e instanceof ValidationError)) throw e;
      const aviso = `economia de ${serviceRef} não estimada (${e.message.slice(0, 160)}): a sugestão segue com 0.`;
      if (!avisos.includes(aviso)) avisos.push(aviso);
      return 0n;
    }
    return economia > 0n ? economia : 0n;
  }
}
