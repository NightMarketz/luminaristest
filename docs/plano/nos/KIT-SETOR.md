---
id: "KIT-SETOR"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Kit de setor — núcleo contábil/fiscal portável + estrutura importada pelo wizard (plano, binding, padrões fiscais, referencial) com atualização em 3 níveis"
estado: "planned"
estado_detalhe: "13/10: PR-3 (ajuste papel→conta, itens 18–25) em PR #657 — 4 lacunas por questionário ([[D-2026-10-13-KIT-SETOR-PR3-LACUNAS]], emenda §11); restam PR-4 e PR-6 · 13/10: F-KB-6R/F-KB-9R (sobre o estado real: v1 publicado, salão v2 em main) — conteúdo já nos dois setores, sem esperar o PR-4; clínica v2 alcança o salão. EMENDA-1 (BE-INCR-KIT-SETOR-EMENDA-1-brief.md): PR-K1 clínica v2 PRONTO p/ executa; PR-K2 conteúdo fiscal com F-KE-1/F-KE-2 PENDENTES. Obs.: F-KB-6/9 já estavam decididos (a) em 08/10 ([[D-2026-10-08-KIT-SETOR-FORKS-KB6-KB9]]), sem fold nesta nota · 11/10: 1º kit com conteúdo — kit v2 do salão com o referencial 2025 das 15 folhas (Presumido + Real; 3.4 → .98), PR #632 (BE-INCR-H1-REFERENCIAL-3-4 PR-2, F-HR-1/2 a); alcança só instalação nova (sem upgrade, PR-4) · PRIORIDADE 1 da fila (dono 07/10: 'na frente de tudo'; F-KS-0 → b: só a LAC-B pausa). PRE-ADR Accepted 07/10 (F-KS-1..7 pela referência Odoo/OCA/BC + F-KS-0/R4 por questionário). BRIEF pronto 07/10 (BE-INCR-KIT-SETOR-brief.md: 6 PRs, 51 itens; F-KB-1..5/7/8 pela referência; F-KB-6 e F-KB-9 PENDENTES); código só com 'executa' por PR"
depende_de: ["[[P1]]", "[[P2]]", "[[I3]]", "[[D-2026-10-07-NUCLEO-KIT-DE-SETOR]]", "[[D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA]]"]
autorizacao: "dono, chat, 2026-10-07: \"Esta autorizado\" (o texto do nó) + \"Pode passar esse plano na frente de tudo\" + forks decididos (D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA) + \"Sim abre o brief com o máximo de detalhe possível\" — autoriza o BRIEF; sem 'executa' · dono, chat, 2026-10-13, questionário + \"Grava as decisões e abre as 4 emendas\" — F-KB-6R/9R + EMENDA-1; sem 'executa' ([[D-2026-10-13-QUESTIONARIO-BRIEFS-PRONTOS]])"
perfil_previsto: "opus-medio"
perfil_evidencia: "BRIEF §8: PR-1/PR-5 opus-baixo; PR-2/3/4/6 opus-medio (classificador do PR-4 no alto)"
atualizado: "2026-10-13"
prs: ["#579", "#580", "#582", "#584", "#632", "#643", "#652", "#655", "#657", "#662"]
---
# KIT-SETOR — Kit de setor: núcleo portável + estrutura importada pelo wizard

**Estado:** `planned` — 13/10: PR-3 (ajuste papel→conta, itens 18–25) em PR #657 — 4 lacunas por questionário ([[D-2026-10-13-KIT-SETOR-PR3-LACUNAS]], emenda §11); restam PR-4 e PR-6 · 13/10: F-KB-6R/F-KB-9R (sobre o estado real: v1 publicado, salão v2 em main) — conteúdo já nos dois setores, sem esperar o PR-4; clínica v2 alcança o salão. EMENDA-1 (BE-INCR-KIT-SETOR-EMENDA-1-brief.md): PR-K1 clínica v2 PRONTO p/ executa; PR-K2 conteúdo fiscal com F-KE-1/F-KE-2 PENDENTES. Obs.: F-KB-6/9 já estavam decididos (a) em 08/10 ([[D-2026-10-08-KIT-SETOR-FORKS-KB6-KB9]]), sem fold nesta nota · 11/10: 1º kit com conteúdo — kit v2 do salão com o referencial 2025 das 15 folhas (Presumido + Real; 3.4 → .98), PR #632 (BE-INCR-H1-REFERENCIAL-3-4 PR-2, F-HR-1/2 a); alcança só instalação nova (sem upgrade, PR-4) · PRIORIDADE 1 da fila (dono 07/10: 'na frente de tudo'; F-KS-0 → b: só a LAC-B pausa). PRE-ADR Accepted 07/10 (F-KS-1..7 pela referência Odoo/OCA/BC + F-KS-0/R4 por questionário). BRIEF pronto 07/10 (BE-INCR-KIT-SETOR-brief.md: 6 PRs, 51 itens; F-KB-1..5/7/8 pela referência; F-KB-6 e F-KB-9 PENDENTES); código só com 'executa' por PR  
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

- [`docs/accounting/BE-INCR-KIT-SETOR-EMENDA-1-brief.md`](../../accounting/BE-INCR-KIT-SETOR-EMENDA-1-brief.md) — EMENDA-1 13/10: clínica v2 (PR-K1) + conteúdo fiscal (PR-K2)
- [`BE-INCR-KIT-SETOR-brief.md`](../../accounting/BE-INCR-KIT-SETOR-brief.md) — BRIEF 07/10, 6 PRs; forks F-KB-1..5/7/8 decididos pela referência, F-KB-6/9 pendentes
- [`PRE-ADR-NUCLEO-KIT-DE-SETOR.md`](../../adr/PRE-ADR-NUCLEO-KIT-DE-SETOR.md) — evidência, referência externa (§2.4/§2.5), forks decididos, esqueleto do BRIEF (§5), contratos (§6)
- [[D-2026-10-07-NUCLEO-KIT-DE-SETOR]] — tese e decisões do dono
- [[D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA]] — cédulas dos forks
- [`ADR-P1-binding-press.md`](../../adr/ADR-P1-binding-press.md) — base que este nó estende (invariantes 1–7 seguem valendo)

## Trilhos e rejeitadas tocados (sem reabrir)

[[T10]] (bridge explícita, sem motor de regras), [[R-motor-regras]], [[T6]], [[T2]], [[T8]] — compatibilidade em PRE-ADR §3.
