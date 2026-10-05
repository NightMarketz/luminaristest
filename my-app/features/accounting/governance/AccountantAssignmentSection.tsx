import { useCallback, useEffect, useState } from 'react';
import { FiUserPlus } from 'react-icons/fi';
import {
  accountantAssignmentsService,
  type AccountantAssignmentView,
  type AssignmentStatus,
} from '../../../lib/services/accountantAssignments.service';
import { accountingContactsService, type AccountingContact } from '../../../lib/services/accountingContacts.service';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { formatTimestamp } from '../components/ReviewPanel';
import { EndAssignmentModal, InviteAccountantModal } from './AssignmentModals';

const th = 'px-3 py-2.5 font-medium';
const td = 'px-3 py-2';
const smallBtn =
  'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40';

const STATUS_TONE: Record<AssignmentStatus, string> = {
  PENDING: 'bg-amber-600/15 text-amber-300',
  ACTIVE: 'bg-emerald-600/15 text-emerald-300',
  ENDED: 'bg-neutral-700/60 text-neutral-400',
};

export interface AccountantAssignmentSectionProps {
  unitId: string;
}

/**
 * "Contador responsável" (FE-INCR-ACCOUNTANT-GOVERNANCE item 4) — seção do DONO na aba Compliance, antes da
 * Entrega ao contador. Mostra a atribuição ACTIVE e a PENDING do escopo, o histórico e os botões Convidar /
 * Encerrar. O convite parte de um contato do cadastro (`AccountingContact`, a fonte do CRC do snapshot).
 * Tabela `<table>` + `Modal`, como os demais painéis de linha Prisma do módulo (o `GenericTable` é do
 * DynamicTable — BRIEF E-8 diz o contrário, mas `FixedAssetsSection`/`LalurPanel` documentam a divergência).
 */
export function AccountantAssignmentSection({ unitId }: AccountantAssignmentSectionProps) {
  const { t, tRef } = useAccountingT();
  const [rows, setRows] = useState<AccountantAssignmentView[]>([]);
  const [contacts, setContacts] = useState<AccountingContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [ending, setEnding] = useState<AccountantAssignmentView | null>(null);

  const load = useCallback(async () => {
    if (!unitId) return;
    try {
      setRows(await accountantAssignmentsService.listByScope(unitId));
      setError(null);
    } catch (err: unknown) {
      setError(resolveError(err, tRef.current('governance.error.load', 'Erro ao carregar as atribuições do contador.')));
    }
    try {
      setContacts((await accountingContactsService.listContacts(unitId)).filter((c) => c.deletedAt === null));
    } catch {
      setContacts([]);
    }
  }, [unitId, tRef]);

  useEffect(() => { void load(); }, [load]);

  const contactName = (id: string) => contacts.find((c) => c.id === id)?.name ?? '—';
  const active = rows.find((r) => r.status === 'ACTIVE') ?? null;
  const pending = rows.find((r) => r.status === 'PENDING') ?? null;
  const done = () => { setInviting(false); setEnding(null); void load(); };

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5" data-testid="accountant-assignment-section">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-neutral-200">{t('governance.section.title', 'Contador responsável')}</h2>
          <p className="text-sm text-neutral-500">{t('governance.section.subtitle', 'Com um contador ativo, só ele reabre períodos e assina revisões deste escopo.')}</p>
        </div>
        <button
          type="button"
          onClick={() => setInviting(true)}
          disabled={!!pending}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiUserPlus size={14} /> {t('governance.section.invite', 'Convidar')}
        </button>
      </div>

      {error && <div role="alert" className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="mb-4 space-y-1 text-sm text-neutral-300">
        {active && (
          <p data-testid="assignment-active">
            {t('governance.section.active', 'Ativo: {{name}} · {{crc}} · desde {{since}}', {
              name: contactName(active.accountingContactId),
              crc: active.crcNumber,
              since: formatTimestamp(active.activeFrom),
            })}
          </p>
        )}
        {pending && (
          <p data-testid="assignment-pending">
            {t('governance.section.pending', 'Convite pendente: {{name}} · {{crc}} — aguardando o aceite do contador.', {
              name: contactName(pending.accountingContactId),
              crc: pending.crcNumber,
            })}
          </p>
        )}
        {!active && !pending && <p className="text-neutral-500">{t('governance.section.none', 'Sem contador responsável neste escopo.')}</p>}
        <div className="flex gap-2 pt-1">
          {active && <button type="button" onClick={() => setEnding(active)} className={smallBtn}>{t('governance.section.endActive', 'Encerrar atribuição')}</button>}
          {pending && <button type="button" onClick={() => setEnding(pending)} className={smallBtn}>{t('governance.section.endPending', 'Cancelar convite')}</button>}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800">
          <table className="w-full text-sm" data-testid="assignment-history">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className={th}>{t('governance.col.status', 'Status')}</th>
                <th className={th}>{t('governance.col.contact', 'Contador')}</th>
                <th className={th}>{t('governance.col.crc', 'CRC')}</th>
                <th className={th}>{t('governance.col.validity', 'Vigência')}</th>
                <th className={th}>{t('governance.col.endReason', 'Motivo do encerramento')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-800/60 last:border-0">
                  <td className={td}>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[r.status]}`}>{t(`governance.status.${r.status}`, r.status)}</span>
                  </td>
                  <td className={td}>{contactName(r.accountingContactId)}</td>
                  <td className={`${td} font-mono text-xs`}>{r.crcNumber}</td>
                  <td className={`${td} text-xs`}>{formatTimestamp(r.activeFrom)} → {r.activeUntil ? formatTimestamp(r.activeUntil) : '—'}</td>
                  <td className={`${td} text-xs text-neutral-400`}>{r.endReason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inviting && <InviteAccountantModal unitId={unitId} contacts={contacts} onClose={() => setInviting(false)} onDone={done} />}
      {ending && <EndAssignmentModal assignmentId={ending.id} side="owner" onClose={() => setEnding(null)} onDone={done} />}
    </section>
  );
}
