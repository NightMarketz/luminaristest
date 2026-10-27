import { isValidNfeChave } from '../../../../lib/cnpj';
import { CNF_PROIBIDOS } from '../../dtos/NfePayloadDto';
import {
  clienteDaVenda,
  destNfce,
  dhEmiNoFuso,
  gerarCnf,
  limitesNfce,
  montarNfe,
  numerarNfe,
  pisCofinsSimples,
  qtdTexto,
  tPagDoMetodo,
  ufDoCodMun,
  vUnTexto,
  type LimitesNfce,
} from '../nfeMontagem';
import { inputNfce, nfceNumerada } from './nfeMontagem.fixture';
import { LEGAL_PARAMS_SEED_FILE_NFCE_LIMITE, legalParamsSeedRows } from '@test/helpers/legalParams';
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';

/** BE-INCR-NFCE (nó X10a, itens 14–19 e 21) — a montagem pura da NF-e/NFC-e do Simples. */

describe('item 18 — tPag por forma de pagamento ([NFE-PAG])', () => {
  it.each([
    ['Cash', '01'],
    ['Credit Card', '03'],
    ['Debit Card', '04'],
    ['Pix', '17'],
  ])('%s ⇒ %s', (metodo, tPag) => expect(tPagDoMetodo(metodo)).toEqual({ tPag }));
  it('Package Balance ⇒ recusa nomeada (BRIEF §6)', () => expect(tPagDoMetodo('Package Balance')).toEqual({ faltante: expect.stringContaining('Package Balance') }));
  it('método desconhecido ⇒ recusa nomeada', () => expect(tPagDoMetodo('Boleto')).toEqual({ faltante: expect.stringContaining("'Boleto'") }));
});

describe('item 17 pela A9 — limites da NFC-e como parâmetro legal (Aj. SINIEF 19/16 cl. 4ª VII "a" e § 4º)', () => {
  const seed = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_NFCE_LIMITE) as LinhaLegal[];
  it('valor nacional da semente: R$ 10.000,00 e R$ 200.000,00', () =>
    expect(limitesNfce(seed, '35', '2026-10-26')).toEqual({ destIdentificadoCents: 1_000_000, vedadaCents: 20_000_000 }));
  it('linha da UF (§ 5º) vence a nacional; outra UF segue o nacional', () => {
    const sp: LinhaLegal = { ...seed.find((l) => l.chave === 'DEST_IDENTIFICADO_CENTS')!, id: 'sp', discriminador: '35', valorInt: 500_000 };
    expect(limitesNfce([...seed, sp], '35', '2026-10-26').destIdentificadoCents).toBe(500_000);
    expect(limitesNfce([...seed, sp], '33', '2026-10-26').destIdentificadoCents).toBe(1_000_000);
  });
  it('sem linha ⇒ erro explícito, nunca limite zero', () => expect(() => limitesNfce([], '35', '2026-10-26')).toThrow(/NFCE_LIMITE/));
});

describe('item 17 pela A9 — destinatário da NFC-e', () => {
  const L: LimitesNfce = { destIdentificadoCents: 1_000_000, vedadaCents: 20_000_000 };
  const cpf = clienteDaVenda('c1', '111.444.777-35', 'Maria');
  it('cliente com CPF válido ⇒ dest/CPF + indIEDest 9 (vínculo = pedido do adquirente)', () =>
    expect(destNfce(5_000, L, cpf)).toEqual({ dest: { CPF: '11144477735', xNome: 'Maria', indIEDest: 9 }, faltantes: [] }));
  it('sem cliente abaixo de R$ 10.000 ⇒ sem dest', () => expect(destNfce(999_999, L, clienteDaVenda('', '', ''))).toEqual({ dest: null, faltantes: [] }));
  it('cliente sem taxId abaixo do limite ⇒ sem dest', () => expect(destNfce(5_000, L, clienteDaVenda('c1', '', 'Maria')).dest).toBeNull());
  it('sem documento a partir de R$ 10.000,00 inclusive ⇒ recusa (rej. 750)', () =>
    expect(destNfce(1_000_000, L, clienteDaVenda('', '', '')).faltantes[0]).toContain('750'));
  it('CPF com DV errado ⇒ recusa, nunca emite sem dest em silêncio', () =>
    expect(destNfce(5_000, L, clienteDaVenda('c1', '11144477736', 'Maria')).faltantes[0]).toContain('dígito verificador'));
  it('a partir de R$ 200.000,00 ⇒ NFC-e vedada (rej. 780), mesmo com CPF', () =>
    expect(destNfce(20_000_000, L, cpf).faltantes[0]).toContain('780'));
});

describe('PIS/COFINS do CRT 1 (decisão do dono 26/10: CST do perfil, zerado)', () => {
  it('CST 49 ⇒ PISOutr zerado', () => expect(pisCofinsSimples('PIS', '49')).toEqual({ grupo: { PISOutr: { CST: '49', vBC: '0.00', pPIS: '0.00', vPIS: '0.00' } } }));
  it('CST 07 ⇒ COFINSNT', () => expect(pisCofinsSimples('COFINS', '07')).toEqual({ grupo: { COFINSNT: { CST: '07' } } }));
  it('CST 01 ⇒ faltante (exige alíquota)', () => expect(pisCofinsSimples('PIS', '01')).toEqual({ faltante: expect.stringContaining('Q02') }));
});

describe('itens 15–16 e 19 — identificação, homologação e ICMS do Simples', () => {
  it('cUF = prefixo do codMun; UF pelo IBGE', () => {
    expect(ufDoCodMun('3550308')).toEqual({ cUF: '35', UF: 'SP' });
    expect(() => ufDoCodMun('9900000')).toThrow(/nfe_cuf_desconhecido/);
  });
  it('ide da NFC-e: mod 65, tpNF 1, idDest 1, finNFe 1, indFinal 1, indPres 1, tpImp 4, tpEmis 1, procEmi 0', () => {
    const { ide } = montarNfe(inputNfce()).infNFe;
    expect(ide).toMatchObject({ cUF: '35', mod: 65, tpNF: 1, idDest: 1, finNFe: 1, indFinal: 1, indPres: 1, tpImp: 4, tpEmis: 1, procEmi: 0, natOp: 'VENDA', cMunFG: '3550308' });
  });
  it('tpAmb do documento: homologação ⇒ 2 e literal no 1º item; produção ⇒ 1 e nome do produto', () => {
    const h = montarNfe(inputNfce({ ambiente: 'homologacao' })).infNFe;
    const p = montarNfe(inputNfce()).infNFe;
    expect(h.ide.tpAmb).toBe(2);
    expect(h.det[0].prod.xProd).toBe('NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL');
    expect(p.ide.tpAmb).toBe(1);
    expect(p.det[0].prod.xProd).toBe('Shampoo 300ml');
  });
  it('CRT 1: grupo ICMSSN do CSOSN do perfil, sem valor de ICMS e sem grupo IBSCBS', () => {
    const det = montarNfe(inputNfce()).infNFe.det[0];
    expect(det.imposto.ICMS).toEqual({ ICMSSN102: { orig: 0, CSOSN: '102' } });
    expect(det.imposto).not.toHaveProperty('IBSCBS');
    const st = montarNfe(inputNfce({ itens: [{ ...inputNfce().itens[0], perfil: { ...inputNfce().itens[0].perfil, csosn: '500', cfopPadrao: '5405' } }] }));
    expect(st.infNFe.det[0].imposto.ICMS).toEqual({ ICMSSN500: { orig: 0, CSOSN: '500' } });
  });
  it('CRT 3 não é montado aqui (PR-6)', () => expect(() => montarNfe(inputNfce({ crt: 3 }))).toThrow(/nfe_crt_nao_suportado/));
});

describe('item 14 — valores (preço líquido, F-NFCE-11 a)', () => {
  it('Σ vProd dos itens = vNF = vPag; vDesc = 0', () => {
    const itens = [inputNfce().itens[0], { ...inputNfce().itens[0], productRef: 'prod-2', qty: 3, vProdCents: 1001 }];
    const { total, pag, det } = montarNfe(inputNfce({ itens })).infNFe;
    expect(det.map((d) => d.prod.vProd)).toEqual(['59.99', '10.01']);
    expect(total.ICMSTot.vProd).toBe('70.00');
    expect(total.ICMSTot.vNF).toBe('70.00');
    expect(total.ICMSTot.vDesc).toBe('0.00');
    expect(pag.detPag).toEqual([{ tPag: '17', vPag: '70.00' }]);
  });
  it('qCom e vUnCom no formato do leiaute (11v0-4, 11v0-10)', () => {
    expect(qtdTexto(2)).toBe('2');
    expect(qtdTexto(1.5)).toBe('1.5');
    expect(vUnTexto(1001, 3)).toBe('3.3366666667');
    expect(vUnTexto(5999, 2)).toBe('29.9950000000');
  });
});

describe('item 21 — chave de acesso ([NFE-CHAVE])', () => {
  it('DV confere com o regex e com nfeChaveCheckDigit; Id = "NFe" + chave', () => {
    const { infNFe } = nfceNumerada();
    const chave = infNFe.Id.slice(3);
    expect(isValidNfeChave(chave)).toBe(true);
    expect(chave.slice(0, 2)).toBe('35');
    expect(chave.slice(2, 6)).toBe('2610');
    expect(chave.slice(6, 20)).toBe('11222333000181');
    expect(chave.slice(20, 22)).toBe('65');
    expect(chave.slice(22, 25)).toBe('001');
    expect(chave.slice(25, 34)).toBe('000000007');
    expect(chave.slice(35, 43)).toBe('48151623');
    expect(Number(chave[43])).toBe(infNFe.ide.cDV);
  });
  it('mutação de 1 dígito ⇒ DV diferente', () => {
    const a = numerarNfe(montarNfe(inputNfce()), 7, '48151623').infNFe.ide.cDV;
    const b = numerarNfe(montarNfe(inputNfce()), 8, '48151623').infNFe.ide.cDV;
    expect(a).not.toBe(b);
  });
  it('cNF evita a lista proibida (B03-10) e o próprio nNF', () => {
    const sorteios = [12345678, 7, 48151623];
    expect(gerarCnf(7, () => sorteios.shift()!)).toBe('48151623');
    for (let i = 0; i < 200; i++) {
      const c = gerarCnf(i + 1);
      expect(CNF_PROIBIDOS as readonly string[]).not.toContain(c);
      expect(c).toMatch(/^\d{8}$/);
    }
  });
});

describe('F-NFCE-6 a — dhEmi no fuso do escopo', () => {
  it('America/Sao_Paulo ⇒ -03:00', () => expect(dhEmiNoFuso(new Date('2026-10-26T17:30:05Z'), 'America/Sao_Paulo')).toBe('2026-10-26T14:30:05-03:00'));
  it('UTC ⇒ +00:00', () => expect(dhEmiNoFuso(new Date('2026-10-26T17:30:05Z'), 'UTC')).toBe('2026-10-26T17:30:05+00:00'));
});
