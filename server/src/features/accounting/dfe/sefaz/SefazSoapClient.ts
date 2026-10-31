import { request } from 'node:https';
import { readFileSync } from 'node:fs';
import { AppError } from '../../../../lib/errors';
import { logger } from '../../../../lib/logger';
import { DfeTransporteError } from '../DfeEmissorPort';
import type { SefazServico } from './sefazConfig';

/**
 * Cliente SOAP 1.2 dos webservices NF-e 4.00 — BE-INCR-NFCE-EMENDA-1 item E-4, sobre mTLS com o certificado do
 * TRANSMISSOR (o e-CNPJ do Luminaris), não o do emitente: "não necessariamente o CNPJ/CPF da empresa emissora" (MOC 7.0
 * Visão Geral; `pesquisas-legais/dfe-mtls-psc/relatorio.md`, EMENDA-2 §4.1; F-PSC-1 a). A nota segue assinada pelo
 * certificado do emitente no PSC. Envelope com a área `nfeDadosMsg` no namespace do WSDL do serviço; o retorno é o
 * conteúdo de `nfeResultMsg`. **Grau I:** o MOC 7.0 VG (`TRANSCRICAO-MOC70-webservices-NFe-2026-10-29.md`, `[WS-SOAP]`)
 * não traz o namespace `…/nfe/wsdl/<Servico>4` nem o `nfeResultMsg` da versão 4.00 (só o envelope do `NfeRecepcao2` e a
 * nota de que a 4.0 eliminou o `nfeCabecMsg`, p. 64); os dois vêm dos WSDL publicados das autorizadoras e ficam aqui como
 * constantes únicas, a conferir no runbook de homologação (D5) contra o `?wsdl` real.
 *
 * Falha de transporte (handshake, timeout, 5xx, corpo sem `nfeResultMsg`) ⇒ `SefazTransporteError` — quem chama decide
 * (o envio deixa o documento `SENT` e entra na recuperação, E-8). Nunca loga corpo, URL com query ou certificado (OBS-R7).
 */

export const SOAP12_NS = 'http://www.w3.org/2003/05/soap-envelope';
export const wsdlNs = (servico: SefazServico): string => `http://www.portalfiscal.inf.br/nfe/wsdl/${servico}`;

/** O e-CNPJ do Luminaris para o TLS mútuo (PKCS#12 — o `node:tls` aceita `pfx` direto) e a cadeia da SEFAZ. */
export interface TransporteTls {
  pfx: Buffer;
  passphrase: string;
  /** Cadeia ICP-Brasil (PEM) acrescentada às CAs do Node — a SEFAZ usa certificado ICP-Brasil no servidor. */
  ca?: string | Buffer;
}

export const DFE_TRANSMISSOR_CERT_MISSING = 'dfe_transmissor_cert_missing';

/**
 * Lê o transmissor do env, na hora do uso (o resto da aplicação sobe sem ele):
 * `DFE_TRANSMISSOR_CERT` (caminho do PFX), `DFE_TRANSMISSOR_CERT_PASSWORD`, `DFE_SEFAZ_CA` (opcional, caminho PEM).
 * Sem certificado ⇒ 503 nomeado, sem efeito (falha fechada, como o keyring do F5).
 */
export function loadTransporteTls(env: NodeJS.ProcessEnv = process.env): TransporteTls {
  const path = env.DFE_TRANSMISSOR_CERT?.trim();
  const passphrase = env.DFE_TRANSMISSOR_CERT_PASSWORD ?? '';
  if (!path) {
    throw new AppError('Certificado do transmissor (e-CNPJ do Luminaris) não provisionado (DFE_TRANSMISSOR_CERT).', 503, DFE_TRANSMISSOR_CERT_MISSING);
  }
  const ca = env.DFE_SEFAZ_CA?.trim();
  return { pfx: readFileSync(path), passphrase, ...(ca ? { ca: readFileSync(ca) } : {}) };
}

/** X10a PR-9: subclasse do marcador da porta — a falha de transporte é a que liga a contingência automática (decisão 4). */
export class SefazTransporteError extends DfeTransporteError {
  constructor(
    public readonly code: 'sefaz_timeout' | 'sefaz_tls' | 'sefaz_http' | 'sefaz_resposta_ilegivel',
    message: string,
  ) {
    super(code, `${code}: ${message}`);
    this.name = 'SefazTransporteError';
  }
}

export interface SefazSoapOptions {
  transporte: TransporteTls;
  connectTimeoutMs?: number;
  responseTimeoutMs?: number;
}

export const envelopeSoap = (servico: SefazServico, xml: string): string =>
  `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="${SOAP12_NS}"><soap12:Body><nfeDadosMsg xmlns="${wsdlNs(servico)}">${xml}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;

/** Conteúdo de `nfeResultMsg` (o XML de retorno do serviço), ou erro nomeado. */
export function extrairResultado(soap: string): string {
  const m = /<(?:\w+:)?nfeResultMsg\b[^>]*>([\s\S]*?)<\/(?:\w+:)?nfeResultMsg>/.exec(soap);
  if (!m) throw new SefazTransporteError('sefaz_resposta_ilegivel', 'resposta sem nfeResultMsg');
  return m[1].trim();
}

export class SefazSoapClient {
  constructor(private readonly opts: SefazSoapOptions) {}

  /** POST do envelope para `url`; devolve o XML de `nfeResultMsg`. Um agente por chamada (sem pool entre instâncias). */
  async call(url: string, servico: SefazServico, xml: string): Promise<string> {
    const body = envelopeSoap(servico, xml);
    const startedAt = Date.now();
    const { transporte, connectTimeoutMs = 10_000, responseTimeoutMs = 30_000 } = this.opts;
    try {
      const resposta = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = request(
          url,
          {
            method: 'POST',
            pfx: transporte.pfx,
            passphrase: transporte.passphrase,
            ...(transporte.ca ? { ca: transporte.ca } : {}),
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true,
            agent: false,
            headers: { 'Content-Type': `application/soap+xml; charset=utf-8; action="${wsdlNs(servico)}"`, 'Content-Length': Buffer.byteLength(body) },
            timeout: connectTimeoutMs,
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.setTimeout(responseTimeoutMs, () => res.destroy(new SefazTransporteError('sefaz_timeout', 'resposta')));
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
            res.on('error', reject);
          },
        );
        req.on('timeout', () => req.destroy(new SefazTransporteError('sefaz_timeout', 'conexão')));
        req.on('error', reject);
        req.end(body);
      });
      logger.event(resposta.status < 400 ? 'info' : 'warn', 'integration.call', 'outbound call', {
        integration: 'sefaz',
        method: 'POST',
        status: resposta.status,
        durationMs: Date.now() - startedAt,
      });
      // SOAP 1.2 devolve Fault com 500; sem nfeResultMsg o corpo não é resultado do serviço.
      if (resposta.status >= 500 && !/nfeResultMsg/.test(resposta.body)) throw new SefazTransporteError('sefaz_http', `HTTP ${resposta.status}`);
      return extrairResultado(resposta.body);
    } catch (error) {
      if (error instanceof SefazTransporteError) throw error;
      logger.event('warn', 'integration.failed', 'outbound call failed', {
        integration: 'sefaz',
        method: 'POST',
        durationMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      const code = (error as NodeJS.ErrnoException).code ?? '';
      throw new SefazTransporteError(/CERT|SSL|TLS|EPROTO|ECONNRESET/i.test(code + String(error)) ? 'sefaz_tls' : 'sefaz_http', code || String(error));
    }
  }
}
