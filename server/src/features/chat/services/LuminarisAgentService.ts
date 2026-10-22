import { DynamicTableService } from '../../dynamicTables/services/DynamicTableService';
import { UserContext } from '../../../lib/authUtils';
import logger from '../../../lib/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../lib/errors';
import { IActionProposalRepository } from '../repositories/IActionProposalRepository';
import { IDynamicTablePolicy } from '../../dynamicTables/policies/IDynamicTablePolicy';
import type { IDynamicTableWriteEffects } from '../../integration/services/IDynamicTableWriteEffects';
import { agentToolError, QueryTableDataResult } from '../models/AgentTool.model';
import { ActionProposal, Prisma } from 'generated/prisma';
import OpenAI from 'openai';

/** Linhas devolvidas por query_table_data ao modelo (o `total` diz quantas casam no banco). */
const QUERY_TOOL_LIMIT = 10;

export interface ActionProposalData {
    id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    tableId: string;
    tableName: string;
    tableLabel: string;
    data: Record<string, unknown>;
    userId: string;
}

export class LuminarisAgentService {
    constructor(
        private dynamicTableService: DynamicTableService,
        private proposalRepository: IActionProposalRepository,
        private policy: IDynamicTablePolicy,
        private readonly writeEffects: IDynamicTableWriteEffects,
    ) { }

    /**
     * Generates the list of OpenAI tools exposed to the agent. The tool set is static;
     * per-user scoping happens when each tool is executed in handleToolCall.
     */
    async getTools(): Promise<OpenAI.Chat.Completions.ChatCompletionTool[]> {
        const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
            {
                type: 'function',
                function: {
                    name: 'list_my_tables',
                    description: 'List all ERP/CRM tables available for the current user.',
                    parameters: { type: 'object', properties: {} }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_table_schema',
                    description: 'Get the detailed schema (fields, types, relations) of a specific table.',
                    parameters: {
                        type: 'object',
                        properties: {
                            tableId: { type: 'string', description: 'The unique ID of the table.' }
                        },
                        required: ['tableId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'query_table_data',
                    description: 'Search for records in a specific table by exact equality (igualdade exata) on its fields. Use the field names returned by get_table_schema. Returns at most 10 rows plus the total number of matches.',
                    parameters: {
                        type: 'object',
                        properties: {
                            tableId: { type: 'string', description: 'The unique ID of the table.' },
                            filters: { type: 'object', description: 'Optional { fieldName: value } exact-equality filters; field names MUST come from get_table_schema; values (string, number, boolean or null) are converted to the field type declared in get_table_schema; a value that does not convert returns an error.' }
                        },
                        required: ['tableId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'request_record_creation',
                    description: 'Triggers a UI modal for the user to confirm the creation of a new record. YOU MUST PROVIDE ALL DATA HERE. Calling this IS the way to ask for confirmation.',
                    parameters: {
                        type: 'object',
                        properties: {
                            tableId: { type: 'string', description: 'The unique ID of the table (mandatory).' },
                            data: { type: 'object', description: 'The data for the new record. MUST NOT BE EMPTY. Include all mandatory fields from the schema.' }
                        },
                        required: ['tableId', 'data']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'request_record_update',
                    description: 'Triggers a UI modal for the user to confirm an update to an existing record. Calling this IS the way to ask for confirmation.',
                    parameters: {
                        type: 'object',
                        properties: {
                            tableId: { type: 'string', description: 'The unique ID of the table.' },
                            recordId: { type: 'string', description: 'The unique ID of the specific record to update.' },
                            data: { type: 'object', description: 'The specific fields to update.' }
                        },
                        required: ['tableId', 'recordId', 'data']
                    }
                }
            }
        ];

        return tools;
    }

    /**
     * Handles a tool call from the LLM.
     */
    async handleToolCall(user: UserContext, functionName: string, args: Record<string, unknown>): Promise<unknown> {
        // Só as chaves: os valores de `args.data` são dados de registro (PII).
        logger.info(`Agent Tool Call: ${functionName}`, { userId: user.userId, argKeys: Object.keys(args) });

        switch (functionName) {
            case 'list_my_tables': {
                const tables = await this.dynamicTableService.getTablesForUser(user.userId);
                return tables.map(t => ({ id: t.id, name: t.name, category: t.category }));
            }

            case 'get_table_schema': {
                const table = await this.dynamicTableService.getTableById(user, args.tableId as string);
                return {
                    id: table.id,
                    name: table.name,
                    category: table.category,
                    fields: (table.schema as unknown as Record<string, unknown>)['fields']
                };
            }

            case 'query_table_data': {
                // Filtro no SQL (F-I11-2 → b): a tabela inteira é buscada; o modelo vê quantas casam.
                try {
                    const { rows, total } = await this.dynamicTableService.searchTableData(
                        user, args.tableId as string, args.filters as Record<string, unknown> | undefined, QUERY_TOOL_LIMIT
                    );
                    const result: QueryTableDataResult = {
                        rows: rows.map(r => ({ id: r.id, data: r.data as Record<string, unknown>, createdAt: r.createdAt.toISOString() })),
                        total,
                        returned: rows.length,
                        truncated: total > rows.length,
                    };
                    return result;
                } catch (error) {
                    // Só o filtro inválido volta ao modelo; permissão/tabela inexistente seguem como hoje.
                    if (error instanceof ValidationError) return agentToolError('FILTRO_INVALIDO', error.message);
                    throw error;
                }
            }

            case 'request_record_creation': {
                const creationData = args.data as Record<string, unknown> | undefined;
                if (!creationData || Object.keys(creationData).length === 0) {
                    return agentToolError('DADOS_VAZIOS', 'ERRO: Você deve fornecer o objeto "data" com os campos preenchidos. Não posso criar uma proposta vazia.');
                }
                const table = await this.dynamicTableService.getTableById(user, args.tableId as string);
                // canView (getTableById) não basta: a proposta só é gravada se a confirmação puder
                // executá-la (tabela `system` e tabela alheia vista por ADMIN falhariam só no modal).
                if (!this.policy.canManageData(user, table)) {
                    return agentToolError('SEM_PERMISSAO', `Você não tem permissão para criar registros na tabela "${table.name}".`);
                }
                const proposal = await this.proposalRepository.create({
                    userId: user.userId,
                    action: 'CREATE',
                    tableId: table.id,
                    tableName: table.name,
                    tableLabel: table.name,
                    status: 'PENDING',
                    data: creationData as unknown as Prisma.JsonValue
                });
                return {
                    status: 'PROPOSED',
                    proposalId: proposal.id,
                    message: 'Proposta gerada com sucesso. O modal de confirmação aparecerá agora para o usuário.'
                };
            }

            case 'request_record_update': {
                const updateData = args.data as Record<string, unknown> | undefined;
                if (!updateData || Object.keys(updateData).length === 0) {
                    return agentToolError('DADOS_VAZIOS', 'ERRO: Você deve fornecer os campos para atualização no argumento "data".');
                }
                const table = await this.dynamicTableService.getTableById(user, args.tableId as string);
                if (!this.policy.canManageData(user, table)) {
                    return agentToolError('SEM_PERMISSAO', `Você não tem permissão para alterar registros na tabela "${table.name}".`);
                }
                // executeProposal resolve a tabela pela linha: sem esta checagem o modal mostraria a
                // tabela X e a confirmação alteraria uma linha de outra tabela.
                const recordId = args.recordId as string;
                const [record] = await this.dynamicTableService.getTableDataByIds(user, table.id, [recordId]);
                if (!record) {
                    return agentToolError('REGISTRO_NAO_ENCONTRADO', `O registro "${recordId}" não existe na tabela "${table.name}".`);
                }
                const proposal = await this.proposalRepository.create({
                    userId: user.userId,
                    action: 'UPDATE',
                    tableId: table.id,
                    tableName: table.name,
                    tableLabel: table.name,
                    status: 'PENDING',
                    data: { ...updateData, id: recordId } as unknown as Prisma.JsonValue
                });
                return { status: 'PROPOSED', proposalId: proposal.id };
            }

            default:
                throw new ValidationError(`Unknown function: ${functionName}`);
        }
    }

    /**
     * Executes a previously proposed action after user confirmation.
     */
    async executeProposal(user: UserContext, proposalId: string): Promise<any> {
        const proposal = await this.proposalRepository.findById(proposalId);
        if (!proposal) throw new NotFoundError('Proposal not found or expired.');
        if (proposal.userId !== user.userId) throw new ForbiddenError('Unauthorized proposal execution.');

        logger.info('Executing confirmed proposal', { proposalId, action: proposal.action });

        let result: unknown;
        try {
            if (proposal.action === 'CREATE') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prisma InputJsonValue: JSON fields require any cast at persistence boundary
                result = await this.dynamicTableService.createTableData(user, proposal.tableId, { data: proposal.data as any });
            } else if (proposal.action === 'UPDATE') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prisma InputJsonValue: JSON fields require any cast at persistence boundary
                const { id, ...data } = proposal.data as any;
                result = await this.dynamicTableService.updateTableData(user, id, { data });
            } else {
                throw new ValidationError(`Unsupported proposal action: ${proposal.action}`);
            }
        } catch (error: unknown) {
            logger.error(`Failed to execute proposal ${proposalId}`, { error });
            throw error;
        }
        this.writeEffects.afterDataWrite(user.userId);

        // The data write succeeded (and is itself transactional). Cleaning up the proposal is
        // best-effort: a failure here must not turn a successful operation into an error — stale
        // proposals are reaped by deleteOldProposals.
        try {
            await this.proposalRepository.delete(proposalId);
        } catch (cleanupError) {
            logger.warn('Failed to delete consumed proposal', { proposalId, error: cleanupError });
        }
        try {
            await this.proposalRepository.deleteOldProposals(24);
        } catch (reapError) {
            logger.warn('Failed to reap stale proposals', { error: reapError });
        }

        return { success: true, result };
    }

    public async getProposal(proposalId: string): Promise<ActionProposal | null> {
        return this.proposalRepository.findById(proposalId);
    }
}
