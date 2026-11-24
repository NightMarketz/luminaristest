---
id: "D-2026-11-24-CENTAVOS-EXATOS-FORKS"
tipo: "decisao"
dominio: "contabil"
titulo: "Forks do BRIEF do conversor reais→centavos exato (F-CE-1..9) — questionário do dono em 24/11"
estado: "decided"
autorizacao: "dono, 2026-11-24, chat: \"Abrir perguntas\" (sobre os forks do BRIEF do PR #1371); questionário (AskUserQuestion) em 2 blocos. Respostas literais: F-CE-1 → \"Meio-para-cima decimal (Recommended)\"; F-CE-2 → \"Borda e origem, em etapas (Recommended)\"; F-CE-4/5 → \"Corte único antes do go-live, histórico fica (Recommended)\"; F-CE-7 → \"Tudo, em PRs separados (Recommended)\"; F-CE-3 → \"Por linha, total = soma (Recommended)\"; F-CE-9 → \"lib/decimalMoney.ts (Recommended)\"; F-CE-8 → \"Sim, regra de ESLint (Recommended)\"; F-CE-6 e nó → \"Simétrico + criar o nó (Recommended)\". Escopo: ratificar os forks e autorizar a nota de nó. Não é 'executa' de nenhum PR do BRIEF."
atualizado: "2026-11-24"
---
# D-2026-11-24-CENTAVOS-EXATOS-FORKS — forks do BRIEF do conversor reais→centavos exato

**Estado:** `decided`
**Autorização:** dono, 2026-11-24, questionário (respostas literais no cabeçalho). Escopo: **ratificar os forks do BRIEF** e
**criar a nota do nó** [[CENTAVOS-EXATOS]]. Não autoriza código: cada PR pede o `executa`.

Base: [`BE-INCR-CENTAVOS-EXATOS-brief.md`](../../accounting/BE-INCR-CENTAVOS-EXATOS-brief.md) §5. Lacuna de origem: `L-20261124-062159-5b0a`
(com as irmãs `9d1e` e `33b2`).

## Forks

| Fork | Decisão | Recomendação seguida? |
|---|---|---|
| F-CE-1 regra do sub-centavo | **(b)** meio-para-cima decimal sobre o texto do valor, em razão e subrazão juntos | sim |
| F-CE-2 onde nasce | **(b)** borda e origem, em etapas (PR-4 deriva total e linhas em centavos inteiros depois da virada) | sim |
| F-CE-3 ordem na origem | **(a)** por linha, total = Σ das linhas (a conferir no manual da NF-e antes do PR-4) | sim |
| F-CE-4 histórico | **(a)** nada: lançamentos gravados ficam (só há seed/teste até o go-live de 2027) | sim |
| F-CE-5 mecanismo da virada | **(a)** corte único no código, sem flag, antes do 1º cliente real | sim |
| F-CE-6 negativos | **(a)** simétrico: o meio afasta de zero | sim |
| F-CE-7 escopo | **(c)** 5b0a + 9d1e (na virada) e 33b2 + parsers de documento num PR-5 separado | sim |
| F-CE-8 trava | **(a)** regra de ESLint contra `Math.round(x * 100)` em accounting, sales e accountingBinding, com baseline — exceção à moratória da bancada, ratificada aqui | sim |
| F-CE-9 casa do núcleo | **(a)** `lib/decimalMoney.ts`, sem import | sim |

## O que isso destrava

Nada executa sozinho. A sessão de feature do nó [[CENTAVOS-EXATOS]] só abre depois do `executa` do dono para os PRs do
BRIEF, e o PR-1 de código espera o #1360 mergeado. Condição da F-CE-4/5: a virada (PR-3) tem de entrar **antes** do go-live;
depois dele, a escolha (a) deixa de valer e o fork reabre para a regra versionada por venda.
