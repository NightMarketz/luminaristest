---
id: "ENVIO-PEDIDO-CONTADOR"
tipo: "dado-externo"
dominio: "externo"
titulo: "Envio do pedido ao contador (itens 6–13; o dono envia)"
estado: "done"
estado_detalhe: "Enviado pelo dono (data não informada); resposta recebida 23/09 → triagem TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md. **2ª rodada ABERTA (Fase 0.8 do plano pós-contador):** follow-up (a) 13c reformulado — qual COD_PB_RFB (1071/2210/3130) o M010 usa; (b) códigos do referencial p/ juros/multa/desconto; (c) alíquota de ISS do município + cClassTrib; (d) D8; (e) destinação por item. Rascunho é do agente (luminaris-contador-liaison), **o envio é do dono** — rascunho em docs/accounting/PEDIDO-CONTADOR-2026-09-23-followup.md (26/09; item 5 — data do Simples — em 27/09); nenhum registro de envio"
autorizacao: "F-M5 (2026-09-03)"
prs: ["#331"]
ancora_sdd: "§III.1 · §M5.1 (apontadores)"
atualizado: "2026-09-27"
---
# ENVIO-PEDIDO-CONTADOR — Envio do pedido ao contador (itens 6–13; o dono envia)

**Estado:** `done` — Enviado pelo dono (data não informada); resposta recebida 23/09 → triagem TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md. **2ª rodada ABERTA (Fase 0.8 do plano pós-contador):** follow-up (a) 13c reformulado — qual COD_PB_RFB (1071/2210/3130) o M010 usa; (b) códigos do referencial p/ juros/multa/desconto; (c) alíquota de ISS do município + cClassTrib; (d) D8; (e) destinação por item. Rascunho é do agente (luminaris-contador-liaison), **o envio é do dono** — rascunho em docs/accounting/PEDIDO-CONTADOR-2026-09-23-followup.md (26/09; item 5 — data do Simples — em 27/09); nenhum registro de envio  
**Autorização:** F-M5 (2026-09-03)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #331  
**Âncora no SDD consolidado:** §III.1 · §M5.1 (apontadores)

## Docs

- [`docs/accounting/PEDIDO-CONTADOR-2026-09-03.md`](../../accounting/PEDIDO-CONTADOR-2026-09-03.md)
- [`PLANO-POS-CONTADOR-2026-09-23.md`](../../accounting/PLANO-POS-CONTADOR-2026-09-23.md) — Fase 0.8 (o follow-up desta 2ª rodada)

## Evidência

- `docs/SDD-LUMINARIS.md:1166` → > | **Pedido ao contador** (itens 6–13) | A — dado externo D1 | ✅ montado (#331 `3f61c4b0`); **dono envia** | `PEDIDO-CONTADOR-2026-09-03.md` EMENDA 15/09 |
- `docs/SDD-LUMINARIS.md:1521` → pedido ao contador** (#331, itens 6–13 — dono envia), D2, D5, D6.
- [`docs/accounting/CEDULA-DECISAO-2026-09-03-modulos.md:183`](../../accounting/CEDULA-DECISAO-2026-09-03-modulos.md)

## Fold 27/09

- Rascunho da 2ª rodada: [`PEDIDO-CONTADOR-2026-09-23-followup.md`](../../accounting/PEDIDO-CONTADOR-2026-09-23-followup.md). Itens 1–4 = (a), (b), (d) e (e) do 0.8; o (c) saiu (D8 fechado 24/09); item 5 novo (Simples: Ato 4 § 1º diz 01/01/2027, o contador disse 01/11/2026).
