---
id: "D-2026-11-25-MODULE-BOUNDARIES-PR3-INTERVIEW-CRM-FX-BINDING-RESPOSTAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Respostas do dono no renome de interview, crm, fx e accountingBinding (fase PR-3.x do BRIEF MODULE-BOUNDARIES, #1422) — questionários de 25/11"
estado: "decided"
autorizacao: "dono, 2026-11-24, chat: \"Executa o BRIEF inteiro\" (fork novo para o nó e vira pergunta); 2026-11-25, chat da sessão de feature: \"Pode seguir aqui\". Dois questionários (AskUserQuestion) da mesma sessão em 25/11, respostas literais: 14 arestas M1 que o movimento de interview, crm/constants.ts e fx/clients trocaria de chave → \"Pagar as 14 (Recommended)\"; onde a lista de moedas (CURRENCIES, DEFAULT_CURRENCY) passa a morar, já que fx/models/ptax.ts é um model → \"crm/models/ (Recommended)\"; 7 arestas M1 de accountingBinding para accounting e a lista permitida do teste-guarda importBoundary.test.ts → \"Portas e lista ajustada (Recommended)\"; accountingBinding/runtime/mapperReload.ts reprovaria a rota na L1 se fosse para services/ → \"Factory dona da recarga (Recommended)\""
atualizado: "2026-11-25"
---
# D-2026-11-25-MODULE-BOUNDARIES-PR3-INTERVIEW-CRM-FX-BINDING-RESPOSTAS — renome de `interview`, `crm`, `fx` e `accountingBinding`

**Estado:** `decided`
**Autorização:** dono, 2026-11-25, chat ("Pode seguir aqui") e dois questionários (respostas literais no cabeçalho).
Escopo: os quatro pontos abaixo, na fase do renome (#1422). Não cobre a feature `accounting`, que é a última do renome
e fica fora desta fase (BRIEF §3.3 item 4).

Base: [`MODULE-BOUNDARIES-brief.md`](../../architecture/MODULE-BOUNDARIES-brief.md) §5.3 e §13.4,
[`ADR-MODULE-BOUNDARIES.md`](../../adr/ADR-MODULE-BOUNDARIES.md) §11.9 e
[`ADR-ARCH-BOUNDARIES.md`](../../adr/ADR-ARCH-BOUNDARIES.md) §8.5. Nó: [[MODULE-BOUNDARIES]]. Respostas da mesma fase:
[[D-2026-11-25-MODULE-BOUNDARIES-PR3-ANALYTICS-SECTORKITS-RESPOSTAS]].

## Respostas

| # | Ponto | Resposta literal | Efeito | Opção recusada |
|---|---|---|---|---|
| 1 | Mover `interview` (3 pastas), `crm/constants.ts` e `fx/clients` troca a chave de 14 entradas `M1` do baseline | "Pagar as 14 (Recommended)" | Portas em `public/`: `dynamicTables/public/presetService.ts` e `dynamicTableDto.types.ts`, `accounting/public/dates.ts`, `crm/public/currencies.types.ts`. Baseline 354 → 340 | Regravar as 14 com o caminho novo |
| 2 | `fx/models/ptax.ts` (um model) lê `CURRENCIES` de `crm/constants.ts`; model só importa `public/*.types.ts`, que só lê `models/` e `dtos/` da dona | "crm/models/ (Recommended)" | `crm/models/currencies.ts` (`CURRENCIES`, `DEFAULT_CURRENCY`), exposta por `crm/public/currencies.types.ts`. A `fx` segue lendo a lista do `crm` | A moeda virar da `fx` (inverte a dependência); regravar a entrada |
| 3 | 7 entradas `M1` de `accountingBinding` para `accounting` trocam de chave; pagar pede portas em `accounting/public/` e trocar os caminhos da lista permitida do teste-guarda `accountingBinding/__tests__/importBoundary.test.ts` | "Portas e lista ajustada (Recommended)" | Portas `postingDto.types.ts`, `money.types.ts`, `accountingEventMapper.ts`, `revenueSplit.ts` (a do plano de contas já existia); a lista do teste-guarda cita as portas com os mesmos nomes; `computeCompiledFromHash` vira função pura em `domain/`. Baseline 340 → 332 (8 pagas: as 7 e a do `AccountingBindingFeederService`, pela mesma porta) | Mover e regravar as 7; deixar o binding de fora |
| 4 | `accountingBinding/runtime/mapperReload.ts` iria para `services/` pela tabela do BRIEF, e a rota que o importa reprovaria na `L1` | "Factory dona da recarga (Recommended)" | `lib/factory.ts` ganha `reloadAccountingMappersSerialized()`; a rota, o `dashboardController` e o `installSectorKitCli` pedem ao `getFactory()`; `serializeReload` (função pura) vai para `accountingBinding/domain/` | Mover o arquivo para `controllers/`; isentar `runtime/` na `M2` |

## Decidido pela classe de um precedente, sem pergunta nova

`interview/FieldCustomizationService/Types.ts` foi para `interview/models/FieldCustomizationTypes.ts`: é arquivo de
contrato que `models/InterviewTypes.ts` importa, e dentro de `services/` a aresta reprovava na `L6`. Mesma classe da
resposta 4 de [[D-2026-11-24-MODULE-BOUNDARIES-EXECUCAO-RESPOSTAS]] ("Mover BindingScope já": arquivo de tipo vai para
`models/` quando uma regra em 0 mede 1). O dono pode reverter no lote.

## Consequências

- **Baseline do server: 354 → 332, só remoção.** `M2_FEATURES` tem sete features; falta a `accounting`.
- **A dona da lista de moedas continua sendo o `crm`.** A dúvida de fundo (moeda é do CRM ou do câmbio) está na caixa.
- **`accounting/public/` tem seis portas** antes do PR-3.x da `accounting`.
- **A recarga dos mappers é da factory.** Ponto de entrada novo que precise recarregar pede ao `getFactory()`.

## O que esta decisão não faz

- Não move pasta da `accounting` nem a acrescenta à `M2`.
- Não paga as arestas de `interview/models/` e `interview/dtos/` para `dynamicTables` (não trocaram de chave).
- Não tira o `presetService` de instância de módulo.
