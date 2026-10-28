# Relatório de pesquisa legal — fila-2026-10-27-bloco3-eficiencia

**Pergunta:** Bloco 3 da fila (eficiência fiscal): P-EF-6 ICMS-ST dos NCM 3303/3304/3305 (Conv. ICMS 142/2018) por UF; P-EF-8 valor 2026 do ISS fixo da SUP em São Paulo (Lei SP 13.701 art. 15); P-EF-11 esteticista é profissão regulamentada (Lei 13.643/2018) e tira os 16%?; P-EF-12 forma do valor de mercado (Decreto 12.955/2026 arts. 12 e 13)
**Aberto em:** 2026-10-27T11:05:15-03:00 · **Atualizado em:** 2026-10-27T11:20:09-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **P-EF-6, ICMS-ST de perfumaria e cosméticos (NCM 3303, 3304 e 3305): em SP, fora da ST desde 01/04/2026.**
  - A Portaria SRE 94/2025 revogou o Anexo XI da Portaria CAT 68/2019, que era a lista paulista de perfumaria e higiene pessoal sob o art. 313-E do RICMS/SP. Ela vigora desde 01/04/2026 [D14, arts. 1º e 4º].
  - A Resposta à Consulta 33677/2026 confirma para o NCM 3304.99.10 que essas operações internas "não estão mais submetidas" à ST [D12].
  - No Conv. ICMS 142/2018, o Anexo XIX lista os itens que podem entrar em ST, de 3303.00.10 a 3305.90.00 (CEST 20.007.00 a 20.022.00) [D11]. Cada UF decide se adota, como SP fez pelo art. 313-E [D13].
  - No produto, a tabela `ICMS_ST_NCM_UF` fica sem linha de SP a partir de 2026-04-01. Uma linha anterior só serviria para competência de até 31/03/2026, e o 1º cliente começa em dez/2026.
  - Para as outras UFs, cada RICMS teria de ser lido, o que não foi feito. A linha entra quando houver cliente naquela UF.
  - Efeito no EF PR-2: em SP, revenda de cosmético não segrega ICMS-ST, só o PIS/Cofins monofásico, que já está em `PIS_COFINS_MONOFASICO_NCM`. Segregar ICMS-ST depois de 01/04/2026 é exatamente o caso do alerta `SEGREGACAO_INDEVIDA` (item 14).
- **P-EF-8, SUP em SP: valores de 2026 conferidos. O salão não entra no regime.**
  - Pela Lei SP 13.701, art. 15 (redação da Lei 17.719/2021), o regime especial vale só para os subitens 4.01, 4.02, 4.06, 4.08, 4.11, 4.12, 4.13, 4.14, 4.16, 5.01, 7.01, 17.13, 17.15 e 17.18, mais economistas [D05]. Estética e beleza (6.01, 6.02) estão fora; a clínica (medicina, fisioterapia, odontologia, psicologia etc.) pode entrar.
  - A base é por faixa progressiva de número de profissionais (§§ 12 e 13), corrigida todo ano na forma do art. 2º da Lei 13.105 (§ 5º), que a Fazenda diz ser o IPCA [D08].
  - A tabela oficial de 2026 da Fazenda paulista [D10] traz, por profissional e por mês, para a faixa até 5:
    - base de cálculo de **R$ 2.413,62**;
    - ISS trimestral de **R$ 144,81** na alíquota de 2% (item 4, art. 16 I "a") e de R$ 362,04 a 5%.
  - Faixas seguintes:

    | Profissionais | Base mensal por profissional |
    |---|---|
    | 6 a 10 | R$ 6.048,39 |
    | 11 a 20 | R$ 12.096,79 |
    | 21 a 30 | R$ 24.193,60 |
    | 31 a 50 | R$ 36.290,39 |
    | 51 a 100 | R$ 48.387,19 |
    | 101 ou mais | R$ 72.580,80 |

  - O vencimento é trimestral: 10/04, 10/07, 10/10 e 10/01 [D08].
  - A exigência de "amparo judicial para limitada" (contador, 21/10) tem base no texto:
    - o § 2º VII exclui a sociedade empresária;
    - o § 14 exige "a responsabilidade ilimitada do profissional sócio" [D05].
- **P-EF-11, esteticista: é profissão regulamentada por lei; o salão de estética fica fora dos 16% na leitura segura.**
  - A Lei 13.643/2018 "Regulamenta as profissões de Esteticista" [D06, ementa e art. 1º].
  - O art. 40 da Lei 9.250 (16%) "não se aplica [...] às sociedades prestadoras de serviços de profissões legalmente regulamentadas" [D03, p.ú.]. O RIR/2018 repete no art. 592 § 4º [D16].
  - Cabeleireiro, manicure, depilador e maquiador têm o exercício "reconhecido" pela Lei 12.592/2012, art. 1º [D02], que não usa o verbo "regulamenta" (ambiguidade, §4).
  - O efeito é pequeno: os 16% só valem com receita bruta anual de até R$ 120 mil, e a diferença máxima de IRPJ é 16 p.p. × R$ 120 mil × 15% = R$ 2.880 por ano.
  - O X7 já exige `declaraNaoProfissaoRegulamentada` (F-P16-1). O texto de ajuda do alerta `PROFISSAO_REGULAMENTADA_TIRA_16` passa a citar a Lei 13.643, art. 1º, como lida.
- **P-EF-12, "valor de mercado" no arbitramento: a forma está no Regulamento da CBS, arts. 14 e 16** (o BRIEF citava os arts. 12 e 13 da LC 214).
  - Valor de mercado é "o valor praticado em operações comparáveis entre partes não relacionadas" [D07, art. 14].
  - Ele se apura pelas "operações mais recentes realizadas pelo contribuinte ou por terceiros, em um período de três meses", observando natureza, quantidade, condições de pagamento, prazo e mercado geográfico (§ 1º).
  - Na falta dessas operações, valem nesta ordem (§ 3º): operações anteriores de até 1 ano; custo mais lucro bruto; custo mais despesas indispensáveis.
  - O arbitramento cabe quando o documento declara "valor notoriamente inferior ao valor de mercado" [D07, art. 16 I "b"]. A base passa a ser o valor do art. 14 ou, na falta dele, o custo mais despesas ou lucro bruto, ou o preço sugerido (p.ú.).
  - Consequência para o `CARGA_TRIBUTARIA`: o comparável mais próximo do item num combo é a **venda avulsa do mesmo item nos 3 meses anteriores**. Rebaixar o item ao custo quando ele vende a preço de catálogo é o caso do art. 16 I "b".
  - O desconto incondicional que consta do documento sai da base [D07, art. 13 § 2º III e § 3º]. Por isso, desconto destacado na nota é a forma segura de dar o preço do combo.
  - O padrão `PROPORCIONAL_CATALOGO` (decisão de 21/10) segue de pé. A evidência que a P-EF-1 (resto) pede para o CARGA é a das vendas avulsas dos 3 meses anteriores (art. 14 § 1º).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| SP tira perfumaria da ST | Portaria SRE 94/2025, art. 1º | [D14] | "Fica revogado o Anexo XI da Portaria CAT 68/19" |
| Desde quando | Portaria SRE 94/2025, art. 4º | [D14] | "Esta portaria entra em vigor em 1º de abril de 2026." |
| Confirmação da SEFAZ-SP | RC 33677/2026, item I | [D12] | "não estão mais submetidas ao regime de substituição tributária previsto no artigo 313-E do RICMS/2000, desde 01/04/2026" |
| Itens passíveis (nacional) | Conv. ICMS 142/2018, Anexo XIX, itens 7.0 a 22.0 | [D11] | "Xampus para o cabelo" (item 17.0, CEST 20.017.00, NCM 3305.10.00) |
| SUP só para os subitens listados | Lei SP 13.701, art. 15 caput | [D05] | "quando os serviços descritos nos subitens 4.01, 4.02, 4.06, 4.08 [...] 17.18 [...] forem prestados por sociedade" |
| Faixas progressivas | Lei SP 13.701, art. 15 § 12 I | [D05] | "R$ 1.995,26 [...] multiplicados pelo número de profissionais habilitados, até 5" (valor de 2022) |
| Valor de 2026 | Tabela SUP 2026 da SF/SP | [D10] | "Até 5 R$ 2.413,62 R$144,81" (alíquota 2%) |
| Limitada | Lei SP 13.701, art. 15 § 14 | [D05] | "a responsabilidade ilimitada do profissional sócio ou associado" |
| Esteticista regulamentada | Lei 13.643/2018, ementa e art. 1º | [D06] | "Regulamenta as profissões de Esteticista" |
| Exclusão dos 16% | Lei 9.250, art. 40 p.ú. | [D03] | "às sociedades prestadoras de serviços de profissões legalmente regulamentadas" |
| Idem, RIR | RIR/2018, art. 592 § 4º | [D16] | "nem às sociedades prestadoras de serviços de profissões legalmente regulamentadas" |
| Cabeleireiro etc. | Lei 12.592/2012, art. 1º | [D02] | "É reconhecido, em todo o território nacional, o exercício das atividades profissionais de Cabeleireiro" |
| Valor de mercado | Regulamento da CBS, art. 14 caput e § 1º | [D07] | "operações mais recentes realizadas pelo contribuinte ou por terceiros, em um período de três meses" |
| Arbitramento | Regulamento da CBS, art. 16 I "b" | [D07] | "for declarado em documento fiscal valor notoriamente inferior ao valor de mercado da operação" |

## 3. Vigência conferida
- **Alertas e como foram resolvidos:**
  - [D01] (Lei 13.643, acervo, versão original) foi conferida no Planalto [D06]: o texto não tem "Redação dada", "Incluído" nem veto.
  - [D04] (Decreto 12.955, acervo, versão original) foi conferido no Planalto [D07]. Há alterações pelos Decretos 13.075, 13.133 e 13.140 de 2026, mas nenhuma nos arts. 13, 14 e 16.
  - [D15] (RIR, acervo, original) foi trocado pelo Planalto [D16].
  - A Lei SP 13.701 [D05] é a versão consolidada do catálogo municipal, com a Lei 18.270/2025 já incorporada (ela revogou os §§ 10 e 11 do art. 15).
- **Redação atual:**
  - Portaria SRE 94/2025 publicada no DOE de 23/12/2025 [D14].
  - RC 33677/2026 publicada em 14/05/2026 [D12].
  - Tabela SUP 2026 revisada em 27/02/2026 [D10].
  - Página de regras da SUP datada de 31/07/2026 [D08].
- **Norma pendente:** o "ato conjunto da RFB e do CGIBS" que pode dar a "forma simplificada de apuração do valor de mercado" [D07, art. 14 § 7º III] não foi achado.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **16% para salão só de cabeleireiro e manicure (Lei 12.592).** A lei "reconhece" o exercício, mas não "regulamenta" no sentido da Lei 13.643. Não foi achada Solução de Consulta da RFB sobre o tema.
  - Leitura 1: não é profissão regulamentada, e cabem os 16%.
  - Leitura 2: é, e vale 32%.
  - A leitura 2 é a mais segura, e o custo de errar para o lado seguro é de no máximo R$ 2.880 de IRPJ por ano.
  - Só vale perguntar ao contador se um cliente real estiver no Presumido com receita de até R$ 120 mil. Pergunta: *"Salão só de cabeleireiro (Lei 12.592) no Presumido com receita até 120 mil: usamos 16% ou 32%?"*
- **"Notoriamente inferior" não tem número** [D07, art. 16 I "b"]. O `CARGA_TRIBUTARIA` continua só com aceite do contador (F-EF-3). A pesquisa não muda isso; ela diz qual é o comparável.
- **Códigos "uso restrito" da tabela SUP 2026** (04112 Medicina e 03380 Advocacia) usam "valor único por profissional" de R$ 2.656,48 [D10].
  - A tabela não diz quem pode usá-los. Um blog liga esses códigos à decisão do STF contra a progressividade da Lei 17.719, mas isso não foi conferido.
  - O simulador usa as faixas progressivas, e o valor único só entra com documento (o padrão do item 29).

## 5. Lacunas
- O RICMS das outras 26 UFs não foi lido para cosméticos.
- O Regulamento do IBS (Resolução CGIBS 6/2026) não foi lido. A regra do valor de mercado vem da mesma LC 214, art. 12 § 4º, e art. 13.
- O ato conjunto do art. 14 § 7º não foi localizado.
- A origem dos códigos "uso restrito" da SUP ficou sem explicação.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 13.643 de 03/04/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/2018/lei-13643-2018-04-03.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2018-04-03;13643> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-10-27T11:05:54-03:00 · arquivo local `docs/D01_lei-13643-2018-04-03.md` · SHA-256 `f0ab31238a32cc40dae92374f534bfd829294a1e707f3b76e3a2bd98146dc3de`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D02]** Lei nº 12.592 de 18/01/2012 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/2012/lei-12592-2012-01-18.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-01-18;12592> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-27T11:05:55-03:00 · arquivo local `docs/D02_lei-12592-2012-01-18.md` · SHA-256 `ae4c4aae44ba1bd08493c05fd82e366cdd2f3bf263b93383f93b1f936541fd00`
- **[D03]** Lei nº 9.250 de 26/12/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/1995/lei-9250-1995-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9250> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-27T11:05:55-03:00 · arquivo local `docs/D03_lei-9250-1995-12-26.md` · SHA-256 `aa9eedaae0195205b7f5bcde33c46572d4f1f5352de3cf92ec1e36342e88befd`
- **[D04]** Decreto nº 12.955 de 29/04/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/decretos/2026/dec-12955-2026-04-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2026-04-29;12955> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-27T11:05:56-03:00 · arquivo local `docs/D04_dec-12955-2026-04-29.md` · SHA-256 `5527dbfe923a984a86c22b27ef1c5c0b6f4f0c2996bbe14315e8804afd08bbd9`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D05]** LEI Nº 13.701 DE 24 DE DEZEMBRO DE 2003 « Catálogo de Legislação Municipal — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.prefeitura.sp.gov.br/lei-13701-de-24-de-dezembro-de-2003>  
  Baixado em 2026-10-27T11:06:43-03:00 · arquivo local `docs/D05_lei-13701-de-24-de-dezembro-de-2003.html` · SHA-256 `35632c29f753d4c5ebd4ad9961039b17d47a83e45b0d48dd7c24d25770a253f8`
- **[D06]** L13643 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13643.htm>  
  Baixado em 2026-10-27T11:06:43-03:00 · arquivo local `docs/D06_l13643-htm.html` · SHA-256 `079dfaec44cadd4898232b835c5c771749cfe9eafac62d27ba1637bf278aaea6`
- **[D07]** d12955 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm>  
  Baixado em 2026-10-27T11:06:45-03:00 · arquivo local `docs/D07_d12955-htm.html` · SHA-256 `295a7e28fcf2b5125614cb5d208189014a66788ea41e359739824405342e8a0c`
- **[D08]** Regras de recolhimento - Secretaria Municipal da Fazenda - Prefeitura — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://prefeitura.sp.gov.br/web/fazenda/w/servicos/iss/30856>  
  Baixado em 2026-10-27T11:07:44-03:00 · arquivo local `docs/D08_30856.html` · SHA-256 `3c2d3729e93b4c5bbce8fb5803c71dc2aae1f19ef234fe81071e90ee10d70d56`
- **[D09]** Sociedades Uniprofissionais (SUP): valores do ISS para pagar (desde 2004) - Secretaria Municipal da Fazenda - Prefeitura — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://prefeitura.sp.gov.br/web/fazenda/w/servicos/iss/29259>  
  Baixado em 2026-10-27T11:07:56-03:00 · arquivo local `docs/D09_29259.html` · SHA-256 `f280944252727ec9446b724f9f9bca108d74b53b14b718dfb2e4810711bb574c`
- **[D10]** Consolidado 2026 revisado atualizado fw 27_02_26.xlsx — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://prefeitura.sp.gov.br/documents/d/fazenda/sup2026-1-1-pdf>  
  Baixado em 2026-10-27T11:08:06-03:00 · arquivo local `docs/D10_sup2026-1-1-pdf.pdf` · SHA-256 `4fc9181f491c4e63c9ebf32c45aa215bc319d1fa7d397dc1cf2dab63fcc75f25`
- **[D11]** CONVÊNIO ICMS 142/18 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18>  
  Baixado em 2026-10-27T11:08:29-03:00 · arquivo local `docs/D11_CV142_18.html` · SHA-256 `7c2bdc9db1ceb11faaa56b2582e77e5a1bcb66e51cd62b6de0f155a78359c45a`
- **[D12]** RC 33677/2026 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/RC33677_2026.aspx>  
  Baixado em 2026-10-27T11:08:56-03:00 · arquivo local `docs/D12_RC33677_2026-aspx.html` · SHA-256 `dbd367429c1391a9bc2432033019b67f928426117119d3e274bbd082984599a8`
- **[D13]** RICMS - Artigo 313 E a 313 F
						
SEÇÃO XIII - DAS OPERAÇÕES COM PRODUTOS DE PERFUMARIA — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art313e.aspx>  
  Baixado em 2026-10-27T11:08:56-03:00 · arquivo local `docs/D13_art313e-aspx.html` · SHA-256 `7f5f82689c6900031e96d5bd1749f234f143cd38401b421ed0f427a86330af95`
- **[D14]** Portaria SRE 94 de 2025 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-94-de-2025.aspx>  
  Baixado em 2026-10-27T11:09:09-03:00 · arquivo local `docs/D14_Portaria-SRE-94-de-2025-aspx.html` · SHA-256 `dd0ce9233aa1465dd0a9c92fc77051b164c1db38f1809696392262b6643776af`
- **[D15]** Decreto nº 9.580 de 22/11/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/decretos/2018/dec-9580-2018-11-22.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2018-11-22;9580> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-27T11:15:50-03:00 · arquivo local `docs/D15_dec-9580-2018-11-22.md` · SHA-256 `2c328212c1a8408eaa64072debe9860ecb435a731150296702b0583f00acfe6e`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D16]** D9580 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm>  
  Baixado em 2026-10-27T11:16:05-03:00 · arquivo local `docs/D16_d9580-htm.html` · SHA-256 `7f3c9bef33891be5d305d471670e19c2af084c2aa65e1f9bc8d08bde251eb979`

## Registro de buscas
_Nenhuma busca registrada._
