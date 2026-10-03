// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export type ReconcilePendingReasonCodeInput = ("FAILED" | "ACCOUNTING_PERIOD_NOT_OPEN" | "MAX_CENTS_EXCEEDED" | "OPENING_ENTRY_MISSING" | "MISSING_PAID_WITH_PACKAGE_ID" | "NO_MAPPER_FOR_UNIT" | "PACKAGE_CONSUMPTION_PENDING" | "PACKAGE_ORIGIN_REVERSED" | "PACKAGE_EXPIRY_NFSE_PENDING")
export interface ListReconcilePendingQueryDtoInput {
unitId: string
reasonCode?: ("FAILED" | "ACCOUNTING_PERIOD_NOT_OPEN" | "MAX_CENTS_EXCEEDED" | "OPENING_ENTRY_MISSING" | "MISSING_PAID_WITH_PACKAGE_ID" | "NO_MAPPER_FOR_UNIT" | "PACKAGE_CONSUMPTION_PENDING" | "PACKAGE_ORIGIN_REVERSED" | "PACKAGE_EXPIRY_NFSE_PENDING")
includeResolved?: (boolean | ("true" | "false"))
cursor?: string
limit?: number
}
export interface RescanReconcilePendingDtoInput {
unitId: string
/**
 * @maxItems 500
 */
ids?: string[]
}
export interface ReconcilePendingItemViewDtoInput {
id: string
sourceType: string
sourceId: string
reasonCode: ("FAILED" | "ACCOUNTING_PERIOD_NOT_OPEN" | "MAX_CENTS_EXCEEDED" | "OPENING_ENTRY_MISSING" | "MISSING_PAID_WITH_PACKAGE_ID" | "NO_MAPPER_FOR_UNIT" | "PACKAGE_CONSUMPTION_PENDING" | "PACKAGE_ORIGIN_REVERSED" | "PACKAGE_EXPIRY_NFSE_PENDING")
reasonDetail: string
firstSeenAt: string
lastSeenAt: string
resolvedAt: (string | null)
attempts: number
}
export interface ReconcilePendingListViewDtoInput {
items: {
id: string
sourceType: string
sourceId: string
reasonCode: ("FAILED" | "ACCOUNTING_PERIOD_NOT_OPEN" | "MAX_CENTS_EXCEEDED" | "OPENING_ENTRY_MISSING" | "MISSING_PAID_WITH_PACKAGE_ID" | "NO_MAPPER_FOR_UNIT" | "PACKAGE_CONSUMPTION_PENDING" | "PACKAGE_ORIGIN_REVERSED" | "PACKAGE_EXPIRY_NFSE_PENDING")
reasonDetail: string
firstSeenAt: string
lastSeenAt: string
resolvedAt: (string | null)
attempts: number
}[]
nextCursor: (string | null)
}
export interface RescanReconcilePendingResultDtoInput {
attempted: number
resolved: number
stillPending: number
}
