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

/**
 * X10a EMENDA-4 (AL-8, §4.1): `ASSINADOR_INDISPONIVEL` (assinador local fora do ar, token ausente, PIN cancelado,
 * certificado vencido no caixa) e `CONTEUDO_RECUSADO` (o assinador conferiu o conteúdo e recusou, ou o certificado que
 * assinou não é o do pareamento — L-AL-1).
 */
export type AssinaturaErro =
  | 'CREDENCIAL_EXPIRADA'
  | 'CREDENCIAL_REVOGADA'
  | 'FORA_DO_ESCOPO'
  | 'PSC_INDISPONIVEL'
  | 'COTA_ESGOTADA'
  | 'ASSINADOR_INDISPONIVEL'
  | 'CONTEUDO_RECUSADO';

export type AssinaturaResultado =
  /**
   * `certificadoDerB64` (L-AL-1, D-2026-11-07-X10A-EMENDA-4-LACUNAS): o assinador local devolve a parte pública do
   * certificado que assinou, já conferida contra o pareamento; vai só para o `KeyInfo` da nota, nunca para o banco.
   */
  | { ok: true; signatureValueB64: string; assinadoEm: string; certificadoDerB64?: string }
  | { ok: false; code: AssinaturaErro; message: string };

/**
 * X10a EMENDA-4 AL-10 (F-AL-5 b, §4.1) — o conteúdo que o assinador local reconfere antes de assinar. O PSC ignora.
 * `elementoXml` é o elemento assinado já canonicalizado (o que entra no `DigestValue`); `signedInfoC14nB64` e
 * `baseQrB64` são os bytes cujo sha1 é o `digestB64` do pedido.
 */
export interface ConteudoAssinado {
  alvo: 'infNFe' | 'infEvento' | 'infInut' | 'qrCodeV3Offline';
  elementoXml?: string;
  signedInfoC14nB64?: string;
  baseQrB64?: string;
  /** 44 dígitos; ausente só no `infInut` (L-AL-5, dono 07/11: a inutilização não tem chave). */
  chave?: string;
  /** `tpAmb` do documento (1 produção, 2 homologação); o assinador confere contra o ambiente do pareamento. */
  tpAmb: '1' | '2';
}

/** Algoritmo de hash do pedido (`hash_algorithm`, OID). A NF-e/NFC-e assina com SHA-1 (`[SIG-ALG]`, MOC 7.0 §4.2.3). */
export type AlgoritmoHash = 'sha1' | 'sha256';

export interface AssinadorRemotoPort {
  readonly name: string;
  assinarHash(
    digestB64: string,
    algoritmo: AlgoritmoHash,
    tipo: TipoDfeAssinado,
    cred: CredencialPscResolvida,
    conteudo?: ConteudoAssinado,
  ): Promise<AssinaturaResultado>;
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

/**
 * X10a EMENDA-4 (F-AL-6 a; §4.1 `isSessaoPscVencida(e) || e.code === 'ASSINADOR_INDISPONIVEL'`): a recusa que deixa a nota
 * esperando a assinatura (`PENDING_SIGNATURE`) — a sessão do PSC caiu ou o assinador local está fora. Não liga
 * contingência: não é falha de comunicação com a SEFAZ.
 */
export function isAssinaturaPendente(error: unknown): boolean {
  return isSessaoPscVencida(error) || (error instanceof AssinaturaRemotaError && error.code === 'ASSINADOR_INDISPONIVEL');
}
