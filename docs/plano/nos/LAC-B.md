---
id: "LAC-B"
tipo: "plataforma"
dominio: "plataforma"
titulo: "UI da prensa de binding — ativação self-service (FE-INCR-BINDING-ACTIVATION)"
estado: "blocked"
estado_detalhe: "BE item 1 mergeado: #389 cf40ab68 (28/09) — POST /accounting-binding/activate-default; UI da ativação self-service pendente · 01/10: 'executa' dado pelo dono (teste Sonnet × Opus) · 06/10 (questionário do dono: 'Abrir BRIEF da tela', em vez de fechar como done): **BRIEF da tela** `FE-INCR-BINDING-ACTIVATION-screen-brief.md` (sessao-planejamento) — PR-0 BE condicional + PR-1 FE, 13 itens; forks **F-BA-1..6 PENDENTES** (superfície; recarga dos mappers × F-I4-4; vínculo com a aba Pendências do F-I5-4 a; coexistência com o I4; setor + 2º Active na mesma unidade; flags). Achado: ativar o 2º setor na mesma unidade grava 2 Active com os mesmos 6 eventos e o próximo boot aborta por colisão (inferido por leitura, não executado; alcançável hoje pela API/CLI). A decisão de 06/10 reabre o F-B1 de 02/09 no lado (b). O 'executa' de 01/10 é anterior à spec e não cobre a tela sem confirmação; código exige 'executa' depois dos forks · 06/10 (2): **F-BA-1..6 RATIFICADOS** por questionário, todos na recomendação ([[D-2026-10-06-LAC-B-TELA-FORKS]]): faixa na AccountingView; F-BA-2 (a) condicional ao F-I4-4 → (a′) (PENDENTE no BRIEF I4/I5; se decidido diferente, volta ao dono); só link para a aba Pendências; convive sempre com o I4; seletor de setor + guarda 409 no PR-0; confirmação lista os 2 efeitos e manda as flags true. O CLI (compile() direto) e o POST /compile seguem SEM guarda: o risco de 2º Active derrubar o boot persiste por esses caminhos (lacuna para o GAP-MAP, inferida por leitura). Código exige 'executa' confirmado para a spec (o de 01/10 é anterior) · **07/10: PAUSADO por F-KS-0 → (b)** ([[D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA]]): a tela de ativação vai instalar o kit de setor inteiro, não só o binding — retoma depois do BRIEF do [[KIT-SETOR]]"
prs: ["#389"]
ancora_sdd: "§M5.1 Bloco A LAC-B"
autorizacao: "dono 'Ativar agora' 2026-09-07; EXECUTA: dono, chat, 2026-10-01 (AskUserQuestion): \"Vamos testar os sonnet e o opus para implementar as tarefas\" + 'executa' marcado para SEED-UNITS, ITEM-DESTINATION, PASSO-13 e LAC-B; PR + revisor Opus, merge após OK do dono; dono, chat, 2026-10-06, questionário: \"Abrir BRIEF da tela\" + \"Dispara em sequencia aqui tudo em opus medio\" — só BRIEF, sem código, nenhum fork se auto-ratifica; dono, chat, 2026-10-06, questionário: F-BA-1..6 ratificados (na recomendação) — sem 'executa'"
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "regra 1: BRIEF da tela (06/10) com F-BA-1..6 PENDENTES. Antes: o #389 entregou os itens 1–3 e 5 do BRIEF de 02/09; o item 4 (UI) não tinha spec · 06/10 (2): F-BA-1..6 ratificados, mas o F-BA-2 (a) depende do F-I4-4, PENDENTE no BRIEF I4/I5 — a regra 1 segue casando até ele fechar"
atualizado: "2026-10-07"
---
# LAC-B — UI da prensa de binding — ativação self-service (FE-INCR-BINDING-ACTIVATION)

**Estado:** `blocked` — BE item 1 mergeado: #389 cf40ab68 (28/09) — POST /accounting-binding/activate-default; UI da ativação self-service pendente · 01/10: 'executa' dado pelo dono (teste Sonnet × Opus) · 06/10 (questionário do dono: 'Abrir BRIEF da tela', em vez de fechar como done): **BRIEF da tela** `FE-INCR-BINDING-ACTIVATION-screen-brief.md` (sessao-planejamento) — PR-0 BE condicional + PR-1 FE, 13 itens; forks **F-BA-1..6 PENDENTES** (superfície; recarga dos mappers × F-I4-4; vínculo com a aba Pendências do F-I5-4 a; coexistência com o I4; setor + 2º Active na mesma unidade; flags). Achado: ativar o 2º setor na mesma unidade grava 2 Active com os mesmos 6 eventos e o próximo boot aborta por colisão (inferido por leitura, não executado; alcançável hoje pela API/CLI). A decisão de 06/10 reabre o F-B1 de 02/09 no lado (b). O 'executa' de 01/10 é anterior à spec e não cobre a tela sem confirmação; código exige 'executa' depois dos forks · 06/10 (2): **F-BA-1..6 RATIFICADOS** por questionário, todos na recomendação ([[D-2026-10-06-LAC-B-TELA-FORKS]]): faixa na AccountingView; F-BA-2 (a) condicional ao F-I4-4 → (a′) (PENDENTE no BRIEF I4/I5; se decidido diferente, volta ao dono); só link para a aba Pendências; convive sempre com o I4; seletor de setor + guarda 409 no PR-0; confirmação lista os 2 efeitos e manda as flags true. O CLI (compile() direto) e o POST /compile seguem SEM guarda: o risco de 2º Active derrubar o boot persiste por esses caminhos (lacuna para o GAP-MAP, inferida por leitura). Código exige 'executa' confirmado para a spec (o de 01/10 é anterior) · **07/10: PAUSADO por F-KS-0 → (b)** ([[D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA]]): a tela de ativação vai instalar o kit de setor inteiro, não só o binding — retoma depois do BRIEF do [[KIT-SETOR]]  
**Autorização:** dono 'Ativar agora' 2026-09-07; EXECUTA: dono, chat, 2026-10-01 (AskUserQuestion): "Vamos testar os sonnet e o opus para implementar as tarefas" + 'executa' marcado para SEED-UNITS, ITEM-DESTINATION, PASSO-13 e LAC-B; PR + revisor Opus, merge após OK do dono; dono, chat, 2026-10-06, questionário: "Abrir BRIEF da tela" + "Dispara em sequencia aqui tudo em opus medio" — só BRIEF, sem código, nenhum fork se auto-ratifica; dono, chat, 2026-10-06, questionário: F-BA-1..6 ratificados (na recomendação) — sem 'executa'  
**Depende de:** —  
**Desbloqueia:** [[I3]]  
**Âncora no SDD consolidado:** §M5.1 Bloco A LAC-B  
**PRs:** #389

## Docs

- [`docs/accounting/FE-INCR-BINDING-ACTIVATION-brief.md`](../../accounting/FE-INCR-BINDING-ACTIVATION-brief.md)
- [`docs/accounting/FE-INCR-BINDING-ACTIVATION-screen-brief.md`](../../accounting/FE-INCR-BINDING-ACTIVATION-screen-brief.md) — **BRIEF da tela (06/10)**: faixa de ativação na AccountingView + PR-0 BE condicional (guarda do 2º setor); forks F-BA-1..6 **ratificados 06/10** ([[D-2026-10-06-LAC-B-TELA-FORKS]]); relação com [[I4]] (F-BA-4) e com a aba Pendências do [[I5]] (F-BA-3)

## Evidência

- `docs/SDD-LUMINARIS.md:1186` → | **LAC-B** | **UI da Prensa de binding** — ativação self-service (endpoint "ativar binding padrão do setor" embutindo a fixture, lugar natural = onboarding; editor da matriz papel→conta só quando um tenant divergir do padrão) | FE/BE ⏳ **ATIVADA 2026-09-07 pelo dono** ("Ativar agora", via `AskUserQuestion`; gatilho "onboarding self-service" do BRIEF dado pelo [plano em grafo](../../accounting/ONBOARDING-WIZARD-plano-grafo-brief.md) nó I3) | ~~O CLI atende o dono até onboarding self-service ou P2 exigirem~~ → **executar pelo BRIEF [FE-INCR-BINDING-ACTIVATION](../../accounting/FE-INCR-BINDING-A
- `docs/SDD-LUMINARIS.md:630` → > (19 nós, espinha N0→I1→I3→I4 com I5 de guarda). **Ratificações do dono na mesma data:** **LAC-B ATIVADA**

## Linhas de origem (verbatim do SDD consolidado)

> Copiadas das tabelas das Partes II/III de `docs/SDD-LUMINARIS.md` (snapshot 23/09). O estado **vivo** é o frontmatter acima.

`SDD:1186`

| **LAC-B** | **UI da Prensa de binding** — ativação self-service (endpoint "ativar binding padrão do setor" embutindo a fixture, lugar natural = onboarding; editor da matriz papel→conta só quando um tenant divergir do padrão) | FE/BE ⏳ **ATIVADA 2026-09-07 pelo dono** ("Ativar agora", via `AskUserQuestion`; gatilho "onboarding self-service" do BRIEF dado pelo [plano em grafo](../../accounting/ONBOARDING-WIZARD-plano-grafo-brief.md) nó I3) | ~~O CLI atende o dono até onboarding self-service ou P2 exigirem~~ → **executar pelo BRIEF [FE-INCR-BINDING-ACTIVATION](../../accounting/FE-INCR-BINDING-ACTIVATION-brief.md) + emenda F-I3-1 (a)**: o DTO ganha `openCurrentPeriodIfMissing` (o compile exige período OPEN do mês corrente, degrau que o BRIEF não cobria). Depende de I1 (unidade) para I4 (chamada automática no onboarding). Registrado aqui para a lacuna não ficar sem dono: hoje **zero** referência a `accounting-binding` no `my-app`, e o boot aborta sem binding `Active` — o primeiro cliente que se instalar sozinho transforma isto em bloqueio. |
