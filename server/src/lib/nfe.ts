import { XMLParser } from 'fast-xml-parser';
import { ValidationError } from './errors';

/**
 * Pure NF-e 4.00 (modelo 55) parser for the fiscal-ingestion increment (BE-INCR-NFE / F0-2).
 * Mirrors `lib/cnab.ts` and `lib/ofx.ts`: a PURE normalizer with NO Prisma import, NO
 * `runTransaction`, NO ledger business rule. It extracts and normalizes the tags the import
 * services consume (`ide`, `emit/dest`, `det/prod`, `total/ICMSTot`, `protNFe/infProt`) into a
 * `ParsedNfe`; all valuation (cost D3, rateio) lives in `NfeImportService` (A2), never here.
 *
 * Money & dates follow the same class-lessons the extract parsers pin:
 *   - `13v2` money -> integer cents by STRING arithmetic (split on '.', normalize to 2 places,
 *     CONCATENATE). NEVER `Number(x) * 100` — float drift (ACC-014/T4). `qCom`/`vUnCom` have
 *     VARIABLE decimals (0-4 / 0-10) and are preserved as raw strings, never truncated to 2.
 *   - `dhEmi`/`dhRecbto` -> `slice(0,10)` (YYYY-MM-DD) by LITERAL reslice. NEVER `new Date(...)`
 *     (the UTC-shift class bug — a `-03:00` offset would roll the day back).
 *
 * Hard gates (F0-2 §8, ADR D5): accepts ONLY `cStat ∈ {100,150}`; absence of `protNFe`,
 * `mod !== '55'`, or `tpAmb === '2'` (homologação, unless the explicit test flag is set) → reject
 * loud. The access key (`infNFe/@Id`.slice(3)) is validated for `NFe` prefix, length 47, and
 * equality with `protNFe/infProt/chNFe`. A document carrying `<!DOCTYPE` is rejected before parse
 * (XXE / billion-laughs) and no external-entity processing is enabled.
 */

// ---------------------------------------------------------------------------------------------
// Return shape (F0-2 §10). `*Cents` are integer cents; qCom/vUnComStr stay raw strings.
// ---------------------------------------------------------------------------------------------

export interface NfeIde {
  numero: string; // nNF (B08)
  serie: string; // serie (B07)
  dhEmiDate: string; // dhEmi (B09) -> YYYY-MM-DD (reslice)
  tpNF: string; // tpNF (B11) 0=entrada / 1=saída — informativo, NÃO roteia (F0-2 §2)
  natOp: string; // natOp (B04)
  mod: string; // mod (B06) — sempre 55 (gate)
}

export interface NfeParty {
  cnpj?: string;
  cpf?: string;
  nome?: string;
  ie?: string;
}

export interface NfeItem {
  nItem: number; // det/@nItem (H02)
  cProd: string; // prod/cProd (I02)
  cEAN: string; // prod/cEAN (I03) — pode vir vazio ("SEM GTIN")
  xProd: string; // prod/xProd (I04)
  ncm: string; // prod/NCM (I05)
  cfop: string; // prod/CFOP (I08)
  uCom: string; // prod/uCom (I09)
  qCom: string; // prod/qCom (I10) — decimais variáveis, string crua
  vUnComStr: string; // prod/vUnCom (I10a) — decimais variáveis, string crua
  vProdCents: number; // prod/vProd (I11) — peso do rateio
  vDescCents: number; // prod/vDesc (I17) — 0 se ausente
  indTot: string; // prod/indTot (I17b) — '0' não compõe total / '1' compõe
}

export interface NfeTotais {
  vProdCents: number; // W07
  vDescCents: number; // W10
  vFreteCents: number; // W08
  vSegCents: number; // W09
  vOutroCents: number; // W17
  vIPICents: number; // W12
  vSTCents: number; // W06 (Σ vICMSST)
  vICMSCents: number; // W04 (ICMS próprio — NÃO subtrai no custo D3, risco ALTO nomeado)
  vNFCents: number; // W16 (tie-out)
}

export interface NfeProtocolo {
  cStat: string; // infProt/cStat (gate D5)
  chNFe: string; // infProt/chNFe (confere com a chave do §1)
  nProt: string; // infProt/nProt
  dhRecbtoDate: string; // infProt/dhRecbto -> YYYY-MM-DD (reslice)
}

export interface ParsedNfe {
  chaveAcesso: string; // infNFe/@Id.slice(3) (44 díg.) — externalRef HUMANO (T7), nunca sourceId
  ide: NfeIde;
  emit: NfeParty;
  dest: NfeParty;
  itens: NfeItem[];
  totais: NfeTotais;
  protocolo: NfeProtocolo;
}

export interface ParseNfeOptions {
  /** Aceita `tpAmb === '2'` (homologação). SOMENTE para fixtures/teste — jamais em runtime real. */
  allowHomologacao?: boolean;
}

const AUTHORIZED_CSTAT = new Set(['100', '150']); // MOC §4.4.1 — só autorizadas (D5)

// fast-xml-parser: mantém tudo string (parseTagValue:false) p/ preservar a aritmética de string do
// dinheiro e o reslice literal da data; ignora prefixos de namespace e força `det` a ser sempre array
// (quirk: 1 <det> vira objeto, N vira array — F0-2 §8.9).
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => name === 'det',
});

/** Texto de um nó como string trimada; objeto/ausência -> ''. */
function str(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // nó com atributos: fast-xml-parser guarda o texto em '#text'
  if (typeof v === 'object' && '#text' in (v as Record<string, unknown>)) {
    return str((v as Record<string, unknown>)['#text']);
  }
  return '';
}

/** Campo obrigatório: retorna a string trimada não-vazia ou rejeita loud. */
function reqStr(v: unknown, field: string): string {
  const s = str(v);
  if (!s) throw new ValidationError(`NF-e inválida: campo obrigatório "${field}" ausente ou vazio.`);
  return s;
}

/**
 * `13v2` monetário -> centavos Int por ARITMÉTICA DE STRING (split em '.', normaliza a 2 casas,
 * concatena). NUNCA `Number(x) * 100`. Rejeita loud se houver 3ª casa significativa (13v2 tem
 * exatamente 2 decimais). Campo ausente/opcional é tratado por `moneyToCentsOpt`.
 */
function moneyToCents(raw: string, field: string): number {
  const s = raw.trim();
  const m = /^(\d+)(?:\.(\d+))?$/.exec(s); // valor de NF-e é não-negativo
  if (!m) throw new ValidationError(`NF-e inválida: valor monetário "${raw}" em "${field}" mal-formado.`);
  const intPart = m[1];
  let frac = m[2] ?? '';
  if (frac.length > 2) {
    if (/[^0]/.test(frac.slice(2))) {
      throw new ValidationError(
        `NF-e inválida: valor "${raw}" em "${field}" tem mais de 2 casas decimais (esperado 13v2).`,
      );
    }
    frac = frac.slice(0, 2);
  }
  frac = frac.padEnd(2, '0');
  // Concatenação string int+frac = representação em centavos; Number só materializa o inteiro exato.
  return Number(intPart + frac);
}

/** Campo `13v2` opcional (0-1): ausente -> 0 centavos. */
function moneyToCentsOpt(v: unknown, field: string): number {
  const s = str(v);
  if (!s) return 0;
  return moneyToCents(s, field);
}

/** Data-hora UTC (`AAAA-MM-DDThh:mm:ssTZD`) -> YYYY-MM-DD por reslice literal. Nunca `new Date()`. */
function dateOnly(raw: string, field: string): string {
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) {
    throw new ValidationError(`NF-e inválida: data "${raw}" em "${field}" não é AAAA-MM-DD...`);
  }
  return s.slice(0, 10);
}

/** Emitente/destinatário: CNPJ xor CPF, nome, IE. */
function readParty(node: unknown): NfeParty {
  const o = (node ?? {}) as Record<string, unknown>;
  const party: NfeParty = {};
  const cnpj = str(o.CNPJ);
  const cpf = str(o.CPF);
  const nome = str(o.xNome);
  const ie = str(o.IE);
  if (cnpj) party.cnpj = cnpj;
  if (cpf) party.cpf = cpf;
  if (nome) party.nome = nome;
  if (ie) party.ie = ie;
  return party;
}

function readItem(det: Record<string, unknown>): NfeItem {
  const prod = (det.prod ?? {}) as Record<string, unknown>;
  const nItemRaw = str(det['@_nItem']);
  const nItem = Number(nItemRaw);
  if (!nItemRaw || !Number.isInteger(nItem) || nItem < 1) {
    throw new ValidationError(`NF-e inválida: det/@nItem "${nItemRaw}" inválido.`);
  }
  return {
    nItem,
    cProd: reqStr(prod.cProd, 'det/prod/cProd'),
    cEAN: str(prod.cEAN),
    xProd: reqStr(prod.xProd, 'det/prod/xProd'),
    ncm: str(prod.NCM),
    cfop: str(prod.CFOP),
    uCom: str(prod.uCom),
    qCom: reqStr(prod.qCom, 'det/prod/qCom'),
    vUnComStr: reqStr(prod.vUnCom, 'det/prod/vUnCom'),
    vProdCents: moneyToCents(reqStr(prod.vProd, 'det/prod/vProd'), 'det/prod/vProd'),
    vDescCents: moneyToCentsOpt(prod.vDesc, 'det/prod/vDesc'),
    indTot: str(prod.indTot),
  };
}

function readTotais(icmsTot: Record<string, unknown>): NfeTotais {
  return {
    vProdCents: moneyToCentsOpt(icmsTot.vProd, 'ICMSTot/vProd'),
    vDescCents: moneyToCentsOpt(icmsTot.vDesc, 'ICMSTot/vDesc'),
    vFreteCents: moneyToCentsOpt(icmsTot.vFrete, 'ICMSTot/vFrete'),
    vSegCents: moneyToCentsOpt(icmsTot.vSeg, 'ICMSTot/vSeg'),
    vOutroCents: moneyToCentsOpt(icmsTot.vOutro, 'ICMSTot/vOutro'),
    vIPICents: moneyToCentsOpt(icmsTot.vIPI, 'ICMSTot/vIPI'),
    vSTCents: moneyToCentsOpt(icmsTot.vST, 'ICMSTot/vST'),
    vICMSCents: moneyToCentsOpt(icmsTot.vICMS, 'ICMSTot/vICMS'),
    vNFCents: moneyToCents(reqStr(icmsTot.vNF, 'ICMSTot/vNF'), 'ICMSTot/vNF'),
  };
}

/**
 * Parse a NF-e 4.00 (modelo 55) XML into a normalized `ParsedNfe`. PURE — no Prisma, no tx, no
 * ledger rule. Rejects loud (`ValidationError`) on any structural or gate failure (D5/mod/tpAmb/
 * chave/DOCTYPE). Accepts root `nfeProc` (nota processada) OR a bare `NFe` (which, lacking a
 * `protNFe`, is rejected as "sem autorização").
 */
export function parseNfe(input: string | Buffer, options: ParseNfeOptions = {}): ParsedNfe {
  const xml = (typeof input === 'string' ? input : input.toString('utf8')).trim();

  // XXE / billion-laughs (F0-2 §8.8): rejeita DTD antes de qualquer parse. Nenhuma entidade externa.
  if (/<!DOCTYPE/i.test(xml)) {
    throw new ValidationError('NF-e inválida: documento com DTD (<!DOCTYPE>) não é aceito.');
  }
  if (!xml) throw new ValidationError('NF-e inválida: documento vazio.');

  let root: Record<string, unknown>;
  try {
    root = parser.parse(xml) as Record<string, unknown>;
  } catch (e) {
    throw new ValidationError(`NF-e inválida: XML mal-formado (${(e as Error).message}).`);
  }

  // Raiz: nfeProc (com protocolo) OU NFe avulsa (sem protocolo -> rejeitada no gate D5).
  const proc = root.nfeProc as Record<string, unknown> | undefined;
  const nfe = (proc?.NFe ?? root.NFe) as Record<string, unknown> | undefined;
  if (!nfe) throw new ValidationError('NF-e inválida: elemento <NFe> não encontrado.');

  const infNFe = nfe.infNFe as Record<string, unknown> | undefined;
  if (!infNFe) throw new ValidationError('NF-e inválida: elemento <infNFe> não encontrado.');

  const ideNode = infNFe.ide as Record<string, unknown> | undefined;
  if (!ideNode) throw new ValidationError('NF-e inválida: grupo <ide> não encontrado.');

  const mod = reqStr(ideNode.mod, 'ide/mod');
  if (mod !== '55') {
    throw new ValidationError(`NF-e modelo "${mod}" não é suportada — apenas modelo 55 (NF-e).`);
  }

  const tpAmb = str(ideNode.tpAmb);
  if (tpAmb === '2' && !options.allowHomologacao) {
    throw new ValidationError('NF-e de homologação (tpAmb=2) rejeitada — não vira passivo real.');
  }

  // Chave de acesso (§1): @Id = 'NFe' + 44 díg.
  const idAttr = reqStr(infNFe['@_Id'], 'infNFe/@Id');
  if (!idAttr.startsWith('NFe') || idAttr.length !== 47) {
    throw new ValidationError(`NF-e inválida: @Id "${idAttr}" deve ser 'NFe' + 44 dígitos (47 chars).`);
  }
  const chaveAcesso = idAttr.slice(3);

  // Protocolo + gate D5. Ausência de protNFe = sem autorização -> rejeita.
  const protNFe = proc?.protNFe as Record<string, unknown> | undefined;
  const infProt = protNFe?.infProt as Record<string, unknown> | undefined;
  if (!infProt) {
    throw new ValidationError('NF-e sem protocolo de autorização (protNFe ausente) — rejeitada.');
  }
  const cStat = reqStr(infProt.cStat, 'protNFe/infProt/cStat');
  if (!AUTHORIZED_CSTAT.has(cStat)) {
    throw new ValidationError(
      `NF-e com cStat "${cStat}" não está autorizada (aceita só 100/150) — rejeitada.`,
    );
  }
  const chNFe = reqStr(infProt.chNFe, 'protNFe/infProt/chNFe');
  if (chNFe !== chaveAcesso) {
    throw new ValidationError(
      `NF-e inválida: chave do @Id (${chaveAcesso}) diverge do protNFe/chNFe (${chNFe}).`,
    );
  }

  const totalNode = infNFe.total as Record<string, unknown> | undefined;
  const icmsTot = totalNode?.ICMSTot as Record<string, unknown> | undefined;
  if (!icmsTot) throw new ValidationError('NF-e inválida: grupo <total/ICMSTot> não encontrado.');

  // det é sempre array (isArray). Nota sem item = rejeita.
  const dets = (infNFe.det ?? []) as Record<string, unknown>[];
  if (!Array.isArray(dets) || dets.length === 0) {
    throw new ValidationError('NF-e inválida: nenhum item (<det>) encontrado.');
  }

  return {
    chaveAcesso,
    ide: {
      numero: reqStr(ideNode.nNF, 'ide/nNF'),
      serie: reqStr(ideNode.serie, 'ide/serie'),
      dhEmiDate: dateOnly(reqStr(ideNode.dhEmi, 'ide/dhEmi'), 'ide/dhEmi'),
      tpNF: str(ideNode.tpNF),
      natOp: str(ideNode.natOp),
      mod,
    },
    emit: readParty(infNFe.emit),
    dest: readParty(infNFe.dest),
    itens: dets.map(readItem),
    totais: readTotais(icmsTot),
    protocolo: {
      cStat,
      chNFe,
      nProt: str(infProt.nProt),
      dhRecbtoDate: dateOnly(reqStr(infProt.dhRecbto, 'protNFe/infProt/dhRecbto'), 'protNFe/infProt/dhRecbto'),
    },
  };
}
