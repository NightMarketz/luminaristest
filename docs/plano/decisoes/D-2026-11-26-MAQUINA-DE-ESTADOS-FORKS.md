---
id: "D-2026-11-26-MAQUINA-DE-ESTADOS-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks do BRIEF da máquina de estados por agregado com repositório fechado (F-SM-1..7) — questionário do dono em 26/11"
estado: "decided"
autorizacao: "dono, 2026-11-26, chat: \"sim, planejar a A com o repositório fechado\"; questionário (AskUserQuestion) em 2 blocos. Respostas literais: F-SM-6 → \"409 com código (Recommended)\"; F-SM-2 → \"Emendar e promover a ADR (Recommended)\"; F-SM-5 → \"Entram, no PR-7 (Recommended)\"; F-SM-4 → \"Só por status, último PR (Recommended)\"; F-SM-1 → \"Criar o nó (Recommended)\"; F-SM-3 → \"tsc + regra no gerador (Recommended)\"; F-SM-7 → \"Depois do CANCELLING (Recommended)\". Não autoriza código."
atualizado: "2026-11-26"
---
# D-2026-11-26-MAQUINA-DE-ESTADOS-FORKS — forks do BRIEF da máquina de estados por agregado

**Estado:** `decided`
**Autorização:** dono, 2026-11-26, questionário (respostas literais no cabeçalho). Escopo: **ratificar os forks do BRIEF** e
**criar a nota do nó** [[MAQUINA-DE-ESTADOS]]. Não autoriza código: cada PR pede o `executa`.

Base: [`BE-INCR-MAQUINA-DE-ESTADOS-brief.md`](../../accounting/BE-INCR-MAQUINA-DE-ESTADOS-brief.md) §6. Origem: pergunta do dono
no chat em 26/11 sobre o nível da arquitetura dos módulos e o impacto de uma máquina de estados "real"; a opção escolhida foi
a máquina pura por agregado (opção A), com o repositório fechado. A opção B (agregado que se persiste, eventos, fases) é o
motor rejeitado em 21/09 e não foi reaberta.

## Forks

| Fork | Decisão | Recomendação seguida? |
|---|---|---|
| F-SM-1 nota de nó | **(a)** criar [[MAQUINA-DE-ESTADOS]] com `autorizacao` de 26/11 e `write_set` | sim |
| F-SM-2 onde mora a decisão | **(a)** o PR-0 emenda o `PRE-ADR-LIFECYCLE-TRANSITIONS` com D6 (comandos) e D7 (repositório fechado) e o promove a ADR `Accepted` | sim |
| F-SM-3 guarda da classe | **(a)** `tsc` + teste por máquina + regra no `backend-repository-generator` e no revisor; **sem** teste que descobre (não é exceção à moratória de gates) | sim |
| F-SM-4 `allowedActions` | **(a)** só por status, no último PR; é "pode tentar", o servidor continua recusando | sim |
| F-SM-5 ciclos simples | **(a)** entram no PR-7 (tabela + comandos + teste; repositório fechado onde houver escrita livre) | sim |
| F-SM-6 quem perde o CAS | **(a)** `ConflictError` 409 com código por agregado; em job e compensação, `BLOCKED`/log pelo caminho que o serviço já tem; nunca silencioso | sim |
| F-SM-7 ordem com o CANCELLING | **(a)** AP/AR só depois do PR-2 do BE-INCR-CANCELAMENTO-CANCELLING mergeado | sim |

## O que isso destrava

Nada executa sozinho. A sessão de feature do nó [[MAQUINA-DE-ESTADOS]] só abre depois do `executa` do dono. O PR-0 (contrato,
só `lib/` e docs) não tem precondição; o PR-3 (AP/AR) espera o CANCELLING, e o PR-5 (DF-e) espera a `integration/x10a` na
`main`. Ficou aberto, por escolha (F-SM-3): modelo novo com `status` pode nascer sem máquina se gerador e revisor falharem.

As outras duas fatias da opção A (front e presets DynamicTable) não têm BRIEF: §10 do BRIEF.
