import { UFS } from '../sefazConfig';
import {
  InfNFeSuplSchema,
  NFCE_QRCODE_DESABILITADAS,
  NFCE_QRCODE_URLS,
  comInfNFeSupl,
  hashQrCodeV2,
  qrCodeV2Online,
  qrCodeV3Online,
  urlsNfce,
} from '../nfceQrCode';

/**
 * X10a PR-8 — QR Code da NFC-e (EMENDA-1 E-3, F-NFCE-E1-4 c). Vetores do Manual do DANFE NFC-e e QR Code v6.0 (D01
 * §4.3.6.1), conferidos na transcrição de 29/10/2026: o CSC que gera o vetor é "SEU-CODIGO-CSC-CONTRIBUINTE-36-CARACTERES".
 */
const CHAVE_MANUAL = '28170800156225000131650110000151341562040824';
const CSC_MANUAL = 'SEU-CODIGO-CSC-CONTRIBUINTE-36-CARACTERES';

describe('nfceQrCode', () => {
  it('v2 on-line: o hash do vetor do manual (D01 §4.3.6.1) — DC6AE2C2…7511, idCSC "000001" sem zeros não significativos', () => {
    expect(hashQrCodeV2(CHAVE_MANUAL, 1, '1', CSC_MANUAL)).toBe('DC6AE2C2B9A992BE59679AC365E29922DE6B7511');
    expect(hashQrCodeV2(CHAVE_MANUAL, 1, '000001', CSC_MANUAL)).toBe('DC6AE2C2B9A992BE59679AC365E29922DE6B7511');
    expect(qrCodeV2Online('http://www.sefazexemplo.gov.br/nfce/qrcode', CHAVE_MANUAL, 1, { id: '000001', csc: CSC_MANUAL })).toBe(
      'http://www.sefazexemplo.gov.br/nfce/qrcode?p=28170800156225000131650110000151341562040824|2|1|1|DC6AE2C2B9A992BE59679AC365E29922DE6B7511',
    );
  });

  it('v2: sem o "SEU-" o hash NÃO bate (o falsificador do vetor) e idCSC não numérico é erro', () => {
    expect(hashQrCodeV2(CHAVE_MANUAL, 1, '1', 'CODIGO-CSC-CONTRIBUINTE-36-CARACTERES')).not.toBe('DC6AE2C2B9A992BE59679AC365E29922DE6B7511');
    expect(() => hashQrCodeV2(CHAVE_MANUAL, 1, 'A1', CSC_MANUAL)).toThrow(/nfce_csc_id_invalido/);
  });

  it('v3 on-line (D01 §4.4.1): p=chave|3|tpAmb, sem CSC, sem hash', () => {
    expect(qrCodeV3Online('https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode', CHAVE_MANUAL, 2)).toBe(
      `https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE_MANUAL}|3|2`,
    );
  });

  it('URLs por UF: SP nos dois ambientes; sem fonte (AC), sem urlChave (AM) ou ambígua (ES/RJ) ⇒ motivo nomeado, nunca URL de outra UF', () => {
    expect(urlsNfce('SP', 'homologacao')).toMatchObject({ ok: true, qrCodeBase: expect.stringContaining('homologacao.nfce.fazenda.sp.gov.br') });
    expect(urlsNfce('SP', 'producao')).toMatchObject({ ok: true, urlChave: 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica' });
    for (const [uf, trecho] of [['AC', 'sem fonte oficial'], ['AM', 'urlChave'], ['ES', 'ambígua'], ['RJ', 'ambígua']] as const) {
      const r = urlsNfce(uf, 'producao');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toContain(trecho);
    }
  });

  it('cobertura: 27 UF × 2 ambientes, cada par com URL ou com motivo — e nunca os dois', () => {
    for (const uf of UFS) {
      for (const ambiente of ['producao', 'homologacao'] as const) {
        const comUrl = NFCE_QRCODE_URLS.some((u) => u.uf === uf && u.ambiente === ambiente);
        const desab = NFCE_QRCODE_DESABILITADAS.some((d) => d.uf === uf && d.ambiente === ambiente);
        expect(`${uf}/${ambiente}:${comUrl !== desab}`).toBe(`${uf}/${ambiente}:true`);
      }
    }
  });

  it('toda linha com URL cabe no contrato do ZX01 (qrCode 60–1000, urlChave 21–85) na v3 e na v2', () => {
    for (const u of NFCE_QRCODE_URLS) {
      expect(InfNFeSuplSchema.safeParse({ qrCode: qrCodeV3Online(u.qrCodeBase, CHAVE_MANUAL, 1), urlChave: u.urlChave }).success).toBe(true);
      expect(InfNFeSuplSchema.safeParse({ qrCode: qrCodeV2Online(u.qrCodeBase, CHAVE_MANUAL, 1, { id: '1', csc: 'A'.repeat(36) }), urlChave: u.urlChave }).success).toBe(true);
    }
  });

  it('o infNFeSupl entra entre </infNFe> e <Signature> e troca o anterior (recuo v3 → v2)', () => {
    const nfe = '<NFe xmlns="x"><infNFe Id="NFe1">a</infNFe><Signature>s</Signature></NFe>';
    const supl = { qrCode: qrCodeV3Online('https://www.nfce.fazenda.sp.gov.br/qrcode', CHAVE_MANUAL, 1), urlChave: 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica' };
    const v3 = comInfNFeSupl(nfe, supl);
    expect(v3).toMatch(/<\/infNFe><infNFeSupl><qrCode>[^<]+\|3\|1<\/qrCode><urlChave>[^<]+<\/urlChave><\/infNFeSupl><Signature>/);
    const v2 = comInfNFeSupl(v3, { ...supl, qrCode: qrCodeV2Online('https://www.nfce.fazenda.sp.gov.br/qrcode', CHAVE_MANUAL, 1, { id: '1', csc: CSC_MANUAL }) });
    expect(v2.match(/<infNFeSupl>/g)).toHaveLength(1);
    expect(v2).toContain('|2|1|1|');
  });
});
