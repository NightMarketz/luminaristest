# Leitura da fila — 2026-08-28 (pós-merge do #228 e apagamento da `claude/nfe-fase-b`)

> **O que este documento é:** uma **leitura** da fila §5.1 do [ACCOUNTING-MASTER-MAP](ACCOUNTING-MASTER-MAP.md)
> depois do merge do PR #228 e do apagamento da `claude/nfe-fase-b`. Enumera e **formula forks**.
>
> **O que este documento NÃO é:** não abre frente nova (ORCH-006 — frente nova nasce de ADR + sinal
> humano), não ratifica nada, não implementa nada, não propõe aparato de auditoria novo (regra
> permanente do `CLAUDE.md`: 4 de 4 itens do Bloco A travados em oráculo externo há mais de 14 dias).
> **Nenhum fork abaixo se auto-ratifica.** Saíram todos com **RATIFICAÇÃO PENDENTE**.
> **Atualização no mesmo dia:** o dono ratificou o **F-Q5 → (b)** e a ação foi executada (§5.4).
> **F-Q1 a F-Q4 seguem PENDENTES.** A ratificação veio do dono, não deste documento.
>
> **Insumos lidos (e só estes, por moratória):** `ACCOUNTING-MASTER-MAP.md` §5.1 + Bloco A ·
> `ADR-P2-second-vertical.md` · `BE-INCR-NFE-destino-brief.md` §11 · `BE-INCR-PROVENANCE-ATTACH-brief.md` §11.
> Medidas de git e leituras de código pontuais estão marcadas como *verificado* com o comando que as produziu.

---

## 1. O que o merge do #228 mudou na fila

**O NFE-X saiu do Bloco A** — marcado ✅ CUMPRIDO 2026-08-28 no fold desta sessão
([ACCOUNTING-MASTER-MAP.md:491](ACCOUNTING-MASTER-MAP.md)).

### 1.1 Quem dependia dele — checado, não presumido

Medida: `grep -rln "NFE-X\|PROVENANCE-ATTACH\|attachSourceDocument" docs/`. Sete arquivos citam o item, e
**todos os sete são da família NF-e ou o próprio mapa**:

| Arquivo | Natureza da dependência |
|---|---|
| `ACCOUNTING-MASTER-MAP.md` | a própria fila (itens NFE-X e 11) |
| `BE-INCR-NFE-destino-brief.md` | o BRIEF que ratificou a sequência (1)→(2)→(3) |
| `BE-INCR-NFE-fase-b-spec.md` | **dependência real, e ficou desatualizada** — ver §1.2 |
| `BE-INCR-NFE-impl-plan.md`, `BE-INCR-NFE-integration-plan.md` | planos da NF-e |
| `BE-INCR-PROVENANCE-ATTACH-brief.md` | o BRIEF do próprio NFE-X |
| `ADR-INCR-NFE-fiscal-ingestion.md` | ADR da NF-e |

**Conclusão (verificado): o único item de fila que dependia do NFE-X é o item 11 (NF-e).** Nenhum item
do Bloco A e nenhum item do Bloco B fora da NF-e o cita. O P2 (clínica estética) **não** depende dele.

### 1.2 A dependência que sobrou é documental, e é uma dívida de uma linha

A [spec de reconstrução §8](BE-INCR-NFE-fase-b-spec.md) descreve `PostingService.attachSourceDocument`
como *"seam que **não existe em `main`**"*. **Isso deixou de ser verdade com o #228.** A spec passou a
descrever como *delta a reconstruir* algo que hoje é *insumo existente*. Registrei a consequência no item
11 do mapa; a **correção do texto da spec** é fork abaixo (F-Q4).

### 1.3 O que o #228 mudou no piso do openapi

O BRIEF mandava `BASELINE` de **141 → 143**; o certo é **142**. POST e GET compartilham o path
`/api/accounting/journal-entries/{entryId}/source-documents` ⇒ **+1 path, +2 operações**. Medido em
`server/public/openapi.json` de `main`: **142 paths / 169 operações** (era 141/167). A correção **está no
código** (`const BASELINE = 142`, [openapi-paths.test.ts:42](../../server/src/__tests__/openapi-paths.test.ts:42)).

⚠️ **O guard é `toBeGreaterThanOrEqual`** — teria passado **verde** com o número errado. Subir o piso foi
ato deliberado, não consequência de teste vermelho. É a mesma classe do `gate-liveness-probe`: um piso que
só sobe por disciplina humana não prova nada por estar verde.

---

## 2. O que está realmente desbloqueado hoje

### (a) Itens que um agente pode executar agora

**Nenhum item de fila.** Medida: o Bloco A, depois deste fold, é —

| # | Item | Estado |
|---|---|---|
| 0, RN | FEEDER, RENAME | ✅ mergeados |
| **P2** | vertical clínica | ⛔ **bloqueado por gate humano** (ADR §5 item 2 insatisfeita) |
| 1, 2 | FE-AP, fold de higiene | ✅ feitos |
| **3, 4, 5, 6** | PVA · browser sign-off · 1º deploy · arquivo RFB | 🔴 **gate humano / dado externo** |
| **NFE-X** | proveniência | ✅ **cumprido hoje** |

O NFE-X era, desde o merge do FEEDER e do RENAME, **o último item de código executável do Bloco A**. Com
ele fechado, o Bloco A voltou a ser **4 de 4 travados em oráculo externo** — exatamente a condição que a
regra permanente do `CLAUDE.md` descreve. **Isto não é um vazio a preencher com trabalho novo; é o
gargalo declarado do projeto.**

O que sobra para agente são **dívidas declaradas**, não itens de fila — os forks F-Q2..F-Q4 abaixo.

### (b) Itens travados em gate HUMANO ou DADO EXTERNO — 4 de 4

**Agente não substitui oráculo.** Para estes o artefato é runbook em branco no formato do
[RUNBOOK-FORMAT.md](../operating-manual/RUNBOOK-FORMAT.md). **Verifiquei se havia runbook a preparar:**

| Item | Depende de quem | O que falta | Runbook | Estado do runbook |
|---|---|---|---|---|
| **3** — sign-off PVA (ECD/Apuração/ECF) | **dono/contador** — importar no validador oficial da RFB | a execução: importar, colar a evidência, marcar desfecho, assinar | [RUNBOOK-H1-PVA.md](RUNBOOK-H1-PVA.md) (180 linhas) | ✅ **já preparado, EM BRANCO** |
| **4** — sign-offs de browser | **dono** — olho humano no app real | idem; inclui o resíduo que agente não alcança: **upload por clique** (OFX/CNAB) e recibos PDF | [RUNBOOK-H2-BROWSER-SIGNOFF.md](RUNBOOK-H2-BROWSER-SIGNOFF.md) (168 linhas, passos 6–11 do pós-swap já incluídos) | ✅ **já preparado, EM BRANCO** |
| **5** — 1º deploy real | **dono** — provisionar a VPS (alvo já decidido, ADR-M2) | provisionamento + execução do smoke | [RUNBOOK-M2-DEPLOY-SMOKE.md](RUNBOOK-M2-DEPLOY-SMOKE.md) (116 linhas) | ✅ **já preparado, EM BRANCO** |
| **6** — arquivo oficial RFB "PJ em Geral" | **contador / terceiro** — o arquivo em si | o dado externo chegar; o conversor `rfb-referential-to-catalog.mjs` já está pronto | [RUNBOOK-X2-RFB-REFERENCIAL.md](RUNBOOK-X2-RFB-REFERENCIAL.md) (71 linhas) | ✅ **já preparado, EM BRANCO** |

**Achado desta leitura:** *não há runbook para eu preparar.* Os quatro já existem, e um quinto
([RUNBOOK-H3-P2-CLINICA.md](RUNBOOK-H3-P2-CLINICA.md), 178 linhas) já está pronto para o vertical 2 que
sequer começou. Verificado: nenhum dos cinco tem desfecho marcado nem assinatura.

> **Consequência que vale dizer em voz alta:** a fila não está esperando um artefato de agente. Preparar
> mais runbook seria produzir o artefato que já existe — a versão documental de "mais um revisor".
> **O que falta nos quatro é execução humana**, e nenhum agente a produz.

### (c) A NF-e (item 11, passo 3) — travada, e não finjo que anda

- **Passo 1 (extrair o seam):** ✅ FEITO hoje (#228).
- **Passo 2 (apagar a branch):** ✅ EXECUTADO nesta sessão.
- **Passo 3 (reconstruir pela spec §8):** 🔴 **TRAVADO no XML real anonimizado.** Nada neste fold mexeu
  nesse gate. O runbook de anonimização já existe em
  [BE-INCR-NFE-fixtures-README.md](BE-INCR-NFE-fixtures-README.md); depende de **dado externo**, não de agente.
  A `nfe-fixture-provenance.test.ts` falha de propósito enquanto o fixture for sintético.

**Os passos 1 e 2 não aproximaram o passo 3 em um dia.** Eles reduziram superfície pendente (um seam a
menos para reconstruir, uma branch podre a menos), o que é ganho real — mas o gate é o mesmo.

---

## 3. Fork F-Q1 — promoção do ADR-P2 a `Accepted`

**Fato (verificado em disco):** [ADR-P2-second-vertical.md:3](../adr/ADR-P2-second-vertical.md) declara
`Status: Draft — 8/8 FORKS RATIFICADOS (2026-08-25); promoção a Accepted PENDENTE`. As pré-condições §5:

| # | Pré-condição | Estado |
|---|---|---|
| 1 | ADR-P1 Accepted + implementado + golden verde | ✅ (PR #211) |
| 2 | **Vertical 1 validado — PVA verde + sign-offs** | ⛔ **INSATISFEITA** (itens 3 e 4 do Bloco A) |
| 3 | F-P2-1 ratificado | ✅ |
| 4 | Rename `salon.*`→`sale.*` fechado | ✅ (PR #222, 2026-08-25) |

O §6 do ADR é explícito: *"A promoção deste ADR a Accepted agora depende só do item 2"*, e *"Alternativa
conhecida: revogar a pré-condição por ratificação explícita, como já foi feito no ADR-P1 §9. **NÃO feito
por padrão.**"*

**Isto é uma decisão do dono parada — não um item de trabalho.** Ratificar fork ≠ autorizar execução (ORCH-006).

### Fork formulado

> **F-Q1 — o ADR-P2 é promovido a `Accepted` agora, ou espera o gate humano?**
>
> - **(a) Esperar os itens 3 e 4** — promoção acontece quando PVA + browser sign-off fecharem. Mantém a
>   pré-condição como escrita. Custo: o P2 fica parado exatamente o tempo que o gargalo humano durar.
> - **(b) Promover agora revogando a §5 item 2 por ratificação explícita** — o precedente existe
>   (ADR-P1 §9 fez isso). Destrava a *execução* do P2 sem esperar o oráculo. Custo: o vertical 2 seria
>   construído sobre um vertical 1 **não validado por humano** — se o PVA reprovar a ECD depois, o erro
>   se propaga para dois verticais em vez de um, e o F-P2-3(b) já acrescenta **uma segunda rodada de PVA**
>   (a da ECD do vertical 2) ao custo.
> - **(c) Promover a `Accepted` mas manter execução bloqueada** — separa "o desenho está decidido" de "pode
>   codar". Custo: `Accepted` passa a significar duas coisas diferentes no repo, e a próxima leitura da fila
>   não sabe qual.

**Recomendação: (a) esperar.** O argumento de (b) é velocidade, e a velocidade não está no gargalo — o
Bloco A tem **4 de 4** itens em oráculo externo, então destravar o P2 apenas cria uma quinta frente
enquanto quatro esperam. O precedente do ADR-P1 §9 revogou uma pré-condição para **desbloquear o próprio
oráculo**; aqui a revogação **adia** um oráculo (a 2ª rodada de PVA) em vez de antecipá-lo. Contra-argumento
honesto que enfraquece minha recomendação: se o gate humano durar meses, (a) custa meses de parada real, e
o P2 é a prova da tese do produto (a prensa de binding).

**RATIFICAÇÃO PENDENTE — decisão do dono.**

---

## 4. Forks F-Q2 e F-Q3 — dois achados de ambiente do NFE-X, em PR nenhum

Os dois apareceram **na execução** do NFE-X e não entraram em PR. São **dívida de ambiente de teste**, não
aparato de auditoria: não são gate, não são rodada, não são mais um revisor. Nomeio a distinção de propósito,
porque a regra permanente do `CLAUDE.md` proíbe a segunda coisa e não a primeira.

### F-Q2 — cliente Prisma gerado fica stale entre worktrees

**Sintoma observado:** o cliente gerado carregava **53 referências à coluna `inventoryMultiItem`**, que
**não existe no schema de `main`** — resíduo de uma geração feita em worktree da NF-e. Derrubou **27 testes
em 4 suítes** até `npx prisma generate`.

**Verificado nesta leitura:** `git grep -c inventoryMultiItem origin/main -- server/prisma/schema.prisma`
volta **0 ocorrências** — a coluna de fato não existe em `main`; e o cliente **deste** worktree, já
regenerado, também mostra 0. O sintoma é reprodutível por construção, não um acidente único.

**Por que dói:** o custo é pequeno e recorrente, mas **o sintoma não aponta a causa** — o erro é de
tipo/coluna inexistente numa suíte que ninguém tocou, e o caminho até "o cliente está velho" é adivinhação.
Já existe memória vizinha (`worktree-deps-stale-prisma-client`: worktree novo não tem `node_modules` nem
`.env`), mas ela cobre *ausência*, não *staleness cruzada*.

> **F-Q2 — vira item de fila ou dívida declarada?**
>
> - **(a) Dívida declarada** — registrar o sintoma→causa onde o próximo agente tropeça (memória do projeto
>   + uma linha no `server/CLAUDE.md`), sem código. Custo ~zero; não impede a próxima ocorrência, só encurta
>   o diagnóstico de minutos para segundos.
> - **(b) Item de fila** — fazer o setup de worktree rodar `prisma generate` (ou um `predev`/`pretest` que
>   compare o hash do `schema.prisma` com o do cliente gerado e regenere se divergir). Custo: mexer em script
>   de ambiente que roda em toda suíte; risco de deixar o teste mais lento e de quebrar CI por um caminho novo.
>
> **Recomendação: (a) dívida declarada.** A frequência é "toda vez que se troca de worktree com schema
> diferente", que é raro fora de um fork como o da NF-e — e esse fork acabou de ser apagado. O custo de (b)
> é um gancho que roda **sempre** para um problema que aparece **às vezes**; a assimetria não fecha.
> Reavaliar se reaparecer depois do apagamento da fase-b.

**RATIFICAÇÃO PENDENTE.**

### F-Q3 — `resetDb()` não limpa nenhuma tabela de contabilidade

**Verificado em disco** ([server/test/helpers/db.ts:31](../../server/test/helpers/db.ts:31)): `resetDb()`
apaga **11 tabelas** — `dynamicTableData`, `dynamicTable`, `dashboardLayout`, `chatMessage`, `chatInstance`,
`structuredData`, `chunk`, `document`, `actionProposal`, `knowledgeGraph`, `user`. **Zero de contabilidade.**

O `schema.prisma` tem **44 modelos**; **29 são de contabilidade** e nenhum é limpo — `JournalEntry`,
`Posting`, `Account`, `Payable`, `Receivable`, `SourceDocument`, `JournalEntrySource`, `AuditEvent`,
**`AuditChainHead`**, `AccountingPeriod`, `Counterparty`, `DimensionDefinition`, `StockMovement`,
`AccountingBinding`, entre outros. O comentário do helper diz *"Deletes every row"* — **afirma o que não faz**,
mesma classe do `comentario-de-teste-afirma-o-que-nao-assere`.

**O `AuditChainHead` explica o sintoma exato observado:** a cabeça da cadeia de hash **persiste entre casos**,
então um arquivo de 6 casos chega em **seq 7**. Não é coincidência — é o mecanismo.

**Por que dói:** quem escrever teste de integração de contabilidade **vaza estado entre casos sem perceber**.
O modo de falha é o pior: o teste passa por ordem de execução e quebra quando alguém insere um caso no meio,
ou passa vacuosamente porque a tabela já tinha a linha que ele ia criar (parente da lição
`smoke-gate-s6-x-migracao-de-dado`: gate que passa por vacuidade).

> **F-Q3 — vira item de fila ou dívida declarada?**
>
> - **(a) Item de fila** — estender `resetDb()` às 29 tabelas de contabilidade, filhas antes de pais,
>   com um teste-guarda que falhe se um modelo novo do schema não estiver na lista. Custo: um diff num helper
>   compartilhado; **blast radius real** — toda suíte de integração passa a limpar mais, e uma suíte que hoje
>   depende (sem saber) do estado vazado pode ficar vermelha. Isso é *achado*, não regressão, mas custa a sessão.
> - **(b) Dívida declarada** — registrar o limite no comentário do helper (que hoje **mente**) e na memória,
>   deixando cada suíte se virar. Custo: o próximo teste de contabilidade de integração nasce com a mesma armadilha.
>
> **Recomendação: (a) item de fila, com escopo apertado.** O argumento é o modo de falha, não a elegância:
> (b) deixa de pé um helper cujo comentário **afirma o oposto do comportamento**, e o projeto já tem lição
> registrada sobre exatamente isso. O teste-guarda contra o schema é o que impede a lista de envelhecer de novo
> — e é *um teste sobre o helper de teste*, não um gate de processo novo.
>
> **Fronteira que reconheço:** um teste-guarda que lê o `schema.prisma` para exigir cobertura chega perto de
> "aparato". Fica do lado permitido porque **não** cria gate de CI novo, **não** cria rodada e **não** cria
> revisor — é uma asserção dentro da suíte que já roda. Se ao ratificar isso parecer aparato, **corte o
> teste-guarda e fique só com a lista** — o valor principal está na lista.

**RATIFICAÇÃO PENDENTE.**

### F-Q4 — a spec da NF-e descreve como ausente um seam que agora existe

Consequência direta do §1.2. A [spec §8](BE-INCR-NFE-fase-b-spec.md) chama `attachSourceDocument` de
*"seam que não existe em `main`"*. Registrei a desatualização no item 11 do mapa, mas **não editei a spec** —
ela é o insumo do passo 3, e mexer nela sem autorização é replanejar item de outra sessão.

> **F-Q4 — quem corrige a spec?**
>
> - **(a) Corrigir agora** (edição de 1 parágrafo: o seam vira insumo existente, sai do delta a reconstruir).
> - **(b) Corrigir quando o passo 3 abrir**, junto do resto da atualização que o XML real vai exigir.
>
> **Recomendação: (a).** A spec fica parada até o XML chegar — que pode ser meses — e nesse intervalo ela
> diz a um leitor futuro para reconstruir algo que já está em `main`. É o erro mais barato de corrigir hoje
> e o mais caro de descobrir tarde. Contra-argumento: (b) concentra a atualização num momento só, e a nota
> do item 11 do mapa já protege o leitor que passar pela fila. **Não corrigi por conta própria.**

**RATIFICAÇÃO PENDENTE.**

---

## 5. As 4 branches `nfe` não examinadas — medidas, não impressões

**Nenhuma foi apagada.** O destino delas é fork para o dono. Medidas de `git`, com o comando ao lado.

### 5.1 Achado que muda o risco: as quatro são LOCAIS, sem contraparte em `origin`

`git for-each-ref | grep -i nfe` — existem `refs/heads/` para as quatro e **nenhum `refs/remotes/origin/`**
correspondente. **Consequência:** apagá-las **não** é reversível da forma que o apagamento da `nfe-fase-b`
foi. A `fase-b` tinha tag em `origin`; estas **não têm nada em lugar nenhum além deste disco**.

### 5.2 Ancestralidade — três das quatro estão contidas na quarta

`git merge-base --is-ancestor`:

| Branch | HEAD | Ancestral de `claude/nfe-fase-a`? | Commits à frente de `main` |
|---|---|---|---|
| `claude/nfe-a2-import` | `91f6699d` | **SIM** | 3 |
| `claude/nfe-a3-sale` | `fd978cfe` | **SIM** | 3 |
| `review-nfe` | `000f5fc4` | **SIM** | 7 |
| `claude/nfe-fase-a` | `68df00f4` | — (é a ponta) | 9 |

As quatro estão **288 commits atrás** de `origin/main`; o commit mais novo entre elas é de **2026-07-24**.

**`claude/nfe-fase-a` contém as outras três por construção.** Apagar `a2-import`, `a3-sale` e `review-nfe`
não perde **um byte** que a `fase-a` não tenha. O que se perde é a **narrativa intermediária** (fatias A2 / A3 /
wiring B separadas), não conteúdo.

### 5.3 E a `fase-a` — carrega algo não resgatado?

Comparada à tag `nfe-fase-b-preserved` (que está em `origin` e é o que preserva a reimplementação):

- **Arquivos NF-e:** 17 na `fase-a`, 19 na tag. Dos **16 caminhos comuns**, **15 são byte-idênticos**
  (`git rev-parse <ref>:<file>` igual dos dois lados) — incluindo `lib/nfe.ts`, `NfeImportService.ts`,
  `NfeSaleReconciliationService.ts`, os dois `__tests__`, `NfeDto.ts`, `nfeController.ts`, `routes/nfe.ts`,
  a transcrição do leiaute, o ADR e **os dois fixtures SYNTHETIC**. O único que difere é
  `BE-INCR-NFE-impl-plan.md`, e `main` já tem sua própria versão.
- **Único caminho só na `fase-a`:** `server/prisma/migrations/20260723190934_nfe_multi_item_discriminator/migration.sql`
  — a migração com **timestamp obsoleto**. A tag tem a mesma migração em `20260825120000`, e a decisão
  ratificada exige timestamp posterior a `20260825120000` de qualquer forma. **Superseded por desenho.**
- **Fiação fora dos arquivos NF-e:** das **50 linhas** que a `fase-a` adiciona mencionando `nfe`/`inventoryMultiItem`
  nos 16 arquivos de integração (schema, `factory.ts`, `routes/index.ts`, `docs.paths.ts`, `PostingService.ts`,
  `PayableService.ts`, `auditCanonical.ts`, DTOs…), **49 aparecem literalmente na tag**. A única ausente é
  um **comentário** sobre a contagem do baseline, que difere só porque a tag tem sua própria versão do
  comentário. **Nenhuma linha de comportamento fica de fora.**

**Medida-resumo: `claude/nfe-fase-a` não carrega nada que a tag `nfe-fase-b-preserved` não tenha**, exceto
uma migração cujo timestamp a decisão já invalidou.

### 5.4 Fork formulado

> **F-Q5 — destino das 4 branches `nfe` locais**
>
> - **(a) Apagar as quatro.** Justificado pelas medidas: três são ancestrais da quarta, e a quarta é
>   conteúdo-equivalente à tag preservada. Custo: **irreversível** — não há `origin` nem tag.
> - **(b) Tagar `claude/nfe-fase-a` e empurrar a tag para `origin`, depois apagar as quatro.** Espelha
>   exatamente o que se fez com a `fase-b` e torna o apagamento reversível pelo mesmo mecanismo. Custo: mais
>   uma tag no `origin` para uma implementação que a própria fila já declarou **SUPERSEDED** em 2026-08-26.
> - **(c) Não apagar nada agora.** Custo: quatro branches locais mortas há **288 commits** e ~5 semanas
>   continuam poluindo `git branch` e convidando o próximo agente a examiná-las de novo.
>
> **Recomendação: (b).** As medidas sustentam (a) — mas **(a) e (b) diferem por um comando**, e a assimetria
> de risco é grande: (b) custa uma tag e (a) custa a impossibilidade de voltar atrás se alguma medida minha
> estiver errada. Já registrei uma medida que **quase** me enganou: as 4 pareciam seguras porque a `fase-b`
> tinha backup — e elas não têm nenhum. Prefiro pagar a tag.
>
> **Limite honesto da minha medida:** comparei **conteúdo** (hashes de blob e linhas adicionadas), não
> **intenção**. Se algo de valor na `fase-a` estiver na *mensagem de commit*, no histórico de review, ou numa
> decisão que só existe no diff intermediário da `review-nfe`, minha medida **não veria**. É exatamente o que
> (b) protege por um comando.

**RATIFICADO E EXECUTADO 2026-08-28 — o dono escolheu (b).**

```
git tag -a nfe-fase-a-preserved 68df00f4   # anotada, mensagem com as medidas
git push origin nfe-fase-a-preserved       # [new tag]
git branch -D  claude/nfe-a2-import claude/nfe-a3-sale review-nfe claude/nfe-fase-a
```

**Ordem seguida: tagar → empurrar → *verificar* → só então apagar.** Verificado **antes** do
apagamento: a tag em `origin` dereferencia para `68df00f4`; `lib/nfe.ts` (320L),
`NfeImportService.ts` (275L), `NfeSaleReconciliationService.ts` (153L) e a migração exclusiva
`20260723190934` legíveis **pela tag**; os três ancestrais (`91f6699d`, `fd978cfe`, `000f5fc4`)
alcançáveis a partir dela. Verificado **depois**: as 4 refs sumiram, as **duas** tags
(`nfe-fase-a-preserved` → `68df00f4`, `nfe-fase-b-preserved` → `5b6243a6`) resolvem em `origin`, e os
**4 commits originais seguem alcançáveis**.

⚠️ **`-d` recusou as quatro** ("not fully merged") e o `-D` foi necessário — **diferente da `fase-b`**,
que o `-d` aceitou. A causa é estrutural, não um sinal de perigo: a `fase-b` tinha
`origin/claude/nfe-fase-b` como upstream, então o `-d` tinha contra o que validar; **estas quatro eram
locais, sem upstream nenhum**, então o `-d` não tem como reconhecer preservação — e preservação por
**tag** nunca foi o que o `-d` mede. Foi exatamente para cobrir essa lacuna que a ordem começou por
tagar e verificar.

⛔ **Duas tags a não apagar agora:** `nfe-fase-a-preserved` e `nfe-fase-b-preserved`. São a única cópia
das duas implementações; o gc poda inalcançável.

---

## 6. O que eu NÃO consegui determinar

1. **Se a `fase-a` carrega valor não-textual.** Medi conteúdo (blobs idênticos, 49/50 linhas de fiação
   presentes na tag). **Não** medi mensagens de commit, histórico de review, nem raciocínio embutido em diffs
   intermediários. Um artefato de *decisão* que só exista aí passaria batido. ✅ **Este limite deixou de ser
   um risco aberto:** o dono ratificou F-Q5(b) e a tag `nfe-fase-a-preserved` foi criada em `origin` antes do
   apagamento — o que a minha medida não veria, a tag preserva de qualquer jeito.
2. **Quanto tempo o gargalo humano vai durar.** Toda a força da recomendação (a) do F-Q1 depende disso, e
   é justamente o que não sei. Se o PVA e os sign-offs levarem meses, minha recomendação envelhece mal —
   declaro a dependência em vez de escondê-la.
3. **Qual suíte de integração hoje depende, sem saber, do estado vazado pelo `resetDb()`.** Sei que 29
   tabelas não são limpas e sei o mecanismo do `AuditChainHead`; **não** rodei as suítes com o `resetDb()`
   corrigido para ver quais ficariam vermelhas. O custo real do F-Q3(a) é, portanto, **estimado, não medido**.
4. **Se o F-Q2 ainda reproduz depois do apagamento da `fase-b`.** A `inventoryMultiItem` era da NF-e; com a
   branch apagada, a fonte mais provável de staleness some. Minha recomendação (a) assume isso e pode estar
   otimista.
5. **Nada sobre o estado do repo além dos artefatos autorizados.** Por moratória, não varri o repo em busca
   de outros candidatos de fila. Se existir trabalho executável que **não** aparece na §5.1 nem nos briefs
   lidos, esta leitura **não o veria** — registro como **insumo ausente**, não como "não existe".

---

## 7. Autoavaliação [OPS-001]

1. **Objetivo sob a letra:** a letra pedia "leitura da fila". O objetivo é **saber se sobrou trabalho de
   agente depois do último item de código do Bloco A fechar**. A resposta é **não sobrou item de fila** — e
   isso é uma conclusão desconfortável que a letra permitiria maquiar enumerando dívidas como se fossem fila.
   Separei as duas coisas de propósito (§2a × §4).
2. **Graus.** *Verificado* (comando rodado nesta sessão): ancestralidade das 4 branches, ausência de
   `origin/` para elas, igualdade de blobs `fase-a`×tag, 49/50 linhas de fiação, `resetDb` com 11 tabelas e
   0 de contabilidade, 29 modelos contábeis em 44, `inventoryMultiItem` ausente de `main`, 142 paths /
   169 operações, `BASELINE = 142`, os 5 runbooks existentes e sem assinatura, status `Draft` do ADR-P2.
   *Reportado pelo pedido e conferido só em parte:* as 53 referências e os 27 testes do F-Q2 — conferi que a
   coluna não existe em `main` e que o cliente atual está limpo, **não** reproduzi a queda das 4 suítes.
   *Assumido:* nada material.
3. **Caso adversarial que tentei.** Tentei derrubar "nada além do item 11 dependia do NFE-X" procurando
   citações fora da família NF-e — não achei nenhuma, e a checagem **teria** mostrado se houvesse. Tentei
   derrubar "as 4 branches são descartáveis" assumindo que fossem independentes: **caiu ao contrário do que
   eu esperava** — três são ancestrais da quarta, o que *fortalece* o descarte; mas a mesma varredura achou o
   que **enfraquece**, que é a ausência de `origin`, e foi isso que mudou minha recomendação de (a) para (b).
4. **Checagem que teria falhado se eu estivesse errado.** `git rev-parse <ref>:<arquivo>` nos 16 caminhos
   comuns: se a `fase-a` carregasse implementação não resgatada, os hashes divergiriam. Divergiu **um**, e é
   um doc que `main` já tem em versão própria. E `git rev-parse origin/claude/nfe-fase-a`: se tivesse
   respondido com um SHA, minha afirmação de "local-only" cairia na hora.
5. **Meus vieses, nomeados.** (i) **Viés de achar trabalho** — uma leitura de fila que conclui "não há item
   executável" parece leitura fracassada, e a pressão é inventar frente nova; resisti, mas ela empurrou os
   forks F-Q2/F-Q3 na direção de "item de fila", e por isso escrevi o contra-argumento de custo em cada um.
   (ii) **Viés de preservar trabalho** (custo afundado) — o mesmo que o BRIEF do destino registrou tendo se
   confirmado contra ele; ele está vivo na minha recomendação F-Q5(b), que paga uma tag por código que a
   própria fila declarou superseded. Assumo: se o dono achar que é apego, **(a) é defensável pelas mesmas
   medidas**. (iii) **Viés de completude documental** — a recomendação F-Q4(a) é a que menos muda o mundo, e
   pode ser eu preferindo doc consistente a valor entregue.

**Regras de escopo respeitadas:** nenhuma frente nova aberta · nenhum fork auto-ratificado · nenhum aparato
de auditoria proposto (gate/rodada/revisor — a distinção está nomeada no §4) · nenhuma branch apagada além da
`claude/nfe-fase-b`, que era a autorizada · nenhuma spec de outro item editada · nenhum código de aplicação escrito.
