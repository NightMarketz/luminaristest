// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ChatInterviewInput {
stage?: string
messages?: {
role?: ("user" | "assistant")
sender?: ("user" | "ai")
content?: string
text?: string
}[]
presetKey?: string
sessionId?: string
choice?: ("create" | "customize")
modules?: (("CRM-0" | "CRM-1" | "CRM-2A" | "CRM-2B" | "CRM-3" | "CRM-CAMP" | "PES-0" | "PES-FORN" | "VEN-0" | "VEN-SERV" | "VEN-PROD" | "VEN-PAC" | "VEN-COM" | "FIN-0" | "FIN-REC" | "FIN-BASE" | "GES-0" | "GES-META") | ("CRM-2" | "PESSOAS" | "VENDAS" | "FINANCEIRO" | "GESTAO"))[]
}
export interface InterviewMessageInput {
role?: ("user" | "assistant")
sender?: ("user" | "ai")
content?: string
text?: string
}
