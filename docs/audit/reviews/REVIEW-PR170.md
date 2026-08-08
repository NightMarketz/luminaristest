# Revisão independente — PR #170 (FE-INCR-APPROVAL)

- **Revisor:** agente revisor isolado (worktree próprio, nenhuma participação na autoria)
- **Data:** 2026-08-07
- **PR:** #170 — merge `48cdf431` (branch `claude/eager-gagarin-9f060d`); revisado em `18b14b12`, que contém o merge
- **Worktree de revisão:** `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rv-170` (detached em `18b14b12`)
- **Lentes recebidas:** (1) regressão de raio — a varredura tocou 9 painéis, o pedido era 1; (2) segurança/consistência de dinheiro e estado

---

## 2. Veredito

**`revisado_com_ressalva`.** O raio grande **não** é o defeito: contra a minha própria previsão, a varredura do `t` instável está travada por barreira em **8 dos 9 painéis** (mutação minha derrubou 9 testes), e o round-trip de dinheiro no editor reusado é **exato** nos 6 valores que testei. O risco principal está noutro lugar: **o retry depois de um 409 CAS reenvia a versão velha** — provado por sonda minha (`expectedVersion: 5` na 2ª chamada, servidor já em 6) —, ou seja, a mensagem "a lista foi recarregada — confira e tente de novo" promete um retry que **nunca pode dar certo** naquele modal.

Se eu pudesse reprovar, **não** reprovaria: nenhum achado corrompe dinheiro nem escritura, e os dois piores (retry-teimoso e perda de dimensões) já saem do sistema por caminho **alto e ruidoso** (409 do servidor / aviso âmbar na tela). A ressalva é por **4 achados não corrigidos**, sendo um deles um **erro de tipo novo introduzido por este PR** que hoje nenhum gate lê.

Estou **proibido de corrigir** e não corrigi nada. Worktree `rv-170` confirmado limpo (`git status --porcelain` vazio) ao fim — ver §10.

---

## 3. O que reexecutei

Tudo abaixo rodei eu, no meu worktree, antes de qualquer mutação (isto é o **controle** exigido: prova de que o baseline é verde no MESMO harness).

| Comando | Saída |
|---|---|
| `cd my-app && npx vitest run` | `Test Files 29 passed (29)` · `Tests 136 passed (136)` · 32,45 s |
| `cd my-app && npx tsc --noEmit` | limpo, exit 0 |
| **`cd my-app && npx next build`** | **PASS.** `✓ Generating static pages (6/6)`; rota `ƒ /accounting  47.4 kB / 206 kB First Load JS`. **Não** houve erro de `.env` — não existe `.env` em `my-app/` e o build não pediu nenhum. Nada contornado em silêncio. |
| `TZ=America/Sao_Paulo npx vitest run` (paridade com o CI, que pina UTC-3) | `29 passed / 136 passed` — idêntico |
| `npm run test:types` (`tsc -p tsconfig.vitest.json --noEmit`) | **5 erros** — ver Achado N3 |

Contagem de i18n **feita por mim**, não lida do relatório do autor (script próprio, achatando as chaves aninhadas em caminhos e comparando conjunto a conjunto, não contagem):

```
pt keys 785 · en keys 785
only in pt: []   only in en: []
approvals.* → pt 51 · en 51
```

Paridade **estrutural**, não só numérica: os 785 caminhos achatados são o mesmo conjunto dos dois lados. Cruzei também as 702 chaves `t('…')` estáticas de `features/accounting` contra o JSON: as 11 "faltantes" são artefato do meu regex sobre chave dinâmica (`t(\`periods.status.${s}\`)` cortado no `$`), e o único "órfão" (`approvals.error.load`) é chamado via `tRef.current(...)`, que o meu padrão `\bt\(` não casa. **Zero chave faltante e zero órfã reais.**

---

## 4. Minhas próprias mutações

Protocolo em todas: `cp arquivo arquivo.bak` → mutar → conferir `git diff --numstat` → rodar → `mv -f .bak` de volta → conferir numstat vazio. **Nenhum `git checkout` de arquivo rastreado.** Nenhuma foi reexecução de comando do autor — as 4 mutações e as 3 sondas são minhas.

| # | Mutação (minha) | `git diff --numstat` | Resultado | Leitura |
|---|---|---|---|---|
| **M1** | `useAccountingT.ts`: trocar `useRef(t)` + `tRef.current = t` por `const tRef = { current: t }` — **identidade nova a cada render** | `1 2 my-app/features/accounting/lib/useAccountingT.ts` | **MORTA** — `9 failed / 127 passed`, 9 arquivos de teste vermelhos | **Refuta a minha hipótese de trabalho.** O alvo era mostrar que a varredura nos 8 painéis colaterais estava sem barreira. Não está: morreram AP, AR, ChartOfAccounts, Counterparties, Dimensions, JournalEntries, Reconciliation, EntryApprovals **e** o teste do próprio hook. Motivo real, lido na saída: `expected "spy" to be called 1 times, but got 3 times` — o autor plantou `expect(<fetch>).toHaveBeenCalledTimes(1)` em **cada** painel tocado. A barreira do raio existe e é do tipo certo (conta chamadas, que é a consequência do laço). |
| **M2** | `useAccountingT.ts`: remover só a linha `tRef.current = t;` — ref estável, mas **leitura congelada no 1º render** | `0 1 …/useAccountingT.ts` | **MORTA por 1 teste só** (`useAccountingT.test.tsx > REMÉDIO`), `135 passed` | Barreira **fina**: a propriedade "current acompanha o `t` deste render" só é observada pelo teste do próprio hook. Nenhum painel percebe, porque em vitest não há instância i18next e todo texto vem do fallback inline — os 8 painéis renderizariam igual com o `t` congelado. Consequência real fica só na troca de idioma em runtime. Aceito, mas registrado: o raio tem barreira para *identidade*, não para *leitura*. |
| **M3** | `EntryApprovalsPanel.runAction`: `approve(entry.id, { unitId, expectedVersion: entry.version })` → `expectedVersion: 0` | `1 1 …/EntryApprovalsPanel.tsx` | **SOBREVIVEU** — `21 files / 91 tests passed` | O `expectedVersion` do comando **approve** — o único que move o razão — **não tem barreira de teste no frontend**. O teste do autor prende a versão em `submitDraft`, `reject` e `updateDraft`; no approve o único teste que existe mocka a rejeição 409 e nunca olha o payload. |
| **M4** | `entryApprovals.service.ts`: `approve` passa `{ unitId: payload.unitId }` — **`expectedVersion` sai do fio** | `1 1 my-app/lib/services/entryApprovals.service.ts` | **SOBREVIVEU** — `29 files / 136 tests passed` | Confirma M3 na camada de baixo. O serviço novo (133 linhas) é **mockado por inteiro em todo teste que o toca** — mutation score dele é 0 no frontend. |
| **Sonda A** *(arquivo de teste meu, temporário, apagado depois)* | 409 CONFLICT no approve; `listPending` devolve versão 6 na 2ª leitura; **2º clique** em "Aprovar e postar" | arquivo não rastreado, removido | **BUG CONFIRMADO** — `expected { unitId:'u1', expectedVersion:5 } to deeply equal { …, expectedVersion:6 }` | Achado N1 abaixo. |
| **Sonda B** *(minha, temporária)* | round-trip de dinheiro `centavos → centsToInput → input → parseBrl → centavos` na edição de rascunho, 6 valores | — | **PASSOU nos 6** | Achado nenhum — ver §6, alegação (f). |
| **Sonda C** *(minha, temporária)* | `updateDraft` carrega chave `dimensions` nas linhas? | — | **NÃO** — `[{"accountCode":"4.1.1","debitCents":150000,"creditCents":0},{…}]` | Confirma a alegação (e) do autor. Achado N2. |

Restauração conferida após cada uma: `git diff --numstat` vazio.

---

## 5. Alegações que caíram

**(a) parcialmente — "CAS por `version` reenviado; 409 `CONFLICT` vira mensagem própria".**
A parte "reenviado" é verdadeira em todos os 4 caminhos de mutação (li o código: `submitDraft`, `approve`, `reject` em `runAction`; `updateDraft` no `submit` do editor; `createDraft` corretamente sem versão). O que cai é o **contrato que a mensagem promete**: o texto diz *"A lista foi recarregada — confira e tente de novo"*, e a sonda A prova que "de novo" **ali mesmo** reenvia a versão velha para sempre. Cai também a **cobertura**: M3+M4 mostram que a perna do approve não tem nenhum teste que a segure, nem no painel nem no serviço.

**Minha previsão sobre (d) caiu — a favor do PR.** Eu apostei que a varredura nos 8 painéis não-alvo estava sem barreira e que só o teste do hook morreria. M1 matou 9 arquivos. Registro isto explicitamente porque é o caso adversarial que eu montei contra o PR e que **o PR venceu**.

---

## 6. Alegações que sobreviveram

**(b) "`PendingApproval` fora de `LEDGER_STATUSES` → rascunho não entra em BP/DRE/SPED" — SOBREVIVE, verificada por varredura minha do backend, não pela palavra do autor.**
`server/src/features/accounting/models/ledgerStatus.ts` → `['Posted','Reconciled','Reversed']`. Enumerei **todo** consumidor e **toda** leitura de posting/entry no `server/src` (grep por `prisma.posting.*` / `prisma.journalEntry.*`, por literal `'Posted'`, e por `not:'Draft'`/`notIn`):
- os 9 agregadores de relatório (`AccountingReportService`, `CashFlowReportService`, `DailyJournalReportService`, `DimensionReportService`, `ExerciseClosingService`, `SpedGenerationService`, `SpedEcfGenerationService`, `TieOutDiagnosticService`, `accountingSyncReconcile.job`) passam **a constante**, nunca literal;
- o único `findByAccount` sem filtro de status (`PostingRepository:44`) tem dois chamadores: `AccountingReportService.accountLedger`, que filtra com `LEDGER_STATUSES.includes(head.status)` linha a linha (`:391`), e a guarda de delete de conta em `PostingService:691`, que é **conservadora de propósito** (conta qualquer perna);
- `ReconciliationRepository` usa `'Posted'` / `['Posted','Reconciled']` — mais restrito que `LEDGER_STATUSES`, portanto também exclui `PendingApproval`.
Não achei uma consulta de relatório que escape da constante. **Nenhum rascunho/pendente alcança BP/DRE/SPED.**

**(c) "i18n pt == en" — SOBREVIVE, contada por mim:** 785 = 785, mesmo **conjunto** de caminhos achatados (não só mesma contagem), subárvore `approvals.*` 51 = 51, zero chave usada sem entrada, zero órfã. Ressalva de completude em N4.

**(d) "a varredura do `t` nos 9 painéis" — SOBREVIVE.** M1 é a prova: a técnica canônica está protegida em cada painel tocado por uma asserção de contagem de fetch. Além disso, li os 9 diffs um a um: são **mecânicos e idênticos** (`useTranslation` → `useAccountingT`; `t(...)` → `tRef.current(...)` **apenas** dentro de `catch` de fetch; `t` → `tRef` no dep array). Não há mudança de namespace (`useAccountingT` chama `useTranslation('accounting')`, o mesmo de antes), não há mudança de fallback (o 2º argumento inline foi preservado em todas as chamadas movidas), e o número de fetches na carga **diminui ou fica igual, nunca aumenta** — que é o sentido seguro. O `t` de render continua vindo do hook e continua reativo.

**(f) "as +80 linhas do `JournalEntryModal` não reabriram nada de dinheiro" — SOBREVIVE.** O `parseBrl` canônico não foi tocado (nem uma linha no diff). A superfície nova de dinheiro é `centsToInput` (`(cents/100).toFixed(2).replace('.', ',')`) alimentando o `parseBrl` existente. Medi o round-trip **pelo caminho real** (render do editor + clique em Salvar + leitura do payload que sai), não por cópia da função:

| centavos de entrada | valor exibido no input | centavos que saem |
|---|---|---|
| 123456 | `1234,56` | **123456** |
| 50 | `0,50` | **50** |
| 1 | `0,01` | **1** |
| 100000000 | `1000000,00` | **100000000** |
| 999 | `9,99` | **999** |
| 2000000 | `20000,00` | **2000000** |

Exato nos 6. O footgun histórico do `parseBrl` (ponto como separador de milhar → 100×) **não** é alcançável por aqui: `centsToInput` só emite vírgula decimal e nunca emite ponto de milhar, e o ramo `trimmed.includes(',')` do `parseBrl` remove pontos antes de converter. Os casos que o pedido citou (`1.234,56`, `1234.56`, `,5`, vazio) já são cobertos por `parseBrl.test.ts` (12 testes, verdes), e nenhum deles entra por este caminho novo.

---

## 7. Achados novos (NÃO corrigidos — cada um com falsificador de uma linha)

### N1 — [ALTO] Retry depois do 409 CAS reenvia a versão velha, e a mensagem promete o contrário
`my-app/features/accounting/components/EntryApprovalsPanel.tsx:295-313`. No `catch` de `runAction`, o caminho `CONFLICT` faz `setActionError(...)` + `await fetchAll()` mas **não limpa nem atualiza `action`**. `action.entry` é o snapshot lido antes do clique; `fetchAll` só troca os arrays `drafts`/`pending`. O modal continua aberto com o botão de confirmar ativo, e a cópia diz *"A lista foi recarregada — confira e tente de novo"*. Verificado por execução (sonda A): 2ª chamada de `approve` sai com `expectedVersion: 5` com o servidor em 6 → 409 de novo, indefinidamente. A saída real é fechar em "Voltar" e reabrir — que a mensagem não menciona.
Grau: **verificado (executado)**. Impacto: usabilidade + confiança no comando, **não** corrupção — o servidor recusa em `.strict()` com `expectedVersion` obrigatório.
> **Falsificador:** mocke 409 depois sucesso, com `listPending` devolvendo versão 6, clique confirmar duas vezes e afirme `approve.mock.calls[1][1].expectedVersion === 6` — se passar, este achado é falso.

### N1b — [MÉDIO] Mesma classe, segundo sítio, sem nem a mensagem específica
`EntryApprovalsPanel.tsx:471-480` + `JournalEntryModal.tsx:253-257`. O `submit` injetado fecha sobre `editing.entry.version`; se `updateDraft` devolver 409, o `JournalEntryModal` mostra o texto cru do backend (`resolveError`), **não** refaz fetch e **não** tem cópia de conflito — e o próximo clique em "Salvar rascunho" reenvia a mesma versão. É exatamente o caminho F4 do ADR (rejeitar → editar → reenviar), ou seja, o fluxo desenhado.
Grau: **verificado por leitura** (o mecanismo idêntico está executado em N1).
> **Falsificador:** mocke `updateDraft` com 409 e mostre que a 2ª tentativa carrega versão diferente, ou que aparece a cópia "alguém alterou este lançamento".

### N2 — [MÉDIO] Editar um rascunho apaga as etiquetas de dimensão — confirmado ponta a ponta, e o alcance é maior do que a nota sugere
A alegação (e) do autor é **verdadeira** e eu medi o alcance dos dois lados:
- **Frontend** (sonda C): `updateDraft` sai com as linhas **sem a chave `dimensions`** — `toDraftValue` (`EntryApprovalsPanel.tsx:24-34`) não copia dimensão, e `toLines` (`JournalEntryModal.tsx`) inicia `dims: {}`.
- **Leitura**: `listEntries` inclui só `account: {code,name}` nas pernas — a dimensão **não vem** na resposta, então o frontend nem teria como restaurar.
- **Backend** (`EntryApprovalService.updateDraft:137-146`): `deleteByEntryId` + `writeLegs`; `PostingDimension.posting` é `onDelete: Cascade` → **as etiquetas somem**.
- **Alcance real**: `writeLegs` (`:426-447`) **grava** dimensões no `createDraft`, e o editor da aba Aprovações **oferece o seletor de dimensão na criação**. Logo o ciclo criar-com-dimensão → editar → perder é inteiramente reproduzível dentro da aba nova, no fluxo F4 (rejeitar/editar/reenviar) do próprio ADR. A mitigação é um aviso âmbar em texto, que depende de o operador ler e reetiquetar de memória.
Grau: **verificado (executado no FE, lido no BE)**.
> **Falsificador:** crie um rascunho com etiqueta de dimensão, edite-o e mostre `posting_dimensions` ainda povoada — ou mostre `updateDraft` enviando `dimensions`.

### N3 — [MÉDIO] O PR introduz um erro de tipo em teste, e nenhum gate lê esse tipo
`tsconfig.json` **exclui** `**/*.test.ts(x)`, então o gate do projeto (`npx tsc --noEmit`) nunca tipa os testes. Existe `npm run test:types` (`tsc -p tsconfig.vitest.json`) — e ele está **vermelho com 5 erros**, um deles **novo por causa deste PR**:
```
features/accounting/components/__tests__/JournalEntriesPanel.test.tsx(22,7): error TS2739:
  … is missing the following properties from type 'JournalEntryWithFullPostings':
  version, contentHash, createdById, submittedById, approvedById
```
São exatamente os 5 campos que o PR acrescentou como obrigatórios em `my-app/lib/services/accounting.service.ts`. Os outros 4 erros (`counterpartyId` em AP/AR, `unitId` em `PendingReport`, `downlevelIteration`) são pré-existentes — o PR não tocou nesses arquivos além de uma asserção. `.github/workflows/ci.yml` roda `lint:gate`, `build` e `npm test`, **nunca** `test:types`.
Grau: **verificado (executado)**.
> **Falsificador:** rode `cd my-app && npm run test:types` e mostre exit 0, ou mostre `test:types` num passo do `ci.yml`.

### N4 — [BAIXO/MÉDIO] O PR criou o status `PendingApproval` mas não estendeu os dois mapas de status da aba Lançamentos
`JournalEntriesPanel.tsx:45-58`: `STATUS_LABEL` e `STATUS_CLASS` têm 4 chaves (`Draft/Posted/Reconciled/Reversed`); `public/locales/{pt,en}/accounting.json → journalEntries.status` idem. O PR alargou a união `JournalEntryStatus` para incluir `'PendingApproval'`, e `listEntries` devolve **todos** os status (é disto que o próprio painel novo extrai os rascunhos). Consequência lida no código: a aba Lançamentos renderiza o token cru **`PendingApproval`**, sem tradução em nenhum dos dois idiomas, com o badge neutro de fallback — **visualmente indistinguível de um rascunho editável**, justamente a distinção que a torre maker-checker existe para fazer. Nota adjacente da mesma linhagem: `canReverse = !entry.reversedById && entry.status !== 'Reversed'` (`:128`) deixa "Estornar" **habilitado** sobre rascunho/pendente; o servidor recusa (`PostingService:447`, `status !== 'Posted'`), então é ruído, não dano — a classe é pré-existente (valia para `Draft`), mas este PR **multiplica a população** que cai nela ao tornar rascunhos rotineiros.
Grau: **verificado por leitura** (mapa de 4 chaves + fallback `: entry.status`, sem ambiguidade).
> **Falsificador:** renderize `JournalEntriesPanel` com uma entrada `status: 'PendingApproval'` e mostre um rótulo traduzido em vez do token cru.

---

## 8. O que ficou FORA — sem arredondar

1. **Não exercitei concorrência real de duas abas.** A ressalva do autor continua de pé e agora é minha também: todo o CAS foi visto por **mock**, incluindo a sonda A. Nunca houve dois navegadores contra o mesmo servidor. O que eu acrescento é que a sonda A prova o defeito **no cliente** (a versão que sai é a velha) — isso não depende do servidor —, mas o comportamento do 409 real, o texto que o backend devolve e a corrida de verdade continuam **não medidos**.
2. **Não rodei a suíte do backend.** Li `EntryApprovalService`, `EntryApprovalDto`, `PostingRepository`, `JournalEntryRepository`, `AccountingReportService`, `ledgerStatus.ts` e o `schema.prisma`, mas não executei um único teste de `server/`. A alegação (b) está verificada por **leitura exaustiva + grep enumerativo**, não por execução.
3. **Nenhum sign-off em navegador.** O `next build` passou, mas a tela está atrás de `withAuth` e eu **não abri a aba Aprovações**. Nada aqui é evidência visual: o layout, os estados de loading/erro, o modal em viewport pequeno e a leitura do aviso âmbar seguem sem verificação humana.
4. **Não medi o teto dos 200 registros.** O painel puxa `limit: 200` e filtra rascunho no cliente; o próprio código admite que numa unidade com mais de 200 lançamentos um rascunho antigo cai fora da página. Não construí o cenário.
5. **Não testei o caminho `createDraft`** (só o `updateDraft`). E não exercitei SoD ligado — `enforcesSegregationOfDuties` está OFF em single-user, então o auto-approve nunca foi barrado em nenhuma execução minha.
6. **Não avaliei acessibilidade nem i18n em runtime** (só a paridade estática dos arquivos). Em vitest não há instância i18next, então **todo** texto que eu vi veio do fallback inline em pt — nunca vi a tela em `en`.
7. **Sonda B cobriu 6 valores, não o espaço.** Não fiz property-based nem toquei o teto `MAX_CENTS` (Int32) por cima.

---

## 9. Meus próprios vieses, nomeados

1. **Viés de confirmação da hipótese que me deram.** Cheguei convencido de que "raio maior que o pedido = regressão", e M1 me desmentiu. Se eu tivesse parado na leitura do diff — 9 painéis mexidos, 1 pedido — teria escrito um achado falso. Só a mutação me corrigiu; registro isto porque a mesma pressa poderia ter me feito **inventar** um defeito de raio.
2. **Viés de mock.** Três das minhas quatro provas rodam sobre serviços mockados, o mesmo pecado que apontei no autor. Sonda A prova o cliente, não o sistema. Estou julgando o comportamento de rede a partir de um dublê que eu mesmo escrevi.
3. **Viés de superfície testável.** Achei o que a suíte alcança (contagem de chamadas, payload, tipos) e fui fraco onde a suíte não alcança: layout, i18n em runtime, autenticação, volume. Meu veredito é sistematicamente mais confiante sobre lógica do que sobre a tela — e é a tela que o usuário vê.
4. **Viés de leitura por gravidade.** Investi a maior parte do esforço no que soava a dinheiro (CAS, `parseBrl`, `LEDGER_STATUSES`) e passei rápido pelo que soava cosmético — N4 (o badge sem tradução) eu quase não olhei, e é o achado mais provável de aparecer para um operador no primeiro dia de uso.
5. **Viés de ambiente único.** Tudo em Windows/jsdom, uma vez em cada TZ. Não vi o comportamento em UTC além do default local, nem em CI.

---

## 10. Estado do worktree

`C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rv-170` → **`git status --porcelain` vazio** na verificação final, feita depois de restaurar M4 e de apagar o arquivo de sonda (`ZZ_reviewer_probe.test.tsx`, não rastreado). Todas as 4 mutações foram restauradas por `mv -f arquivo.bak arquivo` e cada restauração foi conferida com `git diff --numstat` vazio. **Nenhum `git checkout` de arquivo rastreado, nenhum `git add`, commit, push ou merge.** O `.next/` gerado pelo `next build` é ignorado pelo `.gitignore` e não aparece no status. Nada foi consertado; os 4 achados ficam abertos.

---

## Adendo do orquestrador — atribuição do `test:types` medida por bisseção

**Autor:** claude-opus-5, sessão orquestradora (2026-08-07) — terceira medição, nem autor nem o revisor acima.

O achado N3 afirma que `npm run test:types` está vermelho e que **1** dos erros é novo deste PR.
Confirmei por bisseção de um commit, que é a checagem que teria falhado se a atribuição estivesse errada:

| Árvore | `tsc -p tsconfig.vitest.json --noEmit` — arquivos com erro |
|---|---|
| `18b14b12` (com o #170) | `AccountsPayablePanel.test.tsx` · `AccountsReceivablePanel.test.tsx` · **`JournalEntriesPanel.test.tsx`** · `ReconciliationPanel.test.tsx` · `nextPublicEnvWiring.test.ts` — **5** |
| `48cdf431^1` (pai do #170) | os mesmos **menos** `JournalEntriesPanel.test.tsx` — **4** |

O erro novo é `TS2739`: o fixture de `JournalEntriesPanel.test.tsx` perdeu `version`, `contentHash`,
`createdById`, `submittedById` e `approvedById` de `JournalEntryWithFullPostings`. **O PR que introduziu
o CAS por `version` deixou o próprio fixture sem o campo `version`** — e como o `ci.yml` não roda
`test:types`, nada viu. `npx tsc --noEmit` (o gate que o projeto de fato cobra) sai **0** nas duas
árvores, porque `tsconfig.json` não inclui os testes: os dois comandos medem conjuntos diferentes.

Não corrigido — achado não triado (bloco 9 do AV-00).
