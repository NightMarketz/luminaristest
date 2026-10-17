---
id: "IRRF-DISTRIBUICAO"
tipo: "plataforma"
dominio: "fiscal"
titulo: "IRRF na distribuição: dividendos (Lei 15.270/2025) e JCP a 17,5% (LC 224)"
estado: "planned"
estado_detalhe: "17/10: registrado pela verificação legal (frente IRPJ/CSLL). Lacuna de produto, não decisão: nada modela retenção sobre distribuição de lucros nem JCP. Sem BRIEF"
depende_de: []
autorizacao: "dono, chat, 2026-10-17: \"Atualiza tbm briefs e documenta em features novas\" — só a nota (registro de feature nova revelada pela verificação legal de 17/10); sem BRIEF, sem 'executa'"
ancora_sdd: "—"
atualizado: "2026-10-17"
prs: []
---
# IRRF-DISTRIBUICAO — IRRF na distribuição: dividendos (Lei 15.270/2025) e JCP a 17,5% (LC 224)

**Estado:** `planned` — feature nova registrada pela verificação legal de 17/10/2026. Planejar exige pedido do dono; código exige `executa`.

## Escopo

- Dividendos: Lei 9.250 art. 6º-A, incluído pela Lei 15.270/2025 — IRRF de 10% sobre o que passar de R$ 50 mil/mês por beneficiário PF (verificado [D07] do dossiê IRPJ).
- JCP: IRRF de 17,5% (Lei 9.249 art. 9º §2º com a redação da LC 224/2025; efeitos em 01/01/2026 pela LC 224 art. 14 III, verificado [D01][D02]). Hoje só há nota no BRIEF CSLL-LC224 §8, que cita a IN 2.315 — a data que vale é a da lei.
- Saída esperada: lançamento da retenção + DCTFWeb/obrigação do código de receita (códigos DCTF não verificados).

## Gatilho

- Pedido do dono. Já vigente (2026): o pró-labore/distribuição do salão pode cruzar o teto.

## Docs

- Dossiê [`verif-2026-10-17-irpj-csll`](../../../pesquisas-legais/verif-2026-10-17-irpj-csll/relatorio.md) e consolidado [`VERIFICACAO-2026-10-17-CONSOLIDADO.md`](../../../pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md).
