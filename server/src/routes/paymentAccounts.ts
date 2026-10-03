import { Router } from 'express';
import {
  createPaymentAccount,
  deletePaymentAccount,
  getPaymentAccount,
  listPaymentAccounts,
  setPaymentAccountCredential,
  updatePaymentAccount,
} from '../controllers/paymentAccountController';

/**
 * Conta de pagamento no provedor (BE-INCR-PAYMENT-PROVIDER PR-1, P1-6/P1-9). Montada em
 * `/api/payment-accounts` (routes/index.ts); registro em 2 toques: a montagem e os blocos OpenAPI em
 * docs.paths.ts. Autenticada (deny-by-default do middleware) — o webhook público é do PR-2.
 */
const router = Router();

router.get('/', listPaymentAccounts);
router.post('/', createPaymentAccount);
router.get('/:id', getPaymentAccount);
router.patch('/:id', updatePaymentAccount);
router.delete('/:id', deletePaymentAccount);
router.put('/:id/credential', setPaymentAccountCredential);

export default router;
