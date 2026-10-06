# BRIEF — FE-INCR-BINDING-ACTIVATION (tela) — LAC-B: o operador ativa a contabilidade da unidade sem CLI

> Produzido em `sessao-planejamento`, 2026-10-06, sobre `origin/main` `6ac4381d`. Nó [LAC-B](../plano/nos/LAC-B.md).
> Complementa o [BRIEF de 02/09](FE-INCR-BINDING-ACTIVATION-brief.md) (itens 1–3 e 5 entregues no #389) no seu
> **item 4** ("UI mínima conforme F-B1"), que nunca ganhou spec.
>
> **Forks deste BRIEF: F-BA-1..6 ✅ RATIFICADOS em 06/10** por questionário ([D-2026-10-06-LAC-B-TELA-FORKS](../plano/decisoes/D-2026-10-06-LAC-B-TELA-FORKS.md)): 1 a · 2 a (condicional
> ao F-I4-4 → a′) · 3 **b** · 4 a · 5 a · 6 a — todos na recomendação. O F-BA-2 volta ao dono se o F-I4-4 for decidido
> diferente de (a′).
> **Autoriza planejar, não executar.** Código exige *"executa"* (ORCH-006). O *"executa"* de 01/10 dado à LAC-B
> é anterior a esta spec e não a cobre sem confirmação do dono (ver §0, divergência 2).

## 0. Contexto fixo

- **Item:** UI da ativação self-service do binding contábil padrão do setor — o `my-app` passa a chamar
  `POST /api/accounting-binding/activate-default`. Linha de origem: nota [LAC-B](../plano/nos/LAC-B.md)
  (`SDD:1186`: *"hoje zero referência a `accounting-binding` no `my-app`"*).
- **Autorização:** dono, chat, 2026-10-06, por questionário: *"Abrir BRIEF da tela"* (em vez de fechar o nó como
  `done`) + *"Dispara em sequencia aqui tudo em opus medio"*. Escopo: **só BRIEF, sem código; nenhum fork se
  auto-ratifica.** Cobre este documento e a nota do nó. Divergências declaradas:
  1. O F-B1 ratificado em 02/09 diz *"(a) só endpoint agora, (c) chamada automática no onboarding depois"* — não
     ratificou uma tela manual (a opção (b) "botão manual em aba de configuração contábil" não foi escolhida).
     A decisão de 06/10 de abrir o BRIEF da tela **reabre o F-B1 no lado (b)**; a forma da tela é fork aqui
     (F-BA-1), não decisão herdada.
  2. A nota tem um *"executa"* de 01/10 (teste Sonnet × Opus) para a LAC-B. Ele foi dado quando não havia spec de
     tela (`perfil_evidencia` da nota). Este BRIEF não o trata como cobrindo a tela: a execução pede confirmação.
- **Insumos lidos no código nesta sessão (V = verificado por leitura):**
  - Rota `POST /api/accounting-binding/activate-default` (`routes/accounting-binding.ts:25`), controller
    `accountingBindingController.ts:118-134`, serviço `BindingActivationService.activateDefault` (`:68-141`).
    Request `.strict()`: `{ unitId, sectorKey?, installChartIfEmpty?, openCurrentPeriodIfMissing? }`
    (`ActivateDefaultBindingDto.ts`). Resposta `{ status: 'Active'|'already-active'|'Draft', bindingVersion?,
    blocking?: [{ code, message, slot?, accountCode?, period? }] }`.
  - Pré-checks sem gravar: plano vazio sem flag ⇒ `CHART_OF_ACCOUNTS_EMPTY`; mês corrente `MISSING`/`FUTURE` sem
    flag ⇒ `ACCOUNTING_PERIOD_NOT_OPEN` com `period`; `SOFT_CLOSED`/`HARD_CLOSED` ⇒ o mesmo código, **mesmo com a
    flag** (mensagem "reabra-o"). Depois o `compile()`: `Draft` traz os bloqueantes do validador e
    `EVENT_COVERAGE_MISSING`. O mês é o **UTC** (`today()` = `toISOString().slice(0,10)`, `:66`).
  - `GET /api/accounting-binding?unitId=&sectorKey?&status?` (`:26`, controller `:97-115`) lista as versões —
    serve para saber se a unidade tem binding `Active`.
  - Policy: `canActivateDefault` = `!!scope.actorUserId` (`AccountingBindingPolicy.ts:24`); o escopo é o silo
    **do próprio chamador** (`resolveBindingScope(user, unitId)`).
  - Setores: `SECTOR_BINDING_REGISTRY` com `beautySalon` e `aestheticClinic`; sem `sectorKey` vale
    `DEFAULT_SECTOR_KEY` = salão (`sectorBindingRegistry.ts`). Não existe rota que liste setores.
  - **`already-active` é por setor:** `findActive(scope, sectorKey)` e o supersede do `compile()`
    (`BindingCompileService.ts:311-317`) filtram por `sectorKey`. As fixtures do salão e da clínica têm os mesmos
    6 `eventKey` (`sale.finalized`, `.settled`, `.returned`, `.package.sold`, `.cogs`, `.package.expired`). O
    registro de mappers usa a chave `unitId:sourceType` e lança `AccountingEventMapperCollisionError` na
    repetição (`AccountingSyncService.ts:78-84`); no boot isso aborta o processo (`server.ts:36-58`). Ver F-BA-5.
  - Registro de mappers só no boot (`initializeAccountingSyncFromBindings`, chamado só por `server.ts:37`): depois
    de um `Active` pela rota, as vendas da unidade seguem sem mapper até reiniciar — achado §8 do
    [BRIEF do I4/I5](BE-INCR-ONBOARDING-ACTIVATION-brief.md), fork F-I4-4 (a′) daquele BRIEF. Ver F-BA-2.
  - Front: zero consumidor de `/accounting-binding` em `my-app` (grep 06/10). Os tipos já existem, gerados:
    `my-app/types/contracts/accountingBinding/ActivateDefaultBindingDto.gen.ts` e `CompileBindingDto.gen.ts`
    (`ListBindingsQueryInput`), desde o #485.
  - `AccountingView.tsx`: 23 abas (`Tab`, `:44`); seletor de unidade sobre a tabela dinâmica `units`
    (`useAccountingData.ts:24-50`); **modo cliente** (contador, `governance`) mostra só `DELEGATED_TABS =
    ['periodos','compliance']` (`:85`) e usa o `unitId` do cliente (`:129`).
  - Canônicos de UI: `components/ui/Modal.tsx`, `components/ui/feedback/{ConfirmModal,Alert}.tsx`,
    `lib/notifications/notify.ts`, `features/accounting/lib/resolveError.ts`.
- **Nós vizinhos:**
  - [I4](../plano/nos/I4.md) (`planned`, sem *"executa"*): o onboarding chama `activateDefault` com as duas flags
    `true` (item 10 do BRIEF I4/I5). Forks F-I4-4 (recarga) e F-I4-5 (wizard mostra o resultado) **pendentes**.
  - [I5](../plano/nos/I5.md) (`planned`, sem *"executa"*): F-I5-3 → (a) e F-I5-4 → (a) ratificados 06/10 — toda
    venda sem mapper vira `NO_MAPPER_FOR_UNIT`, visível numa aba "Pendências" com "Re-varrer"
    (`reconcilePending.service.ts` + `ReconcilePendingPanel.tsx`, itens 17–20 daquele BRIEF; ainda não existem).
  - [I3](../plano/nos/I3.md): dono do endpoint (#389).

## 1. Estado atual medido

| # | Situação | Hoje (V) |
|---|---|---|
| 1 | Unidade nova (onboarding ou linha nova em `units`) | Sem binding, plano de contas nem período — o onboarding não ativa (I4 não executado) |
| 2 | Operador quer ativar | Só por CLI (`activateAccountingBindingCli.ts`) ou chamada HTTP manual |
| 3 | Venda dessa unidade | `ValidationError` "Nenhum mapper" → `FAILED` em `reconcile_pending_items` (vira `NO_MAPPER_FOR_UNIT` quando o I5 PR-1 entrar) |
| 4 | Depois de ativar pela rota | `Active` no banco; vendas seguem sem mapper até reiniciar o processo (I, leitura; o teste do item 13 do BRIEF I4/I5 é o que mostraria) |
| 5 | Ativar o outro setor na mesma unidade | Grava um 2º `Active` (sem `already-active`, que é por setor); no próximo boot a colisão de `eventKey` aborta o processo (I, por leitura dos 3 pontos da §0; nenhum teste roda esse caso) |

## 2. Checklist numerado de comportamentos

Sessão: `sessao-feature` sobre este BRIEF, com o teste de cada item escrito e vermelho **antes** do código.
Ordem: **PR-0 (BE, só se F-BA-5 → a) → PR-1 (FE)**. O PR-1 não depende do I4; o item 8 depende do I5 PR-3 se o
F-BA-3 for (b).

### PR-0 — só se F-BA-5 → (a): a rota recusa o 2º setor

0. **Guarda de setor único por unidade.** `activateDefault` procura binding `Active` da unidade **em qualquer
   setor** (leitura nova no repo: `findActiveAnySector(scope)` ou `list(scope, { status:'Active' })`, que já
   existe). Se houver um de outro setor ⇒ `ConflictError` 409 `BINDING_SECTOR_CONFLICT` com o setor ativo na
   mensagem; nada gravado. Mesmo setor segue `already-active`. **Não cobre o CLI nem `POST /compile`:** o CLI
   chama `BindingCompileService.compile()` direto (`activateAccountingBindingCli.ts:138-139`, V) — fica no achado §8.
   *Testes:* integração com salão `Active` + pedido da clínica ⇒ 409 e `accountingBinding.count` inalterado;
   salão + salão ⇒ `already-active`. `docs.paths.ts` ganha o 409 na rota (path-count não muda); o código novo
   entra no contrato de erro, sem `eventType` de auditoria novo.

### PR-1 — a tela

1. **Serviço.** `my-app/lib/services/accountingBinding.service.ts`:
   `listActive(unitId)` → `GET /accounting-binding?unitId=&status=Active` e `activateDefault(body)` → `POST
   /accounting-binding/activate-default`. Request por `import type` de `ActivateDefaultBindingRequestInput`;
   resposta por `ActivateDefaultBindingResultInput` (já gerado). *Teste vitest:* URL, query, body e desembrulho
   do `data`.
2. **Estado da unidade.** Hook `useUnitAccountingActivation(unitId)` → `{ state: 'loading'|'active'|'inactive'|
   'error', activeSectorKey?, reload }` a partir do `listActive`. Troca de unidade descarta resposta atrasada
   (mesma regra do `contextKey` da `AccountingView`). *Teste:* lista vazia ⇒ `inactive`; uma linha ⇒ `active`
   com o setor; erro ⇒ `error` sem esconder a tela.
3. **Superfície (F-BA-1 → a, ratificado 06/10).** Faixa (`Alert` canônico) na
   `AccountingView`, abaixo do cabeçalho e acima das abas, **só** quando `state === 'inactive'`: *"A contabilidade
   automática desta unidade não está ativa — as vendas não geram lançamento."* + botão **"Ativar contabilidade"**.
   Some quando `active`. `neutral-*`, `rounded-2xl`.
4. **Modo cliente fora (direto, sem fork).** Com `governance` definido a faixa não renderiza e o hook não chama a
   rota: a ativação grava no silo **do chamador** (`resolveBindingScope(user, unitId)`), não no do cliente.
   *Teste:* com `governance`, nenhum `GET /accounting-binding` e nenhuma faixa.
5. **Confirmação (F-BA-6 → a, ratificado 06/10).** `ConfirmModal` antes da chamada,
   listando o que será feito: setor (F-BA-5); *"instala o plano de contas padrão se o da unidade estiver vazio"*;
   *"abre o período do mês corrente se ainda não existir"*. Confirmar ⇒ `activateDefault({ unitId, sectorKey,
   installChartIfEmpty: true, openCurrentPeriodIfMissing: true })` — as mesmas flags do onboarding (item 10 do
   BRIEF I4/I5). Botão desabilitado em voo (sem duplo envio).
6. **Resultado.**
   - `Active` / `already-active` ⇒ `notify` de sucesso, `reload()` do hook (a faixa some) e a mensagem do F-BA-2.
   - `Draft` ⇒ a faixa mostra a lista `blocking`: rótulo i18n por `code` conhecido
     (`CHART_OF_ACCOUNTS_EMPTY`, `ACCOUNTING_PERIOD_NOT_OPEN` com o `period`, `EVENT_COVERAGE_MISSING`) e a
     `message` do BE para os demais (validador). `ACCOUNTING_PERIOD_NOT_OPEN` de período fechado traz o link
     **"Ir para Períodos"** (`setActiveTab('periodos')`, padrão `onNavigateToPeriods` já usado na view).
   - 400/403/409 ⇒ `resolveError` (mensagem do BE), sem fechar a faixa.
   *Teste:* um caso por ramo; espere o **DOM**, não a chamada (memória
   `handler-async-closure-stale-x-waitfor-tohavebeencalled`).
7. **Recarga dos mappers (F-BA-2 → a, ratificado 06/10; condicional ao F-I4-4 → a′).** Com F-BA-2 (a) a tela não
   faz nada além do item 6: a recarga é do BE (F-I4-4 → a′). Se o dono decidir F-BA-2 (c), o sucesso diz
   *"as vendas desta unidade passam a ser lançadas após o próximo reinício do servidor"*.
8. **Pendências (F-BA-3 → b, ratificado 06/10).** No sucesso, link **"Ver pendências da
   unidade"** para a aba `pendencias` (F-I5-4 a), onde fica o "Re-varrer". O link só renderiza se a aba existir em
   `TABS` (o PR-1 pode entrar antes do I5 PR-3 sem link quebrado). *Teste:* com a aba, o link troca a aba; sem
   ela, não renderiza.
9. **Setor (F-BA-5 → a, ratificado 06/10).** Seletor com os setores do registry (salão,
   clínica), rótulos i18n, padrão salão. Lista no FE espelhando o registry — duplicação declarada (não há rota de
   setores); um teste vitest fixa os dois valores, e um setor novo no BE sem o FE só deixa de aparecer na tela.
   Com PR-0, o 409 `BINDING_SECTOR_CONFLICT` aparece pelo item 6.
10. **i18n:** paridade pt/en em `public/locales/{pt,en}/accounting.json` (`activation.*`: faixa, botão, modal,
    rótulos dos 3 códigos de pré-condição, setores, sucesso, link). *Gate:* paridade de chaves e `skill-audit
    wiring`.
11. **Gates do PR-1:** `cd my-app && npx tsc --noEmit` **e** `npm run test:types` (o `tsc` cru exclui testes);
    vitest de `features/accounting` + `lib/services`; `next build` de produção (tela atrás de `withAuth`).
12. **Runbook de sign-off de browser em branco** (`RUNBOOK-FORMAT.md`): unidade sem binding → faixa → ativar →
    faixa some → venda lança (ou fica pendente até o reinício, conforme F-BA-2) → Pendências. O agente prepara em
    branco; **evidência, desfecho e assinatura são do dono**.

## 3. Camadas

| PR | Route | Controller | Service | Repository → Prisma | Policy |
|---|---|---|---|---|---|
| 0 | `POST /activate-default` (existe) | `accountingBindingController` (existe; mapeia o 409 por `handleApiError`) | `BindingActivationService` (guarda nova) | `AccountingBindingRepository` (`list` existe; leitura nova só se preciso) | `canActivateDefault` (existe) |
| 1 | `GET /accounting-binding` e `POST /activate-default` (existem) | — | FE: `accountingBinding.service.ts` | — | — |

Nenhuma rota nova; nada no motor de plugins; nenhum `eventType` de auditoria novo (a ativação audita pela cadeia
`binding.*` do `compile()`).

## 4. Contratos esboçados

```ts
// my-app/lib/services/accountingBinding.service.ts (PR-1)
import type { ActivateDefaultBindingRequestInput, ActivateDefaultBindingResultInput }
  from '@/types/contracts/accountingBinding/ActivateDefaultBindingDto.gen';
listActive(unitId: string): Promise<Array<{ id: string; sectorKey: string; bindingVersion: number; status: 'Active' }>>; // view tipada à mão (D11) se o gen não cobrir a linha
activateDefault(body: ActivateDefaultBindingRequestInput): Promise<ActivateDefaultBindingResultInput>;

// hook (PR-1)
type UnitAccountingActivation =
  | { state: 'loading' | 'inactive' | 'error' }
  | { state: 'active'; activeSectorKey: string };

// setores no FE (PR-1, item 9) — espelho do SECTOR_BINDING_REGISTRY
export const ACTIVATION_SECTORS = ['beautySalon', 'aestheticClinic'] as const;

// PR-0 (só se F-BA-5 a)
export class BindingSectorConflictError extends AppError {   // 409, 'BINDING_SECTOR_CONFLICT'
  constructor(unitId: string, activeSectorKey: string, requestedSectorKey: string) { /* … */ }
}
```

## 5. Forks — ✅ RATIFICADOS 06/10 ([D-2026-10-06-LAC-B-TELA-FORKS](../plano/decisoes/D-2026-10-06-LAC-B-TELA-FORKS.md))

Dono, chat, 2026-10-06, questionário. Todas as cédulas na recomendação. **PR-0 entra** (F-BA-5 a).

- **F-BA-1 · onde a ativação aparece?**
  - **(a)** Faixa na `AccountingView`, acima das abas, só quando a unidade selecionada não tem binding `Active`.
  - **(b)** Aba nova "Configuração contábil" (24ª aba) com o estado e o botão.
  - **(c)** Cartão dentro da aba "Plano de Contas".
  - **Recomendação: (a).** O problema só existe enquanto a unidade está inativa, e quem está em qualquer aba
    precisa saber que as vendas não lançam. (b) esconde o aviso atrás de uma aba que ninguém abre sem saber; (c)
    amarra a um painel que não é o objeto. A faixa some sozinha quando resolve. ✅ **(a), dono 06/10.**
- **F-BA-2 · a unidade ativada pela tela lança sem reiniciar?** Mesma causa do F-I4-4 (registro só do boot).
  - **(a)** A tela depende do **F-I4-4 → (a′)** do BRIEF I4/I5 (recarga no caminho comum `compile()` → `Active`,
    que cobre `/activate-default`): um conserto, uma decisão. A tela não muda.
  - **(b)** Este BRIEF ganha item BE próprio: o controller de `/activate-default` recarrega depois de `Active`
    (cópia do item 13 do I4 em outra rota — dois donos da mesma recarga).
  - **(c)** Sem recarga: a tela avisa que as vendas lançam após o próximo reinício; as do intervalo ficam como
    `NO_MAPPER_FOR_UNIT` e saem por "Re-varrer" depois do reinício.
  - **Recomendação: (a).** É o conserto de classe que o BRIEF I4/I5 já descreveu. Sem ele a tela entrega um
    `Active` que não lança — o "verde que não opera" que aquele BRIEF nomeia como risco principal. Se o F-I4-4
    for decidido em (a) ou (b), este fork volta ao dono (não cai sozinho em (c)). Atenção: com a recarga em
    runtime, uma colisão de setor (F-BA-5) passa a falhar na recarga em vez de no boot. ✅ **(a), dono 06/10 — depende do F-I4-4 → (a′).** O F-I4-4 segue PENDENTE no
    BRIEF I4/I5; se for decidido diferente de (a′), este fork volta ao dono.
- **F-BA-3 · a tela e a aba Pendências (F-I5-4 a).** A pendência `NO_MAPPER_FOR_UNIT` das vendas anteriores à
  ativação só sai com "Re-varrer".
  - **(a)** A própria faixa ganha "Re-varrer" no sucesso (chama `rescan({ unitId })`).
  - **(b)** A faixa só leva à aba Pendências; o "Re-varrer" vive lá (item 8).
  - **(c)** Rescan automático logo depois do `Active`.
  - **Recomendação: (b).** O F-I5-4 (a) já pôs o "Re-varrer" num lugar; dois botões para o mesmo efeito são dois
    donos. (c) dispara antes da recarga (F-BA-2) e não resolve nada sem ela. ✅ **(b), dono 06/10** — só o link para a aba Pendências.
- **F-BA-4 · o botão manual e a ativação automática do I4 coexistem?**
  - **(a)** Sim, para sempre: a faixa aparece para **qualquer** unidade sem binding `Active` — onboarding que
    devolveu `Draft` (F-I4-2 b), unidade criada depois como linha da tabela `units` (que nunca passa pelo
    onboarding), tenant anterior ao I4, setor custom. O I4 cobre o caso feliz do onboarding; a faixa, o resto.
  - **(b)** Só até o I4 entrar; depois a faixa é removida.
  - **(c)** Só quando o onboarding devolveu `Draft` (exige guardar esse resultado, que hoje o front descarta).
  - **Recomendação: (a).** As unidades vêm de linhas de uma tabela dinâmica (`useAccountingData.ts:24-50`); a
    segunda unidade de um tenant não passa pelo onboarding, e o I4 não a cobre. (c) pede persistir um estado que
    o próprio `GET /accounting-binding` já responde. **Quem aparece onde:** onboarding (I4) = automático, sem
    clique; `AccountingView` = faixa só quando falta; F-I4-5 (b), se ratificado, avisa no wizard e pode apontar
    para a mesma faixa. ✅ **(a), dono 06/10** — convive sempre com o I4.
- **F-BA-5 · setor e a 2ª ativação na mesma unidade.** `already-active` é por setor, e salão e clínica têm os
  mesmos 6 eventos: ativar o outro setor grava um 2º `Active` e o próximo boot aborta para **todos** os tenants
  da instância (§1 linha 5; inferido por leitura de três pontos, não executado).
  - **(a)** Seletor de setor na tela **+** PR-0: a rota recusa outro setor com 409 se a unidade já tem `Active`.
  - **(b)** Sem seletor: a tela sempre manda o padrão (salão). A clínica continua só por CLI/API. O risco do 2º
    setor segue aberto pela API.
  - **(c)** Seletor sem guarda no BE; a tela esconde o seletor quando há `Active` (guarda só no front).
  - **Recomendação: (a).** A tela é o que torna o 2º setor alcançável por clique; a guarda tem de estar onde a
    gravação acontece, não no front. (b) não serve à clínica (P2). Amplia o escopo para um item BE na rota do I3 —
    por isso é fork, não item direto. ✅ **(a), dono 06/10** — seletor + guarda 409 no PR-0.
    **O CLI continua SEM guarda:** `activateAccountingBindingCli` chama `BindingCompileService.compile()` direto
    (`activateAccountingBindingCli.ts:138-139`), e o PR-0 só guarda a rota `/activate-default` (o `POST /compile` também
    fica fora). Por esses caminhos, o risco de um 2º binding `Active` na mesma unidade derrubar o boot da instância
    **persiste** — lacuna para o GAP-MAP, inferida por leitura (não executada).
- **F-BA-6 · as flags `installChartIfEmpty` / `openCurrentPeriodIfMissing`.**
  - **(a)** Um `ConfirmModal` lista os efeitos e a confirmação manda as duas `true` (igual ao I4).
  - **(b)** Primeira chamada sem flags; a tela mostra os bloqueantes `CHART_OF_ACCOUNTS_EMPTY` /
    `ACCOUNTING_PERIOD_NOT_OPEN` com um botão por efeito e reenvia com a flag escolhida.
  - **Recomendação: (a).** O F-B2 pede flag **explícita**, *"nunca silenciosamente"*: o modal que nomeia os dois
    efeitos é o consentimento explícito, em um clique. (b) dá o mesmo resultado em até três chamadas, sem ganho
    de controle (não há outro plano de contas a escolher pela tela). ✅ **(a), dono 06/10** — a confirmação lista os 2 efeitos e manda as flags `true`.

## 6. Pendente de validação externa

**Vazia.** Nenhuma regra contábil, fiscal ou legal nasce aqui: a tela chama uma rota existente que reusa as
fixtures de binding e o plano canônico, validados nos gates que já os cobrem (H1/H2).

## 7. Insumos ausentes

1. **O front sabe o setor do preset instalado?** Não lido nesta sessão: não há rota que diga qual suíte a unidade
   instalou. Se existir, o F-BA-5 ganha uma opção (pré-selecionar o setor); não procurei além dos insumos (regra 2).
2. ~~O CLI passa pelo `BindingActivationService`?~~ Fechado na sessão: não passa — chama o `compile()` direto
   (`activateAccountingBindingCli.ts:138-139`). A guarda do PR-0 não o cobre.
3. **Linha devolvida pelo `GET /accounting-binding`:** o `.gen.ts` cobre a query (`ListBindingsQueryInput`); a
   forma da linha (payload serializado) não foi lida — o item 1 tipa à mão só os campos usados (D11) se o gerado
   não cobrir.

## 8. Achados fora de escopo (registrar, não planejar)

- **2º setor na mesma unidade derruba o boot da instância** — alcançável **hoje** pela API (`POST
  /activate-default` com `sectorKey` diferente, `POST /compile` e o CLI com `--sector-key`). Candidato ao GAP-MAP independentemente da tela;
  o PR-0 só existe se o F-BA-5 for (a). **06/10:** F-BA-5 → (a) ratificado, o PR-0 entra — mas só fecha a rota
  `/activate-default`. **O CLI continua SEM guarda:** `activateAccountingBindingCli` chama `BindingCompileService.compile()` direto
  (`activateAccountingBindingCli.ts:138-139`), e o PR-0 só guarda a rota `/activate-default` (o `POST /compile` também
  fica fora). Por esses caminhos, o risco de um 2º binding `Active` na mesma unidade derrubar o boot da instância
  **persiste** — lacuna para o GAP-MAP, inferida por leitura (não executada).
- **Mês UTC × fuso:** a rota abre o mês **UTC**. Uma ativação nas últimas 3 h do mês em BRT abre o mês seguinte,
  e as vendas daquela noite caem em `ACCOUNTING_PERIOD_NOT_OPEN` (mesmo achado do BRIEF I4/I5 §8). A tela não sabe
  qual mês o servidor vai abrir antes da resposta.
- **Editor da matriz papel→conta** (tenant que diverge do padrão) segue fora, como no BRIEF de 02/09.
- O F-B1 de 02/09 fica reaberto pela decisão de 06/10 (§0, divergência 1); a nota de decisão que o registre é do
  fold da ratificação deste BRIEF.

## 9. Riscos e vieses (T8)

- **Risco principal:** entregar a tela sem o F-BA-2 resolvido. O operador clica, vê "ativa", e as vendas não
  lançam até um reinício que ele não controla.
- **Segundo risco:** F-BA-5 (b)/(c) deixa o caminho que derruba o boot de todos os tenants a um parâmetro de
  distância.
- **Viés desta sessão:** as recomendações empurram decisões para outros BRIEFs (F-BA-2 → F-I4-4, F-BA-3 → F-I5-4)
  para evitar dois donos. Isso deixa a tela dependente de forks e PRs alheios: se o I4 não andar, a tela fica
  incompleta. A alternativa "completa por conta própria" é o F-BA-2 (b).
- **Caso adversarial tentado:** "a tela é desnecessária, o I4 basta". Refutado por leitura: unidades são linhas da
  tabela `units` e a 2ª unidade não passa pelo onboarding; o I4 não a cobre (F-BA-4).
- **Checagem que falharia se o §1 linha 5 estiver errado:** teste de integração que ativa salão e depois clínica
  na mesma unidade e chama `initializeAccountingSyncFromBindings()` — a leitura prevê
  `AccountingEventMapperCollisionError`. Se passar, o F-BA-5 perde o motivo e o PR-0 cai.
