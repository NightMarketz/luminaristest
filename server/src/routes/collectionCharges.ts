import { Router } from 'express';
import {
  cancelCollectionCharge,
  createCollectionCharge,
  getCollectionCharge,
  getPayerSuggestion,
  listCollectionCharges,
  receiveCollectionWebhook,
} from '../controllers/collectionChargeController';

/**
 * Cobrança por provedor (BE-INCR-PAYMENT-PROVIDER PR-2). Três montagens em routes/index.ts (registro em 2 toques:
 * a montagem e os blocos OpenAPI em docs.paths.ts):
 * - `/api/receivables` (`/:receivableId/charges…`) — criação, lista e sugestão do pagador (P2-2/P2-11/P2-15);
 * - `/api/collection-charges` — detalhe e cancelamento (P2-10/P2-15);
 * - `/api/payment-collection` — webhook PÚBLICO (P2-5; `publicApiRoutes`, POST, prefix).
 */
// Montado em `/api/receivables` ANTES do router do AR, com o caminho inteiro (o wiring de rotas × OpenAPI não lê
// parâmetro no caminho de montagem).
export const receivableChargesRouter = Router();
receivableChargesRouter.post('/:receivableId/charges', createCollectionCharge);
receivableChargesRouter.get('/:receivableId/charges', listCollectionCharges);
receivableChargesRouter.get('/:receivableId/charges/payer-suggestion', getPayerSuggestion);

export const collectionChargesRouter = Router();
collectionChargesRouter.get('/:id', getCollectionCharge);
collectionChargesRouter.post('/:id/cancel', cancelCollectionCharge);

export const paymentCollectionWebhookRouter = Router();
paymentCollectionWebhookRouter.post('/webhook/:provider/:accountId', receiveCollectionWebhook);
