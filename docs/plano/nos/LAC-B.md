---
id: "LAC-B"
tipo: "plataforma"
dominio: "plataforma"
titulo: "UI da prensa de binding — ativação self-service (FE-INCR-BINDING-ACTIVATION)"
estado: "planned"
estado_detalhe: "⏳ ATIVADA 07/09 pelo dono; executar pelo BRIEF + emenda F-I3-1 (a)"
autorizacao: "dono 'Ativar agora' 2026-09-07"
ancora_sdd: "§M5.1 Bloco A LAC-B"
atualizado: "2026-09-23"
---
# LAC-B — UI da prensa de binding — ativação self-service (FE-INCR-BINDING-ACTIVATION)

**Estado:** `planned` — ⏳ ATIVADA 07/09 pelo dono; executar pelo BRIEF + emenda F-I3-1 (a)  
**Autorização:** dono 'Ativar agora' 2026-09-07  
**Depende de:** —  
**Desbloqueia:** [[I3]]  
**Âncora no SDD consolidado:** §M5.1 Bloco A LAC-B

## Docs

- [`docs/accounting/FE-INCR-BINDING-ACTIVATION-brief.md`](../../accounting/FE-INCR-BINDING-ACTIVATION-brief.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1186` → | **LAC-B** | **UI da Prensa de binding** — ativação self-service (endpoint "ativar binding padrão do setor" embutindo a fixture, lugar natural = onboarding; editor da matriz papel→conta só quando um tenant divergir do padrão) | FE/BE ⏳ **ATIVADA 2026-09-07 pelo dono** ("Ativar agora", via `AskUserQuestion`; gatilho "onboarding self-service" do BRIEF dado pelo [plano em grafo](../../accounting/ONBOARDING-WIZARD-plano-grafo-brief.md) nó I3) | ~~O CLI atende o dono até onboarding self-service ou P2 exigirem~~ → **executar pelo BRIEF [FE-INCR-BINDING-ACTIVATION](../../accounting/FE-INCR-BINDING-A
- `docs/SDD-LUMINARIS.md:630` → > (19 nós, espinha N0→I1→I3→I4 com I5 de guarda). **Ratificações do dono na mesma data:** **LAC-B ATIVADA**

## Linhas de origem (verbatim do SDD consolidado)

> Copiadas das tabelas das Partes II/III de `docs/SDD-LUMINARIS.md` (snapshot 23/09). O estado **vivo** é o frontmatter acima.

`SDD:1186`

| **LAC-B** | **UI da Prensa de binding** — ativação self-service (endpoint "ativar binding padrão do setor" embutindo a fixture, lugar natural = onboarding; editor da matriz papel→conta só quando um tenant divergir do padrão) | FE/BE ⏳ **ATIVADA 2026-09-07 pelo dono** ("Ativar agora", via `AskUserQuestion`; gatilho "onboarding self-service" do BRIEF dado pelo [plano em grafo](../../accounting/ONBOARDING-WIZARD-plano-grafo-brief.md) nó I3) | ~~O CLI atende o dono até onboarding self-service ou P2 exigirem~~ → **executar pelo BRIEF [FE-INCR-BINDING-ACTIVATION](../../accounting/FE-INCR-BINDING-ACTIVATION-brief.md) + emenda F-I3-1 (a)**: o DTO ganha `openCurrentPeriodIfMissing` (o compile exige período OPEN do mês corrente, degrau que o BRIEF não cobria). Depende de I1 (unidade) para I4 (chamada automática no onboarding). Registrado aqui para a lacuna não ficar sem dono: hoje **zero** referência a `accounting-binding` no `my-app`, e o boot aborta sem binding `Active` — o primeiro cliente que se instalar sozinho transforma isto em bloqueio. |
