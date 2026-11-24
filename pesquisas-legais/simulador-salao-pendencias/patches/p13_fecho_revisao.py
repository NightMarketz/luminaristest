"""Patch 13: fecho da rodada de texto de 21/11 (última antes do congelamento da página, F-SIM-8).

Fecha o que o p11/p12 deixaram da REVISAO-CONTEUDO-2026-11-21.md, conferido achado a achado em 24/11:
- R18 (lacuna b9d2): uma frase só para os 25% × 18% do ICMS, na ficha e na aba Insumos, pelo texto vigente da Lei SP 6.374
  art. 34 § 5º item 3 (red. NR; insumos-salao-sp D17): 25% para 33.03, 33.04, 33.05 e 33.07, exceto 33.05.10, 33.07.20, os
  códigos 33.07.10.0100 e 33.07.90.0500 e o antissolar e o bronzeador da 3304. A 33.06 não está na lista: fica nos 18%.
- R21 (lacuna 300d): o "As siglas:" da aba 1 ganha GARE, CPR 1200, FPAS, DCTFWeb, VRE e MOS (o p11 já explicou A.nnn,
  E.nnn e a Parte B do LALUR).
- R05 (lacuna fe42): o p12 afirmava como fato o ramo "nunca optou → Paulistana", que o dossiê nfse-paulistana-adaptador
  marca como inferido forte; e "já foi do Simples" era mais largo que o § 2º do art. 1º-A (o optante que depois sai).
Base: v49 (v48 + p11 + p12). Só texto. Uso: python p13_fecho_revisao.py <html>
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

ICMS = ("25% de ICMS para perfume e cosmético das posições 33.03, 33.04, 33.05 e 33.07, exceto xampu (33.05.10), "
        "desodorante (33.07.20), os códigos 33.07.10.0100 e 33.07.90.0500 e o antissolar e o bronzeador (3304); "
        "18% para o resto, inclusive higiene bucal (33.06) (Lei SP 6.374 art. 34 § 5º item 3)")

R = [
    # R18: ficha
    ("<small>Xampu (33.05.10), desodorante (33.07.20), antissolar e higiene bucal (33.06) pagam 18% de ICMS; o resto do cosmético, 25% (Lei SP 6.374 art. 34). Só pesa fora do Simples.</small>",
     "<small>" + ICMS[0].upper() + ICMS[1:] + ". Só pesa fora do Simples.</small>"),
    # R18: aba Insumos
    ("Interna: 25% para cosmético 33.03, 33.04, 33.05 e 33.07, exceto xampu 33.05.10 e desodorante 33.07.20; 18% para o resto (Lei SP 6.374 art. 34).",
     "Interna: " + ICMS + "."),
    # R21: glossário
    ("terceiros são salário-educação, Incra, Senac, Sesc e Sebrae.</p>",
     "terceiros são salário-educação, Incra, Senac, Sesc e Sebrae. GARE é a guia do ICMS de SP, e CPR 1200 o código do ICMS "
     "do regime normal na agenda da Sefaz-SP; FPAS é o código que diz ao INSS para quais entidades vão os terceiros; DCTFWeb "
     "é a declaração mensal dos tributos da folha à Receita; VRE é o portal de licenciamento da Prefeitura (Redesim); MOS é o "
     "manual do eSocial.</p>"),
    # R05: grau e alcance do § 2º
    ("\"o salão que já foi do Simples continua no Emissor Nacional; o que nunca foi emite a NFS-e Paulistana (IN SF/SUREM 10/2011 arts. 1º e 1º-A § 2º, red. IN SF/SUREM 13/2026)\"",
     "\"o salão que optou pelo Simples continua no Emissor Nacional mesmo depois de sair dele (IN SF/SUREM 10/2011 art. 1º-A § 2º, red. IN SF/SUREM 13/2026); o que nunca optou emite a NFS-e Paulistana, pela leitura da pesquisa (art. 1º): confirme com o contador\""),
]

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p13_fecho_revisao")
