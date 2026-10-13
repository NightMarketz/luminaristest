import { generateKeyPairSync } from 'node:crypto';
import forge from 'node-forge';
import { makeTestCert, type TestCertOptions } from './nfeSignature';

/**
 * PFX/P12 de teste para o certificado fiscal (BE-INCR-DFE-ADN-EMISSOR PR-1, item 5): certificado autoassinado com o
 * CNPJ no OtherName 2.16.76.1.3.3 (makeTestCert) empacotado pela node-forge (F-ADN-4 a). `mismatchKey` empacota a
 * chave de OUTRO par, para o caso "chave não corresponde ao certificado". NÃO é ICP-Brasil.
 */
export interface TestPfxOptions extends TestCertOptions {
  password?: string;
  mismatchKey?: boolean;
}

export function makeTestPfx(opts: TestPfxOptions = {}): Buffer {
  const { password = 'senha-teste', mismatchKey = false, ...certOpts } = opts;
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const certPem = makeTestCert(certOpts, pair.privateKey);
  const packedKey = mismatchKey ? generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey : pair.privateKey;
  const keyPem = packedKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const p12 = forge.pkcs12.toPkcs12Asn1(
    forge.pki.privateKeyFromPem(keyPem),
    [forge.pki.certificateFromPem(certPem)],
    password,
    { algorithm: '3des' },
  );
  return Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary');
}
