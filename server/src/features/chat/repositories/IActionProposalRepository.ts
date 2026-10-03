import { ActionProposal } from 'generated/prisma';

export interface IActionProposalRepository {
    create(data: Omit<ActionProposal, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActionProposal>;
    findById(id: string): Promise<ActionProposal | null>;
    delete(id: string): Promise<void>;
    findByUserId(userId: string): Promise<ActionProposal[]>;
    deleteOldProposals(hours: number): Promise<void>;
    /** Apaga TODAS as propostas do usuário (reset do sistema / compensação do onboarding). */
    deleteByUserId(userId: string): Promise<void>;
}
