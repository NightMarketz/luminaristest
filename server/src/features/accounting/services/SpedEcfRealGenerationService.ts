import { createHash } from 'node:crypto';
import { ForbiddenError, ValidationError } from '../../../lib/errors';
import * as storage from '../../../lib/attachmentStorage';
import { sendAlertWebhook } from '../../../lib/alertWebhook';
import { metrics } from '../../../lib/monitoring';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IDataExchangeRepository } from '../repositories/IDataExchangeRepository';
import type { AuditService } from './AuditService';
import type { ILalurRepository, LalurEntryWithRelations, LalurMovementWithRelations } from '../repositories/ILalurRepository';
import { toJobResponse, type DataExchangeJobResponse } from './dataExchangeMappers';
import type { SpedEcfRealRequestDto } from '../dtos/SpedEcfRealDto';
import { quarterWindows } from './SpedEcfGenerationService';
import { serializeEcf, resolveEcfCodVer } from '../../../lib/ecf';
import { natureToCodNat } from './SpedGenerationService';
import { LALUR_QUARTERS, findParteBPadrao, isPrejuizoIndicador, type LalurLivro } from '../models/Lalur.model';
import { LalurService } from './LalurService';
import { toMagnitude } from './lalurParteBBalances';
import {
  buildEcfRealFile,
  type EcfRealFileInput,
  type EcfRealLalurLine,
  type EcfRealParteBAccount,
  type EcfRealParteBBalance,
  type EcfRealParteBMovement,
  type EcfRealPeriod,
} from '../../../lib/ecfReal';

/** O que a geração precisa do `LalurService` (ECF 3C): diagnóstico (item 11) e abertura C3 do M010. */
export type LalurParteBReader = Pick<LalurService, 'diagnoseYear' | 'openingBalances'>;

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
 * ── ECF Fase 3C (ADR EMENDA 2026-09-12, 3ª; BRIEF 3C) ──
 *  - Geração exige os 4 trimestres da Parte B FECHADOS (item 11; 400 nomeando o primeiro aberto) e roda o
 *    diagnóstico materializado × recomputado — divergência ⇒ 400 "refeche", nunca arquivo silenciosamente errado.
 *  - `M010.VL_SALDO_INI` = abertura C3 (`balance(N−1,T04).sdFim` se fechado, senão a coluna) — é o que
 *    `REGRA_SALDOS_M010_E020` confere contra o E020 recuperado.
 *  - M410(+M415) dos movimentos vivos; M500 das linhas materializadas; M510 agregado no serializer.
 *  - PF/BC `user` E `system` no mesmo período/tributo ⇒ 400 (ambiguidade — item 6).
 *  - `|` em texto pré-existente (item 17), COD_NAT fora de 01..04 (item 18) e conta contábil arquivada depois
 *    do ajuste (item 19) viram `ValidationError` aqui — defesa em profundidade sobre os 400 do cadastro.
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
    private readonly lalurService: LalurParteBReader,
  ) {}

  /**
   * Resolve UMA linha persistida contra o catálogo (item 8/9). A linha já passou pelo gate do
   * `LalurService` ao ser cadastrada; re-resolver aqui fecha a janela "catálogo mudou depois do
   * cadastro" com erro explícito em vez de descricao vazia (classe FAIL-1: omitir ajuste = base errada).
   */
  public static toSerializerLine(e: LalurEntryWithRelations): EcfRealLalurLine {
    const livro = e.livro as LalurLivro;
    // As 3 condições do item 9 (existe / é E / vigente em e.year) — REGRA_LINHA_DESPREZADA (p.244) faria
    // o PVA descartar com AVISO uma linha encerrada; aqui é erro (review I-2).
    let row: ReturnType<typeof LalurService.resolveLinha>;
    try {
      row = LalurService.resolveLinha(livro, e.codigo, e.year);
    } catch (err) {
      throw new ValidationError(`Ajuste ${e.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
    const line: EcfRealLalurLine = {
      livro,
      perApur: e.quarter,
      codigo: e.codigo,
      descricao: row.descricao,
      valorCents: Number(e.valorCents),
    };
    if (livro === 'lalur' || livro === 'lacs') {
      if (!row.tipoLanc || row.tipoLanc === 'R') throw new ValidationError(`Ajuste ${e.id}: código '${e.codigo}' sem TIPO_LANCAMENTO no catálogo.`);
      line.tipoLancamento = row.tipoLanc;
      line.indRelacao = (e.indRelacao ?? undefined) as EcfRealLalurLine['indRelacao'];
      if (e.histLancamento) line.hist = e.histLancamento;
      if (e.parteB) line.codCtaB = e.parteB.codCtaB;
      if (e.account) {
        // BRIEF 3C item 19: conta arquivada DEPOIS do ajuste sairia no M310 como se viva.
        if (e.account.deletedAt) {
          throw new ValidationError(`Ajuste ${e.id}: a conta contábil '${e.account.code}' foi arquivada — arquive ou reaponte o ajuste antes de gerar (M310.COD_CTA ∈ J050, p.252).`);
        }
        line.codCta = e.account.code;
        line.codNat = natureToCodNat(e.account.nature);
        // BRIEF 3C item 18: a regra do sinal (p.246) só define COD_NAT 1..4; '09' não pode ser tratado como patrimonial.
        if (!['01', '02', '03', '04'].includes(line.codNat)) {
          throw new ValidationError(`Ajuste ${e.id}: conta contábil '${e.account.code}' com natureza '${e.account.nature}' (COD_NAT ${line.codNat}) fora do domínio 01..04 do M310/M360 (p.246).`);
        }
        // M312/M362 (Fork F-3C-3 a): NUM_LCTO = JournalEntry.entryNumber (o mesmo do I200).
        const numLctos: string[] = [];
        for (const l of e.journalLinks ?? []) {
          if (l.journalEntry.entryNumber === null) throw new ValidationError(`Ajuste ${e.id}: lançamento '${l.journalEntryId}' sem NUM_LCTO — não pode sair no M312/M362 (p.254).`);
          numLctos.push(String(l.journalEntry.entryNumber));
        }
        if (numLctos.length > 0) line.numLctos = numLctos;
      }
      if ((e.processos ?? []).length > 0) {
        line.processos = e.processos.map((p) => ({ indProc: p.indProc as '1' | '2', numProc: p.numProc }));
      }
    }
    return line;
  }

  /** M410 a partir do movimento persistido (ECF 3C item 5). */
  public static toSerializerMovement(m: LalurMovementWithRelations): EcfRealParteBMovement {
    const out: EcfRealParteBMovement = {
      perApur: m.quarter,
      codCtaB: m.parteB.codCtaB,
      codTributo: m.codTributo as 'I' | 'C',
      valorCents: Number(m.valorCents),
      indicador: m.indicador as EcfRealParteBMovement['indicador'],
      hist: m.historico,
      indLanAnt: m.indLanAnt as 'S' | 'N',
    };
    if (m.contrapartida) out.codCtaBCtp = m.contrapartida.codCtaB;
    if ((m.processos ?? []).length > 0) out.processos = m.processos.map((p) => ({ indProc: p.indProc as '1' | '2', numProc: p.numProc }));
    return out;
  }

  public async generate(scope: AccountingScope, dto: SpedEcfRealRequestDto): Promise<DataExchangeJobResponse> {
    if (!this.policy.canRead(scope)) {
      throw new ForbiddenError('Não autorizado a gerar a ECF (Lucro Real).');
    }

    const { year } = dto;
    // Fork 7→(a): ano sem leiaute é 400 explícito (a lib lança Error puro; aqui vira ValidationError
    // para a OpenAPI "a year with no known layout is a 400" ser verdade em produção — review I-1).
    let codVer: string;
    try {
      codVer = resolveEcfCodVer(year, dto.fiscal.codVer);
    } catch (e) {
      throw new ValidationError(e instanceof Error ? e.message : String(e));
    }

    // ── Períodos (Fork 5→(a)) — L030/M030/N030 derivados do Bloco 0 ──
    const periods: EcfRealPeriod[] = quarterWindows(year).map((w) => ({
      perApur: w.perApur as EcfRealPeriod['perApur'],
      dtIni: w.dtIni,
      dtFin: w.dtFin,
    }));

    // ── Parte B fechada (ECF 3C item 11): os 4 trimestres materializados, sem divergência ──
    const closings = await this.lalurRepo.findClosingsForYear(scope, year);
    const closedQ = new Set(closings.map((c) => c.quarter));
    const firstOpen = LALUR_QUARTERS.find((q) => !closedQ.has(q));
    if (firstOpen) {
      throw new ValidationError(`Feche a Parte B do e-Lalur/e-Lacs de ${firstOpen}/${year} (e dos trimestres seguintes) antes de gerar a ECF — o M500 e o E020 do exercício seguinte saem da materialização (Manual p.271).`);
    }
    const diag = await this.lalurService.diagnoseYear(scope, year);
    if (diag.divergences.length > 0) {
      const d = diag.divergences[0];
      throw new ValidationError(
        `Parte B divergente em ${d.quarter}/${year}: conta '${d.codCtaB}' (${d.codTributo}) campo ${d.field} materializado=${d.materialized} recomputado=${d.recomputed} (+${diag.divergences.length - 1}) — refeche o período antes de gerar (BRIEF 3C item 11).`,
      );
    }

    // ── e-Lalur/e-Lacs (Fork 4→(b)): o gerador LÊ do model ──
    const entries = await this.lalurRepo.findEntriesForYear(scope, year);
    const lalur = entries.map(SpedEcfRealGenerationService.toSerializerLine);
    const yearEnd = `${year}-12-31`;
    // REGRA_MENOR_IGUAL_DT_FIN (p.237): M010.DT_AP_LAL ≤ 0000.DT_FIN — conta nascida depois do exercício
    // não pertence a esta ECF (geração retroativa/retificadora — review I-3).
    const liveAccounts = (await this.lalurRepo.findManyParteB(scope, { includeArchived: false })).filter(
      (a) => a.dtCriacao.toISOString().slice(0, 10) <= yearEnd,
    );
    // C3: VL_SALDO_INI emitido = abertura do exercício (balance(N−1,T04) se fechado; senão a coluna, com
    // REGRA_DT_AP_ZERO dentro de `anchorOpening`) — nunca a coluna crua quando há exercício anterior fechado.
    const opening = await this.lalurService.openingBalances(scope, year, liveAccounts);
    const parteB: EcfRealParteBAccount[] = liveAccounts.map((a) => {
      const o = toMagnitude(opening.get(a.id) ?? 0n);
      return {
        codCtaB: a.codCtaB,
        descricao: a.descricao,
        dtApLal: a.dtCriacao.toISOString().slice(0, 10),
        codPbRfb: a.codPbRfb,
        dtLimLal: a.dtLimite ? a.dtLimite.toISOString().slice(0, 10) : undefined,
        codTributo: a.codTributo as 'I' | 'C',
        saldoIniCents: Number(o.cents),
        indSaldoIni: o.ind,
        cnpjSitEsp: a.cnpjSitEsp ?? undefined,
      };
    });

    // ── M410 (item 5) — PF/BC `user` e `system` no mesmo período/tributo é ambiguidade (item 6) ──
    const movementsRaw = await this.lalurRepo.findMovementsForYear(scope, year);
    for (const q of LALUR_QUARTERS) {
      for (const t of ['I', 'C'] as const) {
        const pf = movementsRaw.filter((m) => m.quarter === q && m.codTributo === t && isPrejuizoIndicador(m.indicador));
        if (pf.some((m) => m.origem === 'user') && pf.some((m) => m.origem === 'system')) {
          throw new ValidationError(`${q}/${year}: existe PF/BC lançado manualmente E derivado pelo sistema para o tributo ${t} — arquive um dos dois antes de gerar (REGRA_PREJUIZO_FISCAL/REGRA_BC_NEGATIVA, p.269).`);
        }
      }
    }
    const movements = movementsRaw.map(SpedEcfRealGenerationService.toSerializerMovement);

    // ── M500 (item 8) — das linhas materializadas; M510 agrega no serializer ──
    const balances: EcfRealParteBBalance[] = [];
    for (const c of closings) {
      for (const b of c.balances) {
        balances.push({
          perApur: c.quarter,
          codCtaB: b.parteB.codCtaB,
          codTributo: b.parteB.codTributo as 'I' | 'C',
          codPbRfb: b.parteB.codPbRfb,
          descricaoPbRfb: findParteBPadrao(b.parteB.codPbRfb)?.descricao ?? '',
          sdIniCents: Number(b.sdIniCents), indSdIni: b.indSdIni as 'D' | 'C',
          vlParteACents: Number(b.vlParteACents), indVlParteA: b.indVlParteA as 'D' | 'C',
          vlParteBCents: Number(b.vlParteBCents), indVlParteB: b.indVlParteB as 'D' | 'C',
          sdFimCents: Number(b.sdFimCents), indSdFim: b.indSdFim as 'D' | 'C',
        });
      }
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
      periods,
      lalur,
      parteB,
      movements,
      balances,
      codVer,
    };

    // BRIEF 3C item 17: `spedLine` lança Error puro em campo com '|' (dado pré-existente ao DTO que hoje recusa) —
    // aqui vira 400 nomeando o campo, não 500.
    let lines: string[];
    try {
      lines = buildEcfRealFile(input);
    } catch (e) {
      if (e instanceof Error && /Campo SPED não pode conter/.test(e.message)) {
        throw new ValidationError(`Arquivo ECF não pode ser montado: ${e.message} — corrija o texto do ajuste/conta/movimento (separador de campo, Manual p.31).`);
      }
      throw e;
    }
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
