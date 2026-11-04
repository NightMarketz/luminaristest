/**
 * BE-INCR-DP-F0-F1 itens 20–24 (PR-2) — a carga `legal_parameters_dp_v1.sql`, gerada por
 * pesquisas-legais/brief-pes4-f0-f1/gerar_carga.py a partir do HTML oficial (o BRIEF não digita código do eSocial).
 * Contagem e hash registrados no PR: mudar a carga sem regerar pelo script, ou regerar de outra fonte, quebra aqui.
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_DP, legalParamsSeedRows } from '@test/helpers/legalParams';
import { linhaLegalVigente, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';

const norm = (s: string) => s.replace(/\r\n/g, '\n');
const LINHAS = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_DP) as (LinhaLegal & { fonteSha256: string | null })[];
const json = (l: LinhaLegal | undefined) => (l?.valorJson ? JSON.parse(l.valorJson) : undefined);

// manifest.json do dossiê brief-pes4-f0-f1 (arquivo como baixado).
const SHA_D04 = '2306b761562d936ac63fd74447e2def11fe8f71d86910d324d83ea5614f2bd22';
const SHA_D07 = '10048cc43744e44a290665d685b27d82ad38161d9f7da2edc5fecf35197240e2';
const SHA_D09 = '25ffc2061fab32043d62be331db2da16590008bcb89ecc8de0f5276ddeca6425';
const SHA_D10 = '19abfe05f6823c7b6428d7c7cfb35f8e06f39b20e585ee5eb8c5079a607c2347';

describe('DP-F0-F1 PR-2 — carga legal_parameters_dp_v1.sql', () => {
  it('a migração carrega o texto da carga e só insere', () => {
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261103130000_legal_parameters_dp/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_DP, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('item 23 — contagem por tabela e hash da carga são os registrados no PR', () => {
    const contagem: Record<string, number> = {};
    for (const l of LINHAS) {
      const k = l.discriminador ? `${l.tabela}/${l.discriminador}` : l.tabela;
      contagem[k] = (contagem[k] ?? 0) + 1;
    }
    expect(contagem).toEqual({
      INSS_EMPREGADO: 4,
      ENCARGO_FOLHA: 1,
      ESOCIAL_CATEGORIA: 47,
      ESOCIAL_NATUREZA_RUBRICA: 216,
      'ESOCIAL_INCIDENCIA_RUBRICA/CP': 29,
      'ESOCIAL_INCIDENCIA_RUBRICA/FGTS': 8,
      'ESOCIAL_INCIDENCIA_RUBRICA/IRRF': 87,
      ESOCIAL_MOTIVO_AFASTAMENTO: 56,
    });
    expect(createHash('sha256').update(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_DP, 'utf8'))).digest('hex')).toBe(
      'd5c2a5d3083b0b9574eea35f385cb0d310cbf95ed85f62fcdd4f4e954d64b9d0',
    );
  });

  it('cada linha leva o sha256 do arquivo oficial de onde saiu, é PUBLISHED e tem id único', () => {
    const shaEsperado = (l: LinhaLegal) =>
      l.tabela === 'INSS_EMPREGADO' ? SHA_D07
        : l.tabela === 'ENCARGO_FOLHA' ? SHA_D04
          : l.tabela === 'ESOCIAL_INCIDENCIA_RUBRICA' && l.discriminador !== 'IRRF' ? SHA_D09
            : SHA_D10;
    for (const l of LINHAS) expect([l.id, l.fonteSha256, l.status]).toEqual([l.id, shaEsperado(l), 'PUBLISHED']);
    expect(new Set(LINHAS.map((l) => l.id)).size).toBe(LINHAS.length);
  });

  it('item 24 — toda linha da carga está no formato da tabela (o mesmo predicado do propose/publish)', () => {
    const fora = LINHAS.map((l) => ({ id: l.id, erro: erroDeFormato({ ...l, tabela: l.tabela as never, valorJson: json(l) }) })).filter((x) => x.erro !== null);
    expect(fora).toEqual([]);
  });

  it('itens 20/21 — INSS do empregado de 2026 (tabela oficial do INSS [D07]); a última faixa vai até o teto', () => {
    const faixas = LINHAS.filter((l) => l.tabela === 'INSS_EMPREGADO').map((l) => [l.chave, json(l), l.vigenteDesde, l.vigenteAte]);
    expect(faixas).toEqual([
      ['FAIXA_1', { ateCents: 162100, aliquotaBp: 750 }, '2026-01-01', null],
      ['FAIXA_2', { ateCents: 290284, aliquotaBp: 900 }, '2026-01-01', null],
      ['FAIXA_3', { ateCents: 435427, aliquotaBp: 1200 }, '2026-01-01', null],
      ['FAIXA_4', { ateCents: null, aliquotaBp: 1400 }, '2026-01-01', null],
    ]);
  });

  it('item 22 — FGTS do aprendiz: 2% desde a publicação da Lei 10.097/2000 (DOU de 20/12/2000)', () => {
    const l = LINHAS.find((x) => x.tabela === 'ENCARGO_FOLHA');
    expect([l?.chave, l?.valorInt, l?.vigenteDesde, l?.vigenteAte, l?.fonte]).toEqual(['FGTS_APRENDIZ_BP', 200, '2000-12-20', null, 'Lei 8.036/1990 art. 15 § 7º (incl. Lei 10.097/2000)']);
  });

  it('item 23 — amostras do dossiê: 101 e 103 ⇒ S-2200; 723 e 901 ⇒ S-2300 [D09, D10]', () => {
    const evento = (cod: string) => json(linhaLegalVigente(LINHAS, 'ESOCIAL_CATEGORIA', cod, '2026-01-01'))?.evento;
    expect(['101', '103', '723', '901'].map(evento)).toEqual(['S-2200', 'S-2200', 'S-2300', 'S-2300']);
  });

  it('item 23 — vigência da própria tabela: a categoria 107 termina em 31/12/2022 e a natureza 1016 troca em 2026', () => {
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_CATEGORIA', '107', '2022-12-31')).toBeDefined();
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_CATEGORIA', '107', '2023-01-01')).toBeUndefined();
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_NATUREZA_RUBRICA', '1016', '2025-12-31')?.id).toBe('esoc-nat-1016-2014-01-01');
    expect(linhaLegalVigente(LINHAS, 'ESOCIAL_NATUREZA_RUBRICA', '1016', '2026-01-01')?.id).toBe('esoc-nat-1016-2026-01-01');
  });

  it('item 23 — título de grupo vai na descrição: "Mensal" de CP 11 e de CP 31 não se confundem', () => {
    const desc = (cod: string, disc: string) => json(linhaLegalVigente(LINHAS, 'ESOCIAL_INCIDENCIA_RUBRICA', cod, '2026-01-01', disc))?.descricao;
    expect(desc('11', 'CP')).toBe('Base de cálculo das contribuições sociais - Salário de contribuição: Mensal');
    expect(desc('31', 'CP')).toBe('Contribuição descontada do segurado sobre salário de contribuição: Mensal');
    expect(desc('00', 'FGTS')).toBe('Não é base de cálculo do FGTS');
  });
});
