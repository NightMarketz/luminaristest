/**
 * BE-INCR-WIZARD-REMOVABILITY (nó W2) — itens 1, 2 e 3 do BRIEF, sobre os presets REAIS
 * (`docs/accounting/BE-INCR-WIZARD-REMOVABILITY-brief.md`; F-W2-1 → dinâmica, F-W2-2 → travar).
 */
import BeautySalonPreset from '../systems/BeautySalonPreset';
import AestheticClinicPreset from '../systems/AestheticClinicPreset';
import CrmModulePreset from '../systems/CrmModulePreset';
import { assertRemovalsAllowed, computeTableLocks, type TableLock } from '../removability';
import type { PresetSuite, PresetTableDefinition } from '..';
import { composeSuiteDefaultTables } from '../modules/moduleSelection';

beforeEach(() => jest.clearAllMocks());

// BE-INCR-MODULOS-BASE-SUBMODULOS PR-2: customers/sales/saleItems/packages… viraram tabelas de módulo; o conjunto que a
// suíte instala é módulos default (com fonte/trava da suíte) ∪ tabelas soltas.
const tables = (p: Pick<PresetSuite, 'tables' | 'modules' | 'moduleOverrides' | 'lockedModuleTables'>) => composeSuiteDefaultTables(p);
const all = (t: Record<string, PresetTableDefinition>) => new Set(Object.keys(t));
const without = (t: Record<string, PresetTableDefinition>, ...gone: string[]) =>
  new Set(Object.keys(t).filter((k) => !gone.includes(k)));
const reasonOf = (locks: Record<string, TableLock | null>, key: string) => locks[key]?.reason ?? null;

describe('item 1 — computeTableLocks', () => {
  it('(i) salão completo: trava contábil, de relação e de capacidade; o resto fica livre', () => {
    const t = tables(BeautySalonPreset);
    const locks = computeTableLocks(t, all(t));
    for (const k of ['sales', 'saleItems', 'customers', 'packages']) expect(reasonOf(locks, k)).toBe('ACCOUNTING');
    expect(locks.products).toEqual({ reason: 'REQUIRED_RELATION', by: ['productUnits', 'stockMovements'] });
    expect(locks.services).toEqual({ reason: 'REQUIRED_RELATION', by: ['appointments'] });
    expect(locks.productUnits).toEqual({ reason: 'REQUIRED_CAPABILITY', by: ['stockMovements'] });
    const livres = ['suppliers', 'goals', 'reports', 'campaigns', 'expenses', 'otherRevenues', 'financialBaselines',
      'commissions', 'appointments', 'stockMovements'];
    for (const k of livres) expect(locks[k]).toBeNull();
    // PR-2: o conjunto composto inclui os módulos default do CRM (17 tabelas do salão + 5 de CRM-0/CRM-1).
    for (const k of ['leadPipelines', 'leadStages', 'leads', 'leadActivities']) expect(locks[k]).toEqual({ reason: 'FIXED_MODULE', by: ['CRM-0'] });
    expect(locks.leadProposals).toBeNull();
    expect(Object.keys(locks)).toHaveLength(22);
  });

  it('(ii) crmModule: as 4 tabelas do CRM-0 travam como módulo fixo; os módulos de uma tabela ficam livres', () => {
    const t = tables(CrmModulePreset);
    const locks = computeTableLocks(t, all(t));
    for (const k of ['leadPipelines', 'leadStages', 'leads', 'leadActivities']) {
      expect(locks[k]).toEqual({ reason: 'FIXED_MODULE', by: ['CRM-0'] });
    }
    for (const k of ['leadProposals', 'crmAccounts', 'crmContacts', 'crmOpportunities']) expect(locks[k]).toBeNull();
  });

  it('(iii) pura: não muta as definições recebidas', () => {
    const t = tables(BeautySalonPreset);
    const antes = JSON.stringify(t);
    computeTableLocks(t, without(t, 'stockMovements'));
    expect(JSON.stringify(t)).toBe(antes);
  });

  it('só as tabelas mantidas recebem entrada', () => {
    const t = tables(BeautySalonPreset);
    expect(Object.keys(computeTableLocks(t, without(t, 'goals')))).not.toContain('goals');
  });
});

describe('item 2 — a trava é dinâmica (F-W2-1)', () => {
  it('tirar stockMovements libera productUnits; tirar productUnits libera products; services segue travado', () => {
    const t = tables(BeautySalonPreset);
    expect(reasonOf(computeTableLocks(t, all(t)), 'products')).toBe('REQUIRED_RELATION');

    const passo1 = computeTableLocks(t, without(t, 'stockMovements'));
    expect(passo1.productUnits).toBeNull();
    expect(passo1.products).toEqual({ reason: 'REQUIRED_RELATION', by: ['productUnits'] });

    const passo2 = computeTableLocks(t, without(t, 'stockMovements', 'productUnits'));
    expect(passo2.products).toBeNull();
    expect(reasonOf(passo2, 'services')).toBe('REQUIRED_RELATION');
  });
});

describe('item 3 — marcação contábil nas suítes (F-W2-2)', () => {
  const marcadas = (p: Pick<PresetSuite, 'tables' | 'modules' | 'moduleOverrides' | 'lockedModuleTables'>) =>
    Object.entries(tables(p)).filter(([, d]) => d.meta?.lockedBy === 'accounting').map(([k]) => k).sort();

  it('salão e clínica marcam exatamente sales, saleItems, customers e packages; crmModule não marca nada', () => {
    const esperado = ['customers', 'packages', 'saleItems', 'sales'];
    expect(marcadas(BeautySalonPreset)).toEqual(esperado);
    expect(marcadas(AestheticClinicPreset)).toEqual(esperado);
    expect(marcadas(CrmModulePreset)).toEqual([]);
  });

  it('a marcação preserva a meta do módulo (sales segue exigindo saleItems)', () => {
    expect(tables(BeautySalonPreset).sales.meta).toEqual({ requiresTables: ['saleItems'], lockedBy: 'accounting' });
  });
});

describe('item 7 (regra pura) — assertRemovalsAllowed', () => {
  const t = tables(BeautySalonPreset);
  const erro = (removed: string[]) => {
    try {
      assertRemovalsAllowed(t, removed);
      return null;
    } catch (e) {
      return (e as { details?: unknown }).details;
    }
  };

  it('remover alvo travado sozinho → TABLE_LOCKED com a trava nomeada', () => {
    expect(erro(['products'])).toEqual({
      reason: 'TABLE_LOCKED',
      table: 'products',
      lock: { reason: 'REQUIRED_RELATION', by: ['productUnits', 'stockMovements'] },
    });
    expect(erro(['sales'])).toMatchObject({ table: 'sales', lock: { reason: 'ACCOUNTING' } });
  });

  it('remover dependente e alvo juntos passa (conjunto final)', () => {
    expect(erro(['stockMovements', 'productUnits', 'products'])).toBeNull();
    expect(erro(['goals', 'suppliers'])).toBeNull();
  });

  it('PR-2: tabela de PESSOAS/VENDAS segue travada como quando era tabela da suíte (contábil e relação obrigatória)', () => {
    for (const k of ['customers', 'saleItems', 'packages']) {
      expect(erro([k])).toEqual({ reason: 'TABLE_LOCKED', table: k, lock: { reason: 'ACCOUNTING' } });
    }
    expect(erro(['services'])).toEqual({
      reason: 'TABLE_LOCKED', table: 'services', lock: { reason: 'REQUIRED_RELATION', by: ['appointments'] },
    });
    expect(erro(['commissions'])).toBeNull();
    expect(erro(['suppliers'])).toBeNull();
  });

  it('chave fora das tabelas (Core no create) e tabela de módulo fixo sem trava contábil ficam de fora', () => {
    expect(erro(['units', 'naoExiste'])).toBeNull();
    const crm = tables(CrmModulePreset);
    expect(() => assertRemovalsAllowed(crm, ['leadPipelines', 'leadStages', 'leads', 'leadActivities'])).not.toThrow();
  });
});
