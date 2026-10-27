# Relatório de pesquisa legal — retencoes-fonte-pr1-reinf-tabelas

**Pergunta:** Carga das tabelas NATUREZA_RENDIMENTO e RETENCAO_CODIGO (EFD-Reinf Tabelas 15/01/2026) e IRRF_PF_MENSAL — RETENCOES-FONTE PR-1
**Aberto em:** 2026-10-24T17:14:36-03:00 · **Atualizado em:** 2026-10-24T17:49:37-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**A carga do PR-1 do RETENCOES-FONTE sai da fonte oficial, conferida por hash:**

- **Natureza do rendimento e códigos de receita:** zip "EFD-REINF - Tabelas 15012026.zip" baixado do portal SPED em 24/10, SHA-256 `31c04713…b1a7`, o mesmo do dossiê da Reinf de 22/10 [D01]. A carga, gerada por `gerar_carga.py` (determinístico), tem: Tabela 01 com o grupo 15 inteiro (15001–15048, 15050–15052, 15099; **não existe 15049**), 12001 com duas vigências (sem tributo até 2025-12-31; IR desde 2026-01-01) e 12016; tabelas "R-4020"/"R-4010" com residência no Brasil, discriminador `IRPJ|IRPF|CSLL|COFINS|PIS|AGREGADO` [D01].
- **Exceções dentro do grupo 15** lidas na planilha "R-4020" [D01]: 15001/15002 IRPJ `328006`; 15047 IRPJ `594406`; 15048 só COFINS `374601` e PIS `377001` (quinzenal); 15052 só IRPJ `804506`. O resto do grupo leva IRPJ `170806`, AGREGADO `595207`, COFINS `596007`, PIS `597907` e CSLL `598707` (mensal).
- **Tabela progressiva mensal do PF:** Lei 11.482 art. 1º XII, desde 05/2025 [D02]. Faixas: até 2.428,80 (0); até 2.826,65 (7,5%, deduz 182,16); até 3.751,05 (15%, 394,16); até 4.664,68 (22,5%, 675,49); acima (27,5%, 908,73).
- **Redução do art. 3º-A** da Lei 9.250 (Lei 15.270/2025), desde 01/2026 [D04]: até R$ 5.000 o imposto zera; até R$ 7.350, redução = 978,62 − 0,133145 × rendimento; acima, nada (§ 2º); limitada ao imposto (§ 1º). Dependente: R$ 189,59 (art. 4º III "i"). Desconto simplificado: 25% do teto da faixa zero (art. 4º § 2º) [D04].
- **IRRF de PJ:** RIR/2018 arts. 714 (1,5%), 716 (1%: limpeza, conservação, segurança, vigilância, locação de mão de obra) e 718 (1,5%) [D03].
- **CSRF de 2027:** o art. 509 da LC 214 reescreve o art. 31 da Lei 10.833 (só CSLL 1%) mantendo os parágrafos ("....."), então o § 3º (dispensa ≤ R$ 10) segue [D05].

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Tabela mensal desde 05/2025 | Lei 11.482 art. 1º XII | [D02] | "a partir do mês de maio do ano-calendário de 2025" |
| Redução mensal | Lei 9.250 art. 3º-A | [D04] | "R$ 978,62 - (0,133145 x rendimentos tributáveis…)" |
| IRRF 1% limpeza etc. | RIR/2018 art. 716 | [D03] | "à alíquota de um por cento" |
| IRRF 1,5% comissões | RIR/2018 art. 718 | [D03] | "à alíquota de um e meio por cento" |
| CSLL 1% em 2027 | LC 214 art. 509 (Lei 10.833 art. 31) | [D05] | "percentual de 1% (um por cento)" |
| Códigos por natureza × tributo | Tabela "R-4020" | [D01] | linha 15022 / IRPJ / 170806 / Mensal |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:** Lei 11.482 do acervo compilada e recente, sem alerta [D02]. RIR, LC 214 e Lei 9.250 foram lidos no Planalto, porque o dossiê de 22/10 apontou que a compilada do acervo não tinha o art. 3º-A [D03][D04][D05].
- **Redação atual:** Lei 11.482 art. 1º XII incluído pela Lei 15.191/2025; art. 3º-A da Lei 9.250 incluído pela Lei 15.270/2025.
- **Vigências gravadas:** a CSRF de 4,65% vai de 2004-02-01 a 2026-12-31, como o BRIEF manda. Na falta de vigência própria no código, as demais linhas começam em 2025-01-01, o 1º ano apurável (precedente: emenda §9 L-10 do LEGAL-PARAMS). Fazem exceção as que têm data na lei: faixas de PF desde 2025-05-01, redução desde 2026-01-01, dependente desde 2015-04-01 e CSLL de 2027 desde 2027-01-01.

## 4. Ambiguidades (só o que precisa de decisão humana)
- Nenhuma nova. As pendências do BRIEF §7 seguem abertas ao contador:
  - P-RET-6: código GPS/DCTFWeb do INSS retido, que nasce DRAFT sem valor;
  - P-RET-8: CPRB 3,5%, que nasce DRAFT sem valor;
  - P-RET-7: soma mensal do PF;
  - P-RET-4: referencial das folhas. Por decisão do dono (24/10), as folhas ficam fora do plano padrão até a resposta.

## 5. Lacunas
- Linhas de beneficiário com residência no exterior (R-4020/R-4010 "Sim") ficam fora: a chave da `RETENCAO_CODIGO` não tem residência, e EXTERIOR dá 400 neste nó.
- 10002 (trabalho sem vínculo, IRPF `058807`) fica fora pela Emenda 22/10 item 1.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_EFD-REINF-20-20Tabelas-2015012026-zip — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/56/02690B8D5DE8904DFAB98799195B016052E4F5/EFD-REINF%20-%20Tabelas%2015012026.zip>  
  Baixado em 2026-10-24T17:14:38-03:00 · arquivo local `docs/D01_EFD-REINF-20-20Tabelas-2015012026-zip.html` · SHA-256 `31c04713b92a965c7413190a21dfc1b8eab4b10002a58371506da758e770b1a7`
- **[D02]** Lei nº 11.482 de 31/05/2007 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6b9dfaf3a61af84706aba58fd654ab2d757b6917/federal/leis-ordinarias/2007/lei-11482-2007-05-31.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2007-05-31;11482> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-24T17:16:21-03:00 · arquivo local `docs/D02_lei-11482-2007-05-31.md` · SHA-256 `0c2aeb0a857f68c5c325b2eef940461ffd5cd422422692c1057de35af96256bf`
- **[D03]** D9580 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm>  
  Baixado em 2026-10-24T17:16:22-03:00 · arquivo local `docs/D03_d9580-htm.html` · SHA-256 `99577ff589f6e346588214958e91f358bd9bebe835a4f8d2e5962b680e18d9f1`
- **[D04]** L9250 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/l9250.htm>  
  Baixado em 2026-10-24T17:16:23-03:00 · arquivo local `docs/D04_l9250-htm.html` · SHA-256 `10d108312d807f2a09f5f773eac7805e09c7f71140439d94e77b768c0fe54717`
- **[D05]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-24T17:20:59-03:00 · arquivo local `docs/D05_lcp214-htm.html` · SHA-256 `6f7a703e66995ebc9564b868e2867cb59820b52a9094274062510cfb00a99141`

## Registro de buscas
_Nenhuma busca registrada._
