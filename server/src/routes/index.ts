import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import documentRoutes from './documents';
import dynamicTableRoutes from './dynamic-tables';
import chatRoutes from './chat';
import chatInstanceRoutes from './chat-instances';
import chatMessageRoutes from './chat-messages';
import dashboardRoutes from './dashboard';
import dashboardLayoutRoutes from './dashboard-layout';
import structuredDataRoutes from './structured-data';
import reportRoutes from './reports';
import docsRoutes from './docs';
import analyticsRoutes from './analytics';
import analyticsDefinitionsRoutes from './analyticsDefinitions';
import crmRoutes from './crm';
import accountingRoutes from './accounting';
import accountingBindingRoutes from './accounting-binding';
import payableRoutes from './payables';
import receivableRoutes from './receivables';
import dimensionRoutes from './dimensions';
import counterpartyRoutes from './counterparties';
import paymentAccountRoutes from './paymentAccounts';
import nfeRoutes from './nfe';
import dfeRoutes from './dfe';
import entryApprovalRoutes from './entryApprovals';
import salesRoutes from './sales';
import savedViewsRoutes from './saved-views';
import packageBalanceRoutes from './packageBalances';
import packageAcceptanceRoutes from './packageAcceptances';
import reconcilePendingRoutes from './reconcilePending';
import bankSettlementRoutes from './bankSettlements';
import lalurRoutes from './lalur';
import taxAssessmentRoutes from './taxAssessments';
import mitExportRoutes from './mitExports';
import simplesRoutes from './simples';
import legalParameterRoutes from './legalParameters';

const router = Router();

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Luminaris API',
    version: '1.0.0',
    description: 'Document Intelligence Platform API',
    endpoints: {
      health: 'GET /health',
      auth: 'POST /api/auth/login, POST /api/auth/register, GET /api/auth/me, POST /api/auth/logout',
      users: 'GET /api/users',
      documents: 'GET/POST/PATCH/DELETE /api/documents/*',
      dynamicTables: 'GET/POST/PUT/DELETE /api/dynamic-tables/*',
      chat: 'POST /api/chat',
      chatInstances: 'GET/POST /api/chat-instances',
      chatMessages: 'GET/POST /api/chat-messages'
    },
  });
});

// Mount sub-routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/documents', documentRoutes);
router.use('/dynamic-tables', dynamicTableRoutes);
router.use('/chat', chatRoutes);
router.use('/chat-instances', chatInstanceRoutes);
router.use('/chat-messages', chatMessageRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/dashboard-layout', dashboardLayoutRoutes);
router.use('/structured-data', structuredDataRoutes);
router.use('/reports', reportRoutes);
router.use('/docs', docsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/analytics/definitions', analyticsDefinitionsRoutes);
router.use('/crm', crmRoutes);
router.use('/accounting/tax-assessments', taxAssessmentRoutes); // BE-INCR-TAX-ASSESSMENT Fase A PR-2 (nó X7) — antes de /accounting
router.use('/accounting/simples', simplesRoutes); // BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14) — antes de /accounting
router.use('/accounting/mit-exports', mitExportRoutes); // BE-INCR-MIT-EXPORT PR-2 (nó X9) — antes de /accounting
router.use('/legal-parameters', legalParameterRoutes); // BE-INCR-LEGAL-PARAMS PR-1 — coeficientes de lei da plataforma
router.use('/accounting', accountingRoutes);
router.use('/accounting-binding', accountingBindingRoutes);
router.use('/payables', payableRoutes);
router.use('/receivables', receivableRoutes);
router.use('/dimensions', dimensionRoutes);
router.use('/counterparties', counterpartyRoutes);
router.use('/nfe', nfeRoutes);
router.use('/nfe/dfe', dfeRoutes); // BE-INCR-DFE (nó X10b) — emissão de saída, /api/nfe/dfe/*
router.use('/entry-approvals', entryApprovalRoutes);
router.use('/sales', salesRoutes);
router.use('/saved-views', savedViewsRoutes);
router.use('/package-balances', packageBalanceRoutes);
router.use('/package-acceptances', packageAcceptanceRoutes);
router.use('/reconcile-pending', reconcilePendingRoutes);
router.use('/bank-settlements', bankSettlementRoutes); // BE-INCR-BANK-SETTLEMENT (nó F7)
router.use('/lalur', lalurRoutes);
router.use('/payment-accounts', paymentAccountRoutes); // BE-INCR-PAYMENT-PROVIDER (nó F5) PR-1

export { router };

