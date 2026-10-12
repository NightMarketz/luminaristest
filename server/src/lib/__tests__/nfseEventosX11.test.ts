/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-1) — leitores: item 10 (`subst` na NFS-e autorizada, Anexo I [113]–[116]) e item 8
 * (XML de `e105102` no cancelamento manual). Fixtures fictícias assinadas na hora com a chave de teste.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseNfseAutorizada } from '../nfse';
import { parseEventoCancelamento } from '../nfseEvento';
import { signNfseEventoForTest, signNfseForTest } from '@test/helpers/nfeSignature';

const RAW = readFileSync(join(__dirname, 'fixtures', 'nfse', 'nfse-autorizada-web.SYNTHETIC.xml'), 'utf8');
const CH_ORIGINAL = '3550308221122233300018100000000000' + '4126091234567890';

function comSubst(raw: string, subst: string): string {
  return raw.replace('<cLocEmi>3550308</cLocEmi>', `<cLocEmi>3550308</cLocEmi>${subst}`);
}

describe('item 10 — ParsedNfse.dps.subst', () => {
  it('sem o grupo: subst ausente', () => {
    expect(parseNfseAutorizada(signNfseForTest(RAW)).dps.subst).toBeUndefined();
  });

  it('com o grupo: chSubstda, cMotivo (string de 2) e xMotivo lidos de infDPS/subst', () => {
    const xml = comSubst(
      RAW,
      `<subst><chSubstda>${CH_ORIGINAL}</chSubstda><cMotivo>99</cMotivo><xMotivo>valor do servico corrigido</xMotivo></subst>`,
    );
    expect(parseNfseAutorizada(signNfseForTest(xml)).dps.subst).toEqual({
      chSubstda: CH_ORIGINAL,
      cMotivo: '99',
      xMotivo: 'valor do servico corrigido',
    });
  });

  it('com o grupo sem xMotivo (0-1): só chave e motivo', () => {
    const xml = comSubst(RAW, `<subst><chSubstda>${CH_ORIGINAL}</chSubstda><cMotivo>01</cMotivo></subst>`);
    expect(parseNfseAutorizada(signNfseForTest(xml)).dps.subst).toEqual({ chSubstda: CH_ORIGINAL, cMotivo: '01' });
  });

  it('cMotivo fora do TSCodJustSubst → nfse_invalida', () => {
    const xml = comSubst(RAW, `<subst><chSubstda>${CH_ORIGINAL}</chSubstda><cMotivo>1</cMotivo></subst>`);
    expect(() => parseNfseAutorizada(signNfseForTest(xml))).toThrow(/TSCodJustSubst/);
  });
});

describe('item 8 — XML de e105102 no cancelamento manual', () => {
  const evento = (grupo: string) =>
    signNfseEventoForTest(
      '<?xml version="1.0" encoding="UTF-8"?><evento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">' +
        `<infEvento Id="EVT${'1'.repeat(59)}"><verAplic>SefinNac</verAplic><ambGer>2</ambGer><nSeqEvento>001</nSeqEvento>` +
        '<dhProc>2026-09-16T10:00:00-03:00</dhProc><nDFSe>88</nDFSe><pedRegEvento versao="1.01">' +
        `<infPedReg Id="PRE${'2'.repeat(56)}"><tpAmb>1</tpAmb><verAplic>SefinNac</verAplic>` +
        `<dhEvento>2026-09-16T09:59:00-03:00</dhEvento><CNPJAutor>11222333000181</CNPJAutor><chNFSe>${CH_ORIGINAL}</chNFSe>` +
        `${grupo}</infPedReg></pedRegEvento></infEvento></evento>`,
    );

  it('e105102 (sem e101101) → mensagem "registre pela substituição"', () => {
    const xml = evento(
      `<e105102><xDesc>Cancelamento de NFS-e por Substituicao</xDesc><cMotivo>01</cMotivo><chSubstituta>${'9'.repeat(50)}</chSubstituta></e105102>`,
    );
    expect(() => parseEventoCancelamento(xml)).toThrow('é um cancelamento por substituição (e105102) — registre pela substituição');
  });

  it('nenhum dos dois → a mensagem antiga continua', () => {
    expect(() => parseEventoCancelamento(evento('<e999999/>'))).toThrow(/não é um cancelamento \(e101101 ausente\)/);
  });
});
