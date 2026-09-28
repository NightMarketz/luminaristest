// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ServiceFiscalProfileScopeQueryInput {
unitId: string
}
export interface ServiceFiscalProfileParamsInput {
serviceRef: string
}
export interface UpsertServiceFiscalProfileInput {
unitId: string
cTribNac: string
cTribMun?: (string | null)
cNBS?: (string | null)
cIndOp?: string
cLocPrestacao?: (string | null)
xDescServ?: (string | null)
}
