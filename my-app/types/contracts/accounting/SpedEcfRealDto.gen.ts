// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface SpedEcfRealRequestInput {
unitId: string
year: number
declarant: {
cnpj: string
nome: string
codNat: string
cnaeFiscal: string
endereco: string
num?: string
compl?: string
bairro: string
uf: ("AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO")
codMun: string
cep: string
numTel?: string
email: string
}
fiscal: {
formaTrib?: string
formaTribPer: string
codVer?: string
formaApur?: ("T" | "A")
indAliqCsll?: ("1" | "3" | "4" | "7" | "8")
indRecReceita?: ("1" | "2")
}
/**
 * @minItems 1
 * @maxItems 2
 */
signers: [{
identNom: string
identCpfCnpj: string
identQualif: ("203" | "204" | "205" | "206" | "207" | "220" | "222" | "223" | "226" | "309" | "312" | "313" | "315" | "401" | "801" | "900" | "999")
indCrc?: string
email: string
fone: string
}, ...({
identNom: string
identCpfCnpj: string
identQualif: ("203" | "204" | "205" | "206" | "207" | "220" | "222" | "223" | "226" | "309" | "312" | "313" | "315" | "401" | "801" | "900" | "999")
indCrc?: string
email: string
fone: string
})[]]
retificadora?: ("N" | "S")
numRec?: string
supersedesJobId?: string
deadlineJustification?: string
}
