import prisma from '../../../lib/prisma';
import { ActionProposal, Prisma } from 'generated/prisma';
import { ActionProposalCreateInput, ActionProposalStatus, IActionProposalRepository } from './IActionProposalRepository';

export class ActionProposalRepository implements IActionProposalRepository {
    async create(data: ActionProposalCreateInput): Promise<ActionProposal> {
        return prisma.actionProposal.create({
            data: {
                userId: data.userId,
                action: data.action,
                tableId: data.tableId,
                tableName: data.tableName,
                tableLabel: data.tableLabel,
                data: (data.data ?? {}) as Prisma.InputJsonValue,
                status: data.status || 'PENDING',
                // Emenda F-TM-8 a (TEAMMATES PR-0): os campos novos chegam ao Prisma; ausentes, valem os defaults.
                ...(data.kind !== undefined && { kind: data.kind }),
                ...(data.payload !== undefined && {
                    payload: data.payload === null ? Prisma.DbNull : (data.payload as Prisma.InputJsonValue),
                }),
                ...(data.teammateId !== undefined && { teammateId: data.teammateId }),
                ...(data.channelMessageId !== undefined && { channelMessageId: data.channelMessageId }),
                ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
            },
        });
    }

    async findById(id: string): Promise<ActionProposal | null> {
        return prisma.actionProposal.findUnique({
            where: { id },
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.actionProposal.delete({
            where: { id },
        });
    }

    async findByUserId(userId: string): Promise<ActionProposal[]> {
        return prisma.actionProposal.findMany({
            where: { userId, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
        });
    }

    async deleteOldProposals(hours: number): Promise<void> {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        await prisma.actionProposal.deleteMany({
            where: {
                createdAt: { lt: cutoff },
                status: 'PENDING',
                expiresAt: null, // L-PR7-3: a proposta com prazo próprio fica para o ProposalExpiryScheduler
            },
        });
    }

    async deleteByUserId(userId: string): Promise<void> {
        await prisma.actionProposal.deleteMany({ where: { userId } });
    }

    async listByStatus(userId: string, status: ActionProposalStatus): Promise<ActionProposal[]> {
        return prisma.actionProposal.findMany({ where: { userId, status }, orderBy: { createdAt: 'desc' } });
    }

    async findOwned(userId: string, id: string, tx?: Prisma.TransactionClient): Promise<ActionProposal | null> {
        return (tx ?? prisma).actionProposal.findFirst({ where: { id, userId } });
    }

    async transition(id: string, from: ActionProposalStatus, to: ActionProposalStatus, tx?: Prisma.TransactionClient): Promise<boolean> {
        const { count } = await (tx ?? prisma).actionProposal.updateMany({ where: { id, status: from }, data: { status: to } });
        return count === 1;
    }

    async expireDue(now: Date): Promise<number> {
        const { count } = await prisma.actionProposal.updateMany({
            where: { status: 'PENDING', expiresAt: { lt: now } },
            data: { status: 'EXPIRED' },
        });
        return count;
    }

    async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return prisma.$transaction(fn);
    }
}
