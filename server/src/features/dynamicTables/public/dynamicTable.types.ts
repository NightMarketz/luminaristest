/**
 * Porta pública do motor DynamicTable — só tipo: a tabela, o esquema, o campo e a relação.
 * Arquivo `*.types.ts`: reexporta de `models/` e é o que policy, model e DTO de outra feature podem importar
 * (regras `M4`, `L5`, `L6`). ADR-MODULE-BOUNDARIES §11.8; dono, questionário, 25/11/2026: "Pagar as 29".
 */
export type { IDynamicTable, ITableSchema, ISchemaField, IFieldRelation } from '../models/DynamicTable.model';
