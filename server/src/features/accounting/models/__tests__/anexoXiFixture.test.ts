/**
 * SIMPLES-PISO-ANEXO-XI bloco 2 (BRIEF §3 itens 10-11; F-AX-1 a) — `anexo-xi-res-cgsn-140-2018.json` é DERIVADO do PDF
 * oficial (binário id 81177) por `scripts/anexo-xi-to-fixture.mjs`; nenhuma ocupação/CNAE é digitada de memória.
 *
 * Gates (molde `anexoIIIFixture.test.ts`):
 *  1. Contagens por tabela, os casos nomeados das anomalias de layout e a semente v6 = fixture — rodam sempre.
 *  2. Rodar o script contra o PDF do corpus reproduz o fixture byte a byte — roda SÓ quando o PDF existe localmente
 *     (gitignored; sha256 no MANIFEST e no fixture). Sem o corpus o teste é pulado explicitamente.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { LEGAL_PARAMS_SEED_FILE_V6, legalParamsSeedRows } from '@test/helpers/legalParams';
import { erroDeFormato, type LinhaParaFormato } from '../../../legalParameters/models/formatoLinha';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const PDF = path.join(REPO_ROOT, 'docs/accounting/fontes-oficiais/Res-CGSN-140-2018-Anexo-XI.pdf');
const FIXTURE_PATH = path.join(REPO_ROOT, 'server/src/features/accounting/fixtures/anexo-xi-res-cgsn-140-2018.json');
const MIGRATION_V6 = path.join(REPO_ROOT, 'server/prisma/migrations/20261010110000_legal_parameters_v6_mei_anexo_xi/migration.sql');

interface Row {
  chave: string;
  tabela: 'A' | 'B';
  pagina: number;
  ocupacao: string;
  cnae: string;
  descricaoCnae: string;
  iss: boolean;
  icms: boolean;
}
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as {
  sha256: string;
  contagens: { A: number; B: number };
  anomalias: { continuacaoDePagina: number; ocupacaoMultilinha: number; descricaoMultilinha: number };
  rows: Row[];
};
const A = fixture.rows.filter((r) => r.tabela === 'A');
const B = fixture.rows.filter((r) => r.tabela === 'B');
const porOcupacao = (inicio: string) => fixture.rows.filter((r) => r.ocupacao.startsWith(inicio));
const norm = (s: string) => s.replace(/\r\n/g, '\n');

describe('anexo-xi-res-cgsn-140-2018.json — contagens (F-AX-1)', () => {
  it('Tabela A = 467 linhas ocupação×CNAE (350 CNAEs distintos); Tabela B = 4; 471 no total', () => {
    expect([A.length, B.length, fixture.rows.length]).toEqual([467, 4, 471]);
    expect(fixture.contagens).toEqual({ A: 467, B: 4 });
    expect(new Set(A.map((r) => r.cnae)).size).toBe(350);
  });

  it('cabeçalho: sha256 do PDF id 81177 (o mesmo do BRIEF M8 e do MANIFEST)', () => {
    expect(fixture.sha256).toBe('cb3845804f3c14cb9cb1320aee19bf14498cf15988cd9263fd4618d8faaab8b6');
  });

  it('(viii) chave = tabela + ordinal da fonte, contígua, nunca o CNAE', () => {
    expect(A.map((r) => r.chave)).toEqual(A.map((_, i) => `A-${String(i + 1).padStart(4, '0')}`));
    expect(B.map((r) => r.chave)).toEqual(['B-0001', 'B-0002', 'B-0003', 'B-0004']);
    expect(fixture.rows.every((r) => /^\d{4}-\d\/\d{2}$/.test(r.cnae) && r.ocupacao.length > 0 && r.descricaoCnae.length > 0)).toBe(true);
  });

  it('anomalias de layout contadas (M10): 147 ocupações e 279 descrições em mais de uma linha; nenhuma continuação de página', () => {
    expect(fixture.anomalias).toEqual({ continuacaoDePagina: 0, ocupacaoMultilinha: 147, descricaoMultilinha: 279 });
  });
});

describe('casos nomeados (onde o `pdftotext -layout` erra)', () => {
  it('AMOLADOR e ANIMADOR: cada ocupação com o próprio CNAE e a descrição de 3 linhas inteira', () => {
    expect(porOcupacao('AMOLADOR')).toEqual([
      expect.objectContaining({ cnae: '9529-1/99', descricaoCnae: 'REPARAÇÃO E MANUTENÇÃO DE OUTROS OBJETOS E EQUIPAMENTOS PESSOAIS E DOMÉSTICOS NÃO ESPECIFICADOS ANTERIORMENTE', iss: true, icms: false }),
    ]);
    expect(porOcupacao('ANIMADOR(A) DE FESTAS')).toEqual([expect.objectContaining({ ocupacao: 'ANIMADOR(A) DE FESTAS INDEPENDENTE', cnae: '9329-8/99', iss: true, icms: false })]);
  });

  it('ABATEDOR: ocupação de 2 linhas, ISS N / ICMS S', () => {
    expect(porOcupacao('ABATEDOR')).toEqual([
      expect.objectContaining({ ocupacao: 'ABATEDOR(A) DE AVES COM COMERCIALIZAÇÃO DO PRODUTO INDEPENDENTE', cnae: '4724-5/00', iss: false, icms: true }),
    ]);
  });

  it('ocupações sem "INDEPENDENTE" no fim saem como na fonte (ARTESÃO TÊXTIL, SAPATEIRO(A), PET SHOP, GUINCHEIRO)', () => {
    expect(A.filter((r) => !r.ocupacao.endsWith('INDEPENDENTE')).map((r) => r.ocupacao)).toEqual([
      'ARTESÃO TÊXTIL',
      'COMERCIANTE DE ARTIGOS E ALIMENTOS PARA ANIMAIS DE ESTIMAÇÃO (PET SHOP) INDEPENDENTE (NÃO INCLUI A VENDA DE MEDICAMENTOS)',
      'GUINCHEIRO INDEPENDENTE (REBOQUE DE VEÍCULOS)',
      'SAPATEIRO(A)',
    ]);
  });

  it('Tabela B: 4 ocupações de transportador autônomo, 4930-2/01..04, com ISS/ICMS por CNAE', () => {
    expect(B.map((r) => [r.cnae, r.iss, r.icms])).toEqual([
      ['4930-2/01', true, false],
      ['4930-2/02', false, true],
      ['4930-2/03', true, true],
      ['4930-2/04', true, true],
    ]);
    expect(B.every((r) => r.ocupacao.startsWith('TRANSPORTADOR AUTÔNOMO DE CARGA'))).toBe(true);
  });
});

describe('item 11 — semente v6 MEI_ANEXO_XI = fixture', () => {
  const v5 = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_V6);

  it('o migration.sql v6 carrega o texto de prisma/data/legal_parameters_v5.sql, byte a byte', () => {
    expect(norm(readFileSync(MIGRATION_V6, 'utf8'))).toContain(norm(readFileSync(LEGAL_PARAMS_SEED_FILE_V6, 'utf8')).trimEnd());
  });

  it('471 linhas PUBLISHED, vigentes desde 2025-10-01 (Res. CGSN 182/2025), chave/discriminador/valorJson = fixture', () => {
    expect(v5.every((r) => r.tabela === 'MEI_ANEXO_XI' && r.status === 'PUBLISHED' && r.vigenteDesde === '2025-10-01' && r.vigenteAte === null && r.fonteSha256 === fixture.sha256)).toBe(true);
    expect(v5.map((r) => ({ chave: r.chave, tabela: r.discriminador, ...(JSON.parse(r.valorJson ?? 'null') as object) }))).toEqual(
      fixture.rows.map(({ chave, tabela, ocupacao, cnae, descricaoCnae, iss, icms }) => ({ chave, tabela, ocupacao, cnae, descricaoCnae, iss, icms })),
    );
  });

  it('toda linha passa no formato da tabela (formatoLinha.ts)', () => {
    for (const r of v5) {
      const linha = { ...r, valorJson: JSON.parse(r.valorJson ?? 'null') as unknown } as LinhaParaFormato;
      expect([r.chave, erroDeFormato(linha)]).toEqual([r.chave, null]);
    }
  });
});

const temPdf = existsSync(PDF);
(temPdf ? describe : describe.skip)('reprodução — o script contra o PDF do corpus reproduz o fixture byte a byte', () => {
  it('node scripts/anexo-xi-to-fixture.mjs --stdout = fixture commitado', () => {
    const out = execFileSync(process.execPath, ['scripts/anexo-xi-to-fixture.mjs', '--stdout'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    expect(out).toBe(norm(readFileSync(FIXTURE_PATH, 'utf8')));
  }, 60000);
});
if (!temPdf) {
  it.skip('reprodução pulada: corpus local ausente (docs/accounting/fontes-oficiais/Res-CGSN-140-2018-Anexo-XI.pdf)', () => undefined);
}
