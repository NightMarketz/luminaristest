import { createHash } from 'node:crypto';
import { DOMParser } from '@xmldom/xmldom';
import { C14nCanonicalization, SignedXml, findAncestorNs } from 'xml-crypto';

/**
 * BE-INCR-DFE-ADN-EMENDA-PSC item E-7 (assinatura em duas fases) aplicado à NF-e/NFC-e pelo X10a PR-7 (EMENDA-1 item
 * E-2). O `SignedInfo` é montado e canonicalizado aqui; o hash dele sai pela `assinarHash` injetada (o PSC, pela
 * `AssinadorRemotoPort`) e o `SignatureValue` volta para dentro do XML. A chave privada nunca passa por aqui.
 *
 * Parâmetros = MOC 7.0 §4.2.3–4.2.5 (`TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md`, chaves `[SIG-…]`), numa
 * constante única (mesma decisão do F-ADN-7 c): c14n 2001, rsa-sha1, sha1, Transforms [enveloped, c14n], Reference
 * URI = "#" + Id, `KeyInfo/X509Data/X509Certificate` só com o certificado do usuário final (EndCertOnly). O verificador
 * de ida e volta é o `verifyNfeSignature` existente (`lib/nfeSignature.ts`).
 */

export const NFE_SIG_ALGOS = {
  c14n: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  signature: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
  digest: 'http://www.w3.org/2000/09/xmldsig#sha1',
  enveloped: 'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
  /** Algoritmo do hash do `SignedInfo` enviado ao PSC (`hash_algorithm`). */
  hash: 'sha1',
} as const;

/** O que se assina: o elemento com `Id` (infNFe, infEvento, infInut) e a raiz em que a `<Signature>` entra por último. */
export interface AlvoAssinatura {
  /** Nome local do elemento assinado (`infNFe`, `infEvento`, `infInut`). */
  signedLocalName: 'infNFe' | 'infEvento' | 'infInut';
}

/**
 * X10a EMENDA-4 AL-10 (F-AL-5 b): os dois blocos que o assinador local reconfere — o elemento assinado já canonicalizado
 * (sha1 dele = `DigestValue`) e o `SignedInfo` canonicalizado (sha1 dele = o hash pedido). O PSC não usa.
 */
export interface BlocosAssinados {
  elementoC14n: string;
  signedInfoC14n: string;
}

/** Recebe o hash (base64) do `SignedInfo` canonicalizado e devolve o `SignatureValue` (base64). */
export type AssinarHash = (digestB64: string, blocos: BlocosAssinados) => Promise<string>;

/**
 * L-AL-1 (D-2026-11-07-X10A-EMENDA-4-LACUNAS): o certificado do assinador local chega JUNTO com a assinatura. O `KeyInfo`
 * fica fora do `SignedInfo` (a Reference é só o elemento com Id), então ele entra depois sem invalidar nada.
 */
export type CertificadoTardio = () => string;

const CERT_TARDIO = 'CERTIFICADO-TARDIO-L-AL-1';
const pemBody = (pem: string) => pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');

/** O algoritmo "rsa-sha1" do xml-crypto, trocado por um que delega o hash à `assinarHash` (assíncrono, sem chave). */
function algoritmoRemoto(assinar: AssinarHash, elementoC14n: string) {
  return class AssinaturaRemota {
    getAlgorithmName(): string {
      return NFE_SIG_ALGOS.signature;
    }
    getSignature(signedInfo: string, _privateKey: unknown, callback?: (err: Error | null, sig?: string) => void): string | void {
      if (!callback) throw new Error('dfe_assinatura_remota_sincrona: a assinatura pelo PSC é assíncrona');
      const digestB64 = createHash(NFE_SIG_ALGOS.hash).update(signedInfo, 'utf8').digest('base64');
      assinar(digestB64, { elementoC14n, signedInfoC14n: signedInfo }).then(
        (sig) => callback(null, sig),
        (err: unknown) => callback(err instanceof Error ? err : new Error(String(err))),
      );
    }
    verifySignature(): boolean {
      throw new Error('dfe_assinatura_remota: verificação é do verifyNfeSignature');
    }
  };
}

/**
 * Assina `xml` (sem `<Signature>`) com assinatura enveloped do elemento `alvo`, posta como ÚLTIMO filho da raiz (no
 * `<NFe>`, depois de `infNFe` e do `infNFeSupl` quando houver — ordem do schema). `certPem` é a parte pública do
 * certificado do titular (recuperada do PSC).
 */
export async function assinarEnveloped(xml: string, alvo: AlvoAssinatura, certPem: string | CertificadoTardio, assinar: AssinarHash): Promise<string> {
  const xpath = `//*[local-name(.)='${alvo.signedLocalName}']`;
  const tardio = typeof certPem === 'function';
  const sig = new SignedXml({
    // O xml-crypto exige um valor não nulo; a "chave" nunca é usada — o algoritmo remoto ignora o parâmetro.
    privateKey: 'chave-no-psc',
    ...(tardio
      ? { getKeyInfoContent: ({ prefix }: { prefix?: string | null }) => certTardioKeyInfo(prefix) }
      : { publicCert: certPem }),
    signatureAlgorithm: NFE_SIG_ALGOS.signature,
    canonicalizationAlgorithm: NFE_SIG_ALGOS.c14n,
  });
  (sig.SignatureAlgorithms as Record<string, unknown>)[NFE_SIG_ALGOS.signature] = algoritmoRemoto(assinar, elementoCanonico(xml, xpath));
  sig.addReference({ xpath, transforms: [NFE_SIG_ALGOS.enveloped, NFE_SIG_ALGOS.c14n], digestAlgorithm: NFE_SIG_ALGOS.digest });
  await new Promise<void>((resolve, reject) => {
    sig.computeSignature(xml, { location: { reference: '/*', action: 'append' } }, (err) => (err ? reject(err) : resolve()));
  });
  const assinado = sig.getSignedXml();
  return tardio ? assinado.replace(CERT_TARDIO, pemBody(certPem())) : assinado;
}

/** O mesmo `<X509Data><X509Certificate>` do `getKeyInfoContent` padrão do xml-crypto, com o marcador no lugar do DER. */
function certTardioKeyInfo(prefix?: string | null): string {
  const p = prefix ? `${prefix}:` : '';
  return `<${p}X509Data><${p}X509Certificate>${CERT_TARDIO}</${p}X509Certificate></${p}X509Data>`;
}

/**
 * AL-10 — o elemento assinado como entra no `DigestValue`: c14n 2001 com os namespaces herdados (o `infNFe` herda o
 * `xmlns` do `<NFe>`). Sem `<Signature>` no XML de entrada, o transform enveloped não remove nada.
 */
function elementoCanonico(xml: string, xpath: string): string {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const alvo = doc.getElementsByTagNameNS('*', xpath.match(/'([^']+)'/)![1])[0];
  if (!alvo) throw new Error('dfe_assinatura_sem_alvo');
  type C14nArgs = Parameters<C14nCanonicalization['process']>;
  const ancestorNamespaces = findAncestorNs(doc as unknown as Parameters<typeof findAncestorNs>[0], xpath);
  return new C14nCanonicalization().process(alvo as unknown as C14nArgs[0], { ancestorNamespaces } as C14nArgs[1]);
}

/** `DigestValue` (base64) da `<Signature>` de um XML assinado — o mesmo que a SEFAZ devolve em `protNFe/digVal`. */
export function digestValueDe(signedXml: string): string {
  const m = /<DigestValue>([^<]+)<\/DigestValue>/.exec(signedXml);
  if (!m) throw new Error('dfe_assinatura_sem_digest');
  return m[1].trim();
}
