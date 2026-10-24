import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FiCopy, FiCheck } from 'react-icons/fi';

/**
 * Botão "copiar" da cobrança (FE-INCR-PAYMENT-PROVIDER itens 9 e 14): URL do webhook, linha digitável e Pix
 * copia-e-cola. Sem canônico no app para isso; o texto copiado nunca é credencial.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useTranslation('accounting');
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
    >
      {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
      {copied ? t('paymentProvider.copied', 'Copiado') : t('paymentProvider.copy', 'Copiar')}
    </button>
  );
}
