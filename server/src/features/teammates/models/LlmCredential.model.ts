/**
 * Credencial de provedor de IA do tenant (BE-INCR-TEAMMATES PR-1, item 7; F-TM-6 b: só BYOK). O tipo da linha vem de
 * `generated/prisma`; este arquivo é dono do keyring, dos códigos de erro e do domínio sem a chave.
 */
import type { KeyringSpec } from '../../../lib/secretBox';
import type { LlmProviderId } from '../../../lib/llm/LlmProvider';

/** Item 7: keyring próprio `LLM_CREDENTIAL_KEYS` / `LLM_CREDENTIAL_KEY_ACTIVE`; sem ele ⇒ 503 (falha fechada). */
export const LLM_CREDENTIAL_KEY_MISSING = 'llm_credential_key_missing';
export const LLM_CREDENTIAL_KEYRING: KeyringSpec = {
  prefix: 'LLM_CREDENTIAL',
  missingCode: LLM_CREDENTIAL_KEY_MISSING,
  label: 'das credenciais de IA',
};

/** Item 8: o tenant não tem chave do provedor do teammate — o turno falha sem chamar provedor. */
export const LLM_SEM_CREDENCIAL = 'LLM_SEM_CREDENCIAL';

/** Linha viva sem o segredo — é o que sai do repositório para leitura. */
export interface ILlmCredential {
  id: string;
  userId: string;
  provider: LlmProviderId;
  last4: string;
  monthlyTokenBudget: number | null;
  createdAt: Date;
}

/** Linha com o blob cifrado — só o service a abre, só em memória. */
export interface ILlmCredentialSealed extends ILlmCredential {
  secret: Uint8Array;
  keyVersion: number;
}
