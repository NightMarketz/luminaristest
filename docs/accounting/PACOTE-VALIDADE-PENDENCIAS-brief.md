# PACOTE-VALIDADE — pendências depois do PR #530 (PLANO, não executar)

## 0. Cabeçalho

- **Item:** o que ficou aberto depois da entrega do [`FE-INCR-PACOTE-VALIDADE`](../plano/nos/FE-INCR-PACOTE-VALIDADE.md)
  (PR #530, aberto, não mergeado; branch `claude/fe-incr-pacote-validade-258dfe`, commit `a41d88ad`) e o caminho até o deploy
  do [`PACOTE-VALIDADE`](../plano/nos/PACOTE-VALIDADE.md). Quatro frentes: **F1** pendências do próprio nó, **F2** a data da
  receita nas pontes de venda, **F3** a data D-1 na UI de vendas, **F4** o wizard "Finalizar Venda" (só como dependência),
  mais **F5** a ordem dos gates humanos e do deploy.
- **Forks F-PP-1..7 ✅ RATIFICADOS 05/10/2026** (as recomendações, por delegação; §5.1). F-PP-4 e F-PP-6 ficam condicionados aos insumos I4 e I1.
- **Autorização:** dono, chat, 05/10/2026: *"Vamos continuar planejando o que esta aberto ainda"*; e, por questionário na
  mesma data, as quatro frentes marcadas para este BRIEF: *"Pendências do nó PACOTE-VALIDADE"*, *"Pontes de venda que
  recuam a data"*, *"Data D-1 na UI de vendas"*, *"Wizard Finalizar Venda"* (esta *só como dependência de ordem*, sem
  planejar o fix, que está em sessão própria) e *"Arquivo novo, fora do PR #530"*. **Autorizava este BRIEF, não o código; o "executa" veio depois, na mesma data: *"Pode executar em sequencia"* (F2 → F3 → F1).** A
  `sessao-feature` / `sessao-instrumentacao` / `sessao-correcao` exigem os forks do §5 ratificados e um "executa" citável
  (ORCH-006). F2 e F3 não têm nó no vault: nascem como nó só no fold, depois da ratificação.
- **Forma:** BRIEF único com quatro frentes, declarado aqui e não escondido. A regra da casa é "um BRIEF por incremento", mas as
  frentes compartilham uma causa (o motor grava o campo `date` como ISO à meia-noite UTC) e uma ordem de execução (F2 antes do
  sign-off H2). Cada frente executa sob a sessão que o §3 indica.
- **Base:** `origin/main` `e3082584` (sem o #530). Os fatos sobre o código do #530 vêm da branch `a41d88ad`; os links para
  `RUNBOOK-H2-PACOTE-VALIDADE.md` só resolvem depois do merge do #530.

## 1. Fatos (grau: **V** = lido no código ou executado nesta sessão · **I** = inferido, não executado)

| # | Fato | Evidência | Grau |
|---|---|---|---|
| F1 | O motor DynamicTable **grava** o campo `date` como ISO à meia-noite UTC (`2026-11-25T00:00:00.000Z`) mesmo quando o FE manda `2026-11-25` | linha da venda lida no banco de verificação (05/10); `pacoteValidade.dataIso.integration.test.ts` (#530) asserta o ISO guardado | V |
| F2 | `scopeDay(scope, '<iso à meia-noite UTC>')` devolve o dia **anterior** em Brasília; só `YYYY-MM-DD` puro volta intacto | `models/dates.ts` (short-circuit só para date-only); `Intl` executado: `2026-11-25T00:00:00.000Z` → `2026-11-24` | V |
| F3 | A ponte de **receita** lê `data.date` por `scopeDay`: a competência da receita de produto/serviço sai datada **um dia antes** da venda | `SaleSalesAccountingBridge.ts:91` | V (leitura) / I (efeito, não executado) |
| F4 | A passada de reconciliação da receita entrega o `data.date` **cru** (ISO) ao evento; o lançamento sai do instante em UTC, ou seja, o dia **escrito**. A mesma venda sai em dias diferentes conforme quem a lança: a ponte (D-1) ou a reconciliação (D) | `accountingSyncReconcile.job.ts:1913` (cru) × `SaleSalesAccountingBridge.ts:91`; a revisão independente do #530 verificou que o `PostingService` usa getters UTC | I (receita); **V** para o pacote, corrigido no #530 |
| F5 | Liquidação e estorno datam por `paidAt`/`returnedAt`, que são **instantes** reais (correto em `scopeDay`); só caem em `data.date` quando esses campos faltam | `SaleSettlementBridge.ts:116`, `SaleReversalBridge.ts:122`; `RegisterPaymentService` grava `paidAt` | V |
| F6 | No `dev.db` real (cópia de 05/10) **não há nenhum lançamento** com `sourceType` de venda (`sale.*`): não há dado de venda a re-datar nesse banco | consulta `groupBy sourceType` sobre a cópia | V |
| F7 | O formatador genérico `renderTypedValue` já trata `type: 'date'` corretamente (`formatDate(..., { dateOnly: true })`). O que erra são os pontos **bespoke** que chamam `formatDateBR(sale.date)`, que lê o ISO como instante e converte para UTC-3 | `shared/utils/formatters.ts:232` × `SalesTable.tsx:197` (a lista mostrou 04/10 para venda de 05/10, verificado em browser) | V |
| F8 | Candidatos na mesma classe, não verificados um a um: o filtro de período (`isInPeriod(sale.date, …)`, `useSalesLogic.ts:79`) e os baldes mensais da analítica (`useSalesAnalytics.ts:44`, `new Date(s.date)`). A ordenação (`:84`) só compara ordem e não erra | leitura | I |
| F9 | O `apiClient` notifica (toast) o `message` do servidor **antes** de lançar o erro, e o `useSalesData.runSaleTransition` engole o erro. Logo o operador vê, no `PACKAGE_BALANCE_EXPIRED`, a mensagem do servidor: pt-BR fixo, com id de cliente e de pacote e a data em ISO | `api-client.ts` (`notify` e depois `throw`); `useSalesData.ts` (`catch` vazio); `errors.ts` (`PackageBalanceExpiredError`) | V |
| F10 | A resposta do aceite traz `acceptedByUserId` (cuid) e o FE o mostra cru; o PDF resolve o nome (`name \|\| username`) | `PackageSaleValidity.tsx` × `PackageAcceptanceService.generateReceipt` (#530) | V |
| F11 | O "Finalizar Venda" do wizard falha desde o baseline: cria a venda `Finalized` e depois os itens são recusados por `assertParentSaleNotFinalized`. A correção está em sessão própria (tarefa iniciada pelo dono em 05/10) | `saleItems.ts:assertParentSaleNotFinalized`; verificado em browser (400) | V |
| F12 | O #530 grava o aceite **depois** de venda + itens, com o `saleId` que `createSaleWithItems` devolve; o aceite funciona em venda `Draft` (o servidor não checa o status) | `SalesCreateModal.tsx` `handleSubmit`; `PackageAcceptanceService.create` (#530) | V |
| F13 | Ordem do dono para os gates humanos: **H1 → H2 → M2**; os passos 6–11 do H2 conferem **vendas no razão** | `docs/plano/gates/M2.md`, `H2.md` | V |
| F14 | O e2e do #483 (`pacoteValidade.e2e`) e vários testes de ponte criam a venda direto por Prisma com `YYYY-MM-DD`: não exercitam o ISO que o motor produz | `pacoteValidade.e2e.integration.test.ts` (`row('sales', …)`) | V |

## 2. O que já está decidido e este BRIEF não rediscute

- **Validade + data do lançamento da venda de pacote** passam a ler o dia como escrito: dono, chat, 05/10 (*"Validade + data do
  lançamento, neste PR"*), entregue no #530 (`saleDayAsWritten` / `calendarDayAsWritten` em `models/dates.ts`).
- **Item 14 do cadastro** por override no front (dono, 05/10, *"opção (a)"*), entregue no #530.
- O texto v1, o aceite por checkbox + assinatura no PDF e o selo "aceite não registrado" (F-FE-PV-1..7,
  [`D-2026-10-05-FE-PACOTE-VALIDADE-FORKS`](../plano/decisoes/D-2026-10-05-FE-PACOTE-VALIDADE-FORKS.md)).
- Vence → 100% vai para a 3.4 (F-JUR-3); sem aviso ativo (F-PV-11 a); sem retroatividade (F-JUR-2). O deploy espera o sign-off
  de browser + M2 (F-JUR-4).

## 3. Checklist (cada item testável sozinho; a forma final segue os forks do §5)

### F1 — pendências do nó FE-INCR-PACOTE-VALIDADE (sessão: `sessao-feature`, depois do merge do #530)

1. ⟨F-PP-1⟩ **Mensagem do saldo vencido legível.** O `PackageBalanceExpiredError` passa a dizer só *"Saldo de pacote vencido em
   DD/MM/AAAA."* (data formatada por componente, sem id de cliente nem de pacote), mantendo o `errorCode`
   `PACKAGE_BALANCE_EXPIRED` e o status 400. Testes: a mensagem exata; o código; a data formatada a partir de `YYYY-MM-DD`
   sem `Date` local (memória `date-only-rendering-utc-shift-class-bug`).
2. ⟨F-PP-2⟩ **"Quem" do aceite com nome.** `PackageAcceptanceResponse` ganha `acceptedByLabel: string` (`name || username`, o
   mesmo critério do PDF; cai no id se o usuário não existe mais). O detalhe da venda mostra o rótulo. Testes: serviço (usuário
   com nome, só com username, apagado) e o detalhe (mostra o rótulo, não o cuid). A resposta é escrita à mão dos dois lados (não
   entra no snapshot de DTO, que cobre entrada).
3. **Pedido ao jurídico, PE-FE-1..3** (documento em branco para o dono enviar, no formato de
   [`PEDIDO-JURIDICO-2026-10-02-PACOTE-VALIDADE.md`](PEDIDO-JURIDICO-2026-10-02-PACOTE-VALIDADE.md)): a redação do texto v1, a
   leitura "corpo 12 = 12pt = 16px" na tela e a suficiência de checkbox do operador + assinatura. O agente prepara; **não envia e
   não responde** (classe DADO, F-JUR-4 já triada).
4. **Fold do vault** (depois do merge; procedimento de `docs/plano/README.md` §Fold): linhas prontas no §4.4.

### F2 — a data da receita nas pontes de venda (cadeia: `sessao-instrumentacao` → `sessao-correcao`)

5. **Teste-guarda vermelho pelo caminho real.** Venda de **serviço** e de **produto** criada por `POST` (Draft) → itens →
   `PUT Finalized`, com `date` `2026-11-25`: o lançamento de receita tem de levar `2026-11-25`. Hoje deve sair `2026-11-24` (F3).
   Mais um caso **na virada de mês**: venda de `2026-12-01` não pode cair no período de novembro. Modelo:
   `pacoteValidade.dataIso.integration.test.ts` (#530).
6. ⟨F-PP-3⟩ **Correção mínima.** `SaleSalesAccountingBridge` passa a usar `saleDayAsWritten` (já existe, #530). Na variante (b),
   os fallbacks de `data.date` em `SaleSettlementBridge` e `SaleReversalBridge` também (`paidAt` / `returnedAt` seguem por
   `scopeDay`: são instantes). Sem helper novo.
7. **Reconciliação e ponte concordam.** Um teste que lança a mesma venda pela ponte e pela reconciliação e compara a data do
   lançamento (hoje F4: D-1 × D).
8. **Regra de fixture.** Teste de ponte/e2e que cria venda cria pelo caminho do motor, ou grava o ISO que o motor produz
   (`<dia>T00:00:00.000Z`), nunca só `YYYY-MM-DD` por Prisma. Converter o e2e do #483 onde ele afirma data (F14).

### F3 — a data D-1 na UI de vendas (cadeia: `sessao-instrumentacao` → `sessao-correcao`)

9. **Teste-guarda vermelho** com `TZ=America/Sao_Paulo`: (a) a linha da lista mostra o dia escrito; (b) o filtro "este mês" inclui
   uma venda do dia 1º; (c) o balde mensal da analítica põe a venda do dia 1º no mês certo. Cada um tem de falhar hoje (F7, F8).
10. ⟨F-PP-5⟩ **Correção** pelo mecanismo ratificado. O inventário dos pontos sai do teste do item 9: o que não falhar não entra.

### F4 — wizard "Finalizar Venda" (só dependência; o fix é de outra sessão)

11. ⟨F-PP-6⟩ **Reconciliar a ordem do aceite com a correção do wizard.** Quando a sessão do fix terminar, olhar como ela finaliza
    (se cria Draft, itens e depois `PUT Finalized`) e decidir onde o aceite entra. Hoje o #530 grava o aceite depois de
    `createSaleWithItems` (F12).
12. **Atualizar o runbook** `RUNBOOK-H2-PACOTE-VALIDADE.md` (que está no #530), passo 3: sai a ressalva "ou Salvar Rascunho"
    quando "Finalizar Venda" funcionar.

### F5 — ordem até o deploy do PACOTE-VALIDADE (gates humanos; agente não fecha)

13. Ver §9. Nada aqui é código.

## 4. Contratos (esboço materializável)

### 4.1 Resposta do aceite (F1 item 2)

```ts
// server: features/packages/dtos/PackageAcceptanceDto.ts (resposta, escrita à mão) · my-app: lib/services/packageAcceptances.service.ts
export interface PackageAcceptanceResponse {
  // … campos atuais …
  acceptedByUserId: string;
  acceptedByLabel: string;   // NOVO — name || username do usuário; o id se o usuário não existir mais
  acceptedAt: string;
}
```

### 4.2 Mensagem do saldo vencido (F1 item 1)

```ts
// lib/errors.ts
export class PackageBalanceExpiredError extends AppError {
  constructor(expiresOn: string /* 'YYYY-MM-DD' */) {
    super(`Saldo de pacote vencido em ${toBR(expiresOn)}.`, 400, 'PACKAGE_BALANCE_EXPIRED');
  }
}
// ponto de chamada: PackageBalanceService (pré-check de consumo) — deixa de passar customerId/packageId à mensagem
```

### 4.3 Helper de data (já existe no #530; F2 só o reutiliza)

```ts
// features/accounting/models/dates.ts
export function calendarDayAsWritten(value: string): string;                           // 'YYYY-MM-DD' | ISO à meia-noite UTC → dia escrito; senão ValidationError
export function saleDayAsWritten(scope: { timeZone: string }, value?: string): string;  // as duas formas do motor como escritas; o resto segue scopeDay
```

### 4.4 Fold do vault depois do merge do #530 (para quem executar)

- `FE-INCR-PACOTE-VALIDADE`: `estado: inflight` (ou `done`, se F1 entrar antes do merge), `prs: ["#530"]`, `atualizado`; `estado_detalhe`:
  itens 1–8 e 10–17 do BRIEF entregues (14 por override no front); B1 da ponte do #483 corrigido (validade e data do lançamento de
  origem); runbook H2-PACOTE-VALIDADE em branco; pendências = F1 deste BRIEF. `autorizacao`: acrescentar *"Executa o
  FE-INCR-PACOTE-VALIDADE" (dono, chat, 05/10/2026)*; hoje o campo diz "sem 'executa'".
- `PACOTE-VALIDADE`: no `estado_detalhe`, a ponte do #483 lia `data.date` por `scopeDay` (o saldo vencia 2 dias antes do aceito) e foi
  corrigida no #530.
- `node scripts/plano-vault.mjs index && node scripts/plano-vault.mjs check` (sai 0).

## 5. Forks — ✅ RATIFICADOS 2026-10-05 (as recomendações; detalhe em §5.1)

| Fork | Pergunta | Caminhos | Recomendação | Status |
|---|---|---|---|---|
| **F-PP-1** | Como o operador lê o erro do saldo vencido (F9) | (a) trocar o texto no BE: só a data em DD/MM/AAAA, sem ids, mantendo o código; (b) um mapa `código → chave i18n` no `apiClient`, para traduzir pt/en no cliente; (c) opção `silent` no `apiClient` para o modal mostrar a própria mensagem traduzida; (d) deixar como está (o select já desabilita o vencido; o 400 só ocorre com tela desatualizada ou outro cliente) | **(a)**. É o menor: um texto, sem tocar o `apiClient` compartilhado. A convenção do código já é toast em pt-BR fixo (ex.: `'Pagamento registrado.'` em `sales.service.ts`), então (b) e (c) criam um mecanismo novo para um único caso. (d) é defensável, mas deixa o operador ler um id | ✅ RATIFICADO 05/10 (recomendação) |
| **F-PP-2** | O "quem" do aceite no detalhe (F10) | (a) a resposta traz `acceptedByLabel` (o servidor resolve o nome); (b) o FE mostra o id cru (como está); (c) o FE busca o usuário por outra rota | **(a)**. O servidor já resolve o nome para o PDF; é um campo na resposta. (c) é uma 2ª chamada sem endpoint seguro conhecido; (b) é prova ilegível para quem confere | ✅ RATIFICADO 05/10 (recomendação) |
| **F-PP-3** | Quanto das pontes de venda passa a ler o dia escrito (F3, F4, F5) | (a) só a ponte de receita (`SaleSalesAccountingBridge:91`); (b) (a) + os fallbacks de `data.date` na liquidação e no estorno; (c) nenhuma: deixar a receita em D-1 | **(b)**. A competência da receita é a data da venda (`AccountingSyncPort.ts:162`: *"occurredAt should match the sale's date"*) e hoje a ponte e a reconciliação divergem (F4). Os fallbacks são o mesmo defeito, raro, e custam uma linha cada. (c) deixa o H2 conferir um razão com a data errada e a virada de mês cair no período anterior | ✅ RATIFICADO 05/10 (recomendação) |
| **F-PP-4** | Lançamentos de venda já postados com D-1 | (a) não re-datar: não há dado de venda no `dev.db` real (F6) nem produção; (b) migração/relançamento dos existentes | **(a)**, **condicionada ao insumo I4** (confirmar que nenhum tenant com venda real existe antes do deploy). Lançamento postado é imutável; re-datar exigiria estorno + relançamento, que só vale a pena se houver dado | ✅ RATIFICADO 05/10 (a), condicionado ao I4 |
| **F-PP-5** | Onde corrigir a data D-1 na UI de vendas (F7, F8) | (a) por ponto: cada site usa o caminho `date` do formatador (`formatDate(..., { dateOnly: true })`) ou a fatia de 10 caracteres; (b) uma heurística em `formatDateNumericBR` (ISO `T00:00:00.000Z` vira date-only); (c) normalizar no carregamento do módulo de vendas (`SaleRecord.date` vira `YYYY-MM-DD` na entrada do hook), e todos os consumidores já leem o dia certo | **(c)** para o módulo de vendas. Um ponto só cobre lista, filtro de período, analítica e detalhe, e deixa o tipo honesto (a data é date-only). (b) é global e erra instante real à meia-noite UTC (21h BRT) de campo `datetime`; (a) repete o conserto por site e esquece o próximo. Outros módulos (CRM, contabilidade) ficam fora (§8) | ✅ RATIFICADO 05/10 (recomendação) |
| **F-PP-6** | Onde o aceite entra quando o wizard passar a finalizar (F11, F12) | (a) **antes** do `PUT Finalized`: o crédito do saldo (ponte, na finalização) só acontece com a prova já gravada; (b) **depois**: venda finalizada e saldo creditado, aceite em seguida, e o selo cobre a falha | **(a)**, **se** a correção do wizard separar "criar + itens" de "finalizar". O aceite é pré-requisito legal da informação prévia; (b) só é aceitável se a separação não for possível. Depende do insumo I1 (como a sessão do fix finaliza) | ✅ RATIFICADO 05/10 (a), condicionado ao I1 |
| **F-PP-7** | Validar o `customerId` da venda contra a tabela de clientes do tenant no aceite (achado M5 da revisão do #530) | (a) validar e recusar (400); (b) deixar: é dado do próprio tenant e o PDF já usa o id no lugar do nome quando o pertencimento falha | **(b)**. O tenant só grava o id de outro tenant na própria venda, sem vazar nada; validar adiciona uma leitura e um erro para um caso sem dano | ✅ RATIFICADO 05/10 (recomendação) |

### 5.1 RATIFICAÇÃO — 2026-10-05 (dono, chat, por delegação)

Pedido do dono, depois de o BRIEF listar os sete forks com recomendação: *"Pode ratificar os forks"*. Lido como **ratificação das
recomendações** (mesmo gesto de *"Ratificar as recomendações"*, 29/09, nota `I5`). **Não houve resposta fork a fork, e nenhum é
contra a recomendação.** Registro: [`D-2026-10-05-PACOTE-VALIDADE-PENDENCIAS-FORKS`](../plano/decisoes/D-2026-10-05-PACOTE-VALIDADE-PENDENCIAS-FORKS.md).

| Fork | Escolha | Efeito no checklist |
|---|---|---|
| F-PP-1 | (a) texto do BE: só a data, sem ids | item 1 como escrito |
| F-PP-2 | (a) `acceptedByLabel` na resposta | item 2 como escrito (§4.1) |
| F-PP-3 | (b) receita + fallbacks de liquidação e estorno | itens 5–7 como escritos |
| F-PP-4 | (a) não re-datar — **condicionado ao I4** | sem item; o I4 segue aberto e **pré-condição do deploy** |
| F-PP-5 | (c) normalizar no carregamento do módulo de vendas | item 10 como escrito |
| F-PP-6 | (a) aceite antes do `PUT Finalized` — **condicionado ao I1** | item 11 só destrava quando a sessão do fix do wizard terminar |
| F-PP-7 | (b) deixar | sem item |

**Nada disto é "executa".** F2 e F3 ganham nota no vault (`planned`, sem `executa`); o código exige o "executa" do dono, por frente.

## 6. Pendente de validação externa (follow-up; nada disto entra no checklist como decidido)

| # | Pergunta | A quem | Pesa em |
|---|---|---|---|
| **PE-FE-1** | A redação do texto v1 cumpre "informação prévia, ostensiva e com destaque"? A frase "não será devolvido" está bem posta diante do STJ (perda integral) e do F-JUR-3? | jurídico | texto v1 |
| **PE-FE-2** | "Corpo 12" (CDC 54 § 3º) lido na tela como 12pt = 16px é a aplicação certa? | jurídico | itens 8, 10, 13 do #530 |
| **PE-FE-3** | Checkbox do operador + assinatura do cliente no comprovante bastam como "aceite registrado"? | jurídico | F-FE-PV-3 |

Não travam o merge nem o sign-off (são sobre a forma, não sobre dado); travam só a confiança jurídica do texto. O F-PP-3 não tem
validação contábil pendente: a competência na data da venda é o que a ponte e o `AccountingSyncPort` já declaram; se o dono quiser a
confirmação do contador, é um pedido novo (§8).

## 7. Insumos ausentes (pausa nesses trechos; regra 2, sem varredura)

- **I1.** Como a sessão do fix do wizard "Finalizar Venda" finaliza (Draft + itens + `PUT Finalized`, ou outro desenho) e se muda a
  assinatura de `createSaleWithItems`. Decide o F-PP-6 e o item 12.
- **I2.** Inventário dos pontos do FE que formatam ou comparam o campo `date` do motor como instante. O §1 F7/F8 lista candidatos;
  o item 9 (teste-guarda) é quem prova quais mordem. Não varri o resto do `my-app`.
- **I3.** O tenant tem mais de um usuário com login próprio? Se for um só, o "quem" (F-PP-2) é a conta do salão (o rótulo continua
  certo, mas a assinatura do cliente é a única identificação de pessoa). Era o I3 do BRIEF do FE; segue sem resposta.
- **I4.** Existe algum tenant com **venda real** (fora do `dev.db` e dos seeds) antes do deploy? Decide o F-PP-4.
- **I5.** Só se o F-PP-1 for (b): o FE tem acesso a tradução fora do React (instância global do i18next) em `lib/`? Não verifiquei.

## 8. Achados fora de escopo (registrados, não planejados)

- **A mesma classe em outros módulos** (CRM, contabilidade): `formatDateBR` e `new Date(iso)` em campos `date` fora das vendas. A varredura
  `FE-FIX-DATEONLY-UTC` (13 sites de **default**, `toISOString()`) é outra subclasse e tem BRIEF próprio
  ([`FE-FIX-DATEONLY-UTC-brief.md`](FE-FIX-DATEONLY-UTC-brief.md)).
- **`ListPackageBalancesQuerySchema` sem `.strict()`** (já registrado no BRIEF BE).
- **Evento de auditoria do aceite**: o #530 não emite (a linha é a prova). Se o dono quiser, entra na allowlist do `auditCanonical.ts`
  na mesma mudança.
- **Pedido ao contador** para confirmar a competência da receita na data da venda (F-PP-3) e o efeito na virada de período: opcional.
- **Backlog do wizard** além do "Finalizar": a mensagem genérica "unknown error" e a venda órfã que a falha deixa (a sessão do fix cobre).

## 9. Ordem e riscos

```
#530 (OK do dono) ─┬─> F1 (pendências do nó; sessao-feature)
                   ├─> F2 instrumentação → correção ──┐   (antes do H2: o H2 confere vendas NO RAZÃO, passos 6–11)
                   ├─> F3 instrumentação → correção   │
wizard "Finalizar" (sessão própria) ─> F4 (itens 11–12)│
                                                       v
              H1 ──> H2 (sign-off de browser; RUNBOOK-H2-PACOTE-VALIDADE) ──> M2 (1º deploy) ──> deploy do PACOTE-VALIDADE
              PE-FE-1..3 (jurídico) correm em paralelo; não travam
```

1. **F2 antes do H2.** O H2 confere vendas no razão (F13). Com a ponte de receita em D-1, o humano assina um razão com a data
   errada, ou reprova e perde a rodada. É a razão da ordem.
2. **F4 antes do passo 3 do runbook** do #530, ou o passo usa "Salvar Rascunho" (já escrito assim).
3. **F1 não trava o deploy**: são polimentos (mensagem, rótulo) e o fold. **F2 e o sign-off, sim.**
- **Risco principal:** mudar a competência da receita (F2) altera o período de vendas na virada do mês; sem dado de venda existente
  (F6, F-PP-4 a) o efeito é só dali em diante, mas um tenant real antes do deploy (I4) mudaria a conta. **Viés declarado:** tendo achado
  o defeito no #530, tendo a tratá-lo como urgente; a recomendação (b) do F-PP-3 amplia o alcance além do que quebrou a prova do
  pacote, e o dono pode preferir (a). **Checagem que teria falhado:** o item 5 (teste vermelho pelo caminho real) falha hoje se F3
  for verdade; se passar verde, a premissa do F3 está errada e a frente F2 cai.

## Fontes

- [`FE-INCR-PACOTE-VALIDADE-brief.md`](FE-INCR-PACOTE-VALIDADE-brief.md) §7 (I3), §8; PR #530 (corpo e commits `85ff0523` … `a41d88ad`).
- [`BE-INCR-PACOTE-VALIDADE-brief.md`](BE-INCR-PACOTE-VALIDADE-brief.md); [`D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO`](../plano/decisoes/D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO.md) (F-JUR-4).
- Código: `server/src/features/accounting/sync/bridges/SaleSalesAccountingBridge.ts:91`, `SaleSettlementBridge.ts:116`, `SaleReversalBridge.ts:122`;
  `server/src/jobs/accountingSyncReconcile.job.ts:1913`; `my-app/features/dashboard/category-views/finance/components/sales/SalesTable.tsx:197`;
  `…/hooks/sales/useSalesLogic.ts:79`, `…/hooks/analytics/useSalesAnalytics.ts:44`.
- Memória do projeto: `motor-grava-date-como-iso-utc-scopeday-recua-um-dia`, `date-only-rendering-utc-shift-class-bug`.
