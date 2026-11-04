# Pesquisa de testes, rodada 3: projetos externos que ajudam (04/11/2026)

**Escopo:** só pesquisa. Nenhum código, CI ou suíte local foi alterado ou rodado. Esta rodada não repete as
[rodada 1](PESQUISA-TESTES-2026-11-04.md) (PR NightMarketz/luminaristest#1064) nem a [rodada 2](PESQUISA-TESTES-2-2026-11-04.md)
(PR NightMarketz/luminaristest#1072, medida). Ela procura o que projetos de fora fazem e o que aprender com eles.

**Como foi feito:** três levantamentos em paralelo, por subagentes, cada um cobrindo dois temas. As fontes citadas foram
lidas pelo subagente que as menciona. **Não reabri as fontes uma a uma nesta sessão do documento**; as marcas de grau
dizem o que cada subagente declarou ter lido. Quando a evidência é só resumo de busca ou blog, está marcada.

**Graus:** **[lido]** = o subagente abriu a fonte primária (código, doc oficial ou artigo) e citou o trecho ou a seção;
**[inferido]** = conclusão nossa a partir de fonte lida, ainda não provada no Luminaris; **[não verificado]** = achado de
busca que não foi aberto.

**Risco principal:** a maioria das lições é de velocidade e de "o que o teste prova", e não colide com a regra ⛔ (sem
aparato de auditoria novo). Mudança em `ci.yml` (sequencer, cache de relatório, job novo) é classe vermelha e fica para
decisão do dono (§7).

---

## Lições de maior retorno

1. **Sequencer próprio, balanceado por duração, para o shard de integração.** O sequencer do Jest divide por hash do
   caminho, e a ordenação do `sort()` não equilibra shards [lido: `jest-test-sequencer`]. A solução externa é um
   sequencer que lê tempos salvos e atribui o maior arquivo ao shard mais leve (método de diferenças, ou LPT). Confirma a
   rodada 2 (P2). Custo: baixo a médio.
2. **Banco-modelo copiado por worker, em vez de um `test-integration.db` compartilhado.** O padrão encontrado é de
   Postgres (template migrado uma vez, clone por `JEST_WORKER_ID`) [lido]. Não achei projeto open source com a versão
   SQLite de Prisma. A tradução para cá é inferência. O custo de WAL com vários escritores é real: a doc do SQLite
   avisa de `SQLITE_BUSY`, então o ganho precisa de `busy_timeout` e medição antes de virar promessa [lido: sqlite.org/wal].
3. **Seed de cenário com factories, semente e data de referência fixas.** O Fishery define factories tipadas com
   overrides profundos [lido: README]. O Faker reproduz a sequência só com `faker.seed`, e datas relativas exigem uma data
   de referência fixa, que a doc não garante entre versões [lido]. O Prisma separa o seed do reset [lido: doc oficial].
   Para gerar o banco descartável, a API de backup do SQLite faz cópia consistente, enquanto copiar o arquivo aberto
   pode corromper [lido: sqlite.org/backup].
4. **Playwright com login salvo por perfil e baseline de print gerado num ambiente Linux fixo.** O `storageState` vem de
   um projeto `setup` que roda antes dos demais [lido: playwright.dev/docs/auth]. O `toHaveScreenshot` grava o baseline
   com sufixo de browser e plataforma, e a doc recomenda rodar no mesmo ambiente que o gerou [lido]. Baseline gerado no
   Windows não serve ao CI Linux. O `page.clock` fixa a data só no navegador [lido].
5. **Testar relatório contábil contra valores esperados fixos, com limpeza explícita por empresa de teste.** O ERPNext
   testa o General Ledger com empresa `_Test Company`, apaga o lançamento antigo antes de cada teste e confere
   linha a linha, subtotal e total [lido: `test_general_ledger.py`]. O Odoo cria duas empresas novas por classe de teste
   a partir de um plano de contas de template [lido: `account/tests/common.py`]. Padrão portável, não código portável.

---

## Tabela-resumo

| Projeto | O que resolve | Lição para nós | Custo | Grau |
|---|---|---|---|---|
| Jest `jest-test-sequencer` | Ordem e shard do Jest | Shard por hash não balanceia; precisa de sequencer próprio | Baixo | [lido] |
| Tenbin (via artigo Zenn) | Shard balanceado por duração | Método de diferenças, duração ausente como 0,01 (não 0) | Médio | [lido] artigo; repo não aberto |
| Walrus AI (artigo) | Banco-modelo por worker | Template migrado uma vez, clone por worker (Postgres) | Médio-alto | [lido] Postgres; SQLite [inferido] |
| Prisma `TESTING.md` | Banco de teste do próprio Prisma | Banco novo por suíte; não serve de modelo para paralelismo | — | [lido] |
| Corentin Dautreme (artigo) | Limpeza entre testes com SQLite | `DELETE` em lote por tabela, sem `TRUNCATE` no SQLite | Baixo | [lido] |
| SQLite WAL (doc) | Leitura concorrente | WAL persiste no arquivo; cuidado com `SQLITE_BUSY` | Baixo | [lido] |
| Jest CLI (doc) | `--shard`, `--onlyChanged` | `--shard` exige sequencer; `--onlyChanged` exige grafo estático | — | [lido] |
| Vitest `sequence` (doc) | Shard e ordem no Vitest | Mesmo padrão de sequencer para o front | Baixo | [lido] |
| Playwright `storageState` | Login reutilizado | Um setup por perfil; arquivo de sessão é credencial | Baixo | [lido] |
| Playwright snapshots | Comparação de print | Baseline só num ambiente Linux fixo | Médio | [lido] |
| Playwright Docker | Browser reprodutível | Fixar a imagem na versão do pacote | Baixo | [lido] |
| Playwright fixtures | Cenário reutilizável | `base.extend`, escopo por worker e por teste | Baixo | [lido] |
| Playwright clock | Data fixa na tela | Só `Date` no browser; o servidor tem o próprio relógio | Baixo | [lido] |
| Fishery | Factories tipadas | Factories de cenário; gravação via camada do projeto | Baixo | [lido] README; manutenção não verificada |
| Faker seed | Dados determinísticos | Semente e data de referência fixas; versão fixa | Baixo | [lido] |
| SQLite backup API | Cópia consistente do banco | Gerar o modelo com backup, não com `cp` | Baixo | [lido] |
| Prisma seeding | Seed separado do reset | Comando próprio de cenário | Baixo | [lido] |
| Clone de template Prisma + SQLite | Migrar uma vez, clonar por teste | Ganho modesto; o gargalo é o cenário | Baixo-médio | [inferido] resumo de busca |
| StrykerJS incremental | Mutantes reaproveitados | Já em uso; ver se o relatório vai para o CI | Zero | [lido] doc |
| mbj/mutant `--since` | Mutação só em linhas alteradas | Full noturno + diff no PR | Baixo | [lido] doc |
| Vitest `related` / `--changed` | Testes afetados por arquivo | Cobre o front sem Stryker | Zero | [lido] doc |
| Odoo | Testes de contabilidade | Empresa-base por classe com plano de template | Médio | [lido] estrutura; [inferido] aplicação |
| ERPNext / Frappe | Relatórios contábeis | Valores esperados fixos e limpeza por empresa | Médio | [lido] |
| Dolibarr | Testes contábeis em PHP | Nomenclatura por classe; pouco ganho técnico | Baixo | [lido] listagem apenas |
| Akaunting | Contabilidade em Laravel | Nada aproveitável que eu tenha visto | — | [lido] superficial |

---

## 1. Jest e Vitest em monorepo (tema 1)

- **Shard por duração.** O `shard()` padrão ordena por SHA-1 do caminho e corta em fatias [lido: `@jest/test-sequencer`].
  Por isso um arquivo de 114 s cai sempre no mesmo shard. O subagente notou que o comentário do código diz "sem tempo vai
  por último", mas a ordem efetiva põe esses primeiro [lido, mas não reconferido por nós]. Não dependa do `sort()`.
  **Lição:** sequencer próprio que lê tempos de um arquivo versionado ou de um cache de CI e distribui por LPT.
  **Custo:** baixo na lógica, mas exige decidir de onde saem os tempos (§7).
- **Tenbin.** O método de diferenças atribui arquivos a partitions de tempo parecido. Duração ausente entra como 0,01, não
  0 [lido: artigo; o repo não foi aberto]. **Custo:** médio, com reporter e persistência.
- **Vitest `sequence`.** Tem `sequencer` com `shard` e `sort`; o shard vem antes do sort e só vale com `--shard`. Usar
  `shuffle` perde o ganho de cache [lido: docs do Vitest]. **Lição para o front:** o mesmo padrão, se o job de front
  continuar pesado.
- **Seleção de afetados.** O `--onlyChanged` e o `--changedSince` do Jest exigem grafo estático de dependência; `require`
  dinâmico quebra [lido: docs do Jest]. O `test:changed` atual usa essa flag, então vale checar casos dinâmicos antes de
  confiar nele.
- **Sem achado.** Não achei ferramenta de afetados para Jest fora do próprio Jest (Nx, Turborepo ou similar); o Turborepo
  seleciona por pacote, não por teste [lido na rodada 2]. Não pesquisei cache de Jest entre runs no GitHub Actions.

## 2. Prisma e SQLite na integração (tema 2)

- **Banco por worker.** O padrão encontrado é Postgres: template migrado uma vez, `CREATE DATABASE ... TEMPLATE` por
  `JEST_WORKER_ID`, e truncate em milissegundos [lido: Walrus AI]. A versão SQLite é copiar o arquivo `.db` migrado por
  worker e apontar `DATABASE_URL` pelo `JEST_WORKER_ID` [inferido]. O Jest não expõe hook por worker; o setup precisa
  ler a variável.
- **Limpeza.** O artigo de Corentin Dautreme limpa por `DELETE` em todas as tabelas de `sqlite_master` via `$executeRaw`,
  e o `db push` leva 168 ms [lido]. Isso bate com a nossa medida de DELETE em lote (11,5 ms, rodada 2).
- **WAL.** WAL é persistente no arquivo, dá leitura concorrente, mas um escritor por vez. Só funciona em host local, não
  em rede. Pode dar `SQLITE_BUSY` no fechamento e na recuperação; a doc indica versões corrigidas a partir de 3.51.3
  [lido: sqlite.org/wal]. **Lição:** com `busy_timeout` e medição antes da promessa.
- **Backup API.** Gera cópia consistente. Copiar o arquivo aberto pode corromper em queda [lido: sqlite.org/backup].
- **Prisma.** O `TESTING.md` do próprio Prisma (commit 686d4d1) trata banco novo por suíte, descartado depois. Não fala de
  WAL, template nem paralelismo [lido]. Não tire modelo de paralelismo dele.

## 3. Seed de cenário, factories e fixtures (tema 3)

- **Factories.** Fishery: `Factory.define<T>()`, `build()` com overrides profundos, `sequence`, `transient`, e
  `create` com `onCreate` e `afterCreate` [lido: README]. Manutenção não verificada (sem data de último push).
  **Lição:** factories para cenário (empresa, NF-e, lançamento). A gravação deve passar pela camada de serviço ou
  repositório do Luminaris, não pelo Prisma direto, para não furar as camadas.
- **Determinismo.** Faker só reproduz a sequência com `faker.seed`; datas relativas exigem data de referência fixa, e
  valores podem mudar entre versões [lido: fakerjs.dev]. **Lição:** semente e `refDate` fixos no cenário, e versão fixa.
- **Relógio.** `page.clock.setFixedTime` mexe só em `Date` do navegador; o servidor continua com o próprio relógio
  [lido: playwright.dev/docs/clock]. O seed de cenário precisa de data fixa também no banco. Hoje o seed de
  `seedAccountingFixtureCli` usa o dia de hoje (rodada 2, P3).
- **Seed separado.** Prisma roda o seed só com `prisma db seed`, configurado em `prisma.config.ts`; na v7 saiu o seed
  automático de `migrate dev` e `reset` [lido: doc oficial]. Um snippet de busca mencionava `package.json`, que é versão
  antiga; use a doc.
- **Modelo do banco.** Gerar o banco descartável com a API de backup do SQLite [lido].
- **Clone de template.** `@farbenmeer/prisma-migrate-test` e o artigo de curling.io descrevem template em memória e
  clones por teste, com ganho modesto (3,2 s contra 2,6 s em 594 testes, segundo o artigo) [inferido; não abertos].
  **Lição:** o gargalo é o que roda por cenário, não a migração.

## 4. Teste de tela e e2e barato (tema 4)

- **Login salvo.** Projeto `setup` com `/.*\.setup\.ts/`; `storageState` grava a sessão, e os demais projetos usam
  `dependencies: ['setup']` [lido: playwright.dev/docs/auth]. **Lição:** um setup por perfil (admin, contador, operador).
  A pasta de auth vai no `.gitignore`, porque o arquivo tem cookie e é credencial.
- **Baseline de print.** `toHaveScreenshot` grava em `<arquivo>.spec.ts-snapshots/` com o nome do browser e da plataforma
  (ex.: `chromium-darwin`); `threshold` padrão 0,2 e `maxDiffPixels` [lido: playwright.dev/docs/test-snapshots]. A doc
  recomenda gerar o baseline no mesmo ambiente do CI. **Lição:** Windows não gera baseline para CI Linux. Fixar a imagem
  oficial `mcr.microsoft.com/playwright` na versão do pacote [lido: playwright.dev/docs/docker].
- **Atualizar baseline com revisão humana.** Guias de visual regression dizem que `--update-snapshots` pode aprovar uma
  regressão real, e recomendam checagem visual fora do gate rápido [inferido; resumo de busca de argos-ci e testquality].
- **Fixtures de cenário.** `base.extend<T>()` com setup antes de `await use()` e teardown depois; `scope: 'worker'` para
  dado compartilhado [lido: playwright.dev/docs/test-fixtures]. Serve para login, navegação e limpeza por roteiro.
- **Substituir o runbook de tela.** Pelo que o subagente achou, o Playwright cobre o que o `runbook-tela.mjs` faz
  (sessão, navegação, print), com fixtures e baseline versionado. Não há número de custo de CI; o custo de armazenar
  baselines e de revisá-los é qualitativo.

## 5. Mutação e análise de impacto (tema 5)

- **Stryker incremental.** Já está no Luminaris (`@stryker-mutator/core` 8.7.1 no lockfile [lido: lockfile]). A doc fala
  de `--incremental`, do relatório em `reports/stryker-incremental.json`, e de reuso de "Killed" quando o teste culpado
  não mudou [lido]. A detecção de mudança de teste depende do runner: Jest e Vitest usam localização, então vale
  conferir se o reuso é fino ou conservador no nosso caso.
- **Cache do relatório.** Se o `reports/` não for cacheado no CI, o incremental roda do zero a cada job. Hoje o
  mutation roda fora do CI [lido na rodada 1]. Ver se o cache seria viável é uma pergunta aberta, não uma recomendação.
- **Diff contra commit.** O StrykerJS não tem `--since` (a doc não menciona). O `mbj/mutant` tem `--since <ref>`, que
  seleciona só os sujeitos cujo intervalo de linhas cruza um hunk do `git diff` [lido: mbj/mutant `docs/incremental.md`].
  **Lição:** o padrão de full noturno com diff em PR formaliza o que o `mutation-diff` já faz aqui. Não é ferramenta
  nova.
- **Testes afetados.** Vitest tem `related <arquivos>` (imports estáticos), `--changed [since]` e
  `--coverage.changed <ref>` [lido: vitest.dev/guide/cli]. **Lição:** o front já pode usar `related` para os arquivos
  mutados sem rodar Stryker inteiro. Custo zero.
- **Stryker.NET `since`.** Só resumo de busca [inferido]; não é ferramenta TS, não entra na lista.

## 6. ERPs open source com suíte madura (tema 6)

- **Odoo.** `addons/account/tests/` tem cerca de 80 arquivos Python, incluindo `test_tax_report.py` e
  `test_account_move_reconcile.py` [lido: estrutura]. `AccountTestInvoicingCommon` (`common.py`) cria duas empresas novas
  por classe, carrega o plano de contas por template do país, e monta taxas, produtos, parceiros e moeda estrangeira
  [lido]. **Lição:** a base de cada teste é uma empresa própria, criada em `setUpClass`, sem depender de seed global.
  **Custo:** médio; a stack é outra, só o padrão é portável.
- **ERPNext.** `test_general_ledger.py` usa `ERPNextTestSuite` e a empresa `_Test Company`; `clear_old_entries()` apaga
  o GL e o Payment Ledger da empresa antes de cada teste; as asserções são de linha, subtotal e total, por exemplo
  1000 + 200 = 1200 [lido]. **Lição:** o balancete e a DRE podem ser testados com valores esperados fixos, e não só com
  "débito = crédito". **Custo:** médio.
- **Dolibarr.** `test/phpunit/` tem `AccountancySystemTest.php`, `AccountingAccountTest.php` e `BookKeepingTest.php`
  [lido: listagem]. Conteúdo não lido. Pouco ganho técnico.
- **Akaunting.** `tests/` tem `Feature/` e `Unit/`, sem arquivo de contabilidade visível no nível de topo [lido:
  superficial]. Não achei padrão de fixture que valha copiar.
- **Lacunas nos ERPs.** Não achei arquivo dedicado de balancete ou balanço com valores fixos em Odoo, Dolibarr ou
  Akaunting. Não li a configuração de CI de nenhum dos quatro, então não sei tempo de suíte nem estratégia de
  paralelismo.

---

## 7. O que é decisão do dono

Pela regra do projeto, nada aqui é recomendação fechada de passo novo no CI. Propostas, com a leitura de risco:

1. **Sequencer por duração e de onde saem os tempos.** Lê um arquivo versionado (atualizado à mão) ou um artefato de
   CI? Arquivo versionado é mudança de config, mas fica velho. Artefato de CI é passo novo: classe vermelha, lote do dono.
2. **Banco por worker na integração (lição 2).** Mexe na base de toda a integração e é o item mais caro. Mesma pergunta
   da rodada 2 (P4): posso abrir o BRIEF?
3. **Cache do relatório do Stryker no CI.** Passo novo ou só cache de job. Decisão do dono.
4. **Baseline de print em Linux fixo (lição 4).** Passo novo de e2e. A rodada 2 já deixou essa decisão em aberto.
5. **Dar `related` ao front.** Sem mudança de CI, só uso local. Não precisa de decisão.

## 8. Ordem sugerida, sem executar nada

1. Sem CI e sem código: revisar se `test:changed` cobre os casos de `require` dinâmico (Jest CLI, §1).
2. Medir o ganho do WAL com `busy_timeout` antes de decidir o banco por worker (SQLite WAL, §2).
3. Montar um sequencer de teste local, sem rodar a suíte inteira, e decidir a fonte dos tempos (§1, §7).
4. Banco por worker e backup API para o banco descartável, em BRIEF próprio (§2, §3).
5. Login salvo e baseline de print em Linux, quando o dono decidir sobre e2e (§4).

## 9. Lacunas

- Não achei projeto open source com banco por worker em **SQLite com Prisma**. O padrão achado é Postgres.
- Não achei repositório medido de sequencer por duração em Jest; o Tenbin foi lido só pelo artigo.
- Não achei documentação oficial que recomende Docker como fonte de verdade para baseline comitado; essa recomendação
  vem de blogs.
- Não achei números medidos de custo de CI ou de armazenamento para baselines de print.
- Não pesquisei factory-bot (Ruby) nem bibliotecas de fixture de outros ecossistemas.
- Não li o `stryker.config`, o `package.json` do Luminaris nem a config de CI dos ERPs.
- Não verifiquei a manutenção do Fishery nem a compatibilidade de `@farbenmeer/prisma-migrate-test` com o Prisma atual.

## Fontes

- Jest `jest-test-sequencer`: https://github.com/facebook/jest/blob/master/packages/jest-test-sequencer/src/index.ts
- Jest CLI (`--shard`, `--onlyChanged`, `--changedSince`): https://jestjs.io/docs/cli
- Tenbin (artigo): https://zenn.dev/cybozu_frontend/articles/create-tenbin
- Vitest `sequence`: https://vitest.dev/config/sequence
- Vitest CLI (`related`, `--changed`): https://vitest.dev/guide/cli.html
- Walrus AI (banco por worker, Postgres): https://dev.to/walrusai/testing-database-interactions-with-jest-519n
- Corentin Dautreme (SQLite e Prisma em teste): https://corentindautreme.github.io/Using-SQLite-For-Your-Node-Prisma-Integration-Tests
- Prisma `TESTING.md`: https://github.com/prisma/prisma/blob/686d4d1a1485e779fe2c1cf888548ccfa03d4934/TESTING.md
- Prisma seeding: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding
- SQLite WAL: https://www.sqlite.org/wal.html
- SQLite backup API: https://www.sqlite.org/backup.html
- Playwright auth (`storageState`): https://playwright.dev/docs/auth
- Playwright snapshots: https://playwright.dev/docs/test-snapshots
- Playwright Docker: https://playwright.dev/docs/docker
- Playwright fixtures: https://playwright.dev/docs/test-fixtures
- Playwright clock: https://playwright.dev/docs/clock
- Fishery: https://github.com/thoughtbot/fishery
- Faker (`seed`, datas): https://fakerjs.dev/guide/usage
- Visual regression em CI (resumo de busca, não aberto): https://argos-ci.com/blog/playwright-visual-regression-testing-ci · https://testquality.com/playwright-visual-regression-guide/
- Clone de template SQLite e Prisma (resumo de busca, não aberto): https://www.npmjs.com/package/@farbenmeer/prisma-migrate-test · https://curling.io/blog/sqlite-test-isolation
- StrykerJS incremental: https://stryker-mutator.io/docs/stryker-js/incremental/
- mbj/mutant (`--since`): https://github.com/mbj/mutant/blob/main/docs/incremental.md
- Odoo: https://github.com/odoo/odoo
- ERPNext / Frappe: https://github.com/frappe/erpnext
- Dolibarr: https://github.com/Dolibarr/dolibarr
- Akaunting: https://github.com/akaunting/akaunting
- Stryker.NET (resumo de busca, não aberto): https://www.github.com/stryker-mutator/stryker-net/discussions/2860
