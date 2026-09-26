import { X509Certificate } from 'crypto';
import { DOMParser } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';
import { ValidationError } from './errors';

/**
 * SIG-NFE (BE-INCR-NFE-SIGNATURE, B2/B3/B5/B6) — verificação PURA da assinatura XMLDSig da NF-e 4.00. Sem Prisma,
 * sem tx; chamada por `parseNfe` antes de extrair qualquer campo (B4), então import, venda e preview verificam
 * (F-SIG-5 a). Toda falha lança `ValidationError` → 400 pela cadeia existente. Nenhum modo desliga a
 * verificação (F-SIG-4 b): os testes assinam as fixtures com chave de teste (`test/helpers/nfeSignature.ts`).
 *
 * Parâmetros transcritos do MOC 7.0 §4.2.3–4.2.5 em
 * `docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md` — chaves `[SIG-…]`.
 *
 * LIMITE DECLARADO (F-SIG-3 b + emenda do dono 26/09): confere integridade + titular do certificado × emitente
 * (CNPJ-raiz, rejeição 213; CPF do e-CPF, rejeição 227) + `dhEmi` dentro da validade. NF-e avulsa assinada pela
 * SEFAZ (`procEmi=1`) só exige certificado com CNPJ/CPF (292) — o emissor fica para a cadeia. NÃO monta a cadeia
 * ICP-Brasil nem consulta LCR (F-SIG-3 c, nó seguinte): quem re-assina o XML adulterado com certificado próprio que
 * carregue o CNPJ do emitente PASSA.
 */

const DSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';
const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'; // [SIG-C14N]
const RSA_SHA1 = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'; // [SIG-ALG]
const SHA1 = 'http://www.w3.org/2000/09/xmldsig#sha1'; // [SIG-DIGEST]
const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
const TRANSFORMS = [ENVELOPED, C14N]; // [SIG-TRANSFORMS] — 2-2, nesta ordem
const ID_ATTRS = ['Id', 'ID', 'id']; // os mesmos que o xml-crypto usa para resolver a Reference

export interface SignatureCheck {
  status: 'valid'; // F-SIG-1 (a): ausente/inválida lança; não existe 'absent'
  certSubjectCnpj?: string; // OtherName 2.16.76.1.3.3 (e-CNPJ)
  certSubjectCpf?: string; // OtherName 2.16.76.1.3.1, posições 9–19 (e-CPF)
  certNotBefore: string; // AAAA-MM-DD (reslice do DER, nunca new Date)
  certNotAfter: string;
}

const fail = (motivo: string): never => {
  throw new ValidationError(`NF-e inválida: assinatura digital ${motivo}`);
};

const elementChildren = (node: Element, localName?: string): Element[] =>
  Array.from(node.childNodes as unknown as ArrayLike<Node>).filter(
    (n): n is Element => n.nodeType === 1 && (!localName || (n as Element).localName === localName),
  );

/** Filho único por nome local — 0 ou >1 rejeita. */
function onlyChild(node: Element, localName: string, where: string): Element {
  const found = elementChildren(node, localName);
  if (found.length !== 1) fail(`— esperado exatamente 1 <${localName}> em <${where}>, encontrado ${found.length}.`);
  return found[0];
}

const text = (el: Element | undefined): string => (el?.textContent ?? '').trim();

// ── DER mínimo: só validade e SAN/OtherName do certificado ─────────────────────────────────────────
interface Tlv {
  tag: number;
  start: number; // início do conteúdo
  end: number; // fim do conteúdo (exclusivo)
}

function readTlv(buf: Buffer, off: number, limit: number): Tlv {
  if (off + 2 > limit) fail('— certificado mal-formado (DER truncado).');
  const tag = buf[off];
  let len = buf[off + 1];
  let start = off + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n < 1 || n > 3 || start + n > limit) fail('— certificado mal-formado (comprimento DER).');
    len = 0;
    for (let i = 0; i < n; i++) len = (len << 8) | buf[start + i];
    start += n;
  }
  if (start + len > limit) fail('— certificado mal-formado (DER truncado).');
  return { tag, start, end: start + len };
}

function children(buf: Buffer, parent: Tlv): Tlv[] {
  const out: Tlv[] = [];
  for (let off = parent.start; off < parent.end; ) {
    const t = readTlv(buf, off, parent.end);
    out.push(t);
    off = t.end;
  }
  return out;
}

const OID_SAN = '551d11'; // 2.5.29.17
const OID_ICP_CPF = '604c010301'; // 2.16.76.1.3.1 [SIG-CERT-CPF-OID]
const OID_ICP_CNPJ = '604c010303'; // 2.16.76.1.3.3 [SIG-CERT-CNPJ-OID]
// DOC-ICP-04 v8.3 item 7.1.2.2 a) [SIG-OTHERNAME-TIPO]: OCTET STRING ou PRINTABLE STRING — nenhum outro tipo.
const OTHERNAME_TAGS = new Set([0x04, 0x13]);

/** UTCTime 'AAMMDDhhmmssZ' / GeneralizedTime 'AAAAMMDDhhmmssZ' → 'AAAA-MM-DD' por reslice. */
function derDate(buf: Buffer, t: Tlv): string {
  const s = buf.toString('ascii', t.start, t.end);
  let ymd: string;
  if (t.tag === 0x17 && /^\d{12}/.test(s)) ymd = (Number(s.slice(0, 2)) >= 50 ? '19' : '20') + s.slice(0, 6);
  else if (t.tag === 0x18 && /^\d{14}/.test(s)) ymd = s.slice(0, 8);
  else return fail('— validade do certificado mal-formada.');
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

interface CertFacts {
  cnpj: string | null;
  cpf: string | null;
  notBefore: string;
  notAfter: string;
}

/**
 * Número de um OtherName ICP-Brasil, ou null. DOC-ICP-04 7.1.2.2: só A–Z/0–9 (g); número indisponível vem
 * preenchido com "zero" (b) — todo-zero é ausência, não um CNPJ/CPF.
 */
function icpNumber(raw: string, pattern: RegExp): string | null {
  return pattern.test(raw) && !/^0+$/.test(raw) ? raw : null;
}

function readCertFacts(der: Buffer): CertFacts {
  const cert = readTlv(der, 0, der.length);
  const tbs = children(der, cert)[0];
  if (!tbs) return fail('— certificado mal-formado.');
  const fields = children(der, tbs);
  const base = fields[0]?.tag === 0xa0 ? 1 : 0; // [0] version opcional
  const validity = fields[base + 3];
  const [nb, na] = validity ? children(der, validity) : [];
  if (!nb || !na) return fail('— certificado sem validade.');

  let cnpj: string | null = null;
  let cpf: string | null = null;
  const extWrap = fields.find((f) => f.tag === 0xa3);
  for (const ext of extWrap ? children(der, children(der, extWrap)[0]) : []) {
    const parts = children(der, ext);
    if (der.toString('hex', parts[0].start, parts[0].end) !== OID_SAN) continue;
    const octet = parts[parts.length - 1];
    const generalNames = readTlv(der, octet.start, octet.end);
    for (const gn of children(der, generalNames)) {
      if (gn.tag !== 0xa0) continue; // otherName
      const [typeId, wrapped] = children(der, gn);
      if (!typeId || !wrapped) continue;
      const value = children(der, wrapped)[0];
      if (!value || !OTHERNAME_TAGS.has(value.tag)) continue;
      const raw = der.toString('latin1', value.start, value.end);
      const oid = der.toString('hex', typeId.start, typeId.end);
      if (oid === OID_ICP_CNPJ) cnpj = icpNumber(raw, /^[A-Z0-9]{14}$/);
      // 2.16.76.1.3.1 = nascimento (ddmmaaaa, 8) + CPF (11) + NIS + RG… [SIG-CERT-CPF-OID]. O CPF do responsável
      // que o e-CNPJ carrega em 2.16.76.1.3.4 NÃO é lido: não é o titular.
      if (oid === OID_ICP_CPF) cpf = /^[A-Z0-9]+$/.test(raw) ? icpNumber(raw.slice(8, 19), /^\d{11}$/) : null;
    }
  }
  return { cnpj, cpf, notBefore: derDate(der, nb), notAfter: derDate(der, na) };
}

/**
 * Verifica a assinatura enveloped de `<NFe>` (raiz `nfeProc` ou `NFe` avulsa). Lança `ValidationError` em
 * qualquer desvio; devolve os fatos do certificado quando tudo confere.
 */
export function verifyNfeSignature(xml: string): SignatureCheck {
  const parseErrors: string[] = [];
  const doc = new DOMParser({
    locator: {},
    errorHandler: { warning: () => undefined, error: (m) => parseErrors.push(m), fatalError: (m) => parseErrors.push(m) },
  }).parseFromString(xml, 'text/xml');
  if (parseErrors.length || !doc?.documentElement) {
    throw new ValidationError(`NF-e inválida: XML mal-formado (${parseErrors[0] ?? 'sem elemento raiz'}).`);
  }

  // O MESMO <NFe>/<infNFe> que o parseNfe lê: nfeProc > NFe > infNFe, cada um único.
  const root = doc.documentElement;
  let nfe: Element;
  if (root.localName === 'nfeProc') nfe = onlyChild(root, 'NFe', 'nfeProc');
  else if (root.localName === 'NFe') nfe = root;
  else return fail('— elemento <NFe> não encontrado.');
  const infNFe = onlyChild(nfe, 'infNFe', 'NFe');
  const id = infNFe.getAttribute('Id') ?? '';
  if (!id) fail('— <infNFe> sem atributo Id.');

  // B3 — @Id único no documento: a Reference só pode resolver para este infNFe.
  const seen = new Set<string>();
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    for (const attr of ID_ATTRS) {
      const v = all[i].getAttribute(attr);
      if (!v) continue;
      if (seen.has(v)) fail(`— atributo Id "${v}" repetido no documento.`);
      seen.add(v);
    }
  }

  // B3/B6 — exatamente 1 <Signature> xmldsig sob <NFe>, filha direta [SIG-ENVELOPED]. Ausente = rejeita (F-SIG-1 a).
  const signatures = Array.from(nfe.getElementsByTagNameNS(DSIG_NS, 'Signature') as unknown as ArrayLike<Element>);
  if (signatures.length === 0) fail('ausente (<Signature> não encontrada em <NFe>) — nota sem assinatura é rejeitada.');
  if (signatures.length > 1) fail(`— esperada 1 <Signature> em <NFe>, encontradas ${signatures.length}.`);
  const signature = signatures[0];
  if (signature.parentNode !== nfe) fail('— <Signature> deve ser filha direta de <NFe>.');

  // B3 — SignedInfo exatamente no subconjunto do MOC.
  const signedInfo = onlyChild(signature, 'SignedInfo', 'Signature');
  if (onlyChild(signedInfo, 'CanonicalizationMethod', 'SignedInfo').getAttribute('Algorithm') !== C14N) {
    fail(`— CanonicalizationMethod diferente de ${C14N}.`);
  }
  if (onlyChild(signedInfo, 'SignatureMethod', 'SignedInfo').getAttribute('Algorithm') !== RSA_SHA1) {
    fail(`— SignatureMethod diferente de ${RSA_SHA1}.`);
  }
  const reference = onlyChild(signedInfo, 'Reference', 'SignedInfo'); // [SIG-REF-1]
  if (reference.getAttribute('URI') !== `#${id}`) {
    fail(`— Reference URI "${reference.getAttribute('URI')}" não aponta para o infNFe lido (#${id}).`); // [SIG-REF-URI]
  }
  const transforms = elementChildren(onlyChild(reference, 'Transforms', 'Reference'), 'Transform').map((t) =>
    t.getAttribute('Algorithm'),
  );
  if (transforms.length !== TRANSFORMS.length || transforms.some((a, i) => a !== TRANSFORMS[i])) {
    fail(`— Transforms devem ser exatamente [enveloped-signature, c14n]; recebido [${transforms.join(', ')}].`);
  }
  if (onlyChild(reference, 'DigestMethod', 'Reference').getAttribute('Algorithm') !== SHA1) {
    fail(`— DigestMethod diferente de ${SHA1}.`);
  }

  // [SIG-X509] — o certificado vem do próprio KeyInfo (EndCertOnly).
  const x509Data = onlyChild(onlyChild(signature, 'KeyInfo', 'Signature'), 'X509Data', 'KeyInfo');
  const certB64 = text(onlyChild(x509Data, 'X509Certificate', 'X509Data')).replace(/\s+/g, '');
  let cert: X509Certificate;
  try {
    cert = new X509Certificate(Buffer.from(certB64, 'base64'));
  } catch {
    return fail('— X509Certificate não é um certificado X.509 válido.');
  }

  // B2 — digest do infNFe canonicalizado + SignatureValue contra a chave pública do certificado.
  const verifier = new SignedXml({ publicCert: cert.toString() }); // idAttributes padrão = ID_ATTRS
  let valid = false;
  try {
    verifier.loadSignature(signature as unknown as Node);
    valid = verifier.checkSignature(xml) && verifier.getSignedReferences().length === 1;
  } catch {
    valid = false;
  }
  if (!valid) fail('não confere com o conteúdo do <infNFe> (digest ou SignatureValue inválido).');

  // B5 — titular do certificado × emitente (Anexo I, Grupos E/F) e validade [SIG-CERT-VALIDADE].
  const facts = readCertFacts(cert.raw);
  if (!facts.cnpj && !facts.cpf) fail('— certificado sem CNPJ/CPF (OtherName 2.16.76.1.3.3 / 2.16.76.1.3.1).'); // [SIG-REJ-292]
  const ide = elementChildren(infNFe, 'ide')[0];
  const emit = elementChildren(infNFe, 'emit')[0];
  const emitCnpj = text(emit && elementChildren(emit, 'CNPJ')[0]);
  const emitCpf = text(emit && elementChildren(emit, 'CPF')[0]);
  const procEmi = text(ide && elementChildren(ide, 'procEmi')[0]);
  if (procEmi === '1') {
    // NFA-e emitida no site do Fisco: assinada pelo e-CNPJ da SEFAZ, não do emitente [SIG-SERIE-NFAE]. Decisão do
    // dono 26/09 (c): exige só o 292 acima; quem é a SEFAZ só a cadeia ICP (F-SIG-3 c) prova. Sem risco novo: com
    // F-SIG-3 (b) quem re-assina já escolhe o CNPJ do próprio certificado.
  } else if (facts.cnpj) {
    if (!emitCnpj || facts.cnpj.slice(0, 8) !== emitCnpj.slice(0, 8)) {
      fail(`— CNPJ-base do emitente (${emitCnpj || `CPF ${emitCpf}`}) difere do CNPJ-base do certificado (${facts.cnpj}).`); // [SIG-REJ-213]
    }
  } else if (facts.cpf !== emitCpf) {
    fail(`— CPF do emitente (${emitCpf || `CNPJ ${emitCnpj}`}) difere do CPF do certificado (${facts.cpf}).`); // [SIG-REJ-227]
  }
  const dhEmi = text(ide && elementChildren(ide, 'dhEmi')[0]);
  if (!/^\d{4}-\d{2}-\d{2}/.test(dhEmi)) fail('— ide/dhEmi ausente ou mal-formado para conferir a validade do certificado.');
  const emissao = dhEmi.slice(0, 10);
  if (emissao < facts.notBefore || emissao > facts.notAfter) {
    fail(`— certificado fora da validade na emissão (${emissao} ∉ [${facts.notBefore}, ${facts.notAfter}]).`); // [SIG-REJ-291]
  }

  return {
    status: 'valid',
    ...(facts.cnpj ? { certSubjectCnpj: facts.cnpj } : {}),
    ...(facts.cpf ? { certSubjectCpf: facts.cpf } : {}),
    certNotBefore: facts.notBefore,
    certNotAfter: facts.notAfter,
  };
}
