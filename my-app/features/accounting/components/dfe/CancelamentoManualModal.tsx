import { useRef, useState } from 'react';
import { FiFileText } from 'react-icons/fi';
import { Modal } from '../../../../components/ui/Modal';
import type { CancelamentoManualInput } from '@/types/contracts/accounting/FiscalDocumentDto.gen';
import { useAccountingT } from '../../lib/useAccountingT';
import { MOTIVO_LABEL } from './dfeLabels';
import { btn, dangerBtn, errorBox, input, warnBox, type CommandResult } from './dfeUi';

type Motivo = CancelamentoManualInput['cMotivo'];
const MOTIVOS: Motivo[] = [1, 2, 9];
// espelha server/src/features/accounting/dtos/FiscalDocumentDto.ts (CancelFiscalDocumentSchema: xMotivo 15–255)
const X_MIN = 15;
const X_MAX = 255;

export interface CancelamentoManualModalProps {
  onClose: () => void;
  onSubmit: (fields: Omit<CancelamentoManualInput, 'unitId'>, xml: File) => Promise<CommandResult>;
}

/**
 * Cancelamento manual (C.5b, item 23; F-MAN-5 a / F-FE-DFE-9 a): motivo + texto + XML do evento e101101, os três
 * obrigatórios. O texto gravado é o do XML (achado A1 do BRIEF) — por isso a tela pede o MESMO texto do portal.
 */
export function CancelamentoManualModal({ onClose, onSubmit }: CancelamentoManualModalProps) {
  const { t } = useAccountingT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cMotivo, setCMotivo] = useState<Motivo>(1);
  const [xMotivo, setXMotivo] = useState('');
  const [xml, setXml] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const len = xMotivo.trim().length;
  const valid = xml !== null && len >= X_MIN && len <= X_MAX;

  async function submit() {
    if (!valid || !xml) return;
    setSending(true);
    setError(null);
    const result = await onSubmit({ cMotivo, xMotivo: xMotivo.trim() }, xml);
    setSending(false);
    if (result.ok) onClose();
    else setError(result.message);
  }

  return (
    <Modal
      isOpen
      onClose={() => { if (!sending) onClose(); }}
      title={t('dfe.cancelamento.title', 'Registrar cancelamento da NFS-e')}
      themeColor="bg-red-600"
      maxWidth="max-w-lg"
      footer={
        <>
          <button type="button" className={btn} disabled={sending} onClick={onClose}>{t('dfe.cancel', 'Cancelar')}</button>
          <button type="button" className={dangerBtn} disabled={!valid || sending} onClick={() => void submit()}>
            {sending ? t('dfe.sending', 'Enviando…') : t('dfe.cancelamento.submit', 'Registrar cancelamento')}
          </button>
        </>
      }
    >
      <div className="space-y-3 px-6 py-5 text-sm">
        <div className={warnBox}>
          {t('dfe.cancelamento.instr', 'No portal, use "Cancelar" — não "Substituir": a substituição gera outro evento, que o Luminaris não lê. Depois, baixe o XML do evento e envie aqui.')}
        </div>
        <p className="text-xs text-neutral-500">{t('dfe.cancelamento.same', 'Use o mesmo motivo e o mesmo texto que você digitou no portal.')}</p>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          {t('dfe.cancelamento.cMotivo', 'Motivo')}
          <select className={input} value={cMotivo} onChange={(e) => setCMotivo(MOTIVOS.find((m) => String(m) === e.target.value) ?? 1)}>
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>{`${m} — ${t(`dfe.motivo.${m}`, MOTIVO_LABEL[m])}`}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          {t('dfe.cancelamento.xMotivo', 'Justificativa (15 a 255 caracteres)')}
          <textarea className={input} rows={3} maxLength={X_MAX} value={xMotivo} onChange={(e) => setXMotivo(e.target.value)} />
          <span data-testid="xmotivo-counter" className={len > 0 && len < X_MIN ? 'text-red-500' : ''}>{`${len}/${X_MAX}`}</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            data-testid="cancelamento-xml-file"
            onChange={(e) => setXml(e.target.files?.[0] ?? null)}
          />
          <button type="button" className={btn} disabled={sending} onClick={() => fileRef.current?.click()}>
            <FiFileText size={12} /> {xml ? xml.name : t('dfe.cancelamento.selectXml', 'Selecionar XML do evento')}
          </button>
        </div>
        {error && <div role="alert" className={errorBox}>{error}</div>}
      </div>
    </Modal>
  );
}
