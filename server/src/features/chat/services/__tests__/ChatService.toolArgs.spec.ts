/**
 * BRD F-57.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-57 do inventário de estruturas implícitas).
 *
 * No laço de ferramentas do modo agente, a mensagem do assistente (com seus `tool_calls`) entra no
 * histórico antes da execução. Quando os argumentos de uma chamada não eram JSON, o laço fazia
 * `continue` sem empilhar a mensagem `role:'tool'` daquele `tool_call_id`: a rodada seguinte mandava ao
 * provedor uma chamada sem resposta. O esperado: toda chamada recebe a sua mensagem `tool`, aqui com um
 * erro de ferramenta para o modelo corrigir ou explicar.
 */
import { ChatService } from '../ChatService';
import type { UserContext } from '@/lib/authUtils';
import { Role } from '@/features/users/models/User.model';

const user: UserContext = {
  id: 'user_A', userId: 'user_A', name: 'A', username: 'a', email: 'a@test.co', userEmail: 'a@test.co',
  role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date(),
};

function makeService() {
  const search = { search: jest.fn().mockResolvedValue({ hits: [], stamp: 'fake:det@768' }) };
  const openai = {
    getChatCompletion: jest.fn().mockResolvedValue('answer'),
    getChatCompletionWithToolsAndHistory: jest.fn(),
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
  const service = new ChatService(search as any, openai as any, agent as any, graph as any, messages as any);
  return { service, openai, agent };
}

describe('BRD F-57.1 — chamada de ferramenta com argumentos ilegíveis', () => {
  it('BRD F-57.1: a chamada recebe a mensagem tool (erro de ferramenta) antes da rodada seguinte', async () => {
    const { service, openai, agent } = makeService();
    openai.getChatCompletionWithToolsAndHistory
      .mockResolvedValueOnce({
        content: null,
        tool_calls: [{ id: 'c1', type: 'function', function: { name: 'query_table_data', arguments: '{"tableId": ' } }],
      })
      .mockResolvedValueOnce({ content: 'Não consegui ler os argumentos.', tool_calls: [] });

    const res = await service.generateResponse({ query: 'quantas vendas?', user });

    expect(res.type).toBe('TEXT');
    expect(agent.handleToolCall).not.toHaveBeenCalled();
    expect(openai.getChatCompletionWithToolsAndHistory).toHaveBeenCalledTimes(2);
    const sent = openai.getChatCompletionWithToolsAndHistory.mock.calls[1][0] as Array<{ role: string; tool_call_id?: string; content?: string }>;
    const toolMsg = sent.find((m) => m.role === 'tool' && m.tool_call_id === 'c1');
    expect(toolMsg).toBeDefined();
    expect(JSON.parse(toolMsg!.content!)).toMatchObject({ error: expect.any(String), message: expect.any(String) });
  });
});
