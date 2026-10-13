import prisma from '../../../lib/prisma';
import type { PtaxRate } from 'generated/prisma';
import type { IPtaxRateRepository } from './IPtaxRateRepository';
import { dateOnlyToDb, dbToDateOnly, PTAX_SOURCE, type PtaxClosingQuote, type PtaxCurrency } from '../models/ptax';

/**
 * Repositório Prisma da PTAX. Zero regra de negócio. Idempotência pelo `@@unique([currency, rateDate])` com upsert por
 * linha (o item 21 deixou em aberto o `createMany({ skipDuplicates })` no SQLite; o upsert não depende disso).
 */
export class PtaxRateRepository implements IPtaxRateRepository {
  public async upsertClosing(quote: PtaxClosingQuote): Promise<PtaxRate> {
    const rateDate = dateOnlyToDb(quote.rateDate);
    return prisma.ptaxRate.upsert({
      where: { currency_rateDate: { currency: quote.currency, rateDate } },
      create: {
        currency: quote.currency,
        rateDate,
        buyRateE5: quote.buyRateE5,
        sellRateE5: quote.sellRateE5,
        quotedAt: quote.quotedAt,
        source: PTAX_SOURCE,
      },
      update: {}, // append-only: o fechamento publicado não muda
    });
  }

  public async findLatestOnOrBefore(currency: PtaxCurrency, date: string): Promise<PtaxRate | null> {
    return prisma.ptaxRate.findFirst({ where: { currency, rateDate: { lte: dateOnlyToDb(date) } }, orderBy: { rateDate: 'desc' } });
  }

  public async findLatestDate(currency: PtaxCurrency): Promise<string | null> {
    const row = await prisma.ptaxRate.findFirst({ where: { currency }, orderBy: { rateDate: 'desc' }, select: { rateDate: true } });
    return row ? dbToDateOnly(row.rateDate) : null;
  }
}
