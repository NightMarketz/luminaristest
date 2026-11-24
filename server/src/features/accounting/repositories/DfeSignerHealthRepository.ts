import prisma from '../../../lib/prisma';
import type { DfeSignerHealthDevice, DfeSignerHealthEmEspera, IDfeSignerHealthRepository } from './IDfeSignerHealthRepository';

/** Repositório de leitura da saúde do assinador local (X10a EMENDA-4 AL-15). Zero regra de negócio. */
export class DfeSignerHealthRepository implements IDfeSignerHealthRepository {
  public async listDevicesVivos(): Promise<DfeSignerHealthDevice[]> {
    const devices = await prisma.dfeSignerDevice.findMany({
      where: { deletedAt: null },
      select: { id: true, certNotAfter: true, lastSeenAt: true, units: { where: { deletedAt: null }, select: { unitId: true } } },
    });
    return devices
      .filter((d) => d.units.length > 0)
      .map((d) => ({ id: d.id, certNotAfter: d.certNotAfter, lastSeenAt: d.lastSeenAt, unitIds: d.units.map((u) => u.unitId) }));
  }

  public async resumoEmEspera(unitIds: readonly string[]): Promise<DfeSignerHealthEmEspera[]> {
    if (unitIds.length === 0) return [];
    const grupos = await prisma.fiscalDocument.groupBy({
      by: ['unitId', 'status'],
      where: { unitId: { in: [...unitIds] }, status: { in: ['PENDING_SIGNATURE', 'CONTINGENCY'] }, deletedAt: null },
      _count: { _all: true },
      _min: { updatedAt: true },
    });
    return grupos.map((g) => ({
      unitId: g.unitId,
      status: g.status as DfeSignerHealthEmEspera['status'],
      quantidade: g._count._all,
      maisAntigaDesde: g._min.updatedAt!,
    }));
  }
}
