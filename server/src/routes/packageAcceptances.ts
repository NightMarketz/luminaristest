import { Router } from 'express';
import {
  createPackageAcceptance,
  getPackageAcceptance,
  getPackageSaleReceipt,
  getValidityNotice,
} from '../controllers/packageAcceptanceController';

const router = Router();

// Package-validity acceptance (FE-INCR-PACOTE-VALIDADE) — append-only evidence; no PUT/PATCH/DELETE by design.
router.get('/notice', getValidityNotice);
router.post('/', createPackageAcceptance);
router.get('/', getPackageAcceptance);
router.get('/:saleId/receipt', getPackageSaleReceipt);

export default router;
