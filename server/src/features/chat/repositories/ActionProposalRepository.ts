import prisma from '../../../lib/prisma';
import { ActionProposal, Prisma } from 'generated/prisma';
import { ActionProposalCreateInput, IActionProposalRepository } from './IActionProposalRepository';

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
                    payload: data.payload === null ? Prisma.JsonNull : (data.payload as Prisma.InputJsonValue),
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
            },
        });
    }

    async deleteByUserId(userId: string): Promise<void> {
        await prisma.actionProposal.deleteMany({ where: { userId } });
    }
}
