#!/usr/bin/env node
// SIMPLES-PISO-ANEXO-XI bloco 2 (BRIEF §3 item 10, F-AX-1 a) — transcreve o Anexo XI da Res. CGSN 140/2018
// ("Ocupações Permitidas ao MEI - Tabelas A e B", binário id 81177 da compilação RFB) a partir do PDF oficial.
// Nenhuma ocupação/CNAE é digitada de memória: o script só lê a POSIÇÃO de cada trecho de texto do PDF (pdf-parse,
// a mesma dependência de scripts/transcrever-ecf-lmn.mjs) e recorta as 5 colunas.
//
// Por que posição e não `pdftotext -layout`: no layout em texto a ocupação de 2-3 linhas escorrega para a linha do
// vizinho (ex.: ANIMADOR(A) DE FESTAS sai entre as linhas da descrição do AMOLADOR) — BRIEF M10. Pela posição, a
// 1ª linha de cada célula (ocupação, CNAE, ISS, ICMS) fica na MESMA y.
//
// Regras do parser (cada uma com contagem asserida no teste server/src/features/accounting/models/__tests__/
// anexoXiFixture.test.ts):
//  (i)   coluna pela x do trecho: < 360 ocupação · < 425 CNAE · < 700 descrição · < 740 ISS · resto ICMS
//  (ii)  âncora de linha = grupo da coluna CNAE na mesma y que forma `\d{4}-\d/\d{2}`; grupo fora do padrão = erro
//  (iii) ocupação/descrição: cada trecho pertence à âncora imediatamente acima (y ≤ âncora + 1) na mesma página
//  (iv)  trecho acima da 1ª âncora da página (sem cabeçalho) = continuação da última linha da página anterior
//  (v)   ISS/ICMS: exatamente um 'S'|'N' na y da âncora; outro valor ou posição = erro
//  (vi)  cabeçalho (OCUPAÇÃO/CNAE/DESCRIÇÃO/ISS/ICMS), título e marcadores "TABELA A|B" saem; o marcador troca a tabela
//  (vii) linha sem ocupação = erro (nenhuma no PDF id 81177 — se aparecer, a regra nova é decisão, não default)
//  (viii) chave = tabela + ordinal na fonte (A-0001…, B-0001…), NUNCA o CNAE (o mesmo CNAE serve várias ocupações)
//
// Uso (raiz do repo):
//   node scripts/anexo-xi-to-fixture.mjs            # escreve o fixture
//   node scripts/anexo-xi-to-fixture.mjs --stdout   # imprime (o teste compara com o commitado)
// Lê docs/accounting/fontes-oficiais/Res-CGSN-140-2018-Anexo-XI.pdf (gitignored — corpus local; MANIFEST.md e o
// fixture carregam o sha256) e escreve server/src/features/accounting/fixtures/anexo-xi-res-cgsn-140-2018.json.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

export const PDF_PATH = path.join(process.cwd(), 'docs', 'accounting', 'fontes-oficiais', 'Res-CGSN-140-2018-Anexo-XI.pdf');
export const OUT_PATH = path.join(process.cwd(), 'server', 'src', 'features', 'accounting', 'fixtures', 'anexo-xi-res-cgsn-140-2018.json');
const SHA256 = 'cb3845804f3c14cb9cb1320aee19bf14498cf15988cd9263fd4618d8faaab8b6';

const require = createRequire(path.join(process.cwd(), 'server', 'package.json'));
const pdfParse = require('pdf-parse');

const coluna = (x) => (x < 360 ? 'ocupacao' : x < 425 ? 'cnae' : x < 700 ? 'descricao' : x < 740 ? 'iss' : 'icms');
const CABECALHO = new Set(['OCUPAÇÃO', 'CNAE', 'DESCRIÇÃO SUBCLASSE CNAE', 'ISS', 'ICMS']);
const junta = (partes) => partes.join(' ').replace(/\s+/g, ' ').trim();

async function trechos(pdf) {
  const out = [];
  let pagina = 0;
  await pdfParse(pdf, {
    pagerender: async (pageData) => {
      pagina += 1;
      const tc = await pageData.getTextContent({ normalizeWhitespace: false });
      for (const it of tc.items) {
        const s = it.str.trim();
        if (s) out.push({ pagina, x: it.transform[4], y: it.transform[5], s });
      }
      return '';
    },
  });
  return out;
}

export function transcrever(itens) {
  const anomalias = { continuacaoDePagina: 0, ocupacaoMultilinha: 0, descricaoMultilinha: 0 };
  const linhas = [];
  let tabela = null;
  const porPagina = new Map();
  for (const t of itens) porPagina.set(t.pagina, [...(porPagina.get(t.pagina) ?? []), t]);
  for (const [pagina, todos] of [...porPagina.entries()].sort((a, b) => a[0] - b[0])) {
    // (vi) marcador de tabela e cabeçalho: tudo na altura do cabeçalho ou acima sai.
    for (const t of todos) if (/^TABELA [AB]$/.test(t.s)) tabela = t.s.slice(-1);
    const cab = todos.find((t) => t.s === 'OCUPAÇÃO' && coluna(t.x) === 'ocupacao');
    const corpo = todos.filter((t) => !cab || t.y < cab.y - 1);
    if (cab && !todos.filter((t) => Math.abs(t.y - cab.y) <= 1).every((t) => CABECALHO.has(t.s))) throw new Error(`p.${pagina}: cabeçalho inesperado`);
    // (ii) âncoras
    const ys = [...new Set(corpo.filter((t) => coluna(t.x) === 'cnae').map((t) => Math.round(t.y * 10) / 10))].sort((a, b) => b - a);
    const ancoras = ys.map((y) => {
      const cnae = corpo.filter((t) => coluna(t.x) === 'cnae' && Math.abs(t.y - y) <= 0.5).sort((a, b) => a.x - b.x).map((t) => t.s).join('');
      if (!/^\d{4}-\d\/\d{2}$/.test(cnae)) throw new Error(`p.${pagina} y=${y}: CNAE fora do padrão '${cnae}'`);
      if (tabela === null) throw new Error(`p.${pagina}: linha antes do marcador de tabela`);
      return { pagina, y, tabela, cnae, ocupacao: [], descricao: [], iss: [], icms: [] };
    });
    for (const t of corpo) {
      const col = coluna(t.x);
      if (col === 'cnae') continue;
      const dono = ancoras.filter((a) => t.y <= a.y + 1).pop();
      if (!dono) {
        // (iv) continuação da última linha da página anterior
        const ant = linhas.at(-1);
        if (!ant || col === 'iss' || col === 'icms') throw new Error(`p.${pagina} y=${t.y}: trecho '${t.s}' sem linha`);
        ant[col].push({ ...t, pagina });
        anomalias.continuacaoDePagina += 1;
        continue;
      }
      dono[col].push(t);
    }
    linhas.push(...ancoras);
  }
  const ordena = (ts) => [...ts].sort((a, b) => a.pagina - b.pagina || b.y - a.y || a.x - b.x);
  const contadores = { A: 0, B: 0 };
  const rows = linhas.map((l) => {
    for (const col of ['iss', 'icms']) {
      // (v)
      if (l[col].length !== 1 || !['S', 'N'].includes(l[col][0].s) || Math.abs(l[col][0].y - l.y) > 1) {
        throw new Error(`p.${l.pagina} ${l.cnae}: ${col.toUpperCase()} inválido (${l[col].map((t) => t.s).join('|')})`);
      }
    }
    if (l.ocupacao.length === 0) throw new Error(`p.${l.pagina} ${l.cnae}: linha sem ocupação`); // (vii)
    if (new Set(l.ocupacao.map((t) => Math.round(t.y))).size > 1) anomalias.ocupacaoMultilinha += 1;
    if (new Set(l.descricao.map((t) => Math.round(t.y))).size > 1) anomalias.descricaoMultilinha += 1;
    contadores[l.tabela] += 1;
    return {
      chave: `${l.tabela}-${String(contadores[l.tabela]).padStart(4, '0')}`,
      tabela: l.tabela,
      pagina: l.pagina,
      ocupacao: junta(ordena(l.ocupacao).map((t) => t.s)),
      cnae: l.cnae,
      descricaoCnae: junta(ordena(l.descricao).map((t) => t.s)),
      iss: l.iss[0].s === 'S',
      icms: l.icms[0].s === 'S',
    };
  });
  return { rows, anomalias };
}

export async function gerar() {
  const pdf = await readFile(PDF_PATH);
  const sha = createHash('sha256').update(pdf).digest('hex');
  if (sha !== SHA256) throw new Error(`sha256 do PDF ${sha} ≠ ${SHA256} — versão nova do Anexo XI: reconfira a fonte antes de regenerar`);
  const { rows, anomalias } = transcrever(await trechos(pdf));
  const fixture = {
    origem: 'Res. CGSN 140/2018, Anexo XI (binário id 81177 — "Anexo XI.pdf"; redação dada pela Res. CGSN 182/2025, vigência 01/10/2025)',
    fonteUrl: 'https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/92278/anexo/81177',
    sha256: sha,
    geradoPor: 'scripts/anexo-xi-to-fixture.mjs',
    contagens: { A: rows.filter((r) => r.tabela === 'A').length, B: rows.filter((r) => r.tabela === 'B').length },
    anomalias,
    rows,
  };
  return `${JSON.stringify(fixture, null, 2)}\n`;
}

// BRIEF §3 item 11 — semente da tabela de plataforma MEI_ANEXO_XI, cópia do fixture (chave = ordinal da fonte,
// discriminador = tabela A|B, valorJson = { ocupacao, cnae, descricaoCnae, iss, icms }). vigenteDesde = 2025-10-01:
// redação do Anexo XI dada pela Res. CGSN 182/2025, "dataInicioVigencia" 01/10/2025 na compilação RFB (F-AX-5 a).
export const SQL_PATH = path.join(process.cwd(), 'server', 'prisma', 'data', 'legal_parameters_v5.sql');
const COLUNAS = '"id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt"';
const lit = (v) => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
export function sementeSql(fixtureTexto) {
  const f = JSON.parse(fixtureTexto);
  const quem = 'migracao:SIMPLES-PISO-ANEXO-XI';
  return `${f.rows
    .map((r) => {
      const valor = JSON.stringify({ ocupacao: r.ocupacao, cnae: r.cnae, descricaoCnae: r.descricaoCnae, iss: r.iss, icms: r.icms });
      const vals = [`lp5-mei-ax-${r.chave}`, 'MEI_ANEXO_XI', r.chave, r.tabela, null, null, valor, 'Res. CGSN 140/2018, Anexo XI (id 81177)', f.fonteUrl, f.sha256, '2025-10-01', null, 'PUBLISHED', null, 'Cópia do fixture anexo-xi-res-cgsn-140-2018.json (BRIEF item 11)', quem, quem];
      return `INSERT OR IGNORE INTO "legal_parameters" (${COLUNAS}) VALUES (${vals.map(lit).join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`;
    })
    .join('\n')}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const texto = await gerar();
  if (process.argv.includes('--stdout')) process.stdout.write(texto);
  else if (process.argv.includes('--sql')) {
    await writeFile(SQL_PATH, sementeSql(texto));
    console.log(`semente: ${SQL_PATH}`);
  } else {
    await writeFile(OUT_PATH, texto);
    const f = JSON.parse(texto);
    console.log(`fixture: ${f.rows.length} linhas (A=${f.contagens.A}, B=${f.contagens.B}) · anomalias ${JSON.stringify(f.anomalias)}`);
  }
}
