# Pesquisa de testes, rodada 2: onde o tempo vai, medido (04/11/2026)

**Resposta curta:** no CI, a suíte roda com **1 worker por job**. O `maxWorkers: '25%'` do `jest.config.js` e do
`vitest.config.ts` foi posto para proteger a máquina local de 16 núcleos. No runner público de 4 vCPU, ele vira 1. Só
isso explica a maior parte dos 280 s do vitest e dos 85–134 s de cada shard de unit. O segundo achado é que **um
arquivo só, `seedAccountingFixtureCli.integration.test.ts`, leva 114 s** e sempre cai no shard 4/4, porque o Jest
divide os shards pelo hash do caminho. Esse shard leva 508 s contra 242–313 s dos outros e define o tempo de parede do
CI. As duas correções são de configuração, sem passo novo no CI. Juntas, devem levar a parede de ~11–12 min para
~7–8 min [inferido a partir do medido].

**Risco principal:** o ganho do item 1 é inferido de uma medição local em 33 arquivos (fator de 3,2× com 4 workers).
Só uma run do CI com a mudança prova o número. A integração **não** ganha com mais workers enquanto todos os arquivos
dividirem um único `test-integration.db`. Para ela ganhar, é preciso um banco por worker (item 4), e essa mudança mexe
na infraestrutura de teste inteira.

Esta rodada não repete a [rodada 1](PESQUISA-TESTES-2026-11-04.md) (PR NightMarketz/luminaristest#1064). Ela troca as
estimativas de lá por números e corrige duas delas (§3).

Graus: **[medido]** = número que eu tirei nesta sessão, de log do CI ou de execução local; **[lido]** = conferido no
arquivo; **[inferido]** = conclusão minha, ainda sem prova; **[externo]** = fonte de fora, com link no fim.

---

## 1. Retrato medido

### 1.1 CI, fase × tempo (3 últimas runs verdes da main, 04/11)

Runs 41886693858 (`1efa225`), 41871080052 (`b2084b6`) e 41856243810 (`5acacc5`, anterior ao workspace do #1051),
via `gh api repos/NightMarketz/luminaristest/actions/runs/<id>/jobs` [medido].

| Job | Instalação (`npm ci`) | Testes / passo principal | Job inteiro |
|---|---|---|---|
| Server – integração 1/4 | 28 · 40 · 51 s | 375 · 386 · 250 s | 327–456 s |
| Server – integração 2/4 | 26 · 42 · 76 s | 306 · 317 · 310 s | 367–410 s |
| Server – integração 3/4 | 26 · 32 · 72 s | 330 · 278 · 326 s | 340–426 s |
| **Server – integração 4/4** | 25 · 43 · 71 s | **481 · 485 · 520 s** | **529–619 s** |
| Server – unit 1/3 · 2/3 · 3/3 | 22–75 s | 84–134 s | 130–219 s |
| Server – coverage gate (depois de todos os shards) | 29 · 30 · 51 s | < 5 s | 47–74 s |
| Server – typecheck & lint | 22 · 42 · 56 s | tsc 16–22 s, tsc dos testes 32–45 s, debt-ledger 23–31 s | 165–226 s |
| **Frontend – build** | 18 · 33 · 71 s | build 36–47 s, **vitest 237–313 s** | 382–499 s |
| Docker server / my-app (advisory) | — | 200–331 s / 268 s | até 370 s |
| Skill governance | 20–60 s | < 5 s | 50–77 s |

- **Tempo de parede da run:** 605 s, 646 s e 714 s. Caminho crítico: integração 4/4 → coverage gate [medido].
- **Soma de runner:** 3018 s antes do #1051 e 3433–3761 s depois. O `npm ci` da raiz instala agora o workspace inteiro
  ("added 1582 packages … in 50s"), e o passo de instalação subiu de 22–28 s para 51–76 s em cada job [medido].
- O `prisma generate` leva menos de 5 s em todo job. Não é gargalo [medido].

### 1.2 Arquivos mais lentos (run 41886693858, linhas `PASS … (N s)` do log)

O Jest só imprime a duração dos arquivos acima de 5 s. Os números abaixo são esses [medido].

| Shard | Arquivos > 5 s | Soma deles | `Time:` do shard | Mais lentos |
|---|---|---|---|---|
| integração 1/4 | 5 | 55 s | 242 s | `rekeyLegacyUnitCli` 17,7 · `seed-nunca-sobrescreve-senha` 14,7 · `dashboardSystemReset.accounting` 10,9 |
| integração 2/4 | 12 | 83 s | 300 s | `retencoesFontePr2` 20,2 · `RoleAccountOverrideService` 9,0 · `simplesCaixaPr2` 7,3 |
| integração 3/4 | 12 | 92 s | 313 s | `UserService` 14,6 · `bankSettlementController` 10,8 · `pisCofinsProvision` 10,4 |
| **integração 4/4** | **25** | **327 s** | **508 s** | **`seedAccountingFixtureCli` 114,0** · `taxAssessmentMemoEcf` 21,0 · `ReconciliationRepository.activeMatches` 15,1 · `KitInstallService` 11,7 |
| unit 1/3 | 2 | 27 s | — | `FiscalDocumentContingencia` 15,8 · `FiscalDocumentPsc` 11,4 |
| unit 3/3 | 3 | 26 s | — | `SefazNfeEmissor` 13,9 · `danfeModel` 6,6 |

Soma dos 4 shards de integração: 1363 s. Dividido por igual, daria 341 s por shard [medido → inferido].

### 1.3 Vitest no CI: o ambiente custa mais que o teste

Linha final do log: `Duration 280.06s (transform 5.11s, setup 9.29s, collect 34.45s, tests 60.31s, environment
131.23s, prepare 16.47s)` [medido]. As fases somam 256 s, quase a parede inteira (280 s). Com mais de um worker, a
soma passaria bem da parede. Isso confirma **1 worker**. O jsdom sozinho leva 47 % do tempo; os testes, 22 %.

### 1.4 Local (Windows, 16 núcleos), com escopo

| Medida | Resultado |
|---|---|
| `seedAccountingFixtureCli` sozinho (`--runInBand --verbose`) | 70 s de arquivo e 93 s de processo. Por teste: 27,8 s (semeia 2 tenants) · 0,06 s · 1,0 s · **21,0 s ("boot real")** · 13,4 s (`--years 2026`) [medido] |
| `resetDb()` em banco vazio, média de 15 chamadas | **76,6 ms**, dos quais **40,1 ms** são a parte de `legal_parameters` (count + findMany para reaquecer o cache) [medido] |
| `DELETE` das 131 tabelas numa só transação com `PRAGMA defer_foreign_keys = ON` | **11,5 ms** [medido] |
| Recópia do banco-modelo (`$disconnect` + `pushTestSchema` + `$connect`) | **23,5 ms** [medido] |
| Vitest, os 33 `lib/**/*.test.ts` sem DOM aparente | jsdom com 1 worker: **40,1 s** (environment 29,4 s) · jsdom com 4: **12,5 s** · node com 1: 9,7 s · node com 4: **3,1 s**. No ambiente `node`, 31 de 33 passam; os 2 que falham (`governanceOwnerUserId`, `api-client-request`) usam DOM [medido] |
| `jest --listTests --findRelatedTests` na integração (de 246 arquivos) | `PostingService.ts` seleciona 206 · `SefazNfeEmissor.ts` 208 · `KitInstallService.ts` 1 [medido] |
| Uso de `resetDb` | 45 arquivos o chamam em `beforeEach`/`afterEach`, somando 444 testes. Os outros chamam uma vez por arquivo [medido por grep] |

---

## 2. Propostas, da melhor relação ganho/custo para a pior

### P1. `maxWorkers` próprio para o CI (jest unit e vitest) — maior ganho, custo de 2 linhas

- **Fato:** `maxWorkers: '25%'` vira `floor(0,25 × 4) = 1` no Jest 30 e `round(0,25 × 4) = 1` no Vitest 3.2. As duas
  fórmulas usam `os.availableParallelism()` [externo: código-fonte]. O runner `ubuntu-latest` de repositório público
  tem 4 vCPU e 16 GB [externo: docs GitHub]. O comentário de `server/jest.config.js:50` já diz "no CI (2–4 núcleos) dá
  1" [lido]. A soma das fases do vitest (§1.3) confirma 1 worker [medido].
- **Mudança:** nos dois configs, `maxWorkers: process.env.CI ? 4 : '25%'`. O local não muda, e o test-scope-guard e a
  vaga pesada ficam como estão.
- **Ganho esperado:** vitest de 280 s para ~90 s, pelo fator de 3,2× medido em `lib/` [inferido]. Cada shard de unit
  de ~100 s para ~35 s [inferido]. Aí também dá para juntar os 3 shards de unit num só e economizar 2 instalações de
  ~60 s cada (§1.1).
- **Integração não entra.** Com mais de 1 worker, dois arquivos abririam o mesmo `test-integration.db` ao mesmo tempo
  (`server/test/helpers/db.ts:17`, `test/jest.setupEnv.ts:5`) [lido]. O projeto de integração precisa continuar com 1
  worker até o P4: use `maxWorkers: 1` nele ou `--runInBand` no passo do CI.
- **Memória:** 4 workers jsdom, a ~700 MB cada (medido em 29/10, comentário do config), cabem nos 16 GB [inferido].
- **Prova:** local, `npx vitest run $(cat lista-lib) --maxWorkers 1` contra `--maxWorkers 4` (12,5 s contra 40,1 s,
  §1.4). No CI, o tempo do passo "Run tests (vitest)" e dos "Run tests + assert no leaked handles" de unit na run do PR,
  contra 237–313 s e 84–134 s.

### P2. Shards de integração equilibrados por duração — corta ~165 s do caminho crítico

- **Fato:** o `shard()` padrão ordena os arquivos pelo SHA-1 do caminho e corta em fatias de tamanho igual [externo:
  código do `@jest/test-sequencer`]. Por isso a 4/4 recebe sempre o mesmo conjunto pesado: 327 s em arquivos > 5 s,
  contra 55–92 s nos outros (§1.2) [medido]. Pôr um 4º shard (comentário de `ci.yml:156`) não resolveu, porque o
  desequilíbrio vem de poucos arquivos grandes, e não do número de arquivos.
- **Mudança:** um `testSequencer` só no projeto de integração, que sobrescreve `shard()` [externo: doc do Jest]. Ele lê
  `server/test/integration-durations.json` (caminho → segundos) e distribui os arquivos pelo maior primeiro, sempre no
  shard mais leve (LPT). Arquivo sem duração conhecida conta como 3 s, a média medida dos que ficam abaixo de 5 s. O
  JSON sai de um script que lê os logs do CI com `gh api …/jobs/<id>/logs`, o mesmo grep da §1.2.
- **Cuidado (memória `valor-derivado-calcula-na-main`):** o JSON não pode ser escrito por todo PR, ou vira conflito.
  Ele é regenerado de vez em quando, à mão. Um JSON velho só piora o equilíbrio; não quebra nada.
- **Ganho esperado:** o shard mais lento cai de 508 s para perto de 341 s, a média (§1.2) [inferido].
- **Prova:** antes e depois, `npx jest --listTests --selectProjects integration --shard=4/4` lista os arquivos de cada
  shard; o script soma as durações do JSON. No CI, o `Time:` de cada shard.

### P3. O arquivo do seed: dividir e tirar o relógio real

- **Fato:** 114 s no CI e 70 s local, em 5 testes (§1.4). O "boot real" (21 s) usa o **dia de hoje**: semeia o ano
  corrente de janeiro até hoje (`seedAccountingFixtureCli.integration.test.ts:151-152`) [lido]. Ou seja, fica mais lento
  a cada mês e volta a ficar leve em janeiro [inferido].
- **Mudança mínima:** dividir em 2 arquivos, um com o teste de 27,8 s e a "queda" que depende do estado dele, outro com
  "boot real" e `--years 2026`. Os dois podem ir para shards diferentes, por sorte do hash ou pelo P2.
- **Mudança maior:** um relógio injetável no validador do binding, para o "boot real" usar dia fixo. Mexe em código de
  produção; vai para a §4.
- **Prova:** o `--verbose` do arquivo antes e depois; no CI, o `Time:` do shard que o recebe.

### P4. Um banco por worker na integração — o maior ganho que sobra, e o mais caro

- **Mudança:** `test/jest.setupEnv.ts` passa a apontar `DATABASE_URL` para `test-integration-${JEST_WORKER_ID}.db`, e o
  `DB_FILE` de `db.ts` lê o mesmo nome. O `templateDb()` já é seguro com processos concorrentes, porque grava num
  arquivo temporário por `pid` e depois renomeia (`templateDb.ts:32-47`) [lido]. Com isso, a integração pode usar 4
  workers por shard no CI, e os 4 shards podem virar 2.
- **Risco:** algum teste que monte o caminho do banco por conta própria, ou CLI que abra outro client
  (`rekeyLegacyUnitCli`, `seedAccountingFixtureCli`), precisa ser varrido [inferido]. Localmente, a vaga pesada
  continua valendo, e o `--runInBand` local pode ficar.
- **Ganho esperado:** perto de 2–3× no tempo de teste da integração [inferido; o fator do vitest foi 3,2×].
- **Prova:** primeiro, 4 arquivos de domínios diferentes com `--maxWorkers=2`, sem `--runInBand`, verdes 3 vezes
  seguidas. Depois, uma run do CI.

### P5. Instalação: voltar aos ~25 s por job

- **Fato:** depois do #1051, cada job instala os 1582 pacotes do workspace inteiro, e a soma de runner subiu
  ~400–700 s por run (§1.1) [medido]. O `setup-node` com `cache: npm` guarda só o `~/.npm`, não o `node_modules`
  [externo]. A doc do `actions/cache` desaconselha cachear o `node_modules` quando se usa `npm ci`, porque o `npm ci`
  apaga a pasta antes de instalar [externo]. Então **não** proponho cache de `node_modules`.
- **Mudanças:**
  - `npm ci --workspace server --include-workspace-root` nos jobs só do server, e o equivalente `my-app` no frontend
    [inferido: falta medir se o `npm ci` respeita o filtro e se a árvore fica completa];
  - `--no-audit --no-fund` em todo `npm ci` [externo: corta o envio do audit; ganho não medido];
  - no coverage gate, que só precisa de `istanbul-lib-coverage` (`server/scripts/coverage-gate.js:9`) [lido], trocar o
    `npm ci` inteiro por uma instalação só desse pacote. Isso tira ~30–50 s do caminho crítico [inferido].
- **Prova:** o tempo do passo "Install dependencies" na run do PR, contra 51–76 s.

### P6. `resetDb` em lote e cache de `legal_parameters` memorizado — ganho pequeno, medido

- **Fato:** 76,6 ms por chamada. 40 ms disso é reler `legal_parameters` para reaquecer o cache. Um `DELETE` em lote
  numa só transação leva 11,5 ms (§1.4) [medido]. O `$executeRawUnsafe` não aceita vários comandos numa string só
  [externo: doc do Prisma], então o lote vai como `$transaction([...])`, que foi o que medi.
- **Mudanças:**
  1. Depois de restaurar a semente, o conjunto PUBLISHED é sempre o mesmo, por construção (`db.ts:207-217`). Basta
     memorizar o resultado da primeira leitura e reaplicar o `storePublished` a partir da memória.
  2. Trocar os ~130 `deleteMany` por um `DELETE` por tabela numa transação com `defer_foreign_keys`, que ainda checa
     as FKs no commit. A guarda `resetDb.accounting.integration.test.ts`, que deriva as tabelas do schema, fica.
- **Ganho:** ~60 ms × (444 testes com reset por teste + ~250 chamadas de `beforeAll`) ≈ 40 s na suíte, ~10 s por shard
  [medido local × contagem; no CI, inferido]. É pouco perto de P1–P3. Só vale fazer junto com o P4, que mexe no mesmo
  arquivo.
- **Prova:** o benchmark de 15 chamadas desta sessão (um arquivo temporário de integração com `process.hrtime`, que
  não foi versionado), antes e depois.

### P7. Vitest: projeto `node` para os testes sem DOM

- **Fato:** em `lib/`, 31 de 33 arquivos passam no ambiente `node`. Com 1 worker, o tempo cai de 40,1 s para 9,7 s; com
  4, de 12,5 s para 3,1 s [medido]. O jsdom custa ~0,9 s por arquivo local e ~0,56 s no CI (131 s / 235) [medido]. O
  Vitest 3.2 faz isso com `test.projects`, um projeto `jsdom` e um `node`. O `environmentMatchGlobs` saiu na v4 e
  `projects` é o caminho [externo].
- **Ganho:** com 1 worker, cerca de 40 s no CI para ~74 arquivos puros. Depois do P1, ~10 s [inferido]. Fica depois
  do P1.
- **Prova:** a tabela da §1.4 rodada de novo, e a linha `environment` do vitest no CI.

### P8. Docker advisory só quando o build da imagem pode mudar

- **Fato:** 200–331 s por imagem, em todo PR com código [medido]. Está fora do caminho crítico e é grátis em repositório
  público [externo]. O ganho é só de fila de runner. Como o job é advisory, filtrar por `if` (pelo `changes`) não cria
  check pendente. Quem fica pendente é o workflow pulado por `paths` [externo].
- **Mudança:** pular o job quando o PR não toca `*/Dockerfile`, `package*.json`, `next.config.*` nem `prisma/`. É
  decisão do dono (§4).

### Ordem e efeito somado

P1 e P2 primeiro: são de configuração, e cada um se prova numa run. Depois o P3 e o P5 (coverage gate). P4 e P6 vão
juntos, num PR próprio, porque mexem em `db.ts`. Efeito esperado de P1 + P2 + P5: integração 4/4 com ~341 s de teste
mais ~70 s de preparo, coverage em ~20 s, e o frontend de 499 s para ~310 s. A parede vai de 605–714 s para ~430–450 s
[inferido].

### Segunda passada (mesma data): o que ainda sobrava

Medido depois da primeira versão deste documento. Cada número é de **uma execução** local (Windows, 16 núcleos),
salvo indicação. A variação entre execuções iguais chegou a ~15 %.

#### P9. WAL no banco de teste — corta ~38 % de um arquivo pesado

- **Fato:** sob Jest, `src/lib/prisma.ts:20` pula os PRAGMAs [lido]. O banco de teste roda então no modo padrão do
  SQLite, com journal `DELETE` e `synchronous` FULL: cada commit força gravação no disco. Produção roda em WAL.
- **Medida:** pus `PRAGMA journal_mode = WAL` + `synchronous = NORMAL` no `beforeAll` de
  `seedAccountingFixtureCli` e rodei uma vez: o arquivo caiu de **70,0 s para 43,7 s**. Por teste: 27,8 → 17,9 s,
  21,0 → 13,2 s e 13,4 → 9,7 s. Com `MEMORY` + `OFF`, deu 61,7 s. O `synchronous` vale por conexão, e o pool do
  Prisma pode ter aberto outras que ficaram sem o PRAGMA [medido; a causa é inferida].
- **Mudança:** o `journal_mode = WAL` fica gravado no próprio arquivo. Basta aplicá-lo uma vez no banco-modelo
  (`templateDb.ts`), e toda cópia nasce em WAL. O `pushTestSchema` já trunca os `-wal`/`-shm` velhos (`db.ts:24-29`)
  [lido]. Para o `synchronous = NORMAL` valer em toda conexão, é preciso um init com await sob teste, que o comentário
  de `lib/prisma.ts` já prevê ("Add an awaited init() if a test ever does") [lido]. De quebra, o teste fica mais
  perto de produção.
- **Ganho no CI:** fsync no Linux do runner custa menos que no Windows, então o ganho deve ser menor que 38 % e
  concentrado nos arquivos que gravam muito (seed, fechamento, `rekeyLegacyUnitCli`) [inferido]. Junto com o P2 e o P3,
  isso ataca o shard 4/4 pelos três lados.
- **Prova:** `npx jest src/jobs/__tests__/seedAccountingFixtureCli.integration.test.ts --selectProjects integration
  --runInBand --verbose`, antes e depois; no CI, o `Time:` dos 4 shards.

#### P10. O server faz typecheck do `src/` duas vezes no CI

- **Fato:** `tsconfig.test.json` estende o `tsconfig.json` e inclui `src/**/*` (`server/tsconfig.test.json:17-18`)
  [lido]. O job `server-static` roda `tsc --noEmit` (16–22 s) e depois `tsc -p tsconfig.test.json` (32–45 s), que
  checa o `src/` de novo [medido o tempo; a sobreposição é lida].
- **Mudança:** rodar só o segundo, depois de conferir que nenhuma opção do `tsconfig.json` (ex. `rootDir`) pega erro
  que o de teste deixa passar [inferido]. Outra opção é cachear o `tsbuildinfo` no CI: os dois configs já têm
  `incremental` + `tsBuildInfoFile` em `dist/` [lido], mas o CI não guarda o `dist/`.
- **Ganho:** 16–22 s, fora do caminho crítico. Fica no fim da fila.

#### Custo medido do `--coverage` e do `--detectOpenHandles` (83 arquivos de unit, 1 worker, cache quente)

| Variante | Tempo |
|---|---|
| sem nada | 49,5 s |
| `--coverage` (provider padrão, babel) | 57,8 s e 66,9 s (duas execuções): +17 % a +35 % |
| `--coverage --coverageProvider=v8` | **201,1 s, 4× mais lento.** Não trocar |
| `--detectOpenHandles` | 59,9 s: +21 % |

O CI usa os dois em todo shard (`ci.yml`, passo "Run tests + assert no leaked handles") [lido]. Os dois juntos devem
custar ~35–50 % do tempo de teste de unit [inferido; não medi a combinação]. A cobertura alimenta o piso, então fica. O
`--detectOpenHandles` é o tripwire do TECH-DEBT-TEST-001. Tirá-lo de algum lugar troca garantia por tempo e é decisão
do dono (§5, item 6).

#### Investigado e descartado

- **Chave RSA do node-forge nos testes de SEFAZ** (`test/helpers/fakeSefaz.ts:28`, comentário "~1 s por chave"):
  medido hoje, são 63 ms para 3 chaves de 2048 bits, porque o forge usa o crypto nativo do Node [medido]. Não é isso
  que deixa `FiscalDocumentContingencia` (13,4 s local) e `SefazNfeEmissor` lentos. No `--verbose`, o tempo de
  `FiscalDocumentContingencia` se espalha por muitos testes de 300–800 ms, sem um ponto quente [medido]. A causa
  provável é a assinatura XML, mas falta perfilar.

#### Ainda não investigado (próxima rodada, se valer)

- Banco de teste em `/dev/shm` (RAM) no runner Linux: soma com o P9 ou o substitui [inferido].
- `pool: 'threads'` × `'forks'` no vitest. A doc diz que `forks` (o padrão) pode ser um pouco mais lento [externo].
- Perfil (`--cpu-prof`) dos 3 arquivos de unit acima de 10 s.
- Prisma com driver adapter ou query compiler (sem o engine em Rust) no SQLite. Não conferi o estado na 6.16.
- O custo de ~23 s de partida por execução local de integração: processo de 93 s contra 70 s de arquivo no seed
  (§1.4), entre transform frio, `globalSetup` e vaga [medido o total; a divisão não].

---

## 3. O que esta rodada corrige da rodada 1

1. **"Vitest fora da fila do build" (rodada 1 §5.1) rende pouco.** O `next build` leva 36–47 s com o cache (§1.1), e o
   vitest leva 237–313 s. Tirar o vitest do job economiza no máximo ~1,5 min, contando lint e tsc. O P1 rende 3×
   mais [medido].
2. **"Cache de `node_modules` e do client Prisma" (rodada 1 §6.1):**
   - o `prisma generate` leva menos de 5 s; cachear não vale;
   - cachear o `node_modules` é desaconselhado com `npm ci` [externo];
   - o custo real é a instalação do workspace inteiro desde o #1051, e o P5 trata disso [medido].
3. **`test:affected` de integração.** A rodada 1 dizia que o grafo de import "puxa quase tudo". Agora há número: 206 e
   208 de 246 arquivos (§1.4) [medido]. O `turbo --affected` decide por pacote, então selecionaria o server inteiro
   [externo]. A heurística por pasta da rodada 1 continua sendo a única opção. Não há nada a acrescentar.

## 4. O que não vale a pena

- **Transação com rollback por teste** (padrão do `@quramy/jest-prisma`). Exige que a aplicação use o client da
  transação do teste [externo]. Aqui, o `postEntry` abre a própria transação raiz (memória
  `postentry-tx-raiz-subrazao-2-commits`) e o app usa o singleton via factory [lido]. O rollback aninhado só existe
  como opção experimental, com SAVEPOINT [externo]. Mudaria a semântica justo do que a integração existe para provar.
- **Recopiar o banco-modelo a cada teste.** São 23,5 ms contra 11,5 ms do `DELETE` em lote (§1.4), e ainda exige
  desconectar o client [medido].
- **happy-dom:** continua sem medição aqui. Depois do P1 e do P7, o ambiente pesa pouco.

## 5. Decisões do dono

1. **P1, P2 e P5 mudam o comportamento do CI sem criar passo novo.** São um valor de configuração, um sequencer e uma
   flag de instalação. Leitura A: não colidem com a regra ⛔, porque nenhum deles é gate, rodada nem revisor. Leitura
   B: qualquer mudança no `ci.yml` é classe vermelha e vai para o lote diário, o que já acontece pelo
   `classe-risco.mjs`. A leitura mais segura é a B, e o caminho não muda: PR normal, lote do dono.
2. **Quem atualiza o `integration-durations.json` (P2)?** Opção manual: um script que lê os logs pelo `gh`, rodado de
   vez em quando por uma sessão, sem passo novo no CI. Opção automática: um passo no CI que publica as durações. Esse
   passo seria novo, e é decisão sua. Recomendo a manual.
3. **Relógio injetável no validador do binding (P3).** É uma costura de teste em código de produção. Só a divisão do
   arquivo dispensa essa decisão.
4. **Banco por worker (P4).** Mexe na base de toda a integração. Pergunta exata: "posso abrir um BRIEF do P4+P6, com a
   varredura dos testes que montam caminho de banco próprio?"
5. **Docker advisory filtrado (P8).** Ganha só fila de runner, e o build de imagem deixa de rodar em PR que não toca
   nada dela.
6. **`--detectOpenHandles` em todo shard custa ~+21 % no unit** (medido). Leitura A: mantém como está, porque é a
   garantia do TECH-DEBT-TEST-001. Leitura B: roda só nos shards de integração e no push da main, onde os handles
   reais (Prisma, servidor HTTP) aparecem. O risco da B é um vazamento novo num teste de unit só aparecer depois do
   merge. A mais segura é a A, até o P1 baratear o unit, e aí a diferença em segundos fica pequena.

## 6. Comandos usados (reproduzíveis)

```bash
gh api "repos/NightMarketz/luminaristest/actions/runs/<run>/jobs?per_page=50"   # fase × tempo (steps[].started_at/completed_at)
gh api "repos/NightMarketz/luminaristest/actions/jobs/<job>/logs" | grep -oE "(PASS|FAIL) +integration +[^ ]+ +\([0-9.]+ s\)"
cd server && npx jest src/jobs/__tests__/seedAccountingFixtureCli.integration.test.ts --selectProjects integration --runInBand --verbose --forceExit
cd server && npx jest --listTests --selectProjects integration --findRelatedTests src/features/accounting/services/PostingService.ts
cd my-app && npx vitest run <33 arquivos de lib/> --environment node --maxWorkers 4 --minWorkers 1
```

## Fontes externas

- [GitHub-hosted runners: 4 vCPU/16 GB em repositório público, 2/8 em privado](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [Jest `getMaxWorkers.ts`](https://raw.githubusercontent.com/jestjs/jest/main/packages/jest-config/src/getMaxWorkers.ts) · [Vitest 3.2.4 `workers.ts`](https://raw.githubusercontent.com/vitest-dev/vitest/v3.2.4/packages/vitest/src/utils/workers.ts)
- [`@jest/test-sequencer` (shard por hash)](https://raw.githubusercontent.com/jestjs/jest/main/packages/jest-test-sequencer/src/index.ts) · [Jest `testSequencer` com `shard()`](https://jestjs.io/docs/configuration#testsequencer-string)
- [Vitest: improving performance (jsdom ~200–500 ms por import, pools, isolate)](https://vitest.dev/guide/improving-performance) · [Vitest projects](https://vitest.dev/guide/projects) · [migração v4 (`environmentMatchGlobs` removido)](https://v4.vitest.dev/guide/migration)
- [Prisma raw queries: um comando por chamada](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries) · [@quramy/jest-prisma](https://github.com/Quramy/jest-prisma) · [SQLite: cópia de arquivo e journal/WAL](https://www.sqlite.org/howtocorrupt.html)
- [setup-node: cache do npm não é `node_modules`](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md) · [actions/cache: não cachear `node_modules` com `npm ci`](https://github.com/actions/cache/blob/main/examples.md) · [npm config (`audit`, `fund`, `prefer-offline`)](https://docs.npmjs.com/cli/v10/using-npm/config)
- [Required checks e workflow pulado](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks) · [turbo run `--affected` (por pacote)](https://turborepo.dev/docs/reference/run)
