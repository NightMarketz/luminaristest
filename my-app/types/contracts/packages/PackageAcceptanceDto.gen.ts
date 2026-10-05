// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ValidityNoticeQueryInput {
unitId: string
packageId: string
saleDate: string
}
export interface CreatePackageAcceptanceInput {
unitId: string
saleId: string
textVersion: "v1"
textSha256: string
}
export interface GetPackageAcceptanceQueryInput {
unitId: string
saleId: string
}
export interface PackageSaleReceiptQueryInput {
unitId: string
}
