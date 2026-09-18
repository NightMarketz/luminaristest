/**
 * Anexo III (BE-INCR-FIXED-ASSETS, BRIEF item 3) — `anexo-iii-in-1700-2017.json` é DERIVADO do HTML
 * oficial por `scripts/anexo-iii-to-fixture.mjs`; nenhuma taxa é digitada de memória.
 *
 * Dois gates (molde `lalurCatalog.test.ts`):
 *  1. Contagens e os 3 casos nomeados batem — roda sempre (CI inclusa, o fixture é commitado).
 *  2. Rodar o script contra o HTML do corpus reproduz o fixture byte-a-byte — roda SÓ quando o
 *     HTML existe localmente (gitignored: corpus local, sha256 no MANIFEST). Sem o corpus o teste
 *     é pulado explicitamente, não passa em vácuo.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const HTML = path.join(REPO_ROOT, 'docs/accounting/fontes-oficiais/IN-RFB-1700-2017-anexos/43557-tabela.html');
const FIXTURE_PATH = path.join(REPO_ROOT, 'server/src/features/accounting/fixtures/anexo-iii-in-1700-2017.json');

interface AnexoRow {
  ncm: string | null;
  sourceRow: number | null;
  description: string;
  lifeYears: number;
  annualRateBp: number;
  source: string;
  justification?: string;
}
interface AnexoFixture {
  origem: string;
  sha256: string;
  geradoPor: string;
  rows: AnexoRow[];
}

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as AnexoFixture;

describe('anexo-iii-in-1700-2017.json — contagens exatas (BRIEF item 3)', () => {
  it('220 linhas vivas do Anexo + 2 Notas = 222 no total', () => {
    const anexo = fixture.rows.filter((r) => r.source === 'ANEXO_III_IN_1700_2017');
    const notas = fixture.rows.filter((r) => r.source !== 'ANEXO_III_IN_1700_2017');
    expect(anexo).toHaveLength(220);
    expect(notas).toHaveLength(2);
    expect(fixture.rows).toHaveLength(222);
  });

  it('cabeçalho: sha256 do HTML de origem (MANIFEST.md) e origem correta', () => {
    expect(fixture.origem).toBe('43557-tabela.html');
    expect(fixture.sha256).toBe('d526ac53071a0532cca69ebb366a3ea3371accbf1e6699267fa1de6fcfc01d8d');
  });

  it('(i) <STRIKE>: só a linha retificada (8517, 20%) sobrevive — a original (0%) foi descartada', () => {
    const rows = fixture.rows.filter((r) => r.ncm === '8517');
    expect(rows).toHaveLength(1);
    expect(rows[0].annualRateBp).toBe(2000);
    expect(rows[0].description).toMatch(/Retificado/);
  });

  it('(v) NCM "3926.90" aparece 2× com taxas DIFERENTES (F-FA10 → a: NCM não é chave)', () => {
    const rows = fixture.rows.filter((r) => r.ncm === '3926.90');
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.annualRateBp)).size).toBe(2);
    expect(new Set(rows.map((r) => r.sourceRow)).size).toBe(2); // chave real: sourceRow
  });

  it('(iii)/(iv) Capítulo com taxa e "--------------" semeiam ncm=null', () => {
    const instalacoes = fixture.rows.find((r) => r.description === 'INSTALAÇÕES');
    const edificacoes = fixture.rows.find((r) => r.description === 'EDIFICAÇÕES');
    expect(instalacoes).toMatchObject({ ncm: null, lifeYears: 10, annualRateBp: 1000 });
    expect(edificacoes).toMatchObject({ ncm: null, lifeYears: 25, annualRateBp: 400 });
  });

  it('(vii) NCM 8905 (prazo 20, célula de taxa vazia) deriva 10000÷20 = 500 bp, com justification', () => {
    const row = fixture.rows.find((r) => r.ncm === '8905');
    expect(row).toBeDefined();
    expect(row?.lifeYears).toBe(20);
    expect(row?.annualRateBp).toBe(500);
    expect(row?.justification).toMatch(/derivada do prazo/);
  });

  it("Notas: NCM 8417 (33,3%, 3 anos) e 'indústria química' (ncm=null, 20%, 5 anos)", () => {
    const nota1 = fixture.rows.find((r) => r.source === 'ANEXO_III_NOTA_1');
    const nota2 = fixture.rows.find((r) => r.source === 'ANEXO_III_NOTA_2');
    expect(nota1).toMatchObject({ ncm: '8417', lifeYears: 3, annualRateBp: 3330 });
    expect(nota2).toMatchObject({ ncm: null, lifeYears: 5, annualRateBp: 2000 });
  });

  it('todo sourceRow do Anexo é único (chave F-FA10 → a) — Notas têm sourceRow=null', () => {
    const anexo = fixture.rows.filter((r) => r.source === 'ANEXO_III_IN_1700_2017');
    const sourceRows = anexo.map((r) => r.sourceRow);
    expect(new Set(sourceRows).size).toBe(sourceRows.length);
    for (const r of fixture.rows.filter((r) => r.source !== 'ANEXO_III_IN_1700_2017')) {
      expect(r.sourceRow).toBeNull();
    }
  });
});

const hasCorpus = existsSync(HTML);
(hasCorpus ? describe : describe.skip)('script × fixture — reprodução byte-a-byte (corpus local presente)', () => {
  it('node scripts/anexo-iii-to-fixture.mjs --stdout === fixture commitado (diff vazio, item 3)', () => {
    const out = execFileSync('node', ['scripts/anexo-iii-to-fixture.mjs', '--stdout'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const sha = (s: string) => createHash('sha256').update(s).digest('hex');
    expect(sha(norm(out))).toBe(sha(norm(readFileSync(FIXTURE_PATH, 'utf8'))));
  }, 120000);

  it('OPS-001 adversarial: HTML retocado (1 byte) → script ABORTA pelo sha (não semeia silenciosamente errado)', () => {
    const os = require('node:os') as typeof import('node:os');
    const fs = require('node:fs') as typeof import('node:fs');
    const pathMod = require('node:path') as typeof import('node:path');
    const { pathToFileURL } = require('node:url') as typeof import('node:url');
    const tamperedPath = pathMod.join(os.tmpdir(), 'anexo-iii-tampered.html');
    fs.writeFileSync(tamperedPath, Buffer.concat([readFileSync(HTML), Buffer.from(' ')]));
    try {
      // Processo Node separado (ESM real) — o módulo em si já prova a reprodução via execFileSync
      // acima; aqui só chamamos buildFixture com o caminho trocado pelo arquivo adulterado.
      const scriptUrl = pathToFileURL(pathMod.join(REPO_ROOT, 'scripts/anexo-iii-to-fixture.mjs')).href;
      const script = `
        import { buildFixture } from ${JSON.stringify(scriptUrl)};
        try {
          await buildFixture(${JSON.stringify(tamperedPath)});
          console.log('NAO-ABORTOU');
        } catch (e) {
          console.log('ABORTOU: ' + e.message);
        }
      `;
      const out = execFileSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
      expect(out).toContain('ABORTOU: sha256 do corpus divergiu do MANIFEST');
    } finally {
      fs.rmSync(tamperedPath, { force: true });
    }
  });
});
