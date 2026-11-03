import { Router } from 'express';
import { cancelSale, returnSale, registerPayment, fiscalCheck } from '../controllers/salesController';

const router = Router();

// Sale lifecycle transitions (Incremento D) — server-orchestrated state moves out of
// the Finalized terminal state, each followed by a post-commit accounting effect.
router.post('/cancel', cancelSale);
router.post('/return', returnSale);
// Payment registration (D1): Finalized → Paid via a whitelisted isSystem write, then settle.
router.post('/pay', registerPayment);
// EFICIENCIA-FISCAL PR-1 item 6: guarda fiscal da venda (piso, rateio do desconto, invariantes) — também pré-condição da NFS-e.
router.post('/:id/fiscal-check', fiscalCheck);

export default router;
