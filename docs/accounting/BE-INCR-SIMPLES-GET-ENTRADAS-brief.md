# BE-INCR-SIMPLES-GET-ENTRADAS — leitura do histórico pré-adoção e da segregação manual (BRIEF)

> **Sessão:** `sessao-planejamento` — produz decisão, não código.
> **Autorização:** dono, chat, 2026-10-12, questionário: GET *"(a) Um GET por competência (Recomendado)"* + escopo
> *"Só os BRIEFs (Recomendado)"*. **Sem "executa".**
> **Por quê:** pré-requisito do PR-C do [`FE-INCR-SIMPLES-brief.md`](FE-INCR-SIMPLES-brief.md) (P4-3 → b, 08/10).
> **Base:** `origin/main` `9f6477d8`.

## 0. Fatos consumados (lidos nesta sessão)

| Fato | Fonte |
|---|---|
| Escritas existentes: `PUT /api/accounting/simples/historico/:competencia` e `PUT …/segregacao/:competencia` | `server/src/routes/simples.ts:26-27`; `controllers/simplesController.ts:27` |
| Leituras no repositório já existem: `findHistorico(scope, competencias[], tx?)`, `findSegregacao(scope, competencia, tx?)` | `SimplesEntradasRepository.ts:17,33`; `ISimplesEntradasRepository.ts:29,31` |
| Serviço: `segregacaoDaCompetencia` já lê com `assertRead` (devolve parcelas + alerta) | `SimplesEntradasService.ts:72-74` |
| Views de resposta já existem: `SimplesHistoricoView`, `SimplesSegregacaoView` (parcelas com `excluir` derivado) | `dtos/SimplesDto.ts:125-140` |
| Policy: leitura = `canReadTaxAssessment`, escrita = `canManageTaxAssessment` | `SimplesEntradasService.ts:25` |
| openapi: rotas do Simples documentadas em `routes/docs.paths.ts` (~linha 6843) | idem |

## 1. Checklist (um PR)

1. **`GET /api/accounting/simples/historico/:competencia?unitId`** → `200 SimplesHistoricoView` ou **`404`** sem
   registro (F-GE-1). Params: `CompetenciaParamSchema` + `SimplesUnitQuerySchema` (já existem, `.strict()`).
2. **`GET /api/accounting/simples/segregacao/:competencia?unitId`** → `200 SimplesSegregacaoView` (com `excluir`
   derivado pelo mesmo `excluirDoMotivo` do PUT) ou **`404`** sem registro (F-GE-1).
3. Serviço: `obterHistorico`/`obterSegregacao` em `SimplesEntradasService` com `assertRead`; mapeamento para a view
   **reusa** `historicoView` e `comExcluir` (`SimplesEntradasService.ts:154,170`) — sem segunda cópia.
4. Registro soft-deleted não aparece (mesmo filtro do repositório).
5. Rota em 2 toques (`routes/simples.ts` + controller), deny-by-default; openapi em `docs.paths.ts` + artefato estático
   `public/openapi.json` regenerado; guarda de path-count atualizada (+2).
6. Testes de integração em `simplesEntradas.integration.test.ts`: PUT → GET devolve o mesmo; GET sem registro = 404;
   usuário sem `canReadTaxAssessment` = 403; outra unidade/escopo não vaza; competência inválida (`2026-13`) = 400.
7. FE: `SimplesDto.gen.ts` regenerado se o gerador incluir os params (sem tipo de resposta novo).

## 2. Contratos

```ts
// Sem schema novo: CompetenciaParamSchema, SimplesUnitQuerySchema (entrada); SimplesHistoricoView, SimplesSegregacaoView (saída).
interface ISimplesEntradasService {
  obterHistorico(scope: AccountingScope, competencia: string): Promise<SimplesHistoricoView>;     // NotFoundError se não há
  obterSegregacao(scope: AccountingScope, competencia: string): Promise<SimplesSegregacaoView>;   // NotFoundError se não há
}
```

## 3. Forks — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação |
|---|---|---|
| **F-GE-1** Sem registro | (a) `404` · (b) `200 null` | **(a)**: padrão REST da casa para recurso por chave; o FE trata 404 como "formulário em branco" |

## 4. Pendente de validação externa
Nenhuma — leitura de dado já gravado, sem regra fiscal.

## 5. Insumos ausentes
Nenhum.

## 6. Achados fora de escopo
- Histórico por intervalo (`?de&ate`) para mostrar meses faltantes do RBT12 — opção (b), não escolhida pelo dono em 12/10.
