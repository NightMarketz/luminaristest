// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface AuthorizePscInput {
pscProviderId: string
/**
 * @minItems 1
 */
escopo: [("NFSE_DPS" | "NFE" | "NFCE"), ...(("NFSE_DPS" | "NFE" | "NFCE"))[]]
}
export interface CreatePscProviderInput {
nome: string
baseUrl: string
clientId: string
clientSecret: string
cotaAnual?: (number | null)
lifetimeMaxSegundos?: (number | null)
/**
 * @minItems 1
 */
algoritmos: [string, ...(string)[]]
habilitadoEm?: (string | null)
}
export interface PscAuthorizeResultInput {
authorizationUrl: string
expiresAt: string
}
export interface PscCallbackQueryInput {
code?: string
state: string
error?: string
}
export interface PscCredentialViewInput {
unitId: string
psc: string
titularCnpj: string
certNotAfter: string
tokenExpiraEm: string
consumoNoAno: number
cotaAnual: (number | null)
avisos: string[]
}
export interface PscProviderViewInput {
id: string
nome: string
baseUrl: string
clientId: string
temClientSecret: boolean
cotaAnual: (number | null)
lifetimeMaxSegundos: (number | null)
algoritmos: string[]
habilitadoEm: (string | null)
}
export interface UpdatePscProviderInput {
nome?: string
baseUrl?: string
clientId?: string
clientSecret?: string
cotaAnual?: (number | null)
lifetimeMaxSegundos?: (number | null)
/**
 * @minItems 1
 */
algoritmos?: [string, ...(string)[]]
habilitadoEm?: (string | null)
}
