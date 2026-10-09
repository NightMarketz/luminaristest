// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface PayerAddressInput {
streetName: string
streetNumber: string
zipCode: string
neighborhood: string
city: string
state: string
}
export interface PayerInput {
firstName: string
lastName: string
email: string
identification: {
type: ("CPF" | "CNPJ")
number: string
}
address?: {
streetName: string
streetNumber: string
zipCode: string
neighborhood: string
city: string
state: string
}
}
export interface CreateChargeInput {
unitId: string
kind: ("BOLETO" | "PIX")
expiresInDays?: number
expiresInMinutes?: number
payer: {
firstName: string
lastName: string
email: string
identification: {
type: ("CPF" | "CNPJ")
number: string
}
address?: {
streetName: string
streetNumber: string
zipCode: string
neighborhood: string
city: string
state: string
}
}
}
export interface CollectionChargeScopeQueryInput {
unitId: string
}
export interface CancelChargeInput {
unitId: string
}
export interface CollectionWebhookParamsInput {
provider: string
accountId: string
}
