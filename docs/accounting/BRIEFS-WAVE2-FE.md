# BRIEFS-WAVE2-FE

> **Nota do registrador (2026-08-31):** registro histórico congelado — este é o BRIEF tal como
> existia no momento da execução (2026-08-30); status de fork, "pendente"s e achados aqui **podem
> estar desatualizados**. Os desfechos reais (o que de fato foi mergeado, o que ficou em andamento,
> o que foi diferido) estão em
> [`PRE-DADOS-REAIS-2026-08-30.md`](./PRE-DADOS-REAIS-2026-08-30.md).

## Contexto fixo

- **Item a planejar:** BRIEF-W2-G — tela de encerramento de exercício (`closeExercise`), 2ª
  onda de FE pré-dados-reais.
- **Autorização:** "Pode disparar" + fork F7(agora) ratificado via `AskUserQuestion` em
  2026-08-30 (citação do orquestrador que abriu esta sessão de planejamento; a decisão em si
  não está gravada em `docs/`, é sinal do dono nesta conversa).
- **Insumos existentes (lidos nesta sessão, não de memória):**
  - `server/src/controllers/closingController.ts` — `POST /api/accounting/closing/exercise`.
  - `server/src/features/accounting/dtos/ClosingDto.ts` — `CloseExerciseSchema` (`.strict()`,
    `{unitId, year}`).
  - `server/src/features/accounting/services/ExerciseClosingService.ts` — lógica de
    fechamento (128 linhas, lida por inteiro).
  - `server/src/features/accounting/models/closing.ts` — `CLOSING_SOURCE_TYPE`,
    `closingSourceId`, `reversedClosingSourceId`.
  - `server/src/lib/errors.ts` — `AppError`/`ValidationError`/`ForbiddenError`/
    `AccountingPeriodNotOpenError` (status/errorCode).
  - `server/src/lib/apiUtils.ts` — `handleApiError` (envelope `{code, message, details?}`).
  - `server/src/routes/docs.paths.ts:2303-2334` — spec OpenAPI já commitada da rota.
  - `server/prisma/schema.prisma:485-522` — `model JournalEntry`.
  - `docs/accounting/ACCOUNTING-MASTER-MAP.md:458` — linha do Bloco A confirmando
    `BE-INCR-SPED-APURACAO` **mergeado** (PR #63) e que só o `POST` existe hoje, sem FE.
  - `my-app/features/accounting/AccountingView.tsx` — tabs (`periodos` na linha 33/195-197).
  - `my-app/features/accounting/components/PeriodsPanel.tsx` — 242 linhas, lidas por inteiro.
  - `my-app/features/accounting/components/__tests__/PeriodsPanel.test.tsx` — teste irmão real
    (shim `globalThis.React` nas linhas 1-7).
  - `my-app/features/accounting/components/CreatePayableModal.tsx` — 342 linhas, padrão de
    modal completo (Modal canônico, `resolveErrorWithCode`, `isDirty`, footer com 2 botões).
  - `my-app/components/ui/Modal.tsx` — Modal canônico (`themeColor`, `footer`, `maxWidth`,
    `isDirty`, `rounded-3xl` no wrapper).
  - `my-app/lib/services/accounting.service.ts` — `accountingService` (linhas 182-196
    `AccountingPeriod`/`PeriodStatus`; 71-96 `JournalEntry`; 499-650 métodos, inclui
    `listPeriods`/`seedYear`/`reverseEntry`).
  - `my-app/features/accounting/lib/resolveError.ts` — `resolveErrorWithCode` canônico (14
    call sites, não reinline).
  - `my-app/lib/api/api-client.ts:90-101` — o objeto lançado é `{...serverBody, status}`, ou
    seja `{code, message, details?, status}` (server NÃO manda `success`/`error` nesse
    envelope de erro — só `message`+`code`).
  - `my-app/public/locales/{pt,en}/accounting.json` — 793=793 chaves hoje; seção `periods.*`
    lida por inteiro nos dois idiomas.
  - `server/src/features/accounting/policies/AccountingPolicy.ts:14-16` — `canPost` =
    `!!scope.actorUserId` (sem gate de role hoje).
  - `server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts:84` —
    `RETAINED_EARNINGS_CODE = '2.3.1'`.

- **Nós vizinhos no grafo (confirmados por leitura, não só pelo cbm):**
  - `PostingService.postEntry` — idempotência por `(sourceType, sourceId)`: um re-close
    retorna o **mesmo** `JournalEntryWithPostings`, sempre com HTTP 201 (linhas 300-310 de
    `PostingService.ts`). **Não existe flag "foi idempotente" na resposta.**
  - Reabertura documentada no controller e no ADR: `POST /accounting/reverse`
    (`accountingService.reverseEntry`, já existe no client) — mas nenhuma tela hoje dispara
    isso especificamente para uma closing entry.

## Onde vive

Aba **Períodos** do painel de contabilidade (`AccountingView.tsx`, tab `periodos`,
`PeriodsPanel unitId={unitId}`). O botão entra na mesma linha do seletor de ano/`Semear`
(`PeriodsPanel.tsx` linhas 84-107). Reuse canônico:
- **Modal:** `my-app/components/ui/Modal.tsx` (o mesmo que `CreatePayableModal.tsx` usa —
  `themeColor`, `footer`, `maxWidth="max-w-md"` chega, é um formulário de 1 confirmação, sem
  campos).
- **Service:** método novo em `my-app/lib/services/accounting.service.ts` (não um arquivo
  novo — `closeExercise` é irmão direto de `seedYear`/`reverseEntry`, mesmo arquivo, mesma
  seção "Accounting periods").
- **Erro:** `resolveErrorWithCode` de `my-app/features/accounting/lib/resolveError.ts`
  (padrão idêntico ao `periodError` de `CreatePayableModal.tsx:126-131`).

## Fluxo

1. Botão **"Encerrar exercício {{year}}"** ao lado do seletor de ano em `PeriodsPanel`.
2. Clique → abre `CloseExerciseModal` (Modal canônico) mostrando: unidade (nome/id já
   disponível no `AccountingView`), ano selecionado, e o efeito por extenso — **não** um aviso
   genérico: "Esta operação lança um encerramento real no razão: zera as contas de Receita e
   Despesa do exercício {{year}} contra Lucros ou Prejuízos Acumulados (conta 2.3.1)." (texto
   fixo — não há endpoint de prévia/dry-run que devolva os valores exatos antes da postagem;
   ver "Achados fora de escopo").
3. Confirmar → `accountingService.closeExercise(unitId, year)` → `POST
   /accounting/closing/exercise`.
4. **Sucesso (inclui o caso idempotente — mesma resposta HTTP, ver nó vizinho acima):** modal
   mostra "Exercício encerrado." + `Lançamento nº {{entryNumber}} — exercício
   {{fiscalYear}}` (dados reais da resposta, `entryNumber`/`fiscalYear` de `JournalEntry`),
   botão fecha o modal.
5. **Erro 422 `ACCOUNTING_PERIOD_NOT_OPEN`:** caixa de erro com a mensagem do servidor (pt,
   hardcoded no backend — mesma limitação já herdada por `CreatePayableModal`, não é
   corrigida aqui).
6. **Erro 400 `VALIDATION_ERROR`** (sem saldo de resultado a encerrar): mesma caixa de erro,
   mensagem do servidor.
7. **Erro 403 `FORBIDDEN`**: mesma caixa (hoje inatingível via UI, `canPost` só olha
   `actorUserId`, mas o client tem que tratar por completude — mesmo padrão dos outros
   modais).

## Checklist numerado de comportamentos

1. **Botão "Encerrar exercício {{year}}"** na aba Períodos, ao lado do seletor de
   ano/`Semear`. Direto — mesma posição/estilo do botão vizinho (`PeriodsPanel.tsx:96-107`).
2. **Visibilidade do botão** — FORK 1.
3. **`CloseExerciseModal`** novo componente, Modal canônico, sem campos de formulário — só
   confirmação. Direto. Contrato de props abaixo.
4. **Texto do efeito no corpo do modal** cita o ano, a unidade e a conta `2.3.1` por nome.
   Direto (dado estático, já lido do fixture/ADR).
5. **Chamada real ao confirmar** → `accountingService.closeExercise`. Direto.
6. **Estado de sucesso** mostra `entryNumber`+`fiscalYear` reais da resposta. Direto.
7. **Cópia do sucesso no caso idempotente (re-close)** — FORK 2.
8. **Erro 422** (`ACCOUNTING_PERIOD_NOT_OPEN`) exibido via `resolveErrorWithCode`. Direto.
9. **Erro 400** (`VALIDATION_ERROR`, sem saldo) exibido via `resolveErrorWithCode`. Direto.
10. **Erro 403** (`FORBIDDEN`) exibido via `resolveErrorWithCode`. Direto.
11. **i18n pt/en com paridade** — toda chave nova em `periods.closeExercise.*` entra nos dois
    arquivos na MESMA mudança; contagem sobe simétrica (793→793+N em cada locale, checar com
    o mesmo script de contagem usado nesta sessão). Direto.
12. **`neutral-*`/`rounded-2xl`** em todo elemento novo (botão, modal usa `rounded-3xl` do
    Modal canônico, banner de sucesso `rounded-2xl` como os cards de mês). Direto.
13. **Teste vitest** para `CloseExerciseModal` (e para o botão/estados novos em
    `PeriodsPanel`) com shim `globalThis.React` se o componente novo não importar `React`
    explicitamente — replicar `PeriodsPanel.test.tsx:1-7` linha a linha (comentário incluso:
    "jsx:'preserve' + esbuild classic runtime"). Direto.
14. **Verificação `withAuth`/guarda de auth contra build de produção** — `/accounting` usa
    guarda própria (`useAuth` + `router.replace`, não o HOC `withAuth` literal —
    `my-app/pages/accounting/index.tsx:19-27`); ainda assim, gate do projeto exige checar
    contra `npm run build` (não `next dev`), não contra o mecanismo específico. Direto.
15. **Quem aciona o botão** — FORK 3.

## Contratos (esboço)

### Service (`my-app/lib/services/accounting.service.ts`, mesma seção "Accounting periods")

```ts
// Reusa o type JournalEntry já exportado (linhas 71-96) — a resposta de closeExercise
// é exatamente esse shape (JournalEntryWithPostings no backend == JournalEntry no client).

/** Close the result of a fiscal year (encerramento do exercício). Idempotent per year —
 *  a re-close returns the SAME entry (HTTP 201 nos dois casos, sem flag distintiva). */
async closeExercise(unitId: string, year: number): Promise<JournalEntry> {
  const res = await apiClient.post<ApiEnvelope<JournalEntry>>(
    '/accounting/closing/exercise',
    { unitId, year },
  );
  notify('Exercício encerrado.', 'success', 'Contabilidade');
  return res.data;
}
```

### Modal (`my-app/features/accounting/components/CloseExerciseModal.tsx`, novo arquivo)

```ts
export interface CloseExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  /** Ano do exercício a encerrar — já selecionado no seletor da PeriodsPanel. */
  year: number;
  /** Chamado com o JournalEntry retornado (novo OU idempotente — ver FORK 2). */
  onSuccess: (entry: JournalEntry) => void;
}
```

Estado interno: `isSubmitting`, `error: string | null`, sem campos de formulário — `isDirty`
sempre `false` (não há edição a perder).

### i18n — chaves novas propostas (`periods.closeExercise.*`, pt + en, mesma estrutura)

```jsonc
// pt
"periods": {
  "closeExercise": {
    "button": "Encerrar exercício {{year}}",
    "modal": {
      "title": "Encerrar exercício {{year}}",
      "description": "Esta operação lança um encerramento real no razão: zera as contas de Receita e Despesa do exercício {{year}} contra Lucros ou Prejuízos Acumulados (conta 2.3.1).",
      "confirm": "Encerrar",
      "cancel": "Cancelar"
    },
    "submitting": "Encerrando…",
    "success": {
      "title": "Exercício encerrado.",
      "entryInfo": "Lançamento nº {{entryNumber}} — exercício {{fiscalYear}}",
      "close": "Fechar"
    },
    "error": {
      "generic": "Erro ao encerrar o exercício."
    }
  }
}
```
```jsonc
// en — mesma árvore, tradução real (não decalque), espelhando o tom de periods.error.* hoje
"periods": {
  "closeExercise": {
    "button": "Close fiscal year {{year}}",
    "modal": {
      "title": "Close fiscal year {{year}}",
      "description": "This posts a real closing entry to the ledger: it zeroes the Revenue and Expense accounts of fiscal year {{year}} against Retained Earnings (account 2.3.1).",
      "confirm": "Close",
      "cancel": "Cancel"
    },
    "submitting": "Closing…",
    "success": {
      "title": "Fiscal year closed.",
      "entryInfo": "Entry #{{entryNumber}} — fiscal year {{fiscalYear}}",
      "close": "Close"
    },
    "error": {
      "generic": "Failed to close the fiscal year."
    }
  }
}
```

Erros 422/400/403 usam a mensagem do servidor (`resolveErrorWithCode`), não uma chave de
i18n dedicada por código — mesmo padrão de `CreatePayableModal` (só o `error.failed` genérico
é chave i18n; a mensagem real vem do backend). `error.generic` acima é só o fallback quando
`resolveErrorWithCode` não acha `message`/`error` no objeto lançado.

## Forks pendentes de ratificação

### FORK 1 — Condição de visibilidade do botão "Encerrar exercício"
- **Caminho A:** botão sempre visível ao lado do seletor de ano, independente do status dos
  períodos do ano — mesma regra do botão "Semear" vizinho.
- **Caminho B:** só aparece quando os 12 períodos existem E dezembro está `OPEN`
  (pré-checagem no client, evita o clique que sabidamente daria 422).
- **Recomendação:** Caminho A. O backend já é a autoridade do gate de período
  (`assertPeriodOpen`/`assertPeriodOpenTx`); duplicar essa regra no client cria uma segunda
  cópia que pode divergir se o mês-gate mudar (hoje é dezembro, fixo por `fiscalYearFrom`).
  Mostrar sempre + deixar o 422 responder com mensagem legível é mais barato e não fica
  desatualizado.
- **Status:** RATIFICAÇÃO PENDENTE.

### FORK 2 — Cópia de sucesso no caso idempotente (re-close)
- **Caminho A:** uma única mensagem neutra ("Exercício encerrado.") cobre tanto o fechamento
  novo quanto o hit idempotente — a resposta HTTP é idêntica nos dois casos (mesmo
  `JournalEntryWithPostings`, sempre 201, sem flag).
- **Caminho B:** pré-checar antes de abrir o modal (ex.: listar entries por
  `sourceType=closing`+`sourceId=String(year)`) para saber se já existe e trocar o rótulo do
  botão para "Reabrir exercício" (chamando `reverseEntry`) em vez de "Encerrar".
- **Recomendação:** Caminho A para este incremento. Caminho B expande o escopo para o fluxo
  de REABERTURA completo (`POST /accounting/reverse`), que é outro comportamento — fora do
  que esta autorização cobre (só `closeExercise`). Registrar B como candidato a um
  BRIEF-W2-H "reabertura de exercício" separado, se o dono quiser essa tela.
- **Status:** RATIFICAÇÃO PENDENTE.

### FORK 3 — Quem aciona o botão
- **Caminho A:** qualquer usuário autenticado com acesso à aba Contabilidade — espelha
  `AccountingPolicy.canPost` hoje (`!!scope.actorUserId`, sem gate de role).
- **Caminho B:** reservar visualmente para uma role futura (ex. "Contador"/"Admin").
- **Recomendação:** Caminho A. Não existe role diferenciada em `AccountingPolicy` hoje; um
  gate de UI sem gate correspondente no backend é decorativo — o botão sumiria mas a rota
  continuaria aceitando POST de qualquer usuário autenticado do scope.
- **Status:** RATIFICAÇÃO PENDENTE.

## Pendências de validação externa

Nenhuma. A regra contábil do encerramento (zerar Receita/Despesa contra 2.3.1) já está
implementada, mergeada e ratificada via ADR-INCR-SPED-APURACAO (`ACCOUNTING-MASTER-MAP.md`
linha 458) — este BRIEF só cobre a tela que chama um endpoint já existente, nenhuma decisão
fiscal/contábil nova é introduzida.

## Insumos ausentes

Nenhum. Todo comportamento do checklist foi cravado lendo o controller, o service, o DTO, o
policy, o schema Prisma, o client HTTP, o painel vizinho e seu teste, e as duas árvores de
locale — sem inferência sobre código não lido.

## Achados fora de escopo

- **Sem endpoint de prévia/dry-run** para o encerramento: `ExerciseClosingService` não expõe
  um modo "calcular sem postar" (diferente de `PostingService.validateEntry`, que existe para
  lançamentos manuais). O modal desta tela não pode mostrar os valores exatos que serão
  lançados antes de confirmar — só o texto fixo do efeito. Se o dono quiser uma prévia com
  valores, é mudança de backend, fora desta autorização.
- **Reabertura de exercício** (estornar a closing entry) não tem tela dedicada hoje — o
  caminho existe (`POST /accounting/reverse`, já client-side via `reverseEntry`), mas nenhuma
  UI o aciona especificamente para uma entrada `sourceType='closing'`. Candidato a incremento
  separado (ver FORK 2, Caminho B).
