/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, PR-2, BRIEF item 14; F-OBP-5 c; F-XP-6 a) — aviso de grande porte.
 * Oráculo: Lei 11.638/2007 art. 3º p.ú. — ativo total > R$ 240.000.000,00 OU receita bruta anual > R$ 300.000.000,00,
 * no exercício ANTERIOR. Os relatórios são falsos (o cálculo de BP/DRE é do AccountingReportService, testado lá).
 */
import { CompanyFiscalProfileService } from '../CompanyFiscalProfileService';
import type { AccountingReportService } from '../AccountingReportService';
import type { AccountingScope } from '../../scope/AccountingScope';

const scope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' } as AccountingScope;

function build(ativoCents: number, receitaCents: number, status: 'OK' | 'WARNING' | 'INVALID' = 'OK') {
  const balanceSheet = jest.fn(async () => ({ reportStatus: status, assets: { totalCents: String(ativoCents), accounts: [] } }));
  const incomeStatement = jest.fn(async () => ({ reportStatus: status, grossRevenue: { totalCents: String(-receitaCents), accounts: [] } }));
  const report = { balanceSheet, incomeStatement } as unknown as AccountingReportService;
  const svc = new CompanyFiscalProfileService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never, report);
  return { svc, balanceSheet, incomeStatement };
}

const LIMITE_ATIVO = 240_000_000_00;
const LIMITE_RECEITA = 300_000_000_00;

describe('avisoGrandePorte (item 14)', () => {
  it('lê BP e DRE no FIM do exercício anterior (31/12 de N-1), não do ano gerado', async () => {
    const { svc, balanceSheet, incomeStatement } = build(0, 0);
    await svc.avisoGrandePorte(scope, 2026);
    const esperado = new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 999));
    expect(balanceSheet).toHaveBeenCalledWith(scope, esperado);
    expect(incomeStatement).toHaveBeenCalledWith(scope, esperado);
  });

  it('exatamente no limite não avisa ("superior a" — Lei 11.638 art. 3º p.ú.)', async () => {
    expect(await build(LIMITE_ATIVO, LIMITE_RECEITA).svc.avisoGrandePorte(scope, 2026)).toBeNull();
  });

  it('ativo 1 centavo acima → avisa; receita 1 centavo acima (sinal credor da DRE) → avisa', async () => {
    expect(await build(LIMITE_ATIVO + 1, 0).svc.avisoGrandePorte(scope, 2026)).toMatch(/grande porte provável em 2025.*11\.638/);
    expect(await build(0, LIMITE_RECEITA + 1).svc.avisoGrandePorte(scope, 2026)).toMatch(/receita bruta/);
  });

  it('relatório INVALID (mapeamento ausente/incompleto) → sem aviso, mesmo com números altos', async () => {
    expect(await build(LIMITE_ATIVO * 10, LIMITE_RECEITA * 10, 'INVALID').svc.avisoGrandePorte(scope, 2026)).toBeNull();
  });
});
