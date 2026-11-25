/**
 * Onda 3.2 (auditoria 24/11/2026) — o marco "CSLL só tem a LC 224 desde 01/04/2026" deixou de ser literal em
 * `taxAssessmentCalc.ts`: é o `vigenteDesde` da linha `TAX_ASSESSMENT/LC224_ACRESCIMO_CSLL`. Prova: o resultado muda
 * alterando SÓ a linha da tabela (a "virada" é dado, não código), e o arquivo não repete a data.
 */
import fs from 'fs';
import path from 'path';
import { tabelaApuracaoSemente } from '@test/helpers/legalParams';
import { parcelaExcedenteLc224, type EntradaLc224 } from '../taxAssessmentCalc';
import { primeiraVigenciaDe, type TabelaApuracao } from '../taxAssessmentParams';

const semente = tabelaApuracaoSemente();
/** A mesma fotografia, só com o `vigenteDesde` da linha do acréscimo da CSLL trocado (e o fim da anterior intocado). */
const comCsllDesde = (desde: string): TabelaApuracao => ({
  ...semente,
  linhas: semente.linhas.map((l) => (l.chave === 'LC224_ACRESCIMO_CSLL' ? { ...l, vigenteDesde: desde } : l)),
});

const R = (reais: number): bigint => BigInt(reais) * 100n;
const entrada = (tabela: TabelaApuracao, over: Partial<EntradaLc224>): EntradaLc224 => ({
  tabela, ano: 2026, periodo: 'T02', tributo: 'CSLL', receitaTrimestreCents: R(1_000_000), anteriores: [], inicioAtividadeEm: null, encerramentoAtividadeEm: null, ...over,
});

describe('CSLL × LC 224 — marco vindo da linha da tabela (Onda 3.2)', () => {
  it('a semente publica o marco em 2026-04-01 e `primeiraVigenciaDe` o lê', () => {
    expect(primeiraVigenciaDe(semente, 'LC224_ACRESCIMO_CSLL')).toBe('2026-04-01');
    expect(primeiraVigenciaDe(semente, 'LC224_ACRESCIMO_IRPJ')).toBe('2026-01-01');
  });

  it('T01/2026: a CSLL ainda não tem LC 224 (marco 01/04); a mesma entrada no IRPJ tem — o corte vem da linha', () => {
    expect(parcelaExcedenteLc224(entrada(semente, { periodo: 'T01', tributo: 'CSLL' })).vigente).toBe(false);
    expect(parcelaExcedenteLc224(entrada(semente, { periodo: 'T01', tributo: 'IRPJ' })).vigente).toBe(true);
    expect(parcelaExcedenteLc224(entrada(semente, { periodo: 'T02', tributo: 'CSLL' })).vigente).toBe(true);
  });

  it('virada só por dado: mover a linha para 2026-07-01 tira o T02 da CSLL; para 2026-01-01 devolve o T01 — sem tocar código', () => {
    expect(parcelaExcedenteLc224(entrada(comCsllDesde('2026-07-01'), { periodo: 'T02' })).vigente).toBe(false);
    expect(parcelaExcedenteLc224(entrada(comCsllDesde('2026-07-01'), { periodo: 'T03' })).vigente).toBe(true);
    expect(parcelaExcedenteLc224(entrada(comCsllDesde('2026-01-01'), { periodo: 'T01' })).vigente).toBe(true);
  });

  it('o limite anual do T04 (§ 9º: trimestres em atividade × limite) acompanha o marco: 3 trimestres com a semente, 2 com 01/07', () => {
    const t04 = (tabela: TabelaApuracao) => parcelaExcedenteLc224(entrada(tabela, { periodo: 'T04', receitaTrimestreCents: R(4_000_000) }));
    // semente: ativos T02..T04 ⇒ limite anual 3 × 1.250.000 = 3.750.000; acumulada 4.000.000 ⇒ E = 250.000
    expect(t04(semente).excedenteCents).toBe(R(250_000));
    // linha em 01/07: ativos T03..T04 ⇒ 2 × 1.250.000 = 2.500.000 ⇒ E = 1.500.000 (< excedente do trimestre 2.750.000)
    expect(t04(comCsllDesde('2026-07-01')).excedenteCents).toBe(R(1_500_000));
  });

  it('sem linha do acréscimo da CSLL na tabela não há LC 224 na CSLL (fail-closed), e o IRPJ segue', () => {
    const semLinha: TabelaApuracao = { ...semente, linhas: semente.linhas.filter((l) => l.chave !== 'LC224_ACRESCIMO_CSLL') };
    expect(parcelaExcedenteLc224(entrada(semLinha, { periodo: 'T03' })).vigente).toBe(false);
    expect(parcelaExcedenteLc224(entrada(semLinha, { periodo: 'T03', tributo: 'IRPJ' })).vigente).toBe(true);
  });

  it('o cálculo não repete a data do marco em literal (a fonte única é a linha)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'taxAssessmentCalc.ts'), 'utf8');
    const codigo = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(codigo).not.toMatch(/['"]2026-04-01['"]/);
  });
});
