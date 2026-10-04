---
id: "D-2026-10-03-X7-FASE-B-FATIAMENTO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: F-TB-8, fatiamento da Fase B do X7 em 4 PRs (emenda o F-TB-7), com o ANUAL liberado só no último"
estado: "decided"
autorizacao: "dono, chat, 2026-10-03 (AskUserQuestion, sessão de planejamento do fatiamento da Fase B) — sem 'executa'"
atualizado: "2026-10-03"
---
# D-2026-10-03-X7-FASE-B-FATIAMENTO — cédula do F-TB-8

**Estado:** `decided` (2/2 na recomendação).
**Autorização:** dono, chat, 03/10/2026: *"Planeja o fatiamento em PRs da Fase B do X7 (dono, 03/10/2026) —
sessao-planejamento. … Molde: F-TA-10 (a) da Fase A. Saída: emenda no BRIEF com a divisão proposta como fork F-TB-8,
apresentado por questionário (AskUserQuestion). Sem 'executa'; código da Fase B só depois da Fase A inteira
mergeada."*
**Não é "executa"** (ORCH-006).

Documento: [`BE-INCR-TAX-ASSESSMENT-B-brief.md`](../../accounting/BE-INCR-TAX-ASSESSMENT-B-brief.md) §3 e §3.1.

**Divergência do passo 1, reportada antes da pergunta:** o fatiamento já estava ratificado no **F-TB-7 → (a)**
([[D-2026-10-02-X7-FASE-B-FORKS]]), com 3 PRs. Por isso o F-TB-8 foi apresentado como **emenda** do F-TB-7, e não
como decisão nova. Lacunas do F-TB-7 que motivaram a emenda:
1. os itens 25 (gates) e 26 (testes de invariante) não estavam em nenhum PR;
2. o PR-1 juntava as funções puras com o item 12, que muda o serviço do e-Lalur, já em uso. Com isso o PR-1 deixava
   de ser "verificável só com teste-tabela", que é o argumento do molde F-TA-10 (a);
3. o `ANUAL` ficava selecionável no PR-1. Do PR-1 ao PR da ECF, o `main` permitiria que uma PJ `ANUAL` fechasse a
   Parte B trimestral e gerasse a ECF com `FORMA_APUR = T` (**I**). O preview da Fase A recusa `ANUAL` (A-13), mas
   o e-Lalur e a ECF só checam a forma a partir dos itens 12 e 18.

### F-TB-8 — fatiamento
- **Opções:**
  - (a) 4 PRs seriais: perfil/parâmetros/funções puras · e-Lalur anual · model/fluxo/provisão · ECF anual
    (**recomendada**);
  - (b) manter os 3 PRs do F-TB-7, só distribuindo os itens 25/26;
  - (c) 1 PR.
- **Resposta literal:** *"(a) 4 PRs seriais (Recomendado)"* → ✅ (a).

### F-TB-8.1 — em que PR o `ANUAL` fica selecionável (itens 1 e 2)
- **Opções:**
  - só no último PR; até lá o DTO recusa `ANUAL` e os testes semeiam o perfil pelo repositório (**recomendada**);
  - no PR-1, como no F-TB-7.
- **Resposta literal:** *"Só no último PR (Recomendado)"* → ✅ itens 1 e 2 no PR-4.

**Registro:** o F-TB-7 fica **substituído** pelo F-TB-8 no que diz respeito às fronteiras dos PRs. A ordem continua
a mesma: a Fase B começa depois dos 3 PRs da Fase A mergeados. Divisão detalhada no BRIEF §3.1.
