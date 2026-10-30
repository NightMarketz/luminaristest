import { z } from 'zod';

/**
 * DTOs da contingência off-line da NFC-e por unidade e ambiente (X10a PR-9; BE-INCR-NFCE-EMENDA-1 E-9, F-NFCE-E1-5 b;
 * D-2026-10-29-X10A-PR7-9-FORKS decisões 4 e 8: o operador liga e desliga). `xJust` = B29 da NFC-e emitida nela, 15–256
 * caracteres (Anexo I, leiaute B29; Anexo IV p. 8: "preencher com a justificativa da entrada em contingência").
 */
const AMBIENTE = z.enum(['producao', 'homologacao']);

export const PutNfceContingenciaSchema = z
  .object({
    ambiente: AMBIENTE,
    ativa: z.boolean(),
    xJust: z.string().trim().min(15).max(256).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.ativa && !v.xJust) ctx.addIssue({ code: 'custom', message: 'xJust (15–256) obrigatório para ligar a contingência — B29', path: ['xJust'] });
    if (!v.ativa && v.xJust !== undefined) ctx.addIssue({ code: 'custom', message: 'xJust só vale para ligar a contingência', path: ['xJust'] });
  });
export type PutNfceContingenciaInput = z.infer<typeof PutNfceContingenciaSchema>;

export const NfceContingenciaViewSchema = z
  .object({
    unitId: z.string(),
    ambiente: AMBIENTE,
    ativa: z.boolean(),
    origem: z.enum(['AUTO', 'MANUAL']).nullable(),
    dhCont: z.string().datetime({ offset: true }).nullable(),
    xJust: z.string().nullable(),
  })
  .strict();
export type NfceContingenciaView = z.infer<typeof NfceContingenciaViewSchema>;

/** Resumo do passo de contingência no tick do `dfe_poll_pending` (decisões 6 e 7). */
export const ContingenciaTickSummarySchema = z
  .object({
    transmitidas: z.number().int(),
    semComunicacao: z.number().int(),
    pertoDoPrazo: z.number().int(),
    vencidas: z.number().int(),
    saidasAutomaticas: z.number().int(),
    orfasResolvidas: z.number().int(),
    orfasFalharam: z.number().int(),
    failed: z.number().int(),
  })
  .strict();
export type ContingenciaTickSummary = z.infer<typeof ContingenciaTickSummarySchema>;
