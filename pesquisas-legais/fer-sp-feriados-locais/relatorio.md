# Relatório de pesquisa legal — fer-sp-feriados-locais

**Pergunta:** Quais são os feriados estaduais de SP e municipais de São Paulo capital vigentes em 2026 (Lei 9.093 arts. 1º II-III e 2º)?
**Aberto em:** 2026-10-17T10:46:52-03:00 · **Atualizado em:** 2026-10-17T11:26:27-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **Estado de SP:** feriado civil em **9 de julho**, data magna (Lei estadual 9.497/1997 art. 1º, com base na Lei 9.093/1995 art. 1º II) [D01]. Em vigor desde a publicação, 06/03/1997 (art. 3º). A Lei 17.264/2020 só mudou a data em 2020 [D01].
- **Município de São Paulo (IBGE 3550308):** o art. 1º da Lei municipal 7.008/1967, na redação da Lei 13.707/2004, lista **25 de janeiro, 2 de novembro, 20 de novembro, Sexta-feira da Semana Santa e Corpus Christi** [D03]. Em vigor desde 07/01/2004 (art. 4º).
- 2/11 e 20/11 já são nacionais (Lei 662/1949; Lei 14.759/2023). Ficam na tabela para transcrever o art. 1º inteiro e não mudam nenhum resultado.
- No código: tabela `FERIADO_LOCAL` (6 linhas, ids `fer-`). O discriminador é o código IBGE (`35` = UF; `3550308` = município). As datas móveis são `PASCOA-2` (Sexta-feira Santa) e `PASCOA+60` (Corpus Christi), calculadas pelo computus gregoriano.

## 2. Fundamentação
| Linha | Norma | Fonte | Trecho |
|---|---|---|---|
| 35 · 07-09 | Lei SP 9.497/1997 art. 1º | [D01] | "Fica instituído, como feriado civil, o dia 9 (nove) de julho, data magna do Estado de São Paulo" |
| 3550308 · 01-25, 11-02, 11-20, PASCOA-2, PASCOA+60 | Lei SP-capital 7.008/1967 art. 1º (red. Lei 13.707/2004 art. 1º) | [D03] | "os dias 25 de janeiro, 2 de novembro, 20 de novembro, sexta-feira da Semana Santa e 'Corpus Christi'" |

## 3. Vigência conferida
- **[D01]:** o alerta foi `versao_texto = atualizada`. O próprio texto da Alesp diz "Texto compilado, atualizada até a Lei 17.264/2020", e a única nota é a mudança da data em 2020. Não achei alteração posterior.
- **[D03]:** é a lei que deu a redação vigente do art. 1º. O PDF da Lei 7.008 original [D04] não tem camada de texto, e por isso as linhas municipais começam em 07/01/2004 (a redação lida), não em 1967.
- **Alteração posterior:** a busca não achou mudança no art. 1º depois de 2004. A Lei 17.341/2020 e o Decreto 60.131/2021 só anteciparam feriados em 2020 e 2021, por causa da pandemia (pista de busca, não lida). Grau: inferido. O texto compilado da Lei 7.008 não foi aberto: o catálogo da Prefeitura devolveu 404 na URL tentada [D02].

## 4. Ambiguidades
1. **25 de janeiro.** A Lei 9.093 art. 1º III só autoriza feriado civil municipal no centenário. Os religiosos (art. 2º) são até 4. O 25/01 de SP é civil e anual. Há duas leituras:
   - (i) a lei municipal vale enquanto não for declarada inválida;
   - (ii) o 25/01 excede a Lei 9.093.
   Para a validade do pacote, (i) prorroga o prazo, o que favorece o consumidor (CDC 47). Foi a leitura adotada.
2. **Sábado:** não decidido aqui (dossiê verif-2026-10-17 §4.2). O código segue tratando o sábado como dia útil.

## 5. Lacunas
- Outros municípios e UFs não estão na tabela. A unidade sem `codMun` no perfil fiscal, ou fora de SP, segue só com o nacional. Para incluir, basta publicar uma linha nova na aba Parâmetros legais.
- O texto compilado da Lei 7.008/1967 no portal da Prefeitura não foi lido (404 em [D02]).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 9.497, de 05/03/1997 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/3c5447730a871b38352a79a11db525a18f361979/estaduais/SP/leis-ordinarias/1997/lei-9497-1997-03-05-id9458.md>  
  Fonte oficial declarada: <https://www.al.sp.gov.br/norma/9458> · versao_texto: atualizada · cópia de 2026-10-13  
  Lido em 2026-10-17T10:47:22-03:00 · arquivo local `docs/D01_lei-9497-1997-03-05-id9458.md` · SHA-256 `f9207515044a51d74cff1d0ef8c246c3a2bc48ec0ec1d7b1b4d76df89ef14371`  
  ⚠ versao_texto = 'atualizada' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ consta como revogada (situacao='Sem revogação expressa', revogada=false)
- **[D02]** Catálogo de Legislação Municipal — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.prefeitura.sp.gov.br/lei-14485-de-19-de-julho-de-2007>  
  Baixado em 2026-10-17T10:47:35-03:00 · arquivo local `docs/D02_lei-14485-de-19-de-julho-de-2007.html` · SHA-256 `e5d73650a2f15a3dbbfdf145c3e0dc8050345bc43840baa5ba28ec8168645b95`
- **[D03]** LEI Nº 13 — Casas legislativas  
  Link oficial: <https://www.saopaulo.sp.leg.br/iah/fulltext/leis/L13707.pdf>  
  Baixado em 2026-10-17T10:48:36-03:00 · arquivo local `docs/D03_L13707-pdf.pdf` · SHA-256 `8c7bb11298a926b0c307041d9520ef05d0a6ca2c481dd99a145470daf1e80e3c`
- **[D04]** D04_L7008-pdf — Casas legislativas  
  Link oficial: <https://www.saopaulo.sp.leg.br/iah/fulltext/leis/L7008.pdf>  
  Baixado em 2026-10-17T10:48:36-03:00 · arquivo local `docs/D04_L7008-pdf.pdf` · SHA-256 `6670657e1a1cd4958ecfd172ba8715004fbcbf893b6babc9071d04339cec2a6b`

## Registro de buscas
_Nenhuma busca registrada._
