import { X509Certificate, verify as verifyRsa } from 'node:crypto';
import { createServer, type Server } from 'node:https';
import type { AddressInfo } from 'node:net';
import forge from 'node-forge';
import { XMLParser } from 'fast-xml-parser';
import { verifyNfeSignature } from '../../src/lib/nfeSignature';
import { digestValueDe } from '../../src/lib/dfeXmlSign';

/**
 * SEFAZ falsa para os testes do adaptador `sefaz` (X10a PR-7, EMENDA-1 E-4): servidor HTTPS LOCAL com TLS mútuo
 * (`requestCert`, CA gerada no teste), respondendo SOAP 1.2 como os webservices NF-e 4.00. Nada sai da máquina.
 * Verifica a assinatura da nota recebida com o `verifyNfeSignature` real — a SEFAZ falsa recusa o que a verdadeira
 * recusaria por assinatura.
 */

export interface TlsPki {
  caPem: string;
  serverKeyPem: string;
  serverCertPem: string;
  /** PKCS#12 do "transmissor" (cliente mTLS) assinado pela CA. */
  clientPfx: Buffer;
  /** PKCS#12 de um cliente assinado por OUTRA CA (o handshake tem de falhar). */
  foreignPfx: Buffer;
  passphrase: string;
}

function keyCert(cn: string, issuer: { key: forge.pki.rsa.PrivateKey; cert?: forge.pki.Certificate }, opts: { ca?: boolean; ip?: string } = {}) {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = String(Math.floor(Math.random() * 1e9));
  cert.validity.notBefore = new Date(Date.now() - 86_400_000);
  cert.validity.notAfter = new Date(Date.now() + 365 * 86_400_000);
  const attrs = [{ name: 'commonName', value: cn }];
  cert.setSubject(attrs);
  cert.setIssuer(issuer.cert ? issuer.cert.subject.attributes : attrs);
  const ext: unknown[] = [{ name: 'basicConstraints', cA: Boolean(opts.ca) }];
  if (opts.ip) ext.push({ name: 'subjectAltName', altNames: [{ type: 7, ip: opts.ip }] });
  cert.setExtensions(ext as never);
  cert.sign(issuer.cert ? issuer.key : keys.privateKey, forge.md.sha256.create());
  return { keys, cert };
}

const pfxDe = (k: forge.pki.rsa.PrivateKey, c: forge.pki.Certificate, pass: string): Buffer =>
  Buffer.from(forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(k, [c], pass, { algorithm: '3des' })).getBytes(), 'binary');

let pkiCache: TlsPki | null = null;
/** Uma PKI por processo (gerar RSA no node-forge custa ~1 s por chave). */
export function makeTlsPki(): TlsPki {
  if (pkiCache) return pkiCache;
  const passphrase = 'teste';
  const ca = keyCert('CA TESTE SEFAZ LUMINARIS', { key: null as never }, { ca: true });
  ca.cert.setIssuer(ca.cert.subject.attributes);
  ca.cert.sign(ca.keys.privateKey, forge.md.sha256.create());
  const server = keyCert('127.0.0.1', { key: ca.keys.privateKey, cert: ca.cert }, { ip: '127.0.0.1' });
  const client = keyCert('TRANSMISSOR LUMINARIS', { key: ca.keys.privateKey, cert: ca.cert });
  const otherCa = keyCert('OUTRA CA', { key: null as never }, { ca: true });
  otherCa.cert.setIssuer(otherCa.cert.subject.attributes);
  otherCa.cert.sign(otherCa.keys.privateKey, forge.md.sha256.create());
  const foreign = keyCert('INTRUSO', { key: otherCa.keys.privateKey, cert: otherCa.cert });
  pkiCache = {
    caPem: forge.pki.certificateToPem(ca.cert),
    serverKeyPem: forge.pki.privateKeyToPem(server.keys.privateKey),
    serverCertPem: forge.pki.certificateToPem(server.cert),
    clientPfx: pfxDe(client.keys.privateKey, client.cert, passphrase),
    foreignPfx: pfxDe(foreign.keys.privateKey, foreign.cert, passphrase),
    passphrase,
  };
  return pkiCache;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseTagValue: false });
const NS = 'http://www.portalfiscal.inf.br/nfe';

export interface FakeSefazControle {
  /** cStat forçado na autorização (ex.: '539', '225', '704'); null = autoriza (100). */
  cStatAutorizacao: string | null;
  /** Processa e autoriza, mas derruba a conexão sem responder (resposta perdida, E-8). */
  perderRespostaAutorizacao: boolean;
  /** cStat forçado no evento de cancelamento (ex.: '501'). */
  cStatEvento: string | null;
  /** cStat forçado na inutilização. */
  cStatInutilizacao: string | null;
  /** Atraso (ms) antes de responder qualquer chamada. */
  atrasoMs: number;
  /** X10a PR-8: a UF não aceita o QR Code v3 (RV ZX02-220, rej. 407). */
  recusarQrV3: boolean;
  /** X10a PR-9: a SEFAZ está fora — derruba a conexão ANTES de processar (nada fica na base). */
  foraDoAr: boolean;
  chamadas: Array<{ servico: string; corpo: string }>;
}

export class FakeSefaz {
  private server: Server | null = null;
  /** chave → { protXml, digVal, nProt } das notas autorizadas. */
  public readonly autorizadas = new Map<string, { digVal: string; nProt: string }>();
  public readonly controle: FakeSefazControle = {
    cStatAutorizacao: null,
    perderRespostaAutorizacao: false,
    cStatEvento: null,
    cStatInutilizacao: null,
    atrasoMs: 0,
    recusarQrV3: false,
    foraDoAr: false,
    chamadas: [],
  };
  public baseUrl = '';
  private nProtSeq = 135_000_000_000_000;

  constructor(private readonly pki: TlsPki = makeTlsPki()) {}

  async start(): Promise<string> {
    this.server = createServer(
      { key: this.pki.serverKeyPem, cert: this.pki.serverCertPem, ca: this.pki.caPem, requestCert: true, rejectUnauthorized: true },
      (req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          void (async () => {
            const servico = (req.url ?? '').replace(/^\/ws\//, '').replace(/\.asmx$/, '');
            const corpo = Buffer.concat(chunks).toString('utf8');
            // Registra ANTES do atraso: a chamada lenta de um teste não pode cair na contagem do teste seguinte.
            this.controle.chamadas.push({ servico, corpo });
            if (this.controle.foraDoAr) {
              req.socket.destroy();
              return;
            }
            if (this.controle.atrasoMs) await new Promise((r) => setTimeout(r, this.controle.atrasoMs));
            const resultado = this.responder(servico, corpo);
            if (resultado === null) {
              req.socket.destroy();
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/soap+xml; charset=utf-8' });
            res.end(
              `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>` +
                `<nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${servico}">${resultado}</nfeResultMsg></soap:Body></soap:Envelope>`,
            );
          })();
        });
      },
    );
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', resolve));
    this.baseUrl = `https://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
    return this.baseUrl;
  }

  async stop(): Promise<void> {
    if (this.server) await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    this.server = null;
  }

  /** Resolver de endpoint para o adaptador: toda UF aponta para esta SEFAZ falsa. */
  endpoint = (_uf: string, _modelo: 55 | 65, _amb: string, servico: string): string => `${this.baseUrl}/ws/${servico}.asmx`;

  /**
   * X10a PR-9 — QR Code da NFC-e tpEmis=9 (RVs da NT 2025.001 v1.03): v3 sem assinatura ⇒ 474; assinatura que não confere
   * com o certificado da nota (RSA-SHA1 dos parâmetros 1–7) ⇒ 583; v3 com assinatura numa nota normal ⇒ 445.
   */
  private conferirQrOffline(chave: string, nfe: string): string | null {
    const qr = /<qrCode>([^<]*)<\/qrCode>/.exec(nfe)?.[1]?.replace(/&amp;/g, '&');
    if (!qr || !/\?p=\w{44}\|3\|/.test(qr)) return null;
    const params = qr.slice(qr.indexOf('?p=') + 3).split('|');
    const contingencia = chave[34] === '9';
    if (!contingencia) return params.length > 3 ? '445' : null;
    if (params.length !== 8 || !params[7]) return '474';
    const certB64 = /<X509Certificate>([^<]+)<\/X509Certificate>/.exec(nfe)?.[1] ?? '';
    const cert = new X509Certificate(Buffer.from(certB64, 'base64'));
    const ok = verifyRsa('sha1', Buffer.from(params.slice(0, 7).join('|'), 'utf8'), cert.publicKey, Buffer.from(params[7], 'base64'));
    return ok ? null : '583';
  }

  private protNFe(chave: string, cStat: string, xMotivo: string, extra = ''): string {
    return `<protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><verAplic>FAKE</verAplic><chNFe>${chave}</chNFe><dhRecbto>2026-10-29T10:00:00-03:00</dhRecbto>${extra}<cStat>${cStat}</cStat><xMotivo>${xMotivo}</xMotivo></infProt></protNFe>`;
  }

  private responder(servico: string, corpo: string): string | null {
    const msg = /<nfeDadosMsg[^>]*>([\s\S]*)<\/nfeDadosMsg>/.exec(corpo)?.[1] ?? '';
    if (servico === 'NFeAutorizacao4') {
      const nfe = /<NFe[\s\S]*<\/NFe>/.exec(msg)?.[0] ?? '';
      const chave = /Id="NFe(\w{44})"/.exec(nfe)?.[1] ?? '';
      const indSinc = /<indSinc>(\d)<\/indSinc>/.exec(msg)?.[1];
      if (indSinc !== '1') return `<retEnviNFe xmlns="${NS}" versao="4.00"><cStat>452</cStat><xMotivo>Rejeicao: indSinc=0</xMotivo></retEnviNFe>`;
      try {
        verifyNfeSignature(nfe);
      } catch {
        return `<retEnviNFe xmlns="${NS}" versao="4.00"><cStat>104</cStat><xMotivo>Lote processado</xMotivo>${this.protNFe(chave, '297', 'Rejeicao: Assinatura difere do calculado')}</retEnviNFe>`;
      }
      if (this.autorizadas.has(chave)) {
        return `<retEnviNFe xmlns="${NS}" versao="4.00"><cStat>104</cStat><xMotivo>Lote processado</xMotivo>${this.protNFe(chave, '204', 'Rejeicao: Duplicidade de NF-e')}</retEnviNFe>`;
      }
      const qrOffline = this.conferirQrOffline(chave, nfe);
      if (qrOffline) {
        return `<retEnviNFe xmlns="${NS}" versao="4.00"><cStat>104</cStat><xMotivo>Lote processado</xMotivo>${this.protNFe(chave, qrOffline, `Rejeicao QR off-line ${qrOffline}`)}</retEnviNFe>`;
      }
      if (this.controle.recusarQrV3 && /<qrCode>[^<]*\?p=\w{44}\|3\|/.test(nfe)) {
        return `<retEnviNFe xmlns="${NS}" versao="4.00"><cStat>104</cStat><xMotivo>Lote processado</xMotivo>${this.protNFe(chave, '407', 'Rejeicao: QR Code versao 3 nao aceito pela UF')}</retEnviNFe>`;
      }
      const forcado = this.controle.cStatAutorizacao;
      if (forcado) {
        return `<retEnviNFe xmlns="${NS}" versao="4.00"><cStat>104</cStat><xMotivo>Lote processado</xMotivo>${this.protNFe(chave, forcado, `Rejeicao forcada ${forcado}`)}</retEnviNFe>`;
      }
      const digVal = digestValueDe(nfe);
      const nProt = String(++this.nProtSeq);
      this.autorizadas.set(chave, { digVal, nProt });
      if (this.controle.perderRespostaAutorizacao) return null;
      return `<retEnviNFe xmlns="${NS}" versao="4.00"><cStat>104</cStat><xMotivo>Lote processado</xMotivo>${this.protNFe(chave, '100', 'Autorizado o uso da NF-e', `<nProt>${nProt}</nProt><digVal>${digVal}</digVal>`)}</retEnviNFe>`;
    }
    if (servico === 'NFeConsultaProtocolo4') {
      const chave = /<chNFe>(\w{44})<\/chNFe>/.exec(msg)?.[1] ?? '';
      const a = this.autorizadas.get(chave);
      if (!a) return `<retConsSitNFe xmlns="${NS}" versao="4.00"><cStat>217</cStat><xMotivo>Rejeicao: NF-e nao consta na base de dados da SEFAZ</xMotivo></retConsSitNFe>`;
      return `<retConsSitNFe xmlns="${NS}" versao="4.00"><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo>${this.protNFe(chave, '100', 'Autorizado o uso da NF-e', `<nProt>${a.nProt}</nProt><digVal>${a.digVal}</digVal>`)}</retConsSitNFe>`;
    }
    if (servico === 'NFeRecepcaoEvento4') {
      const evento = /<evento[\s\S]*<\/evento>/.exec(msg)?.[0] ?? '';
      const tree = parser.parse(evento) as { evento: { infEvento: { chNFe: string; tpEvento: string; detEvento: { nProt: string; chNFeRef?: string } } } };
      const inf = tree.evento.infEvento;
      const a = this.autorizadas.get(inf.chNFe);
      let cStat = this.controle.cStatEvento ?? (a && a.nProt === String(inf.detEvento.nProt) ? '135' : '222');
      if (cStat === '135' && String(inf.tpEvento) === '110112') {
        // X10a PR-9 — RVs do 110112 (MOC 7.0 VG Tabela 5-38): cancelada normal (920), substituta na base (912) e de
        // contingência (921). A posição 35 da chave é o tpEmis.
        const ref = String(inf.detEvento.chNFeRef ?? '');
        if (inf.chNFe[34] !== '1') cStat = '920';
        else if (!this.autorizadas.has(ref)) cStat = '912';
        else if (ref[34] === '1') cStat = '921';
      }
      return `<retEnvEvento xmlns="${NS}" versao="1.00"><cStat>128</cStat><xMotivo>Lote de evento processado</xMotivo><retEvento versao="1.00"><infEvento><cStat>${cStat}</cStat><xMotivo>cStat ${cStat}</xMotivo></infEvento></retEvento></retEnvEvento>`;
    }
    if (servico === 'NFeInutilizacao4') {
      const cStat = this.controle.cStatInutilizacao ?? '102';
      return `<retInutNFe xmlns="${NS}" versao="4.00"><infInut><cStat>${cStat}</cStat><xMotivo>cStat ${cStat}</xMotivo>${cStat === '102' ? '<nProt>135000000000999</nProt>' : ''}</infInut></retInutNFe>`;
    }
    return `<retConsStatServ xmlns="${NS}" versao="4.00"><cStat>107</cStat><xMotivo>Servico em Operacao</xMotivo></retConsStatServ>`;
  }
}
