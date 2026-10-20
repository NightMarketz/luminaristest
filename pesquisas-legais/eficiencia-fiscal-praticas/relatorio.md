# Relatório de pesquisa legal — eficiencia-fiscal-praticas

**Pergunta:** Quais práticas de eficiência fiscal (planejamento tributário) são lícitas e automatizáveis num ERP de PME (salão/clínica, Simples/Presumido/Real), e qual o limite legal — em especial realocar o preço dentro de um combo para o produto com tributação menor mantendo o total?
**Aberto em:** 2026-10-20T11:40:05-03:00 · **Atualizado em:** 2026-10-20T11:57:44-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Realocar o preço dentro de um combo para o item de tributação menor, mantendo o total, não é elisão: é preço
declarado abaixo do valor real do item, que a lei manda desconsiderar e arbitrar.** Hoje: CTN art. 148 [D01] (arbitramento
quando o documento "não mereça fé"), art. 116 parágrafo único [D01] (desconsideração de ato que dissimula o fato gerador),
art. 149 VII [D01] (revisão de ofício por dolo, fraude ou simulação) e Lei 8.137 art. 1º II e IV [D02] (inserir elementos
inexatos em documento fiscal; emitir documento que saiba inexato — crime, reclusão de 2 a 5 anos). A partir de 2027, a
LC 214 trata o caso de frente: art. 7º [D08] obriga a especificar cada fornecimento com o seu respectivo valor quando os
tratamentos tributários diferem, e o § 3º manda tratar cada item como independente e **arbitrar** a base pelo art. 13 se
a cobrança unificada descumprir isso; art. 13 I "b" [D08] arbitra quando o documento declara "valor notoriamente inferior
ao valor de mercado". A alíquota uniforme do IBS/CBS também esvazia o ganho: a diferença de alíquota entre itens some para
a maioria dos produtos de salão/clínica.

**O que é lícito e o sistema pode automatizar** (elisão: antes do fato gerador, sem simulação, pela própria lei):
(a) **desconto incondicional** destacado no documento fiscal — sai da receita bruta do Simples (LC 123 art. 3º § 1º [D04])
e da base do IBS/CBS (LC 214 art. 12 § 2º III e § 3º [D08]) — desde que o preço de cada item seja o real e o desconto
seja rateado de forma explicável (proporcional por padrão); (b) **segregação de receitas** no Simples por produto
monofásico e ICMS-ST (LC 123 art. 18 § 4º-A I [D04]; Lei 10.147 art. 2º [D05] — alíquota zero de PIS/COFINS na revenda de
perfumaria/toucador/higiene 33.03–33.07, exceto 33.06, por quem não é industrial/importador; o parágrafo único veda ao
"Simples" antigo, a segregação no Simples Nacional vem da LC 123), ISS retido, exportação e ISS de outro município
(§ 4º-A II a V); (c) **fator r** (LC 123 art. 18 §§ 5º-J, 5º-K e 5º-M [D04]) — Anexo III quando folha/receita dos 12 meses
≥ 28 %; (d) **salão-parceiro** (Lei 13.352 [D06/D07], Lei 12.592 art. 1º-A § 5º): a cota-parte do profissional não entra
na receita bruta do salão mesmo com nota unificada; (e) **fornecimento principal + acessórios** (LC 214 art. 7º II e § 2º
[D08]): um kit cujo acessório é condição ou meio do principal recebe o tratamento do principal — classificação, não
realocação de preço.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Arbitramento do preço | CTN art. 148 | [D01] | "a autoridade lançadora… arbitrará aquele valor ou preço, sempre que… não mereçam fé as declarações… ou os documentos expedidos pelo sujeito passivo" |
| Norma antielisão | CTN art. 116 p.ú. | [D01] | "poderá desconsiderar atos ou negócios jurídicos praticados com a finalidade de dissimular a ocorrência do fato gerador" |
| Revisão de ofício | CTN art. 149 VII | [D01] | "quando se comprove que o sujeito passivo… agiu com dolo, fraude ou simulação" |
| Crime | Lei 8.137 art. 1º II, IV | [D02] | "inserindo elementos inexatos… em documento ou livro exigido pela lei fiscal"; "emitir ou utilizar documento que saiba ou deva saber falso ou inexato" |
| Combo com tratamentos diferentes | LC 214 art. 7º caput, I, II, § 1º–§ 3º | [D08] | "será obrigatória a especificação de cada fornecimento e de seu respectivo valor"; § 3º "cada fornecimento será considerado independente… e a base de cálculo… será arbitrada na forma do art. 13" |
| Arbitramento IBS/CBS | LC 214 art. 13 I "b", p.ú. I | [D08] | "for declarado em documento fiscal valor notoriamente inferior ao valor de mercado"; base = "valor praticado em operações comparáveis entre partes não relacionadas" |
| Desconto incondicional | LC 214 art. 12 § 2º III, § 3º | [D08] | "parcela redutora do preço da operação que conste do respectivo documento fiscal e não dependa de evento posterior" |
| Receita bruta do Simples | LC 123 art. 3º § 1º | [D04] | "não incluídas as vendas canceladas e os descontos incondicionais concedidos" |
| Segregação | LC 123 art. 18 § 4º-A I–V | [D04] | "O contribuinte deverá segregar, também, as receitas: I - … monofásica… ICMS… substituto tributário…" |
| Fator r | LC 123 art. 18 §§ 5º-J, 5º-K, 5º-M | [D04] | "Anexo III… caso a razão entre a folha de salários e a receita bruta… seja igual ou superior a 28%" |
| Monofásico na revenda | Lei 10.147 art. 1º I "b", art. 2º | [D05] | "São reduzidas a zero as alíquotas… pelas pessoas jurídicas não enquadradas na condição de industrial ou importador" |
| Salão-parceiro | Lei 12.592 art. 1º-A § 5º (red. Lei 13.352) | [D07] | "A cota-parte destinada ao profissional-parceiro não será considerada para o cômputo da receita bruta do salão-parceiro ainda que adotado sistema de emissão de nota fiscal unificada" |
| Alíquotas reduzidas 2027 | LC 214 arts. 127, 128 II, 130, 136 + Anexo VIII | [D08] | "reduzidas em 30%… profissionais… atividades intelectuais"; "reduzidas em 60%… serviços de saúde"; Anexo VIII = sabões de toucador 3401.11.90, dentifrícios, escovas, papel higiênico, fraldas |
| Vedações ao Simples (interdependência) | LC 123 art. 3º § 4º III, IV, IX | [D04] | "sócia de outra empresa que receba tratamento… desde que a receita bruta global ultrapasse o limite"; "mais de 10%… de outra empresa não beneficiada"; "resultante… de cisão… nos 5 anos" |

## 3. Vigência conferida
- Alertas do acervo: [D03] LC 214 era republicação (só vetos) → conferida a compilada do Planalto [D08] (com LC 227/2026);
  [D06] Lei 13.352 era texto original → conferida no Planalto [D07] (texto da Lei 12.592 alterada). [D01], [D02], [D04],
  [D05] compilados e recentes (13/10/2026), sem alerta.
- Redação atual: LC 123 art. 3º § 1º com redação da LC 214 (efeitos 1º/1/2025); art. 18 § 4º-A I traz "(Vide LC 214)".
  CTN art. 146 alterado pela LC 236/2026 (não afeta a conclusão).
- Regulamentação pendente: art. 116 p.ú. do CTN ainda depende de "procedimentos a serem estabelecidos em lei ordinária"
  (a desconsideração opera hoje por simulação/arbitramento, não pela norma antielisão); LC 214 art. 12 § 4º e art. 13
  remetem a regulamento; Lei 10.147 art. 2º p.ú. refere o "Simples" da Lei 9.317 (regime extinto) — no Simples Nacional
  a segregação decorre da LC 123.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **A1 — Desconto incondicional concentrado no item mais tributado.** Leitura 1: o fornecedor fixa o preço de cada
  item livremente e o desconto é política comercial, logo concentrar o desconto no item de maior carga é lícito se
  constar do documento. Leitura 2: se o preço líquido do item ficar "notoriamente inferior ao valor de mercado" (LC 214
  art. 13 I "b") ou o documento "não merecer fé" (CTN 148), o fisco arbitra, e a concentração sistemática é indício de
  simulação. Leitura mais segura: desconto rateado proporcionalmente por padrão; concentração só com justificativa
  comercial registrada e piso de preço (custo + margem) por item. Pergunta ao contador: "Aceita desconto incondicional
  alocado por item fora da proporção, desde que nenhum item fique abaixo do custo? Qual piso vocês defendem?"
- **A2 — Kit com fornecimento principal (LC 214 art. 7º II).** O que é "condição ou meio" (§ 2º) para serviço de beleza
  com produto incluído? Leitura: produto aplicado no serviço = acessório (tratamento do serviço); produto levado para casa
  = fornecimento próprio. Pergunta: "Produto entregue ao cliente junto com o serviço é acessório ou fornecimento autônomo?"
- **A3 — Fator r induzido.** Elevar pró-labore/folha para cruzar 28 % é lícito se a remuneração for real e paga; é
  simulação se for só contábil. O sistema pode simular e alertar, não decidir.

## 5. Lacunas
- Jurisprudência (CARF/STJ) sobre alocação de preço em kit e "propósito negocial": não lida no acervo nesta rodada
  (pesquisa web separada, grau inferido). Soluções de Consulta Cosit sobre kit com item monofásico: não localizadas
  em fonte oficial.
- Regulamento da LC 214 sobre art. 12 § 4º / art. 13: não publicado/não lido.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 5.172 de 25/10/1966 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/04685ef7689b7028d0dc835e5cde644ad7a2d328/federal/leis-ordinarias/1966/lei-5172-1966-10-25.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1966-10-25;5172> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:40:31-03:00 · arquivo local `docs/D01_lei-5172-1966-10-25.md` · SHA-256 `fe8ef71d4ebe8c0d04d3422ca95853e15291c5c7ca6168cd34ae7b8ee6e3983b`
- **[D02]** Lei nº 8.137 de 27/12/1990 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/4014f7c4c6ca10c8b2509f14950fdb95d554a963/federal/leis-ordinarias/1990/lei-8137-1990-12-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-12-27;8137> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:40:32-03:00 · arquivo local `docs/D02_lei-8137-1990-12-27.md` · SHA-256 `a2136e863aa9dcd17f462b2cba079b2d7cd4a283e9759a9ca53905cc7e7994f5`
- **[D03]** Lei Complementar nº 214 de 16/01/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/571468687b4dc8d8f1a3b1dbd5f958ff85fad0cf/federal/leis-complementares/2025/lcp-214-2025-01-16.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-01-16;214> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-20T11:40:34-03:00 · arquivo local `docs/D03_lcp-214-2025-01-16.md` · SHA-256 `f1f80d77a11f96d8eaf7777d647e577d04abd0fc28420ec22664be7a76ed8851`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D04]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:40:35-03:00 · arquivo local `docs/D04_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D05]** Lei nº 10.147 de 21/12/2000 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/dc08d8291baac23e97bb4c5095389052d6846822/federal/leis-ordinarias/2000/lei-10147-2000-12-21.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2000-12-21;10147> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:40:37-03:00 · arquivo local `docs/D05_lei-10147-2000-12-21.md` · SHA-256 `3e15396e59ce53f5cec18fe5bdce6341dc281ef23e9924b977a80a696d687d37`
- **[D06]** Lei nº 13.352 de 27/10/2016 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/47cd7475c47b65b092a1c4407b375781b5a556ba/federal/leis-ordinarias/2016/lei-13352-2016-10-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2016-10-27;13352> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-10-20T11:40:38-03:00 · arquivo local `docs/D06_lei-13352-2016-10-27.md` · SHA-256 `4ca39ec6fac1cf621ace7d322d6aea9c682adb42d2319f97c78539dc6ac2b1d6`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D07]** L13352 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13352.htm>  
  Baixado em 2026-10-20T11:41:02-03:00 · arquivo local `docs/D07_l13352-htm.html` · SHA-256 `b179e83c20266a16189d15113219e35563e40557528e542680f5f39d7dbfe340`
- **[D08]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-20T11:41:44-03:00 · arquivo local `docs/D08_lcp214-htm.html` · SHA-256 `aeb77500e2c4e5c710f837c313c2ba7100858410d2b666fddf835e3ccc0376b1`
- **[D09]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-20T11:42:04-03:00 · arquivo local `docs/D09_lcp214-htm.html` · SHA-256 `3b980a3b0721d51bd08eee8a229b774f50741fbc9c7c55210d31785027f79d9d`
- **[D10]** Normas — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278&visao=compilado>  
  Baixado em 2026-10-20T11:43:46-03:00 · arquivo local `docs/D10_link-action.html` · SHA-256 `9f9413e20884b24680269927744a2abbf407243127ba5087a1489fd91fc8153a`
- **[D11]** Simples Nacional — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=4bb88b6e-394f-45ff-ad26-a4661a1ae01d>  
  Baixado em 2026-10-20T11:43:48-03:00 · arquivo local `docs/D11_NoticiaCompleta-aspx.html` · SHA-256 `050ad74d7abc2100ef6ab9f8200a2ad4c3ae367b793fcc539486e1412b6abc3b`
- **[D12]** Lei Complementar nº 116 de 31/07/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ae234474cd3e1e3f6e871eaa102aeb862ec17541/federal/leis-complementares/2003/lcp-116-2003-07-31.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2003-07-31;116> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:36-03:00 · arquivo local `docs/D12_lcp-116-2003-07-31.md` · SHA-256 `ee5663cd6f75d06dc795b4b9b49b52e4a9d7ad9c2575d817375088a5ed3098b9`
- **[D13]** Lei Complementar nº 157 de 29/12/2016 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d991827a4fe82dde2cc22ca61981ae214d98baed/federal/leis-complementares/2016/lcp-157-2016-12-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2016-12-29;157> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:38-03:00 · arquivo local `docs/D13_lcp-157-2016-12-29.md` · SHA-256 `5297fb30568deadbb15e911ea3101db185da541456367d10b616cfb00b0c3313`
- **[D14]** Lei nº 9.249 de 26/12/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d955e7e66c4a7176278ee8ac74513668de7fc989/federal/leis-ordinarias/1995/lei-9249-1995-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9249> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:40-03:00 · arquivo local `docs/D14_lei-9249-1995-12-26.md` · SHA-256 `18cb96b64a850a3f9b738da870044230b76a336068e3fae79cb83f10b14d4699`
- **[D15]** Lei nº 9.065 de 20/06/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/2fe7d2c98c7d8bf2fc725fb77b42405b02a0cb5c/federal/leis-ordinarias/1995/lei-9065-1995-06-20.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-06-20;9065> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:41-03:00 · arquivo local `docs/D15_lei-9065-1995-06-20.md` · SHA-256 `5a68cf95708d0bf02d9032181a605412384d0fa2440a9629f2fe59e06f4a2fac`
- **[D16]** Lei nº 9.430 de 27/12/1996 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6c8aa8aa7d6126d14c332df3ab07f956b17f4bf2/federal/leis-ordinarias/1996/lei-9430-1996-12-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1996-12-27;9430> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:43-03:00 · arquivo local `docs/D16_lei-9430-1996-12-27.md` · SHA-256 `6e8e20371d0e7796244402441b7e3fc72df83a7bbe640029d4919359a6115bcc`
- **[D17]** Lei nº 10.637 de 30/12/2002 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/823c54bedbd9e523afea8ab05e3cd715bd70a18d/federal/leis-ordinarias/2002/lei-10637-2002-12-30.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2002-12-30;10637> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:44-03:00 · arquivo local `docs/D17_lei-10637-2002-12-30.md` · SHA-256 `f165259701b4081b0e9f73921c214895bea18d10081ade540630de3ee2a5ad8e`
- **[D18]** Lei nº 10.833 de 29/12/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/17688c9637f6a90b7faace6d797aedfa3f6b2ff0/federal/leis-ordinarias/2003/lei-10833-2003-12-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2003-12-29;10833> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:46-03:00 · arquivo local `docs/D18_lei-10833-2003-12-29.md` · SHA-256 `fa0d994627d9e1476d625a9f0b588e596181735b922bdcdf9c1c0336fd06b9fc`
- **[D19]** Lei nº 11.196 de 21/11/2005 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/1783bffce7f838dc4e83427466e4dd86e8f1d0c8/federal/leis-ordinarias/2005/lei-11196-2005-11-21.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2005-11-21;11196> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:47-03:00 · arquivo local `docs/D19_lei-11196-2005-11-21.md` · SHA-256 `de1067f3e6a4801c05376ebfa8276aa4889f42b9c5936601f5d10ed97e0443ba`
- **[D20]** Lei nº 6.321 de 14/04/1976 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/1307a32169be1ec173e0954381893137204ab23d/federal/leis-ordinarias/1976/lei-6321-1976-04-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1976-04-14;6321> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:49-03:00 · arquivo local `docs/D20_lei-6321-1976-04-14.md` · SHA-256 `d8d318c03413fa151ab5a11f76e21a923bfe7814504472f462a0ad72a7e19d3a`
- **[D21]** Lei nº 12.973 de 13/05/2014 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/5a77b1ed480d4b4fc20fabaac59f6674b120d7ec/federal/leis-ordinarias/2014/lei-12973-2014-05-13.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2014-05-13;12973> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:51-03:00 · arquivo local `docs/D21_lei-12973-2014-05-13.md` · SHA-256 `d73a401dbbd14ab1feb1c8bce8daa51c3cfcb0cbc264e87b9023fc875f1b89cf`
- **[D22]** Lei nº 15.270 de 26/11/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/4f02311c78e8f4f559c63b67861c2bd33d691ea2/federal/leis-ordinarias/2025/lei-15270-2025-11-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2025-11-26;15270> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:52-03:00 · arquivo local `docs/D22_lei-15270-2025-11-26.md` · SHA-256 `32c63ec7cff289c036bab1475951631181b42d4f5ced56ceb3304526d50779b9`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D23]** Lei nº 12.592 de 18/01/2012 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a31cf3cd12073c7b195933a53e733b85c00cfe02/federal/leis-ordinarias/2012/lei-12592-2012-01-18.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-01-18;12592> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:54-03:00 · arquivo local `docs/D23_lei-12592-2012-01-18.md` · SHA-256 `ae4c4aae44ba1bd08493c05fd82e366cdd2f3bf263b93383f93b1f936541fd00`
- **[D24]** Decreto-Lei nº 406 de 31/12/1968 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/212a2808baa6dd6847e954081ed6eaeec47c45e0/federal/decretos-lei/1968/del-406-1968-12-31.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto.lei:1968-12-31;406> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:56-03:00 · arquivo local `docs/D24_del-406-1968-12-31.md` · SHA-256 `7e68486849b1dcf652efaa4e10d39a6371f1fdf3a819ba98947f5082199e2bed`
- **[D25]** Lei nº 9.718 de 27/11/1998 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/2ee55c0d178cb912e1a74026bc8bf4a365018bf0/federal/leis-ordinarias/1998/lei-9718-1998-11-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1998-11-27;9718> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:45:57-03:00 · arquivo local `docs/D25_lei-9718-1998-11-27.md` · SHA-256 `b15173fa6f57c3ef3a6c7709268c5757ad900c2f567a08f2e646ec014feadf12`
- **[D26]** L15270 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm>  
  Baixado em 2026-10-20T11:46:11-03:00 · arquivo local `docs/D26_l15270-htm.html` · SHA-256 `f4cf00f49dd84499d08ad026cd9e1ca9a5a034ef6e2a91e44e36392c5d628207`
- **[D27]** Lcp 227 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm>  
  Baixado em 2026-10-20T11:46:12-03:00 · arquivo local `docs/D27_lcp227-htm.html` · SHA-256 `ee06a540bbbe522de564365b3beb1cdfa9326642cfd2d448703c079ee911d839`
- **[D28]** Lei nº 9.532 de 10/12/1997 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/86714846f44bf5fd62e664e7453319cf44d4651c/federal/leis-ordinarias/1997/lei-9532-1997-12-10.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1997-12-10;9532> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-20T11:49:30-03:00 · arquivo local `docs/D28_lei-9532-1997-12-10.md` · SHA-256 `add7ea22f56aec7022abfbd1cffab6d70626a38535292394262f048a9185518f`
- **[D29]** Decreto nº 9.580 de 22/11/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/39239e708b021186cea3d407a5fc7984f2c725f5/federal/decretos/2018/dec-9580-2018-11-22.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2018-11-22;9580> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-20T11:49:32-03:00 · arquivo local `docs/D29_dec-9580-2018-11-22.md` · SHA-256 `2c328212c1a8408eaa64072debe9860ecb435a731150296702b0583f00acfe6e`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D30]** D9580 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm>  
  Baixado em 2026-10-20T11:49:46-03:00 · arquivo local `docs/D30_d9580-htm.html` · SHA-256 `3f5df4586671aa0620e4f597b3bdd2dc00f1c26c8ebe8efdcae4845f312d6239`

## Registro de buscas
_Nenhuma busca registrada._
