/**
 * Guarda de TIPO do contrato gerado do builder de relatórios do CRM (FE-INCR-CRM-REPORT-BUILDER PR-A, BRIEF §3).
 * Morde no `npm run test:types`: cada `@ts-expect-error` vira erro de compilação se o tipo gerado deixar de recusar a
 * forma errada — p.ex. se o DTO do BE aceitar uma 5ª medida, fonte fora da whitelist ou `convertTo` diferente de BRL.
 */
import { describe, it, expect } from 'vitest';
import type { CreateCrmReportInput, CrmReportRunOutput, RunCrmReportInput } from '../crmReports.service';

type Spec = CreateCrmReportInput['spec'];
type Measure = Spec['measures'][number];

const count: Measure = { type: 'count' };

export const valido: CreateCrmReportInput = {
  name: 'Propostas por moeda',
  kind: 'chart',
  chartType: 'bar',
  spec: {
    source: 'leadProposals',
    dimensions: [{ type: 'field', field: 'currency' }],
    measures: [{ type: 'sum', field: 'amount' }],
    sort: { by: 'measure', dir: 'desc' },
    limit: 50,
    convertTo: 'BRL',
  },
};

export const fonteForaDaWhitelist: Spec = {
  // @ts-expect-error — a fonte é a whitelist F-RB3; tabela fora dela é 400 REPORT_SOURCE_NOT_ALLOWED.
  source: 'employees',
  measures: [count],
};

export const semMedida: Spec = {
  source: 'leads',
  // @ts-expect-error — `measures` é `.min(1)` → `[T, ...T[]]`; vazio não compila.
  measures: [],
};

// @ts-expect-error — `sum` exige `field`.
export const somaSemCampo: Measure = { type: 'sum' };

export const conversaoEmDolar: Spec = {
  source: 'leads',
  measures: [count],
  // @ts-expect-error — a visão convertida é só para R$ (F-RB8).
  convertTo: 'USD',
};

// @ts-expect-error — o preview exige o spec; o fuso é opcional.
export const runSemSpec: RunCrmReportInput = { timeZone: 'America/Sao_Paulo' };

export const saida: CrmReportRunOutput = {
  series: [{ measure: 'count:*', points: [{ name: 'Open', value: 3 }] }],
  meta: { rowsRead: 3, truncated: false, currency: null, timeZone: 'America/Sao_Paulo' },
};

describe('contrato gerado — builder de relatórios do CRM', () => {
  it('o arquivo compila sob test:types (a mordida é o tsc, não o runtime)', () => {
    expect([valido, fonteForaDaWhitelist, semMedida, somaSemCampo, conversaoEmDolar, runSemSpec, saida]).toHaveLength(7);
  });
});
