---
id: "CSLL-RESSEGURADORES"
tipo: "plataforma"
dominio: "fiscal"
titulo: "CSLL de 9% de resseguradora local (Lei 15.525/2026) — espera código ECF de IND_ALIQ_CSLL"
estado: "blocked"
estado_detalhe: "31/10 (vigilância): sem ADE Cofis novo (só o 2/2026, Leiaute 12); página do SPED idêntica à de 17/10; código dos 9% esperado no leiaute do AC 2027 (inferido) · 10/10: backlog. A Lei 15.525/2026 cria CSLL de 9% para resseguradora local, e o leiaute 12 da ECF não tem código IND_ALIQ_CSLL para ela. Espera o ADE Cofis com o leiaute novo (2026/2027); até lá, perfil de resseguradora não tem código e a apuração segue sem linha. Sem BRIEF"
depende_de: ["[[CSLL-LC224]]"]
autorizacao: "dono, chat, 2026-10-10: \"Cria o nó CSLL-RESSEGURADORES\" (decisão: \"Crie um nó no backlog (BRIEF-CSLL-RESSEGURADORES) aguardando a publicação do Ato Declaratório Executivo (ADE) da Receita Federal com o novo leiaute da ECF\") — só a nota; sem BRIEF, sem 'executa'"
ancora_sdd: "—"
atualizado: "2026-10-31"
prs: []
---
# CSLL-RESSEGURADORES — CSLL de resseguradora local (Lei 15.525/2026)

**Estado:** `blocked` — 31/10 (vigilância): sem ADE Cofis novo (só o 2/2026, Leiaute 12); página do SPED idêntica à de 17/10; código dos 9% esperado no leiaute do AC 2027 (inferido) · espera o ADE com o leiaute novo da ECF. Planejar exige pedido do dono; código exige `executa`.

## Escopo

- Linha de `CSLL_ALIQUOTA` com 9% para resseguradora local, com a chave = o código `IND_ALIQ_CSLL` que o leiaute novo
  criar. Não inventar chave interna que o SPED rejeite (dono, 10/10).
- O enum `indAliqCsll` ganha o código novo junto (molde do F-CA-3 b do [[CSLL-LC224]]).

## Gatilho de desbloqueio

- Publicação do ADE Cofis com o leiaute da ECF que traga código de alíquota para resseguradora.

## Docs

- Achado registrado no PR #599 (comentário de 10/10, pesquisa P-CA) e no BRIEF `docs/accounting/BE-INCR-CSLL-BANCOS-Q1-brief.md` §8.
- Pendente: ler a Lei 15.525/2026 na fonte oficial (só o achado de outra sessão foi registrado).

## Verificação legal 17/10/2026

- A Lei 15.525/2026 foi lida na fonte oficial: CSLL de 9% para resseguradora a partir de **01/01/2027** (dossiê [`verif-2026-10-17-irpj-csll`](../../../pesquisas-legais/verif-2026-10-17-irpj-csll/relatorio.md) [D06][D17]). Fecha o "Pendente" de Docs acima. O leiaute 13 da ECF **ainda não saiu** em 17/10 [D21] — o gatilho continua.

## Fold 31/10 — vigilância do leiaute da ECF (dossiê `pesquisas-legais/vigilancia-2026-10-31-ecf-csll-ressegur`)

- Dono, chat, 31/10: vigilância de lei e governo; "Mudança de estado no vault vai num PR só de docs".
- **Nada mudou desde 17/10.** A página de Manuais da ECF no SPED segue no Leiaute 12 e tem o **mesmo SHA-256**
  (`d63a09d5…`) da leitura de 17/10 [D01]. No SIJUT, o único ADE Cofis de 2026 sobre a ECF é o nº 2, de 29/01/2026 (Leiaute 12) [D04].
  Sem código `IND_ALIQ_CSLL` para os 9%.
- **Recalibração do gatilho (inferida):** a CSLL de 9% vale de 01/01/2027, e o Leiaute 13 (AC 2026, previsto para jan/2027)
  não precisa do código. Ele deve vir no leiaute do AC 2027 (início de 2028). Próxima leitura útil: fev/2027.
- Relatório: [`relatorio.md`](../../../pesquisas-legais/vigilancia-2026-10-31-ecf-csll-ressegur/relatorio.md). Estado e autorização **não mudam**.
