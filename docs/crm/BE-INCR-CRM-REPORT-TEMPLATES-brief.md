# BE-INCR-CRM-REPORT-TEMPLATES — BRIEF (sessão de planejamento)

> **Estado:** BRIEF — **sem fork pendente**. O "executa" já veio na mesma autorização (abaixo), junto com o PR-C da tela.
> Nó do vault: pré-requisito F-FRB4=(a) do [`FE-INCR-CRM-REPORT-BUILDER`](../plano/nos/FE-INCR-CRM-REPORT-BUILDER.md).
> **Risco principal (2 linhas):** a rota `GET /api/crm/reports/templates` precisa vir **antes** de `GET /reports/:id` no
> router. Se vier depois, `templates` cai no `:id` e responde 400 "Invalid report ID", e o teste de integração tem que pegar isso.

## 0. Formulário

- **Item a planejar:** pré-requisito de BE do F-FRB4=(a) (`docs/crm/FE-INCR-CRM-REPORT-BUILDER-brief.md` §4, linha
  F-FRB4; §2 "PR-C … depois do pré-requisito de BE"); §6 "Insumos ausentes" (paridade dos pares valor→moeda).
- **Autorização:** dono, chat, 2026-10-15, questionário, em resposta a *"Pode seguir implementando os planos de CRM"*
  — escopo **"BE + PR-C (Recomendado)"**: BRIEF curto da rota, implementar a rota (PR 1) e o PR-C da tela (PR 2,
  empilhado). Pares de moeda: **"Sim, na mesma rota (Recomendado)"** (fecha o insumo ausente do §6 do BRIEF do FE).
  Registro: [D-2026-10-15-CRM-RB-TEMPLATES-ROTA](../plano/decisoes/D-2026-10-15-CRM-RB-TEMPLATES-ROTA.md).
- **Insumos (fato consumado):**
  - `server/src/features/crm/models/crmReportTemplates.ts` → `CRM_REPORT_TEMPLATES`: 5 specs, com paridade de valores
    testada em `services/__tests__/crmReportTemplates.test.ts` (PR #651, [D-2026-10-13-CRM-RB-PR2-LACUNAS]).
  - `server/src/features/crm/dtos/CrmReportDto.ts` → `CRM_MONEY_CURRENCY_PAIRS`, `CreateCrmReportSchema`.
  - `server/src/controllers/crmReportsController.ts`, `server/src/routes/crm.ts`, `server/src/routes/docs.paths.ts`.
  - FE: `my-app/features/crm/lib/reportBuilder.ts:47` (`CRM_MONEY_CURRENCY_PAIRS_FE`, espelho manual) e
    `features/crm/hooks/useReportSources.ts` (a tela já sabe quais fontes estão instaladas).
- **Nós vizinhos:** consome [[CRM-RB]] (done). É consumido pelo PR-C do [[FE-INCR-CRM-REPORT-BUILDER]] (item 19) e
  pela troca do espelho manual dos pares.

## 1. Comportamentos (checklist)

1. **DTO de saída** `CrmReportTemplatesOutputSchema` em `CrmReportDto.ts`, `.strict()`:
   `{ templates: CrmReportTemplate[], moneyCurrencyPairs: Record<source, Record<valueField, currencyField>> }`.
   Cada template = `CreateCrmReportSchema` + `key` (enum dos 5). Entra no `dtoShapeSnapshot`, que gera o tipo do FE
   (`CrmReportDto.gen.ts`). Teste: as duas constantes passam no schema (paridade constante×contrato).
2. **Serviço** `CrmReportService.templates(): CrmReportTemplatesOutput` devolve as duas constantes e não lê banco. Os
   modelos são globais, iguais para todos (F-RB7), e a instalação da fonte é decidida no FE (item 4). Teste unitário: devolve os 5
   modelos e os 3 pares.
3. **Controller + rota** `GET /api/crm/reports/templates`: exige usuário (401 sem token), responde `200 { success,
   data }`. A rota fica registrada **antes** de `/reports/:id`. Teste de integração: 200 com 5 modelos, 401 sem
   auth, e `GET /reports/templates` não cai no `:id`.
4. **Disponibilidade** (FE item 19, "fonte não instalada → modelo desabilitado") **não** é do BE: a tela cruza o
   `spec.source` do modelo (e o `rightSource` dos joins, se houver) com `useReportSources`. Isso é direto e sem fork,
   porque a fonte da verdade da instalação já está no FE desde o PR-A.
5. **OpenAPI:** bloco `/api/crm/reports/templates` em `docs.paths.ts`, `public/openapi.json` regenerado e baseline do
   `openapi-paths.test.ts` +1, com comentário.

## 2. Contratos

```ts
export const CrmReportTemplateSchema = CreateCrmReportSchema.extend({
  key: z.enum(['funnel', 'source', 'status', 'proposals', 'activities']),
}).strict();
export const CrmReportTemplatesOutputSchema = z.object({
  templates: z.array(CrmReportTemplateSchema),
  moneyCurrencyPairs: z.record(z.enum(CRM_REPORT_SOURCES), z.record(z.string(), z.string())),
}).strict();
// GET /api/crm/reports/templates → 200 { success: true, data: CrmReportTemplatesOutput }
```

## 3. Forks

Nenhum. O par de moeda na mesma rota foi decidido pelo dono (questionário de 15/10). A disponibilidade por fonte
fica no FE (item 4) porque a instalação já é lida lá. Se o dono preferir que o BE marque `available`, isso é emenda.

## 4. Pendente de validação externa

Nenhuma regra contábil, fiscal ou legal.

## 5. Insumos ausentes

Nenhum.

## 6. Achados fora de escopo

- O agregador ignora `JoinRef.rightField` (achado do PR-2 do BE), que segue registrado no nó CRM-RB.
