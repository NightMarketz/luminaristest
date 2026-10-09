import { useCallback, useEffect, useRef, useState } from 'react';
import {
  policyVersionsService,
  type PolicyTarget,
  type PolicyVersionView,
} from '../../../lib/services/policyVersions.service';
import { useAccountingT } from '../lib/useAccountingT';
import { resolveGovernanceError } from './governanceError';
import { useActiveAssignment, type ActiveAssignment } from './useActiveAssignment';

/** Para onde o mesmo corpo pode ser reenviado depois de um 409 de corrida (item 4.4). */
export type GovernedOffer = 'propose' | 'put' | null;

export interface GovernedSaveOptions<B> {
  unitId: string;
  target: PolicyTarget;
  /** Gravação direta (`PUT`), o caminho sem contador. */
  put: (body: B) => Promise<void>;
  /** Proposta ao contador (`POST /policy-versions`) com o MESMO corpo. */
  propose: (body: B) => Promise<PolicyVersionView>;
  /** Fallback do erro genérico de gravação da tela de origem. */
  saveErrorFallback: string;
}

export interface GovernedSave<B> {
  /** A ACTIVE do escopo (F-FE-POL-1 a: a tela escolhe a rota por ela; o servidor segue autoridade). */
  active: ActiveAssignment | null;
  /** A proposta `PROPOSED` mais nova deste alvo, se houver (item 5). */
  pending: PolicyVersionView | null;
  busy: boolean;
  error: string | null;
  /** Oferta de reenvio depois do 409 de corrida — o dono clica; nada reenvia sozinho. */
  offer: GovernedOffer;
  /** A versão recém-proposta (aviso de sucesso). */
  proposed: PolicyVersionView | null;
  /** `true` quando o último envio foi um PUT bem-sucedido. */
  savedDirect: boolean;
  submit: (body: B) => Promise<void>;
  /** Reenvia o último corpo pela rota da `offer`. */
  acceptOffer: () => Promise<void>;
  reset: () => void;
}

/**
 * Lado do dono da política versionada (FE-INCR-ACCOUNTING-POLICY-VERSION itens 4–6), comum ao perfil fiscal e às
 * contas do imobilizado. Com ACTIVE na leitura vai pela proposta; sem, pelo PUT. A rede de corrida vale nos dois
 * sentidos: `POLICY_APPROVAL_REQUIRED` no PUT oferece "Enviar como proposta"; `POLICY_NO_ACCOUNTANT` na proposta
 * oferece "Salvar direto". A leitura da pendente é informativa: falha = sem faixa.
 */
export function useGovernedSave<B>(opts: GovernedSaveOptions<B>): GovernedSave<B> {
  const { unitId, target } = opts;
  const { tRef } = useAccountingT();
  const active = useActiveAssignment(unitId, true);
  const [pending, setPending] = useState<PolicyVersionView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<GovernedOffer>(null);
  const [proposed, setProposed] = useState<PolicyVersionView | null>(null);
  const [savedDirect, setSavedDirect] = useState(false);
  const lastBody = useRef<B | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reloadPending = useCallback(async () => {
    if (!unitId) return;
    try {
      const rows = await policyVersionsService.list({ unitId, target, status: 'PROPOSED' });
      setPending(rows[0] ?? null);
    } catch {
      setPending(null);
    }
  }, [unitId, target]);

  const reset = useCallback(() => {
    setError(null);
    setOffer(null);
    setProposed(null);
    setSavedDirect(false);
    lastBody.current = null;
  }, []);

  useEffect(() => {
    reset();
    setPending(null);
    void reloadPending();
  }, [reloadPending, reset]);

  const run = useCallback(
    async (route: 'propose' | 'put', body: B) => {
      lastBody.current = body;
      setBusy(true);
      setError(null);
      setOffer(null);
      setProposed(null);
      setSavedDirect(false);
      try {
        if (route === 'propose') {
          const v = await optsRef.current.propose(body);
          setProposed(v);
          await reloadPending();
        } else {
          await optsRef.current.put(body);
          setSavedDirect(true);
        }
      } catch (err: unknown) {
        const { message, code } = resolveGovernanceError(err, tRef.current, optsRef.current.saveErrorFallback);
        setError(message);
        if (route === 'put' && code === 'POLICY_APPROVAL_REQUIRED') setOffer('propose');
        if (route === 'propose' && code === 'POLICY_NO_ACCOUNTANT') setOffer('put');
      } finally {
        setBusy(false);
      }
    },
    [reloadPending, tRef],
  );

  const submit = useCallback((body: B) => run(active ? 'propose' : 'put', body), [active, run]);

  const acceptOffer = useCallback(async () => {
    if (!offer || lastBody.current === null) return;
    await run(offer, lastBody.current);
  }, [offer, run]);

  return { active, pending, busy, error, offer, proposed, savedDirect, submit, acceptOffer, reset };
}
