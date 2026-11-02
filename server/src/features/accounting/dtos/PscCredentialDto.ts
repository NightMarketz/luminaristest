import { z } from 'zod';

/**
 * DTOs do PSC (X10a PR-7; BRIEF BE-INCR-DFE-ADN-EMENDA-PSC §4). Nenhuma view carrega token, segredo OAuth nem
 * code_verifier.
 */
const ESCOPO = z.enum(['NFSE_DPS', 'NFE', 'NFCE']);
const CNPJ_REGEX = /^[0-9A-Z]{12}[0-9]{2}$/;

export const AuthorizePscSchema = z
  .object({ pscProviderId: z.string().min(1), escopo: z.array(ESCOPO).min(1) })
  .strict();
export type AuthorizePscInput = z.infer<typeof AuthorizePscSchema>;

/** Query do retorno do PSC (DOC-ICP-17.01 §6.4.5.1.1): `code`+`state` ou `error`+`state`. */
export const PscCallbackQuerySchema = z
  .object({
    code: z.string().min(1).max(4096).optional(),
    state: z.string().min(1).max(512),
    error: z.string().min(1).max(128).optional(),
  })
  .strict();
export type PscCallbackQuery = z.infer<typeof PscCallbackQuerySchema>;

export const PscCredentialViewSchema = z
  .object({
    unitId: z.string(),
    psc: z.string(),
    titularCnpj: z.string().regex(CNPJ_REGEX),
    certNotAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tokenExpiraEm: z.string().datetime(),
    consumoNoAno: z.number().int().nonnegative(),
    cotaAnual: z.number().int().positive().nullable(),
    avisos: z.array(z.string()),
  })
  .strict();
export type PscCredentialView = z.infer<typeof PscCredentialViewSchema>;

export const PscAuthorizeResultSchema = z.object({ authorizationUrl: z.string().url(), expiresAt: z.string().datetime() }).strict();
export type PscAuthorizeResult = z.infer<typeof PscAuthorizeResultSchema>;

const HTTPS_URL = z
  .string()
  .url()
  .max(512)
  .refine((u) => u.startsWith('https://'), { message: 'baseUrl precisa ser https' });

export const CreatePscProviderSchema = z
  .object({
    nome: z.string().min(1).max(120),
    baseUrl: HTTPS_URL,
    clientId: z.string().min(1).max(256),
    clientSecret: z.string().min(1).max(1024),
    cotaAnual: z.number().int().positive().nullable().optional(),
    lifetimeMaxSegundos: z.number().int().positive().nullable().optional(),
    algoritmos: z.array(z.string().min(1).max(64)).min(1),
    habilitadoEm: z.string().datetime().nullable().optional(),
  })
  .strict();
export type CreatePscProviderInput = z.infer<typeof CreatePscProviderSchema>;

/** PATCH explícito (sem `.partial()` — Zod 4 aplica default no partial). Ausente = não muda. */
export const UpdatePscProviderSchema = z
  .object({
    nome: z.string().min(1).max(120).optional(),
    baseUrl: HTTPS_URL.optional(),
    clientId: z.string().min(1).max(256).optional(),
    clientSecret: z.string().min(1).max(1024).optional(),
    cotaAnual: z.number().int().positive().nullable().optional(),
    lifetimeMaxSegundos: z.number().int().positive().nullable().optional(),
    algoritmos: z.array(z.string().min(1).max(64)).min(1).optional(),
    habilitadoEm: z.string().datetime().nullable().optional(),
  })
  .strict();
export type UpdatePscProviderInput = z.infer<typeof UpdatePscProviderSchema>;

export const PscProviderViewSchema = z
  .object({
    id: z.string(),
    nome: z.string(),
    baseUrl: z.string(),
    clientId: z.string(),
    temClientSecret: z.boolean(),
    cotaAnual: z.number().int().nullable(),
    lifetimeMaxSegundos: z.number().int().nullable(),
    algoritmos: z.array(z.string()),
    habilitadoEm: z.string().datetime().nullable(),
  })
  .strict();
export type PscProviderView = z.infer<typeof PscProviderViewSchema>;
