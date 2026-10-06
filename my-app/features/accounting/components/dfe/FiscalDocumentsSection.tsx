import { useCallback, useEffect, useRef, useState } from 'react';
import { FiDownload, FiFileText, FiRefreshCw, FiXCircle } from 'react-icons/fi';
import { accountingService } from '../../../../lib/services/accounting.service';
import { dfeService, type DfeAmbiente, type FiscalDocumentView } from '../../../../lib/services/dfe.service';
import type { CancelamentoManualInput, RejeicaoManualInput } from '@/types/contracts/accounting/FiscalDocumentDto.gen';
import { formatCents } from '../../lib/formatCents';
import { portalCTribNac } from '../../lib/portalFormat';
import { resolveErrorWithCode } from '../../lib/resolveError';
import { useAccountingT } from '../../lib/useAccountingT';
import { AMBIENTE_LABEL, PENDENCIA_LABEL, STATUS_LABEL } from './dfeLabels';
import { CancelamentoManualModal } from './CancelamentoManualModal';
import { FichaModal } from './FichaModal';
import { RejeicaoManualModal } from './RejeicaoManualModal';
import { ReleituraView } from './ReleituraView';
import { RetornoManualForm } from './RetornoManualForm';
import { btn, dangerBtn, errorBox, warnBox, type CommandResult } from './dfeUi';

export interface FiscalDocumentsSectionProps {
  unitId: string;
  saleId: string;
  /** Documentos que o botão "Emitir NFS-e" acabou de criar para ESTA venda — entram na lista e abrem a ficha do 1º. */
  emitted?: FiscalDocumentView[] | null;
}

const STATUS_TONE: Record<FiscalDocumentView['status'], string> = {
  SENT: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  PROCESSING: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  AUTHORIZED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  AUTHORIZED_DIVERGENT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  CANCELLED: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

const isAuthorized = (d: FiscalDocumentView) => d.status === 'AUTHORIZED' || d.status === 'AUTHORIZED_DIVERGENT';
/** Caso F6 (GAP-MAP "resíduo do applyResult"): autorizada em produção sem o XML guardado. */
const xmlNaoGuardado = (d: FiscalDocumentView) => d.partner === 'manual' && isAuthorized(d) && d.ambiente === 'producao' && !d.xmlAttachmentId;

function safeCTribNac(code: string): string {
  try {
    return portalCTribNac(code);
  } catch {
    return code;
  }
}

/**
 * "Documentos fiscais" da venda (C.2–C.5, itens 16–17, 21–25): um cartão por documento com status, código, valor,
 * número, ambiente e pendências; ações só para o parceiro `manual`. REGRA DE ERRO (dossiê §5, item 17): depois de
 * QUALQUER erro de comando a tela relê `GET /documents/:id` e desenha o que voltou — se o status mudou, o comando pegou
 * (ex.: 500 do anexo com a nota já `AUTHORIZED`, caso F6) e a tela mostra o estado, não o erro.
 */
export function FiscalDocumentsSection({ unitId, saleId, emitted }: FiscalDocumentsSectionProps) {
  const { t, tRef } = useAccountingT();
  const [docs, setDocs] = useState<FiscalDocumentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverAmbiente, setServerAmbiente] = useState<DfeAmbiente | null>(null);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [rejeicaoId, setRejeicaoId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const req = ++reqRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await dfeService.listBySale(unitId, saleId);
      if (req === reqRef.current) setDocs(list);
    } catch (e: unknown) {
      if (req === reqRef.current) setLoadError(resolveErrorWithCode(e, tRef.current('dfe.error.load', 'Não foi possível carregar os documentos fiscais.')).message);
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [unitId, saleId, tRef]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let alive = true;
    dfeService
      .getStatus()
      .then((s) => { if (alive) setServerAmbiente(s.ambiente); })
      .catch(() => { /* o aviso de ambiente só aparece com o status em mãos */ });
    return () => { alive = false; };
  }, []);

  // Emissão recém-feita pelo botão: entra na lista e a ficha do 1º documento abre (item 15).
  useEffect(() => {
    if (!emitted || emitted.length === 0) return;
    // Uma carga da lista ainda em voo é anterior à emissão: não pode apagar os documentos novos.
    reqRef.current++;
    setLoading(false);
    setDocs((current) => [...emitted, ...current.filter((d) => !emitted.some((e) => e.id === d.id))]);
    setFichaId(emitted[0].id);
  }, [emitted]);

  const upsert = (doc: FiscalDocumentView) => setDocs((ds) => ds.map((d) => (d.id === doc.id ? doc : d)));

  /** Executa o comando; no erro, relê o documento (item 17) e só devolve a mensagem se nada mudou. */
  async function run(doc: FiscalDocumentView, fallback: string, cmd: () => Promise<FiscalDocumentView>): Promise<CommandResult> {
    setCardError((m) => { const { [doc.id]: _drop, ...rest } = m; return rest; });
    try {
      const next = await cmd();
      upsert(next);
      return { ok: true, doc: next };
    } catch (e: unknown) {
      const { message } = resolveErrorWithCode(e, fallback);
      try {
        const fresh = await dfeService.get(doc.id, unitId);
        upsert(fresh);
        if (fresh.status !== doc.status || fresh.currentAttemptNo !== doc.currentAttemptNo) return { ok: true, doc: fresh };
      } catch {
        /* sem releitura: fica o erro original */
      }
      return { ok: false, message };
    }
  }

  const fichaDoc = docs.find((d) => d.id === fichaId) ?? null;
  const rejeicaoDoc = docs.find((d) => d.id === rejeicaoId) ?? null;
  const cancelDoc = docs.find((d) => d.id === cancelId) ?? null;

  const retorno = (doc: FiscalDocumentView) => (xml: File, pdf?: File) =>
    run(doc, t('dfe.retorno.error', 'Não foi possível registrar o retorno.'), () => dfeService.retornoManual(doc.id, unitId, xml, pdf));

  async function reenviar(doc: FiscalDocumentView) {
    setBusy(doc.id);
    const result = await run(doc, t('dfe.reenviar.error', 'Não foi possível reenviar.'), () => dfeService.reenviar(doc.id, { unitId }));
    setBusy(null);
    if (result.ok) setFichaId(result.doc.id);
    else setCardError((m) => ({ ...m, [doc.id]: result.message }));
  }

  async function download(doc: FiscalDocumentView, attachmentId: string, ext: 'xml' | 'pdf') {
    try {
      await accountingService.downloadDocumentAttachment(attachmentId, unitId, `nfse-${doc.nNFSe ?? doc.id}.${ext}`);
    } catch (e: unknown) {
      setCardError((m) => ({ ...m, [doc.id]: resolveErrorWithCode(e, tRef.current('dfe.download.error', 'Não foi possível baixar o arquivo.')).message }));
    }
  }

  return (
    <section className="space-y-3" aria-label={t('dfe.section.title', 'Documentos fiscais')} data-testid="fiscal-documents-section">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('dfe.section.title', 'Documentos fiscais')}</h3>
      {loading && <p className="text-xs text-neutral-500">{t('dfe.loading', 'Carregando…')}</p>}
      {loadError && <div role="alert" className={errorBox}>{loadError}</div>}
      {!loading && !loadError && docs.length === 0 && (
        <p className="text-xs text-neutral-500">{t('dfe.section.empty', 'Nenhum documento fiscal emitido para esta venda.')}</p>
      )}

      {docs.map((doc) => {
        const manual = doc.partner === 'manual';
        return (
          <article key={doc.id} data-testid={`fiscal-doc-${doc.id}`} className="space-y-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[doc.status] ?? STATUS_TONE.CANCELLED}`} data-testid="fiscal-doc-status">
                {t(`dfe.status.${doc.status}`, STATUS_LABEL[doc.status] ?? doc.status)}
              </span>
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                {t(`dfe.ambiente.${doc.ambiente}`, AMBIENTE_LABEL[doc.ambiente] ?? doc.ambiente)}
              </span>
              <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">{safeCTribNac(doc.cTribNac)}</span>
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{formatCents(Number(doc.vServCents))}</span>
              {(doc.nNFSe || doc.chaveOuCodigo) && (
                <span className="text-xs text-neutral-500">
                  {doc.nNFSe ? `${t('dfe.card.nNFSe', 'NFS-e nº')} ${doc.nNFSe}` : ''} {doc.chaveOuCodigo ? `· ${doc.chaveOuCodigo}` : ''}
                </span>
              )}
            </div>

            {doc.pendencias.length > 0 && (
              <ul className="space-y-1" data-testid="fiscal-doc-pendencias">
                {doc.pendencias.map((p) => (
                  <li key={p} className={warnBox}>{t(`dfe.pendencia.${p}`, PENDENCIA_LABEL[p] ?? p)}</li>
                ))}
              </ul>
            )}
            {xmlNaoGuardado(doc) && (
              <div role="alert" className={warnBox} data-testid="fiscal-doc-xml-nao-guardado">
                {t('dfe.card.xmlNaoGuardado', 'Nota autorizada, mas o XML não foi guardado; guarde o arquivo — a correção automática vem com o BE-INCR-DFE-ANEXO-PENDENTE.')}
              </div>
            )}
            {doc.releitura && <ReleituraView releitura={doc.releitura} />}

            {!manual && <p className="text-xs text-neutral-500">{t('dfe.card.automatico', 'Emissão automática pelo parceiro.')}</p>}

            {manual && (doc.status === 'SENT' || doc.status === 'PROCESSING') && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btn} onClick={() => setFichaId(doc.id)}>
                    <FiFileText size={11} /> {t('dfe.card.ficha', 'Ficha')}
                  </button>
                  <button type="button" className={btn} onClick={() => setRejeicaoId(doc.id)}>
                    <FiXCircle size={11} /> {t('dfe.card.rejeicao', 'Registrar rejeição')}
                  </button>
                </div>
                <RetornoManualForm onSubmit={retorno(doc)} />
              </div>
            )}

            {manual && doc.status === 'REJECTED' && (
              <div className="space-y-1">
                {doc.errors.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-neutral-600 dark:text-neutral-300">
                    {doc.errors.map((er, i) => <li key={`${er.code}-${i}`}><span className="font-mono">{er.code}</span> — {er.message}</li>)}
                  </ul>
                )}
                <p className="text-xs text-neutral-500">{t('dfe.reenviar.hint', 'Corrija o perfil fiscal ou a venda antes de reenviar — a DPS é remontada.')}</p>
                <button type="button" className={btn} disabled={busy === doc.id} onClick={() => void reenviar(doc)}>
                  <FiRefreshCw size={11} /> {t('dfe.card.reenviar', 'Reenviar')}
                </button>
              </div>
            )}

            {manual && isAuthorized(doc) && (
              <div className="flex flex-wrap gap-2">
                {doc.xmlAttachmentId && (
                  <button type="button" className={btn} onClick={() => void download(doc, doc.xmlAttachmentId ?? '', 'xml')}>
                    <FiDownload size={11} /> {t('dfe.card.downloadXml', 'Baixar XML')}
                  </button>
                )}
                {doc.pdfAttachmentId && (
                  <button type="button" className={btn} onClick={() => void download(doc, doc.pdfAttachmentId ?? '', 'pdf')}>
                    <FiDownload size={11} /> {t('dfe.card.downloadPdf', 'Baixar DANFSe')}
                  </button>
                )}
                <button type="button" className={dangerBtn} onClick={() => setCancelId(doc.id)}>
                  {t('dfe.card.cancelar', 'Cancelar')}
                </button>
              </div>
            )}

            {manual && doc.status === 'CANCELLED' && !doc.pendencias.includes('cancelled_without_replacement') && (
              <p className="text-xs text-neutral-500">{t('dfe.card.semSubstituto', 'Sem substituta: emita de novo pelo botão, se a venda continuar valendo.')}</p>
            )}

            {cardError[doc.id] && <div role="alert" className={errorBox}>{cardError[doc.id]}</div>}
          </article>
        );
      })}

      {fichaDoc && (
        <FichaModal doc={fichaDoc} unitId={unitId} serverAmbiente={serverAmbiente} onClose={() => setFichaId(null)} onRetorno={retorno(fichaDoc)} />
      )}
      {rejeicaoDoc && (
        <RejeicaoManualModal
          onClose={() => setRejeicaoId(null)}
          onSubmit={(errors: RejeicaoManualInput['errors']) =>
            run(rejeicaoDoc, t('dfe.rejeicao.error', 'Não foi possível registrar a rejeição.'), () => dfeService.rejeicaoManual(rejeicaoDoc.id, { unitId, errors }))
          }
        />
      )}
      {cancelDoc && (
        <CancelamentoManualModal
          onClose={() => setCancelId(null)}
          onSubmit={(fields: Omit<CancelamentoManualInput, 'unitId'>, xml: File) =>
            run(cancelDoc, t('dfe.cancelamento.error', 'Não foi possível registrar o cancelamento.'), () =>
              dfeService.cancelamentoManual(cancelDoc.id, { unitId, cMotivo: fields.cMotivo, xMotivo: fields.xMotivo }, xml),
            )
          }
        />
      )}
    </section>
  );
}
