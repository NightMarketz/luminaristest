import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { LEGAL_PARAMS_SEEDS } from '@test/helpers/templateDb';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import { ParametroLegalAusenteError, TABELAS_MIGRADAS, type LegalParameterTabela } from '../../../legalParameters/models/legalParameter';
import { TABELAS_IBS_CBS, buscarCClassTrib, buscarCCredPres, buscarCst, tabelasIbsCbsDe } from '../ibsCbsTabelas';

/**
 * Onda 3.2 fatia 5 (dono, 24/11/2026) — o SEED das três tabelas do IT 2025.002 v1.70 é gerado da TSV da transcrição. A
 * paridade linha a linha seed × const (a const que `ibsCbsTabelas.ts` carregava) foi provada no commit anterior, ANTES de a
 * const sair; aqui fica a guarda de sha256 da const, mantida, reserializando a TSV a partir das linhas do seed.
 */
const SEED = LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS;
const linhas = legalParamsSeedRows(SEED);
const HOJE = '2026-11-24';

describe('Onda 3.2 fatia 5 — seed das tabelas do IBS/CBS', () => {
  it('204 linhas: 18 CST, 173 cClassTrib e 13 cCredPres, todas PUBLISHED, com fonte, sha256 do .xlsx e tabela migrada', () => {
    const por = (t: string) => linhas.filter((l) => l.tabela === t).length;
    expect([por('CST_IBS_CBS'), por('CCLASSTRIB_IBS_CBS'), por('CCREDPRES_IBS_CBS'), linhas.length]).toEqual([18, 173, 13, 204]);
    for (const l of linhas) {
      expect(l.status).toBe('PUBLISHED');
      expect(l.fonte.trim()).not.toBe('');
      expect(l.fonteSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(TABELAS_MIGRADAS.has(l.tabela as LegalParameterTabela)).toBe(true);
    }
    expect(new Set(linhas.map((l) => l.id)).size).toBe(204);
  });

  it('toda linha passa no formato por tabela (a mesma regra que barra a proposta pelo admin)', () => {
    for (const l of linhas) {
      expect(erroDeFormato({ tabela: l.tabela as LegalParameterTabela, chave: l.chave, discriminador: l.discriminador, valorInt: l.valorInt, valorTexto: l.valorTexto, valorJson: l.valorJson ? JSON.parse(l.valorJson) : undefined })).toBeNull();
    }
  });

  it('o migration.sql carrega exatamente os INSERTs do seed (teste-guarda de igualdade) e a migração está na lista do banco-modelo', () => {
    const dir = path.resolve(__dirname, '../../../../../prisma/migrations/20261124140000_legal_parameters_ibs_cbs_tabelas/migration.sql');
    const inserts = (f: string) => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => l.startsWith('INSERT'));
    expect(inserts(dir)).toEqual(inserts(SEED));
    expect(LEGAL_PARAMS_SEEDS.map((f) => path.basename(f))).toContain('legal_parameters_ibs_cbs_tabelas_v1.sql');
  });

  it('sem linha de uma das três tabelas ⇒ PARAMETRO_LEGAL_AUSENTE (fail-closed), nunca tabela vazia', () => {
    for (const falta of TABELAS_IBS_CBS) {
      const sem = linhas.filter((l) => l.tabela !== falta);
      expect(() => tabelasIbsCbsDe(sem, HOJE)).toThrow(ParametroLegalAusenteError);
    }
  });

  it('código ausente dentro de tabela existente segue "inexistente" (undefined), e o cClassTrib de vigência encerrada ainda existe', () => {
    const t = tabelasIbsCbsDe(linhas, HOJE);
    expect(buscarCst(t, '999')).toBeUndefined();
    expect(buscarCClassTrib(t, '999999')).toBeUndefined();
    expect(buscarCCredPres(t, '99')).toBeUndefined();
    expect(buscarCClassTrib(t, '220001', '2026-11-24')?.dFimVig).toBe('2026-01-01');
  });
});

/**
 * GUARDA DE sha256 mantida da const: reserializa as linhas LIDAS DO SEED no formato da TSV extraída da planilha (mesmas
 * colunas, datas de volta ao serial do Excel) e confere o sha256 que o navegador calculou sobre a TSV em 27/10/2026. Um
 * dígito trocado em qualquer linha — ou a ordem da aba — muda o hash. (O gerador confere os mesmos hashes sobre a transcrição.)
 */
const serial = (d: string | null): string => (d ? String(Math.round((Date.parse(`${d}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000)) : '');
const nul = (v: number | null): string => (v === null ? '' : String(v));
const sha = (ls: string[]): string => createHash('sha256').update(`${ls.join('\n')}\n`, 'utf8').digest('hex');

describe('ibsCbsTabelas (seed) — transcrição conferida por hash', () => {
  const t = tabelasIbsCbsDe(linhas, HOJE);

  it('tabela de indicadores de CST', () => {
    expect(
      sha([
        'CST-IBS/CBS\tDescrição CST-IBS/CBS\tind_gIBSCBS\tind_gIBSCBSMono\tind_gRed\tind_gDif\tind_gTransfCred\tind_ gCredPresIBSZFM\tind_gAjusteCompet\tind_RedutorBC',
        ...t.cst.map((c) =>
          [c.cst, c.descricao, c.ind_gIBSCBS, c.ind_gIBSCBSMono, c.ind_gRed, c.ind_gDif, c.ind_gTransfCred, c.ind_gCredPresIBSZFM, c.ind_gAjusteCompet, c.ind_RedutorBC].join('\t'),
        ),
      ]),
    ).toBe('805c43302b46576952fe02ccfc4fd2fc40e995dfb0a1772ad75ff8c59e5fce86');
  });

  it('tabela de cClassTrib', () => {
    expect(
      sha([
        'CST-IBS/CBS\tcClassTrib\tTipo de Alíquota\tpRedIBS\tpRedCBS\tind_gTribRegular\tind_gCredPresOper\tind_gMonoPadrao\tind_gMonoReten\tind_gMonoRet\tind_gpBioDiferenca\tind_gEstornoCred\ttpRBSN\ttpDoacao\tdIniVig\tdFimVig\tindNFe\tindNFCe',
        ...t.cClassTrib.map((c) =>
          [
            c.cst, c.cClassTrib, c.tipoAliquota, c.pRedIBS, c.pRedCBS, c.ind_gTribRegular, c.ind_gCredPresOper, c.ind_gMonoPadrao, c.ind_gMonoReten,
            c.ind_gMonoRet, c.ind_gpBioDiferenca, c.ind_gEstornoCred, c.tpRBSN, c.tpDoacao, serial(c.dIniVig), serial(c.dFimVig), c.indNFe, c.indNFCe,
          ].join('\t'),
        ),
      ]),
    ).toBe('1694f4aa04bdd4b91560fcf38a27d5c9cea25fb78cf35a41763882c155fde186');
  });

  it('tabela de cCredPres', () => {
    expect(
      sha([
        'cCredPres\tApropria via NF?\tApropria via evento?\tindDeduzCredPres\tind_gCBSCredPres\tind_gIBSCredPres\tcClassTrib nota referenciada\tdIniVigCBS\tdFimVigCBS\tdIniVigIBS\tdFimVigIBS\tindNFe\tindNFCe',
        ...t.cCredPres.map((c) =>
          [
            c.cCredPres, c.apropriaViaNf, c.apropriaViaEvento, nul(c.indDeduzCredPres), nul(c.ind_gCBSCredPres), nul(c.ind_gIBSCredPres),
            c.cClassTribNotaReferenciada, serial(c.dIniVigCBS), serial(c.dFimVigCBS), serial(c.dIniVigIBS), serial(c.dFimVigIBS), c.indNFe, c.indNFCe,
          ].join('\t'),
        ),
      ]),
    ).toBe('d9befc11300061b773831eda19b497779c2b261fc3b6e8da1839897fb92f93cf');
  });

  it('o cClassTrib aponta para um CST da tabela de CST (UB14-20) e as datas saíram do serial certo', () => {
    for (const c of t.cClassTrib) expect(buscarCst(t, c.cst)).toBeDefined();
    expect(buscarCClassTrib(t, '000001')).toMatchObject({ cst: '000', dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 });
    expect(buscarCClassTrib(t, '220001')?.dFimVig).toBe('2026-01-01');
  });
});
