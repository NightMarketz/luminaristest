import { Router } from 'express';
import { confirmProposal, listProposals, rejectProposal } from '@/controllers/proposalController';

/** /api/proposals (BE-INCR-TEAMMATES §2.4, PR-7): caixa única — propostas do chat e dos teammates. */
const router = Router();

router.get('/', listProposals);
router.post('/:id/confirm', confirmProposal);
router.post('/:id/reject', rejectProposal);

export default router;
