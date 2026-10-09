// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface BuildDeliveryPackageInput {
unitId: string
ecdJobId: string
ecfJobId: string
/**
 * @maxItems 20
 */
extraJobIds?: string[]
}
export interface ConfirmDeliveryInput {
unitId: string
ecdJobId: string
ecfJobId: string
contactId: string
confirmed: true
/**
 * @maxItems 20
 */
extraJobIds?: string[]
}
export interface PackageProfileInput {
/**
 * @maxItems 20
 */
kinds: ("EXPORT_TRIAL_BALANCE" | "EXPORT_GENERAL_LEDGER" | "EXPORT_BALANCE_SHEET" | "EXPORT_INCOME_STATEMENT" | "EXPORT_BANK_RECONCILIATION" | "EXPORT_ENTRY_SAMPLE" | "EXPORT_TAX_ASSESSMENT_MEMO" | "EXPORT_ISS_BY_COMPETENCE")[]
}
export interface PackageProfileQueryInput {
unitId: string
contactId: string
}
export interface RetryDeliveryInput {
unitId: string
deliveryId: string
}
export interface AccountingDeliveryScopeQueryInput {
unitId: string
}
export interface ListDeliveriesQueryInput {
unitId: string
status?: ("QUEUED" | "SENT" | "FAILED")
year?: number
page?: number
limit?: number
}
