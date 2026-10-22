# Relatório de pesquisa legal — verif-2026-10-22-efd-reinf-brief

**Pergunta:** Leiaute EFD-Reinf 2.1.x (eventos R-1000, R-2010/R-2099, R-4010/R-4020/R-4099, R-9000), Manual, tabela 01 natureza do rendimento e IN RFB 2.043 vigente — insumos do BRIEF EFD-REINF
**Aberto em:** 2026-10-22T13:18:41-03:00 · **Atualizado em:** 2026-10-22T13:25:06-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**O leiaute oficial da EFD-Reinf foi lido hoje no portal SPED** (que em 20/10 dava `ECONNREFUSED`): versão vigente **2.1.2b**
(2.1.2 atualizada até a NT 03/2025) [L01], XSD v2.1.2 com CNPJ alfanumérico [D06], Tabelas de 15/01/2026 [D02], Manual de
Orientação do Usuário 2.1.2.1 [D01] e as NT 01, 02 e 03/2026 [D03][D04][D05]. Isso resolve os insumos ausentes 1–3 do
`ADR-INCR-EFD-REINF` §10 e **corrige o desenho do PRE-ADR em seis pontos**:

1. **A lista de eventos tem R-1050 (entidades ligadas) e R-2098 (reabertura da série R-2000)**, que o `EVENTOS_NAO_APLICAVEIS`
   do PRE-ADR §7 não tinha [L01 sumário; D06 lista de XSD]. O gate de cobertura tem de listar os 23 tipos do XSD.
2. **`ds:Signature` é obrigatório (`minOccurs=1`) em todo evento** [D06, ex. `R-4020-evt4020PagtoBeneficiarioPJ-v2_01_02.xsd`].
   Um XML "não assinado" **não valida** contra o XSD oficial. O F-REINF-1 (a) ratificado diz "XML não assinado testado contra o
   XSD", o que é contraditório: precisa de fork novo (assinar com certificado de teste no teste, ou validar sem a assinatura).
3. **R-4020/R-4010 são por beneficiário e por pagamento, não por código de receita.** Estrutura: estabelecimento × beneficiário
   (um evento por beneficiário no mês, MOU p. 106 item 2) → `idePgto` por `natRend` → `infoPgto` por `dtFG`, com bruto e
   bases/valores de IR, CSLL, Cofins, PIS **ou** agregado [D06; D01 p. 107–108]. O código de receita **não vai no XML**: é
   derivado de natureza × tributo pela tabela "R-4020"/"R-4010" [D02]. O resumo mensal D8 do RETENCOES-FONTE não basta.
4. **`dtFG` segue o fato gerador de cada tributo** (MOU p. 108 item 6 f): IR no crédito com o bruto do documento; PIS/Cofins/CSLL
   no pagamento com o bruto da parcela [D01]. Confirma o D2 do RETENCOES-FONTE.
5. **Retificar/excluir período já fechado exige reabertura antes**: R-2098 (série R-2000) ou R-4099 com `fechRet` de reabertura
   (série R-4000) — Anexo II, `REGRA_EVE_PERMITE_EXCLUSAO` [L01]. O D5 do PRE-ADR omitia esse passo.
6. **Lucros e dividendos**: desde 01/2026 a natureza 12001 tem tributo IR (código 1841-01, mensal) [D02 tabela R-4010]; o MOU
   2.1.2.1 manda informar dividendo sem retenção só pelo valor bruto (p. 109 item 9) [D01]; a NT 02/2026 cria o tipo de isenção
   **12** = dividendos do **§ 3º do art. 6º-A da Lei 9.250** (resultados até 2025, aprovação até 31/12/2025) [D04][D08]. Os
   dividendos **≤ R$ 50 mil/mês** não são "isentos do § 3º": ficam abaixo do limite do caput. Como informá-los (só bruto, ou em
   `rendIsento` com outro tipo) é **ambiguidade** (§4 A).

Também conferido: **IN RFB 2.043/2021** não foi relida (lida no Sijut em 20/10, dossiê `verif-2026-10-20-f1-retencoes-reinf-ibscbs`;
não surgiu evidência de alteração em 2 dias). **Lei 9.250 art. 6º-A** (Lei 15.270/2025) lido no Planalto [D08] porque a cópia
"compilada" do acervo de 13/10 [D07] **não traz o art. 6º-A** — evidência de texto mais novo, defeito do acervo.

## 2. Fundamentação
| Ponto | Norma / documento | Fonte | Trecho literal ou dado |
|---|---|---|---|
| Versão vigente do leiaute | Leiautes EFD-Reinf 2.1.2b | [L01] (portal SPED item 7894) | "Versão 2.1.2 atualizada até Nota Técnica 03/2025" |
| 23 tipos de evento (R-1000, 1050, 1070, 2010, 2020, 2030, 2040, 2050, 2055, 2060, 2098, 2099, 3010, 4010, 4020, 4040, 4080, 4099, 9000; retorno 9001, 9005, 9011, 9015) | Leiaute 2.1.2b, sumário; pacote XSD | [L01][D06] | nomes dos arquivos `R-xxxx-evt…-v2_01_02.xsd` |
| Assinatura obrigatória | XSD de cada evento | [D06] | `<xs:element ref="ds:Signature"/>` sem `minOccurs` ⇒ 1..1 |
| R-4020: estrutura | XSD R-4020 | [D06] | `ideBenef/cnpjBenef` → `idePgto[1..100]/natRend` → `infoPgto[1..999]/dtFG, vlrBruto, retencoes/{vlrBaseIR, vlrIR, vlrBaseAgreg, vlrAgreg, vlrBaseCSLL, vlrCSLL, vlrBaseCofins, vlrCofins, vlrBasePP, vlrPP}` |
| R-4010: estrutura | XSD R-4010 | [D06] | `ideBenef/cpfBenef, ideDep[0..999]` → `idePgto/natRend` → `infoPgto/dtFG, vlrRendBruto, vlrRendTrib, vlrIR, detDed[0..25], rendIsento[0..25]/tpIsencao` |
| R-2010: por NF | XSD R-2010 | [D06] | `idePrestServ/cnpjPrestador, indCPRB` → `nfs[1..n]/serie, numDocto, dtEmissaoNF, vlrBruto, infoTpServ[1..9]/tpServico, vlrBaseRet, vlrRetencao` |
| R-1000: contribuinte | XSD R-1000 | [D06] | `infoCadastro/classTrib, indEscrituracao, indDesoneracao, indAcordoIsenMulta, contato/{nmCtt, cpfCtt}`; `inclusao/alteracao/exclusao` com `iniValid` |
| Id do evento | Anexo II `REGRA_VALIDA_ID_EVENTO` | [L01] | "IDTNNNNNNNNNNNNNNAAAAMMDDHHMMSSQQQQQ" (36 caracteres; CNPJ com 8 ou 14 posições conforme o R-1000) |
| Reabertura antes de retificar/excluir | Anexo II `REGRA_EVE_PERMITE_EXCLUSAO` | [L01] | "somente será aceito se o movimento do período estiver aberto … R-2098 … ou R-4099 com indicativo de reabertura" |
| Um evento por beneficiário | MOU 2.1.2.1 p. 106, item 2 | [D01] | "os rendimentos pagos ou creditados a um determinado beneficiário devem ser informados em um único arquivo xml" |
| `dtFG` por tributo | MOU p. 108, item 6 f | [D01] | "se o crédito é o fato gerador da retenção do tributo (ex. IR) … R$ 10.000,00 … se o pagamento é o fator gerador (ex. PIS, COFINS e CSLL), o valor bruto será R$ 5.000,00" |
| Agregado | MOU p. 108, item 7 e | [D01] | "os valores agregados informados pelas empresas em geral não contêm o imposto de renda" |
| Dividendo sem retenção | MOU p. 109, item 9 | [D01] | "deve ser informado apenas o campo 'valor bruto'" |
| Natureza × código de receita (PJ) | Tabela R-4020 | [D02] | 15022 fisioterapia / 15043 limpeza / 15045 vigilância / 15046 locação de mão de obra / 15099 demais: IRPJ 170806, AGREGADO 595207, COFINS 596007, PIS 597907, CSLL 598707 (mensal); 15052 comissões: IRPJ 804506; 12016 JCP: 570602 (decendial) |
| Natureza × código de receita (PF) | Tabela R-4010 | [D02] | 12001 lucro e dividendo: IRPF 184101 (mensal, desde 01/01/2026); 12016 JCP: 570602 (decendial); 10002 trabalho sem vínculo: IRPF 058807 (mensal) |
| Tabela 01 | Tabela 01 (xlsx) | [D02] | grupo 15 "Rendimento pago/creditado a PJ" (15001–15099); 12001 com tributo IR desde 01/01/2026; grupo 17 = órgãos públicos (IN 1.234), fora |
| Tipo de serviço do R-2010 | Anexo I Tabela 06 | [L01] | 100000001 limpeza/conservação/zeladoria; 100000002 vigilância/segurança; 100000029 saúde; 100000031 trabalho temporário |
| Classificação tributária do R-1000 | Anexo I Tabela 08 | [L01] | 01–03 Simples Nacional (CPP substituída / não substituída / ambas), 04 MEI, 99 PJ em geral (texto da tabela com colunas desalinhadas no PDF) |
| NT 02/2026 | R-4010 `tpIsencao` 12 | [D04] | "12 – Lucros e dividendos distribuídos nos termos do § 3º do art. 6º‑A da Lei nº 9.250/1995", natureza 12001, vigência 01/2026 |
| NT 03/2026 | CNPJ alfanumérico; R-4010/R-4020 `cpfOrigRecurso` | [D05] | "em produção a partir de julho em data ainda a ser divulgada" |
| Dividendos: retenção e transição | Lei 9.250 art. 6º-A caput, § 2º, § 3º I–III | [D08] | "em montante superior a R$ 50.000,00 … 10%"; § 3º "relativos a resultados apurados até o ano-calendário de 2025; … aprovada até 31 de dezembro de 2025" |

## 3. Vigência conferida
- **Alertas e como foram resolvidos:** [D07] (acervo, "compilada", cópia de 13/10) não contém o art. 6º-A incluído pela Lei
  15.270/2025 — evidência de texto mais novo; lido no Planalto [D08]. Os documentos do SPED não estão no acervo (normas técnicas
  de leiaute) e foram baixados direto do portal oficial.
- **Versão do leiaute:** 2.1.2b é a última pasta de leiautes; as NT 01/2026 (R-9001, alíquotas CPRB), 02/2026 (R-4010 isenção 12)
  e 03/2026 (CNPJ alfanumérico, campos `cpfOrigRecurso`) são posteriores e ajustam a 2.1.2 sem nova pasta. O pacote XSD
  "v2.1.2 – CNPJ Alfanumérico" [D06] é o mais recente da pasta "versão mais recente".
- **Manual de Orientação do Usuário 2.1.2.1** [D01] é anterior a 2026 (não trata a retenção de dividendos da Lei 15.270); a parte de
  dividendos dele deve ser lida junto da NT 02/2026 e da tabela R-4010 de 15/01/2026.
- **Não lidos:** Manual de Orientação ao **Desenvolvedor** 2.7 (webservice, lote assíncrono) — só relevante para o PR-4 (F-REINF-2 a).

## 4. Ambiguidades (só o que precisa de decisão humana)
- **A. Dividendos ≤ R$ 50 mil/mês no R-4010.** Leitura 1 (MOU item 9): informar só `vlrRendBruto` na natureza 12001, sem
  retenção. Leitura 2: informar em `rendIsento` com um `tpIsencao` — mas o único tipo novo (12) é o do § 3º (transição), não o do
  limite do caput. Leitura mais segura: **leitura 1** (é o texto do MOU e não exige tipo que não existe). Pergunta ao contador:
  *"Dividendo de até R$ 50 mil no mês a sócio PF, de lucro de 2026: no R-4010 vai só o valor bruto na natureza 12001, ou em
  rendimento isento com algum tipo de isenção?"*
- **B. Classificação tributária (`classTrib`) do Simples no R-1000.** 01, 02 ou 03 dependem de a CPP ser substituída (anexos I–III
  e V) ou não (anexo IV). Pergunta: *"Qual a classTrib do salão/clínica no R-1000, dado o anexo do Simples?"*
- **C. Pagamento a contribuinte individual (PF, F-RET-7 b) declarado no R-4010 e também no eSocial S-1210?** A IN 2.043 art. 3º § 1º
  separa R-4000 e S-1210 como substitutos da DIRF; qual cobre o autônomo não está nos textos lidos. Pergunta: *"IRRF de autônomo
  PF sem vínculo vai no R-4010 (natureza 10002) ou só no eSocial?"*

## 5. Lacunas
- Manual de Orientação ao Desenvolvedor 2.7 e o XSD do lote assíncrono não foram lidos em detalhe (PR-4).
- A tabela oficial não dá vigência de 2027 para os códigos de Cofins/PIS retidos (LC 214 art. 509): a tabela de 15/01/2026 não
  encerra as linhas COFINS/PIS. Nova tabela é esperada; sem ela, o R-4020 de 2027 usa só IR + CSLL por força da lei.
- [L01] (zip do leiaute, item 7894) não entrou no manifesto: o `baixar` quebrou ao tentar extrair texto de um zip. Arquivo local
  `docs/L01_Leiautes-EFD-Reinf-v2.1.2b-ate-NT-03-2025.zip`, origem `http://sped.rfb.gov.br/arquivo/download/7894`, baixado em
  2026-10-22T13:20, SHA-256 `d08ad69ce5e2d9b71a7360ef7fb29792e2a6fdeecfb6822a2c7f789e3328e57f`. Os textos citados de [L01] foram
  extraídos com `pdftotext` dos PDFs do zip ("Leiautes … 2.1.2b.pdf", "Anexo I – Tabelas", "Anexo II – Regras").
- [D02] e [D06] também são zips: o `.txt` do manifesto é lixo binário; os dados citados vêm dos `.xlsx`/`.xsd` extraídos.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_Manual-20da-20EFD-Reinf-20vers-c3-a3o-202-1-2-1-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/28/40FAAC1C636CC110D4C12D2790B43C641C6BCA/Manual%20da%20EFD-Reinf%20vers%c3%a3o%202.1.2.1.pdf>  
  Baixado em 2026-10-22T13:20:16-03:00 · arquivo local `docs/D01_Manual-20da-20EFD-Reinf-20vers-c3-a3o-202-1-2-1-pdf.pdf` · SHA-256 `563e771cf0b48dec156c44bc3582a469c8a7203b2e415a89da7bba1ee27f5977`
- **[D02]** D02_EFD-REINF-20-20Tabelas-2015012026-zip — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/56/02690B8D5DE8904DFAB98799195B016052E4F5/EFD-REINF%20-%20Tabelas%2015012026.zip>  
  Baixado em 2026-10-22T13:20:17-03:00 · arquivo local `docs/D02_EFD-REINF-20-20Tabelas-2015012026-zip.html` · SHA-256 `31c04713b92a965c7413190a21dfc1b8eab4b10002a58371506da758e770b1a7`
- **[D03]** D03_Nota-20t-c3-a9cnica-20EFD-Reinf-201-2026-20v2-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/0F/0508F1D4C64E67C775110FFEF7C49015CA7619/Nota%20t%c3%a9cnica%20EFD-Reinf%201-2026%20v2.pdf>  
  Baixado em 2026-10-22T13:20:17-03:00 · arquivo local `docs/D03_Nota-20t-c3-a9cnica-20EFD-Reinf-201-2026-20v2-pdf.pdf` · SHA-256 `d827692f54643eca0aa08babe50723f5be676531c44d5a701d3f376e87ed7c05`
- **[D04]** D04_Nota-20t-c3-a9cnica-20EFD-Reinf-202-2026-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/20/CF34CCA6DFAE45E4E000EF345534FCA35D4C0A/Nota%20t%c3%a9cnica%20EFD-Reinf%202-2026.pdf>  
  Baixado em 2026-10-22T13:20:18-03:00 · arquivo local `docs/D04_Nota-20t-c3-a9cnica-20EFD-Reinf-202-2026-pdf.pdf` · SHA-256 `5e39d987baa08ee86e1cc7969ae50242f13bbab475ccb23c1564b44aaedf694b`
- **[D05]** D05_Nota-20t-c3-a9cnica-20EFD-Reinf-203-2026-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/B7/BDEE3C166C56E714C5452408793CE51CC25E5F/Nota%20t%c3%a9cnica%20EFD-Reinf%203-2026.pdf>  
  Baixado em 2026-10-22T13:20:19-03:00 · arquivo local `docs/D05_Nota-20t-c3-a9cnica-20EFD-Reinf-203-2026-pdf.pdf` · SHA-256 `25cd52e70d21bce9b970477d51fe194e7b58b7b5cd4085a85e1981cce9f0ffd0`
- **[D06]** D06_XSD-20EFD-Reinf-20v2-1-2-20-20CNPJ-20Alfanum-c3-a9rico-zip — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/74/6A2EE4D441E3A9536B5BC35CB282735B479423/XSD%20EFD-Reinf%20v2.1.2%20-%20CNPJ%20Alfanum%c3%a9rico.zip>  
  Baixado em 2026-10-22T13:20:19-03:00 · arquivo local `docs/D06_XSD-20EFD-Reinf-20v2-1-2-20-20CNPJ-20Alfanum-c3-a9rico-zip.html` · SHA-256 `26a82d92bdccc4dddc56150e08080e60043315964b9f7e6800a3402f6218d4b9`
- **[D07]** Lei nº 9.250 de 26/12/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ec2d052273aea51cd30fac55a779a8d933c11046/federal/leis-ordinarias/1995/lei-9250-1995-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9250> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-22T13:22:19-03:00 · arquivo local `docs/D07_lei-9250-1995-12-26.md` · SHA-256 `aa9eedaae0195205b7f5bcde33c46572d4f1f5352de3cf92ec1e36342e88befd`
- **[D08]** L9250 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/l9250.htm>  
  Baixado em 2026-10-22T13:22:32-03:00 · arquivo local `docs/D08_l9250-htm.html` · SHA-256 `9177f9d77b6091d7623f2b166fe69f7574da1a61e0073e4a783bf9a4500d42ad`

## Registro de buscas
- 2026-10-22T13:18:46-03:00 · LexML SRU · `EFD-Reinf` → 0 resultado(s)
- 2026-10-22T13:18:47-03:00 · LexML SRU · `2.043 Reinf` → 0 resultado(s)
