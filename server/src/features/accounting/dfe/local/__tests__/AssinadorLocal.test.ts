import { generateKeyPairSync } from 'node:crypto';
import { FakeSefaz, makeTlsPki } from '../../../../../../test/helpers/fakeSefaz';
import { makeTestCert } from '../../../../../../test/helpers/nfeSignature';
import { verifyNfeSignature } from '../../../../../lib/nfeSignature';
import { AssinaturaRemotaError, isAssinaturaPendente } from '../../AssinadorRemotoPort';
import { isFalhaDeComunicacao, type DfeCallContext } from '../../DfeEmissorPort';
import { SefazNfeEmissor, releituraNfe } from '../../sefaz/SefazNfeEmissor';
import { SefazTransporteError } from '../../sefaz/SefazSoapClient';
import { AssinadorLocalSigner, AssinadorLocalTransporte } from '../AssinadorLocal';
import { caixaFalso, derB64, sha1B64, thumbprintDe, type CaixaFalso } from '../../../../../../test/helpers/fakeAssinadorLocal';
import { DfeSignerConteudoSchema } from '../../../dtos/DfeSignerDto';
import { inputNfce, nfceNumerada } from '../../../models/__tests__/nfeMontagem.fixture';
import { montarNfe, numerarNfe } from '../../../models/nfeMontagem';
import { emContingencia } from '../../../models/nfceContingencia';
import type { NfePayload } from '../../../dtos/NfePayloadDto';

/**
 * X10a EMENDA-4 AL-8, AL-9, AL-10 e L-AL-1 — os adaptadores do assinador local contra um ASSINADOR FALSO em processo (a
 * fila responde como o caixa responderia) e a SEFAZ falsa (HTTPS com TLS mútuo). O falso RECONFERE o conteúdo como o
 * assinador real (AL-19): sha1 do `SignedInfo` = hash pedido, sha1 do elemento = `DigestValue`, CNPJ e `tpAmb`. Assinado
 * por ele, o XML passa no `verifyNfeSignature` existente — a prova de ida e volta com código já provado.
 */
const pki = makeTlsPki();
const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;

describe('X10a EMENDA-4 — assinador local (AL-8, AL-9, AL-10, L-AL-1)', () => {
  const sefaz = new FakeSefaz(pki);
  const cnpj = nfceNumerada().infNFe.emit.CNPJ;
  const certPem = makeTestCert({ cnpj }, key);
  const thumb = thumbprintDe(certPem);
  let caixa: CaixaFalso;
  let ctx: DfeCallContext;
  let emissor: SefazNfeEmissor;
  let seq = 1;
  const nova = (): NfePayload => {
    const n = 300 + seq++;
    return numerarNfe(montarNfe(inputNfce({ ambiente: 'homologacao' })), n, String(48151623 + n));
  };
  const emitir = (payload: NfePayload) =>
    emissor.emitir({ kind: 'NFCE', ref: 'd:1', ambiente: 'homologacao', cnpjEmitente: cnpj, partnerAccountRef: null, payload, ctx });

  beforeAll(async () => {
    await sefaz.start();
  });
  afterAll(async () => {
    await sefaz.stop();
  });
  beforeEach(() => {
    caixa = caixaFalso({ key, certPem, cnpj, tpAmb: '2', pki });
    ctx = {
      ambiente: 'homologacao',
      assinatura: {
        assinador: new AssinadorLocalSigner(caixa, { dispositivoId: 'd1', certThumbprint: thumb, timeoutMs: 2_000 }),
        // A credencial do assinador local não leva certificado: ele volta com a assinatura (L-AL-1).
        credencial: { pscProviderId: 'assinador-local', baseUrl: '', accessToken: '', titularCnpj: cnpj, certificadoPem: '', escopo: ['NFE', 'NFCE'] },
        transporte: new AssinadorLocalTransporte(caixa, { dispositivoId: 'd1', timeoutMs: 2_000 }),
      },
    };
    // O transporte do adaptador NÃO é usado: tudo sai pelo transporte do contexto (o caixa).
    emissor = new SefazNfeEmissor({
      ambiente: 'homologacao',
      assinador: 'local',
      endpoint: sefaz.endpoint,
      soap: { call: () => Promise.reject(new Error('transporte do servidor não deveria ser chamado')) },
    });
    sefaz.controle.cStatAutorizacao = null;
  });

  it('AL-8 + AL-9 + L-AL-1: o caixa reconfere, assina e transmite; o XML autorizado passa no verifyNfeSignature com o certificado que voltou', async () => {
    const p = nova();
    const r = await emitir(p);
    expect(r.status).toBe('AUTHORIZED');
    const xml = r.xml!.toString('utf8');
    expect(() => verifyNfeSignature(xml)).not.toThrow();
    expect(releituraNfe(xml, p)).toEqual([]);
    expect(xml).toContain(`<X509Certificate>${derB64(certPem)}</X509Certificate>`);
    expect(xml).not.toContain('CERTIFICADO-TARDIO');
    expect(caixa.tarefas.map((t) => t.tipo)).toEqual(['ASSINAR', 'TRANSMITIR']);
  });

  it('AL-19 no falso: o elemento com tpAmb de outro ambiente é recusado pelo caixa ⇒ CONTEUDO_RECUSADO, nada transmitido', async () => {
    const p = numerarNfe(montarNfe(inputNfce()), 999, '48152622'); // tpAmb 1 (produção) num emissor de homologação
    await expect(emitir(p)).rejects.toMatchObject({ code: 'CONTEUDO_RECUSADO' });
    expect(caixa.tarefas.map((t) => t.tipo)).toEqual(['ASSINAR']);
  });

  it('AL-10: o ASSINAR leva o elemento canonicalizado, o SignedInfo, a chave e o tpAmb — no contrato §4.2', async () => {
    const p = nova();
    await emitir(p);
    const t = caixa.tarefas[0];
    expect(t.tipo).toBe('ASSINAR');
    if (t.tipo !== 'ASSINAR') return;
    expect(DfeSignerConteudoSchema.parse(t.conteudo)).toMatchObject({ alvo: 'infNFe', chave: p.infNFe.Id.slice(3), tpAmb: '2' });
    expect(t.conteudo.elementoXml!.startsWith('<infNFe xmlns="http://www.portalfiscal.inf.br/nfe"')).toBe(true);
  });

  it('AL-10 + L-AL-5: a inutilização vai sem chave (o infInut não tem) e o caixa reconfere o elemento', async () => {
    const r = await emissor.inutilizar({ kind: 'NFCE', ambiente: 'homologacao', cnpjEmitente: cnpj, partnerAccountRef: null, ano: 2026, serie: 1, nIni: 10n, nFin: 12n, xJust: 'Falha de sistema na numeracao', uf: 'SP', ctx });
    expect(r.status).toBe('HOMOLOGATED');
    const t = caixa.tarefas[0];
    if (t.tipo !== 'ASSINAR') throw new Error('esperava ASSINAR');
    expect(t.conteudo.alvo).toBe('infInut');
    expect(t.conteudo.chave).toBeUndefined();
    expect(() => DfeSignerConteudoSchema.parse({ ...t.conteudo, alvo: 'infNFe' })).toThrow(); // fora do infInut a chave é obrigatória
  });

  it('AL-10: o QR Code v3 off-line manda a base dos parâmetros 1–7 (o caixa reconfere o sha1)', async () => {
    const base = montarNfe(inputNfce({ ambiente: 'homologacao' }));
    const p = numerarNfe(emContingencia(base, { dhEmi: base.infNFe.ide.dhEmi, dhCont: base.infNFe.ide.dhEmi, xJust: 'Sem comunicacao com a SEFAZ' }), 777, '48151700');
    const supl = await emissor.montarContingencia(p, ctx, 3);
    expect(supl.qrCode).toMatch(/\|/);
    const qr = caixa.tarefas.find((t) => t.tipo === 'ASSINAR' && t.conteudo.alvo === 'qrCodeV3Offline');
    if (!qr || qr.tipo !== 'ASSINAR') throw new Error('esperava o ASSINAR do QR v3');
    expect(qr.conteudo).toMatchObject({ chave: p.infNFe.Id.slice(3), tpAmb: '2' });
    expect(sha1B64(Buffer.from(qr.conteudo.baseQrB64!, 'base64'))).toBe(qr.digestB64);
  });

  describe('AL-8 — mapa ASSINAR → AssinaturaErro', () => {
    const assinar = () =>
      ctx.assinatura!.assinador.assinarHash('aGFzaA==', 'sha1', 'NFCE', ctx.assinatura!.credencial, { alvo: 'infNFe', elementoXml: '<x/>', signedInfoC14nB64: 'eA==', chave: '1'.repeat(44), tpAmb: '2' });
    it.each([
      ['TOKEN_AUSENTE', 'ASSINADOR_INDISPONIVEL'],
      ['PIN_CANCELADO', 'ASSINADOR_INDISPONIVEL'],
      ['CERT_VENCIDO', 'ASSINADOR_INDISPONIVEL'],
      ['CONTEUDO_RECUSADO', 'CONTEUDO_RECUSADO'],
    ] as const)('%s ⇒ %s', async (code, esperado) => {
      caixa.responder = async () => ({ ok: false, code, message: 'x' });
      expect(await assinar()).toMatchObject({ ok: false, code: esperado });
    });
    it('sem resposta no prazo ⇒ ASSINADOR_INDISPONIVEL (a nota espera, F-AL-6 a)', async () => {
      caixa.responder = async () => 'ENTREGUE';
      expect(await assinar()).toMatchObject({ ok: false, code: 'ASSINADOR_INDISPONIVEL' });
    });
    it('L-AL-1: certificado que assinou ≠ certificado do pareamento ⇒ CONTEUDO_RECUSADO', async () => {
      const outro = makeTestCert({ cnpj }, generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey);
      caixa.responder = async () => ({ ok: true, tipo: 'ASSINAR', signatureValueB64: 'c2ln', certificadoDerB64: derB64(outro) });
      expect(await assinar()).toMatchObject({ ok: false, code: 'CONTEUDO_RECUSADO' });
    });
    it('F-AL-5 b: pedido sem conteúdo não sai do servidor', async () => {
      expect(await ctx.assinatura!.assinador.assinarHash('aGFzaA==', 'sha1', 'NFCE', ctx.assinatura!.credencial)).toMatchObject({ ok: false, code: 'CONTEUDO_RECUSADO' });
      expect(caixa.tarefas).toHaveLength(0);
    });
  });

  describe('AL-9 — mapa TRANSMITIR → SefazTransporteError (um a um)', () => {
    const call = () => ctx.assinatura!.transporte!.call(sefaz.endpoint('SP', 65, 'homologacao', 'NFeStatusServico4'), 'NFeStatusServico4', '<x/>');
    it.each([
      ['TLS', 'sefaz_tls'],
      ['TIMEOUT', 'sefaz_timeout'],
      ['REDE', 'sefaz_timeout'],
      ['HTTP', 'sefaz_http'],
    ] as const)('%s ⇒ %s (falha de comunicação: liga a contingência)', async (code, esperado) => {
      caixa.responder = async () => ({ ok: false, code, message: 'x' });
      const e = await call().catch((x: unknown) => x);
      expect(e).toBeInstanceOf(SefazTransporteError);
      expect((e as SefazTransporteError).code).toBe(esperado);
      expect(isFalhaDeComunicacao(e)).toBe(true);
    });
    it('corpo sem nfeResultMsg ⇒ sefaz_resposta_ilegivel; 500 sem nfeResultMsg ⇒ sefaz_http', async () => {
      caixa.responder = async () => ({ ok: true, tipo: 'TRANSMITIR', httpStatus: 200, corpoB64: Buffer.from('<html/>').toString('base64') });
      expect(await call().catch((x: SefazTransporteError) => x.code)).toBe('sefaz_resposta_ilegivel');
      caixa.responder = async () => ({ ok: true, tipo: 'TRANSMITIR', httpStatus: 503, corpoB64: Buffer.from('<html/>').toString('base64') });
      expect(await call().catch((x: SefazTransporteError) => x.code)).toBe('sefaz_http');
    });
    it.each(['TOKEN_AUSENTE', 'PIN_CANCELADO', 'CERT_VENCIDO'] as const)('%s ⇒ ASSINADOR_INDISPONIVEL, que NÃO é falha de comunicação (não entra em CONTINGENCY)', async (code) => {
      caixa.responder = async () => ({ ok: false, code, message: 'x' });
      const e = await call().catch((x: unknown) => x);
      expect(e).toBeInstanceOf(AssinaturaRemotaError);
      expect(isFalhaDeComunicacao(e)).toBe(false);
      expect(isAssinaturaPendente(e)).toBe(true);
    });
    it('transmissão nunca entregue ao caixa (sem resposta) ⇒ ASSINADOR_INDISPONIVEL, não contingência: nada saiu para a SEFAZ', async () => {
      caixa.responder = async () => 'NAO_ENTREGUE';
      const e = await call().catch((x: unknown) => x);
      expect([e instanceof AssinaturaRemotaError && e.code, isFalhaDeComunicacao(e)]).toEqual(['ASSINADOR_INDISPONIVEL', false]);
    });
    it('AL-9 (defeito): transmissão entregue ao caixa sem resposta ⇒ sefaz_timeout (comunicação, a consulta usa a mesma chave), nunca ASSINADOR_INDISPONIVEL', async () => {
      caixa.responder = async () => 'ENTREGUE';
      const e = await call().catch((x: unknown) => x);
      expect([e instanceof SefazTransporteError && e.code, isFalhaDeComunicacao(e)]).toEqual(['sefaz_timeout', true]);
    });
    it('HOST_FORA_DA_LISTA ⇒ erro nosso (tabela e lista divergiram), não falha de comunicação', async () => {
      caixa.responder = async () => ({ ok: false, code: 'HOST_FORA_DA_LISTA', message: 'x' });
      const e = await call().catch((x: unknown) => x);
      expect([String(e), isFalhaDeComunicacao(e)]).toEqual([expect.stringContaining('dfe_assinador_host_fora_da_lista'), false]);
    });
  });
});
