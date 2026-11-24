/**
 * API pública de `dynamicTables` — vocabulário do registro de módulos e a forma da trava de remoção
 * (ADR-MODULE-BOUNDARIES §10, F-MBE-3 a; §11.6).
 * Arquivo `*.types.ts`: é o que policy, model e DTO de outra feature podem importar. Pela `M4` só reexporta de
 * `models/` e `dtos/` desta feature; as definições moram em `models/PresetModuleKeys` e `models/TableLock`.
 */
export { moduleSelectorSchema } from '../models/PresetModuleKeys';
export type { ModuleKey, ModuleSelector } from '../models/PresetModuleKeys';
export type { TableLock } from '../models/TableLock';
