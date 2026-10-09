// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface IssBeneficioMunicipalCreateDtoInput {
unitId: string
codMun: string
/**
 * @maxItems 50
 */
cTribNacPrefixos?: string[]
tipo: ("ISENCAO" | "REDUCAO_PERCENTUAL" | "VALOR_FIXO")
reducaoBpPorFaixa: ([number, ...(number)[]] | null)
legislacao: string
vigenteDesde: string
vigenteAte?: (string | null)
}
export interface IssBeneficioMunicipalScopeQueryInput {
unitId: string
}
export interface IssBeneficioMunicipalIdParamInput {
id: string
}
