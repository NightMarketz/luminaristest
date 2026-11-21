// Roda o bloco CALC do Simulador Tributário do Salão contra os exemplos 2 e 8 do manual do PGDAS-D
// (pesquisas-legais/das-espelho-guia/docs/D09_MANUAL_PGDAS-D_2018_V4-pdf.txt, linhas 3469-3539 e 3831-3967).
// Uso: node conferencia-pgdas-manual.js <caminho do simulador-tributario-salao.html>
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const ini = html.indexOf("/* ===== CALC"), fim = html.indexOf("let EQ=", ini);
if (ini < 0 || fim < 0) { console.error("bloco CALC não encontrado"); process.exit(2); }
const src = html.slice(ini, fim);
const api = new Function(src + "\nreturn {cenario,regimes,cenarioReg,guiaDAS,DEF,DEF_EQ,custoCLT};")();
const { cenario, regimes, cenarioReg, DEF, DEF_EQ } = api;
const f = v => (v == null ? "null" : v.toFixed(2));
let fails = 0;
function eq(nome, got, exp, tol = 0.011) {
  const ok = Math.abs(got - exp) <= tol;
  if (!ok) fails++;
  console.log((ok ? "OK   " : "FALHA") + " " + nome + ": simulador " + f(got) + " | oficial " + f(exp));
}
const base = { ...DEF, eq: [], desp: 0, cmv: 0, soc: 1, tfe: 0, cesta: 0, ben: 0, ano: "2026" };

console.log("== Manual PGDAS-D, Exemplo 2 (RBT12 300 mil; revenda 300 mil no Anexo I + serviço 100 mil no Anexo III) ==");
let c = cenario({ ...base, serv: 100000, rev: 300000, rcos: 0, rbt12: 300000, mes: 1, rbaAnt: 0, recAnoAnt: 300000 }, "CAD");
eq("DAS serviços", c.guia.totS, 8080.0);
eq("DAS revenda", c.guia.totR, 15960.0);
eq("DAS total", c.guia.tot, 24040.0);
const o2s = { IRPJ: 323.2, CSLL: 282.8, Cofins: 1135.24, PIS: 246.44, CPP: 3506.72, ISS: 2585.6 };
for (const k in o2s) eq("  serviços " + k, c.guia.serv[k], o2s[k]);
const o2r = { IRPJ: 877.8, CSLL: 558.6, Cofins: 2033.3, PIS: 440.5, CPP: 6623.4, ICMS: 5426.4 };
for (const k in o2r) eq("  revenda " + k, c.guia.rev[k], o2r[k]);

console.log("== Manual PGDAS-D, Exemplo 8 (RBT12 4,5 mi; mês de 1 mi cruza o sublimite de 3,6 mi; ISS travado em 5%) ==");
c = cenario({ ...base, serv: 1000000, rev: 0, rbt12: 4500000, mes: 7, rbaAnt: 3000000, recAnoAnt: 1500000 }, "CAD");
eq("DAS total", c.guia.tot, 246061.47, 0.06);
const o8 = { IRPJ: 39457.2 + 26248.5, CSLL: 17087.06 + 11342.17, Cofins: 19161.59 + 12594.06, PIS: 4148.32 + 2726.45, CPP: 38343.91 + 24952.21, ISS: 50000 };
for (const k in o8) eq("  " + k, c.guia.serv[k], o8[k], 0.06);

console.log("== Ficha de exemplo da página (âncoras do histórico: DAS 3.930; Presumido 10.354,22) ==");
const servPor = { p1: 20000, p2: 20000, p3: 0, p4: 0 };
const x0 = { ...DEF, eq: DEF_EQ, serv: 40000, servPor, insumo: 0, ins: {} };
const c0 = cenarioReg(x0, "CAD", {});
eq("DAS", c0.das, 3930.0);
eq("Presumido sem RAT nem terceiros (âncora antiga)", regimes({ ...x0, rat: 0, terc: 0 }, "CAD", 2026).PR.tot, 10354.22);
// conta à mão, independente: PIS 260 + Cofins 1.200 + ISS 2.000 + IRPJ 1.920 + CSLL 1.152 + (20% + 2% + 5,8%) x 19.111,11
eq("Presumido com RAT 2% e terceiros 5,8% (à mão)", regimes(x0, "CAD", 2026).PR.tot, 260 + 1200 + 2000 + 1920 + 1152 + 0.278 * (16000 + 16000 * 7 / 36));
const linha = (n, c) => console.log(n.padEnd(46) + " receita " + f(c.recMes).padStart(10) + " | tributos " + f(c.tribTot).padStart(9) + " | folha CLT " + f(c.folha).padStart(9) + " | resultado " + f(c.resultado).padStart(9) + " (" + (100 * c.resultado / (x0.serv + (x0.rev || 0))).toFixed(1) + "% do que o cliente paga)");
linha("Exemplo como está (CLT, zeros de fábrica)", c0);

console.log("== Sensibilidade: os campos que nascem em zero, preenchidos com valores ASSUMIDOS por mim ==");
// assumidos: insumo 8% dos serviços, cartão 2%, pró-labore 3.000, rotatividade 25%, VT 250/empregado, equipamentos 60 mil em 10 anos
const x1 = { ...x0, insumo: 3200, mdr: 2, pl: 3000, rot: 25, vt: 250, dep: 60000 / 120 };
const c1 = cenarioReg(x1, "CAD", {});
linha("Mesmo salão, zeros preenchidos (CLT)", c1);
for (const [k, v] of [["insumo", { insumo: 3200 }], ["cartão 2%", { mdr: 2 }], ["pró-labore 3.000", { pl: 3000 }], ["rotatividade 25%", { rot: 25 }], ["VT 250", { vt: 250 }], ["depreciação 500", { dep: 500 }]]) {
  const ci = cenarioReg({ ...x0, ...v }, "CAD", {});
  console.log("  só " + k.padEnd(20) + " tira " + f(c0.resultado - ci.resultado));
}
const c2 = cenarioReg(x1, "PARC", {});
linha("Mesmo salão, cabeleireiros parceiros 50/50", c2);
console.log("  parceiro: repasse " + f(c2.repasse) + " | receita bruta do salão no Simples " + f(c2.servSalao) + " | RBT12 " + f(c2.rbt));
console.log(fails ? "\n" + fails + " FALHA(S)" : "\nTodas as comparações com o manual oficial e com as âncoras bateram.");
process.exit(fails ? 1 : 0);
