import { z } from 'zod';
import type { MemoriaLinha } from '../models/taxAssessmentCalc';

/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF §2 "DTOs") — preview, confirmação e leitura da apuração trimestral de
 * IRPJ/CSLL. Zod `.strict()`; centavos como string de dígitos (BigInt na persistência).
 *
 * `unitId` na query dos GET (lacuna de spec L-B, decisão do dono 04/10): só resolve escopo/policy, como no perfil da
 * empresa (X13); a listagem filtra pela PJ.
 */

const Cents = z.string().regex(/^\d+$/, 'centavos: só dígitos');
const Periodo = z.enum(['T01', 'T02', 'T03', 'T04']);

export const TaxAssessmentDeducaoSchema = z
  .object({
    tributo: z.enum(['IRPJ', 'CSLL']),
    tipo: z.enum(['IRRF', 'CSLL_RETIDA', 'OUTRA']),
    valorCents: Cents,
    documento: z.string().max(120).optional(),
  })
  .strict()
  .refine((d) => d.tipo !== 'OUTRA' || !!d.documento, { message: 'OUTRA exige documento' })
  .refine((d) => (d.tipo === 'IRRF') === (d.tributo === 'IRPJ') || d.tipo === 'OUTRA', { message: 'IRRF↔IRPJ, CSLL_RETIDA↔CSLL' });

export const TaxAssessmentPreviewSchema = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.number().int().min(2025),
    periodo: Periodo,
    deducoes: z.array(TaxAssessmentDeducaoSchema).max(50).default([]),
  })
  .strict();
export type TaxAssessmentPreviewInput = z.infer<typeof TaxAssessmentPreviewSchema>;

export const TaxAssessmentConfirmSchema = TaxAssessmentPreviewSchema.extend({
  expectedAPagarCents: z.object({ IRPJ: Cents, CSLL: Cents }).strict(),
  supersedesIds: z.array(z.string().min(1)).max(2).optional(),
}).strict();
export type TaxAssessmentConfirmInput = z.infer<typeof TaxAssessmentConfirmSchema>;

export const TaxAssessmentListQuerySchema = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.coerce.number().int(),
    periodo: Periodo.optional(),
    status: z.enum(['CONFIRMED', 'SUPERSEDED']).optional(),
  })
  .strict(); // sem boolean em query string (classe z.coerce.boolean)
export type TaxAssessmentListQuery = z.infer<typeof TaxAssessmentListQuerySchema>;

/** GET …/:id — só o escopo. */
export const TaxAssessmentScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

// ─── Saída (contrato §2) ─────────────────────────────────────────────────────────────────────────────────────

export interface TaxAssessmentView {
  id: string;
  tributo: 'IRPJ' | 'CSLL';
  periodo: string;
  modo: string;
  codigoReceita: string;
  baseCents: string;
  devidoCents: string;
  deducoesCents: string;
  aPagarCents: string;
  saldoNegativoCents: string;
  status: 'CONFIRMED' | 'SUPERSEDED';
  supersedesId: string | null;
  provisaoPendente: boolean;
  tabelaVersao: string;
  memoria: MemoriaLinha[];
  confirmedAt: string;
}

export type TaxAssessmentCalcView = Omit<TaxAssessmentView, 'id' | 'status' | 'supersedesId' | 'provisaoPendente' | 'confirmedAt'>;

export interface TaxAssessmentPreviewView {
  irpj: TaxAssessmentCalcView;
  csll: TaxAssessmentCalcView;
  provisaoContasConfiguradas: boolean;
  avisos: string[];
}
