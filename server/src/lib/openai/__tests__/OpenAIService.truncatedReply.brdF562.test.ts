/**
 * BRD F-56.2 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-56 do inventário de estruturas implícitas).
 *
 * `finish_reason` não era lido em nenhum cliente: resposta cortada pelo limite de tokens (`finish_reason:
 * 'length'`) passava como completa. Decisão do dono (questionário de 10/11, BRD Q7 = a): "texto com aviso de
 * corte". Comportamento esperado: nos métodos de texto livre do `OpenAIService`, resposta com `finish_reason
 * 'length'` volta com o texto recebido seguido do aviso de corte; `stop` volta intacta.
 */
import { OpenAIService } from '../OpenAIService';

const AVISO = /^\n\n\[Resposta cortada/;

function serviceReplying(content: string | null, finish_reason: string): OpenAIService {
  const anterior = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = anterior ?? 'teste';
  const service = new OpenAIService();
  process.env.OPENAI_API_KEY = anterior;
  const create = jest.fn(async () => ({
    model: 'gpt-4o',
    usage: { prompt_tokens: 1, completion_tokens: 1 },
    choices: [{ message: { role: 'assistant', content }, finish_reason }],
  }));
  Object.assign(service as unknown as { openai: unknown }, { openai: { chat: { completions: { create } } } });
  Object.assign(OpenAIService as unknown as { instance: unknown }, { instance: service });
  return service;
}

describe('BRD F-56.2 — resposta cortada pelo limite de tokens leva aviso', () => {
  it('BRD F-56.2 getChatCompletionWithHistory: length ⇒ texto + aviso', async () => {
    const r = await serviceReplying('Parte da resposta', 'length').getChatCompletionWithHistory([{ role: 'user', content: 'oi' }]);
    expect(r?.startsWith("Parte da resposta")).toBe(true);
    expect(r?.slice("Parte da resposta".length)).toMatch(AVISO);
  });

  it('BRD F-56.2 getChatCompletion: length ⇒ texto + aviso', async () => {
    const r = await serviceReplying('Parte A', 'length').getChatCompletion('pergunta f562', 'sistema f562');
    expect(r?.startsWith("Parte A")).toBe(true);
    expect(r?.slice("Parte A".length)).toMatch(AVISO);
  });

  it('BRD F-56.2 getChatCompletionWithToolsAndHistory: length ⇒ content + aviso', async () => {
    const m = await serviceReplying('Resposta do agente', 'length').getChatCompletionWithToolsAndHistory([{ role: 'user', content: 'oi' }], []);
    expect(m?.content?.startsWith("Resposta do agente")).toBe(true);
    expect(m?.content?.slice("Resposta do agente".length)).toMatch(AVISO);
  });

  it('BRD F-56.2 controle: stop ⇒ texto intacto', async () => {
    const r = await serviceReplying('Resposta inteira', 'stop').getChatCompletionWithHistory([{ role: 'user', content: 'oi' }]);
    expect(r).toBe('Resposta inteira');
  });
});
