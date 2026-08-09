# Revisão independente — PR #173

- **Revisor:** agente separado (claude-opus-5), sem participação na autoria do PR #173 nem das rodadas AV-R7 / PR #171.
- **Data:** 2026-08-07
- **Commit revisado:** `fe27cc22` (head do PR #173, branch `claude/registra-fechamento-av-r7`)
- **Worktree:** `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rv-173`, detached em `fe27cc22`. Nenhum commit, `git add`, push ou merge foi feito. Nenhum `git checkout -- <arquivo>` foi usado: toda mutação foi `cp .bak` → mutar → `git diff --numstat` → rodar → restaurar do `.bak` → conferir numstat vazio → `rm .bak`, por harness próprio.
- **Diff revisado:** `git diff origin/main...fe27cc22` — 5 arquivos, `12/0` AV-R2.json, `24/0` CONTINUACAO.md, `1/0` REVIEW-LEDGER.jsonl, `13/2` TRIAGEM-AV-R7.json, `97/1` bancada-gate.mjs.

---

## 2. Veredito

**`revisado_com_ressalva`** — o B18 existe, morde de verdade e é discriminante entre as três linhas de repositório; mas **eu reprovaria o PR como está**, porque a barreira **não barra a fuga que ela foi escrita para barrar**: apagar a etiqueta `softdelete` da linha do centerpiece e remover o registro ao mesmo tempo sai **exit 0**, e é exatamente "a contradição sumir sem o defeito sumir junto", que o `TRIAGEM-AV-R7.json` afirma literalmente que o gate reprova.

**Risco principal:** o campo de evidência do registro é checado por **presença de string não-vazia**, não por evidência — os seis campos preenchidos com `"x"` passam com exit 0, e `null`, `"n/a"`, `{}` e `false` também passam. Somado ao empate por **prefixo que casa demais** (uma linha `DocumentRepository.ts` etiquetada `softdelete` passa em silêncio porque o irmão `DocumentAttachment` tem `deletedAt`), o B18 hoje é um gate que **lê o app** (isso é verdade e foi medido), mas cuja mensagem — *"registro sem evidência é a etiqueta errada com outro nome"* — **promete mais do que a checagem entrega**.

---

## 3. O que reexecutei

Tudo abaixo rodado da raiz do worktree `rv-173`, capturando o exit direto (`cmd >out 2>&1; code=$?`, nunca `local x=$(cmd)`).

| Comando | Exit | Saída (recorte) |
|---|---|---|
| `node scripts/bancada-gate.mjs` | **0** | `OK: 29 itens no catálogo … 22 aviso(s).` + `Etiqueta \`softdelete\` sem lastro no schema, registrada ao lado (B18) (1): AV-R2.json:ReferentialMapping` |
| `node scripts/review-ledger-check.mjs` | **0** | `OK: 6 PR(s) com veredito declarado … Cobertura: 6 declarado(s) / 225 merge(s) na história.` |
| `grep -o "err('B[0-9]*'" scripts/bancada-gate.mjs \| sort -u \| wc -l` | — | **17** |
| cabeçalho `O QUE GARANTE` (linhas 15–41) | — | declara B1–B9 + B11–B18 = **17**. **Confere. Não há colisão de B18**: todas as 6 ocorrências de `err('B18'` estão dentro do bloco novo (linhas 745–794). |
| `grep -n "bancada-gate" .github/workflows/*.yml` | — | `209: run: node scripts/bancada-gate.mjs` — o gate **está fiado no CI**, então B18 tem consequência de merge e não é enfeite. |

Verificações de fato que sustentam o achado de origem (não aceitas do autor):
- `model ReferentialMapping` em `server/prisma/schema.prisma` (linha 436) **não tem** `deletedAt` — li o bloco inteiro.
- `ReferentialMappingRepository.ts` linhas 13–14: `No soft-delete (D5): unset is a real delete, so reads carry no deletedAt filter` — o comentário **nega** a etiqueta.
- A linha do centerpiece do `AV-R2.json` **continua** dizendo `tx+inquilino+softdelete`. **O defeito continua no disco.** Isso é o que o PR declara, e é verdade.

---

## 4. Minhas próprias mutações contra o B18

Nenhuma destas é a mutação do autor. As quatro do autor (M1 remover a chave, M2 remover `measured`, M3 acrescentar `deletedAt`, M4 apontar para outro repositório) foram deliberadamente **não** repetidas na forma original; onde toquei o mesmo território, mudei o vetor.

**CONTROLE (estado entregue, sem mutação): exit 0.** Reexecutado ao fim de tudo, exit 0 de novo, `git status --porcelain` vazio.

| # | Mutação | `git diff --numstat` | Exit | Mensagem do gate (recorte) | Leitura |
|---|---|---|---|---|---|
| A1 | `measured: null` no registro | `1 1` AV-R2.json | **0** | (nenhuma) | **PASSA — buraco.** `String(null).trim()` = `"null"`, não vazio. E `null` é convenção viva neste repo (`fix_commit: null` no próprio PR). |
| A2 | `measured: "n/a"` | `1 1` | **0** | (nenhuma) | **PASSA — buraco.** Campo presente e vazio de sentido. |
| A3 | `measured: "   "` (espaços) | `1 1` | 1 | `[B18] … sem \`measured\` — registro sem evidência é a etiqueta errada com outro nome` | Morde. O `.trim()` pega só o branco literal. |
| A4 | `measured: []` | `1 1` | 1 | idem A3 | Morde por acidente (`String([])` = `''`). |
| A5 | `measured: {}` | `1 1` | **0** | (nenhuma) | **PASSA — buraco** (`"[object Object]"`). |
| A6 | `measured: false` | `1 1` | **0** | (nenhuma) | **PASSA — buraco.** |
| **I1** | **os SEIS campos de evidência = `"x"`** | `1 12` | **0** | (nenhuma) | **PASSA. Conclusão dura: o `CAMPOS_DO_REGISTRO` é checagem de presença de string não-branca, não de evidência.** A mensagem do próprio gate afirma o contrário. |
| B1 | Caminho Windows **só** na linha do centerpiece (`repositories\ReferentialMappingRepository.ts`) | `1 1` | 1 | 2 erros: linha descoberta (`nenhum model resolvido (ReferentialMapping)` — logo **a barra invertida FOI resolvida**) + `registro pendurado` | Falha fechada. A derivação unidade→model resolve `\`; o **casamento registro↔linha é byte-exato** e não normaliza separador. Fragilidade, não furo. |
| B2 | Caminho Windows na linha **e** no registro | `2 2` | **0** | (nenhuma) | **O B18 resolve caminho em Windows.** Confirmado por B1+B2 juntos. |
| C1 | **Comentário** com a palavra `deletedAt` dentro do `model ReferentialMapping` (`// NAO existe deletedAt neste model`) | `1 0` schema.prisma | 1 | `… TEM lastro (ReferentialMapping tem deletedAt) — registro obsoleto` | **Buraco.** O `/\bdeletedAt\b/` roda sobre o corpo bruto do model e **não distingue campo de comentário**. Um comentário que **nega** o soft-delete faria o gate declarar lastro e exigir a remoção do registro legítimo. Cultura do arquivo confirma o risco: já existem 2 comentários `SEM deletedAt:` no schema (linhas 431 e 462), fora do bloco por sorte. |
| C2 | `deletedAt DateTime?` de verdade no `model ReferentialMapping` | `1 0` | 1 | `… TEM lastro … registro obsoleto sobrevivendo ao próprio motivo; remova-o` | **A terceira perna da alegação (a) é VERDADE** — reexecutada por mim, não herdada. |
| C3 | **Controle mal feito, registrado:** tirei só a linha `deletedAt` do `model Counterparty` | `0 1` | **0** | (nenhuma) | **Meu erro, não do gate:** o `@@index([deletedAt])` do mesmo model ainda casava. Deixado no relatório porque um "verde" aqui teria virado achado falso. |
| **C3b** | **CONTROLE DE DISCRIMINAÇÃO:** tirar `deletedAt` **e** `@@index([deletedAt])` do `model Counterparty` | `0 2` | 1 | `… CounterpartyRepository.ts etiquetada \`softdelete\` e nenhum model resolvido (Counterparty) tem deletedAt` | **A linha do Counterparty É avaliada de verdade.** O verde dela é ganho, não pulado. |
| **J1** | Mesmo controle para `DimensionDefinition` **e** `DimensionValue` | `0 4` | 1 | `… DimensionRepository.ts … nenhum model resolvido (DimensionDefinition, DimensionValue) tem deletedAt` | **A terceira linha também é avaliada.** Prefixo funciona no caso legítimo. |
| **D1** | **PREFIXO QUE CASA DEMAIS:** linha nova `server/src/features/documents/repositories/DocumentRepository.ts` etiquetada `softdelete`, **sem registro** | `7 0` | **0** | (nenhuma) | **FALSO NEGATIVO.** `model Document` **não** tem `deletedAt`; o irmão `DocumentAttachment` tem. O `startsWith(base)` casa o irmão e concede lastro. **O arquivo `DocumentRepository.ts` existe de verdade no repo** — não é caso sintético. |
| **D3** | Idem com `server/src/features/dynamicTables/repositories/DynamicTableRepository.ts` | `7 0` | **0** | (nenhuma) | **Segundo falso negativo real** (`DynamicTable` sem `deletedAt`, `DynamicTableData` com). Também é arquivo existente. |
| **D2** | **CONTROLE de D1/D3:** linha nova `AccountingPeriodRepository.ts` (base sem irmão com `deletedAt`) | `7 0` | 1 | `… nenhum model resolvido (AccountingPeriod, AccountingPeriodTransition) tem deletedAt` | **Verde/vermelho na mesma forma de mutação.** Prova que a causa de D1/D3 é o prefixo, e não "linha nova qualquer passa". |
| E1b | Relatório **sem** `centerpiece` (chave renomeada) | `1 1` | 1 | `registro pendurado` | Falha fechada — mas só porque existe registro. Sem registro, sumir com o centerpiece inteiro não produz erro B18 nenhum. |
| E2b | `centerpiece` **sem** `rows` | `1 1` | 1 | `registro pendurado` | Falha fechada, mesma ressalva. |
| E3 | Registro **sem** a chave `unit` (renomeada p/ `unidade`) | `1 1` | 1 | linha descoberta (1 erro) | Falha fechada. O laço de "pendurado" pula registro sem `unit` em silêncio; o erro vem pelo outro lado. |
| E4 | Registro apontando para `CounterpartyRepository.ts` (linha etiquetada **com** lastro) | `1 1` | 1 | 2 erros: `registro obsoleto` para Counterparty **+** linha do ReferentialMapping descoberta | A perna do obsoleto morde em unidade diferente da de origem. |
| E5 | Etiqueta escrita `soft-delete` (hífen) na linha do ReferentialMapping | `1 1` | 1 | `registro pendurado` | Falha fechada. O casamento é pelo token literal `softdelete`. |
| H2 | **Registro DUPLICADO** para a mesma unidade, o segundo com evidência lixo | `1 1` | **0** | (nenhuma) | **Buraco menor:** `registros.find` devolve o primeiro; o segundo nunca é conferido e não conta como pendurado. |
| **F1** | **ESCAPE:** remover o token `softdelete` da linha do centerpiece **e** apagar o `label_defects_registered` | `1 13` | **0** | (nenhuma) | **A alegação central cai.** Reescrever a medição emitida — a coisa que o dono explicitamente recusou fazer — **sai verde**. O `deletedAt` continua ausente do model; só o rastro sumiu. |
| G1 | Mutação **no próprio gate**: estender o recorte de `*Repository.ts` para `(Repository\|Dto)\.ts` | `2 2` bancada-gate.mjs | **0** | (nenhuma) | **O limite de `dto` não esconde reprovação nenhuma hoje** (`DocumentAttachment` tem `deletedAt`). Mas prova que o mapeamento DTO→model **é mecânico e resolve** — a justificativa escrita do limite é falsa mesmo sendo o limite inofensivo. |

Toda linha acima terminou com `restaurado_limpo: true` (numstat vazio após restaurar do `.bak`). Estado final do worktree conferido em §9.

---

## 5. Alegações que caíram

**(a) — cai em uma perna de três, e é a perna que mais importa.**
A frase completa do `TRIAGEM-AV-R7.json` é: *"um gate que reprova se a contradição sumir sem o defeito sumir junto"*. **F1 falsifica isso literalmente**: apagar `softdelete` da linha + apagar o registro = a contradição sumiu, o defeito (`model ReferentialMapping` sem `deletedAt`) **não** sumiu, e o gate sai **exit 0**. O B18 barra a **isenção obsoleta** (C2 confirma) e barra **etiqueta nova sem lastro** (D2 confirma), mas **não protege a decisão que o PR diz ter tomado** — "registrar em vez de reescrever" continua sem barreira. Quem quiser reescrever a linha amanhã passa verde.

**A promessa de "evidência" cai inteira.** I1 (seis campos = `"x"`, exit 0), A1, A2, A5 e A6. A mensagem `registro sem evidência é a etiqueta errada com outro nome` descreve uma checagem que o código não faz. Isto é a lente do pedido virada contra o próprio artefato: **este pedaço do B18 mede o texto, não o app** — ele confere que existem seis strings, não que elas dizem alguma coisa.

**(c) — a justificativa do limite cai; o limite em si sobrevive.**
O código diz *"não há mapeamento mecânico de um DTO ou de um job para um model"*. Para **job** isso é verdade (`PurgeDeletedRecords.ts`). Para **DTO é falso**, e G1 mede: trocar o recorte para `(Repository|Dto)\.ts` resolve `DocumentAttachmentDto` → `DocumentAttachment` pela **mesmíssima** regra de prefixo e o gate segue verde. Ou seja, o limite não é conveniente (não esconde reprovação alguma — isso é o que a alegação (c) afirma no essencial, e sobrevive), **mas a razão escrita para ele não resiste**. Custo do erro: baixo hoje, alto no dia em que um `*Dto.ts` etiquetado apontar para model sem `deletedAt`.

**A "resolução por prefixo" é apresentada como propriedade medida e é, na verdade, um empate não resolvido.** O `barrier` do `AV-R2.json` e o `status_evidence` do rank 2 citam o `DimensionRepository` como *prova* de que o prefixo é necessário. É necessário, sim — mas o texto nunca menciona que o mesmo prefixo **concede lastro por irmão errado**. D1 e D3 mostram dois casos reais e existentes no repositório em que isso já falha hoje.

---

## 6. Alegações que sobreviveram

1. **B18 é checagem que REPROVA, não aviso.** Todas as 6 chamadas passam por `err()`, entram em `erros` e caem no `process.exit(1)`. Medido em 13 mutações distintas com exit 1.
2. **A numeração B18 não colide.** `grep -o "err('B[0-9]*'" | sort -u | wc -l` = **17**, e o cabeçalho declara exatamente 17 (B1–B9, B11–B18). Todas as ocorrências de `B18` estão no bloco novo. (Nota lateral, **pré-existente e não deste PR**: `B10` existe como `warn` e não aparece na lista `O QUE GARANTE` do cabeçalho.)
3. **A perna "o registro morre sozinho quando o `deletedAt` aparece" é verdadeira** — C2, executada por mim, com a mensagem certa.
4. **É discriminante entre as linhas que ele avalia, e a discriminação é ganha, não pulada.** C3b e J1 provam que `Counterparty` e `Dimension` passam por mérito: retirar o `deletedAt` dos models correspondentes faz cada uma reprovar, individualmente e com a mensagem certa. Um recorte quebrado teria reprovado as três juntas ou nenhuma. Alegação **(b) sobrevive** — com a correção de contagem do §8.
5. **O B18 resolve caminho em Windows** na derivação unidade→model (B1 + B2).
6. **O achado de origem é real.** Verificado por leitura direta do schema e do repositório, não pelo texto do autor.
7. **O gate roda no CI** (`ci.yml:209`), então a barreira tem consequência de merge.

---

## 7. Julgamento sobre `registrado_e_barrado` vs `corrigido_e_barrado`

**A escolha da palavra é honesta. O fechamento do item é que é discutível — e por um motivo diferente do que o PR antecipa.**

O que é honesto, e merece ser dito sem desconto: o `status_evidence` do rank 2 **não arredonda**. A chave `the_finding_is_registered_not_corrected` diz, com todas as letras, que a linha continua errada e que quem ler a peça central sozinha ainda lê a etiqueta errada. Escrever `corrigido_e_barrado` ali seria mentira, e a sequência não a escreveu. Isso é o oposto de fechar item empurrando sujeira para debaixo do tapete, e o próprio branch tem o rastro: o commit `7374aabf` declarou *"o r2 da AV-R7 NAO fecha — reverificado, e continua ABERTO"* e só depois `de6f6deb` o fechou como registrado. A mudança de posição está no histórico, não escondida.

**Existe barreira de verdade?** Sim, parcial, e eu a medi: o B18 impede que uma **nova** etiqueta `softdelete` sem lastro entre num centerpiece de repositório sem registro (D2), e impede que o registro sobreviva ao próprio motivo (C2). Isso não é "um registro que declara que existe uma barreira" — a barreira morde.

**Mas o fechamento tem três problemas que um revisor tem de nomear:**

1. **A barreira não cobre a decisão que justifica o status.** O status é `registrado_e_barrado` porque *registrar* foi escolhido no lugar de *corrigir*. F1 mostra que **a escolha de não reescrever não está barrada**: reescrever a linha e apagar o registro sai verde. O que está barrado é o vizinho do problema, não o problema.
2. **`status` não é lido por gate nenhum.** `grep` por `status` em `bancada-gate.mjs` devolve **zero**. `verification` tem o B13 e `gate` tem o B14, ambos com lista fechada; o vocabulário de `status` — já em quatro valores por admissão do próprio texto — não tem checagem nem lista. É **exatamente a classe** que os B11–B16 existem para fechar ("o único artefato sem nenhuma checagem"). O PR adiciona um campo de vocabulário crescente à triagem sem o gate correspondente.
3. **O item ficou internamente contraditório e nada pega isso.** O mesmo item rank 2 carrega `status: registrado_e_barrado` **e** `gate: bloqueia_primeiro_cliente` **e** `due: 2026-08-12` em aberto — e o `barrier_note` continua dizendo **"PROPOSTA, nao existente"** para a barreira que o próprio PR acabou de construir. (Os ranks 3 e 4 têm a mesma staleness: `barrier_note: "PROPOSTA…"` ao lado de `status: corrigido_e_barrado`.) Um item pode legitimamente ser "fechado quanto ao registro" e "aberto quanto ao conserto", mas então **o campo que diz isso não pode ser o único não gateado do arquivo**.

**Veredito da seção:** não é fechar item sem consertar por desonestidade — é fechar item com um nome novo que **nenhuma checagem valida**, apoiando-se numa barreira que cobre a classe vizinha. Eu manteria o item **aberto** com o registro e o B18 como mitigação declarada, ou aceitaria `registrado_e_barrado` **junto com** o B-check que fecha o vocabulário de `status` e o F1.

**Um ponto que eu não consigo verificar e que sustenta a decisão inteira:** o `decision_by_owner` afirma uma instrução literal do dono em 2026-08-07 (*"registra a fraqueza ao lado, como fizeram nos #168/#169"*). Isso é **inverificável a partir do repositório** — não há artefato no diff que a comprove. Toda a diferença entre `registrado_e_barrado` e "o autor não quis corrigir" repousa nessa frase. Registro como **assumido**, não verificado.

---

## 8. Achados novos (não corrigidos — proibido corrigir)

Cada um com falsificador de uma linha. Nenhum foi consertado por mim.

**N1 — Os seis campos de evidência do `label_defects_registered` são checados por presença, não por conteúdo.**
`"x"`, `"n/a"`, `null`, `{}` e `false` passam; só string em branco e `[]` reprovam.
*Falsificador:* trocar os seis campos do registro do `AV-R2.json` por `"x"` e rodar `node scripts/bancada-gate.mjs` — se sair **exit 0**, o achado reproduz. (Reproduziu.)

**N2 — Resolução por prefixo concede lastro por model irmão, produzindo falso negativo em dois repositórios reais.**
`DocumentRepository.ts` → `Document` (sem `deletedAt`) casa `DocumentAttachment` (com). Idem `DynamicTableRepository.ts` → `DynamicTableData`.
*Falsificador:* inserir no `centerpiece.rows` do `AV-R2.json` a linha `["server/src/features/documents/repositories/DocumentRepository.ts","repository",1,"tx+inquilino+softdelete",99]` e rodar o gate — **exit 0** reproduz (controle: a mesma linha com `AccountingPeriodRepository.ts` sai exit 1).

**N3 — `/\bdeletedAt\b/` roda sobre o corpo bruto do model e não distingue campo de comentário.**
Um comentário que **nega** o soft-delete concede lastro e faz o gate exigir a remoção do registro correto.
*Falsificador:* inserir `// NAO existe deletedAt neste model` como primeira linha do `model ReferentialMapping` e rodar o gate — se ele reprovar com `registro obsoleto`, o achado reproduz. (Reproduziu.)

**N4 — Reescrever a linha do centerpiece + remover o registro escapa do B18 (exit 0).**
Falsifica a frase do `TRIAGEM-AV-R7.json` sobre "a contradição sumir sem o defeito sumir junto".
*Falsificador:* apagar `+softdelete` da linha do `ReferentialMappingRepository.ts` e apagar a chave `label_defects_registered` inteira — se o gate sair **exit 0**, reproduz.

**N5 — O vocabulário de `status` da triagem não tem lista fechada nem checagem.**
`grep -n "status" scripts/bancada-gate.mjs` = zero, enquanto `verification` (B13) e `gate` (B14) têm lista fechada. Terceiro e quarto valores nasceram sem gate.
*Falsificador:* trocar `"status": "registrado_e_barrado"` por `"status": "banana"` no `TRIAGEM-AV-R7.json` e rodar o gate — **exit 0** reproduz.

**N6 — `barrier_note` do rank 2 ficou falso dentro do próprio PR.**
Diz `"PROPOSTA, nao existente"` e cita `grep -rn "invariantes\|fanin" scripts/*.mjs` devolvendo ZERO, enquanto o mesmo commit cria o B18 que lê a coluna `invariantes`. Ranks 3 e 4 têm a mesma staleness.
*Falsificador:* `grep -c "invariantes" scripts/bancada-gate.mjs` em `fe27cc22` — se devolver **> 0**, o `barrier_note` está desatualizado. (Devolve > 0.)

**N7 — A linha do `REVIEW-LEDGER.jsonl` do PR #173 declara `commit: a9d87260`, que é 4 commits ANTES do head.**
`a9d87260` é a armadilha 14 do CONTINUACAO; o B18 (`e4ea83a0`) e o fechamento do r2 (`de6f6deb`) vieram **depois**. O `review-ledger-check.mjs` só valida a **forma** do sha (`/^[0-9a-f]{7,40}$/`, linha 90), nunca se ele existe nem se cobre o diff. O veredito `sem_revisao_independente` está declarado sobre um recorte menor que o PR.
*Falsificador:* `git log --oneline a9d87260..fe27cc22` — se listar commits, a declaração não cobre o diff. (Lista 4.)

**N8 — Registro duplicado para a mesma unidade é invisível.**
`registros.find` devolve o primeiro; o segundo nunca é conferido e não conta como pendurado.
*Falsificador:* duplicar a entrada de `label_defects_registered` com os campos preenchidos com lixo e rodar o gate — **exit 0** reproduz.

**N9 — O casamento registro↔linha é byte-exato e não normaliza separador de caminho.**
Falha **fechada** (dois erros), então é fragilidade e não furo — mas produz mensagem confusa se alguém colar um caminho de Windows só num dos dois lados.
*Falsificador:* trocar `repositories/ReferentialMappingRepository.ts` por `repositories\ReferentialMappingRepository.ts` **só** na linha do centerpiece — se sair 2 erros B18 em vez de 0, reproduz.

---

## 9. O que ficou FORA

- **Gate rodado em checkout Windows não é evidência sobre o CI.** Confirmei que `core.autocrlf=true` neste worktree: `AV-R2.json`, `schema.prisma` e `bancada.html` são **todos CRLF** aqui e LF no repositório. O gate normaliza CRLF **só** para `bancada.html`; para os JSON e para o `schema.prisma` ele depende de `JSON.parse` (indiferente) e das regexes `^model…^\}` / `\bdeletedAt\b` (que eu verifiquei funcionarem sob CRLF, empiricamente, nesta máquina). **Não tenho run id verde do CI no sha `fe27cc22`** ao lado — não consultei o provedor. Todo "exit 0" deste relatório é sobre **esta** máquina.
- **Não reexecutei a mordida por mutação do PR #171** (os testes de integração dos três repositórios). O próprio registro do rank 4 declara que ela foi **aceita como declarada**, e eu deixo essa declaração como está: não verificada por mim, não desmentida por mim.
- **Não rodei `npm ci`, `tsc`, jest nem a suíte de integração.** Nenhum arquivo de produção mudou no diff, mas o `schema.prisma` foi mutado e restaurado por mim; conferi a restauração por numstat vazio, não por regeneração do client Prisma.
- **Não abri `bancada.html` em navegador** — B17 (banner) não foi atacado, está fora do escopo pedido.
- **Não verifiquei a instrução do dono** citada em `decision_by_owner` (ver §7). Inverificável a partir do repositório.
- **Não ataquei o r1 nem o r5 da AV-R7**, que seguem sem status, nem revalidei os fechamentos r3/r4 além de ler os registros.
- **Não medi o custo do falso negativo N2 no mundo real** — se algum outro artefato de auditoria já contém linha `*Repository.ts` etiquetada `softdelete` com prefixo enganoso, eu não varri os 8 relatórios em busca disso. Só o `AV-R2.json` tem linhas etiquetadas hoje.

---

## 10. Meus próprios vieses, nomeados

1. **Viés de encontrar furo.** Fui instruído a refutar, e um revisor instruído a refutar acha o que procura. Contrapeso que apliquei: **todo caso negativo tem controle legítimo verde no mesmo harness** (D2 contra D1/D3; C3b/J1 contra a acusação de que o gate não discrimina; o CONTROLE de exit 0 do estado entregue, rodado antes e depois). Onde o controle mostrou que eu errei, registrei — a linha **C3** é meu erro de medição, não do gate, e ficou na tabela.
2. **Viés de severidade por facilidade de medir.** N1 e N2 são fáceis de demonstrar em uma linha, então pesaram muito no veredito. O impacto real deles depende de alguém escrever um registro com `"x"` ou uma linha `DocumentRepository.ts` — nenhum dos dois aconteceu. **Nomeio que a ressalva é sobre a força da barreira, não sobre dano em produção.** O código de produção deste PR é zero linhas.
3. **Viés de "gate perfeito".** Cobrei do B18 uma promessa que o texto dele faz (`evidência`, `a contradição sumir sem o defeito sumir junto`). Um revisor mais generoso diria que o B18 é a primeira checagem do repositório a ler a coluna `invariantes` de um centerpiece e que isso, sozinho, é ganho líquido. **Concordo com esse ponto** — o veredito é `com_ressalva` e não `reprovado` por causa dele.
4. **Viés de leitor de texto denso.** O `TRIAGEM-AV-R7.json` e o `AV-R2.json` são prosa longa e muito bem escrita, e prosa bem escrita **convence antes de ser verificada**. Tentei neutralizar isso indo ao `schema.prisma`, ao `ReferentialMappingRepository.ts` e ao `git log` antes de aceitar qualquer frase — e foi assim que N6 e N7 apareceram, que são contradições internas que a leitura corrida não pega.
5. **Não sei ler a decisão do dono.** Julguei `registrado_e_barrado` como escolha de engenharia. Se a instrução do dono foi literalmente a que o arquivo cita, minha ressalva do §7 recai sobre **o gate ausente para o campo `status`**, não sobre a decisão dele — e eu posso estar carregando a decisão com um peso que ela não deveria ter.

---

**Estado do worktree ao fim:** `git status --porcelain` em `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rv-173` retorna **vazio**; `git rev-parse HEAD` = `fe27cc22529f1f39304ac665ec48bac0ea5927cb`; `node scripts/bancada-gate.mjs` = **exit 0**; `node scripts/review-ledger-check.mjs` = **exit 0**. Nenhum `.bak` remanescente. Nenhum commit, `git add`, push ou merge.

---

## Adendo do orquestrador — o falso negativo do prefixo, conferido no schema

**Autor:** claude-opus-5, sessão orquestradora (2026-08-07) — terceira medição.

A alegação mais cara desta revisão é a de que a resolução unidade→model do B18 casa por prefixo e
concede lastro ao model errado. Conferi a premissa direto no `server/prisma/schema.prisma`, sem passar
pelo gate, para que a conclusão não dependa do mesmo código que está sob exame:

| Model | tem `deletedAt`? |
|---|---|
| `Document` | **NÃO** |
| `DocumentAttachment` | SIM |
| `DynamicTable` | **NÃO** |
| `Counterparty` | SIM (controle — é a linha que o B18 de fato reprova) |

Confirma o achado: uma unidade `DocumentRepository.ts` etiquetada `softdelete` encontra
`DocumentAttachment` pelo prefixo e passa, embora `Document` — o model que a unidade de fato governa —
não tenha o campo. O controle mostra que o gate não é regex morto: com `Counterparty` ele reprova.

Não corrigido — achado não triado.
