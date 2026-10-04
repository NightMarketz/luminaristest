# BRIEF — FE-INCR-ACCOUNTANT-GOVERNANCE (telas do contador responsável sobre o BE do #482 — nó GOV-CONTADOR)

> **Estado: BRIEF pronto, forks F-FE-GOV-1..4 ✅ RATIFICADOS 04/10** (questionário; F-FE-GOV-1 → **(b), contra a
> recomendação**; os outros 3 na recomendação — §5.1). Produzido por `sessao-planejamento` em 2026-10-03/04 contra
> `origin/main` **`0ace46a6`**. Não contém código de aplicação. **Implementação exige "executa" próprio do dono**
> (ORCH-006).

## 0. Cabeçalho

- **Item:** nó [[GOV-CONTADOR]] (`docs/plano/nos/GOV-CONTADOR.md`), "Falta: telas" do `estado_detalhe` de 03/10. É a
  linha "FE" do §6 de [`BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md`](BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md): *"telas de
  convite, aceite e encerramento, e o tratamento de `ACCOUNTANT_REQUIRED` e `REVIEWER_CRC_MISMATCH` nas telas de
  período e revisão. É nó vizinho (`FE-INCR-*`), com BRIEF e autorização próprios."*
- **Autorização:** dono, chat, 03/10/2026: *"Planeja os BRIEFs das telas e da política versionada do GOV-CONTADOR
  (dono, 03/10/2026) — sessao-planejamento. (1) FE: telas sobre o BE já mergeado no #482 (atribuição do contador,
  aceite, reabertura de período, sign-off/reject). Reuse canônico do my-app/CLAUDE.md. […] Forks novos vão para mim
  por questionário. Sem 'executa'. Consulta ao CFC fica fora (espera o M2, F-V1 c)."*
- **A autorização cobre exatamente este item?** Sim. Cobre as telas das quatro superfícies nomeadas e nada além. A
  tela da política versionada **não** entra aqui: o BE dela ainda não existe (BRIEF irmão
  [`BE-INCR-ACCOUNTING-POLICY-VERSION-brief.md`](BE-INCR-ACCOUNTING-POLICY-VERSION-brief.md)), e o FE dela é outro nó
  (§8). O F-GOV-1 (CRC-SP) e o F-V1 c (CFC) ficam fora.
- **Intenção (T1).** O objetivo não é "ter telas". É que o dono consiga **pôr um contador no escopo** e que o
  contador consiga **agir no livro do cliente** (reabrir, assinar, rejeitar, ler o objeto assinado) sem chamar a API
  à mão. Hoje o contador não tem por onde entrar: a tela de Contabilidade lista só as unidades do próprio usuário
  (`useAccountingData.ts:41-60`), e o contador não tem livro próprio (decisão do dono no #482, adendo do retorno).
- **Risco principal.** A tela do contador mostra dados de **outro** usuário. Se um painel chamar um handler que não
  está entre os 9 do F-GOV-7 (a+), o servidor resolve o escopo **do próprio contador**. O resultado é uma tela vazia ou
  um 404 enganoso, não um vazamento. Com o F-FE-GOV-1 (b), o modo cliente vive dentro do `AccountingView`, que monta 22
  abas. O item 8 restringe o que esse modo monta com uma lista de abas permitidas (aba nova fica escondida por padrão), e
  o item 13c prova isso. Em
  segundo lugar: o 400 `ACCOUNTANT_USER_NOT_FOUND` permite enumerar e-mails (GAP-MAP linha 85, por spec). A tela não
  agrava isso, mas também não o fecha.

## 1. Contrato consumido (fato consumado — `db3a4465`, #482)

Grau: **V** = lido em `0ace46a6`.

| Superfície | Rota | Corpo/consulta (tipo gerado) | Resposta | Evidência |
|---|---|---|---|---|
| Convite (dono) | `POST /api/accounting/accountant-assignments` | `InviteAccountantInput {unitId, accountingContactId, accountantEmail}` | 201 `AccountantAssignmentView` | `routes/accounting.ts:327`; `AccountantAssignmentDto.gen.ts` |
| Histórico do escopo (dono) | `GET …/accountant-assignments?unitId=` | `ListAccountantAssignmentsQueryInput` | `AccountantAssignmentView[]` | `:328` |
| Carteira (contador) | `GET …/accountant-assignments/mine` | — | `MyAccountantAssignmentView[]` (PENDING+ACTIVE, com `ownerEmail` e `ownerUserId`) | `:329`; `AccountantAssignmentDto.ts:80-84` |
| Aceite (contador) | `POST …/:id/accept` | `AcceptAccountantAssignmentInput {declaresWrittenContract: true}` | `AccountantAssignmentView` | `:330` |
| Encerramento (as duas partes) | `POST …/:id/end` | `EndAccountantAssignmentInput {reason}` (1..500) | `AccountantAssignmentView` | `:331` |
| Os 9 handlers delegados | listPeriods (`?ownerUserId` na query), openPeriod (`ownerUserId` no corpo), reopen, sign-off, reject (no corpo, DTO), list/get review (na query, DTO), getJob/download (`JobGovernanceQuerySchema`, na query) | `ownerUserId?: string` em cada `*.gen.ts` | igual a hoje | diff de `db3a4465` nos 3 controllers |

Erros nomeados que a tela tem de traduzir (o `handleApiError` devolve `code`, `apiUtils.ts:38`; o FE lê com
`resolveErrorWithCode`, `features/accounting/lib/resolveError.ts:26`):

| `code` | HTTP | Quando |
|---|---|---|
| `ACCOUNTANT_REQUIRED` | 403 | dono com atribuição ativa tenta reabrir, assinar ou rejeitar (`lib/errors.ts`, `AccountantRequiredError`) |
| `ACCOUNTANT_NOT_ASSIGNED` | 403 | contador manda `ownerUserId` de um par sem ACTIVE |
| `REVIEWER_CRC_MISMATCH` | 400 | CRC digitado no sign-off diverge do snapshot da atribuição (F-GOV-9 a) |
| `PERIOD_STATUS_CHANGED` | 409 | CAS do período (item 11 do BRIEF do BE) |
| `ACCOUNTANT_USER_NOT_FOUND` · `SELF_ASSIGNMENT` | 400 | convite |
| `ASSIGNMENT_PENDING_EXISTS` · `ASSIGNMENT_STATUS_CHANGED` | 409 | convite duplicado; corrida no aceite/encerramento |

**Precisa de prova (I):** que o `apiClient` do my-app propaga o `code` do corpo no objeto lançado. O comentário de
`resolveError.ts:7-10` diz que sim ("`{ ...serverBody, status }`"). O item 13a fixa isso num teste.

## 2. Inventário do FE conferido

| # | Fato | Evidência | Grau |
|---|---|---|---|
| E-1 | As unidades vêm da DynamicTable `units` **do usuário logado**. O contador não tem unidades e cai no estado vazio "sem unidade" | `hooks/useAccountingData.ts:41-60`; `AccountingView.tsx:184` | V |
| E-2 | `PeriodsPanel` mostra o erro com `err instanceof Error ? err.message : fallback`. O `apiClient` lança objeto puro, então hoje toda falha de transição vira o texto genérico | `PeriodsPanel.tsx:38,53,70`; `resolveError.ts:7-10` | mecanismo V; texto exibido I |
| E-3 | `PeriodsPanel` monta ações que **não** estão entre os 9 handlers: semear ano, fechar parcial, fechar definitivo, encerrar exercício | `PeriodsPanel.tsx:50,61-62,107-116,156-170` | V |
| E-4 | `ReviewPanel`/`ReviewDetailModal` chamam, além dos 9: `open`, `addFinding`, `resolveFinding`, `postAdjustment`, `replaceJobs`, `dataExchangeService.listJobs` (no `JobPicker`) e `accountingService.getAccounts` | `ReviewPanel.tsx:50,239`; `ReviewDetailModal.tsx:99,195-206` | V |
| E-5 | O detalhe da revisão **não** oferece download do par ECD/ECF. O F-GOV-7 (a+) delegou `getJob`/`download` justamente para o contador ler o que assina | grep `download\|getJob` em `ReviewDetailModal.tsx` vazio; `dataExchange.service.ts:143,190` | V |
| E-6 | O `SignOffModal` pede nome e CRC digitados livremente | `ReviewDetailModal.tsx:476-503` | V |
| E-7 | Os contatos do contador (`AccountingContact`, a fonte do CRC do convite) já têm tela: `DeliveryPanel` → `ContactsSection`, na aba Compliance | `DeliveryPanel.tsx:57-79,93`; `AccountingView.tsx:360-367` | V |
| E-8 | Canônicos disponíveis: `components/ui/Modal.tsx` (já usado por toda a revisão) e `GenericTable` (já usado em `FixedAssetsSection`, `LalurPanel`) | grep | V |
| E-9 | `/accounting` é a única página do módulo; o Navbar tem um link fixo para ela | `pages/accounting/index.tsx`; `components/layout/Navbar.tsx:198` | V |
| E-10 | `downloadArtifact(jobId, unitId, fileName)` monta a URL só com `unitId` | `dataExchange.service.ts:190-195` | V |

## 3. Checklist numerado (cada item testável sozinho)

> Gates do `my-app/CLAUDE.md`: reuse `Modal`/`GenericTable`; `neutral-*`, nunca `zinc-*`; cards `rounded-2xl`; corpo
> de escrita tipado pelo `.gen.ts` (nunca espelhar o DTO à mão); regra do mapper; `.gen.ts` nunca se edita; tela atrás
> de `withAuth` verificada em build de produção; `tsc` e `npm run test:types` limpos.

**Serviço e contexto**

1. **`lib/services/accountantAssignments.service.ts`** (novo, padrão de `accountingContacts.service.ts`): `invite`,
   `listByScope(unitId)`, `listMine()`, `accept(id)`, `end(id, reason)`. Corpos tipados por
   `@/types/contracts/accounting/AccountantAssignmentDto.gen`. As views de resposta (`AccountantAssignmentView`,
   `MyAccountantAssignmentView`) são escritas à mão no serviço, no padrão do `AccountingScopeSettings`
   (`accounting.service.ts:177`, "resposta à mão"), porque o snapshot gera só os schemas de entrada.
2. **`ownerUserId` opcional nos serviços dos 9 handlers.** `accountingService.listPeriods/openPeriod/reopenPeriod`,
   `accountingReviewService.list/get/signOff/reject` e `dataExchangeService.getJob/downloadArtifact` ganham um último
   parâmetro opcional `ownerUserId?: string`. Ausente, a chamada fica **byte a byte igual** à de hoje (query/corpo sem a
   chave). Na query, entra via `URLSearchParams`; no corpo, pelo campo do `.gen.ts`. Nenhum outro método do serviço
   aceita o parâmetro (a lista fecha nos 9, F-GOV-7 a+).
3. **Contexto de governança** (`features/accounting/governance/GovernanceScope.ts`): tipo
   `{ ownerUserId: string; unitId: string; ownerEmail: string; crcNumber: string; crcUf: string; assignmentId: string }`,
   montado a partir de uma linha ACTIVE do `/mine`. É passado como prop `governance?` aos painéis. **Direto:** prop, não
   React Context. São 2 painéis consumidores, e prop deixa o modo delegado visível na assinatura.

**Lado do dono**

4. **Seção "Contador responsável"** (`AccountantAssignmentSection.tsx`), montada na aba Compliance logo antes do
   `DeliveryPanel` (E-7), só no modo próprio (sem `governance`). Mostra:
   - a atribuição ACTIVE, se houver: nome do contato (cruzado pelo `accountingContactId` com a lista de contatos já
     carregada), CRC do snapshot, `activeFrom`;
   - a PENDING, se houver;
   - o histórico em `GenericTable` (status, contato, CRC, vigência, motivo do encerramento);
   - botões **Convidar** (desabilitado se já houver PENDING) e **Encerrar** (na ACTIVE e na PENDING).
5. **Modais do dono** (reusam `Modal`):
   - **Convidar:** select do contato (contatos ativos do escopo; vazio → texto apontando a seção de contatos logo
     abaixo) + e-mail do contador. Traduz `ACCOUNTANT_USER_NOT_FOUND`, `SELF_ASSIGNMENT`,
     `ASSIGNMENT_PENDING_EXISTS`.
   - **Encerrar:** `reason` obrigatório (1..500), com o aviso do F-GOV-10 (a)/F-GOV-11 (a): *"Encerrar devolve a você
     a reabertura e a assinatura de todos os períodos, inclusive os que este contador cobriu."*

**Lado do contador**

6. **Onde o contador trabalha: modo cliente dentro do `AccountingView`** (✅ **F-FE-GOV-1 → (b)**, ratificado
   04/10 contra a recomendação, §5.1). Passos:
   1. O `AccountingView` busca `accountantAssignmentsService.listMine()` uma vez, no mount. Erro ou lista vazia → a tela
      fica igual a hoje (dono sem carteira não vê nada novo).
   2. **Seletor de contexto** no cabeçalho, no lugar do select de unidade quando houver carteira: a primeira opção é
      "Meus livros" (as unidades de hoje, `useAccountingData`). Depois vem um grupo "Clientes que atendo" com cada
      ACTIVE do `/mine`, rotulada pelo F-FE-GOV-2 (a): `ownerEmail · unitId abreviado`.
   3. Escolher um cliente monta o `GovernanceScope` (item 3) e entra no **modo cliente**. Voltar a "Meus livros" sai.
   4. **Default:** usuário sem unidades (E-1) e com ACTIVE entra direto no modo cliente na primeira ACTIVE. Assim o
      contador não vê a tela vazia de hoje.
   5. **Convites pendentes:** com PENDING no `/mine`, um banner no topo lista os convites (`ownerEmail · unidade`), cada
      um com **Aceitar** (item 7). O banner aparece nos dois modos.
   6. **Encerrar pelo contador:** botão no cabeçalho do modo cliente, com o mesmo modal do item 5 e o texto do lado do
      contador.
   - **Sem** buscar `/mine` no Navbar (seria uma chamada a mais em toda página). O link fixo do Navbar para
     `/accounting` (E-9) já leva ao seletor.
7. **Aceite** (`Modal`): checkbox obrigatório *"Declaro que existe contrato escrito de prestação de serviços com este
   cliente"* → corpo `{ declaresWrittenContract: true }` (o tipo gerado é o literal `true`; o botão só habilita com o
   checkbox marcado). Texto curto citando a Res. CFC 1.590 arts. 1º/5º (F-GOV-8 a reforçada). Traduz
   `ASSIGNMENT_STATUS_CHANGED` ("o convite mudou; recarregue"). Aceitar recarrega o `/mine`; a ACTIVE nova aparece no
   seletor.
8. **O que o modo cliente monta.** Esta é a mitigação do risco que levou a recomendação a (a).
   1. **Lista de abas permitidas, não de abas proibidas.** `DELEGATED_TABS: readonly Tab[] = ['periodos', 'compliance']`.
      No modo cliente, a barra de abas é `TABS.filter((t) => DELEGATED_TABS.includes(t.id))`. Uma aba nova acrescentada
      ao `TABS` no futuro fica **escondida por padrão** no modo cliente. Ela só aparece se alguém a puser na lista de
      propósito.
   2. **Aba Compliance no modo cliente renderiza um ramo próprio:** só o `ReviewPanel` com `governance`. Não renderiza
      `CompliancePanel`, `LalurPanel`, `SpedGenerationPanel` nem `DeliveryPanel`. O ramo é `governance ? <ReviewPanel …/>
      : <pilha de hoje>` (`AccountingView.tsx:360-367`). Um painel novo posto na pilha de hoje não vaza para o modo
      cliente.
   3. **Aba Períodos** monta o `PeriodsPanel` com `governance`.
   4. **Nada fora dos 9 handlers é chamado no modo cliente:**
      - `useAccountingData` recebe `governance` e **não** chama `getTrialBalance` (não delegado; resolveria o escopo
        do próprio contador).
      - O `AccountingView` **não** chama `getAccounts` nem `listCatalog` (`:104-118`, carregados para o
        `JournalEntryModal`).
      - O botão "Novo lançamento" fica escondido.
   5. **Cabeçalho do modo cliente:** faixa fixa *"Você está no livro de {ownerEmail} — unidade {rótulo}"* em destaque. A
      base é `neutral-*` e o destaque segue o design system. A faixa deixa claro, a cada aba, que o livro é de outro
      usuário.
   6. Ao trocar de contexto, a aba ativa volta para `periodos` (a aba anterior pode não existir no modo cliente).

**Painéis em modo delegado (`governance` presente)**

9. **`PeriodsPanel`:**
   - Repassa `governance.ownerUserId` em `listPeriods`, `openPeriod` e `reopenPeriod` (item 2).
   - **Esconde** semear ano, fechar parcial, fechar definitivo e encerrar exercício (E-3): esses handlers não estão
     entre os 9 e resolveriam o escopo do próprio contador.
   - Mantém "Abrir" (de FUTURE) e "Reabrir" (de SOFT_CLOSED). O "Abrir" de FUTURE é o efeito declarado no item 10 do
     BRIEF do BE ("o contador também consegue abrir um período FUTURE"). **Direto:** a tela não esconde o que o
     servidor permite e o BRIEF ratificado declarou.
10. **`ReviewPanel` + `ReviewDetailModal`:**
    - Repassam `ownerUserId` em `list`, `get`, `signOff` e `reject`.
    - **Escondem** "Abrir revisão", "Adicionar achado", "Resolver", "Acerto", "Trocar jobs" e não chamam `getAccounts`
      nem `listJobs` (E-4). O F-GOV-7 (a+) não deu escrita no razão ao contador.
    - **Download do par em revisão** (fecha o E-5): no detalhe, um botão "Baixar ECD" e um "Baixar ECF", quando o job
      existir, via `downloadArtifact(jobId, unitId, fileName, ownerUserId)`. **Direto nos dois modos:** é a leitura que
      o F-GOV-7 (a+) ratificou para o contador ("assina o que consegue ler"), e o dono também ganha o atalho.
11. **`SignOffModal` no modo delegado:** o campo CRC vem **preenchido com o snapshot da atribuição**
    (`governance.crcNumber`) e **só-leitura** (✅ F-FE-GOV-3 a). O nome continua digitado (F-GOV-9 a:
    "o nome continua digitado"). Traduz `REVIEWER_CRC_MISMATCH` mostrando o CRC esperado.

**Painéis no modo próprio (dono)**

12. **Tradução dos erros nomeados e banner:**
    - `PeriodsPanel` troca o `err instanceof Error` por `resolveErrorWithCode` (E-2) nas 3 chamadas de erro.
    - `ACCOUNTANT_REQUIRED` vira *"Este escopo tem contador responsável ativo ({nome}, {CRC}). Só ele reabre períodos e
      assina revisões. Para fazer você mesmo, encerre a atribuição na aba Compliance."*
    - `PERIOD_STATUS_CHANGED` → *"O período mudou de estado enquanto você agia; recarregado."* e recarrega.
    - Banner informativo nos dois painéis quando o escopo tem ACTIVE (lido de `listByScope`): os botões **continuam
      visíveis** (✅ F-FE-GOV-4 a).
    - `ACCOUNTANT_NOT_ASSIGNED` só aparece no modo delegado: *"Sua atribuição com este cliente não está mais ativa."* e
      volta ao contexto "Meus livros" e recarrega o `/mine` (item 6).

**Testes e gates**

13. **Testes (vitest, `jsdom`, shim de `React` global quando o componente não importa React):**
    a. **Serviço:** cada um dos 9 métodos manda `ownerUserId` quando recebe e **não** manda a chave quando não recebe
       (asserção sobre a URL/corpo do `apiClient` mockado). Um teste fixa que o objeto lançado pelo `apiClient` carrega
       `code` (§1, "precisa de prova").
    b. **Seção do dono:** convite com e-mail inexistente mostra a mensagem de `ACCOUNTANT_USER_NOT_FOUND`; "Convidar"
       desabilita com PENDING; encerrar sem motivo não envia.
    c. **Modo cliente — a mordida do risco principal:**
       - Com `governance`, o `AccountingView` renderiza **só** as abas de `DELEGATED_TABS`. O teste percorre o `TABS`
         inteiro e afirma que toda aba fora da lista some. Assim, uma aba nova sem decisão explícita derruba o teste.
       - A aba Compliance no modo cliente renderiza só o `ReviewPanel`.
       - Nenhuma chamada a `getTrialBalance`, `getAccounts` ou `listCatalog` no modo cliente (spy com zero chamadas).
       - `PeriodsPanel` não renderiza semear/fechar/encerrar exercício.
       - `ReviewDetailModal` não chama `getAccounts` nem `listJobs`.
       Remover a condição de `governance` de qualquer um desses pontos tem de derrubar um teste.
    c2. **Seletor:** usuário sem unidades com 1 ACTIVE entra no modo cliente; trocar para "Meus livros" volta a chamar
       `getTrialBalance`; trocar de contexto leva a aba ativa para `periodos`; PENDING aparece no banner com "Aceitar".
    d. **Aceite:** o botão só habilita com o checkbox; o corpo enviado é exatamente `{ declaresWrittenContract: true }`.
    e. **Sign-off delegado:** CRC pré-preenchido com o snapshot; `REVIEWER_CRC_MISMATCH` mostra o esperado.
    f. **Erros do dono:** `ACCOUNTANT_REQUIRED` no reabrir e no assinar mostra o texto do item 12, não o fallback.
    g. **Download:** o botão aparece só com `ecdJobId`/`ecfJobId` e chama `downloadArtifact` com o `ownerUserId` no
       modo delegado.
    Espere o DOM, não a chamada (memória `handler-async-closure-stale-x-waitfor-tohavebeencalled`); dreno no
    `afterEach` para resposta em voo.
14. **i18n pt/en** (`public/locales/{pt,en}/accounting.json`): todas as chaves novas nos dois arquivos (paridade é gate
    do `skill-audit wiring`).
15. **Gates do diff:** `cd my-app && npx tsc --noEmit` + `npm run test:types` (a memória
    `tsc-noemit-my-app-exclui-testes`: o cru não vê `__tests__`); vitest verde; `next build` verde; verificação
    visual em build de produção das três telas (seção do dono; seletor + banner de convites; modo cliente nas abas Períodos e Compliance).

## 4. Contratos (esboço materializável)

```ts
// lib/services/accountantAssignments.service.ts
import type {
  InviteAccountantInput, AcceptAccountantAssignmentInput, EndAccountantAssignmentInput,
} from '@/types/contracts/accounting/AccountantAssignmentDto.gen';

export type AssignmentStatus = 'PENDING' | 'ACTIVE' | 'ENDED';
export interface AccountantAssignmentView {           // resposta à mão (só entrada é gerada)
  id: string; unitId: string; status: AssignmentStatus;
  accountingContactId: string; accountantUserId: string;
  crcNumber: string; crcUf: string;
  activeFrom: string | null; activeUntil: string | null; endReason: string | null; createdAt: string;
}
export interface MyAccountantAssignmentView extends AccountantAssignmentView { ownerEmail: string; ownerUserId: string }

export const accountantAssignmentsService = {
  invite(body: InviteAccountantInput): Promise<AccountantAssignmentView>;
  listByScope(unitId: string): Promise<AccountantAssignmentView[]>;
  listMine(): Promise<MyAccountantAssignmentView[]>;
  accept(id: string): Promise<AccountantAssignmentView>;            // corpo fixo: { declaresWrittenContract: true } satisfies AcceptAccountantAssignmentInput
  end(id: string, body: EndAccountantAssignmentInput): Promise<AccountantAssignmentView>;
};

// features/accounting/governance/GovernanceScope.ts
export interface GovernanceScope {
  assignmentId: string; ownerUserId: string; ownerEmail: string; unitId: string; crcNumber: string; crcUf: string;
}
export function toGovernanceScope(a: MyAccountantAssignmentView): GovernanceScope; // só ACTIVE; retorno declarado (regra do mapper)

// features/accounting/AccountingView.tsx (F-FE-GOV-1 b)
const DELEGATED_TABS: readonly Tab[] = ['periodos', 'compliance'];   // allowlist: aba nova fica fora por padrão
type AccountingContext = { kind: 'own' } | { kind: 'client'; governance: GovernanceScope };
useAccountingData(governance?: GovernanceScope);                     // com governance: sem getTrialBalance

// props novas (opcionais; ausentes = comportamento de hoje)
interface PeriodsPanelProps { unitId: string; governance?: GovernanceScope }
interface ReviewPanelProps  { unitId: string; onNavigateTab: (tab: ReviewOwnerTab) => void; governance?: GovernanceScope }

// assinatura estendida dos 9 (exemplos)
accountingService.listPeriods(unitId: string, year: number, ownerUserId?: string): Promise<AccountingPeriod[]>;
accountingService.reopenPeriod(periodId: string, unitId: string, reason?: string, ownerUserId?: string): Promise<AccountingPeriod>;
dataExchangeService.downloadArtifact(jobId: string, unitId: string, fileName: string, ownerUserId?: string): Promise<void>;

// mapa de erro → chave i18n (um só lugar, consumido pelos painéis)
export const GOVERNANCE_ERROR_KEYS: Record<string, string> = {
  ACCOUNTANT_REQUIRED: 'governance.error.accountantRequired',
  ACCOUNTANT_NOT_ASSIGNED: 'governance.error.notAssigned',
  REVIEWER_CRC_MISMATCH: 'governance.error.crcMismatch',
  PERIOD_STATUS_CHANGED: 'governance.error.periodChanged',
  ACCOUNTANT_USER_NOT_FOUND: 'governance.error.userNotFound',
  SELF_ASSIGNMENT: 'governance.error.selfAssignment',
  ASSIGNMENT_PENDING_EXISTS: 'governance.error.pendingExists',
  ASSIGNMENT_STATUS_CHANGED: 'governance.error.assignmentChanged',
};
```

## 5. Forks — ✅ RATIFICADOS 2026-10-04 (escolhas e efeitos em §5.1; a tabela abaixo é a proposta original)

| Ref | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-FE-GOV-1** | Onde o contador trabalha | **Página própria** `/accounting/clients`: carteira + workspace delegado só com Períodos e Revisão | **Modo dentro do `AccountingView`:** um seletor "meus livros × cliente X" no topo; com cliente, as abas se reduzem a Períodos e Compliance | Só a carteira (aceitar/encerrar), sem workspace; o contador age pela API | **(a).** O `AccountingView` monta 22 abas que resolvem o escopo do próprio usuário. Em (b), cada aba nova futura precisa lembrar de se esconder no modo delegado, e o esquecimento mostra tela vazia ao contador como se fosse o livro do cliente. Em (a), o workspace monta só o que foi delegado, e o `AccountingView` não muda além do link. (c) não entrega o objetivo (§0) |
| **F-FE-GOV-2** | Como a tela do contador nomeia a unidade do cliente | **E-mail do dono + `unitId` abreviado** (zero BE) | O BE devolve o nome da unidade no `/mine` (o serviço contábil passa a ler a DynamicTable `units` do dono) | Rótulo livre que o dono digita no convite (campo novo no model) | **(a) agora.** (b) cruza a fronteira DynamicTable × Prisma dentro do serviço contábil (Contrato §2.1: integração sobe ao controller ou a serviço de integração) e abre um incremento de BE que não foi autorizado. (c) muda o model do #482. Quando um contador tiver dois escopos do mesmo dono e a confusão aparecer, (c) é o caminho barato |
| **F-FE-GOV-3** | CRC no sign-off delegado | **Pré-preenchido e só-leitura** (o snapshot da atribuição) | Pré-preenchido e editável (o servidor recusa a divergência com `REVIEWER_CRC_MISMATCH`) | Campo vazio, como hoje | **(a).** Com atribuição ativa, o único valor que o servidor aceita é o do snapshot (F-GOV-9 a). Deixar editável só abre caminho para um 400. Se o CRC do contador mudou, o caminho é encerrar e convidar de novo com o contato atualizado (o snapshot é imutável na linha, I-11) |
| **F-FE-GOV-4** | Dono com contador ativo: o que fazer com "Reabrir" e "Assinar/Rejeitar" | **Botões visíveis + banner + erro traduzido** (o servidor decide) | Botões escondidos ou desabilitados quando há ACTIVE (a tela replica a regra) | — | **(a).** Segue o precedente do próprio `PeriodsPanel` (`:107-109`: "the backend is the authority on the period gate […] duplicating that check here would just create a second copy that can drift"). Com F-GOV-11 (a), a regra ainda pode mudar (o fork volta se o F-GOV-1 trouxer motivo, BRIEF do BE §5.3), e uma cópia na tela teria de mudar junto |

### 5.1 RATIFICAÇÃO — 2026-10-04 (dono, questionário; pedido: *"Forks novos vão para mim por questionário"*)

| Fork | Escolha do dono | Contra a recomendação? | Efeito no BRIEF |
|---|---|---|---|
| **F-FE-GOV-1** | **(b) modo cliente dentro do `AccountingView`** | **SIM** (recomendação: a) | Itens 6 e 8 reescritos: seletor de contexto, banner de convites, `DELEGATED_TABS` como lista de permitidas, ramo próprio da aba Compliance, `useAccountingData` sem balancete no modo cliente; testes 13c/13c2 |
| F-FE-GOV-2 | (a) e-mail do dono + `unitId` abreviado | não | Rótulo do seletor (item 6.2) e do banner (6.5); zero BE |
| F-FE-GOV-3 | (a) CRC pré-preenchido e só-leitura | não | Item 11: o campo CRC é só-leitura no modo cliente |
| F-FE-GOV-4 | (a) botões visíveis + banner + erro traduzido | não | Item 12 como escrito |

**Efeito do F-FE-GOV-1 (b) no risco.** A recomendação (a) evitava que uma aba futura vazasse para o modo cliente. Com
(b), a proteção passa a ser a lista `DELEGATED_TABS` (aba nova fica fora por padrão) e o ramo próprio da aba
Compliance, travados pelo teste 13c. **Risco residual:** um painel novo acrescentado **dentro** do `PeriodsPanel` ou do
`ReviewPanel` não tem ramo próprio. Ele aparece no modo cliente e cai no escopo do contador. A revisão de qualquer PR
futuro que mexa nesses dois painéis precisa olhar a prop `governance`.

## 6. Pendente de validação externa

- **Texto da declaração de contrato** (item 7): a redação cita a Res. CFC 1.590 arts. 1º/5º pelo BRIEF do BE §5.1. Se
  a frase tem valor de declaração entre as partes (MP 2.200-2 art. 10 § 2º) é leitura do contador ou do jurídico, a
  mesma pendência do BRIEF do BE §7 ("valor da assinatura interna"). Nada no código depende dela.

## 7. Insumos ausentes

- Nenhum que bloqueie o desenho. Não houve teste de browser do BE do #482 (o retorno registra cobertura unit/integração
  só). A verificação em build de produção do item 15 é o primeiro uso real das rotas por tela.

## 8. Achados fora de escopo (não planejados)

- **Tela da política versionada** (propor, aprovar, rejeitar parâmetros): depende do BE do BRIEF irmão e é nó vizinho
  com BRIEF e autorização próprios.
- **Normalização de e-mail no cadastro de usuário** (GAP-MAP linha 84): o convite pode dar 400 para contador cadastrado
  com maiúsculas. A tela só mostra a mensagem; o conserto é no cadastro.
- **Contador lê qualquer job do dono** (GAP-MAP linha 83): a tela só oferece o download do par em revisão (item 10),
  mas a API deixa ler qualquer job. Restringir é fork do BE.
- **`/open` sem DTO e `ReopenPeriodSchema.periodId` aceito e ignorado** (BRIEF do BE §9): o item 2 só acrescenta
  `ownerUserId`; não corrige isso.
- **Aviso ao contador quando chega convite:** não existe notificação (F-GOV-8 a não tem e-mail). O dono avisa por fora.
