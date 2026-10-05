import { Prisma } from 'generated/prisma';
import type { PackageValidityAcceptance } from 'generated/prisma';
import {
  ForbiddenError,
  NotFoundError,
  PackageAcceptanceExistsError,
  PackageNoticeChangedError,
  PackageWithoutValidityError,
  ValidationError,
} from '../../../lib/errors';
import { htmlToPdf } from '../../../lib/pdf';
import { packageSaleReceiptHtml } from '../../../lib/packageSaleReceiptHtml';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import { isValidDateOnly } from '../../accounting/models/dates';
import { loadPackageValidityDays, loadSalePackageInfo } from '../../accounting/sync/bridges/saleItems';
import type { IDynamicTableRepository } from '../../dynamicTables/repositories/IDynamicTableRepository';
import type { IUserRepository } from '../../users/repositories/IUserRepository';
import type { CreatePackageAcceptanceInput, PackageAcceptanceResponse, ValidityNoticeResponse } from '../dtos/PackageAcceptanceDto';
import { expiresAtToDb, expiresOnFromDb } from '../models/validity';
import { PACKAGE_VALIDITY_NOTICE_VERSION, buildValidityNotice, type ValidityNotice } from '../models/validityNotice';
import type { IPackageAcceptancePolicy } from '../policies/IPackageAcceptancePolicy';
import type { IPackageAcceptanceRepository } from '../repositories/IPackageAcceptanceRepository';

/** Metadata + bytes for streaming the generated receipt (same shape as ReceiptService's artifact). */
export interface PackageSaleReceiptArtifact {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

/**
 * The sale's calendar day, as the DynamicTable engine stores it: the preset field is `date` (date-only), but the engine
 * normalizes it to an ISO at UTC midnight (`2026-11-25T00:00:00.000Z`). Read the day AS WRITTEN — converting that instant
 * to America/Sao_Paulo (`scopeDay`) would give 24/11 and the hash of the text the operator saw would never match
 * (found verifying the production build, 05/10). Memory date-only-rendering-utc-shift-class-bug.
 * ponytail: the literal 10-char prefix; a datetime with a non-midnight offset is out of the field's convention.
 */
function calendarDateOf(value: unknown): string {
  const day = typeof value === 'string' ? value.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(value)) || !isValidDateOnly(day)) {
    throw new ValidationError('Venda sem data válida: a validade não pode ser calculada.');
  }
  return day;
}

/** What a package sale resolves to: everything the server trusts — read from the sale and the catalog, never from the FE. */
interface PackageSaleFacts {
  customerId: string;
  packageId: string;
  /** 'YYYY-MM-DD' */
  saleDate: string;
  totalAmount: number;
  validityDays: number | null;
}

/**
 * PackageAcceptanceService — the proof that a package's validity was informed at purchase (F-JUR-4,
 * FE-INCR-PACOTE-VALIDADE BRIEF items 3–5 and 13). First-class Prisma for the evidence; the sale, the catalog, the
 * customer and the unit are DynamicTable rows read through the REPOSITORY only (§2.1 — never DynamicTableService).
 *
 * ONE source for the text and the date: `buildValidityNotice` (models/validityNotice.ts). The notice endpoint renders
 * it for the screen; `create` re-renders it from server-side facts and compares the hash with what the operator saw,
 * so the stored `textShown` is provably the shown text (409 PACKAGE_NOTICE_CHANGED otherwise).
 *
 * No `postEntry` here: nothing is booked (the acceptance is evidence, not an accounting fact) → no `atomicUntil`.
 */
export class PackageAcceptanceService {
  constructor(
    private readonly repo: IPackageAcceptanceRepository,
    private readonly policy: IPackageAcceptancePolicy,
    private readonly dynamicTableRepo: IDynamicTableRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  /** Item 3 — the text the screen must show for this package on this date. All-null when the package has no validity. */
  public async getNotice(scope: AccountingScope, query: { packageId: string; saleDate: string }): Promise<ValidityNoticeResponse> {
    this.assertCanRead(scope);
    // A package of another tenant (or a made-up id) is not in THIS tenant's catalog → 404 (never a silent "no validity").
    await this.assertPackageInCatalog(scope, query.packageId);
    const validityDays = await loadPackageValidityDays(scope.ownerUserId, query.packageId);
    const notice = buildValidityNotice(query.saleDate, validityDays);
    if (!notice) {
      return { validityDays: null, saleDate: query.saleDate, expiresOn: null, textVersion: PACKAGE_VALIDITY_NOTICE_VERSION, text: null, textSha256: null };
    }
    return notice;
  }

  /** Item 4 — registers the acceptance. Trusts the FE only for the version and the hash. */
  public async create(scope: AccountingScope, input: CreatePackageAcceptanceInput): Promise<PackageAcceptanceResponse> {
    if (!this.policy.canRecord(scope)) {
      throw new ForbiddenError('Sem permissão para registrar o aceite da validade do pacote.');
    }
    const facts = await this.loadPackageSaleFacts(scope, input.saleId);
    const notice = buildValidityNotice(facts.saleDate, facts.validityDays);
    if (!notice) throw new PackageWithoutValidityError(facts.packageId);

    if (await this.repo.findBySale(scope, input.saleId)) throw new PackageAcceptanceExistsError(input.saleId);
    if (input.textSha256 !== notice.textSha256) throw new PackageNoticeChangedError(input.saleId);

    try {
      const row = await this.repo.create(scope, {
        saleId: input.saleId,
        customerId: facts.customerId,
        packageId: facts.packageId,
        saleDate: expiresAtToDb(notice.saleDate) as Date,
        validityDays: notice.validityDays,
        expiresOn: expiresAtToDb(notice.expiresOn) as Date,
        textVersion: notice.textVersion,
        textShown: notice.text,
        textSha256: notice.textSha256,
        acceptedByUserId: scope.actorUserId,
      });
      return this.toResponse(row);
    } catch (err) {
      // Two concurrent accepts of the same sale: the @@unique is the gate, the pre-check above only gives the fast 409.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new PackageAcceptanceExistsError(input.saleId);
      }
      throw err;
    }
  }

  /** Item 5 — the acceptance of a sale, or null (feeds the detail panel and the receipt). */
  public async getBySale(scope: AccountingScope, saleId: string): Promise<PackageAcceptanceResponse | null> {
    this.assertCanRead(scope);
    const row = await this.repo.findBySale(scope, saleId);
    return row ? this.toResponse(row) : null;
  }

  /**
   * Item 13 — receipt PDF. Clause = the stored `textShown` when accepted; otherwise the notice rendered now, stamped
   * "ACEITE NÃO REGISTRADO". READ-ONLY: nothing is persisted (a receipt is a deterministic render, always regenerable).
   */
  public async generateReceipt(scope: AccountingScope, saleId: string): Promise<PackageSaleReceiptArtifact> {
    this.assertCanRead(scope);
    const facts = await this.loadPackageSaleFacts(scope, saleId);
    const accepted = await this.repo.findBySale(scope, saleId);

    let clause: string;
    let acceptance: { acceptedByLabel: string; acceptedAt: Date; textVersion: string } | null = null;
    if (accepted) {
      clause = accepted.textShown;
      const actor = await this.userRepo.getUserById(accepted.acceptedByUserId);
      acceptance = {
        acceptedByLabel: actor?.name || actor?.username || accepted.acceptedByUserId,
        acceptedAt: accepted.acceptedAt,
        textVersion: accepted.textVersion,
      };
    } else {
      const notice: ValidityNotice | null = buildValidityNotice(facts.saleDate, facts.validityDays);
      if (!notice) throw new PackageWithoutValidityError(facts.packageId);
      clause = notice.text;
    }

    const [unitName, customerName, packageName] = await Promise.all([
      this.nameInTable(scope, 'units', scope.unitId),
      this.nameInTable(scope, 'customers', facts.customerId),
      this.nameInTable(scope, 'packages', facts.packageId),
    ]);
    const buffer = await htmlToPdf(
      packageSaleReceiptHtml({
        unitName,
        customerName,
        packageName,
        amountCents: Math.round(facts.totalAmount * 100),
        // Com aceite, a data impressa é a gravada junto da cláusula (a venda pode ter sido editada depois — I4).
        saleDate: accepted ? (expiresOnFromDb(accepted.saleDate) as string) : facts.saleDate,
        clause,
        acceptance,
      }),
    );
    return { buffer, fileName: `comprovante-pacote-${saleId}.pdf`, mimeType: 'application/pdf' };
  }

  // ── internals ────────────────────────────────────────────────────────────────

  private assertCanRead(scope: AccountingScope): void {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Sem permissão para ler o aceite da validade do pacote.');
  }

  /**
   * Reads the sale under the scope and proves it is an all-Package sale with exactly ONE packageId (reuses the bridge's
   * classifier — the single source of that decision). Foreign/mismatched sale → 404 (no enumeration; `findDataById` is
   * NOT tenant-scoped, so the table-membership check is the guard — same stance as RegisterPaymentService).
   */
  private async loadPackageSaleFacts(scope: AccountingScope, saleId: string): Promise<PackageSaleFacts> {
    const salesTable = await this.dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'sales');
    const saleRow = salesTable ? await this.dynamicTableRepo.findDataById(saleId) : null;
    const data = (saleRow?.data ?? {}) as Record<string, unknown>;
    if (!salesTable || !saleRow || saleRow.dynamicTableId !== salesTable.id || data.unitId !== scope.unitId) {
      throw new NotFoundError(`Venda '${saleId}' não encontrada.`);
    }

    const items = await loadSalePackageInfo(scope.ownerUserId, saleId);
    if (items.kind !== 'Package' || items.packageIds.length !== 1) {
      throw new ValidationError('O aceite da validade só existe para venda de um único pacote.');
    }
    const customerId = typeof data.customerId === 'string' ? data.customerId : '';
    if (!customerId) throw new ValidationError('Venda de pacote sem cliente: não há quem aceitar a validade.');
    const saleDate = calendarDateOf(data.date);
    const totalAmount = Number(data.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new ValidationError('Venda sem valor total válido.');

    const packageId = items.packageIds[0];
    return {
      customerId,
      packageId,
      saleDate,
      totalAmount,
      validityDays: await loadPackageValidityDays(scope.ownerUserId, packageId),
    };
  }

  private async assertPackageInCatalog(scope: AccountingScope, packageId: string): Promise<void> {
    const catalog = await this.dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'packages');
    if (!catalog || !(await this.dynamicTableRepo.existsByIdInTable(packageId, catalog.id))) {
      throw new NotFoundError(`Pacote '${packageId}' não encontrado no catálogo.`);
    }
  }

  /** `name` of a row of THIS tenant's table (membership-checked — a row id from another tenant never leaks its name). */
  private async nameInTable(scope: AccountingScope, internalName: string, rowId: string): Promise<string> {
    const table = await this.dynamicTableRepo.findTableByInternalName(scope.ownerUserId, internalName);
    if (!table || !(await this.dynamicTableRepo.existsByIdInTable(rowId, table.id))) return rowId;
    const row = await this.dynamicTableRepo.findDataById(rowId);
    const name = (row?.data as Record<string, unknown> | null)?.name;
    return typeof name === 'string' && name ? name : rowId;
  }

  private toResponse(row: PackageValidityAcceptance): PackageAcceptanceResponse {
    return {
      id: row.id,
      saleId: row.saleId,
      customerId: row.customerId,
      packageId: row.packageId,
      saleDate: expiresOnFromDb(row.saleDate) as string,
      validityDays: row.validityDays,
      expiresOn: expiresOnFromDb(row.expiresOn) as string,
      textVersion: row.textVersion,
      textShown: row.textShown,
      textSha256: row.textSha256,
      acceptedByUserId: row.acceptedByUserId,
      acceptedAt: row.acceptedAt.toISOString(),
    };
  }
}
