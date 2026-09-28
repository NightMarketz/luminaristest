---
id: "ITEM-DESTINATION"
tipo: "regua"
dominio: "fiscal"
titulo: "Destinação por item na entrada (revenda × insumo do serviço)"
estado: "planned"
estado_detalhe: "**Nó de régua** por decisão do dono (25/09, EMENDA de [[D-2026-09-25-SIG-NFE-NO-DE-REGUA]]). Fase 3.1 do plano pós-contador — requisito NOVO trazido pela resposta do contador (23/09), sem spec. Toca estoque, crédito do X6 e ICMS de uso e consumo; default por produto + override por item; migração. ADR se mudar o modelo de Product"
depende_de: ["[[FIS-08]]", "[[X6]]", "[[D1]]"]
ancora_sdd: "§III.2"
atualizado: "2026-09-25"
---
# ITEM-DESTINATION — Destinação por item na entrada (revenda × insumo do serviço)

**Estado:** `planned` — **Nó de régua** por decisão do dono (25/09, EMENDA de [[D-2026-09-25-SIG-NFE-NO-DE-REGUA]]). Fase 3.1 do plano pós-contador — requisito NOVO trazido pela resposta do contador (23/09), sem spec. Toca estoque, crédito do X6 e ICMS de uso e consumo; default por produto + override por item; migração. ADR se mudar o modelo de Product  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006). O plano pede "planeja a Fase 3" (produz BRIEF `BE-INCR-ITEM-DESTINATION`, forks pendentes)  
**Depende de:** [[FIS-08]], [[X6]], [[D1]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.2

## Docs

- [`docs/accounting/PLANO-POS-CONTADOR-2026-09-23.md`](../../accounting/PLANO-POS-CONTADOR-2026-09-23.md) — Fase 3, item 3.1
- [`docs/accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md`](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md)

## Insumo que falta antes do BRIEF

- Resposta do follow-up **0.8(e)** ao contador (o plano a lista como dependência do 3.1) — ver [[D1]] e [[ENVIO-PEDIDO-CONTADOR]].

## Emendas irmãs da Fase 3 (não são nós — ficam no `estado_detalhe` do nó que crescem)

- **3.2** benfeitoria em imóvel de terceiro + bem até R$1.200 → [[C8]]
- **3.3** multa de mora × punitiva, desconto condicional × incondicional, receita financeira → [[F7]] + [[X4]]
- **3.4** memória de cálculo, créditos por nota/item, aging conciliado, ficha do imobilizado, XLSX → [[C6b]] / [[FE-INCR-DELIVERY]]
