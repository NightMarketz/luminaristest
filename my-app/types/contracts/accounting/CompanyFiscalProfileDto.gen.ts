// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CompanyFiscalProfileAnoParamInput {
ano: number
}
export interface CompanyFiscalProfileCopyParamInput {
ano: number
anoAnterior: number
}
export interface CompanyFiscalProfileScopeInput {
unitId: string
}
export interface EcfTransmitidaInput {
unitId: string
recibo: string
}
export interface CompanyDeclaranteInput {
nome?: string
cnpj?: string
uf?: ("AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO")
codMun?: string
ie?: string
im?: string
codNat?: string
cnaeFiscal?: string
endereco?: string
num?: string
compl?: string
bairro?: string
cep?: string
numTel?: string
email?: string
}
export interface UpsertCompanyFiscalProfileInput {
unitId: string
regime: ("MEI" | "SIMPLES" | "PRESUMIDO" | "REAL")
grandePorte?: (boolean | null)
inativa?: boolean
condicoes?: {
aporteInvestidorAnjo?: (boolean | null)
livroCaixaSemEscrituracao?: (boolean | null)
distribuicaoAcimaBase?: (boolean | null)
}
declarante?: ({
nome?: string
cnpj?: string
uf?: ("AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO")
codMun?: string
ie?: string
im?: string
codNat?: string
cnaeFiscal?: string
endereco?: string
num?: string
compl?: string
bairro?: string
cep?: string
numTel?: string
email?: string
} | null)
ecd?: ({
indNire: ("0" | "1")
nire?: string
numOrd: string
natLivr: string
} | null)
ecf?: ({
indAliqCsll: ("1" | "4")
indRecReceita: ("1" | "2")
} | null)
contadorContactId?: (string | null)
representanteLegalSignerId?: (string | null)
formaApuracaoIrpjCsll?: (("TRIMESTRAL" | "ANUAL") | null)
lucroRealObrigatorio?: (boolean | null)
inicioAtividadeEm?: (string | null)
encerramentoAtividadeEm?: (string | null)
lc224AcrescimoSuspenso?: boolean
lc224LiminarReferencia?: (string | null)
prestadoraExclusivaServicos?: boolean
declaraNaoProfissaoRegulamentada?: boolean
ibsCbsOpcaoS1?: (("DAS" | "REGULAR") | null)
ibsCbsOpcaoS2?: (("DAS" | "REGULAR") | null)
meiContribuinteIcms?: (boolean | null)
meiContribuinteIss?: (boolean | null)
}
export interface OnboardingFiscalInput {
regime: ("MEI" | "SIMPLES" | "PRESUMIDO" | "REAL" | "NAO_SEI")
grandePorte?: (boolean | null)
}
