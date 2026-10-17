/**
 * FiscalCertificate — constantes de domínio do certificado do cliente usado pelo emissor `adn`
 * (BE-INCR-DFE-ADN-EMISSOR PR-1, itens 3–6; ADR-INCR-DFE-EMISSAO-PARCEIRO §12; F-ADN-2 a, F-ADN-3 b, F-ADN-4 a,
 * F-ADN-11 a). O tipo da linha vem de `generated/prisma`; este arquivo é dono dos códigos de erro, das chaves de
 * auditoria e do keyring.
 */
import type { KeyringSpec } from '../../../lib/secretBox';

/** Keyring próprio (F-ADN-3 b): `DFE_CERT_KEYS` / `DFE_CERT_KEY_ACTIVE`, pré-condição de deploy do M2. */
export const DFE_CERT_KEY_MISSING = 'dfe_cert_key_missing';
export const DFE_CERT_KEYRING: KeyringSpec = {
  prefix: 'DFE_CERT',
  missingCode: DFE_CERT_KEY_MISSING,
  label: 'dos certificados fiscais',
};

/** Teto do arquivo PFX/P12 aceito no upload (um certificado de usuário final com cadeia cabe com folga). */
export const FISCAL_CERTIFICATE_MAX_BYTES = 64 * 1024;
export const FISCAL_CERTIFICATE_MIME_TYPES = new Set(['application/x-pkcs12', 'application/pkcs12', 'application/octet-stream']);

// ── Códigos de erro (item 5: 422 com o motivo nomeado) ─────────────────────────────────────────────
export const CERTIFICADO_SENHA_INVALIDA = 'certificado_senha_invalida';
export const CERTIFICADO_ILEGIVEL = 'certificado_ilegivel';
export const CERTIFICADO_CHAVE_NAO_CORRESPONDE = 'certificado_chave_nao_corresponde';
export const CERTIFICADO_SEM_CNPJ = 'certificado_sem_cnpj';
export const CERTIFICADO_CNPJ_DIVERGENTE = 'certificado_cnpj_divergente';
export const CERTIFICADO_VENCIDO = 'certificado_vencido';
export const UNIDADE_SEM_CNPJ = 'unidade_sem_cnpj';

// ── Auditoria (item 6; allowlist em auditCanonical.ts na mesma mudança) ─────────────────────────────
export const FISCAL_CERTIFICATE_SET = 'fiscal_certificate.set';
export const FISCAL_CERTIFICATE_REMOVED = 'fiscal_certificate.removed';
