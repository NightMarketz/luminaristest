// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface AtivarModuloInput {
unitId: string
moduleKey: ("DP-PONTO" | "DP-PAG" | "DP-BEN" | "DP-ADM" | "DP-APP" | "DP-DES" | "DP-GED" | "DP-CAT" | "DP-BI")
competenciaInicio: string
motivo: string
}
export interface DpIdParamInput {
id: string
}
export interface DpScopeQueryInput {
unitId: string
}
export interface EncerrarModuloInput {
unitId: string
competenciaFim: string
motivo: string
}
