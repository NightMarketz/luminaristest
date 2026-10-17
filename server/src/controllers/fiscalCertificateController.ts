import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { makeUploadMiddleware } from '../lib/uploadSecurity';
import { UploadFiscalCertificateSchema } from '../features/accounting/dtos/FiscalCertificateDto';
import { FISCAL_CERTIFICATE_MAX_BYTES, FISCAL_CERTIFICATE_MIME_TYPES } from '../features/accounting/models/FiscalCertificate.model';

/**
 * Certificado fiscal da unidade (BE-INCR-DFE-ADN-EMISSOR PR-1, itens 5–6) — borda HTTP fina: auth → Zod → escopo
 * pela `:unitId` → service → handleApiError. Nenhuma resposta carrega chave, certificado ou senha.
 */

/** Multer do campo `file` (memória, MIME de PKCS#12, teto de 64 KB). A leitura do conteúdo é do service. */
export const fiscalCertificateUpload = makeUploadMiddleware(FISCAL_CERTIFICATE_MIME_TYPES, 'file', FISCAL_CERTIFICATE_MAX_BYTES);

/** PUT /api/accounting/fiscal-certificates/:unitId — multipart: `file` (PFX/P12) + `senha`. */
export const putFiscalCertificate = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) return res.status(400).json({ success: false, error: 'File is required (field name: file)' });
    const parsed = UploadFiscalCertificateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'write' });
    const data = await getFactory().getFiscalCertificateService().upload(scope, { pfx: file.buffer, senha: parsed.data.senha });
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/fiscal-certificates/:unitId — só a projeção pública. */
export const getFiscalCertificate = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'read' });
    const data = await getFactory().getFiscalCertificateService().get(scope);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** DELETE /api/accounting/fiscal-certificates/:unitId — soft-delete com ciphertext zerado. */
export const deleteFiscalCertificate = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'write' });
    await getFactory().getFiscalCertificateService().remove(scope);
    return res.status(204).end();
  } catch (error) {
    return handleApiError(error, res);
  }
};
