import { NfeIbsCbsSchema, NfeIbsCbsTotSchema, NfeIsSchema, regrasIbsCbs, type NfeIbsCbs, type NotaParaRegrasIbsCbs } from '../NfeIbsCbsDto';
import { NfePayloadSchema, type NfePayload } from '../NfePayloadDto';
import { nfceNumerada } from '../../models/__tests__/nfeMontagem.fixture';

/**
 * BE-INCR-NFCE (nó X10a, item 20; F-NFCE-12b b) — um bloco por subgrupo do UB (e o W03), cada caso vermelho com o código de
 * rejeição da NT 2025.002 v1.52 na mensagem. Indicadores pelas tabelas do IT 2025.002 v1.70. Cada grupo usado passa antes pelo
 * `NfeIbsCbsSchema` (a forma do subgrupo é aceita), e só então pelas regras.
 */
const g000 = (over: Partial<NonNullable<NfeIbsCbs['gIBSCBS']>> = {}): NonNullable<NfeIbsCbs['gIBSCBS']> => ({
  vBC: '100.00',
  gIBSUF: { pIBSUF: '0.1000', vIBSUF: '0.10' },
  gIBSMun: { pIBSMun: '0.0000', vIBSMun: '0.00' },
  vIBS: '0.10',
  gCBS: { pCBS: '0.9000', vCBS: '0.90' },
  ...over,
});
const totDe = (itens: NfeIbsCbs[]) => {
  const s = (f: (g: NfeIbsCbs) => string | undefined) => (itens.reduce((t, g) => t + Math.round(Number(f(g) ?? 0) * 100), 0) / 100).toFixed(2);
  return {
    vBCIBSCBS: s((g) => g.gIBSCBS?.vBC),
    gIBS: {
      gIBSUF: { vDif: s((g) => g.gIBSCBS?.gIBSUF.gDif?.vDif), vDevTrib: s((g) => g.gIBSCBS?.gIBSUF.gDevTrib?.vDevTrib), vIBSUF: s((g) => g.gIBSCBS?.gIBSUF.vIBSUF) },
      gIBSMun: { vDif: s((g) => g.gIBSCBS?.gIBSMun.gDif?.vDif), vDevTrib: s((g) => g.gIBSCBS?.gIBSMun.gDevTrib?.vDevTrib), vIBSMun: s((g) => g.gIBSCBS?.gIBSMun.vIBSMun) },
      vIBS: s((g) => g.gIBSCBS?.vIBS),
      vCredPres: s((g) => g.gCredPresOper?.gIBSCredPres?.vCredPres),
      vCredPresCondSus: '0.00',
    },
    gCBS: {
      vDif: s((g) => g.gIBSCBS?.gCBS.gDif?.vDif), vDevTrib: s((g) => g.gIBSCBS?.gCBS.gDevTrib?.vDevTrib), vCBS: s((g) => g.gIBSCBS?.gCBS.vCBS),
      vCredPres: s((g) => g.gCredPresOper?.gCBSCredPres?.vCredPres), vCredPresCondSus: '0.00',
    },
    ...(itens.some((g) => g.gEstornoCred)
      ? { gEstornoCred: { vIBSEstCred: s((g) => g.gEstornoCred?.vIBSEstCred), vCBSEstCred: s((g) => g.gEstornoCred?.vCBSEstCred) } }
      : {}),
  };
};
interface Opc { mod?: 55 | 65; dhEmi?: string; tpAmb?: 1 | 2; crt?: 1 | 3; total?: NotaParaRegrasIbsCbs['total']; ncm?: string; cMunEmit?: string; cMunDest?: string }
function nota(itens: Array<NfeIbsCbs | undefined>, o: Opc = {}): NotaParaRegrasIbsCbs {
  for (const g of itens) if (g) expect(NfeIbsCbsSchema.safeParse(g).error?.issues ?? []).toEqual([]);
  const comGrupo = itens.filter((g): g is NfeIbsCbs => !!g);
  return {
    ide: { mod: o.mod ?? 65, dhEmi: o.dhEmi ?? '2026-10-27T10:00:00-03:00', tpAmb: o.tpAmb ?? 1, finNFe: 1 },
    emit: { CRT: o.crt ?? 3, enderEmit: { cMun: o.cMunEmit ?? '3550308' } },
    dest: o.cMunDest ? { enderDest: { cMun: o.cMunDest } } : undefined,
    det: itens.map((g) => ({ prod: { NCM: o.ncm ?? '33051000', vProd: '100.00' }, imposto: g ? { IBSCBS: g } : {} })),
    total: o.total ?? (comGrupo.length ? { IBSCBSTot: totDe(comGrupo) } : {}),
  };
}
const msgs = (n: NotaParaRegrasIbsCbs): string[] => {
  const out: string[] = [];
  regrasIbsCbs(n, (m) => out.push(m));
  return out;
};
const rej = (n: NotaParaRegrasIbsCbs, ...codigos: string[]) => {
  const m = msgs(n).join(' | ');
  for (const c of codigos) expect(m).toContain(`rej. ${c}`);
};
const ok = (n: NotaParaRegrasIbsCbs) => expect(msgs(n)).toEqual([]);

describe('base gIBSCBS válida e a NFC-e CRT 3 inteira pelo NfePayloadSchema', () => {
  it('000001 com gIBSUF/gIBSMun/gCBS e totais W34 passa', () => ok(nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000() }])));

  it('NFC-e CRT 3 (ICMS00 de fixture) com o grupo UB e os totais passa no schema completo', () => {
    const p = JSON.parse(JSON.stringify(nfceNumerada())) as NfePayload;
    const inf = p.infNFe;
    inf.emit.CRT = 3;
    inf.det[0].imposto.ICMS = { ICMS00: { orig: 0, CST: '00', modBC: 3, vBC: '59.99', pICMS: '18.00', vICMS: '10.80' } };
    const g: NfeIbsCbs = { CST: '000', cClassTrib: '000001', gIBSCBS: g000({ vBC: '59.99', gIBSUF: { pIBSUF: '0.1000', vIBSUF: '0.06' }, vIBS: '0.06', gCBS: { pCBS: '0.9000', vCBS: '0.54' } }) };
    inf.det[0].imposto.IBSCBS = g;
    inf.total.IBSCBSTot = totDe([g]);
    const r = NfePayloadSchema.safeParse(p);
    expect(r.success ? [] : r.error.issues.map((i) => i.message)).toEqual([]);
  });
});

describe('UB12-10 — grupo IBSCBS exigido (rej. 1115)', () => {
  it('CRT 3 em produção desde 03/08/2026', () => rej(nota([undefined]), '1115'));
  it('CRT 3 em homologação desde 01/07/2026; em produção ainda não em 15/07', () => {
    rej(nota([undefined], { tpAmb: 2, dhEmi: '2026-07-15T10:00:00-03:00' }), '1115');
    ok(nota([undefined], { tpAmb: 1, dhEmi: '2026-07-15T10:00:00-03:00' }));
  });
  it('Simples só a partir de 04/01/2027', () => {
    ok(nota([undefined], { crt: 1 }));
    rej(nota([undefined], { crt: 1, dhEmi: '2027-01-04T10:00:00-03:00' }), '1115');
  });
});

describe('CST e cClassTrib pelas tabelas (UB13-10, UB14-10/20/25, UB14a)', () => {
  it('CST inexistente ⇒ 1020', () => rej(nota([{ CST: '999', cClassTrib: '000001', gIBSCBS: g000() }]), '1020'));
  it('cClassTrib inexistente ⇒ 1023', () => rej(nota([{ CST: '000', cClassTrib: '999999', gIBSCBS: g000() }]), '1023'));
  it('cClassTrib de outro CST ⇒ 1024', () => rej(nota([{ CST: '000', cClassTrib: '200030', gIBSCBS: g000() }]), '1024'));
  it('cClassTrib vedado na NFC-e (indNFCe = 0) ⇒ 1025', () => rej(nota([{ CST: '000', cClassTrib: '000003', gIBSCBS: g000() }]), '1025'));
  it('tpDoacao = 1 sem indDoacao ⇒ UB14a', () => expect(msgs(nota([{ CST: '410', cClassTrib: '410003' }])).join(' ')).toContain('UB14a'));
});

describe('presença do gIBSCBS pelo ind_gIBSCBS (UB13-20/30)', () => {
  it('imunidade (410) com gIBSCBS ⇒ 1021; sem ⇒ passa', () => {
    rej(nota([{ CST: '410', cClassTrib: '410001', gIBSCBS: g000() }]), '1021');
    ok(nota([{ CST: '410', cClassTrib: '410001' }]));
  });
  it('tributação integral sem gIBSCBS ⇒ 1022', () => rej(nota([{ CST: '000', cClassTrib: '000001' }]), '1022'));
});

describe('alíquotas e valores das esferas (UB18, UB37, UB56, UB35, UB54, UB54a, UB67)', () => {
  it('pIBSUF ≠ 0,1% ⇒ 1026; pIBSMun ≠ 0% em 2026 ⇒ 1036; pCBS ≠ 0,9% ⇒ 1037', () => {
    rej(
      nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000({ gIBSUF: { pIBSUF: '0.2000', vIBSUF: '0.20' }, gIBSMun: { pIBSMun: '0.0500', vIBSMun: '0.05' }, vIBS: '0.25', gCBS: { pCBS: '1.0000', vCBS: '1.00' } }) }]),
      '1026', '1036', '1037',
    );
  });
  it('valor de cada esfera fora da tolerância de 0,01 ⇒ 1041 / 1052 / 1069; vIBS ≠ UF + Mun ⇒ 1150', () => {
    rej(
      nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000({ gIBSUF: { pIBSUF: '0.1000', vIBSUF: '0.12' }, gIBSMun: { pIBSMun: '0.0000', vIBSMun: '0.02' }, vIBS: '0.10', gCBS: { pCBS: '0.9000', vCBS: '0.93' } }) }]),
      '1041', '1052', '1069', '1150',
    );
  });
  it('tolerância: 0,01 a mais passa', () =>
    ok(nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000({ gCBS: { pCBS: '0.9000', vCBS: '0.91' } }) }])));
});

describe('gRed — redução de alíquota (UB26/45/64, UB27/46/65, UB28/47/66)', () => {
  const red = (pRed: string, efUf: string, efCbs: string, vUf: string, vCbs: string): NfeIbsCbs => ({
    CST: '200',
    cClassTrib: '200030',
    gIBSCBS: g000({
      gIBSUF: { pIBSUF: '0.1000', gRed: { pRedAliq: pRed, pAliqEfet: efUf }, vIBSUF: vUf },
      gIBSMun: { pIBSMun: '0.0000', gRed: { pRedAliq: pRed, pAliqEfet: '0.0000' }, vIBSMun: '0.00' },
      vIBS: vUf,
      gCBS: { pCBS: '0.9000', gRed: { pRedAliq: pRed, pAliqEfet: efCbs }, vCBS: vCbs },
    }),
  });
  it('200030 (60%) com gRed certo passa', () => ok(nota([red('60.00', '0.0400', '0.3600', '0.04', '0.36')])));
  it('CST 200 sem gRed ⇒ 1033 / 1074 / 1079', () => rej(nota([{ CST: '200', cClassTrib: '200030', gIBSCBS: g000({ gIBSUF: { pIBSUF: '0.1000', vIBSUF: '0.10' } }) }]), '1033', '1074', '1079'));
  it('CST 000 com gRed ⇒ 1032 / 1007 / 1028', () =>
    rej(
      nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000({ gIBSUF: { pIBSUF: '0.1000', gRed: { pRedAliq: '0.00', pAliqEfet: '0.1000' }, vIBSUF: '0.10' }, gIBSMun: { pIBSMun: '0.0000', gRed: { pRedAliq: '0.00', pAliqEfet: '0.0000' }, vIBSMun: '0.00' }, gCBS: { pCBS: '0.9000', gRed: { pRedAliq: '0.00', pAliqEfet: '0.9000' }, vCBS: '0.90' } }) }]),
      '1032', '1007', '1028',
    ));
  it('pRedAliq diferente da tabela ⇒ 1034 / 1063; pAliqEfet errada ⇒ 1035 / 1064', () => {
    rej(nota([red('50.00', '0.0500', '0.4500', '0.05', '0.45')]), '1034', '1063');
    rej(nota([red('60.00', '0.0500', '0.4000', '0.05', '0.40')]), '1035', '1064');
  });
});

describe('gDif — diferimento (UB22/40/59, UB23/42/61)', () => {
  const dif = { pDif: '100.00', vDif: '0.10' };
  it('CST 000 com gDif ⇒ 1029 / 1083 / 1090', () =>
    rej(
      nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000({ gIBSUF: { pIBSUF: '0.1000', gDif: dif, vIBSUF: '0.00' }, gIBSMun: { pIBSMun: '0.0000', gDif: { pDif: '100.00', vDif: '0.00' }, vIBSMun: '0.00' }, vIBS: '0.00', gCBS: { pCBS: '0.9000', gDif: { pDif: '100.00', vDif: '0.90' }, vCBS: '0.00' } }) }]),
      '1029', '1083', '1090',
    ));
  it('CST 510 (diferimento) na NF-e sem gDif ⇒ 1030 / 1044 / 1061; com vDif errado ⇒ 1031', () => {
    rej(nota([{ CST: '510', cClassTrib: '510001', gIBSCBS: g000() }], { mod: 55 }), '1030', '1044', '1061');
    rej(nota([{ CST: '510', cClassTrib: '510001', gIBSCBS: g000({ gIBSUF: { pIBSUF: '0.1000', gDif: { pDif: '100.00', vDif: '0.05' }, vIBSUF: '0.05' }, vIBS: '0.05' }) }], { mod: 55 }), '1031');
  });
  it('CST 510 com diferimento integral nas três esferas passa (vIBSUF = vBC×p − vDif)', () =>
    ok(nota([{ CST: '510', cClassTrib: '510001', gIBSCBS: g000({ gIBSUF: { pIBSUF: '0.1000', gDif: dif, vIBSUF: '0.00' }, gIBSMun: { pIBSMun: '0.0000', gDif: { pDif: '100.00', vDif: '0.00' }, vIBSMun: '0.00' }, vIBS: '0.00', gCBS: { pCBS: '0.9000', gDif: { pDif: '100.00', vDif: '0.90' }, vCBS: '0.00' } }) }], { mod: 55 })));
});

describe('gDevTrib — devolução de tributos (UB24, UB43, UB62, UB62a, UB63)', () => {
  it('UF e município ⇒ 1111 / 1112; CBS na NFC-e ⇒ 1187', () =>
    rej(
      nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000({ gIBSUF: { pIBSUF: '0.1000', gDevTrib: { vDevTrib: '0.00' }, vIBSUF: '0.10' }, gIBSMun: { pIBSMun: '0.0000', gDevTrib: { vDevTrib: '0.00' }, vIBSMun: '0.00' }, gCBS: { pCBS: '0.9000', gDevTrib: { pDevTrib: '10.00', vDevTrib: '0.09' }, vCBS: '0.81' } }) }]),
      '1111', '1112', '1187',
    ));
  it('CBS na NF-e sem pDevTrib ⇒ 1188; vDevTrib errado ⇒ 1189', () => {
    rej(nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000({ gCBS: { pCBS: '0.9000', gDevTrib: { vDevTrib: '0.09' }, vCBS: '0.81' } }) }], { mod: 55 }), '1188');
    rej(nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000({ gCBS: { pCBS: '0.9000', gDevTrib: { pDevTrib: '10.00', vDevTrib: '0.50' }, vCBS: '0.40' } }) }], { mod: 55 }), '1189');
  });
});

describe('gALCZFMCBS — alíquota zero da CBS em área incentivada (UB66a-10/20, UB66c, UB66e, UB56-10 Exc. 3)', () => {
  const alc = (over = {}): NfeIbsCbs => ({
    CST: '000', cClassTrib: '000001',
    gIBSCBS: g000({ gCBS: { pCBS: '0.0000', gALCZFMCBS: { tpALCZFMCBS: 2, pAliqEfetRegCBS: '0.9000', vTribRegCBS: '0.50', ...over }, vCBS: '0.00' } }),
  });
  it('sem ISUFemit no leiaute ⇒ sempre 1190; fora da área (SP) ⇒ 1191; tp 2 sem processo ⇒ 1192; vTribRegCBS errado ⇒ 1218', () =>
    rej(nota([alc()]), '1190', '1191', '1192', '1218'));
  it('Manaus → Manaus com NCM fora das exceções: pCBS zero não dá 1037 nem 1191', () => {
    const m = msgs(nota([alc({ tpALCZFMCBS: 1, vTribRegCBS: '0.90' })], { cMunEmit: '1302603', cMunDest: '1302603', ncm: '33051000' })).join(' | ');
    expect(m).not.toContain('1191');
    expect(m).not.toContain('1037');
  });
  it('capítulo 33 fora de 3303–3307 (3302) ⇒ 1191 mesmo na ZFM', () => rej(nota([alc({ tpALCZFMCBS: 1, vTribRegCBS: '0.90' })], { cMunEmit: '1302603', cMunDest: '1302603', ncm: '33021000' }), '1191'));
});

describe('gTribRegular — tributação regular (UB68-10/11, UB69, UB70, UB72/72b/72d)', () => {
  const tr = (over = {}) => ({
    CSTReg: '000', cClassTribReg: '000001', pAliqEfetRegIBSUF: '0.1000', vTribRegIBSUF: '0.10', pAliqEfetRegIBSMun: '0.0000', vTribRegIBSMun: '0.00',
    pAliqEfetRegCBS: '0.9000', vTribRegCBS: '0.90', ...over,
  });
  const g550 = (gTribRegular?: ReturnType<typeof tr>): NfeIbsCbs => ({
    CST: '550', cClassTrib: '550001',
    gIBSCBS: g000({ gIBSUF: { pIBSUF: '0.0000', vIBSUF: '0.00' }, vIBS: '0.00', gCBS: { pCBS: '0.0000', vCBS: '0.00' }, ...(gTribRegular ? { gTribRegular } : {}) }),
  });
  it('550001 (suspensão) com tributação regular e alíquotas zero passa', () => ok(nota([g550(tr())], { mod: 55 })));
  it('550001 sem gTribRegular ⇒ 1065; CSTReg inexistente ⇒ 1066; cClassTribReg ⇒ 1067; valores ⇒ 1040 / 1051 / 1068', () => {
    rej(nota([g550()], { mod: 55 }), '1065');
    rej(nota([g550(tr({ CSTReg: '999', cClassTribReg: '999999', vTribRegIBSUF: '0.50', vTribRegIBSMun: '0.50', vTribRegCBS: '0.50' }))], { mod: 55 }), '1066', '1067', '1040', '1051', '1068');
  });
  it('000001 com gTribRegular ⇒ 1114; 550001 com pCBS ≠ 0 ⇒ 1037', () => {
    rej(nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000({ gTribRegular: tr() }) }], { mod: 55 }), '1114');
    rej(nota([{ ...g550(tr()), gIBSCBS: { ...g550(tr()).gIBSCBS!, gCBS: { pCBS: '0.9000', vCBS: '0.90' } } }], { mod: 55 }), '1037');
  });
});

describe('gTribCompraGov — compra governamental (UB82a-30)', () => {
  it('sem gCompraGov no leiaute ⇒ 1144 na NF-e', () =>
    rej(nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000({ gTribCompraGov: { pAliqIBSUF: '0.1000', vTribIBSUF: '0.10', pAliqIBSMun: '0.0000', vTribIBSMun: '0.00', pAliqCBS: '0.9000', vTribCBS: '0.90' } }) }], { mod: 55 }), '1144'));
});

describe('gIBSCBSMono — monofásico (UB13-39, UB85a/90/95a/100, UB86..UB104, UB86c/87c/96c/97c, UB91f, W57)', () => {
  const adValorem = (over: Record<string, unknown> = {}) => ({
    gIBSMonoAdValorem: { gMonoPadrao: { vBCMono: '100.00', pAliqMonoUF: '0.1000', vIBSMonoUF: '0.10', pAliqMonoMun: '0.0000', vIBSMonoMun: '0.00', vIBSMono: '0.10' } },
    gCBSMonoAdValorem: { gMonoPadrao: { vBCMono: '100.00', pAliqMonoCBS: '0.9000', vCBSMono: '0.90' } },
    vTotIBSMonoItem: '0.10', vTotCBSMonoItem: '0.90', ...over,
  });
  const totMono = (vIBSMono: string, vCBSMono: string) => ({
    vBCIBSCBS: '0.00',
    gMono: { vIBSMono, vCBSMono, vIBSMonoReten: '0.00', vCBSMonoReten: '0.00', vIBSMonoRet: '0.00', vCBSMonoRet: '0.00' },
  });
  it('620001 (gMonoPadrao) em 2026 com os dois blocos ad valorem e gMonoPadrao passa', () =>
    ok(nota([{ CST: '620', cClassTrib: '620001', gIBSCBSMono: adValorem() }], { mod: 55, total: { IBSCBSTot: totMono('0.10', '0.90') } })));
  it('ad rem em 2026 ⇒ 1219 / 1245; ad valorem ausente ⇒ 1229 / 1259', () =>
    rej(
      nota([{ CST: '620', cClassTrib: '620001', gIBSCBSMono: { gIBSMonoAdRem: {}, gCBSMonoAdRem: {}, vTotIBSMonoItem: '0.00', vTotCBSMonoItem: '0.00' } }], { mod: 55, total: { IBSCBSTot: totMono('0.00', '0.00') } }),
      '1219', '1245', '1229', '1259',
    ));
  it('gMonoPadrao ausente ⇒ 1230 / 1260; gMonoReten indevido (ind_gMonoReten = 0) ⇒ 1236; vIBSMono ≠ UF + Mun ⇒ 1234', () => {
    rej(nota([{ CST: '620', cClassTrib: '620001', gIBSCBSMono: adValorem({ gIBSMonoAdValorem: {}, gCBSMonoAdValorem: {} }) }], { mod: 55, total: { IBSCBSTot: totMono('0.00', '0.00') } }), '1230', '1260');
    const g = adValorem();
    (g.gIBSMonoAdValorem as Record<string, unknown>).gMonoReten = { vBCMonoReten: '1.00', pAliqMonoReten: '1.0000', vIBSMonoReten: '0.01' };
    rej(nota([{ CST: '620', cClassTrib: '620001', gIBSCBSMono: g as never }], { mod: 55, total: { IBSCBSTot: { ...totMono('0.10', '0.90'), gMono: { ...totMono('0.10', '0.90').gMono, vIBSMonoReten: '0.01' } } } }), '1236');
    const s = adValorem();
    (s.gIBSMonoAdValorem.gMonoPadrao as Record<string, string>).vIBSMono = '0.20';
    rej(nota([{ CST: '620', cClassTrib: '620001', gIBSCBSMono: s }], { mod: 55, total: { IBSCBSTot: totMono('0.20', '0.90') } }), '1234');
  });
  it('2029 (ad rem dos dois): vIBSMono ≠ qBCMono × adRemIBS ⇒ 1221; vCBSMono ⇒ 1249', () =>
    rej(
      nota(
        [{ CST: '620', cClassTrib: '620001', gIBSCBSMono: {
          gIBSMonoAdRem: { gMonoPadrao: { qBCMono: '10', adRemIBS: '1.5000', vIBSMono: '14.00' } },
          gCBSMonoAdRem: { gMonoPadrao: { qBCMono: '10', adRemCBS: '0.5000', vCBSMono: '6.00' } },
          vTotIBSMonoItem: '14.00', vTotCBSMonoItem: '6.00',
        } }],
        { mod: 55, dhEmi: '2029-03-01T10:00:00-03:00', total: { IBSCBSTot: totMono('14.00', '6.00') } },
      ),
      '1221', '1249',
    ));
  it('CST 000 com gIBSCBSMono ⇒ 1151; total do monofásico errado ⇒ 1092', () => {
    rej(nota([{ CST: '000', cClassTrib: '000001', gIBSCBSMono: adValorem() }], { mod: 55, total: { IBSCBSTot: totMono('0.10', '0.90') } }), '1151');
    rej(nota([{ CST: '620', cClassTrib: '620001', gIBSCBSMono: adValorem() }], { mod: 55, total: { IBSCBSTot: totMono('0.50', '0.90') } }), '1092');
  });
});

describe('gTransfCred — transferência de crédito (UB13-44/45, UB106-30/40)', () => {
  it('CST 800 na NF-e: finNFe ≠ 6 ⇒ 1133; valores zero ⇒ 1129', () =>
    rej(nota([{ CST: '800', cClassTrib: '800001', gTransfCred: { vIBS: '0.00', vCBS: '0.00' } }], { mod: 55, total: { IBSCBSTot: { vBCIBSCBS: '0.00' } } }), '1133', '1129'));
  it('CST 800 sem o grupo ⇒ 1132; CST 000 com ele ⇒ 1131', () => {
    rej(nota([{ CST: '800', cClassTrib: '800001' }], { mod: 55, total: { IBSCBSTot: { vBCIBSCBS: '0.00' } } }), '1132');
    rej(nota([{ CST: '000', cClassTrib: '000001', gTransfCred: { vIBS: '1.00', vCBS: '1.00' } }], { mod: 55, total: { IBSCBSTot: { vBCIBSCBS: '0.00' } } }), '1131');
  });
});

describe('gAjusteCompet — ajuste de competência (UB112-10/20/30)', () => {
  const t = { total: { IBSCBSTot: { vBCIBSCBS: '0.00' } }, mod: 55 as const };
  it('CST 811 sem o grupo ⇒ 1170; com valores zero ⇒ 1171; CST 000 com ele ⇒ 1169', () => {
    rej(nota([{ CST: '811', cClassTrib: '811001' }], t), '1170');
    rej(nota([{ CST: '811', cClassTrib: '811001', gAjusteCompet: { competApur: '2026-09', vIBS: '0.00', vCBS: '0.00' } }], t), '1171');
    rej(nota([{ CST: '000', cClassTrib: '000001', gAjusteCompet: { competApur: '2026-09', vIBS: '1.00', vCBS: '0.00' } }], t), '1169');
  });
});

describe('gEstornoCred — estorno de crédito (UB116-10/20/30, W59f/g)', () => {
  it('410030 na NF-e sem o grupo ⇒ 1173; com valores zero ⇒ 1174; 000001 com ele ⇒ 1172', () => {
    rej(nota([{ CST: '410', cClassTrib: '410030' }], { mod: 55 }), '1173');
    rej(nota([{ CST: '410', cClassTrib: '410030', gEstornoCred: { vIBSEstCred: '0.00', vCBSEstCred: '0.00' } }], { mod: 55 }), '1174');
    rej(nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000(), gEstornoCred: { vIBSEstCred: '1.00', vCBSEstCred: '1.00' } }], { mod: 55 }), '1172');
  });
  it('total do estorno diferente da soma ⇒ 1176', () => {
    const g: NfeIbsCbs = { CST: '410', cClassTrib: '410030', gEstornoCred: { vIBSEstCred: '1.00', vCBSEstCred: '2.00' } };
    rej(nota([g], { mod: 55, total: { IBSCBSTot: { ...totDe([g]), gEstornoCred: { vIBSEstCred: '9.00', vCBSEstCred: '2.00' } } } }), '1176');
  });
});

describe('gCredPresOper — crédito presumido da operação (UB120..UB130, UB54a, W48)', () => {
  const cp = (cCredPres: string, ibs?: object, cbs?: object) => ({ vBCCredPres: '100.00', cCredPres, ...(ibs ? { gIBSCredPres: ibs } : {}), ...(cbs ? { gCBSCredPres: cbs } : {}) });
  it('na NFC-e ⇒ 1049', () => rej(nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000(), gCredPresOper: cp('05', undefined, { pCredPres: '1.00', vCredPres: '1.00' }) }]), '1049'));
  it('000001 não permite (ind_gCredPresOper = 0) ⇒ 1175; cCredPres inexistente ⇒ 1055', () => {
    rej(nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000(), gCredPresOper: cp('05', undefined, { pCredPres: '1.00', vCredPres: '1.00' }) }], { mod: 55 }), '1175');
    rej(nota([{ CST: '000', cClassTrib: '000003', gIBSCBS: g000(), gCredPresOper: cp('99') }], { mod: 55 }), '1055');
  });
  it('cCredPres 05 (só CBS): IBS indevido ⇒ 1053; CBS ausente ⇒ 1058; condição suspensiva em 2026 ⇒ 1056', () =>
    rej(nota([{ CST: '000', cClassTrib: '000003', gIBSCBS: g000(), gCredPresOper: cp('05', { pCredPres: '1.00', vCredPresCondSus: '1.00' }) }], { mod: 55 }), '1053', '1058', '1056'));
  it('cCredPres 04 (brechó, deduz do vIBS): vCredPres > vProd ⇒ 1107; vIBS sem a dedução ⇒ 1150', () =>
    rej(nota([{ CST: '000', cClassTrib: '000003', gIBSCBS: g000(), gCredPresOper: cp('04', { pCredPres: '1.00', vCredPres: '150.00' }, { pCredPres: '1.00', vCredPres: '1.00' }) }], { mod: 55 }), '1107', '1150'));
  it('cCredPres 04 com vIBS = UF + Mun − vCredPres e totais conferidos passa', () =>
    ok(nota([{ CST: '000', cClassTrib: '000003', gIBSCBS: g000({ gIBSUF: { pIBSUF: '0.1000', vIBSUF: '0.10' }, vIBS: '0.05' }), gCredPresOper: cp('04', { pCredPres: '1.00', vCredPres: '0.05' }, { pCredPres: '1.00', vCredPres: '1.00' }) }], { mod: 55 })));
});

describe('gCredPresIBSZFM — crédito presumido do IBS na ZFM (UB131-10..50, UB132, UB133)', () => {
  const z = (tp: number, competApur = '2026-09') => ({ CST: '810', cClassTrib: '810001', gCredPresIBSZFM: { competApur, tpCredPresIBSZFM: tp, vCredPresIBSZFM: '1.00' } });
  const t = { mod: 55 as const, total: { IBSCBSTot: { vBCIBSCBS: '0.00' } } };
  it('CST 810 sem o grupo ⇒ 1135; com ele, sem tpNFCredito no leiaute ⇒ 1158; competApur futura ⇒ 1160; tipo repetido ⇒ 1136', () => {
    rej(nota([{ CST: '810', cClassTrib: '810001' }], t), '1135');
    rej(nota([z(1, '2026-12'), z(1)], t), '1158', '1160', '1136');
  });
  it('CST 000 com o grupo ⇒ 1134; na NFC-e ⇒ 1138', () => {
    rej(nota([{ CST: '000', cClassTrib: '000001', gIBSCBS: g000(), gCredPresIBSZFM: { competApur: '2026-09', tpCredPresIBSZFM: 1, vCredPresIBSZFM: '1.00' } }], { mod: 55 }), '1134');
    rej(nota([z(1)], { total: { IBSCBSTot: { vBCIBSCBS: '0.00' } } }), '1138');
  });
});

describe('W03 — totais (W31-10/20, W34-10/20, W35..W56a)', () => {
  const g: NfeIbsCbs = { CST: '000', cClassTrib: '000001', gIBSCBS: g000() };
  it('item com IBSCBS sem total ⇒ 1119; total sem item ⇒ 1118', () => {
    rej(nota([g], { total: {} }), '1119');
    rej(nota([undefined], { crt: 1, total: { IBSCBSTot: totDe([g]) } }), '1118');
  });
  it('vBCIBSCBS, vIBSUF, vIBS e vCBS diferentes da soma ⇒ 1076 / 1080 / 1085 / 1091', () => {
    const t = totDe([g]);
    rej(
      nota([g], { total: { IBSCBSTot: { ...t, vBCIBSCBS: '1.00', gIBS: { ...t.gIBS, gIBSUF: { ...t.gIBS.gIBSUF, vIBSUF: '9.99' }, vIBS: '9.99' }, gCBS: { ...t.gCBS, vCBS: '9.99' } } } }),
      '1076', '1080', '1085', '1091',
    );
  });
  it('ISTot sem item com IS ⇒ 1073; item com IS sem ISTot ⇒ 1117', () => {
    rej(nota([g], { total: { IBSCBSTot: totDe([g]), ISTot: { vIS: '0.00' } } }), '1073');
    const n = nota([g]);
    n.det[0].imposto.IS = { CSTIS: '000', cClassTribIS: '000001' };
    rej(n, '1117');
  });
});

describe('forma — IS (UB01–UB11) e o grupo total (W34)', () => {
  it('IS: a sequência UB04 vem inteira ou não vem', () => {
    expect(NfeIsSchema.safeParse({ CSTIS: '000', cClassTribIS: '000001', vBCIS: '1.00' }).success).toBe(false);
    expect(NfeIsSchema.safeParse({ CSTIS: '000', cClassTribIS: '000001', vBCIS: '1.00', pIS: '1.00', vIS: '0.01' }).success).toBe(true);
  });
  it('IBSCBS: um só subgrupo da escolha UB14k; tag fora do leiaute é recusada', () => {
    expect(NfeIbsCbsSchema.safeParse({ CST: '000', cClassTrib: '000001', gIBSCBS: g000(), gTransfCred: { vIBS: '1.00', vCBS: '1.00' } }).success).toBe(false);
    expect(NfeIbsCbsSchema.safeParse({ CST: '000', cClassTrib: '000001', gIBSCBS: g000(), extra: 1 }).success).toBe(false);
    expect(NfeIbsCbsTotSchema.safeParse({ vBCIBSCBS: '0.00' }).success).toBe(true);
  });
});
