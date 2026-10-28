import prisma from '../../../lib/prisma';
import type { Prisma, TaxWithholding } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { WithholdingLineForReinf } from '../dtos/WithholdingDto';
import { toWithholdingLineForReinf, type TaxWithholdingComOrigem } from '../models/withholdingView';
import type { CreateTaxWithholdingData, ITaxWithholdingRepository } from './ITaxWithholdingRepository';

/** Prisma-backed `tax_withholdings` (RETENCOES-FONTE PR-2, item 13) + a porta de leitura da Reinf (§5.4). */
export class TaxWithholdingRepository implements ITaxWithholdingRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async create(scope: AccountingScope, data: CreateTaxWithholdingData, tx: Prisma.TransactionClient): Promise<TaxWithholding> {
    return tx.taxWithholding.create({ data: { ...accountingScopeWhere(scope), ...data, status: 'ACTIVE' } });
  }

  public async findActiveByTitle(scope: AccountingScope, titleType: 'PAYABLE' | 'RECEIVABLE', titleId: string, tx?: Prisma.TransactionClient): Promise<TaxWithholding[]> {
    return this.db(tx).taxWithholding.findMany({ where: { ...accountingScopeWhere(scope), titleType, titleId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
  }

  public async findBySettlement(scope: AccountingScope, settlementId: string, tx?: Prisma.TransactionClient): Promise<TaxWithholding | null> {
    return this.db(tx).taxWithholding.findFirst({ where: { ...accountingScopeWhere(scope), settlementId } });
  }

  public async findActiveByOriginSettlement(scope: AccountingScope, originSettlementId: string, tx?: Prisma.TransactionClient): Promise<TaxWithholding[]> {
    return this.db(tx).taxWithholding.findMany({ where: { ...accountingScopeWhere(scope), originSettlementId, status: 'ACTIVE' } });
  }

  public async somaIrrfDoMes(scope: AccountingScope, counterpartyId: string, competencia: string, tx?: Prisma.TransactionClient): Promise<{ rendimentoCents: bigint; retidoCents: bigint }> {
    const r = await this.db(tx).taxWithholding.aggregate({
      where: { ...accountingScopeWhere(scope), counterpartyId, competencia, tributo: 'IRRF', direction: 'MADE', status: 'ACTIVE' },
      _sum: { brutoCents: true, amountCents: true },
    });
    return { rendimentoCents: r._sum.brutoCents ?? 0n, retidoCents: r._sum.amountCents ?? 0n };
  }

  public async markReversed(scope: AccountingScope, ids: readonly string[], tx: Prisma.TransactionClient): Promise<number> {
    if (ids.length === 0) return 0;
    const r = await tx.taxWithholding.updateMany({ where: { ...accountingScopeWhere(scope), id: { in: [...ids] }, status: 'ACTIVE' }, data: { status: 'REVERSED' } });
    return r.count;
  }

  public async setEntryId(scope: AccountingScope, id: string, entryId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.db(tx).taxWithholding.updateMany({ where: { ...accountingScopeWhere(scope), id }, data: { entryId } });
  }

  public async repointTaxPayable(scope: AccountingScope, fromPayableId: string, toPayableId: string, tx: Prisma.TransactionClient, competencia?: string): Promise<number> {
    const r = await tx.taxWithholding.updateMany({ where: { ...accountingScopeWhere(scope), taxPayableId: fromPayableId, status: 'ACTIVE', ...(competencia ? { competencia } : {}) }, data: { taxPayableId: toPayableId } });
    return r.count;
  }

  public async somaDaCompetencia(scope: AccountingScope, codigoReceita: string, competencia: string, tx: Prisma.TransactionClient, taxPayableId?: string): Promise<bigint> {
    const r = await tx.taxWithholding.aggregate({
      where: { ...accountingScopeWhere(scope), codigoReceita, competencia, direction: 'MADE', status: 'ACTIVE', ...(taxPayableId ? { taxPayableId } : {}) },
      _sum: { amountCents: true },
    });
    return r._sum.amountCents ?? 0n;
  }

  public async findMadeWithOrigin(scope: AccountingScope, competencia: string): Promise<TaxWithholdingComOrigem[]> {
    return this.madeWithOrigin(accountingScopeWhere(scope), competencia);
  }

  /** `tenancy` = `{ userId, unitId }` (a unidade) ou `{ userId }` (a PJ inteira, porta da Reinf). */
  private async madeWithOrigin(tenancy: { userId: string; unitId?: string }, competencia: string): Promise<TaxWithholdingComOrigem[]> {
    const rows = await prisma.taxWithholding.findMany({
      where: { ...tenancy, competencia, direction: 'MADE', status: 'ACTIVE' },
      orderBy: [{ dataFatoGerador: 'asc' }, { createdAt: 'asc' }],
    });
    if (rows.length === 0) return [];
    const cps = await prisma.counterparty.findMany({
      where: { ...tenancy, id: { in: [...new Set(rows.map((r) => r.counterpartyId))] } },
      select: { id: true, name: true, taxId: true, regimeTributario: true },
    });
    const titulos = await prisma.payable.findMany({
      where: { ...tenancy, id: { in: [...new Set(rows.map((r) => r.titleId))] } },
      select: { id: true, documentNumber: true, issueDate: true },
    });
    const perfis = await prisma.withholdingProfile.findMany({
      where: { ...tenancy, counterpartyId: { in: cps.map((c) => c.id) }, deletedAt: null },
      select: { counterpartyId: true, naturezaServico: true, vigenteDesde: true, vigenteAte: true, inssTpServico: true, inssCprb: true },
    });
    const cp = new Map(cps.map((c) => [c.id, c]));
    const tit = new Map(titulos.map((t) => [t.id, t]));
    return rows.map((r) => ({
      ...r,
      counterparty: cp.get(r.counterpartyId)!,
      titulo: tit.get(r.titleId)!,
      perfil:
        perfis.find(
          (p) => p.counterpartyId === r.counterpartyId && p.naturezaServico === r.naturezaServico && p.vigenteDesde <= r.dataFatoGerador && (p.vigenteAte === null || r.dataFatoGerador <= p.vigenteAte),
        ) ?? null,
    }));
  }

  public async findMadeForReinf(scope: AccountingScope, competencia: string): Promise<WithholdingLineForReinf[]> {
    return (await this.findMadeWithOrigin(scope, competencia)).map(toWithholdingLineForReinf);
  }

  public async findMadeForReinfDaPj(ownerUserId: string, competencia: string): Promise<WithholdingLineForReinf[]> {
    return (await this.madeWithOrigin({ userId: ownerUserId }, competencia)).map(toWithholdingLineForReinf);
  }

  public async findMadeByTaxPayables(scope: AccountingScope, taxPayableIds: readonly string[]): Promise<TaxWithholding[]> {
    if (taxPayableIds.length === 0) return [];
    return prisma.taxWithholding.findMany({ where: { ...accountingScopeWhere(scope), taxPayableId: { in: [...taxPayableIds] }, direction: 'MADE', status: 'ACTIVE' } });
  }

  public async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
