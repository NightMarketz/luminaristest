/**
 * ISS-TRANSICAO-IBS PR-2 (BRIEF `docs/accounting/BE-INCR-ISS-TRANSICAO-IBS-brief.md` itens 8, 10, 11 e 13; régua A3/A7).
 * Puro, sem banco: a semente é o mesmo texto da migração. Ramos escolhidos pela lei no fold de 30/10
 * (D-2026-10-30-TRIAGEM-CONTADOR, dossiê pesquisas-legais/triagem-contador-2026-10-30 [D01]/[D09]):
 * - P-ISS-1 → leitura (b): ADCT art. 128 caput I–IV (EC 132/2023) — o piso cai junto: 180/160/140/120 em 2029–2032;
 * - P-ISS-2 → § 3º afasta: o percentual do benefício fica mantido até 31/12/2032 (o cálculo não muda — identidade);
 * - P-ISS-3 → segue o pacoteFatoGerador (teste no FiscalDocumentEmissionService.test.ts, item 9).
 * Esperados = aritmética sobre as tabelas da semente (3ª faixa do Anexo III: ISS 3,432% em 2028, × 9/10…6/10 depois).
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_ISS_TRANSICAO_V2, SIMPLES_SEED_FILES, legalParamsSeedRows } from '@test/helpers/legalParams';
import { SemLinhaVigenteError, type LegalParameterTabela, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import { issAliquotaMinBp } from '../issLimite';
import { fatorReducaoIssBp, issAliquotaNaTransicaoBp } from '../issTransicao';
import { issComBeneficio, reducaoBpDaFaixa } from '../issBeneficio';
import { apurar, type ApuracaoInput } from '../simplesCalc';

const pr2 = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_ISS_TRANSICAO_V2);
const todas = legalParamsSeedRows();

describe('semente do PR-2 (item 10)', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_iss_transicao_v2.sql e só insere', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261106120000_legal_parameters_iss_piso/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_ISS_TRANSICAO_V2, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
    expect(pr2.every((l) => l.fonte.trim().length > 0 && /^[0-9a-f]{64}$/.test(l.fonteSha256 ?? ''))).toBe(true);
  });

  it('ISS_LIMITE/ALIQUOTA_MIN_BP: 200 de 2025 a 2028 e 180/160/140/120 de 2029 a 2032, todas PUBLISHED e no formato', () => {
    expect(pr2.map((l) => [l.tabela, l.chave, l.vigenteDesde, l.vigenteAte, l.valorInt, l.status])).toEqual([
      ['ISS_LIMITE', 'ALIQUOTA_MIN_BP', '2025-01-01', '2028-12-31', 200, 'PUBLISHED'],
      ['ISS_LIMITE', 'ALIQUOTA_MIN_BP', '2029-01-01', '2029-12-31', 180, 'PUBLISHED'],
      ['ISS_LIMITE', 'ALIQUOTA_MIN_BP', '2030-01-01', '2030-12-31', 160, 'PUBLISHED'],
      ['ISS_LIMITE', 'ALIQUOTA_MIN_BP', '2031-01-01', '2031-12-31', 140, 'PUBLISHED'],
      ['ISS_LIMITE', 'ALIQUOTA_MIN_BP', '2032-01-01', '2032-12-31', 120, 'PUBLISHED'],
    ]);
    for (const l of pr2) expect([l.id, erroDeFormato({ ...l, tabela: l.tabela as LegalParameterTabela })]).toEqual([l.id, null]);
    expect(erroDeFormato({ tabela: 'ISS_LIMITE', chave: 'ALIQUOTA_MIN_BP', valorInt: 20_000 })).toMatch(/0\.\.10000/);
    expect(erroDeFormato({ tabela: 'ISS_LIMITE', chave: 'ALIQUOTA_PISO', valorInt: 200 })).not.toBeNull();
  });
});

describe('item 10 — piso por vigência (F-ISS-4 a)', () => {
  it.each([
    ['2028-12-31', 200],
    ['2029-01-01', 180],
    ['2030-06-30', 160],
    ['2031-12-31', 140],
    ['2032-12-31', 120],
  ])('%s ⇒ %i bp', (data, bp) => expect(issAliquotaMinBp(todas, data)).toBe(bp));

  it('A3: 2033 sem linha ⇒ SemLinhaVigenteError nomeado com a data', () => {
    expect(() => issAliquotaMinBp(todas, '2033-01-01')).toThrow(SemLinhaVigenteError);
    expect(() => issAliquotaMinBp(todas, '2033-01-01')).toThrow('Sem linha vigente de ISS_LIMITE/ALIQUOTA_MIN_BP em 2033-01-01');
  });

  it('A3: PA de 2029 só com a linha DRAFT ⇒ 400 nomeado (ValidationError), nunca o 200 de 2028', () => {
    const soDraft: LinhaLegal[] = todas.map((l) => (l.chave === 'ALIQUOTA_MIN_BP' && l.vigenteDesde === '2029-01-01' ? { ...l, status: 'DRAFT' } : l));
    let erro: unknown;
    try {
      issAliquotaMinBp(soDraft, '2029-01-01');
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(SemLinhaVigenteError);
    expect((erro as Error).message).toContain('ALIQUOTA_MIN_BP em 2029-01-01');
    expect((erro as { statusCode?: number }).statusCode).toBe(400);
  });

  it('issComBeneficio usa o piso recebido (isenção sobre 3,5%: 2028 ⇒ 200; 2029 ⇒ 180)', () => {
    const ISENCAO = { tipo: 'ISENCAO' as const, reducaoBpPorFaixa: null };
    expect(issComBeneficio({ issTabelaBp: 350, faixa: 1, cTribNac: '060101', beneficio: ISENCAO, pisoIssBp: issAliquotaMinBp(todas, '2028-12-01') }).issAplicadoBp).toBe(200);
    expect(issComBeneficio({ issTabelaBp: 350, faixa: 1, cTribNac: '060101', beneficio: ISENCAO, pisoIssBp: issAliquotaMinBp(todas, '2029-01-01') }).issAplicadoBp).toBe(180);
  });
});

describe('item 8 — alíquota do regime normal com o fator (F-ISS-1 a)', () => {
  it('500 × (10000 − fator)/10000: 2028-12-31 ⇒ 500; 2029-01-15 ⇒ 450; 2032-12-31 ⇒ 300', () => {
    expect(issAliquotaNaTransicaoBp(500, fatorReducaoIssBp(todas, '2028-12-31'))).toBe(500);
    expect(issAliquotaNaTransicaoBp(500, fatorReducaoIssBp(todas, '2029-01-15'))).toBe(450);
    expect(issAliquotaNaTransicaoBp(500, fatorReducaoIssBp(todas, '2032-12-31'))).toBe(300);
  });

  // A1 do revisor do #1111: o fator dá meio bp; o dono decidiu (chat, 06/11): "Meio para cima". O resultado é bp
  // inteiro, e o meio bp sobe sempre (antes, o toFixed de ponto flutuante subia em uns casos e descia em outros).
  it.each([
    [205, 1000, 185], // 184,5 ⇒ 185 (antes 1.84)
    [215, 3000, 151], // 150,5 ⇒ 151 (antes 1.50)
    [225, 1000, 203], // 202,5 ⇒ 203 (antes 2.02)
    [235, 1000, 212], // 211,5 ⇒ 212
    [225, 3000, 158], // 157,5 ⇒ 158 (antes 1.57)
    [275, 1000, 248], // 247,5 ⇒ 248
    [333, 2000, 266], // 266,4 ⇒ 266 (abaixo do meio desce)
  ])('A1: %i bp com fator %i ⇒ %i bp inteiro, meio para cima', (aliq, fator, esperado) => {
    const bp = issAliquotaNaTransicaoBp(aliq, fator);
    expect(Number.isInteger(bp)).toBe(true);
    expect(bp).toBe(esperado);
  });
});

describe('itens 10, 11 e 13 no cálculo do DAS (3ª faixa do Anexo III, serviço 06.01, R$ 50.000 no PA)', () => {
  const LINHAS = legalParamsSeedRows(SIMPLES_SEED_FILES);
  const hist = (comp: string) => {
    const [y, m] = comp.split('-').map(Number);
    return Array.from({ length: 24 }, (_, k) => ({ competencia: new Date(Date.UTC(y, m - 2 - k, 1)).toISOString().slice(0, 7), receitaBrutaCents: 5_000_000, folhaCents: null }));
  };
  type Ben = NonNullable<ApuracaoInput['atividades'][number]['beneficioIss']>;
  const entrada = (comp: string, beneficioIss?: Ben): ApuracaoInput => ({
    competencia: comp,
    historico: hist(comp),
    inicioAtividade: null,
    receitaPaCents: 0,
    folhaPaCents: 0,
    sublimiteExcedido: false,
    atividades: [{ natureza: 'SERVICO', cTribNac: '060101', parcelas: [{ receitaCents: 5_000_000, excluir: [] }], beneficioIss }],
  });
  /** O piso entra como o serviço o lê: a linha vigente no 1º dia do PA. */
  const iss = (comp: string, b?: { tipo: 'ISENCAO' | 'REDUCAO_PERCENTUAL'; reducaoBpPorFaixa: number[] | null }) => {
    const a = apurar(entrada(comp, b && { ...b, pisoIssBp: issAliquotaMinBp(todas, `${comp}-01`) }), LINHAS).atividades[0];
    return [a.percentuais.ISS ?? null, a.tributos.ISS ?? null];
  };

  it('A7: tabela de esperados (ano × benefício → % do ISS e ISS em centavos), comparada inteira', () => {
    const comps = ['2028-12', '2029-01', '2030-06', '2031-06', '2032-12'];
    const tabela = comps.map((c) => [c, iss(c), iss(c, { tipo: 'ISENCAO', reducaoBpPorFaixa: null }), iss(c, { tipo: 'REDUCAO_PERCENTUAL', reducaoBpPorFaixa: [2000] })]);
    expect(tabela).toEqual([
      // PA       sem benefício           isenção ⇒ piso          redução de 20% (§ 3º: percentual mantido)
      ['2028-12', ['3.4320', 171_600], ['2.0000', 100_000], ['2.7456', 137_280]],
      ['2029-01', ['3.0888', 154_440], ['1.8000', 90_000], ['2.4710', 123_552]],
      ['2030-06', ['2.7456', 137_280], ['1.6000', 80_000], ['2.1965', 109_824]],
      ['2031-06', ['2.4024', 120_120], ['1.4000', 70_000], ['1.9219', 96_096]],
      ['2032-12', ['2.0592', 102_960], ['1.2000', 60_000], ['1.6474', 82_368]],
    ]);
  });

  it('item 11 (P-ISS-2 → ramo § 3º): isenção de 10000 bp em 2029 continua 10000 — a redução não cai pelo fator', () => {
    expect(reducaoBpDaFaixa({ tipo: 'ISENCAO', reducaoBpPorFaixa: null }, 3)).toBe(10000);
    expect(reducaoBpDaFaixa({ tipo: 'REDUCAO_PERCENTUAL', reducaoBpPorFaixa: [2000] }, 3)).toBe(2000);
    // Identidade no DAS: 2029 com 20% = tabela de 2029 × 8/10, exatos (3,0888% × 0,8 = 2,47104%).
    expect(iss('2029-01', { tipo: 'REDUCAO_PERCENTUAL', reducaoBpPorFaixa: [2000] })[1]).toBe(Math.round(154_440 * 0.8));
  });

  it('item 13: PA 2033-01 com benefício não aplica benefício nem piso — os Anexos de 2033 não têm ISS', () => {
    const a = apurar(entrada('2033-01', { tipo: 'ISENCAO', reducaoBpPorFaixa: null, pisoIssBp: 200 }), LINHAS).atividades[0];
    expect(a.percentuais.ISS).toBeUndefined();
    expect(a.tributos.ISS).toBeUndefined();
    expect(a.beneficioIss).toBeUndefined();
  });
});
