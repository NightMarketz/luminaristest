import { createHash } from 'node:crypto';
import { ForbiddenError, ValidationError, ConflictError } from '../../../lib/errors';
import { resolveSupersededJob, isSupersedesUniqueViolation } from './spedRectificationGate';
import * as storage from '../../../lib/attachmentStorage';
import { sendAlertWebhook } from '../../../lib/alertWebhook';
import { metrics } from '../../../lib/monitoring';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IDataExchangeRepository } from '../repositories/IDataExchangeRepository';
import type { AuditService } from './AuditService';
import type { ILalurRepository, LalurEntryWithRelations, LalurMovementWithRelations } from '../repositories/ILalurRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { ITaxAssessmentRepository } from '../repositories/ITaxAssessmentRepository';
import { toJobResponse, type DataExchangeJobResponse } from './dataExchangeMappers';
import type { SpedEcfRealRequestDto } from '../dtos/SpedEcfRealDto';
import { quarterWindows } from './SpedEcfGenerationService';
import { serializeEcf, resolveEcfCodVer } from '../../../lib/ecf';
import { natureToCodNat } from './SpedGenerationService';
import { LALUR_MESES, findParteBPadrao, isLalurMes, isPrejuizoIndicador, periodoBounds, periodosParteB, type LalurLivro, type LalurMes } from '../models/Lalur.model';
import { mesesEmAtividade } from '../models/taxAssessmentCalcAnual';
import { formaEfetiva } from './CompanyFiscalProfileService';
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

/** X7 Fase B PR-4 (item 18): o perfil do ano (forma, datas de atividade) e as apurações confirmadas — só leitura. */
export type EcfRealProfileReader = Pick<ICompanyFiscalProfileRepository, 'findByYear'>;
export type EcfRealAssessmentReader = Pick<ITaxAssessmentRepository, 'findConfirmedByYear'>;

/** O que o 0010 e os períodos da ECF anual derivam do perfil e das apurações confirmadas (X7 Fase B itens 18–19). */
export interface EcfRealAnual {
  /** 0010.MES_BAL_RED — 12 posições `[0;E;B]` (Manual p.72). */
  mesBalRed: string;
  /** 0010.FORMA_TRIB_PER — 'R' no trimestre com algum mês em atividade, senão '0' (item 18). */
  formaTribPer: string;
  /** L030/M030: A00 + um A0m por mês `B` (pp.222 e 242). */
  periods: EcfRealPeriod[];
  /** N030: A00 + um A0m por mês `B` ou `E` (p.278). */
  periodsN: EcfRealPeriod[];
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * X7 Fase B PR-4 (BRIEF B itens 18–19), função pura. `modos[m]` = o `modo` confirmado do mês m em atividade
 * (`ESTIMATIVA_RECEITA` → `E`, `BALANCETE_SUSPENSAO_REDUCAO` → `B`); mês fora de atividade → `0` (p.72). A ordem dos
 * períodos é a da lista de valores válidos do PER_APUR (A00, A01..A12 — pp.241/277). `dtIni`/`dtFin` do `A0m` = o
 * período em curso de `periodoBounds` (item 19 → item 4; o Manual só diz "até o mês").
 */
export function derivarEcfAnual(year: number, inicioAtividadeEm: string | null, meses: number[], modos: Map<number, string>): EcfRealAnual {
  const mesBalRed = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    if (!meses.includes(m)) return '0';
    return modos.get(m) === 'BALANCETE_SUSPENSAO_REDUCAO' ? 'B' : 'E';
  }).join('');
  const formaTribPer = [0, 1, 2, 3].map((q) => (meses.some((m) => Math.ceil(m / 3) === q + 1) ? 'R' : '0')).join('');
  const period = (perApur: 'A00' | LalurMes): EcfRealPeriod => {
    const { from, to } = periodoBounds(year, perApur, inicioAtividadeEm);
    return { perApur, dtIni: isoDay(from), dtFin: isoDay(to) };
  };
  const mesesCom = (marcas: string) => LALUR_MESES.filter((_, i) => marcas.includes(mesBalRed[i]));
  return {
    mesBalRed,
    formaTribPer,
    periods: [period('A00'), ...mesesCom('B').map(period)],
    periodsN: [period('A00'), ...mesesCom('BE').map(period)],
  };
}

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
 * ── X7 Fase B PR-4 (BRIEF B itens 18–23; EMENDA 4ª do ADR, 2026-10-05) ──
 *  - FORMA_APUR vem do perfil efetivo do ano (`'A'` se ANUAL); no anual, FORMA_TRIB_PER é derivado e conferido,
 *    MES_BAL_RED sai dos `modo` confirmados (`TaxAssessment`, só leitura), L030/M030 = A00 + meses `B`, N030 = A00 +
 *    meses `B`/`E`, a Parte B exige o fechamento A00 e linha do e-Lalur fora dos períodos emitidos é 400.
 *  - O trimestral sai byte a byte igual ao de antes (teste 26 k).
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
    private readonly profiles: EcfRealProfileReader,
    private readonly assessments: EcfRealAssessmentReader,
  ) {}

  /**
   * X7 Fase B PR-4 (item 18): no `ANUAL`, gerar exige os meses em atividade com IRPJ e CSLL `CONFIRMED`; senão 400
   * listando os meses. Devolve o `modo` de cada mês (as 2 linhas de uma confirmação têm o mesmo `modo` — teste 26 c).
   */
  private async modosConfirmados(scope: AccountingScope, year: number, meses: number[]): Promise<Map<number, string>> {
    const rows = await this.assessments.findConfirmedByYear(scope.ownerUserId, year);
    const modos = new Map<number, string>();
    const faltam: string[] = [];
    for (const m of meses) {
      const doMes = rows.filter((r) => r.periodo === LALUR_MESES[m - 1]);
      if (!['IRPJ', 'CSLL'].every((t) => doMes.some((r) => r.tributo === t))) faltam.push(LALUR_MESES[m - 1]);
      else modos.set(m, doMes[0].modo);
    }
    if (faltam.length > 0) {
      throw new ValidationError(
        `Confirme a apuração de IRPJ e CSLL de ${faltam.join(', ')}/${year} antes de gerar a ECF anual — o 0010.MES_BAL_RED sai do modo confirmado de cada mês em atividade (X7 BRIEF B item 18).`,
      );
    }
    return modos;
  }

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
      livro: livro as EcfRealLalurLine['livro'], // n620/n660 não chegam aqui: `resolveLinha` os recusa até o catálogo do X7 Fase B PR-4
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

  /**
   * X7 Fase B PR-4 (item 21 + lacuna 3, decisão do dono 05/10): na ECF anual, toda linha do e-Lalur tem de cair num
   * período que o arquivo emite — senão 400, nunca arquivo silenciosamente incompleto:
   *  - `lalur`/`lacs` em `A0m` com o mês fora de `B`: seria M300/M350 sem M030 (p.242);
   *  - `n620`/`n660` em mês fora de `B`/`E`: seria N620/N660 sem N030 (p.278);
   *  - `n500` (ou qualquer livro N) em mês `0`: idem (lacuna 3 do PR-4).
   */
  public static assertLinhasNosPeriodos(entries: LalurEntryWithRelations[], year: number, mesBalRed: string, periods: EcfRealPeriod[], periodsN: EcfRealPeriod[]): void {
    const m = new Set<string>(periods.map((p) => p.perApur));
    const n = new Set<string>(periodsN.map((p) => p.perApur));
    for (const e of entries) {
      const parteA = e.livro === 'lalur' || e.livro === 'lacs';
      if ((parteA ? m : n).has(e.quarter)) continue;
      const marca = isLalurMes(e.quarter) ? mesBalRed[LALUR_MESES.indexOf(e.quarter)] : '—';
      throw new ValidationError(
        `Ajuste ${e.id} (livro '${e.livro}', código ${e.codigo}) em ${e.quarter}/${year} não tem ${parteA ? 'M030' : 'N030'} no arquivo: o mês está marcado '${marca}' no MES_BAL_RED ` +
          `(${parteA ? 'M300/M350 só nos meses B — Manual p.242' : 'N030 só nos meses B ou E — Manual p.278'}; X7 BRIEF B item 21) — arquive a linha ou confirme o mês no modo certo.`,
      );
    }
  }

  /** Item 17: texto livre com '|' nomeado por registro + identificador (M300/M350 ajuste, M010 conta, M410 movimento, M315/M415 processo). */
  public static assertNoPipe(entries: LalurEntryWithRelations[], movements: LalurMovementWithRelations[], accounts: Array<{ codCtaB: string; descricao: string; codTributo: string }>): void {
    const bad = (reg: string, who: string, field: string) =>
      new ValidationError(`${reg} ${who}: campo ${field} contém '|' (separador de campo do arquivo ECF, Manual p.31) — corrija o texto antes de gerar.`);
    for (const a of accounts) {
      if (a.codCtaB.includes('|')) throw bad('M010', `conta '${a.codCtaB}' (${a.codTributo})`, 'codCtaB');
      if (a.descricao.includes('|')) throw bad('M010', `conta '${a.codCtaB}' (${a.codTributo})`, 'descricao');
    }
    for (const e of entries) {
      const reg = e.livro === 'lacs' ? 'M350' : e.livro === 'lalur' ? 'M300' : e.livro.toUpperCase();
      if (e.histLancamento?.includes('|')) throw bad(reg, `ajuste ${e.id} (código ${e.codigo}, ${e.quarter})`, 'histLancamento');
      for (const p of e.processos ?? []) if (p.numProc.includes('|')) throw bad(e.livro === 'lacs' ? 'M365' : 'M315', `ajuste ${e.id}`, 'numProc');
    }
    for (const m of movements) {
      if (m.historico.includes('|')) throw bad('M410', `movimento ${m.id} (conta '${m.parteB.codCtaB}', ${m.quarter})`, 'historico');
      for (const p of m.processos ?? []) if (p.numProc.includes('|')) throw bad('M415', `movimento ${m.id}`, 'numProc');
    }
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
    const isRetificadora = dto.retificadora === 'S';
    const periodStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const periodEnd = new Date(`${year}-12-31T00:00:00.000Z`);
    if (isRetificadora && dto.supersedesJobId) {
      await resolveSupersededJob(this.repo, scope, dto.supersedesJobId, SPED_ECF_REAL_JOB_KIND, {
        start: periodStart,
        end: periodEnd,
      });
    }
    // Fork 7→(a): ano sem leiaute é 400 explícito (a lib lança Error puro; aqui vira ValidationError
    // para a OpenAPI "a year with no known layout is a 400" ser verdade em produção — review I-1).
    let codVer: string;
    try {
      codVer = resolveEcfCodVer(year, dto.fiscal.codVer);
    } catch (e) {
      throw new ValidationError(e instanceof Error ? e.message : String(e));
    }

    // ── X7 Fase B PR-4 (item 18): FORMA_APUR vem do perfil EFETIVO do ano — 'A' se ANUAL, senão 'T' (sem perfil
    // inclusive, como o e-Lalur: D-2026-10-05-X7-FASE-B-PR2-LACUNAS §1). Informado e diferente ⇒ 400.
    const perfil = await this.profiles.findByYear(scope, year);
    const formaApur: 'T' | 'A' = perfil && formaEfetiva(perfil.regime, perfil.formaApuracaoIrpjCsll) === 'ANUAL' ? 'A' : 'T';
    if (dto.fiscal.formaApur !== undefined && dto.fiscal.formaApur !== formaApur) {
      throw new ValidationError(
        `formaApur '${dto.fiscal.formaApur}' diverge do perfil fiscal de ${year}, que dá '${formaApur}' (${formaApur === 'A' ? 'anual' : 'trimestral'}) — a forma mora no perfil (X7 BRIEF B item 18).`,
      );
    }

    // ── Períodos — trimestral (Fork 5→(a)): T01..T04 derivados do Bloco 0; anual (itens 18–19): do perfil + apurações ──
    let periods: EcfRealPeriod[];
    let periodsN: EcfRealPeriod[] | undefined;
    let formaTribPer = dto.fiscal.formaTribPer;
    let mesBalRed: string | undefined;
    if (formaApur === 'A') {
      const meses = mesesEmAtividade(year, perfil!.inicioAtividadeEm, perfil!.encerramentoAtividadeEm);
      const anual = derivarEcfAnual(year, perfil!.inicioAtividadeEm, meses, await this.modosConfirmados(scope, year, meses));
      // Decisão do dono, 05/10 (lacuna 1 do PR-4): no anual o FORMA_TRIB_PER é derivado; o informado tem de bater.
      if (dto.fiscal.formaTribPer !== anual.formaTribPer) {
        throw new ValidationError(
          `formaTribPer '${dto.fiscal.formaTribPer}' diverge do derivado para a forma anual de ${year}: '${anual.formaTribPer}' ('R' no trimestre com mês em atividade, '0' fora — X7 BRIEF B item 18; Manual p.72).`,
        );
      }
      ({ periods, periodsN, formaTribPer, mesBalRed } = anual);
    } else {
      periods = quarterWindows(year).map((w) => ({
        perApur: w.perApur as EcfRealPeriod['perApur'],
        dtIni: w.dtIni,
        dtFin: w.dtFin,
      }));
    }
    const periodosDaParteB = periodosParteB(formaApur === 'A' ? 'ANUAL' : 'TRIMESTRAL');

    // ── Parte B fechada (ECF 3C item 11; X7 Fase B item 20): os 4 trimestres — ou o A00 no anual — materializados ──
    const closings = await this.lalurRepo.findClosingsForYear(scope, year);
    const closedQ = new Set(closings.map((c) => c.quarter));
    const firstOpen = periodosDaParteB.find((q) => !closedQ.has(q));
    if (firstOpen) {
      throw new ValidationError(
        formaApur === 'A'
          ? `Feche a Parte B do e-Lalur/e-Lacs de A00/${year} antes de gerar a ECF anual — na forma anual a Parte B só fecha no A00 (IN RFB 1.700/2017 art. 50 II; X7 BRIEF B item 20).`
          : `Feche a Parte B do e-Lalur/e-Lacs de ${firstOpen}/${year} (e dos trimestres seguintes) antes de gerar a ECF — o M500 e o E020 do exercício seguinte saem da materialização (Manual p.271).`,
      );
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
    if (mesBalRed !== undefined) SpedEcfRealGenerationService.assertLinhasNosPeriodos(entries, year, mesBalRed, periods, periodsN!);
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
    for (const q of periodosDaParteB) {
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
        formaTribPer,
        formaApur,
        mesBalRed,
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
      periodsN,
      lalur,
      parteB,
      movements,
      balances,
      codVer,
    };

    // BRIEF 3C item 17: `spedLine` lança Error puro em campo com '|' (dado pré-existente ao DTO que hoje recusa).
    // Varre ANTES de montar, nomeando registro + id/código (review M6); o try é a rede para o que a varredura não cobrir.
    SpedEcfRealGenerationService.assertNoPipe(entries, movementsRaw, liveAccounts);
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

    let job;
    try {
      job = await this.repo.createJob({
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
        periodStart,
        periodEnd,
        originalName: fileName,
        mimeType: 'text/plain',
        sizeBytes: buffer.length,
        sha256,
        totalRows: lines.length,
        supersedesJobId: isRetificadora ? dto.supersedesJobId : undefined,
      });
    } catch (error) {
      if (isSupersedesUniqueViolation(error)) {
        throw new ConflictError(
          `O job '${dto.supersedesJobId}' já foi retificado por outro job — só um sucessor por job (item 21).`,
        );
      }
      throw error;
    }

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
      // Review PR #368: limpa supersedesJobId no FAILED — senão a `@unique` trava o job
      // original para sempre (toda nova retificação bateria em 409 sem rota de saída).
      await this.repo.updateJob(scope, job.id, { status: 'FAILED', supersedesJobId: null });
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
      if (isRetificadora) {
        await this.audit.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: 'sped.ecf_rectified',
          targetType: 'data_exchange_job',
          targetId: job.id,
          payload: {
            jobId: job.id,
            supersedesJobId: dto.supersedesJobId ?? '',
            kind: SPED_ECF_REAL_JOB_KIND,
            year: String(year),
            sha256,
          },
        });
        // Review PR #368: TODAS as ECDs pendentes do ano, sem `limit`/paginação (mesmo padrão
        // do `SpedEcfGenerationService`).
        const ecdJobsPending = await this.repo.findEcdJobsPendingRectificationForYear(scope, year, tx);
        for (const ecdJob of ecdJobsPending) {
          await this.repo.updateJob(scope, ecdJob.id, { ecfRectificationRequired: false }, tx);
        }
      }
      return j;
    });

    endTimer({ success: true, jobId: job.id, kind: job.kind, unitId: scope.unitId });
    return toJobResponse(updated);
  }
}
