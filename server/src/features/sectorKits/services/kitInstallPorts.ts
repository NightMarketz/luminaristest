import type { Prisma } from 'generated/prisma';
import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { ActivationChartPort } from '../../accountingBinding/services/BindingActivationService';

/**
 * Portas da instalação do kit (BE-INCR-KIT-SETOR, PR-2). O `sectorKits` não importa `features/accounting`
 * (fronteira em `__tests__/importBoundary.test.ts`), então cada serviço contábil chega por porta, com o
 * adaptador real em `lib/factory.ts` fechado sobre o escopo, no molde de `ActivationChartPort`.
 */

export type KitRegime = 'MEI' | 'SIMPLES' | 'PRESUMIDO' | 'REAL';

/** Plano de contas: o canônico (passo 1) + a extensão do kit (passo 2). */
export interface KitChartPort extends ActivationChartPort {
  /**
   * Passo 2: cria a conta se o código não existe. Código já vivo ⇒ `'exists'`. Código só como linha
   * soft-deleted ⇒ `'deleted'` e **não restaura** (a conta foi apagada pelo contador; ao contrário do F12).
   */
  createAccountIfAbsent(account: {
    code: string;
    name: string;
    nature: string;
    acceptsEntries: boolean;
  }): Promise<'created' | 'exists' | 'deleted'>;
  /** Id da conta VIVA com o código, ou `null` (inexistente ou apagada). */
  findLiveAccountId(code: string): Promise<string | null>;
}

/** Passo 3: contas-padrão por papel em `AccountingScopeSettings` e `FiscalProfile` — só campo nulo. */
export interface KitRoleDefaultsPort {
  hasFiscalProfile(): Promise<boolean>;
  /** Preenche só os campos nulos (cria a linha se não existe, emenda E-5). Devolve os campos gravados. */
  fillNullScopeSettings(accountIds: Record<string, string>): Promise<string[]>;
  /** Preenche só os campos nulos do perfil existente. Sem perfil ⇒ erro (o pré-check já barrou). */
  fillNullFiscalProfile(accountIds: Record<string, string>): Promise<string[]>;
}

/** Passo 6: padrões fiscais por serviço (`ServiceFiscalProfileService`). */
export interface KitServiceFiscalPort {
  hasProfile(serviceRef: string): Promise<boolean>;
  upsert(serviceRef: string, input: { cTribNac: string; cNBS?: string; cIndOp: string }): Promise<void>;
}

/** Passo 7: referencial RFB (`ReferentialMappingService.batchSet` + catálogo). */
export interface KitReferentialPort {
  /** Há `ReferentialAccount` para esta versão? (item 13) */
  catalogLoaded(mappingVersion: string): Promise<boolean>;
  /** Ids das contas que já têm mapeamento nesta versão. */
  mappedAccountIds(mappingVersion: string): Promise<Set<string>>;
  batchSet(mappingVersion: string, items: Array<{ accountId: string; referentialCode: string; label: string }>): Promise<void>;
}

/** Item 12: regime da empresa no ano (`CompanyFiscalProfile.regime`) e, na falta, o da unidade. */
export interface KitRegimePort {
  companyRegime(ano: number): Promise<KitRegime | null>;
  unitRegime(): Promise<KitRegime | null>;
}

/** Auditoria in-tx dos eventos `kit.*` (item 15), no molde de `IBindingAuditPort`. */
export interface IKitAuditPort {
  append(
    tx: Prisma.TransactionClient,
    scope: BindingScope,
    event: { eventType: 'kit.installed' | 'kit.install_failed'; targetId: string; payload: Record<string, unknown> },
  ): Promise<void>;
}
