import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import {
  accountantAssignmentsService,
  type AccountantAssignmentView,
} from '../../../lib/services/accountantAssignments.service';
import type { AccountingContact } from '../../../lib/services/accountingContacts.service';
import type { InviteAccountantInput } from '@/types/contracts/accounting/AccountantAssignmentDto.gen';
import { useAccountingT } from '../lib/useAccountingT';
import { Field, inputClass } from '../components/SpedGenerationPanel';
import { resolveGovernanceError } from './governanceError';

const alertBox = 'rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300';
const submitBtn = 'rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50';

/** Estado comum dos 3 modais: ocupado + mensagem do erro nomeado traduzido (BRIEF §1). */
function useAssignmentCommand<T>(onDone: (result: T) => void) {
  const { t, tRef } = useAccountingT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<T>) => {
    setBusy(true);
    setError(null);
    try {
      onDone(await fn());
    } catch (err: unknown) {
      setError(resolveGovernanceError(err, tRef.current, t('governance.error.generic', 'Não foi possível concluir a operação.')).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

/** Convite (dono, item 5): contato ativo do escopo + e-mail do contador. */
export function InviteAccountantModal({
  unitId,
  contacts,
  onClose,
  onDone,
}: {
  unitId: string;
  contacts: AccountingContact[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useAccountingT();
  const [contactId, setContactId] = useState('');
  const [email, setEmail] = useState('');
  const cmd = useAssignmentCommand<AccountantAssignmentView>(onDone);
  const valid = contactId !== '' && email.trim() !== '';
  const submit = () => {
    const body: InviteAccountantInput = { unitId, accountingContactId: contactId, accountantEmail: email.trim() };
    void cmd.run(() => accountantAssignmentsService.invite(body));
  };
  return (
    <Modal
      isOpen
      onClose={() => { if (!cmd.busy) onClose(); }}
      title={t('governance.invite.title', 'Convidar contador responsável')}
      maxWidth="max-w-lg"
      themeColor="bg-emerald-600"
      footer={
        <button type="button" onClick={submit} disabled={cmd.busy || !valid} className={submitBtn}>
          {t('governance.invite.submit', 'Convidar')}
        </button>
      }
    >
      <div className="space-y-4 px-6 py-5 text-sm">
        <Field label={t('governance.invite.contact', 'Contador do cadastro')}>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
            <option value="">{t('governance.invite.pickContact', 'Selecione o contador…')}</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.crcNumber}</option>)}
          </select>
          {contacts.length === 0 && (
            <span className="text-neutral-500">{t('governance.invite.noContacts', 'Nenhum contador cadastrado neste escopo. Cadastre um na seção "Contadores" logo abaixo.')}</span>
          )}
        </Field>
        <Field label={t('governance.invite.email', 'E-mail do contador (conta já cadastrada)')}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        {cmd.error && <div role="alert" className={alertBox}>{cmd.error}</div>}
      </div>
    </Modal>
  );
}

/** Encerrar (dono e contador, itens 5 e 6.6): motivo obrigatório 1..500 + o aviso do F-GOV-10 (a)/F-GOV-11 (a). */
export function EndAssignmentModal({
  assignmentId,
  side,
  onClose,
  onDone,
}: {
  assignmentId: string;
  side: 'owner' | 'accountant';
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useAccountingT();
  const [reason, setReason] = useState('');
  const cmd = useAssignmentCommand<AccountantAssignmentView>(onDone);
  const trimmed = reason.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 500;
  return (
    <Modal
      isOpen
      onClose={() => { if (!cmd.busy) onClose(); }}
      title={t('governance.end.title', 'Encerrar atribuição')}
      maxWidth="max-w-lg"
      themeColor="bg-red-600"
      footer={
        <button
          type="button"
          onClick={() => void cmd.run(() => accountantAssignmentsService.end(assignmentId, { reason: trimmed }))}
          disabled={cmd.busy || !valid}
          className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('governance.end.submit', 'Encerrar')}
        </button>
      }
    >
      <div className="space-y-4 px-6 py-5 text-sm">
        <p className="text-xs text-red-300">
          {side === 'owner'
            ? t('governance.end.warnOwner', 'Encerrar devolve a você a reabertura e a assinatura de todos os períodos, inclusive os que este contador cobriu.')
            : t('governance.end.warnAccountant', 'Encerrar devolve ao dono do livro a reabertura e a assinatura de todos os períodos, inclusive os que você cobriu. Você perde o acesso a este livro.')}
        </p>
        <Field label={t('governance.end.reason', 'Motivo (obrigatório)')}>
          <textarea value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </Field>
        {cmd.error && <div role="alert" className={alertBox}>{cmd.error}</div>}
      </div>
    </Modal>
  );
}

/**
 * Aceite (contador, item 7): checkbox obrigatório de contrato escrito → corpo fixo `{ declaresWrittenContract: true }`
 * (o tipo gerado é o literal `true`; o serviço manda o corpo, o botão só habilita marcado).
 */
export function AcceptAssignmentModal({
  assignmentId,
  ownerEmail,
  onClose,
  onDone,
}: {
  assignmentId: string;
  ownerEmail: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useAccountingT();
  const [declares, setDeclares] = useState(false);
  const cmd = useAssignmentCommand<AccountantAssignmentView>(onDone);
  useEffect(() => { setDeclares(false); }, [assignmentId]);
  return (
    <Modal
      isOpen
      onClose={() => { if (!cmd.busy) onClose(); }}
      title={t('governance.accept.title', 'Aceitar atribuição')}
      maxWidth="max-w-lg"
      themeColor="bg-emerald-600"
      footer={
        <button
          type="button"
          onClick={() => void cmd.run(() => accountantAssignmentsService.accept(assignmentId))}
          disabled={cmd.busy || !declares}
          className={submitBtn}
        >
          {t('governance.accept.submit', 'Aceitar')}
        </button>
      }
    >
      <div className="space-y-4 px-6 py-5 text-sm">
        <p className="text-xs text-neutral-400">
          {t('governance.accept.hint', 'Ao aceitar, você passa a reabrir períodos e assinar revisões no livro de {{owner}}. A Res. CFC 1.590 (arts. 1º e 5º) exige contrato escrito de prestação de serviços.', { owner: ownerEmail })}
        </p>
        <label className="flex items-start gap-2 text-neutral-300">
          <input type="checkbox" checked={declares} onChange={(e) => setDeclares(e.target.checked)} className="mt-0.5" />
          <span>{t('governance.accept.declare', 'Declaro que existe contrato escrito de prestação de serviços com este cliente.')}</span>
        </label>
        {cmd.error && <div role="alert" className={alertBox}>{cmd.error}</div>}
      </div>
    </Modal>
  );
}
