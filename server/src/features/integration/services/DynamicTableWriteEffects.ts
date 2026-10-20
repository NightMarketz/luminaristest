import logger from '../../../lib/logger';
import type { KnowledgeGraphService } from '../../chat/services/KnowledgeGraphService';
import type { KpiCacheService } from '../../analytics/services/KpiCacheService';
import type { IDynamicTableWriteEffects } from './IDynamicTableWriteEffects';

/**
 * Implementação única dos efeitos pós-escrita do motor DynamicTable (BE-INCR-DT-NO-CONSUMER-CALLS).
 * Mora fora do motor (F8 → y): não pertence ao chat nem ao analytics, só os conhece.
 */
export class DynamicTableWriteEffects implements IDynamicTableWriteEffects {
  constructor(
    private readonly graph: Pick<KnowledgeGraphService, 'syncGraph'>,
    private readonly kpiCache: Pick<KpiCacheService, 'invalidate'>,
  ) {}

  afterDataWrite(ownerUserId: string): void {
    this.kpiCache.invalidate(ownerUserId);
  }

  async afterStructureWrite(ownerUserId: string): Promise<void> {
    this.kpiCache.invalidate(ownerUserId);
    try {
      await this.graph.syncGraph(ownerUserId);
    } catch (err) {
      logger.error('KnowledgeGraph sync failed after a DynamicTable structure write', {
        userId: ownerUserId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}
