import { EventEmitter } from 'node:events';

jest.mock('node:https', () => ({ request: jest.fn() }));

import { request } from 'node:https';
import { SefazSoapClient, SefazTransporteError } from '../SefazSoapClient';

/**
 * F-AL-6 (dono, chat, 2026-11-24) — a classificação da falha de transporte pelo MOMENTO em que ela ocorre, não só pelo texto do erro:
 * só a conexão que cai DEPOIS de a requisição ter sido escrita no socket é ambígua como o timeout (`sefaz_timeout`: a SEFAZ pode ter
 * processado e a resposta se perdeu). Reset/recusa ANTES de a requisição sair (connect) nada levou à SEFAZ ⇒ continua contingenciando na
 * hora. O `https.request` é o único mock: o que se prova é o classificador do cliente, em cima do evento `finish` do `ClientRequest`.
 */
const erro = (code: string, message: string) => Object.assign(new Error(message), { code });

/** Um `ClientRequest` falso: ao `end(body)`, roda o roteiro (`finish` = a requisição foi escrita no socket). */
function reqFalso(roteiro: (req: EventEmitter) => void): void {
  const base = new EventEmitter();
  const req: EventEmitter = Object.assign(base, { end: jest.fn((): void => roteiro(base)), destroy: jest.fn() });
  (request as jest.Mock).mockReturnValue(req);
}

const cliente = new SefazSoapClient({ transporte: { pfx: Buffer.alloc(0), passphrase: '' } });
const chamar = () => cliente.call('https://sefaz.exemplo.test/ws/NFeAutorizacao4.asmx', 'NFeAutorizacao4', '<enviNFe/>');

describe('SefazSoapClient — classificação da falha de transporte (F-AL-6)', () => {
  it.each([
    ['reset', 'ECONNRESET', 'read ECONNRESET'],
    ['pipe quebrado', 'EPIPE', 'write EPIPE'],
    ['socket hang up', 'ECONNRESET', 'socket hang up'],
  ])('%s ANTES de a requisição sair (connect) ⇒ NÃO é timeout: a SEFAZ nunca viu a nota, contingencia na hora', async (_n, code, msg) => {
    reqFalso((req) => req.emit('error', erro(code, msg)));
    const falha = await chamar().catch((e: unknown) => e);
    expect(falha).toBeInstanceOf(SefazTransporteError);
    expect(falha).toMatchObject({ code: 'sefaz_tls' }); // não ambíguo: segue contingenciando na hora (como antes da F-AL-6)
  });

  it.each([
    ['reset', 'ECONNRESET', 'read ECONNRESET'],
    ['pipe quebrado', 'EPIPE', 'write EPIPE'],
    ['socket hang up', 'ECONNRESET', 'socket hang up'],
  ])('%s DEPOIS de a requisição ter sido escrita ⇒ sefaz_timeout (ambíguo: a SEFAZ pode ter autorizado)', async (_n, code, msg) => {
    reqFalso((req) => {
      req.emit('finish');
      req.emit('error', erro(code, msg));
    });
    await expect(chamar()).rejects.toMatchObject({ code: 'sefaz_timeout' });
  });

  it('falha de certificado/TLS continua sefaz_tls, antes ou depois da escrita', async () => {
    reqFalso((req) => req.emit('error', erro('ECONNRESET', 'Client network socket disconnected before secure TLS connection was established')));
    await expect(chamar()).rejects.toMatchObject({ code: 'sefaz_tls' });
    reqFalso((req) => {
      req.emit('finish');
      req.emit('error', erro('ERR_SSL_TLSV1_ALERT_UNKNOWN_CA', 'tlsv1 alert unknown ca'));
    });
    await expect(chamar()).rejects.toMatchObject({ code: 'sefaz_tls' });
  });

  it('recusa/DNS (nunca conectou) segue sefaz_http', async () => {
    reqFalso((req) => req.emit('error', erro('ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:443')));
    await expect(chamar()).rejects.toMatchObject({ code: 'sefaz_http' });
  });
});
