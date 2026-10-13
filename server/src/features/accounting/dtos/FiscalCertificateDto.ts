import { z } from 'zod';

/**
 * DTOs do certificado fiscal por unidade (BE-INCR-DFE-ADN-EMISSOR PR-1, item 25; contrato §4 do BRIEF).
 * O arquivo vem do multer (memória), não do corpo JSON; o corpo multipart só leva a senha.
 */
export const UploadFiscalCertificateSchema = z
  .object({
    senha: z.string().min(1).max(128),
  })
  .strict();
export type UploadFiscalCertificateInput = z.infer<typeof UploadFiscalCertificateSchema>;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Projeção pública: nenhum segredo (item 6). */
export const FiscalCertificateViewSchema = z
  .object({
    unitId: z.string(),
    cnpjCertificado: z.string().regex(/^[0-9A-Z]{12}[0-9]{2}$/),
    notBefore: z.string().regex(DATE_ONLY),
    notAfter: z.string().regex(DATE_ONLY),
    diasParaVencer: z.number().int(),
    fingerprintSha256: z.string().regex(/^[0-9a-f]{64}$/),
    setAt: z.string().datetime(),
  })
  .strict();
export type FiscalCertificateView = z.infer<typeof FiscalCertificateViewSchema>;
