import prisma from '../../../lib/prisma';
import type { DfeSignerDevice, DfeSignerDeviceUnit, DfeSignerPairingCode, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { DfeSignerDeviceData, DfeSignerDeviceWithUnits, IDfeSignerRepository } from './IDfeSignerRepository';

const LIVE_UNITS = { units: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' as const } } };

/** Repositório Prisma do assinador local (X10a EMENDA-4 AL-PR-2). Zero regra de negócio. */
export class DfeSignerRepository implements IDfeSignerRepository {
  public async createPairingCode(
    scope: AccountingScope,
    data: { codeHash: string; expiresAt: Date },
    tx?: Prisma.TransactionClient,
  ): Promise<DfeSignerPairingCode> {
    return (tx ?? prisma).dfeSignerPairingCode.create({
      data: { ...accountingScopeWhere(scope), actorUserId: scope.actorUserId, ...data },
    });
  }

  public async findPairingCode(codeHash: string): Promise<DfeSignerPairingCode | null> {
    return prisma.dfeSignerPairingCode.findUnique({ where: { codeHash } });
  }

  public async consumePairingCode(id: string, at: Date, tx: Prisma.TransactionClient): Promise<boolean> {
    const r = await tx.dfeSignerPairingCode.updateMany({ where: { id, usedAt: null, expiresAt: { gt: at } }, data: { usedAt: at } });
    return r.count === 1;
  }

  public async findLiveDeviceByTokenHash(tokenHash: string): Promise<DfeSignerDeviceWithUnits | null> {
    return prisma.dfeSignerDevice.findFirst({ where: { tokenHash, deletedAt: null }, include: LIVE_UNITS });
  }

  public async findLiveDeviceById(id: string): Promise<DfeSignerDeviceWithUnits | null> {
    return prisma.dfeSignerDevice.findFirst({ where: { id, deletedAt: null }, include: LIVE_UNITS });
  }

  public async findLiveDeviceForUnit(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<DfeSignerDeviceWithUnits | null> {
    return (tx ?? prisma).dfeSignerDevice.findFirst({
      where: { deletedAt: null, userId: scope.ownerUserId, units: { some: { ...accountingScopeWhere(scope), deletedAt: null } } },
      include: LIVE_UNITS,
    });
  }

  public async createDevice(data: DfeSignerDeviceData, tx: Prisma.TransactionClient): Promise<DfeSignerDevice> {
    return tx.dfeSignerDevice.create({ data });
  }

  public async linkUnit(deviceId: string, scope: AccountingScope, tx: Prisma.TransactionClient): Promise<DfeSignerDeviceUnit> {
    const where = accountingScopeWhere(scope);
    return tx.dfeSignerDeviceUnit.upsert({
      where: { deviceId_unitId: { deviceId, unitId: where.unitId } },
      create: { deviceId, ...where },
      update: { deletedAt: null, createdAt: new Date() },
    });
  }

  public async unlinkUnit(deviceId: string, unitId: string, at: Date, tx: Prisma.TransactionClient): Promise<void> {
    await tx.dfeSignerDeviceUnit.updateMany({ where: { deviceId, unitId, deletedAt: null }, data: { deletedAt: at } });
  }

  public async countLiveLinks(deviceId: string, tx: Prisma.TransactionClient): Promise<number> {
    return tx.dfeSignerDeviceUnit.count({ where: { deviceId, deletedAt: null } });
  }

  public async revokeDevice(deviceId: string, at: Date, tx: Prisma.TransactionClient): Promise<void> {
    await tx.dfeSignerDevice.updateMany({ where: { id: deviceId, deletedAt: null }, data: { deletedAt: at } });
  }

  public async registrarHeartbeat(
    deviceId: string,
    data: { versaoAssinador: string; tokenPresente: boolean; at: Date },
    voltouSeAntesDe: Date,
  ): Promise<boolean> {
    const set = { versaoAssinador: data.versaoAssinador, tokenPresente: data.tokenPresente, lastSeenAt: data.at };
    const voltou = await prisma.dfeSignerDevice.updateMany({
      where: { id: deviceId, deletedAt: null, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: voltouSeAntesDe } }, { tokenPresente: false }] },
      data: set,
    });
    if (voltou.count === 1) return true;
    await prisma.dfeSignerDevice.updateMany({ where: { id: deviceId, deletedAt: null }, data: set });
    return false;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
