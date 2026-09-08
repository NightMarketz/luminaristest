import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import { postMultipart } from './multipart';

/**
 * Referential mapping service — typed client over the RFB chart-mapping endpoints
 * (`/api/accounting/referential/*`, BE-INCR-9 / 9B). The owner authors the
 * Account→RFB code de-para that gates SPED ECD generation: `coverage.ready` must
 * be true (no unmapped leaf accounts) before `/sped/ecd/generate` will accept.
 *
 * All logic (versioning, in-tx gate, audit) lives on the backend; this only shapes
 * requests/responses. Mirrors the dataExchange.service envelope pattern.
 */

interface Envelope<T> {
  success: boolean;
  data: T;
}

/** A leaf account that has no referential code in this mapping version (0000 gate). */
export interface UnmappedReferentialAccount {
  accountId: string;
  code: string;
  name: string;
  nature: string;
}

/** Chart-driven coverage diagnostic — shape mirrors INCR-4 reports. */
export interface ReferentialCoverageReport {
  unitId: string;
  mappingVersion: string;
  unmappedAccounts: UnmappedReferentialAccount[];
  totals: {
    leafAccountCount: number;
    mappedCount: number;
    unmappedCount: number;
  };
  /** true when every leaf account carries a referential code (ECD generation gate). */
  ready: boolean;
}

/** Authoring template = coverage().unmappedAccounts re-exposed for fill-in. */
export interface ReferentialAuthoringSkeleton {
  unitId: string;
  mappingVersion: string;
  items: UnmappedReferentialAccount[];
}

/** A persisted Account→RFB mapping row. */
export interface ReferentialMapping {
  id: string;
  accountId: string;
  referentialCode: string;
  label: string;
  mappingVersion: string;
}

/** One item of a batch de-para write (accountId → RFB code + label). */
export interface ReferentialMappingItem {
  accountId: string;
  referentialCode: string;
  label: string;
}

/** Response of `POST /referential/catalog/import` — the official RFB layout catalog. */
export interface ReferentialCatalogImportResult {
  layoutVersion: string;
  totalRows: number;
  imported: number;
  analyticCount: number;
  syntheticCount: number;
}

function qs(unitId: string, version: string): string {
  return `unitId=${encodeURIComponent(unitId)}&version=${encodeURIComponent(version)}`;
}

export const referentialService = {
  /** Coverage diagnostic for a mapping version (unmapped leaf accounts + ready flag). */
  async getCoverage(unitId: string, version: string): Promise<ReferentialCoverageReport> {
    const res = await apiClient.get<Envelope<ReferentialCoverageReport>>(
      `/accounting/referential/coverage?${qs(unitId, version)}`,
    );
    return res.data;
  },

  /** Authoring skeleton (the unmapped accounts as a fill-in template). */
  async getSkeleton(unitId: string, version: string): Promise<ReferentialAuthoringSkeleton> {
    const res = await apiClient.get<Envelope<ReferentialAuthoringSkeleton>>(
      `/accounting/referential/skeleton?${qs(unitId, version)}`,
    );
    return res.data;
  },

  /** List the persisted mappings of a version. */
  async listMappings(unitId: string, version: string): Promise<ReferentialMapping[]> {
    const res = await apiClient.get<Envelope<ReferentialMapping[]>>(
      `/accounting/referential/mappings?${qs(unitId, version)}`,
    );
    return res.data;
  },

  /** Atomic all-or-nothing upsert of N de-para items into a version. */
  async batchSet(
    unitId: string,
    mappingVersion: string,
    items: ReferentialMappingItem[],
  ): Promise<ReferentialMapping[]> {
    const res = await apiClient.post<Envelope<ReferentialMapping[]>>(
      '/accounting/referential/mappings/batch',
      { unitId, mappingVersion, items },
    );
    notify('Mapeamento referencial salvo.', 'success', 'Contabilidade');
    return res.data;
  },

  /** Clone an entire version into a new one (year rollover). */
  async copyVersion(
    unitId: string,
    fromVersion: string,
    toVersion: string,
  ): Promise<ReferentialMapping[]> {
    const res = await apiClient.post<Envelope<ReferentialMapping[]>>(
      '/accounting/referential/mappings/copy',
      { unitId, fromVersion, toVersion },
    );
    notify('Versão copiada.', 'success', 'Contabilidade');
    return res.data;
  },

  /** Remove a single account's mapping from a version. */
  async unset(
    unitId: string,
    accountId: string,
    mappingVersion: string,
  ): Promise<{ accountId: string; mappingVersion: string }> {
    const params = `unitId=${encodeURIComponent(unitId)}&accountId=${encodeURIComponent(
      accountId,
    )}&mappingVersion=${encodeURIComponent(mappingVersion)}`;
    const res = await apiClient.delete<Envelope<{ accountId: string; mappingVersion: string }>>(
      `/accounting/referential/mappings?${params}`,
    );
    notify('Mapeamento removido.', 'success', 'Contabilidade');
    return res.data;
  },

  /**
   * Import the official RFB referential layout for a version (ADMIN-only on the
   * server — a 403 surfaces via `resolveError` like any other endpoint). Multipart
   * (`fetch` + `FormData`, no manual `Content-Type`) via the shared `postMultipart`
   * helper (Fork F-COMP2-7 → (b)) — `apiClient` cannot carry a file. All-or-nothing
   * and idempotent on the server (`@@unique([layoutVersion, code])`); this call does
   * NOT refetch coverage/mappings — the import only affects future writes
   * (`ReferentialMappingService.resolveDestinationLabel`), never past ones.
   */
  async importCatalog(
    unitId: string,
    layoutVersion: string,
    file: File,
  ): Promise<ReferentialCatalogImportResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('unitId', unitId);
    form.append('layoutVersion', layoutVersion);
    const result = await postMultipart<ReferentialCatalogImportResult>(
      '/accounting/referential/catalog/import',
      form,
    );
    notify(
      `Catálogo importado: ${result.imported} conta(s) (${result.analyticCount} analítica(s), ${result.syntheticCount} sintética(s)).`,
      'success',
      'Contabilidade',
    );
    return result;
  },
};
