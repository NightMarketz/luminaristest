/**
 * API pública de `dynamicTables` — contratos de entrada (Zod) que outra feature lê: o schema de campo avançado e o
 * padrão da chave de tabela acrescentada no create (ADR-MODULE-BOUNDARIES §10, F-MBE-3 a; §11.9).
 * Arquivo `*.types.ts`: pela `M4` só reexporta de `models/` e `dtos/` desta feature; as definições moram em
 * `dtos/DynamicTable.dto` e `dtos/CreateDashboard.dto`.
 */
export { AdvancedFieldSchema } from '../dtos/DynamicTable.dto';
export { ADDED_TABLE_KEY_PATTERN } from '../dtos/CreateDashboard.dto';
