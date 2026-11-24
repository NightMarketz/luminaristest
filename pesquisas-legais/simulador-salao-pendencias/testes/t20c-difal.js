// uso: node t20c-difal.js <html>  — caso do item 20c do BRIEF-GRUPO-LACUNAS-2026-11-24 (lacuna 368c; falha na v51, passa com p16)
// O mesmo insumo de outro estado dá DIFAL diferente no Simples e no Presumido/Real, cada um pela regra citada:
// - S26, S27, SR27 (optante): (interna − interestadual) × valor, por fora (RICMS/SP art. 115 XV-A "a" e § 8º);
// - PR26, RE26, PR27, RE27 (RPA): (valor − ICMS da origem) ÷ (1 − interna) × interna − ICMS da origem (art. 117 I e II; art. 37 § 11; art. 49),
//   leitura (a) do dossiê pesquisas-legais/icms-sp-difal-uso-consumo-rpa (tabela "Casos para o teste 20c", V = 1.000).
// Também: a identidade do mês fecha no RE26 e o lucro contábil do Real desconta o DIFAL do RPA.
// Depende do def2.js do scratchpad da sessão de 21/11 (o mesmo do tm-meses.js e do t20-item20.js).
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const calc=h.slice(h.indexOf('const T3='),h.indexOf('/* ===== /CALC'));
const oc=/const outrosC=[^\n]*\n/.exec(h)[0];
const D=fs.readFileSync('C:/Users/smurf/AppData/Local/Temp/claude/8b1b7072bbf3264d/43476aee-72e5-4040-b1eb-e9ea74381e78/scratchpad/def2.js','utf8');
eval(calc+D+oc+`
const serv=DEF_CAT.sv.reduce((a,s)=>a+s.p*s.m,0), servPor={};DEF_EQ.forEach(p=>servPor[p.id]=0);DEF_CAT.sv.forEach(s=>servPor[s.q]+=s.p*s.m);
const base={...DEF,eq:DEF_EQ,serv,servPor,pl:3000,rev:3000,cmv:50,insumo:1000,vt:200};
let bad=0,n=0;const ok=(c,msg)=>{n++;if(!c){bad++;console.log("FALHA",msg)}};
const CASOS=[["cosmético 25%, origem 12%",100,"0.12",130,173.33],["cosmético 25%, importado 4%",100,"0.04",210,280],
             ["material 18%, origem 12%",0,"0.12",60,73.17],["material 18%, importado 4%",0,"0.04",140,170.73]];
for(const [nm,cos,inter,opt,rpa] of CASOS){
  const ins={fora:100,cos,inter,forn:"REG",cred27:"S"}, x={...base,ins};
  for(const [ano,reg,lbl,esp] of [["2026",{r:"S"},"S26",opt],["2026",{r:"PR"},"PR26",rpa],["2026",{r:"RE"},"RE26",rpa],
                                  ["2027",{r:"S"},"S27",opt],["2027",{r:"S",sr:true},"SR27",opt],["2027",{r:"PR"},"PR27",rpa],["2027",{r:"RE"},"RE27",rpa]]){
    const c=cenarioReg({...x,ano,mes:6},"CAD",reg);
    ok(c.reg===lbl.slice(0,-2),nm+" "+lbl+": regime aplicado "+c.reg);
    ok(Math.abs((c.difal||0)-esp)<0.01,nm+" "+lbl+": DIFAL "+(c.difal||0).toFixed(2)+" esperado "+esp.toFixed(2));
    ok(Math.abs(c.recMes-c.tribTot-c.folha-outrosC(c,x)-c.resultado)<0.01,nm+" "+lbl+": identidade do mês");}
  // o lucro contábil do Real desconta o DIFAL do RPA: com o insumo todo de SP (fora = 0), o Lc sobe exatamente o DIFAL
  for(const ano of [2026,2027]){const R1=regimes({...x,ano:String(ano)},"CAD",ano), R0=regimes({...x,ano:String(ano),ins:{...ins,fora:0}},"CAD",ano);
    ok(Math.abs(R0.lalur.Lc-R1.lalur.Lc-rpa)<0.01,nm+" RE"+(ano%100)+": Lc desconta "+(R0.lalur.Lc-R1.lalur.Lc).toFixed(2)+" esperado "+rpa.toFixed(2));}}
// salão que não revende não é contribuinte: sem DIFAL em nenhum regime
for(const reg of [{r:"S"},{r:"RE"}]){const c=cenarioReg({...base,rev:0,ano:"2026",mes:6,ins:{fora:100,cos:100,inter:"0.12"}},"CAD",reg);ok(!(c.difal>0),"sem revenda "+reg.r+": DIFAL "+c.difal);}
// textos: a página cita o art. 117 no calendário e na aba Insumos, e a pergunta da base está na aba 7
ok(/DIFAL do insumo de outro estado",R\\(c\\.difal\\)\\+" dentro da apuração do ICMS do mês anterior \\(RICMS\\/SP art\\. 117 I e II\\)/.test(h),"calendário do RPA");
ok(h.includes("DIFAL no Presumido e no Real: a base por dentro"),"pergunta da aba 7");
ok(!h.includes('{const q=insumoCalc(x,INS);if(q.difal>0)cal.push(["Último dia do 2º mês"'),"calendário da v51 (optante em todo regime) ainda na página");
console.log("casos",n,"falhas",bad);
`);
