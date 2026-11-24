// uso: node pg-meses.js <html>  — a página com o bloco "Meses do ano" (SZ e MM) sobre as configs do cfg4.js
// Confere: a tabela dos 12 meses soma o KPI "Lucro do ano"; cada mês fecha; a DRE do mês fecha com o KPI e não tem coluna Ano;
// sazonalidade 100% em tudo = meses iguais (sem prejuízo a compensar e sem abertura); reload mantém o MS; "Voltar ao exemplo" limpa.
const PW="C:/Users/smurf/AppData/Local/Temp/claude/8b1b7072bbf3264d/43476aee-72e5-4040-b1eb-e9ea74381e78/scratchpad/pwt/";
const {chromium}=require(PW+"node_modules/playwright");const path=require("path");const u=require("url").pathToFileURL(path.resolve(process.argv[2])).href;
const src=require("fs").readFileSync(PW+"cfg4.js","utf8");const i0=src.indexOf("const DEF="),i1=src.indexOf("// [nome");eval(src.slice(i0,i1).replace(/const /g,"var ").replace(/let /g,"var "));
const V=()=>Array(12).fill(""), F=["80","80","90","100","100","90","90","100","110","110","150","200"], MSs={
 SZ100:{modo:"SZ",f:Array(12).fill("100"),r:V(),rv:V(),ant:V(),real:"TRI"},
 SZ:{modo:"SZ",f:F,r:V(),rv:V(),ant:V(),real:"TRI"},
 SZE:{modo:"SZ",f:F,r:V(),rv:V(),ant:V(),real:"EST"},
 MM:{modo:"MM",f:V(),r:["30000","32000","","38000","40000","","36000","40000","42000","45000","52000","60000"],rv:["","","","","","","","","","","5000",""],ant:["28000","","","","","","","","","","",""],real:"ESTB"}};
const num=s=>{s=s.replace(/\u00a0/g," ");const neg=/^\(|^-|^−/.test(s.trim());const n=parseFloat(s.replace(/[^\d,]/g,"").replace(",","."));return neg?-n:n};
(async()=>{const b=await chromium.launch();let bad=0,n=0;const errs=[];const ok=(c,m)=>{n++;if(!c){bad++;console.log("FALHA",m)}};
 const run=async(cn,cf,ms)=>{const ctx=await b.newContext();const p=await ctx.newPage();p.on("pageerror",e=>errs.push(cn+": "+e.message));
  await ctx.addInitScript(([cf,ms])=>{try{if(sessionStorage.getItem("ini"))return;sessionStorage.setItem("ini","1");localStorage.clear();localStorage.setItem("sts-ficha-v2",JSON.stringify({ficha:cf.ficha,cat:cf.cat,eq:cf.eq}));localStorage.setItem("sts-ficha-v2-reg",JSON.stringify(cf.reg));localStorage.setItem("sts-ficha-v2-ins",JSON.stringify(cf.ins||{fora:50,cos:100,inter:"0.12",forn:"REG",efForn:"",cred27:"S"}));localStorage.setItem("sts-ficha-v2-das",JSON.stringify(cf.das||{mes:6,rbt:"",rba:"",ant:"",ini:"",mant:""}));if(ms)localStorage.setItem("sts-ficha-v2-mes",JSON.stringify(ms))}catch(e){}},[cf,ms]);
  await p.goto(u+"#demonstrativo");await p.waitForTimeout(150);
  const kpi=(await p.locator("#kpis").innerText()).replace(/\u00a0/g," ");
  const g=re=>{const m=re.exec(kpi);return m?(m[1]?-1:1)*parseFloat(m[2].replace(/\./g,"").replace(",",".")):null};
  const o={p,ctx,res:g(/Resultado do salão\s*(-?)R\$\s*([\d.]+,\d\d)/),ano:g(/Lucro do ano\s*(-?)R\$\s*([\d.]+,\d\d)/)};
  o.t12=await p.$$eval("#oD table.mes12 tbody tr",trs=>trs.map(tr=>[...tr.cells].map(td=>td.innerText.trim())));
  o.dre=await p.$$eval("#oD table.dre tbody tr",trs=>trs.map(tr=>({cls:tr.className,l:tr.cells[0].innerText.trim(),v:tr.cells[1].innerText.trim(),nc:tr.cells.length})));
  o.ms=await p.evaluate(()=>{const t=performance.now();for(let i=0;i<5;i++)document.querySelector("#f_desp").dispatchEvent(new Event("input",{bubbles:true}));return (performance.now()-t)/5});
  return o};
 const Z={pfis:0,bneg:0,rot:0,aMul:0,aBri:0,aAli:0,aNn:0,aGra:0,aOut:0,eOut:0,desp:2000,pl:1000};
 for(const k of ["S26n","PR26n","RE26n","RE27n","PR27n"])cfgs[k.replace(/n$/,"L")]={...cfgs[k],ficha:{...cfgs[k].ficha,...Z}};
 for(const cn of ["S26n","RE26n","PR26n","S27n","SR27n","RE27n","TOTREn","INI27n","RE26r","S26L","PR26L","RE26L","RE27L","PR27L"]){const cf=cfgs[cn]||cfgs[cn.replace(/n$/,"")];if(!cf){console.log("sem config",cn);continue}
  const ig=await run(cn,cf,null);await ig.ctx.close();
  console.log((cn+"/IG").padEnd(14),"resultado",String(ig.res).padStart(10),"ano",String(ig.ano).padStart(11),"render",ig.ms.toFixed(0)+" ms");
  for(const mk of Object.keys(MSs)){const o=await run(cn+"/"+mk,cf,MSs[mk]);
   ok(o.t12.length>=5,cn+"/"+mk+" tabela dos 12 meses ausente");
   const last=o.t12.find(r=>r[0]==="Resultado"), row=l=>o.t12.find(r=>r[0]===l);
   if(last){const s=last.slice(1,13).filter(v=>v!=="—").map(num).reduce((a,v)=>a+v,0);
     ok(Math.abs(s-num(last[13]))<0.13,cn+"/"+mk+" soma das colunas "+s.toFixed(2)+" ≠ ano "+last[13]);
     ok(Math.abs(num(last[13])-o.ano)<0.05,cn+"/"+mk+" ano da tabela "+last[13]+" ≠ KPI "+o.ano);
     for(let i=1;i<=12;i++){if(last[i]==="—")continue;const v=num(row("Receita bruta")[i])-num(row("(−) Tributos")[i])-num(row("(−) Pessoal")[i])-num(row("(−) Outras despesas e custos")[i]);ok(Math.abs(v-num(last[i]))<0.05,cn+"/"+mk+" mês "+i+" não fecha: "+v.toFixed(2)+" ≠ "+last[i])}}
   ok(o.dre.length>0&&o.dre.every(r=>r.nc===3),cn+"/"+mk+" DRE ausente ou com coluna Ano");
   const fim=o.dre.filter(r=>/tot/.test(r.cls)).pop();const fv=fim?(/Prejuízo/.test(fim.l)?-1:1)*Math.abs(num(fim.v)):null;ok(fim&&Math.abs(fv-o.res)<0.05,cn+"/"+mk+" DRE "+(fim&&fim.v)+" ≠ KPI "+o.res);
   if(mk==="SZ100"&&!/INI/.test(cn)&&!(cf.ficha.pfis>0)&&!(cf.ficha.bneg>0))ok(Math.abs(o.ano-ig.ano)<0.05&&Math.abs(o.res-ig.res)<0.05,cn+" SZ100 "+o.ano+"/"+o.res+" ≠ iguais "+ig.ano+"/"+ig.res);
   if(mk==="SZ"&&cn==="S26n"){
     await o.p.reload();await o.p.waitForTimeout(150);ok((await o.p.$eval("#m_modo",e=>e.value))==="SZ"&&(await o.p.$$("#msGrid input")).length===24,"reload perdeu o MS");
     await o.p.evaluate(()=>document.querySelector("#reset").click());await o.p.waitForTimeout(100);ok((await o.p.$eval("#m_modo",e=>e.value))==="IG"&&(await o.p.$$("#msGrid input")).length===0&&(await o.p.evaluate(()=>JSON.parse(localStorage.getItem("sts-ficha-v2-mes")).modo))==="IG","reset não limpou o MS");}
   console.log((cn+"/"+mk).padEnd(14),"resultado",String(o.res).padStart(10),"ano",String(o.ano).padStart(11),"render",o.ms.toFixed(0)+" ms");await o.ctx.close()}}
 console.log("casos",n,"falhas",bad,"| erros de script:",errs.length?errs:"nenhum");await b.close()})();
