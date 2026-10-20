# integration — efeitos de integração acima do motor DynamicTable

Variante de *capability feature* (`FEATURE_TEMPLATE.md` §9): sem entidade, sem repositório, sem policy.
Mora aqui o que o motor **não pode** chamar (Contrato §2.1: "o motor nunca chama o consumidor").

## `DynamicTableWriteEffects` (BE-INCR-DT-NO-CONSUMER-CALLS)

| Método | Quando chamar | Efeito |
|---|---|---|
| `afterDataWrite(ownerUserId)` | depois do commit de qualquer escrita de **linha** (create/update/delete/lote/restore) | invalida o cache de KPI do dono |
| `afterStructureWrite(ownerUserId)` | depois de **tabela/schema** mudar (instalar tabela por preset, sincronizar schema, instalar módulo) | invalida o KPI e reconstrói o KnowledgeGraph; falha do grafo é logada e **propagada** (F4) |

- Quem chama: controllers (`dynamicTablesController`, `analyticsDefinitionsController`, `dynamicTableVersionsController`,
  `dashboardController`) e serviços de integração (`CrmPipelineService`, `SalesCancellationService`,
  `RegisterPaymentService`, `DynamicTablePhysicalStockSync`, `LuminarisAgentService`, `SystemProvisioningService`).
- Escrita dentro de `runInTransaction`: o efeito vai **depois** que a tx retorna (F2 → i), nunca dentro do callback.
- Os serviços dependem da interface `IDynamicTableWriteEffects` (arquivo sem import), injetada em `lib/factory.ts`.

Guardas: regra `B7-dynamictable-no-consumer-services` do `check:arch` (o motor não importa chat/analytics/integration)
e `__tests__/dynamicTableWritersCallEffects.test.ts` (todo arquivo que escreve pelo motor chama o efeito, ou está isento
com motivo).
