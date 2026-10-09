---
id: "CSLL-RESSEGURADORES"
tipo: "plataforma"
dominio: "fiscal"
titulo: "CSLL de 9% de resseguradora local (Lei 15.525/2026) — espera código ECF de IND_ALIQ_CSLL"
estado: "blocked"
estado_detalhe: "10/10: backlog. A Lei 15.525/2026 cria CSLL de 9% para resseguradora local, e o leiaute 12 da ECF não tem código IND_ALIQ_CSLL para ela. Espera o ADE Cofis com o leiaute novo (2026/2027); até lá, perfil de resseguradora não tem código e a apuração segue sem linha. Sem BRIEF"
depende_de: ["[[CSLL-LC224]]"]
autorizacao: "dono, chat, 2026-10-10: \"Cria o nó CSLL-RESSEGURADORES\" (decisão: \"Crie um nó no backlog (BRIEF-CSLL-RESSEGURADORES) aguardando a publicação do Ato Declaratório Executivo (ADE) da Receita Federal com o novo leiaute da ECF\") — só a nota; sem BRIEF, sem 'executa'"
ancora_sdd: "—"
atualizado: "2026-10-10"
prs: []
---
# CSLL-RESSEGURADORES — CSLL de resseguradora local (Lei 15.525/2026)

**Estado:** `blocked` — espera o ADE com o leiaute novo da ECF. Planejar exige pedido do dono; código exige `executa`.

## Escopo

- Linha de `CSLL_ALIQUOTA` com 9% para resseguradora local, com a chave = o código `IND_ALIQ_CSLL` que o leiaute novo
  criar. Não inventar chave interna que o SPED rejeite (dono, 10/10).
- O enum `indAliqCsll` ganha o código novo junto (molde do F-CA-3 b do [[CSLL-LC224]]).

## Gatilho de desbloqueio

- Publicação do ADE Cofis com o leiaute da ECF que traga código de alíquota para resseguradora.

## Docs

- Achado registrado no PR #599 (comentário de 10/10, pesquisa P-CA) e no BRIEF `docs/accounting/BE-INCR-CSLL-BANCOS-Q1-brief.md` §8.
- Pendente: ler a Lei 15.525/2026 na fonte oficial (só o achado de outra sessão foi registrado).
