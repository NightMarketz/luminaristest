/**
 * BE-INCR-SIMPLES-NACIONAL PR-1 (nó X14, BRIEF itens 1–3) — as tabelas do Simples vêm da LEI, não de memória.
 *
 * Três camadas, cada uma com o seu teste:
 *  1. HTML do Planalto → transcrição TXT commitada (`--transcrever`): roda SÓ com o corpus local (gitignored; sha256
 *     no MANIFEST). Sem o corpus o bloco é pulado explicitamente, não passa em vácuo.
 *  2. TXT → `legal_parameters_simples_v1.sql` (`--stdout`): roda sempre — diff vazio contra o arquivo commitado.
 *  3. SQL → migração: o `migration.sql` carrega o mesmo texto.
 * Mais as invariantes da fonte: contagens, soma 100% da repartição, coerência do teto do ISS com a 5ª faixa.
 */
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SIMPLES_SEED_FILE, legalParamsSeedRows } from '@test/helpers/legalParams';
import { LEGAL_PARAMETER_TABELAS, TABELAS_MIGRADAS } from '../../../legalParameters/models/legalParameter';
import { EnquadramentoJsonSchema, FaixaJsonSchema, ReparticaoJsonSchema, TetoIssJsonSchema } from '../simplesCalc';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/gen-simples-anexos.mjs');
const TXT = path.join(REPO_ROOT, 'docs/accounting/fontes-oficiais/TRANSCRICAO-SIMPLES-ANEXOS-LC123-LC214-2026-10-07.txt');
const CORPUS = path.join(REPO_ROOT, 'docs/accounting/fontes-oficiais');
const MIGRATION = path.join(REPO_ROOT, 'server/prisma/migrations/20261008090000_seed_simples_legal_parameters/migration.sql');
const norm = (s: string) => s.replace(/\r\n/g, '\n');

/** Roda uma expressão contra o módulo ESM do script e devolve o JSON impresso. */
function noScript<T>(expr: string): T {
  const code = `import * as S from ${JSON.stringify(pathToFileURL(SCRIPT).href)}; const r = await (async () => ${expr})(); console.log(JSON.stringify(r));`;
  return JSON.parse(execFileSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
}

const rows = legalParamsSeedRows(SIMPLES_SEED_FILE);
const por = (t: string) => rows.filter((r) => r.tabela === t);
const json = (v: string | null) => JSON.parse(v ?? 'null');

describe('catálogo (item 1)', () => {
  it('as 7 tabelas do Simples estão no catálogo e em TABELAS_MIGRADAS (edição pelo admin com trilha continua possível)', () => {
    const novas = ['SIMPLES_ANEXO_FAIXA', 'SIMPLES_ANEXO_REPARTICAO', 'SIMPLES_TETO_ISS', 'SIMPLES_ENQUADRAMENTO', 'SIMPLES_LIMITE', 'SIMEI_VALOR', 'SALARIO_MINIMO'];
    for (const t of novas) {
      expect(LEGAL_PARAMETER_TABELAS).toContain(t);
      expect(TABELAS_MIGRADAS.has(t as never)).toBe(true);
    }
  });
});

describe('semente gerada da fonte (itens 2–3)', () => {
  it('node scripts/gen-simples-anexos.mjs --stdout === legal_parameters_simples_v1.sql (diff vazio)', () => {
    const out = execFileSync('node', [SCRIPT, '--stdout'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    expect(norm(out)).toBe(norm(readFileSync(SIMPLES_SEED_FILE, 'utf8')));
  });

  it('o migration.sql carrega o texto do arquivo de dados, byte a byte', () => {
    expect(norm(readFileSync(MIGRATION, 'utf8'))).toContain(norm(readFileSync(SIMPLES_SEED_FILE, 'utf8')).trimEnd());
  });

  it('contagens: 5 anexos × 6 faixas × 3 tabelas de faixas (2018, 2027–28, 2029+) e × 7 vigências de repartição; 12 notas de teto', () => {
    expect(por('SIMPLES_ANEXO_FAIXA')).toHaveLength(90);
    expect(por('SIMPLES_ANEXO_REPARTICAO')).toHaveLength(210);
    expect(por('SIMPLES_TETO_ISS')).toHaveLength(12);
    const vig = [...new Set(por('SIMPLES_ANEXO_REPARTICAO').map((r) => `${r.vigenteDesde}..${r.vigenteAte}`))].sort();
    expect(vig).toEqual([
      '2018-01-01..2026-12-31', '2027-01-01..2028-12-31', '2029-01-01..2029-12-31', '2030-01-01..2030-12-31',
      '2031-01-01..2031-12-31', '2032-01-01..2032-12-31', '2033-01-01..null',
    ]);
  });

  it('toda linha: PUBLISHED, fonte não vazia, id único; a das tabelas de anexo carrega url + sha256 da fonte', () => {
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    for (const r of rows) {
      expect(r.status).toBe('PUBLISHED');
      expect(r.fonte.trim()).not.toBe('');
    }
    const sql = readFileSync(SIMPLES_SEED_FILE, 'utf8');
    expect(sql.match(/'07ee7d3adc227cc2a4781a57cda10c26ec6d5599ab6d1879605bb1ad3c766515'/g)).toHaveLength(5 * 6 * 2 + 2);
  });

  it('valorJson de cada tabela passa no schema materializado do cálculo', () => {
    for (const r of por('SIMPLES_ANEXO_FAIXA')) FaixaJsonSchema.parse(json(r.valorJson));
    for (const r of por('SIMPLES_ANEXO_REPARTICAO')) ReparticaoJsonSchema.parse(json(r.valorJson));
    for (const r of por('SIMPLES_TETO_ISS')) TetoIssJsonSchema.parse(json(r.valorJson));
    for (const r of por('SIMPLES_ENQUADRAMENTO')) EnquadramentoJsonSchema.parse(json(r.valorJson));
  });

  it('repartição soma 100,00% em toda faixa de toda vigência', () => {
    for (const r of por('SIMPLES_ANEXO_REPARTICAO')) {
      const soma = Object.values(json(r.valorJson) as Record<string, number>).reduce((a, b) => a + b, 0);
      expect([r.id, soma]).toEqual([r.id, 10000]);
    }
  });

  it('6ª faixa: ICMS/ISS/IBS fora do DAS (art. 13-A) — a linha curta ocupa as colunas da esquerda (regra ii)', () => {
    const f6 = (anexo: string, desde: string) => json(rows.find((r) => r.tabela === 'SIMPLES_ANEXO_REPARTICAO' && r.chave === anexo && r.discriminador === 'F6' && r.vigenteDesde === desde)!.valorJson);
    expect(f6('III', '2027-01-01')).toEqual({ IRPJ: 3509, CSLL: 1504, CBS: 1929, CPP: 3058 });
    expect(f6('IV', '2027-01-01')).toEqual({ IRPJ: 5371, CSLL: 2159, CBS: 2470 });
    expect(f6('I', '2018-01-01')).toEqual({ IRPJ: 1350, CSLL: 1000, COFINS: 2827, PIS: 613, CPP: 4210 });
  });

  it('texto tachado (redação revogada) fica fora: Anexo III 2027, 3ª faixa = CBS 16,41% (LC 227), não 16,42%', () => {
    const f3 = rows.find((r) => r.id === 'sn1-rep-iii-2027-01-01-f3')!;
    expect(json(f3.valorJson)).toMatchObject({ CBS: 1641, IBS: 19 });
    expect(readFileSync(TXT, 'utf8')).not.toContain('16,42%');
  });

  it('anomalia do Anexo XX: o rótulo diz "superior a 14,93%", o limiar gravado é o da frase (14,92537%) — regra iv', () => {
    const txt = readFileSync(TXT, 'utf8');
    expect(txt).toContain('5ª Faixa, com alíquota efetiva superior a 14,93%');
    const teto = json(rows.find((r) => r.id === 'sn1-teto-iii-2027-01-01')!.valorJson);
    expect(teto.limiarAliquotaEfetiva).toBe('14.92537');
  });

  it('o limiar de cada nota é o teto ÷ o ISS da 5ª faixa da mesma vigência (a nota é coerente com a tabela)', () => {
    for (const t of por('SIMPLES_TETO_ISS')) {
      const teto = json(t.valorJson);
      const rep5 = json(rows.find((r) => r.tabela === 'SIMPLES_ANEXO_REPARTICAO' && r.chave === t.chave && r.discriminador === 'F5' && r.vigenteDesde === t.vigenteDesde)!.valorJson);
      const limiar = (teto.percentualBp / rep5.ISS) * 100;
      expect([t.id, Math.abs(limiar - Number(teto.limiarAliquotaEfetiva)) < 0.0001]).toEqual([t.id, true]);
    }
  });

  it('teto 2027–28 do Anexo III: ISS 5%, transferência literal da nota (inclui IBS 0,26%)', () => {
    expect(json(rows.find((r) => r.id === 'sn1-teto-iii-2027-01-01')!.valorJson)).toEqual({
      percentualBp: 500, limiarAliquotaEfetiva: '14.92537', transfereAIbs: false,
      transferencia: { IRPJ: 602, CSLL: 526, CBS: 2320, CPP: 6526, IBS: 26 },
    });
  });
});

describe('regras nominais do parser', () => {
  it('bp / cents / vigência', () => {
    expect(noScript(`[S.bp('13,50'), S.bp('4,8'), S.bp('30'), S.cents('1.800.000,00'), S.cents('-'), S.cents('–'), S.cents('')]`)).toEqual([1350, 480, 3000, 180000000, 0, 0, 0]);
    expect(noScript(`[S.vigencia('01/01/2018'), S.vigencia('1º/1/2027 a 31/12/2028'), S.vigencia('1º/1/2029 até 31/12/2029'), S.vigencia('1º/1/2033')]`)).toEqual([
      { desde: '2018-01-01', ate: null }, { desde: '2027-01-01', ate: '2028-12-31' }, { desde: '2029-01-01', ate: '2029-12-31' }, { desde: '2033-01-01', ate: null },
    ]);
  });

  it('percentual com 3 casas e linha de faixa fora de ordem abortam (não semeia errado em silêncio)', () => {
    expect(noScript(`(() => { try { S.bp('14,925'); return 'NAO'; } catch (e) { return e.message; } })()`)).toMatch(/mais de 2 casas/);
    const bloco = `### LC123 ANEXO I x\\n(Vigência: 01/01/2018) Receita Bruta em 12 Meses (em R$) Alíquota Valor a Deduzir (em R$) 2 a Faixa Até 1,00 4,00% -`;
    expect(noScript(`(() => { try { S.parseTranscricao("${bloco}"); return 'NAO'; } catch (e) { return e.message; } })()`)).toMatch(/faixa 1 fora do formato/);
  });
});

const hasCorpus = existsSync(path.join(CORPUS, 'LC-123-2006-Simples.html')) && existsSync(path.join(CORPUS, 'LC-214-2025.html'));
(hasCorpus ? describe : describe.skip)('HTML do corpus → transcrição commitada (corpus local presente)', () => {
  it('transcrever() reproduz o TXT commitado (diff vazio)', () => {
    expect(norm(noScript<string>('S.transcrever()'))).toBe(norm(readFileSync(TXT, 'utf8')));
  }, 120000);

  it('HTML retocado (1 byte) → aborta pelo sha256 do MANIFEST', () => {
    const dir = path.join(os.tmpdir(), `simples-corpus-${process.pid}`);
    execFileSync('node', ['-e', `require('fs').mkdirSync(${JSON.stringify(dir)}, { recursive: true })`]);
    try {
      writeFileSync(path.join(dir, 'LC-123-2006-Simples.html'), Buffer.concat([readFileSync(path.join(CORPUS, 'LC-123-2006-Simples.html')), Buffer.from(' ')]));
      writeFileSync(path.join(dir, 'LC-214-2025.html'), readFileSync(path.join(CORPUS, 'LC-214-2025.html')));
      const msg = noScript<string>(`(() => { try { S.transcrever(${JSON.stringify(dir)}); return 'NAO'; } catch (e) { return e.message; } })()`);
      expect(msg).toContain('sha256 do corpus divergiu do MANIFEST');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120000);
});
