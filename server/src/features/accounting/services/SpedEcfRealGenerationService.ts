import { createHash } from 'node:crypto';
import { ForbiddenError, ValidationError } from '../../../lib/errors';
import * as storage from '../../../lib/attachmentStorage';
import { sendAlertWebhook } from '../../../lib/alertWebhook';
import { metrics } from '../../../lib/monitoring';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IDataExchangeRepository } from '../repositories/IDataExchangeRepository';
import type { AuditService } from './AuditService';
import type { ILalurRepository, LalurEntryWithRelations } from '../repositories/ILalurRepository';
import { toJobResponse, type DataExchangeJobResponse } from './dataExchangeMappers';
import type { SpedEcfRealRequestDto } from '../dtos/SpedEcfRealDto';
import { quarterWindows } from './SpedEcfGenerationService';
import { serializeEcf, resolveEcfCodVer } from '../../../lib/ecf';
import { natureToCodNat } from './SpedGenerationService';
import { findLinha, type LalurLivro } from '../models/Lalur.model';
import {
  buildEcfRealFile,
  type EcfRealFileInput,
  type EcfRealLalurLine,
  type EcfRealParteBAccount,
  type EcfRealPeriod,
} from '../../../lib/ecfReal';

/** `kind` do job de export do Real (BRIEF item 4 — coluna String, zero migração). */
export const SPED_ECF_REAL_JOB_KIND = 'EXPORT_SPED_ECF_REAL';

/**
 * SPED ECF (SPED Fiscal · IRPJ/CSLL · Lucro REAL) file generation (ADR-INCR-SPED-ECF-FASE3 — Fork
 * 1→(b) serviço dedicado, Fork 5→(a) trimestral; BRIEF 3B — Forks 2→(d) 3→(a) 4→(b) 6→(b) 7→(a)).
 * READ-ONLY over the ledger + ONE metadata write (the export job): NO Posting/JournalEntry write, no
 * period gate (reuso de D8 do ADR-ECF — `IAccountingPolicy.canRead`).
 *
 * ── Fontes (BRIEF 3B) ──
 *  - Períodos (L030/M030/N030): `quarterWindows(year)` — derivados do Bloco 0 (Manual p.221/241/277).
 *  - Bloco L (Fork 6→(b)): SÓ períodos. `AccountingReportService` SAIU deste serviço (item 6): os
 *    saldos de L100/L300 "não são editáveis" e são recuperados pelo PVA do K155/K156 (pp.224/232) —
 *    a cadeia real é ECD → K → L100/L300, nada que o report service alimente.
 *  - Bloco M/N (Fork 4→(b)): o gerador LÊ do model — `ILalurRepository.findEntriesForYear` +
 *    `findManyParteB` — e resolve cada linha contra o catálogo (`findLinha`): DESCRICAO copiada da
 *    tabela, TIPO_LANCAMENTO derivado (item 8), `accountId` → `Account.code` (= I050/J050.COD_CTA da
 *    ECD, p.252) + `natureToCodNat` para o sinal do M310 (N-2). O DTO de geração NÃO carrega ajustes.
 *  - 0000.COD_VER: `resolveEcfCodVer(year, dto.fiscal.codVer)` (Fork 7→(a)) — ano sem leiaute é erro.
 *  - HASH_ECF_ANTERIOR: vazio (Fork 2→(d), p.70) — o PVA preenche na recuperação.
 * Não computa base/IRPJ/adicional/CSLL (linhas CNA/CA são do PVA — Fork 3→(a)).
 *
 * Persiste o `.txt` (ISO-8859-1) via o store de disco reusado e grava um EXPORT job +
 * `sped.ecf_generated` audit numa tx (mesmo eventType do Presumido — `kind` distingue o regime;
 * payload ganha `lalurEntries` = CONTAGEM, item 18 — sem PII).
 */
export class SpedEcfRealGenerationService {
  constructor(
    private readonly lalurRepo: ILalurRepository,
    private readonly policy: IAccountingPolicy,
    private readonly repo: IDataExchangeRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Resolve UMA linha persistida contra o catálogo (item 8/9). A linha já passou pelo gate do
   * `LalurService` ao ser cadastrada; re-resolver aqui fecha a janela "catálogo mudou depois do
   * cadastro" com erro explícito em vez de descricao vazia (classe FAIL-1: omitir ajuste = base errada).
   */
  public static toSerializerLine(e: LalurEntryWithRelations): EcfRealLalurLine {
    const livro = e.livro as LalurLivro;
    const row = findLinha(livro, e.codigo);
    if (!row || row.tipo !== 'E') {
      throw new ValidationError(`Ajuste ${e.id}: código '${e.codigo}' não é linha E do livro '${livro}' no catálogo do Leiaute 12.`);
    }
    const line: EcfRealLalurLine = {
      livro,
      perApur: e.quarter,
      codigo: e.codigo,
      descricao: row.descricao,
      valorCents: Number(e.valorCents),
    };
    if (livro === 'lalur' || livro === 'lacs') {
      if (!row.tipoLanc) throw new ValidationError(`Ajuste ${e.id}: código '${e.codigo}' sem TIPO_LANCAMENTO no catálogo.`);
      line.tipoLancamento = row.tipoLanc;
      line.indRelacao = (e.indRelacao ?? undefined) as EcfRealLalurLine['indRelacao'];
      if (e.histLancamento) line.hist = e.histLancamento;
      if (e.parteB) line.codCtaB = e.parteB.codCtaB;
      if (e.account) {
        line.codCta = e.account.code;
        line.codNat = natureToCodNat(e.account.nature);
      }
    }
    return line;
  }

  public async generate(scope: AccountingScope, dto: SpedEcfRealRequestDto): Promise<DataExchangeJobResponse> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Não autorizado a gerar a ECF (Lucro Real).');
    }

    const { year } = dto;
    const codVer = resolveEcfCodVer(year, dto.fiscal.codVer);

    // ── Períodos (Fork 5→(a)) — L030/M030/N030 derivados do Bloco 0 ──
    const periods: EcfRealPeriod[] = quarterWindows(year).map((w) => ({
      perApur: w.perApur as EcfRealPeriod['perApur'],
      dtIni: w.dtIni,
      dtFin: w.dtFin,
    }));

    // ── e-Lalur/e-Lacs (Fork 4→(b)): o gerador LÊ do model ──
    const entries = await this.lalurRepo.findEntriesForYear(scope, year);
    const lalur = entries.map(SpedEcfRealGenerationService.toSerializerLine);
    const parteB: EcfRealParteBAccount[] = (await this.lalurRepo.findManyParteB(scope, { includeArchived: false })).map((a) => ({
      codCtaB: a.codCtaB,
      descricao: a.descricao,
      dtApLal: a.dtCriacao.toISOString().slice(0, 10),
      codPbRfb: a.codPbRfb,
      dtLimLal: a.dtLimite ? a.dtLimite.toISOString().slice(0, 10) : undefined,
      codTributo: a.codTributo as 'I' | 'C',
      saldoIniCents: Number(a.saldoIniCents),
      indSaldoIni: a.indSaldoIni as 'D' | 'C',
      cnpjSitEsp: a.cnpjSitEsp ?? undefined,
    }));

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
      periods,
      lalur,
      parteB,
      codVer,
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
      // BE-INCR-CONTADOR-DELIVERY, Fork Novo A → (b) (cédula 10/09 §6, F3): o job persiste o
      // período que o arquivo cobre, para a entrega ao contador ler DAQUI em vez de um ano
      // digitado. Hoje = exercício-calendário inteiro (D4); quando a geração aceitar período
      // selecionado, é este par que muda — a entrega não precisa saber.
      periodStart: new Date(`${year}-01-01T00:00:00.000Z`),
      periodEnd: new Date(`${year}-12-31T00:00:00.000Z`),
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
          lalurEntries: String(lalur.length), // item 18: contagem, não conteúdo
        },
      });
      return j;
    });

    endTimer({ success: true, jobId: job.id, kind: job.kind, unitId: scope.unitId });
    return toJobResponse(updated);
  }
}
