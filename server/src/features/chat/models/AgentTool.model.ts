import { z } from 'zod';

/**
 * Recusa de uma ferramenta do agente (BRIEF BE-INCR-CHAT-AGENT §2.1, F-I11-3 → (a)): a ferramenta
 * não lança nem vira 4xx — devolve este objeto ao modelo, que explica ao usuário em texto.
 * `message` é PT, para o modelo repassar.
 */
export const AgentToolErrorSchema = z
  .object({
    error: z.enum(['SEM_PERMISSAO', 'REGISTRO_NAO_ENCONTRADO', 'FILTRO_INVALIDO', 'DADOS_VAZIOS']),
    message: z.string().min(1),
  })
  .strict();

export type AgentToolError = z.infer<typeof AgentToolErrorSchema>;

export function agentToolError(error: AgentToolError['error'], message: string): AgentToolError {
  return { error, message };
}

/** Saída de `query_table_data` (BRIEF BE-INCR-CHAT-AGENT §2.3). */
export const QueryTableDataRowsSchema = z
  .object({
    rows: z.array(z.object({ id: z.string(), data: z.record(z.string(), z.unknown()), createdAt: z.string() }).strict()),
    total: z.number().int().nonnegative(),   // linhas que casam no banco inteiro
    returned: z.number().int().nonnegative(), // rows.length
    truncated: z.boolean(),                   // total > returned
  })
  .strict();

export type QueryTableDataResult = z.infer<typeof QueryTableDataRowsSchema> | AgentToolError;
