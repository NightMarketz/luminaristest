// uso: node t20-item20.js <html>  — casos do item 20 do BRIEF-GRUPO-LACUNAS-2026-11-24 (falham na v50, passam com p14 e p15)
// 20a (38c0): Simples impedido com revenda: o ICMS do regime normal entra nos tributos e sai do resultado; a identidade do mês fecha.
// 20b (967b): crédito de CBS/IBS de 2027 das despesas marcadas = cred × a27/(1+a27): 6.000 a 11,3% dá 609,16 em PR27, RE27 e SR27.
// Depende do def2.js do scratchpad da sessão de 21/11 (o mesmo do tm-meses.js).
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const calc=h.slice(h.indexOf('const T3='),h.indexOf('/* ===== /CALC'));
const oc=/const outrosC=[^\n]*\n/.exec(h)[0];
const D=fs.readFileSync('C:/Users/smurf/AppData/Local/Temp/claude/8b1b7072bbf3264d/43476aee-72e5-4040-b1eb-e9ea74381e78/scratchpad/def2.js','utf8');
eval(calc+D+oc+`
const serv=DEF_CAT.sv.reduce((a,s)=>a+s.p*s.m,0), servPor={};DEF_EQ.forEach(p=>servPor[p.id]=0);DEF_CAT.sv.forEach(s=>servPor[s.q]+=s.p*s.m);
const base={...DEF,eq:DEF_EQ,serv,servPor,pl:3000,rev:3000,cmv:50,insumo:2500,vt:200,ins:{fora:40,cos:100,inter:"0.12",forn:"REG",cred27:"S"}};
const mk=(x,f)=>({...x,meses:{modo:"SZ",sv:f.map(v=>x.serv*v/100),rv:f.map(v=>x.rev*v/100),ant:Array(12).fill(null),real:"TRI"}});
let bad=0,n=0;const ok=(c,msg)=>{n++;if(!c){bad++;console.log("FALHA",msg)}};
// 20a: 310 mil de serviço por mês e revenda de 3 mil (compras de 50%, 100% cosmético a 25%): receita do ano passado de R$ 3,756 mi, acima do sublimite: impedido o ano todo
const xs={...base,serv:310000,servPor:Object.fromEntries(Object.entries(servPor).map(([k,v])=>[k,v*7.75]))};
const esp=3000*(1-.5)*.25; // 375,00: 25% (Lei SP 6.374 art. 34) sobre revenda − compras (art. 36)
for(const ano of ["2026","2027"])for(const sr of ano==="2027"?[false,true]:[false]){const x={...xs,ano}, reg={r:"S",sr}, nm=ano+(sr?" SR":" S");
  const AM=anoMeses(mk(x,Array(12).fill(100)),"CAD",reg,{mes:1});let imp=0;
  AM.meses.forEach((cm,i)=>{if(!cm||!cm.ap.impedido)return;imp++;
    ok(Math.abs((cm.icmsFora||0)-esp)<0.01,nm+" mes "+(i+1)+" icmsFora "+cm.icmsFora+" esperado "+esp);
    const icmsIt=(cm.tribIt||[]).concat(cm.regs.S.rev.items).filter(t=>/^ICMS/.test(t.k));
    ok(icmsIt.length>=1&&Math.abs(icmsIt[0].v-esp)<0.01,nm+" mes "+(i+1)+" item ICMS nos tributos");
    ok(Math.abs(cm.recMes-cm.tribTot-cm.folha-outrosC(cm,x)-cm.resultado)<0.01,nm+" mes "+(i+1)+" identidade");
    if(!sr)ok(Math.abs(cm.tribTot-cm.das-cm.issFora-(cm.ibsFora||0)-esp)<0.01,nm+" mes "+(i+1)+" tribTot = DAS + ISS + IBS + ICMS");
    else ok(Math.abs(cm.tribTot-cm.dasReg-cm.cbsReg-cm.issFora-esp)<0.01,nm+" mes "+(i+1)+" tribTot = DAS + CBS/IBS + ISS + ICMS");});
  ok(imp===12,nm+": 12 meses impedidos, achou "+imp);
  // o resultado cai pelo ICMS: o mesmo mês sem revenda não tem ICMS; com revenda, o resultado é o da revenda menos CMV, DAS da revenda e ICMS
  const c1=cenarioReg({...x,mes:6},"CAD",reg);ok(!c1.ap.impedido||Math.abs((c1.icmsFora||0)-esp)<0.01,nm+" cenarioReg icmsFora");}
// sem impedimento não há ICMS fora do DAS
{const c=cenarioReg({...base,ano:"2026",mes:6},"CAD",{r:"S"});ok(!c.ap.impedido&&!(c.icmsFora>0),"S26 normal: sem ICMS fora");}
// a aba DAS não diz mais "fora desta conta"
ok(!h.includes("fora desta conta"),"texto 'fora desta conta' ainda na página");
// 20b: crédito das despesas marcadas em 2027
{const x={...base,ano:"2027",desp:8000,cred:6000,cbs:11.3}, R1=regimes(x,"CAD",2027), R0=regimes({...x,cred:0},"CAD",2027);
 const cb=(Rg,k)=>Rg[k].items.filter(i=>/^(CBS|IBS)$/.test(i.k)).reduce((a,i)=>a+i.v,0);
 for(const k of ["PR","RE","SR"]){const cr=cb(R0,k)-cb(R1,k);ok(Math.abs(cr-609.16)<0.01,k+"27 crédito "+cr.toFixed(2)+" esperado 609,16")}
 // fornecedor do Simples: o crédito segue o percentual da nota (art. 47 § 9º II), sem a divisão
 const xf={...x,fd27:"SN",fd27a:4}, F1=regimes(xf,"CAD",2027), F0=regimes({...xf,cred:0},"CAD",2027);
 ok(Math.abs(cb(F0,"RE")-cb(F1,"RE")-240)<0.01,"RE27 fornecedor do Simples a 4%: crédito "+(cb(F0,"RE")-cb(F1,"RE")).toFixed(2)+" esperado 240,00");}
console.log("casos",n,"falhas",bad);
`);
