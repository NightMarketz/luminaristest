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
import { SIMPLES_SEED_FILE, SIMPLES_SEED_FILES, legalParamsSeedRows } from '@test/helpers/legalParams';
import { LEGAL_PARAMETER_TABELAS, TABELAS_MIGRADAS, linhaLegalVigente, linhasEmVigor } from '../../../legalParameters/models/legalParameter';
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

describe('semente v2 à mão (X14 PR-3: cota de gestão da parceria + matriz de obrigações do item 22)', () => {
  const V2 = path.join(REPO_ROOT, 'server/prisma/data/legal_parameters_simples_v2.sql');
  const MIG3 = path.join(REPO_ROOT, 'server/prisma/migrations/20261008150000_add_simples_apuracao/migration.sql');
  it('o migration.sql do PR-3 carrega o texto do arquivo, byte a byte; 5 linhas, todas com fonte', () => {
    expect(norm(readFileSync(MIG3, 'utf8'))).toContain(norm(readFileSync(V2, 'utf8')).trimEnd());
    const v2 = legalParamsSeedRows(V2);
    expect(v2.map((r) => `${r.tabela}:${r.chave}`)).toEqual([
      'SIMPLES_ENQUADRAMENTO:PARCERIA_GESTAO', 'OBRIGACAO_REGIME:PGDAS_D', 'OBRIGACAO_REGIME:DEFIS', 'OBRIGACAO_REGIME:LIVRO_CAIXA', 'OBRIGACAO_REGIME:DASN_SIMEI',
    ]);
    for (const r of v2) expect(r.fonte.trim()).not.toBe('');
    EnquadramentoJsonSchema.parse(json(v2[0].valorJson));
  });
});

describe('semente v3 (X14 PR-4: SALARIO_MINIMO dos decretos, item 25)', () => {
  const V3 = path.join(REPO_ROOT, 'server/prisma/data/legal_parameters_simples_v3.sql');
  const MIG4 = path.join(REPO_ROOT, 'server/prisma/migrations/20261008220000_add_simples_mei_declaracoes/migration.sql');
  it('o migration.sql do PR-4 carrega o texto do arquivo; 3 anos sem buraco, cada linha com decreto, URL e sha256', () => {
    expect(norm(readFileSync(MIG4, 'utf8'))).toContain(norm(readFileSync(V3, 'utf8')).trimEnd());
    const v3 = legalParamsSeedRows(V3);
    expect(v3.map((r) => [r.tabela, r.chave, r.valorInt, r.vigenteDesde, r.vigenteAte])).toEqual([
      ['SALARIO_MINIMO', 'NACIONAL', 141_200, '2024-01-01', '2024-12-31'],
      ['SALARIO_MINIMO', 'NACIONAL', 151_800, '2025-01-01', '2025-12-31'],
      ['SALARIO_MINIMO', 'NACIONAL', 162_100, '2026-01-01', null],
    ]);
    for (const r of v3) {
      expect(r.fonte).toMatch(/^Decreto nº /);
      expect(r.fonteUrl).toMatch(/^https:\/\/www\.planalto\.gov\.br\//);
      expect(r.fonteSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe('semente v4 (X14 PR-4: limite do MEI transportador autônomo de cargas, F-PR4-13)', () => {
  const V4 = path.join(REPO_ROOT, 'server/prisma/data/legal_parameters_simples_v4.sql');
  const MIG = path.join(REPO_ROOT, 'server/prisma/migrations/20261009090100_seed_simples_limite_mei_tac/migration.sql');
  it('o migration.sql carrega o texto do arquivo; R$ 251.600,00 com a fonte da Res. CGSN 140 art. 100 § 1º-A', () => {
    expect(norm(readFileSync(MIG, 'utf8'))).toContain(norm(readFileSync(V4, 'utf8')).trimEnd());
    const v4 = legalParamsSeedRows(V4);
    expect(v4.map((r) => [r.tabela, r.chave, r.valorInt, r.vigenteAte])).toEqual([['SIMPLES_LIMITE', 'MEI_TAC', 25_160_000, null]]);
    expect(v4[0].fonte).toContain('art. 100 § 1º-A');
  });
});

describe('semente v5 (SIMEI-TAC-12: CPP_TAC_PCT e Anexo VII da LC 123)', () => {
  const V5 = path.join(REPO_ROOT, 'server/prisma/data/legal_parameters_simples_v5.sql');
  const MIG = path.join(REPO_ROOT, 'server/prisma/migrations/20261013090000_seed_simei_tac_anexo_vii/migration.sql');
  const v5 = legalParamsSeedRows(V5);
  it('o migration.sql carrega o texto do arquivo, byte a byte, e só insere', () => {
    const mig = norm(readFileSync(MIG, 'utf8'));
    expect(mig).toContain(norm(readFileSync(V5, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters"'))).toBe(true);
  });
  it('item 1: CPP_TAC_PCT = 1200 bp vigente em 2022-04, ausente em 2022-03, com a fonte do art. 101 I "c"', () => {
    expect(linhaLegalVigente(v5, 'SIMEI_VALOR', 'CPP_TAC_PCT', '2022-04-01')?.valorInt).toBe(1_200);
    expect(linhaLegalVigente(v5, 'SIMEI_VALOR', 'CPP_TAC_PCT', '2022-03-31')).toBeUndefined();
    expect(linhaLegalVigente(v5, 'SIMEI_VALOR', 'CPP_TAC_PCT', '2022-04-01')?.fonte).toContain('art. 101 I "c"');
  });
  it('item 10: o Anexo VII transcrito (conferido no Planalto, LC 214 Anexo XXIII) — valor de cada ano por linhaLegalVigente', () => {
    const v = (chave: string, data: string) => linhaLegalVigente(v5, 'SIMEI_VALOR', chave, data)?.valorInt ?? null;
    const anexo: Array<[string, number | null, number | null, number, number]> = [
      // data,        ICMS (¢), ISS (¢), CBS (milésimos), IBS (milésimos)
      ['2027-01-01', null, null, 994, 6],
      ['2028-12-31', null, null, 994, 6],
      ['2029-01-01', 90, 450, 1_000, 200],
      ['2030-06-01', 80, 400, 1_000, 400],
      ['2031-06-01', 70, 350, 1_000, 600],
      ['2032-12-31', 60, 300, 1_000, 800],
      ['2033-01-01', 0, 0, 1_000, 2_000],
    ];
    for (const [d, icms, iss, cbs, ibs] of anexo) expect([d, v('ICMS', d), v('ISS', d), v('CBS_MILESIMOS', d), v('IBS_MILESIMOS', d)]).toEqual([d, icms, iss, cbs, ibs]);
    expect([v('CBS_MILESIMOS', '2026-12-31'), v('IBS_MILESIMOS', '2026-12-31')]).toEqual([null, null]);
    for (const r of v5.filter((l) => l.chave !== 'CPP_TAC_PCT')) {
      expect(r.fonteUrl).toBe('https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm');
      expect(r.fonteSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

// Verificação legal de 17/10/2026 (pesquisas-legais/verif-2026-10-17-simples-mei, conclusão itens 3 e 4): a Res. CGSN
// 190/2026 [D16] (efeitos em 01/01/2027) regulou o que a semente dizia "não regulamentado" e mudou a fonte do SIMEI.
describe('Res. CGSN 190/2026 — fontes das linhas de 2027 (DEFIS e SIMEI)', () => {
  const todas = legalParamsSeedRows(SIMPLES_SEED_FILES);
  it('semente v6: o migration.sql carrega o texto do arquivo, byte a byte, e só insere', () => {
    const mig = norm(readFileSync(path.join(REPO_ROOT, 'server/prisma/migrations/20261017153700_seed_simples_res_cgsn_190/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(readFileSync(path.join(REPO_ROOT, 'server/prisma/data/legal_parameters_simples_v6.sql'), 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters"'))).toBe(true);
  });
  it('DEFIS do Simples: prazo de 31/03/2027 mantido; a fonte cita a revogação do art. 72 (art. 8º XXI) e o art. 38-B, sem "não regulamentada"', () => {
    const l = linhaLegalVigente(todas, 'OBRIGACAO_REGIME', 'DEFIS', '2027-03-31', 'SIMPLES');
    expect(l?.vigenteAte).toBe('2027-03-31');
    expect(l?.fonte).toContain('Res. CGSN 190/2026');
    expect(l?.fonte).toContain('art. 8º XXI');
    expect(l?.fonte).toContain('art. 38-B');
    expect(l?.fonte).not.toMatch(/não foi regulamentada/);
    expect(linhaLegalVigente(todas, 'OBRIGACAO_REGIME', 'DEFIS', '2027-04-01', 'SIMPLES')).toBeUndefined();
  });
  it('SIMEI ICMS/ISS 2027–2028: R$ 1,00 e R$ 5,00 pelo art. 101 IV/V e Anexo XIII (red. Res. 190); até 2026 segue o art. 101 II/III', () => {
    for (const d of ['2027-01-01', '2028-12-31']) {
      const icms = linhaLegalVigente(todas, 'SIMEI_VALOR', 'ICMS', d);
      const iss = linhaLegalVigente(todas, 'SIMEI_VALOR', 'ISS', d);
      expect([d, icms?.valorInt, iss?.valorInt]).toEqual([d, 100, 500]);
      expect(icms?.fonte).toMatch(/art\. 101 V.*Anexo XIII/);
      expect(iss?.fonte).toMatch(/art\. 101 V.*Anexo XIII/);
    }
    expect(linhaLegalVigente(todas, 'SIMEI_VALOR', 'ICMS', '2026-12-31')?.fonte).toBe('Res. CGSN 140/2018 art. 101 II');
    expect(linhaLegalVigente(todas, 'SIMEI_VALOR', 'ISS', '2026-12-31')?.fonte).toBe('Res. CGSN 140/2018 art. 101 III');
    expect(linhaLegalVigente(todas, 'SIMEI_VALOR', 'ICMS', '2029-01-01')?.valorInt).toBe(90);
  });
});

// BE-INCR-SIMPLES-CGSN-196 itens 2 e 5 (dono, chat, 26/11/2026: "Ratifico F-196-1 a 4 como recomendado, executa").
describe('Res. CGSN 196/2026 — semente v7 (teto do ISS 2027–28 com IBS; DEFIS pelo art. 144-F)', () => {
  const V7 = path.join(REPO_ROOT, 'server/prisma/data/legal_parameters_simples_v7.sql');
  const vigentes = linhasEmVigor(legalParamsSeedRows(SIMPLES_SEED_FILES));
  const teto = (anexo: string, d: string) => {
    const l = linhaLegalVigente(vigentes, 'SIMPLES_TETO_ISS', anexo, d, null);
    return { id: l?.id, ...json(l?.valorJson ?? null) };
  };

  it('o migration.sql carrega o texto do arquivo, byte a byte, e só insere', () => {
    const mig = norm(readFileSync(path.join(REPO_ROOT, 'server/prisma/migrations/20261126180000_seed_simples_res_cgsn_196/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(readFileSync(V7, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters"'))).toBe(true);
  });

  it('item 2: as linhas do teto na v7 são as que o gerador produz (`--correcoes`), byte a byte', () => {
    const geradas = execFileSync('node', [SCRIPT, '--correcoes'], { encoding: 'utf8' }).trimEnd().split('\n');
    expect(geradas).toHaveLength(2);
    const v7 = norm(readFileSync(V7, 'utf8')).split('\n');
    for (const g of geradas) expect(v7).toContain(g);
  });

  it('item 2: 2027–2028, Anexos III e IV — transfereAIbs true, mesmos percentuais da linha substituída; antes e depois não mudam', () => {
    for (const d of ['2027-01-01', '2028-12-31']) {
      expect(teto('III', d)).toEqual({ id: 'sn8-teto-iii-2027-01-01', percentualBp: 500, limiarAliquotaEfetiva: '14.92537', transfereAIbs: true, transferencia: { IRPJ: 602, CSLL: 526, CBS: 2320, CPP: 6526, IBS: 26 } });
      expect(teto('IV', d)).toEqual({ id: 'sn8-teto-iv-2027-01-01', percentualBp: 500, limiarAliquotaEfetiva: '12.5', transfereAIbs: true, transferencia: { IRPJ: 3133, CSLL: 3200, CBS: 3627, IBS: 40 } });
    }
    expect([teto('III', '2026-12-31').transfereAIbs, teto('IV', '2026-12-31').transfereAIbs]).toEqual([false, false]);
    expect([teto('III', '2029-01-01').id, teto('III', '2029-01-01').transfereAIbs]).toEqual(['sn1-teto-iii-2029-01-01', true]);
    // De 2027 em diante nenhum teto vigente fica sem IBS (o artigo da LC 214 art. 517 vale para todos os anos).
    for (const ano of [2027, 2028, 2029, 2030, 2031, 2032]) for (const a of ['III', 'IV']) expect([ano, a, teto(a, `${ano}-06-01`).transfereAIbs]).toEqual([ano, a, true]);
  });

  it('item 2: regerar a v1 não "conserta" a nota — ela segue `false` (o que a lei transcrita diz) e a v7 a substitui', () => {
    const v1 = rows.filter((r) => r.id === 'sn1-teto-iii-2027-01-01' || r.id === 'sn1-teto-iv-2027-01-01');
    expect(v1.map((r) => json(r.valorJson).transfereAIbs)).toEqual([false, false]);
    const v7 = legalParamsSeedRows(V7).filter((r) => r.tabela === 'SIMPLES_TETO_ISS');
    expect(v7.map((r) => [r.supersedesId, r.status])).toEqual([['sn1-teto-iii-2027-01-01', 'PUBLISHED'], ['sn1-teto-iv-2027-01-01', 'PUBLISHED']]);
    for (const r of v7) {
      expect(r.fonte).toMatch(/LC 123\/2006 art\. 18 § 1º-B I \(red\. LC 214\/2025 art\. 517, incl\. LC 227\/2026\)/);
      expect(r.fonte).toMatch(/Res\. CGSN 196\/2026 art\. 3º/);
      expect(r.fonteSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('item 5: DEFIS do ano-calendário 2026 pelo art. 144-F, mesma vigência (até 31/03/2027) e valor; a ambiguidade A1 sai da fonte', () => {
    const l = linhaLegalVigente(vigentes, 'OBRIGACAO_REGIME', 'DEFIS', '2027-02-15', 'SIMPLES');
    const sn7 = legalParamsSeedRows(SIMPLES_SEED_FILES).find((r) => r.id === 'sn7-obr-defis-simples');
    expect([l?.id, l?.supersedesId, l?.vigenteDesde, l?.vigenteAte]).toEqual(['sn8-obr-defis-simples', 'sn7-obr-defis-simples', '2018-01-01', '2027-03-31']);
    expect(l?.valorJson).toBe(sn7?.valorJson);
    expect(l?.fonte).toMatch(/art\. 144-F \(incl\. Res\. CGSN 196\/2026 art\. 1º/);
    expect(l?.fonte).toMatch(/31\/03\/2027/);
    expect(l?.fonte).not.toMatch(/ambiguidade A1|em aberto/);
  });
});

// BE-INCR-SIMPLES-CGSN-196 item 4: paridade semente × Anexos I–V da Res. CGSN 196/2026 (art. 3º). A semente segue a LEI; o
// teste só acusa. A única diferença que existia (transfereAIbs 2027–28) é a que a v7 corrige (item 2).
describe('Res. CGSN 196/2026 — paridade da semente com os Anexos I–V (item 4)', () => {
  const TXT196 = path.join(REPO_ROOT, 'docs/accounting/fontes-oficiais/TRANSCRICAO-SIMPLES-ANEXOS-RES-CGSN-196-2026-11-25.txt');
  type Tab = { tipo: 'FAIXA' | 'REPARTICAO' | 'TETO_ISS'; anexo: string; faixa?: number; vig: { desde: string; ate: string | null }; reparticao?: Record<string, number> } & Record<string, unknown>;
  const tabelas196 = noScript<Tab[]>(`S.parseTranscricao((await import('node:fs')).readFileSync(${JSON.stringify(TXT196)}, 'utf8'))`);
  const vigentes = linhasEmVigor(legalParamsSeedRows(SIMPLES_SEED_FILES));
  const TABELA = { FAIXA: 'SIMPLES_ANEXO_FAIXA', REPARTICAO: 'SIMPLES_ANEXO_REPARTICAO', TETO_ISS: 'SIMPLES_TETO_ISS' } as const;
  /**
   * O valor do anexo da 196 que cobre a data: a tabela de `vig.desde` mais recente até ela, respeitando o fim quando a 196 o
   * escreve. Fim omitido (ex. Anexo III "Vigência: 1º/1/2030", seguido de 2031 e 2032 com fim) fecha na véspera da próxima
   * tabela do mesmo tipo, como o `fecharVigencias` do gerador faz com a lei.
   */
  const da196 = (tipo: Tab['tipo'], anexo: string, faixa: number | undefined, data: string) => {
    const mesmas = tabelas196.filter((x) => x.tipo === tipo && x.anexo === anexo && x.faixa === faixa);
    const ate = (x: Tab) => x.vig.ate ?? mesmas.filter((y) => y.vig.desde > x.vig.desde).map((y) => y.vig.desde).sort()[0] ?? null;
    const t = mesmas
      .filter((x) => x.vig.desde <= data && (ate(x) === null || (x.vig.ate === null ? (ate(x) as string) > data : (ate(x) as string) >= data)))
      .sort((a, b) => (a.vig.desde < b.vig.desde ? 1 : -1))[0];
    if (!t) return undefined;
    if (tipo === 'FAIXA') return { receitaAteCents: t.receitaAteCents, aliquotaNominalBp: t.aliquotaNominalBp, parcelaDeduzirCents: t.parcelaDeduzirCents };
    if (tipo === 'REPARTICAO') return t.reparticao;
    return { percentualBp: t.percentualBp, limiarAliquotaEfetiva: t.limiarAliquotaEfetiva, transfereAIbs: t.transfereAIbs, transferencia: t.transferencia };
  };

  it('a transcrição commitada é o texto do dossiê (D11–D15, sha256 do PDF conferido com o manifest), byte a byte', () => {
    const gerada = noScript<string>('S.transcreverRes196()');
    expect(norm(readFileSync(TXT196, 'utf8'))).toBe(norm(gerada));
  });

  it('a transcrição tem as 5 tabelas de anexo com faixas, repartições e notas de teto (III e IV)', () => {
    for (const a of ['I', 'II', 'III', 'IV', 'V']) {
      expect([a, tabelas196.filter((t) => t.anexo === a && t.tipo === 'FAIXA').length]).toEqual([a, 12]);
      expect([a, tabelas196.filter((t) => t.anexo === a && t.tipo === 'REPARTICAO').length]).toEqual([a, 36]);
    }
    expect(tabelas196.filter((t) => t.tipo === 'TETO_ISS').map((t) => t.anexo)).toEqual(['III', 'III', 'III', 'III', 'III', 'IV', 'IV', 'IV', 'IV', 'IV']);
  });

  /**
   * Divergências lei × resolução já na caixa (a semente segue a LEI; nenhuma é "consertada" aqui). Uma entrada nova = vermelho.
   * - L-20261127-004212-731f: Anexo I, 6ª faixa, 2029+ — LC 214 Anexo XVIII (Planalto, 20/11/2026) 19,00%; Res. CGSN 196 18,90%.
   */
  const DIVERGENCIAS_CONHECIDAS = [2029, 2030, 2031, 2032, 2033].map(
    (ano) => `${ano}-06-01 Anexo I FAIXA F6: semente {"receitaAteCents":480000000,"aliquotaNominalBp":1900,"parcelaDeduzirCents":37800000} × 196 {"receitaAteCents":480000000,"aliquotaNominalBp":1890,"parcelaDeduzirCents":37800000}`,
  );

  it('de 2027 a 2033, toda faixa, repartição e teto vigente na semente tem o número do anexo da Res. CGSN 196', () => {
    const divergencias: string[] = [];
    for (let ano = 2027; ano <= 2033; ano++) {
      const data = `${ano}-06-01`;
      for (const anexo of ['I', 'II', 'III', 'IV', 'V']) {
        const casos: Array<[Tab['tipo'], number | undefined]> = [
          ...[1, 2, 3, 4, 5, 6].map((f): [Tab['tipo'], number] => ['FAIXA', f]),
          ...[1, 2, 3, 4, 5, 6].map((f): [Tab['tipo'], number] => ['REPARTICAO', f]),
          ['TETO_ISS', undefined],
        ];
        for (const [tipo, faixa] of casos) {
          const l = linhaLegalVigente(vigentes, TABELA[tipo], anexo, data, faixa === undefined ? null : `F${faixa}`);
          const semente = l ? json(l.valorJson) : undefined;
          const res = da196(tipo, anexo, faixa, data);
          if (JSON.stringify(semente) !== JSON.stringify(res)) divergencias.push(`${data} Anexo ${anexo} ${tipo}${faixa ? ` F${faixa}` : ''}: semente ${JSON.stringify(semente)} × 196 ${JSON.stringify(res)}`);
        }
      }
    }
    expect(divergencias).toEqual(DIVERGENCIAS_CONHECIDAS);
  });
});
