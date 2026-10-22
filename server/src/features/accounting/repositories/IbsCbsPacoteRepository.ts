import prisma from '../../../lib/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { scopeDay } from '../models/dates';
import type { MovimentoPacote, PagamentoPacote, SaldoPacote } from '../models/ibsCbsAntecipacao';
import { AUTHORIZED_STATUSES } from './IFiscalDocumentRepository';
import type { DadosPacoteIbsCbs, IIbsCbsPacoteRepository } from './IIbsCbsPacoteRepository';

const PACOTE_VENDIDO = 'sale.package.sold';
const VENDA_LIQUIDADA = 'sale.settled';
const dia = (d: Date): string => d.toISOString().slice(0, 10); // `JournalEntry.date` é date-only gravado à 0h UTC

/** Repositório Prisma da leitura do pacote pré-pago para a apuração de IBS/CBS (IBS-CBS-2027 PR-3). Zero regra de negócio. */
export class IbsCbsPacoteRepository implements IIbsCbsPacoteRepository {
  public async dadosDoMes(scope: AccountingScope, de: string, ate: string): Promise<DadosPacoteIbsCbs> {
    const where = accountingScopeWhere(scope);
    const janela = { gte: new Date(`${de}T00:00:00.000Z`), lte: new Date(`${ate}T23:59:59.999Z`) };

    // Item 17 — pagamentos de venda de pacote no mês.
    const liquidadas = await prisma.journalEntry.findMany({
      where: { ...where, sourceType: VENDA_LIQUIDADA, status: { in: LEDGER_STATUSES }, reversedById: null, date: janela },
      select: { sourceId: true, date: true },
    });
    const vendidos = await this.pacotesVendidos(scope, liquidadas.map((l) => l.sourceId).filter((s): s is string => s !== null));
    const docs = await this.diaDoDocumento(scope, [...vendidos.keys()]);
    const pagamentos: PagamentoPacote[] = liquidadas
      .filter((l) => l.sourceId !== null && vendidos.has(l.sourceId))
      .map((l) => ({ saleId: l.sourceId!, pagoEm: dia(l.date), dataDocumento: docs.get(l.sourceId!) ?? null, parcelaCents: vendidos.get(l.sourceId!)! }));

    // Item 18 — consumo/vencimento no mês (dia escrito no fuso do escopo); folga de 1 dia na consulta, filtro exato depois.
    const consulta = { gte: new Date(`${de}T00:00:00.000Z`), lte: new Date(new Date(`${ate}T23:59:59.999Z`).getTime() + 86_400_000) };
    const doMes = (await prisma.packageBalanceMovement.findMany({ where: { ...where, kind: { in: ['debit', 'expiry'] }, createdAt: consulta } }))
      .filter((m) => { const d = scopeDay(scope, m.createdAt); return d >= de && d <= ate; });
    const pares = new Map<string, { customerId: string; packageId: string }>();
    for (const m of doMes) pares.set(`${m.customerId}|${m.packageId}`, { customerId: m.customerId, packageId: m.packageId });
    const saldos: SaldoPacote[] = [];
    const vendasDeOrigem = new Set<string>();
    for (const p of pares.values()) {
      const movimentos: MovimentoPacote[] = (await prisma.packageBalanceMovement.findMany({ where: { ...where, customerId: p.customerId, packageId: p.packageId } }))
        .map((m) => ({ id: m.id, saleId: m.saleId, kind: m.kind as MovimentoPacote['kind'], deltaCents: m.deltaCents, dia: scopeDay(scope, m.createdAt), instante: m.createdAt.toISOString() }))
        .filter((m) => m.dia <= ate);
      for (const m of movimentos) if (m.kind === 'credit') vendasDeOrigem.add(m.saleId);
      saldos.push({ ...p, movimentos });
    }
    const origem = [...vendasDeOrigem];
    const pagasEm = new Map(
      (await prisma.journalEntry.findMany({
        where: { ...where, sourceType: VENDA_LIQUIDADA, status: { in: LEDGER_STATUSES }, reversedById: null, sourceId: { in: origem } },
        select: { sourceId: true, date: true },
      })).map((l) => [l.sourceId!, dia(l.date)]),
    );
    const docsOrigem = await this.diaDoDocumento(scope, origem);
    const pagamentoDaVenda: DadosPacoteIbsCbs['pagamentoDaVenda'] = {};
    for (const [saleId, pagoEm] of pagasEm) pagamentoDaVenda[saleId] = { pagoEm, dataDocumento: docsOrigem.get(saleId) ?? null };

    // Item 18 — cancelamento: o lançamento de origem do pacote estornado com data no mês.
    const estornados = await prisma.journalEntry.findMany({
      where: { ...where, sourceType: PACOTE_VENDIDO, reversedById: { not: null } },
      select: { sourceId: true, reversedBy: { select: { date: true } } },
    });
    const cancelamentos = estornados
      .filter((e) => e.sourceId !== null && e.reversedBy !== null && dia(e.reversedBy.date) >= de && dia(e.reversedBy.date) <= ate)
      .map((e) => ({ saleId: e.sourceId!, dia: dia(e.reversedBy!.date) }));

    return { pagamentos, saldos, pagamentoDaVenda, cancelamentos };
  }

  /** Valor do pacote (Σ débitos do `sale.package.sold` vivo) por venda. */
  private async pacotesVendidos(scope: AccountingScope, saleIds: readonly string[]): Promise<Map<string, bigint>> {
    if (saleIds.length === 0) return new Map();
    const rows = await prisma.journalEntry.findMany({
      where: { ...accountingScopeWhere(scope), sourceType: PACOTE_VENDIDO, status: { in: LEDGER_STATUSES }, reversedById: null, sourceId: { in: [...saleIds] } },
      include: { postings: { select: { debitCents: true } } },
    });
    return new Map(rows.map((r) => [r.sourceId!, r.postings.reduce((a, p) => a + p.debitCents, 0n)]));
  }

  /** Dia (dCompet) do primeiro documento autorizado vivo de cada venda. */
  private async diaDoDocumento(scope: AccountingScope, saleIds: readonly string[]): Promise<Map<string, string>> {
    if (saleIds.length === 0) return new Map();
    const rows = await prisma.fiscalDocument.findMany({
      where: { ...accountingScopeWhere(scope), ambiente: 'producao', status: { in: [...AUTHORIZED_STATUSES] }, saleId: { in: [...saleIds] }, deletedAt: null },
      select: { saleId: true, dCompet: true },
      orderBy: { dCompet: 'asc' },
    });
    const out = new Map<string, string>();
    for (const r of rows) if (r.dCompet && !out.has(r.saleId)) out.set(r.saleId, r.dCompet);
    return out;
  }
}
