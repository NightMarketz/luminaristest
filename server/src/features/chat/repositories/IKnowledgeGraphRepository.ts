import type { KnowledgeGraph } from 'generated/prisma';
import { KnowledgeGraphData } from '../services/KnowledgeGraphService';

export interface IKnowledgeGraphRepository {
    findByUserId(userId: string): Promise<KnowledgeGraph | null>;
    upsert(userId: string, data: KnowledgeGraphData): Promise<void>;
    /** Apaga o grafo do usuário, se existir (reset do sistema / compensação do onboarding). */
    deleteByUserId(userId: string): Promise<void>;
}
