import prisma from '../../../lib/prisma';
import type { Prisma } from 'generated/prisma';
import type { IMcpServerRepository } from './IMcpServerRepository';

/** Repositório Prisma de `mcp_servers` — só a leitura do item 12 (o CRUD é do PR-10). Zero regra de negócio. */
export class McpServerRepository implements IMcpServerRepository {
  public async findLiveIds(userId: string, ids: string[], tx?: Prisma.TransactionClient): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await (tx ?? prisma).mcpServer.findMany({ where: { userId, deletedAt: null, id: { in: ids } }, select: { id: true } });
    return new Set(rows.map((r) => r.id));
  }
}
