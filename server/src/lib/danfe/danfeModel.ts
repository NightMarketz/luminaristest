import type { LinhaLegal } from '../../features/legalParameters/models/legalParameter';
import { ValidationError } from '../errors';
import {
  assertChaveAcesso,
  assertProtocoloAutorizado,
  locateInfNFe,
  moneyToBigCentsOpt,
  readNfeTree,
  reqStr,
  str,
} from '../nfe';

/**
 * NFE-DANFE-IBSCBS PR-1 (`docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md` itens 5–10; F-DANFE-3 b): leitor PURO do
 * `nfeProc` autorizado para o DANFE da NF-e 55 no leiaute da NT 2026.010. Sem Prisma, sem relógio, sem regra contábil;
 * o `ParsedNfe` da ingestão não muda.
 *
 * Fontes das tags (o leiaute vem do XML, nunca de inferência — `[NT10-FACULT]`, `[MOC-DANFE-SO-XML]`):
 *  - campos do DANFE: `docs/accounting/fontes-oficiais/TRANSCRICAO-NT2026010-DANFE-RTC-2026-10-26.md` (`[NT10-*]`) e
 *    `TRANSCRICAO-MOC70-AnexoII-DANFE-2026-10-26.md` (`[MOC-DANFE-*]`);
 *  - caminho das tags: MOC 7.0 Anexo I (grupos B, C, E, I, N, O, V, W, X, Y, Z) e NT 2025.002 v1.52 (grupos UB, BB, W03),
 *    dossiê `pesquisas-legais/nfe-danfe-pr1/`.
 *
 * Invariantes: tag ausente ⇒ `null`, nunca `0n` (I2); dinheiro por aritmética de string → `bigint` e alíquota como string
 * crua com as casas do XML (I6); assinatura verificada antes de qualquer leitura (I9, via `readNfeTree`); só modelo 55 (I8).
 */

type BigCents = bigint | null; // ausente ≠ zero (I2)

/** `[NT10-ALIQ]`: com `gRed` informado, a alíquota efetiva `pAliqEfet`; sem ele, a vigente. String crua do XML (I6). */
export type Aliq = { aliquota: string; origem: 'EFETIVA' | 'VIGENTE' } | null;

/** `[MOC-DANFE-EMITENTE]` e destinatário (MOC Anexo I C05–C16 / E05–E16). */
export interface DanfeEndereco {
  xLgr: string;
  nro: string;
  xCpl: string | null;
  xBairro: string;
  xMun: string;
  uf: string;
  cep: string | null;
  fone: string | null;
}

/** `[NT10-TOT]`: bloco "Total do IBS/CBS/IS" (NT 2025.002 W31/W34). */
export interface DanfeTotaisIbsCbsIs {
  vCBS: BigCents; // W56 IBSCBSTot/gCBS/vCBS
  vIBSUF: BigCents; // W41 IBSCBSTot/gIBS/gIBSUF/vIBSUF
  vIBSMun: BigCents; // W46 IBSCBSTot/gIBS/gIBSMun/vIBSMun
  vIS: BigCents; // W33 ISTot/vIS
  vIBSMono: BigCents; // W58 IBSCBSTot/gMono/vIBSMono
  vCBSMono: BigCents; // W59
  vIBSMonoReten: BigCents; // W59a
  vCBSMonoReten: BigCents; // W59b
}

/** `[NT10-ITEM]` `[NT10-ALIQ]`: grupo UB12 do item. */
export interface DanfeItemIbsCbs {
  cClassTrib: string; // UB14
  vBC: BigCents; // UB16
  ibsUf: { aliq: Aliq; valor: BigCents }; // UB18 / UB28 / UB35
  ibsMun: { aliq: Aliq; valor: BigCents }; // UB37 / UB47 / UB54
  cbs: { aliq: Aliq; valor: BigCents }; // UB56 / UB66 / UB67
}

export interface DanfeItem {
  nItem: number;
  cProd: string; // I02
  xProd: string; // I04
  ncm: string; // I05
  /** `[MOC-DANFE-ORDEM]` coluna CST = N11 orig + N12 CST (ou N12a CSOSN). Sem grupo ICMS ⇒ null (I2). */
  cstOuCsosn: string | null;
  cfop: string; // I08
  uCom: string; // I09
  qCom: string; // I10 — decimais variáveis, string crua
  vUnCom: string; // I10a — idem
  vProd: BigCents; // I11
  icms: { vBC: BigCents; pICMS: string | null; vICMS: BigCents }; // N15 / N16 / N17
  /** O10 / O13 / O14; grupo IPI ausente ⇒ null. `vBC` entrou no PR-2 (item 12: coluna "BASES DE CÁLCULO" do IPI, NT 2026.010 p. 8). */
  ipi: { vBC: BigCents; pIPI: string | null; vIPI: BigCents } | null;
  ibsCbs: DanfeItemIbsCbs | null;
  is: { vBCIS: BigCents; pIS: string | null; vIS: BigCents } | null; // UB05 / UB06 / UB11
  infAdProd: string | null; // V01, `[MOC-DANFE-INFADPROD]`
}

/**
 * Totais do ICMS/IPI e da nota (MOC 7.0 Anexo I W02–W16) com os facultativos do `[NT10-FACULT]`. Os quatro campos do ICMS
 * monofásico (W06b.1–W06d) não estão no MOC 7.0: nomes e IDs vêm da NT 2026.010 §4.4.
 */
export interface DanfeTotaisIcmsIpi {
  vBC: BigCents; // W03
  vICMS: BigCents; // W04
  vBCST: BigCents; // W05
  vST: BigCents; // W06
  vProd: BigCents; // W07
  vFrete: BigCents; // W08
  vSeg: BigCents; // W09
  vDesc: BigCents; // W10
  vIPI: BigCents; // W12
  vOutro: BigCents; // W15
  vNF: BigCents; // W16
  vFCP: BigCents; // W04h
  vFCPST: BigCents; // W06a
  vICMSUFDest: BigCents; // W04e
  vFCPUFDest: BigCents; // W04c
  qBCMono: string | null; // W06b.1 — base em QUANTIDADE, string crua
  vICMSMono: BigCents; // W06c
  qBCMonoReten: string | null; // W06c.1 — quantidade
  vICMSMonoReten: BigCents; // W06d
}

/** Grupo X (MOC Anexo I X01–X32; `[MOC-DANFE-MODFRETE]`). `vol` é 0-5000 no leiaute: lista, sem escolher um. */
export interface DanfeTransp {
  modFrete: string; // X02
  transportadora: {
    xNome: string | null;
    cnpjCpf: string | null;
    ie: string | null;
    xEnder: string | null;
    xMun: string | null;
    uf: string | null;
  } | null;
  veiculo: { placa: string; uf: string; rntc: string | null } | null; // X18–X21
  volumes: Array<{
    qVol: string | null;
    esp: string | null;
    marca: string | null;
    nVol: string | null;
    pesoL: string | null; // 12v3, string crua
    pesoB: string | null;
  }>;
}

export interface DanfeModel {
  chave: string;
  ambiente: 'producao' | 'homologacao'; // tpAmb=2 ⇒ homologação (item 14 imprime "SEM VALOR FISCAL")
  ide: { nNF: string; serie: string; tpNF: '0' | '1'; natOp: string; dhEmi: string; dhSaiEnt: string | null };
  protocolo: { nProt: string; dhRecbto: string }; // `[MOC-DANFE-PROTOCOLO]`
  emit: {
    xNome: string;
    endereco: DanfeEndereco;
    cnpjCpf: string;
    ie: string | null;
    iest: string | null; // C18
    crt: string; // C21
    crtDescricao: string; // `[NT10-EMIT]`: "3 - REGIME NORMAL"
    tipoRegimeApuracaoIbsCbs: null; // `[NT10-EMIT]` I3: campo reservado até a NT futura
  };
  dest: { xNome: string | null; endereco: DanfeEndereco | null; cnpjCpf: string | null; ie: string | null };
  fatura: { nFat: string | null; dup: Array<{ nDup: string | null; dVenc: string | null; vDup: BigCents }> } | null;
  totaisIcmsIpi: DanfeTotaisIcmsIpi;
  totaisIbsCbsIs: DanfeTotaisIbsCbsIs;
  issqn: { im: string | null; vServ: BigCents; vBC: BigCents; vISS: BigCents } | null; // W17 + C19
  transp: DanfeTransp | null;
  itens: DanfeItem[];
  infAdFisco: string | null; // Z02 — `[MOC-DANFE-INFCPL]` (dono, questionário de 26/10: incluir)
  infCpl: string | null; // Z03
  /** Item 15 (F-DANFE-8 b): `infNFeSupl/qrCode` no XML ⇒ aviso; a área "QR CODE" fica vazia até a NT do `[NT10-QR]`. Fora do HTML. */
  avisos: Array<'QRCODE_NAO_RENDERIZADO'>;
}

type Node = Record<string, unknown>;

/**
 * `[NT10-EMIT]`: CRT impresso como código + descrição. Descrições do MOC 7.0 Anexo I (C21: 1, 2, 3) e da NT 2025.002
 * v1.52 ("CRT=4-MEI"), em caixa alta como o modelo da NT ("3 - REGIME NORMAL").
 */
const CRT_DESCRICAO: Record<string, string> = {
  '1': 'SIMPLES NACIONAL',
  '2': 'SIMPLES NACIONAL, EXCESSO SUBLIMITE DE RECEITA BRUTA',
  '3': 'REGIME NORMAL',
  '4': 'MEI',
};

const node = (v: unknown): Node | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Node) : null);
const opt = (v: unknown): string | null => str(v) || null;
const asArray = (v: unknown): Node[] => (Array.isArray(v) ? v : v == null ? [] : [v]).filter((x): x is Node => !!node(x));

/** Primeiro filho-objeto de um grupo-escolha (`ICMS` → `ICMS00`|…|`ICMSSN102`; `IPI` → `IPITrib`|`IPINT`). */
function firstVariant(group: unknown): Node | null {
  const g = node(group);
  if (!g) return null;
  for (const v of Object.values(g)) {
    const n = node(v);
    if (n) return n;
  }
  return null;
}

function readEndereco(n: unknown, grupo: string): DanfeEndereco | null {
  const e = node(n);
  if (!e) return null;
  return {
    xLgr: reqStr(e.xLgr, `${grupo}/xLgr`),
    nro: reqStr(e.nro, `${grupo}/nro`),
    xCpl: opt(e.xCpl),
    xBairro: reqStr(e.xBairro, `${grupo}/xBairro`),
    xMun: reqStr(e.xMun, `${grupo}/xMun`),
    uf: reqStr(e.UF, `${grupo}/UF`),
    cep: opt(e.CEP),
    fone: opt(e.fone),
  };
}

/** `[NT10-ALIQ]` / I4: `gRed` presente ⇒ `pAliqEfet` (EFETIVA); senão a alíquota vigente; nenhuma ⇒ null. */
function readAliq(grupo: Node | null, tagVigente: string): Aliq {
  if (!grupo) return null;
  const gRed = node(grupo.gRed);
  if (gRed) return { aliquota: reqStr(gRed.pAliqEfet, `${tagVigente}/gRed/pAliqEfet`), origem: 'EFETIVA' };
  const vigente = opt(grupo[tagVigente]);
  return vigente ? { aliquota: vigente, origem: 'VIGENTE' } : null;
}

/** Item 7: grupo UB12 `imposto/IBSCBS`. Sem o grupo ⇒ null; sem `gIBSCBS` (só CST/cClassTrib) ⇒ valores null. */
function readItemIbsCbs(imposto: Node): DanfeItemIbsCbs | null {
  const g = node(imposto.IBSCBS);
  if (!g) return null;
  const gIBSCBS = node(g.gIBSCBS);
  const gUf = node(gIBSCBS?.gIBSUF);
  const gMun = node(gIBSCBS?.gIBSMun);
  const gCbs = node(gIBSCBS?.gCBS);
  return {
    cClassTrib: reqStr(g.cClassTrib, 'det/imposto/IBSCBS/cClassTrib'),
    vBC: moneyToBigCentsOpt(gIBSCBS?.vBC, 'det/imposto/IBSCBS/gIBSCBS/vBC'),
    ibsUf: { aliq: readAliq(gUf, 'pIBSUF'), valor: moneyToBigCentsOpt(gUf?.vIBSUF, 'gIBSUF/vIBSUF') },
    ibsMun: { aliq: readAliq(gMun, 'pIBSMun'), valor: moneyToBigCentsOpt(gMun?.vIBSMun, 'gIBSMun/vIBSMun') },
    cbs: { aliq: readAliq(gCbs, 'pCBS'), valor: moneyToBigCentsOpt(gCbs?.vCBS, 'gCBS/vCBS') },
  };
}

/** Item 8: grupo UB01 `imposto/IS`. A sequência UB04 (vBCIS/pIS/vIS) é 0-1 ⇒ campos null quando ausente. */
function readItemIs(imposto: Node): DanfeItem['is'] {
  const g = node(imposto.IS);
  if (!g) return null;
  return {
    vBCIS: moneyToBigCentsOpt(g.vBCIS, 'det/imposto/IS/vBCIS'),
    pIS: opt(g.pIS),
    vIS: moneyToBigCentsOpt(g.vIS, 'det/imposto/IS/vIS'),
  };
}

function readItem(det: Node): DanfeItem {
  const prod = node(det.prod) ?? {};
  const imposto = node(det.imposto) ?? {};
  const nItemRaw = str(det['@_nItem']);
  const nItem = Number(nItemRaw);
  if (!nItemRaw || !Number.isInteger(nItem) || nItem < 1) {
    throw new ValidationError(`NF-e inválida: det/@nItem "${nItemRaw}" inválido.`);
  }
  const icms = firstVariant(imposto.ICMS);
  const cst = icms ? opt(icms.CST) ?? opt(icms.CSOSN) : null;
  const ipiVar = firstVariant(imposto.IPI);
  return {
    nItem,
    cProd: reqStr(prod.cProd, 'det/prod/cProd'),
    xProd: reqStr(prod.xProd, 'det/prod/xProd'),
    ncm: reqStr(prod.NCM, 'det/prod/NCM'),
    cstOuCsosn: cst ? `${str(icms?.orig)}${cst}` : null,
    cfop: reqStr(prod.CFOP, 'det/prod/CFOP'),
    uCom: reqStr(prod.uCom, 'det/prod/uCom'),
    qCom: reqStr(prod.qCom, 'det/prod/qCom'),
    vUnCom: reqStr(prod.vUnCom, 'det/prod/vUnCom'),
    vProd: moneyToBigCentsOpt(prod.vProd, 'det/prod/vProd'),
    icms: {
      vBC: moneyToBigCentsOpt(icms?.vBC, 'det/imposto/ICMS/vBC'),
      pICMS: opt(icms?.pICMS),
      vICMS: moneyToBigCentsOpt(icms?.vICMS, 'det/imposto/ICMS/vICMS'),
    },
    ipi: ipiVar
      ? {
          vBC: moneyToBigCentsOpt(ipiVar.vBC, 'det/imposto/IPI/IPITrib/vBC'),
          pIPI: opt(ipiVar.pIPI),
          vIPI: moneyToBigCentsOpt(ipiVar.vIPI, 'det/imposto/IPI/IPITrib/vIPI'),
        }
      : null,
    ibsCbs: readItemIbsCbs(imposto),
    is: readItemIs(imposto),
    infAdProd: opt(det.infAdProd),
  };
}

/** Item 6: `[NT10-TOT]`, os 8 campos do bloco "Total do IBS/CBS/IS". Grupo ausente ⇒ null em cada campo (I2). */
function readTotaisIbsCbsIs(total: Node): DanfeTotaisIbsCbsIs {
  const ibscbs = node(total.IBSCBSTot);
  const gIbs = node(ibscbs?.gIBS);
  const gMono = node(ibscbs?.gMono);
  const m = (v: unknown, f: string) => moneyToBigCentsOpt(v, `total/${f}`);
  return {
    vCBS: m(node(ibscbs?.gCBS)?.vCBS, 'IBSCBSTot/gCBS/vCBS'),
    vIBSUF: m(node(gIbs?.gIBSUF)?.vIBSUF, 'IBSCBSTot/gIBS/gIBSUF/vIBSUF'),
    vIBSMun: m(node(gIbs?.gIBSMun)?.vIBSMun, 'IBSCBSTot/gIBS/gIBSMun/vIBSMun'),
    vIS: m(node(total.ISTot)?.vIS, 'ISTot/vIS'),
    vIBSMono: m(gMono?.vIBSMono, 'IBSCBSTot/gMono/vIBSMono'),
    vCBSMono: m(gMono?.vCBSMono, 'IBSCBSTot/gMono/vCBSMono'),
    vIBSMonoReten: m(gMono?.vIBSMonoReten, 'IBSCBSTot/gMono/vIBSMonoReten'),
    vCBSMonoReten: m(gMono?.vCBSMonoReten, 'IBSCBSTot/gMono/vCBSMonoReten'),
  };
}

function readTotaisIcmsIpi(icmsTot: Node): DanfeTotaisIcmsIpi {
  const m = (tag: string) => moneyToBigCentsOpt(icmsTot[tag], `ICMSTot/${tag}`);
  return {
    vBC: m('vBC'),
    vICMS: m('vICMS'),
    vBCST: m('vBCST'),
    vST: m('vST'),
    vProd: m('vProd'),
    vFrete: m('vFrete'),
    vSeg: m('vSeg'),
    vDesc: m('vDesc'),
    vIPI: m('vIPI'),
    vOutro: m('vOutro'),
    vNF: m('vNF'),
    vFCP: m('vFCP'),
    vFCPST: m('vFCPST'),
    vICMSUFDest: m('vICMSUFDest'),
    vFCPUFDest: m('vFCPUFDest'),
    qBCMono: opt(icmsTot.qBCMono),
    vICMSMono: m('vICMSMono'),
    qBCMonoReten: opt(icmsTot.qBCMonoReten),
    vICMSMonoReten: m('vICMSMonoReten'),
  };
}

function readTransp(t: Node | null): DanfeTransp | null {
  if (!t) return null;
  const tr = node(t.transporta);
  const veic = node(t.veicTransp);
  return {
    modFrete: reqStr(t.modFrete, 'transp/modFrete'),
    transportadora: tr
      ? { xNome: opt(tr.xNome), cnpjCpf: opt(tr.CNPJ) ?? opt(tr.CPF), ie: opt(tr.IE), xEnder: opt(tr.xEnder), xMun: opt(tr.xMun), uf: opt(tr.UF) }
      : null,
    veiculo: veic
      ? { placa: reqStr(veic.placa, 'transp/veicTransp/placa'), uf: reqStr(veic.UF, 'transp/veicTransp/UF'), rntc: opt(veic.RNTC) }
      : null,
    volumes: asArray(t.vol).map((v) => ({
      qVol: opt(v.qVol),
      esp: opt(v.esp),
      marca: opt(v.marca),
      nVol: opt(v.nVol),
      pesoL: opt(v.pesoL),
      pesoB: opt(v.pesoB),
    })),
  };
}

function readFatura(c: Node | null): DanfeModel['fatura'] {
  if (!c) return null;
  return {
    nFat: opt(node(c.fat)?.nFat),
    dup: asArray(c.dup).map((d) => ({
      nDup: opt(d.nDup),
      dVenc: opt(d.dVenc),
      vDup: moneyToBigCentsOpt(d.vDup, 'cobr/dup/vDup'),
    })),
  };
}

/**
 * Item 5: lê o `nfeProc` autorizado de uma NF-e 55 para o DANFE. Gates (dono, questionário de 26/10: "os mesmos do
 * parseNfe"): assinatura e DOCTYPE (`readNfeTree`), modelo 55 com código `DANFE_MODELO_NAO_SUPORTADO`, chave de acesso
 * (`assertChaveAcesso`) e protocolo com cStat da tabela `NFE_CSTAT_AUTORIZADA` vigente e `chNFe` = chave
 * (`assertProtocoloAutorizado`). `tpAmb=2` é aceito e marca `ambiente: 'homologacao'`.
 */
export function readDanfeModel(xml: string | Buffer, legais: readonly LinhaLegal[]): DanfeModel {
  const tree = readNfeTree(xml);
  const { proc, infNFe, ideNode } = locateInfNFe(tree);
  const nfeNode = node(node(tree.nfeProc)?.NFe) ?? node(tree.NFe);
  const qrCode = opt(node(nfeNode?.infNFeSupl)?.qrCode);

  const mod = reqStr(ideNode.mod, 'ide/mod');
  if (mod !== '55') {
    throw new ValidationError(
      `DANFE só para NF-e modelo 55 (recebido modelo "${mod}").`,
      { mod },
      'DANFE_MODELO_NAO_SUPORTADO',
    );
  }

  const chave = assertChaveAcesso(infNFe);
  const { infProt } = assertProtocoloAutorizado(proc, chave, legais);

  // tpAmb (B24) é 1-1 e só 1 ou 2: ausente ou fora disso não pode virar 'producao' em silêncio — o item 14 imprime
  // "SEM VALOR FISCAL" a partir daqui (`[MOC-DANFE-HOMOLOG]`).
  const tpAmb = reqStr(ideNode.tpAmb, 'ide/tpAmb');
  if (tpAmb !== '1' && tpAmb !== '2') throw new ValidationError(`NF-e inválida: ide/tpAmb "${tpAmb}" fora de 1/2.`);

  const tpNF = reqStr(ideNode.tpNF, 'ide/tpNF');
  if (tpNF !== '0' && tpNF !== '1') throw new ValidationError(`NF-e inválida: ide/tpNF "${tpNF}" fora de 0/1.`);

  const emitNode = node(infNFe.emit) ?? {};
  const crt = reqStr(emitNode.CRT, 'emit/CRT');
  const crtTexto = CRT_DESCRICAO[crt];
  if (!crtTexto) throw new ValidationError(`NF-e inválida: emit/CRT "${crt}" fora do leiaute (1 a 4).`);
  const emitEndereco = readEndereco(emitNode.enderEmit, 'emit/enderEmit');
  if (!emitEndereco) throw new ValidationError('NF-e inválida: grupo <emit/enderEmit> não encontrado.');
  const destNode = node(infNFe.dest);

  const total = node(infNFe.total);
  const icmsTot = node(total?.ICMSTot);
  if (!total || !icmsTot) throw new ValidationError('NF-e inválida: grupo <total/ICMSTot> não encontrado.');

  const dets = asArray(infNFe.det);
  if (dets.length === 0) throw new ValidationError('NF-e inválida: nenhum item (<det>) encontrado.');

  const issqnTot = node(total.ISSQNtot);
  const infAdic = node(infNFe.infAdic);

  return {
    chave,
    ambiente: tpAmb === '2' ? 'homologacao' : 'producao',
    ide: {
      nNF: reqStr(ideNode.nNF, 'ide/nNF'),
      serie: reqStr(ideNode.serie, 'ide/serie'),
      tpNF,
      natOp: reqStr(ideNode.natOp, 'ide/natOp'),
      dhEmi: reqStr(ideNode.dhEmi, 'ide/dhEmi'),
      dhSaiEnt: opt(ideNode.dhSaiEnt),
    },
    protocolo: {
      nProt: reqStr(infProt.nProt, 'protNFe/infProt/nProt'),
      dhRecbto: reqStr(infProt.dhRecbto, 'protNFe/infProt/dhRecbto'),
    },
    emit: {
      xNome: reqStr(emitNode.xNome, 'emit/xNome'),
      endereco: emitEndereco,
      cnpjCpf: opt(emitNode.CNPJ) ?? reqStr(emitNode.CPF, 'emit/CNPJ|CPF'),
      ie: opt(emitNode.IE),
      iest: opt(emitNode.IEST),
      crt,
      crtDescricao: `${crt} - ${crtTexto}`,
      tipoRegimeApuracaoIbsCbs: null,
    },
    dest: {
      xNome: opt(destNode?.xNome),
      endereco: readEndereco(destNode?.enderDest, 'dest/enderDest'),
      cnpjCpf: opt(destNode?.CNPJ) ?? opt(destNode?.CPF),
      ie: opt(destNode?.IE),
    },
    fatura: readFatura(node(infNFe.cobr)),
    totaisIcmsIpi: readTotaisIcmsIpi(icmsTot),
    totaisIbsCbsIs: readTotaisIbsCbsIs(total),
    issqn: issqnTot
      ? {
          im: opt(emitNode.IM),
          vServ: moneyToBigCentsOpt(issqnTot.vServ, 'ISSQNtot/vServ'),
          vBC: moneyToBigCentsOpt(issqnTot.vBC, 'ISSQNtot/vBC'),
          vISS: moneyToBigCentsOpt(issqnTot.vISS, 'ISSQNtot/vISS'),
        }
      : null,
    transp: readTransp(node(infNFe.transp)),
    itens: dets.map(readItem),
    infAdFisco: opt(infAdic?.infAdFisco),
    infCpl: opt(infAdic?.infCpl),
    avisos: qrCode ? ['QRCODE_NAO_RENDERIZADO'] : [],
  };
}
