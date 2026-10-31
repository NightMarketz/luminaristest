import { z } from 'zod';

/**
 * DTOs do CSC da NFC-e (X10a PR-8; BE-INCR-NFCE-EMENDA-1 §4; D-2026-10-29-X10A-PR7-9-FORKS decisão 3). A view nunca carrega
 * o CSC — só o identificador.
 *
 * Formato (Manual do DANFE NFC-e e QR Code v6.0, §4.3.1 Tabela 2 e §4.3.4): o identificador do CSC tem 1–6 dígitos ("a
 * ordem do CSC no banco de dados da SEFAZ"); o CSC é "um código de segurança alfanumérico (16 a 36 bytes)".
 */
const AMBIENTE = z.enum(['producao', 'homologacao']);

export const PutNfceCscSchema = z
  .object({
    ambiente: AMBIENTE,
    cscId: z.string().regex(/^\d{1,6}$/),
    csc: z.string().regex(/^[0-9A-Za-z]{16,36}$/),
  })
  .strict();
export type PutNfceCscInput = z.infer<typeof PutNfceCscSchema>;

export const NfceCscAmbienteQuerySchema = z.object({ ambiente: AMBIENTE }).strict();
export type NfceCscAmbienteQuery = z.infer<typeof NfceCscAmbienteQuerySchema>;

export const NfceCscViewSchema = z
  .object({
    unitId: z.string(),
    ambiente: AMBIENTE,
    cscId: z.string(),
    createdAt: z.string().datetime(),
  })
  .strict();
export type NfceCscView = z.infer<typeof NfceCscViewSchema>;
