---
id: "KIT-SETOR"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Kit de setor — núcleo contábil/fiscal portável + estrutura importada pelo wizard (plano, binding, padrões fiscais, referencial) com atualização em 3 níveis"
estado: "planned"
estado_detalhe: "PRIORIDADE 1 da fila (dono 07/10: 'na frente de tudo'; F-KS-0 → b: só a LAC-B pausa). PRE-ADR Accepted 07/10 (F-KS-1..7 pela referência Odoo/OCA/BC + F-KS-0/R4 por questionário). BRIEF pronto 07/10 (BE-INCR-KIT-SETOR-brief.md: 6 PRs, 51 itens; F-KB-1..5/7/8 pela referência; F-KB-6 e F-KB-9 PENDENTES); código só com 'executa' por PR"
depende_de: ["[[P1]]", "[[P2]]", "[[I3]]", "[[D-2026-10-07-NUCLEO-KIT-DE-SETOR]]", "[[D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA]]"]
autorizacao: "dono, chat, 2026-10-07: \"Esta autorizado\" (o texto do nó) + \"Pode passar esse plano na frente de tudo\" + forks decididos (D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA) + \"Sim abre o brief com o máximo de detalhe possível\" — autoriza o BRIEF; sem 'executa'"
perfil_previsto: "opus-medio"
perfil_evidencia: "BRIEF §8: PR-1/PR-5 opus-baixo; PR-2/3/4/6 opus-medio (classificador do PR-4 no alto)"
atualizado: "2026-10-08"
prs: ["#579"]
---
# KIT-SETOR — Kit de setor: núcleo portável + estrutura importada pelo wizard

**Estado:** `planned` — PRIORIDADE 1 da fila (dono 07/10: 'na frente de tudo'; F-KS-0 → b: só a LAC-B pausa). PRE-ADR Accepted 07/10 (F-KS-1..7 pela referência Odoo/OCA/BC + F-KS-0/R4 por questionário). BRIEF pronto 07/10 (BE-INCR-KIT-SETOR-brief.md: 6 PRs, 51 itens; F-KB-1..5/7/8 pela referência; F-KB-6 e F-KB-9 PENDENTES); código só com 'executa' por PR  
**Autorização:** dono, chat, 07/10 — nó + BRIEF; sem "executa" (ORCH-006).  
**Depende de:** [[P1]] ✅ (arquétipos + binding), [[P2]] ✅ (2º setor), [[I3]] ✅ (`activate-default`).  
**Desbloqueia:** [[LAC-B]] (a tela instala o kit).

## O que é

- O **núcleo** (razão + arquétipos + intérprete + formatos) é universal e portável aos outros projetos do dono.
- O **regime** é uma estratégia escolhida pela empresa.
- O **kit de setor** (plano por extensão, binding, padrões fiscais, referencial por regime×ano) é escolhido pelo wizard
  com IA e validado pelo contador.
- A origem é trocável: DynamicTable aqui, vertical rígido noutros projetos.
- A atualização chega aos tenants em 3 níveis, com as proteções do Odoo.

## Docs

- [`BE-INCR-KIT-SETOR-brief.md`](../../accounting/BE-INCR-KIT-SETOR-brief.md) — BRIEF 07/10, 6 PRs; forks F-KB-1..5/7/8 decididos pela referência, F-KB-6/9 pendentes
- [`PRE-ADR-NUCLEO-KIT-DE-SETOR.md`](../../adr/PRE-ADR-NUCLEO-KIT-DE-SETOR.md) — evidência, referência externa (§2.4/§2.5), forks decididos, esqueleto do BRIEF (§5), contratos (§6)
- [[D-2026-10-07-NUCLEO-KIT-DE-SETOR]] — tese e decisões do dono
- [[D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA]] — cédulas dos forks
- [`ADR-P1-binding-press.md`](../../adr/ADR-P1-binding-press.md) — base que este nó estende (invariantes 1–7 seguem valendo)

## Trilhos e rejeitadas tocados (sem reabrir)

[[T10]] (bridge explícita, sem motor de regras), [[R-motor-regras]], [[T6]], [[T2]], [[T8]] — compatibilidade em PRE-ADR §3.
