import { Router } from 'express';
import {
  listCounterparties,
  getCounterparty,
  createCounterparty,
  archiveCounterparty,
  setCounterpartyRegime,
} from '../controllers/counterpartyController';

/**
 * Contraparte — fornecedor/cliente (INCR-COUNTERPARTY / A1). Mounted at `/api/counterparties`
 * (routes/index.ts). 2-touch registration: the mount plus the OpenAPI doc blocks in
 * docs.paths.ts. The static `:id/archive`
 * segment precedes nothing ambiguous; `:id` only ever captures a real id.
 */
const router = Router();

router.get('/', listCounterparties);
router.post('/', createCounterparty);
router.get('/:id', getCounterparty);
router.post('/:id/archive', archiveCounterparty);
router.post('/:id/regime', setCounterpartyRegime); // RETENCOES-FONTE PR-1 (item 5)

export default router;
