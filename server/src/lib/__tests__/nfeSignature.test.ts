/**
 * SIG-NFE (BE-INCR-NFE-SIGNATURE B2/B3/B5/B6) — `verifyNfeSignature` e sua ligação no `parseNfe` (B4). Cada caso
 * cita a chave `[SIG-…]` de `docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md`.
 * As notas são assinadas pelo helper de teste (F-SIG-4 b): o caminho de verificação é o de produção, sem skip.
 */
import { generateKeyPairSync } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { verifyNfeSignature } from '../nfeSignature';
import { parseNfe } from '../nfe';
import { ValidationError } from '../errors';
import { makeTestCert, signNfeForTest } from '@test/helpers/nfeSignature';

const FIXTURE_DIR = join(__dirname, 'fixtures', 'nfe');
const PURCHASE = readFileSync(join(FIXTURE_DIR, 'purchase-multi-item.SYNTHETIC.xml'), 'utf8');
const ID = 'NFe35250712345678000195550010000000011000000012';
const SIGNED = signNfeForTest(PURCHASE);

const rejects = (xml: string, reason: RegExp) => {
  expect(() => verifyNfeSignature(xml)).toThrow(ValidationError);
  expect(() => verifyNfeSignature(xml)).toThrow(reason);
};
const signatureBlock = (xml: string) => /<Signature xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#">[\s\S]*?<\/Signature>/.exec(xml)![0];

describe('verifyNfeSignature — caminho feliz', () => {
  it.each(['purchase-multi-item', 'purchase-pis-cofins', 'sale'])('fixture %s commitado verifica (B9)', (name) => {
    const xml = readFileSync(join(FIXTURE_DIR, `${name}.SYNTHETIC.xml`), 'utf8');
    expect(verifyNfeSignature(xml).status).toBe('valid');
  });

  it('devolve os fatos do certificado — CNPJ do OtherName e validade por reslice [SIG-CERT-CNPJ-OID]', () => {
    expect(verifyNfeSignature(SIGNED)).toEqual({
      status: 'valid',
      certSubjectCnpj: '12345678000195',
      certNotBefore: '2020-01-01',
      certNotAfter: '2049-12-31',
    });
  });

  it('assinatura com os parâmetros do MOC [SIG-C14N] [SIG-ALG] [SIG-DIGEST] [SIG-TRANSFORMS] [SIG-REF-URI]', () => {
    const block = signatureBlock(SIGNED);
    expect(block).toContain('<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>');
    expect(block).toContain('<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>');
    expect(block).toContain(`<Reference URI="#${ID}">`);
    expect(block).toContain('<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>');
  });
});

describe('verifyNfeSignature — B2 integridade', () => {
  it('valor adulterado DEPOIS de assinar → não confere', () => {
    rejects(SIGNED.replace('<vNF>', '<vNF>1'), /não confere/);
  });

  it('SignatureValue de uma chave e certificado de OUTRA → não confere', () => {
    const outra = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    const certDaOutra = makeTestCert({ cnpj: '12345678000195' }, outra);
    rejects(signNfeForTest(PURCHASE, { certPem: certDaOutra }), /não confere/);
  });

  it('X509Certificate que não é certificado → rejeita [SIG-X509]', () => {
    rejects(SIGNED.replace(/<X509Certificate>[^<]+<\/X509Certificate>/, '<X509Certificate>QUFBQQ==</X509Certificate>'), /X\.509/);
  });

  it('protNFe fica FORA do escopo assinado: mexer no protocolo não quebra a assinatura [SIG-REF-URI]', () => {
    expect(verifyNfeSignature(SIGNED.replace('<nProt>', '<nProt>9')).status).toBe('valid');
  });
});

describe('verifyNfeSignature — B6 nota sem assinatura (F-SIG-1 a)', () => {
  it('sem <Signature> → rejeita', () => {
    rejects(SIGNED.replace(signatureBlock(SIGNED), ''), /ausente/);
  });

  it('<Signature> de outro namespace não conta como assinatura', () => {
    rejects(SIGNED.replace(signatureBlock(SIGNED), '<Signature/>'), /ausente/);
  });
});

describe('verifyNfeSignature — B3 defesa contra signature wrapping', () => {
  it('2 <Signature> sob <NFe> → rejeita [SIG-ENVELOPED]', () => {
    const block = signatureBlock(SIGNED);
    rejects(SIGNED.replace(block, block + block), /encontradas 2/);
  });

  it('<Signature> não filha direta de <NFe> → rejeita [SIG-ENVELOPED]', () => {
    const block = signatureBlock(SIGNED);
    rejects(SIGNED.replace(block, `<infAdic>${block}</infAdic>`), /filha direta/);
  });

  it('2 <Reference> → rejeita [SIG-REF-1]', () => {
    const ref = /<Reference [\s\S]*?<\/Reference>/.exec(SIGNED)![0];
    rejects(SIGNED.replace(ref, ref + ref), /Reference/);
  });

  it('Reference URI que não aponta para o infNFe lido → rejeita [SIG-REF-URI]', () => {
    rejects(SIGNED.replace(`URI="#${ID}"`, 'URI="#NFe1"'), /não aponta/);
    rejects(SIGNED.replace(`URI="#${ID}"`, 'URI=""'), /não aponta/);
  });

  it('XSW clássico: infNFe original copiado para fora e o de <NFe> adulterado → @Id repetido, rejeita', () => {
    const original = /<infNFe [\s\S]*?<\/infNFe>/.exec(SIGNED)![0];
    const adulterado = original.replace('<vNF>', '<vNF>9');
    const xsw = SIGNED.replace(original, adulterado).replace('</SignatureValue>', `</SignatureValue><Object>${original}</Object>`);
    rejects(xsw, /repetido/);
  });

  it('Transforms fora do MOC → rejeita (só c14n · ordem invertida · c14n com comentários) [SIG-TRANSFORMS]', () => {
    const enveloped = '<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>';
    const c14n = '<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>';
    rejects(SIGNED.replace(enveloped, ''), /Transforms/);
    rejects(SIGNED.replace(enveloped + c14n, c14n + enveloped), /Transforms/);
    rejects(SIGNED.replace(c14n, '<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments"/>'), /Transforms/);
  });

  it('algoritmos fora do MOC → rejeita [SIG-C14N] [SIG-ALG] [SIG-DIGEST]', () => {
    rejects(SIGNED.replace('CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"', 'CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"'), /CanonicalizationMethod/);
    rejects(SIGNED.replace('xmldsig#rsa-sha1', 'xmldsig-more#rsa-sha256'), /SignatureMethod/);
    rejects(SIGNED.replace('DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"', 'DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"'), /DigestMethod/);
  });
});

const EMIT_CPF = '18564071878';
/** Emitente pessoa física (série 920–969, aplicativo do contribuinte) [SIG-SERIE-NFAE]. */
const PURCHASE_PF = PURCHASE.replace('<CNPJ>12345678000195</CNPJ>', `<CPF>${EMIT_CPF}</CPF>`);
/** NFA-e emitida no site do Fisco, assinada pelo e-CNPJ da SEFAZ [SIG-SERIE-NFAE]. */
const nfae = (xml: string) => xml.replace('<tpAmb>1</tpAmb>', '<tpAmb>1</tpAmb><procEmi>1</procEmi>');
const CNPJ_SEFAZ = '46377222000129';

describe('verifyNfeSignature — B5 certificado (F-SIG-3 b + emenda 26/09)', () => {
  it('certificado sem CNPJ e sem CPF no OtherName → rejeita [SIG-REJ-292]', () => {
    rejects(signNfeForTest(PURCHASE, { cnpj: undefined }), /sem CNPJ\/CPF/);
  });

  it('CNPJ de OUTRA empresa (raiz diferente) → rejeita [SIG-REJ-213]', () => {
    rejects(signNfeForTest(PURCHASE, { cnpj: '98765432000198' }), /CNPJ-base do emitente .* difere/);
  });

  it('CNPJ de OUTRO estabelecimento da mesma empresa (mesma raiz, filial 0002) → aceita [SIG-CERT-CNPJ]', () => {
    expect(verifyNfeSignature(signNfeForTest(PURCHASE, { cnpj: '12345678000276' })).certSubjectCnpj).toBe('12345678000276');
  });

  it('OtherName em PrintableString é lido; UTF8String não (DOC-ICP-04 7.1.2.2 a) [SIG-OTHERNAME-TIPO]', () => {
    expect(verifyNfeSignature(signNfeForTest(PURCHASE, { encoding: 'printable' })).status).toBe('valid');
    rejects(signNfeForTest(PURCHASE, { encoding: 'utf8' }), /sem CNPJ\/CPF/);
  });

  it('OtherName fora de A–Z/0–9 ou todo-zero conta como ausente (DOC-ICP-04 7.1.2.2 b/g) [SIG-OTHERNAME-TIPO]', () => {
    rejects(signNfeForTest(PURCHASE, { cnpj: '12345678/00019' }), /sem CNPJ\/CPF/);
    rejects(signNfeForTest(PURCHASE, { cnpj: '00000000000000' }), /sem CNPJ\/CPF/);
  });

  it('dhEmi (2025-07-10) fora da validade → rejeita; bordas do dia são inclusivas [SIG-CERT-VALIDADE]', () => {
    rejects(signNfeForTest(PURCHASE, { notBefore: '2025-07-11' }), /fora da validade/);
    rejects(signNfeForTest(PURCHASE, { notAfter: '2025-07-09' }), /fora da validade/);
    expect(verifyNfeSignature(signNfeForTest(PURCHASE, { notBefore: '2025-07-10', notAfter: '2025-07-10' })).status).toBe('valid');
  });

  it('validade em GeneralizedTime (≥ 2050) é lida por reslice', () => {
    expect(verifyNfeSignature(signNfeForTest(PURCHASE, { notAfter: '2051-03-04' })).certNotAfter).toBe('2051-03-04');
  });

  it('e-CPF: CPF do certificado (OID 2.16.76.1.3.1, posições 9–19) = emit/CPF → aceita [SIG-REJ-227]', () => {
    expect(verifyNfeSignature(signNfeForTest(PURCHASE_PF))).toMatchObject({ status: 'valid', certSubjectCpf: EMIT_CPF });
  });

  it('e-CPF de OUTRA pessoa → rejeita [SIG-REJ-227]', () => {
    rejects(signNfeForTest(PURCHASE_PF, { cpf: '52998224725' }), /CPF do emitente .* difere do CPF do certificado/);
  });

  it('e-CPF assinando nota de emitente CNPJ → rejeita [SIG-REJ-227]', () => {
    rejects(signNfeForTest(PURCHASE, { cpf: EMIT_CPF }), /CPF do emitente \(CNPJ 12345678000195\) difere/);
  });

  it('e-CNPJ assinando nota de emitente CPF → rejeita [SIG-REJ-213]', () => {
    rejects(signNfeForTest(PURCHASE_PF, { cnpj: '12345678000195' }), /CNPJ-base do emitente \(CPF .*\) difere/);
  });

  it('o CPF do RESPONSÁVEL do e-CNPJ (OID 2.16.76.1.3.4) não vale como e-CPF do emitente [SIG-CERT-CPF-OID]', () => {
    rejects(signNfeForTest(PURCHASE_PF, { cnpj: '12345678000195', responsavelCpf: EMIT_CPF }), /CNPJ-base do emitente/);
    rejects(signNfeForTest(PURCHASE_PF, { cnpj: undefined, responsavelCpf: EMIT_CPF }), /sem CNPJ\/CPF/);
  });
});

describe('verifyNfeSignature — NFA-e assinada pela SEFAZ (procEmi=1, decisão do dono 26/09 → c)', () => {
  it('e-CNPJ da SEFAZ (outra raiz) → aceita, emitente CNPJ ou CPF [SIG-SERIE-NFAE]', () => {
    expect(verifyNfeSignature(signNfeForTest(nfae(PURCHASE), { cnpj: CNPJ_SEFAZ })).certSubjectCnpj).toBe(CNPJ_SEFAZ);
    expect(verifyNfeSignature(signNfeForTest(nfae(PURCHASE_PF), { cnpj: CNPJ_SEFAZ })).status).toBe('valid');
  });

  it('continua exigindo certificado com CNPJ/CPF e dhEmi na validade [SIG-REJ-292] [SIG-REJ-291]', () => {
    rejects(signNfeForTest(nfae(PURCHASE), { cnpj: undefined }), /sem CNPJ\/CPF/);
    rejects(signNfeForTest(nfae(PURCHASE), { cnpj: CNPJ_SEFAZ, notAfter: '2025-07-09' }), /fora da validade/);
  });

  it('controle: a MESMA nota sem procEmi=1 e o mesmo certificado → rejeita pela 213', () => {
    rejects(signNfeForTest(PURCHASE, { cnpj: CNPJ_SEFAZ }), /CNPJ-base do emitente/);
  });
});

describe('parseNfe — B4 a verificação roda antes de qualquer campo', () => {
  it('nota adulterada é recusada pela assinatura antes do gate que ela violaria', () => {
    expect(() => parseNfe(SIGNED.replace('<mod>55</mod>', '<mod>65</mod>'))).toThrow(/assinatura digital não confere/);
  });

  it('parseNfe não tem opção que desligue a verificação (F-SIG-4 b)', () => {
    const semAssinatura = SIGNED.replace(signatureBlock(SIGNED), '');
    expect(() => parseNfe(semAssinatura, { allowHomologacao: true })).toThrow(/ausente/);
  });
});
