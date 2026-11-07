/**
 * BE-INCR-RAG-DOCUMENTOS, emenda de 07/11 (dois modos de resposta no RAG), itens 15a–15f — provas do checklist.
 * Forks: D-2026-11-07-RAG-MODOS (F-RAG-M1..M7). O modelo é falso; a busca (DocumentSearchService) é falsa; o agente
 * (LuminarisAgentService) é o real no 15f.
 */
import { ChatService } from '../services/ChatService';
import { LuminarisAgentService } from '../services/LuminarisAgentService';
import { ChatRequestSchema, ChatResponseSchema, RagTechnicalSchema } from '../dtos/ChatDto';
import { UNTRUSTED_OPEN } from '@/lib/untrustedData';
import { ctxFor } from '@test/helpers/auth';
import type { DocumentSearchHit } from '@/features/documents/dtos/DocumentDto';

jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {} }));

const ana = ctxFor({ id: 'ana', username: 'ana' });
const STAMP = 'openai:text-embedding-3-small@768';
type OnUsage = (u: { model: string; promptTokens: number; completionTokens: number }) => void;
type Msg = { role: string; content?: string | null; tool_call_id?: string };

const hit = (i: number): DocumentSearchHit => ({
  chunkId: `chunk-${i}`, documentId: 'contrato', fileName: 'contrato.pdf', chunkIndex: i, text: `trecho ${i}`, score: 0.9 - i / 100,
});

/* eslint-disable @typescript-eslint/no-explicit-any -- fakes de colaborador */
function ragSetup(hits: DocumentSearchHit[], answer: string) {
  const search = { search: jest.fn().mockResolvedValue({ hits, stamp: STAMP }) };
  const openai = {
    getChatCompletion: jest.fn(async (_q: string, _s: string, onUsage: OnUsage) => {
      onUsage({ model: 'gpt-4o-2024-08-06', promptTokens: 10, completionTokens: 5 });
      return answer;
    }),
    getChatCompletionWithToolsAndHistory: jest.fn(),
  };
  const messages = { createMessage: jest.fn(), appendAssistantMessage: jest.fn(), getMessagesByInstance: jest.fn().mockResolvedValue({ messages: [] }) };
  const chat = new ChatService(search as any, openai as any, {} as any, {} as any, messages as any);
  return { chat, openai, messages };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('15a — modo no pedido', () => {
  it('sem o campo, o turno cai no RÁPIDO (sem citations, prompt sem marcadores)', async () => {
    const { chat, openai } = ragSetup([hit(1)], 'resposta [1]');
    const r = await chat.generateResponse({ query: 'q', documentIds: ['contrato'], user: ana });
    expect(r.citations).toBeUndefined();
    expect(openai.getChatCompletion.mock.calls[0][0]).not.toContain('[1]');
  });

  it('valor fora do enum → schema recusa (400 na rota)', () => {
    expect(ChatRequestSchema.safeParse({ query: 'q', ragMode: 'DETALHADO' }).success).toBe(false);
    expect(ChatRequestSchema.safeParse({ query: 'q', ragMode: 'DESCRITIVO' }).success).toBe(true);
  });
});

describe('15b — modo descritivo', () => {
  it('modelo responde "x [2] y [9]" sobre 3 trechos → citations só com o [2], no chunkId do 2º trecho', async () => {
    const { chat, openai } = ragSetup([hit(1), hit(2), hit(3)], 'x [2] y [9]');
    const r = await chat.generateResponse({ query: 'q', documentIds: ['contrato'], ragMode: 'DESCRITIVO', user: ana });

    expect(r.citations).toEqual([{ marker: 2, chunkId: 'chunk-2' }]);
    const [prompt, system] = openai.getChatCompletion.mock.calls[0];
    // trechos numerados e delimitados como dado não confiável (item 17); o system manda citar
    expect(prompt).toContain('[1] (contrato.pdf, trecho 1)');
    expect(prompt).toContain('[3] (contrato.pdf, trecho 3)');
    expect(prompt).toContain(UNTRUSTED_OPEN);
    expect(system).toContain('cite entre colchetes o número do trecho');
    expect(ChatResponseSchema.parse(r)).toEqual(r);
  });
});

describe('15c — modo rápido', () => {
  it('sem citations, prompt de antes (sem marcadores) e sourceDocuments devolvido (F-RAG-M3)', async () => {
    const { chat, openai } = ragSetup([hit(1), hit(2)], 'resposta');
    const r = await chat.generateResponse({ query: 'q', documentIds: ['contrato'], ragMode: 'RAPIDO', user: ana });

    expect(r).not.toHaveProperty('citations');
    const [prompt, system] = openai.getChatCompletion.mock.calls[0];
    expect(prompt).toBe('Contexto:\n---\ntrecho 1\n\n---\n\ntrecho 2\n---\nPergunta: "q"');
    expect(system).not.toContain('colchetes');
    expect(r.sourceDocuments?.map((s) => s.id)).toEqual(['chunk-1', 'chunk-2']);
  });
});

describe('15d — dados técnicos do acerto', () => {
  it('cada sourceDocuments traz technical (com o carimbo) e answerModel; nenhum userId no payload', async () => {
    const { chat } = ragSetup([hit(1)], 'resposta');
    const r = await chat.generateResponse({ query: 'q', documentIds: ['contrato'], user: ana });

    expect(r.answerModel).toBe('gpt-4o-2024-08-06');
    expect(r.sourceDocuments?.[0].technical).toEqual({
      chunkId: 'chunk-1', documentId: 'contrato', fileName: 'contrato.pdf', chunkIndex: 1, score: 0.89, embeddingStamp: STAMP,
    });
    expect(JSON.stringify(r)).not.toContain('userId');
    // o schema é estrito: campo a mais no technical não passa
    expect(RagTechnicalSchema.safeParse({ ...r.sourceDocuments![0].technical, userId: 'x' }).success).toBe(false);
  });
});

describe('15e — persistência no histórico', () => {
  it('a mensagem do ASSISTANT é gravada com ragDetail { mode, citations, sources, answerModel }', async () => {
    const { chat, messages } = ragSetup([hit(1), hit(2)], 'a [2]');
    await chat.generateResponse({ query: 'q', documentIds: ['contrato'], ragMode: 'DESCRITIVO', chatInstanceId: 'ci', user: ana });

    const ragDetail = messages.appendAssistantMessage.mock.calls[0][4];
    expect(ragDetail).toMatchObject({
      mode: 'DESCRITIVO',
      citations: [{ marker: 2, chunkId: 'chunk-2' }],
      answerModel: 'gpt-4o-2024-08-06',
    });
    expect(ragDetail.sources.map((s: { chunkId: string }) => s.chunkId)).toEqual(['chunk-1', 'chunk-2']);
  });

  it('turno sem trecho (agente sem busca) grava ragDetail null', async () => {
    const openai = { getChatCompletionWithToolsAndHistory: jest.fn().mockResolvedValue({ content: 'oi', tool_calls: [] }) };
    const messages = { createMessage: jest.fn(), appendAssistantMessage: jest.fn(), getMessagesByInstance: jest.fn().mockResolvedValue({ messages: [] }) };
    /* eslint-disable @typescript-eslint/no-explicit-any -- fakes de colaborador */
    const chat = new ChatService({} as any, openai as any, { getTools: jest.fn().mockResolvedValue([]) } as any,
      { getGraphPrompt: jest.fn().mockResolvedValue('G') } as any, messages as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    await chat.generateResponse({ query: 'oi', chatInstanceId: 'ci', ragMode: 'DESCRITIVO', user: ana });
    expect(messages.appendAssistantMessage.mock.calls[0][4]).toBeNull();
  });
});

describe('15f — descritivo no modo agente', () => {
  function agentSetup(ragMode: 'DESCRITIVO' | 'RAPIDO', finalAnswer: string) {
    const search = jest.fn()
      .mockResolvedValueOnce({ hits: [hit(1), hit(2), hit(3)], stamp: STAMP })
      .mockResolvedValueOnce({ hits: [hit(4), hit(5)], stamp: STAMP });
    /* eslint-disable @typescript-eslint/no-explicit-any -- colaboradores do agente não usados por search_documents */
    const agent = new LuminarisAgentService({} as any, {} as any, {} as any, {} as any, { search } as any);
    const call = (id: string, q: string) => ({
      role: 'assistant', content: null,
      tool_calls: [{ id, type: 'function', function: { name: 'search_documents', arguments: JSON.stringify({ query: q }) } }],
    });
    const openai = {
      getChatCompletionWithToolsAndHistory: jest.fn()
        .mockResolvedValueOnce(call('c1', 'multa'))
        .mockResolvedValueOnce(call('c2', 'prazo'))
        .mockImplementationOnce(async (_m: unknown, _t: unknown, _x: unknown, onUsage: OnUsage) => {
          onUsage({ model: 'gpt-4o-2024-08-06', promptTokens: 1, completionTokens: 1 });
          return { role: 'assistant', content: finalAnswer, tool_calls: [] };
        }),
    };
    const messages = { createMessage: jest.fn(), appendAssistantMessage: jest.fn(), getMessagesByInstance: jest.fn().mockResolvedValue({ messages: [] }) };
    const chat = new ChatService({} as any, openai as any, agent, { getGraphPrompt: jest.fn().mockResolvedValue('G') } as any, messages as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return { chat, openai };
  }

  const toolPayload = (openai: { getChatCompletionWithToolsAndHistory: jest.Mock }, callIdx: number, id: string) => {
    const msgs = openai.getChatCompletionWithToolsAndHistory.mock.calls[callIdx][0] as Msg[];
    return JSON.parse(msgs.find((m) => m.role === 'tool' && m.tool_call_id === id)!.content!) as { results: string };
  };

  it('2 chamadas (3 + 2 trechos), resposta "a [4] b [7]" → citations só com o [4], chunkId do 1º trecho da 2ª chamada', async () => {
    const { chat, openai } = agentSetup('DESCRITIVO', 'a [4] b [7]');
    const r = await chat.generateResponse({ query: 'multa e prazo?', ragMode: 'DESCRITIVO', user: ana });

    expect(r.citations).toEqual([{ marker: 4, chunkId: 'chunk-4' }]);
    expect(r.sourceDocuments?.map((s) => s.technical?.chunkId)).toEqual(['chunk-1', 'chunk-2', 'chunk-3', 'chunk-4', 'chunk-5']);
    expect(r.answerModel).toBe('gpt-4o-2024-08-06');
    // numeração contínua no turno: a 2ª chamada começa no 4; o chunkId não vai ao modelo
    expect(toolPayload(openai, 1, 'c1').results).toContain('"marker":1');
    const second = toolPayload(openai, 2, 'c2').results;
    expect(second).toContain('"marker":4');
    expect(second).toContain('"marker":5');
    expect(second).not.toContain('chunkId');
    expect(second).toContain(UNTRUSTED_OPEN);
    // o prompt do agente manda citar
    const sys = (openai.getChatCompletionWithToolsAndHistory.mock.calls[0][0] as Msg[]).filter((m) => m.role === 'system');
    expect(sys.some((m) => m.content?.includes('cite o número dele entre colchetes'))).toBe(true);
  });

  it('com RAPIDO a ferramenta devolve os trechos sem marcador (como no item 16) e a resposta não tem citations', async () => {
    const { chat, openai } = agentSetup('RAPIDO', 'a [4]');
    const r = await chat.generateResponse({ query: 'multa e prazo?', ragMode: 'RAPIDO', user: ana });

    expect(r.citations).toBeUndefined();
    expect(r.sourceDocuments).toEqual([]);
    const first = toolPayload(openai, 1, 'c1').results;
    expect(first).not.toContain('marker');
    expect(first).toContain('"fileName":"contrato.pdf"');
    const sys = (openai.getChatCompletionWithToolsAndHistory.mock.calls[0][0] as Msg[]).filter((m) => m.role === 'system');
    expect(sys.some((m) => m.content?.includes('colchetes'))).toBe(false);
  });
});
