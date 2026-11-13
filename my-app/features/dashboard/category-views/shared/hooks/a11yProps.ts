import type { KeyboardEvent } from 'react';

/** Enter/Espaço ativam — só quando o foco está no próprio elemento (não em botão/input filho). */
function onActivateKey(activate: () => void) {
    return (e: KeyboardEvent<HTMLElement>) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activate();
        }
    };
}

/** Props de um `<th>` ordenável: clique, teclado (Enter/Espaço), tabIndex e aria-sort. */
export function sortableThProps(
    sortable: boolean,
    sortState: { direction: 'asc' | 'desc' } | null,
    onSort: () => void,
) {
    if (!sortable) return {};
    return {
        onClick: onSort,
        onKeyDown: onActivateKey(onSort),
        tabIndex: 0,
        'aria-sort': (sortState ? (sortState.direction === 'desc' ? 'descending' : 'ascending') : 'none') as
            | 'ascending'
            | 'descending'
            | 'none',
    };
}

/** Props de uma linha/área clicável para teclado: tabIndex + Enter/Espaço. `role` só onde não for `<tr>`. */
export function activatableProps(onActivate: () => void, opts: { role?: 'button'; disabled?: boolean } = {}) {
    if (opts.disabled) return {};
    return {
        onClick: onActivate,
        onKeyDown: onActivateKey(onActivate),
        tabIndex: 0,
        ...(opts.role ? { role: opts.role } : {}),
    };
}
