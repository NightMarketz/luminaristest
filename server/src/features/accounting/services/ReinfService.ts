import type { CompanyFiscalProfile, ReinfBatch } from 'generated/prisma';
import { ForbiddenError, NotFoundError, ReinfNadaAGerarError, ValidationError } from '../../../lib/errors';
import { isValidCnpj } from '../../../lib/cnpj';
import { createHash } from 'node:crypto';
import { prazoReinfIsentos, prazoReinfMensal } from '../../../lib/prazoReinf';
import {
  buildR1000,
  buildR2010,
  buildR2099,
  buildR4010,
  buildR4020,
  buildR4099,
  cnpjRaiz,
  conteudoSha256R1000,
  ReinfLimiteXsdError,
  serializeLote,
  tpAmbReinf,
  type CabecalhoEvento,
  type ContribuinteR1000,
  type EventoGerado,
  type RespInf,
} from '../../../lib/reinf';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type { AccountingScope } from '../scope/AccountingScope';
import { resolveAccountingScopeInternal } from '../scope/resolveAccountingScopeInternal';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IReinfBatchRepository } from '../repositories/IReinfBatchRepository';
import type { ITaxWithholdingReadPort } from '../repositories/ITaxWithholdingRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IAccountingContactRepository } from '../repositories/IAccountingContactRepository';
import type { AuditService } from './AuditService';
import type { WithholdingService } from './WithholdingService';
import { scopeDay } from '../models/dates';
import { matrizObrigacoesDe, resolverObrigacoes } from '../models/obrigacoesPorRegime';
import type { RegimeEmpresa } from '../models/regimeEmpresa';
import {
  dividendoParaReinf,
  AVISO_NATUREZA_NAO_CONFERIDA,
  jcpParaReinf,
  juntarBeneficiariosPJ,
  montarR2010,
  montarR4010,
  montarR4020,
  r4010SoIsentos,
  totaisPorCodigo,
  type DividendoParaReinf,
  type JcpParaReinf,
} from '../models/reinfLote';
import type { IProfitDistributionRepository } from '../repositories/IProfitDistributionRepository';
import type { IInterestOnEquityRepository } from '../repositories/IInterestOnEquityRepository';
import type { IPartnerRepository } from '../repositories/IPartnerRepository';
import type { IDataExchangeRepository } from '../repositories/IDataExchangeRepository';
import type { ReinfAviso, ReinfBatchCreated, ReinfBatchEvento, ReinfBatchListQuery, ReinfBatchRequest, ReinfBatchView, ReinfRelatorio } from '../dtos/ReinfDto';

export const REINF_BATCH_GENERATED = 'tax.reinf_batch.generated';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VER_PROC = `LUMINARIS-${(require('../../../../package.json') as { version: string }).version}`.slice(0, 20);

/**
 * PR-2 (E4, BRIEF §5.1) — leitura só dos dividendos e JCP `POSTED` do IRRF-DISTRIBUICAO, pelas interfaces de repositório que
 * já existem (nenhum nó vizinho muda).
 */
export interface ReinfDistribuicoesLeitura {
  dividendos: Pick<IProfitDistributionRepository, 'listDaCompetencia'>;
  jcp: Pick<IInterestOnEquityRepository, 'listDaCompetencia' | 'findById'>;
  socios: Pick<IPartnerRepository, 'list'>;
}

/**
 * PR-3 (item 22; lacuna A, dono 28/10) — onde o lote vira artefato do pacote do contador: 2 jobs de export (molde do
 * `EXPORT_SPED_ECD`, criado pelo serviço dedicado) e o disco do `attachmentStorage` (a factory injeta o `saveFile`).
 */
export interface ReinfArtefatos {
  jobs: Pick<IDataExchangeRepository, 'createJob' | 'updateJob'>;
  salvar: (ownerUserId: string, unitId: string, jobId: string, fileName: string, buffer: Buffer) => Promise<{ storageKey: string }>;
}

/**
 * BE-INCR-EFD-REINF PR-1 (nó EFD-REINF; BRIEF itens 4, 7, 8, 10, 11, 13, 14) — gera o lote da EFD-Reinf de uma competência
 * (R-1000 quando preciso → R-4020 por fornecedor → R-4099 de fechamento) a partir das retenções FEITAS do RETENCOES-FONTE,
 * lidas pela porta de backend da PJ inteira (`findMadeForReinfDaPj`, lacuna A, dono 26/10), e registra o `ReinfBatch` (hash +
 * ids de origem, sem XML nem CPF/CNPJ). Nada é lançado no razão; nada é transmitido (PR-4).
 * PR-2 (itens 15–18): + R-2010 por prestador (INSS) e R-2099; + R-4010 por CPF (dividendos e JCP do IRRF-DISTRIBUICAO) e o
 * JCP a sócio PJ no R-4020; dividendo/JCP `POSTED` também é fato (item 8).
 *
 * Recusas, na ordem: competência futura (400) → perfil do ano ausente (400) → sem fato (422 `REINF_SEM_FATO`, item 8 — Simples
 * e MEI também chegam aqui) → CNPJ do fornecedor / natureza (400, `montarR4020`) → nada que este PR gere (422) → cadastro do
 * R-1000 incompleto (400: CNPJ do declarante, contato com CPF, `classTrib` do Simples, ECD indefinida) → limites do XSD (400).
 * O registro e o evento de auditoria vão numa tx só (molde X9: o `AuditService.append` exige a tx da mutação).
 */
export class ReinfService {
  constructor(
    private readonly repo: IReinfBatchRepository,
    private readonly withholdings: Pick<ITaxWithholdingReadPort, 'findMadeForReinfDaPj'>,
    /** Pacote de lacunas (dono 26/10, ponto 2): o vencimento do DARF sai do resumo D8 de cada unidade. */
    private readonly withholdingService: Pick<WithholdingService, 'resumo'>,
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly contactRepo: Pick<IAccountingContactRepository, 'findById'>,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly distribuicoes: ReinfDistribuicoesLeitura,
    private readonly artefatos: ReinfArtefatos,
    private readonly env: Readonly<Record<string, string | undefined>> = process.env,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  /** Itens 10–11 — POST /api/accounting/reinf/batches. */
  async gerar(scope: AccountingScope, input: ReinfBatchRequest): Promise<ReinfBatchCreated> {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para gerar a EFD-Reinf.');
    const { competencia } = input;
    const agora = this.agora();
    if (competencia > scopeDay(scope, agora).slice(0, 7)) {
      throw new ValidationError('A competência da Reinf não pode ser maior que o mês corrente (perApur, leiaute 2.1.2b).', { competencia }, 'REINF_COMPETENCIA_FUTURA');
    }
    const ano = Number(competencia.slice(0, 4));
    const perfil = await this.companyProfileRepo.findByYear(scope, ano);
    if (!perfil) throw new ValidationError(`Cadastre o perfil fiscal de ${ano} antes de gerar a EFD-Reinf.`);

    const tabelas = await this.legalParams.fotografia(['NATUREZA_RENDIMENTO', 'RETENCAO_CODIGO', 'RETENCAO', 'FERIADO_NACIONAL', 'OBRIGACAO_REGIME']);
    const linhas = await this.withholdings.findMadeForReinfDaPj(scope.ownerUserId, competencia);
    const vencimentos = await this.vencimentosDarf(scope.ownerUserId, competencia, [...new Set(linhas.map((l) => l.unitId))]);
    const socios = await this.fatosDeSocios(scope, competencia);
    const montagem = montarR4020(linhas, tabelas, vencimentos);
    if (!montagem.temFato && socios.dividendos.length === 0 && socios.jcps.length === 0) {
      throw new ReinfNadaAGerarError(`Nenhuma retenção na fonte nem distribuição a sócio em ${competencia}: a EFD-Reinf é dispensada sem fato (IN RFB 2.043 art. 4º).`, 'REINF_SEM_FATO');
    }
    const mR4010 = montarR4010(socios.dividendos, socios.jcps, tabelas);
    const mR2010 = montarR2010(linhas);
    const beneficiariosPJ = juntarBeneficiariosPJ(montagem.beneficiarios, mR4010.beneficiariosPJ);
    const avisos = [...montagem.avisos, ...mR4010.avisos];

    const anteriores = await this.repo.findByOwner(scope.ownerUserId);
    const contribuinte = await this.contribuinte(scope, perfil, competencia, tabelas);
    const r1000 = decidirR1000(contribuinte, competencia, anteriores);
    const temR4000 = beneficiariosPJ.length > 0 || mR4010.beneficiariosPF.length > 0;
    if (!temR4000 && mR2010.prestadores.length === 0 && !r1000) {
      throw new ReinfNadaAGerarError(`Nada que esta versão gere em ${competencia}: ${avisos.map((a) => `${a.codigo}: ${a.detalhe}`).join(' ')}`, 'REINF_SEM_EVENTO_GERAVEL');
    }

    const tpAmb = tpAmbReinf(this.env);
    const agoraId = agoraAAAAMMDDHHMMSS(agora, scope.timeZone);
    let seq = 0;
    const h = (): CabecalhoEvento => ({ tpAmb, verProc: VER_PROC, agora: agoraId, seq: ++seq });
    const estab = (perfil.declarante as { cnpj: string }).cnpj;
    // Item 21 (lacuna B, dono 28/10): prazo por evento periódico; trimestral só no R-4010 inteiramente de isenção 12.
    const prazo = prazoReinfMensal(competencia, tabelas);
    const prazoIsentos = prazoReinfIsentos(competencia, tabelas);
    const eventos: { gerado: EventoGerado; registro: ReinfBatchEvento }[] = [];
    try {
      if (r1000) {
        const g = buildR1000(h(), contribuinte, r1000, competencia);
        eventos.push({ gerado: g, registro: { tipo: g.tipo, idEvento: g.id, sha256: g.sha256, origemIds: [], conteudoSha256: conteudoSha256R1000(contribuinte) } });
      }
      // Ordem do lote (item 10): R-1000 → periódicos (R-2010, R-4010, R-4020) → fechamentos (R-2099, R-4099).
      for (const p of mR2010.prestadores) {
        const g = buildR2010(h(), contribuinte, estab, p, competencia);
        eventos.push({ gerado: g, registro: { tipo: g.tipo, idEvento: g.id, sha256: g.sha256, origemIds: p.nfs.flatMap((nf) => nf.origemIds), beneficiarioRef: p.ref, prazo } });
      }
      for (const b of mR4010.beneficiariosPF) {
        const g = buildR4010(h(), contribuinte, estab, b, competencia);
        const origemIds = Object.values(b.porNatureza).flatMap((ps) => ps.flatMap((p) => p.origemIds));
        eventos.push({ gerado: g, registro: { tipo: g.tipo, idEvento: g.id, sha256: g.sha256, origemIds, beneficiarioRef: b.ref, prazo: r4010SoIsentos(b) ? prazoIsentos : prazo } });
      }
      for (const b of beneficiariosPJ) {
        const g = buildR4020(h(), contribuinte, estab, b, competencia);
        const origemIds = Object.values(b.porNatureza).flatMap((ps) => ps.flatMap((p) => p.origemIds));
        eventos.push({ gerado: g, registro: { tipo: g.tipo, idEvento: g.id, sha256: g.sha256, origemIds, beneficiarioRef: b.ref, prazo } });
      }
      if (mR2010.prestadores.length > 0) {
        const g = buildR2099(h(), contribuinte, competencia, { servTomados: true }, this.respInf(contribuinte));
        eventos.push({ gerado: g, registro: { tipo: g.tipo, idEvento: g.id, sha256: g.sha256, origemIds: [] } });
      }
      if (temR4000) {
        const g = buildR4099(h(), contribuinte, competencia, 'FECHAMENTO', this.respInf(contribuinte));
        eventos.push({ gerado: g, registro: { tipo: g.tipo, idEvento: g.id, sha256: g.sha256, origemIds: [] } });
      }
    } catch (e) {
      if (e instanceof ReinfLimiteXsdError) throw new ValidationError(e.message, { ref: e.ref }, e.code);
      throw e;
    }
    let lote: { xml: string; sha256: string };
    try {
      lote = serializeLote(contribuinte.cnpjRaiz, eventos.map((e) => e.gerado));
    } catch (e) {
      if (e instanceof ReinfLimiteXsdError) throw new ValidationError(e.message, { ref: e.ref }, e.code);
      throw e;
    }

    const ativos = new Set([...linhas.map((l) => l.id), ...socios.dividendos.map((d) => d.id), ...socios.jcps.map((j) => j.id)]);
    const linhasRelatorio = [...mR2010.relatorio, ...mR4010.relatorio.filter((r) => r.evento === 'R-4010'), ...montagem.relatorio, ...mR4010.relatorio.filter((r) => r.evento === 'R-4020')];
    const marc = marcacoes(anteriores.filter((a) => a.competencia === competencia), ativos);
    const relatorio = montarRelatorio(
      competencia,
      prazoDoLote(eventos.map((e) => e.registro), prazo),
      linhasRelatorio.map(({ trimestral, ...l }) => ({ ...l, prazoReinf: trimestral ? prazoIsentos : prazo })),
      [...avisos, ...avisosDoPr3(montagem.linhasR4020, marc)],
      marc,
    );

    // Item 22 (lacuna A, dono 28/10): o XML e o CSV viram 2 jobs de export ANTES do registro do lote (A1: o job nasce PROCESSING e
    // só vira EXPORTED, na tx do lote, depois que o arquivo existe). Falha de disco ⇒ job FAILED e nenhum lote gravado.
    const jobXml = await this.salvarArtefato(scope, 'EXPORT_REINF', `efd_reinf_${competencia}.xml`, 'application/xml', Buffer.from(lote.xml, 'utf8'), competencia, eventos.length);
    const jobCsv = await this.salvarArtefato(scope, 'EXPORT_REINF_RELATORIO', `efd_reinf_${competencia}_relatorio.csv`, 'text/csv', Buffer.from(relatorio.csv, 'utf8'), competencia, relatorio.linhas.length);

    const row = await this.repo.runTransaction(async (tx) => {
      const criado = await this.repo.create(
        { userId: scope.ownerUserId, competencia, tpAmb, eventos: eventos.map((e) => e.registro), sha256: lote.sha256, geradoPorId: scope.actorUserId },
        tx,
      );
      const contagem: Record<string, number> = {};
      for (const e of eventos) contagem[e.registro.tipo] = (contagem[e.registro.tipo] ?? 0) + 1;
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: REINF_BATCH_GENERATED,
        targetType: 'reinf_batch',
        targetId: criado.id,
        payload: { batchId: criado.id, competencia, sha256: lote.sha256, contagemPorTipo: JSON.stringify(contagem) },
      });
      for (const j of [jobXml, jobCsv]) {
        await this.artefatos.jobs.updateJob(scope, j.id, { storageKey: j.storageKey, status: 'EXPORTED' }, tx);
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: 'data_exchange.export_generated',
          targetType: 'data_exchange_job',
          targetId: j.id,
          payload: { jobId: j.id, kind: j.kind, direction: 'EXPORT', sha256: j.sha256, totalRows: String(j.linhas), validRows: String(j.linhas), invalidRows: '0' },
        });
      }
      return criado;
    });

    return { batchId: row.id, sha256: lote.sha256, xml: lote.xml, relatorio, exportJobIds: { xml: jobXml.id, relatorio: jobCsv.id } };
  }

  /** Item 22 — cria o job PROCESSING e grava o arquivo; disco falhou ⇒ FAILED e o erro sobe (molde `DataExchangeExportService.export`). */
  private async salvarArtefato(
    scope: AccountingScope,
    kind: 'EXPORT_REINF' | 'EXPORT_REINF_RELATORIO',
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    competencia: string,
    linhas: number,
  ): Promise<{ id: string; kind: string; sha256: string; storageKey: string; linhas: number }> {
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const [ano, mes] = competencia.split('-').map(Number);
    const job = await this.artefatos.jobs.createJob({
      userId: scope.ownerUserId,
      unitId: scope.unitId,
      direction: 'EXPORT',
      kind,
      status: 'PROCESSING',
      requestedById: scope.actorUserId,
      periodStart: new Date(Date.UTC(ano, mes - 1, 1)),
      periodEnd: new Date(Date.UTC(ano, mes, 0)),
      originalName: fileName,
      mimeType,
      sizeBytes: buffer.length,
      sha256,
      totalRows: linhas,
    });
    try {
      const { storageKey } = await this.artefatos.salvar(scope.ownerUserId, scope.unitId, job.id, fileName, buffer);
      return { id: job.id, kind, sha256, storageKey, linhas };
    } catch (e) {
      await this.artefatos.jobs.updateJob(scope, job.id, { status: 'FAILED' });
      throw e;
    }
  }

  /** Itens 11 e 13 — GET /api/accounting/reinf/batches?competencia=, com `defasado` calculado na leitura. */
  async list(scope: AccountingScope, query: ReinfBatchListQuery): Promise<ReinfBatchView[]> {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler os lotes da EFD-Reinf.');
    const rows = await this.repo.findByCompetencia(scope.ownerUserId, query.competencia);
    if (rows.length === 0) return [];
    const [ativos, prazo] = await this.ativosEPrazo(scope, query.competencia);
    return rows.map((r) => toView(r, ativos, prazo));
  }

  /** Item 11 — GET /api/accounting/reinf/batches/:id (sem o XML). */
  async get(scope: AccountingScope, id: string): Promise<ReinfBatchView> {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler os lotes da EFD-Reinf.');
    const row = await this.repo.findById(scope.ownerUserId, id);
    if (!row) throw new NotFoundError('Lote da EFD-Reinf não encontrado.');
    const [ativos, prazo] = await this.ativosEPrazo(scope, row.competencia);
    return toView(row, ativos, prazo);
  }

  private async ativosEPrazo(scope: AccountingScope, competencia: string): Promise<[Set<string>, string]> {
    const linhas = await this.withholdings.findMadeForReinfDaPj(scope.ownerUserId, competencia);
    const socios = await this.fatosDeSocios(scope, competencia);
    const ativos = new Set([...linhas.map((l) => l.id), ...socios.dividendos.map((d) => d.id), ...socios.jcps.map((j) => j.id)]);
    return [ativos, prazoReinfMensal(competencia, await this.legalParams.fotografia(['FERIADO_NACIONAL']))];
  }

  /** PR-2 (itens 15–16; E4) — dividendos e alocações de JCP `POSTED` da competência na PJ inteira, no contrato da Reinf. */
  private async fatosDeSocios(scope: AccountingScope, competencia: string): Promise<{ dividendos: DividendoParaReinf[]; jcps: JcpParaReinf[] }> {
    const owner = scope.ownerUserId;
    const dividendos = (await this.distribuicoes.dividendos.listDaCompetencia(owner, competencia, ['POSTED'])).map(dividendoParaReinf);
    const calculos = await this.distribuicoes.jcp.listDaCompetencia(owner, competencia, ['POSTED']);
    if (calculos.length === 0) return { dividendos, jcps: [] };
    const socios = new Map((await this.distribuicoes.socios.list(scope)).map((s) => [s.id, s]));
    const jcps: JcpParaReinf[] = [];
    for (const c of calculos) {
      const comAlocacoes = await this.distribuicoes.jcp.findById(owner, c.id);
      for (const a of comAlocacoes?.alocacoes ?? []) jcps.push(jcpParaReinf(c, a, socios));
    }
    return { dividendos, jcps };
  }

  /** O vencimento de cada título de imposto, do resumo D8 de cada unidade com retenção (`dueDate` do título). */
  private async vencimentosDarf(ownerUserId: string, competencia: string, unitIds: readonly string[]): Promise<Map<string, string>> {
    const m = new Map<string, string>();
    for (const unitId of unitIds) {
      const resumo = await this.withholdingService.resumo(resolveAccountingScopeInternal({ userId: ownerUserId }, unitId), competencia);
      for (const f of resumo.feitas) if (f.taxPayableId && f.vencimento) m.set(f.taxPayableId, f.vencimento);
    }
    return m;
  }

  /**
   * Item 4 — o cadastro do R-1000. `classTrib` (Tabela 08): MEI 04, Presumido/Real 99, Simples = `reinfClassTrib` do perfil
   * (lacuna B). `indEscrituracao` (lacuna C, pacote A): 1 só com ECD OBRIGATORIA na matriz; CONDICIONAL ⇒ 400.
   * `contato` = o contador do perfil (`AccountingContact`), com CPF.
   */
  private async contribuinte(scope: AccountingScope, perfil: CompanyFiscalProfile, competencia: string, tabelas: Awaited<ReturnType<LegalParameterService['fotografia']>>): Promise<ContribuinteR1000> {
    const cnpj = (perfil.declarante as { cnpj?: unknown } | null)?.cnpj;
    if (typeof cnpj !== 'string' || !isValidCnpj(cnpj)) {
      throw new ValidationError(`Informe o CNPJ do declarante no perfil fiscal de ${perfil.anoCalendario}.`, null, 'REINF_SEM_CNPJ_DECLARANTE');
    }
    const contador = perfil.contadorContactId ? await this.contactRepo.findById(scope, perfil.contadorContactId) : null;
    if (!contador?.cpf) {
      throw new ValidationError(`Indique no perfil fiscal de ${perfil.anoCalendario} o contador com CPF: ele é o contato do R-1000.`, null, 'REINF_SEM_CONTATO');
    }
    const regime = perfil.regime as RegimeEmpresa;
    const classTrib = regime === 'MEI' ? '04' : regime === 'SIMPLES' ? perfil.reinfClassTrib : '99';
    if (!classTrib) {
      throw new ValidationError(
        `Informe no perfil fiscal de ${perfil.anoCalendario} a classificação tributária do Simples na Reinf (01, 02 ou 03, conforme a CPP — confirme com o contador).`,
        null,
        'REINF_CLASSTRIB_PENDENTE',
      );
    }
    const [ecd] = resolverObrigacoes(
      {
        regime,
        inativa: perfil.inativa,
        condicoes: { aporteInvestidorAnjo: perfil.aporteInvestidorAnjo, livroCaixaSemEscrituracao: perfil.livroCaixaSemEscrituracao, distribuicaoAcimaBase: perfil.distribuicaoAcimaBase },
      },
      matrizObrigacoesDe(tabelas, `${competencia}-01`),
    ).filter((o) => o.obrigacao === 'ECD');
    if (ecd?.status === 'CONDICIONAL') {
      throw new ValidationError(
        `Responda no perfil fiscal de ${perfil.anoCalendario} se a empresa é obrigada à ECD: o R-1000 informa isso (indEscrituracao). ${ecd.perguntaPendente ?? ''}`.trim(),
        null,
        'REINF_ECD_INDEFINIDA',
      );
    }
    const fone = contador.phone ?? undefined;
    return {
      cnpjRaiz: cnpjRaiz(cnpj),
      classTrib,
      indEscrituracao: ecd?.status === 'OBRIGATORIA' ? 1 : 0,
      contato: { nome: contador.name.slice(0, 70), cpf: contador.cpf, ...(fone ? (fone.length === 11 ? { foneCel: fone } : { foneFixo: fone }) : {}), email: contador.email.slice(0, 60) },
    };
  }

  /** F-REINF-12 (a): `ideRespInf` só com dado cadastrado — o contador do contato. */
  private respInf(c: ContribuinteR1000): RespInf {
    return { nome: c.contato.nome, cpf: c.contato.cpf, telefone: c.contato.foneCel ?? c.contato.foneFixo, email: c.contato.email };
  }
}

/**
 * Lacuna D (dono 26/10, pacote A): `inclusao` quando não há lote de competência ANTERIOR; depois, `alteracao` só quando o
 * hash do cadastro difere do último R-1000 gerado; igual ⇒ sem R-1000 no lote.
 */
export function decidirR1000(c: ContribuinteR1000, competencia: string, anteriores: readonly ReinfBatch[]): 'inclusao' | 'alteracao' | null {
  if (!anteriores.some((a) => a.competencia < competencia)) return 'inclusao';
  const ultimo = anteriores.flatMap((a) => (a.eventos as ReinfBatchEvento[]).filter((e) => e.tipo === 'R-1000'))[0];
  return ultimo?.conteudoSha256 === conteudoSha256R1000(c) ? null : 'alteracao';
}

/** Item 13 — evento de lote anterior com origem estornada: RETIFICAR; antes, REABRIR se o lote foi transmitido (L4). */
function marcacoes(anteriores: readonly ReinfBatch[], ativos: ReadonlySet<string>): ReinfRelatorio['marcacoes'] {
  return anteriores.flatMap((a) =>
    (a.eventos as ReinfBatchEvento[])
      .filter((e) => e.origemIds.some((id) => !ativos.has(id)))
      .flatMap((e) => [
        ...(a.status === 'TRANSMITIDO' || a.status === 'ACEITO' ? [{ batchId: a.id, idEvento: e.idEvento, tipo: e.tipo, acao: 'REABRIR_ANTES' as const }] : []),
        { batchId: a.id, idEvento: e.idEvento, tipo: e.tipo, acao: 'RETIFICAR' as const },
      ]),
  );
}

/**
 * Item 23 (lacunas C e D, dono 28/10) — os avisos que o PR-3 soma: natureza do perfil não conferida (P-REINF-2 aberta) em todo lote
 * com R-4020 de retenção; evento de lote anterior a retificar e, antes, a reabrir (item 13, L4).
 */
function avisosDoPr3(linhasR4020: readonly { natRend: string | null }[], marc: ReinfRelatorio['marcacoes']): ReinfAviso[] {
  const out: ReinfAviso[] = [];
  const naturezas = [...new Set(linhasR4020.map((l) => l.natRend).filter((n): n is string => !!n))].sort();
  if (naturezas.length > 0) {
    out.push({
      codigo: AVISO_NATUREZA_NAO_CONFERIDA,
      quantidade: naturezas.length,
      detalhe: `Natureza(s) do rendimento ${naturezas.join(', ')} vêm do perfil de retenção e ainda não foram conferidas pelo contador (P-REINF-2).`,
    });
  }
  const retificar = marc.filter((m) => m.acao === 'RETIFICAR').length;
  const reabrir = marc.filter((m) => m.acao === 'REABRIR_ANTES').length;
  if (retificar > 0) out.push({ codigo: 'DEFASADO_RETIFICAR', quantidade: retificar, detalhe: `${retificar} evento(s) de lote anterior com origem estornada: retificar.` });
  if (reabrir > 0) out.push({ codigo: 'REABRIR_ANTES', quantidade: reabrir, detalhe: `${reabrir} evento(s) já transmitido(s): reabrir o período antes de retificar (L4).` });
  return out;
}

/** Item 21 (lacuna B, dono 28/10) — o prazo do lote é o mais cedo dos eventos periódicos; lote sem prazo gravado (PR-1/PR-2), o mensal. */
function prazoDoLote(eventos: readonly ReinfBatchEvento[], mensal: string): string {
  return eventos.map((e) => e.prazo).filter((p): p is string => !!p).sort()[0] ?? mensal;
}

/** Item 14 — relatório em JSON + CSV (`;`, beneficiário mascarado); PR-3: o prazo da Reinf por linha (item 21). */
function montarRelatorio(competencia: string, prazo: string, linhas: ReinfRelatorio['linhas'], avisos: ReinfAviso[], marc: ReinfRelatorio['marcacoes']): ReinfRelatorio {
  const cab = 'evento;beneficiario;natRend;dtFG;tributo;brutoCents;baseCents;retidoCents;codigoReceita;vencimentoDarf;prazoReinf';
  const csv = [cab, ...linhas.map((r) => [r.evento, r.beneficiario, r.natRend ?? '', r.dtFG, r.tributo, r.brutoCents, r.baseCents, r.retidoCents, r.codigoReceita ?? '', r.vencimentoDarf ?? '', r.prazoReinf].join(';'))].join('\n');
  return { competencia, prazo, linhas, totaisPorCodigo: totaisPorCodigo(linhas), marcacoes: marc, avisos, csv };
}

/** Item 13 — defasado se alguma origem do lote não é mais retenção ativa (foi estornada depois do lote). */
function toView(r: ReinfBatch, ativos: ReadonlySet<string>, prazo: string): ReinfBatchView {
  const eventos = r.eventos as ReinfBatchEvento[];
  return {
    id: r.id,
    competencia: r.competencia,
    tpAmb: r.tpAmb,
    sha256: r.sha256,
    status: r.status as ReinfBatchView['status'],
    eventos,
    defasado: eventos.some((e) => e.origemIds.some((id) => !ativos.has(id))),
    prazo: prazoDoLote(eventos, prazo),
    geradoPorId: r.geradoPorId,
    createdAt: r.createdAt.toISOString(),
  };
}

/** L8 — data e hora da geração no fuso do escopo, `AAAAMMDDHHMMSS`. */
function agoraAAAAMMDDHHMMSS(d: Date, timeZone: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second}`;
}
