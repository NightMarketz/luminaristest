/**
 * TAX-ASSESSMENT-PERIODOS — unidade do Service com repositórios fakes (BRIEF
 * `docs/accounting/BE-INCR-TAX-ASSESSMENT-PERIODOS-brief.md` itens 2, 4–9, 11). Tabela legal = a semente da migração.
 */
import type { CompanyFiscalProfile, LegalParameter, SimplesApuracao, TaxAssessment } from 'generated/prisma';
import { ForbiddenError } from '@/lib/errors';
import { AccountingPolicy } from '@/features/accounting/policies/AccountingPolicy';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { TaxAssessmentPeriodosService } from '@/features/accounting/services/TaxAssessmentPeriodosService';
import { trimestresEmAtividade } from '@/features/accounting/models/taxAssessmentCalc';
import { mesesEmAtividade } from '@/features/accounting/models/taxAssessmentCalcAnual';
import { TaxAssessmentPeriodosQuerySchema, TaxAssessmentPeriodosViewSchema } from '@/features/accounting/dtos/TaxAssessmentPeriodosDto';
import { legalParamsSeedRows } from '@test/helpers/legalParams';

const scope = resolveAccountingScope({ userId: 'dono' }, 'unit-1');
const seed = legalParamsSeedRows() as unknown as LegalParameter[];

function perfil(over: Partial<CompanyFiscalProfile>): CompanyFiscalProfile {
  return { regime: 'PRESUMIDO', formaApuracaoIrpjCsll: null, inicioAtividadeEm: null, encerramentoAtividadeEm: null, ...over } as CompanyFiscalProfile;
}

function ta(over: Partial<TaxAssessment>): TaxAssessment {
  return { id: 'ta', periodo: 'T01', tributo: 'IRPJ', status: 'CONFIRMED', aPagarCents: 100n, ...over } as TaxAssessment;
}

function make(opts: { perfil?: CompanyFiscalProfile | null; rows?: TaxAssessment[]; simples?: SimplesApuracao[]; policy?: AccountingPolicy } = {}) {
  const repo = { findMany: jest.fn(async () => opts.rows ?? []) };
  const simplesRepo = { findDoAno: jest.fn(async () => opts.simples ?? []) };
  const legalParams = { fotografia: jest.fn(async (t: readonly string[]) => seed.filter((r) => t.includes(r.tabela))) };
  const svc = new TaxAssessmentPeriodosService(
    repo,
    { findByYear: jest.fn(async () => (opts.perfil === undefined ? perfil({}) : opts.perfil)) },
    simplesRepo,
    legalParams,
    opts.policy ?? new AccountingPolicy(),
  );
  return { svc, repo, simplesRepo, legalParams };
}

const familia = (v: Awaited<ReturnType<TaxAssessmentPeriodosService['listar']>>, f: string) => v.familias.find((x) => x.familia === f)!;
const estados = (fam: ReturnType<typeof familia>, tributo: string) => fam.periodos.map((p) => [p.periodo, p.tributos[tributo].estado]);

describe('TaxAssessmentPeriodosService', () => {
  it('item 2: sem canReadTaxAssessment ⇒ 403, nada lido', async () => {
    const policy = new AccountingPolicy();
    jest.spyOn(policy, 'canReadTaxAssessment').mockReturnValue(false);
    const { svc, repo } = make({ policy });
    await expect(svc.listar(scope, { unitId: 'unit-1', anoCalendario: 2026 })).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.findMany).not.toHaveBeenCalled();
  });

  it('item 4: perfil ausente ⇒ as 3 famílias PERFIL_AUSENTE, sem períodos', async () => {
    const v = await make({ perfil: null }).svc.listar(scope, { unitId: 'unit-1', anoCalendario: 2026 });
    expect(v).toEqual({
      anoCalendario: 2026, regime: null,
      familias: ['X7', 'X8', 'SIMPLES'].map((f) => ({ familia: f, apuravel: false, motivo: 'PERFIL_AUSENTE', periodos: [] })),
    });
  });

  it('itens 4/5/6: SIMPLES ⇒ X7 e X8 REGIME_DAS; Simples com as 12 competências; nenhuma leitura de TaxAssessment', async () => {
    const { svc, repo } = make({ perfil: perfil({ regime: 'SIMPLES' }) });
    const v = await svc.listar(scope, { unitId: 'unit-1', anoCalendario: 2026 });
    expect(familia(v, 'X7')).toMatchObject({ apuravel: false, motivo: 'REGIME_DAS', periodos: [] });
    expect(familia(v, 'X8')).toMatchObject({ apuravel: false, motivo: 'REGIME_DAS', periodos: [] });
    expect(familia(v, 'SIMPLES').periodos.map((p) => p.periodo)).toEqual(Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`));
    expect(repo.findMany).not.toHaveBeenCalled();
  });

  it('item 6: MEI é apurável no Simples (X14 item 25 — SIMEI); PRESUMIDO ⇒ REGIME_NAO_SIMPLES', async () => {
    const mei = await make({ perfil: perfil({ regime: 'MEI' }) }).svc.listar(scope, { unitId: 'unit-1', anoCalendario: 2026 });
    expect(familia(mei, 'SIMPLES').apuravel).toBe(true);
    const pres = await make().svc.listar(scope, { unitId: 'unit-1', anoCalendario: 2026 });
    expect(familia(pres, 'SIMPLES')).toMatchObject({ apuravel: false, motivo: 'REGIME_NAO_SIMPLES' });
  });

  it('item 4: TRIMESTRAL — T01..T04; início em maio e encerramento em agosto ⇒ T01 e T04 fora da atividade', async () => {
    const v = await make({ perfil: perfil({ inicioAtividadeEm: '2026-05-10', encerramentoAtividadeEm: '2026-08-20' }) }).svc.listar(scope, { unitId: 'unit-1', anoCalendario: 2026 });
    const x7 = familia(v, 'X7');
    expect(x7.forma).toBe('TRIMESTRAL');
    expect(estados(x7, 'IRPJ')).toEqual([['T01', 'FORA_DA_ATIVIDADE'], ['T02', 'SEM_APURACAO'], ['T03', 'SEM_APURACAO'], ['T04', 'FORA_DA_ATIVIDADE']]);
  });

  it('item 4: ANUAL — A01..A12 + A00; início em maio ⇒ A01..A04 fora, A00 em atividade', async () => {
    const v = await make({ perfil: perfil({ regime: 'REAL', formaApuracaoIrpjCsll: 'ANUAL', inicioAtividadeEm: '2026-05-10' }) }).svc.listar(scope, { unitId: 'unit-1', anoCalendario: 2026 });
    const x7 = familia(v, 'X7');
    expect(x7.forma).toBe('ANUAL');
    expect(x7.periodos.map((p) => p.periodo)).toEqual(['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A00']);
    expect(estados(x7, 'CSLL').filter(([, e]) => e === 'FORA_DA_ATIVIDADE').map(([p]) => p)).toEqual(['A01', 'A02', 'A03', 'A04']);
    expect(x7.periodos.at(-1)!.tributos.IRPJ.estado).toBe('SEM_APURACAO');
  });

  it('item 9: equivalência — os períodos em atividade são exatamente os das funções puras', async () => {
    const casos: Array<[string | null, string | null]> = [[null, null], ['2026-02-15', null], ['2026-05-10', '2026-08-20'], [null, '2026-03-31'], ['2026-12-31', null]];
    for (const [ini, fim] of casos) {
      const tri = familia(await make({ perfil: perfil({ inicioAtividadeEm: ini, encerramentoAtividadeEm: fim }) }).svc.listar(scope, { unitId: 'u', anoCalendario: 2026 }), 'X7');
      expect(estados(tri, 'IRPJ').filter(([, e]) => e !== 'FORA_DA_ATIVIDADE').map(([p]) => p)).toEqual(trimestresEmAtividade(2026, ini, fim));
      const anual = familia(await make({ perfil: perfil({ regime: 'REAL', formaApuracaoIrpjCsll: 'ANUAL', inicioAtividadeEm: ini, encerramentoAtividadeEm: fim }) }).svc.listar(scope, { unitId: 'u', anoCalendario: 2026 }), 'X7');
      expect(estados(anual, 'IRPJ').filter(([p, e]) => p !== 'A00' && e !== 'FORA_DA_ATIVIDADE').map(([p]) => Number(String(p).slice(1)))).toEqual(mesesEmAtividade(2026, ini, fim));
      const x8 = familia(await make({ perfil: perfil({ inicioAtividadeEm: ini, encerramentoAtividadeEm: fim }) }).svc.listar(scope, { unitId: 'u', anoCalendario: 2026 }), 'X8');
      expect(estados(x8, 'PIS').filter(([, e]) => e !== 'FORA_DA_ATIVIDADE').map(([p]) => Number(String(p).slice(1)))).toEqual(mesesEmAtividade(2026, ini, fim));
    }
  });

  it('item 5: X8 — modalidade pelo regime; 2026 sem revogação; 2027 ⇒ REVOGADO com o motivo da fonte', async () => {
    const real = familia(await make({ perfil: perfil({ regime: 'REAL' }) }).svc.listar(scope, { unitId: 'u', anoCalendario: 2026 }), 'X8');
    expect(real.modalidade).toBe('NAO_CUMULATIVO');
    expect(new Set(estados(real, 'COFINS').map(([, e]) => e))).toEqual(new Set(['SEM_APURACAO']));
    const v2027 = familia(await make().svc.listar(scope, { unitId: 'u', anoCalendario: 2027 }), 'X8');
    expect(v2027.modalidade).toBe('CUMULATIVO');
    expect(new Set(estados(v2027, 'PIS').map(([, e]) => e))).toEqual(new Set(['REVOGADO']));
    expect(v2027.periodos[0].motivo).toMatch(/revogados a partir de 2027-01/);
  });

  it('itens 7/8: CONFIRMED com id + aPagarCents; só substituída ⇒ SO_SUPERSEDED; 1 consulta para X7 e X8', async () => {
    const rows = [
      ta({ id: 'irpj-t1', aPagarCents: 12345n }),
      ta({ id: 'old', tributo: 'CSLL', status: 'SUPERSEDED' }),
      ta({ id: 'csll-t1', tributo: 'CSLL', aPagarCents: 9n }),
      ta({ id: 'sup-t2', periodo: 'T02', status: 'SUPERSEDED' }),
      ta({ id: 'pis-m1', periodo: 'M01', tributo: 'PIS', aPagarCents: 650n }),
    ];
    const { svc, repo } = make({ rows });
    const v = await svc.listar(scope, { unitId: 'u', anoCalendario: 2026 });
    expect(repo.findMany).toHaveBeenCalledTimes(1);
    const x7 = familia(v, 'X7');
    expect(x7.periodos[0].tributos).toEqual({ IRPJ: { estado: 'CONFIRMED', id: 'irpj-t1', aPagarCents: '12345' }, CSLL: { estado: 'CONFIRMED', id: 'csll-t1', aPagarCents: '9' } });
    expect(x7.periodos[1].tributos.IRPJ).toEqual({ estado: 'SO_SUPERSEDED' });
    expect(x7.periodos[1].tributos.CSLL).toEqual({ estado: 'SEM_APURACAO' });
    expect(familia(v, 'X8').periodos[0].tributos).toEqual({ PIS: { estado: 'CONFIRMED', id: 'pis-m1', aPagarCents: '650' }, COFINS: { estado: 'SEM_APURACAO' } });
  });

  it('itens 6/7/8: Simples — DAS CONFIRMED com o valor oficial; SO_SUPERSEDED; competência antes do início ⇒ fora', async () => {
    const simples = [
      { id: 'das-3', competencia: '2026-03', status: 'CONFIRMED', valorOficialCents: 4321n },
      { id: 'das-4', competencia: '2026-04', status: 'SUPERSEDED', valorOficialCents: 1n },
    ] as SimplesApuracao[];
    const { svc, simplesRepo } = make({ perfil: perfil({ regime: 'SIMPLES', inicioAtividadeEm: '2026-02-15' }), simples });
    const s = familia(await svc.listar(scope, { unitId: 'u', anoCalendario: 2026 }), 'SIMPLES');
    expect(simplesRepo.findDoAno).toHaveBeenCalledTimes(1);
    expect(s.periodos.slice(0, 5).map((p) => p.tributos.DAS)).toEqual([
      { estado: 'FORA_DA_ATIVIDADE' },
      { estado: 'SEM_APURACAO' },
      { estado: 'CONFIRMED', id: 'das-3', aPagarCents: '4321' },
      { estado: 'SO_SUPERSEDED' },
      { estado: 'SEM_APURACAO' },
    ]);
  });

  it('a resposta passa no contrato .strict()', async () => {
    const v = await make({ rows: [ta({})] }).svc.listar(scope, { unitId: 'u', anoCalendario: 2026 });
    expect(TaxAssessmentPeriodosViewSchema.safeParse(v).success).toBe(true);
  });
});

describe('TaxAssessmentPeriodosQuerySchema (item 3)', () => {
  it('aceita unitId + ano; recusa chave extra, ano fora de 2000..2100 e unitId vazio', () => {
    expect(TaxAssessmentPeriodosQuerySchema.safeParse({ unitId: 'u', anoCalendario: '2026' }).success).toBe(true);
    expect(TaxAssessmentPeriodosQuerySchema.safeParse({ unitId: 'u', anoCalendario: '2026', x: '1' }).success).toBe(false);
    expect(TaxAssessmentPeriodosQuerySchema.safeParse({ unitId: 'u', anoCalendario: '1999' }).success).toBe(false);
    expect(TaxAssessmentPeriodosQuerySchema.safeParse({ unitId: 'u', anoCalendario: '2101' }).success).toBe(false);
    expect(TaxAssessmentPeriodosQuerySchema.safeParse({ unitId: '', anoCalendario: '2026' }).success).toBe(false);
  });
});
