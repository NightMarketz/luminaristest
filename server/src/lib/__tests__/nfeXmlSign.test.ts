import { generateKeyPairSync } from 'node:crypto';
import { serializeNfe, IDE_ORDER, partesDaChave } from '../nfeXml';
import { assinarEnveloped, digestValueDe } from '../dfeXmlSign';
import { verifyNfeSignature } from '../nfeSignature';
import { PscAssinador, HASH_OID } from '../../features/accounting/dfe/psc/PscAssinador';
import { FakePscServer } from '../../features/accounting/dfe/psc/FakePscServer';
import type { CredencialPscResolvida } from '../../features/accounting/dfe/AssinadorRemotoPort';
import { nfceNumerada } from '../../features/accounting/models/__tests__/nfeMontagem.fixture';
import { makeTestCert } from '../../../test/helpers/nfeSignature';

/**
 * X10a PR-7 — EMENDA-1 item E-2 + BRIEF PSC itens E-7/E-8: a NF-e serializada e assinada pelo PSC (falso, API v0 do
 * DOC-ICP-17.01) passa no `verifyNfeSignature` EXISTENTE, o verificador do import — a ida e a volta usam código já provado.
 */
const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;

describe('serializeNfe + assinarEnveloped pelo PSC', () => {
  const payload = nfceNumerada();
  const cnpj = payload.infNFe.emit.CNPJ;
  const certPem = makeTestCert({ cnpj }, key);
  const psc = new FakePscServer({ key, certPem, titularCnpj: cnpj });
  let cred: CredencialPscResolvida;

  beforeAll(async () => {
    const baseUrl = await psc.start();
    cred = { pscProviderId: 'p1', baseUrl, accessToken: psc.emitirToken(), titularCnpj: cnpj, certificadoPem: certPem, escopo: ['NFE', 'NFCE'] };
  });
  afterAll(() => psc.stop());

  const assinar = async (xml: string) => {
    const assinador = new PscAssinador(2_000);
    return assinarEnveloped(xml, { signedLocalName: 'infNFe' }, certPem, async (digest) => {
      const r = await assinador.assinarHash(digest, 'sha1', 'NFCE', cred);
      if (!r.ok) throw new Error(r.code);
      return r.signatureValueB64;
    });
  };

  it('o XML tem namespace, Id/versao como atributos e o ide na ordem do leiaute (B02…B27)', () => {
    const xml = serializeNfe(payload);
    expect(xml.startsWith('<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe')).toBe(true);
    expect(xml).toContain('versao="4.00"');
    const ide = /<ide>(.*?)<\/ide>/.exec(xml)![1];
    const nomes = Array.from(ide.matchAll(/<(\w+)>/g)).map((m) => m[1]);
    expect(nomes).toEqual(IDE_ORDER.filter((k) => nomes.includes(k)));
    expect(nomes.indexOf('cNF')).toBe(1);
    expect(xml.indexOf('<dest>') === -1 || xml.indexOf('<dest>') < xml.indexOf('<det nItem="1">')).toBe(true);
    expect(xml.indexOf('<det nItem="1">')).toBeLessThan(xml.indexOf('<total>'));
  });

  it('assinado pelo PSC falso (SHA-1 por OID), verifica no verifyNfeSignature existente', async () => {
    const assinado = await assinar(serializeNfe(payload));
    const check = verifyNfeSignature(assinado);
    expect(check.certSubjectCnpj).toBe(cnpj);
    expect(psc.controle.algoritmosRecebidos.at(-1)).toBe(HASH_OID.sha1);
    expect(digestValueDe(assinado)).toMatch(/^[A-Za-z0-9+/]{27}=$/);
  });

  it('1 byte do infNFe alterado depois de assinar ⇒ o verificador recusa', async () => {
    const assinado = await assinar(serializeNfe(payload));
    const adulterado = assinado.replace(/<vNF>([^<]+)<\/vNF>/, (_, v: string) => `<vNF>${v.replace(/\d$/, (d) => String((Number(d) + 1) % 10))}</vNF>`);
    expect(() => verifyNfeSignature(adulterado)).toThrow(/não confere/);
  });

  it('a assinatura é determinística: mesmo payload ⇒ mesmo XML assinado (recuperação re-assina, EMENDA-1 E-8)', async () => {
    expect(await assinar(serializeNfe(payload))).toBe(await assinar(serializeNfe(payload)));
  });

  it('partesDaChave lê UF, CNPJ, modelo, série e número da chave', () => {
    const chave = payload.infNFe.Id.slice(3);
    const p = partesDaChave(chave);
    expect(p).toMatchObject({ uf: 'SP', modelo: 65, nNF: payload.infNFe.ide.nNF, serie: payload.infNFe.ide.serie, cnpj });
  });
});

describe('PscAssinador — erros mapeados (BRIEF PSC E-8)', () => {
  const certPem = makeTestCert({ cnpj: '12345678000195' }, key);
  const psc = new FakePscServer({ key, certPem });
  let cred: CredencialPscResolvida;
  beforeAll(async () => {
    const baseUrl = await psc.start();
    cred = { pscProviderId: 'p1', baseUrl, accessToken: psc.emitirToken(), titularCnpj: '12345678000195', certificadoPem: certPem, escopo: ['NFCE'] };
  });
  afterAll(() => psc.stop());
  afterEach(() => {
    psc.controle.statusAssinatura = null;
    psc.controle.atrasoAssinaturaMs = 0;
  });
  const digest = Buffer.alloc(20, 1).toString('base64');

  it.each([
    [401, 'CREDENCIAL_EXPIRADA'],
    [403, 'CREDENCIAL_REVOGADA'],
    [429, 'COTA_ESGOTADA'],
    [503, 'PSC_INDISPONIVEL'],
  ])('HTTP %i ⇒ %s', async (status, code) => {
    psc.controle.statusAssinatura = status;
    expect(await new PscAssinador().assinarHash(digest, 'sha1', 'NFCE', cred)).toMatchObject({ ok: false, code });
  });

  it('timeout ⇒ PSC_INDISPONIVEL', async () => {
    psc.controle.atrasoAssinaturaMs = 300;
    expect(await new PscAssinador(50).assinarHash(digest, 'sha1', 'NFCE', cred)).toMatchObject({ ok: false, code: 'PSC_INDISPONIVEL' });
  });

  it('tipo fora do escopo da credencial ⇒ FORA_DO_ESCOPO sem chamar o PSC', async () => {
    const antes = psc.controle.assinaturas;
    expect(await new PscAssinador().assinarHash(digest, 'sha1', 'NFE', cred)).toMatchObject({ ok: false, code: 'FORA_DO_ESCOPO' });
    expect(psc.controle.assinaturas).toBe(antes);
  });

  it('o PSC falso recusa NODE_ENV=production', () => {
    const antes = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => new FakePscServer({ key, certPem })).toThrow(/production/);
    } finally {
      process.env.NODE_ENV = antes;
    }
  });
});
