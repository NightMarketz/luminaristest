// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface WithholdingProfileScopeInput {
unitId: string
}
export interface WithholdingProfileIdParamInput {
id: string
}
export interface ListWithholdingProfilesQueryInput {
unitId: string
counterpartyId?: string
}
export interface CreateWithholdingProfileInput {
unitId: string
naturezaServico: ("SERVICO_PROFISSIONAL" | "LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO" | "COMISSAO_PROPAGANDA" | "CESSAO_MAO_DE_OBRA" | "TRABALHO_NAO_ASSALARIADO_PF" | "OUTRO")
natRend?: (string | null)
irrf: boolean
csrf: boolean
inss: boolean
issRetido: boolean
inssTpServico?: (string | null)
inssCprb?: (boolean | null)
issCodMun?: (string | null)
issAliquotaBp?: (number | null)
issVencimentoDia?: (number | null)
fonte: string
vigenteDesde: string
vigenteAte?: (string | null)
counterpartyId: string
}
export interface UpdateWithholdingProfileInput {
unitId: string
naturezaServico: ("SERVICO_PROFISSIONAL" | "LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO" | "COMISSAO_PROPAGANDA" | "CESSAO_MAO_DE_OBRA" | "TRABALHO_NAO_ASSALARIADO_PF" | "OUTRO")
natRend?: (string | null)
irrf: boolean
csrf: boolean
inss: boolean
issRetido: boolean
inssTpServico?: (string | null)
inssCprb?: (boolean | null)
issCodMun?: (string | null)
issAliquotaBp?: (number | null)
issVencimentoDia?: (number | null)
fonte: string
vigenteDesde: string
vigenteAte?: (string | null)
}
