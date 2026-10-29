/**
 * Unit tests for the pure JSON-repair helper extracted from OpenAIService. LLMs occasionally return
 * slightly-malformed JSON (trailing commas, unquoted keys, smart quotes); this guards the repairs.
 */
import {
  OpenAIService,
  buildEnumResponseFormat,
  buildEnumSetResponseFormat,
  parseEnumChoice,
  parseEnumSetChoice,
  tryFixMalformedJson,
} from '../OpenAIService';

const parse = (s: string | null) => (s === null ? null : JSON.parse(s));

describe('tryFixMalformedJson', () => {
  it('returns valid JSON unchanged', () => {
    expect(tryFixMalformedJson('{"a":1,"b":[1,2]}')).toBe('{"a":1,"b":[1,2]}');
  });

  it('repairs trailing commas in objects and arrays', () => {
    expect(parse(tryFixMalformedJson('{"a":1,}'))).toEqual({ a: 1 });
    expect(parse(tryFixMalformedJson('[1,2,3,]'))).toEqual([1, 2, 3]);
  });

  it('quotes unquoted object keys', () => {
    expect(parse(tryFixMalformedJson('{a:1, b:2}'))).toEqual({ a: 1, b: 2 });
  });

  it('replaces smart quotes with straight quotes', () => {
    expect(parse(tryFixMalformedJson('{“a”:1}'))).toEqual({ a: 1 });
  });

  it('returns null for input it cannot repair', () => {
    expect(tryFixMalformedJson('this is not json at all <<<')).toBeNull();
  });
});

/** BE-INCR-KIT-SETOR-EMENDA-1 PR-K3, item 7c (L1 de 13/10): classificação presa a um enum por structured outputs. */
describe('classifyIntoEnum', () => {
  const OPCOES = ['cabeleireiro', 'estetica'];

  it('o response_format é json_schema strict, com key = enum das opções ou null', () => {
    expect(buildEnumResponseFormat(OPCOES)).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'classificacao',
        strict: true,
        schema: {
          type: 'object',
          properties: { key: { anyOf: [{ type: 'string', enum: OPCOES }, { type: 'null' }] } },
          required: ['key'],
          additionalProperties: false,
        },
      },
    });
  });

  it.each([
    ['{"key":"estetica"}', 'estetica'],
    ['{"key":null}', null],
    ['{"key":"inventada"}', null],
    ['não é json', null],
    [null, null],
  ])('parseEnumChoice(%s) ⇒ %s', (content, esperado) => {
    expect(parseEnumChoice(content, OPCOES)).toBe(esperado);
  });

  it('chama o modelo FALLBACK com o schema e devolve só opção conhecida', async () => {
    const anterior = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = anterior ?? 'teste';
    const service = new OpenAIService();
    process.env.OPENAI_API_KEY = anterior;
    const create = jest.fn(async () => ({ choices: [{ message: { content: '{"key":"cabeleireiro"}' } }] }));
    Object.assign(service as unknown as { openai: unknown }, { openai: { chat: { completions: { create } } } });

    await expect(service.classifyIntoEnum('Corte', 'classifique', OPCOES)).resolves.toBe('cabeleireiro');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o-mini', response_format: buildEnumResponseFormat(OPCOES) }));
    await expect(service.classifyIntoEnum('Corte', 'classifique', [])).resolves.toBeNull();
    expect(create).toHaveBeenCalledTimes(1);
  });
});

/** W5 item 9 (c12 do I8): escolha MÚLTIPLA presa ao conjunto — irmã do `classifyIntoEnum`. */
describe('classifyIntoEnumSet', () => {
  const OPCOES = ['CRM-1', 'CRM-2A', 'CRM-3'];

  it('o response_format é json_schema strict, com keys = array de itens do enum', () => {
    expect(buildEnumSetResponseFormat(OPCOES)).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'selecao',
        strict: true,
        schema: {
          type: 'object',
          properties: { keys: { type: 'array', items: { type: 'string', enum: OPCOES } } },
          required: ['keys'],
          additionalProperties: false,
        },
      },
    });
  });

  it.each([
    ['{"keys":["CRM-3","CRM-1"]}', ['CRM-3', 'CRM-1']],
    ['{"keys":[]}', []],
    ['{"keys":["CRM-9","CRM-1"]}', ['CRM-1']],
    ['{"keys":["CRM-1","CRM-1"]}', ['CRM-1']],
    ['{"keys":"CRM-1"}', []],
    ['não é json', []],
    [null, []],
  ])('parseEnumSetChoice(%s) ⇒ %j', (content, esperado) => {
    expect(parseEnumSetChoice(content, OPCOES)).toEqual(esperado);
  });

  it('chama o modelo FALLBACK com o schema; sem opções não chama', async () => {
    const anterior = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = anterior ?? 'teste';
    const service = new OpenAIService();
    process.env.OPENAI_API_KEY = anterior;
    const create = jest.fn(async () => ({ choices: [{ message: { content: '{"keys":["CRM-2A"]}' } }] }));
    Object.assign(service as unknown as { openai: unknown }, { openai: { chat: { completions: { create } } } });

    await expect(service.classifyIntoEnumSet('B2B', 'escolha', OPCOES)).resolves.toEqual(['CRM-2A']);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini', response_format: buildEnumSetResponseFormat(OPCOES) }),
    );
    await expect(service.classifyIntoEnumSet('B2B', 'escolha', [])).resolves.toEqual([]);
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('uso de tokens por chamada (I11 PR-3, onUsage)', () => {
  function withCreate(create: jest.Mock) {
    const anterior = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = anterior ?? 'teste';
    const service = new OpenAIService();
    process.env.OPENAI_API_KEY = anterior;
    Object.assign(service as unknown as { openai: unknown }, { openai: { chat: { completions: { create } } } });
    // getChatCompletion usa o singleton: aponta-o para a mesma instância falsa.
    Object.assign(OpenAIService as unknown as { instance: unknown }, { instance: service });
    return service;
  }
  const reply = (model: string, usage?: { prompt_tokens: number; completion_tokens: number }) =>
    ({ model, usage, choices: [{ message: { content: 'ok' } }] });

  it('as três chamadas do chat devolvem model/prompt/completion da resposta', async () => {
    const create = jest.fn()
      .mockResolvedValueOnce(reply('gpt-3.5-turbo-0125', { prompt_tokens: 10, completion_tokens: 2 }))
      .mockResolvedValueOnce(reply('gpt-3.5-turbo-0125', { prompt_tokens: 20, completion_tokens: 3 }))
      .mockResolvedValueOnce(reply('gpt-4o-2024-08-06', { prompt_tokens: 30, completion_tokens: 4 }));
    const service = withCreate(create);
    const got: unknown[] = [];

    await service.getChatCompletion('q-uso-1', 'sys', u => got.push(u));
    await service.getChatCompletionWithHistory([{ role: 'user', content: 'x' }], undefined, u => got.push(u));
    await service.getChatCompletionWithToolsAndHistory([{ role: 'user', content: 'x' }], [], undefined, u => got.push(u));

    expect(got).toEqual([
      { model: 'gpt-3.5-turbo-0125', promptTokens: 10, completionTokens: 2 },
      { model: 'gpt-3.5-turbo-0125', promptTokens: 20, completionTokens: 3 },
      { model: 'gpt-4o-2024-08-06', promptTokens: 30, completionTokens: 4 },
    ]);
  });

  it('usage ausente → 0 tokens (com aviso no log)', async () => {
    const service = withCreate(jest.fn().mockResolvedValue(reply('gpt-3.5-turbo-0125')));
    const onUsage = jest.fn();

    await service.getChatCompletionWithHistory([{ role: 'user', content: 'x' }], undefined, onUsage);

    expect(onUsage).toHaveBeenCalledWith({ model: 'gpt-3.5-turbo-0125', promptTokens: 0, completionTokens: 0 });
  });

  it('chamadas coalescidas pelo RequestLock contam uma vez: só quem disparou recebe o uso', async () => {
    let release!: () => void;
    const create = jest.fn(() => new Promise(resolve => {
      release = () => resolve(reply('gpt-3.5-turbo-0125', { prompt_tokens: 7, completion_tokens: 1 }));
    }));
    const service = withCreate(create);
    const first = jest.fn();
    const second = jest.fn();

    const a = service.getChatCompletion('q-coalesce', 'sys', first);
    const b = service.getChatCompletion('q-coalesce', 'sys', second);
    await new Promise(r => setImmediate(r));
    release();
    await Promise.all([a, b]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});

/**
 * Modelo enviado por chamada. A família gpt-3.5 foi desativada pela OpenAI (404 model_not_found em 2026-10-24) e
 * derrubava a Entrevista com IA no 1º turno; troca para gpt-4o-mini por decisão do dono. Trava o nome por método.
 */
describe('modelo enviado à API por chamada', () => {
  function withCreate(create: jest.Mock) {
    const anterior = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = anterior ?? 'teste';
    const service = new OpenAIService();
    process.env.OPENAI_API_KEY = anterior;
    Object.assign(service as unknown as { openai: unknown }, { openai: { chat: { completions: { create } } } });
    Object.assign(OpenAIService as unknown as { instance: unknown }, { instance: service });
    return service;
  }
  const ok = (content: string) => ({ model: 'x', choices: [{ message: { content } }] });
  const modelOf = (create: jest.Mock, i = 0) => (create.mock.calls[i][0] as { model: string }).model;

  it.each([
    ['getChatCompletion (chat RAG)', 'gpt-4o-mini', (s: OpenAIService) => s.getChatCompletion('q-modelo', 'sys')],
    ['getChatCompletionWithHistory (entrevista/customização)', 'gpt-4o-mini', (s: OpenAIService) => s.getChatCompletionWithHistory([{ role: 'user', content: 'x' }])],
    ['getChatCompletionWithToolsAndHistory (agente)', 'gpt-4o', (s: OpenAIService) => s.getChatCompletionWithToolsAndHistory([{ role: 'user', content: 'x' }], [])],
    ['completeWithJsonSchema (W6)', 'gpt-4o-mini', (s: OpenAIService) => s.completeWithJsonSchema([{ role: 'user', content: 'x' }], { type: 'json_schema', json_schema: { name: 'n' } })],
  ])('%s usa %s', async (_nome, esperado, call) => {
    const create = jest.fn().mockResolvedValue(ok('true'));
    await call(withCreate(create));
    expect(modelOf(create)).toBe(esperado);
  });

  it('nenhuma chamada sai com modelo da família gpt-3.5', async () => {
    const create = jest.fn().mockResolvedValue(ok('{"key":null,"keys":[]}'));
    const s = withCreate(create);
    await s.getChatCompletion('q-sem-35', 'sys');
    await s.getChatCompletionWithHistory([{ role: 'user', content: 'x' }]);
    await s.classifyIntoEnum('x', 'sys', ['a']);
    await s.classifyIntoEnumSet('x', 'sys', ['a']);
    expect(create.mock.calls.map(c => (c[0] as { model: string }).model).filter(m => m.startsWith('gpt-3.5'))).toEqual([]);
  });
});
