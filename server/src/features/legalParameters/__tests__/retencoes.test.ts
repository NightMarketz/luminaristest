/**
 * BE-INCR-RETENCOES-FONTE PR-1 (BRIEF itens 1, 2, 3 e 7; Emenda 22/10 item 1) — tabelas RETENCAO, RETENCAO_CODIGO,
 * NATUREZA_RENDIMENTO e IRRF_PF_MENSAL. Carga gerada do zip oficial da Reinf (dossiê
 * pesquisas-legais/retencoes-fonte-pr1-reinf-tabelas [D01]) e das normas dos dossiês de 22/10 e 24/10.
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_RETENCOES, legalParamsSeedRows } from '@test/helpers/legalParams';
import { LEGAL_PARAMETER_TABELAS, linhaLegalVigente, linhasEmVigor } from '../models/legalParameter';
import { erroDeFormato } from '../models/formatoLinha';
import { familiasDaLinha } from '../../accounting/services/TaxAssessmentRecalcService';
import {
  AVISO_CODIGO_RECEITA_DRAFT,
  codigoReceitaRetencao,
  impostoPelaTabela,
  naturezaRendimentoVigente,
  reducaoArt3A,
  tabelaIrrfPfDe,
} from '../../accounting/models/retencaoParams';

const MIGRATION = path.resolve(__dirname, '../../../../prisma/migrations/20261024120000_add_withholding_profiles_retencoes/migration.sql');
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const rows = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_RETENCOES);
const publicadas = linhasEmVigor(rows);
const SHA_ZIP = '31c04713b92a965c7413190a21dfc1b8eab4b10002a58371506da758e770b1a7';
const formato = (r: (typeof rows)[number]) =>
  erroDeFormato({ ...r, tabela: r.tabela as never, valorJson: r.valorJson === null ? undefined : JSON.parse(r.valorJson) });

describe('RETENCOES-FONTE PR-1 — carga das tabelas de retenção', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_retencoes_v1.sql, byte a byte', () => {
    expect(norm(fs.readFileSync(MIGRATION, 'utf8'))).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_RETENCOES, 'utf8')).trimEnd());
  });

  it('a migração é aditiva: CREATE TABLE / ADD COLUMN, sem DROP nem RedefineTables (item 5)', () => {
    const sql = norm(fs.readFileSync(MIGRATION, 'utf8'))
      .split('\n')
      .filter((l) => !l.startsWith('--'))
      .join('\n');
    expect(sql).not.toMatch(/\bDROP\b|RedefineTables|new_counterparties|new_fiscal_profiles/);
    expect(sql).toContain('ALTER TABLE "counterparties" ADD COLUMN "regimeTributario" TEXT;');
    expect(sql).toContain('ALTER TABLE "counterparties" ADD COLUMN "declaracaoOptanteDocumentId" TEXT;');
  });

  it('as quatro tabelas estão no catálogo', () => {
    expect(LEGAL_PARAMETER_TABELAS).toEqual(expect.arrayContaining(['RETENCAO', 'RETENCAO_CODIGO', 'NATUREZA_RENDIMENTO', 'IRRF_PF_MENSAL']));
  });

  it('PUBLISHED com fonte e sha256 e no formato; DRAFT só onde não há fonte lida (INSS/CPRB e código do INSS)', () => {
    for (const r of rows.filter((x) => x.status === 'PUBLISHED')) {
      expect([r.id, r.fonte.trim() !== '', r.fonteSha256?.length, formato(r)]).toEqual([r.id, true, 64, null]);
    }
    expect(rows.filter((r) => r.status === 'DRAFT').map((r) => [r.tabela, r.chave, r.discriminador, r.valorInt, r.valorTexto])).toEqual([
      ['RETENCAO', 'INSS', 'CPRB', null, null],
      ['RETENCAO_CODIGO', 'CESSAO_MAO_DE_OBRA', 'INSS', null, null],
    ]);
  });
});

describe('item 1 — RETENCAO', () => {
  const bp = (chave: string, disc: string, data: string) => linhaLegalVigente(publicadas, 'RETENCAO', chave, data, disc)?.valorInt ?? null;

  it('invariante 1: 2026-12-31 ⇒ CSRF 4,65% em três linhas; 2027-01-01 ⇒ só CSLL 1% (LC 214 art. 509)', () => {
    expect([bp('CSRF', 'CSLL', '2026-12-31'), bp('CSRF', 'COFINS', '2026-12-31'), bp('CSRF', 'PIS', '2026-12-31')]).toEqual([100, 300, 65]);
    expect([bp('CSRF', 'CSLL', '2027-01-01'), bp('CSRF', 'COFINS', '2027-01-01'), bp('CSRF', 'PIS', '2027-01-01')]).toEqual([100, null, null]);
  });

  it('IRRF por natureza, INSS 11% e os mínimos de R$ 10', () => {
    const d = '2026-06-15';
    expect([bp('IRRF', 'SERVICO_PROFISSIONAL', d), bp('IRRF', 'LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO', d), bp('IRRF', 'COMISSAO_PROPAGANDA', d)]).toEqual([150, 100, 150]);
    expect(bp('INSS', 'CESSAO_MAO_DE_OBRA', d)).toBe(1100);
    expect(['CSRF', 'DARF', 'IRRF_REAL', 'IRRF_PRESUMIDO', 'IRRF_ARBITRADO', 'IRRF_PF'].map((m) => bp('MINIMO', m, d))).toEqual([1000, 1000, 1000, 1000, 1000, 1000]);
    // RIR 785 II: optante do Simples não tem dispensa — sem linha (triagem 21/10).
    expect(bp('MINIMO', 'IRRF_SIMPLES', d)).toBeNull();
  });

  it('proposta fora do formato ⇒ erro (o serviço devolve 400)', () => {
    expect(erroDeFormato({ tabela: 'RETENCAO', chave: 'CSRF', discriminador: 'CSLL', valorInt: 100 })).toBeNull();
    expect(erroDeFormato({ tabela: 'RETENCAO', chave: 'CSRF', discriminador: 'IRPJ', valorInt: 100 })).not.toBeNull();
    expect(erroDeFormato({ tabela: 'RETENCAO', chave: 'IRRF', discriminador: 'OUTRO', valorInt: 150 })).not.toBeNull();
    expect(erroDeFormato({ tabela: 'RETENCAO', chave: 'MINIMO', discriminador: 'CSRF', valorInt: 0 })).not.toBeNull();
    expect(erroDeFormato({ tabela: 'RETENCAO', chave: 'CSRF', discriminador: 'PIS', valorTexto: '65' })).not.toBeNull();
  });
});

describe('item 2 — RETENCAO_CODIGO (tabelas "R-4020"/"R-4010" de 15/01/2026)', () => {
  const cod = (tributo: 'IRRF' | 'CSLL' | 'COFINS' | 'PIS' | 'INSS' | 'ISS', natRend: string | null, kind: 'CPF' | 'CNPJ' | null, data: string) =>
    codigoReceitaRetencao(publicadas, { tributo, natRend, beneficiarioKind: kind, data });

  it('códigos do BRIEF: 15022 IRPJ 170806 e AGREGADO 595207; 15052 só IRPJ 804506; 12016 IRPF 570602; 12001 IRPF 184101', () => {
    expect(cod('IRRF', '15022', 'CNPJ', '2026-03-10').codigo).toBe('170806');
    expect(cod('CSLL', '15022', 'CNPJ', '2026-03-10')).toEqual({ codigo: '595207', discriminador: 'AGREGADO', aviso: null });
    expect(cod('IRRF', '15052', 'CNPJ', '2026-03-10').codigo).toBe('804506');
    expect(cod('CSLL', '15052', 'CNPJ', '2026-03-10')).toEqual({ codigo: null, discriminador: 'AGREGADO', aviso: AVISO_CODIGO_RECEITA_DRAFT });
    expect(cod('IRRF', '12016', 'CPF', '2026-03-10').codigo).toBe('570602');
    expect(cod('IRRF', '12001', 'CPF', '2026-03-10').codigo).toBe('184101');
  });

  it('Emenda item 3: até 2026-12-31 CSLL/COFINS/PIS levam o AGREGADO; desde 2027-01-01 a CSLL leva o próprio código', () => {
    for (const t of ['CSLL', 'COFINS', 'PIS'] as const) expect(cod(t, '15022', 'CNPJ', '2026-12-31').codigo).toBe('595207');
    expect(cod('CSLL', '15022', 'CNPJ', '2027-01-01')).toEqual({ codigo: '598707', discriminador: 'CSLL', aviso: null });
  });

  it('IRRF + CNPJ ⇒ IRPJ; IRRF + CPF ⇒ IRPF pelo taxId', () => {
    expect(cod('IRRF', '12016', 'CNPJ', '2026-03-10')).toMatchObject({ discriminador: 'IRPJ', codigo: '570602' });
    expect(cod('IRRF', '12016', 'CPF', '2026-03-10')).toMatchObject({ discriminador: 'IRPF', codigo: '570602' });
  });

  it('sem linha PUBLISHED ⇒ código null + aviso CODIGO_RECEITA_DRAFT (INSS DRAFT; 10002 fora da carga)', () => {
    expect(cod('INSS', null, 'CNPJ', '2026-03-10')).toEqual({ codigo: null, discriminador: 'INSS', aviso: AVISO_CODIGO_RECEITA_DRAFT });
    expect(cod('IRRF', '10002', 'CPF', '2026-03-10')).toEqual({ codigo: null, discriminador: 'IRPF', aviso: AVISO_CODIGO_RECEITA_DRAFT });
    expect(cod('ISS', null, 'CNPJ', '2026-03-10')).toEqual({ codigo: null, discriminador: null, aviso: null });
  });

  it('uma linha nova de RETENCAO_CODIGO não reabre o X7 nem o X8 (familiasDaLinha = [])', () => {
    expect(familiasDaLinha({ tabela: 'RETENCAO_CODIGO', chave: '15022', discriminador: 'IRPJ' })).toEqual([]);
    expect(familiasDaLinha({ tabela: 'RETENCAO', chave: 'CSRF', discriminador: 'CSLL' })).toEqual([]);
  });
});

describe('item 7 — NATUREZA_RENDIMENTO (Tabela 01)', () => {
  it('grupo 15 inteiro (15001–15099), 12001 com duas vigências e 12016; 10002 fora', () => {
    const chaves = [...new Set(rows.filter((r) => r.tabela === 'NATUREZA_RENDIMENTO').map((r) => r.chave))];
    // 15001–15048, 15050–15052 e 15099 (a Tabela 01 não tem 15049).
    expect(chaves.filter((c) => c.startsWith('15'))).toHaveLength(52);
    expect(chaves).toEqual(expect.arrayContaining(['15001', '15022', '15052', '15099', '12001', '12016']));
    expect(chaves).not.toContain('10002');
    expect(rows.filter((r) => r.tabela === 'NATUREZA_RENDIMENTO').every((r) => r.fonteSha256 === SHA_ZIP)).toBe(true);
  });

  it('12001: sem tributo até 2025-12-31; IR desde 2026-01-01', () => {
    expect(naturezaRendimentoVigente(publicadas, '12001', '2025-12-31')?.tributos).toEqual([]);
    expect(naturezaRendimentoVigente(publicadas, '12001', '2026-01-01')?.tributos).toEqual(['IR']);
  });

  it('15022 fisioterapia: PJ, IR + CSRF; natRend fora da tabela ⇒ undefined', () => {
    expect(naturezaRendimentoVigente(publicadas, '15022', '2026-03-10')).toMatchObject({
      grupo: 15,
      declarante: 'PJ',
      tributos: ['IR', 'CSLL', 'COFINS', 'PP', 'AGREGADO'],
    });
    expect(naturezaRendimentoVigente(publicadas, '15049', '2026-03-10')).toBeUndefined();
  });
});

describe('item 3 — IRRF_PF_MENSAL (Lei 11.482 art. 1º XII; Lei 9.250 arts. 3º-A e 4º)', () => {
  const t = tabelaIrrfPfDe(publicadas, '2026-03-01')!;
  /** Sem dedução informada ⇒ desconto simplificado (art. 4º § 2º); IR pela faixa menos a redução do art. 3º-A. */
  const irSemDeducao = (rendimentoCents: bigint) => {
    const ir = impostoPelaTabela(rendimentoCents - t.descontoSimplificadoCents, t);
    return { ir, reducao: reducaoArt3A(rendimentoCents, ir, t) };
  };

  it('tabela de 2026: 5 faixas, dependente R$ 189,59, desconto simplificado R$ 607,20, redução vigente', () => {
    expect(t.faixas.map((f) => [f.ateCents, f.aliquotaBp, f.deduzirCents])).toEqual([
      [242880n, 0, 0n],
      [282665n, 750, 18216n],
      [375105n, 1500, 39416n],
      [466468n, 2250, 67549n],
      [null, 2750, 90873n],
    ]);
    expect([t.dependenteCents, t.descontoSimplificadoCents, t.reducao?.tetoCents]).toEqual([18959n, 60720n, 735000n]);
    expect(tabelaIrrfPfDe(publicadas, '2025-12-31')?.reducao).toBeNull(); // art. 3º-A só desde 01/2026
  });

  it('R$ 5.000,00 sem dedução ⇒ IR zero', () => {
    const { ir, reducao } = irSemDeducao(500000n);
    expect(ir).toBe(31289n); // 22,5% × 4.392,80 − 675,49
    expect(ir - reducao).toBe(0n);
  });

  it('R$ 6.000,00 ⇒ redução = 978,62 − 798,87 (HALF_UP em centavo)', () => {
    expect(irSemDeducao(600000n).reducao).toBe(97862n - 79887n);
  });

  it('R$ 7.350,01 ⇒ sem redução (§ 2º)', () => {
    expect(irSemDeducao(735001n).reducao).toBe(0n);
  });

  it('formato: faixa sem alíquota ou chave desconhecida ⇒ erro', () => {
    expect(erroDeFormato({ tabela: 'IRRF_PF_MENSAL', chave: 'FAIXA_1', valorJson: { ateCents: 242880, deduzirCents: 0 } })).not.toBeNull();
    expect(erroDeFormato({ tabela: 'IRRF_PF_MENSAL', chave: 'DEPENDENTE', valorInt: 18959 })).toBeNull();
    expect(erroDeFormato({ tabela: 'IRRF_PF_MENSAL', chave: 'OUTRA', valorInt: 1 })).not.toBeNull();
  });
});
