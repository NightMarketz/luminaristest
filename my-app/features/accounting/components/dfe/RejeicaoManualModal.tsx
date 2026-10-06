import { useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { Modal } from '../../../../components/ui/Modal';
import { nonEmpty } from '../../../../lib/utils/nonEmpty';
import type { RejeicaoManualInput } from '@/types/contracts/accounting/FiscalDocumentDto.gen';
import { useAccountingT } from '../../lib/useAccountingT';
import { btn, errorBox, input, primaryBtn, type CommandResult } from './dfeUi';

type ErroPortal = RejeicaoManualInput['errors'][number];
interface Linha {
  code: string;
  message: string;
}

const MAX_LINHAS = 20;
const MAX_CODE = 20;
const MAX_MESSAGE = 500;

// espelha server/src/features/accounting/dtos/FiscalDocumentDto.ts:68-76 (code 1–20, message 1–500, 1–20 linhas)
const linhaValida = (l: Linha) => {
  const code = l.code.trim();
  const message = l.message.trim();
  return code.length >= 1 && code.length <= MAX_CODE && message.length >= 1 && message.length <= MAX_MESSAGE;
};

const toErro = (l: Linha): ErroPortal => ({ code: l.code.trim(), message: l.message.trim() });

export interface RejeicaoManualModalProps {
  onClose: () => void;
  onSubmit: (errors: RejeicaoManualInput['errors']) => Promise<CommandResult>;
}

/**
 * Rejeição manual (C.5a, item 22): o operador copia código e mensagem que o portal mostrou (1–20 linhas). Linha
 * incompleta bloqueia o envio — o corpo nunca sai com `errors` vazio (`nonEmpty`).
 */
export function RejeicaoManualModal({ onClose, onSubmit }: RejeicaoManualModalProps) {
  const { t } = useAccountingT();
  const [linhas, setLinhas] = useState<Linha[]>([{ code: '', message: '' }]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = linhas.every(linhaValida) ? nonEmpty(linhas.map(toErro)) : null;

  const setLinha = (i: number, patch: Partial<Linha>) =>
    setLinhas((ls) => ls.map((l, j): Linha => (j === i ? { code: patch.code ?? l.code, message: patch.message ?? l.message } : l)));

  async function submit() {
    if (!errors) return;
    setSending(true);
    setError(null);
    const result = await onSubmit(errors);
    setSending(false);
    if (result.ok) onClose();
    else setError(result.message);
  }

  return (
    <Modal
      isOpen
      onClose={() => { if (!sending) onClose(); }}
      title={t('dfe.rejeicao.title', 'Registrar rejeição do portal')}
      themeColor="bg-amber-600"
      maxWidth="max-w-xl"
      footer={
        <>
          <button type="button" className={btn} disabled={sending} onClick={onClose}>{t('dfe.cancel', 'Cancelar')}</button>
          <button type="button" className={primaryBtn} disabled={!errors || sending} onClick={() => void submit()}>
            {sending ? t('dfe.sending', 'Enviando…') : t('dfe.rejeicao.submit', 'Registrar rejeição')}
          </button>
        </>
      }
    >
      <div className="space-y-3 px-6 py-5 text-sm">
        <p className="text-xs text-neutral-500">{t('dfe.rejeicao.hint', 'Copie o código e a mensagem que o portal mostrou, um erro por linha.')}</p>
        {linhas.map((l, i) => (
          <div key={i} className="flex items-start gap-2" data-testid="rejeicao-linha">
            <input
              aria-label={`${t('dfe.rejeicao.code', 'Código')} ${i + 1}`}
              className={`${input} w-28`}
              maxLength={MAX_CODE}
              value={l.code}
              onChange={(e) => setLinha(i, { code: e.target.value })}
            />
            <textarea
              aria-label={`${t('dfe.rejeicao.message', 'Mensagem')} ${i + 1}`}
              className={input}
              rows={2}
              maxLength={MAX_MESSAGE}
              value={l.message}
              onChange={(e) => setLinha(i, { message: e.target.value })}
            />
            {linhas.length > 1 && (
              <button type="button" className={btn} aria-label={`${t('dfe.rejeicao.remove', 'Remover linha')} ${i + 1}`} onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}>
                <FiTrash2 size={11} />
              </button>
            )}
          </div>
        ))}
        {linhas.length < MAX_LINHAS && (
          <button type="button" className={btn} onClick={() => setLinhas((ls) => [...ls, { code: '', message: '' }])}>
            <FiPlus size={11} /> {t('dfe.rejeicao.add', 'Adicionar erro')}
          </button>
        )}
        {error && <div role="alert" className={errorBox}>{error}</div>}
      </div>
    </Modal>
  );
}
