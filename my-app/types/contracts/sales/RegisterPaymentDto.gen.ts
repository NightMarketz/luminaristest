// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface RegisterPaymentInput {
tableId: string
saleId: string
paymentMethod: ("Credit Card" | "Debit Card" | "Cash" | "Pix" | "Package Balance")
paidAt?: string
paymentReference?: string
packageId?: string
}
