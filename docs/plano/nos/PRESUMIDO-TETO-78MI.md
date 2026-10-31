---
id: "PRESUMIDO-TETO-78MI"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Validar o teto de R$ 78 mi do Lucro Presumido (Lei 9.718 arts. 13–14)"
estado: "done"
estado_detalhe: "30/10 (triagem): P-PT-1 e P-PT-3 respondidas (IN 1.700 arts. 59 e 214; Lei 9.718 art. 13); P-PT-2 sem regra e de efeito nulo, fica o F-PT-4 (a); nada muda no código e nada vai ao contador · 26/10 (fold): **PR único #887 em `main`** (25/10, `1072f7a0`) — os 11 itens do BRIEF entregues; nó fechado. Pendência que não é código: P-PT-1..3 com o contador (receita bruta × total, mês parcial, ano de início) podem ajustar F-PT-3/4 por emenda · 24/10 (executa): **PR único #887** — sessao-feature dos 11 itens do BRIEF: teto em reais na `TAX_ASSESSMENT` (lpt-*), `sumRevenueNetByOwner` (receita total de Y−1 por dono, sem encerramento e sem dedução de PIS/COFINS), `receitaTotalAnoAnteriorCents` no perfil, avisos nas obrigações e na prévia, 400 `PRESUMIDO_TETO_EXCEDIDO` na confirmação (também no job). Não mergeado; espera OK do dono e CI. P-PT-1..3 seguem com o contador · 22/10 (ratificação): forks F-PT-1..7 RATIFICADOS pelo dono, todos pela recomendação ([[D-2026-10-22-PRESUMIDO-TETO-78MI-FORKS]]): 1c, 2c, 3a, 4a, 5a, 6a, 7a. Sem fork pendente; o PR único espera o 'executa' (F-PT-3/4 sujeitos a P-PT-1/2) · 22/10: **BRIEF escrito no #844** — `BE-INCR-PRESUMIDO-TETO-78MI-brief.md`, 11 itens em 1 PR: teto em reais na tabela `TAX_ASSESSMENT`, receita total de Y−1 do razão (todas as unidades, sem encerramento) e declarada no perfil, aviso nas obrigações e na prévia, 400 na confirmação do Presumido. Forks **F-PT-1..7 PENDENTES**; P-PT-1..3 com o contador (receita bruta × total, mês parcial, ano de início). Dossiê `pesquisas-legais/presumido-teto-78mi`. Próximo: ratificar forks; código exige 'executa' · 17/10: registrado pela verificação legal (frente IRPJ/CSLL, item 19). O perfil tem `lucroRealObrigatorio`, mas o sistema não confere a receita do ano anterior contra o teto. Sem BRIEF"
depende_de: ["[[X7]]"]
autorizacao: "dono, chat, 2026-10-24: 'executa PRESUMIDO-TETO-78MI' — sessao-feature, escopo = só o BRIEF; PR sem merge (#887); antes: dono, chat, 2026-10-22: 'Precisamos agora de sessões para a falta de brief' — só o BRIEF (sessao-planejamento), só docs; sem 'executa', sem merge; antes: dono, chat, 2026-10-17: \"Atualiza tbm briefs e documenta em features novas\" — só a nota (registro de feature nova revelada pela verificação legal de 17/10); sem BRIEF, sem 'executa'"
ancora_sdd: "—"
atualizado: "2026-10-30"
prs: ["#844", "#859", "#887"]
---
# PRESUMIDO-TETO-78MI — Validar o teto de R$ 78 mi do Lucro Presumido (Lei 9.718 arts. 13–14)

**Estado:** `done` — 30/10 (triagem): P-PT-1 e P-PT-3 respondidas (IN 1.700 arts. 59 e 214; Lei 9.718 art. 13); P-PT-2 sem regra e de efeito nulo, fica o F-PT-4 (a); nada muda no código e nada vai ao contador · 26/10 (fold): **PR único #887 em `main`** (25/10, `1072f7a0`) — os 11 itens do BRIEF entregues; nó fechado. Pendência que não é código: P-PT-1..3 com o contador (receita bruta × total, mês parcial, ano de início) podem ajustar F-PT-3/4 por emenda · 24/10 (executa): **PR único #887** — sessao-feature dos 11 itens do BRIEF: teto em reais na `TAX_ASSESSMENT` (lpt-*), `sumRevenueNetByOwner` (receita total de Y−1 por dono, sem encerramento e sem dedução de PIS/COFINS), `receitaTotalAnoAnteriorCents` no perfil, avisos nas obrigações e na prévia, 400 `PRESUMIDO_TETO_EXCEDIDO` na confirmação (também no job). Não mergeado; espera OK do dono e CI. P-PT-1..3 seguem com o contador · 22/10 (ratificação): forks F-PT-1..7 RATIFICADOS pelo dono, todos pela recomendação ([[D-2026-10-22-PRESUMIDO-TETO-78MI-FORKS]]): 1c, 2c, 3a, 4a, 5a, 6a, 7a. Sem fork pendente; o PR único espera o 'executa' (F-PT-3/4 sujeitos a P-PT-1/2) · 22/10: **BRIEF escrito no #844** — `BE-INCR-PRESUMIDO-TETO-78MI-brief.md`, 11 itens em 1 PR: teto em reais na tabela `TAX_ASSESSMENT`, receita total de Y−1 do razão (todas as unidades, sem encerramento) e declarada no perfil, aviso nas obrigações e na prévia, 400 na confirmação do Presumido. Forks **F-PT-1..7 PENDENTES**; P-PT-1..3 com o contador (receita bruta × total, mês parcial, ano de início). Dossiê `pesquisas-legais/presumido-teto-78mi`. Próximo: ratificar forks; código exige 'executa' · 17/10: registrado pela verificação legal (frente IRPJ/CSLL, item 19). O perfil tem `lucroRealObrigatorio`, mas o sistema não confere a receita do ano anterior contra o teto. Sem BRIEF  

## Escopo

- Alerta/bloqueio quando a receita bruta do ano-calendário anterior passar de R$ 78 mi (ou R$ 6,5 mi × número de meses de atividade do ano anterior, quando inferior a 12) e o perfil estiver em Presumido (Lei 9.718 art. 13 caput e art. 14 I — verificado [D04] do dossiê IRPJ).

## Gatilho

- Pedido do dono. Baixa prioridade para o público-alvo (salão/clínica).

## Docs

- [`BE-INCR-PRESUMIDO-TETO-78MI-brief.md`](../../accounting/BE-INCR-PRESUMIDO-TETO-78MI-brief.md) — **BRIEF 22/10**: 11 itens em 1 PR; forks F-PT-1..7 ratificados em 22/10; executado no #887 (24/10); P-PT-1..3 com o contador
- Dossiê [`presumido-teto-78mi`](../../../pesquisas-legais/presumido-teto-78mi/relatorio.md) — Lei 9.718 arts. 13–14 (acervo), RIR arts. 257/587 (Planalto), IN 1.700 arts. 59/214 (site da RFB)
- Dossiê [`verif-2026-10-17-irpj-csll`](../../../pesquisas-legais/verif-2026-10-17-irpj-csll/relatorio.md) e consolidado [`VERIFICACAO-2026-10-17-CONSOLIDADO.md`](../../../pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md).

## Fold 30/10 — triagem das perguntas ao contador

- Decisão: [[D-2026-10-30-TRIAGEM-CONTADOR]]. Dossiê: [`relatorio.md`](../../../pesquisas-legais/triagem-contador-2026-10-30/relatorio.md).
- **P-PT-1:** receita total. A IN 1.700 usa a mesma medida na opção e na obrigação (arts. 59 I e § 1º, 214). O F-PT-3 (a) fica.
- **P-PT-2:** nem a lei nem a IN tratam do mês parcial. Fica o F-PT-4 (a), ratificado; para salão e clínica o efeito é nulo
  (R$ 6,5 mi por mês).
- **P-PT-3:** no ano de início não há teto: o art. 13 da Lei 9.718 mede o "ano-calendário anterior", e a IN 1.700 art. 214
  § 3º regula a opção de quem começa sem citar limite.
- Nenhuma emenda ao código do #887. Estado e autorização **não mudam**.
