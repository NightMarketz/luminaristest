#!/usr/bin/env node
// BE-INCR-FIXED-ASSETS PR-1 (nó C8, BRIEF item 3) — deriva o fixture de taxas de depreciação do
// Anexo III (IN RFB 1.700/2017) a partir do HTML oficial do corpus local.
//
// Molde: scripts/ecf-tabelas-dinamicas-to-catalog.mjs — o script NÃO contém nenhuma taxa de
// memória: só recorta as 4 colunas (Referência NCM, Bens, Prazo, Taxa) de cada <TR> do HTML
// oficial. As 2 notas de rodapé (NCM 8417 33,3%; "indústria química" 20%) vêm do TEXTO da lei
// (docs/accounting/fontes-oficiais/IN-RFB-1700-2017.txt, seção "ANEXO III") — não são <TR> do
// HTML (a tabela termina antes das notas), citadas aqui literalmente.
//
// Regras do parser (BRIEF item 3, cada uma com teste em __tests__/anexo-iii-to-fixture.test.mjs):
//  (i)   <TR> com <STRIKE> → descartada inteira (retificação do DOU de 13/04/2017; ex.: 8517 0%
//        struck, substituída por uma <TR> nova não-struck logo depois, 8517 20% — essa fica viva)
//  (ii)  linha sem taxa (célula D vazia/&nbsp;) → descartada (cabeçalhos NCM4/NCM5/capítulo puros)
//  (iii) "Capítulo NN" COM taxa → semeada com ncm=null (só a descrição do capítulo importa)
//  (iv)  "--------------" → semeada com ncm=null (INSTALAÇÕES 10%, EDIFICAÇÕES 4%)
//  (v)   NCM de 4/5/6 dígitos (com ou sem ponto) preservado como texto, sem transformação
//  (vi)  sourceRow = ordinal do <TR> na fonte, 1-based, contando o cabeçalho como linha 1
//  (vii) taxa: '20 %' → 2000 bp · '33,3%' → 3330 bp; célula só "%" sem número, com prazo
//        presente (único caso no corpus: NCM 8905, prazo 20) → 10000 ÷ prazo, arredondado
//        (500 bp) + justification citando a origem da derivação
//
// Uso (raiz do repo):
//   node scripts/anexo-iii-to-fixture.mjs            # escreve o fixture
//   node scripts/anexo-iii-to-fixture.mjs --stdout   # imprime (o teste compara com o commitado)
// Lê docs/accounting/fontes-oficiais/IN-RFB-1700-2017-anexos/43557-tabela.html (gitignored — corpus
// local, MANIFEST.md carrega o sha256 d526ac53071a) e escreve
// server/src/features/accounting/fixtures/anexo-iii-in-1700-2017.json.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const HTML_PATH = path.join(
  process.cwd(),
  'docs',
  'accounting',
  'fontes-oficiais',
  'IN-RFB-1700-2017-anexos',
  '43557-tabela.html',
);
export const OUT_PATH = path.join(
  process.cwd(),
  'server',
  'src',
  'features',
  'accounting',
  'fixtures',
  'anexo-iii-in-1700-2017.json',
);

// Entidades HTML nomeadas presentes no corpus (export LibreOffice; o arquivo em si é ASCII puro —
// todo acento sai como entidade nomeada, nunca byte alto). Mapa FECHADO: entidade fora daqui é
// erro duro — dado fiscal não se adivinha, o mapa cresce por evidência, não por completude a priori.
const ENTITIES = {
  nbsp: ' ',
  quot: '"',
  Aacute: 'Á', Acirc: 'Â', Agrave: 'À', Atilde: 'Ã',
  Ccedil: 'Ç',
  Eacute: 'É', Ecirc: 'Ê',
  Iacute: 'Í',
  Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ',
  Uacute: 'Ú',
  aacute: 'á', acirc: 'â', atilde: 'ã',
  ccedil: 'ç',
  eacute: 'é', ecirc: 'ê',
  iacute: 'í',
  oacute: 'ó', ocirc: 'ô', otilde: 'õ',
  uacute: 'ú',
};

function decodeEntities(text) {
  return text.replace(/&([A-Za-z]+);/g, (m, name) => {
    if (!(name in ENTITIES)) {
      throw new Error(`entidade HTML desconhecida: &${name}; — mapa fechado em ENTITIES, confira o corpus antes de adicionar`);
    }
    return ENTITIES[name];
  });
}

/** Texto de uma célula <TD>: remove tags, decodifica entidades, junta quebras de linha em espaço. */
function cellText(tdHtml) {
  const withoutTags = tdHtml.replace(/<[^>]+>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

function extractCells(trHtml) {
  const tds = [...trHtml.matchAll(/<TD\b[^>]*>([\s\S]*?)<\/TD>/gi)].map((m) => m[1]);
  if (tds.length !== 4) {
    throw new Error(`<TR> com ${tds.length} <TD> (esperado 4, colunas Referência NCM/Bens/Prazo/Taxa): ${trHtml.slice(0, 160)}`);
  }
  return tds.map(cellText);
}

/** '20 %' → 2000 · '33,3%' → 3330. Lança se não casar (dado fiscal não se adivinha). */
function parseRateBp(raw) {
  const m = /^(\d+(?:,\d+)?)\s*%$/.exec(raw);
  if (!m) throw new Error(`taxa fora do formato esperado "N[,N] %": "${raw}"`);
  return Math.round(parseFloat(m[1].replace(',', '.')) * 100);
}

// sha256 do HTML conferido nesta sessão (`sha256sum`) contra `docs/accounting/fontes-oficiais/
// MANIFEST.md:80` (prefixo 12 `d526ac53071a`). O parser ABORTA se o corpus local divergir — um
// retoque de 1 byte na RFB não pode virar uma tabela de taxas semeada silenciosamente errada
// (execution-plan Passo 1, adversarial do PR-1: "HTML retocado → script aborta pelo sha").
export const EXPECTED_SHA256 = 'd526ac53071a0532cca69ebb366a3ea3371accbf1e6699267fa1de6fcfc01d8d';

export async function buildFixture(htmlPath = HTML_PATH) {
  const bytes = await readFile(htmlPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== EXPECTED_SHA256) {
    throw new Error(
      `sha256 do corpus divergiu do MANIFEST.md:80 (esperado ${EXPECTED_SHA256}, lido ${sha256}) — ` +
        `a RFB pode ter republicado o Anexo III; confira antes de re-semear (as taxas mudam consequência legal).`,
    );
  }
  const html = bytes.toString('utf8');
  const trBlocks = [...html.matchAll(/<TR\b[^>]*>([\s\S]*?)<\/TR>/gi)].map((m) => m[0]);
  if (trBlocks.length < 200) throw new Error(`só ${trBlocks.length} <TR> encontradas no corpus — HTML mudou de forma?`);

  const rows = [];
  trBlocks.forEach((trHtml, i) => {
    const sourceRow = i + 1; // (vi) 1-based; o cabeçalho conta como linha 1
    if (sourceRow === 1) return; // cabeçalho (Referência NCM / Bens / Prazo / Taxa) — não é dado
    if (/<STRIKE\b/i.test(trHtml)) return; // (i) retificação do DOU — <TR> inteira descartada

    const [ncmRaw, description, lifeRaw, rateRaw] = extractCells(trHtml);
    if (rateRaw === '') return; // (ii) linha sem taxa — cabeçalho de seção (NCM4/NCM5/capítulo)

    let ncm = ncmRaw;
    if (/^Cap[ií]tulo\s+\d+$/i.test(ncmRaw)) ncm = null; // (iii)
    else if (/^-+$/.test(ncmRaw)) ncm = null; // (iv)
    // (v) NCM de 4/5/6 dígitos (com ou sem ponto) preservado como texto — sem transformação.

    if (!/^\d+$/.test(lifeRaw)) {
      throw new Error(`linha ${sourceRow} (NCM "${ncmRaw}"): prazo "${lifeRaw}" não é um inteiro`);
    }
    const lifeYears = parseInt(lifeRaw, 10);

    const row = {
      ncm,
      sourceRow,
      description,
      lifeYears,
      source: 'ANEXO_III_IN_1700_2017',
    };
    if (rateRaw === '%') {
      // (vii), 2ª cláusula — célula "%" sem número, com prazo presente (único caso: NCM 8905).
      row.annualRateBp = Math.round(10000 / lifeYears);
      row.justification = 'Taxa derivada do prazo de vida útil (célula de taxa vazia na fonte, Anexo III da IN RFB 1.700/2017).';
    } else {
      row.annualRateBp = parseRateBp(rateRaw);
    }
    rows.push(row);
  });

  // 2 Notas de rodapé do Anexo III (texto da lei, seção "ANEXO III" — fora da tabela HTML,
  // citadas literalmente): (1) fornos para indústria de vidro, NCM 8417; (2) máquinas/equipamentos/
  // instalações industriais de uso na indústria química, sem NCM único (aplica à classe de uso).
  rows.push({
    ncm: '8417',
    sourceRow: null,
    description: 'Fornos para a indústria de vidro (Anexo III, Nota 1)',
    lifeYears: 3,
    annualRateBp: 3330,
    source: 'ANEXO_III_NOTA_1',
  });
  rows.push({
    ncm: null,
    sourceRow: null,
    description: 'Máquinas, equipamentos e instalações industriais utilizados na indústria química (Anexo III, Nota 2)',
    lifeYears: 5,
    annualRateBp: 2000,
    source: 'ANEXO_III_NOTA_2',
  });

  return {
    origem: path.basename(htmlPath),
    sha256,
    geradoPor: 'scripts/anexo-iii-to-fixture.mjs',
    rows,
  };
}

/** Texto canônico do fixture: JSON 2 espaços + LF final — é o que o teste compara byte-a-byte. */
export const toText = (fixture) => JSON.stringify(fixture, null, 2) + '\n';

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) {
  const fixture = await buildFixture();
  const text = toText(fixture);
  if (process.argv.includes('--stdout')) {
    process.stdout.write(text);
  } else {
    await writeFile(OUT_PATH, text, 'utf8');
    const anexo = fixture.rows.filter((r) => r.source === 'ANEXO_III_IN_1700_2017').length;
    const notas = fixture.rows.length - anexo;
    console.error(`escrito ${path.relative(process.cwd(), OUT_PATH)} — ${anexo} linhas do Anexo + ${notas} Notas`);
  }
}
