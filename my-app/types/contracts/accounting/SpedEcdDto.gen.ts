// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface SpedEcdRequestInput {
unitId: string
mappingVersion: string
year: number
declarant: {
nome: string
cnpj: string
uf: ("AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO")
ie?: string
codMun: string
im?: string
indSitEsp?: ("1" | "2" | "3" | "4")
indSitIniPer?: ("0" | "1" | "2")
indNire: ("0" | "1")
indFinEsc?: ("0" | "1")
codHashSub?: string
indGrandePorte: ("0" | "1")
tipEcd?: ("0" | "1" | "2")
codScp?: string
identMf?: ("S" | "N")
indEscCons?: ("S" | "N")
indCentralizada?: ("0" | "1")
indMudancPc?: ("0" | "1")
codPlanRef?: ("1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10")
}
book: {
numOrd: string
natLivr: string
nire?: string
dtArq?: string
dtArqConv?: string
descMun?: string
dtExSocial: string
}
/**
 * @minItems 1
 */
signers: [{
identNom: string
identCpfCnpj: string
codAssin: ("203" | "204" | "205" | "206" | "207" | "220" | "222" | "223" | "226" | "309" | "312" | "313" | "315" | "401" | "801" | "900" | "940" | "999" | "001")
indCrc?: string
email?: string
fone?: string
ufCrc?: ("AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO")
numSeqCrc?: string
dtCrc?: string
indRespLegal: ("S" | "N")
}, ...({
identNom: string
identCpfCnpj: string
codAssin: ("203" | "204" | "205" | "206" | "207" | "220" | "222" | "223" | "226" | "309" | "312" | "313" | "315" | "401" | "801" | "900" | "940" | "999" | "001")
indCrc?: string
email?: string
fone?: string
ufCrc?: ("AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO")
numSeqCrc?: string
dtCrc?: string
indRespLegal: ("S" | "N")
})[]]
supersedesJobId?: string
verificationTerm?: {
codMotSubs: ("001" | "002" | "003" | "004" | "005" | "099")
descRtf?: string
/**
 * @minItems 1
 * @maxItems 2
 */
signers: [{
identNom: string
identCpfCnpj: string
codAssin: "910"
indCrc: string
email: string
fone: string
ufCrc: ("AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO")
numSeqCrc?: string
dtCrc?: string
}, ...({
identNom: string
identCpfCnpj: string
codAssin: "910"
indCrc: string
email: string
fone: string
ufCrc: ("AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO")
numSeqCrc?: string
dtCrc?: string
})[]]
deadlineJustification?: string
}
}
