import prisma from '../../../lib/prisma';
import type { DfeSignerTask } from 'generated/prisma';
import type { DfeSignerTaskStatus } from '../models/DfeSigner.model';
import type { DfeSignerTaskData, IDfeSignerTaskRepository } from './IDfeSignerTaskRepository';

const ABERTAS = ['PENDING', 'DELIVERED'];

/** Repositório Prisma da fila do assinador local (X10a EMENDA-4 AL-PR-3). Zero regra de negócio. */
export class DfeSignerTaskRepository implements IDfeSignerTaskRepository {
  public async create(data: DfeSignerTaskData): Promise<DfeSignerTask> {
    return prisma.dfeSignerTask.create({ data });
  }

  public async claim(deviceId: string, now: Date, leaseUntil: Date): Promise<DfeSignerTask[]> {
    const elegivel = { deviceId, expiresAt: { gt: now }, OR: [{ status: 'PENDING' }, { status: 'DELIVERED', leaseUntil: { lt: now } }] };
    const candidatas = await prisma.dfeSignerTask.findMany({ where: elegivel, orderBy: { createdAt: 'asc' } });
    const entregues: DfeSignerTask[] = [];
    for (const t of candidatas) {
      // AL-6: lease curto para toda tarefa; a reentrega só vem depois de `leaseUntil < agora` (sem heartbeat do caixa).
      const r = await prisma.dfeSignerTask.updateMany({ where: { id: t.id, ...elegivel }, data: { status: 'DELIVERED', leaseUntil } });
      if (r.count === 1) entregues.push({ ...t, status: 'DELIVERED', leaseUntil });
    }
    return entregues;
  }

  public async renovarLease(id: string, deviceId: string, now: Date, leaseUntil: Date): Promise<boolean> {
    // Só a tarefa entregue, deste dispositivo e ainda não vencida (expiresAt > agora): o update condicional decide.
    const r = await prisma.dfeSignerTask.updateMany({
      where: { id, deviceId, status: 'DELIVERED', expiresAt: { gt: now } },
      data: { leaseUntil },
    });
    return r.count === 1;
  }

  public async findForDevice(deviceId: string, id: string): Promise<DfeSignerTask | null> {
    return prisma.dfeSignerTask.findFirst({ where: { id, deviceId } });
  }

  public async complete(id: string, status: Extract<DfeSignerTaskStatus, 'DONE' | 'FAILED'>, resultHash: string): Promise<boolean> {
    const r = await prisma.dfeSignerTask.updateMany({ where: { id, status: { in: ABERTAS } }, data: { status, resultHash, payload: null, leaseUntil: null } });
    return r.count === 1;
  }

  public async expire(id: string): Promise<boolean> {
    const r = await prisma.dfeSignerTask.updateMany({ where: { id, status: { in: ABERTAS } }, data: { status: 'EXPIRED', payload: null, leaseUntil: null } });
    return r.count === 1;
  }

  public async expirarPendente(id: string): Promise<boolean> {
    const r = await prisma.dfeSignerTask.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'EXPIRED', payload: null, leaseUntil: null } });
    return r.count === 1;
  }}
