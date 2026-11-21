/**
 * InsumoStockCountService — contagem do estoque de insumo do serviço (inventário periódico). FIRST-CLASS PRISMA.
 *
 * atomicUntil: postEntry
 *   commit 1 — razão: postEntry(sourceType='insumo_stock_count', sourceId=<unitId>:<countDate>); gate de período dentro da tx
 *              teste: (genérico — PostingService) PostingService.test.ts › "postEntry TOCTOU: preflight passes (OPEN) but authoritative tx-gate fails (period closed between checks) — no write"
 *   commit 2 — nenhum
 *   reconcile — n/a (postEntry idempotente por sourceId; a 2ª contagem na mesma data dá 409 no read-first)
 *              teste: insumoStockCount.integration.test.ts › "item 4 — 2ª contagem na mesma data → 409, sem segundo lançamento"
 *   fora da tx — nada
 */
import { ConflictError, ForbiddenError, ValidationError } from '../../../lib/errors';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { PostingService } from './PostingService';
import { InsumoStockCountViewSchema, type CreateInsumoStockCountInput, type InsumoStockCountView } from '../dtos/InsumoStockCountDto';

export const INSUMO_STOCK_COUNT_SOURCE_TYPE = 'insumo_stock_count';

/**
 * BE-INCR-INSUMO-INVENTARIO-PERIODICO (BRIEF item 4; F-ID-3 c, dono 21/11/2026,
 * D-2026-11-21-INSUMO-INVENTARIO-PERIODICO). NBC TG 1002 item 13.6: o estoque vira custo do serviço no período da
 * receita. No inventário periódico o consumo do período é saldo contábil − contado na data, lançado como
 * D `insumoExpenseAccountId` / C `insumoStockAccountId` (o inverso, se sobrou).
 *
 * Residual declarado (BRIEF §6): o saldo é lido antes do `postEntry`, fora da tx dele. Uma compra com data até
 * `countDate` lançada depois da contagem fica fora do ajuste. A contagem vale para a sua data; a correção é estornar
 * o lançamento (fluxo genérico) e contar de novo.
 */
export class InsumoStockCountService {
  constructor(
    private readonly fiscalProfileRepo: IFiscalProfileRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly journalEntryRepo: IJournalEntryRepository,
    private readonly posting: PostingService,
    private readonly policy: IAccountingPolicy,
  ) {}

  async count(scope: AccountingScope, input: CreateInsumoStockCountInput): Promise<InsumoStockCountView> {
    if (!this.policy.canManageFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para lançar a contagem do estoque de insumo.');
    const profile = await this.fiscalProfileRepo.findByScope(scope);
    if (!profile?.insumoStockAccountId || !profile.insumoExpenseAccountId) {
      throw new ValidationError(
        'insumo_stock_account_not_configured: a contagem exige insumoStockAccountId (estoque de insumo) e insumoExpenseAccountId (custo do insumo) no perfil fiscal (PUT /api/accounting/fiscal-profile — código é do contador).',
      );
    }
    const [stock, expense] = await Promise.all([
      this.accountRepo.findById(scope, profile.insumoStockAccountId),
      this.accountRepo.findById(scope, profile.insumoExpenseAccountId),
    ]);
    if (!stock || stock.deletedAt || !expense || expense.deletedAt) {
      throw new ValidationError('insumo_stock_account_not_configured: conta de estoque ou de custo do insumo não existe mais neste escopo.');
    }

    const sourceId = `${scope.unitId}:${input.countDate}`;
    if (await this.journalEntryRepo.findBySource(scope, INSUMO_STOCK_COUNT_SOURCE_TYPE, sourceId)) {
      throw new ConflictError(
        `Já existe contagem do estoque de insumo em ${input.countDate} nesta unidade. Para corrigir, estorne o lançamento e conte de novo.`,
        'INSUMO_COUNT_ALREADY_POSTED',
      );
    }

    const totals = await this.postingRepo.groupByAccount(scope, LEDGER_STATUSES, { to: new Date(`${input.countDate}T23:59:59.999Z`) });
    const row = totals.find((t) => t.accountId === stock.id);
    const bookValueCents = row ? row.debitCents - row.creditCents : 0;
    const adjustmentCents = bookValueCents - input.countedValueCents;

    let entryId: string | null = null;
    if (adjustmentCents !== 0) {
      const amount = Math.abs(adjustmentCents);
      const [debit, credit] = adjustmentCents > 0 ? [expense.code, stock.code] : [stock.code, expense.code];
      const entry = await this.posting.postEntry(scope, {
        unitId: scope.unitId,
        date: input.countDate,
        description: `Contagem do estoque de insumo em ${input.countDate}: saldo ${bookValueCents}, contado ${input.countedValueCents} (centavos)`,
        sourceType: INSUMO_STOCK_COUNT_SOURCE_TYPE,
        sourceId,
        automaticWriter: true,
        sourceDocument: {
          documentDate: input.countDate,
          rawJson: JSON.stringify({ countDate: input.countDate, bookValueCents, countedValueCents: input.countedValueCents, adjustmentCents }),
        },
        lines: [
          { accountCode: debit, debitCents: amount, creditCents: 0 },
          { accountCode: credit, debitCents: 0, creditCents: amount },
        ],
      });
      entryId = entry.id;
    }

    return InsumoStockCountViewSchema.parse({
      countDate: input.countDate,
      bookValueCents,
      countedValueCents: input.countedValueCents,
      adjustmentCents,
      entryId,
    });
  }
}
