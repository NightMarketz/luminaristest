---
id: "D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-MU-1..16 da emenda montador único (simulação de regime do EFICIENCIA-FISCAL) ratificados pelo dono, todos na recomendação (a)"
estado: "decided"
autorizacao: "dono, 2026-11-21, questionário da sessao-planejamento da emenda (5 rodadas de AskUserQuestion; F-MU-14..16 na última, abertos pela revisão do BRIEF), todas as respostas na opção recomendada — ratifica os forks; não é 'executa'"
atualizado: "2026-11-21"
---
# D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS

**Estado:** `decided`. **Nó:** [[EFICIENCIA-FISCAL]]. **Cédula da emenda:** [[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO]].
**BRIEF:** [`BE-INCR-EFICIENCIA-FISCAL-EMENDA-MONTADOR-UNICO-brief.md`](../../accounting/BE-INCR-EFICIENCIA-FISCAL-EMENDA-MONTADOR-UNICO-brief.md) §6.

O dono respondeu no questionário de 21/11, com o contexto de cada fork na própria pergunta. A sessão só registrou as respostas.

| Fork | Pergunta (resumo) | Resposta do dono | Efeito no BRIEF |
|---|---|---|---|
| F-MU-1 | Onde fica o código que lê a entrada | **"Classe por tributo"** | montadores em `services/montadores/`, injetados na rota e na simulação |
| F-MU-2 | Deduções/retenções/ajustes sem confirmação ou fora do regime | **"Premissa nomeada"** | `entradaInformada` do CONFIRMED é fato; o resto é premissa `0` nomeada; retenções do RETENCOES-FONTE quando ele entregar |
| F-MU-3 | Métrica do ranking | **"Pelo devido"** | ranking pelo devido; resposta mostra devido e a pagar |
| F-MU-4 | Forma do Real hipotético | **"Trimestral"** | premissa `REAL_TRIMESTRAL_PRESUMIDO`; quem está no Real usa o perfil |
| F-MU-5 | IBS/CBS regular para quem está no Simples (2027+) | **"Receita × alíquota"** | premissa declarada; créditos dos títulos lidos como fato |
| F-MU-6 | Parte A do Lalur para quem nunca escriturou | **"Zero como premissa"** | `PARTE_A_NAO_ESCRITURADA` por trimestre |
| F-MU-7 | Excesso > 20% no ano (LC 123 art. 3º § 9º) | **"Vedado, com a data"** | Simples `VEDADO` com `efeitosDesde`; parcial fica para a camada de decisão |
| F-MU-8 | Vedações sem dado no sistema | **"Declaração por inciso"** | PR-1b entra: `declaracaoVedacoes` e `declaracaoObrigacaoReal` no perfil do ano |
| F-MU-9 | Mais barato `NAO_CONFERIDO` | **"Melhor condicional"** | `melhor` só entre elegíveis; `melhorCondicional`; POST recusa 400 `REGIME_NAO_CONFERIDO` |
| F-MU-10 | `projecao2027` | **"Manter, com premissas"** | decisão 4 de 28/10 mantida; premissas por componente |
| F-MU-11 | Receita para os limites | **"Receita da PJ"** | soma de todas as unidades (Res. CGSN 140 art. 16 § 2º); RBT12 por unidade fica na lacuna `L-20261121-200757-976c` |
| F-MU-12 | Aferição | **"Teste e resposta"** | bloco `afericao` + alerta `AFERICAO_DIVERGENTE` |
| F-MU-13 | Ordem com #1321 e #1322 | **"Montador antes"** | o PR-2 desta emenda entra antes do item 37 da ponte e do PR-1 do ciclo fiscal |
| F-MU-14 | Caixa no Presumido/Real hipotético | **"Competência como premissa"** | premissa `CAIXA_SIMULADO_POR_COMPETENCIA` |
| F-MU-15 | Excesso de até 20% e a sugestão de trocar para o Simples | **"Recusa a sugestão"** | 400 `REGIME_VEDADO_NO_ANO_SEGUINTE` |
| F-MU-16 | Declarações vazias e o regime atual | **"Regime atual conferido"** | regime atual conferido nos incisos não deriváveis; os outros vão para `melhorCondicional`; economia condicional à parte |

**Não é `executa`.** O código de cada PR espera o `executa` do dono para este BRIEF.
