import { logger } from '../../../lib/logger';
import type { ISchemaField } from '../../dynamicTables/models/DynamicTable.model';
import type { FieldChange } from './Types';

/**
 * Aplica uma proposta já validada (W6 item 10). Só roda em `decision:'apply'` — nenhuma escrita sai do modelo
 * (ADR-W6 §2.2, 1). O campo validado entra inteiro: o que o `AdvancedFieldSchema` aceitou é o que chega ao
 * `/dashboard/create` (item 8); `update` troca o campo pelo validado, sem mesclar sobras do original.
 */
export class FieldUpdater {
  public update(fields: ISchemaField[], changes: FieldChange[]): ISchemaField[] {
    let updated = [...fields];
    for (const change of changes) {
      switch (change.action) {
        case 'add':
          updated.push(change.field as ISchemaField);
          break;
        case 'remove':
          updated = updated.filter((f) => f.name !== change.originalName);
          break;
        case 'update':
          updated = updated.map((f) => (f.name === change.originalName ? (change.field as ISchemaField) : f));
          break;
      }
    }
    logger.debug(`[FieldUpdater] ${changes.length} mudança(s) aplicada(s)`);
    return updated;
  }
}
