# Relatório de pesquisa legal — ricms-sp-art566-vencimento

**Pergunta:** O que diz o RICMS/SP art. 566 sobre vencimento de imposto em dia sem expediente bancário/fazendário?
**Aberto em:** 2026-11-24T01:20:25-03:00 · **Atualizado em:** 2026-11-24T01:25:49-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **O art. 566 do RICMS/SP não trata de dia sem expediente.** Ele dispunha sobre a **atualização monetária** do débito fiscal em UFESPs e está **revogado** pelo Decreto 55.437/2010, com efeitos a partir de 23/12/2009 [D01]. A remissão "observado o disposto no artigo 566" que sobrou nos arts. 112 e 113 [D09] aponta para um dispositivo revogado e não tem efeito sobre o dia do vencimento. Os arts. 567 e 568 [D04] mostram que o 566 era a regra de atualização monetária. Grau: **verificado**.
- **A regra do vencimento em dia sem expediente é o art. 596 do RICMS/SP** [D10]:
  - § 1º: o vencimento só ocorre em dia de expediente normal da **repartição**;
  - § 4º: o § 1º **não se aplica** ao recolhimento pelo sistema bancário, que não depende da repartição;
  - § 2º: para obrigação cumprida em estabelecimento bancário, se o vencimento cair em **feriado bancário**, o prazo fica **prorrogado para o dia útil seguinte**.

  A mesma estrutura está na Lei 6.374/89 art. 108 §§ 1º e 2º [D05], base legal do art. 596. A RC 4264/2014 da Sefaz-SP [D11] lê o art. 596, com o CTN art. 210 [D06], assim: se o vencimento "ocorrer em dia não-útil" ou cair em feriado bancário, prorroga para o dia útil seguinte. Grau: **verificado** quanto ao texto. A extensão a sábado e domingo é a leitura da RC [D11].
- **Para o simulador e o calendário do motor:** o ICMS do CPR 1200 (dia 20 [D08 Anexo IV art. 2º VI]) que cair em sábado, domingo ou feriado bancário **passa para o dia útil seguinte**, sem antecipar. A Agenda Tributária de novembro/2026 [D07] aplica isso: o CPR 1200 vence em 23/11/2026, porque 20/11 é feriado nacional e 21-22/11 caem no fim de semana. A Agenda é declarada por Comunicado SRE ("as datas fixadas ... são as constantes da Agenda"), e por isso a data publicada a cada mês é a fonte final do dia. Grau: **verificado** pelo texto da Agenda de novembro.
- A lacuna 7c15 nasceu da remissão morta ao art. 566. Ela fica resolvida com o art. 596 § 2º: o deslocamento usado no simulador, do dia 20 para o dia útil seguinte, está correto.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Art. 566 revogado; era atualização monetária | RICMS/SP art. 566 | [D01] | "Revogado pelo Decreto 55.437, de 17-02-2010 ... Efeitos a partir de 23-12-2009" / "O valor do débito fiscal, para efeito de atualização monetária, será convertido em ... UFESPs" |
| Remissão residual | RICMS/SP art. 112 | [D09] | "observado o disposto no artigo 566, poderá ser recolhido ... até o dia indicado no Anexo IV" |
| Vencimento em dia de expediente da repartição | RICMS/SP art. 596 § 1º | [D10] | "o seu vencimento somente ocorre em dia de expediente normal da repartição" |
| Banco: feriado bancário prorroga | RICMS/SP art. 596 § 2º | [D10] | "se o dia de vencimento ocorrer em feriado bancário estabelecido pelos órgãos competentes, o prazo fica prorrogado para o dia útil seguinte" |
| § 1º não vale para recolhimento bancário | RICMS/SP art. 596 § 4º | [D10] | "não se aplica aos prazos ... que independam do funcionamento regular de repartições fiscais, tal como o recolhimento do imposto junto ao sistema bancário" |
| Base legal | Lei 6.374/89 art. 108 §§ 1º e 2º | [D05] | mesma redação dos §§ 1º e 4º do art. 596 |
| Regra geral de prazo | CTN art. 210 parágrafo único | [D06] | "Os prazos só se iniciam ou vencem em dia de expediente normal na repartição" |
| Leitura da Sefaz-SP | RC 4264/2014 | [D11] | "ocorrer em dia não-útil ou ... feriado bancário ..., o prazo fica prorrogado para o dia útil seguinte" |
| CPR 1200 = dia 20 | RICMS/SP Anexo IV art. 2º VI | [D08] | "CPR 1200 - até o dia 20 do mês subseqüente" |
| Dia no calendário de nov/2026 | Comunicado SRE 10/2026 (Agenda 447) | [D07] | "as datas fixadas para cumprimento das OBRIGAÇÕES PRINCIPAIS ... são as constantes da Agenda Tributária Paulista anexa" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:** a Lei 6.374 do acervo [D05] veio com `versao_texto = atualizada` (texto da Alesp, não compilado oficial). Ela foi usada só para mostrar a base legal. O texto citado para a regra é o do RICMS no portal da Sefaz-SP [D10], baixado hoje. O CTN [D06] está compilado e sem alerta.
- **Redação atual:** o § 4º do art. 596 foi acrescentado pelo Decreto 47.278/2002. Os §§ 1º a 3º não trazem nota de redação nova na página lida [D10].
- O Decreto 67.616/2023 [D02], citado em nota do Anexo IV, é prorrogação pontual para municípios do litoral em calamidade (fatos geradores de fev. a jul./2023). Não é regra geral e não se aplica à capital.

## 4. Ambiguidades (só o que precisa de decisão humana)
- Nenhuma que mude o simulador. O § 2º fala de "feriado bancário". Sábado e domingo entram pela leitura da Sefaz (RC 4264/2014 [D11], "dia não-útil") e pela prática da Agenda [D07]. O motor deve usar a data da Agenda do mês quando houver e, sem ela, a regra "dia útil bancário seguinte".

## 5. Lacunas
- Não foi baixada a norma que fixa os feriados bancários (calendário do Banco Central/Febraban). Para 20/11 basta a Agenda [D07].
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** RICMS - Artigo 566
						
Capítulo III - DA ATUALIZAÇÃO MONETÁRIA — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art566.aspx>  
  Baixado em 2026-11-24T01:20:37-03:00 · arquivo local `docs/D01_art566-aspx.html` · SHA-256 `0d41b49fb58d038ba5caa79da0bacb3f2f1c22ba2d20dea600fcacfbdcf9d7fc`
- **[D02]** Decreto 67616 de 2023 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/Decreto-67616-de-2023.aspx>  
  Baixado em 2026-11-24T01:21:23-03:00 · arquivo local `docs/D02_Decreto-67616-de-2023-aspx.html` · SHA-256 `b2d3d19d3389cf4cb10fa46bf776011cfc53962cba4fc04ca87431d14f72fb5c`
- **[D03]** RICMS - Artigo 565
						
Capítulo — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art565.aspx>  
  Baixado em 2026-11-24T01:21:33-03:00 · arquivo local `docs/D03_art565-aspx.html` · SHA-256 `6e156ba623ebae6881157351530597a5c0f2d46de1ed30f29b7a0a0695a5809e`
- **[D04]** RICMS - Artigo 567 a 569
						
Capítulo IV - DAS DISPOSIÇÕES COMUNS AOS JUROS DE MORA E À ATUALIZAÇÃO MONETÁRIA — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art567.aspx>  
  Baixado em 2026-11-24T01:21:34-03:00 · arquivo local `docs/D04_art567-aspx.html` · SHA-256 `927db012c4b050e10637ccf2de535155ed6fed2e59674ccac2bf7a8d2aa6cbef`
- **[D05]** Lei nº 6.374, de 01/03/1989 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a04d818af03dd02ec234f777e89fc809126702e5/estaduais/SP/leis-ordinarias/1989/lei-6374-1989-03-01-id25030.md>  
  Fonte oficial declarada: <https://www.al.sp.gov.br/norma/25030> · versao_texto: atualizada · cópia de 2026-10-13  
  Lido em 2026-11-24T01:21:50-03:00 · arquivo local `docs/D05_lei-6374-1989-03-01-id25030.md` · SHA-256 `419917e3106054a23498fa31fdd8030acc29517f69b657b4d108999b2cded724`  
  ⚠ versao_texto = 'atualizada' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ consta como revogada (situacao='Sem revogação expressa', revogada=false)
- **[D06]** Lei nº 5.172 de 25/10/1966 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/04685ef7689b7028d0dc835e5cde644ad7a2d328/federal/leis-ordinarias/1966/lei-5172-1966-10-25.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1966-10-25;5172> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:21:52-03:00 · arquivo local `docs/D06_lei-5172-1966-10-25.md` · SHA-256 `fe8ef71d4ebe8c0d04d3422ca95853e15291c5c7ca6168cd34ae7b8ee6e3983b`
- **[D07]** Comunicado SRE 10 de 2026 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/Comunicado-SRE-10-de-2026.aspx>  
  Baixado em 2026-11-24T01:24:17-03:00 · arquivo local `docs/D07_Comunicado-SRE-10-de-2026-aspx.html` · SHA-256 `89f62711abbed86be28dc1d15f3363dbd8d4732d12a186a53d51c7d2568e9c2b`
- **[D08]** RICMS - Anexo IV - Artigo 1º ao 3º
						
ANEXO IV - PRAZOS DE RECOLHIMENTO DO IMPOSTO — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/l6an4.aspx>  
  Baixado em 2026-11-24T01:24:17-03:00 · arquivo local `docs/D08_l6an4-aspx.html` · SHA-256 `6044128fd89b4bfd5f5197a4f868b55556206563a117fc6cb0a31f13e1bf1706`
- **[D09]** RICMS - Artigo 112 a 114
						
SEÇÃO II - DOS PRAZOS PARA PAGAMENTO NO REGIME PERIÓDICO DE APURAÇÃO — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art112.aspx>  
  Baixado em 2026-11-24T01:24:18-03:00 · arquivo local `docs/D09_art112-aspx.html` · SHA-256 `afa0d1cc76a8533404fa7a3f7308eee6268353161c88eb007d29baddf98778f7`
- **[D10]** RICMS - Artigo 596
						
LIVRO V - DAS DISPOSIÇÕES FINAIS E TRANSITÓRIAS — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art596.aspx>  
  Baixado em 2026-11-24T01:24:53-03:00 · arquivo local `docs/D10_art596-aspx.html` · SHA-256 `a6415e03c47fd92b08e26ab3eb204ebc25227cf65019acfec6a487c4b0f1fa4d`
- **[D11]** RC 4264/2014 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/RC4264_2014.aspx>  
  Baixado em 2026-11-24T01:24:53-03:00 · arquivo local `docs/D11_RC4264_2014-aspx.html` · SHA-256 `b41bb5da49997c4a3c959cbd12b8ac843ea34bcdd80987dca0a1f9a2d8a227f0`

## Registro de buscas
_Nenhuma busca registrada._
