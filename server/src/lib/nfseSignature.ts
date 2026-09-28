import { X509Certificate } from 'crypto';
import { DOMParser } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';
import { ValidationError } from './errors';
import { elementChildren, readCertFacts } from './nfeSignature';

/**
 * BE-INCR-DFE-MANUAL (item 4, F-MAN-1 → a) — verificação PURA da assinatura XMLDSig da NFS-e AUTORIZADA.
 * Regras da transcrição §6 (`docs/accounting/fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md`):
 * - E1630 "A assinatura da NFS-e deve ser válida": exatamente 1 `ds:Signature` filha de `<NFSe>` (XSD `TCNFSe`, 1-1),
 *   Reference = `#` + `infNFSe/@Id`, digest e SignatureValue conferidos com o certificado do próprio KeyInfo;
 * - E1634: o certificado tem OtherName de CNPJ (2.16.76.1.3.3) ou CPF (2.16.76.1.3.1);
 * - E1632 (parte "validade do certificado"): `infNFSe/dhProc` dentro da validade.
 *
 * DIFERENTE do SIG-NFE: quem assina a NFS-e gerada pelos emissores públicos nacionais é o sistema gerador (Sefin
 * Nacional), não o prestador — o titular NÃO é amarrado ao emitente (a E1638, "certificado do município", só vale
 * para NFS-e municipal compartilhada). O CNPJ do certificado da Sefin não consta no corpus.
 *
 * Os algoritmos não estão fixados no corpus da NFS-e: aceita os que a assinatura declara, dentro de uma lista segura
 * (a E1630 exige assinatura VÁLIDA, não um algoritmo). LIMITE DECLARADO: cadeia ICP-Brasil e LCR (resto da E1632)
 * = F-SIG-3 (c), nó futuro.
 *
 * `verifyNfseEventoSignature` (GAP-MAP evento, fork do dono 28/09): as MESMAS regras sobre `evento/ds:Signature`
 * (XSD `TCEvento`, 1-1) com Reference = `#` + `infEvento/@Id` e validade no `infEvento/dhProc`. A assinatura do pedido
 * (`pedRegEvento/ds:Signature`, 0-1) não é exigida.
 */

const DSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';
const SIGNATURE_METHODS = new Set([
  'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
  'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
]);
const DIGEST_METHODS = new Set(['http://www.w3.org/2000/09/xmldsig#sha1', 'http://www.w3.org/2001/04/xmlenc#sha256']);
const C14N_METHODS = new Set([
  'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  'http://www.w3.org/2001/10/xml-exc-c14n#',
]);
const TRANSFORMS = new Set([...C14N_METHODS, 'http://www.w3.org/2000/09/xmldsig#enveloped-signature']);
const ID_ATTRS = ['Id', 'ID', 'id'];

export interface NfseSignatureCheck {
  status: 'valid';
  certSubjectCnpj?: string;
  certSubjectCpf?: string;
  certNotBefore: string;
  certNotAfter: string;
}

const fail = (motivo: string): never => {
  throw new ValidationError(`nfse_assinatura_invalida: ${motivo}`);
};
const text = (el: Element | undefined): string => (el?.textContent ?? '').trim();
function onlyChild(node: Element, localName: string, where: string): Element {
  const found = elementChildren(node, localName);
  if (found.length !== 1) fail(`esperado exatamente 1 <${localName}> em <${where}>, encontrado ${found.length}.`);
  return found[0];
}

export function verifyNfseSignature(xml: string): NfseSignatureCheck {
  return verifySignedGroup(xml, 'NFSe', 'infNFSe');
}

export function verifyNfseEventoSignature(xml: string): NfseSignatureCheck {
  return verifySignedGroup(xml, 'evento', 'infEvento');
}

function verifySignedGroup(xml: string, rootName: string, infName: string): NfseSignatureCheck {
  const parseErrors: string[] = [];
  const doc = new DOMParser({
    locator: {},
    errorHandler: { warning: () => undefined, error: (m) => parseErrors.push(m), fatalError: (m) => parseErrors.push(m) },
  }).parseFromString(xml, 'text/xml');
  if (parseErrors.length || !doc?.documentElement) fail(`XML mal-formado (${parseErrors[0] ?? 'sem elemento raiz'}).`);

  const nfse = doc.documentElement;
  if (nfse.localName !== rootName) fail(`elemento raiz <${rootName}> não encontrado.`);
  const infNFSe = onlyChild(nfse, infName, rootName);
  const id = infNFSe.getAttribute('Id') ?? '';
  if (!id) fail(`<${infName}> sem atributo Id.`);

  // @Id único no documento — a Reference só pode resolver para este infNFSe (defesa XSW, mesma do SIG-NFE).
  const seen = new Set<string>();
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    for (const attr of ID_ATTRS) {
      const v = all[i].getAttribute(attr);
      if (!v) continue;
      if (seen.has(v)) fail(`atributo Id "${v}" repetido no documento.`);
      seen.add(v);
    }
  }

  // E1630 / XSD: 1 Signature FILHA DIRETA de <NFSe>. A `DPS/Signature` (0-1) é outra assinatura e não conta aqui.
  const signatures = elementChildren(nfse, 'Signature').filter((s) => s.namespaceURI === DSIG_NS);
  if (signatures.length === 0) fail(`ausente (<Signature> não encontrada em <${rootName}>).`);
  if (signatures.length > 1) fail(`esperada 1 <Signature> em <${rootName}>, encontradas ${signatures.length}.`);
  const signature = signatures[0];

  const signedInfo = onlyChild(signature, 'SignedInfo', 'Signature');
  const c14n = onlyChild(signedInfo, 'CanonicalizationMethod', 'SignedInfo').getAttribute('Algorithm') ?? '';
  if (!C14N_METHODS.has(c14n)) fail(`CanonicalizationMethod fora da lista aceita (${c14n}).`);
  const sigAlg = onlyChild(signedInfo, 'SignatureMethod', 'SignedInfo').getAttribute('Algorithm') ?? '';
  if (!SIGNATURE_METHODS.has(sigAlg)) fail(`SignatureMethod fora da lista aceita (${sigAlg}).`);
  const reference = onlyChild(signedInfo, 'Reference', 'SignedInfo');
  if (reference.getAttribute('URI') !== `#${id}`) {
    fail(`Reference URI "${reference.getAttribute('URI')}" não aponta para o ${infName} lido (#${id}).`);
  }
  const transforms = elementChildren(onlyChild(reference, 'Transforms', 'Reference'), 'Transform').map(
    (t) => t.getAttribute('Algorithm') ?? '',
  );
  if (transforms.length === 0 || transforms.some((a) => !TRANSFORMS.has(a))) {
    fail(`Transforms fora da lista aceita [${transforms.join(', ')}].`);
  }
  const digest = onlyChild(reference, 'DigestMethod', 'Reference').getAttribute('Algorithm') ?? '';
  if (!DIGEST_METHODS.has(digest)) fail(`DigestMethod fora da lista aceita (${digest}).`);

  const x509Data = onlyChild(onlyChild(signature, 'KeyInfo', 'Signature'), 'X509Data', 'KeyInfo');
  const certB64 = text(onlyChild(x509Data, 'X509Certificate', 'X509Data')).replace(/\s+/g, '');
  let cert: X509Certificate;
  try {
    cert = new X509Certificate(Buffer.from(certB64, 'base64'));
  } catch {
    return fail('X509Certificate não é um certificado X.509 válido.');
  }

  const verifier = new SignedXml({ publicCert: cert.toString() });
  let valid = false;
  try {
    verifier.loadSignature(signature as unknown as Node);
    valid = verifier.checkSignature(xml) && verifier.getSignedReferences().length === 1;
  } catch {
    valid = false;
  }
  if (!valid) fail(`não confere com o conteúdo do <${infName}> (digest ou SignatureValue inválido).`);

  const facts = readCertFacts(cert.raw);
  if (!facts.cnpj && !facts.cpf) fail('certificado sem CNPJ/CPF (OtherName 2.16.76.1.3.3 / 2.16.76.1.3.1) — E1634.');
  const dhProc = text(elementChildren(infNFSe, 'dhProc')[0]);
  if (!/^\d{4}-\d{2}-\d{2}/.test(dhProc)) fail(`${infName}/dhProc ausente ou mal-formado para conferir a validade do certificado.`);
  const processamento = dhProc.slice(0, 10);
  if (processamento < facts.notBefore || processamento > facts.notAfter) {
    fail(`certificado fora da validade no processamento (${processamento} ∉ [${facts.notBefore}, ${facts.notAfter}]) — E1632.`);
  }

  return {
    status: 'valid',
    ...(facts.cnpj ? { certSubjectCnpj: facts.cnpj } : {}),
    ...(facts.cpf ? { certSubjectCpf: facts.cpf } : {}),
    certNotBefore: facts.notBefore,
    certNotAfter: facts.notAfter,
  };
}
