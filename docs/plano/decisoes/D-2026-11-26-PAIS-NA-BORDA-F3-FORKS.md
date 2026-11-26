---
id: "D-2026-11-26-PAIS-NA-BORDA-F3-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Fatia F3 do país na borda: forks F-F3-1..5 ratificados, todos (a), e executa do BRIEF (dono, questionário, 26/11)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-26. Na sessão-mãe, questionário: P1 \"F3 antes (Recomendado)\" e P2 \"Ratificar e executar (Recomendado)\" (executa do BRIEF da F3 inteiro, sem merge na main). Nesta sessão, dois questionários (AskUserQuestion) com F-F3-1..5"
atualizado: "2026-11-26"
---
# D-2026-11-26: fatia F3 do país na borda, forks ratificados e executa

**Estado:** `decided`. **BRIEF:** [`BE-INCR-PAIS-NA-BORDA-F3-brief.md`](../../accounting/BE-INCR-PAIS-NA-BORDA-F3-brief.md).
**Nó:** [[PAIS-NA-BORDA]], fatia F3.

## Autorização (citação literal, chat de 26/11/2026, questionário da sessão-mãe)

- **Pergunta 1:** *"A sessão da ponte folha → razão travou no PR-P0/P1. O F-PBA-7 (ratificado (a) em 24/11) manda a fatia F3
  do país-na-borda (registro de formato de LegalParameter por domínio e país) entrar antes. Só que a F3 tem os forks
  F-F3-1..5 pendentes, não tem executa e não tem código. Qual caminho?"* Resposta: **"F3 antes (Recomendado)"**.
- **Pergunta 2:** *"Se for F3 antes: autoriza uma sessão nova que primeiro ratifica com você os forks F-F3-1..5 por
  questionário e, depois, executa o BRIEF da F3 inteiro, sem merge na main?"* Resposta: **"Ratificar e executar
  (Recomendado)"**.

O `executa` cobre o BRIEF inteiro (PR-F3-0 e PR-F3-1), pela `D-2026-10-28-FLUXO-AUTONOMO`, **sem merge na `main`**. Fork
novo que aparecer na execução vira pergunta.

## Forks (respostas do dono, 26/11, dois questionários com contexto; a recomendada vinha primeiro)

| Fork | Resposta do dono (rótulo) | Decisão | Contra a recomendação? |
|---|---|---|---|
| F-F3-1 onde moram os nomes das tabelas | "(a) Registro é o catálogo (Recomendado)" | (a) DTO com `string` + regex, 400 `PARAMETRO_LEGAL_TABELA_DESCONHECIDA`, `GET /api/legal-parameters/tabelas`, tipo de nome por domínio; PR-F3-1 próprio | não |
| F-F3-2 dono das 5 tabelas compartilhadas | "(a) Contabilidade nas 5 (Recomendado)" | (a) a contabilidade declara o formato de `SALARIO_MINIMO`, `IRRF_PF_MENSAL`, `ENCARGO_FOLHA`, `FERIADO_NACIONAL` e `FERIADO_LOCAL`; leitura segue livre; rever na F7 | não |
| F-F3-3 guarda mecânica da plataforma | "(a) LP1 + L6 no check:arch (Recomendado)" | (a) regra `LP1` com as 3 arestas da F2 num `pathNot` que só encolhe (PR-F3-1) e a `L6` cobrindo `paises/<cc>/legalParameters/` (PR-F3-0); prova por plantio | não |
| F-F3-4 primeira pasta `paises/` antes da guarda | "(a) F3 carrega o item 0 (Recomendado)" | (a) o PR-F3-0 traz o item 0 do ADR §3 inteiro (`P1`, `P2`, G1–G5, prova por plantio 1–5); o PR-0 do montador o recebe pronto | não |
| F-F3-5 datas da checagem entre tabelas | "(a) Toda a vigência (Recomendado)" | (a) cada versão em vigor de `requires` que cruza `[vigenteDesde, vigenteAte]` passa, e existe uma em `vigenteDesde` | não |

**Fato novo apresentado no F-F3-4:** em 26/11 o worktree `claude/montador-pr0` (`.t3/worktrees/…/t3-811f8589…`) não tinha
commit nem PR, mas tinha desde 25/11 às 17:03 um rascunho **não commitado** do item 0 (4 arquivos, +142 linhas), sem
sessão viva listada. A F3 escreve o item 0 a partir do ADR §3 e usa o rascunho só como insumo conferido. O rascunho
redundante vai à caixa.

## Consequências

- O ADR §3 passa a valer com o item 0 no PR-F3-0. A regra *"o item 0 do primeiro PR de código … que receber `executa`"*
  passa a incluir a F3, e o BRIEF do montador recebe o item 0 pronto.
- **Correção de premissa (lida depois do questionário, 26/11):** a pergunta do F-F3-4 dizia que a F3 cria a *primeira*
  pasta `paises/`. Não cria: `features/accounting/paises/br/` existe desde o #1356 (24/11, regra `C1`), com 4 adaptadores
  e **sem** a `P1`. A escolha (a) não muda; o argumento fica mais forte, porque hoje já existe borda sem guarda. O dono foi
  avisado no questionário seguinte.
- O write-set do ciclo PR-0 e da ponte PR-P0 segue a coluna **(a)** do BRIEF da F3 §9: nenhum dos dois edita
  `legalParameter.ts` nem o snapshot de DTO por tabela nova; os formatos entram nos `index.ts` da borda.
- A ponte (`dp-ponte-razao`) não implementa o item 0. Ela é avisada com o número do PR e a branch quando o PR-F3-0
  estiver com CI verde.
