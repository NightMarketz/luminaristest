// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export type PendingAttachmentStatusInput = ("PENDING" | "DONE" | "FAILED" | "DISCARDED")
export interface PendingAttachmentResultInput {
chaveOuCodigo: string
nNFSe: (string | null)
numero: (string | null)
valores: ({
vIssCents?: string
aliqIssBp?: number
vIbsCents?: string
vCbsCents?: string
baseIssCents?: string
} | null)
}
export interface PendingAttachmentDrainSummaryInput {
total: number
done: number
failed: number
discarded: number
}
