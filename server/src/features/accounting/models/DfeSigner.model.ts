/**
 * Assinador local (X10a EMENDA-4, AL-3..AL-5, AL-12, AL-16; ADR-ASSINADOR-LOCAL) — constantes de domínio do pareamento
 * e do dispositivo. O tipo das linhas vem de `generated/prisma`; este arquivo é dono dos códigos de erro, dos eventos de
 * auditoria e de log e dos limiares.
 */

/** AL-3: código de pareamento — 12 caracteres (o FE agrupa de 4 em 4) de alfabeto sem ambíguos (sem 0/O, 1/I/L). */
export const DFE_SIGNER_CODIGO_ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const DFE_SIGNER_CODIGO_TAMANHO = 12;
/** AL-3: TTL do código. */
export const DFE_SIGNER_CODIGO_TTL_MS = 10 * 60 * 1000;
/** AL-3: token de dispositivo = 32 bytes aleatórios em base64url (43 caracteres). */
export const DFE_SIGNER_TOKEN_BYTES = 32;
/** AL-13 / F-FEAS-5 a: sem poll há mais de 90 s ⇒ fora do ar (uma fonte só para o pré-voo e para a tela). */
export const DFE_SIGNER_ONLINE_MS = 90_000;
/** AL-22 / F-FEAS-5 a: versão mínima publicada pelo servidor (o 426 do poll é do AL-PR-6). */
export const DFE_SIGNER_VERSAO_MINIMA = '1.0.0';
/** Versão do protocolo servidor ⇄ assinador (contrato §4.2). */
export const DFE_SIGNER_PROTOCOLO = 'v1';

// ── Códigos de erro (AL-3, AL-4, L-AL-2) ────────────────────────────────────────────────────────────
export const DFE_SIGNER_CODIGO_INVALIDO = 'dfe_signer_codigo_invalido';
export const DFE_SIGNER_CNPJ_DIVERGENTE = 'dfe_signer_cnpj_divergente';
export const DFE_SIGNER_CERTIFICADO_VENCIDO = 'dfe_signer_certificado_vencido';
/** DER que o leitor de certificado (`readCertFacts`) não consegue ler. */
export const DFE_SIGNER_CERTIFICADO_INVALIDO = 'dfe_signer_certificado_invalido';
/** L-AL-2: o 2º vínculo exige o MESMO certificado do pareamento do dispositivo. */
export const DFE_SIGNER_CERTIFICADO_DIVERGENTE = 'dfe_signer_certificado_divergente';
/** Ambiente da instância (`DFE_PARTNER_ENV_<KIND>` / `DFE_PARTNER_ENV`) ausente: o pareamento não sabe o `tpAmb`. */
export const DFE_SIGNER_AMBIENTE_NAO_CONFIGURADO = 'dfe_signer_ambiente_nao_configurado';

// ── Auditoria (allowlist em auditCanonical.ts na mesma mudança; AL-16: nunca certificado, subject nem token) ──
export const DFE_SIGNER_PAIRED = 'dfe_signer.paired';
export const DFE_SIGNER_REVOKED = 'dfe_signer.revoked';

/** Motivo da revogação no evento `dfe_signer.revoked`. */
export type DfeSignerRevokeMotivo = 'revogado' | 'substituido';
