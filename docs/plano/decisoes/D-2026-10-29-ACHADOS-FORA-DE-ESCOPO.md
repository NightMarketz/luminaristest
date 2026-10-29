---
id: "D-2026-10-29-ACHADOS-FORA-DE-ESCOPO"
tipo: "decisao"
dominio: "plataforma"
titulo: "Triagem dos 11 achados fora de escopo dos PRs #961, #963, #964, #965 e #933: 2 já fechados na main, 3 consertados aqui, 4 decididos pelo dono"
estado: "done"
autorizacao: "dono, chat, 2026-10-29, questionário: \"Sim, os três (Recomendado)\" (achados 3, 6, 10); \"Ir p/ o card mais próximo\" (5); \"Tirar do runbook\" (8); \"Registrar como lacuna\" (9)"
atualizado: "2026-10-29"
---
# D-2026-10-29-ACHADOS-FORA-DE-ESCOPO

**Origem:** a lista que o dono colou no chat em 29/10, com 11 achados fora de escopo juntados das seções "Achados
fora de escopo" dos PRs #961, #963, #964, #965 e #933. Cada achado foi medido contra a main `f4ebea4b`.

| # | Achado | Na main `f4ebea4b` | Destino |
|---|---|---|---|
| 1 | `openapi.json` desatualizado | **fechado** pelo #966 (tax-optimization, fiscal-check, danfe e InterviewModules presentes; generate-chart-data ausente) | nada |
| 2 | `UPDATE_DTO_SNAPSHOT=1` reordena 81 arquivos no Windows | continua; classe conhecida | nada novo (memória `dto-snapshot-update-reordena-no-windows`) |
| 3 | `templateDb` sem `legal_parameters_simples_v6.sql` | **confirmado**: 26 arquivos `legal_parameters*.sql` no disco, 25 na lista | consertado no PR desta nota (guarda de cobertura + inclusão do v6) |
| 4 | rota do fator r no router de `/accounting` | #965 mergeado com a rota em `routes/accounting.ts:448-449` (comentário explica o repasse) | aberto: funciona, mas o lugar explícito é `routes/simples.ts`; refactor sem mudança de comportamento, sem pedido |
| 5 | Kanban: vão entre cards da mesma coluna não faz nada | código só no #961 | **dono: ir para o card mais próximo** (mesma coluna); entre colunas segue o passo 6. O #961 foi mergeado antes; executa em PR novo |
| 6 | ordenação oferece `order` (e `date`) | **confirmado**: `SortSelect` deduz os campos de `record.data` e não exclui `order` | consertado no PR desta nota (`order` em `EXCLUDED_FIELDS`); `date` não entrou |
| 7 | DUE DATE um dia antes | classe date-only × UTC | nada novo (varredura FE date-only) |
| 8 | sem "Archive" em QUICK ACTIONS | confirmado: só "Excluir" | **dono: tirar do runbook**. Archive não é requisito. Executa em PR novo (`RUNBOOK-KANBAN-REORDER.md`) |
| 9 | interdependência por cisão (LC 123, art. 3º, § 4º, IX) sem dado no cadastro | código só no #964 | **dono: registrar como lacuna**. Ver abaixo |
| 10 | job de export órfão em `PROCESSING` | `DataExchangeExportService` **fechado** (Lacuna 10); `ReinfService.gerar` **aberto** | consertado no PR desta nota (compensação FAILED nos 2 jobs) |
| 11 | pacote anual com 1 mês de Reinf (`DUPLICATE_KIND`) | **fechado**: emenda C6b (item 2 da cédula `D-2026-10-28-LACUNAS-EXECUTA-27-28`); unicidade = kind + período | nada |

## Lacuna registrada: interdependência por cisão (achado 9)

O alerta de interdependência do EFICIENCIA-FISCAL PR-4 (#964) não cobre o inciso IX do § 4º do art. 3º da LC 123/2006:
empresa "resultante ou remanescente de cisão ou qualquer outra forma de desmembramento" ocorrido em um dos 5
anos-calendário anteriores (texto lido na cópia do acervo `pesquisas-legais/ef-pr4-sublimite/docs/D01`, branch do
#964). Esse inciso precisa de um dado (cisão ou desmembramento, se a empresa é resultante ou remanescente, e a data)
que o cadastro da empresa não tem. Decisão do dono:
o ramo fica fora do alerta até o campo existir. Criar o campo (migração, DTO e tela) é incremento com BRIEF próprio e
ainda não foi pedido.

## Fora de escopo deste PR

- O `ReinfService` marca os jobs FAILED, mas não apaga os 2 arquivos já gravados, ao contrário do
  `DataExchangeExportService`, que apaga. Para apagar seria preciso um `deleteFile` na porta `ReinfArtefatos` e
  na factory. O arquivo fica órfão no disco, e nenhum job aponta para ele.
- `date` na ordenação (achado 6) não foi tratado: é campo visível do TasksModule, e ordenar por ele não está errado.
