import { z } from 'zod';
import { AccountingBindingV1Schema } from '../../accountingBinding/dtos/AccountingBindingDto';
import { CANONICAL_ACCOUNTS } from '../../accounting/fixtures/ChartOfAccountsFixture';

/**
 * Contrato do kit de setor — `SectorKitV1` (BE-INCR-KIT-SETOR, PR-1, itens 1–2; BRIEF §3.1).
 *
 * O kit é código versionado: plano por extensão, binding, padrões fiscais e referencial de um setor.
 * Ele importa do núcleo só o plano canônico (`CANONICAL_ACCOUNTS`), para os refinamentos abaixo —
 * allowlist própria do `sectorKits`, decidida pelo dono em 08/10
 * (`docs/plano/decisoes/D-2026-10-08-KIT-SETOR-FORKS-KB6-KB9.md`).
 */

/** Conta do plano — mesmo shape de `CanonicalAccount` (`ChartOfAccountsFixture.ts`). */
export const CanonicalAccountSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    nature: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
    acceptsEntries: z.boolean(),
  })
  .strict();

const RoleDefaultsSchema = z
  .object({
    // F13 (ii) — só preenche campo nulo
    scopeSettings: z
      .object({
        bankChargeExpenseAccountCode: z.string().optional(),
        bankChargeIncomeAccountCode: z.string().optional(),
        depreciationExpenseAccountCode: z.string().optional(),
        disposalGainAccountCode: z.string().optional(),
        disposalLossAccountCode: z.string().optional(),
      })
      .strict()
      .default({}),
    // F13 (iii) — só preenche campo nulo
    fiscalProfile: z
      .object({
        icmsRecuperavelAccountCode: z.string().optional(),
        pisCofinsRecuperavelAccountCode: z.string().optional(),
        insumoExpenseAccountCode: z.string().optional(),
        irpjDespesaAccountCode: z.string().optional(),
        csllDespesaAccountCode: z.string().optional(),
        irpjRecolherAccountCode: z.string().optional(),
        csllRecolherAccountCode: z.string().optional(),
        pisDespesaAccountCode: z.string().optional(),
        cofinsDespesaAccountCode: z.string().optional(),
        pisRecolherAccountCode: z.string().optional(),
        cofinsRecolherAccountCode: z.string().optional(),
      })
      .strict()
      .default({}),
  })
  .strict();

const ServiceFiscalDefaultSchema = z
  .object({
    serviceRef: z.string().min(1), // chave do serviço no preset do setor
    cTribNac: z.string().regex(/^\d{6}$/, 'cTribNac tem 6 dígitos.'),
    cNBS: z.string().regex(/^\d{9}$/).optional(),
    cIndOp: z.string().regex(/^\d{6}$/).default('030101'),
  })
  .strict();

const ReferentialSchema = z
  .object({
    // F-KS-7a
    regime: z.enum(['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL']),
    mappingVersion: z.string().regex(/^\d{4}$/), // = layoutVersion do catálogo (F14/F15)
    entries: z.array(z.object({ accountCode: z.string(), referentialCode: z.string(), label: z.string() }).strict()),
  })
  .strict();

const SectorKitBaseSchema = z
  .object({
    kitKey: z.string().regex(/^[a-z][A-Za-z0-9]+$/), // = sectorKey (ex.: 'beautySalon')
    kitVersion: z.number().int().min(1),
    label: z.string().min(1).max(80),
    changelog: z.array(z.string().min(1)).min(1),
    chartExtension: z.array(CanonicalAccountSchema), // F-KS-3a: só acrescenta
    binding: AccountingBindingV1Schema, // ADR-P1, inalterado
    operationalSchema: z.record(z.string(), z.unknown()), // chaves = emittableEventKeys (F4)
    roleDefaults: RoleDefaultsSchema.default({ scopeSettings: {}, fiscalProfile: {} }),
    serviceFiscalDefaults: z.array(ServiceFiscalDefaultSchema).default([]),
    referential: z.array(ReferentialSchema).default([]),
  })
  .strict();

type SectorKitBase = z.infer<typeof SectorKitBaseSchema>;

/** Refinamentos do item 2 do BRIEF. */
function kitRefinements(kit: SectorKitBase, ctx: z.RefinementCtx): void {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });

  const canonicalCodes = new Set(CANONICAL_ACCOUNTS.map((a) => a.code));
  const seen = new Set<string>();
  kit.chartExtension.forEach((acc, i) => {
    if (canonicalCodes.has(acc.code)) issue(['chartExtension', i, 'code'], `Conta ${acc.code} já é do plano canônico.`);
    if (seen.has(acc.code)) issue(['chartExtension', i, 'code'], `Conta ${acc.code} repetida na extensão.`);
    seen.add(acc.code);
  });

  const leafByCode = new Map<string, boolean>();
  for (const a of CANONICAL_ACCOUNTS) leafByCode.set(a.code, a.acceptsEntries);
  for (const a of kit.chartExtension) if (!leafByCode.has(a.code)) leafByCode.set(a.code, a.acceptsEntries);

  const checkLeaf = (code: string | undefined, path: (string | number)[]) => {
    if (code === undefined) return;
    const leaf = leafByCode.get(code);
    if (leaf === undefined) issue(path, `Conta ${code} não existe no canônico nem na extensão.`);
    else if (!leaf) issue(path, `Conta ${code} não é folha (não aceita lançamento).`);
  };

  kit.binding.eventBindings.forEach((eb, i) =>
    eb.roleSlots.forEach((rs, j) => checkLeaf(rs.accountCode, ['binding', 'eventBindings', i, 'roleSlots', j, 'accountCode'])),
  );
  for (const group of ['scopeSettings', 'fiscalProfile'] as const) {
    for (const [field, code] of Object.entries(kit.roleDefaults[group])) {
      checkLeaf(code, ['roleDefaults', group, field]);
    }
  }

  const emittable = new Set(Object.keys(kit.operationalSchema));
  const bound = new Set(kit.binding.eventBindings.map((eb) => eb.eventKey));
  kit.binding.eventBindings.forEach((eb, i) => {
    if (!emittable.has(eb.eventKey)) {
      issue(['binding', 'eventBindings', i, 'eventKey'], `Evento ${eb.eventKey} não é emitível pelo schema operacional.`);
    }
  });
  for (const key of emittable) {
    if (!bound.has(key)) issue(['operationalSchema', key], `Evento emitível ${key} sem binding.`);
  }

  kit.referential.forEach((ref, i) =>
    ref.entries.forEach((e, j) => {
      if (!leafByCode.has(e.accountCode)) {
        issue(['referential', i, 'entries', j, 'accountCode'], `Conta ${e.accountCode} não existe no canônico nem na extensão.`);
      }
    }),
  );
}

export const SectorKitV1Schema = SectorKitBaseSchema.superRefine(kitRefinements);
export type SectorKitV1 = z.infer<typeof SectorKitV1Schema>;
