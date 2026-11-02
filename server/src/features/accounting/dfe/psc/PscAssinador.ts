import { outboundFetch } from '../../../../lib/outboundHttp';
import type {
  AlgoritmoHash,
  AssinadorRemotoPort,
  AssinaturaResultado,
  CredencialPscResolvida,
  TipoDfeAssinado,
} from '../AssinadorRemotoPort';

/**
 * PscAssinador — BE-INCR-DFE-ADN-EMENDA-PSC item E-8, contra a API v0 obrigatória e igual para todo PSC
 * (DOC-ICP-17.01 v3.0 §6.4.5.2, `pesquisas-legais/fila-2026-10-27-bloco6-terceiros/docs/D03_…txt` l. 927–1006):
 * `POST <URI-base>/oauth/signature`, Bearer do token `signature_session`, um hash em base64 com o OID do algoritmo e
 * `signature_format: "RAW"`; a resposta traz `signatures[].raw_signature` (base64).
 *
 * Erros: a norma não lista códigos da assinatura. O mapeamento segue o E-8 do BRIEF: 401 ⇒ `CREDENCIAL_EXPIRADA`;
 * 429 ⇒ `COTA_ESGOTADA`; timeout, rede e 5xx ⇒ `PSC_INDISPONIVEL`. 403 ⇒ `CREDENCIAL_REVOGADA` é leitura nossa (grau I:
 * o RFC 6750 §3.1 dá 403 a "insufficient_scope"; sem fonte do PSC). Tipo fora do escopo da credencial ⇒
 * `FORA_DO_ESCOPO` local, sem chamada. Nenhum resultado traz o token.
 */

/** OIDs do `hash_algorithm` (o exemplo da norma usa o do SHA-256, 2.16.840.1.101.3.4.2.1). */
export const HASH_OID: Record<AlgoritmoHash, string> = {
  sha1: '1.3.14.3.2.26',
  sha256: '2.16.840.1.101.3.4.2.1',
};

export const PSC_TIMEOUT_MS_PADRAO = 10_000;

/** Junta a URI-base (`…/v0/`, §6.4.2) com o caminho do serviço, sem barra dupla. */
export function pscUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export class PscAssinador implements AssinadorRemotoPort {
  public readonly name = 'psc';

  constructor(private readonly timeoutMs: number = PSC_TIMEOUT_MS_PADRAO) {}

  async assinarHash(digestB64: string, algoritmo: AlgoritmoHash, tipo: TipoDfeAssinado, cred: CredencialPscResolvida): Promise<AssinaturaResultado> {
    if (!cred.escopo.includes(tipo)) {
      return { ok: false, code: 'FORA_DO_ESCOPO', message: `a credencial do PSC não cobre ${tipo}` };
    }
    let res: Response;
    try {
      res = await outboundFetch('psc', pscUrl(cred.baseUrl, 'oauth/signature'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${cred.accessToken}` },
        body: JSON.stringify({
          hashes: [{ id: '1', alias: tipo, hash: digestB64, hash_algorithm: HASH_OID[algoritmo], signature_format: 'RAW' }],
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      return { ok: false, code: 'PSC_INDISPONIVEL', message: error instanceof Error ? error.name : 'falha de rede' };
    }
    if (res.status === 401) return { ok: false, code: 'CREDENCIAL_EXPIRADA', message: 'PSC recusou o token (401)' };
    if (res.status === 403) return { ok: false, code: 'CREDENCIAL_REVOGADA', message: 'PSC recusou o token (403)' };
    if (res.status === 429) return { ok: false, code: 'COTA_ESGOTADA', message: 'PSC recusou por limite (429)' };
    if (!res.ok) return { ok: false, code: 'PSC_INDISPONIVEL', message: `PSC respondeu ${res.status}` };
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return { ok: false, code: 'PSC_INDISPONIVEL', message: 'resposta do PSC ilegível' };
    }
    const raw = (body as { signatures?: Array<{ id?: string; raw_signature?: string }> }).signatures?.find((s) => s.id === '1')?.raw_signature;
    if (!raw || !/^[A-Za-z0-9+/=\s]+$/.test(raw)) {
      return { ok: false, code: 'PSC_INDISPONIVEL', message: 'resposta do PSC sem raw_signature' };
    }
    return { ok: true, signatureValueB64: raw.replace(/\s+/g, ''), assinadoEm: new Date().toISOString() };
  }
}
