# Próximos passos — 2026-08-28

> **Escopo deste documento:** ele **enumera e ordena** o que já está autorizado ou parado esperando
> decisão. **Não abre frente nova** (ORCH-006), não ratifica nada, não propõe aparato de auditoria.
> Deriva da [LEITURA-DA-FILA-2026-08-28.md](LEITURA-DA-FILA-2026-08-28.md) e do
> [ACCOUNTING-MASTER-MAP §5.1](ACCOUNTING-MASTER-MAP.md).
>
> **A frase que resume:** *não há item de fila que um agente possa executar hoje.* O gargalo é humano
> e externo, e os artefatos que um agente poderia preparar **já existem**.

---

## 0. Onde estamos agora

| O que fechou hoje | Estado |
|---|---|
| **NFE-X** (`attachSourceDocument` extraído para `main`) | ✅ PR #228, merge `9335c4cb`, review independente PASS |
| **Higiene de branches NF-e** — 7 branches apagadas | ✅ `nfe-fase-b` · `nfe-fase-a` · `nfe-a2-import` · `nfe-a3-sale` · `review-nfe` · `nfe-x-brief` · `nfe-x-provenance-attach` |
| Fold do mapa + leitura da fila | ✅ **PR #229 mergeado** (`3db7725f`) |

**Não sobrou nenhuma branch `nfe`** além da de trabalho do #229.

⛔ **Duas tags que NÃO podem ser apagadas** — são a única cópia das duas implementações NF-e:

| Tag | → commit | Preserva |
|---|---|---|
| `nfe-fase-b-preserved` | `5b6243a6` | a re-implementação sobre `main` (referência da spec de reconstrução) |
| `nfe-fase-a-preserved` | `68df00f4` | a Fase A e, por ancestralidade, `a2-import` + `a3-sale` + `review-nfe` |

As branches `nfe-x-*` **não** precisaram de tag: foram mergeadas em `main`, então `9b5b4117` e
`8c30f7c8` seguem alcançáveis pelo histórico de `main` para sempre.

**Bloco A hoje: 4 de 4 itens travados em oráculo externo.** Era essa a condição antes do NFE-X entrar,
e voltou a ser depois que ele saiu.

---

## 1. ~~Passo imediato — mergear o PR #229~~ ✅ FEITO

Mergeado em `main` como `3db7725f`. O mapa em `main` já descreve o NFE-X como concluído e registra
os apagamentos. Nada mais pendente nesta seção.

---

## 2. O que destrava tudo: os gates humanos (itens 3 e 4)

**Dono:** você (e o contador, no item 3). **Agente não substitui oráculo.**

Estes dois não são só "mais dois itens": a pré-condição §5 item 2 do **ADR-P2** é literalmente
*"vertical 1 validado: PVA verde + sign-offs"*. **Fechá-los destrava o P2**, que é a prova da tese do
produto (a prensa de binding gerando o 2º vertical).

| Item | Runbook — **já preparado, em branco** | O que fazer |
|---|---|---|
| **3** — sign-off PVA | [RUNBOOK-H1-PVA.md](RUNBOOK-H1-PVA.md) (180 linhas) | Gerar ECD/Apuração/ECF, importar no **PVA oficial da RFB**, colar a evidência, marcar desfecho, assinar |
| **4** — sign-offs de browser | [RUNBOOK-H2-BROWSER-SIGNOFF.md](RUNBOOK-H2-BROWSER-SIGNOFF.md) (168 linhas) | Rodar o app contra o `dev.db` real em **build de produção** e carimbar as telas |

**Sobre o item 4 — o que uma varredura de agente já cobriu e o que não cobre.** A varredura de
2026-07-23 exercitou AP, AR, Dimensões, Conciliação, Contrapartes, DRE/BP/DFC/Livro Diário/Compliance
com **zero erro de console**, e achou 2 bugs reais (PR #151). O que **sobra e nenhum agente alcança**:

1. o olho humano final de carimbo;
2. **upload de extrato por clique** (OFX/CNAB) — o agente só exercitou o backend via `fetch`;
3. recibos PDF (puppeteer);
4. o **fluxo de venda de salão pós-swap da prensa de binding** — os passos 6–11 do runbook, um por
   evento do intérprete. O golden test prova a *mecânica*, não o app real.

> ⚠️ **Regra do formato:** evidência **colada**, nunca frase; desfecho em **três estados**
> (`PASSOU` / `FALHOU` / `BLOQUEADO` — o terceiro existe para dar saída honesta); **assinatura humana**.
> **Runbook sem assinatura é nulo.** Eu posso preparar runbook; **não posso** preencher evidência,
> marcar desfecho nem assinar. Ver [RUNBOOK-FORMAT.md](../operating-manual/RUNBOOK-FORMAT.md).

---

## 3. Decisões suas que estão paradas (não são trabalho — são forks)

Nenhuma se auto-ratifica. Estão formuladas com recomendação na
[leitura da fila](LEITURA-DA-FILA-2026-08-28.md); aqui só o índice e o custo de deixar parado.

| Fork | Decisão | Minha recomendação | Custo de não decidir |
|---|---|---|---|
| **F-Q1** | Promover **ADR-P2** a `Accepted` agora, ou esperar os gates humanos? | **(a) esperar** | Baixo — o P2 já está bloqueado pelo item 2 de qualquer forma |
| **F-Q2** | Cliente Prisma stale entre worktrees: dívida declarada ou item de fila? | **(a) dívida declarada** | Baixo — custa ~minutos de diagnóstico quando reaparece |
| **F-Q3** | `resetDb()` não limpa **nenhuma** das 29 tabelas de contabilidade | **(a) item de fila, escopo apertado** | ⚠️ **Alto e crescente** — todo teste de integração contábil novo nasce com a armadilha |
| **F-Q4** | Corrigir a spec da NF-e (chama de ausente um seam que agora existe) | **(a) corrigir agora** | Médio — cresce com o tempo até o XML chegar |
| — | **ADR-P2 §6 item 5:** parecer do `luminaris-accounting-architect` quando o preset da clínica esboçar contas novas | (não é meu fork) | — |

**Se for decidir só um, decida o F-Q3.** É o único cujo custo **aumenta** com o tempo: o modo de falha
é teste que passa por ordem de execução ou passa vacuosamente, e cada suíte de integração contábil nova
herda o problema sem que ninguém perceba.

---

## 4. Pipeline de agentes — Sonnets em sequência, armado, aguardando ratificação

**Nada disto está autorizado hoje** (ORCH-006). Mas o trabalho ratificável cabe num pipeline serial de
agentes Sonnet que roda inteiro com **uma única mensagem citável sua**:

> *"Ratifico F-Q4(a), F-Q2(a) e F-Q3(a); execute o pipeline do §4."*

O pipeline roda **em paralelo aos runbooks humanos do §2** — agente e humano não competem pelo mesmo
recurso, então ratificar isto não atrasa o gargalo real em nada.

**Por que sequência, e não fan-out paralelo:**

1. S2→S3 é sequencial por definição — a `sessao-correcao` exige o teste-guarda já vermelho.
2. O blast radius do F-Q3 (suítes que dependem do estado vazado) sujaria o resultado de teste de
   qualquer branch paralela.
3. Squash-merge quebra PR empilhado — merges seriais, cada branch nasce de `main` fresco.
4. Windows serializa o SQLite: verde local em teste de concorrência **não é evidência**; a CI de cada
   PR é o oráculo, um PR por vez.

**Preparo obrigatório de cada worktree novo (setup, não agente):** `npm ci` + `npx prisma generate` —
worktree novo não herda `node_modules` nem `.env`, e cliente Prisma stale é exatamente o sintoma
que o F-Q2 documenta.

| # | Agente (Sonnet) | Sessão | Faz | Gate de saída | Entrega ao próximo |
|---|---|---|---|---|---|
| **S1** | doc-sweep | — (doc-only; não é nenhum dos 5 tipos de sessão) | **F-Q4(a):** corrige o parágrafo da [spec §8](BE-INCR-NFE-fase-b-spec.md) (o seam `attachSourceDocument` agora existe em `main`). **F-Q2(a):** sintoma→causa do Prisma stale no `server/CLAUDE.md` | diff só em `.md`; zero código | PR mergeado; base limpa |
| **S2** | instrumentador | `sessao-instrumentacao` | teste-guarda que **FALHA** provando o vazamento: `AuditChainHead` (e ≥1 tabela contábil de outro grupo) sobrevivendo ao `resetDb()` entre suítes | teste vermelho **pelo motivo certo**; zero código de aplicação tocado | branch com teste vermelho + lacuna descrita |
| **S3** | corretor | `sessao-correcao` | estende `resetDb()` ([db.ts:31](../../server/test/helpers/db.ts:31)) às 29 tabelas, filhas antes de pais, + guarda derivada do `schema.prisma` (tabela contábil nova sem limpeza = vermelho) | teste-guarda verde; `tsc` limpo; `npm run test:integration` (`--runInBand`) rodado **inteiro** | branch + **inventário de vermelhos** (ver regra abaixo) |
| **S4** | revisor | — (agente **separado**; nunca a sequência que implementou) | review independente da branch do S3 em worktree próprio; **re-julga** a classificação achado×regressão do inventário | PASS explícito; FAIL devolve ao S3 com item citável | veredito |
| **S5** | integrador | merge pós-PASS (padrão do loop); `sessao-integracao` só se houver conflito de transporte | leva a branch a `main` | CI verde no PR; squash | `main` atualizado |

**Regras duras do pipeline:**

- **S3 não conserta suíte vermelha que não seja o teste-guarda.** Vermelho novo é **achado**, não
  regressão: entra no inventário classificado (suíte, causa provável, achado × regressão) e **fecha o
  "não sei" nº 2 do §8** — o custo do F-Q3 sai de estimado para medido. Consertá-lo ali é violação de
  escopo da `sessao-correcao`; cada achado vira item de fila novo, decidido por você.
- **Cada estágio recusa o que não é dele** (formulário da sessão) e para no primeiro gate vermelho.
  Parar é desfecho válido; blefar continuidade não é.
- **Sonnet basta em todos os estágios** — são spec-driven/mecânicos. O único julgamento real é a
  classificação achado×regressão do S3, e é por isso que o S4 a re-julga de forma independente.
- **P2 (vertical clínica estética) fica FORA do pipeline.** É o estágio armado seguinte —
  `sessao-feature` sobre o [BRIEF](BE-INCR-P2-VERTICAL-CLINICA-brief.md), 8/8 forks ratificados — mas o
  disparo é **manual e seu, somente após H1+H2 assinados** (§2). Ratificar fork ≠ autorizar execução, e
  nenhum verde de pipeline substitui assinatura humana.

---

## 5. Travado em dado externo — não anda por esforço

| Item | Falta | Runbook |
|---|---|---|
| **11 passo 3** — reconstruir a NF-e | **1 XML de NF-e 4.00 de compra + 1 de venda, anonimizados** | [BE-INCR-NFE-fixtures-README.md](BE-INCR-NFE-fixtures-README.md) |
| **6** — referencial RFB | o arquivo oficial "PJ em Geral" (espera o contador) | [RUNBOOK-X2-RFB-REFERENCIAL.md](RUNBOOK-X2-RFB-REFERENCIAL.md) |
| **5** — 1º deploy real | provisionar a VPS (alvo já **decidido** no ADR-M2) | [RUNBOOK-M2-DEPLOY-SMOKE.md](RUNBOOK-M2-DEPLOY-SMOKE.md) |

Para a NF-e: a `nfe-fixture-provenance.test.ts` **falha de propósito** enquanto os fixtures forem
`*.SYNTHETIC.xml`, e o CI segura o merge. Quando o XML chegar, a reconstrução parte da
[spec §8](BE-INCR-NFE-fase-b-spec.md) — **já em `sale.*`** e com migração de timestamp posterior a
`20260825120000`. O código de referência sai da tag `nfe-fase-b-preserved`, não de branch nenhuma.

---

## 6. Ordem recomendada

1. ~~Mergear o #229~~ ✅ feito (`3db7725f`).
2. **Ratificar F-Q4(a) + F-Q2(a) + F-Q3(a) numa mensagem citável** → dispara o pipeline do §4
   (S1–S5). Depois disso o pipeline não precisa da sua atenção até o inventário de vermelhos do S3.
3. **Executar os runbooks H1 e H2** (§2) **em paralelo ao pipeline** — é o gargalo real, destrava o
   P2, e não compete com os agentes por nada.
4. Decidir F-Q1 quando conveniente — não é urgente (F-Q2/F-Q4 já entram no passo 2).
5. **P2** só depois do passo 3 — disparo manual seu, fora do pipeline.

---

## 7. O que NÃO fazer

- **Não recriar aparato de auditoria** — nem gate, nem rodada, nem mais um revisor. Com 4 de 4 itens do
  Bloco A travados em oráculo externo há mais de 14 dias, a regra permanente do `CLAUDE.md` vale.
  A medida que a fundamenta: 5 rodadas, 31 itens triados, **17 sobre o próprio instrumento**, **0 linha
  de código de aplicação alterada** — contra 28 linhas de uma única sessão de navegador contra o `dev.db` real.
- **Não apagar** `nfe-fase-a-preserved` nem `nfe-fase-b-preserved`.
- **Não abrir frente nova** sem ADR + sinal seu (ORCH-006).
- **Não tratar runbook preenchido por agente como sign-off.** Nulo por desenho.

---

## 8. O que eu não sei

1. **Quanto tempo os gates humanos vão levar.** É a variável que governa a ordem do §6 inteira e a
   recomendação (a) do F-Q1. Se levarem meses, vale reabrir o F-Q1.
2. **Quais suítes ficariam vermelhas com o `resetDb()` corrigido.** Sei o mecanismo (29 tabelas não
   limpas, `AuditChainHead` persistindo); **não** rodei as suítes com o fix. O custo do F-Q3(a) é
   **estimado, não medido** — e essa estimativa é a parte mais fraca da minha recomendação de priorizá-lo.
   O **inventário de vermelhos do S3 (§4)** foi desenhado exatamente para converter isto em medido.
3. **Se existe trabalho executável fora dos artefatos que li.** Por moratória, não varri o repo além da
   §5.1, do ADR-P2 e dos briefs da NF-e. Registro como **insumo ausente**, não como "não existe".
