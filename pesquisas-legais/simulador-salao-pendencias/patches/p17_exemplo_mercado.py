"""Patch 17: exemplo com custos de mercado, com fonte e faixa (lacuna L-20261121-181428-60ca; BRIEF-GRUPO-LACUNAS-2026-11-24
item 20d; F-SIM-6 e F-SIM-7).

Até a v51, o exemplo nascia com insumo, taxa do cartão, pró-labore, rotatividade, vale-transporte e equipamentos em zero, sem
aviso. Este patch usa os valores do dossiê pesquisas-legais/salao-padrao-mercado-sp (PR #1342):
- insumo: 7,2% do preço de cada serviço do catálogo (R$ 2.880 no mês do exemplo; faixa 7,2% a 9,4%; IBGE, PAS 2023, Tab. 5 e 6).
  Entra pelo DEF_CAT.sv[].i porque o exemplo está no modo catálogo (effective() soma i × m); o DEF.insumo acompanha;
- pró-labore: R$ 1.621 por sócio, o salário mínimo de 2026 (Decreto 12.797/2025 art. 1º); faixa até R$ 5.635 (PAS 2023, Tab. 10 e 11);
- sem padrão, vazios e com aviso: taxa do cartão (a fração da receita no cartão não tem fonte; o MDR médio de 1,79% do Banco
  Central dá a faixa de 0% a 1,79%), vale-transporte (candidata da Prefeitura de SP, à espera do fork L-20261124-050108-d516),
  rotatividade (nenhuma fonte aceita) e equipamentos (sem preço por bem; o setor compra de 1,5% a 5,7% da receita por ano).
O que muda na página:
- DEF_FONTES: um registro por campo, com padrão e fonte ou com aviso;
- faixaEx(): o resultado do exemplo com os custos na ponta alta da faixa (insumo 9,4%, pró-labore de R$ 5.635 por sócio,
  cartão 1,79%); o KPI "Resultado do salão" mostra a faixa enquanto a ficha é o exemplo (F-SIM-7);
- o aviso do exemplo (#exNote) diz o que tem fonte e o que ficou vazio, e o rodapé (#exFontes) lista cada fonte e cada aviso.
O DEF_EQ não muda: o dossiê não traz valor para a equipe.
Depois deste patch a página congela de novo (F-SIM-8). Base: v51 + p16. Uso: python p17_exemplo_mercado.py <html>
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = [
    # DEF: pró-labore de 1 sócio e o insumo do modo ficha igual ao do catálogo
    ("const DEF={fonte:\"CAT\",serv:40000,rev:0,cmv:50,desp:8000,soc:1,ano:\"2026\",rat:2,fap:1,terc:5.8,cred:6000,cbs:11.3,insumo:0,vt:0,cesta:250,ben:57.1,pl:0,",
     "const DEF={fonte:\"CAT\",serv:40000,rev:0,cmv:50,desp:8000,soc:1,ano:\"2026\",rat:2,fap:1,terc:5.8,cred:6000,cbs:11.3,insumo:2880,vt:0,cesta:250,ben:57.1,pl:1621,"),
    # DEF_CAT: 7,2% do preço como insumo por atendimento
    ("  {n:\"Corte feminino\",t:\"6.01c\",q:\"p1\",p:120,m:50},{n:\"Coloração\",t:\"6.01c\",q:\"p1\",p:250,m:40},{n:\"Hidratação\",t:\"6.01c\",q:\"p1\",p:90,m:30},{n:\"Penteado\",t:\"6.01c\",q:\"p1\",p:130,m:10},\n"
     "  {n:\"Corte feminino\",t:\"6.01c\",q:\"p2\",p:120,m:70},{n:\"Escova\",t:\"6.01c\",q:\"p2\",p:80,m:100},{n:\"Corte masculino\",t:\"6.01c\",q:\"p2\",p:60,m:60}],",
     "  // exemplo-mercado v1: insumo por atendimento = 7,2% do preço (IBGE, PAS 2023; DEF_FONTES)\n"
     "  {n:\"Corte feminino\",t:\"6.01c\",q:\"p1\",p:120,m:50,i:8.64},{n:\"Coloração\",t:\"6.01c\",q:\"p1\",p:250,m:40,i:18},{n:\"Hidratação\",t:\"6.01c\",q:\"p1\",p:90,m:30,i:6.48},{n:\"Penteado\",t:\"6.01c\",q:\"p1\",p:130,m:10,i:9.36},\n"
     "  {n:\"Corte feminino\",t:\"6.01c\",q:\"p2\",p:120,m:70,i:8.64},{n:\"Escova\",t:\"6.01c\",q:\"p2\",p:80,m:100,i:5.76},{n:\"Corte masculino\",t:\"6.01c\",q:\"p2\",p:60,m:60,i:4.32}],"),
    # DEF_FONTES e faixaEx, logo depois da equipe de exemplo
    ("let EQ=JSON.parse(JSON.stringify(DEF_EQ));\n",
     "// exemplo-mercado v1 (F-SIM-6/7): cada custo do exemplo com padrão e fonte, ou vazio com aviso. Dossiê pesquisas-legais/salao-padrao-mercado-sp (24/11/2026).\n"
     "const DEF_FONTES=[\n"
     "  {k:\"insumo\",n:\"Insumos\",pad:\"7,2% do preço de cada serviço do catálogo (R$ 2.880 no mês)\",faixa:[.072,.094],fonte:\"IBGE, Pesquisa Anual de Serviços 2023, Tabelas 5 e 6: materiais de consumo e reposição sobre a receita operacional líquida, 7,2% nos salões com 20 ou mais pessoas e 9,4% em serviços pessoais de todos os portes\"},\n"
     "  {k:\"pl\",n:\"Pró-labore\",pad:\"R$ 1.621 por sócio, o salário mínimo de 2026\",faixa:[1621,5635],fonte:\"Decreto 12.797/2025 art. 1º; IBGE, PAS 2023, Tabelas 10 e 11: R$ 1.527 (serviços pessoais) a R$ 5.635 (salões com 20 ou mais pessoas) por sócio por mês, em valores de 2023\"},\n"
     "  {k:\"mdr\",n:\"Taxa do cartão\",faixa:[0,1.79],aviso:\"vazia: nenhuma fonte aceita dá a parte da receita do salão que entra pelo cartão. O desconto médio é de 1,79% do que passa no cartão (Banco Central, 2º trimestre de 2026: 1,05% no débito a 2,30% no crédito parcelado); com tudo no cartão, o campo seria 1,79%\"},\n"
     "  {k:\"vt\",n:\"Vale-transporte\",aviso:\"vazio: a tarifa de R$ 5,30 da Prefeitura de SP daria R$ 275,60 por empregado (2 × R$ 5,30 × 26 dias; de R$ 233,20 a R$ 551,20), mas a Prefeitura não está entre as fontes aceitas para o exemplo, e isso espera decisão\"},\n"
     "  {k:\"rot\",n:\"Rotatividade\",aviso:\"vazia: nenhuma fonte aceita (Sebrae, IBGE, convenção coletiva, Banco Central) mede a rotatividade de salão; sem ela, a conta não provisiona rescisão\"},\n"
     "  {k:\"bens\",n:\"Equipamentos\",aviso:\"lista vazia: nenhuma fonte aceita dá o preço de cada bem. O setor compra de 1,5% a 5,7% da receita por ano em máquinas, equipamentos e móveis (IBGE, PAS 2023, Tabela 13); sem a lista, a conta não deprecia\"}];\n"
     "// faixa do resultado do exemplo: os custos com padrão na ponta alta (insumo 9,4%, pró-labore de R$ 5.635 por sócio) e o cartão a 1,79%\n"
     "function faixaEx(x,reg,D0){const f=k=>DEF_FONTES.find(d=>d.k===k).faixa, fi=f(\"insumo\"), s=fi[1]/fi[0], pH=f(\"pl\")[1];\n"
     "  const hi={...x,insumo:x.insumo*s,insPor:x.insPor?Object.fromEntries(Object.entries(x.insPor).map(([k,v])=>[k,v*s])):x.insPor,pl:pH*x.soc,plList:x.plList?x.plList.map(()=>pH):x.plList,mdr:f(\"mdr\")[1]};\n"
     "  return{alto:cenarioReg({...x,...D0},\"CAD\",reg).resultado,baixo:cenarioReg({...hi,...D0},\"CAD\",reg).resultado}}\n"
     "const exFontesHtml=()=>\"<b>Exemplo</b> (dossiê <span class=\\\"num\\\">pesquisas-legais/salao-padrao-mercado-sp</span>, 24/11/2026): \"+DEF_FONTES.map(d=>d.fonte?`${d.n}: ${d.pad} (${d.fonte})`:`${d.n}: ${d.aviso}`).join(\"; \")+\". O resultado do exemplo sai como faixa, do custo mais baixo ao mais alto das fontes.\";\n"
     "let EQ=JSON.parse(JSON.stringify(DEF_EQ));\n"),
    # aviso do exemplo e faixa no KPI
    ("  $(\"#exNote\").textContent=isEx?\"Os valores iniciais são um exemplo, não os números de um salão real.\":\"Conta feita com os números que você preencheu.\";\n",
     "  const fx=isEx&&!c.am?faixaEx(x,REG,D0):null;\n"
     "  $(\"#exNote\").innerHTML=isEx?\"Os valores iniciais são um exemplo, não os números de um salão real. Com fonte: \"+DEF_FONTES.filter(d=>d.fonte).map(d=>d.n.toLowerCase()+\", \"+d.pad).join(\"; \")+\". Vazios, sem padrão de fonte aceita: \"+DEF_FONTES.filter(d=>!d.fonte).map(d=>d.n.toLowerCase()).join(\", \")+\". As fontes e o motivo de cada campo vazio estão no rodapé. Preencha com os números do seu salão.\":\"Conta feita com os números que você preencheu.\";\n"),
    ("[\"Resultado do salão\",R(c.resultado),c.enc.pl>0?",
     "[\"Resultado do salão\",R(c.resultado),fx?\"exemplo: de \"+R(fx.baixo)+\" a \"+R(fx.alto)+\" por mês com os custos da faixa das fontes (rodapé), depois de imposto, equipe, pró-labore e despesas\":c.enc.pl>0?"),
    # rodapé
    ("  <footer>\n",
     "  <footer>\n        <div id=\"exFontes\"></div>\n"),
    ("$(\"#reset\").addEventListener(\"click\",()=>{CAT=JSON.parse(JSON.stringify(DEF_CAT));",
     "$(\"#exFontes\").innerHTML=exFontesHtml();\n"
     "$(\"#reset\").addEventListener(\"click\",()=>{CAT=JSON.parse(JSON.stringify(DEF_CAT));"),
]

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p17_exemplo_mercado")
