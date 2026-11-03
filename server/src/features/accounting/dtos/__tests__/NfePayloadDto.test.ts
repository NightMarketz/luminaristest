import { NfePayloadSchema, NfePayloadSemNumeracaoSchema, XPROD_HOMOLOGACAO_NFCE, type NfePayload } from '../NfePayloadDto';
import { montarNfe, numerarNfe } from '../../models/nfeMontagem';
import { inputNfce, nfceNumerada } from '../../models/__tests__/nfeMontagem.fixture';

/**
 * BE-INCR-NFCE (nó X10a, item 12) — um caso vermelho por regra de validação transcrita (§7 da
 * `TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-26.md`), com o código de rejeição da SEFAZ na mensagem. O snapshot de forma
 * (`dtoShapeSnapshot`) não enxerga `superRefine` — este arquivo é o que prova as regras.
 */
type Inf = NfePayload['infNFe'];
const mut = (f: (inf: Inf) => void, base: NfePayload = nfceNumerada()): NfePayload => {
  const p = JSON.parse(JSON.stringify(base)) as NfePayload;
  f(p.infNFe);
  return p;
};
const mensagens = (p: unknown): string[] => {
  const r = NfePayloadSchema.safeParse(p);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};
const rejeita = (p: unknown, codigo: string) => expect(mensagens(p).join(' | ')).toContain(codigo);

const ENDER = { xLgr: 'Rua A', nro: '1', xBairro: 'Centro', cMun: '3550308', xMun: 'Sao Paulo', UF: 'SP', CEP: '01001000' };

describe('NfePayloadSchema — base válida', () => {
  it('a NFC-e do Simples montada e numerada passa, e a forma sem numeração também', () => {
    expect(mensagens(nfceNumerada())).toEqual([]);
    expect(NfePayloadSemNumeracaoSchema.safeParse(montarNfe(inputNfce())).success).toBe(true);
  });

  it('a NF-e 55 com destinatário completo passa', () => {
    const p = numerarNfe(
      montarNfe(inputNfce({ mod: 55, dest: { CPF: '11144477735', xNome: 'Cliente', enderDest: ENDER, indIEDest: 9 } })),
      7,
      '48151623',
    );
    expect(mensagens(p)).toEqual([]);
  });
});

describe('NfePayloadSchema — chave (A03-10, B23-10, B03-10)', () => {
  it('rej. 502: Id que não é a concatenação', () => rejeita(mut((i) => (i.Id = i.Id.slice(0, 10) + (i.Id[10] === '1' ? '2' : '1') + i.Id.slice(11))), '502'));
  it('rej. 253: cDV errado', () => rejeita(mut((i) => (i.ide.cDV = (i.ide.cDV + 1) % 10)), '253'));
  it('rej. 897: cNF proibido', () => rejeita(numerarNfe(montarNfe(inputNfce()), 7, '12345678'), '897'));
  it('rej. 897: cNF = nNF', () => rejeita(numerarNfe(montarNfe(inputNfce()), 7, '00000007'), '897'));
});

describe('NfePayloadSchema — destinatário', () => {
  it('rej. 208: CNPJ do destinatário com DV inválido', () =>
    rejeita(mut((i) => (i.dest = { CNPJ: '11222333000180', indIEDest: 9 })), '208'));
  it('rej. 237: CPF do destinatário inválido', () => rejeita(mut((i) => (i.dest = { CPF: '11111111111', indIEDest: 9 })), '237'));
  it('rej. 220: CNPJ do destinatário = do emitente (NFC-e)', () =>
    rejeita(mut((i) => (i.dest = { CNPJ: '11222333000181', indIEDest: 9 })), '220'));
  it('rej. 789: indIEDest ≠ 9 na NFC-e', () => rejeita(mut((i) => (i.dest = { CPF: '11144477735', indIEDest: 1 })), '789'));
  it('E01: NF-e 55 sem dest', () => rejeita(numerarNfe(montarNfe(inputNfce({ mod: 55 })), 7, '48151623'), 'E01'));
  it('E04/E05: NF-e 55 sem enderDest', () =>
    rejeita(numerarNfe(montarNfe(inputNfce({ mod: 55, dest: { CPF: '11144477735', indIEDest: 9 } })), 7, '48151623'), 'E04/E05'));
  it('rej. 787 / 788: entrega a domicílio sem dest / sem enderDest', () => {
    rejeita(mut((i) => (i.ide.indPres = 4)), '787');
    rejeita(mut((i) => { i.ide.indPres = 4; i.dest = { CPF: '11144477735', indIEDest: 9 }; }), '788');
  });
});

describe('NfePayloadSchema — totais e pagamento (W07-10, W10-10, W16-10, YA03-10)', () => {
  it('rej. 564: vProd total ≠ Σ itens', () => rejeita(mut((i) => (i.total.ICMSTot.vProd = '60.00')), '564'));
  it('rej. 537: vDesc total ≠ Σ itens', () => rejeita(mut((i) => (i.total.ICMSTot.vDesc = '1.00')), '537'));
  it('rej. 610: vNF fora da fórmula', () => rejeita(mut((i) => (i.total.ICMSTot.vNF = '60.00')), '610'));
  it('rej. 865: Σ vPag < vNF', () => rejeita(mut((i) => (i.pag.detPag[0].vPag = '10.00')), '865'));
  it('rej. 899: tPag 90 na NFC-e', () => rejeita(mut((i) => (i.pag.detPag[0].tPag = '90')), '899'));
});

describe('NfePayloadSchema — identificação da NFC-e (B10–B25b, X02)', () => {
  it('rej. 705: dhSaiEnt', () => rejeita(mut((i) => (i.ide.dhSaiEnt = i.ide.dhEmi)), '705'));
  it('rej. 706: tpNF = 0', () => rejeita(mut((i) => (i.ide.tpNF = 0)), '706'));
  it('rej. 707: idDest ≠ 1', () => rejeita(mut((i) => (i.ide.idDest = 2)), '707'));
  it('rej. 709: tpImp fora de 4/5', () => rejeita(mut((i) => (i.ide.tpImp = 1)), '709'));
  it('rej. 714: tpEmis 4', () => rejeita(mut((i) => (i.ide.tpEmis = 4)), '714'));
  it('rej. 715: finNFe ≠ 1', () => rejeita(mut((i) => (i.ide.finNFe = 2)), '715'));
  it('rej. 716: indFinal = 0', () => rejeita(mut((i) => (i.ide.indFinal = 0)), '716'));
  it('rej. 717: indPres = 2', () => rejeita(mut((i) => (i.ide.indPres = 2)), '717'));
  it('rej. 753: modFrete ≠ 9 sem entrega', () => rejeita(mut((i) => (i.transp.modFrete = 0)), '753'));
});

describe('NfePayloadSchema — itens da NFC-e (I04-10, I08-150, I17b-10, N12a, N12)', () => {
  it('rej. 373: homologação sem o literal no 1º item', () =>
    rejeita(mut((i) => (i.ide.tpAmb = 2)), '373'));
  it('homologação com o literal passa', () => {
    const p = nfceNumerada({ ambiente: 'homologacao' });
    expect(p.infNFe.det[0].prod.xProd).toBe(XPROD_HOMOLOGACAO_NFCE);
    expect(mensagens(p)).toEqual([]);
  });
  it('rej. 725: CFOP fora da lista', () => rejeita(mut((i) => (i.det[0].prod.CFOP = '5949')), '725'));
  it('rej. 774: indTot = 0', () => rejeita(mut((i) => (i.det[0].prod.indTot = 0)), '774'));
  it('rej. 386: CSOSN 102 com CFOP de ST', () => rejeita(mut((i) => (i.det[0].prod.CFOP = '5405')), '386'));
  it('rej. 386: CSOSN 500 com CFOP sem ST', () =>
    rejeita(mut((i) => (i.det[0].imposto.ICMS = { ICMSSN500: { orig: 0, CSOSN: '500' } })), '386'));
  it('rej. 382: CST 00 com CFOP de ST', () =>
    rejeita(
      mut((i) => {
        i.det[0].prod.CFOP = '5405';
        i.det[0].imposto.ICMS = { ICMS00: { orig: 0, CST: '00', modBC: 3, vBC: '0.00', pICMS: '0.00', vICMS: '0.00' } };
      }),
      '382',
    ));
  it('a NF-e 55 aceita CFOP fora da lista da NFC-e (as regras 65 não valem nela)', () => {
    const p = numerarNfe(
      montarNfe(inputNfce({ mod: 55, dest: { CPF: '11144477735', xNome: 'Cliente', enderDest: ENDER, indIEDest: 9 } })),
      7,
      '48151623',
    );
    p.infNFe.det[0].prod.CFOP = '5949';
    expect(mensagens(p)).toEqual([]);
  });
});

describe('NfePayloadSchema — grupos proibidos ficam fora por .strict() (742–760, 708, 718, 730, 807)', () => {
  it('cobr (rej. 760) e IPI (rej. 742) não existem no schema', () => {
    expect(NfePayloadSchema.safeParse(mut((i) => ((i as unknown as Record<string, unknown>).cobr = {}))).success).toBe(false);
    expect(NfePayloadSchema.safeParse(mut((i) => ((i.det[0].imposto as unknown as Record<string, unknown>).IPI = {}))).success).toBe(false);
  });
});
