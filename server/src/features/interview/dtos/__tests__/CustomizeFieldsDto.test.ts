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
