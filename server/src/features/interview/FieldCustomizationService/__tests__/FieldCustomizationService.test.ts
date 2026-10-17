/**
 * BE-INCR-W6-CUSTOMIZE-FIELDS (nó W6) — itens 3–11 do BRIEF (`docs/accounting/WIZARD-W6-CUSTOMIZE-FIELDS-brief.md`),
 * sobre o `StateManager` do W4 com repositório falso e o modelo falso. Lacunas decididas pelo dono em 16/10: falha do
 * modelo grava usuário + assistente; `presetKey` só informa; turno sem mudança válida limpa a pendente.
 */
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';
import { CreateDynamicTableDto } from '../../../dynamicTables/dtos/DynamicTable.dto';
import { fieldPresetKnowledgeBase } from '../../../dynamicTables/presets/fields/FieldPresetKnowledgeBase';
import type { ISchemaField } from '../../../dynamicTables/models/DynamicTable.model';
import { StateManager } from '../../CustomizationService/StateManager';
import { FakeInterviewSessionRepository } from '../../CustomizationService/__tests__/fakeInterviewSessionRepository';
import { InterviewSessionNotFoundError } from '../../models/InterviewSession.model';
import type { ICustomizableTable } from '../../models/InterviewTypes';
import { FieldCustomizationService } from '..';
import { FieldPresetMatcher } from '../FieldPresetMatcher';
import { FieldUpdater } from '../FieldUpdater';
import type { ModelChange } from '../ModelOutput';
import { promptConfig } from '../PromptConfig';
import { ProposalStaleError, SensitiveFieldNotAcknowledgedError, TableNotInSessionError } from '../errors';
import type { IFieldHistoryEntry } from '../Types';

const USER = 'w6-dono';
const OUTRO = 'w6-outro';
const T0 = new Date('2026-10-16T12:00:00.000Z');

const CAMPOS: ISchemaField[] = [
  { name: 'nome', label: 'Nome', type: 'string', required: true },
  { name: 'telefone', label: 'Telefone', type: 'string', required: false },
];

const clientes = (extra: Partial<ICustomizableTable> = {}): ICustomizableTable => ({
  name: 'Clientes',
  key: 'clientes',
  description: 'Cadastro de clientes',
  isSelected: true,
  isCore: false,
  conversationHistory: [],
  fields: structuredClone(CAMPOS),
  ...extra,
});

/** Mudança do modelo com todos os campos que o strict mode exige. */
const ch = (c: Partial<ModelChange> & Pick<ModelChange, 'action' | 'name'>): ModelChange => ({
  originalName: null,
  label: c.name,
  type: 'string',
  required: false,
  options: [],
  description: '',
  sensitiveCategory: null,
  presetKey: null,
  ...c,
});

const reply = (changes: ModelChange[], friendlyMessage = 'Proponho isto.') => JSON.stringify({ friendlyMessage, changes });

async function setup(table = clientes()) {
  const repo = new FakeInterviewSessionRepository();
  const sm = new StateManager(repo, () => T0);
  const completeWithJsonSchema = jest.fn();
  const openai = { completeWithJsonSchema } as unknown as OpenAIService;
  let n = 0;
  const service = new FieldCustomizationService(sm, openai, new FieldPresetMatcher(), new FieldUpdater(), () => T0, () => `p-${++n}`);
  const session = await sm.createSessionState(USER, 'beautySalon', 'Salão', [table]);
  const reload = async () => (await sm.loadSession(session.id, USER)).state.tables[0];
  const message = (message: string) =>
    service.handle(USER, { kind: 'message', sessionId: session.id, tableKey: 'clientes', message });
  const decide = (proposalId: string, decision: 'apply' | 'discard', acknowledgeSensitive?: true) =>
    service.handle(USER, {
      kind: 'decision',
      sessionId: session.id,
      tableKey: 'clientes',
      proposalId,
      decision,
      ...(acknowledgeSensitive ? { acknowledgeSensitive } : {}),
    });
  return { repo, sm, service, session, completeWithJsonSchema, reload, message, decide };
}

describe('item 3 — sessão com dono', () => {
  it('o usuário B com o sessionId de A → 404, sem chamada ao modelo, e a sessão de A fica intacta', async () => {
    const { repo, service, session, completeWithJsonSchema } = await setup();
    const antes = structuredClone(repo.rows.get(session.id));

    await expect(
      service.handle(OUTRO, { kind: 'message', sessionId: session.id, tableKey: 'clientes', message: 'oi' }),
    ).rejects.toBeInstanceOf(InterviewSessionNotFoundError);
    await expect(
      service.handle(OUTRO, { kind: 'decision', sessionId: session.id, tableKey: 'clientes', proposalId: 'x', decision: 'apply' }),
    ).rejects.toBeInstanceOf(InterviewSessionNotFoundError);

    expect(completeWithJsonSchema).not.toHaveBeenCalled();
    expect(repo.rows.get(session.id)).toEqual(antes);
  });
});

describe('item 4 — tabela fora da sessão', () => {
  it('tableKey desconhecida → TABLE_NOT_IN_SESSION (404), sem chamada ao modelo', async () => {
    const { service, session, completeWithJsonSchema } = await setup();
    const err = await service
      .handle(USER, { kind: 'message', sessionId: session.id, tableKey: 'nao_existe', message: 'oi' })
      .catch((e) => e);
    expect(err).toBeInstanceOf(TableNotInSessionError);
    expect(err).toMatchObject({ statusCode: 404, errorCode: 'TABLE_NOT_IN_SESSION' });
    expect(completeWithJsonSchema).not.toHaveBeenCalled();
  });
});

describe('item 5 — histórico por tabela no servidor', () => {
  it('turno sem modificação → o histórico cresce 2 (usuário + assistente)', async () => {
    const { completeWithJsonSchema, message, reload } = await setup();
    completeWithJsonSchema.mockResolvedValue(reply([], 'Qual campo você quer mudar?'));

    const r = await message('ajusta os contatos');

    expect(r.conversationHistory).toEqual([
      { role: 'user', content: 'ajusta os contatos', at: T0.toISOString() },
      { role: 'assistant', content: 'Qual campo você quer mudar?', at: T0.toISOString() },
    ]);
    expect((await reload()).conversationHistory).toHaveLength(2);
  });

  it('ao modelo vão só user/assistant/system, as últimas 20 da tabela (sem as linhas system) + a mensagem do turno', async () => {
    const history: IFieldHistoryEntry[] = Array.from({ length: 30 }, (_, i) => ({
      role: i % 5 === 0 ? 'system' : i % 2 === 0 ? 'user' : 'assistant',
      content: `m${i}`,
      at: T0.toISOString(),
    }));
    const { repo, session, completeWithJsonSchema, message } = await setup();
    repo.rows.get(session.id)!.state.tables[0].conversationHistory = history; // o create zera o histórico
    completeWithJsonSchema.mockResolvedValue(reply([]));

    await message('nova');

    const sent = completeWithJsonSchema.mock.calls[0][0] as Array<{ role: string; content: string }>;
    expect(sent.every((m) => ['user', 'assistant', 'system'].includes(m.role))).toBe(true);
    expect(sent[0].role).toBe('system'); // o prompt, não uma decisão
    const middle = sent.slice(1, -1);
    expect(middle).toHaveLength(20);
    expect(middle.map((m) => m.content)).toEqual(
      history.filter((m) => m.role !== 'system').slice(-20).map((m) => m.content),
    );
    expect(sent[sent.length - 1]).toEqual({ role: 'user', content: 'nova' });
  });
});

describe('item 6 — uma chamada, saída presa a schema', () => {
  it('um turno faz 1 chamada com json_schema strict e o enum de presetKey = chaves do catálogo', async () => {
    const { completeWithJsonSchema, message } = await setup();
    completeWithJsonSchema.mockResolvedValue(reply([ch({ action: 'add', name: 'email' })]));

    await message('quero o e-mail');

    expect(completeWithJsonSchema).toHaveBeenCalledTimes(1);
    const format = completeWithJsonSchema.mock.calls[0][1];
    expect(format).toMatchObject({ type: 'json_schema', json_schema: { name: 'field_customization', strict: true } });
    const item = format.json_schema.schema.properties.changes.items;
    expect(item.properties.presetKey.anyOf[0].enum).toEqual(fieldPresetKnowledgeBase.map((p) => p.key));
    expect(item.properties.type.enum).not.toContain('relation');
    expect(item.properties.type.enum).not.toContain('json');
  });

  it('resposta fora do schema → sem proposta, "não entendi", campos e pendente intactos', async () => {
    const { completeWithJsonSchema, message, reload } = await setup();
    completeWithJsonSchema.mockResolvedValueOnce(reply([ch({ action: 'add', name: 'email' })]));
    const pendente = (await message('quero o e-mail')).proposal!;

    completeWithJsonSchema.mockResolvedValueOnce('{"changes": "isto não é lista"}');
    const r = await message('e mais?');

    expect(r.proposal).toBeNull();
    expect(r.conversationHistory.slice(-2)).toEqual([
      { role: 'user', content: 'e mais?', at: T0.toISOString() },
      { role: 'assistant', content: promptConfig.NOT_UNDERSTOOD_MESSAGE, at: T0.toISOString() },
    ]);
    const t = await reload();
    expect(t.fields).toEqual(CAMPOS);
    expect(t.pendingProposal?.id).toBe(pendente.id);
  });
});

describe('item 7 — o turno propõe, nunca aplica', () => {
  it('depois do turno, fields fica idêntico e proposal.changes traz o diff', async () => {
    const { completeWithJsonSchema, message, reload } = await setup();
    completeWithJsonSchema.mockResolvedValue(
      reply([
        ch({ action: 'add', name: 'email', label: 'E-mail' }),
        ch({ action: 'remove', name: 'telefone', originalName: 'telefone' }),
      ]),
    );

    const r = await message('troca telefone por e-mail');

    expect(r.table.fields).toEqual(CAMPOS);
    expect((await reload()).fields).toEqual(CAMPOS);
    expect(r.proposal).toEqual({
      id: 'p-1',
      requiresSensitiveAck: false,
      changes: [
        { action: 'add', field: { name: 'email', label: 'E-mail', type: 'string', required: false }, sensitiveCategory: null, presetKey: 'email' },
        { action: 'remove', originalName: 'telefone' },
      ],
    });
    expect((await reload()).pendingProposal).toMatchObject({ id: 'p-1', createdAt: T0.toISOString() });
  });

  it('a nova proposta substitui a anterior; turno sem mudança válida limpa a pendente', async () => {
    const { completeWithJsonSchema, message, reload } = await setup();
    completeWithJsonSchema.mockResolvedValueOnce(reply([ch({ action: 'add', name: 'email' })]));
    await message('1');
    completeWithJsonSchema.mockResolvedValueOnce(reply([ch({ action: 'add', name: 'cidade' })]));
    await message('2');
    expect((await reload()).pendingProposal?.id).toBe('p-2');

    completeWithJsonSchema.mockResolvedValueOnce(reply([ch({ action: 'add', name: 'id' })])); // tudo descartado
    const r = await message('3');
    expect(r.proposal).toBeNull();
    expect((await reload()).pendingProposal).toBeUndefined();
  });
});

describe('item 8 — validação determinística antes de propor', () => {
  it('descarta com motivo: reservado, tipo fora, inválido, já existe, inexistente', async () => {
    const { completeWithJsonSchema, message } = await setup();
    completeWithJsonSchema.mockResolvedValue(
      reply([
        ch({ action: 'add', name: 'id' }),
        ch({ action: 'add', name: 'dono', type: 'relation' }),
        ch({ action: 'add', name: 'cor', type: 'select', options: [] }),
        ch({ action: 'add', name: 'nome' }),
        ch({ action: 'update', name: 'fax', originalName: 'fax' }),
        ch({ action: 'remove', name: 'fax', originalName: 'fax' }),
      ]),
    );

    const r = await message('vários');

    expect(r.discarded).toEqual([
      { name: 'id', reason: 'reserved' },
      { name: 'dono', reason: 'type_not_allowed' },
      { name: 'cor', reason: 'invalid' },
      { name: 'nome', reason: 'exists' },
      { name: 'fax', reason: 'not_found' },
      { name: 'fax', reason: 'not_found' },
    ]);
    expect(r.proposal).toBeNull();
  });

  it('update com originalName null altera o próprio campo (não vira not_found)', async () => {
    const { completeWithJsonSchema, message } = await setup();
    completeWithJsonSchema.mockResolvedValue(reply([ch({ action: 'update', name: 'telefone', originalName: null, required: true })]));

    const r = await message('telefone obrigatório');

    expect(r.discarded).toEqual([]);
    expect(r.proposal!.changes[0]).toMatchObject({ action: 'update', originalName: 'telefone', field: { name: 'telefone', required: true } });
  });

  it('nome/descrição com $& ou $\' entram literais no prompt', async () => {
    const { completeWithJsonSchema, message } = await setup(clientes({ description: "preço em $& e $' fim" }));
    completeWithJsonSchema.mockResolvedValue(reply([]));

    await message('oi');

    const prompt = (completeWithJsonSchema.mock.calls[0][0] as Array<{ content: string }>)[0].content;
    expect(prompt).toContain("preço em $& e $' fim");
  });

  it('o que sobra chega íntegro: select com opções passa no mesmo DTO que o /dashboard/create usa', async () => {
    const { completeWithJsonSchema, message, decide, reload } = await setup();
    completeWithJsonSchema.mockResolvedValue(
      reply([ch({ action: 'add', name: 'origem', label: 'Origem', type: 'select', options: [' Instagram ', 'Indicação'], required: true })]),
    );

    const r = await message('de onde vem o cliente');
    await decide(r.proposal!.id, 'apply');

    const origem = (await reload()).fields!.find((f) => f.name === 'origem');
    expect(origem).toEqual({ name: 'origem', label: 'Origem', type: 'select', required: true, options: ['Instagram', 'Indicação'] });
    expect(CreateDynamicTableDto.shape.schema.safeParse({ fields: [origem] }).success).toBe(true);
  });

  it('presetKey: o do modelo vale; sem ele, o casamento exato por nome continua', async () => {
    const { completeWithJsonSchema, message } = await setup();
    completeWithJsonSchema.mockResolvedValue(
      reply([
        ch({ action: 'add', name: 'valor', type: 'number', presetKey: 'price' }),
        ch({ action: 'add', name: 'email' }),
        ch({ action: 'add', name: 'apelido' }),
      ]),
    );

    const r = await message('campos');

    expect(r.proposal!.changes.map((c) => (c.action === 'add' ? c.presetKey : undefined))).toEqual(['price', 'email', null]);
    // Só informa (dono, 16/10): o corpo do campo é o do modelo, não o do preset.
    expect(r.proposal!.changes[0]).toMatchObject({ field: { name: 'valor', type: 'number' } });
  });
});

describe('item 9 — campo sensível é marcado', () => {
  it('o modelo diz null para "alergias" → a rede marca; a marca do modelo nunca é trocada', async () => {
    const { completeWithJsonSchema, message } = await setup();
    completeWithJsonSchema.mockResolvedValue(
      reply([
        ch({ action: 'add', name: 'alergias', label: 'Alergias', sensitiveCategory: null }),
        ch({ action: 'add', name: 'religiao', label: 'Religião', sensitiveCategory: 'religious' }),
        ch({ action: 'add', name: 'apelido', label: 'Apelido' }),
      ]),
    );

    const r = await message('preciso guardar alergias do cliente');

    expect(r.proposal!.changes.map((c) => (c.action === 'add' ? c.sensitiveCategory : undefined))).toEqual([
      'health_or_other_unspecified',
      'religious',
      null,
    ]);
    expect(r.proposal!.requiresSensitiveAck).toBe(true);
  });

  it('a rede casa sem acento e pelo rótulo (update também é marcado)', async () => {
    const { completeWithJsonSchema, message } = await setup();
    completeWithJsonSchema.mockResolvedValue(
      reply([ch({ action: 'update', name: 'telefone', originalName: 'telefone', label: 'Diagnóstico' })]),
    );
    const r = await message('troca');
    expect(r.proposal!.changes[0]).toMatchObject({ action: 'update', sensitiveCategory: 'health_or_other_unspecified' });
  });
});

describe('item 10 — aplicar e descartar', () => {
  it('apply aplica só a pendente, na mesma escrita, com linha system no histórico', async () => {
    const { completeWithJsonSchema, message, decide, reload, sm, session } = await setup();
    completeWithJsonSchema.mockResolvedValue(
      reply([ch({ action: 'add', name: 'email', label: 'E-mail' }), ch({ action: 'remove', name: 'telefone', originalName: 'telefone' })]),
    );
    const { proposal } = await message('troca');
    const versao = (await sm.loadSession(session.id, USER)).version;

    const r = await decide(proposal!.id, 'apply');

    expect(r.applied).toBe(true);
    expect(r.proposal).toBeNull();
    expect(r.table.fields!.map((f) => f.name)).toEqual(['nome', 'email']);
    expect(r.conversationHistory[r.conversationHistory.length - 1]).toEqual({ role: 'system', content: promptConfig.PROPOSAL_APPLIED, at: T0.toISOString() });
    const s = await sm.loadSession(session.id, USER);
    expect(s.version).toBe(versao + 1); // uma gravação
    expect(s.state.tables[0].pendingProposal).toBeUndefined();
    expect((await reload()).fields!.map((f) => f.name)).toEqual(['nome', 'email']);
  });

  it('discard só limpa a pendente', async () => {
    const { completeWithJsonSchema, message, decide, reload } = await setup();
    completeWithJsonSchema.mockResolvedValue(reply([ch({ action: 'add', name: 'email' })]));
    const { proposal } = await message('e-mail');

    const r = await decide(proposal!.id, 'discard');

    expect(r.applied).toBe(false);
    const t = await reload();
    expect(t.fields).toEqual(CAMPOS);
    expect(t.pendingProposal).toBeUndefined();
    expect(t.conversationHistory[t.conversationHistory.length - 1]).toMatchObject({ role: 'system', content: promptConfig.PROPOSAL_DISCARDED });
  });

  it('id velho, já usado ou inexistente → PROPOSAL_STALE (409)', async () => {
    const { completeWithJsonSchema, message, decide } = await setup();
    completeWithJsonSchema.mockResolvedValue(reply([ch({ action: 'add', name: 'email' })]));
    const velha = (await message('1')).proposal!.id;
    completeWithJsonSchema.mockResolvedValue(reply([ch({ action: 'add', name: 'cidade' })]));
    const atual = (await message('2')).proposal!.id;

    const stale = await decide(velha, 'apply').catch((e) => e);
    expect(stale).toBeInstanceOf(ProposalStaleError);
    expect(stale).toMatchObject({ statusCode: 409, errorCode: 'PROPOSAL_STALE' });

    await decide(atual, 'apply');
    await expect(decide(atual, 'apply')).rejects.toBeInstanceOf(ProposalStaleError);
    await expect(decide('nunca-existiu', 'discard')).rejects.toBeInstanceOf(ProposalStaleError);
  });

  it('proposta sensível sem acknowledgeSensitive → 400 e nada aplicado; com ele, aplica', async () => {
    const { completeWithJsonSchema, message, decide, reload } = await setup();
    completeWithJsonSchema.mockResolvedValue(reply([ch({ action: 'add', name: 'alergias', label: 'Alergias' })]));
    const { proposal } = await message('alergias');

    const err = await decide(proposal!.id, 'apply').catch((e) => e);
    expect(err).toBeInstanceOf(SensitiveFieldNotAcknowledgedError);
    expect(err).toMatchObject({ statusCode: 400, errorCode: 'SENSITIVE_FIELD_NOT_ACKNOWLEDGED' });
    const t = await reload();
    expect(t.fields).toEqual(CAMPOS);
    expect(t.pendingProposal?.id).toBe(proposal!.id);

    const ok = await decide(proposal!.id, 'apply', true);
    expect(ok.table.fields!.map((f) => f.name)).toContain('alergias');
  });
});

describe('item 11 — erro do modelo não derruba a sessão', () => {
  it('o falso lança → proposal null, mensagem padrão, histórico com a linha do usuário; campos e pendente intactos', async () => {
    const { completeWithJsonSchema, message, reload } = await setup();
    completeWithJsonSchema.mockResolvedValueOnce(reply([ch({ action: 'add', name: 'email' })]));
    const pendente = (await message('e-mail')).proposal!.id;
    completeWithJsonSchema.mockRejectedValueOnce(new Error('Failed to get response from AI service.'));

    const r = await message('e cidade?');

    expect(r.proposal).toBeNull();
    expect(r.conversationHistory.slice(-2)).toEqual([
      { role: 'user', content: 'e cidade?', at: T0.toISOString() },
      { role: 'assistant', content: promptConfig.MODEL_ERROR_MESSAGE, at: T0.toISOString() },
    ]);
    const t = await reload();
    expect(t.fields).toEqual(CAMPOS);
    expect(t.pendingProposal?.id).toBe(pendente);
  });
});
