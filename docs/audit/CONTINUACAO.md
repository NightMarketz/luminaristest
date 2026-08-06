# Continuação da bancada — estado após a integração das quatro rodadas paralelas

Documento de retomada. Escrito ao fim da sessão que produziu o PR #164, atualizado pela
sessão que fechou os itens 1 e 2 da fila, pela integração de quatro trabalhos que rodaram em
paralelo (triagem + gate de `triagem/1.0`, divulgação §9.4, verificação em navegador, AV-03 no
frontend), e pela sessão que **drenou a fila de correção** fechando os itens 5, 6 e 7 (§3f).

**A fila de `TRIAGEM-R1-R3.json` está em 0 de 7 abertos.** O que sobra dela não é item de fila:
é a subfila de 4 unidades de `r2_decision.ratified_subqueue`, que ficou **órfã** quando o item 4
fechou e agora tem dono, data e gatilho próprios — ver item 3 de "o que continua em aberto".

**Lição da integração, que vale para o próximo lote paralelo:** duas das quatro sessões
escreveram um `B11` diferente no mesmo arquivo, cada uma correta isoladamente. O git acusa
o conflito **textual**; a colisão de **numeração** ele resolveria em silêncio se os trechos
não se tocassem — dois erros distintos com o mesmo rótulo, e a saída do gate deixaria de
identificar o que falhou. Quem fatiar trabalho paralelo sobre este gate **reserva a faixa
de numeração antes de despachar**, ou paga a renumeração no fim (aqui: B17 para o cheque do
visualizador). É a Fase B de registro serial do `_PARALLELIZATION-CONTRACT.md`.

---

## O que existe no disco

| Artefato | Estado |
|---|---|
| `docs/audit/AV-R1.md` + `.json` | rodada 1 · 4 achados · AV-16 a AV-19 |
| `docs/audit/AV-R2-COBERTURA-AUSENTE.md` + `AV-R2.json` | rodada 2 · 110 obrigações de teste · AV-20 |
| `docs/audit/AV-R3-FORCA-DA-SUITE.md` + `.json` | rodada 3 · `mutation_score` 2/7 (backend) · AV-03 |
| `docs/audit/AV-R5-FORCA-DA-SUITE-FRONTEND.md` + `.json` | rodada 5 · `mutation_score` 4/7 (frontend) · AV-03 |
| `docs/audit/AV-R6-VERIFICACAO-EM-NAVEGADOR.md` + `.json` | rodada 6 · 5 achados de **runtime** da própria bancada · `failure_modes` · primeira com `runtime: true` |
| `docs/audit/AV-R7-FORCA-DA-SUITE-SUBFILA.md` + `.json` | rodada 7 · AV-03 sobre as **4 unidades da subfila** · `mutation_score` **0/7** · 6 sobreviventes provadas **sem execução** por sonda com controle · 5 achados · **NÃO triada** |
| `docs/audit/TRIAGEM-AV-R7.json` | **triagem/1.0** · 5 itens · 5 falsificadores executados a partir do JSON · **5 bloqueiam, 0 aceites** · 3 `suggested_gate` sobrescritos |
| `docs/audit/TRIAGEM-AV-R6.json` | **triagem/1.0** · 5 itens · 5 falsificadores executados a partir do JSON · 4 bloqueiam, 1 aceite |
| `scripts/bancada-gate.mjs` | gate de **16** checagens que reprovam (B1..B9 e B11..B17; B10 só avisa) · **passa, e passa no CI** · mordida provada, inclusive nos dois artefatos do AV-R6 (5 mutações) |
| `docs/audit/bancada.html` | **v4/v4.1 reconstruída** · 29 itens · 15 blocos · contrato `triagem/1.0` no `t-contrato` |
| `docs/audit/TRIAGEM-R1-R3.json` | **triagem/1.0** · 7 itens · 7 falsificadores executados · portão, dono e data em todos · **7 fechados** — 6 `corrigido_e_barrado` + 1 `aceite_reconfirmado` (§3c, §3e, §3f) |
| `server/src/config/__tests__/dockerCompose.qdrant.test.ts` | barreira do item 2 · roda na suíte `unit`, que já está no CI |
| `my-app/lib/api/__tests__/nextPublicEnvWiring.test.ts` | barreira do item 3 · roda no `vitest`, que já está no CI |
| `server/src/features/accounting/dtos/__tests__/` (8 arquivos novos) | barreira do item 5 · roda na suíte `unit` · 4 → **12 de 21** DTOs com teste próprio |
| `scripts/review-ledger-check.mjs` + `docs/audit/REVIEW-LEDGER.jsonl` | barreira do item 6 · **7** regras que reprovam (RL0..RL6) · passo do job `governance-presence` (`ci.yml:225`) |

## O que foi perdido, e como (histórico — já resolvido)

Numa sessão anterior, `git checkout -- docs/audit/bancada.html` foi usado para reverter uma
mutação de teste. O arquivo é rastreado e as edições v4/v4.1 estavam **sem commit** — o
comando restaurou o `HEAD` e apagou tudo.

A reconstrução (`e0dccad`) foi autoria guiada pelos três relatórios e pelo gate, não
recuperação: não havia cópia no disco nem no git. Ficaram no lugar `t-av00` (v4 integral),
`t-av03`, `t-av16`, `t-av17`, `t-av18`, `t-av19`, `t-av20`, `t-v4patch`, as emendas v4.1 em
`t-v3`, `t-contrato` e `t-padrao`, e a fiação JS (catálogo, `CAT`, aplicabilidade, `gateMap`,
badge v4, projeção de `conventions[]`/`inquiry[]`/`demonstration`/`reduced_capabilities`).

Os três erros B3 fecharam **porque a bancada voltou a declarar os tipos**. Nenhuma linha do
gate foi afrouxada para isso — o commit da reconstrução não toca `scripts/bancada-gate.mjs`.

---

## Fila de trabalho, em ordem

### 1 · Reconstruir `bancada.html` até o gate passar — FEITO (`e0dccad`)

Saída atual, já com tudo integrado:

```
OK: 29 itens no catálogo (17 literais, com 15 srcId prontos; 12 derivados de CAT,
sem srcId e fora de B1/B9), 15 blocos, 5 relatório(s) auditoria/1.1,
2 triagem(ns) 1.0 com 11 item(ns), 4 tipo(s) de peça central em uso, 21 aviso(s).
Isenção 4b/6b pela emenda (3): AV-L1, AV-10, AV-11
```

Os avisos são `[B3] tipo declarado e ainda não usado` (os tipos de `auditoria/1.1` e os 3
da v4 cujos instrumentos ainda não emitiram relatório próprio) e `[B10] rodada sem revisão
independente`. Aviso não bloqueia, e nenhum é dívida nova.

Verificação além do gate: a página foi aberta em **navegador de verdade**, em duas engines
independentes — ver item 1 de "o que continua em aberto", que agora registra o que isso
achou em vez de registrar a ausência da verificação.

### 2 · Fechar o defeito B1 do gate — FEITO

O que estava errado, medido e não suposto: o parser de itens usava
`/\{code:"…",\s*fam:"…",\s*ver:"…"[\s\S]*?\}/g`, e o `[\s\S]*?\}` parava no **primeiro** `}`.
Item com objeto aninhado perdia tudo depois dele — inclusive `srcId` e `v4patch`. Como B1
(`if (it.srcId && …)`) e B9 (`if (… || !it.srcId) continue`) **pulam** item sem `srcId`, o
efeito não era erro: era silêncio.

Correção: varredura por chaves balanceadas e ciente de string, mais uma **guarda de
cobertura** — todo `srcId:"…"` do arquivo tem de estar preso a um item que o parser leu.

Mordida provada por quatro mutações (todas revertidas de `.bak`, `git diff --numstat`
conferido em cada uma):

| Mutação | Gate antigo | Gate corrigido |
|---|---|---|
| A · `srcId` aponta para bloco inexistente | reprova `[B1]` | reprova `[B1]` |
| B · idem, **atrás de objeto aninhado** | **B1 mudo** (só `[B2]` por sorte) | reprova `[B1]` |
| C · `srcId` correto atrás de aninhado + 4b removido do bloco | **B9 mudo** (só `[B2]` por sorte) | reprova `[B9]` no item certo |
| D · item que o parser não enxerga, `srcId` intacto | **B1 mudo** (só `[B2]` por sorte) | `[B1] parser cego: … fora do alcance: t-av20` |
| E · item escrito com **aspas simples**, `srcId` pendurado | passava **verde** | reprova `[B1]` + `[B9]` |
| F · `v4patch:true` acrescentado + 4b removido | passava verde | **continua verde — limite de desenho, ver abaixo** |
| G · `ver:"v4.1"` escapa do casamento exato + 4b removido | passava **verde** | reprova `[B9]` |
| H · a emenda `t-v4patch` perde o 4b | passava verde | reprova `[B9]` nos 3 isentos |

**CORREÇÃO — a linha D dizia só "mudo".** O gate antigo saía `exit 1` na mutação D, com
`[B2] bloco "t-av20" existe e ninguém o referencia`: o mesmo acidente das linhas B e C, não
silêncio. Pego por revisão independente; era imprecisão minha, não do gate.

**E, F, G vieram da revisão independente**, que escreveu três mutações próprias e as três
passaram verdes no gate já "corrigido". E e G foram fechadas (aspas simples nas duas
varreduras; `ver` casado por prefixo). **F não foi fechada, e não deve ser:** `v4patch` é
declaração de autoria — a emenda diz que 4b e 6b valem por referência a ela, então apoiar-se
nela é escolha legítima, e nenhum comando distingue a escolha legítima do instrumento que só
não quis escrever os próprios blocos. O que o gate passou a fazer é exigir **lastro** (H:
emenda sem 4b/6b invalida toda isenção) e **imprimir a lista de isentos** na saída, para que
a isenção não cresça em silêncio.

Contagem, que era a pista: o parser reconhecia **17** itens; o catálogo tem **29** em tempo
de execução. Os 12 que faltavam são os empurrados por `ITEMS.push(...)` com chave abreviada
(`fam` em vez de `fam:"…"`) — nenhum tem `srcId`, então B1/B9 nunca se aplicaram a eles,
mas a linha final subcontava o catálogo em mais de um terço. Agora o total é derivado de
`CAT` menos a lista de exclusão, e bate com `ITEMS.length` medido em execução.

### 3 · Triar o que já foi medido (AV-00 bloco 9) — FEITO (`docs/audit/TRIAGEM-R1-R3.json`)

Os 7 achados (4 do R1, 3 do R3) triados; os 7 falsificadores estáticos executados contra
`ca33c745`, cinco deles com controle discriminante porque devolvem zero e zero é o resultado
mais fácil de obter por acidente. **7 confirmados, 0 refutados** — resultado incomum, nomeado
como suspeito em `self_check.own_bias_named` e não arredondado.

Portões derivados por **convergência**, não por escolha: as duas fontes do repositório
discordam sobre `deployed` (`interno` no AV-L1-TRIAGEM, respondido pelo dono em 2026-07-31;
`nunca implantado` no AV-R1.md, 2026-08-02), e os dois ramos do `gateMap` dão o mesmo portão
em 7 de 7. Resultado: 1 `bloqueia_deploy` (Qdrant, por divulgação irreversível — sobrescreve
o relatório), 5 `bloqueia_primeiro_cliente` (um deles sobrescrevendo o `aceito_com_registro`
sugerido para a fronteira de DTO), 1 `aceito_com_registro`.

As **110 obrigações do R2 não são achados** e não foram triadas como se fossem: aceite
coletivo com gatilho, com subfila de 4 ratificada (as únicas com três invariantes
simultâneas), herdada pelo item de maior dano. A razão é medida: o `mutation_score` de 0,286
mostra que cobertura por nome não move força de suíte.

**Nenhuma correção de código foi feita** — o bloco 9 proíbe corrigir achado não triado, e a
tentação era concreta (o item de rank 1 fecha com UMA asserção).

### 3b · O gate passou a ler `triagem/1.0` — FEITO

`if (j.schema !== 'auditoria/1.1') continue` tirava a triagem de todo o escopo do gate: o
artefato que o AV-00 inteiro existe para produzir era o único do diretório sem checagem.
Falsificador executado antes da correção: esvaziar `items` de um `triagem/1.0` → **exit 0**.

Seis checagens novas — B11 envelope · B12 fingerprint copiado sem alteração da origem · B13
`verification` de lista fechada · B14 portão de lista fechada, `owner`+`due` quando abre
trabalho, aceite com `accepted_reason`+`accepted_by`+`review_trigger` **observável** (tem de
nomear caminho que existe no disco) · B15 `self_check` conferido contra os itens · B16 os três
campos do precedente. Todas promovidas ao `t-contrato` da bancada.

**Mordida provada por 13 mutações**, cada uma de 1 linha (`git diff --numstat` conferido),
todas revertidas de `.bak`. Duas delas rodaram contra o **precedente** `AV-L1-TRIAGEM.json` e
o reprovaram — e o precedente, intacto, passa sem uma linha alterada. Esse é o único controle
contra regra moldada ao próprio arquivo, e é declarado como único.

**Limite declarado:** B11..B16 leem estrutura. Não medem se o falsificador rodou, se o portão
foi bem derivado nem se o viés nomeado é o real; prosa vazia compra a saída em B16.

**O escopo da triagem passou a ser conferido nos DOIS ramos, e por instrumento** (F-A2 e
F-A5 da terceira revisão independente, fechados juntos porque são a mesma função):

- **B11** — todo `source_run.instrument` declarado tem de resolver para ao menos um relatório
  emitido. O corte era `!candidatos.length` sobre a **união**, então um run fantasma passava
  em silêncio desde que outro run resolvesse; e, se todo item declarasse `source_report`, o
  campo nem chegava a ser olhado. Uma triagem podia afirmar ter triado uma rodada inexistente.
- **B12** — o relatório de origem tem de estar **dentro** do escopo declarado, e agora isso
  vale também quando a origem vem de `source_report`. O ramo declarado casava contra qualquer
  relatório do diretório: bastava nomear o arquivo para uma triagem carregar achado de rodada
  que nunca triou — o cenário do F1, vivo no ramo que aquela correção não tocou. **Omitir o
  campo era mais restrito do que preenchê-lo**, que é o incentivo exatamente ao contrário.

Mordida provada por 3 mutações mais 1 controle: as duas fugas reprovam com mensagem própria,
o run fantasma reprova **também** com os `source_report` intactos (caso que o ramo derivado
nunca alcançava), e a troca **legítima** de origem dentro do escopo segue verde — a regra
não é "tudo vermelho". O precedente `AV-L1-TRIAGEM.json` continua passando sem uma linha
alterada.

**CORREÇÃO — a versão anterior deste documento dizia que `triagem/1.0` "nunca foi
exercitado uma vez". É falso, e conferir levou um comando.** `docs/audit/AV-L1-TRIAGEM.json`
é um `triagem/1.0` completo da rodada AV-L1 (`ae8d18b`): 4 itens, 4 falsificadores
executados, portão e dono em todos, zero item sem responsável. Não é começo do zero — é
precedente, e um bom: aquele artefato traz três coisas que o contrato ainda NÃO exige e que
valem copiar para a triagem do R1/R3:
- `verification_note` declarando que os falsificadores rodaram contra um commit **diferente**
  do relatório, com `git diff --stat` provando que nenhum arquivo de evidence estava no meio;
- `barriers_searched` registrando que cada `barrier_kind` foi reemitido **depois** de
  procurar barreira existente — a lição literal foi que `nenhuma_conhecida` só pode ser
  emitido depois de procurar, senão é "não procurei" com nome de veredito;
- `own_bias_named`, que nomeia o viés de quem triou (inclusive "sou verificador da minha
  própria correção" no item onde isso valia).

### 3c · Os três primeiros da fila — CORRIGIDOS E BARRADOS

Primeira rodada de **correção de código** de toda a linha de trabalho. Só foi legítima porque
os 7 achados já estavam triados: o bloco 9 proibia isto até `TRIAGEM-R1-R3.json` existir.
Um commit por achado, na ordem de `ordering.sequence`. Os itens 2 e 3 moram no MESMO arquivo
e mesmo assim são **dois commits** — "aproveitar a passagem" é anti-padrão nomeado no §5.

| # | Achado | Commit | Conserto | Barreira escrita |
|---|---|---|---|---|
| 1 | `gate-de-createAccount-coberto-mas-nao-afirmado` | `7a7ec5d1` | 1 asserção no bloco que já existia | `teste_de_permissao` no próprio `PostingService.test.ts` |
| 2 | `qdrant-publicado-sem-chave-embora-codigo-suporte` | `29b8811f` | chave no compose, com `:?` que recusa subir sem ela | `server/src/config/__tests__/dockerCompose.qdrant.test.ts` |
| 3 | `compose-injeta-next-public-api-url-nome-divergente` | `90f71a86` | `build.args` + `ARG` no Dockerfile (**duas** camadas) | `my-app/lib/api/__tests__/nextPublicEnvWiring.test.ts` |

Os três falsificadores **deixaram de reproduzir**, e cada barreira teve a mordida provada por
mutação revertida de `.bak` (nunca `git checkout`) — a de baixo é a que vale ler:

- **Item 1** — M6 do AV-R3 reproduzida (`if (false)` na guarda, `numstat` 1/1): o teste novo
  falha. Antes da asserção, a mesma mutação deixava a suíte **inteira** verde.
- **Item 2** — compose revertido ao pré-conserto: 2 dos 3 casos falham, e o terceiro — o
  **controle** de que os serviços existem e são recortados — segue verde. Um recorte
  quebrado reprovaria os três; é assim que se distingue barreira de regex morto.
- **Item 3** — três mutações. A decisiva é a do meio: **corrigir só o nome**, deixando o
  valor em `environment:`. O caso do nome passa e o de build-arg **falha**. É exatamente o
  meio-conserto que declararia vitória, e nenhuma checagem de nome sozinha o pegaria.

**A barreira do item 3 passou a conferir o VALOR** (F-A4 da terceira revisão independente).
Os casos originais liam nome e posição da chave e mais nada, então voltar a
`http://server:3001` — o valor que o parágrafo abaixo mede como errado **duas vezes** —
deixava a barreira 4/4 verde. Dois casos novos, e nenhum carrega URL escrita à mão: o valor
efetivo do build arg tem de ser o **mesmo default que `next.config.js` declara** (pega o
`/api` faltando e o vazio de `${VAR}` sem default), e o **host não pode ser nome de serviço
do compose** (pega o host que só existe na rede interna). Mordida provada por 3 mutações mais
1 controle — a troca **legítima** de topologia, feita nos dois lados, segue 6/6 verde, que é
a diferença entre uma regra e uma URL decorada dentro do teste.

**O que a correção mediu e a triagem não sabia** (registrado em `status_evidence`, não
corrigido de passagem): o valor `http://server:3001` errava **além** do nome — falta o
sufixo `/api` que `document.service.ts:28` concatena, e `server` é nome da rede do compose,
inalcançável pelo **navegador**, que é quem executa o bundle. Com isso, a
`not_executed[0]` da triagem ("NEXT_PUBLIC_* é build-time") deixou de ser leitura de
documentação e virou medida no repositório.

**Fora de escopo por regra, não por esquecimento** (§5.1, escopo restrito ao `evidence`):
`env.ts:112` continua `.optional()` e as portas 6333/6334 continuam publicadas no host.

**Gates**: `tsc` limpo nos dois lados · server unit **124 suítes / 1510 testes** verdes ·
my-app vitest **27 arquivos / 125 testes** verdes · `bancada-gate` exit 0. `next build` de
produção **segue não rodado**, e as duas barreiras de compose declaram esse limite no próprio
cabeçalho: elas leem **texto**, não sobem a stack nem constroem a imagem.

**Sem revisão independente** — os três consertos foram implementados e verificados pela mesma
sequência, que o §9.4 rejeita. O que existe no lugar é prova de mordida, e prova de mordida
não é revisão.

### 3d · Achado sobre o INSTRUMENTO: o `triagem/1.0` não tem onde guardar um fechamento

Perguntado antes de escrever, e a resposta é *quase não*. O `t-contrato` enumera 14 campos
de `triagem/1.0` e **nenhum** registra que o conserto aconteceu; `grep -rn 'fix_commit\|status_evidence'
scripts/bancada-gate.mjs` devolve **nada** — B11..B16 não leem nem um nem outro. O único
vestígio é `bancada.html:3161`, onde o payload gerado emite `fix_commit:null` e `barrier:null`
fixos: a **chave** existe na forma do artefato, a **semântica** não existe no contrato.

Por que isso não é detalhe: `items[].verification` é o veredito do falsificador sobre o
**achado**, e continua `confirmado` depois do conserto — o achado era real. Sem campo próprio
para o fechamento, a única forma de registrar "corrigido" seria corromper `verification`, e a
rodada seguinte leria a fila como se nada tivesse sido feito.

O que foi feito enquanto isso: os três itens receberam `fix_commit` (a chave que o payload já
emite) mais `status: corrigido_e_barrado` + `status_evidence`, que é a forma do **precedente**
`AV-L1-TRIAGEM.json` — mesma promoção-por-precedente que gerou `verification_note`,
`barriers_searched` e `own_bias_named`. **Hoje é convenção, não contrato**, e o gate não a
cobra: `status: corrigido_e_barrado` pode ser escrito sem que barreira nenhuma exista.
Registrado em `new_findings_raised` da triagem, sem portão.

### 3e · O item 4 da fila — CORRIGIDO E BARRADO (`d11b4716`)

O de **maior dano** (4) e o único cujo conserto era um arquivo novo:
`server/src/features/accounting/services/__tests__/PostingServiceLedgerWrite.integration.test.ts`
— 5 casos contra SQLite real, serviço vindo do **factory** (não `new`), sem mock de prisma.
O falsificador do achado deixou de reproduzir: o `grep` que devolvia **0** devolve **1**, e os
dois controles do achado continuam válidos (31 → 32 arquivos de integração; 10 → 11 com
`PrismaClient`), então nem o zero de antes nem o um de agora são cegueira de padrão.

**As duas mutações do AV-R3 reexecutadas**, por linha (o arquivo é CRLF e a linha alvo do M5
aparece 4×), cada uma revertida de `.bak` com `numstat` conferido:

| Mutação | Antes (AV-R3, suíte mockada) | Agora |
|---|---|---|
| **M5** `JournalEntryRepository.ts:49` — filtro de inquilino | sobreviveu **sem ser executada** | **morta e discriminante** — 1 failed / 4 passed, falha o caso certo |
| **M3** `PostingRepository.ts:20` — perna fora da tx | sobreviveu **sem ser executada** | **morta**, assinatura **total** — 5/5, timeout de 5000 ms por post |

**A leitura honesta do M3:** em base real a perna escrita fora da tx **trava contra o lock da
própria tx**. Não é o vazamento silencioso que o mock sugeria — é deadlock, e derruba os cinco
casos. A discriminação vem do baseline 5/5 verde, não de um caso isolado; está declarada como
limite em vez de vendida como precisão.

**O que este item ensinou sobre o próprio AV-R3** (medido antes de escrever a barreira, com a
mutação aplicada): **o M5 não é observável através de `reverseEntry`** — um segundo gate
escopado a jusante devolve `NotFound` e derruba a tx, deixando 0 entries e 0 postings para o
outro dono. O AV-R3 não podia saber disso, porque nunca executou a linha. Por isso o kill do M5
mora no contrato do repositório, e o caso de estorno cross-tenant fica no arquivo como
invariante de ponta a ponta — **não** como prova de mordida. Chamá-lo de barreira do M5 seria
vitória declarada. O consumidor cujo ÚNICO gate é aquela linha está nomeado no teste:
`DocumentAttachmentService.ts:92`, cujo próprio comentário diz que a FK prova existência e não
inquilino.

**Fora de escopo, e declarado:** cobre `postEntry` e `reverseEntry`. Não cobre `approveEntry`,
os bridges, nem as 4 unidades da subfila ratificada — ver o item 3 de "o que continua em aberto".

### 3f · Os itens 5, 6 e 7 — a fila DRENADA

| # | Achado | Commit | Fechamento |
|---|---|---|---|
| 5 | `fronteira-de-dto-quase-nao-testada` | `a4ffb8e4` | 8 arquivos de teste novos · `corrigido_e_barrado` |
| 6 | `revisao-independente-sem-artefato-por-merge` | `974e8d4f` | gate de registro por PR no CI · `corrigido_e_barrado` |
| 7 | `tres-imports-sem-declaracao-no-manifesto` | — | gatilho reverificado · `aceite_reconfirmado` |

Um commit por achado, mais um commit de registro por achado. Os itens 5 e 7 têm evidência
que mora no mesmo diretório e mesmo assim são commits separados — §5.

**Item 5 · o escopo foi medido, e a primeira medida estava errada.** O achado é "4 de 21 DTOs
têm teste". Cobrir os 17 restantes não era o pedido; cobrir "os que têm invariante nomeada"
exige definir *qual* invariante, e a definição usada é: **dinheiro (`MAX_CENTS`) ou data-only
(`isValidDateOnly`) fiada em CÓDIGO**. A primeira varredura devolveu 10 candidatos e estava
contaminada: `grep MAX_CENTS` casou dentro de **comentário** em `CounterpartyDto.ts` e
`DimensionDto.ts`, cujos cabeçalhos dizem literalmente *"NO money, NO dates … no MAX_CENTS /
date-only concern here"* — os dois entraram na lista por prosa que afirma o **oposto** do que o
grep concluiu. Refeita a medida removendo comentários antes do casamento: **8**. Denominador
fechado: 4 já testados + 8 agora + 9 sem invariante de dinheiro/data = 21.

Mordida provada pelas duas mutações **nomeadas** do AV-R3, cada uma revertida de `.bak` com
`numstat` conferido antes de rodar:

| Mutação | numstat | Resultado |
|---|---|---|
| **M2** `InventoryDto.ts:22` teto → `MAX_CENTS + 1` | 1/1 | morta e discriminante — 1 failed / 11 passed |
| **M7** `aging.dto.ts:35` linha do `refine(isValidDateOnly)` removida | 0/1 | morta e discriminante — 2 failed / 6 passed |

E o **"antes" foi medido, não citado do relatório**: com cada mutação aplicada, a suíte `unit`
inteira (133 suítes) reprova em **exatamente um** arquivo — o novo. Nenhum teste pré-existente
pega nenhuma das duas, que é literalmente o achado. As duas rodadas trazem `Tests: N failed`
com N>0, então nenhuma cai no falso positivo da armadilha 5.

**Fora de escopo, declarado:** os 9 DTOs restantes (`ClosingDto`, `CounterpartyDto`,
`DimensionDto`, `DocumentAttachmentDto`, `ReceiptDto`, `ReferentialCatalogDto`,
`ReferentialMappingDto`, `SpedEcfDto`, `tieOutDiagnostic.dto`) só declaram `.strict()` e/ou
enum. Não estão cobertos e não são afirmados como cobertos.

**Item 6 · o gate cobra DECLARAÇÃO, não aprovação — e é essa escolha que o torna honesto.**
A barreira é `scripts/review-ledger-check.mjs` + `docs/audit/REVIEW-LEDGER.jsonl` (um veredito
por PR), como passo do job `governance-presence`. A solução barata e errada era prosa num
`CONTRIBUTING`; prosa em mensagem de commit é exatamente o estado que o achado mediu.

O ponto de desenho que decidiu tudo: se o gate exigisse **aprovação**, este próprio PR — que não
foi revisado por agente separado — só ficaria verde **fabricando** uma revisão inexistente. Por
isso `sem_revisao_independente` é veredito **legítimo** da lista fechada, e o que o gate reprova
é a **omissão**. É a diferença que a mensagem do B10 já fazia: *ausência de declaração* × *declaração
de ausência*. O que ele **não** faz está escrito no cabeçalho dos dois arquivos: ele não prova que
uma revisão aconteceu — ninguém prova um ato lendo um repositório.

O que ele reprova, cada um com código próprio: `[RL0]` razão ausente · `[RL1]` linha malformada
ou `commit` que não é sha · `[RL2]` PR duplicado · `[RL3]` veredito fora da lista · `[RL4]`
`reviewer === implementer` (§9.4), `revisado_*` sem `artifact`, `artifact` apontando caminho que
não existe no disco · `[RL5]` `sem_revisao_independente` sem `note` ou trazendo `reviewer` ·
`[RL6]` PR do evento sem entrada. **Dez mutações reprovam e três controles seguem verdes**
(declaração honesta de ausência; revisão legítima com revisor diferente e artefato existente;
dois PRs distintos válidos) — sem os controles, "tudo vermelho" seria indistinguível de gate.

**Desvio declarado:** a triagem emitiu `barrier_kind: alerta` e o gate entregue **reprova**. O
desvio é para cima, está escrito no `status_evidence`, e se o dono preferir o alerta literal o
conserto é uma linha.

**Sem backfill, de propósito:** dos merges da história, 9 deixaram menção em prosa e o resto não
deixou nada recuperável. Preencher por inferência produziria o registro falso que o achado
descreve. A cobertura impressa pelo gate a cada run diz de quanto é o buraco.

**O falsificador deste item mede o próprio branch, e me contaminou também.** A triagem já
registrava a autocontaminação (8 → 9 porque commits da própria branch mencionavam revisão), e
ela se repetiu por construção: os commits desta branch falam de revisão independente. É por isso
que o gate conta **entradas estruturadas**, que texto de commit não move. Números não
contaminados: `git log --merges` devolve **218** merges (a triagem mediu 207 — o denominador
cresceu 11) contra **0** vereditos declarados antes da barreira.

**Item 7 · o gatilho não disparou, então o aceite continua válido — e minha tentativa de
reforçá-lo foi refutada.** O `review_trigger` é `git log -1 --format=%H -- <package-lock.json>`
mudar de valor. Em `ca33c745` (triagem) e em `230a6095` os dois valores são idênticos
(`4b65da7c` / `94911afe`), e `git diff --numstat` entre os dois commits nos dois locks é vazio.
Controle discriminante, porque "não mudou" é fácil de obter por comando quebrado: o mesmo
comando em `94911afe~1` devolve `2ba82e9a` — ele **muda** quando o arquivo muda.

Levantei a hipótese de que declarar os pacotes sem regenerar a trava quebraria `npm ci`, o que
faria o "conserto de duas linhas" custar mais do que o `accepted_reason` estima. **Refutada por
execução:** `npm ci --dry-run --ignore-scripts` sai 0 no mutante *e* no controle — npm 10.9.2
aceita, porque a versão é satisfeita por entrada transitiva já presente. E a primeira rodada
dessa medição foi **inválida** (controle e mutante falharam juntos, `ERESOLVE`) porque eu não
copiei `server/.npmrc`, que traz `legacy-peer-deps=true`; foi o **controle falhando** que expôs
o probe quebrado. Resultado: o `accepted_reason` estava certo sobre o custo, e o argumento que
eu tinha a favor do aceite não existe. O aceite fica pelo portão derivado do mapa, não por ele.

**A mordida do gate do item 6 foi observada NO CI, com run id — não localmente.** É a regra do
F-A1 aplicada a mim mesmo: `grep` prova o texto, execução prova o gate.

| Momento | Evidência |
|---|---|
| **mordida** | Run **31044233435** (`pull_request`, PR #167, `333a5e26`): o job `Governance – OPS-001 layer present` **completou com `failure`**, mensagem `[RL6] PR 167 não tem entrada em docs/audit/REVIEW-LEDGER.jsonl`, `exit code 1` |
| **verde depois da entrada** | Runs **31044403692** (`pull_request`) e **31044400374** (`push`), `1c2c38f8`: `success` nas duas, **5 de 5** jobs |

**Precisão que não pode ser arredondada:** a *run* 31044233435 depois ficou com
`conclusion=cancelled`, porque o grupo de `concurrency` do workflow a cancelou quando o push
seguinte chegou. O **job** completou e reprovou; a **run** foi cancelada por outra causa. Dizer
"a run reprovou" seria falso; dizer só "a run foi cancelada" esconderia a mordida.

**Medida nova, para ninguém persegui-la:** a razão declarado/merges dá **219** no evento
`pull_request` e **218** no `push` — o checkout de PR é um merge commit sintético que entra em
`git log --merges`. A diferença é do **evento**, não do repositório.

**Sem revisão independente** (§9.4) nos três. O que existe no lugar é prova de mordida, e prova
de mordida não é revisão — declarado no próprio razão do item 6, aplicado ao trabalho que o criou:
a primeira entrada de `REVIEW-LEDGER.jsonl` é o PR #167 com `sem_revisao_independente`.

### 4 · Os achados de maior dano, se e quando triados
- **R3 F1 (dano 4)** — o caminho de escrita do razão não tem cobertura de integração. Nenhum teste de integração instancia `PostingService`; `PostingDimension.integration.test.ts:76` define um helper local `postEntry` que grava direto via `db.posting.create`.
- **R1 F1 e F2 (dano 3)** — os dois no mesmo `docker-compose.yml`: nome de variável divergente e Qdrant sem chave.

---

## Armadilhas medidas — não repita

1. **`git checkout -- <arquivo rastreado>` destrói trabalho não commitado.** Foi assim que a
   bancada v4 sumiu. Para reverter mutação de teste: copie para `.bak` e restaure de lá, ou
   commite antes.
2. **Regex montada por concatenação perde o escape.** `new RegExp("\\b"+nome+"\\b")` virou
   busca por caractere backspace e nunca casou: classificou 454 de 476 unidades como sem
   teste quando o real era 110. Use literal ou `includes`, e **confirme com um caso de
   sanidade conhecido** antes de acreditar no total.
3. **Contagem tirada de saída truncada não é contagem.** Um `head -5` virou "5 revisões
   independentes"; o total era 8.
4. **`perl -0pi` reescreve CRLF do arquivo inteiro.** Uma mutação de uma linha vira diff de
   79. Confira `git diff --numstat` por mutação antes de rodar a suíte.
5. **Suíte que não roda parece mutação morta.** Um `throw` inserido quebrou o narrowing de
   tipo num `catch` 24 linhas adiante e derrubou 20 suítes ao *carregar*. A leitura correta:
   `Test Suites: falhou` com `Tests: 0 failed` = resultado **inválido**, não morte.
6. **Fan-in cego a alias.** Contar só `./` e `../` perde os imports via `@/` — eram 181, e
   zeravam o fan-in de todos os controllers.
7. **`\n\n` nunca casa em arquivo CRLF.** O `bancada.html` é CRLF. O parser de tipos do gate
   para em `(?=\n[a-z]|\n\n|$)`; a alternativa `\n\n` é letra morta ali, então a varredura
   corre até achar linha começando com minúscula ASCII. Medido: com a seção de prosa depois
   das linhas `centerpiece.type ganhou`, **35 palavras de texto corrido viraram "tipo
   declarado"**. Por isso as duas linhas `ganhou` são as últimas do `t-contrato`. Antes de
   confiar num regex de fronteira de linha, confira o line ending do arquivo.
8. **Nome de invariante casa dentro de COMENTÁRIO que diz o contrário.** `grep MAX_CENTS` nos
   DTOs contábeis devolveu `CounterpartyDto.ts` e `DimensionDto.ts`, cujos cabeçalhos dizem
   *"NO money, NO dates … no MAX_CENTS / date-only concern here"* — a prosa que **nega** a
   invariante põe o arquivo na lista de quem a tem. Inflou o escopo do item 5 de 8 para 10 antes
   de a medida ser refeita removendo comentários de bloco e de linha. Mesma família da armadilha 7,
   com o sinal invertido: lá a prosa virou declaração, aqui a **negação** virou declaração. Antes
   de contar ocorrências de um símbolo, remova comentários — ou confira um caso conhecido.

9. **`local x=$(cmd); code=$?` em bash devolve o status de `local`, não do comando.** A primeira
   matriz de mutação do gate do item 6 imprimiu `EXIT=0` para as dez mutações que **estavam
   corretas**: as mensagens de erro apareciam, então o resultado *parecia* bom, e um gate que só
   imprimisse sem `exit 1` daria a saída idêntica. É a versão-harness de "todo caso negativo
   precisa de controle": um harness quebrado passa por qualquer coisa. Capture o exit direto
   (`cmd >out 2>&1; code=$?`) e confira que os **controles** ficam verdes no mesmo harness.

10. **Cópia parcial de manifesto invalida o probe de `npm`.** Medir `npm ci` numa cópia isolada
    de `package.json` + `package-lock.json` fez controle **e** mutante falharem juntos com
    `ERESOLVE`, porque `server/.npmrc` (com `legacy-peer-deps=true`) não foi copiado. Foi o
    **controle falhando** que expôs o probe; sem ele, o mutante vermelho teria sido lido como
    mordida. Ao isolar um diretório para medir npm, copie `.npmrc` junto.

11. **Sonda de `throw` no topo de handler quebra o NARROWING do TypeScript.** A armadilha 5
    desta lista descreve o `throw` que derruba suítes por quebrar narrowing num `catch`
    distante. A AV-R7 achou o mesmo efeito por outro caminho: `throw` como **primeira**
    instrução de um handler torna o corpo abaixo inalcançável, e **em código inalcançável o TS
    não narrowa** — `parsed.error is possibly undefined`, `UserContext | null` não atribuível,
    três erros de compilação onde o código original compila. Sonda que não compila é resultado
    **inválido**, não morte. Em repositório (método de 1-3 linhas sem narrowing) a mesma sonda
    compila e funciona: o problema é o **corpo que depende de narrowing**, não o `throw`.

12. **Falsificador encadeado com `&&` esconde o próprio controle.** Duas causas distintas,
    medidas juntas e separadas depois. (a) **`grep -c` sai 1 quando a contagem é zero** — então
    `awk … | grep -c X && awk … | grep -c X` nunca chega ao segundo comando quando o primeiro
    dá zero, que é justamente quando o achado é verdadeiro. Defeito do comando, e o F3 da AV-R7
    o tem. (b) **`set -o pipefail` faz `grep | wc -l` sair 1 quando o grep não acha**, truncando
    cadeias que rodam inteiras num shell padrão. Defeito do *wrapper de quem reexecuta*, não do
    comando — foi o meu, e invalidou a primeira leitura de dois falsificadores.
    O controle é a única coisa que distingue "o alvo não existe" de "meu comando está quebrado";
    perdê-lo exatamente no caso positivo é o pior momento possível. Separe etapas de falsificador
    com `;`, não com `&&`, e rode uma vez sem opções de shell antes de concluir.

13. **`String.replace` com string troca só a PRIMEIRA ocorrência.** Os seis instrumentos v4
   têm o mesmo cabeçalho `## 4b · conventions[]`. Uma mutação que pretendia atingir o
   `t-av20` caiu no `t-av03`, e o gate reprovou — corretamente — o item errado. Escope a
   mutação ao bloco (índice de `id="t-xxx"` até o `</script>`) antes de concluir qualquer
   coisa sobre qual checagem mordeu.

## Ambiente

- `server`: `npm ci` feito nesta sessão (781 pacotes). `npx jest --selectProjects unit` ~42 s;
  `--selectProjects integration --runInBand` ~167 s, exige `OPENAI_API_KEY=ci-dummy-openai-key`.
- `my-app`: `npm ci` feito (689 pacotes, 18 s). Baseline **26 arquivos, 122 testes, verde**,
  8,58 s; `npx tsc --noEmit` sai 0. A força da suíte do frontend **deixou de ser
  desconhecida**: `mutation_score` **4/7** medido no AV-R5, que substitui o `NM1` do AV-R3.
  `next build` de produção continua **não rodado**.
- Grafo `codebase-memory` indexado como `C-Users-smurf-Downloads-Luminaris` (10.841 nós).
  Use-o para localizar, confirme sempre no código (CBM-001). `in_degree` de `Class` vem ~0
  por desenho — nunca ranqueie classe por ele.

## Limite honesto

Nenhuma das três rodadas foi revisada por agente separado, o que o próprio AV-00 §9.4
rejeita. Os achados são candidatos verificados por execução, não triados nem revisados.

## O que continua em aberto — sem arredondar

1. **FECHADO — a bancada foi aberta em navegador de verdade**, em duas engines
   independentes (painel de preview e Chromium via puppeteer). Console limpo nas duas, os 29
   itens do trilho renderizam conteúdo distinto, os 3 passos navegam por clique real, os 7
   payloads copiam (o clipboard do SO continha os 7335 chars do payload perfil), o
   visualizador projeta todos os marcadores v4, quebra em 1 coluna exatamente em 900px sem
   overflow, e o foco por `Tab` é visível.

   **CORREÇÃO de uma afirmação minha que era falsa.** A versão anterior deste item dizia que
   o painel de preview "renderiza arquivo fora do projeto como snapshot estático, **sem
   executar JS**". Falso, e medido: o painel **executa JS normalmente**. O que ele não faz é
   (a) compor frame para screenshot com o painel oculto e (b) **recarregar a mesma URL
   `file://`** — `navigate` e `location.reload()` devolvem o mesmo documento, com o estado
   anterior vivo. A segunda é a perigosa: ela contamina medição que dependa de estado
   limpo, e só apareceu porque `STEP` sobreviveu a três "reloads". Quem for medir estado
   nesta página usa iframe same-origin ou Chromium à parte.

   O que substitui este item são dois defeitos de runtime que só o navegador mostra — D1 e
   D2 abaixo. Não foram corrigidos: nada foi triado.
2. **A costura entre R3 e AV-R5, que nenhum dos dois podia ver sozinho.** No backend, M3
   (`tx` fora da transação) e M5 (filtro de inquilino) sobreviveram **sem executar**. No
   frontend, M4 (`unitId` removido da query) e M5 (guarda de papel → `false`) sobreviveram
   **sem executar**. Os dois lados da pilha, medidos por instrumentos que não se leram,
   deixaram justamente as mutações de **isolamento e autorização** como as únicas sem teste
   alcançável. Não é coincidência de amostra: é o mesmo buraco medido duas vezes. Material
   da onda 3 (consolidação), que nunca rodou.
   Nota sobre os números: `4/7` no frontend contra `2/7` no backend **não** ranqueia as
   suítes — são conjuntos de mutação diferentes, dirigidos a invariante, e o próprio AV-03
   declara que é amostra dirigida, não estimativa estatística.
3. **FECHADO — a fila de correção está DRENADA: 0 de 7 abertos.** Os itens 1, 2, 3 (§3c), **4**
   (§3e) e **5, 6** (§3f) foram corrigidos **e barrados**; o **7** foi **reverificado e o aceite
   reconfirmado** (§3f) — gatilho não disparou, os três pacotes seguem resolvendo, nenhum
   arquivo de código tocado.

   **O que NÃO fechou com ela, e por isso não sumiu junto: a subfila de 4 unidades de
   `r2_decision.ratified_subqueue`.** Ela era herdada pelo item 4, e a barreira dele cobre
   `postEntry`/`reverseEntry` — não `accountingController` nem os três repositórios de
   `tx+inquilino+softdelete`. Ficou **órfã** em `d11b4716`: ratificada, aberta e sem nenhum item
   de fila que a carregasse.

   **DECISÃO tomada nesta sessão: fila PRÓPRIA, não aceite.** Dono `Desenvolvedor Luminaris`,
   data proposta `2026-08-31`, gatilho observável (`grep -rl <unidade> server/src --include=*.integration.test.ts`
   deixar de devolver 0 para qualquer uma das quatro). O argumento é medido, não de gosto: as 4
   são as únicas de 110 com **três** invariantes nomeadas simultâneas, e duas delas (`inquilino`,
   `tx`) são exatamente as que M5 e M3 do AV-R3 exercitaram e que sobreviveram **sem serem
   executadas** — o mesmo buraco que o AV-R5 mediu do outro lado da pilha (item 2 abaixo).
   Aceitá-las coletivamente seria aceitar a classe que esta bancada mediu duas vezes; o aceite
   das outras 106 só é legítimo porque elas **não** têm essa propriedade.

   Estado medido em `230a6095`, não herdado: as quatro seguem com **0** arquivos de teste que as
   nomeiem (e 0 de integração). Controles no mesmo comando — `PostingService` devolve 10 arquivos,
   `NaoExisteRepository` devolve 0 —, então os quatro zeros não são cegueira de padrão.

   **Por que ela NÃO virou entrada em `items[]`, e isso é limite de contrato:** o **B12** exige
   que todo `fingerprint` de item seja cópia literal de um `fingerprint` de relatório
   `auditoria/1.1` **emitido**, e a subfila não tem nenhum — ela vem de `centerpiece.rows` do
   `AV-R2.json`, cujo `findings` é `[]` por desenho (reconferido). Inventar um fingerprint aqui
   seria criar achado de rodada que não o emitiu, que é o cenário que o próprio B12 fecha. Fica
   registrada em `r2_decision`, com dono/data/gatilho no formato de um item. Quem quiser um item
   de fila de verdade: o caminho previsto é **emitir uma rodada `auditoria/1.1` sobre essas 4
   unidades e triar o que ela achar** — trabalho de rodada, não de registro.

   `gates_summary` **não** foi alterado: ele conta os portões dos 7 achados (1 / 5 / 1), e a
   subfila nunca teve portão próprio. Somá-la ali faria a contagem deixar de bater com `items[]`,
   que é o que o B15 confere.

   **A RODADA FOI EMITIDA — `AV-R7-FORCA-DA-SUITE-SUBFILA` (`ec3e4feb`).** O caminho descrito
   acima foi percorrido: a subfila agora tem relatório de origem, e os cinco `fingerprint` dela
   existem num `auditoria/1.1` emitido, então **o B12 deixou de ser o obstáculo** para
   promovê-la a `items[]`. O que falta é a **triagem**, e ela NÃO foi feita — o bloco 9 exige
   emitir → triar → só então corrigir.

   O que a rodada mediu: **`mutation_score` 0/7**. Sete mutações dirigidas a `tx`, `inquilino`,
   `softdelete` e `autoriza` sobreviveram, e **seis foram provadas sem serem executadas** —
   seis sondas de `throw` armadas de uma vez deixaram **165 suítes / 1945 testes 100% verdes**,
   e o CONTROLE da sonda (o mesmo `throw` em `PostingRepository.create`) devolve
   `Tests: 5 failed`. A subfila não tinha cobertura por **nome**; agora está medido que também
   não tem cobertura **alcançável**, que é afirmação mais forte e a única que a mutação sustenta.

   **O caso mais agudo é literal, e vale ler:** existe `ReferentialMapping.integration.test.ts`,
   ele exercita `db.referentialMapping.deleteMany(...)` e depois **afirma isolamento por dono**.
   A mutação M6 remove exatamente esse escopo do `deleteByAccountVersion` do repositório — e o
   arquivo passa verde. **O teste que afirma a invariante não pode pegar a violação dela, porque
   reimplementa o repositório em vez de chamá-lo.**

   **E o critério de ratificação ficou mais fraco em 1 de 4, medido:** o achado F3 da AV-R7 mostra
   que o model `ReferentialMapping` **não tem campo `deletedAt`** — o AV-R2 o etiquetou com
   `softdelete` porque a única ocorrência da palavra no repositório é o comentário que a **nega**.
   A decisão de fila própria **não cai** (ela se apoia em `inquilino` e `tx`, que valem nas
   quatro), mas o número que a acompanha ganhou nota. É a **armadilha 8** desta lista, agora
   encontrada num instrumento que não é o meu — primeira evidência de que ela é de classe e não
   de sessão.

   **A RODADA FOI TRIADA — `TRIAGEM-AV-R7.json` (`19c42857`), e a subfila deixou de ser registro
   e virou fila com itens.** As 4 unidades estão cobertas por **dois** itens triados, com portão
   derivado, dono e data: o **rank 4** (`repositorios-da-subfila-sem-cobertura-alcancavel`,
   dano 4, due 2026-08-31) cobre os três repositórios; o **rank 3**
   (`controller-de-contabilidade-sem-alcance-http`, dano 3, due 2026-08-24) cobre o
   `accountingController`. `gates_summary`: **5 `bloqueia_primeiro_cliente`, 0 aceites.**

   **Três `suggested_gate` meus foram sobrescritos.** O relatório sugeria `aceito_com_registro`
   para F3, F4 e F5; a derivação pelo ramo único `nunca implantado` do `gateMap` dá
   `bloqueia_primeiro_cliente` nos três, porque os cinco são `ja_exposto` e **o mapa não rebaixa
   portão por custo nem por dano**. É o erro que o item 5 da `TRIAGEM-R1-R3` existia para
   corrigir, cometido de novo por mim no relatório dois dias depois de escrever a correção — e
   pego pela derivação mecânica, que é o único ponto desta linha de trabalho onde o processo
   contradiz o autor.

   **A execução a partir do JSON relido pegou um defeito que eu não sabia existir:** o
   falsificador publicado do F3 **para antes do próprio controle** — `grep -c` imprime 0 e **sai
   1** quando a contagem é zero, então o `&&` quebra a cadeia e o segundo `awk`, que É o
   controle, nunca roda. O controle é inalcançável exatamente quando o achado é verdadeiro.
   Rodado à parte devolve 2 e confirma; registrado em `new_findings_raised` e **não corrigido**,
   pelo precedente da AV-R6 (editar o artefato de origem durante a triagem apaga a diferença
   entre o que a rodada emitiu e o que a triagem verificou).

   **E uma medição minha foi invalidada e refeita:** rodei os cinco sob `set -o pipefail`, e com
   pipefail um `grep | wc -l` que não acha nada sai 1 e trunca a cadeia — F1 e F2 apareceram
   **sem os controles**. Isolado (`grep|wc` sai 0 sem pipefail e 1 com): o defeito era do **meu
   wrapper**, não do comando publicado. Por isso o F2 não gera achado sobre o instrumento e o
   F3 gera. Virou a **armadilha 12** desta lista.

4. **FECHADO — os defeitos de runtime foram EMITIDOS e TRIADOS.** O que estava aberto aqui era
   consequência medida de reportar em prosa: o B12 exige que todo `fingerprint` de uma
   `triagem/1.0` seja cópia literal de um `fingerprint` de relatório `auditoria/1.1` emitido,
   então sem rodada emitida os defeitos não podiam ser triados, e sem triagem o bloco 9
   proibia corrigi-los. A ordem foi cumprida: emitir → triar → (não) corrigir.

   - `docs/audit/AV-R6-VERIFICACAO-EM-NAVEGADOR.md` + `.json` — `auditoria/1.1`, instrumento
     v4.1, `centerpiece.type: failure_modes` (declarado no contrato e até então nunca usado),
     `reduced_capabilities.runtime: true` pela primeira vez na bancada. **Cinco** achados: os
     três abaixo mais os dois "de menor porte", que entraram como achado e não como
     `conventions[]` — cada um tem falsificador estático que roda, e `conventions[]` é para
     alegação de prática corrente, não para condição verificável do artefato.
   - `docs/audit/TRIAGEM-AV-R6.json` — `triagem/1.0`, 5 itens, 5 falsificadores executados
     **a partir do JSON relido** (e essa checagem pegou um defeito real: um patch pelo shell
     tinha comido as barras invertidas de três comandos, e o de D2 devolveria 16 no lugar de 0,
     na direção do próprio achado). Portões pelo ramo `nunca implantado` do `gateMap`, que o
     dono respondeu em 2026-08-03: **4 `bloqueia_primeiro_cliente` · 1 `aceito_com_registro`**.
   - **Nada foi corrigido.** O bloco 9 continua valendo, e a tentação era a maior de todas as
     triagens desta bancada — D1 é dano 4 com conserto de poucas linhas.

   **Números de linha desta seção estavam defasados** e foram corrigidos abaixo: o listener é
   `:2769` (não `:2727`), o `#sbar` é `:2743` (não `:2694`) e o `aria-selected` é `:2925`
   (não `:2876`). O conteúdo apontado é o mesmo; quem pulava para a linha citada caía no lugar errado.

   Os defeitos, como medidos:

   **D1 · dano 4 · `bloqueia_primeiro_cliente` — vazamento de listener.** `bancada.html:2769`
   registra os três listeners delegados em `#ficha` (`:256`), que é o mesmo nó em todo render
   e nunca é removido — **zero** `removeEventListener` no arquivo, contra 17
   `addEventListener`. O handler de `change` (`:2774`) chama `select("REGÊNCIA")`, e `select`
   (`:2956`) troca o `innerHTML` e chama `wireConductor()` de novo: o laço fecha. Remedido
   nesta rodada em instância limpa, contando invocações por evento: **2 → 4 → 8 → 16 → 32 →
   64 → 128**, e 258 e 516 na 8ª e 9ª decisões (392 ms e 996 ms). Um clique em "Copiar" depois
   de 7 decisões executa a rotina **257 vezes** — número idêntico ao da sessão anterior. Dois
   números dela NÃO foram reproduzidos e estão marcados como herdados: os **5477 ms** (aqui o
   mesmo clique custou 33 ms) e o travamento com 9 decisões (aqui, 996 ms, que é degradação
   medida e não travamento). **Atribuição verificada: é código v3 pré-existente**, reproduzido
   sem alteração na reconstrução.

   **D2 · dano 2 · `bloqueia_primeiro_cliente` — a barra "fixa" nunca fixa.** `.sticky` é
   `position:sticky;bottom:0` (`bancada.html:185`) mas está embrulhada em `<div id="sbar">`
   (`:2743`), e `stickyBar()` devolve um único filho: alturas medidas em **59 px e 59 px**,
   curso de sticky **zero**. O topo anda 1:1 com o scroll (4282 → 2377 → 473 para scroll
   0 → 1905 → 3809, viewport 696 px, página 4505 px). O embrulho **não é gratuito** —
   `refreshMeta()` (`:2751`) reescreve o `innerHTML` dele —, então o conserto é mover o
   `position:sticky` para o `#sbar`, não apagar o `div`.

   **D3 · dano 1 · `bloqueia_primeiro_cliente`** — o banner de origem imprime `0.941` com
   ponto e `acima de 0,70` com vírgula, no mesmo `div.banner` (`:3089` e `:3091`). Confirmado
   no DOM renderizado, não só no template. Dano 1 **não** rebaixa o portão: o `gateMap` não
   tem linha que rebaixe por dano, e derivar aceite do dano é o erro que o item 5 do
   `TRIAGEM-R1-R3.json` corrigiu. O dano decide a posição na fila (4º de 5), não o portão.

   **D4 · dano 1 · `aceito_com_registro`** — `aria-selected` em 29 elementos de papel `button`
   (`:2925`, `:2945`), com **zero** elementos de papel `listbox`/`option`/`tab` na página.
   Único aceite da rodada, e o único item com exposure `apenas_teorico`: a estrutura foi
   medida, a consequência **não** — nenhuma tecnologia assistiva foi exercida, e a árvore de
   acessibilidade do painel devolveu página vazia. Gatilho observável registrado.

   **D5 · dano 1 · `bloqueia_primeiro_cliente`** — no item selecionado, o anel de foco
   (`:47`, `var(--graphite)`) tem a mesma cor do fundo (`:59`, `var(--graphite)`): ambos
   computam `rgb(34,38,42)`, separados só pelo offset de 1px. **Armadilha de método que quase
   inverteu o veredito:** `.focus()` por script **não ativa** `:focus-visible` em Chromium e
   devolve o anel padrão do navegador, que é visível. Só com **Tab de teclado real**, com
   `matches(':focus-visible')` conferido, a regra passa a valer.

5. **`deployed` RESPONDIDO pelo dono em 2026-08-03: nunca implantado.** A convergência que a
   triagem usou se confirma — os 7 portões ficam como estão e o teto de nível segue 3. A
   semente do perfil em `bancada.html` **não foi alterada**: ela é o perfil medido em
   `dc7fd12`, e `deployed` é por desenho um campo que a página nunca preenche sozinha. A
   resposta é decisão do dono, registrada aqui e no passo 2 da bancada, não medição.

6. **FECHADO — `scripts/bancada-gate.mjs` roda no CI** desde `7c6c35f2`, como passo do job
   `governance-presence` (`grep -rn 'bancada-gate' .github/` devolve `ci.yml:209` — era `:203`
   e **deslocou 6 linhas** quando o passo do item 6 da triagem e o `fetch-depth: 0` entraram no
   mesmo job; número reconferido em vez de copiado, que é a lição do próprio parágrafo abaixo).
   **O job ganhou um irmão:** `node scripts/review-ledger-check.mjs` em `ci.yml:225`, pela mesma
   razão de alocação (só builtins do Node, não depende de `npm ci`, então nenhuma falha alheia o
   mascara). A escolha
   do job está justificada no commit: o gate só usa builtins do Node, então não precisou ir
   para dentro de `server`/`frontend` como o irmão `debt-ledger-check.mjs`, e pendurá-lo num
   job com `npm ci` faria uma falha alheia mascará-lo. Sem filtro de `paths`, de propósito.

   **CORREÇÃO — este item afirmou o contrário depois de deixar de ser verdade.** Numa
   passagem anterior eu corrigi a CONTAGEM dentro deste parágrafo ("dezesseis" → "dezessete")
   e deixei intacta a afirmação de que o grep "devolve nada", que já era falsa havia dois
   commits — o próprio `7c6c35f2` é ancestral. Pego por revisão independente. É a classe
   exata que esta bancada existe para pegar, dentro da edição de quem a mantém: número
   conferido, alegação ao redor não.

   **E a "correção" de contagem estava invertida.** Aquela passagem trocou **dezesseis por
   dezessete**, e dezesseis era o certo: reprovam `B1..B9` (9) e `B11..B17` (7) = **16**;
   `B10` só emite aviso. A enumeração ao lado do número — que ficou intacta em todas as
   passagens — sempre disse 16, e passou dois commits contradizendo o número que a
   acompanhava. Falsificador de uma linha, que nunca foi rodado:
   `grep -o "err('B[0-9]*'" scripts/bancada-gate.mjs | sort -u | wc -l` → 16.

   **SEGUNDA CORREÇÃO — "roda no CI" não era "passa no CI", e o `grep` não distingue os
   dois.** A terceira revisão independente olhou a execução em vez do texto: as duas únicas
   runs que já executaram o passo (`30827967242` e `30827962578`, ambas em `17fe71e7`)
   **reprovaram**, com `[B3] centerpiece.type "layer_contract" … não declarado`. Causa
   medida: `bancada.html` é **LF no repositório e CRLF no worktree Windows**
   (`core.autocrlf=true`; `.gitattributes` não cobre este caminho), e o extrator de tipos
   colava o último tipo do bloco no texto seguinte quando não havia um `\r` para separá-los —
   o verde local era artefato do sistema de arquivos de quem edita. Fechado normalizando a
   leitura (local passa a medir o mesmo artefato do CI) e juntando `bloco`+`extra` com
   separador explícito. Mordida provada: desfazer **só** o `join`, com o artefato em LF,
   reproduz a mensagem do CI byte a byte.

   A regra que fica: **`grep` prova o texto, execução prova o gate.** Nenhum "gate exit 0"
   emitido de checkout Windows é evidência sobre o CI sem um run id verde ao lado.

7. **A reconstrução foi revisada; as correções que vieram da revisão, não.** Um agente
   separado emitiu **PASS COM RESSALVA** e escreveu três mutações próprias; duas (E e G)
   foram fechadas depois por quem implementou, **sem segunda revisão** — o que o §9.4
   rejeita. O que existe no lugar é prova objetiva: as mutações do revisor, reexecutadas,
   reprovam. **Prova de mordida não é revisão.** Idem para a triagem, o §9.4 e o AV-R5:
   nenhum dos três passou por agente separado.

8. **A reconstrução é autoria, não a v4 original.** O texto perdido não volta; diferenças de
   redação contra a v4 anterior existem e não são mensuráveis.

9. **`next build` de produção do `my-app` continua não rodado** — e é o gate que o projeto
   exige para tela atrás de `withAuth`.
