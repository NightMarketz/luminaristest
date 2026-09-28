// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface LalurProcessoInput {
indProc: ("1" | "2")
numProc: string
}
export interface CreateLalurEntryInput {
unitId: string
year: number
quarter: ("T01" | "T02" | "T03" | "T04")
livro: ("lalur" | "lacs" | "n500" | "n630" | "n670")
codigo: string
valorCents: number
histLancamento?: string
indRelacao?: ("1" | "2" | "3" | "4")
parteBId?: string
accountId?: string
/**
 * @maxItems 50
 */
processos?: {
indProc: ("1" | "2")
numProc: string
}[]
/**
 * @maxItems 200
 */
journalEntryIds?: string[]
}
export interface UpdateLalurEntryInput {
unitId: string
valorCents?: number
histLancamento?: (string | null)
indRelacao?: ("1" | "2" | "3" | "4")
parteBId?: (string | null)
accountId?: (string | null)
/**
 * @maxItems 50
 */
processos?: {
indProc: ("1" | "2")
numProc: string
}[]
/**
 * @maxItems 200
 */
journalEntryIds?: string[]
}
export interface ArchiveLalurInput {
unitId: string
}
export interface ListLalurEntriesQueryInput {
unitId: string
year?: number
quarter?: ("T01" | "T02" | "T03" | "T04")
livro?: ("lalur" | "lacs" | "n500" | "n630" | "n670")
includeArchived?: (boolean | ("true" | "false"))
}
export interface CreateLalurParteBAccountInput {
unitId: string
codCtaB: string
descricao: string
dtCriacao: string
codPbRfb: string
dtLimite?: string
codTributo: ("I" | "C")
saldoIniCents: number
indSaldoIni: ("D" | "C")
cnpjSitEsp?: string
}
export interface UpdateLalurParteBAccountInput {
unitId: string
descricao?: string
dtCriacao?: string
codPbRfb?: string
dtLimite?: (string | null)
saldoIniCents?: number
indSaldoIni?: ("D" | "C")
cnpjSitEsp?: (string | null)
}
export interface ListLalurParteBQueryInput {
unitId: string
codTributo?: ("I" | "C")
includeArchived?: (boolean | ("true" | "false"))
}
export interface CreateLalurParteBMovementInput {
unitId: string
parteBId: string
year: number
quarter: ("T01" | "T02" | "T03" | "T04")
valorCents: number
indicador: ("CR" | "DB" | "PF" | "BC")
contrapartidaId?: string
historico: string
indLanAnt: ("S" | "N")
/**
 * @maxItems 50
 */
processos?: {
indProc: ("1" | "2")
numProc: string
}[]
}
export interface UpdateLalurParteBMovementInput {
unitId: string
valorCents?: number
indicador?: ("CR" | "DB" | "PF" | "BC")
contrapartidaId?: (string | null)
historico?: string
indLanAnt?: ("S" | "N")
/**
 * @maxItems 50
 */
processos?: {
indProc: ("1" | "2")
numProc: string
}[]
}
export interface ListLalurParteBMovementsQueryInput {
unitId: string
year?: number
quarter?: ("T01" | "T02" | "T03" | "T04")
parteBId?: string
includeArchived?: (boolean | ("true" | "false"))
}
export interface LalurParteBPeriodInput {
unitId: string
year: number
quarter: ("T01" | "T02" | "T03" | "T04")
}
export interface LalurParteBBalancesQueryInput {
unitId: string
year: number
}
export interface LalurCatalogQueryInput {
unitId: string
livro?: ("lalur" | "lacs" | "n500" | "n630" | "n670")
aba?: "PARTEB_PADRAO"
year?: number
q?: string
tributo?: ("I" | "C")
}
