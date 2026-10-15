/**
 * Unit tests for the pure JSON-repair helper extracted from OpenAIService. LLMs occasionally return
 * slightly-malformed JSON (trailing commas, unquoted keys, smart quotes); this guards the repairs.
 */
import { OpenAIService, buildEnumResponseFormat, parseEnumChoice, tryFixMalformedJson } from '../OpenAIService';

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
