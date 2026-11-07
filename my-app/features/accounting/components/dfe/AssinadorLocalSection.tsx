import { useCallback, useEffect, useRef, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { Modal } from '../../../../components/ui/Modal';
import { dfeAssinadorService, type DfeSignerCodigoView, type DfeSignerView } from '../../../../lib/services/dfeAssinador.service';
import { formatDateTimeBR } from '../../../dashboard/category-views/finance/utils/formatters';
import { formatDate } from '../../lib/formatDate';
import { resolveError } from '../../lib/resolveError';
import { useAccountingT } from '../../lib/useAccountingT';
import { assinadorEstado, type AssinadorAviso } from '../../lib/assinadorEstado';
import { CopyButton } from '../CopyButton';
import { btn, dangerBtn, errorBox, primaryBtn, warnBox } from './dfeUi';

/** F-FEAS-6 a: releitura a cada 30 s com a aba do navegador visível. */
export const RELEITURA_MS = 30_000;

const fieldset = 'space-y-3 rounded-2xl border border-neutral-800 p-4';
const legend = 'px-1 text-xs font-semibold uppercase tracking-widest text-neutral-400';
const row = 'flex flex-wrap items-baseline justify-between gap-2 text-sm';
const label = 'text-neutral-400';
const value = 'text-neutral-100';

const AVISO_FALLBACK: Record<AssinadorAviso, string> = {
  'token-ausente': 'O token ou cartão do certificado não foi detectado no caixa. Confira se ele está no leitor.',
  'cert-vencendo': 'O certificado do assinador vence em até 30 dias. Renove com a certificadora.',
  'cert-vencido': 'O certificado do assinador está vencido: as notas não serão assinadas até um certificado válido ser pareado.',
  'versao-antiga': 'A versão do assinador neste caixa é anterior à mínima exigida. Atualize o assinador.',
};

/** CNPJ-raiz `12345678` → `12.345.678`. */
function formatRaiz(raiz: string): string {
  return /^[0-9A-Z]{8}$/.test(raiz) ? `${raiz.slice(0, 2)}.${raiz.slice(2, 5)}.${raiz.slice(5, 8)}` : raiz;
}
/** O código vem sem separador; agrupado de 4 em 4 para ler em voz alta. */
function agrupar(codigo: string): string {
  return codigo.replace(/(.{4})(?=.)/g, '$1 ');
}

export interface AssinadorLocalSectionProps {
  unitId: string;
}

/**
 * Seção "Assinador local" da aba Perfil fiscal (FE-INCR-NFCE-ASSINADOR FA-3..FA-11, FA-15; F-FEAS-1/2/5/6 a): gera o
 * código de pareamento, mostra o estado do assinador da unidade e revoga o vínculo. Nenhuma regra fiscal aqui: CNPJ,
 * validade e pré-voo são do servidor; `online` e `diasParaVencer` vêm prontos na view.
 *
 * O código de pareamento vive só no estado do componente (nada em `localStorage`, URL, log ou `console`) e não pode
 * ser revisto depois de fechar o modal: o servidor guarda só o hash.
 */
export function AssinadorLocalSection({ unitId }: AssinadorLocalSectionProps) {
  const { t, tRef } = useAccountingT();
  const [view, setView] = useState<DfeSignerView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codigo, setCodigo] = useState<DfeSignerCodigoView | null>(null);
  const [codigoAberto, setCodigoAberto] = useState(false);
  const [pareadoAgora, setPareadoAgora] = useState(false);
  const [revogarAberto, setRevogarAberto] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  // Troca de unidade com resposta em voo: só a última carga vale (padrão `reqRef` do FiscalProfilePanel).
  const reqRef = useRef(0);
  // O dispositivo que existia quando o modal do código abriu: outro id na releitura = pareamento visto pela tela (FA-8).
  const antesDoCodigoRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const req = ++reqRef.current;
    setLoadError(null);
    try {
      const v = await dfeAssinadorService.getEstado(unitId);
      if (req !== reqRef.current) return;
      setView(v);
      setLoaded(true);
    } catch (e: unknown) {
      if (req !== reqRef.current) return;
      setLoadError(resolveError(e, tRef.current('dfe.assinador.error.load', 'Não foi possível carregar o estado do assinador local.')));
    }
  }, [unitId, tRef]);

  useEffect(() => {
    setView(null);
    setLoaded(false);
    setCodigo(null);
    setCodigoAberto(false);
    setPareadoAgora(false);
    void load();
  }, [load]);

  // FA-15: releitura a cada 30 s só com a aba visível; ao voltar a ficar visível, uma releitura.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const id = setInterval(tick, RELEITURA_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  // FA-8: com o modal do código aberto, o dispositivo novo na releitura fecha o modal e avisa "pareado".
  useEffect(() => {
    if (!codigoAberto || !view) return;
    if (view.dispositivoId !== antesDoCodigoRef.current) {
      setCodigoAberto(false);
      setCodigo(null);
      setPareadoAgora(true);
    }
  }, [view, codigoAberto]);

  // Contagem regressiva do código (FA-7): relógio de 1 s só enquanto o modal está aberto.
  useEffect(() => {
    if (!codigoAberto) return;
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [codigoAberto]);

  async function gerarCodigo() {
    setActionError(null);
    setPareadoAgora(false);
    setBusy(true);
    try {
      const c = await dfeAssinadorService.gerarCodigo(unitId);
      antesDoCodigoRef.current = view?.dispositivoId ?? null;
      setCodigo(c);
      setCodigoAberto(true);
    } catch (e: unknown) {
      setActionError(resolveError(e, t('dfe.assinador.error.codigo', 'Não foi possível gerar o código de pareamento.')));
    } finally {
      setBusy(false);
    }
  }

  function fecharCodigo() {
    setCodigoAberto(false);
    setCodigo(null);
  }

  async function revogar() {
    setActionError(null);
    setBusy(true);
    try {
      await dfeAssinadorService.revogar(unitId);
      setRevogarAberto(false);
      setPareadoAgora(false);
      await load();
    } catch (e: unknown) {
      setRevogarAberto(false);
      setActionError(resolveError(e, t('dfe.assinador.error.revogar', 'Não foi possível revogar o assinador.')));
    } finally {
      setBusy(false);
    }
  }

  const estado = assinadorEstado(view);
  const restanteMs = codigo ? Date.parse(codigo.expiraEm) - agora : 0;
  const expirado = !!codigo && restanteMs <= 0;
  const mmss = `${Math.floor(Math.max(0, restanteMs) / 60000)}:${String(Math.floor((Math.max(0, restanteMs) % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <fieldset className={fieldset}>
      <legend className={legend}>{t('dfe.assinador.title', 'Assinador local')}</legend>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-neutral-400">
          {t(
            'dfe.assinador.intro',
            'O assinador local roda no caixa, assina a NF-e/NFC-e com o certificado do próprio cliente (token, cartão ou A1 no Windows) e transmite à SEFAZ. O PIN é digitado só no caixa.',
          )}
        </p>
        <button type="button" className={btn} onClick={() => void load()} aria-label={t('dfe.assinador.refresh', 'Atualizar')}>
          <FiRefreshCw size={12} />
          {t('dfe.assinador.refresh', 'Atualizar')}
        </button>
      </div>

      {loadError && (
        <div className={errorBox} role="alert">
          <p>{loadError}</p>
          <button type="button" className={`${btn} mt-2`} onClick={() => void load()}>
            {t('dfe.assinador.retry', 'Tentar de novo')}
          </button>
        </div>
      )}
      {actionError && (
        <p className={errorBox} role="alert">
          {actionError}
        </p>
      )}
      {pareadoAgora && <p className="text-sm text-emerald-400">{t('dfe.assinador.pareado', 'Assinador pareado.')}</p>}

      {loaded && estado.kind === 'sem-pareamento' && (
        <p className="text-sm text-neutral-300">{t('dfe.assinador.semPareamento', 'Nenhum assinador pareado nesta unidade. Gere um código e digite-o no assinador do caixa.')}</p>
      )}

      {loaded && view && estado.kind !== 'sem-pareamento' && (
        <div className="space-y-2">
          <div className={row}>
            <span className={label}>{t('dfe.assinador.status', 'Situação')}</span>
            {estado.kind === 'online' ? (
              <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-300">{t('dfe.assinador.online', 'Online')}</span>
            ) : (
              <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-300">{t('dfe.assinador.fora', 'Fora do ar')}</span>
            )}
          </div>
          <div className={row}>
            <span className={label}>{t('dfe.assinador.lastSeen', 'Último contato')}</span>
            <span className={value}>{view.lastSeenAt ? formatDateTimeBR(view.lastSeenAt) : t('dfe.assinador.nunca', 'nunca')}</span>
          </div>
          <div className={row}>
            <span className={label}>{t('dfe.assinador.dispositivo', 'Caixa')}</span>
            <span className={value}>{view.nome}</span>
          </div>
          <div className={row}>
            <span className={label}>{t('dfe.assinador.versao', 'Versão do assinador')}</span>
            <span className={value}>{view.versaoAssinador}</span>
          </div>
          <div className={row}>
            <span className={label}>{t('dfe.assinador.certificado', 'Certificado')}</span>
            <span className={value}>
              {t('dfe.assinador.certRaiz', 'CNPJ-raiz')} {formatRaiz(view.certCnpjRaiz)} ·{' '}
              {t('dfe.assinador.certValidade', 'válido até')} {formatDate(view.certNotAfter)} ·{' '}
              {view.diasParaVencer >= 0
                ? t('dfe.assinador.diasParaVencer', '{{dias}} dias para vencer', { dias: view.diasParaVencer })
                : t('dfe.assinador.vencidoHa', 'vencido há {{dias}} dias', { dias: -view.diasParaVencer })}
            </span>
          </div>
          <div className={row}>
            <span className={label}>{t('dfe.assinador.impressao', 'Impressão digital (SHA-256)')}</span>
            <span className="inline-flex items-center gap-2 font-mono text-xs text-neutral-300">
              {view.certThumbprint.slice(0, 8)}…{view.certThumbprint.slice(-8)}
              <CopyButton value={view.certThumbprint} label={t('dfe.assinador.copiarImpressao', 'Copiar impressão digital')} />
            </span>
          </div>
          <div className={row}>
            <span className={label}>{t('dfe.assinador.token', 'Token no caixa')}</span>
            <span className={value}>{view.tokenPresente ? t('dfe.assinador.tokenSim', 'detectado') : t('dfe.assinador.tokenNao', 'não detectado')}</span>
          </div>
          <div className={row}>
            <span className={label}>{t('dfe.assinador.ambiente', 'Ambiente')}</span>
            <span className={value}>
              {view.ambiente === 'producao' ? t('dfe.assinador.producao', 'Produção') : t('dfe.assinador.homologacao', 'Homologação')}
            </span>
          </div>
          {view.outrasUnidades.length > 0 && (
            <div className={row}>
              <span className={label}>{t('dfe.assinador.outrasUnidades', 'Também atende')}</span>
              <span className={value}>{view.outrasUnidades.map((u) => u.nome).join(', ')}</span>
            </div>
          )}
          {estado.avisos.map((a) => (
            <p key={a} className={warnBox}>
              {t(`dfe.assinador.aviso.${a}`, AVISO_FALLBACK[a])}
            </p>
          ))}
        </div>
      )}

      {loaded && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryBtn} disabled={busy} onClick={() => void gerarCodigo()}>
            {t('dfe.assinador.gerarCodigo', 'Gerar código de pareamento')}
          </button>
          {view && (
            <button type="button" className={dangerBtn} disabled={busy} onClick={() => setRevogarAberto(true)}>
              {t('dfe.assinador.revogar', 'Revogar')}
            </button>
          )}
        </div>
      )}

      <Modal isOpen={codigoAberto} onClose={fecharCodigo} title={t('dfe.assinador.codigoTitulo', 'Código de pareamento')} subtitle={null}>
        <div className="space-y-3">
          {view && (
            <p className={warnBox}>
              {t('dfe.assinador.substitui', 'Esta unidade já tem um assinador pareado. O pareamento novo substitui o atual.')}
            </p>
          )}
          {codigo && !expirado ? (
            <>
              <p className="text-sm text-neutral-300">
                {t('dfe.assinador.codigoInstrucao', 'Digite este código no assinador do caixa. Ele vale uma vez só e não pode ser mostrado de novo depois de fechar esta janela.')}
              </p>
              <p className="text-center font-mono text-2xl tracking-widest text-neutral-100" data-testid="codigo-pareamento">
                {agrupar(codigo.codigo)}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">{t('dfe.assinador.expiraEm', 'Expira em {{tempo}}', { tempo: mmss })}</span>
                <CopyButton value={codigo.codigo} label={t('dfe.assinador.copiarCodigo', 'Copiar código')} />
              </div>
              <p className="text-xs text-neutral-500">{t('dfe.assinador.aguardando', 'Esta tela confere o pareamento sozinha a cada 30 segundos.')}</p>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-neutral-300">{t('dfe.assinador.codigoExpirado', 'O código expirou.')}</p>
              <button type="button" className={primaryBtn} disabled={busy} onClick={() => void gerarCodigo()}>
                {t('dfe.assinador.gerarOutro', 'Gerar outro')}
              </button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={revogarAberto}
        onClose={() => setRevogarAberto(false)}
        title={t('dfe.assinador.revogarTitulo', 'Revogar o assinador nesta unidade?')}
        subtitle={null}
      >
        <div className="space-y-3 text-sm text-neutral-300">
          <p>
            {t(
              'dfe.assinador.revogarEfeito',
              'O caixa para de assinar nesta unidade. Notas novas ficam pendentes até outro assinador ser pareado.',
            )}
          </p>
          {view && view.outrasUnidades.length > 0 && (
            <p>
              {t('dfe.assinador.revogarOutras', 'O mesmo caixa continua atendendo: {{unidades}}.', {
                unidades: view.outrasUnidades.map((u) => u.nome).join(', '),
              })}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className={btn} onClick={() => setRevogarAberto(false)}>
              {t('dfe.assinador.cancelar', 'Cancelar')}
            </button>
            <button type="button" className={dangerBtn} disabled={busy} onClick={() => void revogar()}>
              {t('dfe.assinador.confirmarRevogar', 'Revogar')}
            </button>
          </div>
        </div>
      </Modal>
    </fieldset>
  );
}
