// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface IbsCbsAssessmentConfirmInput {
unitId: string
anoCalendario: number
mes: number
tributo: ("IBS" | "CBS")
expectedSupersedesId: (string | null)
}
export interface IbsCbsAssessmentListQueryInput {
unitId: string
anoCalendario: number
}
export interface IbsCbsAssessmentPreviewInput {
unitId: string
anoCalendario: number
mes: number
tributo: ("IBS" | "CBS")
}
export interface IbsCbsAssessmentScopeQueryInput {
unitId: string
}
export type MemoriaIbsCbsInput = {
codigo: string
descricao: string
valorCents: string
fonte: string
}[]
export type MemoriaLinhaIbsCbsKindInput = ("DEBITO_DOC" | "DIVERGENCIA_DOC" | "VENDA_SEM_DOCUMENTO" | "DOCUMENTOS_SEM_GRUPO" | "CONFERENCIA_SEM_ALIQUOTA" | "CONFERENCIA_SEM_BASE" | "RECLASSIFICACAO_SERVICO" | "RECLASSIFICACAO_REVENDA" | "RECEITA_BRUTA_ATE_APURACAO" | "CREDITO_ENTRADA" | "CREDITO_NAO_APROPRIADO" | "USO_CONSUMO_PESSOAL" | "ANTECIPACAO_ART10" | "ANTECIPACAO_SEM_REDUCAO" | "ACERTO_ART10" | "PAGAMENTO_INDEVIDO_ART38" | "CBS_ALIQUOTA_PROVISORIA" | "SPLIT_EXTINCAO" | "CLASSE_PROVISORIA_P_IBS_4" | "SALDO")
export interface MemoriaLinhaIbsCbsInput {
codigo: string
descricao: string
valorCents: string
fonte: string
}
