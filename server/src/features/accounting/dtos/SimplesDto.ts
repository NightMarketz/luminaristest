import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { MAX_CENTS } from '../models/money';
import { SEGREGACAO_EXCLUI, type TributoSimples } from '../models/simplesCalc';

/**
 * BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, BRIEF itens 10–14; contrato §3) — entradas da apuração. Tudo `.strict()`;
 * centavos inteiros ≤ MAX_CENTS na API (BigInt na persistência); sem `.default` nos schemas de PUT/PATCH (memória
 * zod4-partial-aplica-default). `unitId` vem no corpo: a chave é (PJ, unidade, competência).
 */
const cents = z.number().int().min(0).max(MAX_CENTS);
const dateOnly = (field: string) => z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

export const CompetenciaParamSchema = z.object({ competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'competência = YYYY-MM') }).strict();

/** Item 10/11 — PUT /api/accounting/simples/historico/:competencia. */
export const SimplesHistoricoUpsertSchema = z
  .object({
    unitId: z.string().min(1),
    receitaBrutaCents: cents,
    folhaCents: cents.nullable().optional(),
    sourceDocumentId: z.string().min(1).nullable().optional(),
  })
  .strict();
export type SimplesHistoricoUpsert = z.infer<typeof SimplesHistoricoUpsertSchema>;

/**
 * Item 12 — uma parcela da receita do mês e o motivo legal pelo qual parte do DAS não incide sobre ela. Monofásico
 * (PIS/COFINS) e ICMS-ST são indicações independentes da mesma receita (Res. CGSN 140 art. 25 §§ 6º e 8º), então a
 * declaração é por combinação, não por 4 totais (decisão pela lei, dono 07/10: "depende da lei"). Os tributos
 * excluídos derivam do motivo (`excluirDoMotivo`), nunca são digitados. ISS devido a outro município não é motivo:
 * continua no DAS (LC 123 art. 18 § 4º-A V).
 */
export const MOTIVOS_SEGREGACAO = ['MONOFASICO', 'ICMS_ST', 'ISS_RETIDO', 'MONOFASICO_E_ICMS_ST'] as const;
export type MotivoSegregacao = (typeof MOTIVOS_SEGREGACAO)[number];
export function excluirDoMotivo(m: MotivoSegregacao): TributoSimples[] {
  if (m === 'MONOFASICO') return [...SEGREGACAO_EXCLUI.monofasico];
  if (m === 'ICMS_ST') return [...SEGREGACAO_EXCLUI.icmsSt];
  if (m === 'ISS_RETIDO') return [...SEGREGACAO_EXCLUI.issRetido];
  return [...SEGREGACAO_EXCLUI.monofasico, ...SEGREGACAO_EXCLUI.icmsSt];
}

export const SimplesSegregacaoParcelaSchema = z
  .object({
    natureza: z.enum(['SERVICO', 'REVENDA', 'LOCACAO_MOVEL']),
    receitaCents: cents.refine((v) => v > 0, 'receita da parcela > 0'),
    motivo: z.enum(MOTIVOS_SEGREGACAO),
  })
  .strict();
export type SimplesSegregacaoParcela = z.infer<typeof SimplesSegregacaoParcelaSchema>;

export const SimplesSegregacaoUpsertSchema = z
  .object({ unitId: z.string().min(1), parcelas: z.array(SimplesSegregacaoParcelaSchema).max(50) })
  .strict();
export type SimplesSegregacaoUpsert = z.infer<typeof SimplesSegregacaoUpsertSchema>;

const parceriaCampos = {
  unitId: z.string().min(1),
  profissionalContactId: z.string().min(1),
  cotaSalaoBp: z.number().int().min(1).max(9999),
  naturezaCota: z.enum(['ALUGUEL_BEM_MOVEL', 'GESTAO']),
  homologadoEm: dateOnly('homologadoEm'),
  sindicato: z.string().trim().min(1).max(200),
  vigenteDesde: dateOnly('vigenteDesde'),
  vigenteAte: dateOnly('vigenteAte').nullable(),
};
const vigenciaOrdenada = (v: { vigenteDesde?: string; vigenteAte?: string | null }) =>
  !v.vigenteDesde || !v.vigenteAte || v.vigenteAte >= v.vigenteDesde;

/** Item 13 — POST /api/accounting/simples/parcerias. */
export const SalaoParceriaContratoSchema = z
  .object(parceriaCampos)
  .strict()
  .refine(vigenciaOrdenada, { message: 'vigenteAte antes de vigenteDesde', path: ['vigenteAte'] });
export type SalaoParceriaContratoInput = z.infer<typeof SalaoParceriaContratoSchema>;

/** PATCH /api/accounting/simples/parcerias/:id — `unitId` obrigatório (escopo), o resto parcial, sem default. */
export const SalaoParceriaContratoPatchSchema = z
  .object({ ...parceriaCampos, unitId: z.string().min(1) })
  .partial()
  .required({ unitId: true })
  .strict()
  .refine(vigenciaOrdenada, { message: 'vigenteAte antes de vigenteDesde', path: ['vigenteAte'] });
export type SalaoParceriaContratoPatch = z.infer<typeof SalaoParceriaContratoPatchSchema>;

export const SimplesUnitQuerySchema = z.object({ unitId: z.string().min(1) }).strict();
export const SimplesIdParamSchema = z.object({ id: z.string().min(1) }).strict();

export type SimplesHistoricoView = {
  id: string;
  unitId: string;
  competencia: string;
  receitaBrutaCents: number;
  folhaCents: number | null;
  sourceDocumentId: string | null;
  updatedAt: string;
};
export type SimplesSegregacaoView = {
  id: string;
  unitId: string;
  competencia: string;
  parcelas: Array<SimplesSegregacaoParcela & { excluir: TributoSimples[] }>;
  updatedAt: string;
};
export type SalaoParceriaContratoView = {
  id: string;
  unitId: string;
  profissionalContactId: string;
  cotaSalaoBp: number;
  naturezaCota: 'ALUGUEL_BEM_MOVEL' | 'GESTAO';
  homologadoEm: string;
  sindicato: string;
  vigenteDesde: string;
  vigenteAte: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * BE-INCR-SIMPLES-NACIONAL PR-3 (nó X14, item 19; contrato §3) — PUT /api/accounting/simples/apuracoes/:competencia/das.
 * O DAS oficial (número, valor, vencimento e o PDF já anexado como `SourceDocument`) e a persistência da apuração.
 */
export const SimplesDasRegistroSchema = z
  .object({
    unitId: z.string().min(1),
    numeroDocumento: z.string().trim().min(1).max(40),
    valorCents: cents.refine((v) => v > 0, 'valor do DAS > 0'),
    vencimento: dateOnly('vencimento'),
    sourceDocumentId: z.string().min(1).nullable().optional(),
  })
  .strict();
export type SimplesDasRegistro = z.infer<typeof SimplesDasRegistroSchema>;
