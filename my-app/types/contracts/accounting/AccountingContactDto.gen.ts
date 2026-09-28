// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface RegisterContactInput {
unitId: string
name: string
email: string
cpf: string
phone?: string
crcNumber: string
crcUf: ("AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO")
crcCertificate?: string
crcCertificateValidUntil?: string
}
export interface UpdateContactInput {
unitId: string
contactId: string
name?: string
email?: string
cpf?: string
phone?: (string | null)
crcNumber?: string
crcUf?: ("AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO")
crcCertificate?: (string | null)
crcCertificateValidUntil?: (string | null)
}
export interface AccountingContactScopeQueryInput {
unitId: string
}
