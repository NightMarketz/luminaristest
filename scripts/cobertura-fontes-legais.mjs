#!/usr/bin/env node
// Mede, a partir dos dossiês de pesquisa legal (pesquisas-legais/*/manifest.json), de onde veio cada
// documento citado: acervo ctresb/leis (com ou sem alerta de versão) ou fonte oficial (por domínio).
// Alimenta docs/operating-manual/REGULATORY-SOURCE-COVERAGE.md. Só lê; não é gate.
//
// Uso: node scripts/cobertura-fontes-legais.mjs [--desde AAAA-MM-DD] [--json]
// --desde (padrão 2026-10-17, dia em que o acervo virou fonte primária): conta só documentos baixados
// a partir dessa data, para não inflar "fonte oficial" com dossiês anteriores ao acervo.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', 'pesquisas-legais');
const iDesde = process.argv.indexOf('--desde');
const DESDE = iDesde > 0 ? process.argv[iDesde + 1] : '2026-10-17';

// Módulo do Luminaris pelo slug do dossiê; a primeira regra que casa vence.
const MODULOS = [
  ['ISS / NFS-e', /nfse|(^|-)iss(-|$)|ctribnac|cgnfs/],
  ['NF-e / NFC-e / DF-e', /nfe|nfce|danfe|dfe|inutilizacao|cclasstrib|d1f-indop|indop/],
  ['Simples / MEI', /simples|mei|ef-pr4|lc224/],
  ['Retenções / EFD-Reinf', /reinf|retenc|p-ret|bloco6|irrf-distribuicao/],
  ['PIS/COFINS / eficiência fiscal', /pis-cofins|eficiencia|bloco3/],
  ['IRPJ / CSLL / ECF', /irpj|csll|presumido|dl1598|ecf|pc1|irrf/],
  ['IBS / CBS', /ibs|cbs/],
  ['Contábil / ECD / CFC', /ecd|contabil|i250|fechamento|f-gov|crc|venda-recebivel/],
  ['DP / folha / eSocial', /pes4|folha|pre-adr-dp/],
  ['LGPD / digital / pagamentos', /lgpd|marco-civil|open-finance|byok|psc|teammates/],
];
const moduloDe = (slug) => (MODULOS.find(([, re]) => re.test(slug)) ?? ['Transversal / triagem'])[0];

const naoCompilado = (d) => (d.alertas ?? []).some((a) => /compilad/i.test(a));
const dominio = (d) => {
  try { return new URL(d.url_final || d.url).hostname; } catch { return '(sem url)'; }
};

const docs = [];
let dossies = 0;
for (const slug of readdirSync(ROOT)) {
  const m = join(ROOT, slug, 'manifest.json');
  if (!existsSync(m)) continue;
  dossies++;
  const j = JSON.parse(readFileSync(m, 'utf8'));
  for (const d of j.documentos ?? []) {
    if ((d.baixado_em ?? '').slice(0, 10) < DESDE) continue;
    docs.push({ ...d, _slug: slug, _modulo: moduloDe(slug) });
  }
}

const porModulo = new Map();
for (const d of docs) {
  const r = porModulo.get(d._modulo) ?? { dossies: new Set(), total: 0, acervoLimpo: 0, acervoAlerta: 0, oficial: 0, dominios: new Map() };
  r.dossies.add(d._slug);
  r.total++;
  if (d.acervo) naoCompilado(d) ? r.acervoAlerta++ : r.acervoLimpo++;
  else {
    r.oficial++;
    const h = dominio(d);
    r.dominios.set(h, (r.dominios.get(h) ?? 0) + 1);
  }
  porModulo.set(d._modulo, r);
}

const pct = (n, t) => (t ? `${Math.round((100 * n) / t)}%` : '—');
const linhas = [...porModulo.entries()].sort((a, b) => b[1].total - a[1].total);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(linhas.map(([m, r]) => ({ modulo: m, ...r, dossies: r.dossies.size, dominios: Object.fromEntries(r.dominios) })), null, 2));
  process.exit(0);
}

const tot = docs.length;
const acL = docs.filter((d) => d.acervo && !naoCompilado(d)).length;
const acA = docs.filter((d) => d.acervo && naoCompilado(d)).length;
console.log(`desde ${DESDE} · dossiês lidos: ${dossies} · documentos: ${tot} · acervo sem alerta de versão: ${acL} (${pct(acL, tot)}) · acervo não compilado: ${acA} (${pct(acA, tot)}) · fonte oficial: ${tot - acL - acA} (${pct(tot - acL - acA, tot)})\n`);
console.log('| Módulo | Dossiês | Docs | Acervo usável | Acervo não compilado | Fonte oficial | Domínios oficiais mais usados |');
console.log('|---|---:|---:|---:|---:|---:|---|');
for (const [m, r] of linhas) {
  const top = [...r.dominios.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h, n]) => `${h} (${n})`).join(', ');
  console.log(`| ${m} | ${r.dossies.size} | ${r.total} | ${pct(r.acervoLimpo, r.total)} | ${pct(r.acervoAlerta, r.total)} | ${pct(r.oficial, r.total)} | ${top || '—'} |`);
}
