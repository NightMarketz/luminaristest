import { useEffect, useState } from 'react';
import { FiFileText } from 'react-icons/fi';
import { Modal } from '../../../../components/ui/Modal';
import { dfeService, type FiscalDocumentView, type PreviewResult } from '../../../../lib/services/dfe.service';
import { formatCents } from '../../lib/formatCents';
import { resolveError } from '../../lib/resolveError';
import { useAccountingT } from '../../lib/useAccountingT';
import { btn, errorBox, primaryBtn, warnBox } from './dfeUi';

export interface EmitNfseButtonProps {
  unitId: string;
  saleId: string;
  /** Venda `Finalized` — só ela emite (o BE recusa as outras; a tela nem oferece). */
  isFinalized: boolean;
  /** Rótulo do botão (`finance_view:sales.emitNfse` — vem do painel, que já usa esse namespace). */
  label: string;
  /** Documentos criados (um por código de serviço); quem monta abre a ficha do 1º. */
  onEmitted: (docs: FiscalDocumentView[]) => void;
}

/**
 * Botão "Emitir NFS-e" do detalhe da venda (C.2, item 15; F-FE-DFE-3): visível com a venda finalizada e o emissor
 * habilitado (`GET /status`). Clique → `preview` → modal: com pendência, a lista do BE íntegra e nenhum `emit`; sem
 * pendência, quantos documentos saem, o total, o aviso de diferença com o razão e o de competência fora do mês.
 */
export function EmitNfseButton({ unitId, saleId, isFinalized, label, onEmitted }: EmitNfseButtonProps) {
  const { t, tRef } = useAccountingT();
  const [enabled, setEnabled] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emitting, setEmitting] = useState(false);

  useEffect(() => {
    if (!isFinalized) return;
    let alive = true;
    dfeService
      .getStatus()
      .then((s) => { if (alive) setEnabled(s.enabled); })
      .catch(() => { /* sem status, sem botão — o erro já foi notificado pelo apiClient */ });
    return () => { alive = false; };
  }, [isFinalized]);

  if (!isFinalized || !enabled) return null;

  async function openPreview() {
    setPreviewing(true);
    setError(null);
    try {
      setPreview(await dfeService.preview({ unitId, saleId, kind: 'NFSE' }));
    } catch (e: unknown) {
      setError(resolveError(e, tRef.current('dfe.emit.error.preview', 'Não foi possível conferir a venda para emissão.')));
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }

  async function confirmEmit() {
    setEmitting(true);
    setError(null);
    try {
      const docs = await dfeService.emit({ unitId, saleId, kind: 'NFSE' });
      setPreview(null);
      onEmitted(docs);
    } catch (e: unknown) {
      setError(resolveError(e, tRef.current('dfe.emit.error.emit', 'Não foi possível emitir.')));
    } finally {
      setEmitting(false);
    }
  }

  const close = () => { if (!emitting) { setPreview(null); setError(null); } };

  return (
    <>
      <button
        type="button"
        onClick={() => void openPreview()}
        disabled={previewing}
        className="text-xs px-2 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {label}
      </button>
      {error && !preview && <span role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      <Modal
        isOpen={preview !== null}
        onClose={close}
        title={t('dfe.emit.title', 'Emitir NFS-e')}
        themeColor="bg-emerald-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button type="button" className={btn} disabled={emitting} onClick={close}>
              {preview?.ok ? t('dfe.cancel', 'Cancelar') : t('dfe.close', 'Fechar')}
            </button>
            {preview?.ok && (
              <button type="button" className={primaryBtn} disabled={emitting} onClick={() => void confirmEmit()}>
                {emitting ? t('dfe.sending', 'Enviando…') : t('dfe.emit.confirm', 'Confirmar')}
              </button>
            )}
          </>
        }
      >
        <div className="px-6 py-5">
        {preview && !preview.ok && (
          <div className="space-y-2 text-sm" data-testid="emit-faltantes">
            <p className="text-neutral-700 dark:text-neutral-200">{t('dfe.emit.faltantes', 'A venda ainda não pode emitir. Falta:')}</p>
            <ul className="list-disc space-y-1 pl-5 text-neutral-700 dark:text-neutral-300">
              {preview.faltantes.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        )}
        {preview?.ok && (
          <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-200" data-testid="emit-resumo">
            <p>
              {t('dfe.emit.docs', 'Documentos a emitir (um por código de serviço):')} <strong data-testid="emit-count">{preview.payloads.length}</strong>
            </p>
            <p>
              {t('dfe.emit.total', 'Total dos serviços:')} <strong data-testid="emit-total">{formatCents(Number(preview.tieOut.vServCents))}</strong>
            </p>
            {!preview.tieOut.matches && (
              <div role="alert" className={warnBox} data-testid="emit-tieout">
                {t('dfe.emit.tieOut', 'O total da nota difere do valor contabilizado da venda ({{ledger}}). Confira antes de emitir.', {
                  ledger: formatCents(Number(preview.tieOut.ledgerCents)),
                })}
              </div>
            )}
            {preview.competenciaAlerta && (
              <div role="alert" className={warnBox} data-testid="emit-competencia">
                {t('dfe.emit.competencia', 'A competência da venda é de outro mês — confira se a emissão fora do mês é permitida.')}
              </div>
            )}
          </div>
        )}
        {error && preview && <div role="alert" className={`mt-3 ${errorBox}`}>{error}</div>}
        </div>
      </Modal>
    </>
  );
}
