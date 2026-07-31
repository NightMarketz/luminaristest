# AV-L1 · Contrato de Camadas — o que o gate não vê

**Uma data de fechamento de proposta aparece um dia antes do que foi digitado, no
`Lead360Modal` — a correção dessa classe já existe no arquivo vizinho e esta tela ficou de
fora.** O resto do contrato de camadas está sólido: fronteira §2.1 sem violação, 20 de 20
candidatos de atomicidade com `tx` propagado, soft-delete íntegro nos dois sentidos.

> **Modo reduzido.** Nenhum dos três roots tem `node_modules` neste worktree. `tsc`, `lint`,
> `jest` e `vitest` saíram como **não executáveis** — nada de runtime sustenta este relatório.
> Teto de nível **3**: `deployed` segue pendente de decisão do dono.

---

## Recorte

| | |
|---|---|
| Commit | `ae8d18b` · branch `claude/repo-profile-audit-plan-56e928` |
| Incluído | `server/src`, `server/prisma`, `my-app` (leitura estática) |
| Excluído | `node_modules`, `server/generated`, `my-app/.next`, `my-app/public` |
| Lidos na íntegra | 9 de 12 do orçamento |
| Achados | 4 de 10 do teto |
| Postura assumida | rigor **estrito**, tolerância a falso positivo **baixa** (2 checagens/achado), audiência **dupla** — os três campos seguem pendentes |

---

## Contrato de camadas — peça central

| Dimensão | Esperado | Medido | Coberto por gate? | Veredito |
|---|---|---|---|---|
| C1 fronteira §2.1 | zero | zero | **sim** — teste dedicado | sólido (teste não executável aqui) |
| C2 atomicidade | `tx` em toda escrita | 20 candidatos, 20 com `tx` | não | sólido |
| C2b gate mutável | re-checado na tx | `assertPeriodOpen` + `assertPeriodOpenTx` | não | sólido — padrão canônico |
| C3 teto de centavos | choke-point | 39 arquivos citam `MAX_CENTS`, 65 escrevem centavos | não | **não medido** — razão não localiza |
| C4 data-only | canônico | 10 hits, 9 são `DateTime`, **1 é date-only** | parcial (vitest TZ-pinned, não rodou) | **1 achado** |
| C5 dívida marcada | spec = app | spec diz 5+2, app tem 3+0 | não | **1 achado (governança)** |
| C6 estoque `zinc-` | 33 | 33 | só o novo | sólido |
| C8 DTO Zod | parse em toda entrada | 1 de 34 sem parse | não | **1 achado** |
| C9 soft-delete | escrita e leitura | 3 hard-deletes sancionados; 2 leituras refutadas | não | sólido |
| C10 3 toques | rota+factory+policy | 2 controles verdes, 1 bypass de factory | toques 1–2 sim | **1 achado (dano 1)** |

Escala: 0 fronteira inexistente · 1 nominal · 2 respeitada por convenção · 3 respeitada e
verificável · 4 barrada por gate que lê o app.

---

## Achados

> **Adendo pós-relatório (2026-07-31).** Este relatório é um retrato de `ae8d18b` e o
> JSON irmão permanece intocado como tal. **F1 foi corrigido** na árvore de trabalho: o
> `Lead360Modal` passou a usar o parse compartilhado de `crm/lib/dates.ts` e a barreira
> entrou em `dates.test.ts`. O falsificador estático não reproduz mais e o teste foi
> provado por mutação (parse revertido → 3 dos 4 casos novos falham). Os demais achados
> seguem abertos. Registrado aqui para que ninguém abra o relatório e vá consertar o que
> já está consertado — que é literalmente o F3 aplicado a este documento.

### F1 · `Lead360Modal` desloca a data de fechamento um dia para trás
**Dano 3 · exposição após-deploy · confiança alta · reversível**

`my-app/features/crm/components/Lead360Modal.tsx:226` formata `latestProposalEtaClose` com
`new Date(valor).toLocaleDateString('pt-BR', {…})`. O campo é **date-only**: declarado
`type: 'date'` no preset (`LeadsModule.ts:98`) e trafega como string nua
(`CrmPipelineDto.ts:34`, `z.string()`). Em UTC−3, `new Date('2026-07-08')` resolve para meia-noite
**UTC**, que é 21h do dia 7 local.

O que torna isto reincidência e não estreia: `my-app/features/crm/lib/dates.ts:31` — **mesma
feature, pasta vizinha** — já carrega o parse seguro, e o cabeçalho documenta que foi aplicado
aos painéis de notas, tarefas, anexos e timeline. O modal não foi incluído.

**Cuidado na correção:** delegar a `formatDate` do vizinho *muda o formato visível* — ele
devolve `toLocaleDateString()` sem opções (numérico, locale do navegador), enquanto o modal
renderiza mês por extenso em `pt-BR`. O conserto contido é aplicar o mesmo parse mantendo as
opções, não trocar o formatador.

**Impacto:** a data prevista de fechamento de uma proposta aparece um dia antes da que o
usuário digitou.

**Falsificador estático — executado, confirmou:**
```bash
TZ=America/Sao_Paulo node -e "const v='2026-07-08';const e=new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});const c=new Date(v+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});console.log(e,c);process.exit(e===c?1:0)"
```
Saída: `07 de julho de 2026` × `08 de julho de 2026`. **Controle que discrimina:** o mesmo
comando com `2026-07-08T15:30:00Z` devolve `08` — datetime não desloca, só date-only.

**Checagens adversariais:** (1) *o campo é mesmo date-only?* → sim, `type:'date'` no preset e
`z.string()` no DTO — **sobreviveu**; (2) *existe segundo caminho formatando isto?* → não, o
modal formata inline; o helper seguro existe na feature mas não é chamado aqui — **sobreviveu**.

**Barreira sugerida:** teste de fronteira. `dates.test.ts` já existe na mesma pasta e o CI já
roda vitest com `TZ=America/Sao_Paulo` — o caso do modal cabe ali sem infraestrutura nova.

---

### F2 · Único controller que entrega `req.body` sem parse em runtime
**Dano 2 · exposição após-deploy · confiança média · reversível**

`server/src/controllers/analyticsDefinitionsController.ts:40` e `:57` passam `req.body`
direto para `service.createTableData` / `updateTableData`. Dos 34 controllers, **33 fazem
`safeParse`**; este é o único fora do padrão. Não há middleware de validação no projeto
(`server/src/middleware/` tem só `auth.ts`), então o parse inline é a única fronteira.

O tipo `CreateDynamicTableDataDtoType` é asserção de TypeScript — apagada em runtime.

**Impacto:** corpo de requisição malformado chega mais fundo antes de ser rejeitado; a
mensagem de erro vem da camada errada.

**Falsificador estático:**
```bash
rg -n "req\.(body|query|params)" server/src/controllers/analyticsDefinitionsController.ts && rg -c "safeParse" server/src/controllers/analyticsDefinitionsController.ts || echo "sem parse — achado vivo"
```

**Checagens adversariais:** (1) *o service valida?* → **enfraqueceu** — `DynamicTableService.createTableData`
valida os campos contra o schema do preset, inclusive com repo ligado à tx; a exposição é do
*shape* do corpo, não dos valores; (2) *há middleware cobrindo?* → não — **sobreviveu**.

**Barreira sugerida:** teste de fronteira no pipeline.

---

### F3 · O backlog de dívida do layer-gate aponta para o que já foi pago
**Dano 2 · exposição já-exposto · confiança alta · reversível**

`docs/architecture/lint-layer-gate.md` declara 5 sites `DEBT: prisma` e 2 `DEBT: apiClient`.
Medido: **3 e 0**. `authController` e `server/src/features/users/` não importam mais
`lib/prisma`; `TotalControlSetup.tsx` e `QuickSetup.tsx` existem mas não importam mais
`api/api-client`.

O item 4 do "Gate de aceitação" do próprio spec afirma que esses `grep` devolvem a lista
exata da dívida aberta — hoje não devolvem.

**Impacto:** quem abre o backlog para pagar dívida encontra quatro entradas que não existem
mais, e o gate de aceitação do documento está falso.

**Falsificador estático:**
```bash
rg -c "DEBT: prisma" server/src ; rg -l "api/api-client" my-app --glob '!node_modules' | tr '\\' '/' | rg -v "lib/services/|lib/api/"
```

**Checagens adversariais:** (1) *dívida paga ou supressão removida com violação viva?* →
**sobreviveu como "paga"**: os arquivos não importam mais os símbolos restritos, então o lint
está verde por mérito; (2) *o filtro de caminho foi normalizado?* → sim, `tr '\\' '/'` — sem
isso o comando devolve 19 falsos positivos neste ambiente win32 — **sobreviveu**.

**Barreira sugerida:** nenhuma conhecida em ferramenta; o gate de aceitação do spec já é a
barreira certa, só precisa ser reexecutado quando a dívida muda.

---

### F4 · Um controller constrói o próprio serviço em vez de pedir à factory
**Dano 1 · exposição apenas-teórico · confiança alta · reversível**

`server/src/controllers/documentsController.ts:317` faz `new DocumentProcessingService()`
dentro do handler. É o único bypass de factory nos 34 controllers.

**Impacto:** nenhum hoje.

**Checagens adversariais:** (1) *o construtor é caro ou tem dependência injetável?* →
**derrubou o dano**: `DocumentProcessingService` não declara construtor — é stateless, só
métodos; não há dependência a injetar nem custo por requisição; (2) *outro controller repete
o padrão?* → não, é isolado — **sobreviveu como desvio de contrato**, sem consequência de runtime.

Mantido no relatório porque o contrato exige injeção via Factory e o desvio é real, mas
priorizá-lo acima de qualquer um dos outros três seria confundir regra com risco.

---

## O que foi confirmado como sólido

Cada linha é onde o achado esperado **não** apareceu:

- **Fronteira §2.1** — zero serviço Prisma alcançando o motor de plugins, zero motor
  alcançado a partir de contabilidade. Todos os 13 hits brutos eram comentários documentando
  que a fronteira é respeitada. Existe teste dedicado
  (`no-accounting-imports.boundary.test.ts`) cujo padrão tem braço de **caminho**
  (`features/accounting`), o que cobre Payable/Receivable/Inventory/Sped sem nomeá-los.
- **Atomicidade** — 20 candidatos, **20** com `tx` na janela da própria chamada. Zero
  transação aparente.
- **Gate de invariante mutável** — `EntryApprovalService` tem `assertPeriodOpen` (pré) **e**
  `assertPeriodOpenTx` (dentro do bloco). É o padrão canônico, não o meio-termo.
- **Soft-delete, escrita** — 3 hard-deletes, todos sancionados: o job de expurgo (que é o
  *par* do soft-delete) e a cascata na exclusão do dono, no mesmo arquivo que faz
  `deleteData()` com `update + deletedAt`.
- **Soft-delete, leitura** — os 2 sobreviventes do funil foram **refutados**:
  `findValueById` devolve arquivado de propósito para `dimensionTagging.ts:41` rejeitar por
  `status !== 'ACTIVE'` com mensagem precisa. Filtrar no repositório pioraria o erro.
- **Estoque `zinc-`** — 33, exatamente o baseline declarado no spec.
- **Toques 1 e 2 de rota** — toda rota montada em `index.ts`, toda feature com `services/`
  presente na factory.

---

## Honestidade metodológica

**Um comando meu estava errado, e o erro foi instrutivo.** A derivação de models com
`deletedAt` usava `awk '/^model /{m=$2} /deletedAt/{print m}'`, que atravessa o fecha-chaves e
atribui ao último `model` visto qualquer ocorrência solta. Classificou `ReferentialMapping`
como tendo soft-delete — e a linha que enganou o comando era um **comentário dizendo "SEM
deletedAt:"**. A palavra que declara a ausência do campo virou prova da presença dele.

Consequência: 15 models viraram 14, C9a caiu de 4 para 3 hits e C9b de 4 sobreviventes para 2.
Os dois descartados (`ReferentialMappingRepository`) nunca foram achado — o model não tem o
campo e o repositório documenta isso na linha 14. O instrumento foi corrigido (guarda `inb`) e
a armadilha ficou documentada nele.

**Não executado, e o que isso custa:** sem `node_modules`, o teste de fronteira do C1 não
rodou — a solidez daquela dimensão se apoia em leitura estática do padrão `FORBIDDEN`, não na
execução. `tsc` e `lint` também não rodaram, então não posso afirmar que a base compila nem
que R1/R1b seguem verdes; assumi que sim porque o CI barraria, o que é inferência sobre o
pipeline, não medição deste worktree.

**C3 não foi medido.** Comparar "39 arquivos citam `MAX_CENTS`" com "65 escrevem centavos" é
razão, não localização: não diz qual caminho de escrita escapa do choke-point. Deixei como não
medido em vez de converter a razão em achado.

**Viés próprio:** eu escrevi C8, C9 e C10 no turno anterior e calibrei os números que agora
usei como referência. Um instrumento auditado por quem o escreveu tende a confirmar o próprio
recorte — três das quatro dimensões novas devolveram exatamente o que eu tinha previsto, e a
única surpresa (o `awk`) só apareceu porque um sobrevivente não fazia sentido na leitura. Se
alguém for revisar este relatório, é por C3 e C6 que eu começaria: são as duas dimensões onde
eu aceitei um número sem localizar o que ele conta.

---

## Três movimentos mais baratos

| # | Movimento | O que remove | Esforço | Contido? |
|---|---|---|---|---|
| 1 | Aplicar o parse date-only no `Lead360Modal:226`, preservando as opções de formato longo | F1 — data errada na tela | uma linha + um caso em `dates.test.ts` | sim |
| 2 | Atualizar as seções de dívida viva de R1/R2 e o item 4 do gate de aceitação em `lint-layer-gate.md` | F3 — backlog apontando para o vazio | só documentação | sim |
| 3 | Adicionar `safeParse` nos dois handlers de `analyticsDefinitionsController` | F2 — última entrada sem fronteira | um schema Zod + 2 guardas | sim |

O movimento 1 é o de maior dano e entra obrigatoriamente. O 2 é o mais barato do conjunto e
já tem tarefa aberta. F4 fica fora: dano 1 sem consequência de runtime não compra uma fatia.
