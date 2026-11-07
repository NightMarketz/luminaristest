---
id: "D-2026-11-07-REGUA-DENOMINADOR"
tipo: "decisao"
dominio: "plataforma"
titulo: "Reconciliação da régua v2 (07/11): vale a D-2026-11-07-REGUA-REDEFINICAO, com X10a aberto até a EMENDA-4 — 55/60"
estado: "decided"
autorizacao: "dono, chat, 2026-11-07, em duas mensagens: \"Decide por mim\" (sobre as mesmas três perguntas, em outra sessão que a da REDEFINICAO) e, diante dos dois PRs conflitantes #1136 e #1137, \"Ajusta o que vale de cada uma e resolve o conflito\" — reconciliação delegada ao agente; não é `executa`"
atualizado: "2026-11-07"
---
# D-2026-11-07-REGUA-DENOMINADOR — reconciliação

**Estado:** `decided`. **Autorização:** dono, chat, 07/11/2026 (citação no frontmatter). **Não é `executa`.**

Em 07/11 duas sessões responderam às mesmas três perguntas da régua:

- **#1137:** o dono escolheu "Recomendado em todas" ([[D-2026-11-07-REGUA-REDEFINICAO]]): 56/60, com o X10a `done`.
- **#1136:** o agente decidiu por delegação ("Decide por mim"): 55/60, com o X10a aberto.

O dono pediu para juntar o que vale de cada uma. Esta nota é o registro dessa junção, e o #1137 fecha sem merge.

**Régua final: 55/60 (92%).** Abertos: [[F5]], [[X10a]], [[X11]], [[X7]], [[X9]].

## O que ficou de cada uma

| Ponto | #1137 (REDEFINICAO) | #1136 (esta nota) | Fica |
|---|---|---|---|
| Q1: C9 e X6 fora do total | sim | sim; mesmo filtro e mesmo teste | igual nas duas |
| Q2: regra "fecha contra o falso, prova real à parte" | sim, prova real no [[D5]] | sim, prova real no [[X10i]] | a regra das duas; **prova da NF-e/NFC-e no D5** (é o gate de dado externo), prova dos eventos da NFS-e no X10i |
| Q2: estado do X10a | `done` | aberto | **aberto, `inflight`** (ver abaixo) |
| X11 | segue aberto | aberto; fecha com o PR-2 contra o `NullEmissor` | **#1136** |
| Q3: F6 | `diferidos/`, tipo `diferido` | subnó `deferred` | **pasta e tipo do #1137** (a palavra do dono foi "diferido"), estado `deferred` e as condições de reabertura das duas somadas |
| D-1 do [[DUVIDAS-INVENTARIO]] e README | não mexeu | marcou como decidido | **#1136** |
| Proposta com graus V/I/A | [[PROPOSTA-REGUA-REDEFINICAO-2026-11-07]] | — | **#1137**, sem edição |

## Por que o X10a segue aberto, contra o texto do Q2 (a)

- O Q2 (a) define `done` como "adaptador SEFAZ, QR Code v3/CSC e contingência contra SEFAZ/PSC falsos". Isso está em
  `main` pelo PR-7..PR-9, mas é o caminho com **assinatura pelo PSC**.
- Em 30/10 o dono decidiu que o Luminaris não contrata PSC ([[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]]). O transporte que
  vale passou a ser o assinador local da EMENDA-4.
- Em 07/11 o dono deu o `executa` dessa emenda ("Pode disparar então o que precisa seguir"). Ela está em PR (#1138,
  #1140, #1142, #1143) e ainda não chegou a `main`.
- A proposta do #1137 diz que o X10a "espera gate humano ou decisão do dono" e não cita a EMENDA-4. A recomendação que
  o dono aceitou partiu dessa medição incompleta.
- Aplicada a regra do próprio Q2 ao caminho que vale, o X10a fecha quando a EMENDA-4 e o FE do assinador entrarem em
  `main`, contra SEFAZ e assinador falsos. A prova real com o certificado do cliente fica no [[D5]].
- **Reverter** é trocar `estado: "inflight"` por `"done"` na nota do X10a: a régua vai a 56/60.

## O que esta nota não faz

- Não fecha nenhum gate do Bloco A (H1, H2, M2 e D5 seguem `human-open`).
- Não dá `executa` além do que o dono já deu em 07/11 (EMENDA-4, FE do assinador, PR-2 do X11 e o PR-3 se o F-EVT-4 for (b)).
- Supera o F-EVT-7 (a) só no trecho "PR-2 espera o X10i" (o PR-2 do X11 sai contra o `NullEmissor`).
