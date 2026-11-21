/**
 * InsumoStockCountService — contagem do estoque de insumo do serviço (inventário periódico). FIRST-CLASS PRISMA.
 *
 * atomicUntil: postEntry
 *   commit 1 — razão: postEntry(sourceType='insumo_stock_count', sourceId=<unitId>:<countDate>); gate de período dentro da tx
 *              teste: (genérico — PostingService) PostingService.test.ts › "postEntry TOCTOU: preflight passes (OPEN) but authoritative tx-gate fails (period closed between checks) — no write"
 *   commit 2 — nenhum
 *   reconcile — n/a (postEntry idempotente por sourceId; a 2ª contagem ATIVA na mesma data dá 409 no read-first)
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
import type { Posting } from 'generated/prisma';
import { InsumoStockCountViewSchema, type CreateInsumoStockCountInput, type InsumoStockCountView } from '../dtos/InsumoStockCountDto';

export const INSUMO_STOCK_COUNT_SOURCE_TYPE = 'insumo_stock_count';

/**
 * BE-INCR-INSUMO-INVENTARIO-PERIODICO (BRIEF item 4; F-ID-3 c, dono 21/11/2026,
 * D-2026-11-21-INSUMO-INVENTARIO-PERIODICO). NBC TG 1002 item 13.6: o estoque vira custo do serviço no período da
 * receita. No inventário periódico o consumo do período é saldo contábil − contado na data, lançado como
 * D `insumoExpenseAccountId` / C `insumoStockAccountId` (o inverso, se sobrou).
 *
 * Recontagem (BRIEF item 4, "estorne e conte de novo"): o `reverseEntry` genérico não libera a chave de idempotência
 * (só a do `closing`), então cada recontagem na mesma (unidade, data) usa a `sourceId` seguinte (`<base>`, `<base>#2`,
 * `<base>#3`…). Só a última pode estar ativa. O saldo da recontagem exclui as contagens estornadas daquela data e os
 * estornos delas: se o estorno foi datado depois de `countDate`, a contagem original ainda estaria no saldo.
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

    const base = `${scope.unitId}:${input.countDate}`;
    let sourceId = base;
    let excludedCents = 0; // efeito, na conta de estoque de insumo, das contagens estornadas desta data e dos estornos delas
    for (let seq = 2; ; seq++) {
      const prior = await this.journalEntryRepo.findBySource(scope, INSUMO_STOCK_COUNT_SOURCE_TYPE, sourceId);
      if (!prior) break;
      // Ativa = cadeia de estornos de tamanho par: 0 (nunca estornada), 2 (estorno estornado de volta)…; ímpar = sem
      // efeito (review #1297 rodadas 2 e 3: o `reverseEntry` aceita estornar um estorno, em qualquer profundidade).
      const chain = [prior];
      for (let next = prior.reversedById; next; ) {
        const reversal = await this.journalEntryRepo.findById(scope, next);
        if (!reversal) break;
        chain.push(reversal);
        next = reversal.reversedById;
      }
      if ((chain.length - 1) % 2 === 0) {
        throw new ConflictError(
          `Já existe contagem do estoque de insumo em ${input.countDate} nesta unidade. Para corrigir, estorne o lançamento e conte de novo.`,
          'INSUMO_COUNT_ALREADY_POSTED',
        );
      }
      // Sai do saldo o efeito da cadeia lançado até countDate (o que foi datado depois não está no saldo).
      for (const e of chain) {
        if (e.date.getTime() <= endOfDay(input.countDate).getTime()) excludedCents += stockEffect(e.postings, stock.id);
      }
      sourceId = `${base}#${seq}`;
    }

    const totals = await this.postingRepo.groupByAccount(scope, LEDGER_STATUSES, { to: endOfDay(input.countDate) });
    const row = totals.find((t) => t.accountId === stock.id);
    const bookValueCents = (row ? row.debitCents - row.creditCents : 0) - excludedCents;
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

function endOfDay(dateOnly: string): Date {
  return new Date(`${dateOnly}T23:59:59.999Z`);
}

/** Débito − crédito das pernas do lançamento na conta dada (centavos inteiros; as colunas são BigInt). */
function stockEffect(postings: Posting[], accountId: string): number {
  return postings.filter((p) => p.accountId === accountId).reduce((acc, p) => acc + Number(p.debitCents) - Number(p.creditCents), 0);
}
