/**
 * SIMPLES-PISO-ANEXO-XI bloco 1 (BRIEF §3 itens 2-3, §5.0 F-PI-2) — regra pura do benefício municipal de ISS e o efeito
 * dela no cálculo do DAS (F-PI-3 b). Valores esperados = aritmética sobre Res. CGSN 140 arts. 31 p.ú. e 32 § 1º; o
 * oráculo (PGDAS-D com benefício municipal) é gate humano — a elevação a 2% acima da tabela é afirmação do dono (§5.0).
 */
import { SIMPLES_SEED_FILES, legalParamsSeedRows } from '@test/helpers/legalParams';
import { apurar, type ApuracaoInput } from '../simplesCalc';
import { beneficioDaAtividade, issComBeneficio, sobrepoe } from '../issBeneficio';
import { IssBeneficioMunicipalCreateDto } from '../../dtos/IssBeneficioMunicipalDto';

const REDUCAO = (bp: number[]) => ({ tipo: 'REDUCAO_PERCENTUAL' as const, reducaoBpPorFaixa: bp });
const ISENCAO = { tipo: 'ISENCAO' as const, reducaoBpPorFaixa: null };

describe('item 2 — issComBeneficio (art. 32 § 1º; piso do art. 31 p.ú.; F-PI-2 piso absoluto)', () => {
  it.each([
    ['1,92% sem benefício ⇒ 1,92% (guarda de F-PR4-5: sem piso no % puro)', 192, null, 192, false],
    ['3,5% com redução de 50% ⇒ 2,00% (1,75% sobe ao piso)', 350, REDUCAO([5000]), 200, true],
    ['3,5% com redução de 20% ⇒ 2,80%', 350, REDUCAO([2000]), 280, false],
    ['3,5% com isenção ⇒ 2,00%', 350, ISENCAO, 200, true],
    ['F-PI-2: 1,92% com isenção ⇒ 2,00% (acima da tabela)', 192, ISENCAO, 200, true],
  ])('%s', (_t, issTabelaBp, beneficio, esperado, piso) => {
    expect(issComBeneficio({ issTabelaBp, faixa: 2, cTribNac: '060101', beneficio })).toEqual({ issAplicadoBp: esperado, pisoAplicado: piso, excecaoPiso: false });
  });

  it('redução por faixa: usa a posição da faixa; 0 bp na faixa = sem benefício nela (como se desmarca, F-PI-2)', () => {
    const b = REDUCAO([0, 0, 2000, 0, 0, 0]);
    expect(issComBeneficio({ issTabelaBp: 350, faixa: 3, cTribNac: '060101', beneficio: b }).issAplicadoBp).toBe(280);
    expect(issComBeneficio({ issTabelaBp: 192, faixa: 2, cTribNac: '060101', beneficio: b })).toEqual({ issAplicadoBp: 192, pisoAplicado: false, excecaoPiso: false });
  });
});

describe('item 3 — subitens 7.02, 7.05 e 16.01 sem piso (LC 116 art. 8º-A § 1º; Res. CGSN 140 art. 31 p.ú.)', () => {
  it.each(['070201', '070502', '160101'])('%s: isenção ⇒ 0%; redução de 50% sobre 3,5% ⇒ 1,75%', (cTribNac) => {
    expect(issComBeneficio({ issTabelaBp: 350, faixa: 1, cTribNac, beneficio: ISENCAO })).toEqual({ issAplicadoBp: 0, pisoAplicado: false, excecaoPiso: true });
    expect(issComBeneficio({ issTabelaBp: 350, faixa: 1, cTribNac, beneficio: REDUCAO([5000]) }).issAplicadoBp).toBe(175);
  });

  it('subitem vizinho (07.04, 16.02) tem piso', () => {
    expect(issComBeneficio({ issTabelaBp: 350, faixa: 1, cTribNac: '070401', beneficio: ISENCAO }).issAplicadoBp).toBe(200);
    expect(issComBeneficio({ issTabelaBp: 350, faixa: 1, cTribNac: '160201', beneficio: ISENCAO }).issAplicadoBp).toBe(200);
  });
});

describe('seleção do benefício da atividade (art. 32 II — por ramo; vigência; Município da unidade)', () => {
  const b = { codMun: '3550308', cTribNacPrefixos: ['0601'], vigenteDesde: '2026-01-01', vigenteAte: '2026-06-30' };
  it('alcança pelo prefixo, no Município e na vigência', () => {
    expect(beneficioDaAtividade([b], { codMun: '3550308', cTribNac: '060101', data: '2026-03-01' })).toBe(b);
    expect(beneficioDaAtividade([b], { codMun: '3550308', cTribNac: '060201', data: '2026-03-01' })).toBeNull();
    expect(beneficioDaAtividade([b], { codMun: '3304557', cTribNac: '060101', data: '2026-03-01' })).toBeNull();
    expect(beneficioDaAtividade([b], { codMun: '3550308', cTribNac: '060101', data: '2026-07-01' })).toBeNull();
    expect(beneficioDaAtividade([b], { codMun: null, cTribNac: '060101', data: '2026-03-01' })).toBeNull();
    expect(beneficioDaAtividade([{ ...b, cTribNacPrefixos: [] }], { codMun: '3550308', cTribNac: '140101', data: '2026-03-01' })).not.toBeNull();
  });

  it('sobreposição: mesmo Município + vigência + serviço em comum; prefixo vazio cobre todos', () => {
    expect(sobrepoe(b, { ...b, cTribNacPrefixos: ['060101'], vigenteDesde: '2026-06-30', vigenteAte: null })).toBe(true);
    expect(sobrepoe(b, { ...b, vigenteDesde: '2026-07-01', vigenteAte: null })).toBe(false);
    expect(sobrepoe(b, { ...b, cTribNacPrefixos: ['0602'] })).toBe(false);
    expect(sobrepoe(b, { ...b, cTribNacPrefixos: [] })).toBe(true);
    expect(sobrepoe(b, { ...b, codMun: '3304557' })).toBe(false);
  });
});

describe('contrato — IssBeneficioMunicipalCreateDto (.strict)', () => {
  const ok = { unitId: 'u', codMun: '3550308', tipo: 'REDUCAO_PERCENTUAL', reducaoBpPorFaixa: [5000], legislacao: 'Lei Municipal 1/2026 art. 2º', vigenteDesde: '2026-01-01' };
  it('aceita e aplica os defaults (prefixos [] = todos; vigenteAte null)', () => {
    expect(IssBeneficioMunicipalCreateDto.parse(ok)).toMatchObject({ cTribNacPrefixos: [], vigenteAte: null });
  });
  it.each([
    ['chave desconhecida', { ...ok, extra: 1 }],
    ['REDUCAO_PERCENTUAL sem redução', { ...ok, reducaoBpPorFaixa: null }],
    ['3 faixas (só 1 ou 6)', { ...ok, reducaoBpPorFaixa: [1, 2, 3] }],
    ['sem legislação (art. 27 § 1º)', { ...ok, legislacao: '  ' }],
    ['codMun com 6 dígitos', { ...ok, codMun: '355030' }],
    ['prefixo de 5 dígitos', { ...ok, cTribNacPrefixos: ['06010'] }],
    ['vigência invertida', { ...ok, vigenteAte: '2025-12-31' }],
    ['data irreal', { ...ok, vigenteDesde: '2026-02-30' }],
  ])('recusa %s', (_t, body) => {
    expect(IssBeneficioMunicipalCreateDto.safeParse(body).success).toBe(false);
  });
});

describe('F-PI-3 (b) — o benefício reduz a parcela ISS do DAS (Res. CGSN 140 art. 32 § 1º)', () => {
  const SEMENTE = legalParamsSeedRows(SIMPLES_SEED_FILES);
  // Linha FICTÍCIA de teste: 07.02 enquadrado como o 06.01 (Anexo III), só para exercitar a exceção do piso no cálculo.
  const LINHAS = [
    ...SEMENTE,
    ...SEMENTE.filter((l) => l.tabela === 'SIMPLES_ENQUADRAMENTO' && l.chave === 'SERVICO:060101').map((l) => ({ ...l, id: `${l.id}-ficticio-0702`, chave: 'SERVICO:070201' })),
  ];
  const historico = Array.from({ length: 12 }, (_, k) => ({ competencia: `2025-${String(k + 1).padStart(2, '0')}`, receitaBrutaCents: 5_000_000, folhaCents: null }));
  const base = (atividade: ApuracaoInput['atividades'][number], hist = historico): ApuracaoInput => ({
    competencia: '2026-01',
    historico: hist,
    inicioAtividade: null,
    receitaPaCents: 0,
    folhaPaCents: 0,
    sublimiteExcedido: false,
    atividades: [atividade],
  });
  const servico = (cTribNac: string, beneficioIss?: ApuracaoInput['atividades'][number]['beneficioIss']) => ({ natureza: 'SERVICO' as const, cTribNac, parcelas: [{ receitaCents: 5_000_000, excluir: [] }], beneficioIss });

  it('3ª faixa do Anexo III (ISS 3,432%), redução de 20%: ISS 2,7456% = R$ 1.372,80; o DAS cai R$ 343,20', () => {
    const sem = apurar(base(servico('060101')), LINHAS);
    const com = apurar(base(servico('060101', REDUCAO([2000]))), LINHAS);
    expect(sem.atividades[0].tributos.ISS).toBe(171_600);
    expect(com.atividades[0].percentuais.ISS).toBe('2.7456');
    expect(com.atividades[0].tributos.ISS).toBe(137_280);
    expect(com.totalCalculadoCents).toBe(sem.totalCalculadoCents - 34_320);
    expect(com.atividades[0].beneficioIss).toEqual({ issTabela: '3.4320', pisoAplicado: false, excecaoPiso: false, desvantajoso: false });
  });

  it('redução de 50% (1,716%) sobe ao piso de 2%; no 07.02 fica 1,716%', () => {
    expect(apurar(base(servico('060101', REDUCAO([5000]))), LINHAS).atividades[0]).toMatchObject({ percentuais: { ISS: '2.0000' }, beneficioIss: { pisoAplicado: true } });
    expect(apurar(base(servico('070201', REDUCAO([5000]))), LINHAS).atividades[0]).toMatchObject({ percentuais: { ISS: '1.7160' }, beneficioIss: { pisoAplicado: false, excecaoPiso: true } });
  });

  it('F-PI-2: tabela 1,92% (RBT12 R$ 180.000,01) + isenção ⇒ 2% e `desvantajoso`', () => {
    const a = apurar(base(servico('060101', ISENCAO), [{ competencia: '2025-12', receitaBrutaCents: 18_000_001, folhaCents: null }]), LINHAS).atividades[0];
    expect(a.percentuais.ISS).toBe('2.0000');
    expect(a.beneficioIss).toEqual({ issTabela: '1.9200', pisoAplicado: true, excecaoPiso: false, desvantajoso: true });
  });

  it('sem benefício a saída não muda (sem a chave beneficioIss)', () => {
    expect(apurar(base(servico('060101')), LINHAS).atividades[0].beneficioIss).toBeUndefined();
  });
});
