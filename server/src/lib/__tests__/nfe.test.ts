/**
 * NF-e 4.00 (modelo 55) parser (BE-INCR-NFE / A1). `parseNfe` is a PURE normalizer — no Prisma,
 * no tx, no ledger rule. These tests pin the domain-ratified mechanics against the SYNTHETIC
 * fixtures (F0-3): the fixtures prove the parser's MECHANICS, not the real leiaute (lição I052 /
 * sintetico-nao-cobre-formato-de-dado-real — the real anonymized note closes that grade).
 *
 * Pinned:
 *  - multi-item purchase preserves the N=3 items (array, never collapsed);
 *  - `13v2` money -> EXACT integer cents by string arithmetic (183.33 -> 18333, 193.33 -> 19333),
 *    no float drift;
 *  - access key extracted from @Id.slice(3) and validated (== protNFe/chNFe);
 *  - cStat 100 accepted; a MUTATED cStat 110 rejected; a truncated XML rejected;
 *  - a document with <!DOCTYPE rejected (XXE / billion-laughs);
 *  - a single-item note yields itens.length === 1 (still an array — the fast-xml-parser quirk).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseNfe } from '../nfe';
import { ValidationError } from '../errors';

const FIXTURE_DIR = join(__dirname, 'fixtures', 'nfe');
const readFixture = (name: string) => readFileSync(join(FIXTURE_DIR, name), 'utf8');

const PURCHASE = readFixture('purchase-multi-item.SYNTHETIC.xml');
const SALE = readFixture('sale.SYNTHETIC.xml');

describe('parseNfe — compra multi-item (fixture sintético)', () => {
  it('preserva os 3 itens da compra (array, não colapsa)', () => {
    const nfe = parseNfe(PURCHASE);
    expect(nfe.itens).toHaveLength(3);
    expect(nfe.itens.map((i) => i.nItem)).toEqual([1, 2, 3]);
    expect(nfe.itens.map((i) => i.cProd)).toEqual(['SHAMP-500', 'COND-500', 'MASC-300']);
  });

  it('converte 13v2 para centavos exatos por aritmética de string (sem drift de float)', () => {
    const nfe = parseNfe(PURCHASE);
    // itens
    expect(nfe.itens[0].vProdCents).toBe(10000); // 100.00
    expect(nfe.itens[1].vProdCents).toBe(5000); // 50.00
    expect(nfe.itens[2].vProdCents).toBe(3333); // 33.33
    // totais — os valores-alvo do gate de rateio (F0-2 §5)
    expect(nfe.totais.vProdCents).toBe(18333); // 183.33
    expect(nfe.totais.vNFCents).toBe(19333); // 193.33
    expect(nfe.totais.vFreteCents).toBe(1500); // 15.00
    expect(nfe.totais.vDescCents).toBe(1000); // 10.00
    expect(nfe.totais.vIPICents).toBe(500); // 5.00
    expect(nfe.totais.vSTCents).toBe(0); // 0.00
    expect(nfe.totais.vICMSCents).toBe(3300); // 33.00 (não subtrai no custo, mas é extraído)
  });

  it('preserva qCom/vUnCom com decimais variáveis como string crua (não trunca a 2 casas)', () => {
    const nfe = parseNfe(PURCHASE);
    expect(nfe.itens[0].qCom).toBe('10.0000');
    expect(nfe.itens[0].vUnComStr).toBe('10.0000000000');
    expect(nfe.itens[2].vUnComStr).toBe('11.1100000000');
  });

  it('extrai e valida a chave de acesso (@Id.slice(3) == protNFe/chNFe)', () => {
    const nfe = parseNfe(PURCHASE);
    expect(nfe.chaveAcesso).toBe('35250712345678000190550010000000011000000017');
    expect(nfe.chaveAcesso).toHaveLength(44);
    expect(nfe.protocolo.chNFe).toBe(nfe.chaveAcesso);
    expect(nfe.protocolo.cStat).toBe('100');
  });

  it('data por reslice literal (YYYY-MM-DD), nunca new Date()', () => {
    const nfe = parseNfe(PURCHASE);
    expect(nfe.ide.dhEmiDate).toBe('2025-07-10');
    expect(nfe.protocolo.dhRecbtoDate).toBe('2025-07-10');
  });

  it('extrai emitente e destinatário (CNPJ/nome), tpNF informativo, mod 55', () => {
    const nfe = parseNfe(PURCHASE);
    expect(nfe.emit.cnpj).toBe('12345678000190');
    expect(nfe.emit.nome).toBe('DISTRIBUIDORA DE COSMETICOS EXEMPLO LTDA');
    expect(nfe.dest.cnpj).toBe('98765432000155');
    expect(nfe.ide.mod).toBe('55');
    expect(nfe.ide.tpNF).toBe('1');
    expect(nfe.ide.numero).toBe('1');
    expect(nfe.itens[0].indTot).toBe('1');
  });
});

describe('parseNfe — venda de 1 item (fixture sintético)', () => {
  it('nota de item único → itens.length === 1 (ainda array)', () => {
    const nfe = parseNfe(SALE);
    expect(Array.isArray(nfe.itens)).toBe(true);
    expect(nfe.itens).toHaveLength(1);
    expect(nfe.itens[0].cProd).toBe('SHAMP-500');
    expect(nfe.itens[0].vProdCents).toBe(2990); // 29.90
    expect(nfe.totais.vNFCents).toBe(2990);
    expect(nfe.dest.cpf).toBe('18564071878'); // destinatário pode ser CPF
  });
});

describe('parseNfe — gates de rejeição (rejeita loud)', () => {
  it('cStat 110 (denegada) → rejeita', () => {
    const mutated = PURCHASE.replace('<cStat>100</cStat>', '<cStat>110</cStat>');
    expect(() => parseNfe(mutated)).toThrow(ValidationError);
    expect(() => parseNfe(mutated)).toThrow(/cStat/);
  });

  it('XML truncado → rejeita', () => {
    const truncated = PURCHASE.slice(0, Math.floor(PURCHASE.length / 2));
    expect(() => parseNfe(truncated)).toThrow(ValidationError);
  });

  it('documento com <!DOCTYPE → rejeita (XXE / billion-laughs)', () => {
    const withDoctype =
      '<?xml version="1.0"?>\n<!DOCTYPE nfeProc [<!ENTITY x "y">]>\n' + PURCHASE.split('\n').slice(1).join('\n');
    expect(() => parseNfe(withDoctype)).toThrow(ValidationError);
    expect(() => parseNfe(withDoctype)).toThrow(/DOCTYPE/);
  });

  it('NF-e sem protNFe (NFe avulsa) → rejeita por falta de autorização', () => {
    // Remove o bloco de protocolo inteiro — sobra a NFe processada sem protNFe.
    const noProt = PURCHASE.replace(/<protNFe[\s\S]*?<\/protNFe>/, '');
    expect(() => parseNfe(noProt)).toThrow(/protocolo|autoriza/i);
  });

  it('modelo != 55 (ex.: NFC-e 65) → rejeita', () => {
    const mod65 = PURCHASE.replace('<mod>55</mod>', '<mod>65</mod>');
    expect(() => parseNfe(mod65)).toThrow(/modelo/i);
  });

  it('homologação (tpAmb=2) rejeita por default; aceita sob flag explícita', () => {
    const homolog = PURCHASE.replace('<tpAmb>1</tpAmb>', '<tpAmb>2</tpAmb>');
    expect(() => parseNfe(homolog)).toThrow(/homologa/i);
    // sob flag de teste, passa (chave/cStat ainda válidos)
    expect(parseNfe(homolog, { allowHomologacao: true }).ide.mod).toBe('55');
  });

  it('aceita Buffer além de string', () => {
    const nfe = parseNfe(Buffer.from(PURCHASE, 'utf8'));
    expect(nfe.itens).toHaveLength(3);
  });
});
