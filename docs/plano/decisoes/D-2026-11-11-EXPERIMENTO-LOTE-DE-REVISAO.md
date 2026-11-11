---
id: "D-2026-11-11-EXPERIMENTO-LOTE-DE-REVISAO"
tipo: "decisao"
dominio: "processo"
titulo: "Medir o acerto do revisor por tamanho de lote antes de afrouxar a revisão por PR"
estado: "decided"
autorizacao: "dono, chat, 2026-11-11: \"pode medir antes de afrouxar, com certeza. E para decidir o tamanho do lote, pelo resultado que a gente tiver\""
atualizado: "2026-11-11"
---
# D-2026-11-11-EXPERIMENTO-LOTE-DE-REVISAO

**Estado:** `decided` para **medir**. O tamanho do lote fica em aberto até o resultado (critério abaixo, fixado antes de rodar).
Enquanto não houver resultado, vale a regra atual: revisor por PR nos vermelhos de código.

**Por quê:** o dono quer revisões maiores para PRs pequenos (mediana de 4 arquivos e ~116 linhas nos últimos 150 mergeados;
a faixa 1 tem mediana de ~75 linhas). A literatura achada é velha demais para os modelos atuais (pesquisa de 11/11: nada
quantitativo nos últimos 3 meses). A medida tem de ser nossa.

**Exceção à regra da bancada** (CLAUDE.md, ⛔ 2026-08-09): vale só para este experimento, que roda uma vez e não deixa gate,
rodada ou revisor permanente. Nada é criado em `docs/audit/**`.

## Desenho

- **Corpus:** 20 squash commits da faixa 1 (todos já passaram por revisor PASS por PR e estão na `main`), repostos em ordem
  numa branch descartável `exp/lote-base` cortada do pai do primeiro. Sem push para a `main`.
- **Defeitos plantados (verdade conhecida, cega para o revisor):** 8 dos 20 recebem um commit extra que quebra o código de
  produção do PR (guarda removida, comparação invertida, CAS trocado por escrita direta). 4 são pegos pelo teste-guarda do
  próprio PR (detectáveis rodando) e 4 passam com os testes verdes (só a leitura pega). Os outros 12 ficam limpos.
  A lista dos plantados fica com a orquestração e só sai depois de todos os braços.
- **Braços (mesmo agente `revisor-independente`, mesmo formulário, mesmas instruções):**
  A = 20 revisões de 1 PR · B = 5 revisões de 4 PRs da mesma área · C = 2 revisões de 10 PRs · D = 1 revisão de 20 PRs.
  Cada revisão devolve um veredito por PR (PASS/FAIL + arquivo:linha).
- **Execução:** até 3 subagentes simultâneos e 2 vagas pesadas (`scripts/heavy-slot.cjs`); testes só com escopo.

## Medidas

Por braço: **recall** (plantados achados / 8, separado em detectáveis por teste e só por leitura), **falsos positivos**
(PR limpo com FAIL), **tokens e tempo por PR**.

## Critério de decisão (fixado antes)

Lote de tamanho N é aceito se `recall_N >= recall_A - 10 pontos` **e** falsos positivos `<= 2 x` os de A. Vale o **maior** N
aceito. Se nenhum lote passar, fica 1 por PR. Com 8 defeitos a amostra é pequena: diferença menor que 2 defeitos entre
braços é ruído e conta como empate; nesse caso fica o menor lote entre os empatados.

## Resultado

(vazio — preencher depois de rodar; não aplicar a regra nova antes disso)
