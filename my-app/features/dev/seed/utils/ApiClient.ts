
import { getCookie } from 'cookies-next';
import { DynamicTableService } from '@/lib/services/dynamic-table.service';

/** apiClient rejeita resposta não-2xx com `{ ...corpo, status }`; sem status = não houve resposta (erro nativo). */
function httpFailure(err: unknown): { status: number; body: Record<string, unknown> } | null {
    if (!err || typeof err !== 'object' || typeof (err as { status?: unknown }).status !== 'number') return null;
    const { status, ...body } = err as Record<string, unknown> & { status: number };
    return { status, body };
}

/**
 * Cliente do seed de desenvolvimento (features/dev), sobre `DynamicTableService` em modo `silent`: um seed em lote
 * não solta um toast por linha que falha; o dump de erro (`logError`/`getErrorMsg`) recebe o status e o corpo de erro.
 */
export class ApiClient {
    private token: string;

    constructor() {
        this.token = getCookie('auth_token') as string;
        if (!this.token) throw new Error('Sem token de autenticação');
    }

    async getRows(tableId: string): Promise<unknown[]> {
        try {
            const body = await DynamicTableService.getTableData(tableId, '', { silent: true });
            return body?.data || [];
        } catch (err) {
            // Resposta não-2xx: como antes (sem checar `ok`), o corpo de erro não traz `data` ⇒ lista vazia.
            if (httpFailure(err)) return [];
            throw err;
        }
    }

    async postRow(tableId: string, data: Record<string, unknown>, tableNameForLog: string = 'Unknown'): Promise<string> {
        let body: Record<string, unknown>;
        try {
            body = await DynamicTableService.createRecord(tableId, { data }, { successMessage: null, silent: true });
        } catch (err) {
            const failure = httpFailure(err);
            if (!failure) throw err;
            this.logError(tableNameForLog, data, failure.body, failure.status);
            throw new Error(`[${tableNameForLog}] Falha ao criar: ${this.getErrorMsg(failure.body)}`);
        }

        const bodyData = body?.data as Record<string, unknown> | string | undefined;
        const id = (typeof bodyData === 'object' && bodyData !== null ? bodyData?.id : null) || body?.id || (typeof bodyData === 'string' ? bodyData : null);
        if (!id) throw new Error(`[${tableNameForLog}] ID não retornado na criação.`);
        return id as string;
    }

    async putRow(tableId: string, dataId: string, data: Record<string, unknown>, tableNameForLog: string = 'Unknown'): Promise<void> {
        try {
            await DynamicTableService.updateRecord(tableId, dataId, { data }, { successMessage: null, silent: true });
        } catch (err) {
            const failure = httpFailure(err);
            if (!failure) throw err;
            this.logError(tableNameForLog, data, failure.body, failure.status);
            throw new Error(`[${tableNameForLog}] Falha ao atualizar: ${this.getErrorMsg(failure.body)}`);
        }
    }

    // Helper to find existing record by a unique field
    async findExisting(tableId: string, field: string, value: string): Promise<any | null> {
        const rows = await this.getRows(tableId);
        return rows.find((r) => {
            const row = r as Record<string, unknown> & { data?: Record<string, unknown> };
            const val = row.data?.[field] || row[field];
            return String(val).toLowerCase() === String(value).toLowerCase();
        }) || null;
    }

    private getErrorMsg(body: unknown): string {
        try {
            const b = body as Record<string, unknown>;
            if (b?.details) return JSON.stringify(b.details, null, 2);
            if (b?.error) return typeof b.error === 'object' ? JSON.stringify(b.error, null, 2) : String(b.error);
            if (b?.message) return String(b.message);
            return JSON.stringify(body, null, 2); // Dump entire body if nothing else matches
        } catch (e) {
            return `Erro ao processar resposta de erro: ${e}`;
        }
    }

    private logError(table: string, payload: Record<string, unknown>, responseBody: unknown, status: number) {
        console.error(`\n🔴 [SEED ERROR] Table: ${table} (Status: ${status})`);
        console.error('📦 Payload enviado:', JSON.stringify(payload, null, 2));
        console.error('❌ Resposta do servidor:', JSON.stringify(responseBody, null, 2));
        console.error('---------------------------------------------------\n');
    }
}
