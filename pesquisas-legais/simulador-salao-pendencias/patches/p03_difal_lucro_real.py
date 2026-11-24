"""Patch 03: item 1 (lacuna L-20261121-123410-8b51). O DIFAL do insumo não é recuperável até 2032 (LC 87 art. 33 I)
e reduz o lucro real e a base da CSLL, como custo do insumo (RIR art. 302 I) ou tributo (RIR art. 352)
(dossiê pesquisas-legais/salao-difal-insumo-lucro-real). O valor do DIFAL fora do Simples segue a regra do optante:
lacuna L-20261121-150046-368c. Uso: python p03_difal_lucro_real.py <html> (depois do p02)."""
import sys
p=sys.argv[1];s=open(p,encoding="utf8").read()
old="  const L=b-pre.tot-c.folha-c.enc.tot-desp-(c.insumo||0)-(c.cartao||0); out.lucroReal=L;"
new=("  // lucro-fecha v2: o DIFAL do insumo (não recuperável, LC 87 art. 33 I) também sai do lucro real e da base da CSLL (RIR arts. 302 I e 352)\n"
     "  const L=b-pre.tot-c.folha-c.enc.tot-desp-(c.insumo||0)-(c.difal||0)-(c.cartao||0); out.lucroReal=L;")
old2="<li>Real: lucro = receita − tributos − equipe − insumos − outras despesas, sem adições nem exclusões."
new2="<li>Real: lucro = receita − tributos − equipe − insumos e o DIFAL deles − outras despesas, sem adições nem exclusões."
for o,n in((old,new),(old2,new2)):
    assert s.count(o)==1,o[:60];s=s.replace(o,n)
open(p,"w",encoding="utf8",newline="").write(s);print("p03 aplicado")
