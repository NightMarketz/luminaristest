import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 8 (FIX-FE-DASHBOARD).
 *
 * `DynamicTableService`/`AnalyticsService` chamam rotas que o servidor não declara (`POST /dynamic-tables`,
 * `GET /dynamic-tables/:tableId/data/:dataId`, `GET /dashboard/system`), e `performLookup` manda
 * `{ targetTableId, displayField, keys }` para `POST /dynamic-tables/lookup`, cujo DTO (`ResolveRelationsDto`) lê
 * `lookups`. Esperado: toda chamada desses serviços casa com uma rota declarada, e o corpo do lookup leva `lookups`.
 */
vi.mock('@/lib/api/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn().mockResolvedValue({ success: true, data: {} }), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));

const ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

/** `router.<m>('/x', …)` do arquivo de rotas, prefixado pelo mount. */
function serverRoutes(file: string, mount: string): string[] {
  return [...read(file).matchAll(/router\.(get|post|put|delete|patch)\(\s*'([^']+)'/g)]
    .map(([, m, p]) => `${m.toUpperCase()} ${(mount + (p === '/' ? '' : p)).replace(/:[A-Za-z]+/g, ':p')}`);
}

/** `apiClient.<m>('/x'…)` / `apiClient.<m>(\`/x/${…}\`…)` do serviço do FE, com os `${…}` normalizados. */
function clientCalls(file: string): string[] {
  return [...read(file).matchAll(/apiClient\.(get|post|put|delete|patch)(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)[`'"]/g)]
    .map(([, m, p]) => `${m.toUpperCase()} ${p.split('?')[0].replace(/\$\{[^}]+\}/g, ':p')}`);
}

describe('item 8: rotas chamadas pelos serviços existem no servidor', () => {
  const declared = new Set([
    ...serverRoutes('server/src/routes/dynamic-tables.ts', '/dynamic-tables'),
    ...serverRoutes('server/src/routes/dashboard.ts', '/dashboard'),
  ]);

  it('dynamic-table.service.ts e analytics.service.ts só chamam /dynamic-tables e /dashboard declarados', () => {
    expect(declared.has('GET /dynamic-tables/:p/data')).toBe(true);
    const calls = [
      ...clientCalls('my-app/lib/services/dynamic-table.service.ts'),
      ...clientCalls('my-app/lib/services/analytics.service.ts'),
    ].filter((c) => / \/(dynamic-tables|dashboard)(\/|$)/.test(c));
    expect(calls.length).toBeGreaterThan(0);
    const missing = [...new Set(calls.filter((c) => !declared.has(c)))].sort();
    expect(missing).toEqual([]);
  });

  it('performLookup envia o corpo no contrato do ResolveRelationsDto (`lookups`)', async () => {
    const { apiClient } = await import('@/lib/api/api-client');
    const { DynamicTableService } = await import('@/lib/services/dynamic-table.service');
    await DynamicTableService.performLookup({ targetTableId: 't', displayField: 'name', keys: ['a'] });
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe('/dynamic-tables/lookup');
    expect(body).toHaveProperty('lookups');
  });
});
