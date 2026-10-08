// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface KitInstallStepsInput {
lastCompletedStep: number
warnings: ("KIT_REFERENTIAL_SKIPPED_NO_REGIME" | "KIT_REFERENTIAL_SKIPPED_NO_CATALOG")[]
}
export interface KitRefInput {
kitKey: string
kitVersion: number
status: ("INSTALLING" | "INSTALLED" | "FAILED")
}
export interface InstallKitInputInput {
kitKey: string
ano: number
regime?: (("MEI" | "SIMPLES" | "PRESUMIDO" | "REAL") | null)
installChartIfEmpty: boolean
openCurrentPeriodIfMissing: boolean
today: string
}
