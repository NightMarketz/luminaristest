/**
 * Warn thresholds for `Metrics.startTimer(...)` call sites added by BRIEF-W2-D (F4) — HTTP
 * middleware duration + the 6 heavy accounting report methods (Balancete/Razão/Diário/BP/DRE/DFC).
 *
 * F-W2D-1 (fork, ratificado como ponto de partida — não medição real): estes números são um chute
 * fundamentado apenas na FORMA da query (trialBalance/accountLedger/dailyJournal lêem uma janela;
 * balanceSheet/incomeStatement/cashFlowStatement agregam sobre o razão inteiro, daí o threshold
 * maior), não em latência medida em `dev.db` real ou produção. Ajuste depois de medir.
 */
export const REPORT_WARN_THRESHOLDS_MS = {
  trialBalance: 1000,
  accountLedger: 1000,
  dailyJournal: 1000,
  balanceSheet: 1500,
  incomeStatement: 1500,
  cashFlowStatement: 1500,
} as const;

/**
 * F-W2D-1/F-W2D-2: HTTP middleware measures the whole route (body parsing + auth + handler) —
 * this threshold is about the aggregate long tail an operator would want to know about, not the
 * report-level cost (those are measured separately by REPORT_WARN_THRESHOLDS_MS above). Also a
 * chute-não-medido starting point, not a measured SLO.
 */
export const HTTP_WARN_THRESHOLD_MS = 2000;
