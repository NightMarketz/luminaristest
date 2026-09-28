// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CompanySignerScopeInput {
unitId: string
}
export interface CompanySignerIdParamInput {
id: string
}
export interface CreateCompanySignerInput {
unitId: string
nome: string
cpf: string
qualifEcd: ("203" | "204" | "205" | "206" | "207" | "220" | "222" | "223" | "226" | "309" | "312" | "313" | "315" | "401" | "801" | "900" | "940" | "999" | "001")
qualifEcf: ("203" | "204" | "205" | "206" | "207" | "220" | "222" | "223" | "226" | "309" | "312" | "313" | "315" | "401" | "801" | "900" | "999")
email: string
fone: string
}
export interface UpdateCompanySignerInput {
unitId: string
nome: string
cpf: string
qualifEcd: ("203" | "204" | "205" | "206" | "207" | "220" | "222" | "223" | "226" | "309" | "312" | "313" | "315" | "401" | "801" | "900" | "940" | "999" | "001")
qualifEcf: ("203" | "204" | "205" | "206" | "207" | "220" | "222" | "223" | "226" | "309" | "312" | "313" | "315" | "401" | "801" | "900" | "999")
email: string
fone: string
}
