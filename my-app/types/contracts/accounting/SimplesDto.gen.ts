// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CompetenciaParamInput {
competencia: string
}
export interface SimplesHistoricoUpsertInput {
unitId: string
receitaBrutaCents: number
folhaCents?: (number | null)
sourceDocumentId?: (string | null)
}
export interface SimplesSegregacaoParcelaInput {
natureza: ("SERVICO" | "REVENDA" | "LOCACAO_MOVEL")
receitaCents: number
motivo: ("MONOFASICO" | "ICMS_ST" | "ISS_RETIDO" | "MONOFASICO_E_ICMS_ST")
}
export interface SimplesSegregacaoUpsertInput {
unitId: string
/**
 * @maxItems 50
 */
parcelas: {
natureza: ("SERVICO" | "REVENDA" | "LOCACAO_MOVEL")
receitaCents: number
motivo: ("MONOFASICO" | "ICMS_ST" | "ISS_RETIDO" | "MONOFASICO_E_ICMS_ST")
}[]
}
export interface SalaoParceriaContratoInput {
unitId: string
profissionalContactId: string
cotaSalaoBp: number
naturezaCota: ("ALUGUEL_BEM_MOVEL" | "GESTAO")
homologadoEm: string
sindicato: string
vigenteDesde: string
vigenteAte: (string | null)
}
export interface SalaoParceriaContratoPatchInput {
unitId: string
profissionalContactId?: string
cotaSalaoBp?: number
naturezaCota?: ("ALUGUEL_BEM_MOVEL" | "GESTAO")
homologadoEm?: string
sindicato?: string
vigenteDesde?: string
vigenteAte?: (string | null)
}
export interface SimplesUnitQueryInput {
unitId: string
}
export interface SimplesIdParamInput {
id: string
}
