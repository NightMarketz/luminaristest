// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface GetAccountingScopeSettingsQueryInput {
unitId: string
}
export interface UpdateAccountingScopeSettingsInput {
unitId: string
bankChargeExpenseAccountId?: (string | null)
bankChargeIncomeAccountId?: (string | null)
depreciationExpenseAccountId?: (string | null)
disposalGainAccountId?: (string | null)
disposalLossAccountId?: (string | null)
depreciationParteBAccountId?: (string | null)
providerFeeExpenseAccountId?: (string | null)
}
export interface ScopeSettingsPolicyPayloadInput {
bankChargeExpenseAccountId?: (string | null)
bankChargeIncomeAccountId?: (string | null)
depreciationExpenseAccountId?: (string | null)
disposalGainAccountId?: (string | null)
disposalLossAccountId?: (string | null)
depreciationParteBAccountId?: (string | null)
providerFeeExpenseAccountId?: (string | null)
}
