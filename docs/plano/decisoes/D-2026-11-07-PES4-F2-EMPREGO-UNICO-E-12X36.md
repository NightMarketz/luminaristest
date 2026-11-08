---
id: "D-2026-11-07-PES4-F2-EMPREGO-UNICO-E-12X36"
tipo: "decisao"
dominio: "dp"
titulo: "DP F2: vários empregos fora do escopo (item 78; item 77 inalterado) e jornada 12×36 legada sem escala até o usuário informar"
estado: "decided"
autorizacao: "dono, chat, 2026-11-07 (sessão 'Empilhar e mergear', resposta aos riscos do revisor do #1132): \"não faz sentido cadastrar empregados com varios empregos, estamos fazendo sistemas pra uma empresa só\" · \"pode travar e calcular de acordo com escala informada pelo usuário\" · depois de a sessão recomendar a migração que zera a escala: \"mandar para as sessões as decisões e implementar\" · execução coberta pelo EXECUTA F2 do nó (dono, chat, 2026-11-06)"
atualizado: "2026-11-07"
---
# D-2026-11-07-PES4-F2-EMPREGO-UNICO-E-12X36

**Estado:** `decided`. Nó: [[PES-4]]. BRIEF: [BE-INCR-DP-F2](../../accounting/BE-INCR-DP-F2-brief.md) itens 68 e 78.
Origem: os dois riscos que o revisor independente deixou na pilha do F2 (#1125/#1127–#1129, mergeada pelo #1132).

| # | Risco do revisor | Resposta literal do dono | Efeito |
|---|---|---|---|
| 1 | O item 78 fala em vários empregadores (IN RFB 2.110), mas o item 77 aceita uma só outra remuneração viva por (vínculo, competência) | "não faz sentido cadastrar empregados com varios empregos, estamos fazendo sistemas pra uma empresa só" | Segurado com vários outros empregadores e o cálculo multi-fonte da IN 2.110 saem do escopo; o item 78 diz isso. O item 77 e o cadastro de outra remuneração **ficam como estão** (a decisão não tira o cadastro; leitura confirmada pela sessão que repassou: "Se você quis dizer que o cadastro de 'outra remuneração' inteiro sai, me diga", sem objeção) |
| 2 | A migração `20261107130000_dp_jornada_escala` deu segunda a sábado às jornadas 12×36 (`tipoJornada = '2'`); o motor as calcularia como 6×1 | "pode travar e calcular de acordo com escala informada pelo usuário" + "mandar para as sessões as decisões e implementar" (opção recomendada: migração que zera a escala) | Migração nova `20261107160000_dp_jornada_12x36_sem_escala`: `diasTrabalho = ''` e `minutosPorDia = NULL` onde `tipoJornada = '2'`; `escalaDaJornada` devolve null e o cálculo dá `JORNADA_AUSENTE` (item 61 c). A migração mergeada não foi editada. Informar escala por dias fixos numa 12×36 segue 400 `DP_ESCALA_IRREGULAR` (12×36 é do F6, `DP-PONTO`) |

Fora desta cédula: a emissão da pendência `JORNADA_AUSENTE` é do motor (PR-4, ainda não implementado); o teste
deste PR prova a entrada que o motor lê (`escalaDaJornada` → null), não a pendência.
