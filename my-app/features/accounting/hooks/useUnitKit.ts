import { useCallback, useEffect, useRef, useState } from 'react';
import { accountingKitService, type KitInstallationView } from '../../../lib/services/accountingKit.service';

// Um membro por estado (não `'loading' | 'none' | 'error'` num só): assim o `& { reload }` do retorno ainda estreita.
export type UnitKit =
  | { state: 'loading' }
  | { state: 'none' }
  | { state: 'error' }
  | { state: 'loaded'; kit: KitInstallationView };

/**
 * O kit de setor da unidade (FE-INCR-BINDING-ACTIVATION-EMENDA-2-brief item 2). `null` do BE ⇒ `none`; erro ⇒ `error`
 * (a tela segue de pé). Só a última carga vale: troca de unidade descarta a resposta atrasada (mesma regra do
 * `useUnitAccountingActivation`). `enabled: false` (modo cliente, item 4) ⇒ não chama a rota e fica em `none`.
 *
 * O `reload` de uma unidade já carregada relê sem voltar a `loading`: a aba "Kit de setor" só existe com `loaded`, e
 * piscar para `loading` depois de uma retomada a tiraria da tela no meio da leitura.
 */
export function useUnitKit(unitId: string, opts: { enabled: boolean }): UnitKit & { reload: () => void } {
  const [status, setStatus] = useState<UnitKit>(opts.enabled ? { state: 'loading' } : { state: 'none' });
  const reqRef = useRef(0);
  const loadedUnitRef = useRef<string | null>(null);

  const reload = useCallback(() => {
    const req = ++reqRef.current;
    if (!opts.enabled) {
      loadedUnitRef.current = null;
      setStatus({ state: 'none' });
      return;
    }
    if (loadedUnitRef.current !== unitId) setStatus({ state: 'loading' });
    accountingKitService
      .getKit(unitId)
      .then((kit) => {
        if (req !== reqRef.current) return;
        loadedUnitRef.current = kit ? unitId : null;
        setStatus(kit ? { state: 'loaded', kit } : { state: 'none' });
      })
      .catch(() => {
        if (req !== reqRef.current) return;
        loadedUnitRef.current = null;
        setStatus({ state: 'error' });
      });
  }, [unitId, opts.enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...status, reload };
}
