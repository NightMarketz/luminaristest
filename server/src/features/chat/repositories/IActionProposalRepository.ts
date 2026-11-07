import { ActionProposal, Prisma } from 'generated/prisma';

/** Ciclo da proposta (BE-INCR-TEAMMATES PR-7, itens 31–33). */
export type ActionProposalStatus = 'PENDING' | 'EXECUTED' | 'REJECTED' | 'EXPIRED';

export interface IActionProposalRepository {
    create(data: ActionProposalCreateInput): Promise<ActionProposal>;
    findById(id: string): Promise<ActionProposal | null>;
    delete(id: string): Promise<void>;
    findByUserId(userId: string): Promise<ActionProposal[]>;
    /**
     * Apaga as PENDING do chat com mais de `hours` horas. Só as sem `expiresAt` (D-2026-11-07-TM-PR7-LACUNAS, L-PR7-3):
     * a proposta com prazo próprio (teammate) segue o ciclo PENDING → EXECUTED/REJECTED/EXPIRED e fica na caixa.
     */
    deleteOldProposals(hours: number): Promise<void>;
    /** PR-7 item 31: a caixa única — as duas origens (chat e teammates) do dono, num status. */
    listByStatus(userId: string, status: ActionProposalStatus): Promise<ActionProposal[]>;
    /** Proposta do dono (outro dono ⇒ `null` ⇒ 404). */
    findOwned(userId: string, id: string, tx?: Prisma.TransactionClient): Promise<ActionProposal | null>;
    /** Troca o status só se ainda for `from` (corrida entre dois cliques / o scheduler): `false` = alguém chegou antes. */
    transition(id: string, from: ActionProposalStatus, to: ActionProposalStatus, tx?: Prisma.TransactionClient): Promise<boolean>;
    /** PR-7 item 33: PENDING com `expiresAt` < `now` → EXPIRED. Devolve quantas mudaram. */
    expireDue(now: Date): Promise<number>;
    runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
    /** Apaga TODAS as propostas do usuário (reset do sistema / compensação do onboarding). */
    deleteByUserId(userId: string): Promise<void>;
}

/** Campos da emenda F-TM-8 a (BE-INCR-TEAMMATES PR-0) são opcionais: o default do Prisma cobre `kind = TABLE_ROW`. */
export type ActionProposalCreateInput = Omit<ActionProposal, 'id' | 'createdAt' | 'updatedAt' | ActionProposalAmendmentField> &
    Partial<Pick<ActionProposal, ActionProposalAmendmentField>>;
type ActionProposalAmendmentField = 'kind' | 'payload' | 'teammateId' | 'channelMessageId' | 'expiresAt';
