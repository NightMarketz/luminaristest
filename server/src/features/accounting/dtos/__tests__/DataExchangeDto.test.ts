/**
 * DataExchangeDto — barreira do achado R3 F3 (`fronteira-de-dto-quase-nao-testada`).
 *
 * Duas invariantes: `asOf` é data-only por `isValidDateOnly`, e o superRefine liga cada
 * `kind` ao campo que ele exige (BP/DRE ⇒ asOf, razão ⇒ accountCode, template ⇒ templateKind).
 * A segunda é a que um teste de forma não alcança: `kind: 'EXPORT_BALANCE_SHEET'` sem `asOf`
 * é estruturalmente válido e produziria um BP sem data-base.
 *
 * LIMITE DECLARADO: `ExportRequestSchema` NÃO é `.strict()` (é `z.object().superRefine`), então
 * chave desconhecida passa. Isto é asserido abaixo como comportamento MEDIDO, não como desejo —
 * o teste documenta a fronteira que existe, não a que eu gostaria que existisse.
 */
import {
  CommitImportSchema,
  ExportRequestSchema,
  ImportUploadSchema,
  IMPLEMENTED_EXPORT_KINDS,
  JobScopeQuerySchema,
  TemplateKindSchema,
} from '../DataExchangeDto';

const base = { unitId: 'unit-1', format: 'csv' as const };

describe('ExportRequestSchema — data-only', () => {
  it('accepts a well-formed payload (CONTROLE)', () => {
    expect(
      ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_TRIAL_BALANCE', asOf: '2026-06-30' }).success,
    ).toBe(true);
  });

  it('rejects a non-calendar asOf (round-trip, não regex nu)', () => {
    expect(
      ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_TRIAL_BALANCE', asOf: '2026-02-30' }).success,
    ).toBe(false);
    expect(
      ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_TRIAL_BALANCE', asOf: '2026-04-31' }).success,
    ).toBe(false);
  });

  it('accepts asOf ausente quando o kind não o exige', () => {
    expect(ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_TRIAL_BALANCE' }).success).toBe(true);
  });
});

describe('ExportRequestSchema — superRefine amarra kind ao campo obrigatório', () => {
  it('BP e DRE exigem asOf', () => {
    for (const kind of ['EXPORT_BALANCE_SHEET', 'EXPORT_INCOME_STATEMENT'] as const) {
      const parsed = ExportRequestSchema.safeParse({ ...base, kind });
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'asOf')).toBe(true);
      // CONTROLE: com asOf o mesmo kind passa — a falha acima é do campo, não do kind.
      expect(ExportRequestSchema.safeParse({ ...base, kind, asOf: '2026-06-30' }).success).toBe(true);
    }
  });

  it('o razão NÃO exige mais accountCode (C6b PR-1, F-C6b-7 a: sem accountCode = razão geral)', () => {
    expect(ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_GENERAL_LEDGER' }).success).toBe(true);
    expect(
      ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_GENERAL_LEDGER', accountCode: '1.1.1' }).success,
    ).toBe(true);
  });

  it('o template exige templateKind, e templateKind é da lista fechada de IMPORTAÇÃO', () => {
    expect(ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_TEMPLATE' }).success).toBe(false);
    expect(
      ExportRequestSchema.safeParse({
        ...base, kind: 'EXPORT_TEMPLATE', templateKind: 'IMPORT_CHART_OF_ACCOUNTS',
      }).success,
    ).toBe(true);
    expect(
      ExportRequestSchema.safeParse({
        ...base, kind: 'EXPORT_TEMPLATE', templateKind: 'EXPORT_TRIAL_BALANCE',
      }).success,
    ).toBe(false);
  });
});

describe('ExportRequestSchema — periodStart/periodEnd (C6b PR-1, Passo 5)', () => {
  it('aceita periodStart/periodEnd ausentes (comportamento atual preservado)', () => {
    expect(
      ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_GENERAL_LEDGER', accountCode: '1.1.1' }).success,
    ).toBe(true);
  });

  it('aceita periodStart/periodEnd date-only válidos com periodEnd >= periodStart', () => {
    expect(
      ExportRequestSchema.safeParse({
        ...base, kind: 'EXPORT_GENERAL_LEDGER', periodStart: '2026-01-01', periodEnd: '2026-01-31',
      }).success,
    ).toBe(true);
    // fronteira: periodEnd === periodStart é válido (janela de 1 dia)
    expect(
      ExportRequestSchema.safeParse({
        ...base, kind: 'EXPORT_GENERAL_LEDGER', periodStart: '2026-01-01', periodEnd: '2026-01-01',
      }).success,
    ).toBe(true);
  });

  it('rejeita periodEnd < periodStart — issue em periodEnd', () => {
    const parsed = ExportRequestSchema.safeParse({
      ...base, kind: 'EXPORT_GENERAL_LEDGER', periodStart: '2026-01-31', periodEnd: '2026-01-01',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'periodEnd')).toBe(true);
  });

  it('rejeita periodStart/periodEnd que não são calendário real (round-trip, mesma regra do asOf)', () => {
    expect(
      ExportRequestSchema.safeParse({
        ...base, kind: 'EXPORT_GENERAL_LEDGER', periodStart: '2026-02-30', periodEnd: '2026-03-01',
      }).success,
    ).toBe(false);
  });

  // Review #337 F1 (classe param-aceito-e-ignorado): periodStart/periodEnd só têm leitor dentro
  // de EXPORT_GENERAL_LEDGER — para qualquer outro kind o DTO aceitava e o service ignorava em
  // silêncio. Fechado na fronteira: qualquer outro kind com periodStart OU periodEnd é 400.
  it('rejeita periodStart/periodEnd em EXPORT_TRIAL_BALANCE — só valem para o razão', () => {
    const parsed = ExportRequestSchema.safeParse({
      ...base, kind: 'EXPORT_TRIAL_BALANCE', periodStart: '2026-01-01', periodEnd: '2026-01-31',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'periodStart')).toBe(true);
  });

  it('rejeita periodStart/periodEnd em EXPORT_BALANCE_SHEET mesmo com asOf presente', () => {
    const parsed = ExportRequestSchema.safeParse({
      ...base, kind: 'EXPORT_BALANCE_SHEET', asOf: '2026-06-30',
      periodStart: '2026-01-01', periodEnd: '2026-01-31',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'periodStart')).toBe(true);
  });

  // Review #337 F1: dentro do próprio razão, um só dos dois campos caía em janela `undefined`
  // silenciosamente no service (`dto.periodStart && dto.periodEnd`) — a MESMA classe de bug,
  // agora fechada no par inteiro, não só "kind errado".
  it('rejeita o razão com só periodStart (sem periodEnd) — informe os dois ou nenhum', () => {
    const parsed = ExportRequestSchema.safeParse({
      ...base, kind: 'EXPORT_GENERAL_LEDGER', accountCode: '1.1.1', periodStart: '2026-01-01',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'periodEnd')).toBe(true);
  });

  it('rejeita o razão com só periodEnd (sem periodStart) — informe os dois ou nenhum', () => {
    const parsed = ExportRequestSchema.safeParse({
      ...base, kind: 'EXPORT_GENERAL_LEDGER', accountCode: '1.1.1', periodEnd: '2026-01-31',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'periodStart')).toBe(true);
  });
});

describe('ExportRequestSchema — listas fechadas', () => {
  it('aceita os 7 kinds implementados e recusa um kind declarado-mas-não-fiado', () => {
    for (const kind of IMPLEMENTED_EXPORT_KINDS) {
      const extra =
        kind === 'EXPORT_BALANCE_SHEET' || kind === 'EXPORT_INCOME_STATEMENT'
          ? { asOf: '2026-06-30' }
          : kind === 'EXPORT_GENERAL_LEDGER'
            ? { accountCode: '1.1.1' }
            : kind === 'EXPORT_TEMPLATE'
              ? { templateKind: 'IMPORT_CHART_OF_ACCOUNTS' as const }
              : kind === 'EXPORT_BANK_RECONCILIATION'
                ? { periodStart: '2026-01-01', periodEnd: '2026-01-31' }
                : kind === 'EXPORT_ENTRY_SAMPLE'
                  ? { periodStart: '2026-01-01', periodEnd: '2026-01-31', seed: 'seed-1' }
                  : {};
      expect(ExportRequestSchema.safeParse({ ...base, kind, ...extra }).success).toBe(true);
    }
    // EXPORT_IMPORT_ERRORS existe no enum do model e NÃO está fiado (Fase 5).
    expect(ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_IMPORT_ERRORS' }).success).toBe(false);
  });

  it('recusa formato fora de csv|xlsx', () => {
    expect(
      ExportRequestSchema.safeParse({ ...base, format: 'pdf', kind: 'EXPORT_TRIAL_BALANCE' }).success,
    ).toBe(false);
  });

  it('MEDIDO, não desejado: este schema não é .strict() — chave desconhecida PASSA', () => {
    expect(
      ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_TRIAL_BALANCE', asof: 'x' }).success,
    ).toBe(true);
  });
});

// C6b PR-2 Passo 8/9 (F-C6b-5 a): dois kinds novos — conciliação bancária e amostra de
// lançamentos — AMPLIAM (não substituem) a regra do periodStart/periodEnd que o review #337
// fechou no PR-1: agora 3 kinds legitimamente usam o par (razão OPCIONAL; conciliação e
// amostra OBRIGATÓRIO), e qualquer outro continua 400.
describe('ExportRequestSchema — EXPORT_BANK_RECONCILIATION (C6b PR-2 Passo 8)', () => {
  it('exige periodStart/periodEnd — ausentes → issue em periodStart', () => {
    const parsed = ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_BANK_RECONCILIATION' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'periodStart')).toBe(true);
  });

  it('com periodStart/periodEnd válidos → passa', () => {
    expect(
      ExportRequestSchema.safeParse({
        ...base, kind: 'EXPORT_BANK_RECONCILIATION', periodStart: '2026-01-01', periodEnd: '2026-01-31',
      }).success,
    ).toBe(true);
  });

  it('só periodStart (sem periodEnd) → issue em periodEnd (par obrigatório junto)', () => {
    const parsed = ExportRequestSchema.safeParse({
      ...base, kind: 'EXPORT_BANK_RECONCILIATION', periodStart: '2026-01-01',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'periodEnd')).toBe(true);
  });
});

describe('ExportRequestSchema — EXPORT_ENTRY_SAMPLE (C6b PR-2 Passo 9, F-C6b-8 a)', () => {
  it('exige periodStart/periodEnd E seed — todos ausentes → issues em periodStart e seed', () => {
    const parsed = ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_ENTRY_SAMPLE' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path[0] === 'periodStart')).toBe(true);
      expect(parsed.error.issues.some((i) => i.path[0] === 'seed')).toBe(true);
    }
  });

  it('com periodStart/periodEnd/seed válidos → passa; perAccount é opcional (default fica a cargo do service)', () => {
    expect(
      ExportRequestSchema.safeParse({
        ...base, kind: 'EXPORT_ENTRY_SAMPLE', periodStart: '2026-01-01', periodEnd: '2026-01-31', seed: 'seed-1',
      }).success,
    ).toBe(true);
    expect(
      ExportRequestSchema.safeParse({
        ...base, kind: 'EXPORT_ENTRY_SAMPLE', periodStart: '2026-01-01', periodEnd: '2026-01-31',
        seed: 'seed-1', perAccount: 10,
      }).success,
    ).toBe(true);
  });

  it('perAccount fora de 1..50 → issue', () => {
    const parsed = ExportRequestSchema.safeParse({
      ...base, kind: 'EXPORT_ENTRY_SAMPLE', periodStart: '2026-01-01', periodEnd: '2026-01-31',
      seed: 'seed-1', perAccount: 51,
    });
    expect(parsed.success).toBe(false);
  });

  it('seed vazia → issue (min 1)', () => {
    const parsed = ExportRequestSchema.safeParse({
      ...base, kind: 'EXPORT_ENTRY_SAMPLE', periodStart: '2026-01-01', periodEnd: '2026-01-31', seed: '',
    });
    expect(parsed.success).toBe(false);
  });
});

// Classe param-aceito-e-ignorado (review #337 F1) — perAccount/seed só têm leitor em
// EXPORT_ENTRY_SAMPLE; em qualquer outro kind, aceitos-e-ignorados seria o MESMO bug que o
// review fechou para periodStart/periodEnd. Fecha na fronteira do DTO.
describe('ExportRequestSchema — perAccount/seed rejeitados fora de EXPORT_ENTRY_SAMPLE', () => {
  it('perAccount em EXPORT_TRIAL_BALANCE → issue em perAccount', () => {
    const parsed = ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_TRIAL_BALANCE', perAccount: 5 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'perAccount')).toBe(true);
  });

  it('seed em EXPORT_GENERAL_LEDGER → issue em seed', () => {
    const parsed = ExportRequestSchema.safeParse({ ...base, kind: 'EXPORT_GENERAL_LEDGER', seed: 'x' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'seed')).toBe(true);
  });

  it('perAccount em EXPORT_BANK_RECONCILIATION → issue (só vale para a amostra)', () => {
    const parsed = ExportRequestSchema.safeParse({
      ...base, kind: 'EXPORT_BANK_RECONCILIATION', periodStart: '2026-01-01', periodEnd: '2026-01-31', perAccount: 5,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'perAccount')).toBe(true);
  });
});

// Regressão do PR-1 (review #337 F1): periodStart/periodEnd continuam 400 fora do conjunto
// ampliado — o Passo 8/9 amplia QUEM pode usar o par, nunca remove a regra para quem não pode.
describe('ExportRequestSchema — regressão: periodStart/periodEnd continuam 400 em BP (C6b PR-2)', () => {
  it('EXPORT_BALANCE_SHEET com periodStart/periodEnd → issue em periodStart', () => {
    const parsed = ExportRequestSchema.safeParse({
      ...base, kind: 'EXPORT_BALANCE_SHEET', asOf: '2026-06-30', periodStart: '2026-01-01', periodEnd: '2026-01-31',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.some((i) => i.path[0] === 'periodStart')).toBe(true);
  });
});

describe('Schemas de importação e escopo', () => {
  it('ImportUploadSchema exige kind da lista de importação e unitId', () => {
    expect(ImportUploadSchema.safeParse({ kind: 'IMPORT_JOURNAL_ENTRIES', unitId: 'u1' }).success).toBe(true);
    expect(ImportUploadSchema.safeParse({ kind: 'IMPORT_NADA', unitId: 'u1' }).success).toBe(false);
    expect(ImportUploadSchema.safeParse({ kind: 'IMPORT_JOURNAL_ENTRIES', unitId: '' }).success).toBe(false);
  });

  it('JobScopeQuerySchema e CommitImportSchema exigem unitId não vazio', () => {
    expect(JobScopeQuerySchema.safeParse({ unitId: 'u1' }).success).toBe(true);
    expect(JobScopeQuerySchema.safeParse({ unitId: '' }).success).toBe(false);
    expect(CommitImportSchema.safeParse({ unitId: 'u1' }).success).toBe(true);
    expect(CommitImportSchema.safeParse({}).success).toBe(false);
  });

  it('TemplateKindSchema é a lista fechada de importação', () => {
    expect(TemplateKindSchema.safeParse('IMPORT_OPENING_BALANCES').success).toBe(true);
    expect(TemplateKindSchema.safeParse('EXPORT_TEMPLATE').success).toBe(false);
  });
});
