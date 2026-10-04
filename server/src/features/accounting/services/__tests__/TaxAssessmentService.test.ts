/**
 * BE-INCR-TAX-ASSESSMENT Fase A PR-2 (nó X7, BRIEF itens 13, 14, 19) — gates do serviço com repositórios falsos:
 * fiação do Real (livro por tributo, guarda de circularidade), CAS do a pagar, regime do ano, supersedesIds, anteriores
 * que mudaram entre o cálculo e a tx, cadeia de trimestres (F-TA-3 a / L-A) e policy. O fluxo ponta a ponta (HTTP +
 * SQLite) está em taxAssessment.integration.test.ts.
 */
import type { TaxAssessment } from 'generated/prisma';
import { TaxAssessmentService, provisaoPendente, verificarCadeia } from '../TaxAssessmentService';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import type { TaxAssessmentConfirmInput } from '../../dtos/TaxAssessmentDto';

const scope = resolveAccountingScope({ userId: 'pj-1' }, 'unit-1');
const at = (iso: string) => new Date(iso);

const PERFIL_REAL = {
  regime: 'REAL', formaApuracaoIrpjCsll: 'TRIMESTRAL', ecfIndAliqCsll: '1', ecfIndRecReceita: '2', lucroRealObrigatorio: false,
  inicioAtividadeEm: null, encerramentoAtividadeEm: null, lc224AcrescimoSuspenso: false, lc224LiminarReferencia: null,
  updatedAt: new Date('2026-01-05T00:00:00Z'),
};

function row(over: Partial<TaxAssessment>): TaxAssessment {
  return {
    id: 'ta-x', userId: 'pj-1', unitId: 'unit-1', anoCalendario: 2026, tributo: 'IRPJ', regime: 'REAL', forma: 'TRIMESTRAL',
    periodo: 'T01', modo: 'REAL_TRIMESTRAL', codigoReceita: '337301', baseCents: 0n, devidoCents: 0n, deducoesCents: 0n,
    aPagarCents: 0n, saldoNegativoCents: 0n, memoria: [], tabelaVersao: 'v', status: 'CONFIRMED', supersedesId: null,
    provisaoEntryId: null, confirmedById: 'pj-1', confirmedAt: at('2026-04-10T00:00:00Z'), createdAt: new Date(), updatedAt: new Date(),
    deletedAt: null, ...over,
  } as TaxAssessment;
}

function build(opts: { perfil?: Record<string, unknown>; perfilNaTx?: Record<string, unknown> | null; confirmados?: TaxAssessment[]; confirmadosNaTx?: TaxAssessment[]; canManage?: boolean } = {}) {
  const created: unknown[] = [];
  const repo = {
    findMany: jest.fn(async (_s: unknown, _f: unknown, tx?: unknown) => (tx ? (opts.confirmadosNaTx ?? opts.confirmados ?? []) : (opts.confirmados ?? []))),
    findById: jest.fn(),
    create: jest.fn(async (_s: unknown, data: Record<string, unknown>) => {
      const r = row({ ...(data as Partial<TaxAssessment>), id: `novo-${created.length}` });
      created.push(r);
      return r;
    }),
    markSuperseded: jest.fn(async (_s: unknown, _id: string, _tx?: unknown) => true),
    findOtherUnitsWithMovement: jest.fn(async () => []),
    runTransaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn('TX')),
  };
  const companyProfileRepo = {
    findByYear: jest.fn(async (_s: unknown, _ano: number, tx?: unknown) =>
      tx && opts.perfilNaTx !== undefined ? (opts.perfilNaTx && { ...PERFIL_REAL, ...opts.perfilNaTx }) : { ...PERFIL_REAL, ...opts.perfil }),
    travarFormaApuracao: jest.fn(async () => 1),
  };
  const fiscalProfileRepo = { findByScope: jest.fn(async () => ({ irpjDespesaAccountId: 'desp-irpj', csllDespesaAccountId: 'desp-csll', irpjRecolherAccountId: 'rec-irpj', csllRecolherAccountId: 'rec-csll' })) };
  const lalurRepo = {
    findManyEntries: jest.fn(async () => [
      { livro: 'lalur', codigo: '6', valorCents: 100_000n }, // adição do IRPJ (só entra no IRPJ)
      { livro: 'lacs', codigo: '6', valorCents: 0n },
    ]),
    findClosing: jest.fn(async () => ({ id: 'closing' })),
  };
  const reportService = { resultadoAntesIrpjCsll: jest.fn(async () => 1_000_000) };
  const auditService = { append: jest.fn(async (_tx: unknown, _s: unknown, _ev: { eventType: string }) => undefined) };
  const policy = { canReadTaxAssessment: () => true, canManageTaxAssessment: () => opts.canManage ?? true };
  const svc = new TaxAssessmentService(
    repo as never, companyProfileRepo as never, fiscalProfileRepo as never, {} as never, {} as never,
    lalurRepo as never, reportService as never, auditService as never, policy as never,
  );
  return { svc, repo, companyProfileRepo, reportService, auditService, created };
}

const base = { unitId: 'unit-1', anoCalendario: 2026, periodo: 'T01' as const, deducoes: [] };

describe('TaxAssessmentService (X7 PR-2)', () => {
  it('Real: guarda de circularidade exclui as 2 despesas da provisão; linhas do e-Lalur só no IRPJ, do e-Lacs só na CSLL', async () => {
    const { svc, reportService } = build();
    const p = await svc.preview(scope, base);
    expect(reportService.resultadoAntesIrpjCsll).toHaveBeenCalledWith(scope, expect.any(Date), expect.any(Date), ['desp-irpj', 'desp-csll']);
    const linha = (m: { codigo: string; valorCents: string }[], c: string) => m.find((x) => x.codigo === c)?.valorCents;
    expect(linha(p.irpj.memoria, 'ADICOES')).toBe('100000');
    expect(linha(p.csll.memoria, 'ADICOES')).toBe('0');
    expect(p.provisaoContasConfiguradas).toBe(true);
    expect(p.avisos).toEqual([]);
  });

  it('item 14: CAS — expectedAPagarCents diferente do recalculado ⇒ 409, nada gravado', async () => {
    const { svc, repo } = build();
    const p = await svc.preview(scope, base);
    const dto: TaxAssessmentConfirmInput = { ...base, expectedAPagarCents: { IRPJ: p.irpj.aPagarCents, CSLL: '1' } };
    await expect(svc.confirm(scope, dto)).rejects.toMatchObject({ statusCode: 409, errorCode: 'TAX_ASSESSMENT_STALE' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  async function confirmDto(b: ReturnType<typeof build>, over: Partial<TaxAssessmentConfirmInput> = {}): Promise<TaxAssessmentConfirmInput> {
    const p = await b.svc.preview(scope, { ...base, ...over });
    return { ...base, ...over, expectedAPagarCents: { IRPJ: p.irpj.aPagarCents, CSLL: p.csll.aPagarCents } };
  }

  it('item 14: regime do perfil diferente do das confirmações do ano ⇒ 409', async () => {
    const b = build({ confirmados: [row({ id: 'p1', regime: 'PRESUMIDO', periodo: 'T01' }), row({ id: 'p2', regime: 'PRESUMIDO', periodo: 'T01', tributo: 'CSLL' })] });
    const dto = await confirmDto(b, { periodo: 'T02' });
    await expect(b.svc.confirm(scope, dto)).rejects.toMatchObject({ errorCode: 'TAX_ASSESSMENT_REGIME_MISMATCH' });
  });

  it('item 14: supersedesIds com id que não é o CONFIRMED vivo do período ⇒ 409', async () => {
    const b = build({ confirmados: [row({ id: 'vivo-irpj' }), row({ id: 'vivo-csll', tributo: 'CSLL' })] });
    const dto = await confirmDto(b, { supersedesIds: ['vivo-irpj', 'outro'] });
    await expect(b.svc.confirm(scope, dto)).rejects.toMatchObject({ errorCode: 'TAX_ASSESSMENT_SUPERSEDES_INVALID' });
  });

  it('item 14: substituição grava supersedesId por tributo, marca as antigas e audita confirmed + superseded', async () => {
    const b = build({ confirmados: [row({ id: 'vivo-irpj' }), row({ id: 'vivo-csll', tributo: 'CSLL' })] });
    const dto = await confirmDto(b, { supersedesIds: ['vivo-csll', 'vivo-irpj'] });
    const views = await b.svc.confirm(scope, dto);
    expect(views.map((v) => [v.tributo, v.supersedesId])).toEqual([['IRPJ', 'vivo-irpj'], ['CSLL', 'vivo-csll']]);
    expect(b.repo.markSuperseded.mock.calls.map((c) => c[1])).toEqual(['vivo-irpj', 'vivo-csll']);
    expect(b.auditService.append.mock.calls.map((c) => c[2].eventType)).toEqual([
      'tax.assessment.confirmed', 'tax.assessment.superseded', 'tax.assessment.confirmed', 'tax.assessment.superseded',
    ]);
    expect(b.companyProfileRepo.travarFormaApuracao).toHaveBeenCalledWith(scope, 2026, expect.any(Date), 'TX');
  });

  it('item 14: anterior confirmado DEPOIS do cálculo (fora da tx) ⇒ 409 "refaça o preview"', async () => {
    const t01 = [row({ id: 'a1', periodo: 'T01' }), row({ id: 'a2', periodo: 'T01', tributo: 'CSLL' })];
    const b = build({ confirmados: t01, confirmadosNaTx: [...t01.map((r) => ({ ...r, id: `${r.id}-novo` }))] });
    const dto = await confirmDto(b, { periodo: 'T02' });
    await expect(b.svc.confirm(scope, dto)).rejects.toMatchObject({ errorCode: 'TAX_ASSESSMENT_STALE' });
  });

  it('item 14 (achado 1 do review): perfil alterado ou apagado entre o cálculo e a tx ⇒ 409, sem trava nem linha', async () => {
    for (const perfilNaTx of [{ regime: 'REAL', updatedAt: new Date('2026-01-06T00:00:00Z') }, null]) {
      const b = build({ perfilNaTx });
      const dto = await confirmDto(b);
      await expect(b.svc.confirm(scope, dto)).rejects.toMatchObject({ errorCode: 'TAX_ASSESSMENT_STALE' });
      expect(b.companyProfileRepo.travarFormaApuracao).not.toHaveBeenCalled();
      expect(b.repo.create).not.toHaveBeenCalled();
    }
  });

  it('item 19: confirmar exige manage', async () => {
    const b = build({ canManage: false });
    await expect(b.svc.confirm(scope, { ...base, expectedAPagarCents: { IRPJ: '0', CSLL: '0' } })).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('verificarCadeia (F-TA-3 a + decisão L-A do dono)', () => {
  const ativos = ['T01', 'T02', 'T03', 'T04'] as const;
  const dupla = (periodo: string, iso: string) => [row({ periodo, confirmedAt: at(iso) }), row({ periodo, tributo: 'CSLL', confirmedAt: at(iso) })];

  it('T01 não exige anterior; T03 sem T02 ⇒ faltante', () => {
    expect(verificarCadeia([], 'T01', [...ativos])).toEqual({ faltantes: [], obsoletos: [] });
    expect(verificarCadeia(dupla('T01', '2026-04-01T00:00:00Z'), 'T03', [...ativos]).faltantes).toEqual(['T02']);
  });

  it('T01 substituído depois do T02 ⇒ T02 e T03 obsoletos (cascata) para apurar o T04', () => {
    const c = [...dupla('T01', '2026-08-01T00:00:00Z'), ...dupla('T02', '2026-07-01T00:00:00Z'), ...dupla('T03', '2026-07-15T00:00:00Z')];
    expect(verificarCadeia(c, 'T04', [...ativos])).toEqual({ faltantes: [], obsoletos: ['T02', 'T03'] });
    // substituir o próprio T02 é permitido: o T01 (seu único anterior) está são
    expect(verificarCadeia(c, 'T02', [...ativos])).toEqual({ faltantes: [], obsoletos: [] });
  });

  it('início de atividade em maio: T01 não é exigido para apurar o T03', () => {
    expect(verificarCadeia(dupla('T02', '2026-07-01T00:00:00Z'), 'T03', ['T02', 'T03', 'T04'])).toEqual({ faltantes: [], obsoletos: [] });
  });
});

describe('provisaoPendente (decisão L-C do dono)', () => {
  it('CONFIRMED ∧ devido > 0 ∧ sem lançamento; devido 0 ou SUPERSEDED não ficam pendentes', () => {
    expect(provisaoPendente({ status: 'CONFIRMED', devidoCents: 1n, provisaoEntryId: null })).toBe(true);
    expect(provisaoPendente({ status: 'CONFIRMED', devidoCents: 0n, provisaoEntryId: null })).toBe(false);
    expect(provisaoPendente({ status: 'CONFIRMED', devidoCents: 1n, provisaoEntryId: 'e1' })).toBe(false);
    expect(provisaoPendente({ status: 'SUPERSEDED', devidoCents: 1n, provisaoEntryId: null })).toBe(false);
  });
});
