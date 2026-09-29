import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiArchive, FiCopy, FiDownload, FiEdit2, FiPlusCircle, FiRefreshCw, FiSliders } from 'react-icons/fi';
import { Modal } from '../../../components/ui/Modal';
import {
  accountingContactsService,
  type AccountingContact,
  type RegisterContactInput,
  type UpdateContactInput,
} from '../../../lib/services/accountingContacts.service';
import {
  DELIVERABLE_EXPORT_KINDS,
  accountingDeliveryService,
  type ConfirmDeliveryResult,
  type DeliverableExportKind,
  type DeliveryManifestPreview,
  type DeliveryStatus,
  type DeliveryWithItems,
} from '../../../lib/services/accountingDelivery.service';
import { dataExchangeService, type DataExchangeJobListItem } from '../../../lib/services/dataExchange.service';
import type { BuildDeliveryPackageInput, ConfirmDeliveryInput } from '@/types/contracts/accounting/AccountingDeliveryDto.gen';
import { resolveErrorWithCode } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { formatDate, scopeToday } from '../lib/formatDate';
import { Field, UF_CODES, inputClass } from './SpedGenerationPanel';
import { JobPicker, formatTimestamp, shortId } from './ReviewPanel';

/** Rótulo de cada `ExportKind` que pode aparecer num manifesto: os 3 SPED do núcleo + os 6 extras (BRIEF item 12). */
export const EXPORT_KIND_LABEL: Record<string, string> = {
  EXPORT_SPED_ECD: 'ECD',
  EXPORT_SPED_ECF: 'ECF (Presumido)',
  EXPORT_SPED_ECF_REAL: 'ECF (Lucro Real)',
  EXPORT_TRIAL_BALANCE: 'Balancete',
  EXPORT_GENERAL_LEDGER: 'Razão geral',
  EXPORT_BALANCE_SHEET: 'Balanço patrimonial',
  EXPORT_INCOME_STATEMENT: 'DRE',
  EXPORT_BANK_RECONCILIATION: 'Conciliação bancária',
  EXPORT_ENTRY_SAMPLE: 'Amostra de lançamentos',
};
export const REVIEW_PANEL_ANCHOR = 'review-panel';

export type DeliveryOwnerTab = 'periodos' | 'importacao-exportacao';

export interface DeliveryPanelProps {
  unitId: string;
  onNavigateTab: (tab: DeliveryOwnerTab) => void;
}

/**
 * Entrega ao contador (FE-INCR-DELIVERY PR-D2; F-FE-DL-2 → a: seção da Compliance depois da revisão — gerar →
 * revisar → entregar). O SISTEMA NÃO ENVIA NADA (F-CD1-a): `SENT` registra que o operador despachou pelo canal
 * dele. Três sub-seções: Contadores (F-FE-DL-1 → a, com o perfil de pacote), Montar pacote (build → manifesto →
 * confirmar com checkbox explícito → recibo com download por arquivo, F-FE-DL-3 → a) e Entregas (lista do PR-D1,
 * F-FE-DL-4 → a, com retry de FAILED). Policy é do escopo: nenhum botão some por role; o 403 aparece íntegro.
 */
export function DeliveryPanel({ unitId, onNavigateTab }: DeliveryPanelProps) {
  const { t, tRef } = useAccountingT();
  const [contacts, setContacts] = useState<AccountingContact[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!unitId) return;
    try {
      setContacts((await accountingContactsService.listContacts(unitId)).filter((c) => c.deletedAt === null));
      setContactsError(null);
    } catch (err: unknown) {
      setContactsError(resolveErrorWithCode(err, tRef.current('delivery.error.contacts', 'Erro ao carregar os contadores.')).message);
    }
  }, [unitId, tRef]);

  useEffect(() => { void fetchContacts(); }, [fetchContacts]);
  const [historyKey, setHistoryKey] = useState(0);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5" data-testid="delivery-panel">
      <h2 className="mb-1 text-lg font-semibold text-neutral-200">{t('delivery.title', 'Entrega ao contador')}</h2>
      <p className="mb-5 text-sm text-neutral-500">{t('delivery.subtitle', 'O sistema não envia nada — registra que você despachou o pacote pelo seu canal.')}</p>
      <ContactsSection unitId={unitId} contacts={contacts} error={contactsError} onChanged={() => void fetchContacts()} />
      <BuildSection unitId={unitId} contacts={contacts} onNavigateTab={onNavigateTab} onDelivered={() => setHistoryKey((k) => k + 1)} />
      <HistorySection key={historyKey} unitId={unitId} contacts={contacts} />
    </section>
  );
}

const th = 'px-3 py-2.5 font-medium';
const td = 'px-3 py-2';
const smallBtn =
  'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40';
const primaryBtn = 'inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50';
const alertBox = 'rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300';

// ── Contadores (itens 3–4) ──────────────────────────────────────────────────────

function ContactsSection({ unitId, contacts, error, onChanged }: { unitId: string; contacts: AccountingContact[]; error: string | null; onChanged: () => void }) {
  const { t } = useAccountingT();
  const [editing, setEditing] = useState<{ open: boolean; contact: AccountingContact | null }>({ open: false, contact: null });
  const [profileOf, setProfileOf] = useState<AccountingContact | null>(null);
  const [toArchive, setToArchive] = useState<AccountingContact | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  async function archive() {
    if (!toArchive) return;
    setArchiveError(null);
    try {
      await accountingContactsService.archiveContact(toArchive.id, unitId);
      setToArchive(null);
      onChanged();
    } catch (err: unknown) {
      setArchiveError(resolveErrorWithCode(err, t('delivery.error.generic', 'Não foi possível concluir a operação.')).message);
    }
  }

  return (
    <div className="mb-8" data-testid="delivery-contacts">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">{t('contacts.heading', 'Contadores')}</h3>
        <button type="button" onClick={() => setEditing({ open: true, contact: null })} className={primaryBtn}>
          <FiPlusCircle size={14} /> {t('contacts.new', 'Novo contador')}
        </button>
      </div>
      {error && <div role="alert" className={`mb-3 ${alertBox}`}>{error}</div>}
      {contacts.length === 0 ? (
        <div className="py-4 text-center text-sm text-neutral-500">{t('contacts.empty', 'Nenhum contador cadastrado.')}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className={th}>{t('contacts.col.name', 'Nome')}</th>
                <th className={th}>{t('contacts.col.email', 'E-mail')}</th>
                <th className={th}>CRC</th>
                <th className={th}>{t('contacts.col.certificate', 'Certidão (validade)')}</th>
                <th className={th}>{t('delivery.col.actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-neutral-800/60 last:border-0">
                  <td className={td}>{c.name}</td>
                  <td className={`${td} text-xs`}>{c.email}</td>
                  <td className={`${td} font-mono text-xs`}>{c.crcNumber} · {c.crcUf}</td>
                  <td className={`${td} text-xs`}>
                    {c.crcCertificate ?? '—'}{c.crcCertificateValidUntil ? ` (${formatDate(c.crcCertificateValidUntil)})` : ''}
                  </td>
                  <td className={td}>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setEditing({ open: true, contact: c })} className={smallBtn}><FiEdit2 size={11} /> {t('delivery.action.edit', 'Editar')}</button>
                      <button type="button" onClick={() => setProfileOf(c)} className={smallBtn}><FiSliders size={11} /> {t('contacts.profile', 'Perfil de pacote')}</button>
                      <button type="button" onClick={() => { setArchiveError(null); setToArchive(c); }} className={`${smallBtn} hover:border-amber-700 hover:text-amber-300`}><FiArchive size={11} /> {t('delivery.action.archive', 'Arquivar')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing.open && <ContactModal unitId={unitId} contact={editing.contact} onClose={() => setEditing({ open: false, contact: null })} onDone={() => { setEditing({ open: false, contact: null }); onChanged(); }} />}
      {profileOf && <ProfileModal unitId={unitId} contact={profileOf} onClose={() => setProfileOf(null)} />}
      <Modal
        isOpen={!!toArchive}
        onClose={() => setToArchive(null)}
        title={t('contacts.archiveTitle', 'Arquivar contador')}
        themeColor="bg-amber-600"
        maxWidth="max-w-md"
        footer={<button type="button" onClick={() => void archive()} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500">{t('delivery.confirmAction', 'Confirmar')}</button>}
      >
        <div className="space-y-3 px-6 py-5 text-sm text-neutral-300">
          <p>{toArchive?.name} — {toArchive?.crcNumber}</p>
          <p className="text-neutral-400">{t('contacts.archiveNote', 'O contador sai da lista e do despacho; as entregas antigas continuam no histórico.')}</p>
          {archiveError && <div role="alert" className={alertBox}>{archiveError}</div>}
        </div>
      </Modal>
    </div>
  );
}

/** Item 3: criar/editar — body do `RegisterContactSchema`; na edição, `contactId` = `:id` e `null` limpa. */
function ContactModal({ unitId, contact, onClose, onDone }: { unitId: string; contact: AccountingContact | null; onClose: () => void; onDone: () => void }) {
  const { t } = useAccountingT();
  const [name, setName] = useState(contact?.name ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [cpf, setCpf] = useState(contact?.cpf ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [crcNumber, setCrcNumber] = useState(contact?.crcNumber ?? '');
  const [crcUf, setCrcUf] = useState(contact?.crcUf ?? '');
  const [crcCertificate, setCrcCertificate] = useState(contact?.crcCertificate ?? '');
  const [validUntil, setValidUntil] = useState(contact?.crcCertificateValidUntil?.slice(0, 10) ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim() !== '' && email.trim() !== '' && cpf.trim() !== '' && crcNumber.trim() !== '' && crcUf !== '';

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (contact) {
        const body: UpdateContactInput = {
          unitId,
          contactId: contact.id,
          name: name.trim(),
          email: email.trim(),
          cpf: cpf.trim(),
          phone: phone.trim() || null,
          crcNumber: crcNumber.trim(),
          crcUf: crcUf as UpdateContactInput['crcUf'], // ponytail: folha string → união (<select> de UF_CODES)
          crcCertificate: crcCertificate.trim() || null,
          crcCertificateValidUntil: validUntil || null,
        };
        await accountingContactsService.updateContact(contact.id, body);
      } else {
        const body: RegisterContactInput = {
          unitId,
          name: name.trim(),
          email: email.trim(),
          cpf: cpf.trim(),
          crcNumber: crcNumber.trim(),
          crcUf: crcUf as RegisterContactInput['crcUf'], // ponytail: folha string → união (<select> de UF_CODES)
        };
        if (phone.trim()) body.phone = phone.trim();
        if (crcCertificate.trim()) body.crcCertificate = crcCertificate.trim();
        if (validUntil) body.crcCertificateValidUntil = validUntil;
        await accountingContactsService.registerContact(body);
      }
      onDone();
    } catch (err: unknown) {
      setError(resolveErrorWithCode(err, t('delivery.error.generic', 'Não foi possível concluir a operação.')).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => { if (!busy) onClose(); }}
      title={contact ? t('contacts.editTitle', 'Editar contador') : t('contacts.newTitle', 'Novo contador')}
      maxWidth="max-w-2xl"
      themeColor="bg-emerald-600"
      footer={<button type="button" onClick={() => void submit()} disabled={!valid || busy} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{t('delivery.save', 'Salvar')}</button>}
    >
      <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
        <Field label={t('contacts.field.name', 'Nome')}><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
        <Field label={t('contacts.field.email', 'E-mail')}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></Field>
        <Field label={t('contacts.field.cpf', 'CPF')}><input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className={inputClass} /></Field>
        <Field label={t('contacts.field.phone', 'Fone (opcional; a ECF exige)')}><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} /></Field>
        <Field label={t('contacts.field.crcNumber', 'CRC')}><input value={crcNumber} onChange={(e) => setCrcNumber(e.target.value)} placeholder="SP-123456/O-1" className={inputClass} /></Field>
        <Field label={t('contacts.field.crcUf', 'UF do CRC')}>
          <select value={crcUf} onChange={(e) => setCrcUf(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {UF_CODES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </Field>
        <Field label={t('contacts.field.certificate', 'Certidão de regularidade (opcional)')}><input value={crcCertificate} onChange={(e) => setCrcCertificate(e.target.value)} placeholder="SP/2026/000123" className={inputClass} /></Field>
        <Field label={t('contacts.field.validUntil', 'Validade da certidão (opcional)')}><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} /></Field>
        {error && <div role="alert" className={`sm:col-span-2 ${alertBox}`}>{error}</div>}
      </div>
    </Modal>
  );
}

/** Item 4: perfil de pacote por contato — sugestão, não gate. `GET` com `kinds: []` ⇒ nada marcado. */
function ProfileModal({ unitId, contact, onClose }: { unitId: string; contact: AccountingContact; onClose: () => void }) {
  const { t } = useAccountingT();
  const [kinds, setKinds] = useState<DeliverableExportKind[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    accountingDeliveryService.getProfile(unitId, contact.id).then((p) => setKinds(p.kinds)).catch(() => setKinds([]));
  }, [unitId, contact.id]);
  const toggle = (k: DeliverableExportKind) => setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));
  async function save() {
    try {
      await accountingDeliveryService.setProfile(unitId, contact.id, kinds);
      onClose();
    } catch (err: unknown) {
      setError(resolveErrorWithCode(err, t('delivery.error.generic', 'Não foi possível concluir a operação.')).message);
    }
  }
  return (
    <Modal isOpen onClose={onClose} title={t('contacts.profileTitle', 'Perfil de pacote — {{name}}', { name: contact.name })} maxWidth="max-w-md" themeColor="bg-emerald-600"
      footer={<button type="button" onClick={() => void save()} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500">{t('delivery.save', 'Salvar')}</button>}>
      <div className="space-y-2 px-6 py-5 text-sm text-neutral-300">
        <p className="text-xs text-neutral-500">{t('contacts.profileHint', 'Sugestão: estes extras vêm pré-marcados ao montar o pacote para este contador.')}</p>
        {DELIVERABLE_EXPORT_KINDS.map((k) => (
          <label key={k} className="flex items-center gap-2">
            <input type="checkbox" checked={kinds.includes(k)} onChange={() => toggle(k)} />
            {t(`delivery.kind.${k}`, EXPORT_KIND_LABEL[k])}
          </label>
        ))}
        {error && <div role="alert" className={alertBox}>{error}</div>}
      </div>
    </Modal>
  );
}

// ── Montar pacote e confirmar despacho (itens 5–8) ─────────────────────────────

function BuildSection({
  unitId,
  contacts,
  onNavigateTab,
  onDelivered,
}: {
  unitId: string;
  contacts: AccountingContact[];
  onNavigateTab: (tab: DeliveryOwnerTab) => void;
  onDelivered: () => void;
}) {
  const { t } = useAccountingT();
  const [year, setYear] = useState(Number(scopeToday().slice(0, 4)));
  const [contactId, setContactId] = useState('');
  const [ecdJobId, setEcdJobId] = useState('');
  const [ecfJobId, setEcfJobId] = useState('');
  const [extraJobs, setExtraJobs] = useState<DataExchangeJobListItem[]>([]);
  const [extraJobIds, setExtraJobIds] = useState<string[]>([]);
  const [manifest, setManifest] = useState<DeliveryManifestPreview | null>(null);
  const [builtWith, setBuiltWith] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [receipt, setReceipt] = useState<ConfirmDeliveryResult | null>(null);

  // Extras candidatos: jobs EXPORTED do exercício com kind entregável.
  useEffect(() => {
    let cancelled = false;
    dataExchangeService
      .listJobs(unitId, { direction: 'EXPORT', status: 'EXPORTED', year, limit: 100 })
      .then((p) => { if (!cancelled) setExtraJobs(p.items.filter((j) => (DELIVERABLE_EXPORT_KINDS as readonly string[]).includes(j.kind))); })
      .catch(() => { if (!cancelled) setExtraJobs([]); });
    return () => { cancelled = true; };
  }, [unitId, year]);

  // Item 5: o perfil do contato pré-marca os extras daquele kind (sugestão; o operador muda).
  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    accountingDeliveryService
      .getProfile(unitId, contactId)
      .then((p) => { if (!cancelled) setExtraJobIds(extraJobs.filter((j) => (p.kinds as string[]).includes(j.kind)).map((j) => j.id).slice(0, 20)); })
      .catch(() => { /* sem perfil = nada pré-marcado */ });
    return () => { cancelled = true; };
  }, [unitId, contactId, extraJobs]);

  const selection = JSON.stringify({ ecdJobId, ecfJobId, extraJobIds });
  const stale = manifest !== null && builtWith !== selection; // mudou a seleção depois do build: valide de novo

  async function build() {
    setBusy(true);
    setError(null);
    setManifest(null);
    try {
      const body: BuildDeliveryPackageInput = { unitId, ecdJobId, ecfJobId, extraJobIds };
      setManifest(await accountingDeliveryService.build(body));
      setBuiltWith(selection);
      setConfirmed(false);
    } catch (err: unknown) {
      setError(resolveErrorWithCode(err, t('delivery.error.generic', 'Não foi possível concluir a operação.')));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!confirmed || !contactId) return;
    setBusy(true);
    setError(null);
    try {
      // O MESMO conjunto do build (divergir de entrega existente = 409 PACKAGE_ALREADY_DELIVERED).
      const body: ConfirmDeliveryInput = { unitId, ecdJobId, ecfJobId, contactId, confirmed: true, extraJobIds };
      setReceipt(await accountingDeliveryService.confirm(body));
      setManifest(null);
      setConfirmed(false);
      onDelivered();
    } catch (err: unknown) {
      setError(resolveErrorWithCode(err, t('delivery.error.generic', 'Não foi possível concluir a operação.')));
    } finally {
      setBusy(false);
    }
  }

  const reviewBlocked = error?.code === 'REVIEW_REQUIRED' || error?.code === 'REVIEW_REJECTED';
  const periodNotClosed = !!error && /HARD_CLOSED|Feche o período/i.test(error.message);
  const extraWithoutPeriod = !!error && /sem período|não tem período/i.test(error.message);

  return (
    <div className="mb-8" data-testid="delivery-build">
      <h3 className="mb-3 text-sm font-semibold text-neutral-300">{t('delivery.build.heading', 'Montar pacote')}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('delivery.build.year', 'Exercício')}>
          <input type="number" value={year} onChange={(e) => { setYear(Number(e.target.value)); setEcdJobId(''); setEcfJobId(''); setExtraJobIds([]); }} className={inputClass} />
        </Field>
        <Field label={t('delivery.build.contact', 'Contador destinatário')}>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
            <option value="">{t('delivery.build.pickContact', 'Selecione…')}</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.crcNumber}</option>)}
          </select>
        </Field>
        <JobPicker unitId={unitId} year={year} layout="ECD" value={ecdJobId} onChange={setEcdJobId} label={t('review.job.ecd', 'Arquivo da ECD (EXPORTED)')} />
        <JobPicker unitId={unitId} year={year} layout="ECF" value={ecfJobId} onChange={setEcfJobId} label={t('review.job.ecf', 'Arquivo da ECF (EXPORTED)')} />
      </div>
      <div className="mt-3">
        <span className="text-xs text-neutral-400">{t('delivery.build.extras', 'Extras (máx. 20) — só relatórios gerados com período')}</span>
        {extraJobs.length === 0 ? (
          <p className="text-xs text-neutral-500">{t('delivery.build.noExtras', 'Nenhum relatório EXPORTED no exercício — gere na aba Importação/Exportação.')}</p>
        ) : (
          <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {extraJobs.map((j) => (
              <label key={j.id} className="flex items-center gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={extraJobIds.includes(j.id)}
                  disabled={!extraJobIds.includes(j.id) && extraJobIds.length >= 20}
                  onChange={() => setExtraJobIds((ids) => (ids.includes(j.id) ? ids.filter((x) => x !== j.id) : [...ids, j.id]))}
                />
                {t(`delivery.kind.${j.kind}`, EXPORT_KIND_LABEL[j.kind] ?? j.kind)} · {shortId(j.id)} · {formatTimestamp(j.createdAt)}
              </label>
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={() => void build()} disabled={busy || !ecdJobId || !ecfJobId} className={`mt-3 ${primaryBtn}`}>
        {t('delivery.build.validate', 'Validar pacote')}
      </button>

      {error && (
        <div role="alert" className={`mt-3 space-y-1 ${alertBox}`}>
          <p>{error.message}</p>
          {reviewBlocked && (
            <button type="button" onClick={() => document.getElementById(REVIEW_PANEL_ANCHOR)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })} className="underline">
              {t('delivery.build.toReview', 'Revisão profissional ↑')}
            </button>
          )}
          {periodNotClosed && <button type="button" onClick={() => onNavigateTab('periodos')} className="underline">{t('delivery.build.toPeriods', 'Períodos')}</button>}
          {extraWithoutPeriod && (
            <button type="button" onClick={() => onNavigateTab('importacao-exportacao')} className="underline">
              {t('delivery.build.toExports', 'Gere o relatório com período na aba Importação/Exportação')}
            </button>
          )}
        </div>
      )}

      {manifest && (
        <div className="mt-4 space-y-3 rounded-2xl border border-neutral-800 p-4" data-testid="delivery-manifest">
          {stale && <p className="text-xs text-amber-300">{t('delivery.build.stale', 'A seleção mudou depois da validação — valide de novo.')}</p>}
          <ManifestView manifest={manifest} unitId={unitId} />
          <label className="flex items-start gap-2 text-xs text-neutral-300">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            {t('delivery.confirm.checkbox', 'Confirmo que despachei este pacote ao contador pelo meu canal (e-mail/portal); o sistema não envia.')}
          </label>
          <button type="button" onClick={() => void confirm()} disabled={busy || !confirmed || !contactId || stale} className={primaryBtn}>
            {t('delivery.confirm.submit', 'Registrar despacho')}
          </button>
        </div>
      )}

      {receipt && <ReceiptModal receipt={receipt} unitId={unitId} onClose={() => setReceipt(null)} />}
    </div>
  );
}

/** Item 6: manifesto — período, ledgerCode, arquivos na ordem de `position` com o `kind` traduzido e o sha256 curto. */
function ManifestView({ manifest, unitId }: { manifest: DeliveryManifestPreview; unitId: string }) {
  const { t } = useAccountingT();
  return (
    <div className="space-y-2 text-xs text-neutral-300">
      <p>
        {t('delivery.manifest.period', 'Período')}: {formatDate(manifest.period.start)} – {formatDate(manifest.period.end)} · {t('delivery.manifest.ledger', 'Livro')}: {manifest.scope.ledgerCode} · {formatTimestamp(manifest.generatedAt)}
      </p>
      <table className="w-full">
        <tbody>
          {manifest.files.map((f) => (
            <tr key={f.jobId} className="border-b border-neutral-800/60 last:border-0" data-testid="manifest-file">
              <td className="py-1 pr-3">{t(`delivery.kind.${f.kind}`, EXPORT_KIND_LABEL[f.kind] ?? f.kind)}</td>
              <td className="py-1 pr-3 font-mono">{shortId(f.jobId)}</td>
              <td className="py-1 pr-3 font-mono" title={f.sha256}>{f.sha256.slice(0, 12)}</td>
              <td className="py-1">
                <div className="flex gap-1.5">
                  <button type="button" aria-label={t('delivery.manifest.copySha', 'Copiar sha256')} onClick={() => void navigator.clipboard?.writeText(f.sha256)} className={smallBtn}><FiCopy size={11} /></button>
                  <button type="button" onClick={() => void dataExchangeService.downloadArtifact(f.jobId, unitId, `${f.kind.toLowerCase()}-${f.jobId.slice(0, 8)}`)} className={smallBtn}>
                    <FiDownload size={11} /> {t('delivery.manifest.download', 'Baixar')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Item 7: recibo — `status`/`statusMeaning` como devolvidos (não se traduz a semântica), contato, signatário J930, manifesto. */
function ReceiptModal({ receipt, unitId, onClose }: { receipt: ConfirmDeliveryResult; unitId: string; onClose: () => void }) {
  const { t } = useAccountingT();
  return (
    <Modal isOpen onClose={onClose} title={t('delivery.receipt.title', 'Despacho registrado')} maxWidth="max-w-2xl" themeColor="bg-emerald-600"
      footer={
        <button type="button" onClick={() => void navigator.clipboard?.writeText(JSON.stringify(receipt.manifest, null, 2))} className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700">
          <FiCopy size={14} /> {t('delivery.receipt.copyManifest', 'Copiar manifesto (JSON)')}
        </button>
      }>
      <div className="space-y-3 px-6 py-5 text-sm text-neutral-300" data-testid="delivery-receipt">
        <p className="font-mono text-xs">{receipt.deliveryId}</p>
        <p><span className="font-semibold">{receipt.status}</span> — {receipt.statusMeaning}</p>
        <p>{receipt.contact.name} · {receipt.contact.crcNumber}/{receipt.contact.crcUf}</p>
        <div className="rounded-xl border border-neutral-800 p-3 text-xs">
          <p className="mb-1 font-semibold text-neutral-400">{t('delivery.receipt.signer', 'Signatário (J930)')}</p>
          {Object.entries(receipt.signer).map(([k, v]) => <div key={k}><span className="text-neutral-500">{k}:</span> {v}</div>)}
        </div>
        <ManifestView manifest={receipt.manifest} unitId={unitId} />
      </div>
    </Modal>
  );
}

// ── Entregas (itens 9–10) ─────────────────────────────────────────────────────

function HistorySection({ unitId, contacts }: { unitId: string; contacts: AccountingContact[] }) {
  const { t, tRef } = useAccountingT();
  const [status, setStatus] = useState<DeliveryStatus | ''>('');
  const [rows, setRows] = useState<DeliveryWithItems[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DeliveryWithItems | null>(null);
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const load = useCallback(async () => {
    try {
      setRows((await accountingDeliveryService.list(unitId, { status: status || undefined, limit: 50 })).items);
      setError(null);
    } catch (err: unknown) {
      setError(resolveErrorWithCode(err, tRef.current('delivery.error.history', 'Erro ao carregar as entregas.')).message);
    }
  }, [unitId, status, tRef]);
  useEffect(() => { void load(); }, [load]);

  async function retry(id: string) {
    try {
      await accountingDeliveryService.retry(id, unitId);
      void load();
    } catch (err: unknown) {
      setError(resolveErrorWithCode(err, t('delivery.error.generic', 'Não foi possível concluir a operação.')).message);
    }
  }

  const tone: Record<DeliveryStatus, string> = { QUEUED: 'text-amber-300', SENT: 'text-emerald-300', FAILED: 'text-red-300' };
  return (
    <div data-testid="delivery-history">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">{t('delivery.history.heading', 'Entregas')}</h3>
        <select aria-label={t('delivery.history.status', 'Status das entregas')} value={status} onChange={(e) => setStatus(e.target.value as DeliveryStatus | '')} className={`${inputClass} py-1.5 text-xs`}>
          <option value="">{t('delivery.history.allStatus', 'Todos os status')}</option>
          {(['QUEUED', 'SENT', 'FAILED'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {error && <div role="alert" className={`mb-3 ${alertBox}`}>{error}</div>}
      {rows.length === 0 ? (
        <div className="py-4 text-center text-sm text-neutral-500">{t('delivery.history.empty', 'Nenhuma entrega registrada.')}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className={th}>{t('delivery.manifest.period', 'Período')}</th>
                <th className={th}>{t('delivery.history.contact', 'Contador')}</th>
                <th className={th}>Status</th>
                <th className={th}>{t('delivery.history.attempts', 'Tentativas')}</th>
                <th className={th}>{t('delivery.history.when', 'Quando / motivo')}</th>
                <th className={th}>{t('delivery.col.actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} data-testid={`delivery-${d.id}`} className="border-b border-neutral-800/60 last:border-0">
                  <td className={`${td} text-xs`}>{formatDate(d.periodStart)} – {formatDate(d.periodEnd)}</td>
                  <td className={`${td} text-xs`}>{contactById.get(d.contactId)?.name ?? shortId(d.contactId)}</td>
                  <td className={`${td} text-xs font-semibold ${tone[d.status]}`}>{d.status}</td>
                  <td className={`${td} text-xs`}>{d.attemptCount}</td>
                  <td className={`${td} text-xs`}>
                    {d.status === 'FAILED' ? `${formatTimestamp(d.failedAt)} — ${d.failureReason ?? ''}` : formatTimestamp(d.sentAt)}
                  </td>
                  <td className={td}>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setDetail(d)} className={smallBtn}>{t('delivery.history.detail', 'Detalhe')}</button>
                      {d.status === 'FAILED' && (
                        <button type="button" onClick={() => void retry(d.id)} className={smallBtn}><FiRefreshCw size={11} /> {t('delivery.history.retry', 'Reprocessar')}</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detail && (
        <Modal isOpen onClose={() => setDetail(null)} title={t('delivery.history.detailTitle', 'Entrega {{id}}', { id: shortId(detail.id) })} maxWidth="max-w-xl" themeColor="bg-emerald-600">
          <div className="space-y-2 px-6 py-5 text-xs text-neutral-300" data-testid="delivery-detail">
            <p>{formatDate(detail.periodStart)} – {formatDate(detail.periodEnd)} · {detail.status} · {detail.attemptCount}</p>
            <p className="font-mono">ECD sha256 {detail.manifestSha256Ecd.slice(0, 12)} · ECF sha256 {detail.manifestSha256Ecf.slice(0, 12)}</p>
            {detail.items.map((i) => (
              <div key={i.id} className="font-mono">{i.position}. {t(`delivery.kind.${i.kind}`, EXPORT_KIND_LABEL[i.kind] ?? i.kind)} · {shortId(i.jobId)} · {i.sha256.slice(0, 12)}</div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
