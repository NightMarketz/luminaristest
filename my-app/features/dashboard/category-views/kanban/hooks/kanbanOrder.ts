/**
 * Ordem manual dos cards do Kanban (FE-INCR-KANBAN-REORDER, F-KR-1..3 ratificados 21/10).
 * Campo `order` inteiro do schema, com lacunas de ORDER_STEP; sem vão ou com empate → a coluna inteira
 * é regravada na ordem visível (backfill preguiçoso).
 */
export const ORDER_STEP = 1000;

export interface OrderedTask {
    id: string;
    order?: unknown;
    createdAt?: string;
}

export interface OrderWrite {
    id: string;
    order: number;
}

export function orderOf(task: OrderedTask): number {
    return typeof task.order === 'number' && Number.isFinite(task.order) ? task.order : 0;
}

/** Ordem de leitura: `order` asc, empate por `createdAt` e depois `id`. Não muta a entrada. */
export function sortByManualOrder<T extends OrderedTask>(tasks: T[]): T[] {
    return [...tasks].sort((a, b) =>
        orderOf(a) - orderOf(b)
        || String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''))
        || a.id.localeCompare(b.id),
    );
}

/**
 * Gravações para pôr `movedId` em `targetIndex` de `column` (já ordenada, SEM o card movido).
 * Caso comum: 1 gravação (só o card movido). Empate na coluna ou vão esgotado: regrava a coluna.
 */
export function computeDropOrder(column: OrderedTask[], movedId: string, targetIndex: number): OrderWrite[] {
    const index = Math.max(0, Math.min(targetIndex, column.length));
    const orders = column.map(orderOf);
    const hasTie = orders.some((o, i) => i > 0 && o === orders[i - 1]);

    if (!hasTie) {
        const prev = index > 0 ? orders[index - 1] : undefined;
        const next = index < orders.length ? orders[index] : undefined;
        if (prev === undefined && next === undefined) return [{ id: movedId, order: ORDER_STEP }];
        if (prev === undefined) return [{ id: movedId, order: (next as number) - ORDER_STEP }];
        if (next === undefined) return [{ id: movedId, order: prev + ORDER_STEP }];
        if (next - prev >= 2) return [{ id: movedId, order: Math.floor((prev + next) / 2) }];
    }

    const ids = column.map(t => t.id);
    ids.splice(index, 0, movedId);
    const current = new Map(column.map(t => [t.id, orderOf(t)]));
    return ids
        .map((id, i) => ({ id, order: (i + 1) * ORDER_STEP }))
        .filter(w => w.id === movedId || current.get(w.id) !== w.order);
}
