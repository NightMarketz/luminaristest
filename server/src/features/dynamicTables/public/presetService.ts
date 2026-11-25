/**
 * API pública de `dynamicTables` — o serviço de presets (a instância que a entrevista usa para resolver a suíte e as
 * tabelas de um preset). Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.9; dono, questionário, 25/11/2026: "Pagar as
 * 14"). Só reexporta por nome; a instância mora em `services/PresetService`.
 */
export { presetService } from '../services/PresetService';
