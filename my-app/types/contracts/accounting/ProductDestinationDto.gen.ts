// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface UpsertProductDestinationInput {
unitId: string
productRef: string
destination: ("REVENDA" | "INSUMO_SERVICO")
}
export interface ListProductDestinationsQueryInput {
unitId: string
}
export interface ProductDestinationParamsInput {
productRef: string
}
export interface ProductDestinationViewInput {
productRef: string
destination: ("REVENDA" | "INSUMO_SERVICO")
updatedAt: string
}
