// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export type PaymentAccountConfigInput = {
provider: "MERCADO_PAGO"
credentialSource: ("OWN" | "OAUTH")
}
export interface CreatePaymentAccountInput {
unitId: string
provider: "MERCADO_PAGO"
label: string
glAccountId: string
config: {
provider: "MERCADO_PAGO"
credentialSource: ("OWN" | "OAUTH")
}
}
export interface UpdatePaymentAccountInput {
unitId: string
label?: string
status?: ("ACTIVE" | "DISABLED")
}
export interface SetCredentialInput {
unitId: string
accessToken: string
webhookSecret: string
}
export interface PaymentAccountScopeQueryInput {
unitId: string
}
