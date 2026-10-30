// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ContingenciaTickSummaryInput {
transmitidas: number
semComunicacao: number
pertoDoPrazo: number
vencidas: number
saidasAutomaticas: number
orfasResolvidas: number
orfasFalharam: number
failed: number
}
export interface NfceContingenciaViewInput {
unitId: string
ambiente: ("producao" | "homologacao")
ativa: boolean
origem: (("AUTO" | "MANUAL") | null)
dhCont: (string | null)
xJust: (string | null)
}
export interface PutNfceContingenciaInput {
ambiente: ("producao" | "homologacao")
ativa: boolean
xJust?: string
}
