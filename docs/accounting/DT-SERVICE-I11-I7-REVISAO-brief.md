# BRIEF — as duas mudanças no `DynamicTableService.ts` (I11 #731 e I7 #730): registro e proposta antes do merge

> **Sessão:** `sessao-planejamento`. Só documento: nenhum código, nenhuma branch nova.
> **Autorização:** dono, chat, 2026-10-16: *"Documenta essas duas mexidas e faz uma proposta em Brief antes"*,
> dada logo depois de a lista de merge do lote (`docs/plano/ORDEM-MERGE-2026-10-16.md`) apontar o motor como ponto de
> revisão. O escopo é este: registrar o que os dois PRs mudam no motor e propor o que fazer **antes** de
> mergear #731 e #730. **Não** autoriza merge nem código.
> **Graus:** V = verificado lendo o diff/arquivo nesta sessão; I = inferido.

## 1. Por que isso pede olhar

O CLAUDE.md raiz manda **PARAR** se alguém *"modificar `DynamicTableService.ts` para integrar dois módulos"* ou injetar
serviço Prisma first-class no motor (Contrato §2.1). Os dois PRs do lote tocam esse arquivo:

| PR | Nó | O que muda no motor | Previsto em BRIEF ratificado? |
|---|---|---|---|
| #731 (I11 PR-2) | I11 | +1 método público `searchTableData` (+30 linhas) e +1 método de repositório nos dois repositórios, com o `WHERE` num arquivo novo `fieldEqualsSql.ts` | **Sim** — `BE-INCR-CHAT-AGENT-brief.md` itens 7–8 e §2.2; F-I11-2 → (b) "Filtro no repositório", ratificado 15/10. O próprio BRIEF limita o PR-2 a "`DynamicTableService.ts` (1 método)" (V) |
| #730 (I7 PR-1) | I7 | 1 linha em `installPresetAsSystem`: `tx.user.update(...)` → `tx.user.updateMany({ where: { id, onboardingCompletedAt: null } })` + 1 comentário | **Sim** — `BE-INCR-RESET-CONSISTENTE-brief.md` item 6 e E10; F-I7-3 → "Preservar o 1º T0", ratificado 15/10. O BRIEF já registra que a linha é a da `SYMBOL_ALLOWLIST` (V) |

## 2. Registro das mudanças

### 2.1 I11 #731 — `searchTableData` (V)

```ts
// DynamicTableService (público)
searchTableData(user, tableId, filters?: Record<string, unknown>, limit = 10)
  : Promise<{ rows: IDynamicTableData[]; total: number; limit: number }>
//  1. getTableById(user, tableId)          → canView (policy existente)
//  2. toda chave de filters ∈ schema.fields[].name, senão ValidationError
//  3. todo valor ∈ string | number finito | boolean | null, senão ValidationError
//  4. limit preso em 1..50
//  5. repository.findDataByFieldEquals(table.id, equals, safeLimit)

// IDynamicTableRepository (+ DynamicTableRepository + TransactionalDynamicTableRepository)
findDataByFieldEquals(tableId, filters: FieldEquals[], limit): Promise<{ rows; total }>
// WHERE (fieldEqualsSql.ts): dynamicTableId = ? AND deletedAt IS NULL AND, por filtro:
//   null    → json_extract(data,$.f) IS NULL
//   boolean → json_type(data,$.f) = 'true'|'false'
//   number  → json_type IN ('integer','real') AND json_extract = ?
//   string  → json_type = 'text' AND json_extract = ?
// COUNT(*) + SELECT id … ORDER BY createdAt DESC LIMIT ? + findMany pelo client tipado
```

- **Consumidor:** só o `LuminarisAgentService` (ferramenta `query_table_data`), que antes lia as 200 primeiras linhas
  e filtrava em memória (F5 do BRIEF do I11).
- **Segurança:** caminho e valor vão como parâmetro ligado. O nome do campo vem da validação contra o schema, e o
  DTO só aceita nome `^[a-zA-Z_][a-zA-Z0-9_]*$` (`DynamicTable.dto.ts:21`), então o caminho JSON não tem `.`, `[` nem
  aspas. Soft-delete respeitado.
- **Contrato §2.1:** não injeta serviço Prisma first-class nem integra módulos dentro do motor. É uma capacidade de
  **leitura genérica** do próprio motor, chamada de fora (o chat chama o motor, não o contrário). Pela regra, isso é o
  lado permitido. (I)

### 2.2 I7 #730 — T0 preservado (V)

```diff
-      await tx.user.update({ where: { id: userId }, data: { onboardingCompletedAt: new Date() } });
+      // F-I7-3 (BE-INCR-RESET-CONSISTENTE item 6): preserva o 1º T0 — reinstalar depois do reset não o sobrescreve.
+      await tx.user.updateMany({ where: { id: userId, onboardingCompletedAt: null }, data: { onboardingCompletedAt: new Date() } });
```

- Continua dentro da mesma tx do install. Se o install reverte, a escrita reverte junto.
- **Prova zero-diff do P2:** a linha antiga é exatamente o "marco" que `proveP2ZeroDiffCli.classifySymbolDiff`
  reconhece por regex de linha inteira (`^await tx\.user\.update\(\{ where: \{ id: userId \}, data: \{ onboardingCompletedAt: new Date\(\) \} \}\);$`).
  A linha nova não casa. A prova **não roda no CI** (E10 do BRIEF do I7; só o `npm run prove:p2-zero-diff` manual do
  `RUNBOOK-H3-P2-CLINICA.md`), então nenhum gate quebra hoje. Mas a regex e o texto do ADR-P2 (EMENDA 14/09 R7)
  passam a descrever uma linha que não existe mais.

## 3. Checklist proposto (antes de mergear #731 e #730)

1. **Registro:** este BRIEF fica versionado e citado na linha do I11 e do I7 em `ORDEM-MERGE-2026-10-16.md`. *(direto)*
2. **Semântica da igualdade do agente:** ver F-DT-1.
3. **Prova zero-diff e ADR-P2 depois do I7:** ver F-DT-2.
4. **Precedente para a regra STOP:** ver F-DT-3.
5. **Nada mais bloqueia:** as duas mudanças estão nos BRIEFs ratificados, com CI verde (#731 14/14, #730 14/14 em
   16/10) e testes próprios (`DynamicTableService.searchTableData.integration.test.ts`, 131 linhas; rollback do I2
   pelo BRIEF do I7). *(direto)*

## 4. Forks — RATIFICAÇÃO PENDENTE

### F-DT-1 · Igualdade tipada do `searchTableData` × igualdade como texto do motor

O motor já tem `countByCompositeFieldValues` (uniqueness composta), que compara **como texto**
(`CAST(json_extract(...) AS TEXT) = String(v)`, `DynamicTableRepository.ts:263-286`), onde `"1"` = `1`. O
`fieldEqualsWhere` novo compara **por tipo**, onde `"1"` ≠ `1`. Isso foi ratificado no §2.2 do BRIEF do I11. O risco
prático: o modelo manda `1199999` (número) para um campo telefone gravado como texto, ou `"100"` para um campo money
gravado como float, e recebe **zero linhas**, sem erro. O usuário lê "não achei".

| Caminho | Efeito |
|---|---|
| (a) Manter a igualdade tipada como está | Zero mudança; o risco fica na descrição da ferramenta ("use o tipo do schema") |
| (b) Tipada **+** coerção pelo tipo do campo no serviço: antes de montar o filtro, o serviço converte o valor para o tipo declarado no schema (`number`/`money` → número; `text`/`phone`/`email` → string; `boolean` → booleano) e dá `ValidationError` quando não converte | O modelo errar o tipo vira acerto ou erro explícito, nunca "zero linhas" silencioso; mexe em ~15 linhas do mesmo método do #731 e pede 1 teste por tipo |
| (c) Trocar para igualdade como texto, igual ao `countByCompositeFieldValues` | Reusa a semântica existente, mas volta a confundir `true` com `"1"` e `1` com `"1"` (o que o §2.2 quis evitar) |

**Recomendação: (b).** Com ela, o "zero linhas" silencioso vira acerto ou erro explícito, que é o que o F5 do BRIEF do
I11 queria eliminar. O custo é pequeno, no mesmo PR (#731), e não mexe na regra ratificada (a comparação continua
tipada). Caso o dono escolha (b), a correção vai para a sessão do I11 antes do merge.

### F-DT-2 · Prova zero-diff do P2 e texto do ADR-P2 depois do F-I7-3

| Caminho | Efeito |
|---|---|
| (a) Não tocar: a prova é do intervalo da P2, que já fechou, e não roda no CI | Zero diff. Se alguém rodar `prove:p2-zero-diff` num intervalo que contenha o #730 (por exemplo, a prova de uma 3ª vertical com base anterior ao I7), ela falha com "não é o marco" |
| (b) Atualizar a regex do marco na prova para aceitar também a forma `updateMany … onboardingCompletedAt: null` + o fixture do teste + uma nota de 1 linha no ADR-P2 (EMENDA R7: "forma do marco alterada pelo F-I7-3, 16/10"), tudo no #730 | A prova e o ADR continuam dizendo a verdade sobre o código; a allowlist continua com UM símbolo (o teste-guarda que "falha se crescer" não muda) |
| (c) Só a nota no ADR-P2, sem tocar a prova | O documento fica correto; a ferramenta fica com a regra antiga |

**Recomendação: (b).** Comentário ou doc que afirma o que o código não faz já virou bug nesta casa (memória
`comentario-de-teste-afirma-o-que-nao-assere`). A mudança é pequena, mantém a exceção nominal com um símbolo só e
cabe no #730. Observação: a emenda R7 item 1 libera "**uma** escrita a mais — o marco de T0"; o F-I7-3 mantém uma
escrita só, mudando só a condição. (I) Se o dono entender que mudar a condição do marco exige nova emenda ao ADR-P2,
isso é decisão dele, e (b) passa a ser a própria emenda.

### F-DT-3 · Como a regra STOP do CLAUDE.md lê "método novo no motor"

A regra fala em *integrar dois módulos* dentro do motor. O #731 acrescenta uma leitura genérica que outro módulo
consome. Pela letra, não é integração. Mas a regra não diz isso, e o próximo agente que vir o diff pode parar (ou não
parar) por leitura própria.

| Caminho | Efeito |
|---|---|
| (a) Não mexer na regra; este BRIEF fica como precedente citável | Zero diff em regra |
| (b) Acrescentar ao `_ARCHITECTURE-CONTRACT.md §2.1` uma linha: "capacidade genérica do motor (sem conhecer o módulo consumidor, sem serviço Prisma) é permitida; o consumidor chama o motor" | A regra passa a dizer o que hoje só se infere. Toca `.claude/skills/**`, então pede `skill-audit run` com 0 findings |

**Recomendação: (a) agora.** Mexer no contrato é frente própria (ORCH-006) e não destrava nada deste lote. Se a
dúvida voltar num 2º PR, aí vale (b).

## 5. Pendente de validação externa

Vazia. Nenhum dos pontos depende de regra contábil, fiscal ou legal.

## 6. Insumos ausentes

- Não rodei `npm run prove:p2-zero-diff` contra o #730. A falha descrita no F-DT-2 (a) é **inferida** da regex lida
  (`proveP2ZeroDiffCli.ts:123-125`), não executada.
- Não medi quais tipos de campo o agente mais consulta. O risco do F-DT-1 é **inferido** da semântica, não observado
  em uso.

## 7. Achados fora de escopo

- O `TransactionalDynamicTableRepository.findDataByFieldEquals` usa `(this.tx as any).$queryRaw` com
  `eslint-disable`, seguindo um padrão que já existe no arquivo. Fica registrado, sem planejar nada.
- O `canView` deixa o ADMIN ver tabela de outro dono (F2 do BRIEF do I11). O `searchTableData` herda isso, e é o mesmo
  comportamento do `getTableData` existente. Não é mudança deste lote.
