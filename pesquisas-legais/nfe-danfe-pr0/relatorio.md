# Relatório de pesquisa legal — nfe-danfe-pr0

**Pergunta:** PR-0 do NFE-DANFE-IBSCBS: NT 2026.010 rebaixada, leiaute base do DANFE no MOC e classificação das NTs 2026.009, 2026.006, 2026.003 e 2014.001 v1.41
**Aberto em:** 2026-10-26T16:52:28-03:00 · **Atualizado em:** 2026-10-26T17:00:09-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

- A NT 2026.010 baixada hoje é a mesma de 17/10 e 22/10 (sha256 `eadc5246…`) [D01]: produção em **01/12/2026**, sem fase de
  teste, só para o DANFE **modelo 55**. Transcrição em
  `docs/accounting/fontes-oficiais/TRANSCRICAO-NT2026010-DANFE-RTC-2026-10-26.md`.
- O leiaute base do DANFE, que a NT altera, está no **MOC 7.0 Anexo II** [D02], não na Visão Geral (o §2.2.4 da Visão
  Geral remete ao Anexo II). Dele saem: código de barras **CODE-128C** com vetor de teste (`09758364` → DV 48) [D02] §2.1;
  **"SEM VALOR FISCAL"** em homologação [D02] §3; chave em 11 blocos de 4 dígitos [D02] §3.1.1; protocolo de autorização
  no Campo 2 [D02] §3.9.1; folhas adicionais, verso e supressões [D02] §3.3–§3.5. Transcrição em
  `docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-AnexoII-DANFE-2026-10-26.md`.
- Das quatro NTs que a nota do nó mandava conferir, **nenhuma muda o DANFE 55 deste nó**: 2026.009 [D03] → X10a (regra
  I08-140); 2026.006 [D04] → IBS-CBS-2027 (split payment); 2026.003 [D05] → outro documento (DANFE Simplificado Tipo 2);
  2014.001 v1.41 [D06] → X10a (EPEC, contingência).

## 2. Fundamentação

| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Escopo e prazo | NT 2026.010 §1 e cronograma | [D01] | "Documento Auxiliar da Nota Fiscal Eletrônica (DANFE), modelo 55" · produção 01/12/2026 |
| Código de barras | MOC 7.0 Anexo II §2 | [D02] | "O padrão de código de barras a ser impresso no DANFE é o CODE-128C." |
| Homologação | MOC 7.0 Anexo II §3 | [D02] | "sempre deverá conter a frase “SEM VALOR FISCAL” no quadro “Informações Complementares” ou em marca d’água destacada" |
| Só o XML | MOC 7.0 Anexo II §3.1 · NT 2026.010 §4.4 | [D02] [D01] | "Não poderão ser impressas informações que não constem do arquivo da NF-e." |
| NT 2026.009 fora do DANFE | NT 2026.009 §1 | [D03] | "não modifica o leiaute da NF-e nem os schemas XML" |

## 3. Vigência conferida

- Fontes do Portal da NF-e não estão no acervo ctresb/leis; todas vieram da fonte oficial, com sha256.
- A NT 2026.010 v1.00 é a versão listada no Portal em 26/10/2026 (sem v1.01). O MOC 7.0 Anexo II é a versão 7.00
  (out/2020), a vigente hoje.
- A partir de 01/11/2026 o MOC passa a ter versão online mantida pelo Paraná (Aj. SINIEF 40/26, ver dossiê
  `sp-inutilizacao-nfe-nfce-2026-11`). O PR-2 confere se a versão online diverge nas regras `[MOC-DANFE-…]`.

## 4. Ambiguidades (só o que precisa de decisão humana)

- **Onde vai "SEM VALOR FISCAL"** em homologação: a fonte aceita "Informações Complementares" **ou** marca d'água destacada
  [D02] §3. As duas leituras são lícitas; o BRIEF (item 14) não escolhe. Decisão de produto, sem contador.
- **Texto do Campo 1:** o MOC escreve "Consulta de autenticidade no portal nacional da NF-e …" [D02] §3.9.1 e o modelo da NT
  "Consulte a autenticidade no portal nacional da NF-e …" [D01] p. 8. O modelo da NT é o mais novo.

## 5. Lacunas

- A regra de formação do QR Code no DANFE 55 não foi publicada (NT 2026.010 §4.5 [D01]).
- A tag do "Tipo de Regime de Apuração do IBS e da CBS" não foi publicada (NT 2026.010 §4.2 [D01]).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Nota Técnica 2026.010 v1.00 — DANFE Reforma Tributária (rebaixada 26/10; sha igual ao de 22/10) — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=ugn4MYF5PLg=>  
  Baixado em 2026-10-26T16:55:00-03:00 · arquivo local `docs/D01_NT2026010-v1.00.pdf` · SHA-256 `eadc5246235f37a55f8140ddcf84595c8ce77f2d760f111f7b85ddf389b8f484`
- **[D02]** MOC 7.0 — Anexo II, Manual de Especificações Técnicas do DANFE e Código de Barras (versão 7.00) — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=f%20NhsSn3/5M=>  
  Baixado em 2026-10-26T16:55:00-03:00 · arquivo local `docs/D02_MOC70-AnexoII-DANFE.pdf` · SHA-256 `729c04fd1374188c29eb21ca60342741b24a014003d4c2ff1bbb455bb1a6a60e`
- **[D03]** Nota Técnica 2026.009 v1.00 — Alteração de Regra de Validação de CFOP (I08-140) — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=ADlgg2xjMZI=>  
  Baixado em 2026-10-26T16:55:00-03:00 · arquivo local `docs/D03_NT2026009-v1.00.pdf` · SHA-256 `50b7dec40bba8928b4d544feb4fdbd8c8bac16e37c99d926ddb2834cf246f15d`
- **[D04]** Nota Técnica 2026.006 v1.00 — Vinculação com a Transação de Pagamento do DF-e (split payment) — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=k7zG06n5M6I=>  
  Baixado em 2026-10-26T16:55:00-03:00 · arquivo local `docs/D04_NT2026006-v1.00.pdf` · SHA-256 `47a65abde315fed1e6a8c6085a67ca483935cb57877ae5715d365377a725e05d`
- **[D05]** Nota Técnica 2026.003 v1.00 — DANFE Simplificado Tipo 2 — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=2YdaBTIql%20k=>  
  Baixado em 2026-10-26T16:55:00-03:00 · arquivo local `docs/D05_NT2026003-v1.00.pdf` · SHA-256 `2ef826027e0e8423ba9dc2f53ee7197f8bfdcc399a30459b72da977528600f13`
- **[D06]** Nota Técnica 2014.001 v1.41 — Evento Prévio de Emissão em Contingência (EPEC) — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=9hgG%20%20cH8gA=>  
  Baixado em 2026-10-26T16:55:00-03:00 · arquivo local `docs/D06_NT2014001-v1.41.pdf` · SHA-256 `fa9218ddadcb35ca1233434a4dfd040243360d983c0d3f6b85e7756284a6fd19`

## Registro de buscas
_Nenhuma busca registrada._
