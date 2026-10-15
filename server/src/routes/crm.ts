import { Router } from 'express';
import { advanceStage, convertLead, createProposal, recordNoShow, getCrmAnalytics, advanceOpportunity, convertLeadToOpportunity } from '../controllers/crmController';
import {
  uploadMiddleware,
  createAttachment,
  listAttachments,
  downloadAttachment,
  deleteAttachment,
} from '../controllers/attachmentsController';
import {
  listCrmReports,
  listCrmReportTemplates,
  createCrmReport,
  getCrmReport,
  updateCrmReport,
  deleteCrmReport,
  runCrmReportPreview,
  runSavedCrmReport,
} from '../controllers/crmReportsController';

const router = Router();

// CRM pipeline orchestration — server-side business logic for lead transitions.
router.post('/pipeline/advance', advanceStage);
router.post('/pipeline/proposal', createProposal);
router.post('/pipeline/no-show', recordNoShow);
router.post('/pipeline/convert-lead', convertLead);

// CRM opportunity transitions — first-class Opportunity (parallel to the lead pipeline).
router.post('/pipeline/advance-opportunity', advanceOpportunity);
router.post('/pipeline/convert-lead-to-opportunity', convertLeadToOpportunity);

// CRM analytics — aggregated KPI bundle over the leads dataset.
router.get('/pipeline-analytics', getCrmAnalytics);

// CRM report builder (BE-INCR-CRM-REPORT-BUILDER PR-2, item 10) — definições salvas + execução/preview.
router.get('/reports', listCrmReports);
router.post('/reports', createCrmReport);
router.post('/reports/run', runCrmReportPreview);
// Modelos prontos (BE-INCR-CRM-REPORT-TEMPLATES) — ANTES de '/reports/:id', senão 'templates' cai no :id (400).
router.get('/reports/templates', listCrmReportTemplates);
router.get('/reports/:id', getCrmReport);
router.put('/reports/:id', updateCrmReport);
router.delete('/reports/:id', deleteCrmReport);
router.post('/reports/:id/run', runSavedCrmReport);

// CRM attachments — downloadable file-store for record attachments.
router.post('/attachments', uploadMiddleware, createAttachment);
router.get('/attachments', listAttachments);
router.get('/attachments/:id/download', downloadAttachment);
router.delete('/attachments/:id', deleteAttachment);

export default router;
