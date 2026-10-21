/**
 * W6 emenda — `BE-INCR-W6-MANUAL-SESSION`, itens 2–6 do BRIEF (`docs/accounting/WIZARD-W6-MANUAL-SESSION-brief.md`):
 * o "Salvar Alterações" do modo manual grava na sessão do W4. `StateManager` com repositório falso e modelo falso,
 * como os testes do W6. Forks ratificados pelo dono em 21/10: F-MS-1 a, F-MS-2 a, F-MS-3 a, F-MS-4 a.
 */
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';
import type { ISchemaField } from '../../../dynamicTables/models/DynamicTable.model';
import { StateManager } from '../../CustomizationService/StateManager';
import { FakeInterviewSessionRepository } from '../../CustomizationService/__tests__/fakeInterviewSessionRepository';
import type { ManualChange } from '../../dtos/CustomizeFields.dto';
import { InterviewSessionNotFoundError } from '../../models/InterviewSession.model';
import type { ICustomizableTable } from '../../models/InterviewTypes';
import { FieldCustomizationService } from '..';
import { FieldPresetMatcher } from '../FieldPresetMatcher';
import { FieldUpdater } from '../FieldUpdater';
import { ManualChangeInvalidError, ProposalStaleError, SensitiveFieldNotAcknowledgedError, TableNotInSessionError } from '../errors';

const USER = 'w6m-dono';
const OUTRO = 'w6m-outro';
const T0 = new Date('2026-10-21T12:00:00.000Z');

const CAMPOS: ISchemaField[] = [
  { name: 'nome', label: 'Nome', type: 'string', required: true },
  { name: 'telefone', label: 'Telefone', type: 'string', required: false },
];

const clientes = (): ICustomizableTable => ({
  name: 'Clientes',
  key: 'clientes',
  description: 'Cadastro de clientes',
  isSelected: true,
  isCore: false,
  conversationHistory: [],
  fields: structuredClone(CAMPOS),
});

async function setup() {
  const repo = new FakeInterviewSessionRepository();
  const sm = new StateManager(repo, () => T0);
  const completeWithJsonSchema = jest.fn();
  const openai = { completeWithJsonSchema } as unknown as OpenAIService;
  const service = new FieldCustomizationService(sm, openai, new FieldPresetMatcher(), new FieldUpdater(), () => T0, () => 'p-1');
  const session = await sm.createSessionState(USER, 'beautySalon', 'Salão', [clientes()]);
  const reload = async () => (await sm.loadSession(session.id, USER)).state.tables[0];
  const manual = (changes: ManualChange[], acknowledgeSensitive?: true, userId = USER, tableKey = 'clientes') =>
    service.handle(userId, {
      kind: 'manual',
      sessionId: session.id,
      tableKey,
      changes,
      ...(acknowledgeSensitive ? { acknowledgeSensitive } : {}),
    });
  return { repo, service, session, completeWithJsonSchema, reload, manual };
}

const add = (name: string, extra: Partial<Extract<ManualChange, { action: 'add' }>['field']> = {}): ManualChange => ({
  action: 'add',
  field: { name, label: name, type: 'string', required: false, ...extra },
});

describe('item 2 — sessão com dono e tabela da sessão', () => {
  it('o usuário B com o sessionId de A → 404, e a sessão de A fica intacta', async () => {
    const { repo, session, manual } = await setup();
    const antes = structuredClone(repo.rows.get(session.id));
    await expect(manual([add('apelido')], undefined, OUTRO)).rejects.toBeInstanceOf(InterviewSessionNotFoundError);
    expect(repo.rows.get(session.id)).toEqual(antes);
  });

  it('tableKey fora da sessão → 404 TABLE_NOT_IN_SESSION', async () => {
    const { manual } = await setup();
    await expect(manual([add('apelido')], undefined, USER, 'fornecedores')).rejects.toBeInstanceOf(TableNotInSessionError);
  });
});

describe('item 3 — validação canônica, tudo ou nada', () => {
  it('lote com 1 válido + 1 reservado → 400 MANUAL_CHANGE_INVALID com o motivo, e nada é gravado', async () => {
    const { manual, reload } = await setup();
    const erro = await manual([add('apelido'), add('id')]).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ManualChangeInvalidError);
    expect(erro).toMatchObject({ statusCode: 400, errorCode: 'MANUAL_CHANGE_INVALID', details: { changes: [{ index: 1, name: 'id', reason: 'reserved' }] } });
    expect((await reload()).fields).toEqual(CAMPOS);
  });

  it('nome já na tabela, repetido no lote, setHidden de inexistente e nome fora do padrão → um motivo cada', async () => {
    const { manual } = await setup();
    const erro = await manual([
      add('telefone'),
      add('apelido'),
      add('apelido'),
      { action: 'setHidden', name: 'fax', hidden: true },
      add('com espaço'),
    ]).catch((e: unknown) => e);
    expect(erro).toMatchObject({
      details: {
        changes: [
          { index: 0, name: 'telefone', reason: 'exists' },
          { index: 2, name: 'apelido', reason: 'duplicate' },
          { index: 3, name: 'fax', reason: 'not_found' },
          { index: 4, name: 'com espaço', reason: 'invalid' },
        ],
      },
    });
  });
});

describe('item 4 — aplica e grava numa escrita só', () => {
  it('add + setHidden gravam na sessão; a resposta traz a tabela, applied:true, sem proposta', async () => {
    const { manual, reload, repo, session } = await setup();
    const versaoAntes = repo.rows.get(session.id)!.version;
    const r = await manual([add('email', { format: 'email' }), { action: 'setHidden', name: 'telefone', hidden: true }]);

    expect(r).toMatchObject({ applied: true, proposal: null, discarded: [] });
    const t = await reload();
    expect(t.fields).toEqual([
      CAMPOS[0],
      { ...CAMPOS[1], hidden: true },
      { name: 'email', label: 'email', type: 'string', format: 'email', required: false },
    ]);
    expect(r.table.fields).toEqual(t.fields);
    expect(repo.rows.get(session.id)!.version).toBe(versaoAntes + 1);
  });

  it('o turno seguinte da IA monta o prompt com o campo manual', async () => {
    const { manual, service, session, completeWithJsonSchema } = await setup();
    await manual([add('apelido', { label: 'Apelido' })]);
    completeWithJsonSchema.mockResolvedValue(JSON.stringify({ friendlyMessage: 'ok', changes: [] }));
    await service.handle(USER, { kind: 'message', sessionId: session.id, tableKey: 'clientes', message: 'oi' });
    const prompt = (completeWithJsonSchema.mock.calls[0][0] as Array<{ content: string }>)[0].content;
    expect(prompt).toContain('Apelido (apelido)');
  });
});

describe('item 5 — campo sensível exige a ciência (F-MS-3 a)', () => {
  it('add de "alergias" sem acknowledgeSensitive → 400 SENSITIVE_FIELD_NOT_ACKNOWLEDGED e nada gravado; com ele → grava', async () => {
    const { manual, reload } = await setup();
    await expect(manual([add('alergias', { label: 'Alergias' })])).rejects.toBeInstanceOf(SensitiveFieldNotAcknowledgedError);
    expect((await reload()).fields).toEqual(CAMPOS);

    await manual([add('alergias', { label: 'Alergias' })], true);
    expect((await reload()).fields?.map((f) => f.name)).toContain('alergias');
  });

  it('setHidden de campo existente não pede ciência', async () => {
    const { manual } = await setup();
    await expect(manual([{ action: 'setHidden', name: 'telefone', hidden: true }])).resolves.toMatchObject({ applied: true });
  });
});

describe('item 6 — o manual descarta a proposta pendente da IA (F-MS-4 a)', () => {
  it('depois do manual, Aplicar com o id da pendente → 409 PROPOSAL_STALE', async () => {
    const { manual, service, session, completeWithJsonSchema, reload } = await setup();
    completeWithJsonSchema.mockResolvedValue(
      JSON.stringify({
        friendlyMessage: 'Proponho cidade.',
        changes: [{ action: 'add', name: 'cidade', originalName: null, label: 'Cidade', type: 'string', required: false, options: [], description: '', sensitiveCategory: null, presetKey: null }],
      }),
    );
    const turno = await service.handle(USER, { kind: 'message', sessionId: session.id, tableKey: 'clientes', message: 'cidade' });
    expect(turno.proposal?.id).toBe('p-1');

    await manual([add('apelido')]);
    expect((await reload()).pendingProposal).toBeUndefined();
    await expect(
      service.handle(USER, { kind: 'decision', sessionId: session.id, tableKey: 'clientes', proposalId: 'p-1', decision: 'apply' }),
    ).rejects.toBeInstanceOf(ProposalStaleError);
  });
});

// Revisão do #786 (dono, chat e questionário, 2026-10-21: "Corrige todos, nos PRs certos").
describe('revisão do #786', () => {
  it('esconder campo obrigatório → 400 MANUAL_CHANGE_INVALID required_hidden, nada gravado; mostrar de novo é livre', async () => {
    const { manual, reload } = await setup();
    const erro = await manual([{ action: 'setHidden', name: 'nome', hidden: true }]).catch((e: unknown) => e);
    expect(erro).toMatchObject({ errorCode: 'MANUAL_CHANGE_INVALID', details: { changes: [{ index: 0, name: 'nome', reason: 'required_hidden' }] } });
    expect((await reload()).fields).toEqual(CAMPOS);
    await expect(manual([{ action: 'setHidden', name: 'nome', hidden: false }])).resolves.toMatchObject({ applied: true });
  });

  it('o 400 SENSITIVE_FIELD_NOT_ACKNOWLEDGED do manual diz quais campos pedem a ciência', async () => {
    const { manual } = await setup();
    const erro = await manual([add('apelido'), add('alergias', { label: 'Alergias' })]).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(SensitiveFieldNotAcknowledgedError);
    expect(erro).toMatchObject({ statusCode: 400, details: { fields: ['alergias'] } });
  });

  it('a pendente guardada na sessão leva requiresSensitiveAck (o front não recalcula a regra)', async () => {
    const { service, session, completeWithJsonSchema, reload } = await setup();
    completeWithJsonSchema.mockResolvedValue(
      JSON.stringify({
        friendlyMessage: 'Proponho alergias.',
        changes: [{ action: 'add', name: 'alergias', originalName: null, label: 'Alergias', type: 'textarea', required: false, options: [], description: '', sensitiveCategory: null, presetKey: null }],
      }),
    );
    await service.handle(USER, { kind: 'message', sessionId: session.id, tableKey: 'clientes', message: 'alergias' });
    expect((await reload()).pendingProposal).toMatchObject({ id: 'p-1', requiresSensitiveAck: true });
  });
});
