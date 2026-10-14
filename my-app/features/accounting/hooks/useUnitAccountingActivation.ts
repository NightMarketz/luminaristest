import { useCallback, useEffect, useRef, useState } from 'react';
import { accountingBindingService } from '../../../lib/services/accountingBinding.service';

export type UnitAccountingActivation =
  | { state: 'loading' | 'inactive' | 'error' }
  | { state: 'active'; activeSectorKey: string };

/**
 * A unidade tem binding `Active`? (FE-INCR-BINDING-ACTIVATION-screen-brief item 2). Lê `GET /accounting-binding` com
 * `status=Active`: lista vazia ⇒ `inactive`; uma linha ⇒ `active` com o setor; erro ⇒ `error` (a tela segue de pé).
 * Só a última carga vale: troca de unidade descarta a resposta atrasada (mesma regra do `contextKey` da AccountingView).
 */
export function useUnitAccountingActivation(unitId: string): UnitAccountingActivation & { reload: () => void } {
  const [status, setStatus] = useState<UnitAccountingActivation>({ state: 'loading' });
  const reqRef = useRef(0);

  const reload = useCallback(() => {
    const req = ++reqRef.current;
    setStatus({ state: 'loading' });
    accountingBindingService
      .listActive(unitId)
      .then((rows) => {
        if (req !== reqRef.current) return;
        setStatus(rows.length > 0 ? { state: 'active', activeSectorKey: rows[0].sectorKey } : { state: 'inactive' });
      })
      .catch(() => {
        if (req !== reqRef.current) return;
        setStatus({ state: 'error' });
      });
  }, [unitId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...status, reload };
}
