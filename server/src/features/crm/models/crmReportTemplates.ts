import type { CrmReportTemplate } from '../dtos/CrmReportDto';

export type { CrmReportTemplate };

/**
 * Templates iniciais do builder (BE-INCR-CRM-REPORT-BUILDER PR-2, item 13; F-RB7=(a)): gráficos fixos do
 * `CrmAnalyticsBundle` expressos como `ReportSpec`, para o usuário clonar.
 *
 * Escopo decidido pelo dono em 13/10 (questionário, D-2026-10-13-CRM-RB-PR2-LACUNAS): **5 templates**, paridade de
 * VALORES (os mesmos pares nome→valor na mesma fixture). Diferenças aceitas e documentadas:
 * - a ORDEM fixa dos gráficos (etapas por `order`, Open→Won→Lost…, Draft→Sent…) não se expressa no builder, que só ordena
 *   por nome ou por valor;
 * - valor vazio: os fixos rotulam 'Desconhecida'/'Open'/'Draft'/'note' (o funil fixo descarta lead sem etapa); no
 *   builder o grupo vazio fica vazio;
 * - funil: o fixo funde etapas de mesmo nome entre funis; o builder agrupa pela etapa (id) e mostra o nome — duas
 *   etapas homônimas saem como dois pontos com o mesmo nome (nenhum lead some).
 * O BANT fica de fora: % de leads 'High' em 4 campos diferentes exige fórmula, fora do v1 (F-RB5).
 * Nenhum dos 5 soma dinheiro (item 13: a paridade não depende do F-RB8).
 */
export const CRM_REPORT_TEMPLATES: readonly CrmReportTemplate[] = [
  {
    key: 'funnel',
    name: 'Funil por etapa',
    kind: 'chart',
    chartType: 'bar',
    // o funil fixo ignora lead sem etapa; aqui ele sai no grupo vazio (o filtro não distingue campo ausente de null)
    spec: { source: 'leads', dimensions: [{ type: 'field', field: 'stageId' }], measures: [{ type: 'count' }] },
  },
  {
    key: 'source',
    name: 'Leads por origem',
    kind: 'chart',
    chartType: 'pie',
    spec: { source: 'leads', dimensions: [{ type: 'field', field: 'source' }], measures: [{ type: 'count' }], sort: { by: 'measure', dir: 'desc' } },
  },
  {
    key: 'status',
    name: 'Leads por status',
    kind: 'chart',
    chartType: 'bar',
    spec: { source: 'leads', dimensions: [{ type: 'field', field: 'status' }], measures: [{ type: 'count' }] },
  },
  {
    key: 'proposals',
    name: 'Propostas por status',
    kind: 'chart',
    chartType: 'bar',
    spec: { source: 'leadProposals', dimensions: [{ type: 'field', field: 'status' }], measures: [{ type: 'count' }] },
  },
  {
    key: 'activities',
    name: 'Atividades por tipo',
    kind: 'chart',
    chartType: 'bar',
    spec: { source: 'leadActivities', dimensions: [{ type: 'field', field: 'type' }], measures: [{ type: 'count' }], sort: { by: 'measure', dir: 'desc' } },
  },
];
