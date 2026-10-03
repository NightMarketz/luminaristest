import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppError } from './errors';

/**
 * secretBox — cifra em repouso da credencial do provedor de pagamento (BE-INCR-PAYMENT-PROVIDER,
 * PR-1, itens P1-1/P1-2; ADR-INCR-PAYMENT-PROVIDER-COLLECTION F-PP-3 a). AES-256-GCM em `node:crypto`,
 * sem dependência nova. Blob = `iv(12) ‖ tag(16) ‖ ct`; o AAD amarra o blob à linha dona (o caller
 * passa `PaymentAccount.id`), então ciphertext copiado para outra linha não decifra (invariante 11).
 *
 * Chave-mestra no env, provisionada pelo M2 (BRIEF §4.5/§6.3 — "não invente KMS"):
 *   PAYMENT_CREDENTIAL_KEYS="<versão>:<base64 de 32 bytes>[,…]"   PAYMENT_CREDENTIAL_KEY_ACTIVE=<versão>
 * Sem keyring ⇒ 503 `payment_credential_key_missing` (falha fechada, P1-2): nada de chave padrão,
 * nada de texto puro. O keyring é lido na hora do uso, não no boot — o resto da aplicação sobe.
 * Keyring malformado (versão não inteira, chave ≠ 32 bytes, ativa ausente) ⇒ erro na carga.
 */

export const PAYMENT_CREDENTIAL_KEY_MISSING = 'payment_credential_key_missing';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export interface Keyring {
  activeVersion: number;
  keys: ReadonlyMap<number, Buffer>;
}

export interface SealedSecret {
  blob: Buffer;
  keyVersion: number;
}

/** Lê o keyring do env. Sem as duas variáveis ⇒ 503; presentes mas malformadas ⇒ erro (500). */
export function loadKeyring(env: NodeJS.ProcessEnv = process.env): Keyring {
  const raw = env.PAYMENT_CREDENTIAL_KEYS?.trim();
  const active = env.PAYMENT_CREDENTIAL_KEY_ACTIVE?.trim();
  if (!raw || !active) {
    throw new AppError(
      'Chave de cifra das credenciais de pagamento não provisionada (PAYMENT_CREDENTIAL_KEYS / PAYMENT_CREDENTIAL_KEY_ACTIVE).',
      503,
      PAYMENT_CREDENTIAL_KEY_MISSING,
    );
  }
  const keys = new Map<number, Buffer>();
  for (const entry of raw.split(',')) {
    const sep = entry.indexOf(':');
    const version = Number(entry.slice(0, sep).trim());
    if (sep < 1 || !Number.isInteger(version) || version < 1) {
      throw new Error('PAYMENT_CREDENTIAL_KEYS malformado: cada entrada é "<versão inteira ≥ 1>:<base64>".');
    }
    const key = Buffer.from(entry.slice(sep + 1).trim(), 'base64');
    if (key.length !== KEY_BYTES) {
      throw new Error(`PAYMENT_CREDENTIAL_KEYS: a chave da versão ${version} tem ${key.length} bytes; esperado ${KEY_BYTES}.`);
    }
    if (keys.has(version)) throw new Error(`PAYMENT_CREDENTIAL_KEYS: versão ${version} repetida.`);
    keys.set(version, key);
  }
  const activeVersion = Number(active);
  if (!keys.has(activeVersion)) {
    throw new Error(`PAYMENT_CREDENTIAL_KEY_ACTIVE=${active} não está em PAYMENT_CREDENTIAL_KEYS.`);
  }
  return { activeVersion, keys };
}

export function seal(plain: string, aad: string, keyring: Keyring): SealedSecret {
  const key = keyring.keys.get(keyring.activeVersion)!;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return { blob: Buffer.concat([iv, cipher.getAuthTag(), ct]), keyVersion: keyring.activeVersion };
}

/** Lança se o blob, o AAD ou a versão não batem (GCM autentica os três). */
export function open(blob: Uint8Array, aad: string, keyVersion: number, keyring: Keyring): string {
  const key = keyring.keys.get(keyVersion);
  if (!key) throw new Error(`Versão de chave ${keyVersion} ausente do keyring.`);
  const buf = Buffer.from(blob);
  if (buf.length < IV_BYTES + TAG_BYTES) throw new Error('Ciphertext truncado.');
  const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, IV_BYTES));
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(buf.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8');
}
