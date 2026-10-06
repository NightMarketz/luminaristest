import { useEffect, useState } from 'react';
import { FiCheckCircle, FiCopy } from 'react-icons/fi';
import { Modal } from '../../../../components/ui/Modal';
import { dfeService, type CampoComparado, type DfeAmbiente, type FichaView, type FiscalDocumentView } from '../../../../lib/services/dfe.service';
import type { DpsManualPayloadInput } from '@/types/contracts/accounting/DpsPayloadDto.gen';
import { portalCTribNac, portalDate, portalDoc, portalMoney, portalPercent } from '../../lib/portalFormat';
import { resolveError } from '../../lib/resolveError';
import { useAccountingT } from '../../lib/useAccountingT';
import { AMBIENTE_LABEL, PORTAL_URL } from './dfeLabels';
import { ReleituraView } from './ReleituraView';
import { RetornoManualForm } from './RetornoManualForm';
import { btn, errorBox, warnBox, type CommandResult } from './dfeUi';

type T = (key: string, fallback: string) => string;

/** Uma linha da ficha: rótulo do portal + valor a copiar (no formato do portal) OU instrução. */
export interface FichaRow {
  id: string;
  label: string;
  /** Valor a colar no portal — ganha o botão de copiar. */
  copy?: string;
  /** O que fazer quando não há valor a copiar ("marque Prestador"). */
  instruction?: string;
  /** Nota curta (conferência, pendência de validação do runbook). */
  note?: string;
  /** Campo que a releitura confere na volta (nfseReadback.ts:13-26). */
  campo?: CampoComparado;
}

export interface FichaSection {
  id: 'pessoas' | 'servico' | 'valores' | 'emitir';
  title: string;
  rows: FichaRow[];
}

/** Formata para o portal; o BE validou a DPS (F16), mas se um valor escapar do formato a ficha mostra o cru — nunca um aproximado. */
function fmt(f: (v: string) => string, v: string): string {
  try {
    return f(v);
  } catch {
    return v;
  }
}

/**
 * Mapa DPS → portal (BRIEF §3.4, Guia do Emissor Web v1.2): quatro seções NA ORDEM DO PORTAL (G2), cada linha com o
 * rótulo do portal. Exportada para o teste da ordem e das linhas condicionais (pTotTribSN × pTotTrib).
 */
export function buildFichaSections(payload: DpsManualPayloadInput, saleId: string, t: T): FichaSection[] {
  const d = payload.infDPS;
  const conf = t('dfe.ficha.note.conferencia', 'conferência — o portal preenche');
  const tomaDoc = d.toma.CNPJ ?? d.toma.CPF;
  const simples = d.prest.regTrib.opSimpNac === 3;

  const pessoas: FichaRow[] = [
    { id: 'dCompet', label: t('dfe.ficha.field.dCompet', 'Data de Competência'), copy: fmt(portalDate, d.dCompet), campo: 'dCompet' },
    { id: 'informarDps', label: t('dfe.ficha.field.informarDps', 'Informar a DPS'), instruction: t('dfe.ficha.instr.informarDps', "Não marque — o portal numera a DPS.") },
    { id: 'emitente', label: t('dfe.ficha.field.emitente', 'Emitente da NFS-e'), instruction: t('dfe.ficha.instr.prestador', 'Marque Prestador.') },
    { id: 'prestCnpj', label: t('dfe.ficha.field.prestCnpj', 'CPF/CNPJ do emitente'), copy: fmt(portalDoc, d.prest.CNPJ), note: conf, campo: 'prest.CNPJ' },
    { id: 'cLocEmi', label: t('dfe.ficha.field.cLocEmi', 'Município do emitente'), copy: d.cLocEmi, note: conf },
    {
      id: 'opSimpNac',
      label: t('dfe.ficha.field.opSimpNac', 'Opção no Simples Nacional'),
      copy: simples ? t('dfe.ficha.opSimpNac.3', '3 — Optante ME/EPP') : t('dfe.ficha.opSimpNac.1', '1 — Não optante'),
      note: conf,
    },
  ];
  if (d.prest.regTrib.regApTribSN != null) {
    const n = String(d.prest.regTrib.regApTribSN);
    pessoas.push({
      id: 'regApTribSN',
      label: t('dfe.ficha.field.regApTribSN', 'Regime de Apuração Tributária pelo SN'),
      copy: t(`fiscalProfile.regApTribSN.${n}`, n),
      note: t('dfe.ficha.note.pv9', 'rótulo do portal a conferir no runbook (PV-9)'),
    });
  }
  pessoas.push(
    { id: 'tomador', label: t('dfe.ficha.field.tomador', 'Tomador do Serviço'), instruction: t('dfe.ficha.instr.brasil', 'Marque Brasil.') },
    ...(tomaDoc
      ? [{ id: 'tomaDoc', label: t('dfe.ficha.field.tomaDoc', 'CPF/CNPJ do tomador'), copy: fmt(portalDoc, tomaDoc), campo: 'toma.doc' as const }]
      : []),
    { id: 'tomaNome', label: t('dfe.ficha.field.tomaNome', 'Nome/Razão Social'), copy: d.toma.xNome, note: t('dfe.ficha.note.cadastro', 'o portal pode recuperar do cadastro') },
    {
      id: 'tomaEnd',
      label: t('dfe.ficha.field.tomaEnd', 'Endereço do tomador'),
      instruction: t('dfe.ficha.instr.endereco', 'Se o portal pedir, digite o endereço a partir do cadastro do cliente — a DPS do Luminaris não o leva.'),
      note: 'PV-3',
    },
    { id: 'intermediario', label: t('dfe.ficha.field.intermediario', 'Intermediário'), instruction: t('dfe.ficha.instr.naoInformado', 'Não informado.') },
  );

  const c = d.serv.cServ;
  const servico: FichaRow[] = [
    {
      id: 'cLocPrestacao',
      label: t('dfe.ficha.field.cLocPrestacao', 'Local da prestação — Município'),
      copy: d.serv.locPrest.cLocPrestacao,
      instruction: d.serv.locPrest.cLocPrestacao === d.cLocEmi ? t('dfe.ficha.instr.mesmoMunicipio', 'O mesmo município do emitente.') : undefined,
      note: 'PV-4',
      campo: 'cLocPrestacao',
    },
    { id: 'cTribNac', label: t('dfe.ficha.field.cTribNac', 'Código de Tributação Nacional'), copy: fmt(portalCTribNac, c.cTribNac), campo: 'cTribNac' },
    ...(c.cTribMun ? [{ id: 'cTribMun', label: t('dfe.ficha.field.cTribMun', 'Código Complementar do Município'), copy: c.cTribMun }] : []),
    { id: 'imunidade', label: t('dfe.ficha.field.imunidade', 'Imunidade, exportação ou não incidência?'), instruction: t('dfe.ficha.instr.nao', 'Não.') },
    { id: 'xDescServ', label: t('dfe.ficha.field.xDescServ', 'Descrição do Serviço'), copy: c.xDescServ },
    ...(c.cNBS ? [{ id: 'cNBS', label: t('dfe.ficha.field.cNBS', 'Item da NBS'), copy: c.cNBS, campo: 'cNBS' as const }] : []),
    c.cIntContrib
      ? { id: 'cIntContrib', label: t('dfe.ficha.field.cIntContrib', 'Código interno do contribuinte'), copy: c.cIntContrib }
      : {
          id: 'cIntContrib',
          label: t('dfe.ficha.field.cIntContrib', 'Código interno do contribuinte'),
          copy: saleId,
          instruction: t('dfe.ficha.instr.cIntContrib', 'Se o portal exigir, use o identificador da venda.'),
          note: 'PV-8',
        },
  ];

  const v = payload.infDPS.valores;
  const tribMun = v.trib.tribMun;
  const totTrib = v.trib.totTrib;
  const pv5 = t('dfe.ficha.note.pv5', 'percentual — forma de informar a conferir no runbook (PV-5)');
  const valores: FichaRow[] = [
    { id: 'vServ', label: t('dfe.ficha.field.vServ', 'Valor do Serviço prestado'), copy: fmt(portalMoney, v.vServPrest.vServ), campo: 'vServ' },
    ...(v.vDescCondIncond?.vDescIncond
      ? [{ id: 'vDescIncond', label: t('dfe.ficha.field.vDescIncond', 'Desconto incondicionado'), copy: fmt(portalMoney, v.vDescCondIncond.vDescIncond), campo: 'vDescIncond' as const }]
      : []),
    ...(v.vDescCondIncond?.vDescCond
      ? [{ id: 'vDescCond', label: t('dfe.ficha.field.vDescCond', 'Desconto condicionado'), copy: fmt(portalMoney, v.vDescCondIncond.vDescCond), campo: 'vDescCond' as const }]
      : []),
    { id: 'tribISSQN', label: t('dfe.ficha.field.tribISSQN', 'Tributação do ISSQN'), instruction: t('dfe.ficha.instr.tributavel', 'Operação tributável.') },
    {
      id: 'regEspTrib',
      label: t('dfe.ficha.field.regEspTrib', 'Regime Especial de Tributação'),
      copy: String(d.prest.regTrib.regEspTrib),
      note: t('dfe.ficha.note.pv9', 'rótulo do portal a conferir no runbook (PV-9)'),
    },
    { id: 'exigibilidade', label: t('dfe.ficha.field.exigibilidade', 'Exigibilidade suspensa?'), instruction: t('dfe.ficha.instr.nao', 'Não.') },
    {
      id: 'tpRetISSQN',
      label: t('dfe.ficha.field.tpRetISSQN', 'Retenção do ISSQN'),
      instruction: tribMun.tpRetISSQN === 2 ? t('dfe.ficha.instr.retidoSim', 'Sim, retido pelo tomador.') : t('dfe.ficha.instr.nao', 'Não.'),
      campo: 'tpRetISSQN',
    },
    { id: 'beneficio', label: t('dfe.ficha.field.beneficio', 'Benefício municipal / dedução'), instruction: t('dfe.ficha.instr.nao', 'Não.') },
    ...(tribMun.pAliq
      ? [{ id: 'pAliq', label: t('dfe.ficha.field.pAliq', 'Alíquota'), copy: fmt(portalPercent, tribMun.pAliq), note: t('dfe.ficha.note.aliquota', 'conferência — o portal pode calcular'), campo: 'pAliq' as const }]
      : []),
    {
      id: 'tribFed',
      label: t('dfe.ficha.field.tribFed', 'Tributação federal'),
      instruction: simples
        ? t('dfe.ficha.instr.fedSimples', 'Já preenchida pelo Simples — não altere.')
        : t('dfe.ficha.instr.fedNormal', 'Não informe PIS/COFINS.'),
    },
    ...('pTotTribSN' in totTrib
      ? [{ id: 'pTotTribSN', label: t('dfe.ficha.field.pTotTribSN', 'Valor aproximado dos tributos — Simples Nacional (%)'), copy: fmt(portalPercent, totTrib.pTotTribSN), note: pv5 }]
      : [
          { id: 'pTotTribFed', label: t('dfe.ficha.field.pTotTribFed', 'Valor aproximado dos tributos — Federal (%)'), copy: fmt(portalPercent, totTrib.pTotTrib.pTotTribFed), note: pv5 },
          { id: 'pTotTribEst', label: t('dfe.ficha.field.pTotTribEst', 'Valor aproximado dos tributos — Estadual (%)'), copy: fmt(portalPercent, totTrib.pTotTrib.pTotTribEst), note: pv5 },
          { id: 'pTotTribMun', label: t('dfe.ficha.field.pTotTribMun', 'Valor aproximado dos tributos — Municipal (%)'), copy: fmt(portalPercent, totTrib.pTotTrib.pTotTribMun), note: pv5 },
        ]),
  ];
  const g = d.IBSCBS?.valores.trib.gIBSCBS;
  if (g) {
    valores.push(
      { id: 'ibsCbsCst', label: t('dfe.ficha.field.ibsCbsCst', 'IBS/CBS — CST'), copy: g.CST, note: 'PV-10', campo: 'IBSCBS.CST' },
      { id: 'ibsCbsClassTrib', label: t('dfe.ficha.field.ibsCbsClassTrib', 'IBS/CBS — cClassTrib'), copy: g.cClassTrib, note: 'PV-10', campo: 'IBSCBS.cClassTrib' },
    );
  }

  const emitir: FichaRow[] = [
    {
      id: 'emitir',
      label: t('dfe.ficha.field.emitir', 'Resumo + "Emitir NFS-e"'),
      instruction: t('dfe.ficha.instr.emitir', 'Confira o resumo e clique em "Emitir NFS-e". Depois, "Baixar XML" (e o DANFSe) e envie o arquivo aqui embaixo.'),
    },
  ];

  return [
    { id: 'pessoas', title: t('dfe.ficha.section.pessoas', '1. Pessoas'), rows: pessoas },
    { id: 'servico', title: t('dfe.ficha.section.servico', '2. Serviço'), rows: servico },
    { id: 'valores', title: t('dfe.ficha.section.valores', '3. Valores'), rows: valores },
    { id: 'emitir', title: t('dfe.ficha.section.emitir', '4. Emitir NFS-e'), rows: emitir },
  ];
}

export interface FichaModalProps {
  doc: FiscalDocumentView;
  unitId: string;
  /** `GET /status.ambiente` — só para o aviso de divergência (F-FE-DFE-5). */
  serverAmbiente: DfeAmbiente | null;
  onClose: () => void;
  onRetorno: (xml: File, pdf?: File) => Promise<CommandResult>;
}

/**
 * Ficha espelho do portal (C.3, itens 18–19): a DPS da tentativa corrente nos 4 passos do Emissor Nacional, campo a
 * campo, com o valor já no formato do portal e um botão de copiar. O ambiente vem do DOCUMENTO; se o servidor estiver em
 * outro, faixa âmbar. Com o documento ainda sem retorno, o upload do XML fica aqui embaixo (item 21).
 */
export function FichaModal({ doc, unitId, serverAmbiente, onClose, onRetorno }: FichaModalProps) {
  const { t, tRef } = useAccountingT();
  const [ficha, setFicha] = useState<FichaView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setFicha(null);
    setError(null);
    dfeService
      .ficha(doc.id, unitId)
      .then((f) => { if (alive) setFicha(f); })
      .catch((e: unknown) => { if (alive) setError(resolveError(e, tRef.current('dfe.ficha.error', 'Não foi possível carregar a ficha.'))); });
    return () => { alive = false; };
  }, [doc.id, doc.currentAttemptNo, unitId, tRef]);

  function copy(id: string, value: string) {
    void navigator.clipboard?.writeText(value);
    setCopied(id);
  }

  const ambienteDoc = t(`dfe.ambiente.${doc.ambiente}`, AMBIENTE_LABEL[doc.ambiente] ?? doc.ambiente);
  const sections = ficha ? buildFichaSections(ficha.payload, doc.saleId, t) : [];
  const awaitingReturn = doc.status === 'SENT' || doc.status === 'PROCESSING';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${t('dfe.ficha.title', 'Ficha para o Emissor Nacional')} — ${t('dfe.ficha.attempt', 'tentativa')} ${doc.currentAttemptNo}`}
      themeColor="bg-emerald-600"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 px-6 py-5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-200" data-testid="ficha-ambiente">
            {ambienteDoc}
          </span>
          {doc.ambiente === 'producao' ? (
            <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline dark:text-emerald-400">
              {t('dfe.ficha.portalLink', 'Abrir o Emissor Nacional')}
            </a>
          ) : (
            <span className="text-xs text-neutral-500">{t('dfe.ficha.homologacaoSemLink', 'Homologação: use o ambiente de produção restrita do portal (endereço a confirmar no runbook — PV-7).')}</span>
          )}
        </div>
        {serverAmbiente && serverAmbiente !== doc.ambiente && (
          <div role="alert" className={warnBox} data-testid="ficha-ambiente-divergente">
            {t('dfe.ficha.ambienteDivergente', 'O servidor está em {{server}}, este documento é de {{doc}} — emita no ambiente do documento.', {
              server: t(`dfe.ambiente.${serverAmbiente}`, AMBIENTE_LABEL[serverAmbiente]),
              doc: ambienteDoc,
            })}
          </div>
        )}
        <p className="text-xs text-neutral-500">
          {t('dfe.ficha.howto', 'Use a Emissão Completa do portal. Copie cada valor no campo de mesmo nome; os marcados "conferido na volta" são comparados com o XML autorizado.')}
        </p>

        {error && <div role="alert" className={errorBox}>{error}</div>}
        {!ficha && !error && <div className="py-4 text-center text-neutral-500">{t('dfe.loading', 'Carregando…')}</div>}

        {sections.map((s) => (
          <section key={s.id} data-testid={`ficha-section-${s.id}`} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
            <h3 className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{s.title}</h3>
            <dl className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {s.rows.map((r) => (
                <div key={r.id} data-testid={`ficha-row-${r.id}`} className="grid grid-cols-1 gap-1 py-1.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <dt className="text-xs text-neutral-500">
                    {r.label}
                    {r.campo && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        <FiCheckCircle size={10} /> {t('dfe.ficha.conferido', 'conferido na volta')}
                      </span>
                    )}
                  </dt>
                  <dd className="flex flex-wrap items-center gap-2 text-neutral-900 dark:text-neutral-100">
                    {r.instruction && <span className="text-xs font-medium">{r.instruction}</span>}
                    {r.copy !== undefined && (
                      <>
                        <span className="select-all font-mono text-sm" data-testid={`ficha-value-${r.id}`}>{r.copy}</span>
                        <button
                          type="button"
                          className={btn}
                          aria-label={`${t('dfe.ficha.copy', 'Copiar')} ${r.label}`}
                          onClick={() => copy(r.id, r.copy ?? '')}
                        >
                          <FiCopy size={11} /> {copied === r.id ? t('dfe.ficha.copied', 'Copiado') : t('dfe.ficha.copy', 'Copiar')}
                        </button>
                      </>
                    )}
                    {r.note && <span className="text-[11px] text-neutral-500">({r.note})</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {doc.releitura && <ReleituraView releitura={doc.releitura} />}
        {awaitingReturn && doc.partner === 'manual' && (
          <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
            <h3 className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('dfe.retorno.title', 'Retorno do portal')}</h3>
            <RetornoManualForm onSubmit={onRetorno} />
          </section>
        )}
      </div>
    </Modal>
  );
}
