import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import { Prisma } from 'generated/prisma';
import type { LalurEntry, LalurParteBAccount } from 'generated/prisma';
import {
  LALUR_ENTRY_ARCHIVED,
  LALUR_ENTRY_CREATED,
  LALUR_ENTRY_UPDATED,
  LALUR_PARTE_B_ARCHIVED,
  LALUR_PARTE_B_CREATED,
  LALUR_PARTE_B_UPDATED,
  LIVRO_TRIBUTO,
  findLinha,
  findParteBPadrao,
  isParteALivro,
  vigenteNoAno,
  type LalurLivro,
} from '../models/Lalur.model';
import { refineLalurLine } from '../dtos/LalurDto';
import type {
  ArchiveLalurInput,
  CreateLalurEntryInput,
  CreateLalurParteBAccountInput,
  ListLalurEntriesQueryInput,
  ListLalurParteBQueryInput,
  UpdateLalurEntryInput,
  UpdateLalurParteBAccountInput,
} from '../dtos/LalurDto';
import type { ILalurRepository } from '../repositories/ILalurRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { z } from 'zod';

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

  private async validateLineRefs(
    scope: AccountingScope,
    line: { livro: LalurLivro; codigo: string; year: number; indRelacao: string | null; parteBId: string | null; accountId: string | null },
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
      const parteB = await this.repo.findParteBById(scope, line.parteBId);
      if (!parteB || parteB.deletedAt) throw new NotFoundError(`Conta da Parte B '${line.parteBId}' não foi encontrada.`);
      const expected = LIVRO_TRIBUTO[line.livro];
      if (parteB.codTributo !== expected) {
        throw new ValidationError(
          `Conta da Parte B '${parteB.codCtaB}' é do tributo ${parteB.codTributo}; o livro '${line.livro}' exige ${expected} (Manual p.237, REGRA_PARTE_B_PARTE_A).`,
        );
      }
    }
    if (line.accountId) {
      const account = await this.accountRepo.findById(scope, line.accountId);
      if (!account) throw new NotFoundError(`Conta contábil '${line.accountId}' não foi encontrada.`);
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
    await this.validateLineRefs(scope, line);
    const { userId, unitId } = accountingScopeWhere(scope);
    try {
      return await this.repo.runTransaction(async (tx) => {
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
    const check = z.object({}).passthrough().superRefine((_, ctx) => refineLalurLine(merged, ctx)).safeParse({});
    if (!check.success) throw new ValidationError(check.error.issues.map((i) => i.message).join(' '));
    await this.validateLineRefs(scope, {
      livro: merged.livro,
      codigo: merged.codigo,
      year: merged.year,
      indRelacao: merged.indRelacao ?? null,
      parteBId: merged.parteBId ?? null,
      accountId: merged.accountId ?? null,
    });

    return this.repo.runTransaction(async (tx) => {
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
    // Clean removal order: a live Parte A line still pointing here would emit M305 to a dead account.
    // ponytail: pre-tx guard (same class as DimensionService.archiveDefinition) — single-process SQLite.
    const live = await this.repo.countLiveEntriesByParteB(scope, id);
    if (live > 0) throw new ValidationError('Arquive os ajustes relacionados antes de arquivar a conta da Parte B.');
    return this.repo.runTransaction(async (tx) => {
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
}
