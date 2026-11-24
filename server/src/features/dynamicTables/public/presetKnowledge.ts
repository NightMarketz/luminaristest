/**
 * API pública de `dynamicTables` — bases de conhecimento que a IA da entrevista lê: suítes, módulos e presets de campo
 * (ADR-MODULE-BOUNDARIES §10, F-MBE-3 a; §11.6). Só reexporta por nome; a definição mora em `domain/presets/ai/` e
 * `domain/presets/fields/`.
 */
export { presetKnowledgeBase } from '../domain/presets/ai/PresetKnowledgeBase';
export type { IPresetKnowledge } from '../domain/presets/ai/PresetKnowledgeBase';
export { moduleKnowledge } from '../domain/presets/ai/ModuleKnowledgeBase';
export { fieldPresetKnowledgeBase } from '../domain/presets/fields/FieldPresetKnowledgeBase';
export type { IFieldPresetKnowledge } from '../domain/presets/fields/FieldPresetKnowledgeBase';
