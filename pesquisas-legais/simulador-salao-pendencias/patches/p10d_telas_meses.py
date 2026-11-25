"""Patch 10d: item 7, telas com os meses do ano (BRIEF-ITEM7-MESES §4; forks F7-4 e F7-5 em DECISOES).

Com sazonalidade ou mês a mês (anoMeses não nulo):
- c = o mês da competência da aba DAS dentro do ano (c.am = AM), com lucroAno = soma dos 12 meses e limIsento = teto do ano somado;
  KPIs, DAS, Equipe, Lucro, O mês e o Demonstrativo usam esse mês. Cadastros, CLT × parceria, Insumos e as viradas seguem no mês da ficha (cF).
- Aba 1: total do ano por regime (anoRegimes, sem os valores digitados da aba DAS, como a comparação de antes); sugestão do regime pelo ano.
- Demonstrativo: tabela dos 12 meses + ano; a DRE é a do mês da competência, sem a coluna "Ano" (que era 12 × o mês).
- Fora do Simples: IRPJ e CSLL do período (trimestre ou ajuste anual) no DAS, no LALUR e no calendário.
Em "iguais" (AM nulo) todo trecho novo fica desligado e a página sai igual à de antes.
Uso: python p10d_telas_meses.py <html>   (depois do p10c)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = []
# --- render(): o mês da competência dentro do ano ---
R.append(("  const c=cenarioReg({...x,...dasX(x.ano)},\"CAD\",REG), parc=c.parc;",
          "  // meses v1: com sazonalidade ou mês a mês, c é o mês da competência da aba DAS dentro do ano (anoMeses), com o lucro do ano e o teto somados;\n"
          "  // Cadastros, CLT × parceria, Insumos e as viradas seguem no mês da ficha (cF). Em \"iguais\", AM é nulo e c é o de antes.\n"
          "  const D0=dasX(x.ano), AM=anoMeses(x,\"CAD\",REG,D0), cm0=AM&&AM.meses[D0.mes-1]; if(AM)AM.regAno=anoRegimes(x);\n"
          "  const cF=cenarioReg({...x,...D0},\"CAD\",REG), c=cm0?{...cm0,am:AM,lucroAno:AM.ano.resultado,limIsento:AM.ano.limIsento,lucroTribAno:AM.ano.lucroTrib}:cF, parc=c.parc;"))
R.append(("\n  renderEqSum(c); updateEqTotals(c);", "\n  renderEqSum(cF); updateEqTotals(cF); updMS(x,AM);"))
R.append(("renderDash(x,c,A,B); renderInsumos(x,c);", "renderDash(x,c,A,B); renderInsumos(x,cF);"))
# KPIs
R.append(("c.limIsento==null?\"12 meses iguais\":\"teto isento sem contabilidade: \"+R(c.limIsento)+\" por ano\"]",
          "c.limIsento==null?(c.am?\"soma dos 12 meses\":\"12 meses iguais\"):(c.am?\"soma dos 12 meses · teto isento: \":\"teto isento sem contabilidade: \")+R(c.limIsento)+\" por ano\"]"))
R.append(("  ].map(([t,v,s])=>`<div class=\"kpi\"><small>${t}</small><span class=\"v\">${v}</span><small>${s}</small></div>`).join(\"\");",
          "  ].map(([t,v,s],i)=>`<div class=\"kpi\"><small>${t}</small><span class=\"v\">${v}</span><small>${c.am&&i<3?\"em \"+String(c.mesN).padStart(2,\"0\")+\"/\"+x.ano+\" · \":\"\"}${s}</small></div>`).join(\"\");"))
# aba DAS: o perfil dos meses no lugar de 12 × o mês
R.append(("sug=ia&&ia.rbt!=null?ia.rbt:c.recMes*12", "sug=ia&&ia.rbt!=null?ia.rbt:c.am?c.rbt:c.recMes*12"))
R.append(("(c.rbtInf?\"Valor digitado: vale para o DAS", "(c.rbtInf&&!c.rbtPerfil?\"Valor digitado: vale para o DAS"))
R.append(("(regraTx?\"Vazio: \"+regraTx:\"Vazio: 12 × a receita do mês da ficha. \"+janTx)",
          "(regraTx?\"Vazio: \"+regraTx:(c.am?\"Vazio: a soma desses 12 meses no perfil do bloco \\\"Meses do ano\\\" da ficha. \":\"Vazio: 12 × a receita do mês da ficha. \")+janTx)"))
R.append(("const vz=k=>(ap.defFicha?", "const vz=k=>c.am?\"Vazio: a soma desses meses no perfil do bloco \\\"Meses do ano\\\" da ficha.\":(ap.defFicha?"))
R.append(("(ap.rbaInf?\"Valor digitado.\":vz(kAnt))", "(ap.rbaInf&&!(c.am&&dasNum(DS.rba)==null)?\"Valor digitado.\":vz(kAnt))"))
R.append(("(ap.antInf?\"Valor digitado.\":\"Vazio: igual ao RBT12.\")",
          "(c.am?(c.am.temAnt?\"Vem da grade do ano passado, no bloco \\\"Meses do ano\\\" da ficha.\":dasNum(DS.ant)!=null?\"Valor digitado: o ano passado segue o perfil deste ano, escalado para somar este valor.\":\"Vazio: o ano passado no mesmo perfil deste ano.\"):ap.antInf?\"Valor digitado.\":\"Vazio: igual ao RBT12.\")"))
R.append(("ap.ini===\"seg\"?(ap.antInf?\"Valor digitado.\":vz(ia.meses))", "ap.ini===\"seg\"?(ap.antInf&&!(c.am&&dasNum(DS.ant)==null)?\"Valor digitado.\":vz(ia.meses))"))
R.append(("${c.rbtInf?\"\":ia&&(ia.regra===\"media\"", "${c.rbtPerfil?\" (soma do perfil dos meses)\":c.rbtInf?\"\":ia&&(ia.regra===\"media\""))
# equipe: o mês
R.append(("h+=`<p class=\"eq-line\"><b>${time.length}", "h+=`<p class=\"eq-line\">${c.am?\"Competência \"+String(c.mesN).padStart(2,\"0\")+\"/\"+x.ano+\" · \":\"\"}<b>${time.length}"))
# parceria e sugestões: a comparação fica no mês da ficha
R.append(("${c.rbtInf&&(c.reg===\"S\"||c.reg===\"SR\")?`<p class=\"law\">Os cartões desta comparação",
          "${c.am?'<p class=\"law\">A comparação usa o mês da ficha, sem os meses do ano; o topo, o DAS e o demonstrativo usam a competência da aba DAS dentro do ano.</p>':\"\"}${!c.am&&c.rbtInf&&(c.reg===\"S\"||c.reg===\"SR\")?`<p class=\"law\">Os cartões desta comparação"))
R.append(("const rbt=c&&c.rbtInf&&(c.reg===\"S\"", "const rbt=c&&!c.am&&c.rbtInf&&(c.reg===\"S\""))
R.append(("  const S=sugestoes(x,REG);\n", "  const S=sugestoes(x,REG); if(c.am)amSug(S,c,x);\n"))
# aba 1: o ano somado por regime
R.append(("  const rank=RR=>[\"S\",\"PR\",\"RE\"].filter(k=>RR[k]).sort((a,b)=>totReg(RR,a)-totReg(RR,b));",
          "  // meses v1: com os meses do ano, a comparação é a soma dos 12 meses de cada regime (AA); tR é a média do mês\n"
          "  const AA=c.am&&c.am.regAno, has=(RR,k)=>AA?!!AA[RR.ano][k]:!!RR[k], tR=(RR,k)=>AA?(AA[RR.ano][k]?AA[RR.ano][k].trib/12:null):totReg(RR,k);\n"
          "  const rank=RR=>[\"S\",\"PR\",\"RE\"].filter(k=>has(RR,k)).sort((a,b)=>tR(RR,a)-tR(RR,b));"))
R.append(("dif=seg?totReg(RF,seg)-totReg(RF,best):0", "dif=seg?tR(RF,seg)-tR(RF,best):0"))
R.append(("<b>${R(dif)} a menos por mês</b>, cerca de <b>${R(dif*12)} por ano</b>, que o ${NOME[seg]}.</p>\n    <p class=\"rg2-sub\">${usa} O valor por ano supõe os 12 meses iguais ao da ficha.</p></div>`;",
          "${AA?`<b>${R(dif*12)} a menos no ano</b>, ${R(dif)} por mês na média, que o ${NOME[seg]}.`:`<b>${R(dif)} a menos por mês</b>, cerca de <b>${R(dif*12)} por ano</b>, que o ${NOME[seg]}.`}</p>\n    <p class=\"rg2-sub\">${usa} ${AA?amRgTx(AA[anoF]):\"O valor por ano supõe os 12 meses iguais ao da ficha.\"}</p></div>`;"))
R.append(("  h+=`<div class=\"rg2-cards\">${ord.map(k=>{const r=RF[k], ro=RO[k];",
          "  h+=`<div class=\"rg2-cards\">${ord.map(k=>{const r=has(RF,k), ro=has(RO,k);"))
R.append(("${r?`<span class=\"rg2-v\">${R(totReg(RF,k))} <small>de imposto por mês</small></span>\n      <span class=\"rg2-k\">${RF.b+RF.rev>0?`<b>${R(totReg(RF,k)/(RF.b+RF.rev)*100)}</b>",
          "${r?`<span class=\"rg2-v\">${R(tR(RF,k))} <small>${AA?\"de imposto por mês, na média do ano\":\"de imposto por mês\"}</small></span>\n      <span class=\"rg2-k\">${(AA?AA[anoF][k].rec:RF.b+RF.rev)>0?`<b>${R(AA?AA[anoF][k].trib/AA[anoF][k].rec*100:totReg(RF,k)/(RF.b+RF.rev)*100)}</b>"))
R.append(("${ro?`<b>${R(totReg(RO,k))}</b> por mês`:\"fora do limite\"}", "${ro?`<b>${R(tR(RO,k))}</b> por mês${AA?\", na média\":\"\"}`:\"fora do limite\"}"))
R.append(("Onde duas linhas se cruzam (os números nos círculos), o regime mais barato troca.",
          "Onde duas linhas se cruzam (os números nos círculos), o regime mais barato troca.${AA?\" Os gráficos usam o mês da ficha, sem os meses do ano.\":\"\"}"))
# aba 5 e LALUR
R.append(("− IRPJ do DAS =</span><b>${R(c.limIsento)}</b>", "− IRPJ do DAS${c.am?\", somado nos 12 meses\":\"\"} =</span><b>${R(c.limIsento)}</b>"))
R.append(("<div class=\"row\"><span>IRPJ e CSLL do ano no ${NOME[c.reg]}</span><b>${R(g.lucro*12)}</b></div>",
          "<div class=\"row\"><span>IRPJ e CSLL do ano no ${NOME[c.reg]}</span><b>${R(c.am?c.lucroTribAno:g.lucro*12)}</b></div>"))
R.append((") × 12 =</span><b>${R(c.limIsento)}</b>", ")${c.am?\", somado nos 12 meses\":\" × 12\"} =</span><b>${R(c.limIsento)}</b>"))
R.append(("function lalurTab(c){const l=c.regs&&c.regs.lalur;if(!l||c.reg!==\"RE\")return\"\";",
          "function lalurTab(c){const l=c.regs&&c.regs.lalur;if(!l||c.reg!==\"RE\")return\"\";if(c.lucroPer)return lalurPer(c);"))
# DAS fora do Simples e calendário: o período
R.append(("    +tabelaRegime(c.regs,[c.reg],x.ano+\" · \"+NOME[c.reg])\n", "    +tabelaRegime(c.regs,[c.reg],x.ano+\" · \"+NOME[c.reg])+perNota(c,x)\n"))
R.append(("    [\"Fim de abr, jul, out e jan\",\"IRPJ e CSLL do trimestre\",", "    ...(c.lucroPer?calPer(c,x,q):[[\"Fim de abr, jul, out e jan\",\"IRPJ e CSLL do trimestre\","))
R.append(("(arts. 2º e 6º)\":\"\")]]}", "(arts. 2º e 6º)\":\"\")]])]}"))
# demonstrativo: 12 meses; a DRE é a do mês, sem a coluna Ano
R.append(("${cell(v*12,neg)}", "${c.am?\"\":cell(v*12,neg)}", 2))
R.append(("<th class=\"r\">Mês</th><th class=\"r\">Ano</th>", "<th class=\"r\">${c.am?String(c.mesN).padStart(2,\"0\")+\"/\"+x.ano:\"Mês\"}</th>${c.am?\"\":'<th class=\"r\">Ano</th>'}", 2))
R.append(("${cell(rb)}${cell(rb*12)}", "${cell(rb)}${c.am?\"\":cell(rb*12)}", 2))
R.append(("${cell(c.repasse)}${cell(c.repasse*12)}", "${cell(c.repasse)}${c.am?\"\":cell(c.repasse*12)}"))
R.append(("${cell(c.repCnpj)}${cell(c.repCnpj*12)}", "${cell(c.repCnpj)}${c.am?\"\":cell(c.repCnpj*12)}"))
R.append(("[\"Resultado do ano\",R(res*12),\"12 meses iguais\"]", "[\"Resultado do ano\",R(c.am?c.lucroAno:res*12),c.am?\"soma dos 12 meses\":\"12 meses iguais\"]", 2))
R.append(("[\"IRPJ e CSLL do ano\",R(g.lucro*12),NOME[c.reg]]", "[\"IRPJ e CSLL do ano\",R(c.am?c.lucroTribAno:g.lucro*12),NOME[c.reg]]"))
R.append(("${c.foraSimples?\", fora do Simples pela receita\":\", escolhido na aba Regime\"}.</p>`;", "${c.foraSimples?\", fora do Simples pela receita\":\", escolhido na aba Regime\"}.</p>`;\n  h+=tab12(x,c);"))
R.append(("  // DRE\n  h+=`<div class=\"dash-grid\">", "  h+=tab12(x,c);\n  // DRE\n  h+=`<div class=\"dash-grid\">"))
R.append(("<p class=\"law\">A parceria só vale com contrato homologado e parceiros com CNPJ (aba 4).</p>",
          "<p class=\"law\">A parceria só vale com contrato homologado e parceiros com CNPJ (aba 4).${c.am?\" Os dois cenários usam o mês da ficha, sem os meses do ano.\":\"\"}</p>", 2))
R.append(("(item 3.6), com meses iguais.", "(item 3.6), ${c.am?\"do mês \"+String(c.mesN).padStart(2,\"0\")+\"/\"+x.ano+\" dentro do ano; a tabela dos 12 meses soma o ano\":\"com meses iguais\"}.", 2))

FUN = r'''/* ===== meses v1 (item 7): telas do ano mês a mês ===== */
// total do ano em cada regime, para a aba 1: sem os valores digitados da aba DAS (a comparação de antes também não os usa), com a abertura do CNPJ
function anoRegimes(x){const D={ini:DS_INI(),recAnoAnt:dasNum(DS.ant)}, o={};
  [2026,2027].forEach(a=>{const xa={...x,ano:String(a)}, r={};
    [["S",{r:"S"}],["PR",{r:"PR"}],["RE",{r:"RE"}],...(a>=2027?[["SR",{r:"S",sr:true}]]:[])].forEach(([k,rg])=>{const A=anoMeses(xa,"CAD",rg,D);if(!A)return;
      const on=A.meses.filter(Boolean), fora=on.filter(m=>m.reg!==k).length;
      r[k]=on.length&&(fora<on.length||k==="PR"||k==="RE")?{trib:A.ano.trib,rec:A.ano.rec,fora,n:on.length}:null});
    o[a]=r});return o}
function amRgTx(A){const S=A&&A.S;
  return "O ano soma os 12 meses do bloco \"Meses do ano\" da ficha: o DAS de cada mês sai do RBT12 daquele mês, e o IRPJ e a CSLL fora do Simples saem por período."
    +(S&&S.fora>0?" No Simples, "+S.fora+(S.fora===1?" mês fica":" meses ficam")+" acima do limite pela receita e "+(S.fora===1?"entra":"entram")+" no Presumido ou no Real.":"")}
// a sugestão do regime e do lucro isento segue a soma do ano, como a aba 1 e a aba 5
function amSug(S,c,x){
  if(S.contab&&c.limIsento!=null){S.contab={...S.contab,lucroAno:c.lucroAno,teto:c.limIsento,extra:Math.max(0,c.lucroAno-c.limIsento)};
    S.prol.cabeIsento=Math.max(0,(S.contab.extra>0?S.contab.lucroAno:S.contab.teto)-Math.max(0,c.lucroAno))}
  const A=c.am.regAno&&c.am.regAno[+x.ano]; if(!A)return;
  const r=S.regime, T=k=>A[k]?A[k].trib/12:null, ord=["S","PR","RE"].filter(k=>A[k]).sort((a,b)=>T(a)-T(b)); if(!ord.length)return;
  const alvo=ord[0]==="S"&&REG.sr&&A.SR?"SR":ord[0], cur=A[r.curK]?r.curK:null;
  Object.assign(r,{best:ord[0],seg:ord[1],ordem:ord,tot:Object.fromEntries(ord.map(k=>[k,T(k)])),dif:ord.length>1?T(ord[1])-T(ord[0]):0,
    perda:A.S&&ord[0]!=="S"?T("S")-T(ord[0]):0,ganho:cur&&A[alvo]?Math.max(0,T(cur)-T(alvo)):0});
  if(+x.ano===2027&&A.S&&A.SR)S.sr={opta:A.SR.trib<A.S.trib,dif:(A.SR.trib-A.S.trib)/12}}
// IRPJ e CSLL do período (trimestre ou ajuste anual) na aba DAS
function perNota(c,x){const P=c.lucroPer;if(!P)return"";const per=P.lbl==="ajuste anual"?"do ano":"do "+P.lbl, ms=P.n+(P.n===1?" mês":" meses"), E=c.am&&c.am.est, i=c.mesN-1;
  return`<div class="callout info"><b>IRPJ e CSLL ${per}: IRPJ ${R(P.I)} e CSLL ${R(P.C)}; a parte de ${String(c.mesN).padStart(2,"0")}/${x.ano} é ${R(P.Ish+P.Csh)}.</b><span>${P.reg==="PR"?"Base: a presunção sobre a receita dos "+ms:"Base: o lucro real dos "+ms}, ${R(P.LI)} no IRPJ${P.cI>0?" depois de compensar "+R(P.cI)+" de prejuízo fiscal":""}, com adicional de 10% acima de ${R(20000*P.n)} (R$ 20 mil × ${ms}; Lei 9.249 art. 3º § 1º; Lei 9.430 arts. 1º e 25). Cada mês leva a parte do período na proporção da base dele. A tabela acima mostra o mês sozinho, com o adicional sobre R$ 20 mil.</span>${E&&P.lbl==="ajuste anual"?`<span>Estimativa deste mês: IRPJ ${R(E.I[i])} e CSLL ${R(E.C[i])}, pagos até o último dia útil do mês seguinte${c.am.real==="ESTB"?", já reduzidos pelo balancete de suspensão (Lei 8.981 art. 35)":""} (Lei 9.430 arts. 2º e 6º). Saldo do ajuste anual: IRPJ ${R(E.ajI)} e CSLL ${R(E.ajC)}, no último dia útil de março${E.ajI<0||E.ajC<0?"; negativo, é saldo a compensar":""} (art. 6º § 1º I).</span>`:""}</div>`}
function calPer(c,x,q){const P=c.lucroPer, E=c.am&&c.am.est, i=c.mesN-1, mm=String(c.mesN).padStart(2,"0")+"/"+x.ano;
  if(P.lbl==="ajuste anual"&&E)return[["Último dia útil","Estimativa de IRPJ e CSLL do mês anterior","IRPJ "+R(E.I[i])+" e CSLL "+R(E.C[i])+" de "+mm+(c.am.real==="ESTB"?", reduzidos pelo balancete (Lei 8.981 art. 35)":"")+" (Lei 9.430 arts. 2º e 6º)"],
    ["Último dia útil de março","IRPJ e CSLL: saldo do ajuste anual","IRPJ "+R(E.ajI)+" e CSLL "+R(E.ajC)+" do ano de "+x.ano+", no ano seguinte (Lei 9.430 art. 6º § 1º I)"]];
  return[["Fim do mês seguinte ao trimestre","IRPJ e CSLL do "+P.lbl,"IRPJ "+R(P.I)+" e CSLL "+R(P.C)+", até o último dia útil do mês seguinte. IRPJ "+q(P.I)+"; CSLL "+q(P.C)+" (Lei 9.430 arts. 1º, 5º e 28)"]]}
// LALUR do período: os ajustes do mês e o lucro real do trimestre ou do ano
function lalurPer(c){const l=c.regs.lalur, P=c.lucroPer, per=P.lbl==="ajuste anual"?"o ano":"o "+P.lbl;
  const r=(t,i,s,cls="")=>`<tr class="${cls}"><td>${t}</td><td class="r">${i==null?"—":R(i)}</td><td class="r">${s==null?"—":R(s)}</td></tr>`;
  let t=r("Lucro contábil do mês antes do IRPJ e da CSLL",l.Lc+l.Lrev,l.Lc+l.Lrev);
  l.it.filter(i=>i[1]>0).forEach(i=>{t+=r("(+) "+i[0],i[1],i[2]?i[1]:null,"sub")});
  if(l.provNd>0)t+=r("(+) Provisão de rescisão e encargos dela (A.178)",l.provNd,l.provNd,"sub");
  if(l.exc>0)t+=r("(−) Exclusões",-l.exc,-l.exc,"sub");
  t+=r("Lucro ajustado do mês",l.TI,l.TC,"tot");
  const u=r("Lucro ajustado d"+per+" ("+P.n+(P.n===1?" mês":" meses")+")",P.SI,P.SC,"tot")+r("(−) Compensação de prejuízo fiscal e base negativa (até 30%)",-P.cI,-P.cC,"sub")
    +r("Lucro real e base da CSLL",P.LI,P.LC,"tot")+r("IRPJ (15% + 10% acima de "+R(20000*P.n)+") e CSLL (9%)",P.I,P.C)+r("Parte deste mês",P.Ish,P.Csh,"sub");
  const th=`<thead><tr><th></th><th class="r">IRPJ</th><th class="r">CSLL</th></tr></thead>`;
  return`<h3>Do lucro contábil ao lucro real</h3><div class="tbl-wrap"><table class="eq-tot">${th}<tbody>${t}</tbody></table></div><div class="tbl-wrap"><table class="eq-tot">${th}<tbody>${u}</tbody></table></div>
   <p class="law">Adições e exclusões do bloco "Ajustes do lucro real" da ficha (IN RFB 1.700 arts. 62, 63 e Anexos I e II), mês a mês. O lucro real é d${per} (Lei 9.430 arts. 1º e 2º § 3º). A compensação consome o saldo da ficha em ordem, até 30% do lucro ajustado de cada período (Lei 9.065 arts. 15 e 16). A CSLL não é dedutível do IRPJ (A.058).</p>`}
// tabela dos 12 meses do demonstrativo (competência)
function tab12(x,c){if(!c.am)return"";const ms=c.am.meses, cur=c.mesN, temP=ms.some(m=>m&&m.lucroPer);
  const pes=m=>m.folha+m.enc.ben+m.enc.vt+m.enc.pl, out=m=>outrosC(m,x)-m.enc.ben-m.enc.vt-m.enc.pl;
  const L=[["Receita bruta",m=>m.recMes],["(−) Tributos",m=>m.tribTot||0],...(temP?[["dos quais IRPJ e CSLL",m=>m.tribG?m.tribG.lucro:0,"sub"]]:[]),["(−) Pessoal",pes],["(−) Outras despesas e custos",out],["Resultado",m=>m.resultado,"tot"]];
  const rows=L.map(([l,f,cls])=>{let s=0;const cs=ms.map((m,i)=>{const v=m?f(m):null;if(v!=null)s+=v;return`<td class="r num${i+1===cur?" cur":""}">${v==null?"—":R(v)}</td>`}).join("");
    return`<tr class="${cls||""}"><td>${l}</td>${cs}<td class="r num">${R(s)}</td></tr>`}).join("");
  const regs=[...new Set(ms.filter(Boolean).map(m=>m.reg))];
  return`<div class="card" style="gap:10px"><h3>Os 12 meses de ${x.ano}</h3><div class="tbl-wrap"><table class="mes12"><thead><tr><th></th>${MESN.map((n,i)=>`<th class="r${i+1===cur?" cur":""}">${n}</th>`).join("")}<th class="r">Ano</th></tr></thead><tbody>${rows}</tbody></table></div>
   <p class="law">Por competência: 13º, férias e os tributos entram como provisão no mês a que pertencem${temP?"; o IRPJ e a CSLL de cada período são repartidos pelos meses na proporção da base de cada um, e o pagamento vence no mês seguinte ao trimestre (ou, na estimativa, no mês seguinte e no ajuste de março)":""}. A coluna destacada é a competência da aba DAS, aberta na demonstração abaixo.${regs.length>1?" Os meses não estão todos no mesmo regime: "+regs.map(k=>CURTO[k]).join(", ")+".":""}${ms.some(m=>!m)?" Os meses antes da abertura do CNPJ ficam fora.":""}</p></div>`}

/* ===== resumo do catálogo ===== */'''
R.append(("/* ===== resumo do catálogo ===== */", FUN))

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p10d")
