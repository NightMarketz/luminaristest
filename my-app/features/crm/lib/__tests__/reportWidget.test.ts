import { describe, it, expect } from 'vitest';
import { parseCrmReportWidgetConfig } from '../reportWidget';

/** Contrato do `widgetConfig` do widget `crm-report` — FE-INCR-CRM-REPORT-BUILDER PR-D (BRIEF §3 e item 20). */
describe('parseCrmReportWidgetConfig', () => {
  it('aceita { reportId } com id não vazio', () => {
    expect(parseCrmReportWidgetConfig({ reportId: 'r1' })).toEqual({ reportId: 'r1' });
  });

  it.each([undefined, null, 'r1', {}, { reportId: '' }, { reportId: '  ' }, { reportId: 42 }, { categoryId: 'x' }])(
    '%j → não configurado',
    (raw) => {
      expect(parseCrmReportWidgetConfig(raw)).toBeNull();
    },
  );

  it('chave extra do layout não vaza para a config', () => {
    expect(parseCrmReportWidgetConfig({ reportId: 'r1', chartKey: 'x' })).toEqual({ reportId: 'r1' });
  });
});
