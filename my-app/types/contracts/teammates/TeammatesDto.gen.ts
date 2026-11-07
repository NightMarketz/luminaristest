// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export type ActionClassInput = ("LIVRE" | "PROPOSTA" | "PROIBIDA")
export interface ChannelPostInput {
content: string
threadId?: string
}
export interface LlmCredentialCreateInput {
provider: ("anthropic" | "openai" | "gemini")
apiKey: string
monthlyTokenBudget?: number
}
export interface LlmCredentialReadInput {
id: string
provider: ("anthropic" | "openai" | "gemini")
last4: string
monthlyTokenBudget: (number | null)
createdAt: string
}
export type LlmProviderIdInput = ("anthropic" | "openai" | "gemini")
export interface McpServerCreateInput {
name: string
url: string
token?: string
}
export interface ProposalListQueryInput {
status?: ("PENDING" | "EXECUTED" | "REJECTED" | "EXPIRED")
}
export type ProposalPayloadInput = ({
kind: "TABLE_ROW"
action: ("CREATE" | "UPDATE" | "DELETE")
tableId: string
data: {
[k: string]: unknown
}
} | {
kind: "SETTLEMENT_MATCH"
statementLineId: string
targetType: ("RECEIVABLE" | "PAYABLE" | "ACQUIRER")
targetId: string
amountCents: string
rationale: string
} | {
kind: "MCP_TOOL_CALL"
mcpServerId: string
tool: string
arguments: {
[k: string]: unknown
}
} | {
kind: "LIMITE_ATINGIDO"
limit: ("DAILY_TURNS" | "MONTHLY_TOKENS" | "HOPS")
teammateId?: string
threadId?: string
})
export interface ProposalReadInput {
id: string
kind: ("TABLE_ROW" | "SETTLEMENT_MATCH" | "MCP_TOOL_CALL" | "LIMITE_ATINGIDO")
status: ("PENDING" | "EXECUTED" | "REJECTED" | "EXPIRED")
payload: ({
kind: "TABLE_ROW"
action: ("CREATE" | "UPDATE" | "DELETE")
tableId: string
data: {
[k: string]: unknown
}
} | {
kind: "SETTLEMENT_MATCH"
statementLineId: string
targetType: ("RECEIVABLE" | "PAYABLE" | "ACQUIRER")
targetId: string
amountCents: string
rationale: string
} | {
kind: "MCP_TOOL_CALL"
mcpServerId: string
tool: string
arguments: {
[k: string]: unknown
}
} | {
kind: "LIMITE_ATINGIDO"
limit: ("DAILY_TURNS" | "MONTHLY_TOKENS" | "HOPS")
teammateId?: string
threadId?: string
})
teammate: ({
id: string
name: (string | null)
} | null)
channelMessageId: (string | null)
expiresAt: (string | null)
createdAt: string
}
export type RoutineScheduleInput = ({
freq: "DAILY"
time: string
} | {
freq: "WEEKLY"
time: string
weekday: number
} | {
freq: "MONTHLY"
time: string
monthday: number
})
export interface TeammateCreateInput {
name: string
role: string
playbook: string
/**
 * @minItems 1
 */
allowedTools: [string, ...(string)[]]
toolOverrides?: {
[k: string]: "PROPOSTA"
}
provider: ("anthropic" | "openai" | "gemini")
model: string
fallbackProvider?: ("anthropic" | "openai" | "gemini")
fallbackModel?: string
dailyTurnLimit?: number
}
export interface TeammateReadInput {
id: string
name: string
role: string
playbook: string
allowedTools: string[]
toolOverrides: ({
[k: string]: "PROPOSTA"
} | null)
provider: ("anthropic" | "openai" | "gemini")
model: string
fallbackProvider: (("anthropic" | "openai" | "gemini") | null)
fallbackModel: (string | null)
dailyTurnLimit: number
status: ("ACTIVE" | "PAUSED")
createdAt: string
updatedAt: string
}
export interface TeammateUpdateInput {
name?: string
role?: string
playbook?: string
/**
 * @minItems 1
 */
allowedTools?: [string, ...(string)[]]
toolOverrides?: {
[k: string]: "PROPOSTA"
}
provider?: ("anthropic" | "openai" | "gemini")
model?: string
fallbackProvider?: ("anthropic" | "openai" | "gemini")
fallbackModel?: string
dailyTurnLimit?: number
}
export interface TurnJobInput {
turnId: string
}
