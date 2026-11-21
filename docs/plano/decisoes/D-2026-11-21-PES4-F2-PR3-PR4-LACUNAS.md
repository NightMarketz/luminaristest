---
id: "D-2026-11-21-PES4-F2-PR3-PR4-LACUNAS"
tipo: "decisao"
dominio: "dp"
titulo: "DP F2 (PR-3/PR-4): falta com data, rubrica HORAS_NORMAIS do horista, unidades de salário sem regra travam (7 calcula) e regras lidas no último dia da competência"
estado: "decided"
autorizacao: "dono, chat, 2026-11-21, questionário da sessão de execução do F2 (sessao-feature), as quatro respostas pela recomendação: \"Data na falta (Recommended)\" · \"Rubrica HORAS_NORMAIS (Recommended)\" · \"Trava 2/3/4/6; 7 calcula (Recommended)\" · \"Último dia do mês (Recommended)\" · execução coberta pelo executa do F2 (dono, chat, 2026-11-21: \"Executa tudo pra liberar e poder rodar em xhigh até terminar\")"
atualizado: "2026-11-21"
---
# D-2026-11-21-PES4-F2-PR3-PR4-LACUNAS

**Estado:** `decided`. Nó: [[PES-4]]. BRIEF: [BE-INCR-DP-F2](../../accounting/BE-INCR-DP-F2-brief.md) itens 27, 31,
36, 37, 44 e 47.

Origem: quatro lacunas de spec que a sessão de execução do PR-3 achou antes de escrever o snapshot. Em cada uma, duas
leituras defensáveis mudam o valor do holerite, por isso foram ao dono e a sessão não escolheu.

| # | Lacuna | Decisão | Onde entra |
|---|---|---|---|
| L1 | O lançamento `MANUAL` de `FALTAS` não tem data, mas o DSR perdido (Lei 605 art. 6º, item 36) precisa da semana da falta (`diasRepousoPerdidos` já pede as datas, PR-2) | **"Data na falta"**: o lançamento `FALTAS` passa a exigir a data (um por dia de falta), dentro da competência; o motor desconta a falta e o DSR da semana dela | PR-4: coluna `data` aditiva no `DpLancamento`, DTO e validação; o snapshot leva a data |
| L2 | Os itens 31 e 37 dizem que as horas normais do horista vêm "do lançamento ou da porta, não do calendário", mas nenhuma rubrica `INFORMADO` as carrega | **"Rubrica HORAS_NORMAIS"**: rubrica `INFORMADO` nova, em minutos, lançada pelo operador ou vinda do ponto (rubrica de jornada); natureza e incidência propostas no PR com a linha do dossiê, conferência do contador junto com as outras (passa de 19 para 20). Horista sem o lançamento ⇒ pendência e o vínculo não calcula | PR-4: catálogo, `published.json`, `LANCAMENTO_UNIDADE`, `RUBRICAS_DE_JORNADA` |
| L3 | O item 31 cobre só a unidade de salário 5 (mês) e 1 (hora); as unidades 2, 3, 4, 6 e 7 do `undSalFixo` do S-2200 não têm regra nem pendência na lista fechada | **"Trava 2/3/4/6; 7 calcula"**: 2 (dia), 3 (semana), 4 (quinzena) e 6 (tarefa) viram a pendência bloqueante nova `UNIDADE_SALARIO_SEM_REGRA_NO_F2`, como o afastamento sem regra (F-DPF-5); 7 (salário só variável) calcula com fixo zero, comissão e complemento até o mínimo (item 38) | PR-4: `DP_PENDENCIA_CODIGOS` ganha o código; o fatiamento do PR-3 deixa `diasRemunerados` nulo fora do mensalista |
| L4 | O BRIEF diz "na competência" para `regrasFolha` e `parametrosFolha` (itens 27 e 67) sem dizer o dia; em 12/2026 a EC 141 vira no dia 16 | **"Último dia do mês"**: as regras e tabelas da competência são as vigentes no último dia dela; bate com o golden de 2026-12 do item 47. A pergunta (6) do §5 ao contador (fatiar 1–15 e 16–31) segue aberta; se ele mandar fatiar, a mudança é no motor | PR-3: `DpSnapshotService.montar` lê a fotografia em `ultimoDia(competencia)` e em `dataPagamento` |

**Leituras do PR-3 (não são fork: o texto de outro item obriga o campo; registradas no corpo do PR e na caixa):** o
§3.2 é esboço e o snapshot ganha `unitId` no vínculo e os feriados por unidade ("por unidade", §3.2); `discriminador` no
`cct` (o piso da CCT é por `cargoId`, G7 e item 12); `ordem` e `categoriaOutraFonte` em `outrasRemuneracoes` (item 78);
o `id` dos lançamentos, afastamentos e parâmetros da CCT (item 28 ordena por id); parâmetro ou regra ausente fica no
snapshot como ausência nomeada (tabela, chave, data), para o motor puro emitir `PARAMETRO_LEGAL_AUSENTE` por vínculo
(item 61 b) em vez de abortar a montagem.
