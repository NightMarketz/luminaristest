import { z } from 'zod';

/**
 * BE-INCR-MIT-EXPORT PR-2 (nó X9, BRIEF itens 10–12; contrato §2) — `.strict()`. `unitId` só resolve escopo/policy e a
 * cadeia de auditoria (lacuna 1 do PR-2, dono 07/10: o §2 não o tinha); o arquivo e o registro são da PJ inteira.
 * Ano mínimo 2025: IN RFB 2.237/2024 art. 1º § 1º I (ADR §6). Sem boolean em query (classe z.coerce.boolean).
 */
export const MitExportRequestSchema = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.number().int().min(2025),
    mes: z.number().int().min(1).max(12),
  })
  .strict();
export type MitExportRequest = z.infer<typeof MitExportRequestSchema>;

export const MitExportListQuerySchema = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.coerce.number().int().min(2025),
  })
  .strict();
export type MitExportListQuery = z.infer<typeof MitExportListQuerySchema>;

/** Resposta do POST (201): o arquivo vai só aqui — não é persistido (D12). */
export type MitExportCreatedView = { id: string; nomeArquivo: string; conteudo: string; sha256: string; avisos: string[] };

/** Linha do GET: `defasado` calculado na leitura (item 11, invariante 10). */
export type MitExportView = {
  id: string;
  anoCalendario: number;
  mes: number;
  sha256: string;
  apuracaoIds: string[];
  geradoPorId: string;
  createdAt: string;
  defasado: boolean;
};
