# Relatório de pesquisa legal — verif-2026-10-17-nfe-nfce-dfe

**Pergunta:** Reconferir com o texto vigente as decisões do projeto sobre NF-e, NFC-e e DF-e (ICMS/SEFAZ-SP): Ajustes SINIEF 07/05, 19/16, 9/22; contingência; QR v3/CSC; eventos; tpAmb; ICP-Brasil; RICMS/SP e portarias de NFC-e; NTs vigentes (IBS/CBS no XML); CFOP/CSOSN; destinação de item.
**Aberto em:** 2026-10-17T09:52:08-03:00 · **Atualizado em:** 2026-10-17T10:06:36-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**A maior parte das decisões confere com o texto vigente. Há uma divergência nova, de setembro de 2026, que o projeto
ainda não registra:** os Ajustes SINIEF 38/26 [D04] e 40/26 [D07] (DOU 14/09/2026, efeitos a partir de **01/11/2026**)
põem nos Ajustes 19/16 e 07/05 a mesma regra: *"O Pedido de Inutilização de Número da NFC-e [NF-e] previsto no 'caput'
não se aplica aos Estados do Acre, Bahia e São Paulo"* ([D03] cl. 16ª §6º; [D02] cl. 14ª §6º). O F-NFCE-5 e os itens
24–25 do BRIEF do X10a (inutilização pedida pelo operador, `inutilizar()` / `NFeInutilizacao4`, E-6 da EMENDA-1)
foram desenhados para SP e **perdem o objeto em SP a partir de 01/11/2026**. O que substitui a inutilização em SP não
está nos Ajustes. Depende de ato da SEFAZ-SP, que não achei (ver §4).

Conferem (verificado no texto vigente):
- **Cancelamento:** NFC-e em até **30 minutos**, sem saída da mercadoria ([D03] cl. 15ª, red. Ajuste 7/18). NF-e em
  até **24 h** ([D02] cl. 12ª, red. Ajuste 44/20). Por substituição: **168 h** para a NFC-e ([D03] cl. 15ª-A) e para a
  NF-e ([D02] cl. 12ª-A). A errata de 10/10 está certa.
- **CC-e vedada na NFC-e** ([D03] cl. 8ª §1º); CC-e na NF-e pela cl. 14ª-A [D02]. O F-NFCE-9 (c) é lícito.
- **Contingência da NFC-e** (dossiê `nfce-sp-contingencia`): a cl. 11ª [D03] e o art. 6º da Portaria SRE 40/2024 [D10]
  seguem iguais. A SRE 40 foi alterada só pela SRE 81/25. A conclusão (b) off-line obrigatória continua de pé.
- **CF-e-SAT vedado em SP desde 01/01/2026** (art. 34-D da Portaria CAT 147/12, acrescido pela SRE 79/24). O
  compilado de SP [D11] mantém o artigo; nenhuma alteração posterior o mexe.
- **Perfumaria/higiene fora da ST em SP desde 01/04/2026:** a Portaria SRE 94/2025 [D09] revoga o Anexo XI da Portaria
  CAT 68/19 e a SRE 48/25 (BC de perfumaria), com vigência em 01/04/2026. Que o Anexo XI seja o de perfumaria é
  inferência, tirada do art. 2º e do art. 3º.
- **PAA (memória "PAA não atende o salão"):** a cl. 1ª §§1º–2º do Ajuste 9/22, na redação do Ajuste 46/25 [D06]
  (efeitos a partir de 01/02/2026), restringe o uso a PF, MEI, TAC, produtor primário e Simples. No Simples e no MEI,
  vale só para operações por intermediador de comércio eletrônico. O Ajuste 21/26 [D05] muda só a cl. 2ª, que trata de
  quem pode ser PAA. **Confere.** O compilado do 9/22 não abriu (timeout no CONFAZ, e o navegador foi negado). Que não
  haja outra alteração em 2026 é inferência, tirada da varredura dos 45 Despachos CONFAZ de 2026 do acervo (só o
  Despacho 30/26 cita o Ajuste 9/22).
- **IBS/CBS no XML (NT 2025.002 v1.52, 01/10/2026 [P1]):** a RV UB12-10 (rej. 1115) vale em produção para **CRT 3 em
  NF-e/NFC-e emitida a partir de 03/08/2026** e para **CRT 1/2/4 a partir de 04/01/2027** (Obs. 2 e 3, p. 42 do
  PDF). Bate com `[RTC-SIMPLES]` do BRIEF. Para o salão em Presumido/Real (CRT 3), o grupo IBSCBS **já é obrigatório**
  em toda NF-e/NFC-e emitida hoje.
- **ICP-Brasil:** a MP 2.200-2/2001 [D01] (compilada, cópia de 15/10) continua vigente, com o art. 10 §1º (presunção
  de veracidade) e o art. 11. Os Ajustes exigem assinatura ICP-Brasil "contendo o número do CPF ou CNPJ de qualquer
  dos estabelecimentos" ([D03] cl. 15ª §2º II, 16ª §1º; [D02] cl. 14ª-A §1º, na redação do Ajuste 32/24 para a
  NFC-e).
- **Lote na NFC-e:** a NT 2023.002 [P4] eliminou o lote com mais de 1 NFC-e desde 04/09/2023. Isso bate com
  `[NT2025001-SINC]`.
- **CNPJ alfanumérico:** a NT 2026.004 v1.01 [P5] passa os campos CNPJ e chave de acesso a alfanuméricos, com produção
  em 01/07/2026. O `NFE_CHAVE_REGEX`/`CNPJ_REGEX` de `server/src/lib/cnpj.ts` segue essa direção. O padrão exato e o
  DV estão na NT Conjunta 2025.001, que não foi lida.

Desatualizado (versão citada superada; o conteúdo usado não muda):
- **NT 2025.001:** o projeto cita a **v1.02** (02/09/2025). A vigente é a **v1.03** (29/09/2025, produção em
  03/11/2025) [P2]. A v1.03 acrescenta o `tPag` **91 (pagamento posterior)** nas RV YA03-10/YA03-30 e põe ES/RJ de
  volta na E16a-30. O conteúdo do QR v3 não muda. A tabela `[NFE-PAG]` do BRIEF do X10a não lista o 91.
- **MOC:** a partir de 01/11/2026 o MOC da NF-e e o da NFC-e deixam de ser publicados por Ato COTEPE. Passam a ser o
  "MOC da NF-e/NFC-e", com versão online mantida pelo Paraná ([D07] cl. 1ª I e 2ª I; [D04] cl. 1ª e 2ª I). As
  transcrições do "MOC 7.0" (assinatura, cStat, leiaute) continuam válidas como texto. O PR-0 deve conferir se a
  versão online diverge.
- **Novas NTs fora do inventário do projeto** (lista do Portal, 17/10 [P0]): NT 2026.010 (DANFE RTC; produção em
  01/12/2026 [P3]; DANFE da NF-e 55 com bloco "Total do IBS/CBS/IS" e campos UB por item), NT 2026.009, NT 2026.006
  (split payment), NT 2026.003, NT 2014.001 v1.41 (EPEC) e NT 2014.002 v1.40. Só a 2026.010 foi lida.

Achado colateral (redação nova, com efeitos a partir de 03/08/2026): o Ajuste 9/26 trocou a alínea "c" da cl. 4ª VII
do 19/16. A identificação do destinatário com endereço passa a ser exigida em **operações não presenciais**, e não só na
entrega em domicílio [D03]. Isso não muda o F-NFCE-7 (b), que exige o destinatário sempre.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| SP sem inutilização de NFC-e | Aj. SINIEF 19/16 cl. 16ª §6º (Aj. 38/26, ef. 01/11/26) | [D03] [D04] | "não se aplica aos Estados do Acre, Bahia e São Paulo" |
| SP sem inutilização de NF-e | Aj. SINIEF 07/05 cl. 14ª §6º (Aj. 40/26, ef. 01/11/26) | [D02] [D07] | idem, "Pedido de Inutilização de Número da NF-e" |
| Cancelamento NFC-e | Aj. 19/16 cl. 15ª | [D03] | "em prazo não superior a 30 minutos" |
| Cancelamento NF-e | Aj. 07/05 cl. 12ª | [D02] | "Em prazo não superior a vinte e quatro horas" |
| Cancelamento por substituição | Aj. 19/16 cl. 15ª-A; Aj. 07/05 cl. 12ª-A | [D03] [D02] | "em prazo não superior a 168 horas" |
| CC-e vedada na NFC-e | Aj. 19/16 cl. 8ª §1º | [D03] | "vedada a emissão de carta de correção" |
| Contingência obrigatória | Aj. 19/16 cl. 11ª; Port. SRE 40/24 art. 6º | [D03] [D10] | "o contribuinte deverá operar em contingência" |
| SAT vedado | Port. CAT 147/12 art. 34-D | [D08] [D11] | "fica vedada a partir de 1º de janeiro de 2026" |
| PAA: quem usa | Aj. 9/22 cl. 1ª §§1º–2º (red. Aj. 46/25) | [D06] | "restrita às operações e prestações realizadas por intermediadores" |
| IBSCBS obrigatório | NT 2025.002 v1.52 RV UB12-10 | [P1] | "emissão maior ou igual a 03/08/2026 e emitente com CRT 3" |
| ICP-Brasil | MP 2.200-2 art. 10 §1º | [D01] | "presumem-se verdadeiros em relação aos signatários" |

## 3. Vigência conferida
- Os Ajustes SINIEF não estão no acervo, que só tem atos de DOU de 2025–2026 em `reguladores/confaz`. Por isso li o
  compilado do CONFAZ [D02] [D03]. A lista "Alterado pelos Ajustes" termina em 40/26 (07/05) e em 38/26 (19/16). A
  varredura dos 45 Despachos CONFAZ de 2026 do acervo (cópias de 15/10) não achou Ajuste posterior que altere 07/05,
  19/16 ou 9/22. O Despacho 48/26, de 13/10, só traz convênios de remissão.
- O RICMS/SP (Dec. 45.490/2000) não está no acervo, que tem decretos de SP só a partir de 2008. As portarias SRE/CAT
  também não estão (não há pasta de portarias). Li tudo em legislacao.fazenda.sp.gov.br.
- As NTs vêm do Portal NF-e. O `baixar` falhou com loop de redirect, então baixei com curl e cookie. Hashes em
  `docs/portal-nfe/` (§ Fontes extras).

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **Inutilização em SP a partir de 01/11/2026.** Leituras: (i) SP deixa de aceitar o `NFeInutilizacao4`, e o
   intervalo sem nota passa a ser tratado só pela regra da cl. 11ª §5º do 19/16, que presume como contingência não
   transmitida a quebra de sequência sem inutilização, constatada do 11º dia do mês seguinte em diante; (ii) SP tem
   (ou terá) mecanismo próprio, como inutilização automática ou declaração, por ato da SEFAZ-SP. Implicação: com (i),
   o F-NFCE-5 vira "não inutilizar em SP; evitar a quebra de sequência" e a presunção do §5º fica como risco
   (com §5º ainda aplicável a SP, o que é ambíguo); com (ii), depende do ato. **Leitura mais segura:** não executar
   E-6/itens 24–25 para SP sem o ato da SEFAZ-SP. Quem responde: o portal NFC-e/NF-e da SEFAZ-SP (notícia ou portaria
   SRE sobre o Aj. 38/26 e o 40/26), não o contador. É uma pergunta de fork ao dono, que reabre o F-NFCE-5.
2. **F-NFCE-7 (b), "sem CPF, sem nota".** O Ajuste não exige CPF abaixo de R$ 10.000 em venda presencial ([D03]
   cl. 4ª VII "a"/"b"). A recusa é escolha de produto, não lei. Mas a consequência que o BRIEF declara, "venda anônima
   fica sem NFC-e", conflita com o dever de documentar a saída (inferido: o art. 1º da Port. SRE 40/24 + o RICMS/SP;
   o artigo do RICMS que obriga a emissão não foi lido). Leitura mais segura: o produto não deve induzir venda sem
   documento. Ou o balcão permite NFC-e sem CPF, ou a tela avisa que a venda tem de ser documentada por outro meio.
   Decisão do dono, porque reabre fork ratificado.

## 5. Lacunas
- O compilado do Ajuste SINIEF 9/22 não abriu (timeout; o navegador embutido foi negado para confaz.fazenda.gov.br).
- Não achei ato da SEFAZ-SP que regule a falta de inutilização a partir de 01/11/2026.
- Tabela CFOP (Convênio s/nº 1970, Anexo): a fonte oficial não foi localizada. A pendência D-7 (CFOP 3.551) e o
  1.128/2.128 da errata ficam NÃO VERIFICADOS nesta sessão.
- O QR v3 em SP (dossiê `nfce-sp-qrcode-v3`) não foi conferido de novo no portal de SP. A NT foi de v1.02 para v1.03
  sem mudança no QR. A conclusão (c) continua.
- O `dfe-mtls-psc` não foi conferido de novo (MOC VG, transmissor). O único fato novo é a troca do MOC por versão
  online a partir de 01/11/2026.
- NT Conjunta 2025.001 (regra exata da chave/DV alfanumérico), NT 2026.006/2026.009/2026.003 e NT 2014.001 v1.41
  (EPEC): não lidas.

## Fontes extras (Portal Nacional da NF-e, baixadas com curl em 17/10/2026; `docs/portal-nfe/`)
- **[P0]** Lista de NTs: <https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=> · sha256 `9e4682677c2c0932…`
- **[P1]** NT 2025.002 v1.52 (`exibirArquivo.aspx?conteudo=HXPO8VLbh4o=`) · sha256 `54ed893327040a20a4a3c0562d342953542a1dc98e55d73dbe607d6c13d3d416`
- **[P2]** NT 2025.001 v1.03 (`conteudo=NvuzQGYd6E8=`) · sha256 `333b69f71debe5040585b677b574bb13b39362aa7934b904edc59cdf83cded02`
- **[P3]** NT 2026.010 v1.00 (`conteudo=ugn4MYF5PLg=`) · sha256 `eadc5246235f37a55f8140ddcf84595c8ce77f2d760f111f7b85ddf389b8f484`
- **[P4]** NT 2023.002 v1.01 (`conteudo=T3QyeMfpios=`) · sha256 `b0cb9528bfaa6e0b5ac2986c879898eebcbb9457e97fcf0af985a00659649031`
- **[P5]** NT 2026.004 v1.01 (`conteudo=BTZQzgsO9Ws=`) · sha256 `5f24a25351e790692754b07bbefac42ac67e70167a62a7806395d880f56675be`
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Medida Provisória nº 2.200-2, de 24 de Agosto de 2001 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6b9308d1da378562fa53395b5c2e9cd311bf86cc/federal/medidas-provisorias/2001/mpv-2200-2-2001-08-24.md>  
  Fonte oficial declarada: <https://www2.camara.leg.br/legin/fed/medpro/2001/medidaprovisoria-2200-2-24-agosto-2001-391394-normaatualizada-pe.html> · versao_texto: compilada · cópia de 2026-10-15  
  Lido em 2026-10-17T09:53:17-03:00 · arquivo local `docs/D01_mpv-2200-2-2001-08-24.md` · SHA-256 `8be514dbe810a87c5c8b179ba77bd51c810dfef929f9029368ae6991b729659e`
- **[D02]** AJUSTE SINIEF 7/05 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2005/AJ007_05>  
  Baixado em 2026-10-17T09:53:37-03:00 · arquivo local `docs/D02_AJ007_05.html` · SHA-256 `f44adf45f3e22df040e5dc588c5aa5d944b0a7a468ea90adecc000e405843670`
- **[D03]** AJUSTE SINIEF 19/16 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2016/AJ_019_16>  
  Baixado em 2026-10-17T09:53:38-03:00 · arquivo local `docs/D03_AJ_019_16.html` · SHA-256 `6692d344259fba1448dcb53b50385d9eb9106cec341af56c09316409feaa3570`
- **[D04]** AJUSTE SINIEF 38/26 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2026/AJ038_26>  
  Baixado em 2026-10-17T09:56:47-03:00 · arquivo local `docs/D04_AJ038_26.html` · SHA-256 `b3cedea480a39557c784366b8f0b969019e8e1e98f473d8e1680477c3d25fe19`
- **[D05]** AJUSTE SINIEF 21/26 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2026/AJ021_26>  
  Baixado em 2026-10-17T10:00:58-03:00 · arquivo local `docs/D05_AJ021_26.html` · SHA-256 `8acbfbe6cb5733c03795de416ecf2f86f1380d870c4c2be02f930292df0d9a1b`
- **[D06]** AJUSTE SINIEF 46/25 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ046_25>  
  Baixado em 2026-10-17T10:00:59-03:00 · arquivo local `docs/D06_AJ046_25.html` · SHA-256 `22369a01d4b81448c141fd870a05c1a3d170d011e526c7ba9f71721b12b7c2b2`
- **[D07]** AJUSTE SINIEF 40/26 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2026/AJ040_26>  
  Baixado em 2026-10-17T10:00:59-03:00 · arquivo local `docs/D07_AJ040_26.html` · SHA-256 `0e2af6737848d5403b90f2959de10d434781350607274cb82db774f5e56b1dd7`
- **[D08]** Portaria SRE 79 de 2024 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-79-de-2024.aspx>  
  Baixado em 2026-10-17T10:03:46-03:00 · arquivo local `docs/D08_Portaria-SRE-79-de-2024-aspx.html` · SHA-256 `495abcb591bd0f92bf6b82b8697350905100573b3780e18bf680ea4a223415e0`
- **[D09]** Portaria SRE 94 de 2025 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-94-de-2025.aspx>  
  Baixado em 2026-10-17T10:03:47-03:00 · arquivo local `docs/D09_Portaria-SRE-94-de-2025-aspx.html` · SHA-256 `3b27efa616f8ee4bb82ecabdc73b7921fd219b6aef4016a85df9869025e2dfa4`
- **[D10]** Portaria SRE 40 de 2024 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-40-de-2024.aspx>  
  Baixado em 2026-10-17T10:03:47-03:00 · arquivo local `docs/D10_Portaria-SRE-40-de-2024-aspx.html` · SHA-256 `437291313e23627bdcedc2204824a44c4194e36e7b98c890477865d4a7a94620`
- **[D11]** Portaria CAT 147 de 2012
						
Portaria CAT-147, de 05-11-2012 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/pcat1472012.aspx>  
  Baixado em 2026-10-17T10:04:02-03:00 · arquivo local `docs/D11_pcat1472012-aspx.html` · SHA-256 `7570c0da8d63b58c732c0fea23e2bc24841f7e367fb388635d915f8dd62ea495`

## Registro de buscas
_Nenhuma busca registrada._
