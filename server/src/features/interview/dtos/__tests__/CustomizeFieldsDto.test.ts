/**
 * BE-INCR-W6-CUSTOMIZE-FIELDS (nó W6) — item 2: `CustomizeFieldsDto`, união por `kind`, `.strict()` nos dois ramos.
 */
import { CustomizeFieldsDto } from '../CustomizeFields.dto';

const ref = { sessionId: 's-1', tableKey: 'clientes' };

describe('CustomizeFieldsDto', () => {
  it('aceita message e decision', () => {
    expect(CustomizeFieldsDto.safeParse({ kind: 'message', ...ref, message: 'quero alergias' }).success).toBe(true);
    expect(CustomizeFieldsDto.safeParse({ kind: 'decision', ...ref, proposalId: 'p', decision: 'apply', acknowledgeSensitive: true }).success).toBe(true);
    expect(CustomizeFieldsDto.safeParse({ kind: 'decision', ...ref, proposalId: 'p', decision: 'discard' }).success).toBe(true);
  });

  it('conversationHistory no corpo → rejeita (o histórico mora no servidor, F-W6-3)', () => {
    expect(
      CustomizeFieldsDto.safeParse({ kind: 'message', ...ref, message: 'oi', conversationHistory: [] }).success,
    ).toBe(false);
  });

  it('chave desconhecida na decisão → rejeita', () => {
    expect(CustomizeFieldsDto.safeParse({ kind: 'decision', ...ref, proposalId: 'p', decision: 'apply', extra: 1 }).success).toBe(false);
  });

  it('mensagem vazia, longa demais, kind/decisão desconhecidos ou acknowledgeSensitive:false → rejeita', () => {
    expect(CustomizeFieldsDto.safeParse({ kind: 'message', ...ref, message: '   ' }).success).toBe(false);
    expect(CustomizeFieldsDto.safeParse({ kind: 'message', ...ref, message: 'x'.repeat(2001) }).success).toBe(false);
    expect(CustomizeFieldsDto.safeParse({ kind: 'outro', ...ref }).success).toBe(false);
    expect(CustomizeFieldsDto.safeParse({ kind: 'decision', ...ref, proposalId: 'p', decision: 'aplicar' }).success).toBe(false);
    expect(CustomizeFieldsDto.safeParse({ kind: 'decision', ...ref, proposalId: 'p', decision: 'apply', acknowledgeSensitive: false }).success).toBe(false);
  });
});

// W6 emenda (BRIEF WIZARD-W6-MANUAL-SESSION item 1; F-MS-1 a, F-MS-2 a).
describe('CustomizeFieldsDto — kind manual', () => {
  const campo = { name: 'apelido', label: 'Apelido', type: 'string', required: false };

  it('aceita add (com format email/phone) e setHidden, com ou sem acknowledgeSensitive', () => {
    expect(CustomizeFieldsDto.safeParse({ kind: 'manual', ...ref, changes: [{ action: 'add', field: campo }] }).success).toBe(true);
    expect(
      CustomizeFieldsDto.safeParse({
        kind: 'manual',
        ...ref,
        changes: [{ action: 'add', field: { ...campo, format: 'email' } }, { action: 'setHidden', name: 'nome', hidden: true }],
        acknowledgeSensitive: true,
      }).success,
    ).toBe(true);
  });

  it('changes vazio, mais de 50, chave fora do DTO ou tipo fora do enum manual → rejeita', () => {
    const add = { action: 'add', field: campo };
    expect(CustomizeFieldsDto.safeParse({ kind: 'manual', ...ref, changes: [] }).success).toBe(false);
    expect(CustomizeFieldsDto.safeParse({ kind: 'manual', ...ref, changes: Array(51).fill(add) }).success).toBe(false);
    expect(CustomizeFieldsDto.safeParse({ kind: 'manual', ...ref, changes: [add], fields: [] }).success).toBe(false);
    expect(CustomizeFieldsDto.safeParse({ kind: 'manual', ...ref, changes: [{ action: 'add', field: { ...campo, hidden: false } }] }).success).toBe(false);
    for (const type of ['email', 'password', 'phone', 'relation', 'json']) {
      expect(CustomizeFieldsDto.safeParse({ kind: 'manual', ...ref, changes: [{ action: 'add', field: { ...campo, type } }] }).success).toBe(false);
    }
    expect(CustomizeFieldsDto.safeParse({ kind: 'manual', ...ref, changes: [{ action: 'remove', name: 'nome' }] }).success).toBe(false);
  });
});

// Revisão do #786 (dono, questionário, 2026-10-21): `format` só com `type: 'string'`.
describe('CustomizeFieldsDto — format só em campo texto', () => {
  it('number/date/boolean com format → rejeita; string com format → aceita', () => {
    const campo = (type: string) => ({ name: 'contato', label: 'Contato', type, format: 'phone', required: false });
    for (const type of ['number', 'date', 'datetime', 'boolean']) {
      expect(CustomizeFieldsDto.safeParse({ kind: 'manual', ...ref, changes: [{ action: 'add', field: campo(type) }] }).success).toBe(false);
    }
    expect(CustomizeFieldsDto.safeParse({ kind: 'manual', ...ref, changes: [{ action: 'add', field: campo('string') }] }).success).toBe(true);
  });
});
