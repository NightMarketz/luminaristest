---
id: "D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Executa do EFICIENCIA-FISCAL PR-2 (segregação por NCM) e três lacunas de spec decididas pelo dono: ST só SP DRAFT até 31/03/2026, sem linha PUBLISHED não exclui ICMS, monofásico de 2027 na função"
estado: "decided"
autorizacao: "dono, chat, 2026-10-27 (repassada pela sessão orquestradora): \"Executa o EFICIENCIA-FISCAL PR-2 (BRIEF #846, segregação por NCM) — sessao-feature, sem merge.\" — executa só do PR-2 (itens 11–14). Decisões no AskUserQuestion do mesmo dia, as três na opção recomendada. Sem merge"
atualizado: "2026-10-27"
---
# D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-27: *"Executa o EFICIENCIA-FISCAL PR-2 (BRIEF #846, segregação por
NCM) — sessao-feature, sem merge."* PR-3..PR-5 **não** autorizados. Nó: [[EFICIENCIA-FISCAL]]. Forks: [[D-2026-10-21-FORKS-EFICIENCIA-FISCAL]]
(F-EF-5 a), [[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]].

## Bloqueio do BRIEF

O BRIEF §2 travava o PR-2 "até o `ProductFiscalProfile` estar em `main`". O model entrou pelo #914 (X10a PR-2, commit
`9892aff3`, merge `30d48a75`), que já está na base do PR-1 (#913), sobre a qual este PR empilha.

## Verificação legal (dossiê `pesquisas-legais/eficiencia-fiscal-pr2-icms-st-ncm/`)

- [D01] Conv. ICMS 142/2018 (CONFAZ, fonte oficial; o acervo só tem convênios de 2021): o Anexo XIX lista os produtos de perfumaria,
  higiene pessoal e cosméticos **passíveis** de ST. Cada UF decide se aplica.
- [D02] SEFAZ-SP, Resposta à Consulta 33677/2026: "desde 01/04/2026, o artigo 1º da Portaria SRE 94/2025 revogou o Anexo XI da
  Portaria CAT 68/2019", isto é, a lista paulista do RICMS/2000 art. 313-E. Cosméticos saíram da ST em SP.
- [D03] RICMS/SP arts. 313-E e 313-F (SEFAZ-SP).
- [D04] LC 214/2025 art. 542 XI (Planalto, compilada): revoga a Lei 10.147/2000 "a partir de 1º de janeiro de 2027".

## Decisões do dono (AskUserQuestion, 27/10)

| # | Pergunta | Escolha |
|---|---|---|
| 1 | Conteúdo da `ICMS_ST_NCM_UF` | **Só SP, DRAFT até 31/03** (recomendada): linhas SP das NCM 3303/3304/3305 do Anexo XIX [D01], `vigenteAte = 2026-03-31` [D02], `DRAFT` (a lista do Anexo XI paulista revogado não foi lida) |
| 2 | NCM sem linha PUBLISHED de ST na UF | **Não exclui ICMS + alerta** (recomendada): DAS cheio; produto com CSOSN 500 ⇒ alerta INFO "ST não conferida, declare na segregação manual". A fonte é a tabela (F-EF-5 a) |
| 3 | I-9 (monofásico ≥ 2027) | **Na função, por data** (recomendada): `segregacaoPorNcm` devolve sem PIS/COFINS a partir de 2027-01-01 (LC 214 art. 542 XI [D04]); as linhas PUBLISHED do `PIS_COFINS_MONOFASICO_NCM` não mudam, e o X6 fica intacto |

## O que fica aberto

- Fechar a vigência das linhas do `PIS_COFINS_MONOFASICO_NCM` em 2026-12-31 fica para o nó [[IBS-CBS-2027]]. A importação de NF-e
  (X6) também lê essas linhas.
- Publicar as linhas SP de jan–mar/2026 exige ler o Anexo XI da Portaria CAT 68/2019 (revogado) na redação vigente até 31/03/2026.
- As outras UFs ficam sem linha até haver a leitura da legislação de cada uma.
