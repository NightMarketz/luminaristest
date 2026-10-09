import { Prisma } from 'generated/prisma';
import type { CompanyFiscalProfile } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ICompanyFiscalProfileRepository, CompanyFiscalProfileData } from '../repositories/ICompanyFiscalProfileRepository';
import type { ICompanySignerRepository } from '../repositories/ICompanySignerRepository';
import type { IAccountingContactRepository } from '../repositories/IAccountingContactRepository';
import type { AuditService } from './AuditService';
import type { AccountingReportService } from './AccountingReportService';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { ILalurRepository } from '../repositories/ILalurRepository';
import { LALUR_MESES, LALUR_QUARTERS } from '../models/Lalur.model';
import { scopeToday } from '../models/dates';
import { regimeUnidadeEsperado } from '../models/regimeEmpresa';
import type { PerfilParaPrefill } from '../models/spedPerfilPrefill';
import type { CompanyDeclarante, IBS_CBS_OPCOES, UpsertCompanyFiscalProfileInput } from '../dtos/CompanyFiscalProfileDto';

export type IbsCbsOpcao = (typeof IBS_CBS_OPCOES)[number];
import { matrizObrigacoesDe, resolverObrigacoes, type ObrigacaoResolvida, type PerfilParaObrigacoes } from '../models/obrigacoesPorRegime';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type { CondicoesPerfil, ObrigacaoSped, StatusObrigacao } from '../models/obrigacoesPorRegime';
import type { RegimeEmpresa } from '../models/regimeEmpresa';

export const COMPANY_FISCAL_PROFILE_UPDATED = 'company_fiscal_profile.updated';
export const COMPANY_FISCAL_PROFILE_DELETED = 'company_fiscal_profile.deleted';
export const COMPANY_FISCAL_PROFILE_ECF_TRANSMITTED = 'company_fiscal_profile.ecf_transmitted';

/** Lei 11.638/2007 art. 3º p.ú. — grande porte: ativo total > R$ 240 mi OU receita bruta anual > R$ 300 mi, no exercício anterior. */
const GRANDE_PORTE_ATIVO_CENTS = 240_000_000_00;
const GRANDE_PORTE_RECEITA_CENTS = 300_000_000_00;

/** Ano-calendário corrente no fuso do escopo (ADR do fuso) — nunca `new Date().getFullYear()`. */
export function anoCorrente(scope: AccountingScope): number {
  return Number(scopeToday(scope).slice(0, 4));
}

export interface CompanyFiscalProfileView {
  ano: number;
  regime: RegimeEmpresa;
  grandePorte: boolean | null;
  inativa: boolean;
  condicoes: CondicoesPerfil;
  declarante: CompanyDeclarante | null;
  ecd: { indNire: string; nire: string | null; numOrd: string | null; natLivr: string | null } | null;
  ecf: { indAliqCsll: string | null; indRecReceita: string | null } | null;
  contadorContactId: string | null;
  representanteLegalSignerId: string | null;
  ecfRecibo: string | null;
  regimeTravadoEm: string | null;
  // X7 Fase A (BRIEF itens 1, 2, 2b)
  formaApuracaoIrpjCsll: string | null;
  formaApuracaoTravadaEm: string | null;
  lucroRealObrigatorio: boolean | null;
  inicioAtividadeEm: string | null;
  encerramentoAtividadeEm: string | null;
  lc224AcrescimoSuspenso: boolean;
  lc224LiminarReferencia: string | null;
  // X7 Fase B (BRIEF B item 3b)
  prestadoraExclusivaServicos: boolean;
  declaraNaoProfissaoRegulamentada: boolean; // BE-INCR-TAX-PRESUMIDO-16 (F-P16-1 a)
  meiContribuinteIcms: boolean | null; // X14 PR-4 item 25
  meiContribuinteIss: boolean | null;
  ibsCbsOpcaoS1: IbsCbsOpcao | null; // X14 PR-2 item 14
  ibsCbsOpcaoS2: IbsCbsOpcao | null;
  updatedAt: string;
}

/** PUT (F-XP-8 a): o perfil salvo + unidades cujo `FiscalProfile.regimeTributario` diverge do regime do ano corrente. */
export interface CompanyFiscalProfileUpsertView extends CompanyFiscalProfileView {
  unidadesDivergentes: string[];
}

export interface ObrigacaoComFaltantes {
  obrigacao: ObrigacaoSped;
  status: StatusObrigacao;
  fonte: string;
  perguntaPendente?: string;
  faltantes: string[];
}

export interface CompanyObligationsView {
  ano: number;
  perfil: 'COMPLETO' | 'INCOMPLETO' | 'AUSENTE';
  regime?: RegimeEmpresa;
  obrigacoes: ObrigacaoComFaltantes[];
  avisos: string[];
}

/**
 * Campos exigidos por arquivo, espelhando o que os DTOs de geração obrigam HOJE (fonte = o próprio contrato de
 * entrada, que já cita o manual): ECD 0000 → `SpedEcdDto.DeclarantSchema` (nome/cnpj/uf/codMun obrigatórios; ie/im
 * opcionais) + `BookSchema` + `indGrandePorte`; ECF 0000/0030 → `SpedEcfDto.DeclarantSchema`.
 */
const DECLARANTE_ECD: (keyof CompanyDeclarante)[] = ['nome', 'cnpj', 'uf', 'codMun'];
const DECLARANTE_ECF: (keyof CompanyDeclarante)[] = ['cnpj', 'nome', 'codNat', 'cnaeFiscal', 'endereco', 'bairro', 'uf', 'codMun', 'cep', 'email'];

/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF itens 6, 7, 9, 10; F-XP-2/3 → a) — perfil fiscal da EMPRESA por
 * ano. Chave (dono, ano) — instância = CNPJ raiz (R8). Policy = a do perfil fiscal (item 6).
 *
 * Referências (item 7) resolvidas DENTRO da tx do upsert, com `tx` propagado (gate autoritativo dentro da tx):
 * contador = `AccountingContact` vivo do escopo; representante legal = `CompanySigner` vivo do dono. Id de outro
 * escopo → 404 (nunca 403, mesma regra de `expandSignerContacts`).
 *
 * Obrigações (item 9): faltantes só para obrigação OBRIGATORIA ou CONDICIONAL — FACULTATIVA não cobra dado de quem
 * não é obrigado a entregar; CONDICIONAL também cobra a resposta pendente (`condicoes.<chave>`).
 */
export class CompanyFiscalProfileService {
  constructor(
    private readonly repo: ICompanyFiscalProfileRepository,
    private readonly signerRepo: ICompanySignerRepository,
    private readonly contactRepo: IAccountingContactRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    // PR-2: unidades do dono (F-XP-8 a) e BP/DRE do exercício anterior para o aviso de grande porte (F-XP-6 a).
    private readonly fiscalProfileRepo: IFiscalProfileRepository,
    private readonly reportService: AccountingReportService,
    // X7 Fase B PR-4 (BRIEF B item 2, F-TB-6 a): o e-Lalur do ano, em todas as unidades do dono — só leitura.
    private readonly lalurRepo: Pick<ILalurRepository, 'countByOwnerYearPeriods'>,
    /** BE-INCR-LEGAL-PARAMS PR-2 (F-LP-4 a): fotografia `OBRIGACAO_REGIME` (matriz regime × obrigação). */
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
  ) {}

  /**
   * PR-2 — a matriz vigente em `data` aplicada ao perfil. Também é o que o onboarding chama (SystemProvisioningService)
   * para não montar a fotografia por conta própria. Os chamadores passam HOJE (fuso do escopo): a matriz em código não
   * lia vigência, e filtrar pelo ano do perfil tiraria a DCTFWEB (vigente desde 2025) de um perfil de 2024 — mudança
   * de comportamento que esta cópia não decide (relatório do PR-2, "Lacunas de spec").
   */
  async resolverObrigacoesEm(data: string, perfil: PerfilParaObrigacoes): Promise<ObrigacaoResolvida[]> {
    return resolverObrigacoes(perfil, matrizObrigacoesDe(await this.legalParams.fotografia(['OBRIGACAO_REGIME']), data));
  }

  async get(scope: AccountingScope, ano: number): Promise<CompanyFiscalProfileView | null> {
    this.assertRead(scope);
    const row = await this.repo.findByYear(scope, ano);
    return row ? toView(row) : null;
  }

  /**
   * PR-2 item 16 (F-XP-5 a): depois de `ecf-transmitida`, mudar o regime do ano → 409 REGIME_TRAVADO — a ECF
   * retificadora não pode mudar o regime (IN RFB 2.004/2021 art. 7º §2º). Os demais campos seguem editáveis.
   * F-XP-8 (a): no ano corrente, devolve as unidades cujo perfil diverge do regime (aceita, não bloqueia).
   */
  async upsert(scope: AccountingScope, ano: number, input: UpsertCompanyFiscalProfileInput): Promise<CompanyFiscalProfileUpsertView> {
    this.assertManage(scope);
    const data = toData(input);
    // X14 PR-2 item 14: a opção do IBS/CBS no DAS existe a partir de 2027 (LC 123 art. 13 §§ 9º–10, red. LC 214).
    if (ano < 2027 && (data.ibsCbsOpcaoS1 !== null || data.ibsCbsOpcaoS2 !== null)) {
      throw new ValidationError(`A opção do IBS/CBS por semestre só existe a partir de 2027 (perfil de ${ano}).`);
    }
    return this.repo.runTransaction(async (tx) => {
      const atual = await this.repo.findByYear(scope, ano, tx);
      if (atual?.regimeTravadoEm && atual.regime !== data.regime) {
        throw new ConflictError(
          `REGIME_TRAVADO: a ECF de ${ano} foi transmitida (recibo ${atual.ecfRecibo}) — o regime não muda depois disso (IN RFB 2.004/2021 art. 7º §2º).`,
        );
      }
      if (atual) assertFormaNaoTravada(atual, data, ano);
      await this.assertTrocaDeFormaSemLalur(scope, ano, atual, data, tx);
      await this.assertRefs(scope, data, tx);
      const row = await this.repo.upsert(scope, ano, data, tx);
      await this.auditUpdated(tx, scope, row);
      const esperado = regimeUnidadeEsperado(data.regime as RegimeEmpresa);
      const unidadesDivergentes =
        ano === anoCorrente(scope)
          ? (await this.fiscalProfileRepo.findManyByOwner(scope.ownerUserId, tx)).filter((u) => u.regimeTributario !== esperado).map((u) => u.unitId)
          : [];
      return { ...toView(row), unidadesDivergentes };
    });
  }

  /**
   * X7 Fase B PR-4 (BRIEF B item 2, F-TB-6 a): trocar `TRIMESTRAL ↔ ANUAL` com o e-Lalur do ano preenchido nos períodos
   * da forma antiga ⇒ 400, listando período, livro e quantidade — a linha ficaria órfã e a ECF a recusaria (item 21).
   * A forma comparada é a do e-Lalur: `ANUAL` só com a forma efetiva `ANUAL`; qualquer outro caso, inclusive sem perfil,
   * é `TRIMESTRAL` (D-2026-10-05-X7-FASE-B-PR2-LACUNAS §1). Olha todas as unidades do dono (lacuna 2 do PR-4). Roda
   * dentro da tx de quem troca: o upsert, a cópia de outro ano e a exclusão (perfil ausente = TRIMESTRAL) — os dois
   * últimos pelo achado do review independente (decisão do dono, 05/10). Depois da trava, o item 1 já recusou a troca.
   */
  private async assertTrocaDeFormaSemLalur(
    scope: AccountingScope,
    ano: number,
    atual: Pick<CompanyFiscalProfile, 'regime' | 'formaApuracaoIrpjCsll'> | null,
    novo: Pick<CompanyFiscalProfileData, 'regime' | 'formaApuracaoIrpjCsll'> | null,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const formaLalur = (p: { regime: string; formaApuracaoIrpjCsll: string | null } | null) =>
      p && formaEfetiva(p.regime, p.formaApuracaoIrpjCsll) === 'ANUAL' ? 'ANUAL' : 'TRIMESTRAL';
    const antiga = formaLalur(atual);
    if (antiga === formaLalur(novo)) return;
    const periodos = antiga === 'ANUAL' ? ['A00', ...LALUR_MESES] : [...LALUR_QUARTERS];
    const achados = await this.lalurRepo.countByOwnerYearPeriods(scope.ownerUserId, ano, periodos, tx);
    if (achados.length > 0) {
      const lista = achados.map((a) => `${a.periodo} ${a.livro}: ${a.quantidade}`).join('; ');
      throw new ValidationError(
        `FORMA_COM_LALUR: ${ano} tem e-Lalur na forma ${antiga} (${lista}) — arquive as linhas e os movimentos e reabra os fechamentos antes de trocar a forma (X7 BRIEF B item 2).`,
      );
    }
  }

  /** PR-2 item 16 (F-XP-5 a): o operador informa o recibo da ECF transmitida no PVA; o regime do ano trava. */
  async marcarEcfTransmitida(scope: AccountingScope, ano: number, recibo: string): Promise<CompanyFiscalProfileView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const atual = await this.repo.findByYear(scope, ano, tx);
      if (!atual) throw new NotFoundError(`company_fiscal_profile_missing: sem perfil fiscal da empresa para ${ano}.`);
      // Retificadora = recibo novo; a trava mantém a data da PRIMEIRA transmissão.
      const row = await this.repo.setEcfTransmitida(scope, ano, recibo, atual.regimeTravadoEm ?? new Date(), tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: COMPANY_FISCAL_PROFILE_ECF_TRANSMITTED,
        targetType: 'company_fiscal_profile',
        targetId: row.id,
        payload: { anoCalendario: String(ano), ecfRecibo: recibo, regime: row.regime },
      });
      return toView(row);
    });
  }

  /** PR-2 item 12 — o que a geração SPED lê do perfil do ano (`null` = sem perfil; F-XP-1 c decide o que fazer). */
  async perfilParaGeracao(scope: AccountingScope, ano: number): Promise<PerfilParaPrefill | null> {
    this.assertRead(scope);
    const row = await this.repo.findByYear(scope, ano);
    if (!row) return null;
    const rep = row.representanteLegalSignerId ? await this.signerRepo.findById(scope, row.representanteLegalSignerId) : null;
    return {
      regime: row.regime as RegimeEmpresa,
      grandePorte: row.grandePorte,
      declarante: (row.declarante as Record<string, unknown> | null) ?? null,
      ecdIndNire: row.ecdIndNire,
      ecdNire: row.ecdNire,
      ecdNumOrd: row.ecdNumOrd,
      ecdNatLivr: row.ecdNatLivr,
      ecfIndAliqCsll: row.ecfIndAliqCsll,
      ecfIndRecReceita: row.ecfIndRecReceita,
      contadorContactId: row.contadorContactId,
      representante: rep ? { nome: rep.nome, cpf: rep.cpf, qualifEcd: rep.qualifEcd, qualifEcf: rep.qualifEcf, email: rep.email, fone: rep.fone } : null,
    };
  }

  /**
   * PR-2 item 14 (F-OBP-5 c; F-XP-6 a) — aviso, nunca bloqueio: ativo total (BP) e receita bruta (DRE) do escopo no fim
   * do exercício N-1, pelo mapeamento de demonstrativos já existente (`AccountingReportService`, reuso). Relatório
   * INVALID (mapeamento ausente/incompleto) ⇒ sem aviso. Limites declarados: o "conjunto sob controle comum" da lei não
   * é visível ao sistema, e o número é o da unidade do escopo, não a soma das filiais.
   */
  async avisoGrandePorte(scope: AccountingScope, ano: number): Promise<string | null> {
    const fimAnterior = new Date(Date.UTC(ano - 1, 11, 31, 23, 59, 59, 999));
    const [bp, dre] = await Promise.all([this.reportService.balanceSheet(scope, fimAnterior), this.reportService.incomeStatement(scope, fimAnterior)]);
    if (bp.reportStatus === 'INVALID' || dre.reportStatus === 'INVALID') return null;
    const ativo = Math.abs(Number(bp.assets.totalCents));
    const receita = Math.abs(Number(dre.grossRevenue.totalCents));
    if (ativo <= GRANDE_PORTE_ATIVO_CENTS && receita <= GRANDE_PORTE_RECEITA_CENTS) return null;
    const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return (
      `grande porte provável em ${ano - 1}: ativo total ${brl(ativo)}, receita bruta ${brl(receita)} ` +
      `(limites R$ 240 mi / R$ 300 mi, Lei 11.638/2007 art. 3º p.ú.) — o perfil de ${ano} não marca grande porte; confira o IND_GRANDE_PORTE.`
    );
  }

  async remove(scope: AccountingScope, ano: number): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      // Lacuna de spec L2 (registrada no relatório do PR-2): apagar um perfil TRAVADO e recriá-lo com outro regime
      // contornaria o item 16 — recusado pelo mesmo fundamento (IN RFB 2.004/2021 art. 7º §2º).
      const atual = await this.repo.findByYear(scope, ano, tx);
      if (atual?.regimeTravadoEm) {
        throw new ConflictError(`REGIME_TRAVADO: o perfil de ${ano} tem ECF transmitida e não pode ser excluído.`);
      }
      // X7 item 1 (D2, F-X7-5 a): apagar o perfil travado trocaria forma/regime/obrigatoriedade pela porta dos fundos.
      if (atual?.formaApuracaoTravadaEm) {
        throw new ValidationError(`FORMA_TRAVADA: o perfil de ${ano} tem apuração de IRPJ/CSLL confirmada e não pode ser excluído (ADR-INCR-TAX-ASSESSMENT D2).`);
      }
      // X7 Fase B PR-4 (item 2 + achado do review, decisão do dono 05/10): sem perfil o e-Lalur volta a TRIMESTRAL.
      await this.assertTrocaDeFormaSemLalur(scope, ano, atual, null, tx);
      const n = await this.repo.softDelete(scope, ano, tx);
      if (n === 0) throw new NotFoundError(`company_fiscal_profile_missing: sem perfil fiscal da empresa para ${ano}.`);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: COMPANY_FISCAL_PROFILE_DELETED,
        targetType: 'company_fiscal_profile',
        targetId: `${scope.ownerUserId}:${ano}`,
        payload: { anoCalendario: String(ano) },
      });
    });
  }

  /**
   * F-XP-2/3 → (a): copia o perfil de `anoAnterior` para `ano`. NÃO copia o nº de ordem do livro (muda todo ano,
   * BRIEF F-XP-3) nem o recibo/trava da ECF (estado do ano de origem, F-XP-5). Origem ausente → 404; destino já
   * existente → 409 (a cópia nunca sobrescreve — para editar use o PUT).
   */
  async copyFrom(scope: AccountingScope, ano: number, anoAnterior: number): Promise<CompanyFiscalProfileView> {
    this.assertManage(scope);
    return this.repo.runTransaction(async (tx) => {
      const origem = await this.repo.findByYear(scope, anoAnterior, tx);
      if (!origem) throw new NotFoundError(`company_fiscal_profile_missing: sem perfil fiscal da empresa para ${anoAnterior}.`);
      if (await this.repo.findByYear(scope, ano, tx)) {
        throw new ConflictError(`company_fiscal_profile_exists: já existe perfil fiscal da empresa para ${ano} — edite pelo PUT.`);
      }
      const data: CompanyFiscalProfileData = { ...rowToData(origem), ecdNumOrd: null };
      // X7 Fase B PR-4 (item 2 + achado do review, decisão do dono 05/10): o ano sem perfil é TRIMESTRAL no e-Lalur.
      await this.assertTrocaDeFormaSemLalur(scope, ano, null, data, tx);
      await this.assertRefs(scope, data, tx);
      const row = await this.repo.upsert(scope, ano, data, tx);
      await this.auditUpdated(tx, scope, row, anoAnterior);
      return toView(row);
    });
  }

  async obligations(scope: AccountingScope, ano: number): Promise<CompanyObligationsView> {
    this.assertRead(scope);
    const row = await this.repo.findByYear(scope, ano);
    if (!row) return { ano, perfil: 'AUSENTE', obrigacoes: [], avisos: [] };
    const view = toView(row);
    const contadorVivo = view.contadorContactId ? !!(await this.contactRepo.findById(scope, view.contadorContactId)) : false;
    const representanteVivo = view.representanteLegalSignerId ? !!(await this.signerRepo.findById(scope, view.representanteLegalSignerId)) : false;

    const obrigacoes = (await this.resolverObrigacoesEm(scopeToday(scope), { regime: view.regime, inativa: view.inativa, condicoes: view.condicoes })).map((o) => {
      const cobra = o.status === 'OBRIGATORIA' || o.status === 'CONDICIONAL';
      const faltantes: string[] = [];
      if (o.obrigacao === 'DCTFWEB') {
        // BRIEF X9 item 14: nunca herda condicoes.* nem DECLARANTE_ECF; cobra só o que o arquivo do MIT exige (itens 7–8),
        // e só em REAL/PRESUMIDO — no SIMPLES/MEI o X9 não gera arquivo (D10).
        // L-X9-1 (a, dono 07/10): inativa não tem apuração ⇒ o X9 não gera arquivo, nada a cobrar.
        if (cobra && !view.inativa && (view.regime === 'REAL' || view.regime === 'PRESUMIDO')) {
          if (view.declarante?.cnpj === undefined) faltantes.push('declarante.cnpj');
          if (!contadorVivo) faltantes.push('contadorContactId');
        }
      } else if (cobra && (o.obrigacao === 'ECD' || o.obrigacao === 'ECF')) {
        // X14 PR-3: PGDAS-D, DEFIS e DASN-SIMEI saem da apuração do Simples, não dos campos SPED do perfil — sem faltantes.
        if (o.status === 'CONDICIONAL') {
          for (const [k, v] of Object.entries(view.condicoes)) if (v === null) faltantes.push(`condicoes.${k}`);
        }
        const dec = view.declarante ?? {};
        for (const k of o.obrigacao === 'ECD' ? DECLARANTE_ECD : DECLARANTE_ECF) if (dec[k] === undefined) faltantes.push(`declarante.${k}`);
        if (o.obrigacao === 'ECD') {
          if (view.grandePorte === null) faltantes.push('grandePorte');
          if (!view.ecd) faltantes.push('ecd.indNire', 'ecd.numOrd', 'ecd.natLivr');
          else {
            if (!view.ecd.numOrd) faltantes.push('ecd.numOrd');
            if (!view.ecd.natLivr) faltantes.push('ecd.natLivr');
            if (view.ecd.indNire === '1' && !view.ecd.nire) faltantes.push('ecd.nire');
          }
          // J930: exatamente 1 responsável legal + ao menos 1 contador (SpedEcdDto superRefine, REGRA_OBRIGATORIO_ASSIN_CONTADOR)
          if (!representanteVivo) faltantes.push('representanteLegalSignerId');
          if (!contadorVivo) faltantes.push('contadorContactId');
        } else {
          if (!view.ecf?.indAliqCsll) faltantes.push('ecf.indAliqCsll');
          if (!view.ecf?.indRecReceita) faltantes.push('ecf.indRecReceita');
          // 0930: ao menos 1 signatário (SpedEcfDto) — o manual não obriga contador aqui
          if (!representanteVivo && !contadorVivo) faltantes.push('representanteLegalSignerId');
        }
      }
      return { ...o, faltantes };
    });
    const completo = obrigacoes.every((o) => o.faltantes.length === 0);
    return { ano, perfil: completo ? 'COMPLETO' : 'INCOMPLETO', regime: view.regime, obrigacoes, avisos: [] };
  }

  private async assertRefs(scope: AccountingScope, data: CompanyFiscalProfileData, tx: Prisma.TransactionClient): Promise<void> {
    if (data.contadorContactId && !(await this.contactRepo.findById(scope, data.contadorContactId, tx))) {
      throw new NotFoundError(`Contador '${data.contadorContactId}' não encontrado neste escopo.`);
    }
    if (data.representanteLegalSignerId && !(await this.signerRepo.findById(scope, data.representanteLegalSignerId, tx))) {
      throw new NotFoundError(`Signatário '${data.representanteLegalSignerId}' não encontrado.`);
    }
  }

  private async auditUpdated(tx: Prisma.TransactionClient, scope: AccountingScope, row: CompanyFiscalProfile, copiadoDe?: number): Promise<void> {
    const b = (v: boolean | null) => (v === null ? '' : String(v));
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType: COMPANY_FISCAL_PROFILE_UPDATED,
      targetType: 'company_fiscal_profile',
      targetId: row.id,
      payload: {
        anoCalendario: String(row.anoCalendario),
        regime: row.regime,
        grandePorte: b(row.grandePorte),
        inativa: String(row.inativa),
        aporteInvestidorAnjo: b(row.aporteInvestidorAnjo),
        livroCaixaSemEscrituracao: b(row.livroCaixaSemEscrituracao),
        distribuicaoAcimaBase: b(row.distribuicaoAcimaBase),
        ecdIndNire: row.ecdIndNire ?? '',
        ecfIndAliqCsll: row.ecfIndAliqCsll ?? '',
        ecfIndRecReceita: row.ecfIndRecReceita ?? '',
        contadorContactId: row.contadorContactId ?? '',
        representanteLegalSignerId: row.representanteLegalSignerId ?? '',
        // X7 itens 1 e 2b — a referência da liminar (texto livre) e as datas de atividade ficam FORA do evento
        formaApuracaoIrpjCsll: row.formaApuracaoIrpjCsll ?? '',
        formaApuracaoTravadaEm: row.formaApuracaoTravadaEm ? row.formaApuracaoTravadaEm.toISOString() : '',
        lucroRealObrigatorio: b(row.lucroRealObrigatorio),
        lc224AcrescimoSuspenso: String(row.lc224AcrescimoSuspenso),
        prestadoraExclusivaServicos: String(row.prestadoraExclusivaServicos), // X7 Fase B item 3b
        declaraNaoProfissaoRegulamentada: String(row.declaraNaoProfissaoRegulamentada), // PRESUMIDO-16 (F-P16-1 a)
        ibsCbsOpcaoS1: row.ibsCbsOpcaoS1 ?? '', // X14 PR-2 item 14 (enum)
        ibsCbsOpcaoS2: row.ibsCbsOpcaoS2 ?? '',
        meiContribuinteIcms: b(row.meiContribuinteIcms), // X14 PR-4 item 25
        meiContribuinteIss: b(row.meiContribuinteIss),
        ...(copiadoDe === undefined ? {} : { copiadoDe: String(copiadoDe) }),
      },
    });
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ler o perfil fiscal da empresa.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para alterar o perfil fiscal da empresa.');
  }
}

/**
 * X14 PR-2 item 14 (F-SN-11 → a) — IBS e CBS entram no DAS da competência? Antes de 2027 não existem; a partir daí,
 * sim, salvo opção REGULAR no semestre (LC 123 art. 13 §§ 9º–10, red. LC 214). Lido pela apuração (PR-3).
 */
export function ibsCbsNoDas(perfil: { ibsCbsOpcaoS1: string | null; ibsCbsOpcaoS2: string | null } | null, competencia: string): boolean {
  if (competencia < '2027-01') return false;
  const opcao = Number(competencia.slice(5, 7)) <= 6 ? perfil?.ibsCbsOpcaoS1 : perfil?.ibsCbsOpcaoS2;
  return opcao !== 'REGULAR';
}

/**
 * ADR D1: REAL com a forma nula ⇒ TRIMESTRAL efetivo; PRESUMIDO só é trimestral. Usado pela trava (null ×
 * 'TRIMESTRAL' nesses regimes não é troca).
 */
export function formaEfetiva(regime: string, forma: string | null): string | null {
  return forma ?? (regime === 'REAL' || regime === 'PRESUMIDO' ? 'TRIMESTRAL' : null);
}

/**
 * X7 item 1 (D2, F-X7-5 a): com `formaApuracaoTravadaEm` preenchido, o PUT não troca forma, regime nem
 * obrigatoriedade do Real — as apurações confirmadas copiam o regime (item 12). A chave da liminar (item 2b) e as
 * demais colunas seguem editáveis. Fase B item 3b (F-TB-5 b): `prestadoraExclusivaServicos` também trava — os meses
 * confirmados copiam a premissa do 16%, mesma razão do `regime`. Fase B PR-3 (achado 1 do review independente; decisão
 * do dono 05/10): as datas de atividade também travam — mudá-las cria ou some com períodos em atividade depois de
 * confirmações (ex.: antecipar o início e confirmar o A10 com A11, A12 e o A00 já confirmados, sem o A00 contá-lo).
 */
function assertFormaNaoTravada(atual: CompanyFiscalProfile, data: CompanyFiscalProfileData, ano: number): void {
  if (!atual.formaApuracaoTravadaEm) return;
  const trocou: string[] = [];
  if (atual.regime !== data.regime) trocou.push('regime');
  if (formaEfetiva(atual.regime, atual.formaApuracaoIrpjCsll) !== formaEfetiva(data.regime, data.formaApuracaoIrpjCsll)) trocou.push('formaApuracaoIrpjCsll');
  if (atual.lucroRealObrigatorio !== data.lucroRealObrigatorio) trocou.push('lucroRealObrigatorio');
  if (atual.prestadoraExclusivaServicos !== data.prestadoraExclusivaServicos) trocou.push('prestadoraExclusivaServicos');
  // PRESUMIDO-16 (F-P16-1 a): a confirmação é condição do 16% já confirmado — trava junto com a flag (review independente).
  if (atual.declaraNaoProfissaoRegulamentada !== data.declaraNaoProfissaoRegulamentada) trocou.push('declaraNaoProfissaoRegulamentada');
  if (atual.inicioAtividadeEm !== data.inicioAtividadeEm) trocou.push('inicioAtividadeEm');
  if (atual.encerramentoAtividadeEm !== data.encerramentoAtividadeEm) trocou.push('encerramentoAtividadeEm');
  if (trocou.length > 0) {
    throw new ValidationError(
      `FORMA_TRAVADA: ${ano} tem apuração de IRPJ/CSLL confirmada desde ${atual.formaApuracaoTravadaEm.toISOString().slice(0, 10)} — ${trocou.join(', ')} não muda(m) no ano (ADR-INCR-TAX-ASSESSMENT D2; IN RFB 1.700/2017 art. 54).`,
    );
  }
}

function toData(input: UpsertCompanyFiscalProfileInput): CompanyFiscalProfileData {
  return {
    regime: input.regime,
    grandePorte: input.grandePorte,
    inativa: input.inativa,
    aporteInvestidorAnjo: input.condicoes.aporteInvestidorAnjo,
    livroCaixaSemEscrituracao: input.condicoes.livroCaixaSemEscrituracao,
    distribuicaoAcimaBase: input.condicoes.distribuicaoAcimaBase,
    declarante: input.declarante ? (input.declarante as Prisma.InputJsonValue) : Prisma.DbNull,
    ecdIndNire: input.ecd?.indNire ?? null,
    ecdNire: input.ecd?.nire ?? null,
    ecdNumOrd: input.ecd?.numOrd ?? null,
    ecdNatLivr: input.ecd?.natLivr ?? null,
    ecfIndAliqCsll: input.ecf?.indAliqCsll ?? null,
    ecfIndRecReceita: input.ecf?.indRecReceita ?? null,
    contadorContactId: input.contadorContactId ?? null,
    representanteLegalSignerId: input.representanteLegalSignerId ?? null,
    formaApuracaoIrpjCsll: input.formaApuracaoIrpjCsll,
    lucroRealObrigatorio: input.lucroRealObrigatorio,
    inicioAtividadeEm: input.inicioAtividadeEm,
    encerramentoAtividadeEm: input.encerramentoAtividadeEm,
    lc224AcrescimoSuspenso: input.lc224AcrescimoSuspenso,
    lc224LiminarReferencia: input.lc224LiminarReferencia,
    prestadoraExclusivaServicos: input.prestadoraExclusivaServicos,
    declaraNaoProfissaoRegulamentada: input.declaraNaoProfissaoRegulamentada,
    ibsCbsOpcaoS1: input.ibsCbsOpcaoS1,
    ibsCbsOpcaoS2: input.ibsCbsOpcaoS2,
    meiContribuinteIcms: input.meiContribuinteIcms,
    meiContribuinteIss: input.meiContribuinteIss,
  };
}

function rowToData(row: CompanyFiscalProfile): CompanyFiscalProfileData {
  return {
    regime: row.regime,
    grandePorte: row.grandePorte,
    inativa: row.inativa,
    aporteInvestidorAnjo: row.aporteInvestidorAnjo,
    livroCaixaSemEscrituracao: row.livroCaixaSemEscrituracao,
    distribuicaoAcimaBase: row.distribuicaoAcimaBase,
    declarante: row.declarante === null ? Prisma.DbNull : (row.declarante as Prisma.InputJsonValue),
    ecdIndNire: row.ecdIndNire,
    ecdNire: row.ecdNire,
    ecdNumOrd: row.ecdNumOrd,
    ecdNatLivr: row.ecdNatLivr,
    ecfIndAliqCsll: row.ecfIndAliqCsll,
    ecfIndRecReceita: row.ecfIndRecReceita,
    contadorContactId: row.contadorContactId,
    representanteLegalSignerId: row.representanteLegalSignerId,
    formaApuracaoIrpjCsll: row.formaApuracaoIrpjCsll,
    lucroRealObrigatorio: row.lucroRealObrigatorio,
    inicioAtividadeEm: row.inicioAtividadeEm,
    encerramentoAtividadeEm: row.encerramentoAtividadeEm,
    lc224AcrescimoSuspenso: row.lc224AcrescimoSuspenso,
    lc224LiminarReferencia: row.lc224LiminarReferencia,
    prestadoraExclusivaServicos: row.prestadoraExclusivaServicos,
    declaraNaoProfissaoRegulamentada: row.declaraNaoProfissaoRegulamentada,
    ibsCbsOpcaoS1: row.ibsCbsOpcaoS1,
    ibsCbsOpcaoS2: row.ibsCbsOpcaoS2,
    meiContribuinteIcms: row.meiContribuinteIcms,
    meiContribuinteIss: row.meiContribuinteIss,
  };
}

function toView(row: CompanyFiscalProfile): CompanyFiscalProfileView {
  return {
    ano: row.anoCalendario,
    regime: row.regime as RegimeEmpresa,
    grandePorte: row.grandePorte,
    inativa: row.inativa,
    condicoes: {
      aporteInvestidorAnjo: row.aporteInvestidorAnjo,
      livroCaixaSemEscrituracao: row.livroCaixaSemEscrituracao,
      distribuicaoAcimaBase: row.distribuicaoAcimaBase,
    },
    declarante: (row.declarante as CompanyDeclarante | null) ?? null,
    ecd: row.ecdIndNire ? { indNire: row.ecdIndNire, nire: row.ecdNire, numOrd: row.ecdNumOrd, natLivr: row.ecdNatLivr } : null,
    ecf: row.ecfIndAliqCsll || row.ecfIndRecReceita ? { indAliqCsll: row.ecfIndAliqCsll, indRecReceita: row.ecfIndRecReceita } : null,
    contadorContactId: row.contadorContactId,
    representanteLegalSignerId: row.representanteLegalSignerId,
    ecfRecibo: row.ecfRecibo,
    regimeTravadoEm: row.regimeTravadoEm ? row.regimeTravadoEm.toISOString() : null,
    formaApuracaoIrpjCsll: row.formaApuracaoIrpjCsll,
    formaApuracaoTravadaEm: row.formaApuracaoTravadaEm ? row.formaApuracaoTravadaEm.toISOString() : null,
    lucroRealObrigatorio: row.lucroRealObrigatorio,
    inicioAtividadeEm: row.inicioAtividadeEm,
    encerramentoAtividadeEm: row.encerramentoAtividadeEm,
    lc224AcrescimoSuspenso: row.lc224AcrescimoSuspenso,
    lc224LiminarReferencia: row.lc224LiminarReferencia,
    prestadoraExclusivaServicos: row.prestadoraExclusivaServicos,
    declaraNaoProfissaoRegulamentada: row.declaraNaoProfissaoRegulamentada,
    ibsCbsOpcaoS1: row.ibsCbsOpcaoS1 as IbsCbsOpcao | null,
    ibsCbsOpcaoS2: row.ibsCbsOpcaoS2 as IbsCbsOpcao | null,
    meiContribuinteIcms: row.meiContribuinteIcms,
    meiContribuinteIss: row.meiContribuinteIss,
    updatedAt: row.updatedAt.toISOString(),
  };
}
