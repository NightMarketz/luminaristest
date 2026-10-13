/**
 * BE-INCR-CRM-REPORT-BUILDER PR-2 — item 13 (F-RB7=(a)), na forma decidida pelo dono em 13/10: 5 templates (BANT fora,
 * exige fórmula) e paridade de VALORES — cada template, rodado pelo builder, devolve os mesmos pares nome→valor que o
 * gráfico fixo do `CrmAnalyticsService` na mesma fixture. A ordem e o rótulo do vazio não entram (diferenças aceitas,
 * documentadas em `crmReportTemplates.ts`); por isso a fixture não tem campo vazio.
 */
import { CrmAnalyticsService } from '../CrmAnalyticsService';
import { CRM_REPORT_TEMPLATES } from '../../models/crmReportTemplates';
import { CreateCrmReportSchema } from '../../dtos/CrmReportDto';
import { FakeEngine, makeService, user, type FakeRow } from './crmReportFakes';
import type { DynamicTableService } from '../../../dynamicTables/services/DynamicTableService';

const OWNER = user('owner');

function fixture(): FakeEngine {
  const e = new FakeEngine();
  e.addTable('owner', 'leadStages', [
    { id: 's1', data: { name: 'Novo', order: 1 } },
    { id: 's2', data: { name: 'Proposta', order: 2 } },
    { id: 's3', data: { name: 'Fechamento', order: 3 } },
  ]);
  const leads: FakeRow[] = [
    ['s1', 'Web', 'Open'], ['s1', 'Web', 'Open'], ['s2', 'Indicação', 'Won'], ['s2', 'Web', 'Lost'],
    ['s3', 'Evento', 'Open'], ['s1', 'Indicação', 'Disqualified'], ['s2', 'Web', 'Open'],
  ].map(([stageId, source, status], i) => ({ id: `l${i}`, data: { leadName: `L${i}`, stageId, source, status } }));
  e.addTable('owner', 'leads', leads);
  e.addTable('owner', 'leadProposals', ['Draft', 'Sent', 'Sent', 'Accepted', 'Rejected', 'Sent'].map((status, i) => ({ id: `p${i}`, data: { status } })));
  e.addTable('owner', 'leadActivities', ['call', 'email', 'call', 'meeting', 'call', 'note', 'email'].map((type, i) => ({ id: `a${i}`, data: { type } })));
  return e;
}

/** O CrmAnalyticsService lê por `getAllTableData`; o fake serve as mesmas linhas. */
function analyticsService(e: FakeEngine): CrmAnalyticsService {
  const dts = {
    async getAllTableData(_u: unknown, tableId: string) {
      return (e.rows.get(tableId) ?? []).map((r) => ({ id: r.id, data: r.data, createdAt: new Date(), updatedAt: new Date() }));
    },
  } as unknown as DynamicTableService;
  return new CrmAnalyticsService(dts, e.repository());
}

const asMap = (pts: Array<{ name: string; value: number }>) => Object.fromEntries(pts.map((p) => [p.name, p.value]));

describe('item 13 — templates × bundle fixo (paridade de valores)', () => {
  it('são 5, válidos pelo DTO de criação; BANT fora', () => {
    expect(CRM_REPORT_TEMPLATES.map((t) => t.key)).toEqual(['funnel', 'source', 'status', 'proposals', 'activities']);
    for (const { key: _key, ...t } of CRM_REPORT_TEMPLATES) expect(CreateCrmReportSchema.safeParse(t).success).toBe(true);
  });

  it.each(CRM_REPORT_TEMPLATES.map((t) => [t.key, t] as const))('%s bate com o gráfico fixo', async (key, template) => {
    const e = fixture();
    const bundle = await analyticsService(e).getAnalytics(OWNER, { datePreset: 'thisYear' });
    const out = await makeService(e).service.runPreview(OWNER, { spec: template.spec });
    expect(asMap(out.series[0].points)).toEqual(asMap(bundle[key]));
    expect(out.series[0].points.length).toBeGreaterThan(1);
  });
});
