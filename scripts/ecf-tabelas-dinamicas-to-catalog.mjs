#!/usr/bin/env node
// BE-INCR-SPED-ECF-FASE3B item 10 — deriva o CATÁLOGO das linhas das Tabelas Dinâmicas da ECF (Leiaute 12)
// a partir do XLSX oficial da RFB, para o fixture que o serviço do e-Lalur valida `codigo` contra
// (item 9) e que o serializer usa para copiar DESCRICAO e derivar TIPO_LANCAMENTO (item 8).
//
// Molde: `server/scripts/rfb-referential-to-catalog.mjs` (INCR-9B) — o script NÃO contém nenhum código
// de linha: só recorta colunas do arquivo oficial. Dado fiscal nunca é digitado de memória.
//
// Abas lidas (BRIEF §2.4 + lacuna 7): M300A, M350A (Parte A: TIPO + TIPO LANÇ), N500, N630A, N670
// (Bloco N: TIPO), PARTEB_PADRAO (M010.COD_PB_RFB por tributo). TODAS as linhas entram (E/CNA/CA/R) —
// o serviço precisa distinguir "código inexistente" de "código que não é entrada" (item 9), e o teste
// do item 14 itera as CNA/CA para provar que NÃO são emitidas.
//
// Uso (raiz do repo):
//   node scripts/ecf-tabelas-dinamicas-to-catalog.mjs            # escreve o fixture
//   node scripts/ecf-tabelas-dinamicas-to-catalog.mjs --stdout   # imprime (o teste compara com o commitado)
// Lê docs/accounting/fontes-oficiais/RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx (gitignored — corpus local,
// MANIFEST.md carrega o sha256) e escreve server/src/features/accounting/fixtures/ecf-l12-linhas.json.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'server', 'package.json'));
const ExcelJS = require('exceljs');

export const XLSX_PATH = path.join(process.cwd(), 'docs', 'accounting', 'fontes-oficiais', 'RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx');
export const OUT_PATH = path.join(process.cwd(), 'server', 'src', 'features', 'accounting', 'fixtures', 'ecf-l12-linhas.json');

const ABAS_LINHAS = ['M300A', 'M350A', 'N500', 'N630A', 'N670'];

const cell = (x) => {
  if (x == null) return '';
  if (typeof x === 'object') return x.richText ? x.richText.map((t) => t.text).join('') : String(x.result ?? x.text ?? '');
  return String(x);
};
const norm = (s) => cell(s).replace(/\s+/g, ' ').trim();
// DDMMAAAA → AAAA-MM-DD; vazio → null. Formato exótico = erro duro (dado fiscal não se adivinha).
const isoDate = (s, where) => {
  const v = norm(s);
  if (v === '') return null;
  if (!/^\d{8}$/.test(v)) throw new Error(`${where}: data "${v}" fora do formato DDMMAAAA`);
  return `${v.slice(4)}-${v.slice(2, 4)}-${v.slice(0, 2)}`;
};

function readLinhas(wb, nome) {
  const ws = wb.getWorksheet(nome);
  if (!ws) throw new Error(`aba ${nome} não existe no XLSX`);
  const hdr = ws.getRow(1).values.slice(1).map(norm);
  const col = (n) => hdr.findIndex((h) => h.toUpperCase() === n) + 1;
  const cCod = col('CÓDIGO'), cDesc = col('DESCRIÇÃO'), cIni = col('DT_INI'), cFim = col('DT_FIM'), cTipo = col('TIPO');
  const cLanc = hdr.findIndex((h) => /^TIPO LAN/i.test(h)) + 1; // só nas abas M
  if (!cCod || !cDesc || !cTipo) throw new Error(`aba ${nome}: cabeçalho inesperado ${JSON.stringify(hdr)}`);
  const rows = [];
  ws.eachRow((row, i) => {
    if (i < 2) return;
    const codigo = norm(row.getCell(cCod).value);
    if (!codigo) return;
    const tipo = norm(row.getCell(cTipo).value);
    if (!['E', 'CNA', 'CA', 'R'].includes(tipo)) throw new Error(`aba ${nome} linha ${i}: TIPO "${tipo}" desconhecido (código ${codigo})`);
    const tipoLanc = cLanc ? norm(row.getCell(cLanc).value) || null : null;
    if (cLanc && tipo === 'E' && !['A', 'E', 'P', 'L'].includes(tipoLanc ?? '')) {
      throw new Error(`aba ${nome} linha ${i}: TIPO LANÇ "${tipoLanc}" fora de [A;E;P;L] (código ${codigo}, Manual p.245)`);
    }
    rows.push({
      codigo,
      descricao: norm(row.getCell(cDesc).value),
      tipo,
      tipoLanc,
      dtIni: isoDate(row.getCell(cIni).value, `${nome}/${codigo}/DT_INI`),
      dtFim: isoDate(row.getCell(cFim).value, `${nome}/${codigo}/DT_FIM`),
    });
  });
  return rows;
}

// PARTEB_PADRAO: 3 linhas de legenda + cabeçalho na linha 4 (Código, Descrição, DT_INI, DT_FIM, Tributo).
function readParteBPadrao(wb) {
  const ws = wb.getWorksheet('PARTEB_PADRAO');
  if (!ws) throw new Error('aba PARTEB_PADRAO não existe no XLSX');
  let hdrRow = 0;
  ws.eachRow((row, i) => {
    if (!hdrRow && norm(row.getCell(1).value).toUpperCase() === 'CÓDIGO') hdrRow = i;
  });
  if (!hdrRow) throw new Error('aba PARTEB_PADRAO: cabeçalho "Código" não encontrado');
  const hdr = ws.getRow(hdrRow).values.slice(1).map((h) => norm(h).toUpperCase());
  const col = (n) => hdr.indexOf(n) + 1;
  const cCod = col('CÓDIGO'), cDesc = col('DESCRIÇÃO'), cIni = col('DT_INI'), cFim = col('DT_FIM'), cTrib = col('TRIBUTO');
  if (!cCod || !cDesc || !cTrib) throw new Error(`aba PARTEB_PADRAO: cabeçalho inesperado ${JSON.stringify(hdr)}`);
  const rows = [];
  ws.eachRow((row, i) => {
    if (i <= hdrRow) return;
    const codigo = norm(row.getCell(cCod).value);
    if (!codigo) return;
    const tributo = norm(row.getCell(cTrib).value);
    if (!['I', 'C', 'A'].includes(tributo)) throw new Error(`PARTEB_PADRAO linha ${i}: Tributo "${tributo}" fora de [I;C;A] (código ${codigo})`);
    rows.push({
      codigo,
      descricao: norm(row.getCell(cDesc).value),
      tributo, // I = IRPJ · C = CSLL · A = ambos (legenda das linhas 1-3 da aba)
      dtIni: isoDate(row.getCell(cIni).value, `PARTEB_PADRAO/${codigo}/DT_INI`),
      dtFim: isoDate(row.getCell(cFim).value, `PARTEB_PADRAO/${codigo}/DT_FIM`),
    });
  });
  return rows;
}

export async function buildCatalog(xlsxPath = XLSX_PATH) {
  const bytes = await readFile(xlsxPath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes);
  const abas = {};
  for (const nome of ABAS_LINHAS) abas[nome] = readLinhas(wb, nome);
  abas.PARTEB_PADRAO = readParteBPadrao(wb);
  return {
    origem: path.basename(xlsxPath),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    leiaute: '0012',
    geradoPor: 'scripts/ecf-tabelas-dinamicas-to-catalog.mjs',
    abas,
  };
}

/** Texto canônico do fixture: JSON 2 espaços + LF final — é o que o teste compara byte-a-byte. */
export const toText = (catalog) => JSON.stringify(catalog, null, 2) + '\n';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) {
  const catalog = await buildCatalog();
  const text = toText(catalog);
  if (process.argv.includes('--stdout')) {
    process.stdout.write(text);
  } else {
    await writeFile(OUT_PATH, text, 'utf8');
    const resumo = Object.entries(catalog.abas)
      .map(([k, v]) => `${k}=${v.length}`)
      .join(' · ');
    console.error(`escrito ${path.relative(process.cwd(), OUT_PATH)} — ${resumo}`);
  }
}
