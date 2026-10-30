/**
 * FIX-CHAT-AGENTE lote A — testes-guarda dos achados §3.3 do ACHADOS-2026-10-19 (#2, #3, #8, #13, #22).
 * Autorização: dono, chat, 2026-10-21 ("Autorizo instrumentar e corrigir os achados de … FIX-CHAT-AGENTE (§3.3)")
 * e 2026-10-22 ("Todos os 22 em série").
 *
 * Cada `it` afirma o comportamento correto; antes do fix falha na asserção final.
 * Lote D (dono, 2026-10-29): o guarda do #13 saiu com a rota `qdrant-status` e o do log `warn` da extração (#8)
 * saiu com `extractStructuredData` (R26 aposentado) — ver `features/documents/__tests__/fixChatAgenteLoteD.test.ts`.
 */
import { ChatService } from '../services/ChatService';
import { LuminarisAgentService } from '../services/LuminarisAgentService';
import { OpenAIService } from '@/lib/openai/OpenAIService';
import type { UserContext } from '@/lib/authUtils';
import { Role } from '@/features/users/models/User.model';
import logger from '@/lib/logger';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { document: { findMany: jest.fn(async () => []) } },
}));

jest.mock('@/lib/authUtils', () => ({
  getUserContextFromRequest: () => ({ id: 'user_A', userId: 'user_A' }),
}));

const user: UserContext = {
  id: 'user_A', userId: 'user_A', name: 'A', username: 'a', email: 'a@test.co', userEmail: 'a@test.co',
  role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date(),
};

function makeChatService() {
  const openai = {
    getChatCompletion: jest.fn().mockResolvedValue('answer'),
    getChatCompletionWithToolsAndHistory: jest.fn().mockResolvedValue({ content: 'answer', tool_calls: [] }),
    getChatCompletionWithHistory: jest.fn().mockResolvedValue('answer'),
  };
  const agent = {
    getTools: jest.fn().mockResolvedValue([]),
    handleToolCall: jest.fn(),
    executeProposal: jest.fn(),
    getProposal: jest.fn(),
  };
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
  return { service, openai, agent, messages };
}

afterEach(() => jest.restoreAllMocks());

describe('#2 — agente com memória entre turnos', () => {
  it('sem history do cliente, o turno do agente leva ao modelo as mensagens já persistidas da instância', async () => {
    const { service, openai, messages } = makeChatService();
    messages.getMessagesByInstance.mockResolvedValue({
      messages: [
        { id: 'm1', role: 'user', content: 'Meu cliente se chama Joana', createdAt: new Date() },
        { id: 'm2', role: 'assistant', content: 'Anotado, Joana.', createdAt: new Date() },
      ],
      total: 2,
    });

    await service.generateResponse({ query: 'qual o nome do cliente?', chatInstanceId: 'ci_1', user });

    const sent = openai.getChatCompletionWithToolsAndHistory.mock.calls[0][0] as Array<{ role: string; content: string }>;
    expect(sent.filter((m) => m.role !== 'system')).toEqual([
      { role: 'user', content: 'Meu cliente se chama Joana' },
      { role: 'assistant', content: 'Anotado, Joana.' },
      { role: 'user', content: 'qual o nome do cliente?' },
    ]);
  });
});

describe('#3 — loop de tools com mais de um passo', () => {
  it('query_table_data → request_record_update no mesmo turno devolve ACTION_PROPOSAL', async () => {
    const { service, openai, agent } = makeChatService();
    openai.getChatCompletionWithToolsAndHistory
      .mockResolvedValueOnce({ tool_calls: [{ id: 't1', function: { name: 'query_table_data', arguments: '{"tableId":"tbl"}' } }] })
      .mockResolvedValueOnce({ tool_calls: [{ id: 't2', function: { name: 'request_record_update', arguments: '{"tableId":"tbl","recordId":"r1","data":{"status":"Won"}}' } }] });
    agent.handleToolCall
      .mockResolvedValueOnce({ rows: [{ id: 'r1', data: { status: 'Open' } }], total: 1, returned: 1, truncated: false })
      .mockResolvedValueOnce({ status: 'PROPOSED', proposalId: 'p1' });
    agent.getProposal.mockResolvedValue({ id: 'p1', action: 'UPDATE', tableName: 'deals', tableLabel: 'deals', data: { status: 'Won', id: 'r1' } });

    const res = await service.generateResponse({ query: 'marca o negócio aberto como ganho', user });

    expect(res.type).toBe('ACTION_PROPOSAL');
  });
});

describe('#8 — PII fora do log', () => {
  it('handleToolCall não grava os valores de `args` no log info', async () => {
    const info = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    /* eslint-disable @typescript-eslint/no-explicit-any -- fakes de colaborador */
    const agent = new LuminarisAgentService(
      { getTableById: jest.fn().mockResolvedValue({ id: 'tbl', name: 'customers' }) } as any,
      { create: jest.fn() } as any,
      { canManageData: () => false } as any,
      { afterDataWrite: jest.fn() } as any,
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    await agent.handleToolCall(user, 'request_record_creation', {
      tableId: 'tbl', data: { name: 'Joana Pereira', cpf: '123.456.789-09' },
    });

    expect(JSON.stringify(info.mock.calls)).not.toMatch(/Joana Pereira|123\.456\.789-09/);
  });

});

describe('#22 — RequestLock não confunde pedidos diferentes', () => {
  it('duas mensagens distintas com o mesmo hash de 32 bits ("Aa" × "BB") recebem cada uma a sua resposta', async () => {
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'ci-dummy-openai-key';
    const svc = OpenAIService.getInstance();
    const create = jest.fn(async ({ messages }: { messages: Array<{ role: string; content: string }> }) => {
      await new Promise((r) => setTimeout(r, 5));
      return { model: 'gpt-3.5-turbo', usage: { prompt_tokens: 1, completion_tokens: 1 }, choices: [{ message: { content: `resp:${messages[1].content}` } }] };
    });
    (svc as unknown as { openai: unknown }).openai = { chat: { completions: { create } } };

    const [a, b] = await Promise.all([
      svc.getChatCompletion('Aa', 'mesmo system'),
      svc.getChatCompletion('BB', 'mesmo system'),
    ]);

    expect([a, b]).toEqual(['resp:Aa', 'resp:BB']);
  });
});
