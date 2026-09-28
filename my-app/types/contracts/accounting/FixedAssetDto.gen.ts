// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateFixedAssetInput {
unitId: string
classId: string
code: string
description: string
ncmPrefix?: string
quantity?: number
costCents: number
residualValueCents?: number
acquiredAt: string
rateId?: string
annualRateBp?: number
bookAnnualRateBp?: number
bookRateJustification?: string
}
export interface UpdateFixedAssetInput {
unitId: string
assetId: string
classId?: string
code?: string
description?: string
ncmPrefix?: (string | null)
quantity?: number
costCents?: number
residualValueCents?: number
acquiredAt?: string
rateId?: string
annualRateBp?: number
bookAnnualRateBp?: (number | null)
bookRateJustification?: (string | null)
}
export interface ActivateFixedAssetInput {
unitId: string
assetId: string
activatedAt: string
openingAccumulatedCents?: number
version: number
}
export interface DisposeFixedAssetInput {
unitId: string
assetId: string
disposedAt: string
proceedsCents: number
counterpartAccountId?: string
version: number
}
export interface ListFixedAssetsQueryInput {
unitId: string
status?: ("PENDING_ACTIVATION" | "ACTIVE" | "FULLY_DEPRECIATED" | "DISPOSED")
classId?: string
}
export interface FixedAssetScopeQueryInput {
unitId: string
}
export interface DeleteFixedAssetInput {
unitId: string
assetId: string
}
