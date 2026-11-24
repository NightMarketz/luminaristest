"""Patch 02: item 2 (lacuna L-20261121-135754-f56d) e item 10 (calendário).

Item 2 (dossiê pesquisas-legais/salao-sr27-base-cbs-parceiro-sem-cnpj): a base da CBS/IBS é o valor integral cobrado
(LC 214 art. 12 § 1º); a cota do parceiro só sai se a nota sair em nome dele (art. 12 § 2º IV), e a nota conjunta do
salão-parceiro exige o CNPJ dele (Res. CGSN 140 art. 59 § 2º). Leitura segura: a cota do parceiro SEM CNPJ entra na
base da CBS/IBS de 2027 (SR, Presumido e Real), como no DAS. Ponto ambíguo vai a "Ainda é decisão".
Item 10 (dossiê pesquisas-legais/salao-prazo-ibs-icms-revenda): IBS até o último dia útil do mês seguinte
(Res. CGIBS 6/2026 art. 45); ICMS do RPA de SP, CPR 1200, até o dia 20 do mês seguinte (RICMS/SP art. 112; Anexo IV).

Uso: python p02_cbs_parceiro_e_prazos.py <arquivo.html>   (depois do p01)
"""
import sys

REPL = [
    # regimes(): base da CBS/IBS de 2027 com a cota do parceiro sem CNPJ
    ("  const cbsAl=Math.max(0,(x.cbs||0)/100-LEI.cbsRed);\n",
     "  const cbsAl=Math.max(0,(x.cbs||0)/100-LEI.cbsRed);\n"
     "  // parceiro-cbs v1: a cota do parceiro sem CNPJ entra na base da CBS/IBS de 2027 (LC 214 art. 12 § 1º e § 2º IV; Res. CGSN 140 art. 59 § 2º)\n"
     "  const repS=numP(c.repSem), bCI=b+repS, blCI=repS>0?\"receita com a cota do parceiro sem CNPJ − ISS − créditos\":\"receita − ISS − créditos\";\n"),
    (":[{k:\"CBS\",bl:\"receita − ISS − créditos\",base:b-issV-cred-insB27,al:cbsAl},{k:\"IBS\",bl:\"receita − ISS − créditos\",base:b-issV-cred-insB27,al:LEI.ibs27}];",
     ":[{k:\"CBS\",bl:blCI,base:bCI-issV-cred-insB27,al:cbsAl},{k:\"IBS\",bl:blCI,base:bCI-issV-cred-insB27,al:LEI.ibs27}];"),
    # calendário
    ("[\"Mensal\",\"CBS e IBS no regime regular\",R(c.cbsReg)+\" fora do DAS (opção de 2027)\"]",
     "[\"Último dia útil\",\"CBS e IBS no regime regular\",R(c.cbsReg)+\" fora do DAS, do mês anterior (opção de 2027; Decreto 12.955 art. 45; Res. CGIBS 6/2026 art. 45)\"]"),
    ("[\"Mensal\",\"IBS do mês anterior\",R(ibs)+\"; o prazo é do regulamento do Comitê Gestor, que esta página não pesquisou\"]",
     "[\"Último dia útil\",\"IBS do mês anterior\",R(ibs)+\", com os feriados do município da sede (regulamento do IBS, Res. CGIBS 6/2026 art. 45). Em 2027 não há dispensa: a de LC 214 art. 348 § 1º vale só para 2026\"]"),
    ("[\"Mensal\",\"ICMS da revenda (regime normal de SP)\",R(icms)+\" em GARE; o dia de vencimento do RICMS/SP não foi pesquisado\"]",
     "[\"Dia 20\",\"ICMS da revenda (regime normal de SP)\",R(icms)+\" em GARE, do mês anterior (RICMS/SP art. 112; Anexo IV, CPR 1200); sem expediente, o dia útil seguinte, como na agenda da Sefaz-SP\"]"),
    # aba 7: a ambiguidade, com a pergunta pronta
    ("    [\"Insumo estético aplicado no cliente e o crédito de CBS (2027)\",",
     "    [\"Cota do parceiro sem CNPJ na base da CBS e do IBS (2027)\",x.ano===\"2027\"&&c.parceiros.some(p=>!p.cnpj)&&c.reg!==\"S\",\"Em 2027, o salão no regime regular de CBS/IBS (ou com a opção do Simples) tem profissional-parceiro da Lei 12.592 sem CNPJ, identificado só por CPF. A cota dele pode ser excluída da base da CBS/IBS do salão pela LC 214 art. 12 § 2º IV, ou, sem o CNPJ exigido pela Res. CGSN 140 art. 59 § 2º, ela integra o valor da operação (art. 12 § 1º)?\",\"A base da CBS e do IBS é o valor integral cobrado (LC 214 art. 12 § 1º); o que só passa pelo salão sai se a nota for emitida em nome do terceiro (§ 2º IV), e a nota conjunta pede o CNPJ do parceiro (Res. CGSN 140 art. 59 § 2º). A conta usa a leitura segura: a cota do parceiro sem CNPJ entra na base, como no DAS. A outra leitura (fora da base, porque o serviço é do parceiro e a LC 214 não exige CNPJ) baixaria a CBS e o IBS.\"],\n"
     "    [\"Insumo estético aplicado no cliente e o crédito de CBS (2027)\","),
]


def main(path):
    s = open(path, encoding="utf8").read()
    for old, new in REPL:
        n = s.count(old)
        if n != 1:
            sys.exit(f"trecho casou {n} vezes: {old[:90]!r}")
        s = s.replace(old, new)
    open(path, "w", encoding="utf8", newline="").write(s)
    print("p02 aplicado")


if __name__ == "__main__":
    main(sys.argv[1])
