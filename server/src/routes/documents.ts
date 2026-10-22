import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  listDocuments,
  listDocumentNames,
  getDocumentById,
  deleteDocument,
  searchDocuments,
  uploadDocument,
  updateDocument,
  uploadMiddleware,
  qdrantStatus,
  getDocumentQdrant,
  tokenCostUpload,
  computeTokenCost,
} from '@/controllers/documentsController';

const router = Router();

// Per-user rate limit for the routes that spend OpenAI (embedding/extraction) or parse a whole file
// (token-cost), same pattern as /chat (R11).
// One limiter per route, so a burst of uploads doesn't eat the search budget.
function openAiCostLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => (req.headers['x-user-id'] as string) || req.ip || 'unknown',
    message: { success: false, error: 'Too many requests. Please wait before trying again.' },
  });
}

// Static paths must come before /:id to avoid being shadowed
router.get('/', listDocuments);
router.get('/list', listDocumentNames);
router.get('/qdrant-status', qdrantStatus);
router.post('/search', openAiCostLimiter(), searchDocuments);
router.post('/upload', openAiCostLimiter(), uploadMiddleware, uploadDocument);
router.post('/token-cost', openAiCostLimiter(), tokenCostUpload, computeTokenCost);
router.get('/:id', getDocumentById);
router.get('/:id/qdrant', getDocumentQdrant);
router.patch('/:id', updateDocument);
router.delete('/:id', deleteDocument);

export default router;
