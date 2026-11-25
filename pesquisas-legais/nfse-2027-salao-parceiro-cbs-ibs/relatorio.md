# Relatório de pesquisa legal — nfse-2027-salao-parceiro-cbs-ibs

**Pergunta:** O leiaute da NFS-e nacional para 2027 permite separar as cotas do salão-parceiro e do profissional-parceiro? O salão responde pela CBS/IBS do parceiro pessoa física (LC 214 art. 24 × Lei 12.592 art. 1º-A § 3º)?
**Aberto em:** 2026-11-24T01:20:27-03:00 · **Atualizado em:** 2026-11-24T01:44:38-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**(A) Leiaute da NFS-e nacional: separa a cota do parceiro, mas por dois caminhos de efeito diferente. Só um deles tira a cota da base de CBS/IBS.**

O leiaute novo, da NT 009 v1.01 [D09] e do Anexo VI v1.04.01 [D08], cria o grupo `vAjusteBC/docAjusteBC` com o tipo de ajuste `tpAjusteBC`. Para o salão (cTribNac 6.01 ou 6.02), o tipo **tem** de ser um destes dois [D08 RN L557, E0463]:
- **9, "Profissional parceiro"**:
  - reduz a base do **ISS** e a **receita bruta do Simples**;
  - **não reduz a base de CBS/IBS** [D08 AJUSTE_BC_REPERCUSSÃO L12: "9 | Profissional parceiro | ... | V | X | | V"];
  - o valor do tipo 9 é proibido no campo de ajuste da base de CBS/IBS, `vCalcAjusteBCIBSCBS` [D08 RN L93, E1531];
  - o documento pode ser "não fiscal" (`docOutro`) [D08 LEIAUTE L312];
  - o fornecedor pode ser identificado por CNPJ **ou CPF** [D08 LEIAUTE L315-L317].
- **199, "Outros reembolsos ou ressarcimentos ... por conta e ordem de terceiro"**:
  - reduz o ISS, a **base de CBS/IBS** e a receita bruta do Simples, com a nota "LC 214/2025: Art. 12, § 2º, inciso IV" [D08 AJUSTE_BC_REPERCUSSÃO L19];
  - **exige documento fiscal** referenciado [D08 RN L573, E0479];
  - o valor tem de somar no `vCalcAjusteBCIBSCBS` [D08 RN L94-L95].

Grau: **verificado** quanto ao leiaute lido.

- **Quando vale:** o grupo `vAjusteBC` está **só na Produção Restrita**, desde 20/10/2026. A página oficial não traz data para a Produção [D12, linha "20/10/2026": Produção "-"]. Na Produção vale o Anexo I v1.01 [D07], que não tem "Profissional parceiro" (tipos 01 a 99 do `tpDedRed`, só para ISS [D07 L254, L271]). Grau: **verificado**.
- **Para o simulador (SR27: salão do Simples com opção pelo regime regular de CBS/IBS):** a cota do parceiro só sai da base de CBS/IBS do salão se a nota do salão referenciar, como **tipo 199**, um **documento fiscal** emitido pelo parceiro.
  - Esse documento é a nota do parceiro ao salão pela cota, exigida pela Res. CGSN 140 art. 59 § 3º [D03].
  - Isso fecha com a exigência da LC 214 art. 12 § 2º IV de "documentação fiscal ... emitida em nome do terceiro" [D01].
  - Com o tipo 9 (documento não fiscal, parceiro só com CPF) a cota **fica na base de CBS/IBS** do salão.
  - O leiaute confirma em sistema a leitura (b), "mais segura", da Ambiguidade 1 do dossiê `salao-sr27-base-cbs-parceiro-sem-cnpj` (PR #1336): sem documento fiscal do parceiro, a cota integra a base de CBS/IBS. Grau: **inferido**, com o leiaute lido. A ligação "tipo 199 = cota de parceiro" é leitura minha da RN E0463, que oferece ao salão só o 9 ou o 199.
  - **Achado lateral:** com regApIBSCBSSN = 3 (regime regular) e tipo 9, a receita bruta do Simples **não** desconta a cota do parceiro: `vReceitaBrutaSN = vServ − descIncond − vCalcAjusteBCIBSCBS` [D08 RN L111]. Com 1 ou 2 desconta [D08 RN L110]. No SR27, então, o tipo 9 deixaria a cota dentro da receita do DAS, o que destoa da Lei 12.592 § 5º [D02] e da Res. 140 art. 2º § 5º VI [D03]. O caminho que o leiaute deixa para o salão do regime regular é o 199. Grau: **verificado** quanto à regra lida; o efeito é **inferido**.

**(B) Responsabilidade do salão pela CBS/IBS do parceiro pessoa física: não há regra expressa.**
- A LC 214 traz os responsáveis solidários no art. 24 [D01]: quem toma serviço sem documento idôneo, transportador, leiloeiro, desenvolvedor de software, quem concorre para a ocultação, e os recintos aduaneiros. O salão-parceiro não aparece. "Parceir" só aparece no loteamento, e "salão", "beleza" e "12.592" não aparecem na LC 214 nem no Dec. 12.955 [D01], [D05]. Grau: **verificado** (busca e leitura dos arts. 21 a 26).
- A Lei 12.592 manda o salão **reter e recolher** "os tributos e contribuições sociais e previdenciárias devidos pelo profissional-parceiro" [D02 art. 1º-A § 3º e § 10 II]. O texto é de 2012 e é genérico, sem referência à CBS/IBS.
- O caso só existe para o parceiro **pessoa física contribuinte** de CBS/IBS: não MEI, nem nanoempreendedor, e habitual [D01 art. 21 I "c"; art. 26 IV]. O parceiro MEI recolhe no DAS-MEI, e o nanoempreendedor não é contribuinte. Ver a Ambiguidade 1.
- **Para o simulador:** não pôr a CBS/IBS do parceiro como custo do salão. Mostrar a ressalva para o parceiro PF não MEI.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Salão: só tipo 9 ou 199 | Anexo VI NT 009, RN E0463 | [D08] | "Se o código de tributação nacional (cTribNac) = 6.01 ou 6.02, então o tipo da ajuste (tpAjusteBC) informado deve ser 'Profissional Parceiro' (tpAjusteBC = 9) ou 'Outros reembolsos ...' (tpAjusteBC = 199)" |
| Tipo 9 não ajusta CBS/IBS | Anexo VI, aba AJUSTE_BC_REPERCUSSÃO, células E12/F12/H12 | [D08] | E12 = "V" (Ajusta BC do ISSQN), F12 = "X" (Ajusta BC do IBS/CBS), H12 = "V" (Ajusta Receita Bruta do SN). A aba não tem legenda: V = sim e X = não é leitura pela linha 3 (percentual, só ISS) e pela RN E1531 |
| Tipo 199 ajusta CBS/IBS | idem, L19 | [D08] | "199 \| Outros reembolsos ... \| V \| V \| LC 214/2025: Art. 12, § 2º, inciso IV \| V" |
| 199 exige documento fiscal | RN E0479 | [D08] | "Para os tipos de ajuste (tpAjusteBC) = 101, 103, 104 ou 199, deve ser informado um documento fiscal." |
| 9 fora do ajuste de CBS/IBS | RN L93 (90), E1531 | [D08] | "Não é permitido informar ... (vCalcAjusteBCIBSCBS) ... se ... os tipos de ajuste (tpAjusteBC) for igual a: 2, 5, 6, 7, 8, 9 ou 99." |
| 9 aceita documento não fiscal | Leiaute L312 | [D08] | "Grupo de informações de documento não fiscal" (docOutro) |
| Receita SN no regime regular | RN L111 (108) | [D08] | "regApIBSCBSSN = 3 ..., o vReceitaBrutaSN = vServ - descIncond - vCalcAjusteBCIBSCBS" |
| Só na Produção Restrita | Atualizações e Implantações, 20/10/2026 | [D12] | "Criação do grupo vAjusteBC a partir do merge dos grupos vDedRed e gReeRepRes (item 2.3 da Nota Técnica 009)", com Produção "-" |
| Produção atual sem parceiro | Anexo I v1.01, tpDedRed | [D07] | "01 – Alimentação ... 08 – Subempreitada de mão de obra; 99 – Outras deduções" |
| Exclusão da base de CBS/IBS | LC 214 art. 12 § 2º IV | [D01] | "desde que a documentação fiscal relativa a essas operações seja emitida em nome do terceiro" |
| Nota do parceiro ao salão | Res. CGSN 140 art. 59 § 3º | [D03] | "O profissional-parceiro emitirá documento fiscal destinado ao salão-parceiro relativamente ao valor das cotas-parte recebidas." |
| Nota unificada | Res. CGSN 140 art. 59 § 2º | [D03] | "a discriminação das cotas-parte do salão-parceiro e do profissional-parceiro, bem como o CNPJ deste" |
| Documento eletrônico em 2027 | Res. CGSN 140 art. 59 § 9º (red. Res. 190) | [D04] | "a base de cálculo e os tributos porventura devidos devem ser indicados nos campos próprios, conforme ... manual de especificações" |
| Responsáveis solidários | LC 214 art. 24 | [D01] | "Sem prejuízo das demais hipóteses previstas na Lei nº 5.172 ... e na legislação civil, são solidariamente responsáveis pelo pagamento do IBS e da CBS:" (incisos I a VI, sem o salão) |
| Retenção pelo salão | Lei 12.592 art. 1º-A § 3º e § 10 II | [D02] | "retenção e de recolhimento dos tributos e contribuições sociais e previdenciárias devidos pelo profissional-parceiro" |
| Parceiro habitual é contribuinte | LC 214 art. 21 I "c" | [D01] | "de forma profissional, ainda que a profissão não seja regulamentada" |
| Nanoempreendedor não é | LC 214 art. 26 IV | [D01] | "nanoempreendedor, assim entendido a pessoa física que tenha auferido receita bruta inferior a 50% ... do limite ... do MEI" |
| Mesmo rol no decreto | Dec. 12.955 art. 23 | [D05] | "são solidariamente responsáveis pelo pagamento da CBS: (Art. 24 da Lei Complementar nº 214...)" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:**
  - LC 214 e Dec. 12.955: compilados do Planalto [D01], [D05].
  - Lei 12.592: acervo compilado, cópia de 13/10/2026, sem alerta [D02].
  - Res. CGSN 140 na visão multivigente [D03]. A Res. 190 [D04] e a Res. 195 [D06] valem a partir de 01/01/2027. A 190 dá nova redação ao § 9º do art. 59 e não mexe nos §§ 2º e 3º. A 195 trata do MEI.
- **Leiaute:** a Produção usa o Anexo I v1.01, de 09/02/2026 [D07]. A Produção Restrita usa a NT 009 v1.01 com o Anexo VI v1.04.01 [D08], [D09]. A página de implantações [D12] avisou "TEXTO MUDOU desde 31/10/2026". Isso toca o dossiê `vigilancia-2026-10-31-paa-nfse` (D02), cuja conclusão não foi relida aqui; registrado na caixa.
- As planilhas foram extraídas para `docs/D07_anexoI_planilha.txt` e `docs/D08_anexoVI_planilha.txt`, com a referência [aba!linha]. O `.txt` que o `legal.py` gera de XLSX são bytes do zip; registrado na caixa como defeito da ferramenta.

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **O salão responde pela CBS/IBS do parceiro pessoa física contribuinte?**
   - **(a) Não.** A LC 214 tem rol próprio de responsáveis (art. 24), e a Lei 12.592 é de 2012, anterior à CBS/IBS. O parceiro contribuinte apura e paga a própria CBS/IBS.
   - **(b) Sim, como retentor.** A Lei 12.592 § 3º e § 10 II falam de "tributos ... devidos pelo profissional-parceiro" sem limitar a espécie. O art. 24 da LC 214 ressalva as "demais hipóteses previstas" no CTN e na legislação civil. A Lei 12.592, porém, não é CTN nem lei civil.
   - **Implicação:** em (b), o salão teria de reter e recolher a CBS/IBS sobre a cota do parceiro PF não MEI. Em (a), não. Para parceiro MEI ou nanoempreendedor a questão não existe.
   - **Mais segura:** que o parceiro seja MEI (ou tenha CNPJ), o que afasta a dúvida e cumpre a Res. 140 art. 59 § 2º. No simulador, ressalva para o parceiro PF não MEI.
   - **Pergunta exata ao contador:** "Em 2027, profissional-parceiro pessoa física (sem CNPJ, não MEI, habitual) de salão em SP. A Lei 12.592 art. 1º-A § 3º manda o salão reter 'os tributos ... devidos pelo profissional-parceiro'. O salão deve reter e recolher a CBS/IBS do parceiro, ou o parceiro é contribuinte próprio (LC 214 art. 21 I 'c'), sem responsabilidade do salão, já que a LC 214 art. 24 não traz essa hipótese?"
2. **Tipo 9 × tipo 199 para a cota do parceiro.** O leiaute não diz em que caso usar cada um. A leitura adotada é: tipo 199 quando há nota fiscal do parceiro e o salão quer tirar a cota da base de CBS/IBS; tipo 9 nos demais casos. Até a NT sair da Produção Restrita, isso pode mudar. É monitorar a NT, não perguntar ao contador.

## 5. Lacunas
- Não há data de entrada em Produção para o grupo `vAjusteBC`, que hoje está só na Produção Restrita [D12].
- Não foram lidas: as NT 001, 002, 003, 005, 006, 008 (DANFSe) e 010, os Anexos VII e VIII, o Anexo C e os XSD. A NT 008 pode mostrar se as cotas aparecem ao consumidor (Res. 140 art. 59 § 2º).
- O Anexo VI [D08] é inconsistente internamente: a nota da linha L54 fala em "códigos 105 a 199", e as RN L94-L95 listam 101 a 105 e 199.
- O Regulamento do IBS não foi lido para responsáveis. O Dec. 12.955 [D05] cobre só a CBS.
- Não foi conferido se o profissional pessoa física sem CNPJ consegue emitir NFS-e nacional ao salão. Sem isso, o tipo 199 fica inviável para ele.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-11-24T01:24:21-03:00 · arquivo local `docs/D01_lcp214-htm.html` · SHA-256 `434cd429d6b8c78537692e7fa28d8e353df907409b763d46ea2302ff266cf959`
- **[D02]** Lei nº 12.592 de 18/01/2012 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a31cf3cd12073c7b195933a53e733b85c00cfe02/federal/leis-ordinarias/2012/lei-12592-2012-01-18.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-01-18;12592> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:24:29-03:00 · arquivo local `docs/D02_lei-12592-2012-01-18.md` · SHA-256 `ae4c4aae44ba1bd08493c05fd82e366cdd2f3bf263b93383f93b1f936541fd00`
- **[D03]** Resolução CGSN nº 140, de 22 de maio de 2018 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/92278/visao/multivigente>  
  Baixado em 2026-11-24T01:24:30-03:00 · arquivo local `docs/D03_rfb-92278-multivigente.json` · SHA-256 `158a09df9d0832b58264f9a0f625f75b9238563c44c967c7b5ea03bde5f48cb3`  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 190, de 4 de agosto de 2026, a partir de 01/01/2027 (rfb:152832)  
  ⚠ alteração com vigência futura: Alterado(a) pelo(a) Resolução CGSN nº 195, de 21 de outubro de 2026, a partir de 01/01/2027 (rfb:154194)  
  ⚠ 24 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D04]** Resolução CGSN nº 190, de 4 de agosto de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/152832/visao/multivigente>  
  Baixado em 2026-11-24T01:24:30-03:00 · arquivo local `docs/D04_rfb-152832-multivigente.json` · SHA-256 `9d1b3419c37266069da0ff3eb51292886279aac4674436e4e540b1bbf57dce6b`  
  ⚠ 6 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D05]** d12955 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm>  
  Baixado em 2026-11-24T01:24:33-03:00 · arquivo local `docs/D05_d12955-htm.html` · SHA-256 `2c81441eff158c2c733c058896a8b865ee097e0afe84408fb080f4b882394908`
- **[D06]** Resolução CGSN nº 195, de 21 de outubro de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/154194/visao/multivigente>  
  Baixado em 2026-11-24T01:25:54-03:00 · arquivo local `docs/D06_rfb-154194-multivigente.json` · SHA-256 `744914843138b566449799d31c8bb6264fa34bd58fc7222babf23c60968b0579`
- **[D07]** D07_anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209-xlsx — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209.xlsx>  
  Baixado em 2026-11-24T01:28:04-03:00 · arquivo local `docs/D07_anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209-xlsx.html` · SHA-256 `de5bc492959eadc8bfa7540e16939995924f2188f743648eaf84d3b31e9eeb7c`
- **[D08]** D08_anexovi-leiautesrn_rtc_ibscbs-v1-04-01-nt009-xlsx — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/anexovi-leiautesrn_rtc_ibscbs-v1-04-01-nt009.xlsx>  
  Baixado em 2026-11-24T01:28:04-03:00 · arquivo local `docs/D08_anexovi-leiautesrn_rtc_ibscbs-v1-04-01-nt009-xlsx.html` · SHA-256 `103a150dd6f56ec8edcaa3a453b59a1b0e096d7cd5025d7bd06a387f141ddf39`
- **[D09]** D09_nota-tecnica-009-se-cgnfs-e-v-1-01-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/nota-tecnica-009-se-cgnfs-e-v-1-01.pdf>  
  Baixado em 2026-11-24T01:28:07-03:00 · arquivo local `docs/D09_nota-tecnica-009-se-cgnfs-e-v-1-01-pdf.pdf` · SHA-256 `cc86c9402e317e84eb3a9f48bbd5e0b8e3dcd84f2645700190c84d45bf1ea58e`
- **[D10]** D10_nt-004-se-cgnfse-novo-layout-rtc-v2-00-20251210-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/producao-restrita/nt-004-se-cgnfse-novo-layout-rtc-v2-00-20251210.pdf>  
  Baixado em 2026-11-24T01:28:09-03:00 · arquivo local `docs/D10_nt-004-se-cgnfse-novo-layout-rtc-v2-00-20251210-pdf.pdf` · SHA-256 `707524b2110a3af55a232110ead632abe14d745a60307f8dcc062ec220d4058f`
- **[D11]** D11_nt-007-se-cgnfse-v1-0-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/nt-007-se-cgnfse-v1-0.pdf>  
  Baixado em 2026-11-24T01:28:10-03:00 · arquivo local `docs/D11_nt-007-se-cgnfse-v1-0-pdf.pdf` · SHA-256 `24e46b39fcf73d40b8241147b2c0607159893fd5934f16f63f3103343972cf05`
- **[D12]** Atualizações e Implantações — Portal da Nota Fiscal de Serviço eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/atualizacoes-e-implantacoes>  
  Baixado em 2026-11-24T01:34:21-03:00 · arquivo local `docs/D12_atualizacoes-e-implantacoes.html` · SHA-256 `5814027431d90f625373d4eabf7e62e3727ea5bf7fb2beaa0589583afffe1641`  
  ⚠ TEXTO MUDOU desde 2026-10-31. Dossiês que citaram a versão anterior: vigilancia-2026-10-31-paa-nfse D02. Conferir se a conclusão deles ainda vale

## Registro de buscas
_Nenhuma busca registrada._
