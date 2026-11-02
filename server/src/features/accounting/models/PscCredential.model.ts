/**
 * PSC (certificado em nuvem) — constantes de domínio do cadastro `PscProvider` e da credencial `PscCredential` por
 * unidade (X10a PR-7; BRIEF BE-INCR-DFE-ADN-EMENDA-PSC E-2..E-6, E-9; F-PSC-2..5 a). O tipo das linhas vem de
 * `generated/prisma`; este arquivo é dono dos códigos de erro, das chaves de auditoria e do keyring.
 */
import type { KeyringSpec } from '../../../lib/secretBox';

/** F-PSC-3 a: keyring próprio `DFE_PSC_KEYS` / `DFE_PSC_KEY_ACTIVE`, falha fechada. */
export const DFE_PSC_KEY_MISSING = 'dfe_psc_key_missing';
export const DFE_PSC_KEYRING: KeyringSpec = {
  prefix: 'DFE_PSC',
  missingCode: DFE_PSC_KEY_MISSING,
  label: 'das credenciais do PSC',
};

/** URI de retorno registrada no PSC (env); sem ela ⇒ 503. */
export const DFE_PSC_REDIRECT_ENV = 'DFE_PSC_REDIRECT_URI';
export const DFE_PSC_REDIRECT_MISSING = 'dfe_psc_redirect_missing';

/** Validade da autorização pendente (code_verifier PKCE). */
export const PSC_AUTHORIZATION_TTL_MS = 10 * 60 * 1000;
/** Timeout das chamadas ao PSC (/oauth/token, /oauth/certificate-discovery). */
export const PSC_HTTP_TIMEOUT_MS = 15_000;
/** DOC-ICP-17.01 v3.0 §6.4.5.1.1: escopo da sessão de assinatura. */
export const PSC_OAUTH_SCOPE = 'signature_session';

// ── Avisos (F-PSC-5 a, F-PSC-4 a) ─────────────────────────────────────────────────────────────────
export const PSC_AVISO_CERT_DIAS = 30;
export const PSC_AVISO_SESSAO_MS = 60 * 60 * 1000;
export const PSC_AVISO_COTA_FRACAO = 0.8;

// ── Códigos de erro ───────────────────────────────────────────────────────────────────────────────
export const PSC_NAO_HOMOLOGADO = 'psc_nao_homologado';
export const PSC_CERTIFICADO_NAO_E_DA_UNIDADE = 'psc_certificado_nao_e_da_unidade';
export const PSC_STATE_INVALIDO = 'psc_state_invalido';
export const PSC_AUTORIZACAO_NEGADA = 'psc_autorizacao_negada';
export const PSC_AUTORIZACAO_ERRO = 'psc_autorizacao_erro';
export const PSC_INDISPONIVEL = 'psc_indisponivel';
export const PSC_RESPOSTA_INVALIDA = 'psc_resposta_invalida';

// ── Auditoria (allowlist em auditCanonical.ts na mesma mudança) ─────────────────────────────────────
export const PSC_CREDENTIAL_AUTHORIZED = 'psc_credential.authorized';
export const PSC_CREDENTIAL_REMOVED = 'psc_credential.removed';
export const PSC_PROVIDER_SET = 'psc_provider.set';
export const PSC_PROVIDER_REMOVED = 'psc_provider.removed';
