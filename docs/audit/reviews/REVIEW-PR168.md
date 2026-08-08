# Revisão independente — PR #168 (AV-R7 · FORÇA DA SUÍTE SOBRE A SUBFILA RATIFICADA)

- **Revisor:** agente revisor isolado (worktree próprio, nenhuma participação na autoria, na triagem ou na escolha do recorte)
- **Data:** 2026-08-07
- **PR:** #168 — merge `60c945bc` (branch `claude/audit-av-r7-subfila`, relatório emitido em `ec3e4feb`)
- **Worktree de revisão:** `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rv-168` (detached em `18b14b12`)
- **Lente recebida:** a medição sustenta a afirmação? (força de suíte, alcance de execução)

### Contra qual árvore eu medi — declarado, porque muda o número

Duas árvores, e eu digo qual em cada linha deste relatório:

| apelido | o que é | como eu a obtive |
|---|---|---|
| **HEAD** | `18b14b12` — o mundo **pós-#171** | o worktree como me foi entregue |
| **BASE** | árvore de código de **`40892baa`** — o mundo que a rodada mediu | HEAD **menos** os 4 arquivos que o #171 acrescentou, movidos para fora da árvore e devolvidos depois |

Duas medições sustentam que esse "menos 4 arquivos" **é** a árvore da rodada, e não uma aproximação minha:

```
git diff --name-only 40892baa 18b14b12 -- server/
  → exatamente 4 arquivos, todos *.integration.test.ts (os do PR #171)
git diff --stat 40892baa ec3e4feb -- server/
  → VAZIO (a árvore de código no commit do relatório é byte-idêntica à base)
```

**A premissa que me foi passada — de que a rodada não nomeou o commit com precisão — está errada e é a primeira coisa que cai.** O artefato traz `run.repo_commit: "40892baa"`, os commits da branch (`ec3e4feb`, `9a3ef0c5`, `686aa2a4`) só tocam `docs/audit/`, e por isso o número do autor é **exatamente reproduzível** a partir do commit que ele nomeou. Eu o reproduzi (§3).

---

## 2. Veredito

**`revisado_com_ressalva`.** A alegação central **se sustenta e eu a reproduzi com um instrumento diferente do dele**: na árvore BASE, com oito sondas armadas e controle **dentro da mesma execução**, os seis métodos dos repositórios disparam **zero** vezes contra 165 suítes / 1945 testes, enquanto o controle (`PostingRepository.create`) dispara **12** — `mutation_score` 0/7 é consequência necessária disso, não asserção de fé.

O risco principal não é o 0/7: é que **a rodada subdeclara a própria classe que descobre**. O F3 diz "1 de 4 unidades carrega uma invariante que não existe"; medindo as **110** linhas do AV-R2 com o mesmo instrumento dele (grep com comentários removidos), o rótulo `dinheiro` não tem lastro em **3 de 5** linhas — duas delas vindas de comentário que diz literalmente *"NO money"* — e uma dessas é o `accountingController.ts`, **segunda unidade da própria subfila**. O critério de ratificação ("as 4 linhas com três invariantes simultâneas") vale, medido, para **2 de 4**, não 3 de 4.

Eu **não corrigi nada** — estou proibido, e não toquei em nenhum artefato do #168. Se pudesse reprovar, **não reprovaria**: nenhum número da peça central está errado, e o único item que eu classificaria como defeito de método (o `not_measured` NM1) foi declarado pelo autor em vez de escondido. Worktree `rv-168` confirmado limpo ao fim (§10).

---

## 3. O que reexecutei

Tudo abaixo rodei eu, no meu worktree. **O controle vem antes de qualquer conclusão**: sem baseline verde no MESMO harness, "sonda não disparou" é indistinguível de "suíte não rodou".

| execução | árvore | saída |
|---|---|---|
| `npx tsc --noEmit -p tsconfig.test.json` (limpo) | HEAD | exit 0 |
| `npx jest --selectProjects unit` | HEAD | `Test Suites: 133 passed, 133 total` · `Tests: 1590 passed, 1590 total` |
| `npx jest --selectProjects integration --runInBand` | HEAD | `Test Suites: 36 passed, 36 total` · `Tests: 398 passed, 398 total` |
| `npx jest --selectProjects integration --runInBand` | **BASE** | **`Test Suites: 32 passed, 32 total` · `Tests: 355 passed, 355 total`** |

**O baseline do artefato bate byte a byte.** O autor declarou `133/1590` (unit) + `32/355` (integração) = **165 suítes / 1945 testes**; eu obtive `133/1590` + `32/355` = **165 / 1945** na árvore BASE. Os 4 arquivos do #171 são todos `*.integration.test.ts` e o projeto `unit` os exclui por `testPathIgnorePatterns`, então a contagem unit é a mesma nas duas árvores — verificado no `jest.config.js`, não assumido.

**Falsificadores estáticos do autor, reexecutados contra `40892baa` (não contra HEAD):**

| comando (recorte `server/src/**/*.test.ts` em `40892baa`) | esperado pelo autor | obtido por mim |
|---|---|---|
| arquivos de teste citando os 3 repositórios | 0 | **0** |
| **controle** — arquivos citando `PostingRepository` | 10 | **10** |
| **controle** — total de `*.test.ts` | 139 | **139** |
| arquivos de integração usando supertest | 13 | **13** |
| desses, os que requisitam `api/accounting` | 0 | **0** |
| **controle** — os que requisitam `/api/users` | 2 | **2** |
| handlers exportados no controller | 23 | **23** |

Os três controles importam mais que os três zeros: zero é o resultado mais fácil de obter por acidente (armadilha 3 — padrão iniciado por `/` no Git Bash devolve zero por conversão de caminho). Nenhum dos meus padrões começa com `/`.

---

## 4. Minhas próprias sondas e mutações

**Meu instrumento não é o dele.** Em vez de `throw`, cada sonda é `require('fs').appendFileSync(<log>, 'FIRE <id>\n');` inserida como primeira instrução do método. Três vantagens que são a razão de eu não ter só repetido o comando dele:

1. **não altera fluxo** → não quebra narrowing do TS (armadilha 2 é estruturalmente impossível);
2. **não derruba suíte** → "Test Suites: falhou / Tests: 0 failed" (armadilha 1, resultado inválido) não pode acontecer;
3. **conta chamadas em vez de matar na primeira** → o controle fica **dentro da mesma execução** que as sondas, e não numa execução separada. Se a suíte não tivesse rodado, o controle também teria dado zero.

Isso me deixou armar **oito** sondas de uma vez sem o risco de mascaramento que motivou a instrução de armar uma a uma: a preocupação era uma sonda inválida invalidar o lote, e uma sonda que não muda tipo nem fluxo não tem como invalidar nada. Ainda assim confirmei por `tsc` antes de aceitar cada verde.

| sonda | sítio | compila? | `numstat` | árvore BASE — disparos | árvore HEAD — disparos | leitura |
|---|---|---|---|---|---|---|
| M1 | `CounterpartyRepository.findById` | sim (exit 0) | 3 0 (arquivo) | **0** | 7 | não executada na BASE |
| M2 | `CounterpartyRepository.findManyByUnit` | sim | idem | **0** | 3 | não executada na BASE |
| M3 | `CounterpartyRepository.create` | sim | idem | **0** | 15 | não executada na BASE |
| M4 | `DimensionRepository.updateValue` (linha 107) | sim | 2 0 | **0** | 1 | não executada na BASE |
| M5 | `DimensionRepository.countActiveValues` | sim | idem | **0** | 7 | não executada na BASE |
| M6 | `ReferentialMappingRepository.deleteByAccountVersion` | sim | 1 0 | **0** | 4 | não executada na BASE |
| M7 | `accountingController.deleteAccount` | sim | 1 0 | **0** | **0** | não executada em NENHUMA das duas |
| **CTRL** | `PostingRepository.create` | sim | 1 0 | **12** | 26 | **controle disparou — a suíte rodou** |

`tsc --noEmit -p tsconfig.test.json` com as oito sondas de log armadas: **exit 0, zero erros**.

**Sonda de `throw` — reprodução literal da armadilha 3b do autor.** Rearmei os mesmos oito sítios com `throw new Error('PROBE-<id>')` e rodei só o `tsc`:

```
TSC_EXIT=2
src/controllers/accountingController.ts(193,60): error TS18048: 'parsed.error' is possibly 'undefined'.
src/controllers/accountingController.ts(195,42): error TS2345: Argument of type 'UserContext | null' is not assignable ...
src/controllers/accountingController.ts(195,48): error TS18048: 'parsed.data' is possibly 'undefined'.
```

**Três erros, exatamente os três que ele nomeia, e só no controller** — os seis `throw` dos repositórios compilam. A armadilha 2 é real, a descrição dela no artefato é exata, e a distinção "método de repositório de 1-3 linhas compila / handler não" está certa.

**Mutação minha, própria, fora do placar dele — M6′ em HEAD.** Para responder o que o placar dele não responde (alcance ≠ morte), apliquei na `deleteByAccountVersion`:

```
- where: { userId, unitId, accountId, mappingVersion },
+ where: { accountId, mappingVersion },
```
`numstat 1 1` · `tsc` exit 0 · integração em HEAD: **`Test Suites: 1 failed, 35 passed` / `Tests: 1 failed, 397 passed`**, no teste `inquilino: delete de outro dono não apaga nada — a linha do dono original sobrevive`. Revertida de `.bak`, `numstat` vazio depois.

**Armadilha 5 (todo caso negativo precisa de controle) aplicada ao meu próprio protocolo:** o zero da coluna BASE só vale porque a coluna CTRL da MESMA execução é 12. E o meu M6′ só vale como "morte" porque tenho o `Tests: N failed` explícito — não conto morte por exit code.

---

## 5. Alegações que caíram

**C1 · "o alcance do M7 não é mensurável por sonda" (`not_measured` NM1) — cai como propriedade do sistema; sobrevive como propriedade do `throw`.**
O autor conclui, corretamente, que a sonda de `throw` no `deleteAccount` é inválida. Mas ele registra a consequência como *"o alcance do M7 fica estabelecido **estaticamente**"* — e não fica: **é dinamicamente mensurável**, basta a sonda não alterar fluxo. Medi: **zero disparos** em `deleteAccount` nas 165 suítes da BASE. A direção da conclusão dele está certa; o `not_measured` era evitável, e o que a rodada declarou como limite do mundo era limite do instrumento escolhido.

**C2 · "primeira evidência de que a armadilha é de classe, não de sessão" (F3) — cai por subdeclaração.**
Varri as **110** linhas do `centerpiece` do AV-R2 com o instrumento do próprio F3 (comentários removidos, contagem de marcador em código):

| rótulo | linhas rotuladas | sem lastro em código |
|---|---|---|
| `inquilino` | 33 | **0** |
| `softdelete` | 5 | **2** (`ReferentialMappingRepository.ts`, `DocumentAttachmentDto.ts`) |
| `autoriza` | 6 | **1** (`ReferentialCatalogDto.ts`) |
| `dinheiro` | 5 | **3** (`accountingController.ts`, `DimensionDto.ts`, `CounterpartyDto.ts`) |

E o mecanismo é literalmente o mesmo que o F3 descreve — rótulo colhido de comentário que **nega** a invariante:

- `DimensionDto.ts:6` — *"A dimension carries **NO money** and NO dates ... there is no MAX_CENTS ... concern here"* → rotulada `dinheiro+inquilino`.
- `CounterpartyDto.ts:6` — *"NO money, NO dates, so there is no MAX_CENTS ... concern"* → rotulada `dinheiro+inquilino`.
- `accountingController.ts` — a **única** ocorrência de `Cents` no arquivo está em comentário swagger (linha 431); em código, zero.

**Autorrefutação da minha própria manchete, porque ela não é toda da mesma força:** o `deletedAt` do `ReferentialMapping` **não existe em lugar nenhum** (0 no bloco do schema; controle `Counterparty` = 2) — o rótulo é *falso*. Já `DocumentAttachmentDto` é comentário-derivado mas **verdadeiro** (o model `DocumentAttachment` tem `deletedAt`, contei 2). E `dinheiro` num controller que roteia `/post` e `/trial-balance` é defensável no domínio ainda que ausente do código dele. Então: **falsos** provados = 1 (o do autor); **comentário-derivados** = pelo menos 4; e a consequência que interessa é que **2 das 4 unidades da subfila** (não 1) têm a terceira invariante sem lastro em código.

**C3 · rótulo do M4 na peça central.** A linha diz *"predicado de inquilino removido do `update`"*; o sítio declarado (`DimensionRepository.ts:107`) é o **`updateValue`** — `update` é a linha 54, de `DimensionDefinition`. O sítio está certo, o nome está errado, e a peça central é onde isso menos podia acontecer.

**C4 · a premissa do meu próprio encargo.** "O número do autor só vale num commit que ele não nomeou com precisão" — falso, e medido em §1.

---

## 6. Alegações que sobreviveram

| alegação | como tentei derrubar | resultado |
|---|---|---|
| **`mutation_score` 0/7** | sonda de contagem independente + controle in-run; verificação de que os 7 sítios existem e são os declarados | **de pé.** Não-execução dos 7 sítios **implica** sobrevivência das 7 mutações; nenhum caminho estático (snapshot, spec) as observaria |
| **"seis provadas sem serem executadas"** | procurei o caso barato — sonda em método que **ninguém chama**, onde "não executa" é trivialmente verdadeiro | **de pé, e não é trivial.** Os 6 têm chamador de produção: `CounterpartyService:61,118`, `PayableService:602`, `ReceivableService:507`, `DimensionService:115,225`, `ReferentialMappingService:286`. O 7º (`deleteAccount`) está na rota `routes/accounting.ts` |
| **baseline 165 / 1945 verde** | reexecutei as duas suítes na BASE | **de pé, idêntico** |
| **CONTROLE da sonda mata quando alcança** | meu CTRL disparou 12× (BASE) / 26× (HEAD) no mesmo método; e minha M6′ matou um teste em HEAD | **de pé** |
| **F1 · três repositórios sem cobertura alcançável** | falsificador + controles no commit certo | **de pé** (0 · controles 10 / 139 / 3) |
| **F2 · 23 handlers, zero teste de rota** | idem | **de pé** (13 supertest · 0 accounting · controle 2 `/api/users`) |
| **(c) o caso mais agudo — o teste reimplementa o repositório** | li o arquivo e cruzei com a sonda | **de pé, literalmente.** `ReferentialMapping.integration.test.ts` instancia o **próprio** `PrismaClient` e chama `db.referentialMapping.*` direto: `deleteMany` na linha 112, e `cross-unit isolation` na 122 afirmando `findMany({ where: { userId, unitId } })`. Nunca importa o repositório — e minha sonda confirma **0 disparos** em `deleteByAccountVersion` na suíte inteira |
| **(d1) o M7 NÃO é bypass de autenticação** | tentei achar rota de contabilidade sem guarda | **autorrefutação real.** `app.use(authMiddleware)` na linha 49 vem **antes** de `app.use('/api', routes)` (52); `middleware/__tests__/auth.test.ts` fixa 401 para `/api/accounting/` (barra final), `?query`, path percent-encoded, headers de identidade forjados e **deny-by-default** (`/api/some-future-module` → 401) |
| **(d2) o fan-in do AV-R2 está CERTO** | recontei | **autorrefutação real.** Concreto = **1** para os três, e o único importador é `src/lib/factory.ts`. Interface: `ICounterpartyRepository` 4, `IDimensionRepository` 6, `IReferentialMappingRepository` 2 (contei 1 a mais que ele em cada — meu recorte inclui o próprio concreto e o factory; a direção é idêntica). Controle `PostingService` = **7** |
| **F5 · os dois denominadores caem em lados opostos** | rodei minha própria contagem em `18b14b12` | **de pé:** `443/676 = 0,6553` com merges · `432/451 = 0,9579` sem. O autor: 0,650/0,956; a triagem: 0,6505/0,9566. A métrica anda sozinha a cada commit de auditoria — e isso reforça o achado dele em vez de enfraquecê-lo |

As duas autorrefutações de (d) são **de verdade**, não performáticas: cada uma tem consequência de texto visível (o F2 foi retitulado; o F4 mudou de "o número está errado" para "o número está certo e não ranqueia"), e as duas **reduzem** a manchete do próprio autor. Um processo que só confirma não escreve "overstatement recusado".

---

## 7. A distribuição 5/5 no mesmo portão — minha derivação independente

**Primeiro, uma correção de endereço: o 5/5 não é do PR #168.** O relatório da rodada propõe `bloqueia_primeiro_cliente` para **2** achados (F1, F2) e `aceito_com_registro` para **3** (F3, F4, F5). O 5/5 é da **TRIAGEM-AV-R7** (PR #169), que sobrescreveu os três aceites. Revisar o #168 pelo 5/5 é cobrar dele um número que ele não emitiu.

**Minha derivação, a partir da fonte e não da memória.** Li `gateMap()` em `docs/audit/bancada.html:2298-2310`. O perfil é `deployed = "nunca implantado"` (respondido pelo dono, registrado no CONTINUACAO), que cai no ramo final:

```
irreversível ou perda de dado → bloqueia_deploy
ja_exposto                    → bloqueia_primeiro_cliente
com_dado_de_terceiro          → bloqueia_primeiro_cliente
apos_deploy não irreversível  → bloqueia_primeiro_cliente
latente_por_dependencia       → aceitavel_com_registro com gatilho nomeado
com_volume e apenas_teorico   → aceitavel_com_registro com gatilho
```

| achado | `exposure` declarado | portão que EU derivo | triagem | bate? |
|---|---|---|---|---|
| F1 | `ja_exposto` | bloqueia_primeiro_cliente | idem | sim |
| F2 | `ja_exposto` | bloqueia_primeiro_cliente | idem | sim |
| F3 | `ja_exposto` | bloqueia_primeiro_cliente | idem | sim |
| F4 | `ja_exposto` | bloqueia_primeiro_cliente | idem | sim |
| F5 | `ja_exposto` | bloqueia_primeiro_cliente | idem | sim |

**A derivação é mecânica — e é por isso que ela não prova nada.** No ramo vigente o portão é **função de uma variável só**, `exposure`. Dizer "5/5 no mesmo portão" é reescrever "5/5 receberam `ja_exposto`". A uniformidade suspeita está **um nível acima**, na atribuição de `exposure`, que é julgamento: a lista fechada (`bancada.html:532`) tem seis valores e nenhuma definição operacional por valor. Um F5 que é metadado errado num artefato de auditoria caberia em `apenas_teorico` sem violar nada escrito — e `apenas_teorico` sai em `aceitavel_com_registro`. **Ninguém checou esse degrau**, e é ele que decide.

Duas observações que o "portão escolhido e justificado depois" não explica:

1. **O julgamento disponível foi usado para BAIXAR, não subir.** A primeira linha do ramo é `irreversível ou perda de dado → bloqueia_deploy`, e o `business_impact` do F1, escrito pelo próprio autor, diz *"perda de dado cruzando inquilino"*. Ele declinou a promoção explicitamente (*"ausência de teste não é ela mesma irreversível nem perde dado"*) — leitura que eu considero correta, e que é o oposto de escolher o portão pelo alarme.
2. **O gate não confere isso.** `scripts/bancada-gate.mjs` valida em **B14** apenas que `gate` está na lista fechada (`bloqueia_deploy | bloqueia_primeiro_cliente | aceito_com_registro | descartado`); **nenhuma checagem deriva o portão a partir do `exposure`**. "Derivação mecânica" aqui é disciplina de prosa, não regra executada — exatamente a classe `gate eval prova o texto, não o app`.

**Veredito da seção:** a derivação **é** mecânica e eu cheguei ao mesmo resultado; a distribuição 5/5 não é evidência de portão escolhido a posteriori; e o degrau que de fato carrega o julgamento (`exposure`) não é revisado por ninguém nem lido por nenhum gate.

---

## 8. Achados novos (não corrigidos)

**N1 · dano 3 · `integracao-irrodavel-em-worktree-com-generated-symlinkado`**
A suíte de integração **não roda** num worktree cujo `server/generated` é symlink para outro worktree — e falha de um jeito que parece defeito de produto. Minha primeira execução em HEAD deu `Test Suites: 25 failed, 11 passed` / `Tests: 354 failed`, com `The table main.User does not exist in the current database`. Causa medida: `test/jest.setupEnv.ts` usa `DATABASE_URL='file:./test-integration.db'` **relativo**; a CLI do Prisma (rodando em `rv-168`) faz `db push` em `rv-168/server/prisma/test-integration.db`, e o **cliente gerado** resolve o mesmo caminho relativo contra o diretório de geração — `intelligent-davinci-11d7b9/server/prisma/` —, onde apareceu um arquivo de **0 byte** criado na hora. O comentário do arquivo afirma o contrário (*"resolves ... for both the Prisma CLI and the generated client, so they always agree"*), e ele **não** vale sob symlink. Quem revisar uma rodada de força de suíte neste arranjo colhe 354 falsos-vermelhos.
*Falsificador de uma linha:* `ls -la <outro-worktree>/server/prisma/test-integration.db` logo após rodar a integração no worktree symlinkado — se ele existe com 0 byte, o cliente e a CLI estão em bancos diferentes.
*Como eu contornei (declarado):* apontei os dois arquivos (`test/jest.setupEnv.ts`, `test/helpers/db.ts`) para um caminho **absoluto** em `%TEMP%`, via `.bak`, e devolvi. Sem isso, nada em §3 e §4 seria medível.

**N2 · dano 2 · `rotulo-dinheiro-do-AV-R2-tambem-vem-de-comentario-que-nega`** — detalhado em C2. O F3 é verdadeiro e subdeclarado: a classe atinge também o eixo `dinheiro`, com dois comentários que dizem *"NO money"* virando rótulo `dinheiro`, e o efeito prático é que **2 das 4** unidades da subfila (não 1) têm a terceira invariante sem lastro em código — o `ratified_subqueue_criterion` fica de pé para metade do que ele afirma.
*Falsificador de uma linha:* `grep -c "Cents\|amount" server/src/controllers/accountingController.ts` com comentários removidos → **0**; com comentários → 1, na linha 431 (swagger).

**N3 · dano 2 · `o-171-fecha-o-F1-mas-so-4-de-23-do-F2`** — o PR #171 fecha o F1 **de verdade** (minha M6′ morre com asserção nomeada, §4: alcance virou morte). Mas o teste de controller do #171 só requisita **4** rotas (`post` ×4, `reverse` ×2, `entries` ×3, `trial-balance` ×1) de **23** handlers, e o sítio exato do **M7 (`deleteAccount`) continua com ZERO execuções em HEAD**. Ou seja: rodado hoje, o M7 **ainda** sobreviveria, e o F2 está fechado em 17% da superfície que ele mede.
*Falsificador de uma linha:* `grep -oE "\.(get|post|put|patch|delete)\('/api/accounting[^']*'" server/src/controllers/__tests__/accountingController.integration.test.ts | sort -u | wc -l` → 4.

**N4 · dano 1 · `peca-central-nomeia-update-e-muta-updateValue`** — C3.
*Falsificador de uma linha:* `sed -n '100,108p' server/src/features/accounting/repositories/DimensionRepository.ts` — a linha 107 está dentro de `updateValue`.

**N5 · dano 1 · confirmação** — as contagens de `linhas` do AV-R2 erram **+1** nas quatro unidades (625/57/143/88 contra `wc -l` 624/56/142/87). O próprio autor registrou isso em `instrument_feedback` do F3; confirmo, e registro que continua não corrigido.
*Falsificador de uma linha:* `wc -l server/src/features/accounting/repositories/CounterpartyRepository.ts` → 56, contra 57 no AV-R2.

---

## 9. O que ficou FORA

| id | o que | por quê | consequência |
|---|---|---|---|
| **O1** | as 7 mutações **do autor**, aplicadas como ele as aplicou | orçamento, e seria repetição: a não-execução dos 7 sítios (medida por instrumento meu) já **implica** as 7 sobrevivências | não confirmei o log de `numstat 1 1` dele mutação a mutação; confirmei que a conclusão é entailment da minha medição |
| **O2** | as "10 execuções completas" que sustentam o T6=3 | não reexecuto determinismo por repetição cega | minhas 3 execuções completas deram contagens idênticas às dele; consistente, não provado |
| **O3** | força dos 3 novos testes de repositório do #171 além do M6′ | é PR #171, não #168 | sei que o M6 morre com **1** teste (o controle do autor em `PostingRepository` matava 5) — alcance está fechado, profundidade não medida |
| **O4** | `my-app` | fora do recorte da rodada (NM2 dela) e do meu | nada aqui fala de frontend |
| **O5** | cobertura de linha | fora do escopo do instrumento | nenhum percentual produzido nem citado |
| **O6** | revisão da **triagem** (#169) e dos gates B1–B17 | meu encargo é o #168 | o §7 usa a triagem como comparação, não a audita |
| **O7** | consequência em runtime do M6 contra base real com stack HTTP de pé | mesma lacuna NM6 do autor | a morte do M6′ é por asserção de teste, não por observação de dano em produção |

---

## 10. Meus próprios vieses, nomeados

1. **Meu instrumento é melhor que o dele, e isso me convém.** A sonda de log evita as duas armadilhas que o `throw` sofre, e eu a escolhi sabendo que ela me deixaria "fechar" o `not_measured` dele. O ganho é real, mas ele me dá um achado de método barato contra alguém que já tinha declarado a lacuna em vez de escondê-la — o que é a conduta certa. Registro que a diferença entre nós dois aqui é **escolha de sonda**, não rigor.
2. **Fui contratado para refutar, e refutar rende mais que confirmar.** A alegação central sobreviveu inteira e reproduziu byte a byte; se eu tivesse parado aí, este relatório seria curto e pareceria trabalho pouco. As seções 5 e 8 são onde a pressão por achar algo age — e por isso cada item delas tem falsificador de uma linha, e eu mesmo derrubei parte da minha manchete do C2 (o `DocumentAttachmentDto` é comentário-derivado **mas verdadeiro**; o `dinheiro` do controller é defensável no domínio). O que sobra medido é: **1** rótulo falso, **2 de 4** unidades da subfila com terceira invariante sem lastro em código.
3. **Só medi o que a minha lente enxerga.** "A medição sustenta a afirmação?" é uma pergunta sobre alcance e contagem. Não perguntei se as 4 unidades da subfila eram as **certas** para uma rodada — se o recorte estivesse errado, todo o meu trabalho estaria certo e irrelevante, e eu não teria como notar.
4. **Herdei a premissa errada do meu encargo e quase a repeti.** Me disseram que a rodada não nomeou o commit com precisão; eu comecei procurando `ec3e4feb`/`9a3ef0c5` no artefato e só encontrei `40892baa` porque abri o JSON antes de escrever. Um revisor com menos folga teria escrito o achado que lhe foi sugerido.

**Estado do worktree ao fim:** `git status --porcelain` em `rv-168` **vazio**, `git diff --numstat` **vazio**, zero `.bak` órfãos (`find . -name "*.bak" -not -path "./node_modules/*" | wc -l` → 0). Todos os arquivos tocados — 5 de código, 2 de teste, 4 arquivos do #171 movidos e devolvidos — voltaram por cópia de `.bak`/`mv`, nunca por `git checkout`. Nenhum commit, nenhum `git add`, nenhum push. O único arquivo que escrevi fora de `%TEMP%` é este relatório.
