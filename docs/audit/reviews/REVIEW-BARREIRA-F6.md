# Revisão independente — barreira do F6 (AV-R8, dano 4)

**A barreira MORDE a invariante em 6 dos 8 handlers — provado por uma classe de mutação que o autor não escreveu (vazamento de inquilino no repositório), e não pela dele.**
**O risco principal: a "matriz de mordida" publicada pelo autor mede ALCANCE, não inquilino — as duas mutações dele que eu reexecutei matam pelo CONTROLE positivo, não pela asserção de inquilino; e `createAccount` e `seedYear` continuam sem nenhuma mutação que os mate pela invariante.**

| campo | valor |
|---|---|
| revisor | agente revisor independente (não escreveu os dois arquivos sob revisão) |
| data | 2026-08-07 |
| commit base | `e5de960c42843aeeecf115997efe095f7b2123d1` (detached) |
| worktree de medição | `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rev-f6` |
| artefatos sob revisão | `server/src/controllers/__tests__/accountingController.chartOfAccounts.integration.test.ts` (3 casos), `server/src/controllers/__tests__/accountingController.periods.integration.test.ts` (5 casos) — ambos `??` |
| achado | `handlers-de-contabilidade-fora-do-alcance-de-qualquer-teste-de-rota` (AV-R8 F6, rank 9 da TRIAGEM-AV-R8, dano 4, portão `bloqueia_primeiro_cliente`) |

---

## 2. Veredito

**`revisado_com_ressalva`.**

Eu **não** reprovaria a barreira: ela existe, roda, e mata mutação de inquilino de verdade. Reprovar seria
errado — o produto sob ela está correto e a rede que faltava passou a existir.

A ressalva tem duas pernas, e a primeira é sobre o **texto**, não sobre o teste:

1. **A matriz de mordida publicada nos dois cabeçalhos está rotulada errada.** Os cabeçalhos dizem
   "MORDIDA MEDIDA … a perna que este arquivo trava … é um usuário AUTENTICADO operando sobre recurso de
   OUTRO dono" e listam 8 mutações → 8 mortes. Eu reexecutei duas delas e li **qual asserção** morreu: nas
   duas, a que reprovou foi o **controle positivo** (o próprio dono operando o próprio recurso), e as
   asserções de inquilino nem chegaram a rodar. Trocar o dono por um literal inexistente prova que o
   handler é **alcançado** pelo teste — que é exatamente o achado F6 — mas **não** prova que a guarda de
   inquilino é medida. O número 8/8 é verdadeiro; a leitura que o cabeçalho faz dele não é.
2. **`createAccount` e `seedYear` não têm nenhuma mutação que os mate pela invariante.** As minhas duas
   classes novas (vazamento no repo) não os alcançam, e a do autor os mata pelo controle. Para esses dois
   handlers a barreira é de alcance, e só. No caso de `createAccount` há um agravante: o eixo apresentado
   como o de inquilino — o corpo que MENTE `userId`/`ownerUserId` — é **inerte por construção**, porque
   `CreateAccountSchema` é `z.object` sem `.passthrough()` e o Zod **descarta** chaves desconhecidas antes
   de qualquer código do controller. Aquela asserção verde prova o comportamento padrão do Zod, não uma
   guarda do produto. O cabeçalho do arquivo sabe disso ("são descartados em silêncio") e ainda assim
   vende o caso como a perna de inquilino.

Nenhuma das duas é motivo para reprovar o arquivo; as duas são motivo para não deixar o texto passar como
está. **Estou proibido de corrigir e não corrigi nada** — nem os testes, nem produção.

---

## 3. A pergunta que decide tudo: FECHA ou ENCOSTA?

**Fecha o RECORTE que o orquestrador decidiu; ENCOSTA o achado que o F6 escreveu. E — mérito real — é o
primeiro artefato desta linha que declara a própria fração em vez de dizer "fechado".**

O `instrument_feedback` do F6 cobra literalmente: *"Barreira que fecha item de fila precisa declarar a
fração da superfície que ela cobre — 4 de 55 é um fechamento, mas não o que o texto sugere."* Os dois
cabeçalhos declaram a fração, e **eu conferi cada número pelo meu próprio caminho** (contando as rotas nos
arquivos, não rodando o comando do autor):

| número declarado | meu método | resultado |
|---|---|---|
| 55 rotas no mount | `grep -oE "router\.(get\|post\|put\|patch\|delete)\('[^']*'" src/routes/accounting.ts \| sort -u \| wc -l` | **55** (55 linhas, 55 distintas — nenhuma duplicata inflando) |
| 29 de escrita / 26 de leitura | contagem por método na lista ordenada: 23 post + 4 delete + 1 patch + 1 put = 29; 26 get | **confere** |
| 4/55 antes | rotas distintas do molde: `/post`, `/reverse`, `/entries`, `/trial-balance` | **4** |
| 12/55 depois | união das rotas literais dos 3 arquivos que sobem o app, lidas à mão | **12** (4 + 3 do plano de contas + 5 de períodos) |
| 2/10 → 10/10 handlers de escrita do controller | os 10 são `postEntry`, `reverseEntry`, `createAccount`, `deleteAccount`, `setAccountRequiresDimension`, `seedYear`, `openPeriod`, `softClosePeriod`, `hardClosePeriod`, `reopenPeriod` | **confere** |
| 43 restantes / 19 de escrita de outros controllers / 13 de leitura deste | 55−12 = 43; 29−10 = 19; 23−10 = 13 | **confere** |

Também confirmei o pressuposto que sustenta o "4 antes": varri **todos** os `*.test.ts` do `server/` por
`api/accounting`. Só três arquivos sobem o app (o molde e os dois novos). Os outros dois hits —
`src/__tests__/openapi-paths.test.ts` e `src/__tests__/route-spec-wiring.test.ts` — são estáticos, e
`src/middleware/__tests__/auth.test.ts` usa `makeReq` sintético, não supertest. O baseline de 4 estava certo.

**Por que "encosta" e não "fecha":** o `suggested_barrier` do próprio F6 pede *"um teste de rota com
supertest por grupo de handlers de escrita **do mount**"*. O mount tem 29 rotas de escrita; depois da
barreira, 10 têm teste que sobe o app e **19 continuam com zero** — anexos, conciliação (9 rotas),
data-exchange, referencial/de-para (5 rotas), SPED e encerramento. Contra a letra do `suggested_barrier`,
isto é ~1/3. O recorte do orquestrador (§9.3, escopo restrito ao `evidence` do achado) é legítimo e os
cabeçalhos listam essas 19 rotas em "o que este arquivo NÃO cobre" — mas **quem for marcar o rank 9 como
resolvido na TRIAGEM-AV-R8 precisa marcar contra o recorte, não contra o `suggested_barrier`**, e o
`business_impact` do F6 ("as outras 51 entram no próximo diff sem rede") continua verdadeiro para 43.

---

## 4. O que reexecutei

Todas as execuções: `cd server && timeout <N> env OPENAI_API_KEY=ci-dummy-openai-key npx jest
--selectProjects integration --runInBand --forceExit --cacheDirectory "…/jestcache-revf6" [alvo]`.
Nenhuma execução produziu o resultado inválido da armadilha 1 (`Test Suites: falhou` com `Tests: 0 failed`).

| # | alvo | árvore | exit do wrapper | saída |
|---|---|---|---|---|
| R0 | **suíte de integração INTEIRA** | limpa | **0** | `Test Suites: 38 passed, 38 total` · `Tests: 406 passed, 406 total` · 240 s |
| R5 | só os 2 arquivos novos | limpa (após restaurar tudo) | **0** | `2 passed` · `8 passed, 8 total` · 17 s |

**R0 é o controle que o autor não declarou ter feito.** Ele declara "controle sem mutação 8/8 verde" — os
8 casos dele. Eu rodei a suíte inteira **com os dois arquivos presentes**: 398 (baseline do F6) + 8 = **406,
todos verdes, 38 suítes**. Isto derruba de antemão a hipótese mais barata contra qualquer arquivo novo de
integração neste repo: os dois arquivos chamam `pushTestSchema()`, que **apaga o `test-integration.db`
inteiro** e o recria — e mesmo assim nenhuma das outras 36 suítes quebrou. Sem R0, "8/8 verde" seria
compatível com ter derrubado a suíte alheia.

---

## 5. Minhas próprias mutações

Protocolo em todas: `cp arquivo arquivo.bak` → mutar por índice de linha em Node (nunca `String.replace`,
armadilha 6) → `git diff --numstat` para provar **qual** linha mudou → rodar → restaurar do `.bak` →
`numstat` vazio → `rm .bak`. Uma por vez, `--runInBand` (armadilha 7).

| # | mutação | de quem | `numstat` | mortos | leitura |
|---|---|---|---|---|---|
| **MINE-1** | `AccountRepository`: `findById` perde `userId` do `where`, e `softDelete`/`setRequiresDimension` perdem `userId` do `where` do `update` → **vazamento de inquilino REAL no plano de contas** | **minha — classe nova** | `5 5` | **2 de 3**: `deleteAccount` (`Expected: 404, Received: 200`) e `setAccountRequiresDimension` (`Expected: 404, Received: 200`). `createAccount` sobreviveu | **A prova que faltava.** O dono B **de fato apagou** a conta do dono A e **de fato mexeu** na flag dele; os dois casos reprovaram **na asserção de inquilino**, não no controle. Para estes dois handlers a barreira mede a invariante, não só o alcance |
| **MINE-2** | `AccountingPeriodRepository.findById` perde `userId` do `where` → **vazamento de inquilino REAL nos períodos** | **minha — classe nova** | `1 1` | **4 de 5**: `open`, `soft-close`, `hard-close`, `reopen`, todos `Expected: 400, Received: 200`. `seedYear` sobreviveu | Mesma leitura, e mais afiada: com o `findById` vazando, o `setStatus` escreve por `@@unique([userId,unitId,year,month])` e a transição **pousa na linha gêmea do próprio B**. A linha gêmea que o autor arranja em cada caso não é enfeite — é o que faz o vazamento ter onde aparecer |
| **MINE-3** | `accountingController.ts:500` (`seedYear`): `resolveAccountingScope(user, …)` → `resolveAccountingScope({ userId: 'MUTANTE-OUTRO-DONO' }, …)` | reexecução da classe do autor, **com diagnóstico de qual asserção morre** | `1 1` | **1 de 5**, exatamente `seedYear` — mapeamento 1:1 confirmado | **Mas morreu no CONTROLE**: `Expected length: 12, Received length: 0`, que é `expect(doAnoA).toHaveLength(12)` — o dono A semeando o **próprio** ano. As asserções de inquilino (linhas 144–156) nunca rodaram |
| **MINE-4** | `accountingController.ts:194` (`deleteAccount`): mesma troca de dono | reexecução da classe do autor, com diagnóstico | `1 1` | **1 de 3**, exatamente `deleteAccount` — 1:1 confirmado | **Também morreu no CONTROLE**: `Expected: 200, Received: 404`, que é `expect(doDono.status).toBe(200)` — o próprio dono apagando a própria conta. A asserção de inquilino (`res.status === 404`) **passou** sob a mutação, porque o recurso simplesmente deixou de existir para o escopo mutante |

MINE-3 e MINE-4 são exatamente a armadilha que o encargo desta revisão mandou atacar: *"um teste de
inquilino pode morrer por acidente (o recurso simplesmente deixa de existir) em vez de por medir a
invariante"*. **Ela está lá, nos 8.** O que salva a barreira é que MINE-1 e MINE-2 — que o autor não
escreveu — mostram que em 6 dos 8 a invariante **também** é medida.

Placar consolidado por handler, pelo meu caminho:

| handler | morre pela classe do autor (alcance) | morre por vazamento de inquilino (invariante) |
|---|---|---|
| `createAccount` | sim (via controle) | **não existe mutação que o mate** |
| `deleteAccount` | sim (via controle) | **sim** (MINE-1) |
| `setAccountRequiresDimension` | sim (via controle) | **sim** (MINE-1) |
| `seedYear` | sim (via controle) | **não existe mutação que o mate** |
| `openPeriod` | herdado | **sim** (MINE-2) |
| `softClosePeriod` | herdado | **sim** (MINE-2) |
| `hardClosePeriod` | herdado | **sim** (MINE-2) |
| `reopenPeriod` | herdado | **sim** (MINE-2) |

---

## 6. Alegações que caíram

- **(a) parcialmente — a matriz de mordida mede ALCANCE, não inquilino.** Rotulada nos dois cabeçalhos como
  a perna de "usuário autenticado operando sobre recurso de outro dono". Nas duas mutações que reexecutei, a
  asserção que reprovou foi o controle positivo. O 8/8 é honesto como prova de alcance — que é o que o F6
  cobra — e desonesto como prova de inquilino.
- **(b) inverso — sim, existe perna vacuosa, e ela está dentro de um caso verde.** O eixo "o corpo MENTE
  `userId`/`ownerUserId` e o token vence" em `createAccount` **não pode falhar**: `CreateAccountSchema` é
  `z.object({…})` sem `.passthrough()`, então o Zod remove as duas chaves antes de o controller as ver.
  Nenhuma mutação de um ponto no produto faz aquela asserção reprovar. Não invalida o caso (o segundo eixo,
  do código repetido sob `@@unique([userId,unitId,code])`, tem conteúdo), mas o primeiro eixo é enfeite.
- **(e) parcialmente — "não há bug de produção" é verdadeiro para a guarda de inquilino e falso como frase
  geral.** MINE-1 e MINE-2 confirmam que a guarda existe e é o que produz a recusa (removê-la produz 200 e
  escrita cross-tenant). Mas as duas "observações" que o autor registrou sem consertar não são simétricas: a
  do `ReopenPeriodSchema` é **maior do que ele admite** (§8, N1), e ao lado dela há um terceiro defeito que
  ele não registrou (§8, N2).
- **(f) o viés declarado é maior do que o declarado.** Ele diz ter medido "uma classe de mutação (troca de
  dono)". O que essa classe não alcança, medido: (i) ela não distingue alcance de invariante — foi preciso
  uma segunda classe para isso; (ii) ela é cega a **vazamento no repositório**, que é onde a guarda de
  inquilino de fato mora (`accountingScopeWhere`), e não no controller; (iii) ela é cega a **entrada
  malformada** — nenhum dos 8 casos manda um `unitId` que não seja string, e é por aí que `openPeriod` cai
  em 500 (§8, N2).

---

## 7. Alegações que sobreviveram

- **(a) o mapeamento 1:1.** Reexecutado em 2 dos 8 (`seedYear`, `deleteAccount`): cada mutação matou
  exatamente o caso do seu handler e mais nenhum. Sem kill por acaso, sem caso dependendo do vizinho. Os
  outros 6 ficam **herdados**, declarados como herdados.
- **(a) o controle 8/8 verde — e mais forte do que o declarado.** Não só os 8: a suíte **inteira** com os
  dois arquivos dá 38/38 suítes e 406/406 testes, exit 0 (R0). Os arquivos novos não quebram nada apesar do
  `pushTestSchema()` destrutivo.
- **(c) todos os 8 conferem o BANCO, e cada negativo tem controle que exercita o mesmo caminho.** Conferido
  caso a caso na leitura: `deletedAt` e contagem de auditoria no delete; `requiresDimension` lido da base no
  patch; `statusDe(doA.id)` **e** `statusDe(doB.id)` nas 4 transições; contagem + status do mês aberto no
  seed; `userId` da linha nascida no create. Nenhum caso assere só status. Todos os 7 controles positivos
  batem na **mesma rota, mesmo método**, trocando só o token. A `fotoDe()` dos **dois** donos ancora "nada
  escrito" nos dois lados, como declarado.
- **(b) o par discriminante não é vacuoso.** Herdado do relatório, mas corroborado pelo meu caminho por
  outra via: MINE-1/MINE-2 mostram que a suíte **reprova seletivamente** quando há o que reprovar, e R0
  mostra que ela roda inteira.
- **(d) 12/55 e 10/10.** Recontados por mim lendo os arquivos (§3). O autor tem razão também sobre o
  **limite do instrumento**: o falsificador estático do F6 casa `método + literal entre aspas simples` e é
  cego a template literal — 7 das 12 rotas novas usam crase (`` `…${conta.id}` ``), então verbatim ele
  devolve 5, não 12. Confirmei lendo o padrão; a fração real é 12, e o falsificador do achado precisa ser
  emendado antes de ser reexecutado por qualquer um.
- **(e) a recusa 400 dos períodos não é vazamento.** A mensagem é `Período '<id>' não encontrado.` — não
  confirma existência para outro dono, então a divergência 400×404 é inconsistência de contrato, não
  enumeração. Caracterização, como o cabeçalho diz. Fica como minoritário.

---

## 8. Achados novos (NÃO corrigidos)

**N1 — `reopenPeriod`: o `.strict()` OBRIGA o cliente a mandar um `periodId` que o handler DESCARTA, e a
barreira nova passou a codificar o defeito num teste verde.**
`ReopenPeriodSchema` é `.strict()` com `periodId: z.string().min(1)` **obrigatório**
(`server/src/features/accounting/dtos/PostingDto.ts:285-291`); o handler
(`server/src/controllers/accountingController.ts:610-624`) usa `req.params.id` e nunca lê
`parsed.data.periodId`. Isto é instância exata da classe já nomeada na memória do projeto —
*"Param aceito-e-ignorado é bug silencioso: handler nunca aceita param que ignora; ou implementa, ou 400"*.
O autor registrou como "nota de caracterização" e mandou `periodId: doA.id` no corpo para o DTO deixar
passar; o efeito é que **o único teste de rota que existe para `reopen` agora depende do campo defeituoso**,
e remover o campo do DTO quebra o teste — a barreira virou trava do defeito. É maior do que ele admite: não
é divergência de estilo, é um campo de contrato público que mente sobre o que decide a operação.
*Falsificador (executei — path vence, corpo é ignorado em silêncio, HTTP 200):* `POST
/api/accounting/periods/<idA>/reopen` com corpo `{unitId, periodId: <idB>, reason}`, os dois SOFT_CLOSED do
mesmo dono → **`<idA>` vira OPEN, `<idB>` continua SOFT_CLOSED**. Se o corpo fosse honrado, ou se o handler
recusasse a divergência com 400, o resultado seria outro.

**N2 — `openPeriod` é o único handler de escrita de período SEM DTO Zod, e devolve 500 (não 400) para
`unitId` não-string.**
`server/src/controllers/accountingController.ts:522-534` lê `const unitId = req.body?.unitId` cru e joga o
valor direto em `resolveAccountingScope` → `where` do Prisma. Viola o gate 2 do `server/CLAUDE.md`
("entrada validada por DTO Zod") enquanto os 4 irmãos (`softClose`, `hardClose`, `reopen`, `seedYear`) todos
usam schema `.strict()`. Nenhum dos 8 casos da barreira nova manda entrada malformada, então isto passa
por baixo dela.
*Falsificador (executei):* `POST /api/accounting/periods/<id>/open` autenticado com corpo
`{"unitId": {"gt": ""}}` → **HTTP 500** `INTERNAL_SERVER_ERROR` (o período fica intocado, `FUTURE`).
Um handler com DTO devolveria 400. Sem perda de dado e sem travessia de inquilino — `userId` continua
escopado —, mas é entrada não validada chegando a cláusula de Prisma.

**N3 — o `falsifier_static` do próprio F6 subestima o alcance por cegueira a template literal.**
O padrão `\.(get|post|put|patch|delete)\('/api/accounting[^']*'` só casa aspas simples; 7 das 12 rotas hoje
exercitadas usam crase. Reexecutado verbatim contra a árvore com a barreira, ele devolve **5**, não 12 — e
quem reexecutar o falsificador para conferir o fechamento vai concluir que a barreira cobre menos da metade
do que cobre. O autor declarou este limite; eu confirmo e **elevo**: enquanto o falsificador não for
emendado, o `verification` "confirmado" do item 9 da TRIAGEM-AV-R8 fica preso a um instrumento que agora
mede errado.
*Falsificador de uma linha:* rodar o `falsifier_static` do F6 e comparar com
`grep -rhoE "\.(get|post|put|patch|delete)\((\`|')[^)]*api/accounting[^'\`)]*" src --include=*.test.ts | sort -u | wc -l`
— o segundo enxerga a crase, o primeiro não.

---

## 9. O que ficou FORA desta revisão

- **6 das 8 mutações do autor não foram reexecutadas** (`createAccount`, `setAccountRequiresDimension`,
  `open`, `soft-close`, `hard-close`, `reopen` pela classe de troca de dono). Reexecutei 2 e usei o
  diagnóstico delas para julgar a classe inteira — a inferência de que as outras 6 também matam pelo
  controle é **inferida**, não medida, ainda que MINE-1/MINE-2 mostrem qual asserção morre quando a
  invariante é o alvo.
- **Não rodei a suíte inteira sob mutação.** R0 (limpa) é a única execução de suíte completa. As 4 corridas
  de mutação foram por arquivo. Isto significa que **não medi kill colateral em outras suítes** — se MINE-1
  ou MINE-2 também matassem testes de serviço/unidade, eu não veria. Não afeta a leitura (o alvo era o
  arquivo sob revisão), mas está declarado.
- **As 19 rotas de escrita dos outros controllers do mount** (anexos, conciliação, data-exchange,
  referencial, SPED, encerramento) — não medi nada nelas; continuam sem teste que suba o app.
- **Os 13 handlers de leitura** deste controller, e `GET /accounts` / `GET /:unitId/periods`, que ficaram de
  fora do recorte.
- **A máquina de estados de período** e as regras não-de-inquilino do delete (conta canônica → 409, conta
  com partidas → 409) — declaradas fora pelos cabeçalhos, não conferidas por mim.
- **`tsc --noEmit`** — não rodei. Os arquivos compilam sob `ts-jest` com `tsconfig.test.json` em 6 execuções,
  o que é evidência forte mas não é o gate.
- **Não julguei o portão nem o rank** da TRIAGEM-AV-R8; julguei a barreira.

## 10. Meus próprios vieses, nomeados

1. **Vim procurando o modo de falha que o encargo apontou** ("morre por acidente em vez de por medir a
   invariante") e **encontrei exatamente ele**. Isso deveria me deixar desconfiado de mim: um revisor que
   acha precisamente o que foi mandado achar pode estar confirmando a hipótese de quem o mandou. Mitigação
   parcial: as duas mutações de diagnóstico (MINE-3/MINE-4) foram executadas e a saída literal está no
   relatório — `Expected: 200, Received: 404` na linha do controle é fato, não leitura.
2. **Medi só duas classes de mutação** (troca de dono, vazamento de escopo no repo). Não medi: troca de
   `unitId`, remoção da policy (`canManage`/`canClosePeriod`), remoção da auditoria dentro da tx, quebra da
   guarda `fromStatus` no CAS de `setStatus`. Um verde meu não é prova para nenhuma dessas — em particular,
   **nenhum dos 8 casos morreria se a `policy` fosse removida** enquanto o inquilino continuasse escopado,
   e eu não medi isso.
3. **Rodei a suíte inteira uma vez só, e limpa.** Se houvesse não-determinismo (ordem de arquivos,
   `pushTestSchema` destrutivo entre suítes), uma execução verde não o pegaria. O `--runInBand` reduz mas
   não elimina.
4. **Tenho o viés de quem revisa um conserto e não quer ser o obstáculo.** Empurra para `pass`. Compensei
   escolhendo `com_ressalva` mesmo com a barreira mordendo bem, porque a ressalva é sobre o **texto**
   publicado — e é justamente texto publicado sobre medição que esta bancada passou a rodada inteira
   derrubando.
5. **A leitura de "qual asserção morreu" veio da mensagem do Jest**, que aponta o bloco `it(...)` e não a
   linha exata. Casei `Expected/Received` com a única asserção do caso que produz aquele par. É inferência
   de uma linha, sólida mas inferência.

---

**Estado do worktree ao fim, confirmado:** `git status --porcelain` em
`C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rev-f6` devolve **exatamente os dois `??`** sob
revisão; `git diff --numstat` **vazio**; `find . -name "*.bak"` (fora de `node_modules`) **vazio**; a sonda
temporária que escrevi para N1/N2 foi removida. Nenhum arquivo rastreado alterado, nenhum `git add`,
nenhum commit. Único arquivo que escrevi no worktree do orquestrador: este relatório.
