// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export type EventoNfseInput = ({
tipo: ("e101101" | "e305101" | "e105104" | "e105105" | "e101103")
dhProc: string
} | {
tipo: "e105102"
dhProc: string
chSubstituta: string
cMotivo: ("99" | "01" | "02" | "03" | "04" | "05")
})
export interface EventosTickSummaryInput {
consultadas: number
canceladas: number
substituidasFora: number
ignorados: number
skipped: number
failed: number
avisos: string[]
}
