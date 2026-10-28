# Relatório de pesquisa legal — nfe-danfe-pr2

**Pergunta:** PR-2 do NFE-DANFE-IBSCBS: padrão do código de barras da chave com CNPJ alfanumérico (NT Conjunta 2025.001 §6)
**Aberto em:** 2026-10-26T20:13:29-03:00 · **Atualizado em:** 2026-10-26T20:14:02-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

- A chave de acesso pode ter letras (CNPJ alfanumérico, NT 2026.004 [D02]), e o CODE-128C do MOC só codifica dígitos. A
  regra para o documento auxiliar está na **NT Conjunta 2025.001 §6** [D01]: modelo **híbrido**, começa em Start C e alterna
  para o CODE-128A nos caracteres não numéricos, com o código 100/101 (Code A) e 99 (Code C). A NT 2026.004 não trata do
  código de barras (0 ocorrências de "barra" no texto [D02]).
- Regras de troca [D01] §6, "Orientações para o uso dos caracteres START, CODE e SHIFT": (1) Start C; (2) em C, dados com
  número ímpar de dígitos antes de não numérico ⇒ Code A antes do último dígito ímpar; (3) em A, 4 ou mais dígitos em
  sequência ⇒ Code C antes do 1º dígito (grupo par) ou depois do 1º (grupo ímpar); (4) em C, não numérico ⇒ Code A antes dele.
- **Contradição interna da NT** [D01]: o exemplo "5225AB83" volta para C com só 2 dígitos ("83"), contra a regra 3. Decisão
  do dono (questionário de 26/10): seguir as **regras numeradas**; o exemplo entra no teste pelas palavras-código da NT
  (105, 52, 25, 101, 33, 34, 99, 83), que provam o DV 30.
- A coluna "Larguras" da tabela de representação simbólica da NT tem erros de digitação (ex.: START C "2 1 4 1 1 1", que é o
  padrão do Start B). As larguras do teste saem da tabela do MOC 7.0 Anexo III.01 (dossiê `nfe-danfe-pr0` [D02]).
- Largura mínima do código híbrido: **11,5 cm** [D01] §6 (o MOC dava 6 cm para o 128C puro). O render usa 115 mm.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Modelo híbrido | NT Conjunta 2025.001 §6 | [D01] | "O padrão sugerido a ser adotado é o modelo híbrido, utilizando o CODE 128-C, e na ocorrência de caracteres" |
| Regra 3 | NT Conjunta 2025.001 §6 | [D01] | "Se quatro ou mais dígitos ocorrerem em sequência enquanto se estiver no conjunto de" |
| Regra 4 | NT Conjunta 2025.001 §6 | [D01] | "4. Quando estiver no conjunto de caracteres 'C' e um caractere não numérico ocorrer nos dados" |
| DV do exemplo | NT Conjunta 2025.001 §6 | [D01] | "1987 mod 103 = 30" |

## 3. Vigência conferida
- NT Conjunta 2025.001 v1.00 (25/04/2025), listada no Portal da NF-e em 26/10/2026 como "Publicada em 08/05/2025", sem versão posterior na lista.
- NT 2026.004 v1.01 (08/06/2026) é a versão mais nova listada.

## 4. Ambiguidades (só o que precisa de decisão humana)
- Regra 3 × exemplo: decidida pelo dono em 26/10 ("Regras numeradas"). Os dois códigos decodificam a mesma chave; a
  diferença só aparece com 2 ou 3 dígitos entre letras do CNPJ.

## 5. Lacunas
- Nenhuma nota real com CNPJ alfanumérico foi lida por leitor físico de código de barras; os testes provam palavras-código, DV e larguras.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Nota Técnica Conjunta 2025.001 v1.00 — CNPJ Alfanumérico (§6: padrão do código de barras dos documentos auxiliares) — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=5ZkvIZt10mQ=>  
  Baixado em 2026-10-26T18:30:00-03:00 · arquivo local `docs/D01_NT-Conjunta-2025.001-CNPJ-Alfanumerico.pdf` · SHA-256 `671d546b24ad4682e267fc76a9eeca8f14ad15ead2be20721ee2aec5438cf964`
- **[D02]** Nota Técnica 2026.004 v1.01 — CNPJ alfanumérico na NF-e/NFC-e (sem regra de código de barras) — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=BTZQzgsO9Ws=>  
  Baixado em 2026-10-26T18:30:00-03:00 · arquivo local `docs/D02_NT2026004-v1.01.pdf` · SHA-256 `5f24a25351e790692754b07bbefac42ac67e70167a62a7806395d880f56675be`

## Registro de buscas
_Nenhuma busca registrada._
