/**
 * Lacuna L-20261111-214837-3484 (RUNBOOK-W7, 2ª execução, passo 8): o `CustomizeFields` (painel direito, modo IA) não
 * recebia `locale`; com a UI em inglês o modelo respondia e rotulava o campo em português. O `ChatInterview` já manda
 * `locale` e usa `replyIn`; aqui o mesmo contrato vale para a mensagem do painel de campos.
 */
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';
import { StateManager } from '../../CustomizationService/StateManager';
import { FakeInterviewSessionRepository } from '../../CustomizationService/__tests__/fakeInterviewSessionRepository';
import { CustomizeFieldsDto } from '../../dtos/CustomizeFields.dto';
import type { ICustomizableTable } from '../../models/InterviewTypes';
import { FieldCustomizationService } from '..';
import { FieldPresetMatcher } from '../FieldPresetMatcher';
import { FieldUpdater } from '../FieldUpdater';

const USER = 'loc-dono';
const T0 = new Date('2026-11-12T12:00:00.000Z');
const clientes = (): ICustomizableTable => ({
  name: 'Clientes', key: 'clientes', description: 'Cadastro', isSelected: true, isCore: false, conversationHistory: [],
  fields: [{ name: 'nome', label: 'Nome', type: 'string', required: true }],
});

async function setup() {
  const sm = new StateManager(new FakeInterviewSessionRepository(), () => T0);
  const completeWithJsonSchema = jest.fn().mockResolvedValue(JSON.stringify({ friendlyMessage: 'ok', changes: [] }));
  const service = new FieldCustomizationService(
    sm, { completeWithJsonSchema } as unknown as OpenAIService, new FieldPresetMatcher(), new FieldUpdater(), () => T0, () => 'p-1',
  );
  const session = await sm.createSessionState(USER, 'beautySalon', 'Salão', [clientes()]);
  const systemPromptOf = () => (completeWithJsonSchema.mock.calls[0][0] as Array<{ role: string; content: string }>)[0].content;
  return { service, session, systemPromptOf };
}

describe('CustomizeFields — idioma da resposta (L-20261111-214837-3484)', () => {
  it('o DTO aceita `locale` na mensagem e rejeita valor fora de pt/en', () => {
    const base = { kind: 'message', sessionId: 's', tableKey: 'clientes', message: 'oi' };
    expect(CustomizeFieldsDto.safeParse({ ...base, locale: 'en' }).success).toBe(true);
    expect(CustomizeFieldsDto.safeParse({ ...base, locale: 'fr' }).success).toBe(false);
    expect(CustomizeFieldsDto.safeParse(base).success).toBe(true);
  });

  it('locale=en: o prompt de sistema manda responder em inglês', async () => {
    const { service, session, systemPromptOf } = await setup();
    await service.handle(USER, { kind: 'message', sessionId: session.id, tableKey: 'clientes', message: 'add notes', locale: 'en' });
    expect(systemPromptOf()).toContain('em inglês (en-US)');
  });

  it('sem locale: segue em português (comportamento de antes)', async () => {
    const { service, session, systemPromptOf } = await setup();
    await service.handle(USER, { kind: 'message', sessionId: session.id, tableKey: 'clientes', message: 'add notes' });
    expect(systemPromptOf()).toContain('português do Brasil');
    expect(systemPromptOf()).not.toContain('en-US');
  });
});
