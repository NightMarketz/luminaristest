import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import {
  policyVersionsService,
  type PolicyVersionDetailView,
  type PolicyVersionScopeQueryInput,
} from '../../../lib/services/policyVersions.service';
import { useAccountingT } from '../lib/useAccountingT';
import { toPolicyDiffRows } from '../lib/policyPayload';
import { resolveGovernanceError } from './governanceError';
import {
  POLICY_ACCOUNTANT_REQUIRED_FALLBACK,
  POLICY_ACCOUNTANT_REQUIRED_KEY,
  type GovernanceScope,
} from './GovernanceScope';

const REASON_MAX = 500;

/** Escopo das chamadas: no modo cliente SEMPRE com `ownerUserId`; no modo próprio a chave não vai. */
export function policyScope(unitId: string, governance?: GovernanceScope): PolicyVersionScopeQueryInput {
  return governance ? { unitId, ownerUserId: governance.ownerUserId } : { unitId };
}

export interface PolicyVersionDetailModalProps {
  versionId: string;
  unitId: string;
  /** Presente = modo cliente: botões de decisão (só em `PROPOSED`) e toda chamada com `ownerUserId`. */
  governance?: GovernanceScope;
  onClose: () => void;
  /** A versão mudou (decidida, ou o CAS do servidor recusou): o pai recarrega a lista. */
  onChanged?: () => void;
  onAssignmentLost?: () => void;
}

/**
 * Detalhe da versão (FE-INCR-ACCOUNTING-POLICY-VERSION itens 8–9): diff campo a campo SÓ das chaves do `payload`
 * (F-FE-POL-3 a) contra o `current` — ou o `appliedSnapshot` numa versão `APPLIED`. Rótulos de conta vêm do
 * `accountLabels` do próprio detalhe: no modo cliente nenhuma outra leitura é feita (risco principal do BRIEF §0).
 */
export function PolicyVersionDetailModal({ versionId, unitId, governance, onClose, onChanged, onAssignmentLost }: PolicyVersionDetailModalProps) {
  const { t, tRef } = useAccountingT();
  const [detail, setDetail] = useState<PolicyVersionDetailView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSame, setShowSame] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const lostRef = useRef(onAssignmentLost);
  lostRef.current = onAssignmentLost;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setDetail(await policyVersionsService.get(versionId, policyScope(unitId, governance)));
    } catch (err: unknown) {
      const { message, code } = resolveGovernanceError(err, tRef.current, tRef.current('policy.error.loadDetail', 'Não foi possível carregar a proposta.'));
      if (code === 'ACCOUNTANT_NOT_ASSIGNED') lostRef.current?.();
      setLoadError(message);
    }
  }, [versionId, unitId, governance, tRef]);
  useEffect(() => { void load(); }, [load]);

  async function decide(kind: 'approve' | 'reject') {
    if (!governance || !detail) return;
    setBusy(true);
    setDecisionError(null);
    try {
      if (kind === 'approve') {
        await policyVersionsService.approve(detail.id, { unitId, ownerUserId: governance.ownerUserId });
      } else {
        await policyVersionsService.reject(detail.id, { unitId, ownerUserId: governance.ownerUserId, reason: reason.trim() });
      }
      setConfirming(false);
      setRejecting(false);
      onChanged?.();
      await load();
    } catch (err: unknown) {
      const fallback = tRef.current('policy.error.decide', 'Não foi possível registrar a decisão.');
      const { message, code } = resolveGovernanceError(err, tRef.current, fallback);
      setConfirming(false);
      setRejecting(false);
      if (code === 'ACCOUNTANT_NOT_ASSIGNED') {
        lostRef.current?.();
        setDecisionError(message);
      } else if (code === 'POLICY_VERSION_STATUS_CHANGED') {
        setDecisionError(message);
        onChanged?.();
        await load();
      } else if (code === 'ACCOUNTANT_REQUIRED') {
        setDecisionError(tRef.current(POLICY_ACCOUNTANT_REQUIRED_KEY, POLICY_ACCOUNTANT_REQUIRED_FALLBACK));
      } else if (kind === 'approve' && (err as { status?: unknown } | null)?.status === 400) {
        setDecisionError(`${message} ${tRef.current('policy.error.approveStillPending', 'A proposta segue pendente; rejeite com o motivo se ela não puder valer.')}`);
      } else {
        setDecisionError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  const base = detail ? (detail.status === 'APPLIED' ? detail.appliedSnapshot : detail.current) : null;
  const rows = detail ? toPolicyDiffRows(detail.target, detail.payload, base, detail.accountLabels, t) : [];
  const changed = rows.filter((r) => r.changed);
  const unchanged = rows.filter((r) => !r.changed);
  const canDecide = !!governance && detail?.status === 'PROPOSED';
  const trimmed = reason.trim();

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={detail ? t('policy.detail.title', 'Proposta v{{n}}', { n: String(detail.version) }) : t('policy.detail.loading', 'Carregando…')}
      maxWidth="max-w-3xl"
      themeColor="bg-emerald-600"
    >
      <div className="space-y-4 p-6 text-sm text-neutral-300">
        {loadError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{loadError}</div>}
        {detail && (
          <>
            <p className="text-xs text-neutral-500">
              {detail.status === 'APPLIED'
                ? t('policy.detail.baseApplied', 'Comparado com o que esta versão aplicou.')
                : t('policy.detail.baseCurrent', 'Comparado com o vigente.')}
            </p>
            <table className="w-full text-left text-xs" data-testid="policy-diff">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-1 pr-3">{t('policy.diff.field', 'Campo')}</th>
                  <th className="py-1 pr-3">{detail.status === 'APPLIED' ? t('policy.diff.applied', 'Aplicado') : t('policy.diff.current', 'Vigente')}</th>
                  <th className="py-1">{t('policy.diff.proposed', 'Proposto')}</th>
                </tr>
              </thead>
              <tbody>
                {changed.map((r) => (
                  <tr key={r.key} data-testid={`diff-row-${r.key}`} data-changed="true" className="border-t border-neutral-800 bg-amber-950/20 text-amber-200">
                    <td className="py-1 pr-3">{r.label}</td>
                    <td className="py-1 pr-3">{r.current}</td>
                    <td className="py-1">{r.proposed}</td>
                  </tr>
                ))}
                {showSame && unchanged.map((r) => (
                  <tr key={r.key} data-testid={`diff-row-${r.key}`} data-changed="false" className="border-t border-neutral-800 text-neutral-400">
                    <td className="py-1 pr-3">{r.label}</td>
                    <td className="py-1 pr-3">{r.current}</td>
                    <td className="py-1">{r.proposed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {changed.length === 0 && <p className="text-xs text-neutral-500">{t('policy.diff.noChanges', 'Nenhum campo muda em relação à base.')}</p>}
            {unchanged.length > 0 && (
              <button type="button" onClick={() => setShowSame((s) => !s)} className="text-xs text-emerald-400 hover:underline">
                {showSame
                  ? t('policy.diff.hideSame', 'Esconder campos sem mudança')
                  : t('policy.diff.showSame', 'Mostrar campos sem mudança ({{n}})', { n: String(unchanged.length) })}
              </button>
            )}
            <p className="text-xs text-neutral-500">{t('policy.diff.outside', 'Campos fora desta lista não mudam.')}</p>
            {detail.status === 'REJECTED' && detail.decisionReason && (
              <p className="text-xs text-neutral-400">{t('policy.detail.reason', 'Motivo da rejeição: {{reason}}', { reason: detail.decisionReason })}</p>
            )}

            {decisionError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{decisionError}</div>}

            {canDecide && (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setReason(''); setRejecting(true); }}
                  disabled={busy}
                  className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
                >
                  {t('policy.decide.reject', 'Rejeitar')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={busy}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {t('policy.decide.approve', 'Aprovar')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {confirming && governance && (
        <Modal isOpen onClose={() => setConfirming(false)} title={t('policy.decide.approveTitle', 'Aprovar proposta')} themeColor="bg-emerald-600">
          <div className="space-y-4 p-6 text-sm text-neutral-300">
            <p>{t('policy.decide.approveConfirm', 'Aprovar aplica estes valores agora no livro de {{owner}}.', { owner: governance.ownerEmail })}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800">
                {t('policy.decide.cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                onClick={() => void decide('approve')}
                disabled={busy}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {t('policy.decide.approveConfirmButton', 'Aprovar e aplicar')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {rejecting && governance && (
        <Modal isOpen onClose={() => setRejecting(false)} title={t('policy.decide.rejectTitle', 'Rejeitar proposta')} themeColor="bg-emerald-600">
          <div className="space-y-3 p-6 text-sm text-neutral-300">
            <label className="block text-xs text-neutral-400" htmlFor="policy-reject-reason">{t('policy.decide.reason', 'Motivo (obrigatório)')}</label>
            <textarea
              id="policy-reject-reason"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-emerald-500 focus:outline-none"
            />
            <p className="text-right text-xs text-neutral-500">{`${reason.length}/${REASON_MAX}`}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejecting(false)} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800">
                {t('policy.decide.cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                onClick={() => void decide('reject')}
                disabled={busy || trimmed.length === 0}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {t('policy.decide.rejectConfirmButton', 'Rejeitar com este motivo')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
