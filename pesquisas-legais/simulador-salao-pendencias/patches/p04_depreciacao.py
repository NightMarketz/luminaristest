"""Patch 04: item 4, depreciação dos equipamentos (dossiê pesquisas-legais/salao-depreciacao-equipamentos).

Cadastro "Equipamentos" (CAT.bens = [{n, v, a}], a = vida útil em anos), sem valor de exemplo.
depMes = Σ v / (a × 12). Custo em todos os regimes (cenario, cenarioReg, outrosC, as duas DREs, aba 4).
Lucro Real: dedutível no IRPJ e na CSLL (IN RFB 1.700 arts. 121 § 5º e 123).
Crédito: Real 2026, PIS/Cofins 9,25% sobre a quota do mês (Lei 10.833 art. 3º VI e § 1º III);
2027, CBS/IBS integral na aquisição (LC 214 arts. 47 e 108): com meses iguais, reposição = depreciação,
base a menos depMes / (1 + a27) em SR, PR e RE. Simples puro e Presumido de 2026: sem efeito no tributo.
Uso: python p04_depreciacao.py <html>   (depois do p03)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = []
# CSS: rótulos do cadastro no celular
R.append(('  #tDp tbody td:nth-child(3)::before{content:"Dá crédito"}\n',
          '  #tDp tbody td:nth-child(3)::before{content:"Dá crédito"}\n'
          '  #tBn tbody td:nth-child(1)::before{content:"Equipamento"}\n'
          '  #tBn tbody td:nth-child(2)::before{content:"Valor de compra"}\n'
          '  #tBn tbody td:nth-child(3)::before{content:"Vida útil (anos)"}\n'
          '  #tBn tbody td:nth-child(4)::before{content:"Depreciação do mês"}\n'))
# HTML: cadastro de equipamentos, depois das despesas
R.append(('        <div class="callout info" id="catOff" hidden>',
          '        <h3 style="margin-top:18px">Equipamentos</h3>\n'
          '        <div id="bnEmpty" class="empty">Sem equipamentos: a conta não deprecia nada. Cadastre cadeiras, lavatórios, secadores, ar-condicionado, móveis e computador com o valor de compra e a vida útil. A depreciação do mês entra no resultado em todos os regimes; no Lucro Real ela também sai do lucro tributável e dá crédito.</div>\n'
          '        <div class="tbl-wrap" id="bnWrap"><table class="cat" id="tBn"><thead><tr><th>Equipamento</th><th class="r">Valor de compra</th><th class="r">Vida útil (anos)</th><th class="r">Depreciação do mês</th><th><span style="position:absolute;left:-9999px">Remover</span></th></tr></thead><tbody></tbody>\n'
          '          <tfoot><tr><td colspan="3">Depreciação no mês</td><td class="r num" id="bnTot"></td><td></td></tr></tfoot></table></div>\n'
          '        <div class="cat-tools"><button class="btn" id="addBn" type="button">+ Adicionar equipamento</button><span class="law">Vida útil do Anexo III da IN RFB 1.700 (art. 124 § 1º): cadeira de cabeleireiro (NCM 9402), móveis (9403), instalações e ar-condicionado (8415), 10 anos; computador (8471) e máquina de corte (8510), 5 anos. Secador e lavatório não têm linha própria no Anexo III (aba 7). Bem de até R$ 1.200 ou com vida útil de até 1 ano pode ir direto à despesa (DL 1.598 art. 15), salvo quando a atividade exige um conjunto deles (RIR art. 313 § 2º); com meses iguais, a conta supõe a reposição de cada bem no fim da vida útil, e o custo médio do mês é o mesmo nos dois jeitos. Não lance a depreciação também na lista de despesas.</span></div>\n'
          '        <div class="callout info" id="catOff" hidden>'))
# cenario(): custo do mês
R.append(('  out.enc=encargos(x,out.equipe);\n',
          '  out.enc=encargos(x,out.equipe);\n'
          '  // depreciacao v1: depreciação do mês dos equipamentos cadastrados (x.dep = Σ valor ÷ vida útil ÷ 12), custo em todos os regimes\n'
          '  out.dep=numP(x.dep);\n'))
R.append(('-out.cartao-repSem;', '-out.cartao-repSem-out.dep;'))
# regimes(): crédito e lucro
R.append(('  const insB26=insCr26/(LEI.pisNC+LEI.cofNC), insB27=cbsAl+LEI.ibs27>0?insCr27/(cbsAl+LEI.ibs27):0;\n',
          '  const insB26=insCr26/(LEI.pisNC+LEI.cofNC), insB27=cbsAl+LEI.ibs27>0?insCr27/(cbsAl+LEI.ibs27):0;\n'
          '  // depreciacao v1: 2026 no Real, crédito de PIS/Cofins de 9,25% sobre a quota do mês (Lei 10.833 art. 3º VI e § 1º III; Lei 10.637 idem).\n'
          '  // 2027: crédito integral de CBS/IBS na aquisição (LC 214 arts. 47 e 108); com meses iguais, a compra do mês repõe o que depreciou, com CBS/IBS no preço\n'
          '  const depM=numP(c.dep), depB27=depM/(1+cbsAl+LEI.ibs27);\n'))
R.append(('base:b-cred-insB26,al:', 'base:b-cred-insB26-depM,al:', 2))
R.append(('base:bCI-issV-cred-insB27,al:', 'base:bCI-issV-cred-insB27-depB27,al:', 2))
R.append(('-(c.difal||0)-(c.cartao||0); out.lucroReal=L;',
          '-(c.difal||0)-(c.cartao||0)-depM; out.lucroReal=L; out.dep=depM;'))
# a depreciação dos bens ligados ao serviço é dedutível no IRPJ e na CSLL (IN RFB 1.700 arts. 121 § 5º e 123): comentário em linha própria
R.append(('  /* real-insumo v1 */ // o insumo aplicado no serviço',
          '  // depreciacao v1: a quota do mês sai do lucro real; é dedutível no IRPJ e na CSLL (IN RFB 1.700 arts. 121 § 5º e 123)\n'
          '  /* real-insumo v1 */ // o insumo aplicado no serviço'))
# cenarioReg() e outrosC
R.append(('-c.cartao-rs;\n', '-c.cartao-rs-(c.dep||0);\n'))
R.append(('+(s.repSem||0);\n', '+(s.repSem||0)+(s.dep||0);\n'))
# DEF_CAT e effective()
R.append(('pd:[],dp:[]};', 'pd:[],dp:[],bens:[]};'))
R.append(('  if(x.fonte!=="CAT")return{...x,...lig,eq,mod,ins};\n',
          '  // depreciacao v1: lista de equipamentos (CAT.bens): Σ valor ÷ (vida útil × 12), só com vida útil preenchida; vale nos dois modos da ficha\n'
          '  const bn=CAT.bens||[];\n'
          '  if(bn.length)lig.dep=bn.reduce((a,b)=>a+(nz(b.a)>0?nz(b.v)/(nz(b.a)*12):0),0);\n'
          '  if(x.fonte!=="CAT")return{...x,...lig,eq,mod,ins};\n'))
# aba 4: cartão dos cenários
R.append(('<span>${R(x.desp+(s.cartao||0))}</span></div>\n',
          '<span>${R(x.desp+(s.cartao||0))}</span></div>\n'
          '     ${s.dep>0?`<div class="line"><span>Depreciação dos equipamentos</span><span>${R(s.dep)}</span></div>`:""}\n'))
# DREs
R.append(('outr=x.desp+e.tfeMes+(e.capMes||0)+(c.cartao||0), lair', 'outr=x.desp+e.tfeMes+(e.capMes||0)+(c.cartao||0)+(c.dep||0), lair'))
R.append(('outr=x.desp+e.tfeMes+(e.capMes||0)+(c.cartao||0), res=c.resultado;', 'outr=x.desp+e.tfeMes+(e.capMes||0)+(c.cartao||0)+(c.dep||0), res=c.resultado;'))
R.append(('    ${c.cartao>0?row("Taxa do cartão ("+P(numP(x.mdr)/100,1)+" do que entra)",c.cartao,{cls:"sub"}):""}\n',
          '    ${c.cartao>0?row("Taxa do cartão ("+P(numP(x.mdr)/100,1)+" do que entra)",c.cartao,{cls:"sub"}):""}\n'
          '    ${c.dep>0?row("Depreciação dos equipamentos",c.dep,{cls:"sub"}):""}\n', 2))
# cadastro: funções, totais, inicialização e reset
R.append(('/* ===== equipe ===== */\n',
          '/* depreciacao v1: lista de equipamentos (CAT.bens), guardada com o catálogo */\n'
          'function renderBn(){const bn=CAT.bens||(CAT.bens=[]);\n'
          '  $("#tBn tbody").innerHTML=bn.map((d,i)=>`<tr data-i="${i}">\n'
          '    <td><input class="nm" data-k="n" value="${esc(d.n)}" aria-label="Nome do equipamento" id="bn${i}n"></td>\n'
          '    <td><input type="number" min="0" step="100" data-k="v" value="${nz(d.v)}" aria-label="Valor de compra" id="bn${i}v"><span class="code" data-bv></span></td>\n'
          '    <td><input type="number" min="0" max="50" step="1" data-k="a" value="${nz(d.a)||""}" aria-label="Vida útil em anos" id="bn${i}a"><span class="code" data-ba></span></td>\n'
          '    <td class="r num" data-sub></td>\n'
          '    <td><button class="del" type="button" data-del aria-label="Remover ${esc(d.n||"equipamento")}">×</button></td></tr>`).join("");\n'
          '  $("#bnEmpty").hidden=bn.length>0; $("#bnWrap").hidden=bn.length===0;\n'
          '  document.querySelectorAll("#tBn tbody tr").forEach(tr=>{const i=+tr.dataset.i;\n'
          '    tr.querySelectorAll("[data-k]").forEach(el=>el.addEventListener("input",()=>{const k=el.dataset.k;CAT.bens[i][k]=el.type==="number"?nz(el.value):el.value;render()}));\n'
          '    tr.querySelector("[data-del]").addEventListener("click",()=>{CAT.bens.splice(i,1);renderBn();render()})});\n'
          '}\n'
          'function updateBnTotals(){const bn=CAT.bens||[];let t=0;\n'
          '  document.querySelectorAll("#tBn tbody tr").forEach(tr=>{const d=bn[+tr.dataset.i];if(!d)return;const a=nz(d.a), q=a>0?nz(d.v)/(a*12):0;t+=q;\n'
          '    tr.querySelector("[data-sub]").textContent=a>0?R(q):"—";\n'
          '    const ba=tr.querySelector("[data-ba]");ba.textContent=a>0?P(1/a,0)+" ao ano":"informe a vida útil: fora da conta";ba.classList.toggle("warnc",!(a>0));\n'
          '    tr.querySelector("[data-bv]").textContent=nz(d.v)>0&&nz(d.v)<=1200?"até R$ 1.200: pode ir direto à despesa":""});\n'
          '  $("#bnTot").textContent=R(t)}\n'
          '$("#addBn").addEventListener("click",()=>{(CAT.bens||(CAT.bens=[])).push({n:"Novo equipamento",v:0,a:0});renderBn();render();const l=document.querySelectorAll("#tBn tbody tr input.nm");l[l.length-1]?.select()});\n'
          '/* ===== equipe ===== */\n'))
R.append(('  updateCatTotals(x); updateDpTotals();\n', '  updateCatTotals(x); updateDpTotals(); updateBnTotals();\n'))
R.append(('.map(d=>({n:String(d.n==null?"":d.n),v:nz(d.v),c:!!d.c})):[];\n',
          '.map(d=>({n:String(d.n==null?"":d.n),v:nz(d.v),c:!!d.c})):[];\n'
          'CAT.bens=Array.isArray(CAT.bens)?CAT.bens.filter(d=>d&&typeof d==="object").map(d=>({n:String(d.n==null?"":d.n),v:nz(d.v),a:nz(d.a)})):[];\n'))
R.append(('renderDp();\naddPagers();', 'renderDp();\nrenderBn();\naddPagers();'))
R.append(('fillForm(DEF);renderEq();renderCatalog();renderDp();render()});', 'fillForm(DEF);renderEq();renderCatalog();renderDp();renderBn();render()});'))
# textos
R.append(('não inclui a depreciação dos equipamentos, a provisão de rescisão,', 'não inclui a provisão de rescisão,'))
R.append(('as outras despesas, da ficha ou da lista de despesas;',
          'as outras despesas, da ficha ou da lista de despesas; a depreciação, da lista de equipamentos dos Cadastros (vida útil do Anexo III da IN RFB 1.700);'))
R.append(('A depreciação dos equipamentos e o adicional por tempo de serviço da convenção só entram se você os lançar (lista de despesas e salário);',
          'A depreciação entra pela lista de equipamentos dos Cadastros. O adicional por tempo de serviço da convenção só entra se você o lançar no salário;'))
R.append(('− outras despesas, sem adições nem exclusões.', '− outras despesas − depreciação, sem adições nem exclusões.'))
R.append(('lucro = receita − tributos − equipe − despesas − insumos${rev?', 'lucro = receita − tributos − equipe − despesas − insumos − depreciação${rev?'))
R.append(('    <li>2027: o preço ao cliente',
          '    <li>Depreciação dos equipamentos: valor de compra ÷ vida útil, por mês (${R(R26.dep||0)} hoje), em todos os regimes. No Real sai do lucro do IRPJ e da CSLL (IN RFB 1.700 arts. 121 § 5º e 123) e, em 2026, dá crédito de 9,25% de PIS/Cofins sobre a quota do mês (Lei 10.833 art. 3º VI e § 1º III). Em 2027 o crédito de CBS e IBS é da compra, de uma vez (LC 214 arts. 47 e 108): com meses iguais, a conta supõe a compra de reposição no ritmo da depreciação, com CBS e IBS no preço. No Presumido de 2026 e no Simples ela não muda o imposto.</li>\n'
          '    <li>2027: o preço ao cliente'))
R.append(('  </footer>',
          '        <div>Depreciação: dossiê <span class="num">pesquisas-legais/salao-depreciacao-equipamentos</span> (21/11/2026): IN RFB 1.700 arts. 121, 123 e 124 e Anexo III, DL 1.598 art. 15, RIR arts. 313, 317 e 323, Leis 10.637 e 10.833 art. 3º VI e §§ 1º III e 14, Lei 11.774 art. 1º XII, LC 214 arts. 47, 108 e 380.</div>\n'
          '  </footer>'))
# aba 7: o que a pesquisa deixou aberto
R.append(('    ["Insumo estético aplicado no cliente e o crédito de CBS (2027)",',
          '    ["Depreciação: secador, lavatório e o crédito do Real",numP(x.dep)>0,"Qual NCM e qual prazo do Anexo III da IN RFB 1.700 valem para o secador de cabelo e para o lavatório do salão? No Lucro Real de 2026, o salão toma o crédito de PIS/Cofins do equipamento novo de uma vez (Lei 11.774 art. 1º XII) ou pela depreciação? O salão trabalha mais de um turno de 8 horas, para usar o coeficiente 1,5 (RIR art. 323)?","O Anexo III não traz o secador (a posição 8516 é descrita só como aquecimento de ambientes) nem o lavatório: a conta usa a vida útil digitada no cadastro. O crédito de PIS/Cofins pode ser pela depreciação (Lei 10.833 art. 3º § 1º III), em 48 meses (§ 14) ou imediato para máquina nova (Lei 11.774 art. 1º XII); a conta usa a depreciação. Com dois turnos a quota pode ser 1,5 vez maior; a conta usa um turno."],\n'
          '    ["Insumo estético aplicado no cliente e o crédito de CBS (2027)",'))

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p04")
