/**
 * EFICIENCIA-FISCAL PR-5 (BRIEF item 26; ADR §13 I-14, I-15, I-17; D-2026-10-28-EFICIENCIA-FISCAL-PR5-EXECUCAO lacunas 1 e 2) —
 * presunção HOSPITALAR por serviço: Lei 9.249/1995 art. 15 caput (8 %, hospitalar fora do § 1º III "a"), art. 15 § 2º (por
 * atividade) e art. 20 III (CSLL 12 %). Valores em centavos; contas feitas à mão no comentário de cada caso.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ValidationError } from '../../../../lib/errors';
import { apurarPresumidoTrimestral, type PerfilApuracaoPresumido, type ResultadoApuracao } from '../taxAssessmentCalc';
import { apurarEstimativaReceitaBruta, type PerfilApuracaoAnual } from '../taxAssessmentCalcAnual';
import { atividadeDoServico } from '../taxAssessmentParams';
import { HOSPITALAR_REQUISITO_AUSENTE, repartirReceitaHospitalar } from '../presuncaoHospitalar';
import { LEGAL_PARAMS_SEED_FILE_EFICIENCIA_SERVICOS, legalParamsSeedRows, tabelaApuracaoSemente } from '@test/helpers/legalParams';

const tabela = tabelaApuracaoSemente();
const R = (reais: number): bigint => BigInt(Math.round(reais * 100));
const v = (r: ResultadoApuracao, codigo: string): string | undefined => r.memoria.find((m) => m.codigo === codigo)?.valorCents;
const PERFIL: PerfilApuracaoPresumido = {
  ecfIndAliqCsll: '1',
  ecfIndRecReceita: '2',
  lc224AcrescimoSuspenso: false,
  lc224LiminarReferencia: null,
  inicioAtividadeEm: null,
  encerramentoAtividadeEm: null,
  prestadoraExclusivaServicos: false,
  declaraNaoProfissaoRegulamentada: false,
};
const EMPRESA_OK = { sociedadeEmpresaria: true, alvaraSanitarioValidoAte: '2026-12-31' };
const PROC = { serviceRef: 'svc-proc', finalidade: 'TERAPEUTICA', elegivelHospitalar: true };
const CONSULTA = { serviceRef: 'svc-consulta', finalidade: 'TERAPEUTICA', elegivelHospitalar: false };

const trimestre = (ano: number, tributo: 'IRPJ' | 'CSLL', servico: number, hospitalar: number, perfil: Partial<PerfilApuracaoPresumido> = {}) =>
  apurarPresumidoTrimestral({
    tabela, ano, periodo: 'T01', tributo, receitaServicoCents: R(servico), receitaRevendaCents: 0n, receitaHospitalarCents: R(hospitalar),
    perfil: { ...PERFIL, ...perfil }, anteriores: [], deducoes: [],
  });

describe('item 26 — semente HOSPITALAR', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_eficiencia_servicos_v1.sql e só insere', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261028190100_legal_parameters_eficiencia_servicos/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_EFICIENCIA_SERVICOS, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('IRPJ 800 bp (art. 15 caput) e CSLL 1200 bp (art. 20 III), PUBLISHED, com a fonte do acervo', () => {
    const h = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_EFICIENCIA_SERVICOS).filter((l) => l.discriminador === 'HOSPITALAR');
    expect(h.map((l) => [l.chave, l.valorInt, l.status])).toEqual([['PRESUNCAO_IRPJ', 800, 'PUBLISHED'], ['PRESUNCAO_CSLL', 1200, 'PUBLISHED']]);
    expect(h[0].fonte).toContain('art. 15 caput');
    expect(h[1].fonte).toContain('art. 20 III');
    for (const l of h) expect(l.fonteSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('item 26 — atividadeDoServico (I-14, I-17)', () => {
  it('elegível + TERAPEUTICA + sociedade empresária + alvará vigente ⇒ HOSPITALAR', () => {
    expect(atividadeDoServico(PROC, EMPRESA_OK, '2026-03-15')).toEqual({ atividade: 'HOSPITALAR', faltando: [] });
  });

  it('não elegível ⇒ SERVICO sem aviso; finalidade null é ESTETICA (I-17)', () => {
    expect(atividadeDoServico(CONSULTA, EMPRESA_OK, '2026-03-15')).toEqual({ atividade: 'SERVICO', faltando: [] });
    expect(atividadeDoServico({ finalidade: null, elegivelHospitalar: true }, EMPRESA_OK, '2026-03-15')).toEqual({ atividade: 'SERVICO', faltando: ['FINALIDADE_TERAPEUTICA'] });
    expect(atividadeDoServico(null, EMPRESA_OK, '2026-03-15').atividade).toBe('SERVICO');
  });

  it('I-14: alvará vencido na véspera ⇒ SERVICO + ALVARA_VIGENTE; no próprio dia ainda vale', () => {
    const empresa = { sociedadeEmpresaria: true, alvaraSanitarioValidoAte: '2026-03-14' };
    expect(atividadeDoServico(PROC, empresa, '2026-03-15')).toEqual({ atividade: 'SERVICO', faltando: ['ALVARA_VIGENTE'] });
    expect(atividadeDoServico(PROC, empresa, '2026-03-14').atividade).toBe('HOSPITALAR');
    expect(atividadeDoServico(PROC, { sociedadeEmpresaria: false, alvaraSanitarioValidoAte: null }, '2026-03-15').faltando).toEqual(['SOCIEDADE_EMPRESARIA', 'ALVARA_VIGENTE']);
  });
});

describe('item 26 — repartirReceitaHospitalar (subrazão por serviço)', () => {
  it('soma por serviço na data de cada linha, tira a cota do profissional, linha sem serviceRef fica a 32 %, aviso só do elegível que caiu', () => {
    const linhas = [
      { dia: '2026-03-10', serviceRef: 'svc-proc', receitaCents: R(1000), cotaProfissionalCents: 0n },
      { dia: '2026-03-20', serviceRef: 'svc-proc', receitaCents: R(500), cotaProfissionalCents: 0n }, // depois do alvará
      { dia: '2026-03-10', serviceRef: 'svc-proc', receitaCents: -R(200), cotaProfissionalCents: 0n }, // cancelamento
      { dia: '2026-03-10', serviceRef: 'svc-consulta', receitaCents: R(300), cotaProfissionalCents: 0n },
      { dia: '2026-03-10', serviceRef: null, receitaCents: R(999), cotaProfissionalCents: 0n },
    ];
    const r = repartirReceitaHospitalar(linhas, [PROC, CONSULTA], { sociedadeEmpresaria: true, alvaraSanitarioValidoAte: '2026-03-15' });
    expect(r.hospitalarCents).toBe(R(800)); // 1000 − 200
    expect(r.porServico.find((s) => s.serviceRef === 'svc-proc')).toMatchObject({ hospitalarCents: R(800), servicoCents: R(500), faltando: ['ALVARA_VIGENTE'] });
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toContain(HOSPITALAR_REQUISITO_AUSENTE);
    expect(r.avisos[0]).toContain('svc-proc');
  });
});

describe('item 26 — Presumido trimestral com receita hospitalar (I-15)', () => {
  it('2025 (sem LC 224): consulta a 32 % e procedimento a 8 %/12 % no mesmo trimestre — base = Σ por atividade', () => {
    // IRPJ: 60.000 × 32 % + 40.000 × 8 % = 19.200 + 3.200 = 22.400
    const irpj = trimestre(2025, 'IRPJ', 100_000, 40_000);
    expect(v(irpj, 'RECEITA_HOSPITALAR')).toBe(String(R(40_000)));
    expect(v(irpj, 'PRESUNCAO_SERVICO')).toBe(String(R(19_200)));
    expect(v(irpj, 'PRESUNCAO_HOSPITALAR')).toBe(String(R(3_200)));
    expect(v(irpj, 'BASE')).toBe(String(R(22_400)));
    // CSLL: 60.000 × 32 % + 40.000 × 12 % = 19.200 + 4.800 = 24.000
    expect(v(trimestre(2025, 'CSLL', 100_000, 40_000), 'BASE')).toBe(String(R(24_000)));
  });

  it('sem receita hospitalar a memória é a de antes (sem as linhas novas)', () => {
    const r = trimestre(2025, 'IRPJ', 100_000, 0);
    expect(r.memoria.map((m) => m.codigo)).not.toEqual(expect.arrayContaining(['RECEITA_HOSPITALAR']));
    expect(r.memoria.some((m) => m.codigo.includes('HOSPITALAR'))).toBe(false);
    expect(v(r, 'BASE')).toBe(String(R(32_000)));
  });

  it('teto na 3.1: parte hospitalar maior que a receita de serviço do razão vira a receita de serviço', () => {
    const r = trimestre(2025, 'IRPJ', 10_000, 15_000);
    expect(v(r, 'RECEITA_HOSPITALAR')).toBe(String(R(10_000)));
    expect(v(r, 'BASE')).toBe(String(R(800)));
  });

  it('2026 (LC 224): a parcela excedente do serviço se reparte também pela receita hospitalar e a base fecha com as linhas', () => {
    const r = trimestre(2026, 'IRPJ', 2_000_000, 500_000);
    const n = (c: string) => BigInt(v(r, c) ?? '0');
    expect(n('LC224_ACRESCIMO_HOSPITALAR')).toBeGreaterThan(0n);
    const soma = ['PRESUNCAO_SERVICO', 'PRESUNCAO_REVENDA', 'PRESUNCAO_HOSPITALAR', 'LC224_ACRESCIMO_SERVICO', 'LC224_ACRESCIMO_REVENDA', 'LC224_ACRESCIMO_HOSPITALAR'].reduce((s, c) => s + n(c), 0n);
    expect(n('BASE')).toBe(soma);
  });

  it('receita hospitalar com a declaração do 16 % ⇒ 400 HOSPITALAR_INCOMPATIVEL_COM_16 (Lei 9.250 art. 40 p.ú.)', () => {
    const perfil = { prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true };
    expect(() => trimestre(2025, 'IRPJ', 20_000, 5_000, perfil)).toThrow(ValidationError);
    expect(() => trimestre(2025, 'IRPJ', 20_000, 5_000, perfil)).toThrow(/HOSPITALAR_INCOMPATIVEL_COM_16/);
    expect(() => trimestre(2025, 'IRPJ', 20_000, 0, perfil)).not.toThrow();
  });
});

describe('item 26 — estimativa mensal da forma ANUAL (dono, 28/10, lacuna 2)', () => {
  const PERFIL_ANUAL: PerfilApuracaoAnual = { ecfIndAliqCsll: '1', lucroRealObrigatorio: false, prestadoraExclusivaServicos: false, inicioAtividadeEm: null, encerramentoAtividadeEm: null };
  const mes = (tributo: 'IRPJ' | 'CSLL', hospitalar: number, perfil: Partial<PerfilApuracaoAnual> = {}) =>
    apurarEstimativaReceitaBruta({
      tabela, ano: 2026, periodo: 'A03', tributo, receitaServicoCents: R(10_000), receitaRevendaCents: 0n, receitaHospitalarCents: R(hospitalar),
      receitasMesesAnteriores: [], confirmados: [], perfil: { ...PERFIL_ANUAL, ...perfil }, deducoes: [],
    });

  it('IRPJ: 6.000 × 32 % + 4.000 × 8 % = 2.240; CSLL: 6.000 × 32 % + 4.000 × 12 % = 2.400', () => {
    expect(mes('IRPJ', 4_000).memoria.find((m) => m.codigo === 'BASE')?.valorCents).toBe(String(R(2_240)));
    expect(mes('CSLL', 4_000).memoria.find((m) => m.codigo === 'BASE')?.valorCents).toBe(String(R(2_400)));
    expect(mes('IRPJ', 0).memoria.some((m) => m.codigo.includes('HOSPITALAR'))).toBe(false);
  });

  it('16 % declarado + receita hospitalar ⇒ 400 no IRPJ', () => {
    expect(() => mes('IRPJ', 4_000, { prestadoraExclusivaServicos: true })).toThrow(/HOSPITALAR_INCOMPATIVEL_COM_16/);
  });
});
