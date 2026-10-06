---
id: "D-2026-10-06-FE-POL-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks do FE-INCR-ACCOUNTING-POLICY-VERSION (F-FE-POL-1..4) — ratificados por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-06, questionário — F-FE-POL-1..4, todos na recomendação. Sem 'executa'"
atualizado: "2026-10-06"
---
# D-2026-10-06-FE-POL-FORKS — forks do FE da política versionada ([[GOV-CONTADOR]])

**Estado:** `decided` (4 cédulas, todas na recomendação).
**Autorização:** dono, chat, 06/10/2026, questionário. **Não é "executa"** (ORCH-006).

Origem: `docs/accounting/FE-INCR-ACCOUNTING-POLICY-VERSION-brief.md` §5 (PR #548).

| Fork | Pergunta (resumo) | Decisão | Contra? |
|---|---|---|---|
| F-FE-POL-1 | Como o dono propõe com contador ativo | **(a)** preemptivo: a tela lê a ACTIVE e o botão vira "Enviar ao contador"; o 409 de corrida vira oferta de reenvio como proposta | não |
| F-FE-POL-2 | Onde mora o painel de versões | **(a)** aba nova "Política" em `TABS` e em `DELEGATED_TABS`, mesmo painel nos dois modos | não |
| F-FE-POL-3 | Forma do "ver o que muda" | **(a)** tabela campo a campo das chaves do `payload`, com rótulos e as iguais recolhidas | não |
| F-FE-POL-4 | Com proposta pendente, o formulário mostra o vigente ou o proposto | **(a)** o vigente + faixa "proposta v{n} pendente; enviar outra substitui por inteiro" | não |

## Divergência de precedente (registrada por decisão do dono)

O **F-FE-POL-1 (a) diverge do F-FE-GOV-4 (a)** ([[D-2026-10-04-GOV-CONTADOR-FE-POL-FORKS]]), que é reativo — "o
servidor decide, a tela não replica a regra". Aqui a tela escolhe a rota pela atribuição ACTIVE antes do envio. O
servidor continua autoridade nos dois sentidos (BRIEF item 4.4: 409 de corrida dos dois lados). O F-FE-GOV-4 não é
reaberto para as telas do #515; a divergência vale só para a proposta de política.

## Consequências

- O teste 13c do #515 (`AccountingView.governance.test.tsx`) passa a esperar a aba nova (F-FE-POL-2 a), como o BRIEF
  já previa.
- Custo aceito do F-FE-POL-4 (a): no `FISCAL_PROFILE` (substituição total), reenviar a partir do vigente descarta a
  mudança da proposta anterior; a faixa avisa.
