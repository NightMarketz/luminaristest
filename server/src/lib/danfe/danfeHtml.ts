import { ValidationError } from '../errors';
import { escapeHtml } from '../receiptHtml';
import { barcodeChaveSvg } from './code128';
import type { Aliq, DanfeItem, DanfeModel } from './danfeModel';

/**
 * NFE-DANFE-IBSCBS PR-2, itens 11, 12, 14 e 15 (`docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md`): serializador PURO
 * do DANFE 55 em HTML, retrato A4 (F-DANFE-6 a), no leiaute da NT 2026.010 (modelo da p. 8) sobre o leiaute base do MOC 7.0
 * Anexo II. Mesmo padrão de `lib/receiptHtml.ts`: recebe dados, devolve HTML autocontido (CSS inline, sem rede), e o
 * `htmlToPdf` só imprime.
 *
 * Fontes: `docs/accounting/fontes-oficiais/TRANSCRICAO-NT2026010-DANFE-RTC-2026-10-26.md` (`[NT10-*]`) e
 * `TRANSCRICAO-MOC70-AnexoII-DANFE-2026-10-26.md` (`[MOC-DANFE-*]`).
 *
 * Invariantes: todo texto do XML passa por `escapeHtml` (I7); valor ausente ⇒ célula vazia, nunca "0,00" (I2); sem relógio
 * nem ordem de mapa ⇒ mesmo model, mesmo HTML (I5).
 *
 * Folhas (dono, questionário de 26/10: "Paginação no HTML"): a altura de cada bloco é ESTIMADA pelo tamanho do texto, de
 * forma pessimista (largura média de caractere maiúsculo), e gravada no CSS; os itens são distribuídos por esse orçamento.
 * Toda folha repete o cabeçalho (`[MOC-DANFE-FOLHAS]`) e traz "FOLHA n/m" (`[MOC-DANFE-NUM-FOLHA]`). As informações
 * complementares que não cabem no quadro da 1ª folha continuam na última (`[MOC-DANFE-INFCPL]`).
 */

/** Área útil da folha A4 com margem de 5 mm (`[MOC-DANFE-MARGEM]`: 0,2 a 0,8 cm): 200 × 287 mm. */
const FOLHA_MM = 287;
const LARGURA_MM = 200;
/** Margem do PDF do DANFE, para o `htmlToPdf` (item 16). */
export const DANFE_PDF_MARGIN = { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' } as const;

// ── métrica de texto (pessimista: Times maiúsculo ≈ 0,7 em por caractere; linha = 1,2 × corpo) ─────────────────────
const PT_MM = 0.3528;
const charMm = (pt: number) => pt * PT_MM * 0.7;
const linhaMm = (pt: number) => Number((pt * PT_MM * 1.2).toFixed(2));
/** Linhas que um texto ocupa numa largura (mm), na fonte dada. Vazio = 1 linha (a célula existe). */
const linhasTexto = (texto: string, larguraMm: number, pt: number) =>
  Math.max(1, Math.ceil((texto.length * charMm(pt)) / Math.max(1, larguraMm)));

const PT_ROTULO = 5; // `[MOC-DANFE-FONTE]`
const PT_CAMPO = 10; // `[MOC-DANFE-FONTE-CONTEUDO]` "demais campos"
const PT_ITEM = 6; // quadro de produtos
const PT_TEXTO = 7; // informações complementares e duplicatas (≥ 6 pt)
const CELULA_EXTRA_MM = 1.4; // bordas + respiro de uma célula
const TITULO_MM = 3.5;
const LINHA_ITEM_MM = linhaMm(PT_ITEM);
const LINHA_TEXTO_MM = linhaMm(PT_TEXTO);

const H = {
  canhoto: 16,
  topoMin: 36,
  cabecalhoProdutos: 10, // título + cabeçalho da tabela em até 2 linhas
  continua: 3.5,
  dadosAdicionais: 34,
} as const;

/** Colunas do quadro de produtos (mm); a descrição tem 50 mm (`[MOC-DANFE-COLUNAS]`). */
const COL_DESCRICAO_MM = 50;
const INFCPL_LARGURA_MM = LARGURA_MM * 0.58 - 2;
const LINHAS_INFCPL_FOLHA1 = Math.floor((H.dadosAdicionais - TITULO_MM - linhaMm(PT_ROTULO) - CELULA_EXTRA_MM) / LINHA_TEXTO_MM);
const CHARS_INFCPL_LINHA = Math.floor(INFCPL_LARGURA_MM / charMm(PT_TEXTO));
const DUP_MM = 46; // "001 · 15/10/2026 · 272,44" em 7 pt + espaço

// ── formatação (pura, sem Intl/toLocaleString — memória `centsToBRL`) ─────────────────────────────────────────────

const e = (s: string | null | undefined) => (s == null ? '' : escapeHtml(s));

/** Centavos → "1.234,56"; ausente ⇒ '' (I2). */
export function fmtCents(v: bigint | null): string {
  if (v === null) return '';
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const reais = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cent = (abs % 100n).toString().padStart(2, '0');
  return `${neg ? '-' : ''}${reais},${cent}`;
}

/** Número decimal do XML ("12.0000", "18.00") com vírgula, preservando as casas (I6). */
const fmtDec = (s: string | null) => (s == null ? '' : s.replace('.', ','));
const fmtAliq = (a: Aliq | string | null) => {
  const v = a == null ? null : typeof a === 'string' ? a : a.aliquota;
  return v == null ? '' : `${fmtDec(v)}%`;
};

/** Data/hora UTC do XML → "DD/MM/AAAA" e "HH:MM:SS" por reslice (nunca `new Date`). */
const dataBR = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const horaBR = (iso: string | null) => (iso && iso.length >= 19 ? iso.slice(11, 19) : '');

/** `[MOC-DANFE-CHAVE-MASCARA]`: 11 blocos de 4. */
export const chaveMascarada = (c: string) => c.replace(/(.{4})(?=.)/g, '$1 ');

function docFormatado(doc: string | null): string {
  if (!doc) return '';
  if (doc.length === 14) return `${doc.slice(0, 2)}.${doc.slice(2, 5)}.${doc.slice(5, 8)}/${doc.slice(8, 12)}-${doc.slice(12)}`;
  if (doc.length === 11) return `${doc.slice(0, 3)}.${doc.slice(3, 6)}.${doc.slice(6, 9)}-${doc.slice(9)}`;
  return doc;
}
const cepFormatado = (c: string | null) => (c && c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : (c ?? ''));
const numeroNF = (n: string) => n.padStart(9, '0').replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
const serieNF = (s: string) => s.padStart(3, '0');
const enderecoLinha = (xLgr: string, nro: string, xCpl: string | null) => `${xLgr}, ${nro}${xCpl ? ` - ${xCpl}` : ''}`;

/** `[MOC-DANFE-MODFRETE]` (MOC 7.0 Anexo II §3.1.10; exemplo "0 – Remetente"). */
const MODFRETE: Record<string, string> = {
  '0': 'REMETENTE',
  '1': 'DESTINATÁRIO',
  '2': 'TERCEIROS',
  '3': 'PRÓPRIO REMETENTE',
  '4': 'PRÓPRIO DESTINATÁRIO',
  '9': 'SEM OCORRÊNCIA DE TRANSPORTE',
};

/** Item 14 / `[MOC-DANFE-HOMOLOG]` (dono, 26/10: "Os dois"). */
export const SEM_VALOR_FISCAL = 'SEM VALOR FISCAL';
/** Item 11 / `[MOC-DANFE-CAMPO1]` (dono, 26/10: "Texto da NT 2026.010"; modelo da p. 8). */
export const TEXTO_CONSULTA =
  'Consulte a autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da SEFAZ autorizadora';

// ── blocos de campos com altura estimada ─────────────────────────────────────────────────────────────────────────

interface Campo {
  rotulo: string;
  texto: string; // texto puro (ainda não escapado)
  pct: number; // largura em % da folha
  negrito?: boolean;
}
interface Pedaco {
  html: string;
  mm: number;
}

const c = (rotulo: string, texto: string | null | undefined, pct: number, negrito = false): Campo => ({ rotulo, texto: texto ?? '', pct, negrito });

/** Uma linha de campos: a altura é a do campo mais alto (rótulo + conteúdo quebrados na largura da célula). */
function linha(...campos: Campo[]): Pedaco {
  const mm = Math.max(
    ...campos.map((x) => {
      const larg = (LARGURA_MM * x.pct) / 100 - CELULA_EXTRA_MM;
      return linhasTexto(x.rotulo, larg, PT_ROTULO) * linhaMm(PT_ROTULO) + linhasTexto(x.texto, larg, PT_CAMPO) * linhaMm(PT_CAMPO) + CELULA_EXTRA_MM;
    }),
  );
  const alt = Number(mm.toFixed(2));
  const html = `<div class="l" style="height:${alt}mm">${campos
    .map((x) => `<div class="c" style="width:${x.pct}%"><span class="r">${x.rotulo}</span><span class="v">${x.negrito ? `<b>${e(x.texto)}</b>` : e(x.texto)}</span></div>`)
    .join('')}</div>`;
  return { html, mm: alt };
}

function bloco(titulo: string, linhas: Pedaco[], classe = ''): Pedaco {
  const mm = Number((TITULO_MM + linhas.reduce((s, l) => s + l.mm, 0) + 0.5).toFixed(2));
  return { html: `<div class="bloco${classe}" style="height:${mm}mm"><div class="t">${titulo}</div>${linhas.map((l) => l.html).join('')}</div>`, mm };
}

const VAZIO: Pedaco = { html: '', mm: 0 };

function canhoto(m: DanfeModel): Pedaco {
  const html = `<div class="canhoto" style="height:${H.canhoto}mm">
<div class="cx" style="width:80%"><div style="height:6mm"><span class="r">RECEBEMOS DE ${e(m.emit.xNome)} OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO</span></div>
${linha(c('DATA DE RECEBIMENTO', '', 30), c('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', '', 70)).html}</div>
<div class="cx nfe" style="width:20%"><b>NF-e</b><br><b>Nº ${numeroNF(e(m.ide.nNF))}</b><br><b>SÉRIE ${serieNF(e(m.ide.serie))}</b></div>
</div>`;
  return { html, mm: H.canhoto };
}

function cabecalho(m: DanfeModel, folha: number, total: number): Pedaco {
  const en = m.emit.endereco;
  const linhaEnd1 = `${enderecoLinha(en.xLgr, en.nro, en.xCpl)} – ${en.xBairro}`;
  const linhaEnd2 = `${en.xMun}/${en.uf}${en.cep ? ` – CEP ${cepFormatado(en.cep)}` : ''}`;
  const linhaEnd3 = en.fone ? `Fone: ${en.fone}` : '';
  // `[MOC-DANFE-FONTE-CONTEUDO]`: razão social ≥ 12 pt, demais dados do emitente ≥ 8 pt
  const larguraEmit = LARGURA_MM * 0.38 - CELULA_EXTRA_MM;
  const emitMm =
    linhasTexto(m.emit.xNome, larguraEmit, 12) * linhaMm(12) +
    [linhaEnd1, linhaEnd2, linhaEnd3].filter(Boolean).reduce((s, t) => s + linhasTexto(t, larguraEmit, 8) * linhaMm(8), 0) +
    CELULA_EXTRA_MM;
  const topo = Number(Math.max(H.topoMin, emitMm).toFixed(2));
  const linhas = [
    linha(
      c('NATUREZA DA OPERAÇÃO', m.ide.natOp, 55),
      c('PROTOCOLO DE AUTORIZAÇÃO DE USO', `${m.protocolo.nProt} – ${dataBR(m.protocolo.dhRecbto)} ${horaBR(m.protocolo.dhRecbto)}`, 45),
    ),
    linha(
      c('INSCRIÇÃO ESTADUAL', m.emit.ie, 25),
      c('CÓDIGO DO REGIME TRIBUTÁRIO', m.emit.crtDescricao, 25),
      c('INSCRIÇÃO ESTADUAL DO SUBSTITUTO TRIBUTÁRIO', m.emit.iest, 25),
      c('CNPJ / CPF', docFormatado(m.emit.cnpjCpf), 25),
    ),
    linha(c('TIPO DE REGIME DE APURAÇÃO DO IBS E DA CBS', '', 100)),
  ];
  const mm = Number((topo + linhas.reduce((s, l) => s + l.mm, 0) + 0.5).toFixed(2));
  const html = `<div class="cabecalho" style="height:${mm}mm">
<div class="topo" style="height:${topo}mm">
<div class="cx emit" style="width:38%"><div class="xnome">${e(m.emit.xNome)}</div><div class="end">${e(linhaEnd1)}<br>${e(linhaEnd2)}${linhaEnd3 ? `<br>${e(linhaEnd3)}` : ''}</div></div>
<div class="cx danfe" style="width:17%"><div class="titulo">DANFE</div><div class="sub">DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA</div>
<div class="tp"><span>0 - ENTRADA<br>1 - SAÍDA</span><b class="tpnf">${e(m.ide.tpNF)}</b></div>
<div class="num">Nº ${numeroNF(e(m.ide.nNF))}<br>SÉRIE ${serieNF(e(m.ide.serie))}<br>FOLHA ${folha}/${total}</div></div>
<div class="cx chave" style="width:45%"><div class="barras">${barcodeChaveSvg(m.chave)}</div>
<span class="r">CHAVE DE ACESSO</span><div class="chv">${e(chaveMascarada(m.chave))}</div>
<div class="consulta">${e(TEXTO_CONSULTA)}</div></div>
</div>${linhas.map((l) => l.html).join('')}</div>`;
  return { html, mm };
}

function destinatario(m: DanfeModel): Pedaco {
  const d = m.dest;
  const en = d.endereco;
  return bloco('DESTINATÁRIO / REMETENTE', [
    linha(c('NOME / RAZÃO SOCIAL', d.xNome, 60), c('CNPJ / CPF', docFormatado(d.cnpjCpf), 25), c('DATA DE EMISSÃO', dataBR(m.ide.dhEmi), 15)),
    linha(
      c('ENDEREÇO', en ? enderecoLinha(en.xLgr, en.nro, en.xCpl) : '', 50),
      c('BAIRRO / DISTRITO', en?.xBairro, 22),
      c('CEP', cepFormatado(en?.cep ?? null), 13),
      c('DATA DE ENTRADA / SAÍDA', dataBR(m.ide.dhSaiEnt), 15),
    ),
    linha(
      c('MUNICÍPIO', en?.xMun, 35),
      c('FONE / FAX', en?.fone, 17),
      c('UF', en?.uf, 6),
      c('INSCRIÇÃO ESTADUAL', d.ie, 27),
      c('HORA DE SAÍDA', horaBR(m.ide.dhSaiEnt), 15),
    ),
  ]);
}

function fatura(m: DanfeModel): Pedaco {
  if (!m.fatura) return VAZIO; // `[MOC-DANFE-SUPR-FATURA]`
  const itens = [
    ...(m.fatura.nFat ? [`FATURA ${m.fatura.nFat}`] : []),
    ...m.fatura.dup.map((d) => `${d.nDup ?? ''} · ${dataBR(d.dVenc)} · ${fmtCents(d.vDup)}`),
  ];
  const porLinha = Math.max(1, Math.floor(LARGURA_MM / DUP_MM));
  const linhas = Math.max(1, Math.ceil(itens.length / porLinha));
  const mm = Number((TITULO_MM + linhas * LINHA_TEXTO_MM + 1.5).toFixed(2));
  const corpo = itens.map((t) => `<span class="dup">${e(t)}</span>`).join('');
  return { html: `<div class="bloco" style="height:${mm}mm"><div class="t">FATURA / DUPLICATAS</div><div class="dups">${corpo}</div></div>`, mm };
}

/** Campos facultativos (`[NT10-FACULT]`): só os que existem no XML, na mesma linha. */
function facultativos(pares: Array<[string, string | null]>): Pedaco[] {
  const presentes = pares.filter((p): p is [string, string] => p[1] !== null);
  if (presentes.length === 0) return [];
  const pct = Number((100 / presentes.length).toFixed(4));
  return [linha(...presentes.map(([r, v]) => c(r, v, pct)))];
}
const ou = (v: bigint | null) => (v === null ? null : fmtCents(v));
const ouQtd = (v: string | null) => (v === null ? null : fmtDec(v));

function totais(m: DanfeModel): Pedaco[] {
  const t = m.totaisIcmsIpi;
  const r = m.totaisIbsCbsIs;
  const produtos = bloco('TOTAL DOS PRODUTOS E TOTAL DA NOTA', [
    linha(
      c('VALOR TOTAL DOS PRODUTOS', fmtCents(t.vProd), 17),
      c('VALOR DO FRETE', fmtCents(t.vFrete), 15),
      c('VALOR DO SEGURO', fmtCents(t.vSeg), 15),
      c('DESCONTO', fmtCents(t.vDesc), 15),
      c('OUTRAS DESPESAS ACESSÓRIAS', fmtCents(t.vOutro), 20),
      c('VALOR TOTAL DA NOTA', fmtCents(t.vNF), 18, true),
    ),
  ]);
  const icms = bloco('TOTAL DO ICMS / IPI', [
    linha(
      c('BASE DE CÁLCULO DO ICMS', fmtCents(t.vBC), 20),
      c('VALOR DO ICMS', fmtCents(t.vICMS), 20),
      c('BASE DE CÁLCULO DO ICMS ST', fmtCents(t.vBCST), 20),
      c('VALOR DO ICMS ST', fmtCents(t.vST), 20),
      c('VALOR DO IPI', fmtCents(t.vIPI), 20),
    ),
    ...facultativos([
      ['VALOR DO FCP', ou(t.vFCP)],
      ['VALOR DO FCP RETIDO POR ST', ou(t.vFCPST)],
      ['VALOR DO DIFAL NA UF DE DESTINO', ou(t.vICMSUFDest)],
      ['VALOR DO FCP NA UF DE DESTINO', ou(t.vFCPUFDest)],
    ]),
    ...facultativos([
      ['BC DO ICMS MONOFÁSICO', ouQtd(t.qBCMono)],
      ['VALOR DO ICMS MONOFÁSICO', ou(t.vICMSMono)],
      ['BC DO ICMS MONOFÁSICO POR RETENÇÃO', ouQtd(t.qBCMonoReten)],
      ['VALOR DO ICMS MONOFÁSICO POR RETENÇÃO', ou(t.vICMSMonoReten)],
    ]),
  ]);
  // `[NT10-TOT]`: o bloco existe sempre, logo após "Total do ICMS/IPI"; valor ausente fica vazio (I2).
  const rtc = bloco('TOTAL DO IBS / CBS / IS', [
    linha(
      c('VALOR DA CBS', fmtCents(r.vCBS), 25),
      c('VALOR DO IBS UF', fmtCents(r.vIBSUF), 25),
      c('VALOR DO IBS MUNICÍPIO', fmtCents(r.vIBSMun), 25),
      c('VALOR DO IMPOSTO SELETIVO', fmtCents(r.vIS), 25),
    ),
    ...facultativos([
      ['VALOR DO IBS MONOFÁSICO', ou(r.vIBSMono)],
      ['VALOR DA CBS MONOFÁSICA', ou(r.vCBSMono)],
      ['VALOR DO IBS MONOFÁSICO POR RETENÇÃO', ou(r.vIBSMonoReten)],
      ['VALOR DA CBS MONOFÁSICA POR RETENÇÃO', ou(r.vCBSMonoReten)],
    ]),
  ]);
  return [produtos, icms, rtc];
}

function issqn(m: DanfeModel): Pedaco {
  if (!m.issqn) return VAZIO; // `[MOC-DANFE-SUPR-ISSQN]`
  return bloco('CÁLCULO DO ISSQN', [
    linha(
      c('INSCRIÇÃO MUNICIPAL', m.issqn.im, 25),
      c('VALOR TOTAL DOS SERVIÇOS', fmtCents(m.issqn.vServ), 25),
      c('BASE DE CÁLCULO DO ISSQN', fmtCents(m.issqn.vBC), 25),
      c('VALOR DO ISSQN', fmtCents(m.issqn.vISS), 25),
    ),
  ]);
}

function transporte(m: DanfeModel): Pedaco {
  const t = m.transp;
  if (!t) return VAZIO;
  const tr = t.transportadora;
  const v = t.veiculo;
  const vols = t.volumes.length ? t.volumes : [null];
  return bloco('TRANSPORTADOR / VOLUMES TRANSPORTADOS', [
    linha(
      c('RAZÃO SOCIAL', tr?.xNome, 30),
      c('FRETE POR CONTA', `${t.modFrete} - ${MODFRETE[t.modFrete] ?? ''}`, 18),
      c('CÓDIGO ANTT', v?.rntc, 12),
      c('PLACA DO VEÍCULO', v?.placa, 12),
      c('UF', v?.uf, 6),
      c('CNPJ / CPF', docFormatado(tr?.cnpjCpf ?? null), 22),
    ),
    linha(c('ENDEREÇO', tr?.xEnder, 45), c('MUNICÍPIO', tr?.xMun, 27), c('UF', tr?.uf, 6), c('INSCRIÇÃO ESTADUAL', tr?.ie, 22)),
    ...vols.map((vol) =>
      linha(
        c('QUANTIDADE', vol?.qVol, 12),
        c('ESPÉCIE', vol?.esp, 20),
        c('MARCA', vol?.marca, 20),
        c('NUMERAÇÃO', vol?.nVol, 16),
        c('PESO BRUTO', vol?.pesoB ? `${fmtDec(vol.pesoB)} kg` : '', 16),
        c('PESO LÍQUIDO', vol?.pesoL ? `${fmtDec(vol.pesoL)} kg` : '', 16),
      ),
    ),
  ]);
}

// ── quadro de produtos (item 12) ───────────────────────────────────────────────────────────────────────────────

/** Linhas que o item ocupa: descrição + infAdProd (`[MOC-DANFE-INFADPROD]`) + [NCM][cClassTrib], no mínimo as 4 de bases. */
export function linhasDoItem(i: DanfeItem): number {
  const larg = COL_DESCRICAO_MM - CELULA_EXTRA_MM;
  const ncm = `[NCM ${i.ncm}]${i.ibsCbs ? ` [cClassTrib ${i.ibsCbs.cClassTrib}]` : ''}`;
  const desc =
    linhasTexto(i.xProd, larg, PT_ITEM) + (i.infAdProd ? linhasTexto(i.infAdProd, larg, PT_ITEM) : 0) + linhasTexto(ncm, larg, PT_ITEM);
  return Math.max(4, desc);
}

/** Altura do item no quadro de produtos (mm). */
export const alturaDoItem = (i: DanfeItem) => Number((linhasDoItem(i) * LINHA_ITEM_MM + CELULA_EXTRA_MM).toFixed(2));

const sub = (rot: string, val: string) => `<div class="sl"><span class="sr">${rot}</span><span>${e(val)}</span></div>`;
/** Duas alíquotas/valores na mesma linha, como o modelo da NT ("ICMS … / CBS …"). */
const par = (r1: string, v1: string, r2: string, v2: string) =>
  `<div class="sl"><span><span class="sr">${r1}</span> ${e(v1)}</span><span>/</span><span><span class="sr">${r2}</span> ${e(v2)}</span></div>`;

function linhaItem(i: DanfeItem): string {
  const ib = i.ibsCbs;
  const ncm = `[NCM ${i.ncm}]${ib ? ` [cClassTrib ${ib.cClassTrib}]` : ''}`;
  return `<tr class="item" style="height:${alturaDoItem(i)}mm">
<td class="cod">${e(i.cProd)}</td>
<td class="desc">${e(i.xProd)}${i.infAdProd ? `<div class="inf">${e(i.infAdProd)}</div>` : ''}<div class="ncm">${e(ncm)}</div></td>
<td>${sub('CST', i.cstOuCsosn ?? '')}${sub('CFOP', i.cfop)}</td>
<td class="n">${e(fmtDec(i.qCom))}<br>[${e(i.uCom)}]</td>
<td class="n">${e(fmtDec(i.vUnCom))}</td>
<td class="n">${e(fmtCents(i.vProd))}</td>
<td class="n">${sub('ICMS', fmtCents(i.icms.vBC))}${sub('IBS / CBS', fmtCents(ib?.vBC ?? null))}${sub('IS', fmtCents(i.is?.vBCIS ?? null))}${sub('IPI', fmtCents(i.ipi?.vBC ?? null))}</td>
<td class="n">${par('ICMS', fmtAliq(i.icms.pICMS), 'CBS', fmtAliq(ib?.cbs.aliq ?? null))}${par('IBS UF', fmtAliq(ib?.ibsUf.aliq ?? null), 'IPI', fmtAliq(i.ipi?.pIPI ?? null))}${par('IBS MUN', fmtAliq(ib?.ibsMun.aliq ?? null), 'IS', fmtAliq(i.is?.pIS ?? null))}</td>
<td class="n">${par('ICMS', fmtCents(i.icms.vICMS), 'CBS', fmtCents(ib?.cbs.valor ?? null))}${par('IBS UF', fmtCents(ib?.ibsUf.valor ?? null), 'IPI', fmtCents(i.ipi?.vIPI ?? null))}${par('IBS MUN', fmtCents(ib?.ibsMun.valor ?? null), 'IS', fmtCents(i.is?.vIS ?? null))}</td>
</tr>`;
}

function quadroProdutos(itens: DanfeItem[], alturaMm: number | null, continua: boolean): string {
  return `<div class="bloco produtos"${alturaMm === null ? '' : ` style="height:${alturaMm}mm"`}><div class="t">DADOS DOS PRODUTOS / SERVIÇOS</div>
<table><thead><tr><th class="cod">CÓDIGO</th><th class="desc">DESCRIÇÃO DO PRODUTO / SERVIÇO</th><th>CST / CFOP</th><th>QTD / UN</th><th>VLR UNIT</th><th>VLR TOTAL</th><th>BASES DE CÁLCULO</th><th>ALÍQUOTAS</th><th>VALOR DOS TRIBUTOS</th></tr></thead>
<tbody>${itens.map(linhaItem).join('')}</tbody></table>${continua ? '<div class="continua">CONTINUA NA PRÓXIMA FOLHA</div>' : ''}</div>`;
}

// ── informações complementares ─────────────────────────────────────────────────────────────────────────────────

/** Texto do quadro, na ordem: "SEM VALOR FISCAL" (homologação, item 14), infAdFisco, infCpl (`[MOC-DANFE-INFCPL]`). */
function textoComplementar(m: DanfeModel): string {
  return [m.ambiente === 'homologacao' ? SEM_VALOR_FISCAL : null, m.infAdFisco, m.infCpl].filter((x): x is string => !!x).join(' ');
}

/** Corta o texto no limite de caracteres da 1ª folha, sem partir palavra quando der. */
function dividirComplementar(texto: string): [string, string] {
  const limite = LINHAS_INFCPL_FOLHA1 * CHARS_INFCPL_LINHA;
  if (texto.length <= limite) return [texto, ''];
  const corte = texto.lastIndexOf(' ', limite);
  const pos = corte > limite / 2 ? corte : limite;
  return [texto.slice(0, pos), texto.slice(pos).trimStart()];
}

function dadosAdicionais(texto: string, continua: boolean): Pedaco {
  const html = `<div class="bloco" style="height:${H.dadosAdicionais}mm"><div class="t">DADOS ADICIONAIS</div><div class="l" style="height:${H.dadosAdicionais - TITULO_MM - 0.5}mm">
<div class="c inf-cpl" style="width:58%"><span class="r">INFORMAÇÕES COMPLEMENTARES</span><span class="v">${e(texto)}${continua ? ' (CONTINUA NA ÚLTIMA FOLHA)' : ''}</span></div>
<div class="c" style="width:27%"><span class="r">RESERVADO AO FISCO</span></div>
<div class="c qr" style="width:15%"><span class="r">QR CODE</span></div></div></div>`;
  return { html, mm: H.dadosAdicionais };
}

const alturaContinuacao = (texto: string) =>
  TITULO_MM + CELULA_EXTRA_MM + linhasTexto(texto, LARGURA_MM - CELULA_EXTRA_MM, PT_TEXTO) * LINHA_TEXTO_MM;
const continuacaoComplementar = (texto: string) =>
  `<div class="bloco continuacao"><div class="t">INFORMAÇÕES COMPLEMENTARES (CONTINUAÇÃO)</div><div class="c" style="width:100%"><span class="v">${e(texto)}</span></div></div>`;

// ── paginação ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface Paginacao {
  /** Itens de cada folha, na ordem do XML. A 1ª pode vir vazia quando os blocos fixos ocupam a folha. */
  folhas: DanfeItem[][];
  /** Altura (mm) disponível para itens no quadro de produtos da 1ª folha e das adicionais. */
  capacidade: { folha1: number; adicionais: number };
  /** Resto das informações complementares que vai para a última folha. */
  complementarResto: string;
}

/** Blocos da 1ª folha antes do quadro de produtos, na ordem do modelo da NT 2026.010 p. 8. */
function blocosFolha1(m: DanfeModel): Pedaco[] {
  return [canhoto(m), destinatario(m), fatura(m), ...totais(m), issqn(m), transporte(m)];
}

/** Distribui os itens pelas folhas por orçamento de altura (determinístico, sem medir o DOM). */
export function paginar(m: DanfeModel): Paginacao {
  const cab = cabecalho(m, 1, 1).mm; // a altura não depende do número da folha
  const fixos = blocosFolha1(m).reduce((s, b) => s + b.mm, 0) + cab + H.dadosAdicionais;
  const folha1 = FOLHA_MM - fixos - H.cabecalhoProdutos - H.continua;
  if (folha1 < 0) {
    throw new ValidationError(
      'DANFE: os quadros da 1ª folha (fatura, totais, transporte e dados adicionais) não cabem em uma folha A4.',
      { alturaMm: Number(fixos.toFixed(1)) },
      'DANFE_FOLHA1_EXCEDE',
    );
  }
  const adicionais = FOLHA_MM - cab - H.cabecalhoProdutos - H.continua;
  const folhas: DanfeItem[][] = [[]];
  let livre = folha1;
  for (const item of m.itens) {
    // item maior que uma folha inteira: fica sozinho (a linha cresce; o texto não se perde)
    const altura = Math.min(alturaDoItem(item), adicionais);
    if (altura > livre && (folhas[folhas.length - 1].length > 0 || folhas.length === 1)) {
      folhas.push([]);
      livre = adicionais;
    }
    folhas[folhas.length - 1].push(item);
    livre -= altura;
  }
  const [, resto] = dividirComplementar(textoComplementar(m));
  // a 1ª folha termina no quadro de dados adicionais: o resto sempre vai para uma folha adicional
  if (resto && (folhas.length === 1 || alturaContinuacao(resto) > livre)) folhas.push([]);
  return { folhas, capacidade: { folha1, adicionais }, complementarResto: resto };
}

// ── documento ──────────────────────────────────────────────────────────────────────────────────────────────────

const CSS = `
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Times New Roman', Times, serif; font-size: ${PT_ITEM}pt; color: #000; background: #fff; }
.folha { width: ${LARGURA_MM}mm; height: ${FOLHA_MM}mm; position: relative; overflow: visible; page-break-after: always; break-after: page; }
.folha:last-child { page-break-after: auto; break-after: auto; }
.marca { position: absolute; top: 120mm; left: 0; width: ${LARGURA_MM}mm; text-align: center; font-size: 40pt; font-weight: bold;
  color: rgba(0,0,0,0.12); transform: rotate(-30deg); z-index: 0; pointer-events: none; }
.canhoto, .topo, .l { display: flex; }
.canhoto { border-bottom: 0.3mm dashed #000; }
.cx, .c { border: 0.2mm solid #000; padding: 0.5mm 0.5mm; overflow: hidden; }
.r { display: block; font-size: ${PT_ROTULO}pt; line-height: ${linhaMm(PT_ROTULO)}mm; font-weight: bold; text-transform: uppercase; }
.v { display: block; font-size: ${PT_CAMPO}pt; line-height: ${linhaMm(PT_CAMPO)}mm; word-break: break-word; }
.inf-cpl .v, .continuacao .v { font-size: ${PT_TEXTO}pt; line-height: ${LINHA_TEXTO_MM}mm; }
.t { font-size: ${PT_ROTULO}pt; font-weight: bold; text-transform: uppercase; height: ${TITULO_MM}mm; padding-top: 1mm; }
.bloco, .cabecalho { position: relative; z-index: 1; overflow: hidden; }
.emit .xnome { font-size: 12pt; line-height: ${linhaMm(12)}mm; font-weight: bold; }
.emit .end { font-size: 8pt; line-height: ${linhaMm(8)}mm; font-weight: bold; }
.danfe { text-align: center; }
.danfe .titulo { font-size: 12pt; font-weight: bold; }
.danfe .sub { font-size: 8pt; }
.danfe .tp { display: flex; justify-content: center; gap: 2mm; font-size: 8pt; }
.danfe .tpnf { font-size: 10pt; border: 0.2mm solid #000; padding: 0 1mm; }
.danfe .num { font-size: 10pt; font-weight: bold; }
.nfe { text-align: center; font-size: 10pt; }
.chave .barras svg { width: 115mm; height: 10mm; }
.chave .barras { height: 11mm; overflow: hidden; }
.chave .chv { font-size: 9pt; font-weight: bold; letter-spacing: 0.2mm; }
.chave .consulta { font-size: 7pt; }
.dups { display: flex; flex-wrap: wrap; column-gap: 3mm; font-size: ${PT_TEXTO}pt; line-height: ${LINHA_TEXTO_MM}mm; }
.produtos { overflow: visible; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 0.2mm solid #000; vertical-align: top; padding: 0.2mm 0.5mm; font-size: ${PT_ITEM}pt; line-height: ${LINHA_ITEM_MM}mm; }
th { font-size: ${PT_ROTULO}pt; line-height: 2.2mm; text-transform: uppercase; }
th.cod, td.cod { width: 12mm; word-break: break-word; }
th.desc, td.desc { width: ${COL_DESCRICAO_MM}mm; word-break: break-word; }
td.n { text-align: right; }
.item td { border-top: 0.3mm dashed #000; }
.sl { display: flex; justify-content: space-between; gap: 0.5mm; }
.sr { font-weight: bold; }
.inf, .ncm { font-style: italic; }
.continua { font-weight: bold; text-align: right; height: ${H.continua}mm; }
`;

/**
 * Item 11: o HTML do DANFE (todas as folhas). Ordem na 1ª folha, pelo modelo da NT 2026.010 p. 8: canhoto, cabeçalho,
 * destinatário, fatura, totais dos produtos, Total do ICMS/IPI, Total do IBS/CBS/IS, Cálculo do ISSQN, transportador,
 * produtos e dados adicionais. Folhas adicionais: cabeçalho + produtos (`[MOC-DANFE-FOLHAS]`).
 */
export function renderDanfeHtml(m: DanfeModel): string {
  const pag = paginar(m);
  const total = pag.folhas.length;
  const [complemento1] = dividirComplementar(textoComplementar(m));
  const marca = m.ambiente === 'homologacao' ? `<div class="marca">${SEM_VALOR_FISCAL}</div>` : '';
  const folhas = pag.folhas.map((itens, idx) => {
    const n = idx + 1;
    const ultima = n === total;
    const continua = !ultima && pag.folhas[idx + 1].length > 0;
    const cont = ultima && pag.complementarResto ? continuacaoComplementar(pag.complementarResto) : '';
    if (n === 1) {
      const [canh, ...resto] = blocosFolha1(m);
      const altura = H.cabecalhoProdutos + pag.capacidade.folha1 + H.continua;
      return `<section class="folha">${marca}${canh.html}${cabecalho(m, n, total).html}${resto.map((b) => b.html).join('')}${quadroProdutos(itens, altura, continua)}${dadosAdicionais(complemento1, pag.complementarResto !== '').html}</section>`;
    }
    const produtos = itens.length ? quadroProdutos(itens, null, continua) : '';
    return `<section class="folha">${marca}${cabecalho(m, n, total).html}${produtos}${cont}</section>`;
  });
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>DANFE ${e(m.chave)}</title><style>${CSS}</style></head>
<body>${folhas.join('\n')}</body></html>`;
}
