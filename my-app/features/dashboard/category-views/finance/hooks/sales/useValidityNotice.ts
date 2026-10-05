'use client';

import { useCallback, useEffect, useState } from 'react';
import { packageAcceptancesService, type ValidityNotice } from '@/lib/services/packageAcceptances.service';

/**
 * Texto de validade do pacote para uma compra (FE-INCR-PACOTE-VALIDADE item 10): busca `GET /package-acceptances/notice`
 * sempre que unidade, pacote ou data mudam. O texto é do servidor (fonte única) e é mostrado literal — este hook só o traz.
 * `idle` = faltam dados para perguntar; `error` bloqueia o aceite (não se aceita o que não se viu).
 */
export type ValidityNoticeState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; notice: ValidityNotice }
    | { status: 'error' };

export function useValidityNotice(
    unitId: string | undefined,
    packageId: string | undefined,
    saleDate: string | undefined,
): { state: ValidityNoticeState; reload: () => void } {
    const [state, setState] = useState<ValidityNoticeState>({ status: 'idle' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!unitId || !packageId || !saleDate) {
            setState({ status: 'idle' });
            return;
        }
        let alive = true;
        setState({ status: 'loading' });
        packageAcceptancesService
            .getNotice(unitId, packageId, saleDate)
            .then((notice) => { if (alive) setState({ status: 'ready', notice }); })
            .catch(() => { if (alive) setState({ status: 'error' }); }); // erro já notificado pelo apiClient
        return () => { alive = false; };
    }, [unitId, packageId, saleDate, attempt]);

    const reload = useCallback(() => setAttempt((n) => n + 1), []);
    return { state, reload };
}
