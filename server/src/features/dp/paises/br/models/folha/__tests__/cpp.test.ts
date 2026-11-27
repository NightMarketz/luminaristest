/**
 * BE-INCR-DP-PONTE-RAZAO PR-P0 itens 4–6 — `cppPatronal` sobre a fotografia real (as cargas versionadas) mais uma linha
 * de `TERCEIROS_FPAS` de teste: a linha 515 do Anexo III da IN RFB 2.110 [D08] entra só como exemplo (A-3), não como
 * enquadramento de cliente.
 */
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import { ParametroLegalAusenteError, type LinhaLegal } from '../../../../../../legalParameters/models/legalParameter';
import { provaIncoerente } from '../../../../../models/folha/calcNode';
import { arredondarCentavos, fracao } from '../../../../../models/folha/fracao';
import { REAL, regras } from '../../../../../models/folha/__tests__/fotografias';
import { cppPatronal, CppEnquadramentoIncompletoError, type EntradaCpp } from '../cpp';

const DATA = '2026-03-31';

/** FPAS 515 (comércio) no Anexo III: salário-educação 2,5 + Incra 0,2 + Senac 1,0 + Sesc 1,5 + Sebrae 0,6 = 5,8% (código de terceiros 0115). */
const FPAS_515 = { entidades: { '0001': 250, '0002': 20, '0016': 100, '0032': 150, '0064': 60 }, totalBp: 580 };

function linhaTerceiros(json: object, id = 'teste-fpas-515'): LinhaLegal {
  return {
    id, tabela: 'TERCEIROS_FPAS', chave: '515', discriminador: null, valorInt: null, valorTexto: null, valorJson: JSON.stringify(json),
    fonte: 'IN RFB 2.110/2022 Anexo III (linha 515, exemplo de teste)', vigenteDesde: '2022-10-19', vigenteAte: null, status: 'PUBLISHED', supersedesId: null,
  };
}

const da = (foto: readonly LinhaLegal[], tabela: string) => foto.filter((l) => l.tabela === tabela);

function entrada(over: Partial<EntradaCpp> = {}, foto: readonly LinhaLegal[] = REAL, terceiros: LinhaLegal[] = [linhaTerceiros(FPAS_515)]): EntradaCpp {
  return {
    regimeCpp: 'GERAL',
    baseEmpregadosCents: 1_000_000n,
    baseContribuinteIndividualCents: 200_000n,
    ratGrau: 2,
    fapX10000: 10_000,
    fpas: '515',
    tabelas: { encargo: da(foto, 'ENCARGO_FOLHA'), rat: da(foto, 'RAT_ALIQUOTA'), fap: da(foto, 'FAP_LIMITES'), terceiros, regras: regras(foto, DATA), data: DATA },
    ...over,
  };
}

describe('PR-P0 item 4 — cppPatronal por regime', () => {
  it('GERAL: patronal 20% de (empregados + CI), RAT 2% × FAP 1 e terceiros 5,8% só dos empregados; a prova soma', () => {
    const { valor, prova } = cppPatronal(entrada());
    expect([valor.patronalCents, valor.ratCents, valor.terceirosCents, valor.totalCents]).toEqual([240_000n, 20_000n, 58_000n, 318_000n]);
    expect(valor.terceirosPorEntidade.map((t) => [t.codigo, t.valorCents])).toEqual([['0001', 25_000n], ['0002', 2_000n], ['0016', 10_000n], ['0032', 15_000n], ['0064', 6_000n]]);
    expect(provaIncoerente(prova)).toEqual([]);
    expect(prova.filhos.map((f) => f.fonte)).toEqual(['LP:lp-encargo-patronal-bp', 'LP:dp-rat-grau-2-1998', 'LP:teste-fpas-515']);
  });

  it('ANEXO_IV: patronal e RAT como no geral, terceiros zero, e o FPAS não é exigido', () => {
    const { valor, prova } = cppPatronal(entrada({ regimeCpp: 'ANEXO_IV', fpas: null }, REAL, []));
    expect([valor.patronalCents, valor.ratCents, valor.terceirosCents, valor.totalCents]).toEqual([240_000n, 20_000n, 0n, 260_000n]);
    expect(prova.filhos[2]?.fonte).toBe('LC 123/2006 art. 13 § 3º e art. 18 § 5º-C');
    expect(provaIncoerente(prova)).toEqual([]);
  });

  it('NO_DAS: tudo zero, com o nó de prova da CPP no DAS; grau, FAP e FPAS não são exigidos', () => {
    const { valor, prova } = cppPatronal(entrada({ regimeCpp: 'NO_DAS', ratGrau: null, fapX10000: null, fpas: null }, REAL, []));
    expect([valor.patronalCents, valor.ratCents, valor.terceirosCents, valor.totalCents]).toEqual([0n, 0n, 0n, 0n]);
    expect(prova.filhos.map((f) => f.rotulo)).toEqual(['CPP no DAS (LC 123 art. 13 VI)']);
  });

  it('FAP truncado na 4ª casa entra exato: RAT 1% × 1,5001 sobre R$ 3.333,33 arredonda só no total', () => {
    const { valor } = cppPatronal(entrada({ ratGrau: 1, fapX10000: 15_001, baseEmpregadosCents: 333_333n, baseContribuinteIndividualCents: 0n }));
    // 333333 × 100 × 15001 / 10000 / 10000 = 5000,328333… ⇒ 5000 (meio para cima no centavo)
    expect(valor.ratAjustado).toEqual(fracao(15_001n, 100n));
    expect(valor.ratCents).toBe(5_000n);
  });

  it('enquadramento que falta vira erro nomeado (o chamador transforma em pendência, item 9)', () => {
    const campo = (e: Partial<EntradaCpp>) => {
      try {
        cppPatronal(entrada(e));
      } catch (err) {
        return err instanceof CppEnquadramentoIncompletoError ? err.campo : String(err);
      }
      return 'sem erro';
    };
    expect(campo({ fpas: null })).toBe('fpas');
    expect(campo({ ratGrau: null })).toBe('ratGrau');
    expect(campo({ fapX10000: null })).toBe('fapX10000');
    expect(campo({ fapX10000: 4_999 })).toBe('fapX10000');
    expect(campo({ fapX10000: 20_001 })).toBe('fapX10000');
    expect(campo({ fapX10000: 20_000 })).toBe('sem erro');
  });

  it('linha ausente ⇒ PARAMETRO_LEGAL_AUSENTE, nunca zero: FPAS sem linha e competência antes da tabela do RAT', () => {
    expect(() => cppPatronal(entrada({ fpas: '999' }))).toThrow(ParametroLegalAusenteError);
    const antes = entrada();
    expect(() => cppPatronal({ ...antes, tabelas: { ...antes.tabelas, data: '1998-12-10' } })).toThrow(ParametroLegalAusenteError);
  });
});

describe('PR-P0 item 5 — regra de parâmetro: cada parcela muda com a fotografia', () => {
  it('RAT 2 → 3 muda o RAT; Sebrae 0,6 → 0,7 muda os terceiros; patronal 20 → 21 muda a patronal', () => {
    const base = cppPatronal(entrada()).valor;
    const rat3 = REAL.map((l) => (l.tabela === 'RAT_ALIQUOTA' && l.chave === 'GRAU_2' ? { ...l, valorInt: 300 } : l));
    expect(cppPatronal(entrada({}, rat3)).valor.ratCents).toBe(30_000n);
    const sebrae = linhaTerceiros({ entidades: { ...FPAS_515.entidades, '0064': 70 }, totalBp: 590 });
    expect(cppPatronal(entrada({}, REAL, [sebrae])).valor.terceirosCents).toBe(59_000n);
    const patronal21 = REAL.map((l) => (l.tabela === 'ENCARGO_FOLHA' && l.chave === 'PATRONAL_BP' ? { ...l, valorInt: 2_100 } : l));
    expect(cppPatronal(entrada({}, patronal21)).valor.patronalCents).toBe(252_000n);
    expect([base.ratCents, base.terceirosCents, base.patronalCents]).toEqual([20_000n, 58_000n, 240_000n]);
  });

  it('nenhum literal numérico de regra no cpp.ts (só 0, 1, a unidade 10000 do bp/FAP e o domínio 1|2|3 do grau no tipo)', () => {
    const fonte = fs
      .readFileSync(path.resolve(__dirname, '../cpp.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/\/\^[^/]*\$\//g, '//');
    const literais = new Set(fonte.match(/\b\d[\d_]*n?\b/g) ?? []);
    expect([...literais].filter((n) => !['0', '0n', '1n', '10_000', '10_000n', '1', '2', '3'].includes(n))).toEqual([]);
  });
});

describe('PR-P0 item 6 — sem teto: a patronal é 20% de qualquer base', () => {
  it('base de R$ 20.000,00 (acima do teto do RGPS) ⇒ patronal de R$ 4.000,00', () => {
    expect(cppPatronal(entrada({ baseEmpregadosCents: 2_000_000n, baseContribuinteIndividualCents: 0n })).valor.patronalCents).toBe(400_000n);
  });

  it('propriedade: patronal(b) = 20% × b, arredondado no centavo, para todo b ≥ 0 (empregados + CI)', () => {
    const modo = regras(REAL, DATA).arredondamento.valor;
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 10n ** 12n }), fc.bigInt({ min: 0n, max: 10n ** 12n }), (emp, ci) => {
        const { valor } = cppPatronal(entrada({ baseEmpregadosCents: emp, baseContribuinteIndividualCents: ci }));
        return valor.patronalCents === arredondarCentavos(fracao((emp + ci) * 20n, 100n), modo);
      }),
    );
  });
});
