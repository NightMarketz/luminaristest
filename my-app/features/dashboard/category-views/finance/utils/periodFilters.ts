import type { PeriodFilter } from '../types/common.types';

/**
 * `YYYY-MM-DD` é um DIA, não um instante: `new Date('2026-12-01')` o lê como meia-noite UTC (30/11 21h em UTC-3). Date-only vira
 * meia-noite LOCAL (mesmo caminho de `formatDateNumericBR`); qualquer outra forma segue como estava.
 */
export function parseDayOrInstant(value: string): Date {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

/**
 * Verifica se uma data pertence ao período selecionado.
 * Utilitário compartilhado por useSalesLogic e useExpensesLogic.
 */
export function isInPeriod(dateValue: unknown, period: PeriodFilter): boolean {
    if (period === 'all') return true;
    if (!dateValue) return false;

    const date = parseDayOrInstant(String(dateValue));
    if (isNaN(date.getTime())) return false; // data inválida não pertence a nenhum período

    const now = new Date();
    const thisMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const thisYear    = new Date(now.getFullYear(), 0, 1);

    switch (period) {
        case 'this_month':    return date >= thisMonth;
        case 'last_month':    return date >= lastMonth && date < thisMonth;
        case 'last_3_months': return date >= last3Months;
        case 'this_year':     return date >= thisYear;
        default:              return true;
    }
}
