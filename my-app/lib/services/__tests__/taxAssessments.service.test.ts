import { describe, it, expect, vi, afterEach } from 'vitest';

const get = vi.fn(async (..._a: unknown[]) => ({ success: true, data: [] }));
const post = vi.fn(async (..._a: unknown[]) => ({ success: true, data: { id: 'x' } }));
vi.mock('../../api/api-client', () => ({ apiClient: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));

import { taxAssessmentsService } from '../taxAssessments.service';

describe('taxAssessmentsService (FE-INCR-TAX-ASSESSMENT PR-1 — rotas do BRIEF §0)', () => {
  afterEach(() => vi.clearAllMocks());

  it('list: GET /accounting/tax-assessments com unitId + anoCalendario (+ filtros opcionais)', async () => {
    await taxAssessmentsService.list({ unitId: 'u 1', anoCalendario: 2026 });
    expect(get).toHaveBeenLastCalledWith('/accounting/tax-assessments?unitId=u+1&anoCalendario=2026');
    await taxAssessmentsService.list({ unitId: 'u1', anoCalendario: 2026, tributo: 'PIS', status: 'SUPERSEDED', periodo: 'M01' });
    expect(get).toHaveBeenLastCalledWith('/accounting/tax-assessments?unitId=u1&anoCalendario=2026&periodo=M01&tributo=PIS&status=SUPERSEDED');
  });

  it('get: GET /:id?unitId', async () => {
    await taxAssessmentsService.get('a/b', { unitId: 'u1' });
    expect(get).toHaveBeenLastCalledWith('/accounting/tax-assessments/a%2Fb?unitId=u1');
  });

  it('reconcileProvisao: POST /:id/provisao com { unitId } no corpo', async () => {
    const r = await taxAssessmentsService.reconcileProvisao('t1', { unitId: 'u1' });
    expect(post).toHaveBeenLastCalledWith('/accounting/tax-assessments/t1/provisao', { unitId: 'u1' });
    expect(r).toEqual({ id: 'x' });
  });
});
