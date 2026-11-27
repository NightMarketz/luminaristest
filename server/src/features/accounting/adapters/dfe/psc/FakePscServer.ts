import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createHash, privateEncrypt, randomBytes, constants, type KeyObject } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { HASH_OID } from './PscAssinador';

/**
 * PSC falso — X10a PR-7 (dono, 29/10/2026: "codar já contra a API padrão do PSC … testando com PSC falso"). Implementa a
 * interface obrigatória da API v0 do DOC-ICP-17.01 v3.0 §6.4.5 (igual para os 8 PSCs credenciados): `GET
 * /oauth/authorize` (aprova na hora e redireciona com `code` + `state`), `POST /oauth/token` (PKCE S256),
 * `POST /oauth/signature` (RAW: PKCS#1 v1.5 sobre o DigestInfo do hash recebido) e `GET /oauth/certificate-discovery`.
 * Só para teste e homologação local: **recusa `NODE_ENV=production`** no construtor (mesma guarda do `NullEmissor`,
 * ADR-DFE §7 item 6). Nada sai da máquina.
 */

/** DigestInfo (RFC 8017 §9.2, nota 1) por algoritmo — o que o PKCS#1 v1.5 assina junto com o hash. */
const DIGEST_INFO: Record<string, Buffer> = {
  [HASH_OID.sha1]: Buffer.from('3021300906052b0e03021a05000414', 'hex'),
  [HASH_OID.sha256]: Buffer.from('3031300d060960864801650304020105000420', 'hex'),
};

export interface FakePscOptions {
  /** Chave privada do titular (gerada no teste). */
  key: KeyObject;
  /** Certificado do titular (PEM) devolvido em `certificate-discovery`. */
  certPem: string;
  clientId?: string;
  clientSecret?: string;
  /** `expires_in` devolvido no token (segundos). */
  expiresIn?: number;
  /** CNPJ do titular (`authorized_identification`). */
  titularCnpj?: string;
}

export interface FakePscControle {
  /** Força a resposta do `/oauth/signature` (401, 403, 429, 500…). */
  statusAssinatura: number | null;
  /** Atraso antes de responder à assinatura (ms) — para o teste de timeout. */
  atrasoAssinaturaMs: number;
  /** Quantas assinaturas o falso fez. */
  assinaturas: number;
  /** Algoritmos (OID) recebidos, na ordem. */
  algoritmosRecebidos: string[];
}

export class FakePscServer {
  private server: Server | null = null;
  private readonly codes = new Map<string, { challenge: string; redirectUri: string }>();
  private readonly tokens = new Set<string>();
  public readonly controle: FakePscControle = { statusAssinatura: null, atrasoAssinaturaMs: 0, assinaturas: 0, algoritmosRecebidos: [] };
  public baseUrl = '';

  constructor(private readonly opts: FakePscOptions) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FakePscServer não pode rodar sob NODE_ENV=production (PSC falso só para teste).');
    }
  }

  async start(): Promise<string> {
    this.server = createServer((req, res) => {
      this.handle(req, res).catch((err: unknown) => this.json(res, 500, { error: 'server_error', error_description: String(err) }));
    });
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', resolve));
    const { port } = this.server.address() as AddressInfo;
    this.baseUrl = `http://127.0.0.1:${port}/v0/`;
    return this.baseUrl;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    this.server = null;
  }

  /** Emite um token direto (atalho de teste, sem o fluxo de autorização). */
  emitirToken(): string {
    const t = randomBytes(20).toString('hex');
    this.tokens.add(t);
    return t;
  }

  revogarTokens(): void {
    this.tokens.clear();
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname.replace(/^\/v0/, '');
    if (req.method === 'GET' && path === '/oauth/authorize') {
      const q = url.searchParams;
      if (q.get('response_type') !== 'code' || q.get('code_challenge_method') !== 'S256' || !q.get('code_challenge')) {
        return this.json(res, 400, { error: 'invalid_request' });
      }
      const code = randomBytes(16).toString('hex');
      const redirectUri = q.get('redirect_uri') ?? '';
      this.codes.set(code, { challenge: q.get('code_challenge')!, redirectUri });
      const back = new URL(redirectUri);
      back.searchParams.set('code', code);
      if (q.get('state')) back.searchParams.set('state', q.get('state')!);
      res.writeHead(302, { Location: back.toString() }).end();
      return;
    }
    if (req.method === 'POST' && path === '/oauth/token') {
      const form = new URLSearchParams(await body(req));
      const entry = this.codes.get(form.get('code') ?? '');
      if (form.get('client_id') !== (this.opts.clientId ?? 'luminaris') || form.get('client_secret') !== (this.opts.clientSecret ?? 'segredo')) {
        return this.json(res, 401, { error: 'invalid_client' });
      }
      const verifier = form.get('code_verifier') ?? '';
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      if (!entry || entry.challenge !== challenge || (form.get('redirect_uri') && form.get('redirect_uri') !== entry.redirectUri)) {
        return this.json(res, 400, { error: 'invalid_grant' });
      }
      this.codes.delete(form.get('code')!);
      const token = this.emitirToken();
      return this.json(res, 200, {
        access_token: token,
        token_type: 'Bearer',
        expires_in: this.opts.expiresIn ?? 43_200,
        authorized_identification_type: 'CNPJ',
        authorized_identification: this.opts.titularCnpj ?? '',
      });
    }
    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
    if (path === '/oauth/certificate-discovery' && req.method === 'GET') {
      if (!bearer || !this.tokens.has(bearer)) return this.json(res, 401, { error: 'invalid_token' });
      return this.json(res, 200, { status: 'S', certificates: [{ alias: 'CERTIFICADO TESTE', certificate: this.opts.certPem }] });
    }
    if (path === '/oauth/signature' && req.method === 'POST') {
      if (this.controle.atrasoAssinaturaMs) await new Promise((r) => setTimeout(r, this.controle.atrasoAssinaturaMs));
      if (this.controle.statusAssinatura) return this.json(res, this.controle.statusAssinatura, { error: 'forced' });
      if (!bearer || !this.tokens.has(bearer)) return this.json(res, 401, { error: 'invalid_token' });
      const pedido = JSON.parse(await body(req)) as { hashes: Array<{ id: string; hash: string; hash_algorithm: string; signature_format: string }> };
      const signatures = pedido.hashes.map((h) => {
        const prefixo = DIGEST_INFO[h.hash_algorithm];
        if (!prefixo || h.signature_format !== 'RAW') throw new Error(`algoritmo/formato não suportado: ${h.hash_algorithm}/${h.signature_format}`);
        this.controle.algoritmosRecebidos.push(h.hash_algorithm);
        this.controle.assinaturas++;
        const sig = privateEncrypt({ key: this.opts.key, padding: constants.RSA_PKCS1_PADDING }, Buffer.concat([prefixo, Buffer.from(h.hash, 'base64')]));
        return { id: h.id, raw_signature: sig.toString('base64') };
      });
      return this.json(res, 200, { certificate_alias: 'CERTIFICADO TESTE', signatures });
    }
    this.json(res, 404, { error: 'not_found' });
  }

  private json(res: ServerResponse, status: number, payload: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json;charset=UTF-8' }).end(JSON.stringify(payload));
  }
}

async function body(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}
