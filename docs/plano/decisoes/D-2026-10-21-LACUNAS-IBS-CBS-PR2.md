---
id: "D-2026-10-21-LACUNAS-IBS-CBS-PR2"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas do PR-2 do IBS-CBS-2027 (#826): papéis a recolher, conta de receita da reclassificação, cobertura do kit da clínica"
estado: "decided"
autorizacao: "dono, chat, 2026-10-21: \"autorizo instrumentação → correção das lacunas 2 e 3 do IBS-CBS-2027 (#826), PR sem merge\" + lacuna 1: \"(a) Preencher pelo plano padrão, como o ensureCanonicalMappings faz com o referencial\""
atualizado: "2026-10-21"
---
# D-2026-10-21-LACUNAS-IBS-CBS-PR2

| Lacuna | Resposta | Estado |
|---|---|---|
| 1 — kits v6 não preenchem `ibsRecolherAccountId` / `cbsRecolherAccountId` do perfil fiscal | **(a) preencher pelo plano padrão** (mesmo molde do `ensureCanonicalMappings`); kit publicado não muda; unidade com plano próprio segue manual | Decidida; **código NÃO autorizado** — a frase de 21/10 autoriza só 2 e 3. Precisa de pedido próprio |
| 2 — reclassificação lança direto em 3.1 / 3.3 | Lê `receita-serviço` / `receita-revenda` do binding ativo (porta `RevenueAccountsPort`, adaptador no factory); sem binding ⇒ 3.1 / 3.3; bindings ativos divergentes ⇒ 400 | Guarda vermelho → verde no PR desta data |
| 3 — só o kit do salão tinha teste de cobertura com 2.1.8.01/02 | Caso da clínica (Presumido e Real) no `kitV2Referencial.integration.test.ts` | Passou de primeira (cobertura já existia); falsificador: sem 2.01.01.09.28 no catálogo, o caso fica vermelho |

Não há merge.
