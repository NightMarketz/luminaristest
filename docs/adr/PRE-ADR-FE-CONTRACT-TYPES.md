# PRE-ADR — Tipos de payload do FE derivados dos DTOs Zod do servidor (FE-CONTRACT-TYPES)

> **REABERTO 28/09 (mesma data): o dono objetou que "não faz sentido importar coisas do backend no frontend". Com isso, F-CT-1 (a) fica SUSPENSO, e F-CT-2/F-CT-3 dependem da nova resposta. Alternativa em avaliação: pacote `contracts/` na raiz, importado pelo server e pelo my-app. Até ratificar, nada deste PRE-ADR se executa.**
>
> ~~Status: Accepted (forks ratificados)~~ — 28/09/2026. Produzido por **sessão de planejamento**. Não tem
> código de aplicação. **Os 4 forks foram RATIFICADOS em 28/09 pelo dono, por questionário (AskUserQuestion):**
> F-CT-1 → (a), F-CT-2 → (a), F-CT-3 → (a) e **F-CT-4 → (b), contra a recomendação (a)**: migrar os 24
> services, não só o piloto. O fatiamento está no §9.
> **Autorização:** dono em chat, 28/09/2026: *"Pode planejar e lançar um prompt para essa correção"*. A frase
> responde à proposta de piloto com import de tipo dos DTOs do servidor (conversa de 28/09, depois do PR-0).
> Ela cobre **planejar** e **preparar o prompt da execução**. O "executa" do PR sai com o prompt, depois
> dos forks.

## 1. Problema (classe, com caso medido)

O FE espelha à mão, em `my-app/lib/services/*.service.ts` (24 arquivos), os bodies que o servidor valida com
Zod `.strict()`. Quando o DTO muda, o espelho não acompanha.

- Os testes do FE mockam o service, então nada fica vermelho.
- O `tsc` não enxerga a divergência, porque os dois lados são tipos independentes.

**Caso medido:** GAP-MAP Nível 3, "SPED ECD pela tela — signatário do J930 leva `identQualif`". De #353 (20/09)
até o PR-0 (28/09), toda geração de ECD pela tela devolveu 400. O GAP-MAP já tinha declarado esse resíduo na
linha "Evolução assimétrica": *"o espelho FE é tipo TS à mão, comparar exige codegen"*.

## 2. Fatos medidos (sondas de 28/09, fora do repo, apagadas depois)

| # | Fato | Evidência |
|---|---|---|
| S1 | O FE declara `zod ^3.25.56`, mas **nenhum** arquivo do FE importa zod | busca em `my-app/` fora de `node_modules`: só `package.json`/lock |
| S2 | Um `import type` do DTO do servidor no FE faz o `tsc` do FE pegar a classe inteira. O pré-fix `{ …, identQualif: '' }` dá **TS2353** (excess property). `codAssin: '123'` dá **TS2322** (a união vem da tabela transcrita). O pós-fix compila. | `tsc -p` com `extends` do `my-app/tsconfig.json` e arquivo-sonda em `my-app/` |
| S3 | Os arquivos do servidor, compilados com as opções do FE, **não geram ruído**. Em `SpedEcdDto`, `PayableDto` e `BankSettlementDto`, os únicos erros foram os da própria sonda. | `npx tsc --noEmit` completo do my-app com a sonda incluída |
| S4 | **`z.input<typeof Schema>` com o zod do FE (v3) sobre um schema do servidor (v4) quebra:** TS2344, porque um `ZodObject` do v4 não satisfaz o `ZodType` do v3. O tipo tem que vir **exportado pelo servidor**, ou do mesmo zod. | sonda variante A |
| S5 | Os imports dos DTOs contábeis são puros: `money`, `cnpj`, `cpf` e `spedQualifAssinante` não têm import, e `dates` só importa `lib/errors`, que também não tem. Doze DTOs importam algo pesado (`generated/prisma`, presets, `*.model`). **Não conferi** se esses compilam do lado do FE. | busca nos imports de `**/dtos/*.ts` |
| S6 | **A CI do FE** (`ci.yml` job `frontend`) roda `npm ci` só em `my-app`, e aí o `zod` dos arquivos do servidor não resolve (sem `server/node_modules`). **Docker:** o `docker-compose.yml:47` usa `context: ./my-app`, que não enxerga `../server`, e o `next build` faz typecheck. | leitura |

## 3. Decisão proposta (sujeita aos forks)

O tipo do body enviado pelo FE vem do **DTO do servidor por `import type`**, que é apagado na compilação e não
leva código do servidor para o bundle.

- O **estado do formulário** continua sendo tipo do FE (rascunho, aceita `''`).
- A conversão rascunho → payload acontece num **mapper com chaves explícitas**. É ali que o `tsc` morde:
  - chave extra dá excess property;
  - chave obrigatória ausente dá TS2741.
- Não entra codegen nem passo novo de CI. O gate é o `tsc` e o `npm run test:types`, que já existem.

## 4. Checklist do PR piloto (se os forks forem na recomendada)

1. **[F-CT-2]** `my-app/package.json`: `zod` passa de `^3.25.56` para a mesma faixa do servidor (`^4.1.8`), com
   o lockfile regenerado. O `tsconfig.json` do my-app ganha dois `paths`:
   - `"zod": ["./node_modules/zod"]`. Os `paths` valem para o programa todo, então os arquivos do servidor
     passam a resolver o zod do FE, e a CI e o Docker não precisam de `server/node_modules`.
   - `"@contracts/*": ["../server/src/features/*"]`.

   Confira se o `tsconfig.vitest.json` herda esses paths. Se não herdar, replique.
2. **[direto]** Nos DTOs do servidor que o piloto consome (`SpedEcdDto.ts`, `SpedEcfDto.ts`,
   `SpedEcfRealDto.ts`), acrescente só **linhas de tipo**: `export type SpedEcdRequestInput = z.input<typeof
   SpedEcdRequestSchema>` e o equivalente para ECF e ECF Real. Nada muda em runtime, e o
   `dtoShapeSnapshot` não deve mudar. **Se mudar, PARE.**
3. **[direto]** `sped.service.ts`: `GenerateEcdPayload`, `GenerateEcfPayload` e `GenerateEcfRealPayload` viram
   aliases dos `*RequestInput` de `@contracts/…`. `EcdSigner` e `EcfSigner` passam a ser os rascunhos do
   formulário e ficam declarados no FE como `Draft`, sem pretender ser o contrato.
4. **[direto]** O mapper `toEcdPayload(draft)` e seus equivalentes para ECF e ECF Real ficam em
   `SpedGenerationPanel.tsx` e `SpedEcfRealPanel.tsx`, e montam o objeto **chave a chave**. Proibido:
   - `...spread` do estado para dentro do payload, porque essa é a forma exata do vazamento do PR-0;
   - `as` no objeto inteiro.

   Onde o valor do rascunho é `string` e o contrato é uma união (por exemplo `codAssin`), vale `as` **só nesse
   campo**, com o comentário `// ponytail: união vem da tabela do servidor; o FE não tem a lista em runtime até o
   SPED-SIGNERS (PLANO-ONDA1 §5)`.
5. **[direto]** Guarda de tipo no gate que já existe (`npm run test:types`): um arquivo `*.test.ts` com
   `// @ts-expect-error` num signatário com `identQualif` e noutro com `codAssin: '123'`. Se o contrato afrouxar,
   o `@ts-expect-error` sobra e o `test:types` falha. Não é aparato novo: é o gate da CI, de 252 casos em diante.
6. **[F-CT-3]** Docker do FE, conforme o fork.
7. **[F-CT-4]** Regra de adoção, conforme o fork.
8. **Gates:**
   - `cd my-app && npx tsc --noEmit && npm run test:types && npx vitest run` (linha de base: 60 arquivos, 319
     testes);
   - `npm run build`;
   - `cd server && npx tsc --noEmit` e `npx jest dtoShapeSnapshot`;
   - se o Docker mudar, `docker compose build frontend`, ou declarar "o CI é o teste" quando não houver Docker
     local.
   - O sign-off de browser da geração de ECD, ECF e ECF Real é humano (H2).

## 5. Forks — RATIFICADOS 28/09 (a · a · a · **b**)

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-CT-1** | Fonte do tipo | (a) `import type` do DTO do servidor, com tipo `*Input` exportado pelo servidor · (b) codegen Zod → JSON Schema → `.d.ts` commitado + CI checando se o gerado está atualizado · (c) manter o espelho manual + item de checklist no review | **(a)**: sem cópia, sem passo novo, e medido em S2. (b) cria gate novo, que esbarra na regra do CLAUDE.md §⛔. (c) é o estado atual, que falhou no PR-0. |
| **F-CT-2** | Como o `zod` dos arquivos do servidor resolve na CI e no Docker do FE | (a) FE no **Zod 4** + `paths.zod` apontando para o `node_modules` do FE · (b) job FE da CI e Docker rodam `npm ci` também em `server/` | **(a)**: é a migração que o dono sugeriu. Custa só a versão, porque o FE não usa zod em runtime (S1). (b) duplica a instalação e o `postinstall` do Prisma. |
| **F-CT-3** | Docker do FE (o contexto `./my-app` não vê `../server`, e o `next build` faz typecheck) | (a) contexto da raiz: `COPY my-app/` + `COPY server/src/features/` só no estágio builder, e o runner não muda · (b) `typescript.ignoreBuildErrors` só no Docker, com o `tsc` continuando como gate na CI · (c) sem suporte ao Docker neste PR (a imagem quebra) | **(a)**: mantém o typecheck, e a imagem final é a mesma. (b) muda o predicado de um gate, o que é política e só o dono decide. (c) é inaceitável porque o M2 usa Docker. |
| **F-CT-4** | Escopo e adoção | (a) piloto só `sped.service.ts` + regra no `my-app/CLAUDE.md`: "service tocado que envia body para DTO `.strict()` usa `@contracts`" · (b) piloto + migrar agora os 24 services · (c) piloto sem regra | **(a)**: incremental. A Onda 1 (lalur, review, delivery, bank-settlement) já nasce no padrão. (b) é um big-bang que toca telas com sign-off pendente. |

## 6. Pendências de validação externa

Nenhuma de domínio. O sign-off de browser das 3 gerações SPED depois do piloto é humano (H2).

## 7. Insumos ausentes

- **S5:** os 12 DTOs com import pesado não foram sondados. O piloto só consome SPED (`SpedEcdDto` importa
  `AccountingContact.model`, e S3 mostrou que compila limpo). Um DTO que importa `generated/prisma` pode exigir
  `prisma generate` antes do `tsc` do FE. Esse limite fica registrado para quem migrar esses services depois.
- Docker local: não conferi se há Docker neste ambiente para provar o F-CT-3 (a).

## 8. Achados fora de escopo

1. Durante esta sessão, **outra sessão** aplicou o Prompt A (limpeza) **no mesmo worktree**
   (`ecstatic-haibt-11235f`): tirou `qualifDesc` dos dois JSONs e passou o grid da ECD para `sm:grid-cols-5`, sem
   commit. É o risco de duas sessões no mesmo checkout. O PR-0 e esta limpeza estão misturados na mesma
   árvore de trabalho.
2. A varredura dos pares já divergentes hoje (Prompt B) continua valendo. O piloto só evita **divergência
   nova** nos services migrados e não acha a que já existe nos outros 23.

## 9. Plano de execução (F-CT-4 → b: todos os services, em PRs seriais)

`ls my-app/lib/services` mostra 23 arquivos `.ts`. **18** fazem POST/PUT/PATCH, contando as ocorrências por
arquivo:

- accounting (14), lalur (6), crm (6), entryApprovals (5), dynamic-table (5);
- dimensions, accountsReceivable, accountsPayable (4 cada);
- user, sped, sales (3 cada);
- savedView, referential, dataExchange, counterparties, auth (2 cada);
- setup, document (1 cada).

Os 5 sem escrita (packageBalances, nfe, multipart, location, analytics) ficam fora: o PRE-ADR cobre **body**,
não resposta. O "24" do questionário era a contagem de `ls`, e a medida correta é 18 com escrita.

| PR | Conteúdo | Por quê nesta ordem |
|---|---|---|
| **PR-1 — infra + piloto SPED** | Itens 1–6 do §4 + regra de adoção no `my-app/CLAUDE.md` (a regra vale como padrão também sob (b)) + **inventário** commitado no corpo do PR: para cada uma das 18, as chamadas de escrita → rota → schema do servidor → classificação | Prova o mecanismo (zod 4, paths, Docker e guarda `@ts-expect-error`) num service só, antes de espalhar |
| **PR-2 — contábil/financeiro** | accounting, lalur, entryApprovals, dimensions, accountsReceivable, accountsPayable, referential, dataExchange, counterparties | Os DTOs `.strict()` mais densos, e é onde vive a régua. Ficou medido que os DTOs contábeis compilam limpo do lado do FE (S3/S5). |
| **PR-3 — resto** | crm, sales, user, savedView, auth, setup, document, **dynamic-table** | Tem DTOs com import pesado (`generated/prisma`, presets, `User.model`, S5) e o motor DynamicTable |

**Classificação do inventário (regra, não decisão ad hoc):**

- **C1:** o body vai para um schema Zod estático do servidor. Migra.
- **C2:** o body vai para um schema **dinâmico** (DynamicTable, validado por `buildZodSchema(schema)` em
  runtime). **Não migra**, porque não existe tipo estático. A linha do inventário diz isso.
- **C3:** a rota não tem schema Zod, ou recebe multipart. Não migra, e vira achado fora de escopo.
- **C4:** o DTO do servidor, importado pelo FE, não compila, por exemplo porque exige `prisma generate`. **PARE
  nesse service**: registre e siga com os demais. Resolver o C4 é decisão do dono.

**Cada divergência real que o `tsc` expuser** (o espelho manual estava errado) é **bug de produção**, não ruído
de migração. Registre no corpo do PR (service, chave, D1/D2) e **abra uma linha no GAP-MAP** (Nível 3, status
CORRIGIDO no próprio PR, citando este PRE-ADR). Não conserte em silêncio.

## 10. Pesquisa depois da reabertura do F-CT-1 (28/09) — as três opções medidas

A objeção do dono ("não faz sentido importar coisas do backend no frontend") é procedente: o `import type` fazia o
FE depender do **fonte** do servidor, e o grafo medido abaixo mostra o que viria junto.

| Medida | Resultado | Como |
|---|---|---|
| M1 — `z.toJSONSchema` do Zod 4 sobre todos os schemas dos DTOs | **246/246 sem falha** (68 arquivos) | sonda tsx, `io:'input'`, `unrepresentable:'any'` |
| M2 — OpenAPI atual (JSDoc à mão via `swagger-jsdoc`) × Zod | 117 componentes pareados por nome: **17 divergem (~15%)** e 129 schemas não têm componente. Exemplos: `CreatePayableInput` sem `inventoryItems`/`recoverableTaxLines`; `PostEntryInput` sem `unitId` obrigatório; `ClosePeriodInput` com `month/year` que o Zod não tem | chaves e `required` comparados de `public/openapi.json` × `toJSONSchema` |
| M3 — fecho transitivo dos imports dos 68 DTOs | **76 arquivos não-DTO**: a árvore inteira de presets do DynamicTable (via `registry`), `exceljs` (`lib/spreadsheet`), o fixture JSON de 263 KB (`LalurDto`), `generated/prisma` (3 DTOs) e `*.model.ts` que misturam constante e lógica | script de fecho de import |
| M4 — o artefato de contrato **já existe** | `dtoShapeSnapshot.test.ts` grava o JSON Schema (`z.toJSONSchema`) de **184 schemas / 43 arquivos** contábeis em `__dto-shapes__.json`, **0 buracos** (`{}`). O cabeçalho do teste declara o resíduo: *"comparar os dois exige codegen e está fora"* | leitura + contagem |
| M5 — tipo TS gerado desse JSON (`json-schema-to-typescript@15.0.4`) pega o PR-0? | **Sim**: TS2353 para `identQualif` e TS2322 para `codAssin:'123'`; o pós-fix compila. `SpedEcdRequestSchema` → 313 linhas | scratch fora do repo |

**Leitura:**
- (A) **Pacote `contracts/`**: é a fronteira mais limpa em teoria. Pelo M3, porém, os DTOs daqui não são contrato
  puro: codificam conhecimento do servidor (presets, fixture, Prisma). Extrair exige desmontar os `*.model.ts`
  antes, e esse é o maior custo das três.
- (B) **Tipos do OpenAPI**: herdam os 15% de divergência do M2. Só serviriam depois de o OpenAPI passar a sair
  do Zod, o que é escopo maior.
- (C) **Tipos gerados do snapshot de shape — RECOMENDADA.** O servidor **publica** o contrato, que ele já
  gera hoje. O FE **consome** um arquivo gerado dentro da própria árvore (`my-app/types/contracts/*.gen.ts`,
  commitado). Nenhum lado importa o outro. O mesmo teste que hoje compara o JSON passa a comparar também o
  `.gen.ts`: sem passo novo de CI, fecha o resíduo que o próprio gate declarou.

**Consequências para os outros forks, se for (C):**
- F-CT-2 perde o objeto: o FE não precisa de zod nenhum, e o `zod ^3` morto sai.
- F-CT-3 perde o objeto: o Docker do FE continua com contexto `./my-app`.
- F-CT-4 → (b) continua valendo, mas os services fora de contabilidade (crm, user, sales…) exigem estender o
  snapshot aos DTOs desses domínios.

## 11. RATIFICAÇÃO FINAL (28/09) e plano de execução — solução do snapshot

**Decisões do dono em 28/09:**
- **F-CT-1 → (C/E) tipos gerados do snapshot** ("Vamos planejar então usando a solução de snapshot"), com a
  pesquisa do §10 e a explicação didática em https://claude.ai/artifact/QcJU1PPjWsz3PQy8vKzU6i.
- **Gerador → `json-schema-to-typescript`** (questionário).
- **F-CT-4 → (b)** mantido: todos os services, exceto o DynamicTable (classe C2 do §9).
- **F-CT-2 e F-CT-3 perdem o objeto:** o FE não importa nada do servidor, não precisa de zod e o Docker não muda.
- A reabertura do topo deste documento fica **resolvida** por esta seção.

### 11.1 Como funciona (fatos lidos em 28/09)

- `dtoShapeSnapshot.test.ts` coleta todo export Zod dos arquivos de `features/accounting/dtos/`, aplica
  `z.toJSONSchema(…, { io:'input', unrepresentable:'any' })` e compara com `__dto-shapes__.json`. Com
  `UPDATE_DTO_SNAPSHOT=1`, grava o arquivo. A CI roda o teste no job `server` (`npm test` → `test:unit`).
- O JSON não tem `$ref`/`$defs`, então os tipos gerados saem inline.
- Há colisão de nome entre domínios (`RegisterPaymentSchema` existe em 2 arquivos), e isso obriga a
  **um arquivo gerado por arquivo de DTO**.

### 11.2 Regras de geração (diretas, sem fork)

1. **Saída:** `my-app/types/contracts/<domínio>/<ArquivoDto>.gen.ts`, um por arquivo de DTO. A primeira linha é
   o banner `// GERADO por server/…/dtoShapeSnapshot.test.ts — NÃO EDITE. Mudou o DTO? UPDATE_DTO_SNAPSHOT=1 …`.
2. **Nome do tipo:** `<Nome>Schema` → `<Nome>Input` (ex.: `SpedEcdRequestSchema` → `SpedEcdRequestInput`).
   Export que não termina em `Schema` mantém o nome + `Input`.
3. **Fonte:** o `.gen.ts` é gerado **do JSON do snapshot**. A cadeia de comparação é Zod → JSON (o assert que já
   existe) e JSON → `.gen.ts` (o assert novo). Quem muda o DTO roda **um** comando e atualiza os dois.
4. **Fim de linha:** `.gitattributes` ganha `my-app/types/contracts/**/*.gen.ts text eol=lf`, e a comparação
   normaliza `\r\n` → `\n`. É a classe *gate × ambiente*: o teste precisa passar no Windows (dev) **e** no
   Linux (CI). Prove nas duas condições, ou declare que "a CI é o teste" para o Linux.
5. **Versão exata:** `json-schema-to-typescript` fica fixado em `15.0.4`, sem `^`, em `devDependencies` do
   **server**. A saída formatada depende da versão (e do prettier interno), e uma versão flutuante faz o gate
   oscilar entre máquinas.
6. **Arquivo órfão:** um `.gen.ts` sem DTO correspondente reprova, e o modo UPDATE o apaga, na mesma lógica do
   "ARQUIVO SUMIU" que o teste já tem.
7. **No FE:** o service importa `@/types/contracts/...` e monta o payload num **mapper chave a chave**:
   - sem `...spread` de estado;
   - sem `as` no objeto;
   - `as` só em campo-folha string → união, com o comentário `ponytail:` do §4.

   O estado do formulário continua sendo tipo `*Draft` do FE.

### 11.3 PRs (seriais)

| PR | Conteúdo | Gate de mordida (protocolo de conserto de gate: vermelho → verde no MESMO PR) |
|---|---|---|
| **PR-1 — gerador + contábil + piloto SPED** | Regras 1–6 no `dtoShapeSnapshot` e os 43 `.gen.ts` contábeis gerados. `sped.service.ts` + mappers em `SpedGenerationPanel`/`SpedEcfRealPanel`. Guarda `@ts-expect-error` em `test:types` (`identQualif` e `codAssin:'123'`). `zod` removido do `my-app/package.json` (sem uso, S1). Regra no `my-app/CLAUDE.md`. Comentário "BY HAND" do `sped.service.ts` revogado. | Colar no PR os três vermelhos provocados e revertidos: (i) mudar um DTO sem UPDATE → o teste do servidor reprova; (ii) editar um `.gen.ts` à mão → reprova; (iii) reintroduzir `identQualif` no mapper → o `tsc` do FE reprova. |
| **PR-2 — services contábil/financeiro** | accounting, lalur, entryApprovals, dimensions, accountsReceivable, accountsPayable, referential, dataExchange, counterparties. Comentário "BY HAND" do `lalur.service.ts` revogado. | Cada divergência exposta vira linha no GAP-MAP (Nível 3, CORRIGIDO no PR) e **nunca** é consertada com `as` |
| **PR-3 — demais domínios** | Estender o snapshot aos outros domínios (**F-CT-6**) + migrar crm, sales, user, savedView, auth, setup, document. `dynamic-table` fica fora (C2). | Idem, e o piso de sanidade do coletor atualizado |

### 11.4 Fork F-CT-6 — **RATIFICADO → (a)** (dono, 28/09, questionário): um JSON por domínio

| Fork | Pergunta | (a) | (b) | Recomendação |
|---|---|---|---|---|
| **F-CT-6** | Como o snapshot cobre os outros 16 diretórios `features/*/dtos` | Teste generalizado para `features/*/dtos`, **um JSON por domínio** ao lado de cada `dtos/` (o `__dto-shapes__.json` contábil não muda de chave) | Um JSON global com chave `<domínio>/<Arquivo>.ts`, o que reescreve as chaves do contábil | **(a)**: diff legível por domínio e zero churn no snapshot contábil que já existe |

### 11.5 Fora deste plano

- O OpenAPI continua escrito à mão, com 17/117 divergentes (§10 M2). Gerá-lo do Zod é frente própria e não foi
  autorizada.
- Tipos de **resposta**, `superRefine` e DynamicTable, pelos limites do §8 da página explicativa.
- Varredura das divergências atuais (Prompt B): a migração dos PR-2/PR-3 as expõe service a service, então a
  varredura deixa de ser necessária para os services migrados.

> **Plano granular de execução (28/09):** `docs/accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md`. Ele traz as
> sondas G1–G7, os passos do PR-1, o mapeamento chamada → rota → schema do PR-2 e do PR-3, o protocolo de erro
> de `tsc` e os riscos. Mudança técnica em relação ao §11.2: o gerador roda com **`format: false`** (G3), e com
> isso o prettier sai do caminho.

## 12. Fechamento de pontas soltas (28/09, tarde) — delegação do dono

**Autorização:** *"Pode planejar com bastante granularidade aqui para fecharmos qualquer ponta solta e reiscos
abertas, pode decidir tudo"* (dono, chat, 28/09).
**Resultado:** `docs/accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md` **v2**, com evidências G1–G19, decisões
D1–D18 e a sequência mestre. Nota de decisão: `docs/plano/decisoes/D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE.md`.
Nó do vault: `FE-CONTRACT-TYPES`.

**O que mudou em relação ao §11 (por evidência, não por preferência):**

1. **Prettier.** Com `format:false` o problema não some: o `require("prettier")` do gerador executa `import()` no
   carregamento e derruba o Jest. A correção está provada no Jest real: stub por `jest.doMock`, resolvido a partir
   do caminho do gerador, no próprio teste (D4).
2. **Mapper.** A checagem de chave extra do TypeScript **não** alcança objeto devolvido por `.map` sem tipo de
   retorno, nem spread. A regra do mapper passou a exigir função com retorno declarado ou `satisfies` (D7, §9 do
   plano).
3. **Parse composto** (body + params): `Pick<XInput, …>` (D8).
4. **SPED.** O controller aceita mais que o DTO (`signerContactIds`, perfil X13): extensão explícita no FE (D9).
5. **Cobertura.** Todos os domínios foram provados: 258 schemas, 17 domínios, 0 falhas no Jest, `tsc`/`lint:gate`
   do my-app limpos (G7, G11).
6. **Ordem.** Começa **depois** do FE-FIX-SPED-ECD-SIGNERS (sessão paralela), que absorveu o PR-0 (D14).
