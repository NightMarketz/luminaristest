# Plano de UMA sessão — 2026-09-17 — fechar as pontas que NÃO são implementação de código

> **✅ EXECUTADO 2026-09-17 (mesma data): F-PS-1..5 → (a) RATIFICADOS pelo dono** (*"Vai na recomendação dos 5 e abre a
> sessão"*) e a sessão rodou pela `sessao-planejamento` contra `origin/main` `85378005`. Itens 0–6 ✅ (preflight limpo:
> 0 PR aberto; cédula com §0; 3 BRIEFs; plano C8; fold), item 7 = o PR que carrega este arquivo. **Correção de fato ao
> item 1:** a versão do PVA está em `.install4j/i4jparams.conf` (`applicationVersion`), não em `stats.properties`
> (que só tem datas) — a cédula §0 cita o arquivo certo. **Nenhum "executa" dado; 14 forks novos PENDENTES**
> (F-FE-BS-1..4 · F-FE-RV-1..4 · F-FE-DL-1..4 · F-FA14/15).

> **O que este doc é:** o BRIEF de uma única sessão docs-only que fecha todas as pontas não-código abertas em
> `PROXIMOS-PASSOS-2026-09-17.md` (passo 7, "fora da régua", passo 9) e uma ponta que só existe fora de `main`
> (a cédula da entrevista de 14/09). Produzido por `sessao-planejamento` em 2026-09-17 contra `origin/main`
> **`85378005`** (#343). **Não contém código de aplicação, não abre "executa" para nó nenhum.**
>
> **Autorização (ORCH-006):** dono, em sessão, 2026-09-17: *"Pode planejar em 1 única sessão para fechar as
> pontas que não são implementação de código."* Cobre **planejar a sessão**; a execução da sessão (escrever os
> BRIEFs/cédula/fold) é docs-only e está coberta pela mesma frase **na leitura recomendada** — ver Fork **F-PS-1**.
> Não cobre "executa" de C12/C8/FE-LALUR-2/SEED-MY/E9 nem qualquer runbook humano.

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** sessão docs-only "pontas não-código pós-C6b". Fila vigente:
  `PROXIMOS-PASSOS-2026-09-17.md` (passos 7 e 9 abertos; lista "fora da régua"); grafo vigente
  `GRAFO-DEPENDENCIAS-2026-09-14.md` §4 (algoritmo, R6).
- **Estado de `main` que o plano toma como fato consumado (verificado 17/09 por `git ls-tree`/`git grep`):**
  - C6b **done** (#337/#338/#340), régua **44/57**; C12 transcrição J930/0930 ✅ (#339); C11 ✅ (#334); F7 ✅ (#326).
  - Contratos BE **existentes** (é o que permite BRIEF de FE sem inventar): `BankSettlementDto.ts` + rotas
    `/api/bank-settlements` (`GET /`, `POST /scan`, `POST /:id/confirm|reject|retry`; `docs.paths.ts:4079-4189`);
    `AccountingReviewDto.ts` + rotas `/api/accounting/reviews` (`POST /`, `GET /`, `GET /:id`, `POST /:id/findings`,
    `…/resolve`, `…/adjustment`, `PATCH /:id/jobs`, `POST /:id/sign-off|reject`; `routes/accounting.ts:240-248`);
    `AccountingDeliveryDto.ts` + `DataExchangeDto.ts` + rotas `/api/accounting/delivery/{build,confirm,profile,:id,:id/retry}`
    (`routes/accounting.ts:228-236`).
  - Painéis FE canônicos do módulo (todos `<table>`+`Modal`, divergência de shape sancionada —
    `accounting-rc-ap-ar-sanction`): `ReconciliationPanel.tsx`, `CompliancePanel.tsx`, `SpedGenerationPanel.tsx`,
    `ImportExportPanel.tsx`, `LalurPanel.tsx` (#315 é o precedente mais recente de tela sobre contrato Prisma).
  - **Ponta fora de `main`:** `docs/accounting/CEDULA-DECISAO-2026-09-14-entrevista-gates-humanos.md` — só existe
    neste worktree (`fe-incr-lalur-pr1-cadastro-2aa0e7`, branch `claude/proximos-passos-documentados-2625c0`),
    **renomeada em 17/09** porque `main` já tem outra `CEDULA-DECISAO-2026-09-14-gates-humanos.md` (PR #318, sessão
    paralela do mesmo dia, conteúdo diferente). Contém decisões que **não estão em lugar nenhum de `main`**
    (`git grep` vazio para `nfelib`, `G-10`, "M2 ADIADO" datado 14/09): G-6 (fonte pública real do XML NF-e),
    G-7 (M2 adiado), G-8 (H2 com fixture sintético), G-9 (incidente de credencial), G-2 (declarante fictício).
- **Nós vizinhos:** cada BRIEF de FE é **crescimento** do nó BE correspondente (§7.1 regra 2: F7, C11, C6b) —
  numerador da régua inalterado. E9 (código, `sessao-correcao`) passa a ter autorização citável quando a cédula
  entrar em `main` — **não roda nesta sessão**.

---

## 1. Checklist da sessão (ordem de execução; cada item = 1 artefato verificável)

| # | Ponta | Artefato de saída | Verificação de "feito" | Fork |
|---|---|---|---|---|
| 0 | Preflight | — | `git fetch`; `merge-base --is-ancestor 85378005 origin/main`; `gh pr list --state open` = nenhum PR de código (se houver, **pare**); `git worktree list` sem outro worktree tocando `docs/accounting/` | — |
| 1 | **Cédula 14/09 (entrevista) → `main`** | `CEDULA-DECISAO-2026-09-14-entrevista-gates-humanos.md` com **§0 Reconciliação** no topo: G-4/B-4 → "executado por referência em #318, **não assinado**"; G-3/seed → SEED-MY BRIEF #325 (forks ✅, bloqueado por B-4); G-10/P2 → **superado** (P2 já estava em `main` #282 desde 07/09 — a pergunta partiu de memória stale; c.11 = #320); G-1/PVA → instalados 14/09 10:25 em `C:\Arquivos de Programas RFB\Programas SPED\` (10.4.1 / 12.2.6 lidos do `.install4j/stats.properties` — **não é evidência do P4**, o "Sobre" é do dono); G-6/E9 → segue autorização citável, ainda sem sessão | arquivo em `main`; `git grep nfelib docs/accounting` ≥ 1 | F-PS-2 |
| 2 | **BRIEF `FE-INCR-BANK-SETTLEMENT`** (passo 7) | `docs/accounting/FE-INCR-BANK-SETTLEMENT-brief.md` | comportamentos ≥ 6, contratos = `BankSettlementDto.ts` transcritos (não parafraseados), forks PENDENTES ≥ 2 (aba própria × sub-aba de `ReconciliationPanel`; confirmar em lote × um a um; encargo 400 nomeado até o contador — BRIEF F7 §5) | F-PS-1 |
| 3 | **BRIEF `FE-INCR-REVIEW`** (aba da revisão profissional, C11) | `docs/accounting/FE-INCR-REVIEW-brief.md` | comportamentos ≥ 8 (abrir revisão, listar, achados, resolver, ajuste, jobs, sign-off, reject), contratos = `AccountingReviewDto.ts`; forks: onde vive (Compliance × aba nova), quem vê `sign-off` (policy `canManage*` do C11 lida do código) | F-PS-1 |
| 4 | **BRIEF `FE-INCR-DELIVERY`** (pacote ao contador, C6b) | `docs/accounting/FE-INCR-DELIVERY-brief.md` | comportamentos ≥ 6 (perfil `GET/PUT /delivery/profile`, build, confirm, retry, histórico `GET /:id`); **registra a quebra avisada** no plano C6b §5.1 (`files[].kind` = `ExportKind`) como contrato, não como surpresa; contratos = `AccountingDeliveryDto.ts`/`DataExchangeDto.ts` | F-PS-1 |
| 5 | **Plano granular do C8** (passo 5.2 — "fatiamento é plano, não fork") | `docs/accounting/BE-INCR-FIXED-ASSETS-execution-plan.md` (precedente `…-CONTADOR-PACKAGE-EXTENDED-execution-plan.md` #336) | PRs seriais por bloco (modelo+migração+Anexo III seed → aquisição/baixa → depreciação/quota → J801/J932 → NF-e modo 4); write-set por PR (PAR-001); sha256 do Anexo III `43557` + nota `<STRIKE>` (5.3); **sem "executa"** | F-PS-3 |
| 6 | **Fold** (passo 9) | master map (§5.1 linhas dos 3 FE + C8 "plano granular"; topo: fold 17/09 sessão 6), `GRAFO-DEPENDENCIAS-2026-09-14.md` §4.3, `PROXIMOS-PASSOS-2026-09-17.md` coluna Estado (7 → ✅ BRIEF; "fora da régua" → 3 com BRIEF), `README.md` da pasta | régua **inalterada 44/57** (tudo é crescimento/plano); leitura alternativa declarada no fold | — |
| 7 | **PR docs-only único** | 1 PR, branch desta sessão | CI verde; nenhum arquivo fora de `docs/` | — |

**Fora desta sessão (declarado, não planejado):** `FE-INCR-FIXED-ASSETS` e `FE-INCR-SPED-SIGNERS` — o BE (C8, C12)
**não está implementado**; BRIEF de FE sobre DTO inexistente viola o padrão "contrato = fato consumado" (FE-LALUR
foi escrito contra `LalurDto.ts` em `main`). Entram quando C8/C12 mergearem (Fork F-PS-4 registra a alternativa).

---

## 2. Contratos que a sessão materializa (forma, não prosa)

Cada BRIEF de FE nasce com esta seção preenchida **por transcrição do DTO em `main`** (comando de leitura no BRIEF):

```
FE-INCR-<X>-brief.md
├─ Cabeçalho: item · autorização (cita este plano + a frase do dono 17/09) · contrato (path do DTO + rotas + policy)
├─ §1 Fatos verificados (grep/Read com linha) — reuse canônico: <table>+Modal, StandardPagination, formatDate/scopeToday
├─ §2 Checklist numerado de comportamentos (cada um: rota chamada · estado da tela · teste vitest com shim React)
├─ §3 Forks — RATIFICAÇÃO PENDENTE (caminhos · recomendação · risco)
├─ §4 Pendente de validação externa (vazio ou "contador: …")
├─ §5 Insumos ausentes · §6 Achados fora de escopo
└─ Gates do diff: i18n pt/en · withAuth ⇒ build de produção · vitest · tsc my-app
```

Cédula (item 1): formato da `CEDULA-DECISAO-2026-09-03-integracao.md` (§A–§F já escritos) **+ §0 Reconciliação**
(tabela G-n → estado em `main` 17/09 → o que sobrevive como autorização).

Plano C8 (item 5): formato do `…-execution-plan.md` #336 (§0 achados da leitura · §1 forks novos PENDENTES · §2
fatiamento · §3 passos · §4 write-set · §5 fora de escopo · §6 validação externa · §7 estimativa).

---

## 3. Forks — ✅ RATIFICADOS 2026-09-17 (5/5 na recomendação, dono em sessão)

| Fork | Caminhos | Recomendação | Por quê |
|---|---|---|---|
| **F-PS-1** — a frase *"pode planejar em 1 única sessão…"* cobre **escrever os 3 BRIEFs de FE** ou só planejar a sessão? | (a) cobre: BRIEF é planejamento, não código; a sessão escreve os 3 · (b) não cobre: a sessão escreve só a cédula + plano C8 + fold, e os BRIEFs esperam citação própria (passo 7.1 do 09-17 pede "citação para o BRIEF") | **(a)** | O dono pediu "fechar as pontas"; BRIEF sem forks ratificados não autoriza nada (regra da sessão de planejamento), então o risco de (a) é zero código e o de (b) é mais uma rodada de pergunta pelo mesmo motivo |
| **F-PS-2** — a cédula 14/09 (entrevista) entra em `main` **inteira com §0 Reconciliação** ou **só o delta** (G-2/6/7/8/9) como adendo à cédula do #318? | (a) inteira + reconciliação · (b) adendo de 5 linhas na cédula existente | **(a)** | A entrevista tem seção C (medições na máquina do dono) que nenhum outro doc registra; adendo perderia a evidência. Custo: 1 arquivo a mais |
| **F-PS-3** — plano granular do C8 **agora** (sem "executa") ou **só quando o "executa" vier**? | (a) agora: destrava o "executa" com tamanho conhecido (precedente C6b: plano #336 → "executa" no mesmo dia) · (b) depois: evita planejar o que pode não ser o próximo | **(a)** | C8 é a maior peça contábil restante e o dono tende a dar "executa" sobre plano granular; 37 comportamentos sem fatiamento é o que trava a decisão |
| **F-PS-4** — `FE-INCR-FIXED-ASSETS` / `FE-INCR-SPED-SIGNERS`: BRIEF **contra o BRIEF do BE** (DTO esboçado) ou **esperar o merge**? | (a) esperar · (b) escrever agora marcando "contrato = esboço, revalidar no merge" | **(a)** | FE-LALUR provou o valor de escrever contra DTO real (achou que o catálogo não tinha endpoint — F-FE-1); contra esboço, esse achado não aparece |
| **F-PS-5** — os 3 BRIEFs de FE ficam **na régua** (nós) ou **crescimento** (numerador inalterado)? | (a) crescimento (regra 2 §7.1, precedente #315) · (b) nós novos (denominador 60) | **(a)** | Precedente já decidido 2× (tela do e-Lalur, tela do F7 no fold 16/09); reabrir é do dono |

---

## 4. Pendente de validação externa

- Contas de **juros/multa/desconto** (BRIEF F7 §5; pedido ao contador #331 item 6) — o BRIEF FE-BANK-SETTLEMENT
  mostra o 400 nomeado, não inventa conta.
- Conjunto de demonstrativos do pacote (C6b §6.1) — o BRIEF FE-DELIVERY lê `DELIVERABLE_EXPORT_KINDS` do código,
  não do pedido.

## 5. Insumos ausentes

- Nenhum para os itens 1–4 e 6 (tudo em `main` `85378005`).
- Item 5: sha256 do Anexo III (`43557`) no corpus — conferir `docs/accounting/fontes-oficiais/MANIFEST` antes de
  citar; se ausente, o plano C8 registra "Insumo ausente" e não transcreve.

## 6. Achados fora de escopo (não planejar aqui)

1. **E9 XML real** — autorizado por G-6, é `sessao-correcao` (código): entra na fila de código após a cédula
   landar; candidatos e anonimização em cédula §C.4.
2. **H1 P4** — PVA instalado (medido), mas a evidência ("Ajuda → Sobre") é do dono; nenhum doc a preencher.
3. **X2** — executável desde 31/08, kit pronto; humano.
4. **Pedido ao contador** (#331) — sem registro de envio em `main`; humano.
5. **`GRAFO-DEPENDENCIAS-2026-09-17`** — não é necessário: o de 14/09 §4.3 absorve o fold; abrir grafo novo só
   quando uma aresta mudar (nenhuma muda com docs).

---

## 7. Risco principal e vieses (T8)

- **Risco:** a sessão produz 3 BRIEFs + 1 plano + 1 cédula + fold num PR só — revisão longa; se o revisor
  independente devolver FAIL num BRIEF, o PR inteiro espera. Mitigação declarada: commits separados por artefato
  dentro do PR (squash no merge), para que o fold seja o último e reflita o que passou.
- **Viés:** o plano foi escrito pela mesma sessão que fez a entrevista de 14/09 — F-PS-2 (a) favorece landar o
  próprio artefato. Contrapeso: a seção C da cédula é medição por comando, reproduzível (`ls`, `stats.properties`,
  `curl | grep`), não opinião.
- **Checagem que teria falhado se eu estivesse errado:** `git grep nfelib origin/main -- docs/accounting` = vazio
  (a cédula realmente não está em `main`); `git ls-tree origin/main docs/accounting | grep FE-INCR-(BANK|REVIEW|DELIVERY)`
  = vazio (os 3 BRIEFs realmente não existem); `merge-base --is-ancestor 85378005` (o estado citado é o atual).
