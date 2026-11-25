const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const calc=h.slice(h.indexOf('const T3='),h.indexOf('/* ===== /CALC'));
const oc=/const outrosC=[^\n]*\n/.exec(h)[0];
const D=fs.readFileSync('C:/Users/smurf/AppData/Local/Temp/claude/8b1b7072bbf3264d/43476aee-72e5-4040-b1eb-e9ea74381e78/scratchpad/def2.js','utf8');
eval(calc+D+oc+`
const serv=DEF_CAT.sv.reduce((a,s)=>a+s.p*s.m,0), servPor={};DEF_EQ.forEach(p=>servPor[p.id]=0);DEF_CAT.sv.forEach(s=>servPor[s.q]+=s.p*s.m);
const base={...DEF,eq:DEF_EQ,serv,servPor,pl:3000,rev:3000,cmv:50,insumo:2500,vt:200,ins:{fora:40,cos:100,inter:"0.12",forn:"REG",cred27:"S"}};
const mk=(x,f,real)=>({...x,meses:{modo:"SZ",sv:f.map(v=>x.serv*v/100),rv:f.map(v=>x.rev*v/100),ant:Array(12).fill(null),real:real||"TRI"}});
let bad=0,n=0;const ok=(c,msg)=>{n++;if(!c){bad++;console.log("FALHA",msg)}};
const f100=Array(12).fill(100);
for(const ano of ["2026","2027"])for(const r of ["S","SR","PR","RE"])for(const real of ["TRI","EST","ESTB"]){if(r==="SR"&&ano==="2026")continue;
  const reg={r:r==="SR"?"S":r,sr:r==="SR"}, x={...base,ano};
  const c=cenarioReg({...x,mes:6},"CAD",reg), AM=anoMeses(mk(x,f100,real),"CAD",reg,{mes:6});
  ok(Math.abs(AM.ano.resultado-12*c.resultado)<0.05,ano+" "+r+" "+real+" SZ100 resultado "+AM.ano.resultado.toFixed(2)+" vs "+(12*c.resultado).toFixed(2));
  ok(Math.abs(AM.ano.trib-12*c.tribTot)<0.05,ano+" "+r+" "+real+" SZ100 trib");
  if(c.limIsento!=null)ok(Math.abs(AM.ano.limIsento-c.limIsento)<0.05,ano+" "+r+" lim "+AM.ano.limIsento+" "+c.limIsento);
  // identidade do mês: receita − tributos − folha − outros = resultado
  AM.meses.forEach((cm,i)=>ok(Math.abs(cm.recMes-cm.tribTot-cm.folha-outrosC(cm,{...x,desp:x.desp})-cm.resultado)<0.01,ano+" "+r+" mes "+(i+1)+" identidade"));
}
// período parcial: abertura em 05/2026, PR, meses iguais via SZ 100: o 2º trimestre tem 2 meses e o adicional começa em R$ 40 mil (Lei 9.249 art. 3º § 1º)
{const x={...base,ano:"2026"}, c=cenarioReg({...x,mes:6},"CAD",{r:"PR"}), AM=anoMeses(mk(x,f100,"TRI"),"CAD",{r:"PR"},{mes:6,ini:{m:5,a:2026}});
 const q2=AM.per.find(p=>p.lbl==="2º trimestre"), b2=2*c.regs.PR.presBase, esp=.15*b2+.1*Math.max(0,b2-40000);
 ok(q2&&q2.n===2&&Math.abs(q2.I-esp)<0.01,"abertura 05/2026: 2º tri n="+(q2&&q2.n)+" I="+(q2&&q2.I.toFixed(2))+" esperado "+esp.toFixed(2));
 ok(AM.meses.slice(0,4).every(m=>m===null)&&AM.ano.n===8,"abertura 05/2026: 8 meses no ano");}
console.log("casos",n,"falhas",bad);
// sazonal: dezembro 300, PR 2026
const fz=[80,80,90,100,100,90,90,100,110,110,150,300];
for(const r of ["PR","RE"]){const x={...base,ano:"2026",serv:90000,servPor:Object.fromEntries(Object.entries(servPor).map(([k,v])=>[k,v*2.25]))};
 const AM=anoMeses(mk(x,fz,"TRI"),"CAD",{r},{mes:12});
 AM.per.forEach(p=>console.log(r,p.lbl,"SI",p.SI.toFixed(2),"I",p.I.toFixed(2),"C",p.C.toFixed(2)));
 console.log(r,"ano resultado",AM.ano.resultado.toFixed(2),"trib",AM.ano.trib.toFixed(2));}
{const x={...base,ano:"2026",serv:90000,servPor:Object.fromEntries(Object.entries(servPor).map(([k,v])=>[k,v*2.25]))};
 for(const real of ["EST","ESTB"]){const AM=anoMeses(mk(x,fz,real),"CAD",{r:"RE"},{mes:12});const P=AM.per[0];
  console.log(real,P.lbl,"I ano",P.I.toFixed(2),"C",P.C.toFixed(2),"pagoI",AM.est.pagoI.toFixed(2),"ajI",AM.est.ajI.toFixed(2),"ajC",AM.est.ajC.toFixed(2),"est jan",AM.est.I[0].toFixed(2))}
 // Simples: cruza o sublimite. 300 mil/mês ~ 3,6 mi; sazonal sobe no fim do ano
 const xs={...base,ano:"2026",serv:290000,servPor:Object.fromEntries(Object.entries(servPor).map(([k,v])=>[k,v*7.25])),rev:0};
 const AM=anoMeses(mk(xs,[90,90,90,90,100,100,100,100,110,120,130,140],"TRI"),"CAD",{r:"S"},{mes:1});
 AM.meses.forEach(c=>console.log("S mes",c.mesN,"rbaAnt",c.ap.rbaAnt.toFixed(0),"rbt",c.rbt.toFixed(0),"faixa",c.faixa,"imp",c.ap.impedido,"fSub",c.ap.fSub.toFixed(3),"das",c.das,"issFora",c.issFora));}
`);
