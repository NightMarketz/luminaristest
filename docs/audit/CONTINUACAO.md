# Continuação da bancada — estado após a integração das quatro rodadas paralelas

Documento de retomada. Escrito ao fim da sessão que produziu o PR #164, atualizado pela
sessão que fechou os itens 1 e 2 da fila, e de novo pela integração de quatro trabalhos
que rodaram em paralelo (triagem + gate de `triagem/1.0`, divulgação §9.4, verificação em
navegador, AV-03 no frontend).

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
| `docs/audit/TRIAGEM-AV-R6.json` | **triagem/1.0** · 5 itens · 5 falsificadores executados a partir do JSON · 4 bloqueiam, 1 aceite |
| `scripts/bancada-gate.mjs` | gate de **16** checagens que reprovam (B1..B9 e B11..B17; B10 só avisa) · **passa, e passa no CI** · mordida provada, inclusive nos dois artefatos do AV-R6 (5 mutações) |
| `docs/audit/bancada.html` | **v4/v4.1 reconstruída** · 29 itens · 15 blocos · contrato `triagem/1.0` no `t-contrato` |
| `docs/audit/TRIAGEM-R1-R3.json` | **triagem/1.0** · 7 itens · 7 falsificadores executados · portão, dono e data em todos · **3 fechados** (§3c) |
| `server/src/config/__tests__/dockerCompose.qdrant.test.ts` | barreira do item 2 · roda na suíte `unit`, que já está no CI |
| `my-app/lib/api/__tests__/nextPublicEnvWiring.test.ts` | barreira do item 3 · roda no `vitest`, que já está no CI |

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
8. **`String.replace` com string troca só a PRIMEIRA ocorrência.** Os seis instrumentos v4
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
3. **A fila de correção está aberta em 3 de 7.** Os itens 1, 2, 3 (§3c) e **4** (§3e) foram
   corrigidos **e barrados**. Restam, na ordem:
   **5** `fronteira-de-dto-quase-nao-testada`, **6**
   `revisao-independente-sem-artefato-por-merge` (único de custo **recorrente**), **7**
   `tres-imports-sem-declaracao-no-manifesto` (aceito com gatilho — nada a fazer até as
   travas serem regeneradas).
   **A subfila de 4 unidades de `r2_decision.ratified_subqueue` NÃO foi fechada junto** —
   ela era herdada pelo item 4, e a barreira dele cobre `postEntry`/`reverseEntry`, não
   `accountingController` nem os três repositórios de `tx+inquilino+softdelete`. Segue aberta,
   agora sem item de fila que a carregue: quem retomar decide se vira item próprio ou aceite.

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
   `governance-presence` (`grep -rn 'bancada-gate' .github/` devolve `ci.yml:203`). A escolha
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
