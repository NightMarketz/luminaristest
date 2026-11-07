import { ActionProposal } from 'generated/prisma';

export interface IActionProposalRepository {
    create(data: ActionProposalCreateInput): Promise<ActionProposal>;
    findById(id: string): Promise<ActionProposal | null>;
    delete(id: string): Promise<void>;
    findByUserId(userId: string): Promise<ActionProposal[]>;
    deleteOldProposals(hours: number): Promise<void>;
    /** Apaga TODAS as propostas do usuário (reset do sistema / compensação do onboarding). */
    deleteByUserId(userId: string): Promise<void>;
}

/** Campos da emenda F-TM-8 a (BE-INCR-TEAMMATES PR-0) são opcionais: o default do Prisma cobre `kind = TABLE_ROW`. */
export type ActionProposalCreateInput = Omit<ActionProposal, 'id' | 'createdAt' | 'updatedAt' | ActionProposalAmendmentField> &
    Partial<Pick<ActionProposal, ActionProposalAmendmentField>>;
type ActionProposalAmendmentField = 'kind' | 'payload' | 'teammateId' | 'channelMessageId' | 'expiresAt';
