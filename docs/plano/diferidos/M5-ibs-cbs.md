---
id: "M5-ibs-cbs"
tipo: "diferido"
dominio: "governanca"
titulo: "Reforma tributária do consumo — IBS/CBS"
estado: "deferred"
estado_detalhe: "⚫ registrado 03/09; ADR exige item 1b do contador; triagem 23/09 P2: DeRE NÃO se aplica a salão (fora de escopo); IBS/CBS = controle extracontábil para conciliação. **Insumo novo (V5, 27/09):** LC 214 art. 10 § 4º (red. LC 227/2026) — pagamento antes do fornecimento exige **antecipação** de IBS/CBS na data de cada parcela, com acerto no fornecimento (§ 5º devolve por crédito; § 7º só tolera 5 dias). Atinge o **pacote pré-pago** do salão. Transcrição + leitura INFERIDA em `TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md`"
ancora_sdd: "§M5"
atualizado: "2026-10-17"
---
# M5-ibs-cbs — Reforma tributária do consumo — IBS/CBS

**Estado:** `deferred` — ⚫ registrado 03/09; ADR exige item 1b do contador; triagem 23/09 P2: DeRE NÃO se aplica a salão (fora de escopo); IBS/CBS = controle extracontábil para conciliação. **Insumo novo (V5, 27/09):** LC 214 art. 10 § 4º (red. LC 227/2026) — pagamento antes do fornecimento exige **antecipação** de IBS/CBS na data de cada parcela, com acerto no fornecimento (§ 5º devolve por crédito; § 7º só tolera 5 dias). Atinge o **pacote pré-pago** do salão. Transcrição + leitura INFERIDA em `TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md`  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M5

## Docs

- [`TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md`](../../accounting/fontes-oficiais/TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md)
  — V5: art. 10 §§ 4º/5º/7º transcritos; §3 mostra que o razão **já** difere a receita do pacote (V7), então o que falta é fiscal, não contábil

## Evidência

- `docs/SDD-LUMINARIS.md:1128` → | **Reforma tributária do consumo — IBS/CBS** (NT 2025.002 v1.40 na NF-e, `cClassTrib`, DeRE, Ato Conjunto RFB/CGIBS nº 4/2026) | ⚫ **registrado 2026-09-03; até esta data não constava do mapa** | Convergência de fontes secundárias nesta data — primárias não abertas ([triagem](../../accounting/TRIAGEM-CONTADOR-2026-09-03-SIMULACAO.md) §A.2): 2026 é ano-teste (0,1% IBS + 0,9% CBS, LC 214/2025 art. 348 §1º); NF-e autorizada ≥ **03/08/2026** traz grupos `IBSCBS`/`IS`/`vNFTot` que o parser da tag **ignora em silêncio** (dívida T3); **01/12/2026**: NF-e obrigatória para contribuinte de IBS/CBS **não

## Fold 25/09 (Fase 6 do PLANO-POS-CONTADOR)

- Fold 25/09 — [triagem 23/09](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md) P2: **DeRE fora** (salão). IBS/CBS fica como controle extracontábil para conciliação; nada a codar. P7: IBS/CBS no Simples só em 2027.

## Verificação legal 17/10/2026 (dono: "documenta em features novas")

Lido na LC 214 compilada do Planalto, já com a LC 227/2026 (dossiê [`verif-2026-10-17-pis-cofins`](../../../pesquisas-legais/verif-2026-10-17-pis-cofins/relatorio.md) [D09]):

- **2026:** IBS 0,1% (art. 343) e CBS 0,9% (art. 346), com dispensa para quem cumpre as obrigações acessórias (art. 348 §1º). Simples fora (art. 348 III "c"). O produto **supõe a dispensa** sem declarar — premissa explícita em andamento na sessão de PIS/COFINS; ambiguidade A2 do [consolidado](../../../pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md).
- **2027:** PIS/Cofins extintos (art. 542, art. 544 III) e CBS plena (art. 347). Presumido/Real ficam **sem apuração federal sobre a receita** a partir de 01/01/2027 enquanto este diferido não virar nó — risco de data (~2,5 meses em 17/10).
- **Feature nova revelada:** guia CBS/IBS de 2026 para quem **não** fica dispensado; split payment (NT 2026.006); CSRF depois da CBS (Lei 10.833 art. 30 §1º traz "Vide LC 214/2025" — frente LGPD/obrigações #20). DANFE com IBS/CBS virou o nó [[NFE-DANFE-IBSCBS]]; transição do ISS, [[ISS-TRANSICAO-IBS]].
- Simples em 2027 (IBS/CBS no DAS, Anexos 2027–2033) conferido com 0 diferenças na frente Simples ([`verif-2026-10-17-simples-mei`](../../../pesquisas-legais/verif-2026-10-17-simples-mei/relatorio.md)).
