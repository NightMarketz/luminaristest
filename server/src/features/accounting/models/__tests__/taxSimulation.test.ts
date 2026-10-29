import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_ENCARGO_FOLHA, SIMPLES_SEED_FILES, legalParamsSeedRows, tabelaApuracaoSemente, tabelaPisCofinsSemente, fotografiaSemente } from '@test/helpers/legalParams';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import type { LegalParameterTabela, LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { tabelaIbsCbsDe, tabelaProvisoriaCbsDe } from '../ibsCbsParams';
import type { ApuracaoInput, MesReceita } from '../simplesCalc';
import {
  AVISO_FOLHA_REAL,
  custoFolhaAdicional,
  encargosFolhaDe,
  inssContribuinteIndividual,
  simularFatorR,
  simularRegimeAno,
  simularRemuneracao,
  type EntradaRegime,
  type MesRegimeEntrada,
} from '../taxSimulation';

/**
 * BE-INCR-EFICIENCIA-FISCAL PR-3 (nó EFICIENCIA-FISCAL, BRIEF itens 15–17; ADR D8; decisões do dono de 28/10 em
 * D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO) — simuladores puros contra as linhas REAIS da semente. Os esperados são
 * aritmética sobre a lei (alíquota × base), não oráculo.
 */
const ENCARGO = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_ENCARGO_FOLHA) as LinhaLegal[];
const E2026 = encargosFolhaDe(ENCARGO, '2026-06-01');

describe('decisão 1 — semente ENCARGO_FOLHA', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_encargo_folha_v1.sql e só insere', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261029120000_legal_parameters_encargo_folha/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_ENCARGO_FOLHA, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('4 linhas PUBLISHED no formato, com fonte e sha256: 11%, 20%, 8% e o teto de R$ 8.475,55 desde 01/2026', () => {
    expect(ENCARGO.map((l) => [l.chave, l.valorInt, l.vigenteDesde, l.status])).toEqual([
      ['CI_SEGURADO_BP', 1100, '2003-04-01', 'PUBLISHED'],
      ['PATRONAL_BP', 2000, '2000-03-01', 'PUBLISHED'],
      ['FGTS_BP', 800, '1990-05-14', 'PUBLISHED'],
      ['TETO_RGPS_CENTS', 847555, '2026-01-01', 'PUBLISHED'],
    ]);
    for (const l of ENCARGO) {
      expect([l.id, erroDeFormato({ ...l, tabela: l.tabela as LegalParameterTabela, valorJson: undefined })]).toEqual([l.id, null]);
      expect((l as { fonteSha256?: string | null }).fonteSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(ENCARGO.find((l) => l.chave === 'TETO_RGPS_CENTS')!.fonte).toContain('Portaria Interministerial MPS/MF nº 13/2026');
  });

  it('o formato recusa chave desconhecida, bp fora de 0..10000 e discriminador', () => {
    const l = ENCARGO[0];
    expect(erroDeFormato({ ...l, tabela: 'ENCARGO_FOLHA', chave: 'RAT_BP', valorJson: undefined })).not.toBeNull();
    expect(erroDeFormato({ ...l, tabela: 'ENCARGO_FOLHA', valorInt: 10_001, valorJson: undefined })).not.toBeNull();
    expect(erroDeFormato({ ...l, tabela: 'ENCARGO_FOLHA', discriminador: 'SP', valorJson: undefined })).not.toBeNull();
  });

  it('INSS do sócio = 11% até o teto; antes de 2026 o teto não tem linha e o INSS é 400 nomeado', () => {
    expect(inssContribuinteIndividual(500_000n, E2026)).toBe(55_000n);
    expect(inssContribuinteIndividual(2_000_000n, E2026)).toBe(93_231n); // 11% × 8.475,55 = 932,31
    const e2025 = encargosFolhaDe(ENCARGO, '2025-06-01');
    expect(e2025.tetoRgpsCents).toBeNull();
    expect(() => inssContribuinteIndividual(100n, e2025)).toThrow(/ENCARGO_FOLHA\/TETO_RGPS_CENTS/);
  });

  it('custo da folha adicional: pró-labore = INSS mês a mês até o teto; empregado = FGTS 8%; CPP só fora do DAS', () => {
    expect(custoFolhaAdicional(1_200_000n, 'PRO_LABORE', E2026, false)).toBe(132_000n); // 12 × 11% × 1.000
    expect(custoFolhaAdicional(24_000_000n, 'PRO_LABORE', E2026, false)).toBe(12n * 93_231n); // 20 mil/mês, cada mês no teto
    expect(custoFolhaAdicional(1_200_000n, 'EMPREGADO', E2026, false)).toBe(96_000n);
    expect(custoFolhaAdicional(1_200_000n, 'EMPREGADO', E2026, true)).toBe(96_000n + 240_000n);
    expect(custoFolhaAdicional(0n, 'PRO_LABORE', E2026, true)).toBe(0n);
  });
});

// ---- item 15 ----

const SIMPLES = legalParamsSeedRows(SIMPLES_SEED_FILES) as LinhaLegal[];
/** 060101 sujeito ao fator r (Anexo V/III) — a semente não tem atividade com fator r; a mutação é a do simplesCalc.test. */
const COM_FATOR_R = SIMPLES.map((l) => (l.id === 'sn1-enq-servico-060101' ? { ...l, valorJson: JSON.stringify({ anexo: 'V', fatorR: true, semIss: false }) } : l));
const somaMeses = (comp: string, d: number) => {
  const [a, m] = comp.split('-').map(Number);
  const t = a * 12 + m - 1 + d;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
const historico = (comp: string, receita: number, folha: number | null): MesReceita[] =>
  Array.from({ length: 13 }, (_, k) => ({ competencia: somaMeses(comp, -(k + 1)), receitaBrutaCents: receita, folhaCents: folha }));
const entradaPa = (folhaMes: number): ApuracaoInput => ({
  competencia: '2026-06',
  historico: historico('2026-06', 5_000_000, folhaMes), // RBT12 R$ 600 mil
  inicioAtividade: null,
  receitaPaCents: 5_000_000,
  folhaPaCents: folhaMes,
  sublimiteExcedido: false,
  atividades: [{ natureza: 'SERVICO', cTribNac: '060101', parcelas: [{ receitaCents: 5_000_000, excluir: [] }] }],
});

describe('item 15 — simulador do fator r (LC 123 art. 18 §§ 5º-J/5º-M; Res. CGSN 140 art. 26)', () => {
  it('FS12 de R$ 120 mil (r = 0,20, Anexo V) → alvo de R$ 168 mil (r = 0,28, Anexo III): DAS cai, custo = INSS do pró-labore adicional', () => {
    const r = simularFatorR(entradaPa(1_000_000), COM_FATOR_R, 16_800_000n, 'PRO_LABORE', E2026);
    expect([r.rAtual, r.anexoAtual, r.rSimulado, r.anexoSimulado]).toEqual([0.2, 'V', 0.28, 'III']);
    expect(r.fs12AtualCents).toBe(12_000_000n);
    expect(r.folhaAdicionalCents).toBe(4_800_000n);
    expect(r.custoFolhaAdicionalCents).toBe(528_000n); // 12 × 11% × R$ 4.000
    expect(r.dasSimuladoCents).toBeLessThan(r.dasAtualCents);
    expect(r.economiaLiquidaCents).toBe(r.dasAtualCents - r.dasSimuladoCents - 528_000n);
  });

  it('I-5: toda resposta traz o aviso de folha real (texto da P-EF-5) — mesmo sem economia', () => {
    const r = simularFatorR(entradaPa(1_400_000), COM_FATOR_R, 1_000_000n, 'EMPREGADO', E2026);
    expect(r.avisos[0]).toBe(AVISO_FOLHA_REAL);
    expect(AVISO_FOLHA_REAL).toBe('pró-labore pode subir se efetivamente pago e com INSS recolhido; não flutue para bater 28 %');
    // alvo abaixo da FS12: nada a adicionar, custo 0, o r simulado cai (o anexo vai para o V).
    expect([r.folhaAdicionalCents, r.custoFolhaAdicionalCents, r.anexoSimulado]).toEqual([0n, 0n, 'V']);
    expect(r.economiaLiquidaCents).toBeLessThan(0n);
  });

  it('a entrada não muda (a folha simulada nunca volta para quem chamou)', () => {
    const input = entradaPa(1_000_000);
    const antes = JSON.stringify(input);
    simularFatorR(input, COM_FATOR_R, 16_800_000n, 'PRO_LABORE', E2026);
    expect(JSON.stringify(input)).toBe(antes);
  });

  it('PA sem atividade sujeita ao fator r ⇒ 400 SEM_ATIVIDADE_SUJEITA_AO_FATOR_R', () => {
    expect(() => simularFatorR(entradaPa(1_000_000), SIMPLES, 16_800_000n, 'PRO_LABORE', E2026)).toThrow(expect.objectContaining({ errorCode: 'SEM_ATIVIDADE_SUJEITA_AO_FATOR_R' }));
  });
});

// ---- item 16 ----

// As tabelas do Simples moram nos arquivos da semente do X14 (SIMPLES_SEED_FILES), fora da fotografia geral.
const LINHAS_REGIME = [...SIMPLES, ...fotografiaSemente(['IBS_CBS', 'IBS_CBS_PROVISORIA', 'ENCARGO_FOLHA'])];
const mesesDe = (ano: number): MesRegimeEntrada[] =>
  Array.from({ length: 12 }, (_, i) => ({
    competencia: `${ano}-${String(i + 1).padStart(2, '0')}`,
    servicoCents: 5_000_000n,
    revendaCents: 0n,
    naoUsoCents: 0n,
    atividadesSimples: [{ natureza: 'SERVICO' as const, cTribNac: '060101', parcelas: [{ receitaCents: 5_000_000, excluir: [] }] }],
    receitaSimplesCents: 5_000_000n,
    folhaCents: 1_000_000n,
  }));
const entradaRegime = (ano: number): EntradaRegime => ({
  ano,
  meses: mesesDe(ano),
  historicoAnterior: Array.from({ length: 13 }, (_, k) => ({ competencia: somaMeses(`${ano}-01`, -(k + 1)), receitaBrutaCents: 5_000_000, folhaCents: 1_000_000 })),
  inicioAtividade: null,
  perfil: {
    ecfIndAliqCsll: '1',
    ecfIndRecReceita: '2',
    lc224AcrescimoSuspenso: false,
    lc224LiminarReferencia: null,
    inicioAtividadeEm: null,
    encerramentoAtividadeEm: null,
    prestadoraExclusivaServicos: false,
    declaraNaoProfissaoRegulamentada: false,
    lucroRealObrigatorio: false,
  },
  resultadoAntesPorTrimestre: [10_000_000n, 10_000_000n, 10_000_000n, 10_000_000n],
  issAliquotaBp: 500,
  sublimiteCents: 360_000_000n,
  linhas: LINHAS_REGIME,
  tabelaApuracao: tabelaApuracaoSemente(),
  tabelaPisCofins: tabelaPisCofinsSemente(),
  tabelaIbsCbs: tabelaIbsCbsDe(LINHAS_REGIME),
  tabelaCbsProvisoria: tabelaProvisoriaCbsDe(LINHAS_REGIME),
  encargos: encargosFolhaDe(LINHAS_REGIME, `${ano}-12-31`),
});

describe('item 16 — simulador de regime (F-EF-7 a; decisão 3)', () => {
  const s = simularRegimeAno(entradaRegime(2026));
  const c = (r: string) => s.cenarios.find((x) => x.regime === r)!;

  it('Simples: R$ 50 mil/mês de 060101 com RBT12 de R$ 600 mil = 10,56% (3ª faixa do Anexo III) × 12 = R$ 63.360,00', () => {
    expect(c('SIMPLES').motivoIndisponivel).toBeNull();
    expect(c('SIMPLES')).toMatchObject({ disponivel: true, cargaTotalCents: 6_336_000n });
    expect(c('SIMPLES').componentes.cpp).toBe(0n); // CPP no DAS fora do Anexo IV
  });

  it('Presumido: IRPJ 15% × 32% + CSLL 9% × 32% + PIS 0,65% + COFINS 3% + ISS 5% + CPP 20% da folha = R$ 121.980,00', () => {
    expect(c('PRESUMIDO').componentes).toEqual({ das: 0n, irpj: 2_880_000n, csll: 1_728_000n, pis: 390_000n, cofins: 1_800_000n, cbs: 0n, ibs: 0n, cpp: 2_400_000n, iss: 3_000_000n });
    expect(c('PRESUMIDO').cargaTotalCents).toBe(12_198_000n);
  });

  it('Real: resultado de R$ 100 mil/trimestre → IRPJ 15% + adicional 10% sobre R$ 40 mil + CSLL 9%; PIS 1,65% + COFINS 7,6% sem créditos', () => {
    expect(c('REAL').componentes).toEqual({ das: 0n, irpj: 7_600_000n, csll: 3_600_000n, pis: 990_000n, cofins: 4_560_000n, cbs: 0n, ibs: 0n, cpp: 2_400_000n, iss: 3_000_000n });
    expect(s.melhor).toBe('SIMPLES');
  });

  it('cada aproximação vira aviso (Real sem LALUR, sem créditos; CPP sem RAT; ano-teste 2026 da CBS/IBS)', () => {
    expect(s.avisos.join(' | ')).toMatch(/sem adições\/exclusões do e-Lalur/);
    expect(s.avisos.join(' | ')).toMatch(/sem RAT\/FAP/);
    expect(s.avisos.join(' | ')).toMatch(/LC 214 art. 348 § 1º/);
  });

  it('cenário que a lei não calcula fica indisponível com o motivo, sem derrubar os outros', () => {
    const e = entradaRegime(2026);
    const semCsll = simularRegimeAno({ ...e, perfil: { ...e.perfil, ecfIndAliqCsll: '9' } });
    expect(semCsll.cenarios.find((x) => x.regime === 'PRESUMIDO')!.disponivel).toBe(false);
    expect(semCsll.cenarios.find((x) => x.regime === 'SIMPLES')!.disponivel).toBe(true);
  });

  it('2027 (decisão 4): sem PIS/COFINS; IBS 0,05% + 0,05% sobre a receita; CBS DRAFT ⇒ aviso e fora da carga', () => {
    const p = simularRegimeAno(entradaRegime(2027));
    const pres = p.cenarios.find((x) => x.regime === 'PRESUMIDO')!;
    expect([pres.componentes.pis, pres.componentes.cofins, pres.componentes.cbs, pres.componentes.ibs]).toEqual([0n, 0n, 0n, 60_000n]);
    expect(p.avisos.join(' | ')).toMatch(/CBS de 2027: linha oficial DRAFT/);
  });
});

// ---- item 17 ----

const LINHAS_REM = fotografiaSemente(['IRRF_PF_MENSAL', 'IRRF_DISTRIBUICAO', 'ENCARGO_FOLHA', 'SALARIO_MINIMO']);
const remuneracao = (over: Partial<Parameters<typeof simularRemuneracao>[0]> = {}) =>
  simularRemuneracao({
    ano: 2026,
    valorAnualCents: 24_000_000n, // R$ 20 mil/mês
    regime: 'SIMPLES',
    cppForaDoDas: false,
    salarioMinimoCents: 162_100n,
    encargos: E2026,
    linhas: LINHAS_REM,
    jcpLimiteSocioCents: null,
    aliquotaMarginalBp: null,
    ...over,
  });

describe('item 17 — remuneração do sócio (decisão 6: montante informado, 3 mixes)', () => {
  it('100% pró-labore: INSS no teto todo mês e IRPF pela tabela; mínimo + dividendos: R$ 18.379/mês abaixo de R$ 50 mil ⇒ IRRF 0', () => {
    const r = remuneracao();
    const [integral, minimo, comJcp] = r.mixes;
    expect(integral).toMatchObject({ proLaboreCents: 24_000_000n, dividendosCents: 0n, inssSocioCents: 12n * 93_231n, irrfDividendosCents: 0n });
    expect(integral.irpfProLaboreCents).toBeGreaterThan(0n);
    expect(minimo).toMatchObject({ proLaboreCents: 1_945_200n, dividendosCents: 22_054_800n, inssSocioCents: 12n * 17_831n, irpfProLaboreCents: 0n, irrfDividendosCents: 0n });
    expect(comJcp).toMatchObject({ jcpCents: 0n, cargaTotalCents: minimo.cargaTotalCents }); // fora do Real o JCP não entra
    expect(r.melhor).toBe('PRO_LABORE_MINIMO_DIVIDENDOS');
    expect(r.economiaCents).toBe(integral.cargaTotalCents - minimo.cargaTotalCents);
    expect(r.avisos.join(' | ')).toMatch(/SC Cosit 228\/2023/);
    expect(r.avisos.join(' | ')).toMatch(/F-IRD-12/);
  });

  it('dividendos acima de R$ 50 mil no mês: 10% sobre o total do mês (Lei 9.250 art. 6º-A)', () => {
    const r = remuneracao({ valorAnualCents: 120_000_000n }); // R$ 100 mil/mês
    const minimo = r.mixes[1];
    expect(minimo.irrfDividendosCents).toBe(12n * 983_790n); // 10% de (R$ 100.000 − R$ 1.621) = R$ 9.837,90 por mês
  });

  it('Real: JCP até a parte do sócio no limite — IRRF 17,5% (Lei 9.249 art. 9º § 2º) e dedução pela alíquota marginal; CPP 20% fora do DAS', () => {
    const r = remuneracao({ regime: 'REAL', cppForaDoDas: true, jcpLimiteSocioCents: 5_000_000n, aliquotaMarginalBp: 3400 });
    const comJcp = r.mixes[2];
    expect(comJcp).toMatchObject({ jcpCents: 5_000_000n, irrfJcpCents: 875_000n, economiaIrpjCsllJcpCents: 1_700_000n, cppEmpresaCents: 389_040n });
    expect(comJcp.dividendosCents).toBe(24_000_000n - 1_945_200n - 5_000_000n);
    expect(comJcp.cargaTotalCents).toBe(r.mixes[1].cargaTotalCents + 875_000n - 1_700_000n);
  });

  it('montante abaixo de 12 salários mínimos: o mix mínimo é todo pró-labore', () => {
    const r = remuneracao({ valorAnualCents: 1_000_000n });
    expect(r.mixes[1]).toMatchObject({ proLaboreCents: 1_000_000n, dividendosCents: 0n });
  });
});
