# Próximos passos — 2026-09-14 — prompt de orquestração pós-decisões

> **Uso:** cole o bloco "PROMPT" numa sessão nova com `luminaris-orchestrator`. Ele é autocontido: cita as
> autorizações, fixa a ordem (R6) e diz o que NÃO fazer. **Uma sessão executora só** — se a sessão
> paralela do PR #318 ainda estiver viva, o dono para uma das duas antes de colar isto.

---

## PROMPT

Você é o orquestrador do Luminaris (`luminaris-orchestrator`). Toda tarefa abaixo roda **pela sessão
correspondente** (`sessao-planejamento` / `sessao-feature` / `sessao-instrumentacao` /
`sessao-correcao` / `sessao-integracao`), com o formulário preenchido; executar de mão livre é violação
de escopo. Review independente = agente separado em worktree (`reviewer-independence-separate-agent`).
Merge só após PASS + `tsc`×2 + CI verde (`loop-auto-merge-after-review`). Gate humano e dado externo
(B-4, X2, H1 2ª passada, H2, H3, M2, contador, parceiro D5, convênio D6) **não têm sessão** — prepare
runbook em branco, nunca preencha.

### Autorizações citáveis (todas em `main` após os merges do passo 0)

- `docs/accounting/CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md` — **§Reconciliação prevalece** onde
  divergir de `CEDULA-DECISAO-2026-09-14-gates-humanos.md`: R6 financeiro antes de fiscal · R8 instância =
  CNPJ raiz, filiais = unidades · F-X6-1,2,4,5,6 → (a), **F-X6-3 → (b)** · R5 adiar Serpro · R7 emendar
  perímetro (1 símbolo) · R9 tabela irmã · R10 P-IA não abre · SEED-MY, X4-14, #315, C8 (delegação
  condicionada) autorizados.
- Emendas de ADR já commitadas: `ADR-P2-second-vertical.md` (R7, EMENDA 2026-09-14) e
  `ADR-INCR-DFE-EMISSAO-PARCEIRO.md` (R8, EMENDA 2026-09-14 no D2).
- BRIEF novo: `docs/accounting/BE-INCR-BANK-SETTLEMENT-brief.md` (F7) — **5 forks F-F7-1..5 PENDENTES**.
- Algoritmo de escolha do próximo nó: `GRAFO-DEPENDENCIAS-2026-09-11.md` §4, com R6 aplicado.

### Passo 0 — preflight (obrigatório, `verify-write-context-before-writing`)

1. `git fetch origin main`; confirme por `merge-base --is-ancestor` que **#319** (cédula + F7 + emendas)
   e **#318** (cédula paralela + runbooks) estão em `main`. Se não: `sessao-integracao` de cada um
   (docs-only; #318 e #319 não se tocam em arquivo). Sem isso, nenhuma autorização abaixo é citável.
2. `gh pr list --state open` — se houver PR de código aberto além dos listados aqui, **pare e pergunte**.
3. Zero jest concorrente (`tasklist | grep node`, classe `jest-concorrente-windows-ebusy`).

### Ordem de execução (R6: contábil → financeiro → fiscal; spec pronta primeiro; docs-only intercalável)

| # | Nó | Sessão | Entrada / regra | Saída esperada |
|---|---|---|---|---|
| 1 | **#315** FE-INCR-LALUR PR 1 | `sessao-integracao` | Review PASS já existe no PR. Conflito com #316 em `LalurService.ts` (**PR vence** no `GET /api/lalur/catalog`) e `__dto-shapes__.json` (**main vence**, regenerar snapshot). Baseline no alvo ANTES. | merge; FE-INCR-LALUR PR 2 destravado |
| 2 | **P2 comportamento 11** (T0 da métrica) | `sessao-feature` (BRIEF P2 item 11) | ADR-P2 EMENDA 14/09: marco `onboardingCompletedAt` **na tx** de `installPresetAsSystem`; `proveP2ZeroDiffCli` ganha allowlist de **1 símbolo** + teste-guarda que falha se crescer (par vermelho→verde no mesmo PR). Nada mais no perímetro. | P2 11/11; prova zero-diff segue verde |
| 3 | **C11** revisão profissional editável | `sessao-planejamento` | F-EDIT-1 → a+c (cédula 10/09 resposta 2); insumos: geração SPED ✅, `PostingService` (acerto), C6 #305 | BRIEF + forks pendentes |
| 4 | **C12** máscaras de identidade no SPED | `sessao-planejamento` | J930 `IDENT_QUALIF`/`COD_ASSIN` = enum do Manual ECD L9 (corpus); CPF/CNPJ/UF com máscara; base #305 | BRIEF + forks pendentes |
| 5 | **C6b** pacote ampliado ao contador | `sessao-planejamento` | tabela filha + migração (`AccountingDeliveryLog` tem hashes/FKs fixos); resposta 8 | BRIEF + forks pendentes |
| 6 | **SEED-MY** seed multi-exercício | `sessao-planejamento` (BRIEF curto) → `job-generator` | 2025 + 2026: períodos, lançamentos, AP/AR, chart com `1.1.6/3.3/4.2`; alvo dos runbooks H1/H2/H3 passa a ser o seed. **Pré-condição do #318: B-4 assinado pelo dono** — se não estiver, deixe o BRIEF pronto e pare aqui. | seed fixture; RUNBOOK-H1 P0 atualizado |
| 7 | **F7** baixa por retorno bancário | **PARE**: apresente F-F7-1..5 ao dono (questionário, recomendação primeiro) → só então `sessao-feature` | BRIEF `BE-INCR-BANK-SETTLEMENT`. Insumos ausentes §4 (config de contas por escopo; `externalRef` no título) são lidos na feature e **pausam** se virarem decisão de modelo. Fase C (encargo) entrega 400 nomeado até o contador dar as contas. | `bank_settlement_items` + 5 rotas + auditoria |
| 8 | **X6** custo D3 por regime | `sessao-planejamento` (**emenda** ao BRIEF #309: itens 10/11 sob F-X6-3 b, F-X6-4 ativo, defaults conservadores configuráveis, linha nova ao contador) → `sessao-feature` | Fase 0 `FiscalProfile` (chave = escopo; nasce com `partnerAccountRef` reservado — ADR-DFE emenda R8 item 2) → Fase A fórmula (ICMS por item, grupo N do MOC) | perfil fiscal + custo por regime |
| 9 | **X4-14** aviso M312 | `sessao-planejamento` (emenda BRIEF 3C item 14) → `sessao-feature` | 4 agregados `K155`/`K355` por conta/trimestre sobre postings; antes da H1 2ª passada | diagnóstico avisa ajuste parcial sem M312 |
| 10 | **C8** imobilizado + depreciação | ADR `ADR-INCR-FIXED-ASSETS` → parecer `luminaris-accounting-architect` → forks **com recomendação = ratificados por delegação**, sem recomendação voltam ao dono → `sessao-planejamento` | Anexo III IN 1.700 (corpus) semeado e editável por tenant; retificação ECD/ECF junto (master map §5) | ADR Accepted + BRIEF |
| 11 | **Pedido ao contador** | `luminaris-contador-liaison` (monta; **dono envia**) | linhas novas: contas de encargo pago/recebido e desconto (F7 §5) · 4 exceções PIS/COFINS + monofásico (F-X6-3 b) · linhas `E` do parque (ECF §4 item 7) · itens 1/1b (X7) | pacote de pedido |
| 12 | **Fold** | `sessao-integracao` docs (fold) | master map §5.1/§7.1 + grafo: R5..R10 fechados, X6/F7 estados, **corrigir** "parser CNAB 240 retorno ✅" → "parser de extrato CNAB-E; retorno de cobrança inexistente (F-F7-1)" | régua atualizada |

Regras de fila: nó com spec + forks ratificados antes de nó que precisa de BRIEF; BRIEF antes de ADR;
docs-only (3–5, 10–12) pode intercalar enquanto um PR de código espera CI/review. Passos 7 e 6 têm **stop
humano** explícito (forks / B-4) — não os pule nem os "assuma".

### Não fazer

- **Não** ratificar fork nenhum (F-F7-1..5, forks de C11/C12/C6b, forks de C8 sem recomendação).
- **Não** tocar `reconcile_pending_items`, `ReconcilePendingService`, `canManageReconcilePending` (R9).
- **Não** reabrir P-IA (R10), **não** contratar/desenhar port do Serpro (R5), **não** abrir X10b/emissão
  (espera D-NFSE + D1f + D5), **não** montar aparato de auditoria (bancada desligada 2026-08-09).
- **Não** escrever no perímetro zero-diff além do símbolo único da emenda R7.
- **Não** preencher evidência, marcar desfecho ou assinar runbook (B-4, H1, H2, H3, M2).

### Gates de envio por PR (OPS-001)

`cd server && npx tsc --noEmit && npm run test:integration` · `cd my-app && npx tsc --noEmit` ·
`npm run docs:generate` diff vazio se tocou rota/DTO · `npm run smoke:migration` se trouxe migração ·
snapshot de DTO regenerado, allowlist de auditoria, guard de path-count · review independente PASS ·
relatório com as 5 perguntas do OPS-001 respondidas e o caso adversarial nomeado.

Comece pelo **passo 0** e reporte o estado dele antes do passo 1.

---

## Estado no momento da escrita (verificado 2026-09-14)

- `main` = `7e88fe60` (#317). PRs docs abertos: **#318** (`claude/p0-boot-b4-sql-2ec2d1`), **#319**
  (`claude/decisoes-forks-ratificacoes-804e65`, `6c35c3b1`, MERGEABLE, CI parcial).
- PR de código aberto: **#315** (`d6849094`, CI verde, review PASS, `CONFLICTING` com main).
- Régua 41/57 (fold 14/09). Gates humanos abertos: B-4, X2, H1 2ª passada, H2, H3, M2.
