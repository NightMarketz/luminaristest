---
id: "PRESUMIDO-TETO-78MI"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Validar o teto de R$ 78 mi do Lucro Presumido (Lei 9.718 arts. 13–14)"
estado: "planned"
estado_detalhe: "22/10: **BRIEF escrito no #844** — `BE-INCR-PRESUMIDO-TETO-78MI-brief.md`, 11 itens em 1 PR: teto em reais na tabela `TAX_ASSESSMENT`, receita total de Y−1 do razão (todas as unidades, sem encerramento) e declarada no perfil, aviso nas obrigações e na prévia, 400 na confirmação do Presumido. Forks **F-PT-1..7 PENDENTES**; P-PT-1..3 com o contador (receita bruta × total, mês parcial, ano de início). Dossiê `pesquisas-legais/presumido-teto-78mi`. Próximo: ratificar forks; código exige 'executa' · 17/10: registrado pela verificação legal (frente IRPJ/CSLL, item 19). O perfil tem `lucroRealObrigatorio`, mas o sistema não confere a receita do ano anterior contra o teto. Sem BRIEF"
depende_de: ["[[X7]]"]
autorizacao: "dono, chat, 2026-10-22: 'Precisamos agora de sessões para a falta de brief' — só o BRIEF (sessao-planejamento), só docs; sem 'executa', sem merge; antes: dono, chat, 2026-10-17: \"Atualiza tbm briefs e documenta em features novas\" — só a nota (registro de feature nova revelada pela verificação legal de 17/10); sem BRIEF, sem 'executa'"
ancora_sdd: "—"
atualizado: "2026-10-22"
prs: ["#844"]
---
# PRESUMIDO-TETO-78MI — Validar o teto de R$ 78 mi do Lucro Presumido (Lei 9.718 arts. 13–14)

**Estado:** `planned` — 22/10: **BRIEF escrito** — `BE-INCR-PRESUMIDO-TETO-78MI-brief.md`, 11 itens em 1 PR: teto em reais na tabela `TAX_ASSESSMENT`, receita total de Y−1 do razão (todas as unidades, sem encerramento) e declarada no perfil, aviso nas obrigações e na prévia, 400 na confirmação do Presumido. Forks **F-PT-1..7 PENDENTES**; P-PT-1..3 com o contador (receita bruta × total, mês parcial, ano de início). Dossiê `pesquisas-legais/presumido-teto-78mi`. Próximo: ratificar forks; código exige 'executa' · 17/10: registrado pela verificação legal (frente IRPJ/CSLL, item 19). O perfil tem `lucroRealObrigatorio`, mas o sistema não confere a receita do ano anterior contra o teto. Sem BRIEF  

## Escopo

- Alerta/bloqueio quando a receita bruta do ano-calendário anterior passar de R$ 78 mi (ou R$ 6,5 mi × número de meses de atividade do ano anterior, quando inferior a 12) e o perfil estiver em Presumido (Lei 9.718 art. 13 caput e art. 14 I — verificado [D04] do dossiê IRPJ).

## Gatilho

- Pedido do dono. Baixa prioridade para o público-alvo (salão/clínica).

## Docs

- [`BE-INCR-PRESUMIDO-TETO-78MI-brief.md`](../../accounting/BE-INCR-PRESUMIDO-TETO-78MI-brief.md) — **BRIEF 22/10**: 11 itens em 1 PR; forks F-PT-1..7 pendentes; P-PT-1..3 com o contador
- Dossiê [`presumido-teto-78mi`](../../../pesquisas-legais/presumido-teto-78mi/relatorio.md) — Lei 9.718 arts. 13–14 (acervo), RIR arts. 257/587 (Planalto), IN 1.700 arts. 59/214 (site da RFB)
- Dossiê [`verif-2026-10-17-irpj-csll`](../../../pesquisas-legais/verif-2026-10-17-irpj-csll/relatorio.md) e consolidado [`VERIFICACAO-2026-10-17-CONSOLIDADO.md`](../../../pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md).
