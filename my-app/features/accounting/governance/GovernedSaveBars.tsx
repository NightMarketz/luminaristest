import { useState } from 'react';
import type { PolicyVersionView } from '../../../lib/services/policyVersions.service';
import { useAccountingT } from '../lib/useAccountingT';
import { PolicyVersionDetailModal } from './PolicyVersionDetailModal';
import type { ActiveAssignment } from './useActiveAssignment';
import type { GovernedOffer } from './useGovernedSave';

/** Aviso acima do botão quando o escopo tem contador ativo (item 4.2). */
export function ActiveAccountantNotice({ active }: { active: ActiveAssignment }) {
  const { t } = useAccountingT();
  return (
    <p role="note" data-testid="policy-active-notice" className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
      {t('policy.owner.activeNotice', 'Este escopo tem contador responsável ativo ({{name}}, {{crc}}). A mudança só vale depois que ele aprovar.', {
        name: active.contactName ?? '—',
        crc: active.assignment.crcNumber,
      })}
    </p>
  );
}

/**
 * Faixa da proposta pendente (item 5, F-FE-POL-4 a): o formulário mostra o vigente; a faixa diz que existe uma
 * proposta e que enviar outra a substitui. `partial` = alvo de patch parcial (contas do escopo, item 6).
 */
export function PendingProposalBanner({ pending, unitId, partial }: { pending: PolicyVersionView; unitId: string; partial?: boolean }) {
  const { t } = useAccountingT();
  const [open, setOpen] = useState(false);
  const vars = { n: String(pending.version), date: new Date(pending.createdAt).toLocaleDateString('pt-BR') };
  return (
    <div role="status" data-testid="policy-pending-banner" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
      <span>
        {partial
          ? t('policy.owner.pendingPartial', 'Proposta v{{n}} aguardando o contador desde {{date}}. Ela é parcial: só as contas enviadas mudam. Enviar outra substitui esta.', vars)
          : t('policy.owner.pending', 'Proposta v{{n}} aguardando o contador desde {{date}}. Enviar outra substitui esta por inteiro.', vars)}
      </span>
      <button type="button" onClick={() => setOpen(true)} className="text-amber-100 underline hover:no-underline">
        {t('policy.owner.viewProposal', 'Ver proposta')}
      </button>
      {open && <PolicyVersionDetailModal versionId={pending.id} unitId={unitId} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Botão de reenvio depois do 409 de corrida (item 4.4) — o dono clica; nada reenvia sozinho. */
export function GovernedOfferButton({ offer, busy, onAccept }: { offer: GovernedOffer; busy: boolean; onAccept: () => void }) {
  const { t } = useAccountingT();
  if (!offer) return null;
  return (
    <button
      type="button"
      onClick={onAccept}
      disabled={busy}
      className="rounded-xl border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/30 disabled:opacity-50"
    >
      {offer === 'propose' ? t('policy.owner.offerPropose', 'Enviar como proposta') : t('policy.owner.offerPut', 'Salvar direto')}
    </button>
  );
}
