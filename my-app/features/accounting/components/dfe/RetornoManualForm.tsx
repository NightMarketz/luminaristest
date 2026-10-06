import { useRef, useState } from 'react';
import { FiFileText, FiUploadCloud } from 'react-icons/fi';
import { useAccountingT } from '../../lib/useAccountingT';
import { btn, errorBox, primaryBtn, type CommandResult } from './dfeUi';

export interface RetornoManualFormProps {
  /** Envia o XML (e o DANFSe opcional); a releitura do documento é de quem chama. */
  onSubmit: (xml: File, pdf?: File) => Promise<CommandResult>;
}

/**
 * Retorno manual (C.4, item 21; F-FE-DFE-4): `input type="file"` escondido + botão, no padrão do `NfePanel.tsx`, e um
 * 2º input opcional para o DANFSe. A releitura que volta é desenhada pelo cartão/ficha a partir da VIEW do documento
 * (a mesma fonte do GET depois de recarregar — PR-1). Erro (ex.: 422 `DFE_IDENTIDADE_DIVERGENTE`) aparece íntegro aqui.
 */
export function RetornoManualForm({ onSubmit }: RetornoManualFormProps) {
  const { t } = useAccountingT();
  const xmlRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [xml, setXml] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!xml) return;
    setSending(true);
    setError(null);
    const result = await onSubmit(xml, pdf ?? undefined);
    setSending(false);
    if (result.ok) {
      setXml(null);
      setPdf(null);
      if (xmlRef.current) xmlRef.current.value = '';
      if (pdfRef.current) pdfRef.current.value = '';
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="space-y-2" data-testid="retorno-manual-form">
      <p className="text-xs text-neutral-500">
        {t('dfe.retorno.hint', 'Depois de emitir no portal, baixe o XML da NFS-e (e o DANFSe, se quiser) e envie aqui.')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={xmlRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          className="hidden"
          data-testid="retorno-xml-file"
          onChange={(e) => setXml(e.target.files?.[0] ?? null)}
        />
        <button type="button" className={btn} disabled={sending} onClick={() => xmlRef.current?.click()}>
          <FiFileText size={12} /> {xml ? xml.name : t('dfe.retorno.selectXml', 'Selecionar XML da NFS-e')}
        </button>
        <input
          ref={pdfRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          data-testid="retorno-pdf-file"
          onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
        />
        <button type="button" className={btn} disabled={sending} onClick={() => pdfRef.current?.click()}>
          <FiFileText size={12} /> {pdf ? pdf.name : t('dfe.retorno.selectPdf', 'DANFSe (PDF, opcional)')}
        </button>
        <button type="button" className={primaryBtn} disabled={!xml || sending} onClick={() => void send()}>
          <FiUploadCloud size={12} /> {sending ? t('dfe.sending', 'Enviando…') : t('dfe.retorno.send', 'Registrar retorno')}
        </button>
      </div>
      {error && <div role="alert" className={errorBox}>{error}</div>}
    </div>
  );
}
