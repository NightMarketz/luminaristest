import type { FixedAsset, FixedAssetClass, Prisma } from 'generated/prisma';
import { ValidationError } from '../../../lib/errors';
import { amortizationTerms, quotaCumulativa, quotaCumulativaLinear } from '../models/FixedAsset.model';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import type { LalurPeriodo } from '../models/Lalur.model';
import type { IFixedAssetRepository } from '../repositories/IFixedAssetRepository';
import type { IJournalEntryRepository } from '../repositories/IJournalEntryRepository';
import type { AccountingScope } from '../scope/AccountingScope';
import { DEPRECIATION_SOURCE_TYPE } from './DepreciationService';
import type { FixedAssetParteBRow, IFixedAssetReader } from './IFixedAssetReader';

/** Meses de `from` até `to`, inclusive — a MESMA fórmula de `DepreciationService`/`FixedAssetService` (item 12). */
function monthsBetweenInclusive(from: Date, to: Date): number {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth()) + 1;
}

/** Janela do período da Parte B: `T0n` = trimestre, `A00` = ano (forma anual, X7 item 12). */
export function parteBWindow(year: number, periodo: LalurPeriodo): { from: Date; to: Date } {
  if (periodo === 'A00') return { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year, 12, 0)) };
  const q = /^T0([1-4])$/.exec(periodo);
  if (!q) throw new ValidationError(`O Bloco F só roda nos períodos da Parte B (T01..T04 ou A00), não em ${periodo}.`);
  const first = (Number(q[1]) - 1) * 3;
  return { from: new Date(Date.UTC(year, first, 1)), to: new Date(Date.UTC(year, first + 3, 0)) };
}

/**
 * Série fiscal cumulativa do bem (E16: base = `costCents`, sem residual — IN 1.700 art. 123). Depreciação: taxa do Anexo
 * (`annualRateBp`, nunca a contábil). Benfeitoria: linear em `nFiscal` = prazo restante do contrato (RIR 333, E11).
 */
function fiscalSeries(asset: FixedAsset, klass: FixedAssetClass): (k: number) => bigint {
  const base = asset.costCents;
  if (klass.kind === 'AMORTIZATION_LEASEHOLD') {
    const { nFiscal } = amortizationTerms(monthsBetweenInclusive(asset.activatedAt!, asset.leaseEndDate!), asset.annualRateBp);
    return (k) => (k <= 0 ? 0n : quotaCumulativaLinear(base, nFiscal, k));
  }
  return (k) => {
    if (k <= 0) return 0n;
    const cum = quotaCumulativa(base, asset.annualRateBp, k);
    return cum < base ? cum : base;
  };
}

/** E15: só o que pode ter diferença; o default (sem override, residual 0, sem benfeitoria longa) dá 0 por construção (E20). */
function entraNoBlocoF(asset: FixedAsset, klass: FixedAssetClass): boolean {
  if (asset.bookAnnualRateBp !== null || asset.residualValueCents > 0n) return true;
  if (klass.kind !== 'AMORTIZATION_LEASEHOLD' || !asset.leaseEndDate) return false;
  const { nBook, nFiscal } = amortizationTerms(monthsBetweenInclusive(asset.activatedAt!, asset.leaseEndDate), asset.annualRateBp);
  return nBook < nFiscal;
}

/**
 * FixedAssetParteBReader — o `IFixedAssetReader` do Bloco F (C8 emenda 3.2, E15). Só leitura: ativos pelo repositório do
 * imobilizado, quotas contábeis pelo razão (as postadas, não a série teórica — E16 "contábil = a postada"). Roda dentro
 * da tx do fechamento quando recebe `tx`.
 */
export class FixedAssetParteBReader implements IFixedAssetReader {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly journalEntryRepo: IJournalEntryRepository,
  ) {}

  async listForParteB(scope: AccountingScope, year: number, periodo: LalurPeriodo, tx?: Prisma.TransactionClient): Promise<FixedAssetParteBRow[]> {
    const { from, to } = parteBWindow(year, periodo);
    const prevEnd = new Date(from.getTime() - 86_400_000);
    const out: FixedAssetParteBRow[] = [];
    for (const asset of await this.assetRepo.findForParteB(scope, from, to, tx)) {
      if (!entraNoBlocoF(asset, asset.class)) continue;
      // baixado depois do período (o repo devolve disposedAt >= from) conta como vivo nele (review D1)
      const disposedInPeriod = asset.status === 'DISPOSED' && asset.disposedAt !== null && asset.disposedAt <= to;
      const end = disposedInPeriod && asset.disposedAt ? asset.disposedAt : to;
      const fiscal = fiscalSeries(asset, asset.class);
      const kPrev = Math.max(0, monthsBetweenInclusive(asset.activatedAt!, prevEnd));
      const kEnd = Math.max(0, monthsBetweenInclusive(asset.activatedAt!, end));

      const quotas = await this.journalEntryRepo.findDebitsBySourcePrefix(scope, DEPRECIATION_SOURCE_TYPE, `${asset.id}:`, LEDGER_STATUSES, to, tx);
      let bookBefore = asset.openingAccumulatedCents;
      let bookQuota = 0n;
      const quotaEntries: FixedAssetParteBRow['quotaEntries'] = [];
      for (const q of quotas) {
        if (q.date < from) {
          bookBefore += q.debitCents;
        } else {
          bookQuota += q.debitCents;
          quotaEntries.push({ id: q.id, debitAccountIds: q.debitAccountIds });
        }
      }
      out.push({
        assetId: asset.id,
        code: asset.code,
        fiscalQuotaCents: fiscal(kEnd) - fiscal(kPrev),
        bookQuotaCents: bookQuota,
        priorDiffCents: fiscal(kPrev) - bookBefore,
        disposedInPeriod,
        quotaEntries,
      });
    }
    return out;
  }
}
