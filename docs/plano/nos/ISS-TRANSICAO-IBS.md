---
id: "ISS-TRANSICAO-IBS"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Transição ISS → IBS (2029–2032) e fim da LC 116 em 2033"
estado: "planned"
estado_detalhe: "22/10 (ratificação): forks F-ISS-1..7 RATIFICADOS pelo dono, todos (a) ([[D-2026-10-22-ISS-TRANSICAO-IBS-FORKS]]). PR-1 espera só o 'executa'; PR-2 espera também P-ISS-1..3 do contador · 22/10: **BRIEF escrito** (sessao-planejamento; dono, chat, 22/10: \"Precisamos agora de sessões para a falta de brief\" — só o BRIEF) no #847 (`docs/accounting/BE-INCR-ISS-TRANSICAO-IBS-brief.md`): PR-1 sem dependência externa (fim de ISS_LIMITE em 2032-12-31, tabela ISS_TRANSICAO 10–40%, linhas DRAFT do IBS 2029–2032, 400 nomeado em 2033) e PR-2 depois de P-ISS-1..3 (fator, piso, benefício). Forks F-ISS-1..7 PENDENTES; P-ISS-1 (piso de 2% cai?), P-ISS-2 (§ 3º no Simples) e P-ISS-3 (pacote que cruza o ano) ao contador. Sem PRE-ADR. Dossiê pesquisas-legais/iss-transicao-ibs-2029. Próximo: ratificar os forks; depois `executa` do PR-1 · 17/10: registrado pela verificação legal (frente ISS). ISS_LIMITE e issComBeneficio não têm fim de vigência; nada muda antes de 01/2029"
depende_de: ["[[M5-ibs-cbs]]"]
autorizacao: "dono, chat, 2026-10-17: \"Atualiza tbm briefs e documenta em features novas\" — só a nota (registro de feature nova revelada pela verificação legal de 17/10); sem BRIEF, sem 'executa'"
ancora_sdd: "—"
atualizado: "2026-10-22"
prs: ["#847"]
---
# ISS-TRANSICAO-IBS — Transição ISS → IBS (2029–2032) e fim da LC 116 em 2033

**Estado:** `planned` — 22/10: **BRIEF escrito** (sessao-planejamento; dono, chat, 22/10: "Precisamos agora de sessões para a falta de brief" — só o BRIEF) no #847 (`docs/accounting/BE-INCR-ISS-TRANSICAO-IBS-brief.md`): PR-1 sem dependência externa (fim de ISS_LIMITE em 2032-12-31, tabela ISS_TRANSICAO 10–40%, linhas DRAFT do IBS 2029–2032, 400 nomeado em 2033) e PR-2 depois de P-ISS-1..3 (fator, piso, benefício). Forks F-ISS-1..7 PENDENTES; P-ISS-1 (piso de 2% cai?), P-ISS-2 (§ 3º no Simples) e P-ISS-3 (pacote que cruza o ano) ao contador. Sem PRE-ADR. Dossiê pesquisas-legais/iss-transicao-ibs-2029. Próximo: ratificar os forks; depois `executa` do PR-1 · 17/10: registrado pela verificação legal (frente ISS). ISS_LIMITE e issComBeneficio não têm fim de vigência; nada muda antes de 01/2029  

## Escopo

- Redução escalonada do ISS e dos benefícios de 2029 a 2032 (LC 116 art. 8º-B, incluído pela LC 214 art. 508) e revogação da LC 116 em 2033 (LC 214 art. 543 IV) — verificado [D01][D04] do dossiê ISS.
- Parâmetros `ISS_LIMITE`/piso ganham `vigenteAte` e versões por ano; a apuração do Simples já tem o teto de ISS decrescente nos Anexos 2027–2033 (frente Simples, item 2).

## Gatilho

- Data legal: 01/01/2029.

## Docs

- Dossiê [`verif-2026-10-17-iss-nfse`](../../../pesquisas-legais/verif-2026-10-17-iss-nfse/relatorio.md) e consolidado [`VERIFICACAO-2026-10-17-CONSOLIDADO.md`](../../../pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md).
- BRIEF [`BE-INCR-ISS-TRANSICAO-IBS-brief.md`](../../accounting/BE-INCR-ISS-TRANSICAO-IBS-brief.md) e dossiê [`iss-transicao-ibs-2029`](../../../pesquisas-legais/iss-transicao-ibs-2029/relatorio.md) (LC 214 no Planalto compilado, 22/10).
