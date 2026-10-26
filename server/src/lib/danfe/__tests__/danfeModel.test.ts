/**
 * NFE-DANFE-IBSCBS PR-1, itens 5–10 (`docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md`). Base: o fixture SINTÉTICO de
 * leiaute completo (`purchase-full-layout.SYNTHETIC.xml`), com variantes montadas aqui e re-assinadas com a chave de
 * teste (F-SIG-4 b). Os grupos IBS/CBS/IS seguem a NT 2025.002 v1.52 (dossiê `pesquisas-legais/nfe-danfe-pr1/`); provam a
 * MECÂNICA da leitura, não uma nota autorizada real (P5 do BRIEF, `sintetico-nao-cobre-formato-de-dado-real`).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { readDanfeModel, type DanfeModel } from '../danfeModel';
import { ValidationError } from '../../errors';
import { signNfeForTest } from '@test/helpers/nfeSignature';
import { LEGAIS_SEMENTE } from '@test/helpers/legalParams';

const FULL = readFileSync(join(__dirname, '..', '..', '__tests__', 'fixtures', 'nfe', 'purchase-full-layout.SYNTHETIC.xml'), 'utf8');

/** Aplica a mutação dentro do <infNFe> e re-assina, para o gate sob teste ser o que falha (não a assinatura). */
const variant = (...edits: Array<(xml: string) => string>) => signNfeForTest(edits.reduce((x, f) => f(x), FULL));
const insertBefore = (closing: string, frag: string) => (xml: string) => {
  if (!xml.includes(closing)) throw new Error(`fixture sem ${closing}`);
  return xml.replace(closing, `${frag}${closing}`);
};
const removeTag = (tag: string) => (xml: string) => {
  const re = new RegExp(`<${tag}(\\s[^>]*)?>[\\s\\S]*?</${tag}>`, 'g');
  if (!re.test(xml)) throw new Error(`fixture sem <${tag}>`);
  return xml.replace(re, '');
};
const read = (xml: string): DanfeModel => readDanfeModel(xml, LEGAIS_SEMENTE);

// ── grupos da NT 2025.002 v1.52 ──────────────────────────────────────────────────────────────────────────────
const UB12 = (gUf = '', gMun = '', gCbs = '') =>
  '<IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib><gIBSCBS><vBC>216.00</vBC>' +
  `<gIBSUF><pIBSUF>0.1000</pIBSUF>${gUf}<vIBSUF>0.09</vIBSUF></gIBSUF>` +
  `<gIBSMun><pIBSMun>0.0500</pIBSMun>${gMun}<vIBSMun>0.04</vIBSMun></gIBSMun>` +
  `<vIBS>0.13</vIBS><gCBS><pCBS>0.9000</pCBS>${gCbs}<vCBS>1.30</vCBS></gCBS></gIBSCBS></IBSCBS>`;
const GRED = (efetiva: string) => `<gRed><pRedAliq>60.0000</pRedAliq><pAliqEfet>${efetiva}</pAliqEfet></gRed>`;
const IS = '<IS><CSTIS>000</CSTIS><cClassTribIS>000001</cClassTribIS><vBCIS>222.00</vBCIS><pIS>2.5000</pIS><vIS>5.55</vIS></IS>';
const TOTAIS_RTC =
  '<ISTot><vIS>5.55</vIS></ISTot>' +
  '<IBSCBSTot><vBCIBSCBS>216.00</vBCIBSCBS><gIBS><gIBSUF><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vIBSUF>0.09</vIBSUF></gIBSUF>' +
  '<gIBSMun><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vIBSMun>0.04</vIBSMun></gIBSMun><vIBS>0.13</vIBS><vCredPres>0.00</vCredPres>' +
  '<vCredPresCondSus>0.00</vCredPresCondSus></gIBS><gCBS><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vCBS>1234.5</vCBS>' +
  '<vCredPres>0.00</vCredPres><vCredPresCondSus>0.00</vCredPresCondSus></gCBS>' +
  '<gMono><vIBSMono>1.11</vIBSMono><vCBSMono>2.22</vCBSMono><vIBSMonoReten>3.33</vIBSMonoReten><vCBSMonoReten>4.44</vCBSMonoReten>' +
  '<vIBSMonoRet>0.00</vIBSMonoRet><vCBSMonoRet>0.00</vCBSMonoRet></gMono></IBSCBSTot><vNFTot>1786.39</vNFTot>';
const firstImposto = (frag: string) => (xml: string) => xml.replace('</imposto>', `${frag}</imposto>`);

describe('readDanfeModel — gates (item 5; "os mesmos do parseNfe", dono 26/10)', () => {
  it('modelo 65 ⇒ ValidationError com código DANFE_MODELO_NAO_SUPORTADO', () => {
    const mod65 = variant((x) => x.replace('<mod>55</mod>', '<mod>65</mod>'));
    expect.assertions(2);
    try {
      read(mod65);
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errorCode).toBe('DANFE_MODELO_NAO_SUPORTADO');
    }
  });

  it('cStat 110 ⇒ erro (tabela NFE_CSTAT_AUTORIZADA vigente)', () => {
    expect(() => read(FULL.replace('<cStat>100</cStat>', '<cStat>110</cStat>'))).toThrow(/cStat/);
  });

  it('sem protNFe ⇒ erro', () => {
    expect(() => read(FULL.replace(/<protNFe[\s\S]*?<\/protNFe>/, ''))).toThrow(/protocolo|autoriza/i);
  });

  it('chNFe diferente da chave ⇒ erro', () => {
    const outra = FULL.replace(/<chNFe>(\d{43})(\d)<\/chNFe>/, (_m, a: string, d: string) => `<chNFe>${a}${(Number(d) + 1) % 10}</chNFe>`);
    expect(() => read(outra)).toThrow(/diverge/);
  });

  it('tpAmb=2 é aceito e marca homologação; tpAmb=1 é produção', () => {
    expect(read(variant((x) => x.replace('<tpAmb>1</tpAmb>', '<tpAmb>2</tpAmb>'))).ambiente).toBe('homologacao');
    expect(read(FULL).ambiente).toBe('producao');
  });

  it('chave, ide e protocolo vêm do XML', () => {
    const m = read(FULL);
    expect(m.chave).toBe('35260911222333000181550010000123451482135790');
    expect(m.ide).toEqual({
      nNF: '12345', serie: '1', tpNF: '1', natOp: 'COMPRA PARA COMERCIALIZACAO E USO NA PRESTACAO DE SERVICO',
      dhEmi: '2026-09-15T10:12:44-03:00', dhSaiEnt: '2026-09-15T14:00:00-03:00',
    });
    expect(m.protocolo).toEqual({ nProt: '135260000123456', dhRecbto: '2026-09-15T10:12:51-03:00' });
  });
});

describe('readDanfeModel — totais IBS/CBS/IS (item 6, [NT10-TOT])', () => {
  it('com ISTot, IBSCBSTot e gMono ⇒ os 8 valores; "1234.5" ⇒ 123450n', () => {
    const m = read(variant(insertBefore('</total>', TOTAIS_RTC)));
    expect(m.totaisIbsCbsIs).toEqual({
      vCBS: 123450n, vIBSUF: 9n, vIBSMun: 4n, vIS: 555n,
      vIBSMono: 111n, vCBSMono: 222n, vIBSMonoReten: 333n, vCBSMonoReten: 444n,
    });
  });

  it('sem os grupos ⇒ os 8 null (nunca 0n)', () => {
    const t = read(FULL).totaisIbsCbsIs;
    expect(Object.keys(t)).toHaveLength(8);
    expect(Object.values(t).every((v) => v === null)).toBe(true);
  });
});

describe('readDanfeModel — IBS/CBS do item (item 7, [NT10-ITEM] [NT10-ALIQ])', () => {
  it('sem gRed ⇒ as três VIGENTE, com as casas do XML', () => {
    const [item] = read(variant(firstImposto(UB12()))).itens;
    expect(item.ibsCbs).toEqual({
      cClassTrib: '000001', vBC: 21600n,
      ibsUf: { aliq: { aliquota: '0.1000', origem: 'VIGENTE' }, valor: 9n },
      ibsMun: { aliq: { aliquota: '0.0500', origem: 'VIGENTE' }, valor: 4n },
      cbs: { aliq: { aliquota: '0.9000', origem: 'VIGENTE' }, valor: 130n },
    });
  });

  it('gRed só na CBS ⇒ CBS EFETIVA (pAliqEfet UB66), as outras VIGENTE', () => {
    const [item] = read(variant(firstImposto(UB12('', '', GRED('0.3600'))))).itens;
    expect(item.ibsCbs?.cbs.aliq).toEqual({ aliquota: '0.3600', origem: 'EFETIVA' });
    expect(item.ibsCbs?.ibsUf.aliq?.origem).toBe('VIGENTE');
    expect(item.ibsCbs?.ibsMun.aliq?.origem).toBe('VIGENTE');
  });

  it('gCompraGov com gRed nos três grupos ⇒ as três EFETIVA', () => {
    const compraGov = insertBefore('</ide>', '<gCompraGov><tpEnteGov>1</tpEnteGov><pRedutor>10.0000</pRedutor></gCompraGov>');
    const [item] = read(variant(compraGov, firstImposto(UB12(GRED('0.0900'), GRED('0.0450'), GRED('0.8100'))))).itens;
    expect([item.ibsCbs?.ibsUf.aliq, item.ibsCbs?.ibsMun.aliq, item.ibsCbs?.cbs.aliq]).toEqual([
      { aliquota: '0.0900', origem: 'EFETIVA' },
      { aliquota: '0.0450', origem: 'EFETIVA' },
      { aliquota: '0.8100', origem: 'EFETIVA' },
    ]);
  });

  it('item sem UB12 ⇒ ibsCbs null; UB12 sem gIBSCBS ⇒ valores e alíquotas null', () => {
    expect(read(FULL).itens[0].ibsCbs).toBeNull();
    const soClasse = read(variant(firstImposto('<IBSCBS><CST>410</CST><cClassTrib>410001</cClassTrib></IBSCBS>'))).itens[0];
    expect(soClasse.ibsCbs).toEqual({
      cClassTrib: '410001', vBC: null,
      ibsUf: { aliq: null, valor: null }, ibsMun: { aliq: null, valor: null }, cbs: { aliq: null, valor: null },
    });
  });
});

describe('readDanfeModel — Imposto Seletivo do item (item 8)', () => {
  it('com o grupo IS ⇒ vBCIS, pIS (string crua) e vIS', () => {
    expect(read(variant(firstImposto(IS))).itens[0].is).toEqual({ vBCIS: 22200n, pIS: '2.5000', vIS: 555n });
  });

  it('sem o grupo ⇒ is null', () => {
    expect(read(FULL).itens[0].is).toBeNull();
  });
});

describe('readDanfeModel — emitente (item 9, [NT10-EMIT])', () => {
  it('CRT 3 ⇒ "3 - REGIME NORMAL"; CRT 1 ⇒ "1 - SIMPLES NACIONAL"', () => {
    expect(read(FULL).emit.crtDescricao).toBe('3 - REGIME NORMAL');
    expect(read(variant((x) => x.replace('<CRT>3</CRT>', '<CRT>1</CRT>'))).emit.crtDescricao).toBe('1 - SIMPLES NACIONAL');
  });

  it('CRT fora de 1–4 ⇒ ValidationError', () => {
    expect(() => read(variant((x) => x.replace('<CRT>3</CRT>', '<CRT>9</CRT>')))).toThrow(/CRT/);
  });

  it('tipo de regime de apuração do IBS/CBS é sempre null (I3) e o tipo não aceita texto', () => {
    const m = read(FULL);
    expect(m.emit.tipoRegimeApuracaoIbsCbs).toBeNull();
    // @ts-expect-error — `[NT10-EMIT]`: campo reservado até a NT futura; o tipo literal é `null`
    const invalido: DanfeModel['emit']['tipoRegimeApuracaoIbsCbs'] = 'REGULAR';
    expect(invalido).toBe('REGULAR');
  });
});

describe('readDanfeModel — campos base (item 10)', () => {
  const m = read(FULL);

  it('emitente e destinatário com endereço', () => {
    expect(m.emit).toMatchObject({
      xNome: 'DISTRIBUIDORA FICTICIA DE COSMETICOS LTDA', cnpjCpf: '11222333000181', ie: '111222333444', iest: null, crt: '3',
      endereco: { xLgr: 'RUA DOS EXEMPLOS', nro: '100', xCpl: 'GALPAO 2', xBairro: 'BAIRRO TESTE', xMun: 'SAO PAULO', uf: 'SP', cep: '01000000', fone: '1130000000' },
    });
    expect(m.dest).toEqual({
      xNome: 'SALAO FICTICIO LTDA', cnpjCpf: '45997418000153', ie: '555666777888',
      endereco: { xLgr: 'AVENIDA DO TESTE', nro: '200', xCpl: null, xBairro: 'CENTRO', xMun: 'SAO PAULO', uf: 'SP', cep: '01001000', fone: '1140000000' },
    });
  });

  it('fatura com as 2 duplicatas (lista mesmo quando o parser não força array)', () => {
    expect(m.fatura).toEqual({
      nFat: '12345',
      dup: [
        { nDup: '001', dVenc: '2026-10-15', vDup: 27244n },
        { nDup: '002', dVenc: '2026-11-14', vDup: 27245n },
      ],
    });
  });

  it('totais do ICMS/IPI e da nota', () => {
    expect(m.totaisIcmsIpi).toMatchObject({
      vBC: 52000n, vICMS: 9360n, vBCST: 30651n, vST: 1494n, vProd: 51500n, vFrete: 1500n, vSeg: 0n, vDesc: 1000n,
      vIPI: 995n, vOutro: 0n, vNF: 54489n, vFCP: 0n, vFCPST: 0n,
    });
  });

  it('itens: CST = orig + CST, ICMS, IPI (IPITrib × IPINT), infAdProd', () => {
    const [shampoo, toalha] = m.itens;
    expect(shampoo).toMatchObject({
      nItem: 1, cProd: 'SHAMP-1L', ncm: '33051000', cstOuCsosn: '010', cfop: '1403', uCom: 'UN', qCom: '12.0000',
      vUnCom: '18.5000000000', vProd: 22200n, icms: { vBC: 22350n, pICMS: '18.00', vICMS: 4023n },
      ipi: { pIPI: null, vIPI: null }, infAdProd: 'PRODUTO SUJEITO A TRIBUTACAO MONOFASICA DE PIS/COFINS',
    });
    expect(toalha).toMatchObject({ cstOuCsosn: '000', ipi: { pIPI: '5.00', vIPI: 995n }, infAdProd: null });
  });

  it('transporte: modFrete, transportadora e volumes', () => {
    expect(m.transp).toEqual({
      modFrete: '0',
      transportadora: {
        xNome: 'DISTRIBUIDORA FICTICIA DE COSMETICOS LTDA', cnpjCpf: '11222333000181', ie: '111222333444',
        xEnder: 'RUA DOS EXEMPLOS, 100', xMun: 'SAO PAULO', uf: 'SP',
      },
      veiculo: null,
      volumes: [{ qVol: '3', esp: 'CAIXA', marca: null, nVol: null, pesoL: '18.400', pesoB: '19.100' }],
    });
  });

  it('informações complementares (infCpl) e sem ISSQN', () => {
    expect(m.infCpl).toMatch(/^PEDIDO PED-2026-0915/);
    expect(m.infAdFisco).toBeNull();
    expect(m.issqn).toBeNull();
  });
});

/**
 * Item 10, teste de propriedade (I2, `[NT10-FACULT]`, `[MOC-DANFE-SO-XML]`): numa nota com TODOS os facultativos, tirar a
 * tag de cada um faz o campo do model virar null (ou a lista ficar vazia), e só ele. A metade "o rótulo some do HTML" é
 * do item 11 (PR-2).
 */
describe('readDanfeModel — facultativos: tag ausente ⇒ null (item 10)', () => {
  const COMPLETA: Array<(xml: string) => string> = [
    insertBefore('<CRT>', '<IEST>999888777666</IEST><IM>12345678</IM>'),
    insertBefore('<vST>14.94</vST>', '<vICMSUFDest>7.77</vICMSUFDest><vFCPUFDest>1.11</vFCPUFDest>'),
    insertBefore('<vProd>515.00</vProd>', '<qBCMono>10.0000</qBCMono><vICMSMono>2.00</vICMSMono><qBCMonoReten>5.0000</qBCMonoReten><vICMSMonoReten>1.00</vICMSMonoReten>'),
    insertBefore('</total>', '<ISSQNtot><vServ>50.00</vServ><vBC>50.00</vBC><vISS>2.50</vISS></ISSQNtot>'),
    insertBefore('<vol>', '<veicTransp><placa>ABC1D23</placa><UF>SP</UF><RNTC>12345678</RNTC></veicTransp>'),
    insertBefore('<infCpl>', '<infAdFisco>DOCUMENTO EMITIDO POR ME OU EPP</infAdFisco>'),
  ];
  const base = read(variant(...COMPLETA));

  type Caso = [string, (xml: string) => string, (m: DanfeModel) => unknown, unknown];
  const casos: Caso[] = [
    ['ide/dhSaiEnt', removeTag('dhSaiEnt'), (m) => m.ide.dhSaiEnt, null],
    ['emit/IEST', removeTag('IEST'), (m) => m.emit.iest, null],
    ['enderEmit/xCpl', removeTag('xCpl'), (m) => m.emit.endereco.xCpl, null],
    ['dest', removeTag('dest'), (m) => m.dest, { xNome: null, endereco: null, cnpjCpf: null, ie: null }],
    ['cobr', removeTag('cobr'), (m) => m.fatura, null],
    ['vFCPUFDest', removeTag('vFCPUFDest'), (m) => m.totaisIcmsIpi.vFCPUFDest, null],
    ['vICMSUFDest', removeTag('vICMSUFDest'), (m) => m.totaisIcmsIpi.vICMSUFDest, null],
    ['qBCMono', removeTag('qBCMono'), (m) => m.totaisIcmsIpi.qBCMono, null],
    ['vICMSMono', removeTag('vICMSMono'), (m) => m.totaisIcmsIpi.vICMSMono, null],
    ['qBCMonoReten', removeTag('qBCMonoReten'), (m) => m.totaisIcmsIpi.qBCMonoReten, null],
    ['vICMSMonoReten', removeTag('vICMSMonoReten'), (m) => m.totaisIcmsIpi.vICMSMonoReten, null],
    ['vFCP', removeTag('vFCP'), (m) => m.totaisIcmsIpi.vFCP, null],
    ['vFCPST', removeTag('vFCPST'), (m) => m.totaisIcmsIpi.vFCPST, null],
    ['ISSQNtot', removeTag('ISSQNtot'), (m) => m.issqn, null],
    ['transp/transporta', removeTag('transporta'), (m) => m.transp?.transportadora, null],
    ['transp/veicTransp', removeTag('veicTransp'), (m) => m.transp?.veiculo, null],
    ['transp/vol', removeTag('vol'), (m) => m.transp?.volumes, []],
    ['transp', removeTag('transp'), (m) => m.transp, null],
    ['infAdFisco', removeTag('infAdFisco'), (m) => m.infAdFisco, null],
    ['infCpl', removeTag('infCpl'), (m) => m.infCpl, null],
    ['det/infAdProd', removeTag('infAdProd'), (m) => m.itens[0].infAdProd, null],
    ['det/imposto/IPI', removeTag('IPI'), (m) => m.itens[1].ipi, null],
  ];

  it.each(casos)('%s presente na nota completa', (_nome, _rm, get, ausente) => {
    expect(get(base)).not.toEqual(ausente);
  });

  it.each(casos)('sem %s ⇒ campo vazio', (_nome, rm, get, ausente) => {
    expect(get(read(variant(...COMPLETA, rm)))).toEqual(ausente);
  });

  it('a nota completa traz o ISSQN com a IM do emitente', () => {
    expect(base.issqn).toEqual({ im: '12345678', vServ: 5000n, vBC: 5000n, vISS: 250n });
  });
});
