/**
 * BE-INCR-KIT-SETOR PR-4, item 40 — `classifyKitDiff` (pura): um teste por tipo de (a) e de (b), um por motivo de (c),
 * os avisos do item 30 e do catálogo (E-12.1), e o teste de PROPRIEDADE: para qualquer par de kits e estado gerado,
 * todo item cai em exatamente uma classe, e aplicar (a)+(b) no estado devolve `additive` e `forward` vazios.
 */
import fc from 'fast-check';
import type { EventBinding } from '@/features/accountingBinding/dtos/AccountingBindingDto';
import { CANONICAL_ACCOUNTS_PRE_L8 } from '@/features/accounting/fixtures/ChartOfAccountsFixture';
import type { SectorKitV1 } from '@/features/sectorKits/dtos/SectorKitDto';
import type { KitDiff } from '@/features/sectorKits/dtos/KitUpgradeDto';
import { BEAUTY_SALON_KIT_V1 } from '@/features/sectorKits/kits/beautySalon/kit.v1';
import { BEAUTY_SALON_KIT_V4 } from '@/features/sectorKits/kits/beautySalon/kit.v4';
import { applyRoleOverrides } from '@/features/sectorKits/services/applyRoleOverrides';
import {
  classifyKitDiff,
  type AccountItemValue,
  type ReferentialItemValue,
  type RoleDefaultItemValue,
  type TenantAccount,
  type TenantKitState,
} from '@/features/sectorKits/services/classifyKitDiff';

const V1 = BEAUTY_SALON_KIT_V1;
const V4 = BEAUTY_SALON_KIT_V4;

const conta = (code: string, nature: string, over: Partial<TenantAccount> = {}): TenantAccount => ({
  code,
  name: `Conta ${code}`,
  nature,
  acceptsEntries: true,
  deleted: false,
  hasPostings: false,
  ...over,
});

/** Tenant que instalou o v1 e nunca mexeu: canônico vivo (o de 3 níveis da época, F-L8-9 a), binding Active = o do v1, sem perfil-padrão nem referencial. */
function tenantV1(over: Partial<TenantKitState> = {}): TenantKitState {
  return {
    accounts: Object.fromEntries(CANONICAL_ACCOUNTS_PRE_L8.map((a) => [a.code, { ...a, deleted: false, hasPostings: false }])),
    activeEventBindings: V1.binding.eventBindings,
    overrides: {},
    scopeSettings: {},
    fiscalProfile: {},
    referential: {},
    frozenYears: [],
    regimeByYear: { '2025': 'PRESUMIDO' },
    ...over,
  };
}

const keys = (diff: KitDiff) => ({
  additive: diff.additive.map((i) => i.itemKey),
  forward: diff.forward.map((i) => i.itemKey),
  conflict: diff.conflict.map((i) => `${i.reason}@${i.itemKey}`),
});

/** Um kit derivado com o binding trocando a conta de um papel. */
function withRoleCode(kit: SectorKitV1, role: string, accountCode: string, kitVersion: number): SectorKitV1 {
  return {
    ...kit,
    kitVersion,
    binding: {
      ...kit.binding,
      eventBindings: kit.binding.eventBindings.map((eb) => ({
        ...eb,
        roleSlots: eb.roleSlots.map((r) => (r.role === role ? { ...r, accountCode } : r)),
      })),
    },
  };
}

describe('classifyKitDiff — nível (a), aditivo', () => {
  it('v1 → v4 num tenant intocado: as 8 contas, os 8 campos do perfil e o referencial 2025 do regime, tudo aditivo', () => {
    const diff = classifyKitDiff(V4, V1, tenantV1());
    expect(diff.forward).toEqual([]);
    expect(diff.conflict).toEqual([]);
    const byKind = (k: string) => diff.additive.filter((i) => i.kind === k);
    expect(byKind('account').map((i) => (i.value as AccountItemValue).code)).toEqual(V4.chartExtension.map((a) => a.code).sort());
    expect(byKind('roleDefault').map((i) => (i.value as RoleDefaultItemValue).field).sort()).toEqual(Object.keys(V4.roleDefaults.fiscalProfile).sort());
    const presumido = V4.referential.find((b) => b.regime === 'PRESUMIDO' && b.mappingVersion === '2025')!;
    expect(byKind('referential')).toHaveLength(presumido.entries.length);
    expect(byKind('referential').every((i) => (i.value as ReferentialItemValue).mappingVersion === '2025')).toBe(true);
  });

  it('conta-padrão nula vira aditivo; campo igual ao do kit não aparece', () => {
    const t = tenantV1({ fiscalProfile: { irpjDespesaAccountCode: '4.5.1' } });
    const diff = classifyKitDiff(V4, V1, t);
    expect(keys(diff).additive).not.toContain('roleDefault:fiscalProfile.irpjDespesaAccountCode');
    expect(keys(diff).additive).toContain('roleDefault:fiscalProfile.csllDespesaAccountCode');
  });
});

describe('classifyKitDiff — nível (b), forward', () => {
  it('new_binding: evento que o binding ativo não tem', () => {
    const active = V1.binding.eventBindings.filter((eb) => eb.eventKey !== 'sale.cogs');
    expect(keys(classifyKitDiff(V1, V1, tenantV1({ activeEventBindings: active }))).forward).toEqual(['binding:sale.cogs']);
  });

  it('changed_binding: o kit troca a conta de um papel SEM ajuste', () => {
    const target = withRoleCode(V1, 'estoque', '1.1.5', 2);
    const diff = classifyKitDiff(target, V1, tenantV1());
    expect(diff.forward).toEqual([
      expect.objectContaining({ kind: 'changed_binding', itemKey: 'binding:sale.cogs', eventKey: 'sale.cogs' }),
    ]);
    expect(diff.conflict).toEqual([]);
  });

  it('changed_account (E-12.2): conta da extensão que veio do kit, sem partida, muda de nome', () => {
    const renamed: SectorKitV1 = { ...V4, kitVersion: 5, chartExtension: V4.chartExtension.map((a) => (a.code === '2.1.3' ? { ...a, name: 'IRPJ a pagar' } : a)) };
    const accounts = { ...tenantV1().accounts };
    for (const a of V4.chartExtension) accounts[a.code] = conta(a.code, a.nature, { name: a.name });
    const diff = classifyKitDiff(renamed, V4, tenantV1({ accounts }));
    expect(diff.forward).toEqual([
      expect.objectContaining({ kind: 'changed_account', itemKey: 'account:2.1.3', after: expect.objectContaining({ name: 'IRPJ a pagar' }) }),
    ]);
  });
});

describe('classifyKitDiff — nível (c), um teste por motivo', () => {
  const ext = () => {
    const accounts = { ...tenantV1().accounts };
    for (const a of V4.chartExtension) accounts[a.code] = conta(a.code, a.nature, { name: a.name });
    return accounts;
  };

  it('override: papel com ajuste e o kit mudou a conta daquele papel', () => {
    const target = withRoleCode(V1, 'receita-serviço', '3.3', 2);
    const diff = classifyKitDiff(target, V1, tenantV1({ overrides: { 'receita-serviço': '3.5' } }));
    expect(keys(diff).conflict).toEqual(['override@role:receita-serviço']);
    // o ajuste prevalece: o binding efetivo do alvo é o que já lança (3.5) — nada de forward por esse papel
    expect(diff.forward).toEqual([
      expect.objectContaining({ kind: 'changed_binding', itemKey: 'binding:sale.finalized' }),
    ]);
    expect((diff.forward[0].after as EventBinding).roleSlots.find((r) => r.role === 'receita-serviço')!.accountCode).toBe('3.5');
  });

  it('override sem mudança do kit no papel: não é pendência', () => {
    expect(classifyKitDiff(V4, V1, tenantV1({ overrides: { 'receita-serviço': '3.5' } })).conflict).toEqual([]);
  });

  it('account_deleted_by_user: conta da extensão apagada pelo tenant', () => {
    const accounts = { ...ext(), '2.1.3': conta('2.1.3', 'Liability', { deleted: true }) };
    const diff = classifyKitDiff(V4, V1, tenantV1({ accounts }));
    expect(keys(diff).conflict).toContain('account_deleted_by_user@account:2.1.3');
    // e o campo do perfil que usaria 2.1.3 NÃO vira aditivo
    expect(keys(diff).additive).not.toContain('roleDefault:fiscalProfile.irpjRecolherAccountCode');
  });

  /** v5 = v4 com a conta 2.1.3 mudada pelo KIT (nome e/ou natureza). */
  const v5 = (over: { name?: string; nature?: 'Asset' | 'Liability' }): SectorKitV1 => ({
    ...V4,
    kitVersion: 5,
    chartExtension: V4.chartExtension.map((a) => (a.code === '2.1.3' ? { ...a, ...over } : a)),
  });

  it('account_changed_in_use: o KIT muda o nome de conta com partida (natureza com partida nunca muda)', () => {
    const accounts = { ...ext(), '2.1.3': { ...ext()['2.1.3'], hasPostings: true } };
    const diff = classifyKitDiff(v5({ name: 'IRPJ a pagar' }), V4, tenantV1({ accounts }));
    expect(keys(diff).conflict).toContain('account_changed_in_use@account:2.1.3');
    const d2 = classifyKitDiff(v5({ nature: 'Asset' }), V4, tenantV1({ accounts }));
    expect(keys(d2).conflict).not.toContain('account_changed_in_use@account:2.1.3');
    expect(d2.notices.map((n) => n.itemKey)).toContain('account:2.1.3');
  });

  it('review B2: o TENANT renomeou conta com partida e o kit não mudou ⇒ aviso, nunca pendência', () => {
    const accounts = { ...ext(), '2.1.3': conta('2.1.3', 'Liability', { name: 'Nome do tenant', hasPostings: true }) };
    const diff = classifyKitDiff({ ...V4, kitVersion: 5 }, V4, tenantV1({ accounts }));
    expect(keys(diff).conflict).toEqual([]);
    expect(keys(diff).forward).toEqual([]);
    expect(diff.notices.map((n) => n.itemKey)).toContain('account:2.1.3');
  });

  it('field_set_by_user: campo do perfil já preenchido com outra conta', () => {
    const diff = classifyKitDiff(V4, V1, tenantV1({ fiscalProfile: { irpjDespesaAccountCode: '4.1' } }));
    expect(keys(diff).conflict).toEqual(['field_set_by_user@roleDefault:fiscalProfile.irpjDespesaAccountCode']);
  });

  it('referential_year_frozen: 2025 congelado — nem o mapeamento novo entra sozinho', () => {
    const diff = classifyKitDiff(V4, V1, tenantV1({ frozenYears: ['2025'] }));
    expect(diff.additive.filter((i) => i.kind === 'referential')).toEqual([]);
    expect(diff.conflict.length).toBeGreaterThan(0);
    expect(diff.conflict.every((c) => c.reason === 'referential_year_frozen')).toBe(true);
  });

  it('referential_mapped_differently: conta já mapeada com outro código na mesma versão', () => {
    const diff = classifyKitDiff(V4, V1, tenantV1({ referential: { '2025': { '3.1': '9.99.99.99.99' } } }));
    expect(keys(diff).conflict).toEqual(['referential_mapped_differently@referential:2025:3.1']);
  });
});

describe('classifyKitDiff — avisos', () => {
  it('ano sem regime conhecido: o referencial do ano não é comparado (aviso)', () => {
    const diff = classifyKitDiff(V4, V1, tenantV1({ regimeByYear: {} }));
    expect(diff.additive.filter((i) => i.kind === 'referential')).toEqual([]);
    expect(diff.notices.map((n) => n.itemKey)).toContain('referential:2025');
  });

  it('item 30: o que sumiu do alvo vira aviso, nunca remoção', () => {
    const diff = classifyKitDiff(V1, V4, tenantV1());
    const avisos = diff.notices.map((n) => n.itemKey);
    for (const a of V4.chartExtension) expect(avisos).toContain(`account:${a.code}`);
    expect(avisos).toContain('roleDefault:fiscalProfile.irpjDespesaAccountCode');
    expect(diff.additive).toEqual([]);
  });

  it('E-12.1: catálogo de serviços muda só os avisos', () => {
    const diff = classifyKitDiff(V4, V1, tenantV1());
    expect(diff.notices.filter((n) => n.itemKey.startsWith('catalog:'))).toHaveLength(V4.serviceFiscalDefaults.length);
    expect([...diff.additive, ...diff.forward, ...diff.conflict].some((i) => i.itemKey.startsWith('catalog:'))).toBe(false);
  });

  it('unidade sem perfil fiscal: as contas do perfil viram aviso', () => {
    const diff = classifyKitDiff(V4, V1, tenantV1({ fiscalProfile: null }));
    expect(diff.additive.filter((i) => i.kind === 'roleDefault')).toEqual([]);
    expect(diff.notices.map((n) => n.itemKey)).toContain('roleDefault:fiscalProfile');
  });
});

// --------------------------------------------------------------------------------------------------------------------
// Propriedade (item 40)
// --------------------------------------------------------------------------------------------------------------------

const EXT_POOL = V4.chartExtension;
const FISCAL_FIELDS = Object.keys(V4.roleDefaults.fiscalProfile);
const ROLES = [...new Set(V1.binding.eventBindings.flatMap((eb) => eb.roleSlots.map((r) => r.role)))];
const LEAVES = CANONICAL_ACCOUNTS_PRE_L8.filter((a) => a.acceptsEntries).map((a) => a.code);
const REF_ENTRIES = V4.referential.find((b) => b.regime === 'PRESUMIDO')!.entries;

const subset = <T>(xs: readonly T[]) => fc.subarray([...xs]);

/** Um kit qualquer derivado do v4: subconjunto da extensão (com nome mudado ou não), campos, papéis e referencial. */
const kitArb = (kitVersion: number) =>
  fc
    .record({
      ext: subset(EXT_POOL),
      renamed: subset(EXT_POOL.map((a) => a.code)),
      fields: subset(FISCAL_FIELDS),
      roleCodes: fc.dictionary(fc.constantFrom(...ROLES), fc.constantFrom(...LEAVES), { maxKeys: 3 }),
      ref: subset(REF_ENTRIES),
      dropEvent: fc.option(fc.constantFrom(...V1.binding.eventBindings.map((eb) => eb.eventKey)), { nil: undefined }),
    })
    .map(({ ext, renamed, fields, roleCodes, ref, dropEvent }): SectorKitV1 => {
      let kit: SectorKitV1 = {
        ...V4,
        kitVersion,
        chartExtension: ext.map((a) => (renamed.includes(a.code) ? { ...a, name: `${a.name} (v${kitVersion})` } : a)),
        roleDefaults: { scopeSettings: {}, fiscalProfile: Object.fromEntries(fields.map((f) => [f, V4.roleDefaults.fiscalProfile[f as keyof typeof V4.roleDefaults.fiscalProfile]])) },
        referential: [{ regime: 'PRESUMIDO', mappingVersion: '2025', entries: ref }],
        binding: { ...V4.binding, eventBindings: V4.binding.eventBindings.filter((eb) => eb.eventKey !== dropEvent) },
      };
      for (const [role, code] of Object.entries(roleCodes)) kit = withRoleCode(kit, role, code, kitVersion);
      return kit;
    });

const tenantArb = fc
  .record({
    ext: fc.dictionary(
      fc.constantFrom(...EXT_POOL.map((a) => a.code)),
      fc.record({ deleted: fc.boolean(), hasPostings: fc.boolean(), renamed: fc.boolean(), natureFlip: fc.boolean() }),
    ),
    overrides: fc.dictionary(fc.constantFrom(...ROLES), fc.constantFrom(...LEAVES), { maxKeys: 3 }),
    fiscal: fc.option(fc.dictionary(fc.constantFrom(...FISCAL_FIELDS), fc.option(fc.constantFrom(...LEAVES, ...EXT_POOL.map((a) => a.code)), { nil: null })), { nil: null }),
    ref: fc.dictionary(fc.constantFrom(...REF_ENTRIES.map((e) => e.accountCode)), fc.constantFrom('9.99.99.99.99', ...REF_ENTRIES.map((e) => e.referentialCode))),
    frozen: fc.boolean(),
    regime: fc.constantFrom<'PRESUMIDO' | 'REAL' | null>('PRESUMIDO', 'REAL', null),
    activeFromInstalled: fc.boolean(),
  })
  .map((g): Omit<TenantKitState, 'activeEventBindings'> & { activeFromInstalled: boolean } => {
    const accounts = { ...tenantV1().accounts };
    for (const [code, f] of Object.entries(g.ext)) {
      const a = EXT_POOL.find((x) => x.code === code)!;
      accounts[code] = conta(code, f.natureFlip ? (a.nature === 'Liability' ? 'Asset' : 'Liability') : a.nature, {
        name: f.renamed ? 'Nome do tenant' : a.name,
        deleted: f.deleted,
        hasPostings: f.hasPostings,
      });
    }
    return {
      accounts,
      overrides: g.overrides,
      scopeSettings: {},
      fiscalProfile: g.fiscal,
      referential: { '2025': g.ref },
      frozenYears: g.frozen ? ['2025'] : [],
      regimeByYear: { '2025': g.regime },
      activeFromInstalled: g.activeFromInstalled,
    };
  });

/** Simula o `--apply` de (a)+(b) sobre o estado (o que o serviço faz no banco). */
function applyAB(state: TenantKitState, diff: KitDiff, target: SectorKitV1): TenantKitState {
  const next: TenantKitState = JSON.parse(JSON.stringify(state));
  for (const item of diff.additive) {
    if (item.kind === 'account') {
      const v = item.value as AccountItemValue;
      next.accounts[v.code] = { ...v, deleted: false, hasPostings: false };
    } else if (item.kind === 'roleDefault') {
      const v = item.value as RoleDefaultItemValue;
      (v.group === 'scopeSettings' ? next.scopeSettings : next.fiscalProfile!)[v.field] = v.accountCode;
    } else {
      const v = item.value as ReferentialItemValue;
      (next.referential[v.mappingVersion] ??= {})[v.accountCode] = v.referentialCode;
    }
  }
  for (const item of diff.forward) {
    if (item.kind === 'changed_account') {
      const after = item.after as { code: string; name: string; nature: string };
      next.accounts[after.code] = { ...next.accounts[after.code], name: after.name, nature: after.nature };
    }
  }
  if (diff.forward.some((f) => f.kind !== 'changed_account')) {
    // o forward recompila o alvo inteiro, com os ajustes vivos por cima (item 25)
    next.activeEventBindings = applyRoleOverrides(
      target.binding.eventBindings,
      Object.entries(next.overrides).map(([role, accountCode]) => ({ role, accountCode })),
    ).eventBindings;
  }
  return next;
}

describe('classifyKitDiff — propriedade (item 40)', () => {
  it('todo item cai em exatamente uma classe, e aplicar (a)+(b) converge (additive e forward vazios)', () => {
    fc.assert(
      fc.property(kitArb(2), kitArb(3), tenantArb, (installed, target, g) => {
        const { activeFromInstalled, ...rest } = g;
        const state: TenantKitState = {
          ...rest,
          activeEventBindings: activeFromInstalled
            ? applyRoleOverrides(installed.binding.eventBindings, Object.entries(rest.overrides).map(([role, accountCode]) => ({ role, accountCode }))).eventBindings
            : null,
        };
        const diff = classifyKitDiff(target, installed, state);
        const all = [...diff.additive, ...diff.forward, ...diff.conflict].map((i) => i.itemKey);
        expect(new Set(all).size).toBe(all.length);

        const after = classifyKitDiff(target, target, applyAB(state, diff, target));
        expect(after.additive).toEqual([]);
        expect(after.forward).toEqual([]);
      }),
      { numRuns: 300 },
    );
  });
});
