import prisma from '../../../lib/prisma';
import type { Prisma } from 'generated/prisma';
import type { ICrmReportDefinitionRepository } from './ICrmReportDefinitionRepository';
import type {
  CreateCrmReportDefinitionData,
  ICrmReportDefinition,
  UpdateCrmReportDefinitionData,
} from '../models/CrmReportDefinition.model';
import type { ReportSpec } from '../dtos/CrmReportDto';

type Row = Prisma.CrmReportDefinitionGetPayload<object>;

/** Repositório Prisma das definições de relatório do CRM. Zero regra de negócio. */
export class CrmReportDefinitionRepository implements ICrmReportDefinitionRepository {
  public async findManyByUser(userId: string, tx?: Prisma.TransactionClient): Promise<ICrmReportDefinition[]> {
    const rows = await (tx ?? prisma).crmReportDefinition.findMany({ where: { userId, deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return rows.map(toDomain);
  }

  public async findManyAll(tx?: Prisma.TransactionClient): Promise<ICrmReportDefinition[]> {
    const rows = await (tx ?? prisma).crmReportDefinition.findMany({ where: { deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return rows.map(toDomain);
  }

  public async findById(id: string, tx?: Prisma.TransactionClient): Promise<ICrmReportDefinition | null> {
    const row = await (tx ?? prisma).crmReportDefinition.findFirst({ where: { id, deletedAt: null } });
    return row ? toDomain(row) : null;
  }

  public async create(data: CreateCrmReportDefinitionData, tx?: Prisma.TransactionClient): Promise<ICrmReportDefinition> {
    const row = await (tx ?? prisma).crmReportDefinition.create({
      data: {
        user: { connect: { id: data.userId } },
        name: data.name,
        description: data.description ?? null,
        kind: data.kind,
        chartType: data.chartType,
        spec: data.spec as unknown as Prisma.InputJsonValue,
      },
    });
    return toDomain(row);
  }

  public async update(id: string, patch: UpdateCrmReportDefinitionData, tx?: Prisma.TransactionClient): Promise<ICrmReportDefinition> {
    const row = await (tx ?? prisma).crmReportDefinition.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
        ...(patch.chartType !== undefined ? { chartType: patch.chartType } : {}),
        ...(patch.spec !== undefined ? { spec: patch.spec as unknown as Prisma.InputJsonValue } : {}),
      },
    });
    return toDomain(row);
  }

  public async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? prisma).crmReportDefinition.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  public async softDeleteByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? prisma).crmReportDefinition.updateMany({ where: { userId, deletedAt: null }, data: { deletedAt: new Date() } });
  }
}

function toDomain(row: Row): ICrmReportDefinition {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    kind: row.kind as ICrmReportDefinition['kind'],
    chartType: row.chartType as ICrmReportDefinition['chartType'],
    spec: row.spec as unknown as ReportSpec,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
