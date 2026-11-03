/**
 * BE-INCR-KIT-SETOR PR-4 — contrato da atualização do kit (§3.3 diff/relatório; §3.4 rotas; emenda §12).
 */
import {
  DecideKitPendingRequestSchema,
  KitDiffSchema,
  KitInstallationViewSchema,
  KitUpgradeReportSchema,
  ListKitPendingQuerySchema,
  UpgradeUnitInputSchema,
} from '@/features/sectorKits/dtos/KitUpgradeDto';
import { CONFLICT_REASONS } from '@/features/sectorKits/models/kitUpgradeTypes';

const diff = {
  additive: [{ kind: 'account', itemKey: 'account:2.1.3', value: { code: '2.1.3' } }],
  forward: [{ kind: 'changed_binding', itemKey: 'binding:sale.cogs', eventKey: 'sale.cogs', before: {}, after: {} }],
  conflict: [{ reason: 'override', itemKey: 'role:receita-serviço', kitValue: {}, tenantValue: {} }],
  notices: [{ itemKey: 'catalog:manicure', message: 'nova' }],
};

describe('KitUpgradeDto', () => {
  it('diff: as 3 classes e os avisos; classe/motivo fora da lista recusados', () => {
    expect(KitDiffSchema.safeParse(diff).success).toBe(true);
    expect(KitDiffSchema.safeParse({ ...diff, additive: [{ kind: 'serviceFiscalDefault', itemKey: 'x', value: 1 }] }).success).toBe(false);
    expect(KitDiffSchema.safeParse({ ...diff, conflict: [{ ...diff.conflict[0], reason: 'service_profile_edited' }] }).success).toBe(false); // E-12.1
  });

  it('motivos de conflito: os 6 do item 29 sem service_profile_edited (E-12.1)', () => {
    expect([...CONFLICT_REASONS].sort()).toEqual(
      ['account_changed_in_use', 'account_deleted_by_user', 'field_set_by_user', 'override', 'referential_mapped_differently', 'referential_year_frozen'].sort(),
    );
  });

  it('relatório = diff + resultado por item', () => {
    expect(KitUpgradeReportSchema.safeParse({ ...diff, results: [{ itemKey: 'account:2.1.3', outcome: 'applied' }], bindingVersionAfter: 3 }).success).toBe(true);
    expect(KitUpgradeReportSchema.safeParse({ ...diff, results: [{ itemKey: 'x', outcome: 'talvez' }] }).success).toBe(false);
  });

  it('entrada do upgrade: modo e deploy obrigatórios (strict)', () => {
    expect(UpgradeUnitInputSchema.safeParse({ mode: 'APPLY', deployId: 'd1', actor: 'deploy-cli' }).success).toBe(true);
    expect(UpgradeUnitInputSchema.safeParse({ mode: 'APPLY', actor: 'deploy-cli' }).success).toBe(false);
    expect(UpgradeUnitInputSchema.safeParse({ mode: 'FORCE', deployId: 'd1', actor: 'x' }).success).toBe(false);
  });

  it('decidir pendência: unitId + motivo 10–500 (strict)', () => {
    expect(DecideKitPendingRequestSchema.safeParse({ unitId: 'u', motivo: 'x'.repeat(10) }).success).toBe(true);
    expect(DecideKitPendingRequestSchema.safeParse({ unitId: 'u', motivo: 'x'.repeat(9) }).success).toBe(false);
    expect(DecideKitPendingRequestSchema.safeParse({ unitId: 'u', motivo: 'x'.repeat(501) }).success).toBe(false);
    expect(DecideKitPendingRequestSchema.safeParse({ unitId: 'u', motivo: 'x'.repeat(10), status: 'ACCEPTED' }).success).toBe(false);
    expect(ListKitPendingQuerySchema.safeParse({ unitId: 'u', status: 'OPEN' }).success).toBe(true);
    expect(ListKitPendingQuerySchema.safeParse({ unitId: 'u', status: 'TALVEZ' }).success).toBe(false);
  });

  it('view da instalação (item 38)', () => {
    const view = { kitKey: 'beautySalon', kitVersion: 1, latestVersion: 4, status: 'INSTALLED', lastRun: null, openPendingCount: 0, changelog: [{ kitVersion: 2, entries: ['v2'] }], steps: { lastCompletedStep: 7, warnings: [] } };
    expect(KitInstallationViewSchema.safeParse(view).success).toBe(true);
    expect(KitInstallationViewSchema.safeParse({ ...view, openPendingCount: -1 }).success).toBe(false);
    // EMENDA-2 da LAC-B, item 0: `steps` obrigatório, passo 0–7, só os avisos conhecidos
    const { steps: _steps, ...semSteps } = view;
    expect(KitInstallationViewSchema.safeParse(semSteps).success).toBe(false);
    expect(KitInstallationViewSchema.safeParse({ ...view, steps: { lastCompletedStep: 8, warnings: [] } }).success).toBe(false);
    expect(KitInstallationViewSchema.safeParse({ ...view, steps: { lastCompletedStep: 6, warnings: ['KIT_REFERENTIAL_SKIPPED_NO_REGIME'] } }).success).toBe(true);
    expect(KitInstallationViewSchema.safeParse({ ...view, steps: { lastCompletedStep: 6, warnings: ['OUTRO'] } }).success).toBe(false);
  });
});
