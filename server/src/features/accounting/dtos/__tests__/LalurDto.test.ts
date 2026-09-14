/**
 * LalurDto — contract test of the adjustment-line DTO (BE-INCR-SPED-ECF-FASE3B item 11; ADR EMENDA
 * 2026-09-11 (2ª) D-M3). The `.superRefine` is invisible to the shape snapshot, so the conditionals
 * of REGRA_RELACAO_INEXISTENTE (Manual p.247) and the Bloco N exclusion are proven here.
 */
import {
  CreateLalurEntrySchema,
  CreateLalurParteBAccountSchema,
  CreateLalurParteBMovementSchema,
  LalurParteBBalancesQuerySchema,
  LalurParteBPeriodSchema,
  LalurProcessoSchema,
  UpdateLalurEntrySchema,
  UpdateLalurParteBMovementSchema,
} from '../LalurDto';

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

// ─── ECF Fase 3C (ADR EMENDA 2026-09-12, 3ª) — M410, processos, M312 links, sem '|' ────────────

describe('CreateLalurParteBMovementSchema — M410 (p.268)', () => {
  const mv = { unitId: 'u1', parteBId: 'pb1', year: 2025, quarter: 'T01', indicador: 'CR', valorCents: 100000, historico: 'Transferência', indLanAnt: 'N' };
  it('CONTROLE: mínimo válido passa; com contrapartida (CR/DB) passa', () => {
    expect(CreateLalurParteBMovementSchema.safeParse(mv).success).toBe(true);
    expect(CreateLalurParteBMovementSchema.safeParse({ ...mv, indicador: 'DB', contrapartidaId: 'pb2' }).success).toBe(true);
  });
  it.each(['PF', 'BC'])('%s com contrapartidaId é 400 (REGRA_NAO_PREENCHER_CTP, p.269); sem contrapartida passa', (ind) => {
    failsOn(CreateLalurParteBMovementSchema, { ...mv, indicador: ind, contrapartidaId: 'pb2' }, 'contrapartidaId');
    expect(CreateLalurParteBMovementSchema.safeParse({ ...mv, indicador: ind }).success).toBe(true);
  });
  it('codTributo/origem são derivados — .strict() recusa como input', () => {
    expect(CreateLalurParteBMovementSchema.safeParse({ ...mv, codTributo: 'I' }).success).toBe(false);
    expect(CreateLalurParteBMovementSchema.safeParse({ ...mv, origem: 'system' }).success).toBe(false);
  });
  it('indicador ∉ {CR,DB,PF,BC}, indLanAnt ∉ {S,N}, valor negativo, parteBId vazio → 400', () => {
    failsOn(CreateLalurParteBMovementSchema, { ...mv, indicador: 'DE' }, 'indicador');
    failsOn(CreateLalurParteBMovementSchema, { ...mv, indLanAnt: 'X' }, 'indLanAnt');
    failsOn(CreateLalurParteBMovementSchema, { ...mv, valorCents: -1 }, 'valorCents');
    failsOn(CreateLalurParteBMovementSchema, { ...mv, parteBId: '' }, 'parteBId');
  });
  it('UpdateLalurParteBMovementSchema: year/quarter/parteBId não são editáveis; contrapartidaId aceita null', () => {
    expect(UpdateLalurParteBMovementSchema.safeParse({ unitId: 'u1', valorCents: 5, contrapartidaId: null }).success).toBe(true);
    expect(UpdateLalurParteBMovementSchema.safeParse({ unitId: 'u1', quarter: 'T02' }).success).toBe(false);
    expect(UpdateLalurParteBMovementSchema.safeParse({ unitId: 'u1', parteBId: 'pb9' }).success).toBe(false);
  });
});

describe("Texto livre sem '|' (item 17 — separador de campo do SPED, Manual p.31)", () => {
  const mv = { unitId: 'u1', parteBId: 'pb1', year: 2025, quarter: 'T01', indicador: 'CR', valorCents: 1, historico: 'ok', indLanAnt: 'N' };
  it('historico do M410 com | é 400', () => {
    failsOn(CreateLalurParteBMovementSchema, { ...mv, historico: 'a|b' }, 'historico');
  });
  it('histLancamento do M300 com | é 400 (create e update)', () => {
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '4', histLancamento: 'x|y' }, 'histLancamento');
    failsOn(UpdateLalurEntrySchema, { unitId: 'u1', histLancamento: 'x|y' }, 'histLancamento');
  });
  it('descricao/codCtaB da conta da Parte B com | é 400', () => {
    const pb = { unitId: 'u1', codCtaB: 'PF-001', descricao: 'Prejuízo|fiscal', dtCriacao: '2024-12-31', codPbRfb: '1000', codTributo: 'I', saldoIniCents: 0, indSaldoIni: 'D' };
    failsOn(CreateLalurParteBAccountSchema, pb, 'descricao');
    failsOn(CreateLalurParteBAccountSchema, { ...pb, descricao: 'ok', codCtaB: 'A|B' }, 'codCtaB');
  });
  it('numProc com | é 400; numProc > 20 chars é 400 (C 20, p.255)', () => {
    failsOn(LalurProcessoSchema, { indProc: '1', numProc: '123|4' }, 'numProc');
    failsOn(LalurProcessoSchema, { indProc: '1', numProc: '1'.repeat(21) }, 'numProc');
    expect(LalurProcessoSchema.safeParse({ indProc: '2', numProc: '1'.repeat(20) }).success).toBe(true);
  });
});

describe('processos[] (M315/M365/M415) e journalEntryIds[] (M312/M362) — Forks F-3C-3/4 (a)', () => {
  const lalurCta = { ...base, indRelacao: '2', accountId: 'a1' };
  it('CONTROLE: lalur com processos e journalEntryIds passa', () => {
    expect(CreateLalurEntrySchema.safeParse({ ...lalurCta, processos: [{ indProc: '1', numProc: '0001' }], journalEntryIds: ['je1', 'je2'] }).success).toBe(true);
  });
  it('processo repetido (indProc+numProc) no mesmo payload é 400 — chave do registro', () => {
    failsOn(CreateLalurEntrySchema, { ...lalurCta, processos: [{ indProc: '1', numProc: '0001' }, { indProc: '1', numProc: '0001' }] }, 'processos');
    // mesmo numProc com indProc diferente é outra chave — passa
    expect(CreateLalurEntrySchema.safeParse({ ...lalurCta, processos: [{ indProc: '1', numProc: '0001' }, { indProc: '2', numProc: '0001' }] }).success).toBe(true);
  });
  it('journalEntryIds repetido é 400; indProc ∉ {1,2} é 400', () => {
    failsOn(CreateLalurEntrySchema, { ...lalurCta, journalEntryIds: ['je1', 'je1'] }, 'journalEntryIds');
    failsOn(CreateLalurEntrySchema, { ...lalurCta, processos: [{ indProc: '3', numProc: '1' }] }, 'processos');
  });
  it('journalEntryIds só com indRelacao 2 ou 3 (M312 é filho de M310, p.254): com 1 ou 4 é 400', () => {
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '1', parteBId: 'pb1', journalEntryIds: ['je1'] }, 'journalEntryIds');
    failsOn(CreateLalurEntrySchema, { ...base, indRelacao: '4', histLancamento: 'x', journalEntryIds: ['je1'] }, 'journalEntryIds');
    expect(CreateLalurEntrySchema.safeParse({ ...base, indRelacao: '3', parteBId: 'pb1', accountId: 'a1', journalEntryIds: ['je1'] }).success).toBe(true);
  });
  it('Bloco N (D-M3): processos/journalEntryIds não existem em n630', () => {
    failsOn(CreateLalurEntrySchema, { ...base, livro: 'n630', codigo: '4', processos: [] }, 'processos');
    failsOn(CreateLalurEntrySchema, { ...base, livro: 'n630', codigo: '4', journalEntryIds: [] }, 'journalEntryIds');
  });
  it('M410: processos aceitos no create e no update', () => {
    const mv = { unitId: 'u1', parteBId: 'pb1', year: 2025, quarter: 'T01', indicador: 'CR', valorCents: 1, historico: 'ok', indLanAnt: 'N' };
    expect(CreateLalurParteBMovementSchema.safeParse({ ...mv, processos: [{ indProc: '2', numProc: 'ADM-1' }] }).success).toBe(true);
    expect(UpdateLalurParteBMovementSchema.safeParse({ unitId: 'u1', processos: [] }).success).toBe(true);
  });
});

describe('LalurParteBPeriodSchema (close/reopen) e LalurParteBBalancesQuerySchema', () => {
  it('período mínimo passa; .strict() recusa extra; quarter inválido é 400', () => {
    expect(LalurParteBPeriodSchema.safeParse({ unitId: 'u1', year: 2025, quarter: 'T04' }).success).toBe(true);
    expect(LalurParteBPeriodSchema.safeParse({ unitId: 'u1', year: 2025, quarter: 'T04', force: true }).success).toBe(false);
    failsOn(LalurParteBPeriodSchema, { unitId: 'u1', year: 2025, quarter: 'T05' }, 'quarter');
  });
  it('balances: year é obrigatório e coercido da query string', () => {
    const p = LalurParteBBalancesQuerySchema.safeParse({ unitId: 'u1', year: '2025' });
    expect(p.success && p.data.year).toBe(2025);
    failsOn(LalurParteBBalancesQuerySchema, { unitId: 'u1' }, 'year');
  });
});
