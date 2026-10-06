# BRIEF — FE-INCR-ACCOUNTING-POLICY-VERSION (tela da política versionada sobre o BE do #517 — nó GOV-CONTADOR)

> **Estado: BRIEF pronto, forks F-FE-POL-1..4 ✅ RATIFICADOS em 06/10** por questionário, todos na recomendação
> ([D-2026-10-06-FE-POL-FORKS](../plano/decisoes/D-2026-10-06-FE-POL-FORKS.md); §5). O F-FE-POL-1 (a) diverge do precedente reativo F-FE-GOV-4 por decisão do dono. Produzido por `sessao-planejamento`
> em 2026-10-06 contra `origin/main` **`76d1a432`**. Não contém código de aplicação. **Implementação exige "executa"
> próprio do dono** (ORCH-006). Nenhum fork se auto-ratifica.

## 0. Cabeçalho

- **Item:** nó [[GOV-CONTADOR]] (`docs/plano/nos/GOV-CONTADOR.md`), "Falta: FE da política versionada (nó vizinho, sem
  BRIEF)" do `estado_detalhe` de 05/10. Origem: §9 de [`BE-INCR-ACCOUNTING-POLICY-VERSION-brief.md`](BE-INCR-ACCOUNTING-POLICY-VERSION-brief.md)
  (*"FE da política versionada (propor, ver o diff, aprovar, rejeitar): nó vizinho, BRIEF e autorização próprios"*) e
  §8 de [`FE-INCR-ACCOUNTANT-GOVERNANCE-brief.md`](FE-INCR-ACCOUNTANT-GOVERNANCE-brief.md).
- **Autorização:** dono, chat, 2026-10-06: *"Autorizo planejar o BRIEF do FE da política versionada —
  sessao-planejamento, sem 'executa'"* (ratificado com *"Dispara em sequencia aqui tudo em opus medio"*).
- **A autorização cobre exatamente este item?** Sim. Cobre o BRIEF das telas que consomem as 5 rotas
  `/api/accounting/policy-versions` e o tratamento do 409 nos dois `PUT` governados. Não cobre: mudança no BE (nenhuma
  é pedida aqui), as telas que não existem para os campos sem controle (L2 do FE-INCR-DFE, tarifa bancária, Parte B),
  `CompanyFiscalProfile`/coleções sob aprovação (F-POL-2 c/d). Esses itens vão para §9.
- **Intenção (T1).** O objetivo não é "consumir `/policy-versions`". É que, com contador responsável ativo, **o dono
  consiga mudar um parâmetro governado pela tela** (hoje recebe 409 e para) e que **o contador veja o que muda e
  decida** sem ler o perfil fiscal, que não é handler delegado.
- **Fecha a lacuna L1 do FE-INCR-DFE?** **Sim**, pelos itens 4–6. A L1 (`docs/plano/nos/FE-INCR-DFE.md`: *"propor
  mudança com contador ativo: PUT /fiscal-profile dá 409, nenhum FE consome /policy-versions"*) é o lado do dono no
  `FiscalProfilePanel`. Este BRIEF também fecha o risco principal do BRIEF do BE (§0): o 409 na
  `FixedAssetAccountsSection`. **Não fecha** L2 (campos sem controle de edição) nem L4 (toast do 404).
- **Risco principal.** O contador decide **no livro de outro usuário**. Se o painel novo chamar, no modo cliente, um
  handler que não está entre os 13 delegados (por exemplo `getAccounts`, `listByScope` ou o `GET /fiscal-profile`), o
  servidor resolve o escopo **do próprio contador**. O resultado é rótulo errado ou tela vazia ao lado de um botão
  "Aprovar" que aplica no livro do cliente. O item 9 fecha a lista de chamadas do modo cliente, e o teste 12c prova
  isso. Em segundo lugar: o `FISCAL_PROFILE` é substituição total. Uma proposta montada de um formulário velho reverte
  em silêncio um campo que outra versão mudou. O item 5 e o F-FE-POL-4 tratam disso.

## 1. Contrato consumido (fato consumado — `d01d232b`, #517)

Grau: **V** = lido em `76d1a432` · **I** = inferido do código lido.

| Rota | Quem | Resolver | Entrada (tipo gerado) | Resposta | Evidência |
|---|---|---|---|---|---|
| `POST /api/accounting/policy-versions` | dono | padrão (sem `ownerUserId`) | `ProposePolicyVersionInput` (união por `target`) | 201 `PolicyVersionView` | `accountingPolicyVersionController.ts:22-35`; `routes/accounting.ts:342` |
| `GET /api/accounting/policy-versions?unitId=&target=&status=&ownerUserId=` | dono ou contador ACTIVE do par | delegado | `ListPolicyVersionsQueryInput` | `PolicyVersionView[]`, mais novo primeiro | `:38-51`; `:343` |
| `GET /api/accounting/policy-versions/:id?unitId=&ownerUserId=` | dono ou contador | delegado | `PolicyVersionScopeQueryInput` | `PolicyVersionDetailView` (`current` + `accountLabels`) | `:54-66`; `:344` |
| `POST …/:id/approve` | contador | delegado | `ApprovePolicyVersionInput {unitId, ownerUserId?}` | `PolicyVersionView` (`APPLIED`, com `appliedSnapshot`) | `:69-81`; `:345` |
| `POST …/:id/reject` | contador | delegado | `RejectPolicyVersionInput {unitId, ownerUserId?, reason}` (1..500) | `PolicyVersionView` (`REJECTED`) | `:84-96`; `:346` |
| `PUT /api/accounting/fiscal-profile`, `PUT /api/accounting/settings` | dono | padrão | sem mudança de forma | 409 `POLICY_APPROVAL_REQUIRED` com ACTIVE | `lib/errors.ts:167-177` |

Tipos de entrada: `my-app/types/contracts/accounting/AccountingPolicyVersionDto.gen.ts` (V). As views de resposta
(`PolicyVersionView`, `PolicyVersionDetailView`, `AccountingPolicyVersionDto.ts:80-102`) **não** são geradas; o
serviço do FE as escreve à mão, no padrão de `fiscalProfile.service.ts` e `accountantAssignments.service.ts` (V).

Erros que a tela tem de traduzir (`code` no corpo; o FE lê com `resolveErrorWithCode`, `resolveError.ts:26`; o 13a do
#515 já prova que o `code` chega no objeto lançado):

| `code` | HTTP | Quando | Evidência |
|---|---|---|---|
| `POLICY_APPROVAL_REQUIRED` | 409 | `PUT` com contador ACTIVE (também na corrida preflight × tx) | `lib/errors.ts:167` |
| `POLICY_NO_ACCOUNTANT` | 409 | proposta sem ACTIVE (a atribuição acabou entre a leitura da tela e o POST) | `lib/errors.ts:179`; `AccountingPolicyVersionService.ts:95,98` |
| `POLICY_VERSION_STATUS_CHANGED` | 409 | CAS: aprovar/rejeitar versão já `SUPERSEDED`/`APPLIED`/`REJECTED` | `AccountingPolicyVersionRepository.ts:77-79` |
| `ACCOUNTANT_REQUIRED` | 403 | aprovar/rejeitar sem ser o contador ACTIVE do par | `AccountingPolicyVersionService.ts:217-222` |
| `ACCOUNTANT_NOT_ASSIGNED` | 403 | `ownerUserId` de par sem ACTIVE (resolver do #482) | #482 |
| `FORBIDDEN` | 403 | propor sem ser o dono; ler sem ser dono nem contador do par | `:89`, `:212`; `lib/errors.ts:34-38` |
| 400 sem `code` próprio | 400 | aprovação re-valida e falha (conta apagada, `regime_divergente_da_empresa`); a tx volta e a proposta segue `PROPOSED` | `FiscalProfileService.ts:206-212`; BRIEF do BE item 9.2 |

**Precisa de prova (I):** chave **ausente** no `payload` de `FISCAL_PROFILE` não muda o campo na aprovação. O
`applyInTx` espalha `...rest` no `upsert` (`FiscalProfileService.ts:226-232`), e o Prisma ignora `undefined` no
`update`. Isso vale para os 6 campos que o #521/#529 acrescentaram ao DTO e o `FiscalProfileView` do FE ainda não
espelha (§2, E-6). O item 12a fixa isso do lado do FE (o corpo da proposta não leva essas chaves). A prova do lado do
servidor é um teste de integração que este BRIEF **não** pede (é BE; §9).

## 2. Inventário do FE conferido

| # | Fato | Evidência | Grau |
|---|---|---|---|
| E-1 | Nenhum arquivo do my-app chama `/policy-versions` nem conhece `POLICY_APPROVAL_REQUIRED` | grep em `my-app/` (só o `.gen.ts`) | V |
| E-2 | `FiscalProfilePanel.save()` chama `putUnitProfile` e mostra o erro com `resolveError` inline. Com ACTIVE, o 409 aparece inteiro e o formulário fica (passo 22 j do RUNBOOK-H2) | `FiscalProfilePanel.tsx:98-117,365` | V |
| E-3 | `FixedAssetAccountsSection.save()` manda o patch de **só 3 campos** (`toAccountsPatch`) por `updateSettings` | `FixedAssetAccountsSection.tsx:24-31,71-83`; `accounting.service.ts:729-733` | V |
| E-4 | `apiClient` dispara `notify(..., 'error')` em **todo** não-2xx antes de lançar; não há opção silenciosa | `lib/api/api-client.ts:71-76` | V |
| E-5 | `useActiveAssignment(unitId, enabled)` já devolve a ACTIVE do escopo (dono) com o nome do contato, e falha calada | `governance/useActiveAssignment.ts` (#515) | V |
| E-6 | O `FiscalProfileView` do FE (espelho à mão) **não** tem `pisDespesaAccountId`, `cofinsDespesaAccountId`, `pisRecolherAccountId`, `cofinsRecolherAccountId`, `irpjSaldoNegativoAccountId`, `csllSaldoNegativoAccountId`, que o DTO e a view do BE já têm | `fiscalProfile.service.ts:30-69` × `FiscalProfileDto.gen.ts`; `FiscalProfileService.ts:58-63` | V |
| E-7 | `toUpsertFiscalProfile` monta o corpo **completo** do PUT, levando os 7 campos sem controle (L2) em `carried`; não leva os 6 do E-6 | `fiscalProfileForm.ts:74-83,158-215` | V |
| E-8 | Modo cliente: `DELEGATED_TABS = ['periodos','compliance']` é allowlist; o ramo do modo cliente da aba Compliance monta **só** o `ReviewPanel`; `contextKey` remonta os painéis a cada troca de livro | `AccountingView.tsx:85,134-140,463-475,131-132` | V |
| E-9 | `ClientModeStrip` é a faixa fixa do modo cliente e já carrega o botão de encerrar | `governance/ClientModeBars.tsx:46-78` | V |
| E-10 | `GOVERNANCE_ERROR_KEYS`/`GOVERNANCE_ERROR_FALLBACK` + `resolveGovernanceError` são o mapa único `code → i18n` do módulo | `governance/GovernanceScope.ts:35-57`; `governanceError.ts` | V |
| E-11 | As abas `perfil-fiscal` e `imobilizado` estão fora de `DELEGATED_TABS`: o contador não vê o perfil nem as contas do cliente | `AccountingView.tsx:85` | V |
| E-12 | Tarifa bancária (`bankCharge*`) e `depreciationParteBAccountId` não têm controle em nenhuma tela | grep `.tsx` (só `FixedAssetAccountsSection` e teste) | V |
| E-13 | Canônicos: `components/ui/Modal.tsx`, `GenericTable` | já usados pela governança (#515) | V |

## 3. Checklist numerado (cada item testável sozinho)

> Gates do `my-app/CLAUDE.md`: reuse `Modal`/`GenericTable`; `neutral-*`, nunca `zinc-*`; cards `rounded-2xl`; corpo
> de escrita tipado pelo `.gen.ts` (nunca espelhar o DTO à mão, nunca importar do backend); regra do mapper (função
> com retorno declarado ou `satisfies`; sem `.map` sem anotação, spread de rascunho ou `as` em objeto); `.gen.ts`
> nunca se edita; tela atrás de `withAuth` verificada em build de produção. Desenho na recomendação de cada fork de §5;
> onde um fork mudar o desenho, o item diz o quê.

**Serviço**

1. **`lib/services/policyVersions.service.ts`** (novo, padrão de `accountantAssignments.service.ts`): `propose(body)`,
   `list(query)`, `get(id, scope)`, `approve(id, body)`, `reject(id, body)`. Corpos e queries tipados pelo
   `AccountingPolicyVersionDto.gen.ts`; `PolicyVersionView`/`PolicyVersionDetailView` à mão, com comentário
   `// espelha server/.../AccountingPolicyVersionDto.ts:80-102`. Query por `URLSearchParams`; `ownerUserId` ausente →
   a chave não vai (mesma regra do item 2 do #515). `notify` de sucesso só em `propose`/`approve`/`reject`.
2. **Mapeadores de payload** (`features/accounting/lib/policyPayload.ts`), com retorno declarado:
   - `toFiscalProfileProposal(body: UpsertFiscalProfileInput): Extract<ProposePolicyVersionInput, {target:'FISCAL_PROFILE'}>`
     — tira `unitId` do corpo do PUT e o põe no nível de cima. **Direto:** reusa `toUpsertFiscalProfile` (E-7); a
     proposta é **o mesmo corpo** que o PUT mandaria, então a tela não ganha um segundo formulário.
   - `toScopeSettingsProposal(patch: FixedAssetAccountsPatch): Extract<…, {target:'SCOPE_SETTINGS'}>` — idem, a
     partir de `toAccountsPatch` (E-3). Leva só as 3 chaves do imobilizado; as outras 3 não vão (patch parcial).
3. **Erros nomeados** entram no mapa único (E-10): `POLICY_APPROVAL_REQUIRED`, `POLICY_NO_ACCOUNTANT`,
   `POLICY_VERSION_STATUS_CHANGED` em `GOVERNANCE_ERROR_KEYS` + fallback pt-BR. `ACCOUNTANT_REQUIRED` já está lá, mas
   com o texto de período/revisão; no contexto da política, a tela usa uma chave própria
   (`governance.error.policyAccountantRequired`), escolhida pelo painel.

**Lado do dono — propor (fecha a L1)**

4. **`FiscalProfilePanel` com contador ativo** (✅ se **F-FE-POL-1 → a**):
   1. O painel chama `useActiveAssignment(unitId, true)` (E-5).
   2. Com ACTIVE, o botão "Salvar perfil" vira **"Enviar ao contador para aprovação"**, e um aviso acima dele diz
      *"Este escopo tem contador responsável ativo ({nome}, {CRC}). A mudança só vale depois que ele aprovar."*
   3. Enviar chama `policyVersionsService.propose(toFiscalProfileProposal(built.body))`. Sucesso: aviso
      *"Proposta v{n} enviada. O perfil abaixo continua o vigente até a aprovação."* O formulário volta ao vigente
      (relê o GET; F-FE-POL-4 a).
   4. **Rede de corrida, nos dois sentidos** (o servidor é a autoridade, precedente F-FE-GOV-4 a):
      - Sem ACTIVE na leitura, mas o `PUT` devolve 409 `POLICY_APPROVAL_REQUIRED` → a mensagem traduzida aparece com um
        botão "Enviar como proposta", que manda o **mesmo** corpo pelo `propose`.
      - Com ACTIVE na leitura, mas o `propose` devolve 409 `POLICY_NO_ACCOUNTANT` → a mensagem traduzida aparece com
        um botão "Salvar direto", que manda o mesmo corpo pelo `PUT`.
      Nenhum dos dois reenvia sozinho: o dono clica.
   - Se **F-FE-POL-1 → b**: o 4.2 sai; o botão continua "Salvar perfil" e só a rede de corrida do 4.4 existe.
5. **Proposta pendente visível ao dono** (F-FE-POL-4): o painel lê `list({unitId, target:'FISCAL_PROFILE',
   status:'PROPOSED'})`. Com uma pendente, mostra a faixa *"Proposta v{n} aguardando o contador desde {data}. Enviar
   outra substitui esta por inteiro."* com o link "Ver proposta" (abre o modal do item 8, sem botões de decisão).
   **Direto:** o texto "substitui por inteiro" é o F-POL-6 (a) dito ao dono. Sem ele, o dono que edita o campo Y a
   partir do vigente perde, sem saber, a mudança em X que estava na proposta anterior (risco 2 de §0).
6. **`FixedAssetAccountsSection` com contador ativo:** a mesma regra dos itens 4 e 5, com `target: 'SCOPE_SETTINGS'` e
   `toScopeSettingsProposal`. O aviso de sucesso diz *"Contas enviadas ao contador"*, nunca *"Contas salvas"* (o
   F-POL-4 b existe para a tela não dizer "salvo" sem aplicar). A faixa do item 5 aqui avisa que a proposta é
   **parcial**: só as chaves enviadas mudam.

**Painel de versões (dono e contador)**

7. **`PolicyVersionsPanel`** (`features/accounting/governance/PolicyVersionsPanel.tsx`), com prop `governance?`.
   **Onde mora:** ✅ se **F-FE-POL-2 → a**, aba nova `politica` ("Política contábil") acrescentada a `TABS` **e** a
   `DELEGATED_TABS`, montando o mesmo painel nos dois modos.
   - Lista em `GenericTable`: alvo (Perfil fiscal / Contas do escopo), versão, status, data, quem decidiu e motivo da
     rejeição. Filtro por alvo e status (os dois parâmetros da rota).
   - **Quem decidiu, sem chamar handler não delegado:** no modo próprio, cruza `assignmentId` com
     `accountantAssignmentsService.listByScope(unitId)` (contato + CRC). No modo cliente, `assignmentId ===
     governance.assignmentId` vira "você", e qualquer outro vira "outro contador". **Não** chama `listByScope` no modo
     cliente (resolveria o escopo do contador).
   - `proposedById = null` aparece como "aplicada direto (sem contador)" (versão nascida de `PUT`, BRIEF do BE item 6).
   - Pendentes no topo, em destaque.
8. **Detalhe da versão** (`Modal`), a partir do `get` (com `ownerUserId` no modo cliente):
   - **Diff** (✅ se **F-FE-POL-3 → a**): tabela campo a campo **só das chaves presentes no `payload`**, com colunas
     "Vigente" (`current[k]`) e "Proposto" (`payload[k]`). Linhas que diferem em destaque; as iguais ficam escondidas
     atrás de "mostrar campos sem mudança". Chave fora do `payload` não aparece e o rodapé diz *"Campos fora desta
     lista não mudam."* (§1, "precisa de prova").
   - **Rótulos:** id de conta → `accountLabels[id]` (o BE já devolve `code — name`). Conta sem rótulo aparece como
     *"conta não encontrada ({id abreviado})"*, que é o sinal de que a aprovação vai dar 400. Nome de campo → as
     chaves i18n que o `FiscalProfilePanel`/`FixedAssetAccountsSection` já usam. Campo sem chave na tela (L2, E-6,
     E-12) → o nome técnico do campo. **Direto:** o contador precisa ver **todo** campo que muda, inclusive os que a
     tela não edita.
   - Enums e centavos: os mesmos formatadores do painel (`formatPctHundredths`, rótulos de regime/fato gerador).
   - Versão `APPLIED`: mostra `appliedSnapshot` em vez de `current` (o "vigente" de hoje já não é o que ela aplicou).
9. **Decisão do contador** (só com `governance` e status `PROPOSED`):
   - **Aprovar:** `Modal` de confirmação *"Aprovar aplica estes valores agora no livro de {ownerEmail}."* →
     `approve(id, {unitId, ownerUserId})`. Sucesso recarrega lista e detalhe.
   - **Rejeitar:** `Modal` com `reason` obrigatório (1..500, contador de caracteres; vazio não envia) →
     `reject(id, {unitId, ownerUserId, reason})`.
   - **Erros:** `POLICY_VERSION_STATUS_CHANGED` → *"Esta proposta mudou (o dono enviou outra ou ela já foi
     decidida); recarregado."* e recarrega. 400 da aprovação → a mensagem do servidor inteira, e o texto *"A proposta
     segue pendente; rejeite com o motivo se ela não puder valer."* `ACCOUNTANT_NOT_ASSIGNED` → `onAssignmentLost`
     (o mesmo caminho do `ReviewPanel`, E-8).
   - **Lista fechada de chamadas no modo cliente:** só `list`, `get`, `approve` e `reject`, todos com `ownerUserId`.
     **Nenhuma** chamada a `getAccounts`, `listByScope`, `getUnitProfile` ou `getSettings`: o `current` e o
     `accountLabels` do detalhe existem justamente para isso.
   - No modo próprio, os botões não aparecem (o dono não decide, F-GOV-7 a+).
10. **Aviso ao contador de que há proposta** (direto: não existe notificação, F-GOV-8 a não tem e-mail, então sem isso
    a proposta é invisível). No modo cliente, o `ClientModeStrip` (E-9) lê `list({unitId, ownerUserId,
    status:'PROPOSED'})` e mostra *"{n} proposta(s) de política aguardando sua decisão"* com um link para a aba do
    item 7. Uma chamada por troca de livro (`contextKey`); falha = sem aviso, nunca erro.
11. **i18n pt/en** (`public/locales/{pt,en}/accounting.json`): todas as chaves novas nos dois arquivos (paridade é gate
    do `skill-audit wiring`), incluindo o rótulo da aba nova se F-FE-POL-2 → a.

**Testes e gates**

12. **Testes (vitest, `jsdom`, shim de `React` global quando o componente não importa React):**
    a. **Serviço/mapeadores:** `propose` manda `{unitId, target, payload}` com `payload` **sem** `unitId`;
       `toFiscalProfileProposal(toUpsertFiscalProfile(...))` tem as mesmas chaves do corpo do PUT menos `unitId` (e,
       portanto, nenhuma das 6 do E-6); `toScopeSettingsProposal` leva só as 3 chaves do imobilizado; `ownerUserId`
       ausente não vira chave na query nem no corpo.
    b. **Dono propõe:** com ACTIVE, o botão diz "Enviar ao contador" e o clique chama `propose`, **não** `put`; sem
       ACTIVE, chama `put`, como hoje. 409 `POLICY_APPROVAL_REQUIRED` no `put` mostra o texto traduzido e o botão
       "Enviar como proposta", que reenvia o mesmo corpo. 409 `POLICY_NO_ACCOUNTANT` no `propose` oferece "Salvar
       direto". Os dois painéis (perfil fiscal e contas do imobilizado). A mensagem de sucesso do imobilizado com
       contador nunca é "Contas salvas".
    c. **Modo cliente — a mordida do risco principal:**
       - Com `governance`, o `PolicyVersionsPanel` e o detalhe fazem **zero** chamadas a `getAccounts`,
         `listByScope`, `getUnitProfile` e `getSettings` (spy), e toda chamada a `list`/`get`/`approve`/`reject` leva
         `ownerUserId`.
       - Se F-FE-POL-2 → a: o teste 13c do #515 (`AccountingView.governance.test.tsx`, percorre `TABS` × `DELEGATED_TABS`) passa a esperar a aba nova, e
         **só** ela, a mais. Tirar a aba de `DELEGATED_TABS` ou acrescentar outra tem de derrubar o teste.
       Remover a condição de `governance` de qualquer um desses pontos tem de derrubar um teste.
    d. **Decisão:** "Rejeitar" sem motivo não envia; `POLICY_VERSION_STATUS_CHANGED` recarrega e mostra o texto; 400
       da aprovação mostra a mensagem do servidor e a proposta segue na lista como pendente; no modo próprio não há
       botão de decisão.
    e. **Diff:** só chaves do `payload`; conta sem `accountLabels` vira "conta não encontrada"; versão `APPLIED`
       compara com `appliedSnapshot`.
    f. **Faixa da pendente (item 5):** com 1 `PROPOSED`, a faixa aparece com a versão e o aviso de substituição.
    g. **Aviso ao contador (item 10):** com `n` pendentes, o strip mostra `n`; falha da leitura não mostra erro.
    Espere o DOM, não a chamada (memória `handler-async-closure-stale-x-waitfor-tohavebeencalled`); dreno no
    `afterEach` para resposta em voo.
13. **Gates do diff:** `cd my-app && npx tsc --noEmit` **e** `npm run test:types` (o cru não vê `__tests__`, memória
    `tsc-noemit-my-app-exclui-testes`); vitest verde; `next build` verde; `node .claude/skills/skill-audit/skill-audit.mjs
    run` só se tocar `.claude/skills/**` (não deveria). Verificação em **build de produção** do fluxo de §7 antes de
    abrir o PR. Nenhum toque em `server/` (se a implementação precisar, é desvio: pare e reporte).
14. **Runbook de browser a preparar em branco** (na sessão de feature, não nesta): emenda **Passo 23** no
    [`RUNBOOK-H2-BROWSER-SIGNOFF.md`](RUNBOOK-H2-BROWSER-SIGNOFF.md) com o roteiro de §7, e **emenda do passo 22 j**
    (o resultado esperado deixa de ser "a mensagem do servidor aparece inteira" e passa a ser o botão "Enviar ao
    contador"). Agente prepara; não preenche evidência, não marca desfecho, não assina.

## 4. Contratos (esboço materializável)

```ts
// lib/services/policyVersions.service.ts
import type {
  ProposePolicyVersionInput, ListPolicyVersionsQueryInput, PolicyVersionScopeQueryInput,
  ApprovePolicyVersionInput, RejectPolicyVersionInput,
} from '@/types/contracts/accounting/AccountingPolicyVersionDto.gen';

export type PolicyTarget = ProposePolicyVersionInput['target'];                       // 'FISCAL_PROFILE' | 'SCOPE_SETTINGS'
export type PolicyVersionStatus = NonNullable<ListPolicyVersionsQueryInput['status']>;

// espelha server/src/features/accounting/dtos/AccountingPolicyVersionDto.ts:80-102 (resposta à mão — só entrada é gerada)
export interface PolicyVersionView {
  id: string; unitId: string; target: PolicyTarget; version: number; status: PolicyVersionStatus;
  payload: Record<string, unknown>; appliedSnapshot: Record<string, unknown> | null;
  proposedById: string | null; decidedById: string | null; assignmentId: string | null;
  decisionReason: string | null; decidedAt: string | null; createdAt: string;
}
export interface PolicyVersionDetailView extends PolicyVersionView {
  current: Record<string, unknown> | null;
  accountLabels: Record<string, string>;
}

export const policyVersionsService = {
  propose(body: ProposePolicyVersionInput): Promise<PolicyVersionView>;
  list(query: ListPolicyVersionsQueryInput): Promise<PolicyVersionView[]>;
  get(id: string, query: PolicyVersionScopeQueryInput): Promise<PolicyVersionDetailView>;
  approve(id: string, body: ApprovePolicyVersionInput): Promise<PolicyVersionView>;
  reject(id: string, body: RejectPolicyVersionInput): Promise<PolicyVersionView>;
};

// features/accounting/lib/policyPayload.ts — retorno declarado (regra do mapper)
type FiscalProposal = Extract<ProposePolicyVersionInput, { target: 'FISCAL_PROFILE' }>;
type SettingsProposal = Extract<ProposePolicyVersionInput, { target: 'SCOPE_SETTINGS' }>;
export function toFiscalProfileProposal(body: UpsertFiscalProfileInput): FiscalProposal;   // { unitId, target, payload: body sem unitId }
export function toScopeSettingsProposal(patch: FixedAssetAccountsPatch): SettingsProposal;

// diff do detalhe (item 8)
export interface PolicyDiffRow { key: string; label: string; current: string; proposed: string; changed: boolean }
export function toPolicyDiffRows(
  target: PolicyTarget,
  payload: Record<string, unknown>,
  base: Record<string, unknown> | null,                 // current, ou appliedSnapshot se APPLIED
  accountLabels: Record<string, string>,
  t: TFn,
): PolicyDiffRow[];                                    // só chaves de `payload`

// governance/GovernanceScope.ts (+)
POLICY_APPROVAL_REQUIRED: 'governance.error.policyApprovalRequired',
POLICY_NO_ACCOUNTANT: 'governance.error.policyNoAccountant',
POLICY_VERSION_STATUS_CHANGED: 'governance.error.policyVersionChanged',

// governance/PolicyVersionsPanel.tsx
interface PolicyVersionsPanelProps {
  unitId: string;
  governance?: GovernanceScope;          // presente = modo cliente: list/get/approve/reject com ownerUserId, nada mais
  onAssignmentLost?: () => void;
}

// AccountingView.tsx (se F-FE-POL-2 → a)
// Tab += 'politica'; TABS += { id: 'politica', labelKey: 'view.tabs.politica', label: 'Política contábil' }
export const DELEGATED_TABS: readonly Tab[] = ['periodos', 'compliance', 'politica'];
```

## 5. Forks — ✅ RATIFICADOS 06/10 ([D-2026-10-06-FE-POL-FORKS](../plano/decisoes/D-2026-10-06-FE-POL-FORKS.md))

Dono, chat, 2026-10-06, questionário: as 4 cédulas na recomendação (a). **F-FE-POL-1 (a) diverge do precedente
F-FE-GOV-4 (a), que é reativo ("o servidor decide, a tela não replica a regra"), por decisão do dono:** a tela
escolhe a rota pela atribuição ACTIVE e o servidor segue autoridade nos dois sentidos (item 4.4).

| Ref | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-FE-POL-1** | Como o dono propõe com contador ativo | **Preemptivo:** a tela lê a ACTIVE (`useActiveAssignment`) e o botão vira "Enviar ao contador"; o 409 de corrida vira oferta de reenvio como proposta (item 4.4) | **Reativo:** o botão continua "Salvar"; o `PUT` dá 409 e só então a tela oferece "Enviar como proposta" com o mesmo corpo | **Formulário próprio de proposta** no painel de versões, separado das telas de perfil e de contas | ✅ **(a), dono 06/10.** O precedente F-FE-GOV-4 (a) ("o servidor decide, a tela não replica a regra") puxa para (b), e (b) é menos código. Mas aqui a tela não **barra** nada: ela escolhe a rota, e o servidor segue autoridade nos dois sentidos (item 4.4). Em (b), **toda** mudança com contador começa com um toast vermelho do `apiClient` (E-4) e um "erro" que não é erro; e o dono só descobre que precisa de aprovação depois de tentar. (c) duplica o formulário de 38 campos e cria um segundo lugar para manter |
| **F-FE-POL-2** | Onde mora o painel de versões | **Aba nova `politica`** em `TABS` e em `DELEGATED_TABS`, mesmo painel nos dois modos | **Dentro da aba Compliance:** no modo cliente, acima do `ReviewPanel` no ramo próprio; no modo próprio, na pilha de hoje | **Só no modo cliente**, como modal aberto pelo `ClientModeStrip`; o dono vê a pendente pela faixa do item 5, sem histórico | ✅ **(a), dono 06/10.** A allowlist `DELEGATED_TABS` existe para que uma aba entre **de propósito** (BRIEF do #515, item 8.1), e o teste 13c passa a fixar a escolha. O dono ganha onde ver histórico e motivo de rejeição. (b) põe um segundo painel no ramo que o código diz ser "SÓ a revisão" (`AccountingView.tsx:466`), e o risco residual do F-FE-GOV-1 (painel novo dentro de painel delegado) é justamente esse. (c) não dá ao dono o motivo da rejeição, que só existe na versão |
| **F-FE-POL-3** | Forma do "ver o que muda" | **Tabela campo a campo** só das chaves do `payload`, com rótulos (contas por `accountLabels`, campos pelas chaves i18n existentes) e as iguais recolhidas | **JSON lado a lado** (`current` × `payload`), sem rótulo | **Lista só do proposto** (sem o vigente), com rótulos | ✅ **(a), dono 06/10.** O contador decide sobre o que **muda**; sem o vigente ao lado, (c) o obriga a lembrar do estado atual, que ele não vê em outra aba (E-11). (b) mostra ids de conta crus. O BE já devolve `current` e `accountLabels` para isto (BRIEF do BE item 8) |
| **F-FE-POL-4** | Com proposta pendente, o formulário do dono mostra o vigente ou o proposto | **O vigente** + faixa "proposta v{n} pendente; enviar outra substitui por inteiro" com link para a proposta | **O proposto** (o formulário hidrata do `payload` da pendente, para o dono continuar editando a proposta) | — | ✅ **(a), dono 06/10**, com o custo dito. O formulário mostra o que **vale**, o mesmo que o resto do app usa (NF-e, X7, emissão). O custo: no `FISCAL_PROFILE` (substituição total), o dono que edita a partir do vigente e reenvia descarta a mudança da proposta anterior. A faixa avisa isso. (b) evita essa perda, mas a tela de perfil passa a mostrar valores que ainda não valem, e o selo "Pronto para emitir NFS-e" (`emissao`) fica desalinhado do formulário |

**Direto (sem fork), com o motivo:**
- **Um PR só.** Sem o lado do contador (itens 7–10), a proposta do dono não tem quem aprove pela tela, e o intervalo
  troca o 409 por uma proposta parada. São ~4 arquivos novos e 4 editados, no tamanho do #515.
- **Sem retirada de proposta pelo dono:** o BE não tem a rota (F-POL-6 a; a nova substitui a pendente).
- **Sem tela para os campos sem controle** (L2, E-6, E-12): a proposta os leva como o PUT leva hoje, e o diff os
  mostra pelo nome técnico (item 8).

## 6. Pendente de validação externa

- **Lista de parâmetros sob aprovação:** herdada do BRIEF do BE §6. O contador não validou o F-POL-2; a tela só expõe
  o que o BE governa.
- **Texto do aviso de aprovação** (*"Aprovar aplica estes valores agora no livro de…"*): o valor da aprovação no app
  é atestado interno, com o mesmo alcance do sign-off (BRIEF do BE §6; MP 2.200-2 art. 10 § 2º). A redação é de
  produto até a leitura do contador ou do jurídico. Nada no código depende disso.
- **F-GOV-1 (CRC-SP)** segue do dono.

## 7. Roteiro do runbook de browser (a preparar em branco no PR — item 14)

Pré-condições: build de produção; `dev.db` real (`server/prisma/prisma/dev.db`); dois usuários (dono com unidade e
perfil fiscal, contador com conta) e uma atribuição ACTIVE entre eles (convite + aceite pelas telas do #515); DevTools
com o Network filtrado em `policy-versions`.

1. **Dono, Perfil fiscal:** o botão diz "Enviar ao contador"; mudar `pisCofinsCreditFromSimplesSupplier` e enviar →
   201; o formulário mostra o vigente (`false`) e a faixa da proposta v{n}. Evidência: corpo do POST (sem `unitId`
   dentro de `payload`) + print.
2. **Dono, Imobilizado → Contas:** mudar a despesa de depreciação e enviar → 201; mensagem "enviadas ao contador", não
   "salvas". Evidência: corpo do POST com só as 3 chaves.
3. **Dono, perfil fiscal de novo:** enviar outra proposta → a faixa troca para v{n+1}; na aba de versões, a anterior
   aparece `SUPERSEDED`.
4. **Contador, modo cliente:** o strip mostra "2 propostas aguardando"; a aba de versões aparece (F-FE-POL-2 a); o
   detalhe mostra o diff com o rótulo das contas. Evidência: Network **sem** `GET /accounts`, `/fiscal-profile` ou
   `/settings` nesta sessão de tela; toda chamada com `ownerUserId`.
5. **Contador aprova** a do perfil → `APPLIED`; o dono recarrega e vê `true` no perfil.
6. **Contador rejeita** a das contas com motivo → `REJECTED`; o dono vê o motivo na lista.
7. **Corrida:** com o detalhe aberto no contador, o dono envia nova proposta; o contador aprova a antiga → texto de
   "proposta mudou" e recarga (409 `POLICY_VERSION_STATUS_CHANGED`).
8. **Sem contador:** encerrar a atribuição; o dono salva o perfil direto (PUT 200), e a lista mostra a versão como
   "aplicada direto".

Desfecho em 3 estados (PASSOU / FALHOU / BLOQUEADO) e assinatura do executor humano (`RUNBOOK-FORMAT.md`).

## 8. Insumos ausentes

- Nenhum que bloqueie o desenho. Não houve teste de browser do BE do #517 (o PR registra unit + integração). O passo
  23 do runbook é o primeiro uso real das 5 rotas por tela.

## 9. Achados fora de escopo (não planejados)

- **`FiscalProfileView` do FE defasado do BE (E-6):** 6 campos de conta que o #521/#529 acrescentaram não estão no
  espelho à mão nem no formulário. O PUT de hoje os omite e, pelo §1 (I), eles ficam preservados. Mas a tela não os
  mostra nem edita, e um teste de integração do BE que prove "chave omitida não muda" não existe. Sobe para a decisão
  da L2.
- **L2 e L4 do FE-INCR-DFE** continuam abertas (campos sem controle; toast do 404 esperado). O E-4 (toast em todo
  não-2xx) também pesa no F-FE-POL-1 (b), caso o dono o escolha.
- **Sem tela para tarifa bancária e conta da Parte B** (E-12): parâmetros governados (`SCOPE_SETTINGS`) que nenhuma
  tela edita; só o diff do contador os mostra.
- **`CompanyFiscalProfile` e coleções sob aprovação:** F-POL-2 (c)/(d), não autorizados.
- **Duplicata no `estado_detalhe` do GOV-CONTADOR:** o trecho "05/10 (fold)" aparecia duas vezes. Corrigido no mesmo
  PR deste BRIEF (é o campo que este PR edita).
