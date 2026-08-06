# AV-R7 · FORÇA DA SUÍTE SOBRE A SUBFILA RATIFICADA — MUTAÇÃO EXECUTADA

Instrumento **AV-03** · v4.1 · `centerpiece.type: mutation_score` · projeto **Luminaris** ·
commit **`40892baa`** · 2026-08-05 · agente `claude-opus-5`

**`mutation_score` = 0 / 7.** As sete mutações sobreviveram, e seis delas foram provadas
**sem serem executadas** — por sonda de `throw` com controle. Nenhuma das 4 unidades da
subfila ratificada tem cobertura alcançável.

**O risco desta rodada é a própria rodada:** ela não foi revisada por agente separado, e o
instrumento que ela usa foi escrito pela mesma linha de trabalho que a emite.

---

## Recorte e execução

**Por que esta rodada existe.** A subfila de 4 unidades de `r2_decision.ratified_subqueue`
(`docs/audit/TRIAGEM-R1-R3.json`) ficou órfã quando o item 4 fechou, e a decisão registrada
foi *"fila própria, não aceite"*. O caminho previsto pelo contrato para transformá-la em item
de fila de verdade é **emitir uma rodada `auditoria/1.1` sobre ela e triar o que ela achar** —
o **B12** do gate proíbe item de triagem cujo `fingerprint` não venha de relatório emitido, e
a subfila vem de `centerpiece.rows` do `AV-R2.json`, cujo `findings` é `[]` por desenho.

Esta é essa rodada. Ela **não tria e não corrige**: o bloco 9 do AV-00 exige emitir → triar →
só então corrigir, e a tentação era concreta (o conserto do F1 é um arquivo de teste por
repositório, no molde que o item 4 já deixou pronto).

**As 4 unidades**, com papel e invariantes como o AV-R2 os declarou:

| unidade | papel | invariantes declaradas |
|---|---|---|
| `server/src/controllers/accountingController.ts` | controller | dinheiro + inquilino + autoriza |
| `.../accounting/repositories/CounterpartyRepository.ts` | repository | tx + inquilino + softdelete |
| `.../accounting/repositories/DimensionRepository.ts` | repository | tx + inquilino + softdelete |
| `.../accounting/repositories/ReferentialMappingRepository.ts` | repository | tx + inquilino + softdelete |

**Por que mutação e não cobertura.** O próprio `why_not_a_queue` da triagem mediu que cobertura
por nome não move força de suíte (`mutation_score` 0,286 no AV-R3). Uma rodada que contasse
testes nomeando estas 4 unidades produziria o número que já se sabe — zero — sem dizer nada
sobre o que a suíte detecta.

### Baseline, antes de qualquer mutação

```
npx tsc --noEmit -p tsconfig.test.json                       exit 0
npx jest --selectProjects unit                               Test Suites: 133 passed, 133 total
                                                             Tests:       1590 passed, 1590 total
OPENAI_API_KEY=… npx jest --selectProjects integration --runInBand
                                                             Test Suites:  32 passed,  32 total
                                                             Tests:        355 passed, 355 total
```

Verde nas duas: **165 suítes / 1945 testes**. Não se mede força de suíte quebrada.

### Protocolo por mutação — o que foi de fato feito

Cada uma das sete saiu do **invariante**, não do arquivo mais fácil de editar, e passou por:

1. aplicação por script com **âncora byte-idêntica verificada** — se a linha alvo não casar, ele
   aborta em vez de mutar o lugar errado. *Controle exercido*: com a âncora já consumida o
   script recusa (`ANCORA NAO CASA`, exit 1), e com o arquivo convertido a LF ele também recusa;
2. `git diff --numstat` **antes** de rodar — as sete deram `1 1` (uma linha trocada). `numstat`
   vazio seria mutação que não muda nada, e mutação que não muda nada não prova nada;
3. `tsc --noEmit -p tsconfig.test.json` — mutação que não compila é **descartada**, não morta
   (as sete compilaram, exit 0);
4. suíte **inteira**, unit **e** integração — "sobreviveu" só é afirmável contra a suíte toda;
5. reversão de **`.bak`**, nunca `git checkout` (armadilha 1 do CONTINUACAO), com `numstat`
   reconferido **vazio** depois de cada uma — sete restaurações, sete vazios.

Ao fim: `git status` do recorte **limpo**, zero `.bak` órfão.

---

## Peça central: placar de mutação

| mutação | sítio | invariante | suíte reagiu? | teste que pegou | veredito |
|---|---|---|---|---|---|
| **M1** filtro de inquilino removido de `findById` | `CounterpartyRepository.ts:24` | inquilino | não | — | **sobreviveu SEM SER EXECUTADA** |
| **M2** leitura padrão passa a devolver arquivados | `CounterpartyRepository.ts:37` | softdelete | não | — | **sobreviveu SEM SER EXECUTADA** |
| **M3** `create` ignora o `tx` recebido | `CounterpartyRepository.ts:15` | tx | não | — | **sobreviveu SEM SER EXECUTADA** |
| **M4** predicado de inquilino removido do `update` | `DimensionRepository.ts:107` | inquilino | não | — | **sobreviveu SEM SER EXECUTADA** |
| **M5** `countActiveValues` conta arquivados | `DimensionRepository.ts:63` | softdelete | não | — | **sobreviveu SEM SER EXECUTADA** |
| **M6** `deleteMany` perde o escopo de dono | `ReferentialMappingRepository.ts:57` | inquilino | não | — | **sobreviveu SEM SER EXECUTADA** |
| **M7** 401 vira 400 em requisição sem autenticação | `accountingController.ts:185` | autoriza | não | — | **sobreviveu — alcance por sonda INVÁLIDO** |

**`mutation_score` = 0/7 = 0,000.** Amostra **dirigida a invariante**, nunca estimativa
estatística — sete é o tamanho de uma rodada, não uma amostra representativa.

### O alcance foi medido, não inferido

O instrumento **proíbe** reportar sobrevivente sem distinguir *a linha não executa* de *executa
e a asserção é fraca*. As duas coisas pedem consertos diferentes.

**As seis sondas dos repositórios foram armadas de uma vez** — um `throw` incondicional como
primeira instrução de cada um dos seis métodos — e a suíte **inteira** ficou:

```
unit         Test Suites: 133 passed, 133 total   Tests: 1590 passed, 1590 total
integração   Test Suites:  32 passed,  32 total   Tests:  355 passed,  355 total
```

165 suítes, 1945 testes, **zero falhas com seis `throw` armados**. Nenhum dos seis métodos é
executado por nenhum teste do repositório.

**CONTROLE da sonda, sem o qual "tudo verde" é indistinguível de sonda que não faz nada:** o
mesmo mecanismo aplicado a `PostingRepository.create` — método que o teste de integração do
item 4 alcança — devolveu `Test Suites: 1 failed, 1 total` / `Tests: 5 failed, 5 total`, com
`PROBE-CONTROLE` na saída. A sonda mata quando o método é alcançado.

**A sonda do M7 foi DESCARTADA por não compilar, e isso é a armadilha 3b do próprio
instrumento acontecendo.** O `throw` no topo de `deleteAccount` torna todo o corpo abaixo
inalcançável, e o TypeScript **perde o narrowing** em código inalcançável — três erros
(`'parsed.error' is possibly 'undefined'`, `'parsed.data' is possibly 'undefined'`,
`Argument of type 'UserContext | null'`). Sonda que não compila derruba a suíte ao carregar, e
isso é resultado **inválido**, não morte. O alcance do M7 fica estabelecido **estaticamente**
(ver F2), e a lacuna está declarada em `not_measured`.

---

## Achados

### F1 · dano 4 · `repositorios-da-subfila-sem-cobertura-alcancavel`

**Os três repositórios da subfila não são executados por nenhum teste.** Seis mutações sobre
`tx`, `inquilino` e `softdelete` sobreviveram, e a sonda provou que os seis métodos nunca
rodam. O mecanismo foi lido no código, não suposto:

- **os testes de serviço montam um repositório FALSO à mão.**
  `CounterpartyService.test.ts` constrói `{ create: jest.fn(...), findById: jest.fn(...), … }`
  e afirma o falso. O repositório real nunca entra no processo.
- **os testes de integração vizinhos escrevem DIRETO em `db.*`**, reimplementando o que o
  repositório faz. Três arquivos fazem isso (`ReferentialMapping`, `CounterpartyBackfill`,
  `PostingDimension`).

**O caso mais agudo, e ele é literal:** existe `ReferentialMapping.integration.test.ts`, ele
exercita `db.referentialMapping.deleteMany(...)` e depois **afirma isolamento por dono**
(`findMany({ where: { userId, unitId } })`). O M6 remove exatamente esse escopo do
`deleteByAccountVersion` do repositório — e o arquivo passa verde. **O teste que afirma a
invariante não pode pegar a violação dela, porque reimplementa o repositório em vez de
chamá-lo.**

**O contraste que separa alcance de classe de mutação:** o M3 desta rodada (perna fora da `tx`)
é a **mesma classe** do M3 do AV-R3. Lá, depois de o item 4 escrever o teste de integração, a
mutação morreu com assinatura **total** — 5/5 falhas por deadlock contra SQLite real. Aqui ela
é **muda**. O que decide não é a classe da mutação: é o alcance.

**business_impact** — `deleteByAccountVersion` sem escopo apaga o de-para RFB de **todos os
donos** para aquela conta/versão. É perda de dado cruzando inquilino, na trilha que alimenta a
geração de SPED ECD/ECF, e nada na suíte reprova.

**Demonstração (3 s, sem rodar suíte):**
```
cd server && grep -rlE "CounterpartyRepository|DimensionRepository|ReferentialMappingRepository" src --include=*.test.ts | wc -l
```
→ **0**. Controles no mesmo comando: 139 arquivos de teste existem; o mesmo comando com
`PostingRepository` devolve **10**; os três arquivos existem no disco (**3**).

### F2 · dano 3 · `controller-de-contabilidade-sem-alcance-http`

**23 handlers exportados, zero testes de rota.** Dos 13 arquivos de integração que usam
supertest, **nenhum** requisita `/api/accounting*`; o controle no mesmo comando mostra **2**
requisitando `/api/users`. As 7 ocorrências de `/api/accounting` no corpus de teste são do
**middleware** de auth e de comentários de contagem — nenhuma atravessa o controller.

É barreira **diferente** da do F1 (teste de rota, não de repositório), por isso achado separado:
fechar o F1 não fecha este.

**O dano NÃO é bypass de autenticação, e isso está medido.** O middleware é deny-by-default e
já devolve 401 para `/api/accounting/*`, com testes fixando barra final, query string e header
de identidade forjado. A guarda do controller é **segunda camada**; o M7 degrada
defesa-em-profundidade (401 → 400), não abre porta. Overstatement recusado.

O que sobra, e é real: os 23 handlers fazem o roteamento de escopo
(`resolveAccountingScope(user, unitId)` a partir de `unitId` vindo do cliente) sem nenhum teste
que exercite a rota de ponta a ponta.

### F3 · dano 2 · `softdelete-etiquetado-em-unidade-que-nao-tem-soft-delete`

O `AV-R2.json` etiqueta `ReferentialMappingRepository` como `tx+inquilino+softdelete`. **O
model `ReferentialMapping` não tem campo `deletedAt`** (`grep` no bloco do schema devolve **0**;
o controle no model `Counterparty` devolve **2**), e a única ocorrência da palavra no
repositório é o comentário que a **nega**: *"No soft-delete (D5): unset is a real delete, so
reads carry no deletedAt filter"*. Com comentários removidos, `deletedAt` em código:
**0** no `ReferentialMappingRepository`, **2** no `CounterpartyRepository` (controle).

**Por que não é cosmético:** o critério de ratificação da subfila é *"as 4 linhas que carregam
TRÊS invariantes nomeadas ao mesmo tempo"*. Uma das quatro carrega **duas**. O critério que
justificou a fila própria em vez do aceite fica mais fraco em 1 de 4 — e continuou verdadeiro
para as outras três, então a decisão não cai; o que cai é a limpeza do número.

É a mesma classe da **armadilha 8** do CONTINUACAO (nome de invariante casa dentro de
comentário que diz o contrário), agora medida num instrumento que não é o meu. A armadilha foi
escrita depois de eu cometê-la no item 5; encontrá-la no AV-R2 é a primeira evidência de que
ela é de classe, não de sessão.

### F4 · dano 1 · `fan-in-do-simbolo-concreto-le-1-sob-injecao-por-interface`

O `AV-R2` atribui `fanin: 1` às quatro unidades, **e o número está certo** — é o que engana.
Imports do símbolo **concreto**, fora de `__tests__`: **1** para cada um dos três repositórios,
e o único importador é `lib/factory.ts`. Todo serviço importa a **interface**:
`ICounterpartyRepository` **3**, `IDimensionRepository` **5**, `IReferentialMappingRepository`
**1**. Controle: `PostingService`, que não tem interface, dá fan-in **7**.

Consequência: num codebase que injeta por interface via factory, **fan-in do símbolo concreto
lê 1 para todo repositório**, então fan-in não ranqueia repositório aqui. É o irmão de
`cbm-indegree-underreports-frontend` — mesma classe (métrica de grafo cega ao mecanismo de
ligação), mecanismo diferente.

### F5 · dano 2 · `agent-authored-ratio-sem-denominador-declarado`

O campo `run.agent_authored_ratio` do R1/R3/R6 declara `0.941` com
`identity_rule: "trailer Co-authored-by contendo Claude"` e **não diz qual denominador usa**.
Medido por commit (não por linha de saída — a primeira tentativa contou linhas de trailer e deu
um número errado):

| denominador | conta | ratio | teto do §2.2 (`> 0.70`) |
|---|---|---|---|
| todos os commits (inclui 219 merges, que nunca carregam trailer) | 425/654 | **0,650** | **não ativa** |
| sem merges | 416/435 | **0,956** | **ativa** |

**Por que não é cosmético:** o **B8** do gate liga o teto de confiança em `ratio > 0.70`. Com
0,650, `confidence: alta` passaria por leitura ou revisão; com 0,956, só execução sustenta alta.
Os dois números saem do mesmo comando e caem em lados **opostos** da mesma regra.

Esta rodada adota **0,956** — o número que a constrange mais — e declara os dois.

---

## Placar

| dim | rótulo | nível | máx | justificativa |
|---|---|---|---|---|
| **T1** | Força | **0** | 4 | 0 de 7. Nada morre. |
| **T2** | Sobreviventes | **0** | 4 | 6 de 7 provadas sem execução por sonda com controle; a 7ª por estática. |
| **T6** | Determinismo | **3** | 4 | 10 execuções completas da suíte nesta rodada (baseline + 7 mutações + sonda + controle), contagens idênticas, zero instáveis. |

Teto de 3 em todas: **não existe gate que reprove o build quando uma mutação sobrevive** — o
nível 4 da escala é inalcançável por desenho atual, e não por desempenho desta suíte.

T3 (asserção real), T4 (fronteira coberta) e T5 (cobertura) **não foram remedidos** — ver
`not_measured`.

---

## Não medido

| id | o que | por que | consequência |
|---|---|---|---|
| **NM1** | alcance do M7 por sonda | o `throw` no topo de `deleteAccount` quebra o narrowing do TS em código inalcançável (3 erros) — sonda inválida, não morte | o alcance do M7 fica estabelecido **estaticamente** (F2: 0 de 13 arquivos supertest tocam a rota); o veredito dele é "sobreviveu", sem a classificação dinâmica que os outros seis têm |
| **NM2** | `my-app` | fora do recorte desta rodada por desenho — o alvo são 4 unidades de `server/src` | nada aqui fala do frontend; a força da suíte dele é o `4/7` do AV-R5 |
| **NM3** | cobertura de linha | fora do escopo do instrumento por desenho | nenhum percentual produzido nem citado |
| **NM4** | mutações além das 7 | orçamento | o placar é amostra dirigida a invariante, não estimativa estatística |
| **NM5** | T3 e T4 do placar | medi 3452 ocorrências de `expect(` em `*.test.ts`, e o AV-R3 declarou 3798 "asserções" por um método diferente (`rg` sobre o corpus) — dois números não comparáveis | **nenhum nível de T3/T4 foi emitido**, em vez de emitir um nível a partir de número incomparável |
| **NM6** | consequência em runtime do M6 | exigiria subir a stack e observar o `deleteMany` cruzando inquilino contra base real | o achado se sustenta por mutação + sonda; a consequência é lida do código (`deleteMany` sem `userId`/`unitId`), não observada |

---

## Três movimentos mais baratos

| movimento | fecha | por que | esforço |
|---|---|---|---|
| Um teste de integração por repositório, chamando o repo pelo **factory**, no molde de `PostingServiceLedgerWrite.integration.test.ts` | F1 | é o molde que o item 4 já deixou pronto e provou morder — as mesmas duas classes de bug (tx, inquilino) morreram lá | médio |
| Um teste de rota supertest sobre `/api/accounting`, no molde de `users.routes.integration.test.ts` | F2 | 13 arquivos já sobem o app com supertest; falta um que aponte para esta rota | baixo |
| Corrigir a etiqueta `invariantes` da linha do `ReferentialMappingRepository` no `AV-R2.json` e declarar o denominador do `agent_authored_ratio` | F3, F5 | duas edições de dado em artefato de auditoria, sem tocar código | trivial |

---

## Inquérito

| pergunta | responsável por | por que importa |
|---|---|---|
| Quantos dos 30 repositórios Prisma do projeto estão na mesma situação — serviço com repo falso à mão e integração escrevendo em `db.*`? | repetir a sonda de `throw` repo a repo, uma execução por lote | se o padrão for geral, o achado deixa de ser sobre 3 unidades e passa a ser sobre a forma de testar do projeto |
| A etiqueta `invariantes` do AV-R2 foi produzida por `grep` sem remover comentários? | reexecutar a heurística do AV-R2 nas 110 linhas e comparar com leitura de schema | se sim, as 110 linhas todas têm o mesmo viés, e o `ratified_subqueue_criterion` precisa ser recalculado |
| Qual denominador o `0.941` do R1 usava? | `git log` no commit do R1, pelos dois ramos | decide se o teto do §2.2 esteve ativo nas três rodadas que citaram o número |

---

## Auto-verificação

1. **Citei cobertura como garantia?** Não. Nenhum percentual foi produzido; T5 está em
   `not_measured` por desenho.
2. **Placar tem mutação que não foi aplicada de fato?** Não. As sete têm `numstat 1 1`
   registrado antes de rodar e restauração conferida vazia depois.
3. **Sobrevivente que não virou achado?** Não. Os seis dos repositórios são o F1; o do
   controller é o F2.
4. **Suíte declarada verde sem execução?** Não. Dez execuções completas, contagens coladas.
5. **Árvore suja?** Não. `git status` do recorte limpo, zero `.bak` órfão.
6. **Contei morte sem `Tests: N failed`?** Não conto nenhuma morte: `mutation_score` é 0/7.
   O único `Tests: N failed` desta rodada é o do **controle** da sonda (5 failed), e ele está
   rotulado como controle, não como morte.
7. **Sonda inválida contada como resultado?** Não. A do M7 está em `not_measured` (NM1).

**Sem revisão independente.** O AV-00 §9.4 rejeita PASS emitido pela mesma sequência, e esta
rodada foi medida e escrita pela mesma. O que existe no lugar é controle em cada falsificador e
controle na sonda — e controle não é revisão.

**Viés próprio, nomeado.** Três:

1. **Eu decidi que a subfila viraria fila própria e agora emiti a rodada que a justifica.**
   O resultado 0/7 confirma a decisão que eu mesmo tomei duas horas antes. Ele é medido e
   controlado, e continua sendo conveniente para mim.
2. **Sete de sete sobreviveram — zero refutações.** Igual ao 7/7 confirmado da
   `TRIAGEM-R1-R3`, e suspeito pela mesma razão: quem escolheu os sítios foi quem esperava o
   resultado. O contrapeso real é a **sonda com controle**, que é falsificável por fora: se os
   métodos executassem, o controle mostra que a sonda mataria.
3. **O F3 me favorece.** Ele encontra num instrumento alheio a armadilha que eu registrei
   depois de cometê-la, o que faz a minha armadilha parecer descoberta de classe em vez de erro
   meu. A medição está de pé; a leitura de que isso me credita, não.
