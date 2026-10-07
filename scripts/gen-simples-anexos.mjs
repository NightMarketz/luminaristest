#!/usr/bin/env node
// BE-INCR-SIMPLES-NACIONAL PR-1 (nó X14, BRIEF itens 2–3) — tabelas dos Anexos I–V do Simples Nacional, da fonte.
//
// Duas etapas, ambas sem nenhum número de memória:
//   1. HTML → TXT (`--transcrever`, precisa do corpus local, gitignored): recorta o texto VIGENTE dos Anexos I–V da
//      LC 123/2006 compilada e dos Anexos XVIII–XXII da LC 214/2025 (redação dos Anexos I–V a partir de 2027 — LC 214
//      art. 519; efeitos em 1º/1/2027 pelo art. 544 III). Texto tachado (`text-decoration:line-through`, <strike>) é
//      redação revogada e fica fora. O TXT é commitado (LEIA-ME do corpus: HTML não vai pro git, texto extraído vai).
//   2. TXT → SQL (padrão): lê o TXT commitado e gera `server/prisma/data/legal_parameters_simples_v1.sql`, o texto que
//      a migração carrega. O teste `simplesAnexosSeed.test.ts` roda `--stdout` e compara com o arquivo (diff vazio).
//
// Regras nominais do parser (cada uma com teste):
//  (i)   linha de faixa: "Nª Faixa [Até|De X a] Y A% PD" — "-" ou vazio no PD = 0.
//  (ii)  linha de repartição: "Nª Faixa p1% p2% …" sob o cabeçalho de tributos da tabela; a 6ª faixa traz menos
//        valores que colunas (ICMS/ISS/IBS fora do DAS, LC 123 art. 13-A) e os valores ocupam as colunas da esquerda.
//  (iii) "(*)" depois de um percentual é a nota do teto do ISS, não um valor.
//  (iv)  nota do teto: "percentual efetivo máximo devido ao ISS será de T%" + "(Alíquota efetiva - T%) x p%" por
//        tributo, na ordem das colunas sem o ISS. O limiar vem da FRASE ("superior a 14,92537%"), nunca do rótulo da
//        linha ("superior a 14,93%") — anomalia do Anexo XX, BRIEF item 3.
//  (v)   vigência: "(Vigência: 01/01/2018)" | "(Vigência: 1º/1/AAAA a 31/12/AAAA)" | "(Vigência: 1º/1/AAAA até …)" |
//        "(Vigência: 1º/1/AAAA)". A tabela de faixas vale até a próxima tabela de faixas do mesmo anexo; a de repartição
//        até a próxima de repartição.
//
// Uso (raiz do repo):
//   node scripts/gen-simples-anexos.mjs --transcrever   # HTML do corpus → TXT commitado (aborta se o sha divergir)
//   node scripts/gen-simples-anexos.mjs                 # TXT → prisma/data/legal_parameters_simples_v1.sql
//   node scripts/gen-simples-anexos.mjs --stdout        # imprime o SQL (o teste compara com o commitado)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'docs', 'accounting', 'fontes-oficiais');
export const TXT_PATH = path.join(CORPUS, 'TRANSCRICAO-SIMPLES-ANEXOS-LC123-LC214-2026-10-07.txt');
export const SQL_PATH = path.join(ROOT, 'server', 'prisma', 'data', 'legal_parameters_simples_v1.sql');

/** Fontes: arquivo do corpus, sha256 do download de 2026-10-07 (MANIFEST), URL, recortes [início, fim). */
export const FONTES = [
  {
    id: 'LC123',
    arquivo: 'LC-123-2006-Simples.html',
    sha256: '07ee7d3adc227cc2a4781a57cda10c26ec6d5599ab6d1879605bb1ad3c766515',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm',
    recortes: [
      ['I', 'ANEXO I DA LEI COMPLEMENTAR', 'ANEXO II DA LEI COMPLEMENTAR'],
      ['II', 'ANEXO II DA LEI COMPLEMENTAR', 'ANEXO III DA LEI COMPLEMENTAR'],
      ['III', 'ANEXO III DA LEI COMPLEMENTAR', 'ANEXO IV DA LEI COMPLEMENTAR'],
      ['IV', 'ANEXO IV DA LEI COMPLEMENTAR', 'ANEXO V DA LEI COMPLEMENTAR'],
      ['V', 'ANEXO V DA LEI COMPLEMENTAR', 'Anexo VII'],
    ],
  },
  {
    id: 'LC214',
    arquivo: 'LC-214-2025.html',
    sha256: '6b869c5b421c958bf598ca20b2a88e11147f221495a91aa4bae435cb106464b4',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
    recortes: [
      ['I', 'ANEXO XVIII ', 'ANEXO XIX '],
      ['II', 'ANEXO XIX ', 'ANEXO XX '],
      ['III', 'ANEXO XX ', 'ANEXO XXI '],
      ['IV', 'ANEXO XXI ', 'ANEXO XXII '],
      ['V', 'ANEXO XXII ', 'ANEXO XXIII '],
    ],
  },
];

const ENTIDADES = { '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&#8804;': '≤', '&#8805;': '≥', '&quot;': '"' };

/** Texto visível sem o tachado: pilha só de span/strike/s/del (os únicos que o Planalto usa para revogar). */
export function textoVigente(html) {
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  const pilha = [];
  let out = '';
  let m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) {
      if (!pilha.includes(true)) out += m[4];
      continue;
    }
    const tag = m[2].toLowerCase();
    if (!['span', 'strike', 's', 'del'].includes(tag)) {
      out += ' ';
      continue;
    }
    if (m[1] === '/') pilha.pop();
    else if (!m[3].trimEnd().endsWith('/')) pilha.push(tag !== 'span' || /line-through/i.test(m[3]));
  }
  return out.replace(/&[#a-z0-9]+;/gi, (e) => ENTIDADES[e] ?? ' ').replace(/\s+/g, ' ');
}

/** O Planalto serve windows-1252: 0x80–0x9F são aspas e travessões, não controles do latin1. */
const CP1252 = { 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x96: '–', 0x97: '—' };
function decodificar(buf) {
  let s = '';
  for (const b of buf) s += CP1252[b] ?? String.fromCharCode(b);
  return s;
}

export function transcrever(dir = CORPUS) {
  const blocos = [];
  for (const f of FONTES) {
    const buf = readFileSync(path.join(dir, f.arquivo));
    const sha = createHash('sha256').update(buf).digest('hex');
    if (sha !== f.sha256) throw new Error(`sha256 do corpus divergiu do MANIFEST: ${f.arquivo} ${sha}`);
    const texto = textoVigente(decodificar(buf));
    for (const [anexo, ini, fim] of f.recortes) {
      const i = texto.indexOf(ini);
      const j = texto.indexOf(fim, i + ini.length);
      if (i < 0 || j < 0) throw new Error(`recorte não encontrado: ${f.id} Anexo ${anexo}`);
      blocos.push(`### ${f.id} ANEXO ${anexo} sha256=${f.sha256} url=${f.url}\n${texto.slice(i, j).trim()}\n`);
    }
  }
  return blocos.join('\n');
}

// ---- TXT → linhas ------------------------------------------------------------------------------------------------

const TRIBUTO = { IRPJ: 'IRPJ', CSLL: 'CSLL', COFINS: 'COFINS', 'PIS/PASEP': 'PIS', CPP: 'CPP', ICMS: 'ICMS', ISS: 'ISS', IPI: 'IPI', CBS: 'CBS', IBS: 'IBS' };

/** '13,50' → 1350 (centésimos de ponto percentual = bp); '4,8' → 480; '30' → 3000. */
export function bp(s) {
  const [int, dec = ''] = s.split(',');
  if (dec.length > 2) throw new Error(`percentual com mais de 2 casas: ${s}`);
  return Number(int) * 100 + Number(dec.padEnd(2, '0'));
}
/** '1.800.000,00' → 180000000 centavos; '-' ou vazio → 0. */
export function cents(s) {
  if (!s || s === '-' || s === '–') return 0;
  const [int, dec] = s.replace(/\./g, '').split(',');
  if (dec === undefined || dec.length !== 2) throw new Error(`valor fora do formato R$: ${s}`);
  return Number(int) * 100 + Number(dec);
}

const MESES_FIM = (ano) => `${ano}-12-31`;
/** Regra (v): datas da frase de vigência. */
export function vigencia(frase) {
  let m = /^01\/01\/(\d{4})$/.exec(frase);
  if (m) return { desde: `${m[1]}-01-01`, ate: null };
  m = /^1º\/1\/(\d{4})(?: (?:a|até) 31\/12\/(\d{4}))?$/.exec(frase);
  if (m) return { desde: `${m[1]}-01-01`, ate: m[2] ? MESES_FIM(m[2]) : null };
  throw new Error(`vigência fora do formato: ${frase}`);
}

const FAIXA = '([1-6]) ?(?:a|ª) Faixa';
const RE_VIG = /\(Vigência: ([^)]+)\)/y;
const RE_TAB_FAIXA = /Receita Bruta em 12 Meses \(em R\$\) Alíquota Valor a Deduzir \(em R\$\)/y;
const RE_TAB_REP = /Faixas Percentual de Repartição dos Tributos ((?:[A-Za-z/]+(?: \(\*\))? )+)/y;
const RE_NOTA = /(?:\(\*\) )?O percentual efetivo máximo devido ao ISS será de ([\d,]+)%[^.]*\. Sendo assim, na 5 ?(?:a|ª) faixa, quando a alíquota efetiva for superior a ([\d,]+)%/y;

/**
 * Lê um bloco "### <fonte> ANEXO <n> …" e devolve as tabelas na ordem da fonte, cada uma com a vigência corrente.
 * Uma tabela de faixas aberta pela LC 214 fecha a vigência anterior só pela data (o lookup escolhe por data).
 */
export function parseBloco(cab, corpo) {
  const [, fonteId, anexo] = /^### (LC\d+) ANEXO ([IV]+) /.exec(cab);
  const out = [];
  let vig = null;
  let ordem = 0;
  for (let i = 0; i < corpo.length; ) {
    let m;
    RE_VIG.lastIndex = i;
    if ((m = RE_VIG.exec(corpo))) {
      vig = vigencia(m[1].trim());
      i = RE_VIG.lastIndex;
      continue;
    }
    RE_TAB_FAIXA.lastIndex = i;
    if ((m = RE_TAB_FAIXA.exec(corpo))) {
      // Regra (i): 6 linhas "Nª Faixa [Até|De X a] Y A% [PD|-|vazio]".
      const re = new RegExp(`\\s*${FAIXA} (?:Até|De [\\d.,]+ a) ([\\d.]+,\\d{2}) ([\\d,]+)%\\s*([\\d.]+,\\d{2}|-|–)?`, 'y');
      re.lastIndex = RE_TAB_FAIXA.lastIndex;
      for (let f = 1; f <= 6; f++) {
        const r = re.exec(corpo);
        if (!r || Number(r[1]) !== f) throw new Error(`${fonteId} Anexo ${anexo}: faixa ${f} fora do formato perto de "${corpo.slice(re.lastIndex, re.lastIndex + 80)}"`);
        out.push({ tipo: 'FAIXA', fonteId, anexo, faixa: f, vig, ordem: ++ordem, receitaAteCents: cents(r[2]), aliquotaNominalBp: bp(r[3]), parcelaDeduzirCents: cents(r[4]) });
      }
      i = re.lastIndex;
      continue;
    }
    RE_TAB_REP.lastIndex = i;
    if ((m = RE_TAB_REP.exec(corpo))) {
      const colunas = m[1].replace(/\(\*\)/g, '').trim().split(/\s+/).map((c) => {
        const t = TRIBUTO[c.toUpperCase()];
        if (!t) throw new Error(`${fonteId} Anexo ${anexo}: tributo desconhecido ${c}`);
        return t;
      });
      // Regras (ii)/(iii): valores até a próxima "Nª Faixa"; "-" = fora do DAS; "(*)" é marca da nota.
      const re = new RegExp(`${FAIXA}((?: (?:[\\d,]+%|-|–|\\(\\*\\)))+)`, 'y');
      let j = RE_TAB_REP.lastIndex;
      for (let f = 1; f <= 6; f++) {
        re.lastIndex = j;
        const r = re.exec(corpo);
        if (!r || Number(r[1]) !== f) throw new Error(`${fonteId} Anexo ${anexo}: repartição faixa ${f} fora do formato perto de "${corpo.slice(j, j + 80)}"`);
        const valores = r[2].trim().split(' ').filter((v) => v !== '(*)');
        if (valores.length > colunas.length) throw new Error(`${fonteId} Anexo ${anexo}: faixa ${f} com valores demais`);
        const reparticao = {};
        valores.forEach((v, k) => {
          if (v !== '-' && v !== '–') reparticao[colunas[k]] = bp(v.slice(0, -1));
        });
        out.push({ tipo: 'REPARTICAO', fonteId, anexo, faixa: f, vig, ordem: ++ordem, reparticao });
        j = re.lastIndex + 1;
      }
      i = j - 1;
      continue;
    }
    RE_NOTA.lastIndex = i;
    if ((m = RE_NOTA.exec(corpo))) {
      // Regra (iv): transferência na ordem das colunas da última tabela de repartição, sem o ISS.
      const ultima = [...out].reverse().find((t) => t.tipo === 'REPARTICAO' && t.faixa === 5);
      const destino = Object.keys(ultima.reparticao).filter((t) => t !== 'ISS');
      const fim = corpo.indexOf('Percentual de ISS fixo', RE_NOTA.lastIndex);
      const depois = /^Percentual de ISS fixo em [\d,]+%((?: ?\(?Alíquota efetiva\s*[-–]?\s*[\d,]+%\) x [\d,]+%)*)/.exec(corpo.slice(fim));
      const trecho = corpo.slice(RE_NOTA.lastIndex, fim) + depois[1];
      const pcts = [...trecho.matchAll(/Alíquota efetiva\s*[-–]?\s*[\d,]+%\) x ([\d,]+)%/g)].map((x) => bp(x[1]));
      if (pcts.length !== destino.length) throw new Error(`${fonteId} Anexo ${anexo}: nota do teto com ${pcts.length} transferências para ${destino.length} tributos`);
      const frase = corpo.slice(i, RE_NOTA.lastIndex);
      out.push({
        tipo: 'TETO_ISS', fonteId, anexo, vig, ordem: ++ordem,
        percentualBp: bp(m[1]),
        limiarAliquotaEfetiva: m[2].replace(',', '.'),
        transfereAIbs: /tributos federais e IBS/.test(frase),
        transferencia: Object.fromEntries(destino.map((t, k) => [t, pcts[k]])),
      });
      i = fim + depois[0].length;
      continue;
    }
    i++;
  }
  return out;
}

export function parseTranscricao(txt) {
  const blocos = txt.replace(/\r\n/g, '\n').split(/\n(?=### )/).map((b) => b.trim()).filter(Boolean);
  return blocos.flatMap((b) => {
    const nl = b.indexOf('\n');
    return parseBloco(b.slice(0, nl), b.slice(nl + 1));
  });
}

// ---- linhas → LegalParameter ---------------------------------------------------------------------------------------

const FIM_LC123 = '2026-12-31'; // LC 214 art. 519 + art. 544 III: os Anexos XVIII–XXII valem a partir de 1º/1/2027.
const FONTE_TXT = {
  LC123: (a) => `LC 123/2006 Anexo ${a} (red. LC 155/2016)`,
  LC214: (a) => `LC 214/2025 art. 519, Anexo ${{ I: 'XVIII', II: 'XIX', III: 'XX', IV: 'XXI', V: 'XXII' }[a]} (Anexo ${a} da LC 123; red. LC 227/2026)`,
};

/** Fecha a vigência aberta: tabela de faixas vale até a próxima de faixas do mesmo anexo; idem repartição e teto. */
function fecharVigencias(tabelas) {
  const ate = new Map();
  for (const t of tabelas) {
    const desde = t.vig.desde;
    let fim = t.vig.ate;
    if (fim === null && t.fonteId === 'LC123') fim = FIM_LC123;
    if (fim === null) {
      const proxima = tabelas.find((u) => u.anexo === t.anexo && u.tipo === t.tipo && u.vig.desde > desde && (t.tipo !== 'TETO_ISS' || true));
      if (proxima) fim = new Date(Date.parse(`${proxima.vig.desde}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    }
    ate.set(t, fim);
  }
  return ate;
}

const FONTE_URL = Object.fromEntries(FONTES.map((f) => [f.id, f]));

export function linhasAnexos(tabelas) {
  const ate = fecharVigencias(tabelas);
  return tabelas.map((t) => {
    const f = FONTE_URL[t.fonteId];
    const base = {
      chave: t.anexo,
      fonte: FONTE_TXT[t.fonteId](t.anexo),
      fonteUrl: f.url,
      fonteSha256: f.sha256,
      vigenteDesde: t.vig.desde,
      vigenteAte: ate.get(t),
    };
    const sufixo = `${t.anexo.toLowerCase()}-${t.vig.desde}`;
    if (t.tipo === 'FAIXA') {
      return { ...base, id: `sn1-faixa-${sufixo}-f${t.faixa}`, tabela: 'SIMPLES_ANEXO_FAIXA', discriminador: `F${t.faixa}`,
        valorJson: { receitaAteCents: t.receitaAteCents, aliquotaNominalBp: t.aliquotaNominalBp, parcelaDeduzirCents: t.parcelaDeduzirCents } };
    }
    if (t.tipo === 'REPARTICAO') {
      return { ...base, id: `sn1-rep-${sufixo}-f${t.faixa}`, tabela: 'SIMPLES_ANEXO_REPARTICAO', discriminador: `F${t.faixa}`, valorJson: t.reparticao };
    }
    return { ...base, id: `sn1-teto-${sufixo}`, tabela: 'SIMPLES_TETO_ISS', discriminador: null,
      valorJson: { percentualBp: t.percentualBp, limiarAliquotaEfetiva: t.limiarAliquotaEfetiva, transfereAIbs: t.transfereAIbs, transferencia: t.transferencia } };
  });
}

const RES140 = 'Res. CGSN 140/2018';
/**
 * Linhas que não são tabela de anexo: cada uma cita o dispositivo (BRIEF itens 4 e §3). O texto citado está no corpus
 * (`Res-CGSN-140-2018.txt`, `LC-123-2006-Simples.html`).
 */
export const LINHAS_DISPOSITIVO = [
  // Item 4 — enquadramento (F-SN-3 → a): só o que tem fonte.
  ...['060101', '060201', '060301'].map((c) => ({
    id: `sn1-enq-servico-${c}`, tabela: 'SIMPLES_ENQUADRAMENTO', chave: `SERVICO:${c}`, discriminador: null,
    valorJson: { anexo: 'III', fatorR: false, semIss: false },
    fonte: `${RES140} art. 25 § 1º III "m" (LC 123 art. 18 § 5º-B; LC 116 item ${c.slice(0, 2)}.${c.slice(2, 4)})`, vigenteDesde: '2018-01-01', vigenteAte: null,
  })),
  { id: 'sn1-enq-revenda', tabela: 'SIMPLES_ENQUADRAMENTO', chave: 'REVENDA', discriminador: null,
    valorJson: { anexo: 'I', fatorR: false, semIss: false },
    fonte: `${RES140} art. 25 § 1º I (LC 123 art. 18 § 4º I)`, vigenteDesde: '2018-01-01', vigenteAte: null },
  { id: 'sn1-enq-locacao-movel', tabela: 'SIMPLES_ENQUADRAMENTO', chave: 'LOCACAO_MOVEL', discriminador: null,
    valorJson: { anexo: 'III', fatorR: false, semIss: true },
    fonte: `${RES140} art. 25 § 1º VI (LC 123 art. 18 § 4º V: "deduzida a parcela correspondente ao ISS")`, vigenteDesde: '2018-01-01', vigenteAte: null },
  // Item 23 (valores; o alerta é do PR-3) — limites em centavos.
  { id: 'sn1-lim-me', tabela: 'SIMPLES_LIMITE', chave: 'ME', discriminador: null, valorInt: 36000000,
    fonte: 'LC 123/2006 art. 3º I; Res. CGSN 140/2018 art. 2º I "a"', vigenteDesde: '2018-01-01', vigenteAte: null },
  { id: 'sn1-lim-epp', tabela: 'SIMPLES_LIMITE', chave: 'EPP', discriminador: null, valorInt: 480000000,
    fonte: 'LC 123/2006 art. 3º II; Res. CGSN 140/2018 art. 2º I "b"', vigenteDesde: '2018-01-01', vigenteAte: null },
  { id: 'sn1-lim-sublimite', tabela: 'SIMPLES_LIMITE', chave: 'SUBLIMITE', discriminador: null, valorInt: 360000000,
    fonte: 'LC 123/2006 art. 13-A (ICMS e ISS; a partir de 1º/1/2027 também o IBS — red. LC 214 art. 517)', vigenteDesde: '2018-01-01', vigenteAte: null },
  { id: 'sn1-lim-mei', tabela: 'SIMPLES_LIMITE', chave: 'MEI', discriminador: null, valorInt: 8100000,
    fonte: 'Res. CGSN 140/2018 art. 100 caput (LC 123 art. 18-A § 1º)', vigenteDesde: '2018-01-01', vigenteAte: null },
  // SIMEI (consumido no PR-4): Res. 140 art. 101 I "b", II, III.
  { id: 'sn1-simei-cpp-pct', tabela: 'SIMEI_VALOR', chave: 'CPP_PCT', discriminador: null, valorInt: 500,
    fonte: 'Res. CGSN 140/2018 art. 101 I "b" (5% do limite mínimo mensal do salário de contribuição, desde a competência 05/2011)', vigenteDesde: '2011-05-01', vigenteAte: null },
  { id: 'sn1-simei-icms', tabela: 'SIMEI_VALOR', chave: 'ICMS', discriminador: null, valorInt: 100,
    fonte: 'Res. CGSN 140/2018 art. 101 II', vigenteDesde: '2018-01-01', vigenteAte: null },
  { id: 'sn1-simei-iss', tabela: 'SIMEI_VALOR', chave: 'ISS', discriminador: null, valorInt: 500,
    fonte: 'Res. CGSN 140/2018 art. 101 III', vigenteDesde: '2018-01-01', vigenteAte: null },
];

const COLS = ['id', 'tabela', 'chave', 'discriminador', 'valorInt', 'valorTexto', 'valorJson', 'fonte', 'fonteUrl', 'fonteSha256',
  'vigenteDesde', 'vigenteAte', 'status', 'supersedesId', 'motivo', 'proposedById', 'publishedById', 'publishedAt', 'createdAt'];
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const MOTIVO = 'Carga inicial gerada da fonte por scripts/gen-simples-anexos.mjs (BE-INCR-SIMPLES-NACIONAL PR-1, BRIEF item 2)';
const AUTOR = 'migracao:BE-INCR-SIMPLES-NACIONAL';

export function toSql(linhas) {
  const head = `INSERT OR IGNORE INTO "legal_parameters" (${COLS.map((c) => `"${c}"`).join(',')}) VALUES `;
  const corpo = linhas.map((l) => {
    const v = [l.id, l.tabela, l.chave, l.discriminador ?? null, l.valorInt ?? null, null,
      l.valorJson === undefined ? null : JSON.stringify(l.valorJson), l.fonte, l.fonteUrl ?? null, l.fonteSha256 ?? null,
      l.vigenteDesde, l.vigenteAte ?? null, 'PUBLISHED', null, MOTIVO, AUTOR, AUTOR];
    return `${head}(${v.map(q).join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`;
  });
  return `-- GERADO por scripts/gen-simples-anexos.mjs a partir de ${path.basename(TXT_PATH)} — não edite à mão.\n${corpo.join('\n')}\n`;
}

export function gerarSql(txt = readFileSync(TXT_PATH, 'utf8')) {
  return toSql([...linhasAnexos(parseTranscricao(txt)), ...LINHAS_DISPOSITIVO]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.includes('--transcrever')) {
    writeFileSync(TXT_PATH, transcrever());
    console.log(`escrito ${path.relative(ROOT, TXT_PATH)}`);
  } else if (args.includes('--stdout')) {
    process.stdout.write(gerarSql());
  } else {
    writeFileSync(SQL_PATH, gerarSql());
    console.log(`escrito ${path.relative(ROOT, SQL_PATH)}`);
  }
}
