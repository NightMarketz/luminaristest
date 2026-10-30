# Relatório de pesquisa legal — emissao-mei-me-por-tipo

**Pergunta:** MEI e ME/EPP do Simples: quais documentos fiscais (NFS-e, NF-e 55, NFC-e 65) são obrigatórios por operação, em SP capital, em 29/10/2026
**Aberto em:** 2026-10-29T03:17:09-03:00 · **Atualizado em:** 2026-10-29T10:44:05-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Serviço (NFS-e), MEI e ME/EPP: a NFS-e de padrão nacional é obrigatória, emitida pelo Emissor Nacional.**
- **ME/EPP:** a partir de **01/11/2026** (Res. CGSN 140 art. 59 § 1º, red. Res. CGSN 191/2026; efeitos pelo art. 3º I da Res. 191 [D04][D02]).
  A regra vale também quando a opção pelo Simples está pendente e quando o estabelecimento está impedido pelo sublimite (§ 1º-A).
  É vedada a NFS-e para operação sujeita só ao ICMS (§ 1º-B).
- **MEI:** obrigatória desde 01/09/2023 (Res. 140 art. 106-A, incl. Res. CGSN 169/2022 [D02]). **Até 31/12/2026**, para tomador pessoa física, a emissão é **facultativa** (art. 106-A § 2º; art. 106 II "a" 1).
  **Desde 01/01/2027**, o MEI "deverá emitir os documentos fiscais nas vendas e nas prestações de serviços realizadas" (art. 106, red. Res. CGSN 190/2026 [D03]).
  A partir de 2027 ele fica dispensado de destacar IBS/CBS (art. 106 § 1º V, incl. Res. 190 [D03]).

**Mercadoria (NF-e/NFC-e):**
- A ME/EPP usa os documentos autorizados pelo Estado (art. 59 I [D02]).
- O MEI, **até 31/12/2026**, está dispensado do DF-e de ICMS, salvo exigência do Estado com emissor gratuito (art. 106 § 1º III [D02]).
- O MEI, **desde 01/01/2027**, usa preferencialmente a Nota Fiscal Fácil (NFF, Ajuste SINIEF 37/2019), sem custo (art. 106-B, incl. Res. 190 [D03]).

**DPS do MEI** (Anexo I v1.01, gov.br/nfse, 09/02/2026 [D08]):
- `opSimpNac = 2`;
- sem `regApTribSN` (E0162);
- `regEspTrib = 0` (E0174);
- sem alíquota (E0600);
- sem retenção de ISS (E0583);
- sem tributos federais (E0676);
- sem dedução/redução nem benefício municipal (E0436/E0534);
- `pTotTribSN` proibido (E0710).

O `indTotTrib` só é proibido para ME/EPP (E0712) e não optante (E0713). A informação do total de tributos é **facultativa para o MEI** (Decreto 8.264/2014 art. 8º [D07]). Por isso o MEI informa `indTotTrib = 0`.

**Salão-parceiro (Lei 12.592/2012):**
- O documento ao consumidor discrimina as cotas-parte do salão e do profissional-parceiro, com o CNPJ deste (art. 59 § 2º [D02]).
- O profissional-parceiro emite documento ao salão pelas cotas-parte (§ 3º).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| ME/EPP obrigada a documento fiscal | LC 123 art. 26 I | [D01] | "emitir documento fiscal de venda ou prestação de serviço" |
| MEI dispensado, salvo hipóteses do CGSN | LC 123 art. 26 § 1º | [D01] | "ficando dispensado da emissão do documento fiscal" |
| NFS-e nacional obrigatória ME/EPP | Res. 140 art. 59 § 1º (red. Res. 191) | [D04] | "utilizará, obrigatoriamente, a Nota Fiscal de Serviço eletrônica (NFS-e) de padrão nacional" |
| Vigência 01/11/2026 | Res. 191 art. 3º I | [D04] | "a partir de 01 de novembro de 2026, em relação ao art. 1º" |
| MEI até 2026: PF facultativa | Res. 140 art. 106-A § 2º | [D02] | "a emissão da NFS-e é facultativa" |
| MEI desde 2027: sempre emite | Res. 140 art. 106 (red. Res. 190) | [D03] | "O MEI deverá emitir os documentos fiscais nas vendas e nas prestações de serviços realizadas" |
| MEI sem destaque de IBS/CBS | Res. 140 art. 106 § 1º V (incl. Res. 190) | [D03] | "de destacar os valores de IBS e CBS" |
| MEI mercadoria até 2026 | Res. 140 art. 106 § 1º III | [D02] | "da emissão de documento fiscal eletrônico, quando se referir a operação ou prestação sujeita à incidência de ICMS" |
| MEI mercadoria desde 2027 | Res. 140 art. 106-B (incl. Res. 190) | [D03] | "preferencialmente e sem custos para o MEI, o Regime Especial da Nota Fiscal Fácil" |
| Salão-parceiro | Res. 140 art. 59 § 2º | [D02] | "discriminação das cotas-parte do salão-parceiro e do profissional-parceiro" |
| Tributos facultativos ao MEI | Decreto 8.264 art. 8º | [D07] | "é facultativo para o Microempreendedor Individual" |
| DPS do MEI | Anexo I v1.01 RN E0162, E0174, E0583, E0600, E0676, E0710, E0712 | [D08] | "Para MEI pTotTribSN nunca poderá ser informado." |

## 3. Vigência conferida
- **Alertas do acervo.** D06 (Decreto 8.264) é versão original. Foi conferido no Planalto [D07]: o art. 8º não traz "Redação dada". A Res. 191 e a Res. 190 não estão no acervo e foram lidas na API oficial normasinternet2 da RFB [D03][D04]. A Res. 140 foi lida na visão multivigente oficial [D02], que mostra cada dispositivo com a data de início da vigência.
- **Redação atual.** Os dispositivos de 2027 aparecem como "AGENDADO" a partir de 01/01/2027 na visão multivigente [D02], e o texto vem da Res. 190 [D03]. A LC 123 art. 26 § 1º traz "(Vide LC 214/2025)". A LC 214 não muda a dispensa da lei; quem regula a emissão é o CGSN.
- **Regulamentação pendente.** Não foi conferido se a SEFAZ-SP exige o DF-e do MEI com emissor gratuito (art. 106 § 1º III), nem se a NFF está disponível em SP.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma que bloqueie a DPS do MEI. As regras do leiaute são fechadas, e o `indTotTrib` foi decidido pelo art. 8º do Decreto 8.264.

## 5. Lacunas
- A disponibilidade da NFF para o MEI de SP em 2027 e a eventual exigência de DF-e do MEI pela SEFAZ-SP até 2026 não foram lidas em fonte da SEFAZ-SP.
- O E0041 exige que o município emissor do MEI seja o do endereço no CNPJ. O Luminaris não confere o `codMun` contra o cadastro CNPJ, então essa checagem fica no runbook.

## 6. Adendo 30/10/2026 — MEI e consumidor PF a partir de 2027
Este dossiê diz que a NFS-e do MEI para tomador PF é facultativa "até 31/12/2026". Em 2027:
- a LC 214 art. 517 faz o documento fiscal obrigatório em toda venda e prestação do MEI (LC 123 art. 26 § 6º II, nova redação);
- a Res. CGSN 190 revoga o art. 106 II "a" 1 e o art. 106-A § 2º;
- a **Res. CGSN 195/2026 (DOU 22/10/2026) inclui o art. 106-C**: a DASN-Simei "poderá ser utilizada como documento fiscal
  eletrônico" na venda e no serviço a consumidor final PF sem CNPJ.

Resultado: em 2027 o MEI também não precisa de NFS-e por venda a PF, e para tomador CNPJ a NFS-e segue obrigatória. A
conferência do produto (`SimplesApuracaoService.ts:1028`, só tomador `CNPJ`) continua certa; o comentário dela precisa
citar o art. 106-C. Fontes e trechos literais: dossiê
[`triagem-contador-2026-10-30`](../triagem-contador-2026-10-30/relatorio.md) §6, [D17] e [D18].
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-29T03:17:33-03:00 · arquivo local `docs/D01_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D02]** D02_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/92278/visao/multivigente>  
  Baixado em 2026-10-29T03:17:34-03:00 · arquivo local `docs/D02_multivigente.html` · SHA-256 `32588ef739a8d592aa271ebb65f1beca2b73bbfb89965f32cd9a297a9d32d5e6`
- **[D03]** D03_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152832/visao/multivigente>  
  Baixado em 2026-10-29T03:18:33-03:00 · arquivo local `docs/D03_multivigente.html` · SHA-256 `f6b9c4986b051322caeec2eeb7e467ea38ae6d4aa2d8b16a5c7d95cbfca0317c`
- **[D04]** D04_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152781/visao/multivigente>  
  Baixado em 2026-10-29T03:18:56-03:00 · arquivo local `docs/D04_multivigente.html` · SHA-256 `d2148c9d8019be7a839d9b7a391279d4b57127eca3caad267a68473051972483`
- **[D05]** Lei nº 12.741 de 08/12/2012 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/e33bc65505876c73a657004d6b851ac97beec4fb/federal/leis-ordinarias/2012/lei-12741-2012-12-08.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-12-08;12741> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-29T10:29:34-03:00 · arquivo local `docs/D05_lei-12741-2012-12-08.md` · SHA-256 `103976202eaa46665837b129e870b36d9c038030a6d7637e3ee57b4d71f421cc`
- **[D06]** Decreto nº 8.264 de 05/06/2014 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/39239e708b021186cea3d407a5fc7984f2c725f5/federal/decretos/2014/dec-8264-2014-06-05.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2014-06-05;8264> · versao_texto: original · cópia de 2026-10-16  
  Lido em 2026-10-29T10:29:35-03:00 · arquivo local `docs/D06_dec-8264-2014-06-05.md` · SHA-256 `e37a5441aaa3982d632db59b5170e60259103f7db18c65f9df12b58986af8356`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D07]** Decreto nº 8264 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/decreto/d8264.htm>  
  Baixado em 2026-10-29T10:29:47-03:00 · arquivo local `docs/D07_d8264-htm.html` · SHA-256 `75aef9ce9ad6c2514573db032b6e1e2c2cbac4d53f87a1423c0fd18b5e15308f`
- **[D08]** D08_anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209-xlsx — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209.xlsx>  
  Baixado em 2026-10-29T10:43:33-03:00 · arquivo local `docs/D08_anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209-xlsx.html` · SHA-256 `de5bc492959eadc8bfa7540e16939995924f2188f743648eaf84d3b31e9eeb7c`

## Registro de buscas
_Nenhuma busca registrada._
