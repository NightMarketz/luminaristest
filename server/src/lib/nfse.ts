import { XMLParser } from 'fast-xml-parser';
import { ValidationError } from './errors';
import { moneyToCents } from './nfe';
import { verifyNfseSignature } from './nfseSignature';
import { isValidDateOnly } from '../features/accounting/models/dates';

/**
 * BE-INCR-DFE-MANUAL (item 2) — leitor PURO da NFS-e AUTORIZADA (padrão nacional v1.01). Sem Prisma, sem tx.
 * Caminhos transcritos do Anexo I + XSD 1.01 em
 * `docs/accounting/fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md` (§1–§3; `[n]` = linha
 * da planilha). A DPS vem EMBUTIDA em `NFSe/infNFSe/DPS` [98] — é ela que a releitura compara com a enviada.
 *
 * Verifica a assinatura ANTES de extrair campos (F-MAN-1 a — mesmo desenho do `parseNfe`/SIG-NFE F-SIG-5 a).
 * Toda falha lança `ValidationError('nfse_…')` → 400/422 pela cadeia existente.
 */

export interface ParsedNfse {
  /** `infNFSe/@Id` sem o literal "NFS" — TSChaveNFSe `[0-9]{50}` (transcrição §2). */
  chaveAcesso: string;
  nNFSe: string; // [8]
  ambGer: '1' | '2'; // [15] 2 = Sefin Nacional
  procEmi: '1' | '2' | '3' | null; // [17] 2 = Web do fisco, 3 = App do fisco
  cStat: '100' | '102' | '103' | '107'; // [18]
  dhProc: string; // [19] TSDateTimeUTC, com fuso
  emitDoc: string; // [22]/[23] CNPJ | CPF do emitente da NFS-e
  tpAmb: '1' | '2'; // [103] infDPS/tpAmb — 1 = produção, 2 = produção restrita
  valores: { baseIssCents?: string; aliqIssBp?: number; vIssCents?: string; vLiqCents: string }; // [41]–[45]
  dps: {
    serie: string; // [106] — faixa E0010
    nDPS: string; // [107]
    dCompet: string; // [108]
    prestCnpj: string; // [118]
    toma: { tipo: 'CPF' | 'CNPJ'; valor: string } | null; // [145]/[146]
    cLocPrestacao: string; // [192]
    cTribNac: string; // [195]
    cNBS?: string; // [198]
    vServCents: string; // [250]
    vDescIncondCents?: string; // [252]
    vDescCondCents?: string; // [253]
    tpRetISSQN: '1' | '2'; // [311]
    pAliqBp?: number; // [312]
    ibsCbs?: { cst: string; cClassTrib: string }; // [406]/[407]
  };
}

// Mesma configuração do `lib/nfe.ts`: tudo string (aritmética de string do dinheiro e reslice de data),
// prefixo de namespace removido (ns http://www.sped.fazenda.gov.br/nfse).
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

type Node = Record<string, unknown>;
const obj = (v: unknown): Node | undefined => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Node) : undefined);
function txt(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  const o = obj(v);
  return o && typeof o['#text'] === 'string' ? (o['#text'] as string).trim() : '';
}
const fail = (motivo: string): never => {
  throw new ValidationError(`nfse_invalida: ${motivo}`);
};
function req(node: Node | undefined, field: string, path: string): string {
  const s = txt(node?.[field]);
  if (!s) fail(`campo obrigatório "${path}/${field}" ausente ou vazio.`);
  return s;
}
const cents = (raw: string, path: string): string => String(moneyToCents(raw, path));
const centsOpt = (node: Node | undefined, field: string, path: string): string | undefined => {
  const s = txt(node?.[field]);
  return s ? cents(s, `${path}/${field}`) : undefined;
};
/** Percentual `1-2V2` → pontos-base pela mesma aritmética de string do dinheiro ("5.00" → 500). */
const bpOpt = (node: Node | undefined, field: string, path: string): number | undefined => {
  const s = txt(node?.[field]);
  return s ? moneyToCents(s, `${path}/${field}`) : undefined;
};

export function parseNfseAutorizada(input: string | Buffer): ParsedNfse {
  const xml = (typeof input === 'string' ? input : input.toString('utf8')).trim();
  if (!xml) fail('documento vazio.');
  // XXE / billion-laughs: mesmo guarda do parseNfe (F0-2 §8.8).
  if (/<!DOCTYPE/i.test(xml)) fail('documento com DTD (<!DOCTYPE>) não é aceito.');

  verifyNfseSignature(xml);

  let root: Node;
  try {
    root = parser.parse(xml) as Node;
  } catch (e) {
    return fail(`XML mal-formado (${(e as Error).message}).`);
  }
  const nfse = obj(root.NFSe);
  if (!nfse) fail('elemento <NFSe> não encontrado.');
  const inf = obj(nfse!.infNFSe);
  if (!inf) fail('grupo <infNFSe> não encontrado.');

  const id = txt(inf!['@_Id']);
  if (!/^NFS\d{50}$/.test(id)) fail(`infNFSe/@Id "${id}" fora do formato NFS + 50 dígitos.`);

  const ambGer = req(inf, 'ambGer', 'infNFSe');
  if (ambGer !== '1' && ambGer !== '2') fail(`infNFSe/ambGer "${ambGer}" inválido.`);
  const procEmiRaw = txt(inf!.procEmi);
  if (procEmiRaw && !['1', '2', '3'].includes(procEmiRaw)) fail(`infNFSe/procEmi "${procEmiRaw}" inválido.`);
  const cStat = req(inf, 'cStat', 'infNFSe');
  if (!['100', '102', '103', '107'].includes(cStat)) fail(`infNFSe/cStat "${cStat}" fora do TStat.`);
  const dhProc = req(inf, 'dhProc', 'infNFSe');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(dhProc)) fail(`infNFSe/dhProc "${dhProc}" sem fuso.`);
  if (!isValidDateOnly(dhProc.slice(0, 10)) || Number.isNaN(Date.parse(dhProc))) fail(`infNFSe/dhProc "${dhProc}" não é data-hora real.`);

  const emit = obj(inf!.emit);
  const emitDoc = txt(emit?.CNPJ) || txt(emit?.CPF);
  if (!emitDoc) fail('infNFSe/emit sem CNPJ/CPF.');

  const val = obj(inf!.valores);
  const vLiq = req(val, 'vLiq', 'infNFSe/valores');

  const dpsInf = obj(obj(inf!.DPS)?.infDPS);
  if (!dpsInf) fail('DPS embutida (infNFSe/DPS/infDPS) não encontrada.');
  const P = 'infNFSe/DPS/infDPS';
  const prest = obj(dpsInf!.prest);
  const toma = obj(dpsInf!.toma);
  const serv = obj(dpsInf!.serv);
  const cServ = obj(serv?.cServ);
  const vals = obj(dpsInf!.valores);
  const desc = obj(vals?.vDescCondIncond);
  const tribMun = obj(obj(vals?.trib)?.tribMun);
  const gIBSCBS = obj(obj(obj(obj(dpsInf!.IBSCBS)?.valores)?.trib)?.gIBSCBS);

  const tomaCnpj = txt(toma?.CNPJ);
  const tomaCpf = txt(toma?.CPF);
  const tpAmb = req(dpsInf, 'tpAmb', P);
  if (tpAmb !== '1' && tpAmb !== '2') fail(`${P}/tpAmb "${tpAmb}" inválido.`);
  const tpRet = req(tribMun, 'tpRetISSQN', `${P}/valores/trib/tribMun`);
  if (tpRet !== '1' && tpRet !== '2') fail(`tpRetISSQN "${tpRet}" inválido.`);

  return {
    chaveAcesso: id.slice(3),
    nNFSe: req(inf, 'nNFSe', 'infNFSe'),
    ambGer: ambGer as '1' | '2',
    procEmi: (procEmiRaw || null) as ParsedNfse['procEmi'],
    cStat: cStat as ParsedNfse['cStat'],
    dhProc,
    emitDoc,
    tpAmb: tpAmb as '1' | '2',
    valores: {
      baseIssCents: centsOpt(val, 'vBC', 'infNFSe/valores'),
      aliqIssBp: bpOpt(val, 'pAliqAplic', 'infNFSe/valores'),
      vIssCents: centsOpt(val, 'vISSQN', 'infNFSe/valores'),
      vLiqCents: cents(vLiq, 'infNFSe/valores/vLiq'),
    },
    dps: {
      serie: req(dpsInf, 'serie', P),
      nDPS: req(dpsInf, 'nDPS', P),
      dCompet: req(dpsInf, 'dCompet', P),
      prestCnpj: req(prest, 'CNPJ', `${P}/prest`),
      toma: tomaCnpj ? { tipo: 'CNPJ', valor: tomaCnpj } : tomaCpf ? { tipo: 'CPF', valor: tomaCpf } : null,
      cLocPrestacao: req(obj(serv?.locPrest), 'cLocPrestacao', `${P}/serv/locPrest`),
      cTribNac: req(cServ, 'cTribNac', `${P}/serv/cServ`),
      ...(txt(cServ?.cNBS) ? { cNBS: txt(cServ?.cNBS) } : {}),
      vServCents: cents(req(obj(vals?.vServPrest), 'vServ', `${P}/valores/vServPrest`), `${P}/valores/vServPrest/vServ`),
      vDescIncondCents: centsOpt(desc, 'vDescIncond', `${P}/valores/vDescCondIncond`),
      vDescCondCents: centsOpt(desc, 'vDescCond', `${P}/valores/vDescCondIncond`),
      tpRetISSQN: tpRet as '1' | '2',
      pAliqBp: bpOpt(tribMun, 'pAliq', `${P}/valores/trib/tribMun`),
      ...(gIBSCBS ? { ibsCbs: { cst: txt(gIBSCBS.CST), cClassTrib: txt(gIBSCBS.cClassTrib) } } : {}),
    },
  };
}
