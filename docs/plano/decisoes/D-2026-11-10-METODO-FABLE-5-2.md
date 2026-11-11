---
id: "D-2026-11-10-METODO-FABLE-5-2"
tipo: "decisao"
dominio: "processo"
titulo: "Revisão do método com Fable 5.2 planejando e Opus 5.5 implementando: vermelho de código com revisor PASS entra sem o lote (fora a lista dura), pausa só em fork real, teste e fix num PR só, cbm deixa de ser obrigatório, retornos/PROVA aposentados, geradoras congeladas, Sonnet 5.5 em teste na faixa 1"
estado: "decided"
autorizacao: "dono, chat, 2026-11-10: \"Vamos fazer um questionamento se todas as etapas e nossos metodos de trabalho são realmente necessários agora com Fable 5.2 planejando, Opus 5.5 e Sonnet 5.5 implementando\"; depois \"Sim, questionário\". Respostas por AskUserQuestion: \"Estender com lista dura (Recomendado)\" · \"Pausa só em fork real\", \"Teste e fix num PR só\", \"cbm deixa de ser obrigatório\" · \"Aposentar retornos e PROVA\", \"Congelar as geradoras\", \"Docs mecânicos viram verde\" · \"Opus revisa, Sonnet em teste (Recomendado)\""
atualizado: "2026-11-10"
---
# D-2026-11-10-METODO-FABLE-5-2

**Estado:** `decided`. Emenda a [D-2026-10-28-FLUXO-AUTONOMO](D-2026-10-28-FLUXO-AUTONOMO.md) (resposta 2, merge) e
absorve a [D-2026-11-10-FAIXA1-MERGE-LIVRE](D-2026-11-10-FAIXA1-MERGE-LIVRE.md). Não cria gate, rodada nem revisor
(regra ⛔ do CLAUDE.md): tira etapas e muda a régua que já existe.

## Critério usado

Cada etapa do método existe por um de quatro motivos: autoridade do dono, oráculo externo, independência de erro ou
estrutura (fila, máquina, estado entre sessões), ou compensar o modelo. Só o último afrouxa quando o modelo melhora.

## O que foi medido (28/10 a 10/11, `gh pr list --state merged`)

- 203 PRs mergeados, nenhum com título de revert; mediana de 5,6 h entre abrir e mergear, p90 de 58 h.
- 65 dos 203 têm prefixo `docs`. Método (`docs/plano`, `docs/operating-manual`, `.claude`, `CLAUDE.md`, `scripts`): +8.127
  linhas; código de aplicação: +94.671.
- Revisor, lido no corpo de 17 dos 38 PRs que o citam: reprovação com defeito real no #1144 (proveniência da nota
  perdida), no #1143 (código da unidade A aparecendo na B) e no #1111 (arredondamento de meio bp); o #992 só passou na
  5ª rodada. Um falso positivo conhecido (A3 do #1013). Nessa amostra, a aprovação do dono por número não mudou nenhum
  resultado; o que mudou foi o dono decidir achado e fork (#1013, #1111).
- `.claude/retornos/`: 2 commits em novembro; `scripts/prova-runner.mjs` não muda desde outubro.
- Limite: sem produção até 2027, "zero revert" não prova qualidade; a contagem do revisor é de amostra.

## Respostas e a regra que passa a valer

| # | Pergunta | Resposta literal | Regra |
|---|---|---|---|
| 1 | Merge do vermelho de código | "Estender com lista dura (Recomendado)" | PR vermelho com `lote: não` no `classe-risco.mjs` entra pela maestro (squash) com PASS do `revisor-independente` no SHA de cabeça, em até 3 rodadas, todos os checks verdes, `MERGEABLE`, fora de draft, base `main`. Achado `A` aberto segura; `P` (pré-existente) não. O PASS continua valendo se os commits posteriores forem só rebase ou merge da `main` sem conflito em código, ou o commit que devolve o `GAP-MAP.md` à versão da base (condição 3-a da D-2026-11-10-FAIXA1-MERGE-LIVRE, que segue valendo para os PRs da faixa 1 abertos antes da emenda de 10/11); qualquer outro commit pede nova rodada. `lote: sim` segue no lote diário do dono |
| 2 | Sessões | "Pausa só em fork real" · "Teste e fix num PR só" · "cbm deixa de ser obrigatório" | (a) Escolha de rotina o agente faz e declara no PR, na seção "Escolhas tomadas"; pausa e pergunta só em fork de produto, de lei, de arquitetura ou irreversível. (b) Instrumentação e correção saem sempre num PR com commit `test:` (vermelho pelo motivo certo) e depois `fix:`; a prova do teste vermelho continua obrigatória. (c) O codebase-memory vira ferramenta disponível; reusar o canônico antes de criar continua regra |
| 3 | Aparato | "Aposentar retornos e PROVA" · "Congelar as geradoras" · "Docs mecânicos viram verde" | (a) Saem o agente `executor` e o `CONTRATO-DE-RETORNO` como etapa; a prova é o CI do PR. (b) As skills geradoras e o pipeline orquestrador → implementador → revisor não são mais invocados nem mantidos; o Contrato de arquitetura e os exemplos de referência ficam. (c) Ver "Correção do questionário" abaixo |
| 4 | Modelos | "Opus revisa, Sonnet em teste (Recomendado)" | O `revisor-independente` fica em Opus. Fable 5.2 planeja (BRIEF), Opus 5.5 implementa. Sonnet 5.5 entra em teste na faixa 1 (abaixo) |

## Lista dura (`LOTE_DURO` do `scripts/classe-risco.mjs`)

Texto da opção que o dono escolheu: "Todo vermelho de código com revisor PASS (até 3 rodadas) e CI verde entra sozinho.
Continuam no seu lote: migração e schema Prisma, auth, pagamento, transmissão e assinatura de DF-e, Reinf, openapi e
snapshot de DTO, baselines de gate, .claude/** e CLAUDE.md."

Como ficou em glob: schema e migração Prisma · `middleware/auth.ts`, `routes/auth.ts` · `openapi.json`,
`__dto-shapes__.json` e o teste `dtoShapeSnapshot` · pagamento (cobrança, conta de pagamento, provedor, relatório de
liberação, webhook) · DF-e (`accounting/dfe/**`, assinatura da NF-e e da NFS-e, certificado fiscal, emissão, credencial
PSC, assinador, polling, rotas `dfe*`) · Reinf · baselines de gate (`.dependency-cruiser*`, `eslint*.config.*`,
`debt-ledger-check`) · `.claude/**` · `CLAUDE.md`.

Também ficam no lote: vermelho de texto e qualquer arquivo em `docs/plano/{gates,decisoes,trilhos,rejeitadas}` e
`docs/adr`, de qualquer extensão; dependência major, draft, título "não mergear" e PR sem lista de arquivos.

**Acréscimos conservadores do agente, que a opção escolhida não cita. O dono pode tirar qualquer um:**

- `.github/**`, `scripts/classe-risco*` e `scripts/paralelo.mjs`: a própria régua. Sem isso, um PR poderia mudar a régua e
  entrar com o PASS do revisor.
- `withAuth`, `DynamicTableService.ts` e `my-app/types/contracts/**`: vêm da condição 2 da D-2026-11-10-FAIXA1-MERGE-LIVRE,
  que esta regra absorve.
- Leitura larga de "auth": `server/src/lib/jwt*`, `authController`, `authUtils`, `authUtilityController` e `AuthContext`.
- Leitura larga de DF-e: `server/src/lib/nfse*`, telas `components/dfe/**` e o cliente do assinador no FE.
- `ChargeReceivable*`/`ReceivableCharge*` (cobrança do recebível no FE) e `server/src/jobs/**/migrat*` (migração de dado por job).

A lista dura só vale para PR que já é vermelho. Ela não torna vermelho um PR verde, e a lista `VERMELHO` não mudou.

## Correção do questionário: "Docs mecânicos viram verde" já era verdade

A opção descrevia uma mudança que não era necessária. Conferido em 10/11:
`node scripts/classe-risco.mjs arquivos docs/plano/nos/F5.md docs/operating-manual/GAP-MAP.md` responde `verde`, e o
teste "FE não fiscal, doc de nó e teste são verdes" já cobria. Os 65 PRs de docs ficam vermelhos por causa de cédula,
ADR, `.claude/**` e `CLAUDE.md`, que o dono manteve no lote. Nada mudou na régua por esta resposta.

## Sonnet 5.5 em teste na faixa 1

- Texto da opção que o dono escolheu: "O revisor fica em Opus, que já pega defeito real hoje. Parte dos itens abertos da
  faixa 1 roda em Sonnet 5.5 e a taxa de PASS na 1ª rodada decide se ele entra de vez. A regra 'Sonnet vira Opus low'
  fica suspensa só nesse teste."
- Os próximos itens ainda sem PR da faixa 1 da auditoria de estruturas implícitas rodam em sessão com Sonnet 5.5.
  A regra [D-2026-09-23-SONNET-PARA-OPUS-LOW](D-2026-09-23-SONNET-PARA-OPUS-LOW.md) fica suspensa **só** nesses itens.
  A autorização anterior da faixa 1 ("Dispara a faixa 1 em opus médio 1 para cada categoria", no `GAP-MAP.md`) segue
  valendo para os itens que já têm PR.
- A opção fala em a taxa "decidir"; como nenhum limiar foi combinado, o número vai ao dono e ele decide.
- O revisor segue em Opus e não sabe o modelo que implementou.
- A maestro anota o modelo ao lado de cada PR no resumo. A comparação é: PASS na 1ª rodada e achados `A` por PR,
  Sonnet contra Opus, na mesma faixa.
- A decisão de o Sonnet entrar de vez é do dono, com os dois números na mão. A amostra é pequena (18 linhas abertas ou
  em PR na seção da faixa 1 em 10/11): o resultado orienta, não prova.

## Não coberto, fica como está

- **PR `integration/<slug>` → `main`** (D-2026-11-10-BRANCH-DE-INTEGRACAO, PR #1183, aberto em 10/11): esta regra fala de
  PR com base `main` revisado no SHA de cabeça. O PR de fechamento de uma integração não foi discutido: vai ao lote até
  o dono decidir se o PASS dos PRs que ele contém vale.
- **`.github/CODEOWNERS`** (#1149, na `main` desde 11/11; F-MRG-5 de 24/10): lista `server/src/features/accounting/` e
  `accountingBinding/` inteiros como caminho que espera a aprovação do dono. O arquivo só tem efeito se o ruleset da
  `main` passar a exigir review de Code Owners, e isso não está ligado. Se for ligado como está, todo PR contábil volta
  a esperar o dono e a resposta 1 desta decisão perde o efeito. As duas regras são do dono; qual vale é pergunta para
  ele antes de ligar o ruleset (encolher o CODEOWNERS até a lista dura, ou manter os dois).
- **`scripts/prova-runner.mjs` e o teste dele** foram removidos neste PR, depois de o #1152 entrar. A linha do
  `.gitignore` que ignora `.claude/retornos/_logs/*.log` fica, para os logs antigos não aparecerem como não rastreados.
  Os retornos já gravados em `.claude/retornos/` ficam como registro.
- **Gancho "cbm FIRST" do SessionStart** é do plugin, fora do repositório: a regra do CLAUDE.md vale sobre ele.

## O que não muda

- Autorização citável (ORCH-006) e `executa` por BRIEF; fork de produto, de lei ou de arquitetura é do dono.
- Gate humano e dado externo: desfecho e assinatura do dono.
- Revisor independente no vermelho de código, com o teto de 3 rodadas da D-2026-11-06-REVISAO-CONVERGENCIA.
- Teste vermelho pelo motivo certo antes do fix; `tsc`, `check:arch` e CI como gate.
- Fila (OPS-005), regras de máquina (D-2026-11-04-RECURSOS-LOCAIS), contrato de arquitetura e STOP DynamicTable × Prisma.
- PR de achado da faixa 1 não edita o `GAP-MAP.md`; a seção é atualizada pela orquestração, em PR só de docs (emenda de
  10/11 da D-2026-11-10-FAIXA1-MERGE-LIVRE).
- Campo de formulário de sessão com placeholder continua sendo pausa imediata: não é rotina nem fork.

## Revisão independente antes do commit (11/11)

A pedido do dono ("Dispara uma sessão em sonnet para" a lista de arquivos), uma sessão em Sonnet 5.5 leu o diff sem
editar. Achados reproduzidos e corrigidos: `__dto-shapes__.json`, certificado e emissão fiscal, `nfseSignature` e
`nfeSignature`, `jwt`/`authController`/`AuthContext` saíam `lote: não`; arquivo que não é `.md` em pasta de decisão
também; a frase "PR da faixa 1 não mexe no GAP-MAP" tinha sumido do prompt da maestro; o `CLAUDE-RAIZ-DETALHE.md` ainda
mandava perguntar ao cbm. Aceito sem mudança: no PR verde ninguém reexecuta o commit `test:` (lacuna declarada no mapa
do OPS-006).

## Como conferir que a regra está viva

- `node --test scripts/classe-risco.test.mjs`: 17 de 17 (11/11). Com a busca na `LOTE_DURO` sabotada
  (`const duro = undefined`), os testes da lista dura ficam vermelhos; restaurado, sha256 idêntico e 17 de 17.
- Varredura de 11/11 em todos os arquivos versionados: dos vermelhos de código que saem `lote: não`, os 13 com nome
  sensível (sign, cert, auth, token, payment, charge, emiss, migrat…) são falso positivo do filtro
  (`AccountantAssignment*` e `QualifAssinante*`).
- `node scripts/classe-risco.mjs pr <n>` imprime `lote: sim` ou `lote: não (entra com revisor PASS)` em todo vermelho.
- No resumo da maestro, vermelho mergeado traz o veredito e a rodada do revisor; `lote: não` sem PASS aparece como
  **sem revisor** no lote, não some.
