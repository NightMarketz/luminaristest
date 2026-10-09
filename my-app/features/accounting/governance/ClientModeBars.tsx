import { useEffect, useState } from 'react';
import type { MyAccountantAssignmentView } from '../../../lib/services/accountantAssignments.service';
import { policyVersionsService } from '../../../lib/services/policyVersions.service';
import { useAccountingT } from '../lib/useAccountingT';
import { AcceptAssignmentModal, EndAssignmentModal } from './AssignmentModals';
import { shortUnit, type GovernanceScope } from './GovernanceScope';

/** Rótulo do cliente no seletor e no banner (F-FE-GOV-2 a): e-mail do dono + `unitId` abreviado. */
export const clientLabel = (a: { ownerEmail: string; unitId: string }): string => `${a.ownerEmail} · ${shortUnit(a.unitId)}`;

/** Convites pendentes do `/mine` (item 6.5) — nos dois modos; cada um com "Aceitar" (item 7). */
export function PendingInvitesBanner({ pending, onAccepted }: { pending: MyAccountantAssignmentView[]; onAccepted: () => void }) {
  const { t } = useAccountingT();
  const [accepting, setAccepting] = useState<MyAccountantAssignmentView | null>(null);
  if (pending.length === 0) return null;
  return (
    <div role="status" data-testid="pending-invites-banner" className="mb-6 space-y-2 rounded-2xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
      <p className="font-medium">{t('governance.pending.title', 'Convites de contador responsável')}</p>
      {pending.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-2">
          <span>{clientLabel(p)}</span>
          <button
            type="button"
            onClick={() => setAccepting(p)}
            className="rounded-xl border border-amber-800/60 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-900/30"
          >
            {t('governance.pending.accept', 'Aceitar')}
          </button>
        </div>
      ))}
      {accepting && (
        <AcceptAssignmentModal
          assignmentId={accepting.id}
          ownerEmail={accepting.ownerEmail}
          onClose={() => setAccepting(null)}
          onDone={() => { setAccepting(null); onAccepted(); }}
        />
      )}
    </div>
  );
}

/**
 * Faixa fixa do modo cliente (item 8.5): a cada aba, deixa claro que o livro é de OUTRO usuário. Leva o botão de
 * encerrar do lado do contador (item 6.6).
 */
export function ClientModeStrip({ governance, onEnded, onOpenPolicy }: { governance: GovernanceScope; onEnded: () => void; onOpenPolicy?: () => void }) {
  const { t } = useAccountingT();
  const [ending, setEnding] = useState(false);
  // Aviso de proposta de política pendente (FE-INCR-ACCOUNTING-POLICY-VERSION item 10): uma leitura por livro (o pai
  // remonta a faixa por `contextKey`); falha = sem aviso, nunca erro.
  const [pendingPolicies, setPendingPolicies] = useState(0);
  const { unitId, ownerUserId } = governance;
  useEffect(() => {
    let cancelled = false;
    policyVersionsService
      .list({ unitId, ownerUserId, status: 'PROPOSED' })
      .then((rows) => { if (!cancelled) setPendingPolicies(rows.length); })
      .catch(() => { if (!cancelled) setPendingPolicies(0); });
    return () => { cancelled = true; };
  }, [unitId, ownerUserId]);
  return (
    <div
      role="status"
      data-testid="client-mode-strip"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-700/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
    >
      <span>
        {t('governance.client.strip', 'Você está no livro de {{owner}} — unidade {{unit}}', {
          owner: governance.ownerEmail,
          unit: shortUnit(governance.unitId),
        })}
      </span>
      {pendingPolicies > 0 && (
        <button
          type="button"
          data-testid="policy-pending-strip"
          onClick={onOpenPolicy}
          className="rounded-xl border border-amber-800/60 bg-amber-950/30 px-3 py-1 text-xs font-medium text-amber-200 hover:bg-amber-900/30"
        >
          {t('policy.client.pendingCount', '{{n}} proposta(s) de política aguardando sua decisão', { n: String(pendingPolicies) })}
        </button>
      )}
      <button
        type="button"
        onClick={() => setEnding(true)}
        className="rounded-xl border border-emerald-800/60 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-900/30"
      >
        {t('governance.client.end', 'Encerrar atribuição')}
      </button>
      {ending && (
        <EndAssignmentModal
          assignmentId={governance.assignmentId}
          side="accountant"
          onClose={() => setEnding(false)}
          onDone={() => { setEnding(false); onEnded(); }}
        />
      )}
    </div>
  );
}
