import { isDeepStrictEqual } from 'util';
import type { EventBinding } from '../../accountingBinding/dtos/AccountingBindingDto';
import type { SectorKitV1 } from '../dtos/SectorKitDto';
import type { KitDiff } from '../dtos/KitUpgradeDto';
import type { KitRegime } from './kitInstallPorts';
import { applyRoleOverrides } from './applyRoleOverrides';

/** Uma conta do tenant por código (o @@unique de `Account` é por código, viva ou apagada). */
export interface TenantAccount {
  code: string;
  name: string;
  nature: string;
  acceptsEntries: boolean;
  deleted: boolean;
  hasPostings: boolean;
}

export type RoleDefaultGroup = 'scopeSettings' | 'fiscalProfile';

/**
 * Estado real do tenant que o diff compara (item 26). Os campos de conta-padrão usam o nome do kit
 * (`xxxAccountCode`) com o CÓDIGO da conta do tenant, ou `null` se o campo está vazio.
 */
export interface TenantKitState {
  accounts: Record<string, TenantAccount>;
  /** `eventBindings` do binding `Active` do setor (o que lança hoje), ou `null` sem Active. */
  activeEventBindings: EventBinding[] | null;
  /** Ajustes vivos do PR-3: papel → código da conta. */
  overrides: Record<string, string>;
  scopeSettings: Record<string, string | null>;
  /** `null` = a unidade não tem `FiscalProfile`. */
  fiscalProfile: Record<string, string | null> | null;
  /** versão (ano) → código da conta → código referencial. */
  referential: Record<string, Record<string, string>>;
  /** Item 31: ano com `ecfRecibo` ou com período `HARD_CLOSED`. */
  frozenYears: string[];
  /** Emenda E-12.5: regime da empresa no ano (CompanyFiscalProfile; sem ele, o da unidade), por ano do kit. */
  regimeByYear: Record<string, KitRegime | null>;
}

// Formas dos valores que o diff carrega (o aplicar e o aceitar leem estas formas).
export interface AccountItemValue { code: string; name: string; nature: string; acceptsEntries: boolean }
export interface RoleDefaultItemValue { group: RoleDefaultGroup; field: string; accountCode: string }
export interface ReferentialItemValue { mappingVersion: string; accountCode: string; referentialCode: string; label: string }
export interface OverrideItemValue { role: string; accountCode: string }

const accountKey = (code: string) => `account:${code}`;
const roleDefaultKey = (group: RoleDefaultGroup, field: string) => `roleDefault:${group}.${field}`;
const referentialKey = (version: string, code: string) => `referential:${version}:${code}`;
const bindingKey = (eventKey: string) => `binding:${eventKey}`;
const roleKey = (role: string) => `role:${role}`;

/** O código que o kit dá a cada papel (o primeiro `roleSlot`; os kits publicados usam um código por papel). */
function codeByRole(kit: SectorKitV1): Map<string, string> {
  const out = new Map<string, string>();
  for (const eb of kit.binding.eventBindings) for (const r of eb.roleSlots) if (!out.has(r.role)) out.set(r.role, r.accountCode);
  return out;
}

/**
 * `classifyKitDiff(target, installed, tenant)` — BE-INCR-KIT-SETOR PR-4, item 26. PURA, sem I/O.
 *
 * Compara o ALVO com o ESTADO REAL do tenant (F-KB-8 → a, como o `account_chart_update` da OCA); a versão
 * instalada só diz "isto veio do kit ou foi criado pelo usuário" (conta da extensão) e "o kit mudou a conta deste
 * papel" (override). Cada item cai em exatamente uma classe (itemKey único entre as três) — teste de propriedade.
 * Nada é removido: o que sumiu do alvo vira `notices` (item 30).
 */
export function classifyKitDiff(target: SectorKitV1, installed: SectorKitV1, tenant: TenantKitState): KitDiff {
  const additive: KitDiff['additive'] = [];
  const forward: KitDiff['forward'] = [];
  const conflicts = new Map<string, KitDiff['conflict'][number]>();
  const notices: KitDiff['notices'] = [];
  const conflict = (c: KitDiff['conflict'][number]) => {
    if (!conflicts.has(c.itemKey)) conflicts.set(c.itemKey, c);
  };

  /** Conta da extensão como a versão instalada a definiu — "veio do kit e o tenant não mexeu" = igual a esta. */
  const installedExtension = new Map(installed.chartExtension.map((a) => [a.code, a]));
  /** Códigos que o próprio diff cria (nível a) — contam como vivos para o resto do diff. */
  const created = new Set<string>();

  // --- Plano: extensão (itens 27, 28 [E-12.2], 29) ---------------------------------------------------------------
  for (const acc of target.chartExtension) {
    const t = tenant.accounts[acc.code];
    if (!t) {
      additive.push({ kind: 'account', itemKey: accountKey(acc.code), value: { ...acc } satisfies AccountItemValue });
      created.add(acc.code);
      continue;
    }
    if (t.deleted) {
      conflict({ reason: 'account_deleted_by_user', itemKey: accountKey(acc.code), kitValue: { ...acc }, tenantValue: { code: acc.code, deleted: true } });
      continue;
    }
    const nameDiffers = t.name !== acc.name;
    const natureDiffers = t.nature !== acc.nature;
    if (!nameDiffers && !natureDiffers) continue;
    if (t.hasPostings) {
      // Natureza com partida nunca muda; o nome vira pendência (item 29).
      if (nameDiffers) {
        conflict({
          reason: 'account_changed_in_use',
          itemKey: accountKey(acc.code),
          kitValue: { code: acc.code, name: acc.name, nature: acc.nature },
          tenantValue: { code: acc.code, name: t.name, nature: t.nature },
        });
      } else {
        notices.push({ itemKey: accountKey(acc.code), message: `A conta ${acc.code} tem partida: a natureza ${t.nature} não muda para ${acc.nature}.` });
      }
    } else if (installedExtension.get(acc.code)?.name === t.name && installedExtension.get(acc.code)?.nature === t.nature) {
      // Veio do kit e segue como o kit instalou: o alvo muda nome/natureza (E-12.2).
      forward.push({
        kind: 'changed_account',
        itemKey: accountKey(acc.code),
        before: { code: acc.code, name: t.name, nature: t.nature },
        after: { code: acc.code, name: acc.name, nature: acc.nature },
      });
    } else {
      // Criada ou editada pelo tenant: o kit não sobrescreve conta existente (referência Odoo, BRIEF §0).
      notices.push({ itemKey: accountKey(acc.code), message: `A conta ${acc.code} foi criada ou editada pelo tenant e difere do kit; fica como está.` });
    }
  }

  const isLive = (code: string) => created.has(code) || (tenant.accounts[code] !== undefined && !tenant.accounts[code].deleted);
  /** Conta que o alvo usa e o tenant apagou ⇒ pendência; devolve `true` se o código pode ser usado. */
  const usable = (code: string, use: string): boolean => {
    if (isLive(code)) return true;
    const t = tenant.accounts[code];
    if (t?.deleted) conflict({ reason: 'account_deleted_by_user', itemKey: accountKey(code), kitValue: { code }, tenantValue: { code, deleted: true } });
    else notices.push({ itemKey: accountKey(code), message: `A conta ${code} (${use}) não existe no plano da unidade.` });
    return false;
  };

  // --- Contas-padrão (itens 27, 29; item 36: campo preenchido nunca é sobrescrito) --------------------------------
  for (const group of ['scopeSettings', 'fiscalProfile'] as const) {
    const fields = Object.entries(target.roleDefaults[group]).filter((e): e is [string, string] => typeof e[1] === 'string');
    if (fields.length === 0) continue;
    const tenantGroup = group === 'scopeSettings' ? tenant.scopeSettings : tenant.fiscalProfile;
    if (tenantGroup === null) {
      notices.push({ itemKey: `roleDefault:${group}`, message: 'A unidade não tem perfil fiscal: as contas-padrão do perfil entram quando ele existir.' });
      continue;
    }
    for (const [field, code] of fields) {
      const current = tenantGroup[field] ?? null;
      const itemKey = roleDefaultKey(group, field);
      if (current === code) continue;
      if (current !== null) {
        conflict({ reason: 'field_set_by_user', itemKey, kitValue: { group, field, accountCode: code }, tenantValue: { group, field, accountCode: current } });
        continue;
      }
      if (!usable(code, `${group}.${field}`)) continue;
      additive.push({ kind: 'roleDefault', itemKey, value: { group, field, accountCode: code } satisfies RoleDefaultItemValue });
    }
  }

  // --- Referencial por (regime, ano) — emenda E-12.5; item 31 (ano congelado) --------------------------------------
  const yearsWithoutRegime = new Set<string>();
  for (const block of target.referential) {
    const year = block.mappingVersion;
    const regime = tenant.regimeByYear[year] ?? null;
    if (regime === null) {
      if (!yearsWithoutRegime.has(year)) {
        yearsWithoutRegime.add(year);
        notices.push({ itemKey: `referential:${year}`, message: `Sem regime conhecido em ${year}: o referencial desse ano não foi comparado.` });
      }
      continue;
    }
    if (regime !== block.regime) continue;
    const frozen = tenant.frozenYears.includes(year);
    for (const entry of block.entries) {
      if (!usable(entry.accountCode, `referencial ${year}`)) continue;
      const itemKey = referentialKey(year, entry.accountCode);
      const value: ReferentialItemValue = { mappingVersion: year, accountCode: entry.accountCode, referentialCode: entry.referentialCode, label: entry.label };
      const current = tenant.referential[year]?.[entry.accountCode] ?? null;
      if (current === entry.referentialCode) continue;
      if (frozen) {
        conflict({ reason: 'referential_year_frozen', itemKey, kitValue: value, tenantValue: current });
      } else if (current === null) {
        additive.push({ kind: 'referential', itemKey, value });
      } else {
        conflict({ reason: 'referential_mapped_differently', itemKey, kitValue: value, tenantValue: current });
      }
    }
  }

  // --- Binding (item 28 e override do item 29) ----------------------------------------------------------------------
  const installedCodes = codeByRole(installed);
  const targetCodes = codeByRole(target);
  for (const [role, overrideCode] of Object.entries(tenant.overrides)) {
    const kitNow = targetCodes.get(role);
    if (kitNow === undefined) {
      notices.push({ itemKey: roleKey(role), message: `O kit não usa mais o papel '${role}'; o ajuste fica como está.` });
    } else if (installedCodes.get(role) !== kitNow) {
      conflict({
        reason: 'override',
        itemKey: roleKey(role),
        kitValue: { role, accountCode: kitNow } satisfies OverrideItemValue,
        tenantValue: { role, accountCode: overrideCode } satisfies OverrideItemValue,
      });
    }
  }
  const overrideList = Object.entries(tenant.overrides).map(([role, accountCode]) => ({ role, accountCode }));
  const effective = applyRoleOverrides(target.binding.eventBindings, overrideList).eventBindings;
  const activeByKey = new Map((tenant.activeEventBindings ?? []).map((eb) => [eb.eventKey, eb]));
  for (const eb of effective) {
    for (const slot of eb.roleSlots) if (!tenant.overrides[slot.role]) usable(slot.accountCode, `papel ${slot.role}`);
    const active = activeByKey.get(eb.eventKey);
    if (!active) {
      forward.push({ kind: 'new_binding', itemKey: bindingKey(eb.eventKey), eventKey: eb.eventKey, before: null, after: eb });
    } else if (!isDeepStrictEqual(active, eb)) {
      forward.push({ kind: 'changed_binding', itemKey: bindingKey(eb.eventKey), eventKey: eb.eventKey, before: active, after: eb });
    }
  }

  // --- O que sumiu do alvo (item 30) e o catálogo de serviços (emenda E-12.1) ---------------------------------------
  const targetExt = new Set(target.chartExtension.map((a) => a.code));
  for (const a of installed.chartExtension) {
    if (!targetExt.has(a.code)) notices.push({ itemKey: accountKey(a.code), message: `O kit não usa mais a conta ${a.code}; ela fica no plano.` });
  }
  const targetEvents = new Set(target.binding.eventBindings.map((eb) => eb.eventKey));
  for (const eb of installed.binding.eventBindings) {
    if (!targetEvents.has(eb.eventKey)) notices.push({ itemKey: bindingKey(eb.eventKey), message: `O kit não vincula mais o evento '${eb.eventKey}'; o binding ativo segue igual.` });
  }
  for (const group of ['scopeSettings', 'fiscalProfile'] as const) {
    for (const field of Object.keys(installed.roleDefaults[group])) {
      if (!(field in target.roleDefaults[group])) notices.push({ itemKey: roleDefaultKey(group, field), message: `O kit não traz mais a conta-padrão ${group}.${field}; o campo fica como está.` });
    }
  }
  const targetRef = new Set(target.referential.flatMap((b) => b.entries.map((e) => `${b.regime}:${b.mappingVersion}:${e.accountCode}`)));
  for (const b of installed.referential) {
    for (const e of b.entries) {
      if (!targetRef.has(`${b.regime}:${b.mappingVersion}:${e.accountCode}`)) {
        notices.push({ itemKey: referentialKey(b.mappingVersion, e.accountCode), message: `O kit não mapeia mais ${e.accountCode} em ${b.mappingVersion} (${b.regime}); o mapeamento fica.` });
      }
    }
  }
  const installedCatalog = new Map(installed.serviceFiscalDefaults.map((i) => [i.key, i]));
  const targetCatalog = new Map(target.serviceFiscalDefaults.map((i) => [i.key, i]));
  for (const [key, item] of targetCatalog) {
    const before = installedCatalog.get(key);
    if (!before) notices.push({ itemKey: `catalog:${key}`, message: `Sugestão fiscal nova no catálogo: ${item.label} (${item.cTribNac}).` });
    else if (!isDeepStrictEqual(before, item)) notices.push({ itemKey: `catalog:${key}`, message: `Sugestão fiscal alterada no catálogo: ${item.label} (${item.cTribNac}).` });
  }
  for (const [key, item] of installedCatalog) {
    if (!targetCatalog.has(key)) notices.push({ itemKey: `catalog:${key}`, message: `Sugestão fiscal saiu do catálogo: ${item.label}.` });
  }

  const byKey = <T extends { itemKey: string }>(a: T, b: T) => a.itemKey.localeCompare(b.itemKey);
  return {
    additive: additive.sort(byKey),
    forward: forward.sort(byKey),
    conflict: [...conflicts.values()].sort(byKey),
    notices: notices.sort(byKey),
  };
}
