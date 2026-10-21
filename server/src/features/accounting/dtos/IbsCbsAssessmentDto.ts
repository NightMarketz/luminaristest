import { z } from 'zod';

/**
 * IBS-CBS-2027 PR-2 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` §4.2, itens 9, 10, 13) — `.strict()`.
 * `unitId` = unidade lida (escopo/policy + proveniência), como nos DTOs do X7/X8: o resolver de escopo exige a unidade.
 * `anoCalendario < 2027` ⇒ 400 nomeado já na borda (F-IBS-7 b; o serviço repete).
 */
export const IBS_CBS_ANTES_DE_2027 = 'apuração de IBS/CBS começa em 01/2027 — F-IBS-7 (b), dispensa do art. 348 § 1º';

const AnoCalendario = z.number().int().min(2027, { message: IBS_CBS_ANTES_DE_2027 });

const PreviewFields = {
  unitId: z.string().min(1),
  anoCalendario: AnoCalendario,
  mes: z.number().int().min(1).max(12),
  tributo: z.enum(['IBS', 'CBS']),
};

export const IbsCbsAssessmentPreviewSchema = z.object(PreviewFields).strict();
export type IbsCbsAssessmentPreviewInput = z.infer<typeof IbsCbsAssessmentPreviewSchema>;

/** `expectedSupersedesId` = o id CONFIRMED vivo do (mês, tributo) que esta substitui, ou null para a 1ª — divergente ⇒ 409. */
export const IbsCbsAssessmentConfirmSchema = z.object({ ...PreviewFields, expectedSupersedesId: z.string().min(1).nullable() }).strict();
export type IbsCbsAssessmentConfirmInput = z.infer<typeof IbsCbsAssessmentConfirmSchema>;

export const IbsCbsAssessmentListQuerySchema = z
  .object({ unitId: z.string().min(1), anoCalendario: z.coerce.number().int().min(2027, { message: IBS_CBS_ANTES_DE_2027 }) })
  .strict();
export type IbsCbsAssessmentListQuery = z.infer<typeof IbsCbsAssessmentListQuerySchema>;

/** Query do reconcile (item 12): só a unidade do escopo. */
export const IbsCbsAssessmentScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

/** Códigos da memória (BRIEF §4.2) + as linhas da reclassificação do item 12 (RECLASSIFICACAO_*, RECEITA_BRUTA_ATE_APURACAO). */
export const MemoriaLinhaIbsCbsKind = z.enum([
  'DEBITO_DOC', 'DIVERGENCIA_DOC', 'VENDA_SEM_DOCUMENTO', 'DOCUMENTOS_SEM_GRUPO',
  'CREDITOS_NAO_IMPLEMENTADOS_PR3', 'CONFERENCIA_SEM_ALIQUOTA', 'CONFERENCIA_SEM_BASE',
  'RECLASSIFICACAO_SERVICO', 'RECLASSIFICACAO_REVENDA', 'RECEITA_BRUTA_ATE_APURACAO',
  'CREDITO_ENTRADA', 'CREDITO_NAO_APROPRIADO', 'USO_CONSUMO_PESSOAL',
  'ANTECIPACAO_ART10', 'ACERTO_ART10', 'PAGAMENTO_INDEVIDO_ART38',
  'SPLIT_EXTINCAO',
  'CLASSE_PROVISORIA_P_IBS_4', 'SALDO',
]);

/** Linha da memória (schema do X7) com o código restrito ao enum (sufixo `_n` por documento). */
export const MemoriaLinhaIbsCbsSchema = z
  .object({
    codigo: z.string().refine((c) => MemoriaLinhaIbsCbsKind.safeParse(c.replace(/^(DEBITO_DOC|DIVERGENCIA_DOC)_\d+$/, '$1')).success, { message: 'código de memória fora do enum' }),
    descricao: z.string(),
    valorCents: z.string().regex(/^-?\d+$/),
    fonte: z.string(),
  })
  .strict();
export const MemoriaIbsCbsSchema = z.array(MemoriaLinhaIbsCbsSchema);
