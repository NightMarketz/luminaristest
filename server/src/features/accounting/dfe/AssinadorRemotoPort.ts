/**
 * AssinadorRemotoPort — BE-INCR-DFE-ADN-EMENDA-PSC (§4; F-E8-1R a: certificado em nuvem num PSC para os DF-e), aplicado à
 * NF-e/NFC-e pelo X10a PR-7 (BE-INCR-NFCE-EMENDA-2 §1). A porta assina um HASH (a API v0 do PSC, DOC-ICP-17.01 v3.0
 * §6.4.5.2, só assina hash), nunca o XML: quem monta o `SignedInfo` e o encaixa no documento é `lib/dfeXmlSign.ts`.
 * O Luminaris nunca vê a chave privada do cliente.
 */

export type TipoDfeAssinado = 'NFSE_DPS' | 'NFE' | 'NFCE';

/** Em memória, nunca serializada nem logada. Quem resolve é o serviço pela unidade do documento (BRIEF-ADN item 16). */
export interface CredencialPscResolvida {
  pscProviderId: string;
  /** URI-base do PSC (`…/v0/`), do cadastro `PscProvider` — nunca do request. */
  baseUrl: string;
  accessToken: string;
  titularCnpj: string;
  /** Parte pública, recuperada do PSC (`/oauth/certificate-discovery`). */
  certificadoPem: string;
  escopo: TipoDfeAssinado[];
}

export type AssinaturaErro = 'CREDENCIAL_EXPIRADA' | 'CREDENCIAL_REVOGADA' | 'FORA_DO_ESCOPO' | 'PSC_INDISPONIVEL' | 'COTA_ESGOTADA';

export type AssinaturaResultado =
  | { ok: true; signatureValueB64: string; assinadoEm: string }
  | { ok: false; code: AssinaturaErro; message: string };

/** Algoritmo de hash do pedido (`hash_algorithm`, OID). A NF-e/NFC-e assina com SHA-1 (`[SIG-ALG]`, MOC 7.0 §4.2.3). */
export type AlgoritmoHash = 'sha1' | 'sha256';

export interface AssinadorRemotoPort {
  readonly name: string;
  assinarHash(digestB64: string, algoritmo: AlgoritmoHash, tipo: TipoDfeAssinado, cred: CredencialPscResolvida): Promise<AssinaturaResultado>;
}

/**
 * Recusa do PSC no meio da assinatura (E-8). `CREDENCIAL_EXPIRADA | CREDENCIAL_REVOGADA` = a sessão da unidade caiu: o
 * serviço põe a nota em `PENDING_SIGNATURE` (F-PSC-6 a); os demais códigos são falha do envio.
 */
export class AssinaturaRemotaError extends Error {
  constructor(public readonly code: AssinaturaErro, message: string) {
    super(`dfe_assinatura_${code.toLowerCase()}: ${message}`);
    this.name = 'AssinaturaRemotaError';
  }
}

/** F-PSC-6 a — a recusa que pede reautorização do titular (não é falha de rede nem de cota). */
export function isSessaoPscVencida(error: unknown): boolean {
  return error instanceof AssinaturaRemotaError && (error.code === 'CREDENCIAL_EXPIRADA' || error.code === 'CREDENCIAL_REVOGADA');
}
