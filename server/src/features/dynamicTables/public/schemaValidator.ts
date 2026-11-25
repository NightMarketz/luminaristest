/**
 * API pública de `dynamicTables` — validação de linha contra o schema da tabela (ADR-MODULE-BOUNDARIES §10,
 * F-MBE-3 a; §11.6). Só reexporta por nome; a classe mora em `services/SchemaValidator`.
 */
export { SchemaValidator } from '../services/SchemaValidator';
