/**
 * LalurDto — contract test of the adjustment-line DTO (BE-INCR-SPED-ECF-FASE3B item 11; ADR EMENDA
 * 2026-09-11 (2ª) D-M3). The `.superRefine` is invisible to the shape snapshot, so the conditionals
 * of REGRA_RELACAO_INEXISTENTE (Manual p.247) and the Bloco N exclusion are proven here.
 */
import { CreateLalurEntrySchema, CreateLalurParteBAccountSchema, UpdateLalurEntrySchema } from '../LalurDto';

const base = { unitId: 'u1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 1000 };

const failsOn = (schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[] }[] } } }, payload: unknown, pathHead: string) => {
  const parsed = schema.safeParse(payload);
  expect(parsed.success).toBe(false);
  if (!parsed.success) expect(parsed.error!.issues.some((i) => i.path[0] === pathHead)).toBe(true);
};

describe('CreateLalurEntrySchema — REGRA_RELACAO_INEXISTENTE (p.247) espelhada', () => {
  it('CONTROLE: lalur com indRelacao=1 + parteBId passa', () => {
    expect(CreateLalurEntrySchema.safeParse({ ...base, indRelacao: '1', parteBId: 'pb1' }).success).toBe(true);
  });
  it('indRelacao=1 sem parteBId → parteBId; com accountId → accountId proibido', () => {
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '1' }, 'parteBId');
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '1', parteBId: 'pb1', accountId: 'a1' }, 'accountId');
  });
  it('indRelacao=2 exige accountId e proíbe parteBId', () => {
    expect(CreateLalurEntrySchema.safeParse({ ...base, indRelacao: '2', accountId: 'a1' }).success).toBe(true);
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '2' }, 'accountId');
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '2', accountId: 'a1', parteBId: 'pb1' }, 'parteBId');
  });
  it('indRelacao=3 exige ambos', () => {
    expect(CreateLalurEntrySchema.safeParse({ ...base, indRelacao: '3', accountId: 'a1', parteBId: 'pb1' }).success).toBe(true);
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '3', accountId: 'a1' }, 'parteBId');
  });
  it('indRelacao=4 proíbe ambos e exige histLancamento (leitura INFERIDA, N-3)', () => {
    expect(CreateLalurEntrySchema.safeParse({ ...base, indRelacao: '4', histLancamento: 'sem relação' }).success).toBe(true);
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '4' }, 'histLancamento');
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '4', histLancamento: 'x', parteBId: 'pb1' }, 'parteBId');
  });
  it('lalur/lacs sem indRelacao é 400 (obrigatório em linha E)', () => {
    failsOn(CreateLalurEntrySchema, { ...base }, 'indRelacao');
    failsOn(CreateLalurEntrySchema, { ...base, livro: 'lacs' }, 'indRelacao');
  });
});

describe('CreateLalurEntrySchema — Bloco N (D-M3): só REG/CODIGO/DESCRICAO/VALOR', () => {
  it('CONTROLE: n630 sem campos do M300 passa', () => {
    expect(CreateLalurEntrySchema.safeParse({ ...base, livro: 'n630', codigo: '4' }).success).toBe(true);
  });
  it.each(['indRelacao', 'parteBId', 'accountId', 'histLancamento'])('n630 com %s é 400 (campo não existe no N630, p.298)', (k) => {
    const v = k === 'indRelacao' ? '4' : 'x';
    failsOn(CreateLalurEntrySchema, { ...base, livro: 'n630', codigo: '4', [k]: v }, k);
  });
});

describe('CreateLalurEntrySchema — forma', () => {
  it('valorCents negativo é 400 (p.244: negativo = "Erro no programa"); 0 passa', () => {
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '4', histLancamento: 'x', valorCents: -1 }, 'valorCents');
    expect(CreateLalurEntrySchema.safeParse({ ...base, indRelacao: '4', histLancamento: 'x', valorCents: 0 }).success).toBe(true);
  });
  it('.strict(): chave desconhecida (descricao/tipoLancamento — derivados, nunca input) é 400', () => {
    expect(CreateLalurEntrySchema.safeParse({ ...base, indRelacao: '4', histLancamento: 'x', descricao: 'Custos' }).success).toBe(false);
    expect(CreateLalurEntrySchema.safeParse({ ...base, indRelacao: '4', histLancamento: 'x', tipoLancamento: 'A' }).success).toBe(false);
  });
  it('quarter fora de T01..T04 e livro fora do enum são 400', () => {
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '4', histLancamento: 'x', quarter: 'A00' }, 'quarter');
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '4', histLancamento: 'x', livro: 'm300' }, 'livro');
  });
  it('UpdateLalurEntrySchema: chave (codigo/quarter/year/livro) não é editável — .strict() recusa', () => {
    expect(UpdateLalurEntrySchema.safeParse({ unitId: 'u1', valorCents: 5 }).success).toBe(true);
    expect(UpdateLalurEntrySchema.safeParse({ unitId: 'u1', codigo: '8' }).success).toBe(false);
    expect(UpdateLalurEntrySchema.safeParse({ unitId: 'u1', parteBId: null, accountId: null, histLancamento: null }).success).toBe(true);
  });
});

describe('CreateLalurParteBAccountSchema — M010 (p.237)', () => {
  const pb = { unitId: 'u1', codCtaB: 'PF-001', descricao: 'Prejuízo fiscal', dtCriacao: '2024-12-31', codPbRfb: '1000', codTributo: 'I', saldoIniCents: 0, indSaldoIni: 'D' };
  it('CONTROLE: mínimo válido passa; datas date-only reais', () => {
    expect(CreateLalurParteBAccountSchema.safeParse(pb).success).toBe(true);
    failsOn(CreateLalurParteBAccountSchema, { ...pb, dtCriacao: '2024-02-30' }, 'dtCriacao');
  });
  it('codTributo ∉ {I,C}, indSaldoIni ∉ {D,C}, cnpjSitEsp ≠ 14 dígitos, saldo negativo → 400', () => {
    failsOn(CreateLalurParteBAccountSchema, { ...pb, codTributo: 'A' }, 'codTributo');
    failsOn(CreateLalurParteBAccountSchema, { ...pb, indSaldoIni: 'X' }, 'indSaldoIni');
    failsOn(CreateLalurParteBAccountSchema, { ...pb, cnpjSitEsp: '123' }, 'cnpjSitEsp');
    failsOn(CreateLalurParteBAccountSchema, { ...pb, saldoIniCents: -1 }, 'saldoIniCents');
  });
});
