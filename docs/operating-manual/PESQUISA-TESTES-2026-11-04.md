# Pesquisa: o que dá para fazer em cada etapa de teste (04/11/2026)

**Resposta curta:** o projeto testa muito, mas não tem um mapa único dizendo "mudei X, rodo Y". Por isso o mesmo
trabalho se repete: o executor e o prova-runner rodam os mesmos comandos; o CI faz `npm ci` do server 10 vezes; o
vitest espera o `next build` terminar; e pares unit × integração testam a mesma regra. Ao mesmo tempo, há coisas que
não rodam em lugar nenhum: os 7 `scripts/*.test.mjs`, a integração no `test:changed` e o fuso de São Paulo no teste
local. Dos ~165 passos de runbook, ~30 % já se automatizam com o runner de tela, ~40 % se automatizam com pouco
esforço e ~30 % são oráculo humano de verdade. A execução real dos runbooks do H2 (§7.1) mostrou algo mais grave:
eles mediram o cadastro do banco, não o código. Todos os bugs achados eram pegáveis por teste comum. O caminho é
tirar do runbook o que a máquina prova, não automatizar o runbook como está.

**Risco principal:** quase todas as propostas abaixo são de velocidade e de "não repetir", e não colidem com a regra
⛔ (não montar aparato de auditoria). Três colidem, ou podem colidir, e são **decisão do dono** (§8): passo novo no CI
para os testes de script, e2e no CI e apagar teste duplicado.

Método: três levantamentos somente leitura do repositório (nenhuma suíte foi rodada) e pesquisa externa. Graus:
**[lido]** = conferido no arquivo; **[medido]** = número que já estava num comentário ou doc do repo;
**[inferido]** = conclusão minha, ainda não verificada; **[externo]** = fonte de fora, com link no fim.

---

## 1. Retrato atual

| Etapa | O que existe | Números |
|---|---|---|
| Server unit | Jest + `@swc/jest`, project `unit` | 470 arquivos; os maiores são `PayableService.test.ts` (1735 linhas) e `PostingService.test.ts` (1602) [lido] |
| Server integração | project `integration`, banco-modelo copiado por arquivo, `resetDb` por teste | 246 arquivos; `makeApp()` em 161 e `pushTestSchema` em 222 [lido] |
| Mutação | Stryker incremental, `mutation-diff` (só linhas alteradas), `mutation-slices` (~35 mil mutantes, ~40 h) | fora do CI [lido] |
| Front | Vitest + jsdom + Testing Library | 235 arquivos; 161 renderizam componente, 26 usam `renderHook`, ~74 são função pura [lido/inferido]; nenhum MSW, 41 fazem stub de `fetch` |
| Gates estáticos | tsc (app e testes), lint:gate, check:arch, dtoShapeSnapshot, route-spec-wiring, debt-ledger, skill-audit (inclui wiring/i18n), plano-vault | todos no CI [lido] |
| CI | 7 shards no server (3 unit + 4 integração), coverage somada, front em série, docker advisory | shard de integração mais lento 6 min contra ~3 min [medido, `ci.yml:146`]; 43 s de compilação fria no 1º `makeApp` [medido, `ci.yml:182`] |
| Escopo local | `test-scope-guard` bloqueia suíte inteira; `test:changed` nos dois apps; `heavy-slot` | `test:changed` do server é **só unit** [lido] |
| Prova | executor grava PROVA; `prova-runner` reexecuta cada comando | todo comando roda 2× [inferido] |
| Tela | `scripts/runbook-tela.mjs` (desde 04/11) | nenhuma evidência foi gravada por ele ainda [lido] |
| E2E | — | não há `playwright.config` nem pasta `e2e` [lido] |
| Scripts da raiz | 7 `scripts/*.test.mjs` | **ninguém roda** [lido via grep] |

Documentação: o `server/TESTING.md` está desatualizado em 6 pontos. Ele ainda fala de `db push` a cada execução,
diz que `npm test` "é o que o CI roda", traz um exemplo que o scope guard recusa e cita pisos de cobertura antigos.
Também não fala de shards, mutação nem banco-modelo [lido]. No front, a única referência é o `my-app/CLAUDE.md`.

---

## 2. Seleção: "mudei X, rodo Y" (o centro do "não repetir")

**O que falta [lido]:** não existe uma tabela de decisão. O `test:changed` cobre unit e front, mas não a integração;
o comentário de lá diz que ela "puxa quase tudo", porque todo arquivo de integração importa o app inteiro via `makeApp`.

**Propostas:**

1. **Tabela de decisão versionada** (o "aparato documentado" que falta). Rascunho:

   | Mudei… | Rodo localmente | Fica para o CI |
   |---|---|---|
   | só `.md` | nada | o CI já pula (job `changes`) |
   | função pura / serviço do server | `npx jest <pasta> --selectProjects unit` ou `npm run test:changed` | integração |
   | repositório, rota, controller, migração | o arquivo de integração do domínio (`--runInBand`), um por vez | o resto |
   | DTO | `dtoShapeSnapshot` + `.gen.ts` | — |
   | componente / hook do front | `npx vitest run <pasta>` ou `npm run test:changed` | suíte inteira |
   | data/fuso no front | o mesmo, com `TZ=America/Sao_Paulo` | — |
   | `scripts/*.mjs` | `node --test scripts/<nome>.test.mjs` | (hoje ninguém roda) |
   | tela atrás de `withAuth` | `runbook-tela.mjs` contra build de produção | — |

2. **`test:affected` para integração, por domínio, não por import.** O grafo de import não serve, porque `makeApp`
   puxa tudo. A troca é por pasta: um arquivo mudado em `features/<d>/` seleciona os testes de integração de
   `features/<d>/` mais os de `controllers/__tests__/<d>*`. O `jest --listTests` mostra a lista antes de rodar
   [externo: Jest CLI]. É uma heurística [inferido]: o CI continua sendo a rede de segurança.
3. **Fuso fixo no front local.** Fixar `TZ=America/Sao_Paulo` no próprio `vitest.config.ts` faz os ~20 testes de
   date-only morderem no local como mordem no CI. Hoje eles passam ou falham conforme o fuso da máquina [lido/inferido].
4. **Executor × prova-runner.** O veredito é do prova-runner por desenho, e isso fica. Proposta: o executor deixa de
   rodar a passada final de confirmação e entrega os comandos, e quem roda a versão que vale é o prova-runner. Isso
   tira uma execução completa por entrega [inferido; mexe em `.claude/agents/executor.md`].

---

## 3. Server: unit

Está saudável: swc, `maxWorkers 25%` e cache no CI. O que sobra:

- **Arquivos gigantes** (`PayableService.test.ts`, 1735 linhas): dividir por comportamento melhora o
  `--findRelatedTests` e o equilíbrio dos shards. Retorno baixo; só vale ao mexer neles [inferido].
- **Mutação:** já está no estado da arte. O incremental está ligado, e a doc do Stryker avisa que ele "deriva" se só
  rodar incremental [externo]; as fatias completas cobrem isso. Vale só documentar **quando** rodar: antes de fechar
  um nó de domínio crítico, não a cada PR [inferido].

## 4. Server: integração (onde está o tempo)

1. **Equilíbrio de shards por duração.** O `--shard` do Jest divide por número de arquivos [medido no comentário do
   CI]. Um `testSequencer` próprio que lê as durações de um arquivo salvo pelo CI equilibra os shards por tempo; o
   sequencer padrão já guarda a duração de cada arquivo [externo: Jest/Tenbin]. Ganho esperado: o shard de 6 min cai
   para perto de ~4 min (a média) [inferido].
2. **`resetDb` com ~150 `deleteMany` sequenciais por teste** [lido, `test/helpers/db.ts:46-235`]. Opções, a medir:
   (a) um único `$executeRawUnsafe` com todos os `DELETE` e `PRAGMA foreign_keys=OFF`; (b) recopiar o banco-modelo
   entre testes, que já leva ms por arquivo, mas exige desconectar o Prisma. O comentário de `db.ts:204` mostra que
   esse hook já estourou os 5 s uma vez [medido].
3. **Pares unit × integração que testam a mesma regra** (`httpTiming`, `presumidoTeto`, `partner`,
   `requestContext` e mais 20 pares com o mesmo nome) [lido/inferido]. Regra proposta: **integração prova a ligação**
   (status HTTP, persistência, transação); **unit prova a regra**. Apagar ou enxugar teste é decisão do dono (§8).
4. **`requestContext.integration.test.ts` faz `pushTestSchema` sem usar banco** [lido]: é candidato a virar unit.
5. **`test:leaks` sem chamador** [inferido]: o CI faz o mesmo nos shards. Pode sair do `package.json`.

## 5. Front (Vitest)

1. **Vitest fora da fila do build.** Hoje ele roda depois do `next build`, no mesmo job [lido], e não precisa do
   build. Num job próprio, em paralelo, o tempo de parede do PR cai mais ou menos o tempo do build [inferido].
2. **Ambiente por projeto.** Os ~74 testes de função pura também carregam jsdom. Separar um projeto `node` (por
   exemplo, `lib/**`) de um projeto `jsdom` cortou ~45 % do boot de ambiente num caso publicado [externo]; aqui
   precisa ser medido.
3. **happy-dom:** prometido como 2–4× mais rápido, mas sem algumas APIs [externo]. Só vale depois do item 2 e com
   medição; não recomendo agora.
4. **MSW em vez de stub de `fetch` em 41 arquivos:** melhora a fidelidade (URL, método, corpo), não a velocidade.
   Retorno médio, a fazer quando mexer nesses testes [inferido].

## 6. CI (repetição de trabalho)

1. **`npm ci` do server 10× e `prisma generate` 8× por run** [lido]. Cache de `server/node_modules` pela chave do
   lockfile, mais cache do client gerado pela chave do hash do `schema.prisma`, nos 4 jobs. Ganho por job estimado em
   dezenas de segundos [inferido; medir na primeira run].
2. **Scripts da raiz:** os 7 `node --test scripts/*.test.mjs` levam segundos e poderiam entrar no job
   `governance-presence`, que já roda sempre. É passo novo no CI: decisão do dono (§8).

## 7. Tela e runbooks

**Classificação dos ~165 passos [inferido pelo levantamento]:** ~30 % **A** (o runner já faz), ~40 % **B** (falta
pouco), ~30 % **C** (oráculo humano: PVA, SEFAZ, portal do Emissor, deploy real, "carimbo", julgamento visual).
Os C se concentram em H1, M2, D5, DFE-MANUAL e no carimbo do H2. Nenhuma evidência foi gravada pelo runner
versionado ainda.

### 7.1 O que a execução real mostrou (sessão DFE-MANUAL, 04/11)

Relato da sessão que roda os runbooks irmãos do H2 (worktree `charming-northcutt-4413b8`, PR
NightMarketz/luminaristest#1035). São fatos dela; eu não reconferi os caminhos.

- **O runbook mediu o cadastro, não o código.** No DFE-MANUAL, o passo 1 rodou no `dev.db` real e só provou o ramo de
  pendência: faltavam o CNPJ da unidade, o cNBS do serviço e o taxId do cliente. A causa é o seed gravar no perfil
  fiscal só regime e PIS/COFINS (`server/src/jobs/seedAccountingFixtureCli.ts:414`). Os passos 2–10 dependem do
  portal e ficaram BLOQUEADOS.
- **Desvio de dado vira regra.** Os 6 runbooks irmãos executados precisaram mexer em dado para pôr a pré-condição de
  pé (ATIVACAO 5, DFE 6, IMOBILIZADO 3, PACOTE-VALIDADE 5, VENDA-PACOTE 3, WIZARD 7).
- **Roteiro desatualizado:** IMOBILIZADO 2 manda ocultar uma linha que a regra L-14 recusa (404); PACOTE-VALIDADE 7
  cita uma tabela que a tela não tem.
- **Os bugs reais achados** (VP-1 quantidade, IMO-1 400 em vez de 409, IMO-2/IMO-3, DFE-1 id interno na mensagem,
  textos sem tradução) **eram todos pegáveis por teste de integração ou de tela**. Nenhum exigia o oráculo humano.
- **O critério de aceite confunde:**
  - o "como verificar" olha um selo, mas o código exige dado em outras tabelas que a pré-condição não nomeia;
  - o esperado só descreve o caminho feliz;
  - "parou no ramo de pendência previsto" não cabe nos 3 estados de desfecho;
  - a pré-condição descreve um estado, mas não diz **quem** o cria (seed ou dono).

Frase do dono no chat dela (04/11, direção, não ratificação): "todos esses runbooks foram considerados humanos e
manuais e estavam travando um monte de tarefas, sendo que na realidade eles eram inúteis".

**Consequência para esta pesquisa:** o maior retorno não é dar mais ops ao runner para reproduzir runbook. É
**tirar do runbook o que a máquina prova**. Proposta, na linha da sessão DFE-MANUAL (nada ratificado como formato):

1. **Seed de cenário por runbook, em banco descartável** (cópia do modelo, como o `templateDb` da integração). A
   pré-condição deixa de ser "o dono arruma o banco" e passa a ser um comando.
2. **O que a máquina prova vira teste:** a regra vai para integração, a ligação com a tela vai para o
   `runbook-tela.mjs` ou para um e2e. O runbook só cita esses testes.
3. **O runbook fica só com o oráculo externo e a decisão do dono** (PVA, SEFAZ, portal, contador, deploy). A saída
   dele (XML real, protocolo) vira fixture versionada, como já se faz no X1.
4. **Emenda ao RUNBOOK-FORMAT:** uma coluna "quem põe de pé" (seed X / dono) e um esperado também para o ramo de
   erro ou de pendência.

**Divisão de trabalho combinada:** o inventário por runbook e por área (o que tem teste correto e o que não tem,
incluindo o DP) é da sessão DFE-MANUAL, em `docs/operating-manual/INVENTARIO-TESTES-RUNBOOKS-2026-11-04.md`
(PR draft NightMarketz/luminaristest#1065). Pela tabela dele: 19 runbooks de produto, dos quais 4 podem ser
aposentados depois de seed + testes, 9 encolhem para minutos de oráculo externo e 6 ficam humanos ou operacionais. Esta pesquisa fica com o
método de cada etapa. Cada documento cita o outro. As quatro repetições de §7 (ATIVACAO, IMOBILIZADO, I1B,
PACOTE-VALIDADE) serão reconferidas linha a linha lá.

### 7.2 Ops do runner (só para o que sobrar de tela depois do 7.1)

**Os 5 B de maior retorno** (ops novas no `runbook-tela.mjs`):

| Op | Destrava |
|---|---|
| `upload` (arquivo por clique, via file chooser) | H2-BROWSER 2–3, X2 passo 2 |
| `assertNet` (confere status/corpo de uma rota) | ATIVACAO 5, PACOTE-VALIDADE 10, os 400/409 do IMOBILIZADO, W7 3–4 |
| `sql` (consulta SQLite no banco do roteiro) | LAC-B 2–4 e 6, B4 4, M2 2 |
| LLM falso por variável de ambiente | W3, W6 e W7 inteiros, o maior bloco B (mexe em código de produção: §8) |
| `drag` + `offline` | KANBAN inteiro (o `kro.mjs` antigo já fazia os dois) |

Depois: segunda aba (IMOBILIZADO 5, W7 4) e extração de texto de PDF (recibo, DANFE).

**Roteiros base reutilizáveis** (op `include` ou um arquivo `base/*.json`): ambiente (build de produção do commit
exato, `dev.db` certo, vaga), entrada (`login` + `selectUnit` + Contabilidade), "nova venda finalizada", "entrevista
até os botões" e fechamento (console limpo + `netFile`).

**Runbook que repete teste de integração.** Reconferido linha a linha pela sessão DFE-MANUAL em 04/11:

| Passo | Resultado | Teste |
|---|---|---|
| ATIVACAO 4–5 | repetição confirmada; só a parte de tela fica sem teste | `activateDefault.reload.integration.test.ts:87`, `activateDefault.integration.test.ts:135` |
| IMOBILIZADO 3, 6, 8 | só a API está coberta; a parte de tela não | `fixedAssetController.integration.test.ts:92/100`, `:306`, `:165–265` |
| **IMOBILIZADO 5** | **não é repetição** | o teste de `:127` manda version 999 num bem ainda pendente; o caso real (bem já ativado em outra aba, version velho) nunca roda, e foi ali que o runbook achou o IMO-1 |
| I1B 9 | repetição confirmada | `rekeyLegacyUnitCli.integration.test.ts:272` |
| I1B 10 | não coberto [inferido] | o `boot.test.ts` só confere os scripts de start |
| aceite do PACOTE-VALIDADE | contrato de API confirmado e forte; a tela não | `packageAcceptance.integration.test.ts:87–165` |

**Lição de método:** "existe teste com o nome certo" não quer dizer que "o teste cobre o caso". No IMOBILIZADO 5, o
dado do teste era fraco (estado errado do bem) e o bug passou. Antes de cortar um passo de runbook por "já tem
teste", é preciso ler a asserção **e o estado montado** no teste. Onde faltar, o caso vira teste de integração novo,
não passo de runbook. Só a ligação com a tela fica para o runner.

**E2E de verdade** (Playwright Test no CI, com o login salvo uma vez num projeto de setup via `storageState`
[externo]) seria o instrumento do item "caminho feliz ponta a ponta", que o GAP-MAP marca como PARCIAL [lido]. Os
prints de comparação (`toHaveScreenshot`) dependem do sistema; a base tem de ser gerada em Linux/Docker, não no
Windows [externo]. É aparato novo no CI: decisão do dono (§8).

---

## 8. O que é ambíguo e fica com o dono

1. **Passo novo no CI** (testes de script; e2e). Leitura A: é teste que lê o app/código, como as exceções já
   ratificadas (check:arch, no-console, catch silencioso). Leitura B: a regra ⛔ veda "gate novo" enquanto houver
   oráculo externo aberto. Mais seguro: os testes de script entram (custo de segundos, leem código); o e2e espera
   decisão explícita.
2. **Apagar ou enxugar teste duplicado.** Ganha tempo de CI, mas reduz redundância. Mais seguro: aplicar a regra
   "integração = ligação" só ao mexer no arquivo, nunca numa varredura.
3. **LLM falso por variável de ambiente** destrava a maior fatia de runbook, mas é uma costura (seam) de teste em
   código de produção. Precisa de ADR curto ou de um sim do dono.

## 9. Ordem sugerida (do mais barato para o mais caro)

1. ~~Tabela de decisão (§2.1) num `docs/operating-manual/TESTES.md` + correção do `server/TESTING.md`.~~ Feito em
   04/11 (PR NightMarketz/luminaristest#1064).
2. Seed de cenário por runbook em banco descartável + emenda "quem põe de pé" no RUNBOOK-FORMAT (§7.1). Depende do
   inventário da sessão DFE-MANUAL para escolher os cenários.
3. `TZ` fixo no vitest local; `test:leaks` fora; `requestContext` para unit.
4. Vitest em job paralelo; cache de `node_modules` e prisma no CI.
5. Ops `upload`, `assertNet` e `sql` no runner, mais roteiros base, só para o que sobrar de tela.
6. Sequencer por duração; `test:affected` de integração por domínio; medir o `resetDb` em lote.
7. Com decisão do dono: testes de script no CI, LLM falso, e2e.

## Fontes externas

- [Jest CLI (`--findRelatedTests`, `--changedSince`, `--listTests`)](https://manpages.ubuntu.com/manpages/lunar/man1/jest.1.html)
- [Jest TestSequencer (cache de duração)](https://github.com/facebook/jest/blob/master/packages/jest-test-sequencer/src/index.ts) · [Tenbin, shard por duração](https://zenn.dev/cybozu_frontend/articles/create-tenbin) · [issue Jest #11252](https://github.com/jestjs/jest/issues/11252)
- [Stryker incremental](https://stryker-mutator.io/docs/stryker-js/incremental/)
- [Vitest: projeto jsdom × node, ~45 % de boot](https://github.com/facebook/astryx/pull/3814) · [jsdom × happy-dom](https://github.com/vitest-dev/vitest/discussions/1607) · [pools do Vitest](https://helpmetest.com/blog/vitest-worker-pool-parallelism/)
- [Playwright auth / storageState](https://playwright.dev/docs/auth) · [baseline de screenshot em Linux](https://argos-ci.com/blog/playwright-visual-regression-testing-ci)
- [Banco por worker no Jest](https://dev.to/cseby92/how-to-run-jest-integration-tests-in-parallel-using-isolated-sql-schemas-1bm7) · [SQLite em teste de integração com Prisma](https://corentindautreme.github.io/Using-SQLite-For-Your-Node-Prisma-Integration-Tests)
