/**
 * Teste-guarda — #892 (achado (c) do #884): o motor passa a rejeitar `datetime` sem fuso (400). O agente de IA
 * propõe registros com `data` livre, e a descrição das tools não diz o formato; o prompt também não traz o fuso do
 * usuário (que chega no `x-user-timezone` → `user.timeZone`). Resultado: "amanhã às 14h" vira `…T14:00` sem fuso e a
 * confirmação morre em 400.
 * Dono, chat, 2026-10-25: "ajusta a descrição da tool request_record_update e passa o fuso do usuário ao agente".
 * Esperado: (1) o `data` de request_record_update e request_record_creation pede ISO 8601 com Z ou offset;
 * (2) o turno do agente leva ao modelo o fuso do usuário e a hora atual nesse fuso, com o offset; sem fuso, UTC.
 */
import { ChatService } from '../services/ChatService';
import { LuminarisAgentService } from '../services/LuminarisAgentService';
import type { UserContext } from '@/lib/authUtils';
import { Role } from '@/features/users/models/User.model';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { document: { findMany: jest.fn(async () => []) } },
}));

const baseUser: UserContext = {
  id: 'user_A', userId: 'user_A', name: 'A', username: 'a', email: 'a@test.co', userEmail: 'a@test.co',
  role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date(),
};

function makeChatService() {
  const openai = {
    getChatCompletion: jest.fn().mockResolvedValue('answer'),
    getChatCompletionWithToolsAndHistory: jest.fn().mockResolvedValue({ content: 'answer', tool_calls: [] }),
    getChatCompletionWithHistory: jest.fn().mockResolvedValue('answer'),
  };
  const agent = { getTools: jest.fn().mockResolvedValue([]), handleToolCall: jest.fn(), executeProposal: jest.fn(), getProposal: jest.fn() };
  const graph = { getGraphPrompt: jest.fn().mockResolvedValue('GRAPH PROMPT') };
  const messages = {
    createMessage: jest.fn().mockResolvedValue(undefined),
    appendAssistantMessage: jest.fn().mockResolvedValue(undefined),
    getMessagesByInstance: jest.fn().mockResolvedValue({ messages: [], total: 0 }),
  };
  /* eslint-disable @typescript-eslint/no-explicit-any -- fakes de colaborador */
  const service = new ChatService(
    { embedText: jest.fn() } as any, { search: jest.fn() } as any, openai as any, agent as any, graph as any, messages as any,
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { service, openai };
}

async function systemPromptFor(user: UserContext): Promise<string> {
  const { service, openai } = makeChatService();
  await service.generateResponse({ query: 'marca uma tarefa para amanhã às 14h', user });
  const sent = openai.getChatCompletionWithToolsAndHistory.mock.calls[0][0] as Array<{ role: string; content: string }>;
  return sent.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
}

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('agente × datetime com fuso', () => {
  it.each(['request_record_update', 'request_record_creation'])('%s: o `data` pede ISO 8601 com Z ou offset', async (name) => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- colaboradores não usados por getTools */
    const agent = new LuminarisAgentService({} as any, {} as any, {} as any, {} as any);
    const tool = (await agent.getTools()).find((t) => t.type === 'function' && t.function.name === name);
    const params = (tool as unknown as { function: { parameters: { properties: { data: { description: string } } } } }).function.parameters;
    const description = params.properties.data.description;
    expect(description).toMatch(/ISO 8601/);
    expect(description).toMatch(/offset/i);
  });

  it('o prompt leva o fuso do usuário e a hora atual com offset (15:30Z → 12:30-03:00 em SP)', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-24T15:30:00.000Z'), doNotFake: ['nextTick', 'setImmediate'] });
    const prompt = await systemPromptFor({ ...baseUser, timeZone: 'America/Sao_Paulo' });
    expect(prompt).toContain('America/Sao_Paulo');
    expect(prompt).toContain('2026-10-24T12:30-03:00');
  });

  it('sem fuso (ou fuso inválido) o prompt declara UTC', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-24T15:30:00.000Z'), doNotFake: ['nextTick', 'setImmediate'] });
    const prompt = await systemPromptFor({ ...baseUser, timeZone: 'Marte/Base' });
    expect(prompt).toContain('UTC');
    expect(prompt).toContain('2026-10-24T15:30+00:00');
  });
});
