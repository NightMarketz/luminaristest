/**
 * secretBox — cifra da credencial do provedor (BE-INCR-PAYMENT-PROVIDER PR-1, P1-1/P1-2/P1-8).
 */
import { randomBytes } from 'node:crypto';
import { AppError } from '@/lib/errors';
import { loadKeyring, open, seal, PAYMENT_CREDENTIAL_KEY_MISSING } from '@/lib/secretBox';

const k1 = randomBytes(32).toString('base64');
const k2 = randomBytes(32).toString('base64');
const env = (keys: string | undefined, active: string | undefined) =>
  ({ PAYMENT_CREDENTIAL_KEYS: keys, PAYMENT_CREDENTIAL_KEY_ACTIVE: active }) as NodeJS.ProcessEnv;

describe('secretBox (P1-1)', () => {
  const ring = loadKeyring(env(`1:${k1}`, '1'));

  it('ida e volta; blob = iv(12) ‖ tag(16) ‖ ct, com a versão ativa', () => {
    const sealed = seal('APP_USR-segredo', 'acc-1', ring);
    expect(sealed.keyVersion).toBe(1);
    expect(sealed.blob.length).toBe(12 + 16 + Buffer.byteLength('APP_USR-segredo'));
    expect(open(sealed.blob, 'acc-1', 1, ring)).toBe('APP_USR-segredo');
  });

  it('AAD diferente ⇒ falha (P1-8: ciphertext de outra conta não decifra)', () => {
    const sealed = seal('x', 'acc-1', ring);
    expect(() => open(sealed.blob, 'acc-2', 1, ring)).toThrow();
  });

  it('byte do ct trocado ⇒ falha', () => {
    const sealed = seal('segredo', 'acc-1', ring);
    const tampered = Buffer.from(sealed.blob);
    tampered[tampered.length - 1] ^= 0x01;
    expect(() => open(tampered, 'acc-1', 1, ring)).toThrow();
  });

  it('versão antiga decifra depois da troca da ativa', () => {
    const old = seal('antigo', 'acc-1', ring);
    const rotated = loadKeyring(env(`1:${k1},2:${k2}`, '2'));
    expect(seal('novo', 'acc-1', rotated).keyVersion).toBe(2);
    expect(open(old.blob, 'acc-1', 1, rotated)).toBe('antigo');
  });

  it('chave com tamanho ≠ 32 bytes ⇒ erro na carga', () => {
    expect(() => loadKeyring(env(`1:${randomBytes(16).toString('base64')}`, '1'))).toThrow(/16 bytes/);
  });

  it('versão ativa fora do keyring, ou versão não inteira ⇒ erro na carga', () => {
    expect(() => loadKeyring(env(`1:${k1}`, '2'))).toThrow(/não está/);
    expect(() => loadKeyring(env(`v1:${k1}`, '1'))).toThrow(/malformado/);
  });
});

describe('falha fechada sem chave (P1-2)', () => {
  it.each([
    [undefined, undefined],
    [`1:${k1}`, undefined],
    [undefined, '1'],
    ['  ', '1'],
  ])('keys=%p active=%p ⇒ 503 payment_credential_key_missing', (keys, active) => {
    let caught: unknown;
    try {
      loadKeyring(env(keys, active));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).statusCode).toBe(503);
    expect((caught as AppError).errorCode).toBe(PAYMENT_CREDENTIAL_KEY_MISSING);
  });
});

describe('keyring parametrizado — certificado fiscal (BE-INCR-DFE-ADN-EMISSOR item 4, F-ADN-3 b)', () => {
  const DFE = { prefix: 'DFE_CERT', missingCode: 'dfe_cert_key_missing', label: 'dos certificados fiscais' };
  const dfeEnv = (keys?: string, active?: string) => ({ DFE_CERT_KEYS: keys, DFE_CERT_KEY_ACTIVE: active }) as NodeJS.ProcessEnv;

  it('sem DFE_CERT_* ⇒ 503 dfe_cert_key_missing, mesmo com o keyring do F5 presente', () => {
    let caught: unknown;
    try {
      loadKeyring({ ...env(`1:${k1}`, '1'), ...dfeEnv() }, DFE);
    } catch (e) {
      caught = e;
    }
    expect((caught as AppError).statusCode).toBe(503);
    expect((caught as AppError).errorCode).toBe('dfe_cert_key_missing');
  });

  it('ida e volta; versão antiga decifra depois da troca da ativa', () => {
    const sealed = seal('chave', 'linha-1', loadKeyring(dfeEnv(`1:${k1}`, '1'), DFE));
    const rotated = loadKeyring(dfeEnv(`1:${k1},2:${k2}`, '2'), DFE);
    expect(open(sealed.blob, 'linha-1', sealed.keyVersion, rotated)).toBe('chave');
  });
});
