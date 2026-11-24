// uso: node t20d-exemplo.js <html>  — caso do item 20d do BRIEF-GRUPO-LACUNAS-2026-11-24 (lacuna 60ca; falha na v51, passa com p17)
// Lê o DEF, o DEF_CAT e o DEF_EQ da própria página (não do def2.js). Confere:
// - nenhum dos seis custos do exemplo (insumo, cartão, rotatividade, vale-transporte, equipamentos, pró-labore) fica em zero sem aviso,
//   e cada valor preenchido tem fonte no rodapé (DEF_FONTES → #exFontes);
// - os valores são os do dossiê pesquisas-legais/salao-padrao-mercado-sp: insumo 7,2% do preço, pró-labore R$ 1.621 por sócio;
// - o resultado sai como faixa (F-SIM-7): a ponta alta é o resultado do exemplo, a baixa leva insumo 9,4%, pró-labore R$ 5.635 e cartão 1,79%.
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const calc=h.slice(h.indexOf('const T3='),h.indexOf('/* ===== /CALC'));
const defs=h.slice(h.indexOf('const DEF={'),h.indexOf('let EQ='));
let bad=0,n=0;const ok=(c,msg)=>{n++;if(!c){bad++;console.log("FALHA",msg)}};
eval(calc+defs+`
const temF=typeof DEF_FONTES!=="undefined";
ok(temF,"DEF_FONTES não existe na página");
const F=k=>temF?DEF_FONTES.find(d=>d.k===k):null;
const insCat=DEF_CAT.sv.reduce((a,s)=>a+(+s.i||0)*s.m,0), serv=DEF_CAT.sv.reduce((a,s)=>a+s.p*s.m,0);
const val={insumo:DEF.fonte==="CAT"?insCat:DEF.insumo,mdr:DEF.mdr,rot:DEF.rot,vt:DEF.vt,bens:(DEF_CAT.bens||[]).length,pl:DEF.pl};
for(const k of Object.keys(val)){const d=F(k);
  ok(!!d,k+": sem registro em DEF_FONTES");
  if(!d)continue;
  if(val[k]>0)ok(!!d.fonte&&d.fonte.length>20,k+" = "+val[k]+": sem fonte");
  else ok(!!d.aviso&&d.aviso.length>20,k+" em zero sem aviso");}
// valores do dossiê
ok(DEF_CAT.sv.every(s=>Math.abs((+s.i||0)-.072*s.p)<0.005),"insumo por atendimento ≠ 7,2% do preço");
ok(Math.abs(insCat-.072*serv)<0.01&&Math.abs(insCat-2880)<0.01,"insumo do mês "+insCat+" esperado 2880");
ok(DEF.insumo===2880,"DEF.insumo (modo ficha) "+DEF.insumo+" esperado 2880");
ok(DEF.pl===1621*DEF.soc,"pró-labore "+DEF.pl+" esperado "+1621*DEF.soc);
ok(DEF.vt===0&&DEF.rot===0&&DEF.mdr===0&&(DEF_CAT.bens||[]).length===0,"campo sem padrão preenchido no exemplo");
ok(JSON.stringify(DEF_EQ.map(p=>p.s))==="[6000,6000,2000,2000]","DEF_EQ mudou: o dossiê não traz valor para a equipe");
// rodapé e aviso do exemplo usam o DEF_FONTES
ok(h.includes('<div id="exFontes"></div>')&&h.includes('$("#exFontes").innerHTML=exFontesHtml();'),"rodapé sem as fontes do exemplo");
if(temF){const rod=exFontesHtml();for(const d of DEF_FONTES)ok(rod.includes(d.fonte||d.aviso),d.k+": fonte ou aviso fora do rodapé");}
ok(/\\$\\("#exNote"\\)\\.innerHTML=isEx\\?[^\\n]*DEF_FONTES/.test(h),"aviso do exemplo não cita as fontes");
// faixa do resultado
if(temF){const servPor={};DEF_EQ.forEach(p=>servPor[p.id]=0);const insPor={};DEF_CAT.sv.forEach(s=>{servPor[s.q]+=s.p*s.m;insPor[s.q]=(insPor[s.q]||0)+s.i*s.m});
  const x={...DEF,eq:DEF_EQ,serv,servPor,insumo:insCat,insPor,ins:{fora:0,cos:100,inter:"0.12",forn:"REG",cred27:"S"}};
  for(const reg of [{r:"S"},{r:"PR"},{r:"RE"}]){const D0={mes:6}, fx=faixaEx(x,reg,D0), c=cenarioReg({...x,...D0},"CAD",reg);
    ok(Math.abs(fx.alto-c.resultado)<0.01,reg.r+": ponta alta "+fx.alto+" ≠ resultado "+c.resultado);
    const ch=cenarioReg({...x,...D0,insumo:insCat*.094/.072,pl:5635*DEF.soc,mdr:1.79},"CAD",reg);
    ok(fx.baixo<fx.alto&&Math.abs(fx.baixo-ch.resultado)<0.01,reg.r+": ponta baixa "+fx.baixo+" esperada "+ch.resultado);}
  ok(h.includes('fx?"exemplo: de "+R(fx.baixo)+" a "+R(fx.alto)'),"KPI sem a faixa");}
console.log("casos",n,"falhas",bad);
`);
