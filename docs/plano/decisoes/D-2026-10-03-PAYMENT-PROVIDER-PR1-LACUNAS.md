---
id: "D-2026-10-03-PAYMENT-PROVIDER-PR1-LACUNAS"
tipo: "decisao"
dominio: "financeiro"
titulo: "Lacunas de spec do PR-1 do BE-INCR-PAYMENT-PROVIDER — 5 decididas pelo dono"
estado: "decided"
autorizacao: "dono, chat, 2026-10-03 — questionário da sessao-feature (lacunas 1–4) + \"PATCH no mesmo status: 409\" (lacuna 5)"
atualizado: "2026-10-03"
---
# D-2026-10-03-PAYMENT-PROVIDER-PR1-LACUNAS — lacunas do PR-1 do [[F5]]

**Estado:** `decided`.
**Autorização:** dono, chat, 03/10/2026. As lacunas 1–4 foram decididas por questionário antes do código, todas na
opção recomendada. A lacuna 5 foi decidida depois do review independente: *"PATCH no mesmo status: 409"*.

Origem: `docs/accounting/BE-INCR-PAYMENT-PROVIDER-brief.md` §3, itens P1-1..P1-10, que não cobriam estes casos.
Implementado no #484 (`aa95f6f6`).

| # | Lacuna no BRIEF | Decisão |
|---|---|---|
| 1 | O P1-6 diz que `credentialExpiresAt` "fica null para OWN", mas o model do §4.1 não tem a coluna (o ADR §5 tem) | Coluna **incluída** na migração, sempre null para `OWN` |
| 2 | O P1-9 só nomeia `canManagePaymentAccounts`; a leitura não tinha policy | GET = `canReadPaymentAccounts` → `canReadAccountingSettings`; escrita = `canManagePaymentAccounts` → `canManageAccountingSettings` |
| 3 | O P1-10 lista os eventos sem dar as chaves, e não lista evento para o DELETE | Chaves só com ids e status (sem `label`, texto livre); o DELETE (soft) **não** emite evento |
| 4 | "status DISABLED↔ACTIVE" no PATCH e "põe ACTIVE" no PUT da credencial | Ao pé da letra: o PATCH só faz ACTIVE→DISABLED e DISABLED→ACTIVE; o PUT ativa a partir de qualquer status, com o gate de uma ACTIVE |
| 5 | PATCH com o status atual | **409** `payment_account_invalid_transition`, sem escrita nem evento |

Valem para o PR-2 e o PR-3 só onde eles tocarem `PaymentAccount`. Não reabrem nenhum fork F-PP/F-PPB.
