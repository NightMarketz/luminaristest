import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  policyVersionsService,
  type PolicyTarget,
  type PolicyVersionStatus,
  type PolicyVersionView,
} from '../../../lib/services/policyVersions.service';
import { accountantAssignmentsService } from '../../../lib/services/accountantAssignments.service';
import { accountingContactsService } from '../../../lib/services/accountingContacts.service';
import { useAccountingT } from '../lib/useAccountingT';
import { resolveGovernanceError } from './governanceError';
import { PolicyVersionDetailModal } from './PolicyVersionDetailModal';
import type { GovernanceScope } from './GovernanceScope';

export interface PolicyVersionsPanelProps {
  unitId: string;
  /** Presente = modo cliente: só list/get/approve/reject, todos com `ownerUserId` — nada mais (BRIEF item 9). */
  governance?: GovernanceScope;
  onAssignmentLost?: () => void;
}

const TARGET_LABEL: Record<PolicyTarget, [string, string]> = {
  FISCAL_PROFILE: ['policy.target.FISCAL_PROFILE', 'Perfil fiscal'],
  SCOPE_SETTINGS: ['policy.target.SCOPE_SETTINGS', 'Contas do escopo'],
};
const STATUS_LABEL: Record<PolicyVersionStatus, [string, string]> = {
  PROPOSED: ['policy.status.PROPOSED', 'Aguardando o contador'],
  APPLIED: ['policy.status.APPLIED', 'Aplicada'],
  REJECTED: ['policy.status.REJECTED', 'Rejeitada'],
  SUPERSEDED: ['policy.status.SUPERSEDED', 'Substituída'],
};
const TARGETS: PolicyTarget[] = ['FISCAL_PROFILE', 'SCOPE_SETTINGS'];
const STATUSES: PolicyVersionStatus[] = ['PROPOSED', 'APPLIED', 'REJECTED', 'SUPERSEDED'];

const instant = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

/**
 * Painel de versões da política (FE-INCR-ACCOUNTING-POLICY-VERSION item 7, aba `politica` — F-FE-POL-2 a), o mesmo
 * nos dois modos. Tabela `<table>`, como os demais painéis de linha Prisma do módulo: o `GenericTable` é do
 * DynamicTable (mesma divergência documentada em `AccountantAssignmentSection`/`FixedAssetsSection`/`LalurPanel`).
 * "Quem decidiu" sem handler não delegado: no modo cliente compara com a atribuição do próprio contador; o
 * `listByScope` (que resolveria o escopo DO CONTADOR) só roda no modo próprio.
 */
export function PolicyVersionsPanel({ unitId, governance, onAssignmentLost }: PolicyVersionsPanelProps) {
  const { t, tRef } = useAccountingT();
  const [rows, setRows] = useState<PolicyVersionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<PolicyTarget | ''>('');
  const [status, setStatus] = useState<PolicyVersionStatus | ''>('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [deciders, setDeciders] = useState<Record<string, string>>({});
  const lostRef = useRef(onAssignmentLost);
  lostRef.current = onAssignmentLost;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await policyVersionsService.list({
        unitId,
        target: target || undefined,
        status: status || undefined,
        ownerUserId: governance?.ownerUserId, // ausente → a query não leva a chave (toQuery do serviço)
      });
      setRows(list);
    } catch (err: unknown) {
      const { message, code } = resolveGovernanceError(err, tRef.current, tRef.current('policy.error.load', 'Não foi possível carregar as versões da política.'));
      if (code === 'ACCOUNTANT_NOT_ASSIGNED') lostRef.current?.();
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [unitId, target, status, governance, tRef]);
  useEffect(() => { void load(); }, [load]);

  // Modo próprio: assignmentId → "contato (CRC)". Informativo — falha deixa o id abreviado.
  useEffect(() => {
    if (governance || !unitId) return;
    let cancelled = false;
    (async () => {
      try {
        const [assignments, contacts] = await Promise.all([
          accountantAssignmentsService.listByScope(unitId),
          accountingContactsService.listContacts(unitId).catch(() => []),
        ]);
        if (cancelled) return;
        const names: Record<string, string> = {};
        for (const a of assignments) {
          const name = contacts.find((c) => c.id === a.accountingContactId)?.name;
          names[a.id] = name ? `${name} (${a.crcNumber})` : a.crcNumber;
        }
        setDeciders(names);
      } catch {
        if (!cancelled) setDeciders({});
      }
    })();
    return () => { cancelled = true; };
  }, [unitId, governance]);

  const sorted = useMemo(
    () => [...rows.filter((r) => r.status === 'PROPOSED'), ...rows.filter((r) => r.status !== 'PROPOSED')],
    [rows],
  );

  function decider(r: PolicyVersionView): string {
    if (r.proposedById === null) return t('policy.list.direct', 'aplicada direto (sem contador)');
    if (!r.assignmentId || r.status === 'PROPOSED' || r.status === 'SUPERSEDED') return '—';
    if (governance) {
      return r.assignmentId === governance.assignmentId ? t('policy.list.you', 'você') : t('policy.list.otherAccountant', 'outro contador');
    }
    return deciders[r.assignmentId] ?? `${r.assignmentId.slice(0, 8)}…`;
  }

  const selectClass = 'rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none';

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5" aria-label={t('policy.title', 'Política contábil')}>
      <h2 className="text-lg font-semibold text-neutral-200">{t('policy.title', 'Política contábil')}</h2>
      <p className="mb-4 text-xs text-neutral-500">
        {governance
          ? t('policy.subtitle.client', 'Propostas do dono deste livro. Abra uma para ver o que muda e decidir.')
          : t('policy.subtitle.own', 'Versões do perfil fiscal e das contas do escopo. Com contador responsável ativo, cada mudança espera a aprovação dele.')}
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <select aria-label={t('policy.filter.target', 'Alvo')} value={target} onChange={(e) => setTarget(e.target.value as PolicyTarget | '')} className={selectClass}>
          {/* ponytail: `as` em folha string → união; cada <option> é um membro dela. */}
          <option value="">{t('policy.filter.allTargets', 'Todos os alvos')}</option>
          {TARGETS.map((x) => <option key={x} value={x}>{t(TARGET_LABEL[x][0], TARGET_LABEL[x][1])}</option>)}
        </select>
        <select aria-label={t('policy.filter.status', 'Status')} value={status} onChange={(e) => setStatus(e.target.value as PolicyVersionStatus | '')} className={selectClass}>
          <option value="">{t('policy.filter.allStatuses', 'Todos os status')}</option>
          {STATUSES.map((x) => <option key={x} value={x}>{t(STATUS_LABEL[x][0], STATUS_LABEL[x][1])}</option>)}
        </select>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}
      {loading && <div className="py-6 text-center text-sm text-neutral-500">{t('policy.loading', 'Carregando…')}</div>}
      {!loading && !error && sorted.length === 0 && (
        <div className="py-6 text-center text-sm text-neutral-500">{t('policy.empty', 'Nenhuma versão registrada.')}</div>
      )}

      {!loading && sorted.length > 0 && (
        <table className="w-full text-left text-xs">
          <thead className="text-neutral-500">
            <tr>
              <th className="py-2 pr-3">{t('policy.col.target', 'Alvo')}</th>
              <th className="py-2 pr-3">{t('policy.col.version', 'Versão')}</th>
              <th className="py-2 pr-3">{t('policy.col.status', 'Status')}</th>
              <th className="py-2 pr-3">{t('policy.col.date', 'Data')}</th>
              <th className="py-2 pr-3">{t('policy.col.decidedBy', 'Quem decidiu')}</th>
              <th className="py-2 pr-3">{t('policy.col.reason', 'Motivo da rejeição')}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.id}
                data-testid={`policy-row-${r.id}`}
                className={`border-t border-neutral-800 ${r.status === 'PROPOSED' ? 'bg-amber-950/20 text-amber-200' : 'text-neutral-300'}`}
              >
                <td className="py-2 pr-3">{t(TARGET_LABEL[r.target][0], TARGET_LABEL[r.target][1])}</td>
                <td className="py-2 pr-3">v{r.version}</td>
                <td className="py-2 pr-3">{t(STATUS_LABEL[r.status][0], STATUS_LABEL[r.status][1])}</td>
                <td className="py-2 pr-3">{instant(r.decidedAt ?? r.createdAt)}</td>
                <td className="py-2 pr-3">{decider(r)}</td>
                <td className="py-2 pr-3">{r.decisionReason ?? '—'}</td>
                <td className="py-2 text-right">
                  <button type="button" onClick={() => setOpenId(r.id)} className="text-emerald-400 hover:underline">
                    {t('policy.list.open', 'Ver')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {openId && (
        <PolicyVersionDetailModal
          versionId={openId}
          unitId={unitId}
          governance={governance}
          onClose={() => setOpenId(null)}
          onChanged={() => void load()}
          onAssignmentLost={onAssignmentLost}
        />
      )}
    </section>
  );
}
