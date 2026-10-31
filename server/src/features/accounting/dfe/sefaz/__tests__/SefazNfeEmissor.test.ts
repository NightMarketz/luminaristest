import { generateKeyPairSync } from 'node:crypto';
import { FakeSefaz, makeTlsPki } from '../../../../../../test/helpers/fakeSefaz';
import { makeTestCert } from '../../../../../../test/helpers/nfeSignature';
import { FakePscServer } from '../../psc/FakePscServer';
import { PscAssinador } from '../../psc/PscAssinador';
import { SefazSoapClient, SefazTransporteError } from '../SefazSoapClient';
import { AssinaturaRemotaError, SefazNfeEmissor, releituraNfe } from '../SefazNfeEmissor';
import { hashQrCodeV2 } from '../nfceQrCode';
import { inputNfce, nfceNumerada } from '../../../models/__tests__/nfeMontagem.fixture';
import { montarNfe, numerarNfe } from '../../../models/nfeMontagem';
import type { DfeCallContext } from '../../DfeEmissorPort';
import { serializeNfe } from '../../../../../lib/nfeXml';
import { assinarEnveloped } from '../../../../../lib/dfeXmlSign';
import type { NfePayload } from '../../../dtos/NfePayloadDto';

/**
 * X10a PR-7 — adaptador `sefaz` contra a SEFAZ falsa (HTTPS local com TLS mútuo) e o PSC falso (API v0). EMENDA-1 itens
 * E-4 (cliente SOAP + mTLS), E-5 (emitir), E-6 (inutilizar), E-7 (cancelar 110111), E-8 (recuperação), E-10 (releitura).
 */
const pki = makeTlsPki();
const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;

describe('SefazNfeEmissor', () => {
  const sefaz = new FakeSefaz(pki);
  let psc: FakePscServer;
  let ctx: DfeCallContext;
  let emissor: SefazNfeEmissor;
  let seq = 1;
  const nova = (): NfePayload => {
    const n = 100 + seq++;
    return numerarNfe(montarNfe(inputNfce()), n, String(48151623 + n));
  };

  beforeAll(async () => {
    await sefaz.start();
    const cnpj = nfceNumerada().infNFe.emit.CNPJ;
    const certPem = makeTestCert({ cnpj }, key);
    psc = new FakePscServer({ key, certPem, titularCnpj: cnpj });
    const baseUrl = await psc.start();
    ctx = {
      ambiente: 'homologacao',
      assinatura: {
        assinador: new PscAssinador(2_000),
        credencial: { pscProviderId: 'p', baseUrl, accessToken: psc.emitirToken(), titularCnpj: cnpj, certificadoPem: certPem, escopo: ['NFE', 'NFCE'] },
      },
    };
    const soap = new SefazSoapClient({ transporte: { pfx: pki.clientPfx, passphrase: pki.passphrase, ca: pki.caPem }, responseTimeoutMs: 2_000 });
    emissor = new SefazNfeEmissor({ ambiente: 'homologacao', soap, endpoint: sefaz.endpoint });
  });
  afterAll(async () => {
    await sefaz.stop();
    await psc.stop();
  });
  afterEach(() => {
    Object.assign(sefaz.controle, { cStatAutorizacao: null, perderRespostaAutorizacao: false, cStatEvento: null, cStatInutilizacao: null, atrasoMs: 0 });
  });

  const emitir = (payload: NfePayload) => emissor.emitir({ kind: 'NFCE', ref: 'd:1', ambiente: 'homologacao', cnpjEmitente: payload.infNFe.emit.CNPJ, partnerAccountRef: null, payload, ctx });

  it('E-4: handshake sem certificado de cliente falha; certificado de outra CA falha', async () => {
    const semCert = new SefazSoapClient({ transporte: { pfx: Buffer.alloc(0), passphrase: '', ca: pki.caPem } });
    await expect(semCert.call(sefaz.endpoint('SP', 65, 'homologacao', 'NFeStatusServico4'), 'NFeStatusServico4', '<x/>')).rejects.toBeInstanceOf(Error);
    const intruso = new SefazSoapClient({ transporte: { pfx: pki.foreignPfx, passphrase: pki.passphrase, ca: pki.caPem } });
    await expect(intruso.call(sefaz.endpoint('SP', 65, 'homologacao', 'NFeStatusServico4'), 'NFeStatusServico4', '<x/>')).rejects.toBeInstanceOf(SefazTransporteError);
    const ok = new SefazSoapClient({ transporte: { pfx: pki.clientPfx, passphrase: pki.passphrase, ca: pki.caPem } });
    expect(await ok.call(sefaz.endpoint('SP', 65, 'homologacao', 'NFeStatusServico4'), 'NFeStatusServico4', '<x/>')).toContain('<cStat>107</cStat>');
  });

  it('E-4: timeout de resposta ⇒ SefazTransporteError sefaz_timeout (não REJECTED)', async () => {
    sefaz.controle.atrasoMs = 400;
    const lento = new SefazSoapClient({ transporte: { pfx: pki.clientPfx, passphrase: pki.passphrase, ca: pki.caPem }, connectTimeoutMs: 100, responseTimeoutMs: 100 });
    await expect(lento.call(sefaz.endpoint('SP', 65, 'homologacao', 'NFeStatusServico4'), 'NFeStatusServico4', '<x/>')).rejects.toThrow(/sefaz_timeout/);
  });

  it('E-5: lote com UMA nota e indSinc=1; cStat 100 ⇒ AUTHORIZED com nfeProc (NFe + protNFe); partnerRef = chave', async () => {
    const p = nova();
    const r = await emitir(p);
    const chave = p.infNFe.Id.slice(3);
    expect(r).toMatchObject({ status: 'AUTHORIZED', partnerRef: chave, chaveOuCodigo: chave, numero: String(p.infNFe.ide.nNF) });
    const xml = r.xml!.toString('utf8');
    expect(xml).toMatch(/^<nfeProc xmlns="http:\/\/www\.portalfiscal\.inf\.br\/nfe" versao="4\.00"><NFe /);
    expect(xml).toContain('<protNFe');
    const lote = sefaz.controle.chamadas.at(-1)!.corpo;
    expect((lote.match(/<NFe /g) ?? []).length).toBe(1);
    expect(lote).toContain('<indSinc>1</indSinc>');
    expect(releituraNfe(xml, p)).toEqual([]);
  });

  it('E-5: rejeição ⇒ REJECTED com o cStat em errors[].code', async () => {
    sefaz.controle.cStatAutorizacao = '704';
    expect(await emitir(nova())).toMatchObject({ status: 'REJECTED', errors: [{ code: '704' }] });
  });

  it('E-5: duplicidade (a SEFAZ já tem a chave) ⇒ consulta pela chave antes de decidir ⇒ AUTHORIZED', async () => {
    const p = nova();
    await emitir(p);
    const antes = sefaz.controle.chamadas.length;
    const r = await emitir(p);
    expect(r.status).toBe('AUTHORIZED');
    expect(sefaz.controle.chamadas.slice(antes).map((c) => c.servico)).toEqual(['NFeAutorizacao4', 'NFeConsultaProtocolo4']);
  });

  it('E-8: resposta perdida + nota autorizada no servidor ⇒ a consulta autoriza UMA vez, sem reenviar', async () => {
    const p = nova();
    sefaz.controle.perderRespostaAutorizacao = true;
    await expect(emitir(p)).rejects.toBeInstanceOf(SefazTransporteError);
    sefaz.controle.perderRespostaAutorizacao = false;
    const antes = sefaz.controle.chamadas.length;
    const r = await emissor.consultar(p.infNFe.Id.slice(3), { ...ctx, payload: p });
    expect(r.status).toBe('AUTHORIZED');
    expect(r.xml!.toString()).toContain('<protNFe');
    expect(sefaz.controle.chamadas.slice(antes).map((c) => c.servico)).toEqual(['NFeConsultaProtocolo4']);
  });

  it('E-8: nota que não consta (217) ⇒ PROCESSING com o código — quem rejeita é o ciclo (F-ADN-8 a)', async () => {
    const p = nova();
    expect(await emissor.consultar(p.infNFe.Id.slice(3), ctx)).toMatchObject({ status: 'PROCESSING', errors: [{ code: '217' }] });
  });

  it('E-7: cancelamento 110111 assinado; 135 ⇒ CANCELLED; 501 ⇒ OUT_OF_WINDOW', async () => {
    const p = nova();
    await emitir(p);
    const chave = p.infNFe.Id.slice(3);
    expect(await emissor.cancelar(chave, { kind: 'NFCE', xJust: 'Cancelamento de teste pelo operador' }, ctx)).toEqual({ status: 'CANCELLED', errors: [] });
    const evento = sefaz.controle.chamadas.at(-1)!.corpo;
    expect(evento).toContain(`Id="ID110111${chave}01"`);
    expect(evento).toContain('<descEvento>Cancelamento</descEvento>');
    expect(evento).toMatch(/<Signature[\s\S]*<\/Signature><\/evento>/);
    sefaz.controle.cStatEvento = '501';
    expect(await emissor.cancelar(chave, { kind: 'NFCE', xJust: 'Cancelamento de teste pelo operador' }, ctx)).toMatchObject({ status: 'OUT_OF_WINDOW' });
  });

  it('E-6: inutilização assinada com Id = ID+cUF+ano+CNPJ+mod+série(3)+nIni(9)+nFin(9); 102 ⇒ HOMOLOGATED', async () => {
    const cnpj = nfceNumerada().infNFe.emit.CNPJ;
    const r = await emissor.inutilizar({ kind: 'NFCE', ambiente: 'homologacao', cnpjEmitente: cnpj, partnerAccountRef: null, ano: 2026, serie: 1, nIni: 10n, nFin: 12n, xJust: 'Falha de sistema na numeracao', uf: 'SP', ctx });
    expect(r).toMatchObject({ status: 'HOMOLOGATED', nProt: '135000000000999' });
    expect(sefaz.controle.chamadas.at(-1)!.corpo).toContain(`Id="ID3526${cnpj}65001000000010000000012"`);
    sefaz.controle.cStatInutilizacao = '563';
    expect(await emissor.inutilizar({ kind: 'NFCE', ambiente: 'homologacao', cnpjEmitente: cnpj, partnerAccountRef: null, ano: 2026, serie: 1, nIni: 13n, nFin: 13n, xJust: 'Falha de sistema na numeracao', uf: 'SP', ctx })).toMatchObject({ status: 'REJECTED', errors: [{ code: '563' }] });
  });

  it('assinatura recusada pelo PSC (token vencido) ⇒ AssinaturaRemotaError CREDENCIAL_EXPIRADA, nada vai à SEFAZ', async () => {
    psc.controle.statusAssinatura = 401;
    const antes = sefaz.controle.chamadas.length;
    try {
      await expect(emitir(nova())).rejects.toMatchObject({ code: 'CREDENCIAL_EXPIRADA' });
      await expect(emitir(nova())).rejects.toBeInstanceOf(AssinaturaRemotaError);
    } finally {
      psc.controle.statusAssinatura = null;
    }
    expect(sefaz.controle.chamadas.length).toBe(antes);
  });

  it('E-10: nfeProc com vNF mutado depois do protocolo ⇒ a assinatura falha na releitura', async () => {
    const p = nova();
    const r = await emitir(p);
    const mutado = r.xml!.toString('utf8').replace(/<vNF>([^<]+)<\/vNF>/, '<vNF>9999.99</vNF>');
    expect(() => releituraNfe(mutado, p)).toThrow(/assinatura/);
  });

  it('E-10: XML montado diferente do payload persistido ⇒ a comparação campo a campo acusa', async () => {
    const p = nova();
    const outro = JSON.parse(JSON.stringify(p)) as NfePayload;
    outro.infNFe.pag.detPag[0].tPag = outro.infNFe.pag.detPag[0].tPag === '01' ? '17' : '01';
    const a = ctx.assinatura!;
    const assinado = await assinarEnveloped(serializeNfe(outro), { signedLocalName: 'infNFe' }, a.credencial.certificadoPem, async (d) => {
      const s = await a.assinador.assinarHash(d, 'sha1', 'NFCE', a.credencial);
      if (!s.ok) throw new Error(s.code);
      return s.signatureValueB64;
    });
    expect(releituraNfe(`<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">${assinado}</nfeProc>`, p)).toEqual(['tPag']);
  });

  // ---- X10a PR-8 (E-3, F-NFCE-E1-4 c): QR Code v3 e recuo para v2/CSC ----

  it('E-3: a NFC-e sai com infNFeSupl v3 (p=chave|3|tpAmb) entre </infNFe> e <Signature>, e a assinatura continua válida', async () => {
    const p = nova();
    const chave = p.infNFe.Id.slice(3);
    const r = await emitir(p);
    expect(r.status).toBe('AUTHORIZED');
    const lote = sefaz.controle.chamadas.at(-1)!.corpo;
    expect(lote).toMatch(new RegExp(`</infNFe><infNFeSupl><qrCode>https://www\\.homologacao\\.nfce\\.fazenda\\.sp\\.gov\\.br/[^<]*\\?p=${chave}\\|3\\|2</qrCode><urlChave>[^<]+</urlChave></infNFeSupl><Signature`));
    expect(r.xml!.toString('utf8')).toContain('<infNFeSupl>');
    expect(releituraNfe(r.xml!.toString('utf8'), p)).toEqual([]);
  });

  it('E-3: UF recusa a v3 (407) e há CSC ⇒ reenvia a MESMA nota assinada com o QR v2 (hash do CSC) ⇒ AUTHORIZED, uma assinatura só', async () => {
    sefaz.controle.recusarQrV3 = true;
    try {
      const p = nova();
      const chave = p.infNFe.Id.slice(3);
      const assinaturasAntes = psc.controle.assinaturas;
      const antes = sefaz.controle.chamadas.length;
      const csc = { id: '000001', csc: 'A1B2C3D4E5F6G7H8I9J0' };
      const r = await emissor.emitir({ kind: 'NFCE', ref: 'd:1', ambiente: 'homologacao', cnpjEmitente: p.infNFe.emit.CNPJ, partnerAccountRef: null, payload: p, ctx: { ...ctx, csc } });
      expect(r.status).toBe('AUTHORIZED');
      expect(sefaz.controle.chamadas.slice(antes).map((c) => c.servico)).toEqual(['NFeAutorizacao4', 'NFeAutorizacao4']);
      const hash = hashQrCodeV2(chave, 2, '1', csc.csc);
      expect(sefaz.controle.chamadas.at(-1)!.corpo).toContain(`?p=${chave}|2|2|1|${hash}</qrCode>`);
      expect(psc.controle.assinaturas - assinaturasAntes).toBe(1);
    } finally {
      sefaz.controle.recusarQrV3 = false;
    }
  });

  it('E-3: UF recusa a v3 e a unidade não tem CSC ⇒ REJECTED 407 nomeando o cadastro do CSC', async () => {
    sefaz.controle.recusarQrV3 = true;
    try {
      const r = await emitir(nova());
      expect(r).toMatchObject({ status: 'REJECTED', errors: [{ code: '407', message: expect.stringContaining('nfce-cscs') }] });
    } finally {
      sefaz.controle.recusarQrV3 = false;
    }
  });

  it('E-3/E-8: 407 grava o flag ANTES do reenvio v2; resposta perdida ⇒ a consulta seguinte remonta o nfeProc com o QR v2, não o v3', async () => {
    sefaz.controle.recusarQrV3 = true;
    try {
      const p = nova();
      const chave = p.infNFe.Id.slice(3);
      const csc = { id: '000001', csc: 'A1B2C3D4E5F6G7H8I9J0' };
      let gravado = 0;
      const marcarQrV3Recusado = async () => {
        gravado += 1;
        sefaz.controle.perderRespostaAutorizacao = true; // a resposta do reenvio v2 se perde depois do flag gravado
      };
      sefaz.controle.perderRespostaAutorizacao = false;
      await expect(
        emissor.emitir({ kind: 'NFCE', ref: 'd:1', ambiente: 'homologacao', cnpjEmitente: p.infNFe.emit.CNPJ, partnerAccountRef: null, payload: p, ctx: { ...ctx, csc: { ...csc, marcarQrV3Recusado } } }),
      ).rejects.toBeInstanceOf(SefazTransporteError);
      expect(gravado).toBe(1);
      sefaz.controle.perderRespostaAutorizacao = false;
      const r = await emissor.consultar(chave, { ...ctx, payload: p, csc: { ...csc, qrV3Recusado: true } });
      expect(r.status).toBe('AUTHORIZED');
      const xml = r.xml!.toString('utf8');
      expect(xml).toContain(`?p=${chave}|2|2|1|${hashQrCodeV2(chave, 2, '1', csc.csc)}</qrCode>`);
      expect(xml).not.toContain(`?p=${chave}|3|2`);
      expect(xml).not.toContain(csc.csc);
    } finally {
      sefaz.controle.recusarQrV3 = false;
    }
  });

  it('E-3: com o flag já gravado a emissão sai direto em v2 (uma só chamada) e sem o flag a consulta segue em v3', async () => {
    const csc = { id: '000001', csc: 'A1B2C3D4E5F6G7H8I9J0' };
    sefaz.controle.recusarQrV3 = true;
    try {
      const p = nova();
      const chave = p.infNFe.Id.slice(3);
      const antes = sefaz.controle.chamadas.length;
      const r = await emissor.emitir({ kind: 'NFCE', ref: 'd:1', ambiente: 'homologacao', cnpjEmitente: p.infNFe.emit.CNPJ, partnerAccountRef: null, payload: p, ctx: { ...ctx, csc: { ...csc, qrV3Recusado: true } } });
      expect(r.status).toBe('AUTHORIZED');
      expect(sefaz.controle.chamadas.slice(antes).map((c) => c.servico)).toEqual(['NFeAutorizacao4']);
      expect(r.xml!.toString('utf8')).toContain(`?p=${chave}|2|2|1|`);
    } finally {
      sefaz.controle.recusarQrV3 = false;
    }
    const q = nova();
    await emitir(q);
    const c = await emissor.consultar(q.infNFe.Id.slice(3), { ...ctx, payload: q, csc });
    expect(c.xml!.toString('utf8')).toContain(`?p=${q.infNFe.Id.slice(3)}|3|2`);
  });

  it('faltantesDoEnvio: UF sem URL oficial do QR Code ou sem webservice ⇒ faltante nomeado; SP homologação passa', () => {
    expect(emissor.faltantesDoEnvio('NFCE', '35', 'homologacao')).toEqual([]);
    expect(emissor.faltantesDoEnvio('NFCE', '12', 'homologacao').join(' ')).toMatch(/AC\/homologacao sem URL oficial do QR Code/);
    expect(emissor.faltantesDoEnvio('NFE', '12', 'homologacao')).toEqual([]); // a NF-e 55 não tem QR Code
    expect(emissor.faltantesDoEnvio('NFCE', '99', 'homologacao')).toEqual(['UF do emitente desconhecida (cUF 99)']);
  });
});
