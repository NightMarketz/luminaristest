# AV-CONSOLIDADO — as duas metades da pilha deixaram o mesmo buraco, e o instrumento que existia para achá-lo o descartou por regra própria

**Isolamento de inquilino e autorização são as únicas invariantes que nenhum teste alcança nos dois lados da pilha — reexecutado por mim nesta rodada, não herdado: uma sonda de `throw` no ponto de escrita do razão e outra na guarda de papel do frontend ficaram mudas em 1.850 + 122 testes verdes.**
**O risco principal não é a lacuna: é que a lista de obrigações de teste do projeto (as 110 do AV-R2) não contém essas unidades, porque o funil dela qualifica por MENÇÃO — `PostingService` é nomeado por 9 arquivos de teste e importado por 1, e uma das menções é um regex `FORBIDDEN` que existe para proibir o símbolo.**

> **ESTA RODADA CORREU FORA DE ORDEM.** O pedido dizia para consolidar *depois* das correções e da
> revisão independente. Nenhuma das duas aconteceu: os 7 achados triados em `TRIAGEM-R1-R3.json`
> continuam **todos por corrigir**, e **nenhuma** das cinco rodadas `auditoria/1.1` do diretório
> passou por agente separado (medido: 4 declaram `review_of_this_run: null`, 1 é v3 e omite o campo).
> O que está abaixo é um retrato de `59c1eb9b`, e a lista do que estava aberto está no §7.

---

## 1 · Enquadramento

Sistema **nunca implantado** (respondido pelo dono em 2026-08-03). Todo achado é lacuna de
pré-lançamento; **teto de nível 3**; nível 4 é estruturalmente inalcançável e nenhum achado aqui se
apoia em runtime. Portões derivados do ramo `nunca implantado` do `gateMap` v4.1.

## 2 · Placar por instrumento

Peça central `instrument_board` — primeiro uso deste tipo desde que ele foi declarado no contrato.

| Instrumento | Modo | Sinal principal | Risco principal | Nível | Teto |
|---|---|---|---|---|---|
| AV-R1 (AV-16/17/18/19 + AV-03 não medido) | herdado, não reexecutado | `agent_authored_ratio` 0,941 no recorte de 238 commits | Qdrant publicado sem chave; nome de variável divergente no compose | 2 | 3 |
| AV-R2 (AV-20) | herdado, não reexecutado | 110 obrigações de teste em 476 unidades | a lista **exclui** o caminho de escrita do razão — §4 C1 | 3 | 3 |
| AV-R3 (AV-03 backend) | **sinal-chave reexecutado** | `mutation_score` 2/7 (herdado) | escrita no razão sem cobertura de integração (dano 4) | 3 | 3 |
| AV-R5 (AV-03 frontend) | **sinal-chave reexecutado** | `mutation_score` 4/7 (herdado) | 17 adaptadores de API sem teste próprio (dano 4) | 3 | 3 |
| AV-L1 (contrato de camadas) | herdado; C1 reexecutado | fronteira §2.1 barrada por teste | UTC-shift em data-only no Lead360 | 3 | 3 |
| verificação em navegador (D1–D3) | **fora do envelope** | — | vazamento de listener na própria bancada | n/a | n/a |

**`4/7` contra `2/7` não ranqueia as suítes.** São conjuntos de mutação diferentes, dirigidos a
invariante, escolhidos à mão em recortes disjuntos; o próprio AV-03 declara amostra dirigida, não
estimativa estatística. Qualquer frase da forma "o frontend é mais forte que o backend" tirada
desses dois números é invenção, e este consolidado não a emite.

## 3 · Achados desta rodada, por dano

Três, todos novos — **nenhum reemite os 7 já triados**. Cada um só existe cruzando dois relatórios.

| # | Achado | Dano | Exposição | Portão |
|---|---|---|---|---|
| C1 | Isolamento e autorização são as únicas invariantes sem teste alcançável nas duas metades | 4 | `ja_exposto` | bloqueia_primeiro_cliente |
| C2 | O funil do AV-R2 desqualifica unidade por MENÇÃO, e foi assim que o caminho do razão saiu da lista | 3 | `ja_exposto` | bloqueia_primeiro_cliente |
| C3 | A barreira que o AV-R1 F4 aponta no repositório falha dentro da própria bancada: 5 de 5 rodadas sem revisão independente | 3 | `ja_exposto` | bloqueia_primeiro_cliente |

Os 7 achados de R1/R3 permanecem com o portão que `TRIAGEM-R1-R3.json` lhes deu — 1
`bloqueia_deploy` (Qdrant), 5 `bloqueia_primeiro_cliente`, 1 `aceito_com_registro`. Este
consolidado **não os retria**.

## 4 · Costuras entre instrumentos

O produto desta rodada. Para cada uma: o que só aparece cruzando dois relatórios, **e qual
instrumento deveria tê-la achado sozinho**.

### C1 · O mesmo buraco medido duas vezes por instrumentos que não se leram

**O que cada lado viu.** No backend (AV-R3), M3 (`tx` fora da transação) e M5 (filtro de inquilino)
sobreviveram *sem serem executadas*. No frontend (AV-R5), M4 (`unitId` fora da query) e M5 (guarda
de papel → `false`) sobreviveram *sem serem executadas*. Cada relatório leu isso como um item da
própria tabela de mutação.

**O que só aparece na junção.** Das 14 mutações aplicadas nas duas rodadas, as **quatro** que
sobreviveram por inalcançabilidade — não por falta de asserção — são exatamente as de **isolamento
de inquilino e autorização**, duas de cada lado. Todas as outras ou morreram, ou sobreviveram com a
linha executada. Não é coincidência de amostra: é uma classe inteira sem rede, medida duas vezes,
de duas linguagens, por dois agentes que não leram um ao outro.

**Reexecutado por mim, com controle positivo** (o que os dois relatórios originais não tinham):

| Sonda | Suíte | Suítes/Testes | Leitura |
|---|---|---|---|
| baseline backend | `unit` + `integration` | 154 / 1850 verdes | linha de base válida |
| `throw` em `PostingRepository.create` **e** `JournalEntryRepository.findById` | `integration` | **31 / 344 verdes** | nenhuma das duas linhas executa |
| as mesmas duas sondas | `unit` | **123 / 1506 verdes** | nem no unit — zero em 1.850 testes |
| **controle positivo**: `throw` no *carregamento* de `PostingRepository.ts` | `integration` | **20 suítes falham ao carregar**, `Tests: 0 failed` | o módulo É carregado por 20 de 31 suítes |
| baseline frontend | `vitest` | 26 / 122 verdes | linha de base válida |
| `throw` em `getAccounts` **e** na guarda de papel (`withAuth.tsx:99`) | `vitest` | **26 / 122 verdes** | nenhuma das duas executa |
| **controle positivo**: `throw` no carregamento dos dois arquivos | `vitest` | **2 suítes falham**, e as duas acusam `accounting.service.ts` | o adaptador carrega em 2 de 26; `withAuth.tsx` **em nenhuma** |

Sem o controle positivo, "a sonda não disparou" é indistinguível de "a sonda está morta". Com ele, a
afirmação fica cortada em dois graus diferentes, e os dois importam: `PostingRepository` é
**carregado e nunca chamado**; `withAuth` **nunca é sequer carregado**. Isso refina o AV-R5 F2, que
media a mesma coisa por `grep`.

**Qual instrumento deveria tê-la achado sozinho: o AV-R2 (AV-20).** Ele é o único instrumento cujo
propósito declarado é enumerar obrigação de teste não atendida, e é o único que roda sobre o corpus
inteiro em vez de sobre 7 sítios escolhidos. Ele não achou — e a razão é a costura C2.

### C2 · A qualificação por menção, e a consequência declarada que ninguém aplicou no outro sentido

O AV-R2 partiu de 476 unidades, removeu 269 por serem "nomeadas em algum teste" e chegou a 110
obrigações. **`PostingRepository`, `JournalEntryRepository` e `PostingService` estão ausentes das
110** — foram removidos no degrau da menção. Medido agora:

| Unidade | Arquivos de teste que a NOMEIAM | Que a IMPORTAM |
|---|---|---|
| `PostingService` | 9 | **1** |
| `PostingRepository` | 9 | **3** |
| `JournalEntryRepository` | 3 | 3 |

Os dois arquivos batizados `PostingRepository.*.test.ts` (`moneyOverflow`, `concurrency`) **não
importam o repositório**: abrem `PrismaClient` cru. E uma das 9 menções a `PostingService` é a
linha 28 de `no-accounting-imports.boundary.test.ts`, um regex `FORBIDDEN` que existe para **proibir**
o símbolo — uma menção que afirma a ausência dele foi contada como sinal da presença de teste.

**Não harmonizo as duas versões, porque as duas estão certas sobre coisas diferentes.** O AV-R2
declarou o limite em `not_measured` NM1, textualmente: *"a lista diz que nenhum teste NOMEIA a
unidade, não que nenhum a executa"*. Isso é honesto e é sobre as 110 que **entraram**. O que ninguém
aplicou é a mesma consequência no sentido inverso — nas 269 que **saíram**. A menção é fraca nas duas
direções; a consequência foi escrita em uma só. O AV-03 mediu execução e achou o buraco em 7 sítios;
o AV-20 mediu nome e o perdeu em 476. Nenhum dos dois errou dentro do próprio recorte.

**Qual instrumento deveria tê-la achado sozinho: o próprio AV-R2**, trocando o predicado de
qualificação de "é nomeada" para "é importada". É o único degrau do funil que precisa mudar, e o
custo é o de reexecutar o funil.

### C3 · A barreira do AV-R1 F4 falha dentro da bancada que a mediu

O AV-R1 F4 mede que a revisão independente é a barreira central declarada do método e não deixa
artefato auditável (8 commits nomeiam revisão contra 207 merges). O que só aparece cruzando aquele
achado com os JSON emitidos: **das 5 rodadas `auditoria/1.1` deste diretório, 4 declaram
`review_of_this_run: null` e 1 (AV-L1, v3) omite o campo. Zero foram revisadas.** O instrumento que
reportou a barreira quebrada reproduziu a quebra em 100% das próprias execuções, incluindo esta.

**Qual instrumento deveria tê-la achado sozinho: o AV-17 (`review_reality`).** Ele mediu a realidade
da revisão pelo histórico de merges e parou aí; os artefatos de auditoria estavam sendo escritos no
mesmo diretório, na mesma sessão, com o campo em branco. O recorte dele era `git log`; a evidência
estava em `docs/audit/*.json`.

**O que impede isto de ser fatalismo, e é medido:** o gate já emite `[B10] rodada sem revisão
independente` para cada um dos cinco. O aviso existe, é lido e não bloqueia — a decisão de não
bloquear é do desenho, não um esquecimento.

## 5 · O que foi confirmado como sólido

Cada linha é um lugar onde o achado esperado **não apareceu**. Um consolidado que só lista problema
não serve para decidir.

| Onde se esperava achado | O que foi medido | Como |
|---|---|---|
| Gate de período **dentro** da transação (a classe de bug mais registrada do projeto) | mutação M1 **morta** por teste nomeado de TOCTOU | herdado do AV-R3 |
| Balanceamento exato do lançamento em centavos | mutação M4 **morta** nos dois lados: no serviço (AV-R3 M4) e refutando o modal (AV-R5 F3) | herdado |
| UTC-shift em data-only no frontend | mutação M1 **morta** por 3 testes | herdado do AV-R5 |
| `parseBrl` — o footgun de 100× | mutação M2 **morta** | herdado do AV-R5 |
| Paginação do `fetchAllRows` (blast radius de dashboard inteiro) | mutação M6 **morta** | herdado do AV-R5 |
| `formatCents` — escala do dinheiro na tela | mutação M7 **morta** por 10 testes em 8 arquivos | herdado do AV-R5 |
| Fronteira §2.1 (serviço Prisma dentro do motor de plugins) | `no-accounting-imports.boundary.test.ts` **verde**, 1/1 | **reexecutado** |
| Teste desligado escondido em qualquer dos dois corpora | `.skip(` / `.only(` / `xit(` = **0** no server e **0** no my-app | **reexecutado** |
| Segredo versionado | `.env` rastreado = **0** | **reexecutado** |
| Tipos quebrados | `tsc --noEmit` **exit 0** nos dois roots | **reexecutado** |
| Suíte instável sob as sondas | 154/1850 e 26/122 verdes na linha de base; o my-app foi **rodado de novo depois** da restauração e voltou 26/122. No server a restauração foi conferida por `git diff` vazio, **não** por nova corrida — limite declarado, não arredondado | **reexecutado, com o limite acima** |
| Trava de dependências sem integridade | 0 entradas sem `integrity`, 0 registros fora do npmjs | herdado do AV-R1 |
| Teste sem asserção | 0 no server (3.798 asserções) e 0 no my-app (219) | herdado |

## 6 · Honestidade metodológica

**Manchete rebaixada.** A leitura tentadora era "a suíte do frontend é o dobro da do backend"
(4/7 × 2/7). Não é uma comparação: recortes disjuntos, mutações escolhidas à mão, amostra dirigida
por declaração do próprio instrumento. Rebaixada a zero — o número aparece neste documento só como
citação de origem, nunca como ranking.

**Modo declarado.** `reduced_mode: true`. Rodaram: as duas suítes por completo, `tsc` nos dois roots,
e sete execuções de sonda. Não rodou: `next build` de produção (o gate que o projeto exige para tela
atrás de `withAuth` — e é justamente a HOC do achado C1), nada de runtime, nada de rede.

**Não medido transversal.** Os `mutation_score` (2/7 e 4/7), as 110 obrigações, os 4 achados do
AV-R1 e os 4 do AV-L1 são **herdados** — citados em prosa, registrados em `not_measured`, e **fora**
de `signals[]`. A regra que segui: só sinal que sustenta dano 4 ou 5 e que eu mesmo reexecutei entra
como meu. Os dois de dano 4 foram reexecutados; os de dano ≤ 3, não.

**A verificação em navegador (D1/D2/D3) não é um relatório.** Não existe `AV-R6` no repositório.
Aqueles três defeitos vivem só em prosa no `CONTINUACAO.md`, sem `fingerprint`, sem envelope, e por
isso **não entram** no placar nem nos portões. Consolidar prosa como se fosse `auditoria/1.1` seria
inventar sinal que nenhum instrumento emitiu.

**A árvore mudou embaixo de mim, e isso é medição, não desculpa.** Ao começar, `git status
--porcelain` estava limpo. Vinte minutos depois, `.github/workflows/ci.yml` tinha **26 linhas novas
não commitadas** que ligam `scripts/bancada-gate.mjs` ao CI — ou seja, alguém está fechando o item 6
do `CONTINUACAO.md` em paralelo, neste mesmo worktree. Não toquei no arquivo. Se essa mudança for
commitada, o item 6 deixa de estar aberto e este consolidado envelhece nesse ponto.

**Viés próprio, nomeado, em ordem de quanto me incomoda.**

1. **Reexecutei o que já sabia que ia confirmar.** Os dois falsificadores de dano 4 vieram escritos
   pelos relatórios de origem, e eu os rodei tal como estavam. Bateram valor por valor (0, 17/0/3,
   20/0). O contrapeso que apliquei foi rodar um **controle discriminante** em cada um — 10
   arquivos de integração casam `PrismaClient`, 26 arquivos de teste e 219 `expect(` existem no
   my-app — para separar "zero real" de "comando quebrado". O que isso não corrige é que eu escolhi
   confirmar por reexecução em vez de tentar refutar por um caminho independente.
2. **A costura C1 é uma conclusão que eu queria encontrar.** Ela estava escrita como hipótese no
   item 2 do `CONTINUACAO.md` antes de eu medir qualquer coisa, e eu fui medir exatamente ela. A
   defesa que construí foi o controle positivo de carga, que **teria falhado** se eu estivesse errado
   — e ele mudou a conclusão em um ponto: `withAuth` não é só não-executado, é não-carregado, o que
   o AV-R5 não afirmava. Uma medição que só confirma não teria produzido essa diferença.
3. **Emiti três achados numa rodada cujo trabalho é consolidar.** Há um incentivo óbvio para uma
   rodada de síntese "achar algo próprio" e justificar a própria passagem. Os três são falsificáveis
   por comando de um segundo; o C3, em particular, condena esta mesma rodada, o que é o único sinal
   de que não os escolhi por conveniência.
4. **Sou juiz de instrumentos que a mesma sequência de sessões escreveu.** Não há revisor
   independente aqui (é o C3), e a única coisa que separa este consolidado de um autoelogio é que
   cada número tem um comando ao lado.
5. **Herdei a lista de operações irreversíveis do dono a partir da triagem, não do perfil.** A
   semente do `bancada.html` tem `irreversible: null`; foi `TRIAGEM-R1-R3.json` que tratou as 8
   propostas como ratificadas. Meus três achados não intersectam nenhuma delas, então o portão não
   muda — mas se a lista real do dono for outra, essa afirmação cai.

## 7 · O que continuava aberto quando isto rodou

Consolidar antes é consolidar um retrato que muda na semana seguinte. O que estava aberto em
`59c1eb9b`:

1. **Os 7 achados triados não foram corrigidos.** Nenhum. A fila em `ordering.sequence` está intacta.
2. **Nenhuma rodada foi revisada por agente separado** — nem R1, R2, R3, R5, L1, nem esta. É o C3.
3. **O gate ainda não roda em lugar nenhum** por conta própria — com a ressalva medida acima: uma
   mudança não commitada em `ci.yml`, de outra sessão, estava prestes a fechar isso.
4. **`next build` de produção do `my-app` nunca rodou**, e é o gate que o projeto exige justamente
   para tela atrás de `withAuth`.
5. **D1/D2/D3 (defeitos de runtime da própria bancada) não foram triados nem corrigidos.**
6. **As correções que vieram da revisão da reconstrução (mutações E e G) nunca tiveram segunda
   revisão.**

## 8 · Três movimentos mais baratos

O de maior dano entra obrigatoriamente.

1. **Um teste de integração que poste pelo `PostingService` real** e afirme (a) rollback da perna e
   (b) isolamento na leitura por id. Fecha a metade backend do C1 (dano 4) e é o único item que
   remove a lacuna medida por execução, não por nome. *Esforço: médio — um arquivo.*
2. **Dois testes no frontend: um do adaptador afirmando a query de `getAccounts` com `unitId`, e um
   de render do `withAuth` com papel insuficiente.** Fecha a metade frontend do C1 e leva
   `withAuth.tsx` de "carregado por zero suítes" para "carregado". *Esforço: baixo.*
3. **Reexecutar o funil do AV-R2 com "é importada" no lugar de "é nomeada".** Fecha o C2 e devolve à
   lista de obrigações as unidades que a menção removeu — inclusive as três do caminho do razão.
   *Esforço: baixo — é um degrau do funil.*

## 9 · Portão por achado

Mapeamento do ramo `nunca implantado` (emenda v4.1), sem julgamento meu:

> irreversível ou perda de dado → `bloqueia_deploy` · `ja_exposto` → `bloqueia_primeiro_cliente` ·
> `com_dado_de_terceiro` → `bloqueia_primeiro_cliente` · `apos_deploy` não irreversível →
> `bloqueia_primeiro_cliente` · `latente_por_dependencia` → `aceitavel_com_registro` com gatilho
> nomeado · `com_volume` e `apenas_teorico` → `aceitavel_com_registro` com gatilho

C1, C2 e C3 são `ja_exposto` e nenhum toca uma das 8 operações irreversíveis declaradas → os três
saem em `bloqueia_primeiro_cliente`. Nenhum é `bloqueia_deploy`: a lacuna é de teste, não de dado
publicado. Isto é **proposta**; a triagem sobrescreve.
