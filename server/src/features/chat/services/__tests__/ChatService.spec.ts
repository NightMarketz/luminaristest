/**
 * Computation unit tests for ChatService — the orchestration logic, with ALL external dependencies
 * faked (no OpenAI, no vector store, no DB). This is the "computation tests" leg of the gold set for a
 * non-CRUD capability feature (chat has no Policy/Repository of its own).
 *
 * Covers: RAG vs Agent mode selection, the Tier-0 invariant (vector search scoped to the caller's
 * userId; proposals executed for the caller), action proposals, and the server-owned persistence
 * orchestration (user message before generation, assistant reply best-effort after).
 */
import { ChatService } from '../ChatService';
import type { UserContext } from '@/lib/authUtils';
import { Role } from '@/features/users/models/User.model';
import { ForbiddenError } from '@/lib/errors';

// The RAG ownership guard (Tier-0) queries the Prisma singleton directly; in unit tests every
// requested documentId is treated as owned by the caller (the guard's own denial path is covered
// by the integration suite against the real DB).
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    document: {
      findMany: jest.fn(async (args: { where: { id: { in: string[] } } }) =>
        args.where.id.in.map((id: string) => ({ id }))),
    },
  },
}));


const user: UserContext = {
  id: 'user_A', userId: 'user_A', name: 'A', username: 'a', email: 'a@test.co', userEmail: 'a@test.co',
  role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date(),
};

/** Builds a ChatService with fresh fakes for every collaborator; tests configure them per case. */
function makeService() {
  const embedding = { embedText: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) };
  const vector = { search: jest.fn().mockResolvedValue([]) };
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
  const messages = { createMessage: jest.fn().mockResolvedValue(undefined), appendAssistantMessage: jest.fn().mockResolvedValue(undefined) };

  const service = new ChatService(
    embedding as any, vector as any, openai as any, agent as any, graph as any, messages as any
  );
  return { service, embedding, vector, openai, agent, graph, messages };
}

describe('RAG mode (documentIds present)', () => {
  it('searches scoped to the caller userId and returns the answer + sources (Tier-0)', async () => {
    const { service, embedding, vector, openai } = makeService();
    vector.search.mockResolvedValue([
      { id: 'v1', score: 0.9, payload: { documentId: 'd1', userId: 'user_A', textContent: 'context', fileName: 'f', chunkId: 'c', index: 0 } },
    ]);
    openai.getChatCompletion.mockResolvedValue('Grounded answer');

    const res = await service.generateResponse({ query: 'q', documentIds: ['d1'], user });

    expect(res.type).toBe('TEXT');
    expect(res.answer).toBe('Grounded answer');
    expect(res.sourceDocuments).toHaveLength(1);
    expect(embedding.embedText).toHaveBeenCalled();
    // Tier-0: the search MUST be scoped to the caller and the requested docs.
    expect(vector.search).toHaveBeenCalledWith(expect.anything(), 10, ['d1'], 'user_A');
  });

  it('returns a no-results message when nothing is found (and does not call the LLM)', async () => {
    const { service, vector, openai } = makeService();
    vector.search.mockResolvedValue([]);

    const res = await service.generateResponse({ query: 'q', documentIds: ['d1'], user });

    expect(res.answer).toMatch(/não encontrei/i);
    expect(res.sourceDocuments).toEqual([]);
    expect(openai.getChatCompletion).not.toHaveBeenCalled();
  });
});

describe('Agent mode (no documentIds)', () => {
  it('returns the model text answer when no tool is called', async () => {
    const { service, openai, graph } = makeService();
    openai.getChatCompletionWithToolsAndHistory.mockResolvedValue({ content: 'Agent answer', tool_calls: [] });

    const res = await service.generateResponse({ query: 'hi', user });

    expect(res.answer).toBe('Agent answer');
    expect(res.type).toBe('TEXT');
    expect(graph.getGraphPrompt).toHaveBeenCalledWith('user_A');
  });

  it('returns an ACTION_PROPOSAL when a tool call proposes an action', async () => {
    const { service, openai, agent } = makeService();
    openai.getChatCompletionWithToolsAndHistory.mockResolvedValue({
      tool_calls: [{ id: 't1', function: { name: 'request_record_creation', arguments: '{}' } }],
    });
    agent.handleToolCall.mockResolvedValue({ status: 'PROPOSED', proposalId: 'p1' });
    agent.getProposal.mockResolvedValue({ id: 'p1', action: 'CREATE', tableName: 'sales', tableLabel: 'Sales', data: {} });

    const res = await service.generateResponse({ query: 'create a sale', user });

    expect(res.type).toBe('ACTION_PROPOSAL');
    expect(res.proposal?.id).toBe('p1');
    expect(res.proposal?.tableName).toBe('sales');
  });

  it('a tool that refuses with an AgentToolError lets the turn fall through to a text answer (F-I11-3 a)', async () => {
    const { service, openai, agent } = makeService();
    openai.getChatCompletionWithToolsAndHistory.mockResolvedValue({
      tool_calls: [{ id: 't1', function: { name: 'request_record_creation', arguments: '{"tableId":"tbl","data":{"a":1}}' } }],
    });
    agent.handleToolCall.mockResolvedValue({ error: 'SEM_PERMISSAO', message: 'sem permissão' });
    openai.getChatCompletionWithHistory.mockResolvedValue('Você não tem permissão nessa tabela.');

    const res = await service.generateResponse({ query: 'create a sale', user });

    expect(res.type).toBe('TEXT');
    expect(res.answer).toBe('Você não tem permissão nessa tabela.');
    expect(agent.getProposal).not.toHaveBeenCalled();
    // The refusal reaches the model as the tool message, so it can explain it.
    const messagesSent = openai.getChatCompletionWithHistory.mock.calls[0][0];
    expect(messagesSent[messagesSent.length - 1]).toMatchObject({ role: 'tool', tool_call_id: 't1', content: JSON.stringify({ error: 'SEM_PERMISSAO', message: 'sem permissão' }) });
  });
});

describe('confirmed proposal', () => {
  it('executes the proposal for the caller and returns a success message (Tier-0)', async () => {
    const { service, agent } = makeService();
    agent.executeProposal.mockResolvedValue({ result: { id: 'rec_1' } });

    const res = await service.generateResponse({ confirmedProposalId: 'p1', user });

    expect(res.type).toBe('TEXT');
    expect(res.answer).toContain('rec_1');
    expect(agent.executeProposal).toHaveBeenCalledWith(user, 'p1');
  });
});

describe('conversation persistence (server-owned)', () => {
  it('persists the user message, then the assistant reply, when a chatInstanceId is present', async () => {
    const { service, openai, messages } = makeService();
    openai.getChatCompletionWithToolsAndHistory.mockResolvedValue({ content: 'ok', tool_calls: [] });

    await service.generateResponse({ query: 'hi', chatInstanceId: 'ci_1', user });

    expect(messages.createMessage).toHaveBeenCalledWith({ content: 'hi', chatInstanceId: 'ci_1' }, user);
    expect(messages.appendAssistantMessage).toHaveBeenCalledWith('ci_1', 'ok', user, expect.objectContaining({ calls: [] }));
  });

  it('still returns the answer if persisting the assistant reply fails (best-effort)', async () => {
    const { service, openai, messages } = makeService();
    openai.getChatCompletionWithToolsAndHistory.mockResolvedValue({ content: 'ok', tool_calls: [] });
    messages.appendAssistantMessage.mockRejectedValue(new Error('db hiccup'));

    const res = await service.generateResponse({ query: 'hi', chatInstanceId: 'ci_1', user });

    expect(res.answer).toBe('ok');
  });

  it('propagates an ownership error from the user message and never reaches the model (Tier-0)', async () => {
    const { service, messages, openai } = makeService();
    messages.createMessage.mockRejectedValue(new ForbiddenError('not your instance'));

    await expect(
      service.generateResponse({ query: 'hi', chatInstanceId: 'ci_other', user })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(openai.getChatCompletionWithToolsAndHistory).not.toHaveBeenCalled();
  });
});

describe('token usage per assistant message (I11 PR-3)', () => {
  type OnUsage = (u: { model: string; promptTokens: number; completionTokens: number }) => void;
  const gpt4o = { model: 'gpt-4o-2024-08-06', promptTokens: 1200, completionTokens: 40 };
  const gpt35 = { model: 'gpt-3.5-turbo-0125', promptTokens: 900, completionTokens: 120 };

  it('agent turn with a tool: gpt-4o + gpt-3.5 calls are summed and kept per call', async () => {
    const { service, openai, agent, messages } = makeService();
    openai.getChatCompletionWithToolsAndHistory.mockImplementation(async (_m: unknown, _t: unknown, _model: unknown, onUsage: OnUsage) => {
      onUsage(gpt4o);
      return { tool_calls: [{ id: 't1', function: { name: 'list_my_tables', arguments: '{}' } }] };
    });
    agent.handleToolCall.mockResolvedValue([]);
    openai.getChatCompletionWithHistory.mockImplementation(async (_m: unknown, _model: unknown, onUsage: OnUsage) => {
      onUsage(gpt35);
      return 'Você tem 0 tabelas.';
    });

    await service.generateResponse({ query: 'tabelas?', chatInstanceId: 'ci_1', user });

    expect(messages.appendAssistantMessage).toHaveBeenCalledWith('ci_1', 'Você tem 0 tabelas.', user, {
      promptTokens: 2100,
      completionTokens: 160,
      model: 'gpt-4o-2024-08-06+gpt-3.5-turbo-0125',
      calls: [gpt4o, gpt35],
    });
  });

  it('action proposal turn records the gpt-4o call that proposed it', async () => {
    const { service, openai, agent, messages } = makeService();
    openai.getChatCompletionWithToolsAndHistory.mockImplementation(async (_m: unknown, _t: unknown, _model: unknown, onUsage: OnUsage) => {
      onUsage(gpt4o);
      return { tool_calls: [{ id: 't1', function: { name: 'request_record_creation', arguments: '{}' } }] };
    });
    agent.handleToolCall.mockResolvedValue({ status: 'PROPOSED', proposalId: 'p1' });
    agent.getProposal.mockResolvedValue({ id: 'p1', action: 'CREATE', tableName: 'sales', tableLabel: 'Sales', data: {} });

    const res = await service.generateResponse({ query: 'cria', chatInstanceId: 'ci_1', user });

    expect(res.type).toBe('ACTION_PROPOSAL');
    expect(messages.appendAssistantMessage).toHaveBeenCalledWith('ci_1', expect.any(String), user,
      { promptTokens: 1200, completionTokens: 40, model: 'gpt-4o-2024-08-06', calls: [gpt4o] });
  });

  it('confirmation turn makes no LLM call and records 0/0', async () => {
    const { service, agent, messages } = makeService();
    agent.executeProposal.mockResolvedValue({ result: { id: 'rec_1' } });

    await service.generateResponse({ confirmedProposalId: 'p1', chatInstanceId: 'ci_1', user });

    expect(messages.appendAssistantMessage).toHaveBeenCalledWith('ci_1', expect.any(String), user,
      { promptTokens: 0, completionTokens: 0, model: null, calls: [] });
  });

  it('RAG turn sums the rewrite and the answer (embedding excluded — F-I11-5 a)', async () => {
    const { service, openai, vector, messages } = makeService();
    vector.search.mockResolvedValue([
      { id: 'v1', score: 0.9, payload: { documentId: 'd1', userId: 'user_A', textContent: 'ctx', fileName: 'f', chunkId: 'c', index: 0 } },
    ]);
    const rewrite = { model: 'gpt-3.5-turbo-0125', promptTokens: 80, completionTokens: 15 };
    openai.getChatCompletion
      .mockImplementationOnce(async (_q: string, _s: unknown, onUsage: OnUsage) => { onUsage(rewrite); return 'pergunta reescrita'; })
      .mockImplementationOnce(async (_q: string, _s: unknown, onUsage: OnUsage) => { onUsage(gpt35); return 'resposta'; });

    await service.generateResponse({
      query: 'e o prazo?', documentIds: ['d1'], chatInstanceId: 'ci_1', user,
      history: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }],
    });

    expect(messages.appendAssistantMessage).toHaveBeenCalledWith('ci_1', 'resposta', user,
      { promptTokens: 980, completionTokens: 135, model: 'gpt-3.5-turbo-0125', calls: [rewrite, gpt35] });
  });

  it('the USER message is persisted without usage (columns stay null)', async () => {
    const { service, messages } = makeService();

    await service.generateResponse({ query: 'hi', chatInstanceId: 'ci_1', user });

    expect(messages.createMessage).toHaveBeenCalledWith({ content: 'hi', chatInstanceId: 'ci_1' }, user);
  });
});
