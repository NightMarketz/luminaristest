import { z } from 'zod';

/**
 * Query DTO — GET /api/accounting/sped/qualif-assinante?unitId=&layout=ECD|ECF (FE-INCR-SPED-SIGNERS,
 * F-FE-SG-1 → a: uma rota serve a Tabela de Qualificação do Assinante, um dono só — o FE nunca copia
 * a const). `layout` escolhe a tabela: J930 (ECD) e 0930 (ECF) são diferentes (F-C12-2 → a).
 * Query não é `.strict()` (padrão `LalurCatalogQuerySchema`).
 */
export const SpedQualifAssinanteQuerySchema = z.object({
  unitId: z.string().min(1),
  layout: z.enum(['ECD', 'ECF']),
});

export type SpedQualifAssinanteQueryInput = z.infer<typeof SpedQualifAssinanteQuerySchema>;
