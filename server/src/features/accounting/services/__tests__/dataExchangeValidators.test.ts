import { validateImport, ImportHeaderError, type AccountLike } from '../dataExchangeValidators';
import type { InTable } from '../../../../lib/spreadsheet';
import { MAX_CENTS } from '../../models/money';

const accounts: AccountLike[] = [
  { code: '1.1.01', acceptsEntries: true },
  { code: '2.1.01', acceptsEntries: true },
  { code: '1', acceptsEntries: false }, // synthetic parent (not a leaf)
];

const table = (headers: string[], rows: string[][]): InTable => ({ headers, rows });
const statuses = (rs: { status: string }[]) => rs.map((r) => r.status);

describe('dataExchangeValidators — chart of accounts', () => {
  const H = ['code', 'name', 'nature', 'acceptsEntries', 'parentCode'];

  it('accepts valid rows and resolves parent within the same file', () => {
    const t = table(H, [
      ['1', 'Ativo', 'Asset', 'false', ''],
      ['1.1', 'Circulante', 'Asset', 'false', '1'],
      ['1.1.99', 'Nova conta', 'Asset', 'true', '1.1'],
    ]);
    expect(statuses(validateImport('IMPORT_CHART_OF_ACCOUNTS', t, accounts))).toEqual(['VALID', 'VALID', 'VALID']);
  });

  it('flags duplicate code, bad nature, and missing parent', () => {
    const t = table(H, [
      ['5.1', 'Desp', 'Expense', 'true', ''],
      ['5.1', 'Dup', 'Expense', 'true', ''],
      ['6.1', 'X', 'Banana', 'true', ''],
      ['7.1', 'Y', 'Asset', 'true', '9.9'],
    ]);
    const r = validateImport('IMPORT_CHART_OF_ACCOUNTS', t, accounts);
    expect(r[0].status).toBe('VALID');
    expect(r[1].errorCode).toBe('DUPLICATE_CODE');
    expect(r[2].errorCode).toBe('BAD_NATURE');
    expect(r[3].errorCode).toBe('PARENT_NOT_FOUND');
  });

  it('throws ImportHeaderError when required columns are missing', () => {
    expect(() => validateImport('IMPORT_CHART_OF_ACCOUNTS', table(['code', 'name'], []), accounts))
      .toThrow(ImportHeaderError);
  });
});

describe('dataExchangeValidators — opening balances', () => {
  const H = ['accountCode', 'postingDate', 'description', 'debitCents', 'creditCents'];

  it('accepts a balanced file (all VALID)', () => {
    const t = table(H, [
      ['1.1.01', '2026-01-01', 'Banco', '100000', '0'],
      ['2.1.01', '2026-01-01', 'Capital', '0', '100000'],
    ]);
    expect(statuses(validateImport('IMPORT_OPENING_BALANCES', t, accounts))).toEqual(['VALID', 'VALID']);
  });

  it('rejects the whole file when it does not balance', () => {
    const t = table(H, [
      ['1.1.01', '2026-01-01', 'Banco', '100000', '0'],
      ['2.1.01', '2026-01-01', 'Capital', '0', '90000'],
    ]);
    const r = validateImport('IMPORT_OPENING_BALANCES', t, accounts);
    expect(r.every((x) => x.errorCode === 'FILE_UNBALANCED')).toBe(true);
  });

  it('flags a non-leaf account and a both-sided row', () => {
    const t = table(H, [
      ['1', '2026-01-01', 'Sintética', '100000', '0'],       // not a leaf
      ['1.1.01', '2026-01-01', 'Ambos', '100', '100'],       // both sides
    ]);
    const r = validateImport('IMPORT_OPENING_BALANCES', t, accounts);
    // both rows invalid; first cell-invalid reasons preserved, others FILE_HAS_INVALID_ROW
    expect(r[0].errorCode).toBe('ACCOUNT_NOT_LEAF');
    expect(r[1].errorCode).toBe('NOT_SINGLE_SIDED');
  });
});

describe('dataExchangeValidators — journal entries', () => {
  const H = ['entryKey', 'documentDate', 'postingDate', 'description', 'accountCode', 'debitCents', 'creditCents', 'lineDescription', 'externalReference'];

  it('accepts two balanced entries grouped by entryKey', () => {
    const t = table(H, [
      ['L1', '2026-07-01', '2026-07-01', 'Aporte', '1.1.01', '100000', '0', 'Banco', 'REF1'],
      ['L1', '2026-07-01', '2026-07-01', 'Aporte', '2.1.01', '0', '100000', 'Capital', 'REF1'],
      ['L2', '2026-07-02', '2026-07-02', 'Outro', '1.1.01', '5000', '0', '', 'REF2'],
      ['L2', '2026-07-02', '2026-07-02', 'Outro', '2.1.01', '0', '5000', '', 'REF2'],
    ]);
    expect(statuses(validateImport('IMPORT_JOURNAL_ENTRIES', t, accounts))).toEqual(['VALID', 'VALID', 'VALID', 'VALID']);
  });

  it('invalidates an unbalanced group and a single-leg group', () => {
    const t = table(H, [
      ['L1', '', '2026-07-01', 'Desbalanceado', '1.1.01', '100000', '0', '', ''],
      ['L1', '', '2026-07-01', 'Desbalanceado', '2.1.01', '0', '90000', '', ''],
      ['L2', '', '2026-07-02', 'Perna única', '1.1.01', '5000', '0', '', ''],
    ]);
    const r = validateImport('IMPORT_JOURNAL_ENTRIES', t, accounts);
    expect(r[0].errorCode).toBe('GROUP_UNBALANCED');
    expect(r[1].errorCode).toBe('GROUP_UNBALANCED');
    expect(r[2].errorCode).toBe('GROUP_TOO_FEW_LINES');
  });

  it('fails a whole group when one of its rows is cell-invalid', () => {
    const t = table(H, [
      ['L1', '', '2026-07-01', 'x', '1.1.01', '100000', '0', '', ''],
      ['L1', '', '2026-07-01', 'x', '9.9.9', '0', '100000', '', ''], // account not found
    ]);
    const r = validateImport('IMPORT_JOURNAL_ENTRIES', t, accounts);
    expect(r[0].errorCode).toBe('GROUP_HAS_INVALID_ROW');
    expect(r[1].errorCode).toBe('ACCOUNT_NOT_FOUND');
  });
});

// ACC-INCR6-J-001 (histórico): a coluna era Int32 e o valor que ela não segurava tinha de ser recusado na PRÉVIA, não
// virar POST_FAILED opaco no commit. F-W2B-2 → (b) (24/11/2026): a coluna é BigInt e o teto de política MAX_CENTS
// subiu para 2^43−1 (models/money.ts); acima dele a prévia segue recusando com *_TOO_LARGE, e acima de 2^53−1 já
// morre no parse (BAD_*).
describe('dataExchangeValidators — teto de centavos (MAX_CENTS = 2^43−1; ACC-INCR6-J-001 / F-W2B-2)', () => {
  const MAX = MAX_CENTS;
  const OPEN = ['accountCode', 'postingDate', 'description', 'debitCents', 'creditCents'];
  const JRNL = ['entryKey', 'documentDate', 'postingDate', 'description', 'accountCode', 'debitCents', 'creditCents', 'lineDescription', 'externalReference'];

  it('opening balances: o valor que o Int32 não segurava (2^31) agora é VALID (R$ 21,47 mi não é mais teto)', () => {
    const t = table(OPEN, [
      ['1.1.01', '2026-01-01', 'Banco', '2147483648', '0'],
      ['2.1.01', '2026-01-01', 'Capital', '0', '2147483648'],
    ]);
    expect(statuses(validateImport('IMPORT_OPENING_BALANCES', t, accounts))).toEqual(['VALID', 'VALID']);
  });

  it('opening balances: the ceiling value itself is accepted (balanced file → all VALID)', () => {
    const t = table(OPEN, [
      ['1.1.01', '2026-01-01', 'Banco', String(MAX), '0'],
      ['2.1.01', '2026-01-01', 'Capital', '0', String(MAX)],
    ]);
    expect(statuses(validateImport('IMPORT_OPENING_BALANCES', t, accounts))).toEqual(['VALID', 'VALID']);
  });

  it('opening balances: one cent over the ceiling → DEBIT_TOO_LARGE at preview', () => {
    const t = table(OPEN, [
      ['1.1.01', '2026-01-01', 'Banco', String(MAX + 1), '0'],
      ['2.1.01', '2026-01-01', 'Capital', '0', String(MAX + 1)],
    ]);
    const r = validateImport('IMPORT_OPENING_BALANCES', t, accounts);
    expect(r[0].errorCode).toBe('DEBIT_TOO_LARGE'); // a linha ofensora mantém o motivo específico
    expect(r[0].status).toBe('INVALID');
  });

  it('journal: the ceiling value in a balanced group is accepted', () => {
    const t = table(JRNL, [
      ['L1', '', '2026-07-01', 'x', '1.1.01', String(MAX), '0', '', ''],
      ['L1', '', '2026-07-01', 'x', '2.1.01', '0', String(MAX), '', ''],
    ]);
    expect(statuses(validateImport('IMPORT_JOURNAL_ENTRIES', t, accounts))).toEqual(['VALID', 'VALID']);
  });

  it('journal: o valor do ACC-INCR6-J-001 (2^31) agora entra, e uma perna desbalanceada no teto segue INVALID na prévia', () => {
    const ok = table(JRNL, [
      ['L1', '', '2026-07-01', 'x', '1.1.01', '2147483648', '0', '', ''],
      ['L1', '', '2026-07-01', 'x', '2.1.01', '0', '2147483648', '', ''],
    ]);
    expect(statuses(validateImport('IMPORT_JOURNAL_ENTRIES', ok, accounts))).toEqual(['VALID', 'VALID']);
    const unbalanced = table(JRNL, [
      ['L1', '', '2026-07-01', 'x', '1.1.01', '100000', '0', '', ''],
      ['L1', '', '2026-07-01', 'x', '2.1.01', '0', '9007199254740991', '', ''],
    ]);
    const r = validateImport('IMPORT_JOURNAL_ENTRIES', unbalanced, accounts);
    expect(r.some((x) => x.status === 'VALID')).toBe(false);
    // 9007199254740991 (2^53−1) segue recusado com o motivo específico, não como POST_FAILED no commit.
    expect(r.find((x) => x.errorCode === 'CREDIT_TOO_LARGE')?.status).toBe('INVALID');
  });

  it('journal: a value beyond MAX_SAFE_INTEGER still rejected (BAD_CREDIT via parse), never VALID', () => {
    const t = table(JRNL, [
      ['L1', '', '2026-07-01', 'x', '1.1.01', '100000', '0', '', ''],
      ['L1', '', '2026-07-01', 'x', '2.1.01', '0', '9007199254740992', '', ''], // MAX_SAFE + 1
    ]);
    const r = validateImport('IMPORT_JOURNAL_ENTRIES', t, accounts);
    expect(r.some((x) => x.status === 'VALID')).toBe(false);
    expect(r.find((x) => x.field === 'creditCents')?.errorCode).toBe('BAD_CREDIT');
  });
});
