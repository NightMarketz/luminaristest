import { Router } from 'express';
import { nfeUpload, importNfePurchase, reconcileNfeSale } from '../controllers/nfeController';

/**
 * Ingestão fiscal de NF-e (BE-INCR-NFE). Montada em `/api/nfe` (routes/index.ts) — registro de
 * rota em 2 TOQUES: o import e o `router.use`. NÃO existe um terceiro toque de allowlist: o auth é
 * deny-by-default (a allowlist é de rotas PÚBLICAS), então esta rota já nasce protegida.
 *
 * Ambos os endpoints são multipart (`file` = o XML da NF-e); `nfeUpload` é o multer compartilhado
 * com magic-bytes desligado (XML é texto — decisão O-3).
 *
 * A documentação OpenAPI destes paths vive em `docs.paths.ts` (não escreva a tag jsdoc-openapi
 * literal nesta prosa: o gerador varre routes/ e espalharia a string do comentário dentro de `paths`).
 */
const router = Router();

router.post('/purchase', nfeUpload, importNfePurchase);
router.post('/sale', nfeUpload, reconcileNfeSale);

export default router;
