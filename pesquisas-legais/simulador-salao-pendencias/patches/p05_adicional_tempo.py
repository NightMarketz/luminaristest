"""Patch 05: item 5, adicional por tempo de serviço da convenção (dossiê pesquisas-legais/salao-cct-adicional-tempo-servico).

CCT SP006651/2026 cl. 17ª: 1,5% por ano completo de serviço na mesma empresa, até 15%; com REPIS, 1% por ano até 15% (§ 2º).
Base não definida na CCT: a conta usa o salário fixo (p.sf), e a pergunta vai a "Ainda é decisão".
Natureza salarial (TST Súmula 203): soma ao salário antes do FGTS, do 13º e das férias (custoCLT).
Campo por pessoa "anos de casa" (cadastro da equipe) e campo da ficha "Salão aderiu ao REPIS" (padrão: não).
O piso passa a seguir o REPIS (cl. 4ª e 5ª) e é comparado sem o adicional.
Uso: python p05_adicional_tempo.py <html>   (depois do p04)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = []
# CSS: rótulos do cadastro da equipe no celular (coluna nova na 6ª posição)
R.append(('  #tEq td:nth-child(6)::before{content:"Cota do salão (%)"}\n'
          '  #tEq td:nth-child(7)::before{content:"CNPJ do parceiro"}\n'
          '  #tEq td:nth-child(8)::before{content:"Serviços no mês"}\n',
          '  #tEq td:nth-child(6)::before{content:"Anos de casa"}\n'
          '  #tEq td:nth-child(7)::before{content:"Cota do salão (%)"}\n'
          '  #tEq td:nth-child(8)::before{content:"CNPJ do parceiro"}\n'
          '  #tEq td:nth-child(9)::before{content:"Serviços no mês"}\n'))
# HTML: cabeçalho do cadastro e campo REPIS na ficha
R.append(('<th class="r">Comissão (% dos serviços)</th><th class="r">Cota do salão (%)</th>',
          '<th class="r">Comissão (% dos serviços)</th><th class="r">Anos de casa</th><th class="r">Cota do salão (%)</th>'))
R.append(('<small id="dsemNote"></small></div>\n',
          '<small id="dsemNote"></small></div>\n'
          '        <div class="fld"><label for="f_repis">Salão aderiu ao REPIS</label><select class="das-sel" id="f_repis"><option value="N">Não</option><option value="S">Sim, com o certificado</option></select><small>Com o certificado do REPIS da convenção (ME e EPP, adesão até 30/09/2026), o piso é menor (cl. 4ª) e o adicional por tempo de serviço cai de 1,5% para 1% por ano de casa (cl. 17ª § 2º). Os benefícios com REPIS (R$ 48,90) ficam no campo da telemedicina, nos encargos.</small></div>\n'))
# CALC: adicional por tempo de serviço na remuneração do CLT
R.append(('  out.equipe=time.filter(p=>p.v==="CLT").map(p=>{const sf=numP(p.s), pc=Math.min(100,numP(p.com)), cm=pc/100*(por[p.id]||0), dsr=cm*fd.f;\n'
          '    return{n:nomeP(p),id:p.id,f:p.f,sf,pc,cm,dsr,...custoCLT(sf+cm+dsr)}});\n',
          '  // ats v1: adicional por tempo de serviço da CCT SP006651/2026 cl. 17ª: 1,5% por ano completo de casa, até 15%; 1% com REPIS (§ 2º).\n'
          '  // A CCT não define a base: a conta usa o salário fixo (pergunta na aba 7). Natureza salarial (TST Súmula 203): entra antes do FGTS, do 13º e das férias.\n'
          '  out.repis=x.repis==="S";\n'
          '  out.equipe=time.filter(p=>p.v==="CLT").map(p=>{const sf=numP(p.s), pc=Math.min(100,numP(p.com)), cm=pc/100*(por[p.id]||0), dsr=cm*fd.f;\n'
          '    const anos=Math.floor(numP(p.anos)), atsP=Math.min(.15,anos*(out.repis?.01:.015)), ats=atsP*sf;\n'
          '    return{n:nomeP(p),id:p.id,f:p.f,sf,anos,atsP,ats,pc,cm,dsr,...custoCLT(sf+ats+cm+dsr)}});\n'))
# DEF, readForm, fillForm
R.append(('mdr:0,dsem:6,odo:0,cap:0};', 'mdr:0,dsem:6,odo:0,cap:0,repis:"N"};'))
R.append(('rcos:Math.min(100,n("f_rcos")),rxam:Math.min(100,n("f_rxam"))};',
          'rcos:Math.min(100,n("f_rcos")),rxam:Math.min(100,n("f_rxam")),repis:$("#f_repis").value==="S"?"S":"N"};'))
R.append(('  $(x.ano==="2027"?"#a27":"#a26").checked=true;\n',
          '  $(x.ano==="2027"?"#a27":"#a26").checked=true;\n'
          '  $("#f_repis").value=x.repis==="S"?"S":"N";\n'))
# piso: com ou sem REPIS, comparado sem o adicional
R.append(('const PISO_SR={cab:2380,barb:2380,mani:2380,pedi:2380,dep:2380,maq:2380,est:2380,ger:2805}, pisoDe=f=>PISO_SR[f]||2185;',
          '// com o certificado do REPIS: R$ 1.875 (demais), R$ 1.900 (profissionais da beleza) e R$ 2.227,20 (gerente) (cl. 4ª)\n'
          'const PISO_SR={cab:2380,barb:2380,mani:2380,pedi:2380,dep:2380,maq:2380,est:2380,ger:2805}, PISO_CR={cab:1900,barb:1900,mani:1900,pedi:1900,dep:1900,maq:1900,est:1900,ger:2227.2};\n'
          'const pisoDe=(f,rp)=>rp?PISO_CR[f]||1875:PISO_SR[f]||2185;'))
R.append(('   const abaixo=c.equipe.filter(p=>p.s>0&&p.s<pisoDe(p.f)),',
          '   const abaixo=c.equipe.filter(p=>p.s>0&&p.s-p.ats<pisoDe(p.f,c.repis)), rpTx=c.repis?"com REPIS":"sem REPIS",'))
R.append(('piso=pisoDe(q.f), dt=q.d13+q.fer+q.terco;', 'piso=pisoDe(q.f,c.repis), dt=q.d13+q.fer+q.terco;'))
R.append(('q.s>0&&q.s<piso?`Abaixo do piso da convenção sem REPIS (${R(piso)}).`:""',
          'q.s>0&&q.s-q.ats<piso?`Abaixo do piso da convenção ${rpTx} (${R(piso)}).`:""'))
R.append(('(abaixo.length===1?" está":" estão")+" abaixo do piso sem REPIS":""', '(abaixo.length===1?" está":" estão")+" abaixo do piso "+rpTx:""'))
R.append(('tot<pisoDe(p.f)?"com a comissão, abaixo do piso sem REPIS ("+R(pisoDe(p.f))+")":"";',
          'tot-(ce?ce.ats:0)<pisoDe(p.f,c.repis)?"abaixo do piso "+(c.repis?"com":"sem")+" REPIS ("+R(pisoDe(p.f,c.repis))+")":"";'))
# cartão da pessoa (aba 3): linha do adicional, com a fórmula que o teste de cartão lê
R.append(('         ${q.cm>0?ln("Salário fixo",R(q.sf))+ln("Comissão",',
          '         ${q.cm>0||q.ats>0?ln("Salário fixo",R(q.sf))+(q.ats>0?ln("Adicional por tempo de serviço",R(q.ats),{f:P(q.atsP)+" × "+nf(q.sf)+" ("+(c.repis?"1%":"1,5%")+" × "+q.anos+(q.anos===1?" ano":" anos")+" de casa, até 15%)"}):"")+(q.cm<=0?"":ln("Comissão",'))
R.append(('{f:nf(q.cm)+" × "+c.dsr.rep+" repousos ÷ "+nf(c.dsr.trab)+" dias"})+ln("Remuneração do mês",R(q.s),{cls:"sub"}):ln("Salário do mês",R(q.s))}',
          '{f:nf(q.cm)+" × "+c.dsr.rep+" repousos ÷ "+nf(c.dsr.trab)+" dias"}))+ln("Remuneração do mês",R(q.s),{cls:"sub"}):ln("Salário do mês",R(q.s))}'))
# cadastro: coluna anos de casa
R.append(('    <td class="${pa?"":"dim"}">${bloq||so?"—":`<input type="number" min="1" max="99" step="5" data-k="cota"',
          '    <td class="${pa?"dim":""}">${so?"—":`<input type="number" min="0" max="60" step="1" data-k="anos" value="${nz(p.anos)||""}" aria-label="Anos completos de casa" id="eq${i}a"><span class="code" data-an></span>`}</td>\n'
          '    <td class="${pa?"":"dim"}">${bloq||so?"—":`<input type="number" min="1" max="99" step="5" data-k="cota"'))
R.append(('    if(cmE){const v=nz(p.com)/100*(c.servPor[p.id]||0);',
          '    {const an=tr.querySelector("[data-an]");if(an)an.textContent=ce&&ce.ats>0?"adicional "+P(ce.atsP,1)+" · "+R(ce.ats):pa?"usado só no cenário CLT":nz(p.anos)>0?"menos de 1 ano completo":"";}\n'
          '    if(cmE){const v=nz(p.com)/100*(c.servPor[p.id]||0);'))
R.append(('...(nz(p.com)>0?{com:Math.min(100,nz(p.com))}:{}),', '...(nz(p.com)>0?{com:Math.min(100,nz(p.com))}:{}),...(nz(p.anos)>0?{anos:nz(p.anos)}:{}),'))
R.append(('Quem ganha comissão pode ter o % na coluna própria,', 'Os anos de casa dão o adicional por tempo de serviço da convenção (cl. 17ª). Quem ganha comissão pode ter o % na coluna própria,'))
# o select da ficha não dispara "input"
R.append(('document.querySelectorAll("#p-ficha input").forEach(el=>el.addEventListener("input",render));',
          'document.querySelectorAll("#p-ficha input").forEach(el=>el.addEventListener("input",render));\n'
          'document.querySelectorAll("#p-ficha select").forEach(el=>el.addEventListener("change",render));'))
# textos
R.append(('não inclui a provisão de rescisão, o adicional por tempo de serviço da convenção (some-o ao salário), nem', 'não inclui a provisão de rescisão nem'))
R.append(('a depreciação, da lista de equipamentos dos Cadastros (vida útil do Anexo III da IN RFB 1.700);',
          'a depreciação, da lista de equipamentos dos Cadastros (vida útil do Anexo III da IN RFB 1.700); o adicional por tempo de serviço, dos anos de casa de cada CLT (CCT cl. 17ª: 1,5% por ano, até 15%; 1% com REPIS), sobre o salário fixo;'))
R.append(('O adicional por tempo de serviço da convenção só entra se você o lançar no salário;', 'O adicional por tempo de serviço sai dos anos de casa de cada CLT no cadastro;'))
R.append(('     <p class="law">O salão paga o vale-transporte que passar de 6% do salário básico',
          '     <p class="law">Adicional por tempo de serviço: 1,5% do salário por ano completo na mesma empresa, até 15%; com o certificado do REPIS, a convenção permite 1% por ano, também até 15% (CCT SP006651/2026 cl. 17ª e § 2º). A convenção não diz sobre qual parcela incide: a conta usa o salário fixo (pergunta na aba 7). Ele é salário (TST Súmula 203) e entra no FGTS, no 13º e nas férias. Conta da admissão, por ano completo.</p>\n'
          '     <p class="law">O salão paga o vale-transporte que passar de 6% do salário básico'))
R.append(('  </footer>',
          '        <div>Adicional por tempo de serviço: dossiê <span class="num">pesquisas-legais/salao-cct-adicional-tempo-servico</span> (21/11/2026): CCT SP006651/2026 cl. 4ª, 17ª e 36ª, aditivo SP009373/2026 cl. 5ª, TST Súmula 203.</div>\n'
          '  </footer>'))
R.append(('    ["Insumo estético aplicado no cliente e o crédito de CBS (2027)",',
          '    ["Adicional por tempo de serviço: sobre o quê",c.equipe.some(p=>p.ats>0),"A cl. 17ª da CCT SP006651/2026 não define a base do ATS; incide sobre o salário fixo, sobre o piso ou sobre fixo + comissões, inclusive para o comissionista com garantia de piso?","A conta usa o salário fixo de cada um, por ano completo desde a admissão: 1,5% por ano, até 15%, ou 1% com REPIS (cl. 17ª § 2º, que diz que as empresas com REPIS \\"poderão aplicar\\" o 1%). Sobre fixo + comissões, o adicional sobe para quem ganha comissão."],\n'
          '    ["Insumo estético aplicado no cliente e o crédito de CBS (2027)",'))

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p05")
