import { createHash } from 'node:crypto';
import { ForbiddenError } from '../../../lib/errors';
import * as storage from '../../../lib/attachmentStorage';
import { sendAlertWebhook } from '../../../lib/alertWebhook';
import { metrics } from '../../../lib/monitoring';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IDataExchangeRepository } from '../repositories/IDataExchangeRepository';
import type { AuditService } from './AuditService';
import type { AccountingReportService } from './AccountingReportService';
import { toJobResponse, type DataExchangeJobResponse } from './dataExchangeMappers';
import type { SpedEcfRealRequestDto } from '../dtos/SpedEcfRealDto';
import { quarterWindows } from './SpedEcfGenerationService';
import { serializeEcf } from '../../../lib/ecf';
import { buildEcfRealFile, type EcfRealFileInput, type EcfRealQuarter } from '../../../lib/ecfReal';

/** `kind` do job de export do Real (BRIEF item 4 — coluna String, zero migração). */
export const SPED_ECF_REAL_JOB_KIND = 'EXPORT_SPED_ECF_REAL';

/**
 * SPED ECF (SPED Fiscal · IRPJ/CSLL · Lucro REAL) file generation — ESQUELETO
 * (ADR-INCR-SPED-ECF-FASE3; Fork 1→(b) serviço dedicado, Fork 5→(a) trimestral). READ-ONLY
 * over the ledger + ONE metadata write (the export job): NO Posting/JournalEntry write, no
 * period gate (reuso de D8 do ADR-ECF — `IAccountingPolicy.canRead`, BRIEF item 15).
 *
 * ── Diferença estrutural para o serviço Presumido (BRIEF item 5, ADR §2) ──
 * A base do Real é o resultado/balanço INTEIROS, não duas contas de receita. Por isso este
 * serviço injeta `AccountingReportService` (`balanceSheet` closing-inclusive → fonte de L100;
 * `incomeStatement` closing-exclusive → fonte de L300; ADR §1) em vez de agregar saldo por conta
 * via `groupByAccount`. Consequência (BRIEF item 10): o gate de exaustividade da receita do
 * Presumido (contas Revenue ∉ {3.1, 3.3} bloqueiam) NÃO é portado — toda conta Revenue/Expense
 * já participa da DRE por construção.
 *
 * ── O que o esqueleto NÃO faz (forks pendentes) ──
 * Não emite L/M/N (marcadores vazios — Forks 2/3/4), não computa base/IRPJ/adicional/CSLL,
 * não alimenta HASH_ECF_ANTERIOR (Fork 2), não carrega ajustes Lalur (Fork 4). Os relatórios
 * lidos por trimestre são passados ao serializer como `EcfRealQuarter`, que ainda não os emite.
 *
 * Persiste o `.txt` (ISO-8859-1) via o store de disco reusado e grava um EXPORT job +
 * `sped.ecf_generated` audit numa tx (mesmo eventType do Presumido — `kind` distingue o
 * regime, BRIEF item 13; allowlist intocada).
 */
export class SpedEcfRealGenerationService {
  constructor(
    private readonly reportService: AccountingReportService,
    private readonly policy: IAccountingPolicy,
    private readonly repo: IDataExchangeRepository,
    private readonly audit: AuditService,
  ) {}

  public async generate(scope: AccountingScope, dto: SpedEcfRealRequestDto): Promise<DataExchangeJobResponse> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Não autorizado a gerar a ECF (Lucro Real).');
    }

    const { year } = dto;

    // ── Trimestres (Fork 5→(a)): fontes de L100/L300 por janela via AccountingReportService ──
    const quarters: EcfRealQuarter[] = [];
    for (const w of quarterWindows(year)) {
      const [bp, dre] = await Promise.all([
        this.reportService.balanceSheet(scope, w.to),
        this.reportService.incomeStatement(scope, w.to),
      ]);
      quarters.push({
        perApur: w.perApur,
        dtIni: w.dtIni,
        dtFin: w.dtFin,
        l100Source: {
          assetsCents: Number(bp.assets.totalCents),
          liabilitiesCents: Number(bp.liabilities.totalCents),
          equityCents: Number(bp.equity.totalCents),
        },
        l300Source: { ytdNetResultCents: Number(dre.netResult.amountCents) },
      });
    }

    const input: EcfRealFileInput = {
      declarant: {
        cnpj: dto.declarant.cnpj,
        nome: dto.declarant.nome,
        dtIni: `${year}-01-01`,
        dtFin: `${year}-12-31`,
        codNat: dto.declarant.codNat,
        cnaeFiscal: dto.declarant.cnaeFiscal,
        endereco: dto.declarant.endereco,
        num: dto.declarant.num,
        compl: dto.declarant.compl,
        bairro: dto.declarant.bairro,
        uf: dto.declarant.uf,
        codMun: dto.declarant.codMun,
        cep: dto.declarant.cep,
        numTel: dto.declarant.numTel,
        email: dto.declarant.email,
      },
      fiscal: {
        formaTrib: dto.fiscal.formaTrib,
        formaTribPer: dto.fiscal.formaTribPer,
        formaApur: dto.fiscal.formaApur,
        indRecReceita: dto.fiscal.indRecReceita,
      },
      params: { indAliqCsll: dto.fiscal.indAliqCsll },
      signers: dto.signers.map((s) => ({
        identNom: s.identNom,
        identCpfCnpj: s.identCpfCnpj,
        identQualif: s.identQualif,
        indCrc: s.indCrc,
        email: s.email,
        fone: s.fone,
      })),
      quarters,
    };

    const lines = buildEcfRealFile(input);
    const text = serializeEcf(lines);
    const buffer = Buffer.from(text, 'latin1'); // ISO-8859-1 (ECF-6, Manual p. 31)
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const fileName = `ecf_real_${dto.declarant.cnpj}_${year}.txt`;

    const job = await this.repo.createJob({
      userId: scope.ownerUserId,
      unitId: scope.unitId,
      direction: 'EXPORT',
      kind: SPED_ECF_REAL_JOB_KIND,
      status: 'PROCESSING', // A1: só vira EXPORTED depois que o arquivo existe (abaixo).
      requestedById: scope.actorUserId,
      originalName: fileName,
      mimeType: 'text/plain',
      sizeBytes: buffer.length,
      sha256,
      totalRows: lines.length,
    });

    // Mesma camada de métrica do Presumido (BRIEF-W2-D, F4, layer 1) — nome próprio por regime.
    const endTimer = metrics.startTimer('sped_ecf_real_generation');

    let storageKey: string;
    try {
      ({ storageKey } = await storage.saveFile(
        scope.ownerUserId,
        scope.unitId,
        job.id,
        fileName,
        buffer,
      ));
    } catch (error) {
      // A1: a falha de escrita não pode deixar a linha afirmando sucesso.
      await this.repo.updateJob(scope, job.id, { status: 'FAILED' });
      // `source` reusa 'sped_ecf' — como no audit, o `kind` distingue o regime (mesma regra do
      // item 13); um novo membro na união de `AlertPayload.source` tocaria `lib/alertWebhook.ts`.
      sendAlertWebhook({
        source: 'sped_ecf',
        event: 'generation_failed',
        timestamp: new Date().toISOString(),
        jobId: job.id,
        kind: job.kind,
        unitId: scope.unitId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      endTimer({ success: false, jobId: job.id, kind: job.kind, unitId: scope.unitId });
      throw error;
    }

    const updated = await this.repo.runTransaction(async (tx) => {
      const j = await this.repo.updateJob(scope, job.id, { storageKey, status: 'EXPORTED' }, tx);
      await this.audit.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'sped.ecf_generated',
        targetType: 'data_exchange_job',
        targetId: job.id,
        payload: {
          jobId: job.id,
          kind: SPED_ECF_REAL_JOB_KIND,
          year: String(year),
          sha256,
          lineCount: String(lines.length),
        },
      });
      return j;
    });

    endTimer({ success: true, jobId: job.id, kind: job.kind, unitId: scope.unitId });
    return toJobResponse(updated);
  }
}
