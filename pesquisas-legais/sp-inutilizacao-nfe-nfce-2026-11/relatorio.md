# Relatório de pesquisa legal — sp-inutilizacao-nfe-nfce-2026-11

**Pergunta:** Em SP, a partir de 01/11/2026 (Aj. SINIEF 38/26 e 40/26), o que substitui o Pedido de Inutilização de NF-e/NFC-e?
**Aberto em:** 2026-10-17T10:52:00-03:00 · **Atualizado em:** 2026-10-17T10:53:46-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**Não achei ato da SEFAZ-SP que diga o que substitui o Pedido de Inutilização em SP a partir de 01/11/2026.** O que
o texto vigente diz:
- A partir de 01/11/2026, o Pedido de Inutilização "não se aplica aos Estados do Acre, Bahia e São Paulo", tanto na
  NF-e ([D01] cl. 14ª §6º, acrescido pelo Aj. SINIEF 40/26 [D07] cl. 2ª II) quanto na NFC-e ([D02] cl. 16ª §6º,
  acrescido pelo Aj. SINIEF 38/26 [D06] cl. 2ª II). Os dois ajustes produzem efeitos "a partir do primeiro dia do
  segundo mês subsequente ao da publicação" (cl. 3ª); DOU 14/09/2026 ⇒ 01/11/2026.
- A norma paulista da NF-e é hoje a **Portaria SRE 80/25** [D03] (DOE 17/11/2025), que revogou a Portaria CAT 162/08
  [D05]. O art. 10 dela ainda diz que o contribuinte "poderá solicitar … a inutilização do número da NF-e … observados
  os requisitos e procedimentos previstos nas cláusulas décima segunda a décima quarta do Ajuste SINIEF 07/05". A
  remissão passa a apontar para uma cláusula que, de 01/11 em diante, exclui SP. A página da SRE 80/25 não lista ato
  posterior.
- A norma paulista da NFC-e, a **Portaria SRE 40/24** [D04], não trata de inutilização nem de quebra de sequência.
  Única alteração indicada: SRE 81/25.
- Os portais NF-e e NFC-e da SEFAZ-SP (portal.fazenda.sp.gov.br/servicos/nfe e /servicos/nfce, lidos em 17/10/2026)
  não têm aviso sobre o Aj. 38/26 ou o 40/26.
- **NFC-e:** a cl. 11ª §5º do Aj. 19/16 [D02] continua no texto: quebra de sequência "sem que tenha havido a
  inutilização", constatada a partir do 11º dia do mês seguinte, faz a numeração ser considerada de "documentos
  emitidos em contingência e não transmitidos". **NF-e:** o Aj. 07/05 [D01] não tem regra equivalente (busca por
  "emitidos e não transmitidos" e "quebra" no texto: só a cl. 14ª).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| SP sem inutilização (NF-e) | Aj. 07/05 cl. 14ª §6º | [D01] [D07] | "não se aplica aos Estados do Acre, Bahia e São Paulo" |
| SP sem inutilização (NFC-e) | Aj. 19/16 cl. 16ª §6º | [D02] [D06] | idem, "Pedido de Inutilização de Número da NFC-e" |
| Vigência | Aj. 38/26 e 40/26 cl. 3ª | [D06] [D07] | "primeiro dia do segundo mês subsequente ao da publicação" |
| Presunção (só NFC-e) | Aj. 19/16 cl. 11ª §5º (red. Aj. 26/19) | [D02] | "documentos emitidos em contingência e não transmitidos" |
| SP ainda remete à cl. 14ª | Port. SRE 80/25 art. 10 | [D03] | "poderá solicitar … a inutilização do número da NF-e" |
| MOC online mantido pelo PR | Aj. 07/05 cl. 2ª-A §2º; Aj. 19/16 cl. 3ª §2º | [D07] [D06] | "O Estado do Paraná deve disponibilizar … versão online do MOC" |

## 3. Vigência conferida
- Os Ajustes SINIEF não estão no acervo ctresb/leis (só atos de DOU de 2025–2026 em `reguladores/confaz`, sem
  compilado); li o compilado do CONFAZ [D01] [D02], com o mesmo SHA-256 do dossiê `verif-2026-10-17-nfe-nfce-dfe`.
- As portarias SRE/CAT não estão no acervo; lidas em legislacao.fazenda.sp.gov.br [D03] [D04] [D05].
- Busca web (17/10): só notícias de consultorias repetindo o texto do Ajuste e dizendo que o contribuinte deve
  "observar os procedimentos" da administração tributária. Nenhuma cita ato de SP. Não contam como fonte.

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **O que fazer com a quebra de sequência em SP depois de 01/11/2026.** Leituras: (i) dispensa pura: SP deixa de
   exigir o pedido e a lacuna não gera obrigação (leitura das notícias; nenhum ato de SP a confirma); (ii) SP
   substituirá por mecanismo próprio (inutilização automática, declaração ou evento), ainda não publicado; (iii) na
   NFC-e, a cl. 11ª §5º passa a valer sempre em SP, porque "sem que tenha havido a inutilização" vira a regra: toda
   lacuna seria presumida contingência não transmitida. A (iii) é a leitura literal mais dura e a que mais expõe o
   cliente. **Leitura mais segura:** evitar lacuna (não consumir número sem documento, ou reaproveitar o número da
   tentativa rejeitada) e não chamar `NFeInutilizacao4` para SP a partir de 01/11 até ato de SP.
   **Pergunta exata ao Fale Conosco da SEFAZ-SP (opção NF-e/NFC-e):** "Com o §6º da cl. 14ª do Aj. SINIEF 07/05 e o
   §6º da cl. 16ª do Aj. SINIEF 19/16 (efeitos em 01/11/2026), como o contribuinte paulista regulariza a quebra de
   sequência da numeração da NF-e e da NFC-e? O webservice NFeInutilizacao4 continua recebendo pedidos? A presunção da
   cl. 11ª §5º do Aj. 19/16 se aplica a SP?" (o Fale Conosco não responde interpretação; se recusar, a pergunta vai a
   Consulta formal ou ao contador).

## 5. Lacunas
- Nenhum ato da SEFAZ-SP (portaria SRE, comunicado ou aviso nos portais) sobre o Aj. 38/26 / 40/26 até 17/10/2026.
- Não sei se o `NFeInutilizacao4` de SP será desligado em 01/11/2026; só dá para ver em homologação depois da data.
- O MOC online do Paraná não foi localizado nesta sessão (endereço não publicado nos Ajustes).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** AJUSTE SINIEF 7/05 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2005/AJ007_05>  
  Baixado em 2026-10-17T10:52:01-03:00 · arquivo local `docs/D01_AJ007_05.html` · SHA-256 `f44adf45f3e22df040e5dc588c5aa5d944b0a7a468ea90adecc000e405843670`
- **[D02]** AJUSTE SINIEF 19/16 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2016/AJ_019_16>  
  Baixado em 2026-10-17T10:52:01-03:00 · arquivo local `docs/D02_AJ_019_16.html` · SHA-256 `6692d344259fba1448dcb53b50385d9eb9106cec341af56c09316409feaa3570`
- **[D03]** Portaria SRE 80 de 2025 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-80-de-2025.aspx>  
  Baixado em 2026-10-17T10:52:02-03:00 · arquivo local `docs/D03_Portaria-SRE-80-de-2025-aspx.html` · SHA-256 `256b5bb3143c6cbcba8fb9fdfcfb83cbf52c75f906cd824d29eeb078fb300b4a`
- **[D04]** Portaria SRE 40 de 2024 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-40-de-2024.aspx>  
  Baixado em 2026-10-17T10:52:02-03:00 · arquivo local `docs/D04_Portaria-SRE-40-de-2024-aspx.html` · SHA-256 `9e4f405f0da35c9e9bf5a792bd59296046ea9bcf6be14497b2f9f259eac454b8`
- **[D05]** Portaria CAT 162 de 2008
						
Portaria CAT- 162, de 29 -12-2008 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/pcat1622008.aspx>  
  Baixado em 2026-10-17T10:52:03-03:00 · arquivo local `docs/D05_pcat1622008-aspx.html` · SHA-256 `367e5e6b762773200473c39ae0f7dd5450ec51665edf01efa708b503ab119223`
- **[D06]** AJUSTE SINIEF 38/26 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2026/AJ038_26>  
  Baixado em 2026-10-17T10:52:58-03:00 · arquivo local `docs/D06_AJ038_26.html` · SHA-256 `b3cedea480a39557c784366b8f0b969019e8e1e98f473d8e1680477c3d25fe19`
- **[D07]** AJUSTE SINIEF 40/26 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2026/AJ040_26>  
  Baixado em 2026-10-17T10:52:59-03:00 · arquivo local `docs/D07_AJ040_26.html` · SHA-256 `0e2af6737848d5403b90f2959de10d434781350607274cb82db774f5e56b1dd7`

## Registro de buscas
_Nenhuma busca registrada._
