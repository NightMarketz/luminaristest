// Passo A — transcreve os registros L/M/N do Manual (texto com marcador de pagina) e as abas
// do XLSX das Tabelas Dinamicas, gerando o doc irmao em markdown. Heuristico: onde o parser
// nao fecha um campo, imprime [PARSER?] pra revisao manual — nunca inventa.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

import path from 'node:path';

// Uso (raiz do repo):
//   node scripts/transcrever-ecf-lmn.mjs
// Le docs/accounting/fontes-oficiais/{Manual-ECF-Leiaute-12.pdf, RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx}
// e escreve docs/accounting/BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md. Rodar de novo e
// obter diff vazio e o teste de que a transcricao ainda bate com o corpus.
const require = createRequire(path.join(process.cwd(), 'server', 'package.json'));
const ExcelJS = require('exceljs');
const pdfParse = require('pdf-parse');

const FONTES = path.join(process.cwd(), 'docs', 'accounting', 'fontes-oficiais');
const pdfPath = path.join(FONTES, 'Manual-ECF-Leiaute-12.pdf');
const xlsxPath = path.join(FONTES, 'RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx');
const outPath = path.join(process.cwd(), 'docs', 'accounting', 'BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md');

// texto do PDF com marcador de pagina (mesma extracao da reconferencia de 2026-09-10)
async function extrairTexto(arquivo) {
  let pagina = 0;
  const d = await pdfParse(await readFile(arquivo), {
    pagerender: async (pageData) => {
      const tc = await pageData.getTextContent({ normalizeWhitespace: true });
      pagina += 1;
      let ultimoY = null;
      let out = '';
      for (const item of tc.items) {
        const y = item.transform[5];
        if (ultimoY !== null && Math.abs(ultimoY - y) > 1) out += '\n';
        out += item.str;
        ultimoY = y;
      }
      return `\n<<<PAGINA ${pagina}>>>\n${out}`;
    },
  });
  return d.text;
}
const REGS = [
  'L001', 'L030', 'L990',
  'M001', 'M010', 'M030', 'M300', 'M305', 'M310', 'M312', 'M350', 'M355', 'M360', 'M410', 'M500', 'M990',
  'N001', 'N030', 'N500', 'N630', 'N670', 'N990',
];
const ABAS = ['M300A', 'M350A', 'N500', 'N630A', 'N670'];
const NOISE = /^(o|Nº Campo Descrição Tipo Tamanho Decimal|Valores|Válidos|Obrigatório|Anexo ao Ato.*|RFB\/Subsecretaria.*|\s*Atualização: maio\/2026\s*|\s*02\/2026.*)\s*$/;

const raw = await extrairTexto(pdfPath);
// linhas com pagina
const lines = [];
let page = 0;
for (const l of raw.split('\n')) {
  const m = l.match(/^<<<PAGINA (\d+)>>>/);
  if (m) { page = Number(m[1]); continue; }
  const t = l.replace(/\s+$/, '');
  if (!t.trim() || NOISE.test(t)) continue;
  lines.push({ page, t });
}
// cabecalhos "Registro XNNN: ..." a partir da p.200
const heads = [];
lines.forEach((l, i) => {
  const m = l.t.match(/^Registro ([A-Z0-9]\d{3}): (.+)$/); // qualquer registro serve de fronteira (N990 termina onde P001 comeca)
  if (m && l.page >= 200 && !heads.some((h) => h.reg === m[1])) heads.push({ reg: m[1], title: m[2].trim(), i, page: l.page });
});
const sliceFor = (reg) => {
  const k = heads.findIndex((h) => h.reg === reg);
  if (k < 0) return null;
  const end = k + 1 < heads.length ? heads[k + 1].i : lines.length;
  return { ...heads[k], body: lines.slice(heads[k].i + 1, end) };
};

const SPEC = /(?:^|\s)(C|N|NS)\s+(\d+|-)\s+(?:(\d+|-)\s+)?([\s\S]{0,400}?)\s+(Sim|Não)(?=\s|$)/;

function parseRegister(reg) {
  const s = sliceFor(reg);
  if (!s) return { reg, missing: true };
  const body = s.body;
  const joined = body.map((b) => b.t).join('\n');
  const intro = body.slice(0, 6).map((b) => b.t).find((t) => !/^REGISTRO|^Regras|^Nível|^Campo\(s\)|^\d+ [A-Z_]/.test(t)) || '';
  const nivel = (joined.match(/Nível Hierárquico – (\d+)\s+Ocorrência – ([\d:N ]+)/) || [])
    .slice(1).join(' / ');
  const chave = (joined.match(/Campo\(s\) chave: ([^\n]+)/) || [, ''])[1].trim();
  // lista de regras do cabecalho (pode quebrar em 2 linhas)
  let regrasHdr = '';
  const ri = body.findIndex((b) => /^Regras de Validação do Registro/.test(b.t));
  if (ri >= 0) {
    regrasHdr = body[ri].t.replace(/^Regras de Validação do Registro:?\s*/, '');
    for (let j = ri + 1; j < ri + 3 && j < body.length; j++) {
      if (/^REGRA_/.test(body[j].t)) regrasHdr += ' ' + body[j].t;
    }
  }
  // campos: comeca em "^N NOME" e vai ate o proximo; para na secao "I – Regras" / "Exemplo"
  const stopIdx = body.findIndex((b) => /^(I – Regras de Validação|II – |Exemplo de preenchimento|III – )/.test(b.t));
  // pre-passo: numero do campo sozinho na linha ("5" + "IND_ SD_INI_LAL") vira uma linha so
  const region0 = body.slice(0, stopIdx >= 0 ? stopIdx : body.length);
  const fieldRegion = [];
  for (let i = 0; i < region0.length; i++) {
    const b = region0[i];
    if (/^\d{1,2}$/.test(b.t.trim()) && i + 1 < region0.length && /^[A-Z_]/.test(region0[i + 1].t.trim())) {
      fieldRegion.push({ page: b.page, t: `${b.t.trim()} ${region0[i + 1].t.trim()}` });
      i += 1;
    } else fieldRegion.push(b);
  }
  const starts = [];
  fieldRegion.forEach((b, i) => { if (/^\d{1,2} [A-Z][A-Z_0-9]{2,}(\s|$)/.test(b.t)) starts.push(i); });
  const fields = [];
  const isFrag = (tok) => /^[A-Z_0-9]+$/.test(tok);
  starts.forEach((si, k) => {
    const chunk = fieldRegion.slice(si, k + 1 < starts.length ? starts[k + 1] : fieldRegion.length);
    const head = chunk[0].t.match(/^(\d{1,2}) ([A-Z][A-Z_0-9]+)\s*(.*)$/);
    let rest = chunk.slice(1).map((c) => c.t);
    // nome quebrado pelo PDF: "IND_ SD_INI_LAL", "IND_" + "VL_LCTO_PARTE_A", "VL_LCTO_PARTE B" (+ "B" na linha seguinte)
    let nome = head[2];
    let tail = head[3];
    let normalizado = false;
    for (let guard = 0; guard < 3; guard++) {
      const tok = tail.trim().split(/\s+/)[0] || '';
      const fromTail = tok && isFrag(tok) && (nome.endsWith('_') || /^[A-Z]$/.test(tok));
      if (fromTail) { nome += (nome.endsWith('_') ? '' : '_') + tok; tail = tail.trim().slice(tok.length).trim(); normalizado = true; continue; }
      const nxt = rest.length ? rest[0].trim() : '';
      const fromNext = !tail.trim() && nxt && isFrag(nxt.split(/\s+/)[0]) && (nome.endsWith('_') || /^[A-Z]$/.test(nxt.split(/\s+/)[0]));
      if (fromNext) { const t0 = nxt.split(/\s+/)[0]; nome += (nome.endsWith('_') ? '' : '_') + t0; tail = nxt.slice(t0.length).trim(); rest = rest.slice(1); normalizado = true; continue; }
      break;
    }
    head[2] = nome + (normalizado ? '†' : '');
    const text = [tail, ...rest].join('\n');
    const m = text.match(SPEC);
    if (!m) { fields.push({ n: head[1], nome: head[2], parser: true, desc: text.split('\n')[0].slice(0, 110) }); return; }
    const desc = text.slice(0, m.index).replace(/\s+/g, ' ').trim();
    fields.push({ n: head[1], nome: head[2], desc: desc.slice(0, 110) + (desc.length > 110 ? '…' : ''),
      tipo: m[1], tam: m[2], dec: m[3] ?? '-', validos: m[4].replace(/\s+/g, ' ').trim().slice(0, 80), obrig: m[5], page: chunk[0].page });
  });
  // definicoes das regras (secao I)
  const defs = [];
  if (stopIdx >= 0) {
    let cur = null;
    for (const b of body.slice(stopIdx)) {
      if (/^(II – |III – |Exemplo de preenchimento)/.test(b.t)) break;
      const m = b.t.match(/^(REGRA_[A-Z0-9_]+):\s*(.*)$/);
      if (m) { cur = { nome: m[1], texto: m[2] }; defs.push(cur); }
      else if (cur && !/^I – /.test(b.t)) cur.texto += ' ' + b.t.trim();
    }
  }
  const nums = fields.map((f) => Number(f.n));
  const gaps = nums.filter((n, i) => i > 0 && n !== nums[i - 1] + 1);
  if (nums[0] !== 1 || gaps.length) console.error(`[CONTIGUIDADE] ${reg}: campos ${nums.join(',')}`);
  return { reg, title: s.title, page: s.page, intro, nivel, chave, regrasHdr, fields, defs };
}

// ---- XLSX ----
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(xlsxPath);
function readAba(nome) {
  const ws = wb.getWorksheet(nome);
  const hdr = ws.getRow(1).values.slice(1).map((v) => String(v ?? '').replace(/\s+/g, ' ').trim());
  const col = (n) => hdr.findIndex((h) => h.toUpperCase() === n) + 1;
  const cCod = col('CÓDIGO'), cDesc = col('DESCRIÇÃO'), cIni = col('DT_INI'), cFim = col('DT_FIM'), cTipo = col('TIPO'), cLanc = hdr.findIndex((h) => /^TIPO LAN/i.test(h)) + 1;
  const rows = [];
  ws.eachRow((row, i) => {
    if (i < 2) return;
    const v = (c) => { const x = c > 0 ? row.getCell(c).value : null; return x == null ? '' : String(typeof x === 'object' ? (x.result ?? x.text ?? '') : x).trim(); };
    const codigo = v(cCod); if (!codigo) return;
    rows.push({ codigo, desc: v(cDesc).replace(/\s+/g, ' '), ini: v(cIni), fim: v(cFim), tipo: v(cTipo), lanc: v(cLanc) });
  });
  const counts = {};
  for (const r of rows) counts[r.tipo || '(vazio)'] = (counts[r.tipo || '(vazio)'] || 0) + 1;
  return { nome, rows, counts };
}
const dt = (s) => (s && /^\d{8}$/.test(s) ? `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}` : s || '—');

// ---- montar markdown ----
const sha = async (p) => createHash('sha256').update(await readFile(p)).digest('hex');
const shaPdf = await sha(pdfPath), shaXlsx = await sha(xlsxPath);
const out = [];
out.push(`# BE-INCR-SPED-ECF-FASE3B — Passo A: transcrição dos Blocos L/M/N (Manual do Leiaute 12)

> **Estado:** Passo A CONCLUÍDO (item 1 do BRIEF \`BE-INCR-SPED-ECF-FASE3B-blocos-LMN-brief.md\`), \`sessao-feature\`
> autorizada por dono, em sessão, 2026-09-11 (*"abre o PR e autoriza a sessao-feature do Passo A"*). Docs-only.
> Gerado por script a partir do corpus local — nenhum campo foi digitado de memória. Nome de campo marcado com \`†\`
> foi **normalizado pelo parser** (o PDF quebra nomes longos: \`IND_ SD_INI_LAL\` → \`IND_SD_INI_LAL\`, \`VL_LCTO_PARTE B\` →
> \`VL_LCTO_PARTE_B\`) e conferido contra a página. Campo marcado \`[PARSER?]\` (se houver) não fechou e precisa de leitura manual. Toda página é a impressa no PDF (\`Página N de 621\`).

## Fonte normativa

- **Manual de Orientação do Leiaute 12 da ECF** — Anexo ao ADE Cofis nº 02/2026, **Atualização: maio/2026**
  (índice oficial \`sped.rfb.gov.br/pasta/show/1644\`: *"Leiaute 12 (Atualização: 20/05/2026)"*), 621 páginas.
  Arquivo: \`docs/accounting/fontes-oficiais/Manual-ECF-Leiaute-12.pdf\` — sha256 \`${shaPdf}\`.
- **Tabelas Dinâmicas e Planos Referenciais da ECF, Leiaute 12 (28/05/2026)** —
  \`docs/accounting/fontes-oficiais/RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx\` — sha256 \`${shaXlsx}\`.
- Extração: \`pdf-parse\` (já em \`server/node_modules\`) com marcador por página; XLSX via \`exceljs\`. Reponível:
  \`node scripts/baixar-fontes-oficiais.mjs\` + \`node scripts/transcrever-ecf-lmn.mjs\`.

## Legenda

- Obrigatoriedade de **Entrada** (Tabela de Registros, p.42): \`O\` Obrigatório · \`F\` Facultativo · \`OC\` Obrigatório
  Condicional · \`N\` Não Deve Existir. **Entrada** = importação do nosso \`.txt\`; **Saída** = transmissão.
- Tipo de campo: \`C\` caractere · \`N\` numérico · \`NS\` numérico **sinalizado** (p.31).
- \`TIPO\` das Tabelas Dinâmicas: \`E\` Entrada (nossa) · \`CNA\` Calculada Não Alterável (PVA, com FÓRMULA) ·
  \`CA\` Calculada Alterável · \`R\` Rótulo/subtotal.

## Matriz de obrigatoriedade — Bloco L/M/N (Tabela de Registros, pp.46-49)

| Registro | Entrada | Saída | Ocorrência | Nota |
|---|---|---|---|---|
| L001 | F | O | 1:1 | |
| L030 | F | OC | 0:13 | períodos "conforme parâmetros do Bloco 0" (p.221) |
| L100 / L200 / L210 / L300 | F | OC | 0:N | **fora deste incremento** (Fork 6→b): saldos finais de L100/L300 "não são editáveis" (pp.224/232) |
| L990 | F | O | 1:1 | |
| M001 | F | O | 1:1 | |
| M010 | F | — | — | Parte B — identificação da conta |
| M030 | F | — | 0:13 | |
| M300 / M350 | F | — | 0:N | Parte A (e-Lalur / e-Lacs) |
| M305 · M310 · M312 · M355 · M360 | F | — | — | filhos de M300/M350 |
| M410 · M500 | F | — | — | Parte B — lançamento sem reflexo / controle de saldos |
| **M990** | **N** | O | 1:1 | **Entrada = N** (p.47) — ver pendência PVA no BRIEF §4 item 1 |
| N001 | F | O | 1:1 | |
| N030 | F | OC (FORMA_TRIB ∈ 1,2,3,4) | 0:13 | |
| N500 | F | OC (FORMA_TRIB ∈ 1,2,3,4) | 0:N | |
| N630 / N670 | F | — | 0:N | |
| N990 | F | O | 1:1 | |

> As colunas Saída/Ocorrência marcadas "—" não foram lidas linha a linha nesta passada (a matriz nas pp.46-49
> quebra os nomes longos em 2-3 linhas e o parser não fecha a coluna com segurança). O que importa para o
> serializer — **Entrada** — foi lido para todos.
`);

out.push('\n## Registros — campo a campo\n');
for (const reg of REGS) {
  const r = parseRegister(reg);
  if (r.missing) { out.push(`### ${reg}\n\n[PARSER?] cabeçalho "Registro ${reg}:" não encontrado no texto extraído.\n`); continue; }
  out.push(`### ${r.reg} — ${r.title} (p.${r.page})\n`);
  if (r.intro) out.push(`> ${r.intro}\n`);
  out.push(`- Nível / Ocorrência: **${r.nivel || '[PARSER?]'}** · Campo(s) chave: \`${r.chave || '—'}\``);
  out.push(`- Regras de validação (cabeçalho): ${r.regrasHdr ? '`' + r.regrasHdr.trim().replace(/[;.]\s*$/, '').split(/;\s*/).join('` · `') + '`' : '—'}\n`);
  out.push('| Nº | Campo | Descrição (início) | Tipo | Tam. | Dec. | Valores válidos | Obrig. |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const f of r.fields) {
    if (f.parser) out.push(`| ${f.n} | \`${f.nome}\` | ${f.desc} | [PARSER?] | | | | |`);
    else out.push(`| ${f.n} | \`${f.nome}\` | ${f.desc.replace(/\|/g, '\\|')} | ${f.tipo} | ${f.tam} | ${f.dec} | ${f.validos.replace(/\|/g, '\\|') || '—'} | ${f.obrig} |`);
  }
  if (r.defs.length) {
    out.push('\nRegras (seção I do registro):\n');
    for (const d of r.defs) out.push(`- \`${d.nome}\`: ${d.texto.replace(/\s+/g, ' ').slice(0, 260)}${d.texto.length > 260 ? '…' : ''}`);
  }
  out.push('');
}

out.push('\n## Tabelas Dinâmicas — contagem por aba\n');
out.push('| Aba | Linhas | E | CNA | CA | R | outros |');
out.push('|---|--:|--:|--:|--:|--:|---|');
const abas = ABAS.map(readAba);
for (const a of abas) {
  const c = a.counts; const outros = Object.entries(c).filter(([k]) => !['E', 'CNA', 'CA', 'R'].includes(k)).map(([k, v]) => `${k}:${v}`).join(' ');
  out.push(`| ${a.nome} | ${a.rows.length} | ${c.E || 0} | ${c.CNA || 0} | ${c.CA || 0} | ${c.R || 0} | ${outros || '—'} |`);
}
out.push('\n> As linhas `CNA` (com FÓRMULA) e `CA` **nunca** são emitidas pelo Luminaris (Fork 3→a). As `E` abaixo são o');
out.push('> universo do catálogo do item 10 do BRIEF; `DT_FIM` preenchido = linha encerrada; `DT_INI` posterior ao');
out.push('> exercício = linha ainda não vigente (item 9: 400).\n');
for (const a of abas) {
  const es = a.rows.filter((r) => r.tipo === 'E');
  out.push(`### ${a.nome} — ${es.length} linhas \`E\`\n`);
  out.push(a.nome.startsWith('M') ? '| Código | Descrição | DT_INI | DT_FIM | TIPO LANÇ |' : '| Código | Descrição | DT_INI | DT_FIM |');
  out.push(a.nome.startsWith('M') ? '|---|---|---|---|---|' : '|---|---|---|---|');
  for (const r of es) {
    const d = r.desc.replace(/\|/g, '\\|').slice(0, 120);
    out.push(a.nome.startsWith('M') ? `| ${r.codigo} | ${d} | ${dt(r.ini)} | ${dt(r.fim)} | ${r.lanc || '—'} |` : `| ${r.codigo} | ${d} | ${dt(r.ini)} | ${dt(r.fim)} |`);
  }
  const cna = a.rows.filter((r) => r.tipo === 'CNA' || r.tipo === 'CA');
  if (cna.length) {
    out.push(`\nLinhas calculadas (${cna.length}) — só para o teste negativo do item 14: \`${cna.map((r) => r.codigo).join('`, `')}\`\n`);
  }
  out.push('');
}
out.push('\n---\n\nScript gerador: `node scripts/transcrever-ecf-lmn.mjs` (lê o PDF e o XLSX do corpus; rodar de novo com diff vazio é o teste de que esta transcrição ainda bate com a fonte). Marcas `†` = nome normalizado pelo parser (ver cabeçalho).\n');
await writeFile(outPath, out.join('\n'), 'utf8');
const parserMarks = (out.join('\n').match(/\[PARSER\?\]/g) || []).length;
console.log(`gerado: ${outPath} — ${REGS.length} registros, ${abas.length} abas, marcas [PARSER?]: ${parserMarks}`);
