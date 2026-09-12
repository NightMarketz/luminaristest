import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import { Prisma } from 'generated/prisma';
import type { LalurEntry, LalurParteBAccount, LalurParteBMovement } from 'generated/prisma';
import {
  LALUR_ENTRY_ARCHIVED,
  LALUR_ENTRY_CREATED,
  LALUR_ENTRY_UPDATED,
  LALUR_MOVEMENT_ARCHIVED,
  LALUR_MOVEMENT_CREATED,
  LALUR_MOVEMENT_UPDATED,
  LALUR_PARTE_B_ARCHIVED,
  LALUR_PARTE_B_CLOSED,
  LALUR_PARTE_B_CREATED,
  LALUR_PARTE_B_REOPENED,
  LALUR_PARTE_B_UPDATED,
  LALUR_QUARTERS,
  LALUR_SYSTEM_PREJUIZO_HISTORICO,
  LALUR_TRIBUTOS,
  LIVRO_TRIBUTO,
  TRIBUTO_LIVRO,
  TRIBUTO_PREJUIZO_COD_PB_RFB,
  TRIBUTO_PREJUIZO_INDICADOR,
  findLinha,
  findParteBPadrao,
  isParteALivro,
  isPrejuizoIndicador,
  vigenteNoAno,
  type LalurLivro,
  type LalurQuarter,
  type LalurTributo,
} from '../models/Lalur.model';
import { refineLalurLine, refineLalurMovement } from '../dtos/LalurDto';
import type {
  ArchiveLalurInput,
  CreateLalurEntryInput,
  CreateLalurParteBAccountInput,
  CreateLalurParteBMovementInput,
  LalurParteBBalancesQueryInput,
  LalurParteBPeriodInput,
  ListLalurEntriesQueryInput,
  ListLalurParteBMovementsQueryInput,
  ListLalurParteBQueryInput,
  UpdateLalurEntryInput,
  UpdateLalurParteBAccountInput,
  UpdateLalurParteBMovementInput,
} from '../dtos/LalurDto';
import type { ILalurRepository, LalurClosingWithBalances, LalurEntryWithRelations, LalurMovementWithRelations } from '../repositories/ILalurRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingReportService } from './AccountingReportService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { natureToCodNat } from './SpedGenerationService';
import { quarterWindows } from './SpedEcfGenerationService';
import {
  balancesSha256,
  chainYear,
  computeQuarter,
  signed,
  toMagnitude,
  type ParteAMove,
  type ParteBMove,
  type QuarterBalance,
} from './lalurParteBBalances';
import { z } from 'zod';

/** O que o serviço lê do razão para derivar o PF/BC (D-P3.3) — só `incomeStatement`. */
export type LalurReportReader = Pick<AccountingReportService, 'incomeStatement'>;

/** Diagnóstico materializado × recomputado (BRIEF 3C §2.4). Valores em string (BigInt seguro no JSON). */
export interface LalurParteBBalancesDiagnostic {
  year: number;
  periods: Array<{
    quarter: LalurQuarter;
    closed: boolean;
    closedAt?: string;
    accounts: Array<{
      parteBId: string;
      codCtaB: string;
      codTributo: string;
      materialized?: BalanceView;
      recomputed: BalanceView;
      divergent: boolean;
    }>;
  }>;
  divergences: Array<{ quarter: LalurQuarter; codCtaB: string; codTributo: string; field: string; materialized: string; recomputed: string }>;
}
export interface BalanceView { sdIni: string; vlA: string; vlB: string; sdFim: string }

const view = (b: QuarterBalance): BalanceView => ({ sdIni: String(b.sdIni), vlA: String(b.vlA), vlB: String(b.vlB), sdFim: String(b.sdFim) });
const BALANCE_FIELDS = ['sdIni', 'vlA', 'vlB', 'sdFim'] as const;
const qIndex = (q: string) => (LALUR_QUARTERS as readonly string[]).indexOf(q);

/** Rename-on-key at archive (D-M2): frees the @@unique so the same code can be re-registered. */
export const deletedLalurCodigo = (id: string, codigo: string) => `deleted:${id}:${codigo}`;
export const deletedLalurCodCtaB = (id: string, codCtaB: string) => `deleted:${id}:${codCtaB}`;

/**
 * LalurService — e-Lalur / e-Lacs adjustment store (BE-INCR-SPED-ECF-FASE3B item 11, Fork 4→(b);
 * ADR EMENDA 2026-09-11 (2ª) D-M1..D-M5). FIRST-CLASS PRISMA: an adjustment is a LEGAL invariant of the
 * IRPJ/CSLL base, never DynamicTable. Pure catalog CRUD over two aggregates — it NEVER posts to the
 * ledger; the ECF generator (`SpedEcfRealGenerationService`) READS `findEntriesForYear` and serializes.
 *
 * What the service proves that the DTO cannot (depends on the catalog fixture, item 9 — every refusal
 * is a 400 carrying the code and the reason, never a silent drop; classe FAIL-1 do PR #66):
 *  - `codigo` exists in the sheet of `livro` (M300A/M350A/N500/N630A/N670);
 *  - the row is an ENTRY line (`tipo = E`) — CNA/CA/R are computed/labels by the PVA (Fork 3→a);
 *  - the row is in force for `year` (DT_INI ≤ year ≤ DT_FIM);
 *  - REGRA_IND_RELACAO (p.247, literal): TIPO_LANCAMENTO = P ⇒ IND_RELACAO = 1;
 *  - parteBId → live LalurParteBAccount in scope whose tributo matches the livro (M305 ⇒ 'I', M355 ⇒
 *    'C' — REGRA_PARTE_B_PARTE_A, p.237/p.250); accountId → live Account in scope (M310.COD_CTA ∈
 *    J050, p.252). Cross-scope ids are NotFoundError (tenancy, item 11).
 *  - M010.COD_PB_RFB exists in PARTEB_PADRAO for the tributo (REGRA_M010_COD_PB_RFB_TRIBUTO, p.237).
 * Every state change emits an AuditEvent in the SAME tx (T8) — payloads are ids/codes/cents only
 * (`histLancamento` is free text and never enters the hash-chained trail).
 */
export class LalurService {
  constructor(
    private readonly repo: ILalurRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    /** DRE YTD closing-exclusive — resultado do trimestre para a base do PF/BC (Fork F-3C-2 a, D-P3.3). */
    private readonly reports: LalurReportReader,
  ) {}

  // ── Catalog gate (item 9) ────────────────────────────────────────────────
  /** Resolves (livro, codigo, year) against the fixture; throws 400 with code + reason. */
  public static resolveLinha(livro: LalurLivro, codigo: string, year: number) {
    const row = findLinha(livro, codigo);
    if (!row) {
      throw new ValidationError(`Código '${codigo}' não existe na tabela dinâmica do livro '${livro}' (Leiaute 12).`);
    }
    if (row.tipo !== 'E') {
      throw new ValidationError(
        `Código '${codigo}' (${row.descricao}) é linha ${row.tipo} — calculada/rótulo do PVA, não é entrada (livro '${livro}').`,
      );
    }
    if (!vigenteNoAno(row, year)) {
      throw new ValidationError(
        `Código '${codigo}' (${row.descricao}) não vigora em ${year} (DT_INI ${row.dtIni ?? '—'}, DT_FIM ${row.dtFim ?? '—'}).`,
      );
    }
    return row;
  }

  /**
   * Refs da linha — chamado DENTRO da tx do create/update (BRIEF 3C item 16: a checagem pré-tx deixava a
   * janela archive×create aberta; re-ler a conta da Parte B e a Account na mesma `runTransaction` fecha —
   * memória `authoritative-gate-inside-tx`).
   */
  private async validateLineRefs(
    scope: AccountingScope,
    line: { livro: LalurLivro; codigo: string; year: number; indRelacao: string | null; parteBId: string | null; accountId: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const row = LalurService.resolveLinha(line.livro, line.codigo, line.year);
    if (!isParteALivro(line.livro)) return;
    // REGRA_IND_RELACAO (p.247, VERIFICADO): compensação de prejuízo relaciona-se só com a Parte B.
    if (row.tipoLanc === 'P' && line.indRelacao !== '1') {
      throw new ValidationError(
        `Código '${line.codigo}' é compensação de prejuízo (TIPO_LANCAMENTO=P): indRelacao tem de ser 1 (Manual p.247, REGRA_IND_RELACAO).`,
      );
    }
    if (line.parteBId) {
      const parteB = await this.repo.findParteBById(scope, line.parteBId, tx);
      if (!parteB || parteB.deletedAt) throw new NotFoundError(`Conta da Parte B '${line.parteBId}' não foi encontrada.`);
      const expected = LIVRO_TRIBUTO[line.livro];
      if (parteB.codTributo !== expected) {
        throw new ValidationError(
          `Conta da Parte B '${parteB.codCtaB}' é do tributo ${parteB.codTributo}; o livro '${line.livro}' exige ${expected} (Manual p.237, REGRA_PARTE_B_PARTE_A).`,
        );
      }
    }
    if (line.accountId) {
      const account = await this.accountRepo.findById(scope, line.accountId, tx);
      if (!account) throw new NotFoundError(`Conta contábil '${line.accountId}' não foi encontrada.`);
      // BRIEF 3C item 18: a regra do sinal do M310 (p.246) só define COD_NAT 1,2,3 (patrimonial) e 4
      // (resultado); natureza fora do domínio vira '09' e seria tratada como patrimonial em silêncio.
      const codNat = natureToCodNat(account.nature);
      if (!['01', '02', '03', '04'].includes(codNat)) {
        throw new ValidationError(
          `Conta contábil '${account.code}' tem natureza '${account.nature}' (COD_NAT ${codNat}) fora do domínio 01..04 da regra de sinal do M310/M360 (Manual p.246).`,
        );
      }
    }
  }

  /**
   * M312/M362 (Fork F-3C-3 a, D-P3.4): cada `journalEntryId` existe no escopo, está POSTADO (`entryNumber`
   * não-nulo — NUM_LCTO é Obrig.=Sim, p.254; nulo em Draft/PendingApproval) e sua data cai na janela do
   * trimestre do ajuste. Reversed permanece elegível (lançamento e estorno estão ambos no I200).
   */
  private async validateJournalLinks(scope: AccountingScope, ids: string[], year: number, quarter: string, tx?: Prisma.TransactionClient): Promise<void> {
    if (ids.length === 0) return;
    const found = await this.repo.findJournalEntriesForLinks(scope, ids, tx);
    const byId = new Map(found.map((j) => [j.id, j]));
    const w = quarterWindows(year).find((x) => x.perApur === quarter)!;
    for (const id of ids) {
      const j = byId.get(id);
      if (!j) throw new NotFoundError(`Lançamento contábil '${id}' não foi encontrado.`);
      if (j.entryNumber === null) {
        throw new ValidationError(`Lançamento contábil '${id}' ainda não foi postado (sem NUM_LCTO) — só lançamentos postados entram no M312/M362 (Manual p.254).`);
      }
      if (j.date < w.from || j.date > w.to) {
        throw new ValidationError(`Lançamento contábil '${id}' (${j.date.toISOString().slice(0, 10)}) está fora do período ${quarter}/${year} do ajuste (M312: lançamentos do período do M030, p.254).`);
      }
    }
  }

  /**
   * BRIEF 3C item 13 (INFERIDO): a compensação (`P`) não pode exceder o saldo da conta da Parte B no período.
   * Roda DEPOIS do write, dentro da tx (o recompute enxerga a linha nova; lançar aqui desfaz o write).
   */
  private async assertCompensacaoCabe(scope: AccountingScope, year: number, quarter: string, parteBId: string, tx: Prisma.TransactionClient): Promise<void> {
    const rec = await this.recomputeYear(scope, year, tx);
    const b = rec.get(quarter as LalurQuarter)?.get(parteBId);
    if (b && b.sdFim < 0n) {
      const acc = await this.repo.findParteBById(scope, parteBId, tx);
      throw new ValidationError(
        `Compensação excede o saldo da conta da Parte B '${acc?.codCtaB ?? parteBId}' em ${quarter}/${year}: saldo final ficaria ${toMagnitude(b.sdFim).cents} C (BRIEF 3C item 13 — prejuízo acumulado insuficiente).`,
      );
    }
  }

  // ── Entries ──────────────────────────────────────────────────────────────
  async listEntries(scope: AccountingScope, params: ListLalurEntriesQueryInput): Promise<LalurEntry[]> {
    if (!this.policy.canReadLalur(scope)) throw new ForbiddenError('Você não tem permissão para ler o e-Lalur.');
    return this.repo.findManyEntries(scope, {
      year: params.year,
      quarter: params.quarter,
      livro: params.livro,
      includeArchived: params.includeArchived,
    });
  }

  async getEntry(scope: AccountingScope, id: string): Promise<LalurEntry> {
    if (!this.policy.canReadLalur(scope)) throw new ForbiddenError('Você não tem permissão para ler o e-Lalur.');
    const entry = await this.repo.findEntryById(scope, id);
    if (!entry) throw new NotFoundError(`Ajuste '${id}' não foi encontrado.`);
    return entry;
  }

  async createEntry(scope: AccountingScope, dto: CreateLalurEntryInput): Promise<LalurEntry> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    const line = {
      livro: dto.livro,
      codigo: dto.codigo,
      year: dto.year,
      indRelacao: dto.indRelacao ?? null,
      parteBId: dto.parteBId ?? null,
      accountId: dto.accountId ?? null,
    };
    LalurService.resolveLinha(dto.livro, dto.codigo, dto.year); // catálogo: fora da tx (fixture, não estado)
    const { userId, unitId } = accountingScopeWhere(scope);
    try {
      return await this.repo.runTransaction(async (tx) => {
        await this.validateLineRefs(scope, line, tx); // item 16: refs re-lidas DENTRO da tx
        await this.validateJournalLinks(scope, dto.journalEntryIds ?? [], dto.year, dto.quarter, tx);
        const created = await this.repo.createEntry(
          {
            userId,
            unitId,
            year: dto.year,
            quarter: dto.quarter,
            livro: dto.livro,
            codigo: dto.codigo,
            valorCents: BigInt(dto.valorCents),
            indRelacao: line.indRelacao,
            histLancamento: dto.histLancamento ?? null,
            parteBId: line.parteBId,
            accountId: line.accountId,
            createdById: scope.actorUserId,
          },
          tx,
        );
        if (dto.processos) await this.repo.replaceEntryProcesses(created.id, dto.processos, tx);
        if (dto.journalEntryIds) await this.repo.replaceEntryJournalLinks(created.id, dto.journalEntryIds, tx);
        if (line.parteBId && findLinha(dto.livro, dto.codigo)?.tipoLanc === 'P') {
          await this.assertCompensacaoCabe(scope, dto.year, dto.quarter, line.parteBId, tx);
        }
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: LALUR_ENTRY_CREATED,
          targetType: 'lalur_entry',
          targetId: created.id,
          payload: this.entryPayload(created),
        });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ValidationError(
          `Já existe um ajuste com o código '${dto.codigo}' em ${dto.livro}/${dto.quarter}/${dto.year} (uma linha por código por período — Manual p.244).`,
        );
      }
      throw error;
    }
  }

  async updateEntry(scope: AccountingScope, id: string, dto: UpdateLalurEntryInput): Promise<LalurEntry> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    const existing = await this.repo.findEntryById(scope, id);
    if (!existing || existing.deletedAt) throw new NotFoundError(`Ajuste '${id}' não foi encontrado.`);

    // Merge + full re-validation with the SAME conditionals as create (REGRA_RELACAO_INEXISTENTE / D-M3).
    const merged = {
      livro: existing.livro as LalurLivro,
      codigo: existing.codigo,
      year: existing.year,
      valorCents: dto.valorCents ?? Number(existing.valorCents),
      indRelacao: dto.indRelacao ?? existing.indRelacao ?? undefined,
      parteBId: dto.parteBId === undefined ? existing.parteBId ?? undefined : dto.parteBId ?? undefined,
      accountId: dto.accountId === undefined ? existing.accountId ?? undefined : dto.accountId ?? undefined,
      histLancamento:
        dto.histLancamento === undefined ? existing.histLancamento ?? undefined : dto.histLancamento ?? undefined,
    };
    const check = z
      .object({})
      .passthrough()
      .superRefine((_, ctx) => refineLalurLine({ ...merged, journalEntryIds: dto.journalEntryIds }, ctx))
      .safeParse({});
    if (!check.success) throw new ValidationError(check.error.issues.map((i) => i.message).join(' '));
    LalurService.resolveLinha(merged.livro, merged.codigo, merged.year);
    const refs = {
      livro: merged.livro,
      codigo: merged.codigo,
      year: merged.year,
      indRelacao: merged.indRelacao ?? null,
      parteBId: merged.parteBId ?? null,
      accountId: merged.accountId ?? null,
    };

    return this.repo.runTransaction(async (tx) => {
      await this.validateLineRefs(scope, refs, tx); // item 16
      await this.validateJournalLinks(scope, dto.journalEntryIds ?? [], existing.year, existing.quarter, tx);
      const updated = await this.repo.updateEntry(
        scope,
        id,
        {
          valorCents: BigInt(merged.valorCents),
          indRelacao: merged.indRelacao ?? null,
          histLancamento: merged.histLancamento ?? null,
          parteB: merged.parteBId ? { connect: { id: merged.parteBId } } : { disconnect: true },
          account: merged.accountId ? { connect: { id: merged.accountId } } : { disconnect: true },
        },
        tx,
      );
      if (dto.processos) await this.repo.replaceEntryProcesses(id, dto.processos, tx);
      if (dto.journalEntryIds) await this.repo.replaceEntryJournalLinks(id, dto.journalEntryIds, tx);
      if (merged.parteBId && findLinha(merged.livro, merged.codigo)?.tipoLanc === 'P') {
        await this.assertCompensacaoCabe(scope, existing.year, existing.quarter, merged.parteBId, tx);
      }
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: LALUR_ENTRY_UPDATED,
        targetType: 'lalur_entry',
        targetId: updated.id,
        payload: this.entryPayload(updated),
      });
      return updated;
    });
  }

  async archiveEntry(scope: AccountingScope, id: string, _dto: ArchiveLalurInput): Promise<LalurEntry> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    const entry = await this.repo.findEntryById(scope, id);
    if (!entry) throw new NotFoundError(`Ajuste '${id}' não foi encontrado.`);
    if (entry.deletedAt) return entry; // idempotent
    return this.repo.runTransaction(async (tx) => {
      const archived = await this.repo.updateEntry(
        scope,
        id,
        { deletedAt: new Date(), codigo: deletedLalurCodigo(id, entry.codigo) }, // D-M2 rename-on-key
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: LALUR_ENTRY_ARCHIVED,
        targetType: 'lalur_entry',
        targetId: id,
        payload: { entryId: id, livro: entry.livro, codigo: entry.codigo, quarter: entry.quarter, year: String(entry.year) },
      });
      return archived;
    });
  }

  private entryPayload(e: LalurEntry): Record<string, unknown> {
    return {
      entryId: e.id,
      livro: e.livro,
      codigo: e.codigo,
      quarter: e.quarter,
      year: String(e.year),
      valorCents: e.valorCents,
      indRelacao: e.indRelacao,
      parteBId: e.parteBId,
      accountId: e.accountId,
    };
  }

  // ── Parte B (M010) ───────────────────────────────────────────────────────
  private assertCodPbRfb(codPbRfb: string, codTributo: string): void {
    const padrao = findParteBPadrao(codPbRfb);
    if (!padrao || (padrao.tributo !== 'A' && padrao.tributo !== codTributo)) {
      throw new ValidationError(
        `COD_PB_RFB '${codPbRfb}' não existe na tabela padrão da Parte B para o tributo ${codTributo} (Manual p.237, REGRA_M010_COD_PB_RFB_TRIBUTO).`,
      );
    }
  }

  async listParteB(scope: AccountingScope, params: ListLalurParteBQueryInput): Promise<LalurParteBAccount[]> {
    if (!this.policy.canReadLalur(scope)) throw new ForbiddenError('Você não tem permissão para ler o e-Lalur.');
    return this.repo.findManyParteB(scope, { codTributo: params.codTributo, includeArchived: params.includeArchived });
  }

  async createParteB(scope: AccountingScope, dto: CreateLalurParteBAccountInput): Promise<LalurParteBAccount> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    this.assertCodPbRfb(dto.codPbRfb, dto.codTributo);
    const { userId, unitId } = accountingScopeWhere(scope);
    try {
      return await this.repo.runTransaction(async (tx) => {
        const created = await this.repo.createParteB(
          {
            userId,
            unitId,
            codCtaB: dto.codCtaB,
            descricao: dto.descricao,
            dtCriacao: new Date(`${dto.dtCriacao}T00:00:00.000Z`),
            codPbRfb: dto.codPbRfb,
            dtLimite: dto.dtLimite ? new Date(`${dto.dtLimite}T00:00:00.000Z`) : null,
            codTributo: dto.codTributo,
            saldoIniCents: BigInt(dto.saldoIniCents),
            indSaldoIni: dto.indSaldoIni,
            cnpjSitEsp: dto.cnpjSitEsp ?? null,
            createdById: scope.actorUserId,
          },
          tx,
        );
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: LALUR_PARTE_B_CREATED,
          targetType: 'lalur_parte_b_account',
          targetId: created.id,
          payload: this.parteBPayload(created),
        });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ValidationError(
          `Já existe uma conta da Parte B com o código '${dto.codCtaB}' para o tributo ${dto.codTributo} (chave M010 = COD_CTA_B + COD_TRIBUTO, Manual p.237).`,
        );
      }
      throw error;
    }
  }

  async updateParteB(scope: AccountingScope, id: string, dto: UpdateLalurParteBAccountInput): Promise<LalurParteBAccount> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    const existing = await this.repo.findParteBById(scope, id);
    if (!existing || existing.deletedAt) throw new NotFoundError(`Conta da Parte B '${id}' não foi encontrada.`);
    if (dto.codPbRfb !== undefined) this.assertCodPbRfb(dto.codPbRfb, existing.codTributo);
    return this.repo.runTransaction(async (tx) => {
      const updated = await this.repo.updateParteB(
        scope,
        id,
        {
          ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
          ...(dto.dtCriacao !== undefined ? { dtCriacao: new Date(`${dto.dtCriacao}T00:00:00.000Z`) } : {}),
          ...(dto.codPbRfb !== undefined ? { codPbRfb: dto.codPbRfb } : {}),
          ...(dto.dtLimite !== undefined ? { dtLimite: dto.dtLimite ? new Date(`${dto.dtLimite}T00:00:00.000Z`) : null } : {}),
          ...(dto.saldoIniCents !== undefined ? { saldoIniCents: BigInt(dto.saldoIniCents) } : {}),
          ...(dto.indSaldoIni !== undefined ? { indSaldoIni: dto.indSaldoIni } : {}),
          ...(dto.cnpjSitEsp !== undefined ? { cnpjSitEsp: dto.cnpjSitEsp } : {}),
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: LALUR_PARTE_B_UPDATED,
        targetType: 'lalur_parte_b_account',
        targetId: updated.id,
        payload: this.parteBPayload(updated),
      });
      return updated;
    });
  }

  async archiveParteB(scope: AccountingScope, id: string, _dto: ArchiveLalurInput): Promise<LalurParteBAccount> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    const account = await this.repo.findParteBById(scope, id);
    if (!account) throw new NotFoundError(`Conta da Parte B '${id}' não foi encontrada.`);
    if (account.deletedAt) return account; // idempotent
    return this.repo.runTransaction(async (tx) => {
      // Clean removal order, DENTRO da tx (BRIEF 3C item 16): uma linha da Parte A ou um M410 vivos
      // apontando para cá emitiriam M305/M410 para uma conta morta.
      const live = await this.repo.countLiveEntriesByParteB(scope, id, tx);
      if (live > 0) throw new ValidationError('Arquive os ajustes relacionados antes de arquivar a conta da Parte B.');
      const movs = await this.repo.countLiveMovementsByParteB(scope, id, tx);
      if (movs > 0) throw new ValidationError('Arquive os movimentos da Parte B (M410) relacionados antes de arquivar a conta.');
      const archived = await this.repo.updateParteB(
        scope,
        id,
        { deletedAt: new Date(), codCtaB: deletedLalurCodCtaB(id, account.codCtaB) }, // D-M2 rename-on-key
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: LALUR_PARTE_B_ARCHIVED,
        targetType: 'lalur_parte_b_account',
        targetId: id,
        payload: { parteBId: id, codCtaB: account.codCtaB, codTributo: account.codTributo },
      });
      return archived;
    });
  }

  private parteBPayload(a: LalurParteBAccount): Record<string, unknown> {
    return {
      parteBId: a.id,
      codCtaB: a.codCtaB,
      codTributo: a.codTributo,
      codPbRfb: a.codPbRfb,
      saldoIniCents: a.saldoIniCents,
      indSaldoIni: a.indSaldoIni,
    };
  }

  // ═══ ECF Fase 3C — Parte B: M410 (ADR EMENDA 2026-09-12, 3ª) ═══════════════════════════════

  /** Contrapartida viva, mesmo escopo e MESMO tributo (REGRA_MESMO_TRIBUTO, p.269). */
  private async validateContrapartida(scope: AccountingScope, conta: LalurParteBAccount, contrapartidaId: string, tx: Prisma.TransactionClient): Promise<void> {
    const ctp = await this.repo.findParteBById(scope, contrapartidaId, tx);
    if (!ctp || ctp.deletedAt) throw new NotFoundError(`Conta da Parte B (contrapartida) '${contrapartidaId}' não foi encontrada.`);
    if (ctp.codTributo !== conta.codTributo) {
      throw new ValidationError(
        `Contrapartida '${ctp.codCtaB}' é do tributo ${ctp.codTributo}; a conta '${conta.codCtaB}' é ${conta.codTributo} — as duas têm de ser do mesmo tributo (Manual p.269, REGRA_MESMO_TRIBUTO).`,
      );
    }
  }

  async listMovements(scope: AccountingScope, params: ListLalurParteBMovementsQueryInput): Promise<LalurParteBMovement[]> {
    if (!this.policy.canReadLalur(scope)) throw new ForbiddenError('Você não tem permissão para ler o e-Lalur.');
    return this.repo.findManyMovements(scope, { year: params.year, quarter: params.quarter, parteBId: params.parteBId, includeArchived: params.includeArchived });
  }

  async createMovement(scope: AccountingScope, dto: CreateLalurParteBMovementInput): Promise<LalurParteBMovement> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.repo.runTransaction(async (tx) => {
      const conta = await this.repo.findParteBById(scope, dto.parteBId, tx);
      if (!conta || conta.deletedAt) throw new NotFoundError(`Conta da Parte B '${dto.parteBId}' não foi encontrada.`);
      if (dto.contrapartidaId) await this.validateContrapartida(scope, conta, dto.contrapartidaId, tx);
      const created = await this.repo.createMovement(
        {
          userId,
          unitId,
          parteBId: conta.id,
          year: dto.year,
          quarter: dto.quarter,
          codTributo: conta.codTributo, // DERIVADO — nunca input (D-P2)
          valorCents: BigInt(dto.valorCents),
          indicador: dto.indicador,
          contrapartidaId: dto.contrapartidaId ?? null,
          historico: dto.historico,
          indLanAnt: dto.indLanAnt,
          origem: 'user',
          createdById: scope.actorUserId,
        },
        tx,
      );
      if (dto.processos) await this.repo.replaceMovementProcesses(created.id, dto.processos, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: LALUR_MOVEMENT_CREATED,
        targetType: 'lalur_parte_b_movement',
        targetId: created.id,
        payload: this.movementPayload(created),
      });
      return created;
    });
  }

  async updateMovement(scope: AccountingScope, id: string, dto: UpdateLalurParteBMovementInput): Promise<LalurParteBMovement> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    const existing = await this.repo.findMovementById(scope, id);
    if (!existing || existing.deletedAt) throw new NotFoundError(`Movimento da Parte B '${id}' não foi encontrado.`);
    if (existing.origem === 'system' && (dto.valorCents !== undefined || dto.indicador !== undefined)) {
      throw new ValidationError('Movimento PF/BC derivado pelo fechamento não aceita alteração de valor/indicador — arquive-o; o próximo fechamento o recria (Fork F-3C-2 a).');
    }
    const merged = {
      indicador: dto.indicador ?? existing.indicador,
      contrapartidaId: dto.contrapartidaId === undefined ? existing.contrapartidaId : dto.contrapartidaId,
      valorCents: dto.valorCents ?? Number(existing.valorCents),
      historico: dto.historico ?? existing.historico,
      indLanAnt: dto.indLanAnt ?? existing.indLanAnt,
    };
    const check = z.object({}).passthrough().superRefine((_, ctx) => refineLalurMovement(merged, ctx)).safeParse({});
    if (!check.success) throw new ValidationError(check.error.issues.map((i) => i.message).join(' '));
    return this.repo.runTransaction(async (tx) => {
      const conta = await this.repo.findParteBById(scope, existing.parteBId, tx);
      if (!conta || conta.deletedAt) throw new NotFoundError(`Conta da Parte B '${existing.parteBId}' não foi encontrada.`);
      if (merged.contrapartidaId) await this.validateContrapartida(scope, conta, merged.contrapartidaId, tx);
      const updated = await this.repo.updateMovement(
        scope,
        id,
        {
          indicador: merged.indicador,
          valorCents: BigInt(merged.valorCents),
          historico: merged.historico,
          indLanAnt: merged.indLanAnt,
          contrapartida: merged.contrapartidaId ? { connect: { id: merged.contrapartidaId } } : { disconnect: true },
        },
        tx,
      );
      if (dto.processos) await this.repo.replaceMovementProcesses(id, dto.processos, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: LALUR_MOVEMENT_UPDATED,
        targetType: 'lalur_parte_b_movement',
        targetId: id,
        payload: this.movementPayload(updated),
      });
      return updated;
    });
  }

  async archiveMovement(scope: AccountingScope, id: string, _dto: ArchiveLalurInput): Promise<LalurParteBMovement> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    const mv = await this.repo.findMovementById(scope, id);
    if (!mv) throw new NotFoundError(`Movimento da Parte B '${id}' não foi encontrado.`);
    if (mv.deletedAt) return mv; // idempotent
    return this.repo.runTransaction(async (tx) => {
      const archived = await this.repo.updateMovement(scope, id, { deletedAt: new Date() }, tx); // sem chave: sem rename-on-key
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: LALUR_MOVEMENT_ARCHIVED,
        targetType: 'lalur_parte_b_movement',
        targetId: id,
        payload: this.movementPayload(mv),
      });
      return archived;
    });
  }

  /** ids/período/indicador/valor — `historico` é texto livre e NUNCA entra na trilha (item 4 do BRIEF). */
  private movementPayload(m: LalurParteBMovement): Record<string, unknown> {
    return {
      movementId: m.id,
      parteBId: m.parteBId,
      contrapartidaId: m.contrapartidaId,
      year: String(m.year),
      quarter: m.quarter,
      indicador: m.indicador,
      valorCents: m.valorCents,
      origem: m.origem,
    };
  }

  // ═══ ECF Fase 3C — fechamento trimestral da Parte B (Fork N-1 a, C1/C3) + M500 ═══════════════

  /** Contas do M010 do exercício: vivas e nascidas até 31/12 (REGRA_MENOR_IGUAL_DT_FIN, mesma regra da geração). */
  private async accountsOfYear(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<LalurParteBAccount[]> {
    const yearEnd = `${year}-12-31`;
    return (await this.repo.findManyParteB(scope, { includeArchived: false }, tx)).filter((a) => a.dtCriacao.toISOString().slice(0, 10) <= yearEnd);
  }

  /** Saldo de abertura da conta pela COLUNA (âncora), com REGRA_DT_AP_ZERO (p.237). */
  public static anchorOpening(a: LalurParteBAccount, year: number): bigint {
    const dtApLal = a.dtCriacao.toISOString().slice(0, 10);
    if (dtApLal >= `${year}-01-01`) {
      if (a.saldoIniCents !== 0n) {
        throw new ValidationError(
          `Conta da Parte B '${a.codCtaB}' (${a.codTributo}) foi criada em ${dtApLal}, dentro de ${year}: VL_SALDO_INI tem de ser 0 (Manual p.237, REGRA_DT_AP_ZERO).`,
        );
      }
      return 0n;
    }
    return signed(a.saldoIniCents, a.indSaldoIni);
  }

  /**
   * C3 — sdIni(N, T01) por conta: `balance(N−1, T04).sdFim` se o T04 de N−1 estiver fechado; senão a coluna
   * (âncora). Guarda de continuidade: existe fechamento em exercício < N e (N−1, T04) NÃO está fechado ⇒ 400.
   */
  public async openingBalances(scope: AccountingScope, year: number, accounts: LalurParteBAccount[], tx?: Prisma.TransactionClient): Promise<Map<string, bigint>> {
    const prev = await this.repo.findClosing(scope, year - 1, 'T04', tx);
    if (!prev && (await this.repo.existsClosingBefore(scope, year, tx))) {
      throw new ValidationError(
        `Feche os quatro trimestres de ${year - 1} antes de operar a Parte B de ${year}: o saldo inicial de ${year} é o saldo final de ${year - 1}/T04 (Manual p.271, REGRA_SALDOS_M010_E020).`,
      );
    }
    const fromPrev = new Map(prev?.balances.map((b) => [b.parteBId, signed(b.sdFimCents, b.indSdFim)]) ?? []);
    return new Map(accounts.map((a) => [a.id, fromPrev.get(a.id) ?? LalurService.anchorOpening(a, year)]));
  }

  /** Movimentos do exercício agrupados por trimestre, já na forma da aritmética pura. */
  private movesByQuarter(entries: LalurEntryWithRelations[], movements: LalurMovementWithRelations[]) {
    const out = new Map<LalurQuarter, { movesA: ParteAMove[]; movesB: ParteBMove[] }>(LALUR_QUARTERS.map((q) => [q, { movesA: [], movesB: [] }]));
    for (const e of entries) {
      if (!e.parteBId || !isParteALivro(e.livro)) continue;
      const row = findLinha(e.livro, e.codigo);
      if (!row?.tipoLanc || row.tipoLanc === 'R') throw new ValidationError(`Ajuste ${e.id}: código '${e.codigo}' sem TIPO_LANCAMENTO no catálogo (livro ${e.livro}).`);
      out.get(e.quarter as LalurQuarter)?.movesA.push({ parteBId: e.parteBId, tipoLanc: row.tipoLanc, valorCents: e.valorCents });
    }
    for (const m of movements) {
      out.get(m.quarter as LalurQuarter)?.movesB.push({ parteBId: m.parteBId, contrapartidaId: m.contrapartidaId, indicador: m.indicador, valorCents: m.valorCents });
    }
    return out;
  }

  /** Recompute encadeado do exercício inteiro a partir da abertura (C3) sobre o store ATUAL — o lado "recomputed" do diagnóstico. */
  public async recomputeYear(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<Map<LalurQuarter, Map<string, QuarterBalance>>> {
    const accounts = await this.accountsOfYear(scope, year, tx);
    const opening = await this.openingBalances(scope, year, accounts, tx);
    const byQ = this.movesByQuarter(await this.repo.findEntriesForYear(scope, year, tx), await this.repo.findMovementsForYear(scope, year, tx));
    return chainYear(
      accounts.map((a) => a.id),
      opening,
      LALUR_QUARTERS.map((q) => ({ quarter: q, ...byQ.get(q)! })),
    );
  }

  /**
   * Base do tributo no trimestre (D-P3.3, INFERIDO — oráculo PVA 2P-4): resultado contábil do trimestre
   * (DRE YTD closing-exclusive: fim T − fim T−1) + Σ adições − Σ exclusões das linhas vivas do livro do
   * tributo no período. `P` e `L` não entram. Lido FORA da tx do fechamento (o razão não é escrito por ela).
   */
  private async baseDoTributo(scope: AccountingScope, year: number, quarter: LalurQuarter, tributo: LalurTributo, entries: LalurEntryWithRelations[]): Promise<bigint> {
    const windows = quarterWindows(year);
    const qi = qIndex(quarter);
    const ytd = BigInt((await this.reports.incomeStatement(scope, windows[qi].to)).netResult.amountCents);
    const prev = qi === 0 ? 0n : BigInt((await this.reports.incomeStatement(scope, windows[qi - 1].to)).netResult.amountCents);
    let base = ytd - prev;
    const livro = TRIBUTO_LIVRO[tributo];
    for (const e of entries) {
      if (e.livro !== livro || e.quarter !== quarter) continue;
      const tipo = findLinha(livro, e.codigo)?.tipoLanc;
      if (tipo === 'A') base += e.valorCents;
      else if (tipo === 'E') base -= e.valorCents;
    }
    return base;
  }

  /**
   * POST /lalur/parte-b/close — materializa o M500 do período (BRIEF item 10) e deriva o PF/BC (Fork F-3C-2 a).
   * Idempotente: refechar recalcula se nenhum período posterior estiver fechado. Gate DENTRO da tx.
   */
  async closeParteB(scope: AccountingScope, dto: LalurParteBPeriodInput): Promise<LalurClosingWithBalances> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    const { year, quarter } = dto;
    const qi = qIndex(quarter);
    // Base do PF/BC lida do razão antes da tx (o fechamento não escreve no razão).
    const entriesPre = await this.repo.findEntriesForYear(scope, year);
    const bases = new Map<LalurTributo, bigint>();
    for (const t of LALUR_TRIBUTOS) bases.set(t, await this.baseDoTributo(scope, year, quarter, t, entriesPre));

    const { userId, unitId } = accountingScopeWhere(scope);
    return this.repo.runTransaction(async (tx) => {
      const closings = await this.repo.findClosingsForYear(scope, year, tx);
      const byQ = new Map(closings.map((c) => [c.quarter, c]));
      const later = LALUR_QUARTERS.slice(qi + 1).find((q) => byQ.has(q));
      if (later) throw new ValidationError(`${later}/${year} já está fechado — reabra-o antes de (re)fechar ${quarter}/${year} (ordem limpa, p.271).`);
      const prevQ = qi > 0 ? LALUR_QUARTERS[qi - 1] : null;
      if (prevQ && !byQ.has(prevQ)) throw new ValidationError(`Feche ${prevQ}/${year} antes de ${quarter}/${year}: o saldo inicial do período é o saldo final do anterior (Manual p.271).`);

      const accounts = await this.accountsOfYear(scope, year, tx);
      const sdIni = prevQ
        ? new Map(byQ.get(prevQ)!.balances.map((b) => [b.parteBId, signed(b.sdFimCents, b.indSdFim)]))
        : await this.openingBalances(scope, year, accounts, tx); // T01: C3 (guarda de continuidade dentro)

      // ── PF/BC derivado (Fork F-3C-2 a; C4) ──
      const liveMovs = (await this.repo.findManyMovements(scope, { year, quarter, includeArchived: false }, tx));
      for (const tributo of LALUR_TRIBUTOS) {
        const indicador = TRIBUTO_PREJUIZO_INDICADOR[tributo];
        const existing = liveMovs.filter((m) => m.origem === 'system' && m.indicador === indicador);
        const base = bases.get(tributo)!;
        if (base < 0n) {
          const codes = TRIBUTO_PREJUIZO_COD_PB_RFB[tributo];
          const targets = accounts.filter((a) => a.codTributo === tributo && codes.includes(a.codPbRfb));
          if (targets.length === 0) {
            throw new ValidationError(
              `Base do ${tributo === 'I' ? 'IRPJ' : 'CSLL'} negativa em ${quarter}/${year} (${-base} centavos) e não há conta da Parte B de prejuízo cadastrada: cadastre a conta com COD_PB_RFB ${codes[0]} (${tributo}) antes de fechar ${quarter} (EMENDA 3ª, C4).`,
            );
          }
          if (targets.length > 1) {
            throw new ValidationError(
              `Mais de uma conta de prejuízo viva para o tributo ${tributo} (${targets.map((a) => a.codCtaB).join(', ')}): a derivação do ${indicador} é ambígua — lance o M410 ${indicador} manualmente (BRIEF 3C item 6).`,
            );
          }
          const target = targets[0];
          const keep = existing.find((m) => m.parteBId === target.id);
          for (const m of existing) if (m !== keep) await this.repo.updateMovement(scope, m.id, { deletedAt: new Date() }, tx);
          if (keep) {
            if (keep.valorCents !== -base) await this.repo.updateMovement(scope, keep.id, { valorCents: -base }, tx);
          } else {
            await this.repo.createMovement(
              { userId, unitId, parteBId: target.id, year, quarter, codTributo: tributo, valorCents: -base, indicador, contrapartidaId: null, historico: LALUR_SYSTEM_PREJUIZO_HISTORICO, indLanAnt: 'N', origem: 'system', createdById: scope.actorUserId },
              tx,
            );
          }
        } else {
          for (const m of existing) await this.repo.updateMovement(scope, m.id, { deletedAt: new Date() }, tx);
        }
      }

      // ── Saldos do período (item 7) ──
      const byQuarter = this.movesByQuarter(await this.repo.findEntriesForYear(scope, year, tx), await this.repo.findMovementsForYear(scope, year, tx));
      const { movesA, movesB } = byQuarter.get(quarter)!;
      const balances = computeQuarter(accounts.map((a) => a.id), sdIni, movesA, movesB);
      // item 13: conta que recebeu compensação (P) não pode virar credora
      const compensadas = new Set(movesA.filter((m) => m.tipoLanc === 'P').map((m) => m.parteBId));
      for (const id of compensadas) {
        const b = balances.get(id)!;
        if (b.sdFim < 0n) {
          const acc = accounts.find((a) => a.id === id)!;
          throw new ValidationError(`Compensação excede o saldo da conta da Parte B '${acc.codCtaB}' em ${quarter}/${year} (saldo final ${-b.sdFim} C) — BRIEF 3C item 13.`);
        }
      }

      const accById = new Map(accounts.map((a) => [a.id, a]));
      const sha = balancesSha256([...balances.values()].map((b) => ({ codCtaB: accById.get(b.parteBId)!.codCtaB, codTributo: accById.get(b.parteBId)!.codTributo, b })));
      const previous = byQ.get(quarter);
      if (previous) await this.repo.deleteClosing(previous.id, tx); // refechar substitui
      const closing = await this.repo.createClosing(
        { userId, unitId, year, quarter, balancesSha256: sha, closedById: scope.actorUserId },
        [...balances.values()].map((b) => {
          const si = toMagnitude(b.sdIni), a = toMagnitude(b.vlA), pb = toMagnitude(b.vlB), sf = toMagnitude(b.sdFim);
          return { parteBId: b.parteBId, sdIniCents: si.cents, indSdIni: si.ind, vlParteACents: a.cents, indVlParteA: a.ind, vlParteBCents: pb.cents, indVlParteB: pb.ind, sdFimCents: sf.cents, indSdFim: sf.ind };
        }),
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: LALUR_PARTE_B_CLOSED,
        targetType: 'lalur_parte_b_closing',
        targetId: closing.id,
        payload: { closingId: closing.id, year: String(year), quarter, accounts: String(balances.size), balancesSha256: sha, reclosed: String(Boolean(previous)) },
      });
      return closing;
    });
  }

  /** POST /lalur/parte-b/reopen — apaga a materialização do período (400 se período posterior fechado). */
  async reopenParteB(scope: AccountingScope, dto: LalurParteBPeriodInput): Promise<{ year: number; quarter: string; reopened: true }> {
    if (!this.policy.canManageLalur(scope)) throw new ForbiddenError('Você não tem permissão para gerir o e-Lalur.');
    const { year, quarter } = dto;
    const qi = qIndex(quarter);
    return this.repo.runTransaction(async (tx) => {
      const closings = await this.repo.findClosingsForYear(scope, year, tx);
      const target = closings.find((c) => c.quarter === quarter);
      if (!target) throw new NotFoundError(`${quarter}/${year} não está fechado.`);
      const later = LALUR_QUARTERS.slice(qi + 1).find((q) => closings.some((c) => c.quarter === q));
      if (later) throw new ValidationError(`${later}/${year} está fechado — reabra-o antes de reabrir ${quarter}/${year} (ordem limpa, p.271).`);
      await this.repo.deleteClosing(target.id, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: LALUR_PARTE_B_REOPENED,
        targetType: 'lalur_parte_b_closing',
        targetId: target.id,
        payload: { closingId: target.id, year: String(year), quarter, accounts: String(target.balances.length), balancesSha256: target.balancesSha256 },
      });
      return { year, quarter, reopened: true as const };
    });
  }

  /**
   * GET /lalur/parte-b/balances — diagnóstico materializado × recomputado (BRIEF item 11, §2.4). A geração
   * chama o mesmo método e recusa com `divergences.length > 0`.
   */
  async parteBBalances(scope: AccountingScope, params: LalurParteBBalancesQueryInput): Promise<LalurParteBBalancesDiagnostic> {
    if (!this.policy.canReadLalur(scope)) throw new ForbiddenError('Você não tem permissão para ler o e-Lalur.');
    return this.diagnoseYear(scope, params.year);
  }

  public async diagnoseYear(scope: AccountingScope, year: number, tx?: Prisma.TransactionClient): Promise<LalurParteBBalancesDiagnostic> {
    const closings = await this.repo.findClosingsForYear(scope, year, tx);
    const byQ = new Map(closings.map((c) => [c.quarter, c]));
    const accounts = await this.accountsOfYear(scope, year, tx);
    const accById = new Map(accounts.map((a) => [a.id, a]));
    const recomputed = await this.recomputeYear(scope, year, tx);
    const out: LalurParteBBalancesDiagnostic = { year, periods: [], divergences: [] };
    for (const quarter of LALUR_QUARTERS) {
      const closing = byQ.get(quarter);
      const rec = recomputed.get(quarter) ?? new Map<string, QuarterBalance>();
      const mat = new Map(closing?.balances.map((b) => [b.parteBId, { parteBId: b.parteBId, sdIni: signed(b.sdIniCents, b.indSdIni), vlA: signed(b.vlParteACents, b.indVlParteA), vlB: signed(b.vlParteBCents, b.indVlParteB), sdFim: signed(b.sdFimCents, b.indSdFim) } as QuarterBalance]) ?? []);
      const ids = [...new Set([...rec.keys(), ...mat.keys()])].sort((x, y) => {
        const a = accById.get(x) ?? closing?.balances.find((b) => b.parteBId === x)?.parteB;
        const b = accById.get(y) ?? closing?.balances.find((z) => z.parteBId === y)?.parteB;
        return (a?.codTributo ?? '').localeCompare(b?.codTributo ?? '') || (a?.codCtaB ?? '').localeCompare(b?.codCtaB ?? '');
      });
      const rows = ids.map((id) => {
        const acc = accById.get(id) ?? closing!.balances.find((b) => b.parteBId === id)!.parteB;
        const r = rec.get(id) ?? { parteBId: id, sdIni: 0n, vlA: 0n, vlB: 0n, sdFim: 0n };
        const m = mat.get(id);
        let divergent = false;
        if (closing) {
          if (!m || !rec.has(id)) {
            divergent = true;
            out.divergences.push({ quarter, codCtaB: acc.codCtaB, codTributo: acc.codTributo, field: m ? 'conta' : 'conta', materialized: m ? 'presente' : 'ausente', recomputed: rec.has(id) ? 'presente' : 'ausente' });
          } else {
            for (const f of BALANCE_FIELDS) {
              if (m[f] !== r[f]) {
                divergent = true;
                out.divergences.push({ quarter, codCtaB: acc.codCtaB, codTributo: acc.codTributo, field: f, materialized: String(m[f]), recomputed: String(r[f]) });
              }
            }
          }
        }
        return { parteBId: id, codCtaB: acc.codCtaB, codTributo: acc.codTributo, materialized: m ? view(m) : undefined, recomputed: view(r), divergent };
      });
      out.periods.push({ quarter, closed: Boolean(closing), closedAt: closing?.closedAt.toISOString(), accounts: rows });
    }
    return out;
  }
}
