/**
 * BRD F-58.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-58 do inventário de estruturas implícitas).
 *
 * A entrevista pede JSON em texto livre à IA e o lia com regex + `JSON.parse`, sem schema:
 * - `AIInteractions.analyzeUserIntent` devolvia o objeto cru com o tipo declarado
 *   (`action: 'add' | 'remove' | 'done' | 'unknown'`), mesmo com `action` fora do conjunto;
 * - `CustomizationService.processAddingTable` só conferia `tableName`/`description` como verdadeiros,
 *   então um `tableName` não-string chegava ao estado da sessão.
 * O esperado (ficha: "schema Zod com o mesmo fallback"): JSON fora do formato cai no mesmo caminho do
 * JSON ilegível — `{ action: 'unknown' }` na intenção; `addMissing` (sem gravar) na tabela nova.
 */
import { CustomizationService } from '../CustomizationService';
import { StateManager } from '../StateManager';
import { AIInteractions } from '../AIInteractions';
import { FakeInterviewSessionRepository } from './fakeInterviewSessionRepository';
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';
import { DEFAULT_INTERVIEW_LOCALE, INTERVIEW_TEXT } from '../../models/interviewText';

jest.mock('../../../../lib/openai/OpenAIService', () => ({ OpenAIService: { getInstance: () => ({}) } }));

afterEach(() => jest.restoreAllMocks());

describe('BRD F-58.1 — JSON da IA fora do formato', () => {
  it.each([
    ['action fora do conjunto', '{"action":"wipe_all"}'],
    ['entity não-string', '{"action":"add","entity":42}'],
  ])('BRD F-58.1: intenção com %s → { action: "unknown" }', async (_nome, iaDevolve) => {
    const ai = new AIInteractions({} as OpenAIService);
    jest.spyOn(ai, 'getAiResponse').mockResolvedValueOnce(iaDevolve);
    await expect(ai.analyzeUserIntent('apaga tudo', 'ctx')).resolves.toEqual({ action: 'unknown' });
  });

  it('BRD F-58.1: tabela nova com tableName não-string → addMissing, sem gravar', async () => {
    const sm = new StateManager(new FakeInterviewSessionRepository());
    const svc = new CustomizationService(sm, {} as OpenAIService);
    const s = (await svc.createCustomizationSession('beautySalon', 'brd-user'))!;

    jest.spyOn(AIInteractions.prototype, 'analyzeUserIntent').mockResolvedValueOnce({ action: 'add' });
    jest.spyOn(AIInteractions.prototype, 'generateAddingGuidance').mockResolvedValue('qual?');
    await svc.processCustomizationStep(s.id, 'brd-user', [{ role: 'user', content: 'quero uma tabela nova' }]);

    const addTable = jest.spyOn(sm, 'addTable');
    jest.spyOn(AIInteractions.prototype, 'getAiResponse').mockResolvedValueOnce('{"tableName":["Fidelidade"],"description":"pontos"}');
    const res = await svc.processCustomizationStep(s.id, 'brd-user', [{ role: 'user', content: 'Fidelidade para pontos' }]);

    expect(addTable).not.toHaveBeenCalled();
    expect(res.response).toBe(INTERVIEW_TEXT[DEFAULT_INTERVIEW_LOCALE].addMissing);
  });
});
