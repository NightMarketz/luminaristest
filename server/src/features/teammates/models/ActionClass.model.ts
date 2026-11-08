import { z } from 'zod';

/**
 * BE-INCR-TEAMMATES PR-0 item 4 (BRIEF §1 e §2.2; PRE-ADR-TEAMMATES D-2, F-TM-2) — a classe de cada ferramenta do
 * laço do agente, decidida no código e não no prompt:
 *   LIVRE    — ler, resumir, rascunhar, nota ou tarefa interna;
 *   PROPOSTA — escrita em DynamicTable, envio externo, qualquer coisa de dinheiro, fiscal ou razão;
 *   PROIBIDA — nunca executa.
 * Ferramentas MCP não entram no mapa: são PROPOSTA por regra (BRIEF item 42).
 */
export const ActionClassSchema = z.enum(['LIVRE', 'PROPOSTA', 'PROIBIDA']);
export type ActionClass = z.infer<typeof ActionClassSchema>;

/**
 * Ferramenta registrada → classe. Toda ferramenta de `LuminarisAgentService.getTools()` tem de estar aqui
 * (guarda: `features/teammates/__tests__/toolClass.test.ts`). Classificação pela regra D-2 do PRE-ADR-TEAMMATES.
 */
export const TOOL_CLASS = {
  list_my_tables: 'LIVRE', // leitura
  get_table_schema: 'LIVRE', // leitura
  query_table_data: 'LIVRE', // leitura
  request_record_creation: 'PROPOSTA', // escrita em DynamicTable
  request_record_update: 'PROPOSTA', // escrita em DynamicTable
  search_documents: 'LIVRE', // leitura (RAG-PR-B item 16)
} as const satisfies Readonly<Record<string, ActionClass>>;

export type RegisteredToolName = keyof typeof TOOL_CLASS;

/**
 * L-PR3-6 (dono, chat, 2026-11-07, opção A, cédula D-2026-11-07-TM-PR3-LACUNAS): ferramentas que têm formato de
 * proposta — o runner sabe gravá-las como `ActionProposal` (`TeammateRunner.propose`). Override para `PROPOSTA` só vale
 * para estas; fora daqui o `TeammateService` responde 400 `ALCADA_INVALIDA`. Toda ferramenta `PROPOSTA` do `TOOL_CLASS`
 * tem de estar aqui (guarda: `features/teammates/__tests__/toolClass.test.ts`).
 */
export const PROPOSAL_FORMAT = {
  request_record_creation: 'TABLE_ROW', // CREATE
  request_record_update: 'TABLE_ROW', // UPDATE
} as const satisfies Readonly<Partial<Record<RegisteredToolName, 'TABLE_ROW'>>>;

export const hasProposalFormat = (tool: string): boolean => Object.prototype.hasOwnProperty.call(PROPOSAL_FORMAT, tool);
