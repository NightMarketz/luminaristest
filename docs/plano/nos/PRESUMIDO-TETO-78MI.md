---
id: "PRESUMIDO-TETO-78MI"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Validar o teto de R$ 78 mi do Lucro Presumido (Lei 9.718 arts. 13–14)"
estado: "planned"
estado_detalhe: "17/10: registrado pela verificação legal (frente IRPJ/CSLL, item 19). O perfil tem `lucroRealObrigatorio`, mas o sistema não confere a receita do ano anterior contra o teto. Sem BRIEF"
depende_de: ["[[X7]]"]
autorizacao: "dono, chat, 2026-10-17: \"Atualiza tbm briefs e documenta em features novas\" — só a nota (registro de feature nova revelada pela verificação legal de 17/10); sem BRIEF, sem 'executa'"
ancora_sdd: "—"
atualizado: "2026-10-17"
prs: []
---
# PRESUMIDO-TETO-78MI — Validar o teto de R$ 78 mi do Lucro Presumido (Lei 9.718 arts. 13–14)

**Estado:** `planned` — feature nova registrada pela verificação legal de 17/10/2026. Planejar exige pedido do dono; código exige `executa`.

## Escopo

- Alerta/bloqueio quando a receita bruta do ano-calendário anterior passar de R$ 78 mi (ou R$ 6,5 mi × número de meses de atividade do ano anterior, quando inferior a 12) e o perfil estiver em Presumido (Lei 9.718 art. 13 caput e art. 14 I — verificado [D04] do dossiê IRPJ).

## Gatilho

- Pedido do dono. Baixa prioridade para o público-alvo (salão/clínica).

## Docs

- Dossiê [`verif-2026-10-17-irpj-csll`](../../../pesquisas-legais/verif-2026-10-17-irpj-csll/relatorio.md) e consolidado [`VERIFICACAO-2026-10-17-CONSOLIDADO.md`](../../../pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md).
