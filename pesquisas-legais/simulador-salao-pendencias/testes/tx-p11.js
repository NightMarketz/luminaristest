// uso: node tx-p11.js <html> (v48 + p11 + p12 + p13) [pasta-das-capturas]
// Abre cada aba da página em S26, PR26, RE26, RE27 e SR27 (configs do cfg4.js), soma os erros de script e confere os textos
// do p11 (revisão de conteúdo de 21/11), inclusive os que dependem do regime. Os nomes do cfg4.js levam o sufixo "n" (S26n...). No fim, captura o topo a 375 px (iPhone 13) para o KPI.
// Depende do Playwright e do cfg4.js do scratchpad da sessão de 21/11 (caminho PW abaixo).
const PW = "C:/Users/smurf/AppData/Local/Temp/claude/8b1b7072bbf3264d/43476aee-72e5-4040-b1eb-e9ea74381e78/scratchpad/pwt/";
const { chromium, devices } = require(PW + "node_modules/playwright"); const path = require("path");
const u = require("url").pathToFileURL(path.resolve(process.argv[2])).href; const out = process.argv[3];
const src = require("fs").readFileSync(PW + "cfg4.js", "utf8"); const i0 = src.indexOf("const DEF="), i1 = src.indexOf("// [nome");
eval(src.slice(i0, i1).replace(/const /g, "var ").replace(/let /g, "var "));
const TABS = ["ficha", "catalogo", "regime", "das", "equipe", "parceria", "lucro", "calendario", "decisoes", "insumos", "demonstrativo"];
// [config, aba, texto que deve aparecer, texto que não pode aparecer]
const EXP = [
  ["S26", "calendario", "NFS-e pelo Emissor Nacional", "Emissor Nacional ou Paulistana"],
  ["PR26", "calendario", "NFS-e: Emissor Nacional ou Paulistana", "no emissor que a Prefeitura de SP exigir"],
  ["RE26", "calendario", "IN SF/SUREM 10/2011 art. 1º-A § 2º", null],
  ["S26", "decisoes", "os pontos que ainda têm mais de uma leitura", "os dois pontos com mais de uma leitura"],
  ["S26", "decisoes", "Parceria: quando nasce o vínculo", null],
  ["S26", "ficha", "Telemedicina e Seguro + Social da convenção", "Seguro Social da convenção"],
  ["S26", "insumos", "ou 4% no importado", null],
  ["S26", "ficha", "higiene bucal (33.06)", null],
  ["S26", "ficha", "arts. 68, 69 e 83", null],
  ["S26", "ficha", "Os códigos A.nnn e E.nnn", null],
  ["S26", "insumos", null, "L-…-35d3"],
  // p13 (fecho da revisão): R18, R21 e o grau do R05
  ["S26", "ficha", "33.07.10.0100 e 33.07.90.0500", "o resto do cosmético, 25%"],
  ["S26", "insumos", "inclusive higiene bucal (33.06)", "exceto xampu 33.05.10 e desodorante 33.07.20; 18%"],
  ["S26", "regime", "GARE é a guia do ICMS de SP", null],
  ["PR26", "calendario", "pela leitura da pesquisa (art. 1º)", "o que nunca foi emite"],
  ["S26", "parceria", null, "não põe a condição do CNPJ (I)"],
];
(async () => {
  const b = await chromium.launch(); let bad = 0, n = 0; const errs = [];
  const ok = (c, m) => { n++; if (!c) { bad++; console.log("FALHA", m) } };
  const open = async (cn, opts) => {
    const cf = cfgs[cn + "n"]; if (!cf) throw new Error("config ausente no cfg4.js: " + cn + "n"); const ctx = await b.newContext(opts || {}); const p = await ctx.newPage();
    p.on("pageerror", e => errs.push(cn + ": " + e.message));
    await ctx.addInitScript(cf => { try { if (sessionStorage.getItem("ini")) return; sessionStorage.setItem("ini", "1"); localStorage.clear(); localStorage.setItem("sts-ficha-v2", JSON.stringify({ ficha: cf.ficha, cat: cf.cat, eq: cf.eq })); localStorage.setItem("sts-ficha-v2-reg", JSON.stringify(cf.reg)); if (cf.ins) localStorage.setItem("sts-ficha-v2-ins", JSON.stringify(cf.ins)) } catch (e) { } }, cf);
    return { p, ctx };
  };
  for (const cn of ["S26", "PR26", "RE26", "RE27", "SR27"]) {
    const { p, ctx } = await open(cn); const txt = {};
    for (const t of TABS) { await p.goto(u + "#" + t); await p.waitForTimeout(80); txt[t] = await p.locator("#p-" + t).evaluate(e => e.textContent); /* textContent: inclui o <details> fechado */ }
    for (const [c, t, yes, no] of EXP) if (c === cn) {
      if (yes) ok(txt[t].includes(yes), cn + " " + t + " sem: " + yes);
      if (no) ok(!txt[t].includes(no), cn + " " + t + " ainda com: " + no);
    }
    await ctx.close();
  }
  if (out) {
    const { p, ctx } = await open("S26", { ...devices["iPhone 13"] }); await p.goto(u + "#ficha"); await p.waitForTimeout(150);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); ok(sw[0] <= sw[1], "rolagem horizontal a 390 px: " + sw);
    const kv = await p.$$eval("#kpis .kpi .v", vs => vs.map(v => [v.innerText, v.scrollWidth <= v.clientWidth + 1]));
    kv.forEach(([t, f]) => ok(f, "KPI cortado: " + t));
    await p.setViewportSize({ width: 375, height: 812 }); await p.waitForTimeout(100);
    const kv3 = await p.$$eval("#kpis .kpi .v", vs => vs.map(v => [v.innerText, v.scrollWidth <= v.clientWidth + 1, getComputedStyle(v).whiteSpace]));
    kv3.forEach(([t, f, ws]) => ok(f && ws === "nowrap", "KPI a 375 px: " + t + " " + ws));
    await p.screenshot({ path: path.join(out, "topo-375.png") }); await ctx.close();
    const d = await open("RE26", { viewport: { width: 1280, height: 900 } }); await d.p.goto(u + "#calendario"); await d.p.waitForTimeout(150);
    await d.p.screenshot({ path: path.join(out, "calendario-real-desktop.png"), fullPage: false }); await d.ctx.close();
  }
  await b.close();
  console.log("casos", n, "falhas", bad, "| erros de script:", errs.length ? errs.join(" ; ") : "nenhum");
  process.exit(bad || errs.length ? 1 : 0);
})();
