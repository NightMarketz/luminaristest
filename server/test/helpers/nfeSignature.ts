/**
 * SIG-NFE (F-SIG-4 b): assina XML de NF-e com uma chave de TESTE, para que todo teste passe pelo caminho de
 * verificação real (`verifyNfeSignature`) — produção não tem bypass. Sem cadeia ICP-Brasil (F-SIG-3 b), o
 * verificador só confere integridade + CNPJ-raiz + validade contra `dhEmi`, então um certificado autoassinado
 * com o CNPJ do emitente no OtherName 2.16.76.1.3.3 passa. É EXATAMENTE o limite declarado do F-SIG-3 (b).
 *
 * Parâmetros = MOC 7.0 §4.2.4 (`docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md`):
 * c14n 2001, rsa-sha1, sha1, Transforms [enveloped, c14n], Reference URI = '#' + infNFe/@Id.
 *
 * Re-assinar as fixtures (`src/lib/__tests__/fixtures/nfe/*.xml`) depois de editar uma delas:
 *   cd server && npx ts-node --transpile-only test/helpers/nfeSignature.ts src/lib/__tests__/fixtures/nfe/<arquivo>.xml
 */
import { generateKeyPairSync, createPublicKey, sign, type KeyObject } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { SignedXml } from 'xml-crypto';

export const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
export const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
export const RSA_SHA1 = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
export const SHA1 = 'http://www.w3.org/2000/09/xmldsig#sha1';

// ── DER mínimo (só o que um certificado X.509 v3 de teste precisa) ────────────────────────────────
function tlv(tag: number, body: Buffer): Buffer {
  const n = body.length;
  const len = n < 0x80 ? Buffer.from([n]) : n < 0x100 ? Buffer.from([0x81, n]) : Buffer.from([0x82, n >> 8, n & 0xff]);
  return Buffer.concat([Buffer.from([tag]), len, body]);
}
const seq = (...parts: Buffer[]) => tlv(0x30, Buffer.concat(parts));
function oid(dotted: string): Buffer {
  const [a, b, ...rest] = dotted.split('.').map(Number);
  const bytes = [40 * a + b];
  for (const v of rest) {
    const chunk = [v & 0x7f];
    for (let x = v >> 7; x > 0; x >>= 7) chunk.unshift((x & 0x7f) | 0x80);
    bytes.push(...chunk);
  }
  return tlv(0x06, Buffer.from(bytes));
}
/** 'AAAA-MM-DD' → UTCTime (< 2050) ou GeneralizedTime, meia-noite UTC. */
function time(date: string): Buffer {
  const [y, m, d] = date.split('-');
  return Number(y) < 2050 ? tlv(0x17, Buffer.from(`${y.slice(2)}${m}${d}000000Z`)) : tlv(0x18, Buffer.from(`${y}${m}${d}000000Z`));
}
const cnName = (cn: string) => seq(tlv(0x31, seq(oid('2.5.4.3'), tlv(0x0c, Buffer.from(cn, 'utf8')))));
const SHA256_RSA = seq(oid('1.2.840.113549.1.1.11'), Buffer.from([0x05, 0x00]));

/** Tag ASN.1 do valor do OtherName. DOC-ICP-04 7.1.2.2 a): só OCTET/PRINTABLE; 'utf8' existe para o teste negativo. */
export type OtherNameEncoding = 'octet' | 'printable' | 'utf8';
const ENCODING_TAG: Record<OtherNameEncoding, number> = { octet: 0x04, printable: 0x13, utf8: 0x0c };

export interface TestCertOptions {
  cnpj?: string; // OtherName 2.16.76.1.3.3 (e-CNPJ); ausente = certificado sem CNPJ
  cpf?: string; // OtherName 2.16.76.1.3.1 (e-CPF): nascimento 01011980 + CPF + NIS/RG zerados
  responsavelCpf?: string; // OtherName 2.16.76.1.3.4 do e-CNPJ: CPF do RESPONSÁVEL, não do titular
  notBefore?: string; // AAAA-MM-DD
  notAfter?: string;
  encoding?: OtherNameEncoding;
}

let sharedKey: KeyObject | null = null;
/** Uma chave RSA 2048 por processo — gerar por teste custaria ~100 ms cada. */
function testKey(): KeyObject {
  if (!sharedKey) sharedKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  return sharedKey;
}

export function makeTestCert(opts: TestCertOptions = {}, key: KeyObject = testKey()): string {
  const { cnpj, cpf, responsavelCpf, notBefore = '2020-01-01', notAfter = '2049-12-31', encoding = 'octet' } = opts;
  const spki = createPublicKey(key).export({ type: 'spki', format: 'der' });
  const otherName = (dotted: string, value: string) =>
    tlv(0xa0, Buffer.concat([oid(dotted), tlv(0xa0, tlv(ENCODING_TAG[encoding], Buffer.from(value, 'ascii')))]));
  const pessoa = (c: string) => `01011980${c}${'0'.repeat(11 + 15)}`; // DOC-ICP-04: nascimento + CPF + NIS + RG
  const names: Buffer[] = [];
  if (cnpj) names.push(otherName('2.16.76.1.3.3', cnpj));
  if (cpf) names.push(otherName('2.16.76.1.3.1', pessoa(cpf)));
  if (responsavelCpf) names.push(otherName('2.16.76.1.3.4', pessoa(responsavelCpf)));
  const extensions = names.length ? [seq(oid('2.5.29.17'), tlv(0x04, seq(...names)))] : [];
  const tbs = seq(
    tlv(0xa0, tlv(0x02, Buffer.from([0x02]))), // v3
    tlv(0x02, Buffer.from([0x01, ...Array.from({ length: 7 }, (_, i) => i + 1)])),
    SHA256_RSA,
    cnName('AC TESTE LUMINARIS — NAO E ICP-BRASIL'),
    seq(time(notBefore), time(notAfter)),
    cnName(`TESTE LUMINARIS:${cnpj ?? cpf ?? 'SEM-TITULAR'}`),
    spki,
    ...(extensions.length ? [tlv(0xa3, seq(...extensions))] : []),
  );
  const signature = sign('sha256', tbs, key);
  const der = seq(tbs, SHA256_RSA, tlv(0x03, Buffer.concat([Buffer.from([0x00]), signature])));
  return `-----BEGIN CERTIFICATE-----\n${der.toString('base64').replace(/.{64}/g, '$&\n')}\n-----END CERTIFICATE-----\n`;
}

const INF_NFE = "//*[local-name(.)='infNFe']";
const EXISTING_SIGNATURE = /(<\/infNFe>)\s*<Signature xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#">[\s\S]*?<\/Signature>/;

export interface SignNfeOptions extends TestCertOptions {
  /** Certificado PEM pronto (sobrepõe cnpj/notBefore/notAfter/encoding). */
  certPem?: string;
  key?: KeyObject;
}

/**
 * Assina (ou re-assina) a NF-e: remove a `<Signature>` que estiver logo após `</infNFe>` e insere uma nova,
 * enveloped, como irmã de `<infNFe>` [SIG-ENVELOPED]. O titular do certificado é o emitente da própria nota
 * (`emit/CNPJ` → e-CNPJ; `emit/CPF` → e-CPF), salvo `opts.cnpj`/`opts.cpf`.
 */
export function signNfeForTest(xml: string, opts: SignNfeOptions = {}): string {
  const key = opts.key ?? testKey();
  const emitCnpj = /<emit>\s*<CNPJ>([^<]+)<\/CNPJ>/.exec(xml)?.[1];
  const emitCpf = /<emit>\s*<CPF>([^<]+)<\/CPF>/.exec(xml)?.[1];
  const titular = 'cnpj' in opts || 'cpf' in opts ? {} : { cnpj: emitCnpj, cpf: emitCnpj ? undefined : emitCpf };
  const certPem = opts.certPem ?? makeTestCert({ ...titular, ...opts }, key);
  const sig = new SignedXml({
    privateKey: key.export({ type: 'pkcs1', format: 'pem' }),
    publicCert: certPem,
    signatureAlgorithm: RSA_SHA1,
    canonicalizationAlgorithm: C14N,
  });
  sig.addReference({ xpath: INF_NFE, transforms: [ENVELOPED, C14N], digestAlgorithm: SHA1 });
  sig.computeSignature(xml.replace(EXISTING_SIGNATURE, '$1'), { location: { reference: INF_NFE, action: 'after' } });
  return sig.getSignedXml();
}

/** Lê um fixture e o devolve assinado — para os testes que MUTAM o `infNFe` e precisam re-assinar. */
export const readSignedFixture = (path: string, opts?: SignNfeOptions) => signNfeForTest(readFileSync(path, 'utf8'), opts);

// CLI: re-assina os arquivos passados, no lugar.
if (require.main === module) {
  for (const file of process.argv.slice(2)) {
    writeFileSync(file, signNfeForTest(readFileSync(file, 'utf8')));
    console.log(`assinado: ${file}`);
  }
}
