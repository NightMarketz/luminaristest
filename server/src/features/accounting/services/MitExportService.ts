import type { MitExport } from 'generated/prisma';
import { ConflictError, ForbiddenError, ValidationError } from '../../../lib/errors';
import { apuracoesDoPa, montarArquivoMit } from '../../../lib/mit';
import { tabelaApuracaoDe } from '../models/taxAssessmentParams';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IMitExportRepository } from '../repositories/IMitExportRepository';
import type { ITaxAssessmentRepository } from '../repositories/ITaxAssessmentRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IAccountingContactRepository } from '../repositories/IAccountingContactRepository';
import type { AuditService } from './AuditService';
import { formaEfetiva } from './CompanyFiscalProfileService';
import type { MitExportCreatedView, MitExportListQuery, MitExportRequest, MitExportView } from '../dtos/MitExportDto';

export const MIT_EXPORT_GENERATED = 'tax.mit_export.generated';

/**
 * BE-INCR-MIT-EXPORT PR-2 (nó X9, BRIEF itens 10–11, 16; ADR-INCR-DCTFWEB-MIT D10–D12, §13) — gera o arquivo JSON
 * de importação do MIT de um PA (ano, mês) a partir das apurações confirmadas do X7 e registra a geração
 * (`MitExport`, sem conteúdo nem CPF). O X9 só LÊ o `TaxAssessment` pela interface do repositório do X7 (B-18).
 *
 * Recusas, na ordem do item 10: perfil do ano ausente (400) → Simples/MEI (400, D10) → sem CNPJ do declarante (400)
 * → sem contador ou contador arquivado (400, F-X9-3 a) → liminar LC 224 (409, F-X9-5 c) → nada a exportar (422,
 * `montarArquivoMit`, itens 4/6). O registro e o evento de auditoria vão numa tx só (lacuna 2 do PR-2, dono 07/10:
 * o `AuditService.append` exige a tx da mutação). Nada é lançado no razão.
 */
export class MitExportService {
  constructor(
    private readonly repo: IMitExportRepository,
    private readonly taxAssessmentRepo: Pick<ITaxAssessmentRepository, 'findConfirmedByYear'>,
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly contactRepo: Pick<IAccountingContactRepository, 'findById'>,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    /** BE-INCR-LEGAL-PARAMS PR-2 (F-LP-4 a): fotografia `CODIGO_RECEITA` para o código da diferença postergada. */
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
  ) {}

  /** Item 10 — POST /api/accounting/mit-exports. */
  async gerar(scope: AccountingScope, input: MitExportRequest): Promise<MitExportCreatedView> {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para gerar o arquivo do MIT.');
    const { anoCalendario: ano, mes } = input;

    const perfil = await this.companyProfileRepo.findByYear(scope, ano);
    if (!perfil) throw new ValidationError(`Cadastre o perfil fiscal de ${ano} antes de gerar o arquivo do MIT.`);
    if (perfil.regime !== 'PRESUMIDO' && perfil.regime !== 'REAL') {
      throw new ValidationError('O Simples não informa no MIT o que está no DAS (IN 2.237 art. 8º § 4º).');
    }
    const cnpj = (perfil.declarante as { cnpj?: unknown } | null)?.cnpj;
    if (typeof cnpj !== 'string' || cnpj.length === 0) {
      throw new ValidationError(`Informe o CNPJ do declarante no perfil fiscal de ${ano}.`);
    }
    const contador = perfil.contadorContactId ? await this.contactRepo.findById(scope, perfil.contadorContactId) : null;
    if (!contador) {
      throw new ValidationError(`Indique um contador ativo no perfil fiscal de ${ano}: ele é o responsável pela apuração no MIT.`);
    }

    const apuracoes = apuracoesDoPa(await this.taxAssessmentRepo.findConfirmedByYear(scope.ownerUserId, ano), ano, mes);

    // F-X9-5 (c): liminar no perfil de ALGUM ano das apurações selecionadas.
    for (const anoApuracao of new Set(apuracoes.map((a) => a.anoCalendario))) {
      const p = anoApuracao === ano ? perfil : await this.companyProfileRepo.findByYear(scope, anoApuracao);
      if (p?.lc224AcrescimoSuspenso) {
        throw new ConflictError('PJ com liminar contra a LC 224: a declaração da suspensão depende do contador.', 'MIT_LC224_LIMINAR');
      }
    }

    const forma = formaEfetiva(perfil.regime, perfil.formaApuracaoIrpjCsll) === 'ANUAL' ? 'ANUAL' : 'TRIMESTRAL';
    const saida = montarArquivoMit({
      ano,
      mes,
      perfil: { cnpj, regime: perfil.regime, forma },
      responsavel: { cpf: contador.cpf, phone: contador.phone, email: contador.email },
      apuracoes,
      tabela: tabelaApuracaoDe(await this.legalParams.fotografia(['CODIGO_RECEITA'])),
    });

    const row = await this.repo.runTransaction(async (tx) => {
      const criado = await this.repo.create(
        { userId: scope.ownerUserId, anoCalendario: ano, mes, sha256: saida.sha256, apuracaoIds: saida.apuracaoIds, geradoPorId: scope.actorUserId },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: MIT_EXPORT_GENERATED,
        targetType: 'mit_export',
        targetId: criado.id,
        payload: {
          mitExportId: criado.id,
          anoCalendario: String(ano),
          mes: String(mes),
          sha256: saida.sha256,
          apuracaoIds: JSON.stringify(saida.apuracaoIds),
        },
      });
      return criado;
    });

    return { id: row.id, nomeArquivo: saida.nomeArquivo, conteudo: saida.conteudo, sha256: saida.sha256, avisos: saida.avisos };
  }

  /** Item 11 — GET /api/accounting/mit-exports?anoCalendario=, com `defasado` calculado na leitura. */
  async list(scope: AccountingScope, query: MitExportListQuery): Promise<MitExportView[]> {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler os arquivos do MIT.');
    const ano = query.anoCalendario;
    const rows = await this.repo.findByYear(scope.ownerUserId, ano);
    if (rows.length === 0) return [];
    const confirmadas = await this.taxAssessmentRepo.findConfirmedByYear(scope.ownerUserId, ano);
    const hojePorMes = new Map<number, Set<string>>();
    const hoje = (mes: number): Set<string> => {
      let s = hojePorMes.get(mes);
      if (!s) hojePorMes.set(mes, (s = new Set(apuracoesDoPa(confirmadas, ano, mes).map((a) => a.id))));
      return s;
    };
    return rows.map((r) => toView(r, hoje(r.mes)));
  }
}

/**
 * Invariante 10 (art. 13 § 7º): defasado se algum id exportado não é mais `CONFIRMED` vivo, ou se o `apuracoesDoPa`
 * de hoje tem id fora do exportado. `hoje` = ids que `apuracoesDoPa` devolve agora (só `CONFIRMED` vivas), então as
 * duas condições são "os conjuntos diferem".
 */
function toView(r: MitExport, hoje: Set<string>): MitExportView {
  const ids = r.apuracaoIds as string[];
  const defasado = ids.length !== hoje.size || ids.some((id) => !hoje.has(id));
  return {
    id: r.id,
    anoCalendario: r.anoCalendario,
    mes: r.mes,
    sha256: r.sha256,
    apuracaoIds: ids,
    geradoPorId: r.geradoPorId,
    createdAt: r.createdAt.toISOString(),
    defasado,
  };
}
