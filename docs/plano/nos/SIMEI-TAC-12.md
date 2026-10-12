---
id: "SIMEI-TAC-12"
tipo: "plataforma"
dominio: "fiscal"
titulo: "SIMEI: CPP de 12% do salário-mínimo no DAS-MEI do transportador autônomo de cargas (BE-INCR-SIMEI-TAC-12)"
estado: "done"
estado_detalhe: "BRIEF escrito; F-TAC-1..5 RATIFICADOS (dono, 10/10: a,a,a,a,b); bloco 2027 (IBS/CBS no DAS-MEI, Anexo VII) no BRIEF §9 com F-TAC-6..10 RATIFICADOS (dono, 09/10, todos (a)); sem executa · 10/10 (D-2026-10-10-X14-PROXIMOS-PASSOS, D1 (a)): a aresta para o X14 cobre só a parte MEI (já em main; Res. CGSN 140 art. 101 caput) — não espera o X14-CAIXA; ordem: o código do TAC vem antes dos planejamentos do FE-INCR-SIMPLES/X14-CAIXA · 12/10: código mergeado em main pelo #626 (2f2371b2; itens 1–14 do BRIEF, CPP 12% + Anexo VII) → done; a cédula de 'executa' não está citada no corpo do #626 nem neste nó"
depende_de: ["[[X14]]"]
autorizacao: "dono, chat, 2026-10-10: \"abre o BRIEF do DAS de 12% do transportador\" — só o BRIEF (sessao-planejamento); dono, chat, 2026-10-10, questionário: F-TAC-1..4 (a), F-TAC-5 (b) — IBS/CBS 2027 entra no nó; sem código, sem executa · dono, chat, 2026-10-09, questionário: F-TAC-6..10 (a) — sem 'executa' · dono, chat, 2026-10-10, questionário ([[D-2026-10-10-X14-PROXIMOS-PASSOS]]): D1 \"(a) Só MEI; TAC primeiro\" — aresta X14 só na parte MEI; NÃO é executa"
ancora_sdd: "—"
atualizado: "2026-10-12"
prs: ["#626"]
---
# SIMEI-TAC-12 — DAS-MEI de 12% do transportador autônomo de cargas

**Estado:** `done` — BRIEF escrito; F-TAC-1..5 RATIFICADOS (dono, 10/10: a,a,a,a,b); bloco 2027 (IBS/CBS no DAS-MEI, Anexo VII) no BRIEF §9 com F-TAC-6..10 RATIFICADOS (dono, 09/10, todos (a)); sem executa · 10/10 (D-2026-10-10-X14-PROXIMOS-PASSOS, D1 (a)): a aresta para o X14 cobre só a parte MEI (já em main; Res. CGSN 140 art. 101 caput) — não espera o X14-CAIXA; ordem: o código do TAC vem antes dos planejamentos do FE-INCR-SIMPLES/X14-CAIXA · 12/10: código mergeado em main pelo #626 (2f2371b2; itens 1–14 do BRIEF, CPP 12% + Anexo VII) → done; a cédula de 'executa' não está citada no corpo do #626 nem neste nó  
**Autorização:** BRIEF + ratificação F-TAC-1..5 (dono, chat, 10/10). Sem `executa`.  
**Depende de:** [[X14]] — **só a parte MEI** (apuração do SIMEI e perfil fiscal do MEI), por D1 (a) de [[D-2026-10-10-X14-PROXIMOS-PASSOS]]; não espera o [[X14-CAIXA]]. Ordem: TAC primeiro.

## Escopo

`apurarSimei` passa a cobrar a CPP de 12% do salário-mínimo do transportador autônomo de cargas com ocupação
exclusiva da Tabela B do Anexo XI, a partir da competência 04/2022 (Res. CGSN 140 art. 100 §§ 1º-A/1º-B, art. 101 I "c"; LC 123 art. 18-F III).
A partir de 2027, soma ao DAS-MEI os valores fixos de CBS/IBS (e ICMS/ISS decrescentes 2029–2032) do Anexo VII da LC 123
(LC 214 arts. 517, 518, 520) — F-TAC-5 (b).

## Docs

- [`docs/accounting/BE-INCR-SIMEI-TAC-12-brief.md`](../../accounting/BE-INCR-SIMEI-TAC-12-brief.md) — BRIEF + forks
