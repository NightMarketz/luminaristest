---
id: "D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS"
tipo: "decisao"
dominio: "plano"
titulo: "Complemento dos módulos financeiro, contábil e fiscal pela régua TOTVS/Salesforce/Power BI — régua F ratificada (Q1 a), PRE-ADRs da onda F1 autorizados (Q2 a), fold R0 autorizado (Q3 a)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-20: \"Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a).\" — ratifica a régua F, autoriza sessao-planejamento dos PRE-ADRs de F1 e o fold R0; NÃO é 'executa' de código"
atualizado: "2026-10-20"
---
# D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS

**Estado:** `decided`. **Autorização:** dono, chat, 20/10/2026 — *"Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0
(Q3 a)."* Antes, no mesmo dia, o pedido: *"Descreve o plano que eu devo adicionar para complementar melhor os modulos
financeiro, modulo contabil e modulo fiscal, além de retomar as atividades para finalizar eles por completo"* e *"Use os
apps de referencia como Totvs, SalesForce, PowerBI, como referencia para termos todas as funcionalidades chaves e completas
desses modulos"*.

## Contexto

Proposta do agente em [`PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20`](../PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md),
com as referências de mercado (fonte oficial TOTVS/Salesforce/Microsoft) em
[`REFERENCIAS-TOTVS-SALESFORCE-POWERBI-2026-10-20`](../../accounting/REFERENCIAS-TOTVS-SALESFORCE-POWERBI-2026-10-20.md).
Medição de 20/10: régua 54/63; `gh pr list --state open` = 0; nós `inflight` do vault já em `main`.

## O que fica decidido

- **Q1 (a) — régua F própria.** Os 22 nós da seção 4 da proposta (F1 4 · F2 6 · F3 4 · F4 5 · F5 4) formam uma régua
  separada da régua de 63, com denominador por módulo (financeiro 7 · contábil 4 · fiscal 7 · analytics/plataforma 4).
  Ordem entre ondas: **F1 → F5.1 (`EMAIL-TRANSPORT`) → F2 → F3 → F5 → F4**; F4 pode subir se aparecer cliente contribuinte
  de ICMS. A seção F entra na [[FILA-ORDEM]] **depois** de A–E; não altera a ordem ratificada em
  [[D-2026-10-14-FILA-ORDEM-RATIFICADA]].
- **Q2 (a) — PRE-ADRs de F1 autorizados:** `IBS-CBS-2027` (promove [[M5-ibs-cbs]]), `RETENCOES-FONTE` e `EFD-REINF`, por
  `sessao-planejamento`, **sem `executa`**. Forks não se auto-ratificam; os artigos de lei citados na proposta se conferem
  pelo método oficial antes do BRIEF.
- **Q3 (a) — fold R0 autorizado:** [[X14-CAIXA]] (#729/#738/#739), [[FE-INCR-SIMPLES]] (#733), [[X11]] (PR-1 #633),
  [[FIX-ANALYTICS-DADO]] (#770), [[FIX-ADDEDFIELDS-VAZAMENTO]] (#772) e [[BE-INCR-DT-NO-CONSUMER-CALLS]] (#773) → fold
  com o estado que `main` sustenta, num PR só de docs.
- Nó novo de F2–F5 **só vira `nos/` depois do próprio PRE-ADR ratificado** ([[README]]). Até lá a proposta é o registro.

## O que continua do dono

1. Q4–Q9 do questionário da proposta (ordem do bloco R1; ADR do `PROVISOES-AGENDADAS` × [[R-motor-regras]]; fronteira de
   `CONTRATOS-RECORRENTES`/`ORCAMENTO`; `EMAIL-TRANSPORT` BYOK; EFD-Contribuições "cheia"; F4 na régua ou gatilho).
2. `executa` de cada BRIEF de R1 e de cada nó de F, um a um; merge por número.
3. Gates A1–A7 da [[FILA-ORDEM]] (A1, o caminho da NFS-e, é o que mais trava).
