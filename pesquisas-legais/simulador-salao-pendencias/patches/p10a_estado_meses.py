"""Patch 10a: item 7, contrato de dados e ficha (BRIEF-ITEM7-MESES §2 e §4; forks F7-1 a F7-4 em DECISOES).

Estado à parte da ficha, como DS e INS: MKEY = KEY+"-mes", MS = {modo:"IG"|"SZ"|"MM", f, r, rv, ant (12 textos cada), real:"TRI"|"EST"|"ESTB"}.
Textos crus como no DS: vazio no fator vale 100; 0 é mês fechado; vazio na receita vale o mês da ficha; vazio na revenda acompanha os serviços;
vazio no ano passado = mesmo perfil. Fora do readForm (isEx não muda) e fora do listener genérico da ficha (data-ms).
effective() devolve x.meses = {modo, sv, rv, ant, real} em R$ quando o modo não é "iguais"; em "iguais" o objeto é o de antes.
Uso: python p10a_estado_meses.py <html>   (antes do p10b)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = []
# CSS
R.append(("ul.vir b:first-child{display:inline-grid;",
          "/* meses v1: bloco Meses do ano da ficha */\n"
          ".ms-fset{grid-column:1/-1}\n"
          ".ms-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}\n"
          ".ms-c{display:grid;gap:2px;font:12px var(--f-mono);color:var(--muted)}\n"
          ".ms-c input{min-width:0;width:100%;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);font:500 14px var(--f-mono);padding:7px 8px;text-align:right}\n"
          ".ms-c input:focus{outline:none;border-color:var(--berry);box-shadow:0 0 0 3px var(--berry-soft)}\n"
          "table.mes12 td,table.mes12 th{padding:6px 8px}\n"
          "table.mes12 td:first-child{position:sticky;left:0;background:var(--paper);white-space:normal;min-width:150px}\n"
          "table.mes12 tr.tot td{font-weight:700;border-top:2px solid var(--line)}\n"
          "table.mes12 .cur{background:var(--teal-soft)}\n"
          "ul.vir b:first-child{display:inline-grid;"))
# seletor do Real, no bloco Fora do Simples
R.append(("Vazio: 32%.</small></div>\n      </div>\n      </fieldset>",
          "Vazio: 32%.</small></div>\n"
          "        <div class=\"fld\"><label for=\"m_real\">Lucro Real: apuração do IRPJ e da CSLL</label><select class=\"das-sel\" id=\"m_real\" data-ms><option value=\"TRI\">Trimestral</option><option value=\"EST\">Anual, com estimativa mensal</option><option value=\"ESTB\">Anual, estimativa com balancete de suspensão</option></select><small id=\"m_realNote\"></small></div>\n"
          "      </div>\n      </fieldset>"))
# bloco Meses do ano, depois dos Ajustes do lucro real
R.append(("      </fieldset>\n    </div>\n    <div class=\"pager\"><button class=\"btn\" id=\"reset\" type=\"button\">Voltar ao exemplo</button>",
          "      </fieldset>\n"
          "      <fieldset class=\"fset ms-fset\"><legend>Meses do ano</legend>\n"
          "      <div class=\"fgrp\">\n"
          "        <div class=\"fld\"><label for=\"m_modo\">Receita ao longo do ano</label><select class=\"das-sel\" id=\"m_modo\" data-ms><option value=\"IG\">Iguais: 12 vezes o mês da ficha</option><option value=\"SZ\">Sazonalidade: % de cada mês sobre o mês da ficha</option><option value=\"MM\">Mês a mês: a receita de cada mês</option></select><small id=\"m_modoNote\"></small></div>\n"
          "        <div id=\"msGrid\"></div>\n"
          "        <p class=\"example\" id=\"msSum\" hidden></p>\n"
          "      </div>\n"
          "      </fieldset>\n"
          "    </div>\n    <div class=\"pager\"><button class=\"btn\" id=\"reset\" type=\"button\">Voltar ao exemplo</button>"))
# effective(): x.meses
R.append(("  if(x.fonte!==\"CAT\")return{...x,...lig,eq,mod,ins};",
          "  if(x.fonte!==\"CAT\")return mesesX({...x,...lig,eq,mod,ins});"))
R.append(("  return{...x,...lig,eq,mod,ins,serv:t.serv,servPor:t.servPor,rev:t.rev,cmv:t.cmv,insumo:t.insumo,insPor:t.insPor};",
          "  return mesesX({...x,...lig,eq,mod,ins,serv:t.serv,servPor:t.servPor,rev:t.rev,cmv:t.cmv,insumo:t.insumo,insPor:t.insPor});"))
# o listener genérico da ficha não pega os campos do MS (eles gravam o MS e depois chamam render)
R.append(("document.querySelectorAll(\"#p-ficha input\").forEach(el=>el.addEventListener(\"input\",render));\ndocument.querySelectorAll(\"#p-ficha select\").forEach(el=>el.addEventListener(\"change\",render));",
          "document.querySelectorAll(\"#p-ficha input:not([data-ms])\").forEach(el=>el.addEventListener(\"input\",render));\ndocument.querySelectorAll(\"#p-ficha select:not([data-ms])\").forEach(el=>el.addEventListener(\"change\",render));"))
MS = r'''/* ===== meses v1 (item 7): bloco "Meses do ano" da ficha (estado à parte, como o da aba DAS) ===== */
const MKEY=KEY+"-mes", MESN=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const msVaz=()=>Array(12).fill(""), msDef=()=>({modo:"IG",f:msVaz(),r:msVaz(),rv:msVaz(),ant:msVaz(),real:"TRI"});
const msArr=a=>Array.from({length:12},(_,i)=>{const v=Array.isArray(a)?a[i]:"";return typeof v==="string"?v:typeof v==="number"&&isFinite(v)&&v>=0?String(v):""});
let MS=msDef(), MS_ANT=false;
try{const v=JSON.parse(localStorage.getItem(MKEY)||"null");if(v&&typeof v==="object")MS={modo:["SZ","MM"].includes(v.modo)?v.modo:"IG",f:msArr(v.f),r:msArr(v.r),rv:msArr(v.rv),ant:msArr(v.ant),real:["EST","ESTB"].includes(v.real)?v.real:"TRI"}}catch(e){}
function saveMS(){try{localStorage.setItem(MKEY,JSON.stringify(MS))}catch(e){}}
// x.meses em R$: SZ, serviços e revenda × fator (F7-1: sem normalizar; F7-2: revenda proporcional); MM, os digitados (revenda vazia acompanha os serviços)
function mesesX(o){if(MS.modo!=="SZ"&&MS.modo!=="MM")return o;
  const s=numP(o.serv), v=numP(o.rev), sv=[], rv=[];
  for(let i=0;i<12;i++){if(MS.modo==="SZ"){const f=dasNum(MS.f[i]), k=(f==null?100:f)/100;sv.push(s*k);rv.push(v*k)}
    else{const a=dasNum(MS.r[i]), m=a==null?s:a, b=dasNum(MS.rv[i]);sv.push(m);rv.push(b!=null?b:s>0?v*m/s:v)}}
  return{...o,meses:{modo:MS.modo,sv,rv,ant:MS.ant.map(dasNum),real:MS.real}}}
function buildMS(){$("#m_modo").value=MS.modo;$("#m_real").value=MS.real;
  const g=$("#msGrid"); if(MS.modo!=="SZ"&&MS.modo!=="MM"){g.innerHTML="";return}
  const grade=(k,tit,step)=>`<div class="fld"><span class="lb">${tit}</span><div class="ms-grid">${MESN.map((n,i)=>`<label class="ms-c"><span>${n}</span><input type="number" min="0" step="${step}" inputmode="decimal" data-ms data-mk="${k}" data-mi="${i}" id="ms_${k}${i}" value="${esc(MS[k][i])}" aria-label="${esc(tit)}, ${n}"></label>`).join("")}</div></div>`;
  g.innerHTML=(MS.modo==="SZ"?grade("f","Cada mês, em % do mês da ficha",5):grade("r","Serviços de cada mês (R$)",500)+grade("rv","Revenda de cada mês (R$)",100))
    +`<details class="conta" id="msAnt"${MS_ANT?" open":""}><summary>Receita do ano passado, mês a mês</summary>${grade("ant","Receita bruta de cada mês do ano passado (R$)",1000)}<small>Entra no RBT12 de cada mês do ano da ficha (LC 123 art. 18 § 1º). Vazio: o ano passado no mesmo perfil deste ano; com a "Receita do ano passado inteiro" da aba DAS preenchida, esse perfil escalado para somar o valor dela. É a receita bruta do Simples, a mesma do PGDAS-D.</small></details>`;
  $("#msAnt").addEventListener("toggle",e=>{MS_ANT=e.target.open})}
// placeholders, notas e soma do ano; AM = anoMeses da página (null em "iguais")
function updMS(x,AM){const on=MS.modo==="SZ"||MS.modo==="MM", fmt=v=>(Math.round(v*100)/100).toLocaleString("pt-BR",{maximumFractionDigits:2}), s=numP(x.serv), v=numP(x.rev);
  $("#m_modoNote").textContent=MS.modo==="SZ"?"100% é o mês da ficha: dezembro a 140% vende 40% a mais. Vazio vale 100%; 0% é mês fechado. A revenda acompanha os serviços. Comissão e insumo acompanham os serviços do mês; salário fixo, despesas, depreciação e benefícios ficam iguais."
    :MS.modo==="MM"?"Vazio vale o mês da ficha. Revenda vazia acompanha os serviços do mês. Comissão e insumo acompanham os serviços; salário fixo, despesas, depreciação e benefícios ficam iguais."
    :"A conta usa 12 vezes o mês da ficha. Com sazonalidade ou mês a mês, o resultado do ano é a soma dos 12 meses, o DAS de cada mês sai do RBT12 daquele mês e o IRPJ e a CSLL fora do Simples saem por trimestre.";
  $("#m_real").disabled=!on;
  $("#m_realNote").textContent=on?"Trimestral: o lucro de cada trimestre, com adicional acima de R$ 60 mil (Lei 9.430 art. 1º; Lei 9.249 art. 3º § 1º). Estimativa: paga por mês sobre a receita e acerta no lucro real do ano, com o saldo em março (Lei 9.430 arts. 2º e 6º). Com balancete, o mês paga só o que o lucro real acumulado pede (Lei 8.981 art. 35). A opção vale para o ano inteiro e se faz com o pagamento de janeiro (Lei 9.430 art. 3º)."
    :"Com meses iguais, as três formas dão o mesmo imposto no ano. O seletor vale com sazonalidade ou mês a mês (bloco \"Meses do ano\").";
  const sum=$("#msSum"); sum.hidden=!on; if(!on)return;
  document.querySelectorAll("#msGrid input[data-mk]").forEach(el=>{const k=el.dataset.mk, i=+el.dataset.mi;
    el.placeholder=k==="f"?"100":k==="r"?fmt(s):k==="rv"?fmt(x.meses?x.meses.rv[i]:v):AM&&AM.ant?fmt(AM.ant[i]):""});
  const M=x.meses, ts=M.sv.reduce((a,b)=>a+b,0), tr=M.rv.reduce((a,b)=>a+b,0);
  let t="Serviços do ano: "+R(ts)+(tr>0?"; revenda: "+R(tr):"")+".";
  if(MS.modo==="SZ"){const fs=MS.f.map(dasNum).map(f=>f==null?100:f), md=fs.reduce((a,b)=>a+b,0)/12;
    t+=" Média dos fatores: "+md.toLocaleString("pt-BR",{maximumFractionDigits:1})+"%, então o ano vale "+(md*12/100).toLocaleString("pt-BR",{maximumFractionDigits:2})+" vezes o mês da ficha."+(Math.abs(md-100)>.05?" A média não é 100%: a conta não reparte a diferença pelos outros meses.":"")}
  else t+=" Média do mês: "+R(ts/12)+" de serviços.";
  if(AM)t+=" Resultado do ano: "+R(AM.ano.resultado)+".";
  sum.textContent=t}
$("#m_modo").addEventListener("change",e=>{MS.modo=["SZ","MM"].includes(e.target.value)?e.target.value:"IG";saveMS();buildMS();render()});
$("#m_real").addEventListener("change",e=>{MS.real=["EST","ESTB"].includes(e.target.value)?e.target.value:"TRI";saveMS();render()});
$("#msGrid").addEventListener("input",e=>{const el=e.target;if(!el.dataset||!el.dataset.mk)return;MS[el.dataset.mk][+el.dataset.mi]=el.value;saveMS();render()});
$("#reset").addEventListener("click",()=>{MS=msDef();saveMS();buildMS()});
buildMS();

let saved=DEF;'''
R.append(("\nlet saved=DEF;", "\n" + MS))

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p10a")
