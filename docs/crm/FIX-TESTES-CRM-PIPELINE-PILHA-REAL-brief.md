# BRIEF — FIX-TESTES-CRM-PIPELINE-PILHA-REAL: as rotas do pipeline do CRM pela pilha real

> **Estado:** BRIEF de correção, 04/11/2026. **EXECUTA** (dono, chat, 04/11, questionário: *"Executa, forks na recomendação
> (Recomendado)"*): vale para o BRIEF inteiro, sem merge, e todos os forks estão ratificados na recomendação.
> Régua: [`APRENDIZADOS-TESTES-2026-11-04.md`](../operating-manual/APRENDIZADOS-TESTES-2026-11-04.md) (A2, A3, A4, A6).

## 0. Contexto fixo

- **Item:** inventário de testes (PR #1065), §5 (CRM "fraco: pipeline, conversão e no-show sem integração") e §7, item 5
  ("CRM e users/auth: caminho feliz pela pilha + erros nomeados").
- **Autorização:** dono, chat, 04/11: *"… e onde já estiver implementado, você também já cria briefs de correção de acordo
  com o aprendizado."* Cobre **este BRIEF**. Executar pede `executa` próprio.
- **Fatos lidos (verificado, 04/11, `origin/main` 66f2d5d97):**
  - `server/src/routes/crm.ts:24–34`: `POST /pipeline/advance`, `/pipeline/proposal`, `/pipeline/no-show`,
    `/pipeline/convert-lead`, `/pipeline/advance-opportunity`, `/pipeline/convert-lead-to-opportunity` e
    `GET /pipeline-analytics`.
  - Integração existente: só `/pipeline/convert-lead`, e só pelo portão de módulo (`dashboardModules.integration.test.ts:139,
    150, 393`). As outras 6 rotas não aparecem em nenhum `*.integration.test.ts` (grep do caminho literal e de
    `advanceStage|convertLead|noShow`).
  - `CrmPipelineService.test.ts` (41 `jest.fn`/`jest.mock`) prova a atomicidade **contando chamadas** ("1× runInTransaction,
    2× createTableData … todos no MESMO tx", `:258`). É a classe "tx não propagado ao repo" (memória do projeto): a
    contagem passa mesmo que o repositório real ignore o `tx`.
  - `crmController.test.ts:56–105` prova a ponte CRM → AR (Won) com dublês.
- **Usuários e auth (fora daqui, verificado):** a troca de senha que o inventário marcou "sem teste" tem integração:
  `fixAuthConta.integration.test.ts:61–81` e `UserService.integration.test.ts:183–193`. Não há BRIEF de correção para ela.

## 1. Checklist de comportamentos

Sessão: **`sessao-feature`** com `executa` (cobertura). Caso que sair vermelho vira PR vermelho de propósito e segue para
a `sessao-correcao`, um por achado.

Arquivo novo `server/src/controllers/__tests__/crmPipeline.integration.test.ts`, pela HTTP (`makeApp` + `authHeader`),
com repositórios reais sobre o `test-integration.db`.

1. **[direto] Cenário (A4).** Um helper monta o tenant pelo caminho normal: `POST /api/dashboard/create` com a suíte que tem
   CRM-0 (como `dashboardModules.integration.test.ts:23`), mais 1 lead na 1ª etapa, 1 lead já `Converted` e 1 oportunidade
   aberta. Data de referência literal para `nextActionAt` (A8).
2. **[direto] `advance` para etapa de proposta (A6):** 200; relê o lead (etapa nova) **e** a proposta criada.
3. **[direto] Atomicidade real (A2):** força a falha da 2ª escrita. A forma é o F-CRM-1. Depois relê: **nem** a proposta
   **nem** a etapa do lead mudaram. Prova pelo banco o que o unit prova por contagem.
4. **[direto] `proposal`:** 200; proposta relida e snapshot do lead atualizado.
5. **[direto] `no-show`** com `reschedule` (relê `nextActionAt` e a atividade) e com `revert` (relê o `stageId` anterior).
6. **[direto] `convert-lead` (A6):** 200; relê account, contact (com `accountId` e `leadId`) e o lead `Converted`.
7. **[direto] `convert-lead` no estado do bug (A2):** lead **já** `Converted` → a recusa que o código dá hoje (o unit diz
   `ValidationError`, `:331`), e a contagem de accounts e contacts igual antes e depois.
8. **[direto] `advance-opportunity` para Won:** 200; o título a receber da ponte existe **uma** vez. Um 2º `advance` para Won
   não cria outro (idempotência no estado do bug).
9. **[direto] `convert-lead-to-opportunity`:** 200; oportunidade relida com o lead de origem.
10. **[direto] Uma falta por vez (A3):** sem CRM-0 instalado (409 `ModuleNotInstalledError` com `moduleKey`); lead de outro
    dono (404, sem escrita); etapa inexistente. Cada caso num teste, e a mensagem não traz id interno de outra tabela
    (F-CRM-2).
11. **[direto] `pipeline-analytics`:** com o cenário do item 1, a resposta contra **valores esperados fixos** (contagem por
    etapa e valor do funil, A7).

## 2. Contratos

Nenhum contrato novo. O teste usa as rotas e os DTOs de `features/crm/dtos/` como estão.

Gates do diff: `tsc` do server com `tsconfig.test.json`. Rodar local só o arquivo, com `--runInBand`.

## 3. Forks (RATIFICAÇÃO PENDENTE)

### F-CRM-1 — Como forçar a falha da 2ª escrita no item 3
- (a) Estado do banco que faz a 2ª escrita falhar de verdade (por exemplo, o lead apagado entre as duas), sem dublê.
- (b) `jest.spyOn` no repositório real só na 2ª chamada, lançando erro.
- **Recomendação:** (a), se o código tiver um caminho assim (a sessão confere); senão, (b). O spy não troca o repositório,
  só injeta a falha.
- **Status: ✅ RATIFICADO (a), com a queda para (b) prevista na recomendação**, dono, chat, 04/11, questionário: *"Executa, forks na recomendação (Recomendado)"* ([D-2026-11-04-APRENDIZADOS-TESTES](../plano/decisoes/D-2026-11-04-APRENDIZADOS-TESTES.md)).

### F-CRM-2 — Mensagens com id no CRM
- (a) Se algum caso do item 10 mostrar id interno no texto, abre-se achado e `sessao-correcao` (mesma classe do DFE-1).
- (b) Só registrar no GAP-MAP e não corrigir agora.
- **Recomendação:** (a), mas cada achado com teste-guarda vermelho próprio, sem corrigir dentro deste PR.
- **Status: ✅ RATIFICADO (a)**, dono, chat, 04/11, questionário: *"Executa, forks na recomendação (Recomendado)"* ([D-2026-11-04-APRENDIZADOS-TESTES](../plano/decisoes/D-2026-11-04-APRENDIZADOS-TESTES.md)).

## 4. Pendente de validação externa

Nenhum.

## 5. Insumos ausentes

- Os textos de erro das 7 rotas (não lidos). A sessão lê `CrmPipelineService` antes do item 10.

## 6. Achados fora de escopo

- `crmController.test.ts` e `CrmPipelineService.test.ts` continuam como estão: o unit prova a regra, e este BRIEF prova a
  ligação (A1).
