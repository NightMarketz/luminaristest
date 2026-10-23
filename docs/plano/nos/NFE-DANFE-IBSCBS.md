---
id: "NFE-DANFE-IBSCBS"
tipo: "plataforma"
dominio: "fiscal"
titulo: "DANFE/DANFE-NFC-e com IBS/CBS (NT 2026.010, produção 01/12/2026)"
estado: "planned"
estado_detalhe: "22/10 (ratificação): forks F-DANFE-1..8 RATIFICADOS pelo dono ([[D-2026-10-22-NFE-DANFE-IBSCBS-FORKS]]): 1a, 2a, 3b, 4b (biblioteca nova, contra a recomendação), 5a, 6a, 7a (condicionado ao X10a PR-7 depois de 01/12), 8b. Sem fork pendente; PR-0..PR-3 esperam só o 'executa' de cada um (alvo até 30/11) · 22/10: BRIEF BE-INCR-NFE-DANFE-IBSCBS escrito (sessao-planejamento): NT 2026.010 é só do DANFE 55; não há DANFE no código; PR-0..PR-3 rodam sem o X10a, alvo até 30/11; F-DANFE-1..8 PENDENTES; sem executa · 17/10: registrado pela verificação legal (frente NF-e). NT 2026.010 muda o DANFE para exibir IBS/CBS; produção em 01/12/2026"
depende_de: ["[[X10a]]?"]
autorizacao: "dono, chat, 2026-10-17: \"Atualiza tbm briefs e documenta em features novas\" — só a nota (registro de feature nova revelada pela verificação legal de 17/10); sem BRIEF, sem 'executa' · dono, chat, 2026-10-22: \"Precisamos agora de sessões para a falta de brief\" — só o BRIEF (sessao-planejamento); sem código, sem 'executa', sem merge"
ancora_sdd: "—"
atualizado: "2026-10-22"
prs: []
---
# NFE-DANFE-IBSCBS — DANFE/DANFE-NFC-e com IBS/CBS (NT 2026.010, produção 01/12/2026)

**Estado:** `planned` — feature nova registrada pela verificação legal de 17/10/2026. Planejar exige pedido do dono; código exige `executa`.

## Escopo

- Renderização do DANFE (NF-e) e do DANFE-NFC-e com os totais e grupos IBS/CBS exigidos pela NT 2026.010.
- Conferir no mesmo nó as NTs 2026.009, 2026.006 (split payment — ver [[M5-ibs-cbs]]), 2026.003 e 2014.001 v1.41 (EPEC), que o inventário de NTs do projeto não listava em 17/10.

## Gatilho

- Data legal: produção da NT 2026.010 em 01/12/2026 (verificado no Portal NF-e, dossiê NF-e [P*]).

## Docs

- Dossiê [`verif-2026-10-17-nfe-nfce-dfe`](../../../pesquisas-legais/verif-2026-10-17-nfe-nfce-dfe/relatorio.md) e consolidado [`VERIFICACAO-2026-10-17-CONSOLIDADO.md`](../../../pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md).
- BRIEF [`BE-INCR-NFE-DANFE-IBSCBS-brief.md`](../../accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md) (22/10) e dossiê [`nfe-danfe-ibscbs-nt2026010`](../../../pesquisas-legais/nfe-danfe-ibscbs-nt2026010/relatorio.md) (NT 2026.010 v1.00, sha igual ao de 17/10).

## Fold 22/10 — BRIEF

- BRIEF escrito pela `sessao-planejamento` (autorização do dono em chat, 22/10: *"Precisamos agora de sessões para a falta de brief"*; só o BRIEF, sem `executa`). O `estado` continua `planned`.
- A NT 2026.010 trata **só do DANFE da NF-e 55** (modelos "Modelo55"). O DANFE NFC-e segue no BRIEF de FE pelo F-NFCE-E1-6 (b). O título do nó é mais largo que o escopo; o F-DANFE-2 pede a decisão.
- Não há DANFE no código. O nó vira um DANFE 55 inteiro no leiaute novo (HTML puro + `lib/pdf`). PR-0..PR-3 rodam sobre fixture, sem o emissor do X10a, com alvo até 30/11/2026.
- 21 itens, 8 forks (F-DANFE-1..8) **PENDENTES**, 5 pendências externas e o leiaute base do MOC como insumo ausente (item 2 do PR-0).
