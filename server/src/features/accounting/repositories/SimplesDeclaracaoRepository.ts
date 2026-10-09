import prisma from '../../../lib/prisma';
import type { Prisma, SimplesDeclaracaoAnual } from 'generated/prisma';
import { accountingScopeWhere, type AccountingScope } from '../scope/AccountingScope';
import type { ISimplesDeclaracaoRepository, TipoDeclaracaoSimples } from './ISimplesDeclaracaoRepository';

/** Repositório Prisma de `simples_declaracoes_anuais` (X14 PR-4). Zero regra de negócio (ver o contrato). */
export class SimplesDeclaracaoRepository implements ISimplesDeclaracaoRepository {
  public async find(scope: AccountingScope, ano: number, tipo: TipoDeclaracaoSimples): Promise<SimplesDeclaracaoAnual | null> {
    return prisma.simplesDeclaracaoAnual.findFirst({ where: { ...accountingScopeWhere(scope), ano, tipo } });
  }

  public async upsert(scope: AccountingScope, ano: number, tipo: TipoDeclaracaoSimples, dados: Prisma.InputJsonValue): Promise<SimplesDeclaracaoAnual> {
    const where = accountingScopeWhere(scope);
    return prisma.simplesDeclaracaoAnual.upsert({
      where: { userId_unitId_ano_tipo: { userId: where.userId, unitId: where.unitId, ano, tipo } },
      create: { ...where, ano, tipo, dados, createdById: scope.actorUserId, updatedById: scope.actorUserId },
      update: { dados, updatedById: scope.actorUserId },
    });
  }
}
