import { logger } from '../../../lib/logger';
import { ICustomizableTable } from '../models/InterviewTypes';
import type { ISchemaField } from '../../../features/dynamicTables/models/DynamicTable.model';
import type { PresetTableDefinition } from '../../../features/dynamicTables/presets';
import { computeTableLocks } from '../../../features/dynamicTables/presets/removability';

interface IPreset {
  key: string;
  tables: Record<string, PresetTableDefinition>;
}

/**
 * Classe responsável por extrair informações de tabelas dos presets
 */
export class TableExtractor {

  /**
   * Extrai tabelas do preset real usando o PresetService
   */
  public extractTablesFromRealPreset(preset: IPreset): ICustomizableTable[] {
    logger.info(`[TableExtractor] Extraindo tabelas reais do preset: ${preset.key}`);
    
    if (!preset.tables) {
      logger.error(`[TableExtractor] Preset não possui tabelas definidas: ${preset.key}`);
      return [];
    }
    
    // W2 item 4 (BE-INCR-WIZARD-REMOVABILITY): a trava vem da regra única de remoção, não de um `isCore` fixo.
    const locks = computeTableLocks(preset.tables, new Set(Object.keys(preset.tables)));

    // Extrai as tabelas do objeto do preset
    const customizableTables: ICustomizableTable[] = Object.entries(preset.tables)
      .map(([tableKey, tableSchema]: [string, unknown]) => {
        // Verifica se a tabela tem as informações necessárias
        if (!tableSchema) return null;
        const ts = tableSchema as Record<string, unknown>;

        // Deriva o nome e descrição a partir do schema da tabela
        const name = (ts.label as string | undefined) || this.formatTableName(tableKey);
        const description = (ts.description as string | undefined) || `Tabela de ${name}`;

        // Extrai corretamente os campos do schema da tabela
        let fields: Array<{ name: string; label: string; type: string; required: boolean; hidden: boolean }> = [];
        const tsSchema = ts.schema as Record<string, unknown> | undefined;

        // Verifica se temos campos no schema (estrutura correta dos presets)
        if (tsSchema && tsSchema.fields && Array.isArray(tsSchema.fields)) {
          fields = tsSchema.fields.map((field: ISchemaField) => ({
            name: field.name,
            label: field.label || field.name,
            type: field.type || 'string',
            required: !!field.required,
            hidden: false // Por padrão os campos são visíveis
          }));
          
          logger.info(`[TableExtractor] Tabela ${name} possui ${fields.length} campos`);
        } else {
          // Fallback para caso o schema não siga o formato esperado
          logger.warn(`[TableExtractor] Tabela ${name} não possui estrutura de schema.fields válida`);
        }
        
        return {
          key: tableKey,
          name,
          description,
          isSelected: true,  // Por padrão, todas as tabelas do preset estão selecionadas
          isCore: locks[tableKey] !== null, // derivado da trava (o FE lê `isCore`)
          lock: locks[tableKey],
          fields: fields
        };
      })
      .filter(Boolean) as ICustomizableTable[];
      
    logger.info(`[TableExtractor] Tabelas extraídas: ${customizableTables.length}`);
    return customizableTables;
  }
  
  /**
   * Formata o nome da tabela de snake_case para um formato legível
   */
  private formatTableName(tableKey: string): string {
    // Transforma snake_case em palavras separadas e capitaliza cada palavra
    return tableKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
