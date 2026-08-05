/**
 * EntryApprovalDto — barreira do achado R3 F3 (`fronteira-de-dto-quase-nao-testada`).
 *
 * Três invariantes nesta fronteira:
 *  - `date` é data-only por `isValidDateOnly` (round-trip de calendário);
 *  - `expectedVersion` é o valor do CAS otimista (ACC-023) — inteiro ≥ 1, nunca ausente
 *    numa transição, senão um comando velho sobrescreve uma transição concorrente;
 *  - as pernas reusam `PostEntryLineSchema`, então o TETO `MAX_CENTS` tem de atravessar o
 *    caminho de aprovação. Isso é asserção de FIAÇÃO, não repetição do PostingDto.test:
 *    o que se afirma aqui é que o comando de rascunho herda o teto, e a herança é o que
 *    quebraria se alguém trocasse o schema reusado por um inline.
 */
import {
  ApproveEntrySchema,
  CreateDraftEntrySchema,
  ListPendingApprovalQuerySchema,
  RejectEntrySchema,
  SubmitEntrySchema,
  UpdateDraftEntrySchema,
} from '../EntryApprovalDto';
import { MAX_CENTS } from '../../models/money';

const lines = [
  { accountCode: '1.1.1', debitCents: 10000, creditCents: 0 },
  { accountCode: '3.1.1', debitCents: 0, creditCents: 10000 },
];
const validDraft = { unitId: 'unit-1', date: '2026-06-10', description: 'Venda', lines };

describe('CreateDraftEntrySchema', () => {
  it('accepts a well-formed draft (CONTROLE)', () => {
    expect(CreateDraftEntrySchema.safeParse(validDraft).success).toBe(true);
  });

  it('rejects a non-calendar date (round-trip — 2026-02-30 rola para 03-02)', () => {
    expect(CreateDraftEntrySchema.safeParse({ ...validDraft, date: '2026-02-30' }).success).toBe(false);
    expect(CreateDraftEntrySchema.safeParse({ ...validDraft, date: '2026-06-31' }).success).toBe(false);
  });

  it('rejects menos de duas pernas (partida dobrada exige duas)', () => {
    expect(CreateDraftEntrySchema.safeParse({ ...validDraft, lines: [lines[0]] }).success).toBe(false);
    expect(CreateDraftEntrySchema.safeParse({ ...validDraft, lines: [] }).success).toBe(false);
  });

  it('FIAÇÃO: o teto MAX_CENTS das pernas atravessa o caminho de aprovação', () => {
    const over = [
      { accountCode: '1.1.1', debitCents: MAX_CENTS + 1, creditCents: 0 },
      { accountCode: '3.1.1', debitCents: 0, creditCents: MAX_CENTS + 1 },
    ];
    expect(CreateDraftEntrySchema.safeParse({ ...validDraft, lines: over }).success).toBe(false);
    // CONTROLE: no teto exato passa — a rejeição acima é do teto, não do valor grande.
    const atCap = [
      { accountCode: '1.1.1', debitCents: MAX_CENTS, creditCents: 0 },
      { accountCode: '3.1.1', debitCents: 0, creditCents: MAX_CENTS },
    ];
    expect(CreateDraftEntrySchema.safeParse({ ...validDraft, lines: atCap }).success).toBe(true);
  });

  it('FIAÇÃO: a regra "exatamente um lado positivo" também atravessa', () => {
    const bothSides = [
      { accountCode: '1.1.1', debitCents: 100, creditCents: 100 },
      { accountCode: '3.1.1', debitCents: 0, creditCents: 100 },
    ];
    const neitherSide = [
      { accountCode: '1.1.1', debitCents: 0, creditCents: 0 },
      { accountCode: '3.1.1', debitCents: 0, creditCents: 100 },
    ];
    expect(CreateDraftEntrySchema.safeParse({ ...validDraft, lines: bothSides }).success).toBe(false);
    expect(CreateDraftEntrySchema.safeParse({ ...validDraft, lines: neitherSide }).success).toBe(false);
  });

  it('rejects unknown keys (.strict) e description vazia', () => {
    expect(CreateDraftEntrySchema.safeParse({ ...validDraft, expectedVersion: 1 }).success).toBe(false);
    expect(CreateDraftEntrySchema.safeParse({ ...validDraft, description: '' }).success).toBe(false);
  });
});

describe('expectedVersion — o CAS otimista (ACC-023)', () => {
  const commands = {
    UpdateDraftEntrySchema: (v: unknown) => UpdateDraftEntrySchema.safeParse({ ...validDraft, expectedVersion: v }),
    SubmitEntrySchema: (v: unknown) => SubmitEntrySchema.safeParse({ unitId: 'unit-1', expectedVersion: v }),
    ApproveEntrySchema: (v: unknown) => ApproveEntrySchema.safeParse({ unitId: 'unit-1', expectedVersion: v }),
    RejectEntrySchema: (v: unknown) => RejectEntrySchema.safeParse({ unitId: 'unit-1', expectedVersion: v }),
  };

  it('aceita inteiro ≥ 1 em TODOS os quatro comandos de transição (CONTROLE)', () => {
    for (const [name, run] of Object.entries(commands)) {
      expect([name, run(1).success]).toEqual([name, true]);
      expect([name, run(7).success]).toEqual([name, true]);
    }
  });

  it('recusa 0, negativo, fracionário e string em TODOS os quatro', () => {
    for (const [name, run] of Object.entries(commands)) {
      for (const bad of [0, -1, 1.5, '1']) {
        expect([name, bad, run(bad).success]).toEqual([name, bad, false]);
      }
    }
  });

  it('recusa expectedVersion AUSENTE nos três comandos sem corpo (comando velho não pode passar)', () => {
    expect(SubmitEntrySchema.safeParse({ unitId: 'unit-1' }).success).toBe(false);
    expect(ApproveEntrySchema.safeParse({ unitId: 'unit-1' }).success).toBe(false);
    expect(RejectEntrySchema.safeParse({ unitId: 'unit-1' }).success).toBe(false);
  });

  it('RejectEntrySchema aceita reason opcional e recusa reason vazia', () => {
    expect(RejectEntrySchema.safeParse({ unitId: 'u1', expectedVersion: 1, reason: 'x' }).success).toBe(true);
    expect(RejectEntrySchema.safeParse({ unitId: 'u1', expectedVersion: 1, reason: '' }).success).toBe(false);
  });
});

describe('ListPendingApprovalQuerySchema', () => {
  it('aplica default de paginação e teto de 200', () => {
    const parsed = ListPendingApprovalQuerySchema.safeParse({ unitId: 'u1' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.limit).toBe(50);
    }
    expect(ListPendingApprovalQuerySchema.safeParse({ unitId: 'u1', limit: 201 }).success).toBe(false);
  });
});
