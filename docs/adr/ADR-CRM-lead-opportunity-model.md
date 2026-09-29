Escrito em `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/council-accounting-decisions-42aa3c/docs/adr/ADR-CRM-lead-opportunity-model.md`. Segue o markdown integral:

---

# ADR-CRM-lead-opportunity-model — Modelo de produto Lead × Opportunity no molde salão

- **Status:** **PROPOSTO — PRE-ADR (proposta para ratificação HUMANA, §5.1). NADA aqui é ratificado.**
  Este documento **abre o desenho** e recomenda um default; a decisão é do **dono** (produto). O Conselho de
  CRM (boards v1/v2/v3, 2026-07-20) devolveu este item ao dono — foi o **único** da cédula sem voto de
  ratify (D3: 4 defer + 1 abstain). Nenhum código de mudança de modelo é escrito antes de sinal humano.
- **Sinal do dono 2026-09-29:** direção "vincular e espelhar" (oportunidade atrelada ao lead, com histórico; atualizar a
  oportunidade atualiza o lead) — **§9**. Só documentado; não ratifica, não autoriza.
- **Data:** 2026-07-20
- **Decision class:** PRODUTO / MODELAGEM DE MÓLDE (DynamicTable). **NÃO** é decisão de fronteira
  (o balde tecnológico — Lead e Opportunity como presets DynamicTable — está **correto** e não se reabre) e
  **NÃO** é, por si, decisão contábil (o desenho do seam de receita CRM→razão é o **ADR-CRM-revenue-seam**,
  separado, com parecer `luminaris-accounting-architect`). Este ADR trata **só** de quantas pipelines de
  valor o molde salão expõe e quem é a portadora de fechamento.
- **Autores:** arquiteto de produto CRM + CTO (desenho). Parecer de mercado/UX: boards v2 (operadora de
  salão, estrategista de mercado).
- **Nó do master map / roadmap:** `docs/crm/COUNCIL-BOARD-CRM-2026-07-20-v3-resolution.md` **D3**
  (DEVOLVIDO-AO-DONO) e `docs/crm/CRM_REMEDIATION_AND_ROADMAP.md`. Origem: achado **CA1** (v1) reenquadrado
  por **SALAO-2 / MARKET-2** (v2).
- **Supersedes:** none · **Related:** **ADR-CRM-revenue-seam** (o seam de receita — bloqueante, cruza
  `postEntry`; este ADR pressupõe que a portadora de valor definida aqui é quem alimenta aquele seam),
  board v1 §1-item2 (CA1), board v2 Eixo 2, board v3 D3.

> **Nota de processo (T12).** PRE-ADR escrito **antes** de qualquer código de modelo. A ratificação é
> coletada por sinal humano (AskUserQuestion), fork-a-fork, **depois** do gatilho (kit de validação verde +
> sinal do 1º operador de salão real). Até lá o modelo fica no **interino reversível** recomendado em §5.

---

## TLDR (2 linhas)

Hoje Lead e Opportunity são **duas pipelines de valor sobre as MESMAS etapas**, e só a Opportunity reconhece
receita — a separação é **nominal** (o Lead não é consumido ao virar oportunidade, segue dono de `Won`/`Lost`
+ snapshot de proposta, e a analytics conta os dois). O **eixo real em disputa** é se o molde salão é
**B2C-solo** (um funil: interessado→cliente) ou uma **porta B2B futura** (aparato Lead+Opportunity do
benchmark Salesforce). Recomendação de **menor arrependimento**: **interino reversível** — ocultar a 2ª
pipeline no preset do salão **sem deletar código** — porque *elevar* (v1) e *remover* (v2-salão) são ambos
apostas irreversíveis sobre um molde que **nunca reconheceu um centavo real**. A decisão é do dono.

---

## 1. Contexto e objetivo

O CRM nasceu com dois presets DynamicTable de valor — `leads` e `crmOpportunities` — e a intenção declarada
era o funil clássico de software B2B: **Lead** = pré-qualificação (SDR/BANT), **Opportunity** = pipeline de
receita que fecha em `Won`. Na prática, a separação **não foi realizada**: as duas entidades carregam valor
sobre as **mesmas etapas** (`leadStages`), só uma **booka** receita, e a conversão de uma para a outra
**não termina** a primeira. O resultado é fonte-de-verdade dupla, dupla-contagem em analytics e — para o
usuário-alvo do molde (a recepcionista de um salão de bairro) — duas pipelines visualmente idênticas com
botões concorrentes.

O **objetivo sob a letra** do pedido (T1) não é "consertar um bug de conversão": é **decidir qual é o molde**.
As duas leituras do Conselho são genuinamente incompatíveis:
- **v1 (CA1):** a separação nominal é um **defeito a corrigir elevando** a Opportunity a portadora única.
- **v2 (SALAO-2/MARKET-2):** o par Lead+Opportunity é **aparato enterprise B2B importado** do benchmark
  Salesforce Sales Cloud; o comprador do molde salão não é comprador de CRM B2B → **remover** a 2ª pipeline.

Ambas as leituras concordam no fato de código; divergem no **produto**. Por isso escala ao dono.

## 2. Evidência de código (CBM-001 — confirmado por leitura nesta sessão)

| Claim | Grau | Evidência lida |
|---|---|---|
| `convertLeadToOpportunity` **cria a oportunidade mas NÃO consome/termina o lead** — a função retorna logo após criar a opp; **nenhum** update no `leadRow`, nem sequer para `status='Converted'` (que existe no enum) | **verificado** | `CrmPipelineService.ts:327-406` — cria opp em `runInTransaction` (`:394-401`), `logger.info` + `return opportunity` (`:402-406`); zero chamada de update ao lead |
| O **Lead segue dono de `Won`/`Lost`** + snapshot de proposta — é uma segunda portadora de fechamento | **verificado** | `LeadsModule.ts:109-112` (`status` inclui `'Won'`,`'Lost'`,`'Converted'`), `:83-100` (`latestProposalAmount`/`Currency`/`EtaClose`/`WinProbability` — snapshot da proposta no próprio lead) |
| **Duas pipelines sobre as MESMAS etapas** — a opportunity reusa `leadStages`/`pipelineId`; a etapa default é a 1ª etapa do pipeline de leads | **verificado** | `CrmOpportunityDto.ts:49-50` (`pipelineId`,`stageId`), `CrmPipelineService.ts:363-378` (resolve `stageId` a partir de `leadStages` do `input.pipelineId`) |
| **Dupla-contagem em analytics** — `CrmAnalyticsService` roda o funil/cards/status **sobre a tabela `leads`** (que inclui leads `Won`/`Lost`); a Opportunity que booka é uma segunda linha de valor sobre o mesmo negócio | **verificado** | `CrmAnalyticsService.ts:57-85` (funil/cards/status computados sobre `leadsTable`); receita só entra pela opp (board v1 CA-SEAM) |
| **Só a Opportunity gera lançamento** — lead levado a `Won` via `advanceStage` **não** vira receita; o mapper só dispara de `advanceOpportunity`+`status==='Won'` | **verificado (board v1)** | `crmController.ts:94,112` + `CrmOpportunityWonMapper.ts` (board v1, achado CA1/CA-SEAM, CONFIRMED) |

**Consequência estrutural:** a separação Lead×Opportunity é hoje **nominal** — não há um limite de responsabilidade
real entre elas (o Lead não deixa de ser portador de valor quando vira oportunidade), então o sistema tem
**duas fontes de verdade** sobre o mesmo negócio, e a analytics de funil e o razão medem coisas diferentes.

## 3. O EIXO REAL EM DISPUTA (o que escala ao dono)

> **Molde salão B2C-solo × porta B2B futura.**

Não é um eixo de arquitetura nem de invariante — é uma **aposta de produto** sobre o que o molde salão *é* e
para quem generaliza:

- **Se o molde é B2C-solo** (a recepção de um salão de bairro: um funil interessado→cliente, um operador,
  sem SDR nem pipeline de receita separado), então Lead+Opportunity é **ruído importado** — a operadora vê
  dois botões concorrentes ("Converter Lead" e "Criar Oportunidade") + uma aba "Oportunidades" que não
  corresponde a nada no balcão. A correção pró-molde é **remover** a 2ª pipeline.
- **Se o molde é a porta B2B futura** (o salão é só o **molde-semente** de uma engine que gera ERPs para
  verticais que **podem** ser B2B, onde pré-qualificação + pipeline de receita são requisito real), então
  Lead+Opportunity é a **superfície que um tenant enterprise futuro precisa** — removê-la agora amputa
  exatamente o que a tese ERP-gen quer poder gerar.

**Este eixo é genuinamente não-resolvido por falta de fato** (board v3, viés T8-1/T8-3): zero usuários, zero
deploy, zero centavo reconhecido. Nenhuma cadeira executiva pode fechá-lo — é a aposta de go-to-market do
dono. O que o PRE-ADR pode fazer é **evitar fechar a aposta cedo demais numa direção irreversível**.

## 4. Opções (o fork que vai ao dono)

### (a) ELEVAR a Opportunity a portadora única e rebaixar o Lead [v1 / CA1]
Opportunity vira a **única** portadora de valor/fechamento. Remover `Won`/`Lost`+snapshot do Lead (ou
bloquear `lead.status='Won'` sem opp vinculada); `convertLeadToOpportunity` **consome** o lead
(`status='Converted'`, terminal); `CrmAnalyticsService` exclui leads convertidos do funil de receita.
- **A favor:** resolve a fonte-de-verdade dupla no sentido "certo" para software B2B; alinha com o seam de
  receita (uma portadora → um lançamento).
- **Contra:** é **trabalho de modelo irreversível** que **entrincheira o aparato B2B** — se o molde for
  B2C-solo, elevamos a pipeline errada e mantemos dois conceitos onde o balcão só quer um. Reescreve
  analytics e conversão antes de um usuário real dizer que precisa de dois funis.

### (b) REMOVER a 2ª pipeline no molde salão [v2-salão / SALAO-2 / MARKET-2]
Um único funil (interessado→cliente). Deletar o preset `crmOpportunities`, a aba "Oportunidades", o botão
"Criar Oportunidade" e o seam `opportunity.won`; o Lead vira a única entidade, e o fechamento/receita passa
pelo Lead.
- **A favor:** **máxima fidelidade ao molde salão B2C**; elimina o ruído do balcão; menos superfície bespoke
  para o compilador ERP-gen ter de absorver.
- **Contra:** **irreversível e o mais arriscado** — deletar código B2B é fácil, **regenerá-lo** quando um
  vertical B2B pedir é caro; move o seam de receita para o Lead (que hoje **não** booka), reabrindo o desenho
  contábil que o ADR-CRM-revenue-seam ainda nem fechou. Aposta a tese inteira em "o molde é B2C-solo" sem
  um único tenant real. É a mesma classe da **deleção já-executada do módulo de leads legado** (board v1
  CA3): irreversível eleva o custo do erro.

### (c) MANTER-E-ADIAR com interino REVERSÍVEL [diretoria] **← recomendado**
**Ocultar** a 2ª pipeline no **preset do salão** (não instalar/não expor `crmOpportunities` + aba + botão no
molde salão por default) **SEM deletar código**. O aparato Lead+Opportunity continua vivo no repositório,
reativável por config; o molde salão exibe um funil só. Nenhuma mudança no modelo de dados, no seam ou na
analytics — só **o que o preset do salão expõe**.
- **A favor:** entrega a UX B2C do salão **hoje** (resolve o ruído do balcão que a operadora nomeou) e
  **preserva a porta B2B** para quando um tenant real pedir; **não** reescreve modelo, **não** deleta código,
  **não** toca o seam de receita (que é bloqueado por ADR próprio). Reversível nos dois sentidos.
- **Contra:** não *resolve* a separação nominal — **adia**; deixa o par Lead+Opportunity vivo (dívida de
  modelo dormente) e depende de o preset ser a única superfície de exposição (verificar que ocultar no preset
  realmente esconde as duas pipelines do salão).

## 5. Recomendação (default de MENOR ARREPENDIMENTO) — não-ratificada

**Recomenda-se a opção (c), o interino reversível**, como default até o gatilho de §6. Racional:

1. **As opções (a) e (b) são apostas irreversíveis sobre um eixo não-resolvido por falta de fato.** Elevar
   entrincheira o aparato B2B; remover deleta a porta B2B. Nenhuma das duas é reversível de graça, e o dado
   que decidiria entre elas — como um operador de salão real usa o funil — **não existe ainda**. Comprometer
   agora é decidir a aposta de produto **no escuro**.
2. **O interino compra a UX B2C sem gastar a opção B2B.** A operadora de salão ganha o funil único (o ganho
   concreto e verificado — o ruído do balcão some) e a engine mantém a capacidade de gerar o aparato
   Lead+Opportunity para um vertical B2B futuro. É o único movimento que **não fecha nenhuma porta**.
3. **Custo baixo, blast radius contido.** Mexe só no que o preset do salão expõe; **não** toca modelo de
   dados, analytics nem o seam de receita CRM→razão (que está bloqueado pelo **ADR-CRM-revenue-seam** e pelo
   kit de validação). Não reabre a fronteira DynamicTable×Prisma.
4. **Consistente com o princípio já aplicado no projeto:** "interino reversível > mudança irreversível
   quando o dado que decidiria ainda não existe" — é o mesmo instinto que o board v3 honrou em D2 (gate
   "operar 1 negócio real primeiro" antes de exercitar o gerador) e o oposto do erro CA3 (deleção
   irreversível do legado que elevou o custo).

**Nomeando o risco da própria recomendação (T8):** (c) pode ser **procrastinação disfarçada de prudência** —
a separação nominal continua no código como dívida dormente, e "adiar reversível" pode virar "nunca decidir".
A mitigação é o **gatilho durável** de §6: o interino tem uma **condição de saída explícita**, não é
open-ended. Segundo viés: a recomendação favorece reversibilidade porque é barata de defender — pode
subvalorizar o ganho de foco de **cravar** o molde B2C agora (b), se a convicção do dono na tese B2C-solo for
alta.

## 6. Gatilho de reabertura (condição de saída do interino)

A escolha definitiva (a) × (b) × manter (c) permanente **só reabre** quando **ambos**:

1. **Kit de validação verde** (board v3, D6 / Bloco A) — o seam de receita provado ponta-a-ponta num app de
   produção, os 4 furos de dinheiro falsificados, o backfill de `unitId` feito sob tenancy explícita. Sem
   isso, qualquer decisão de modelo pressupõe um seam que **ninguém provou que booka**.
2. **Sinal do 1º operador de salão real** — um negócio real na cadeira por ~2 semanas mostrando **como o
   funil é usado de fato**: um funil ou dois? pré-qualificação separada existe no balcão? É o único dado que
   decide entre B2C-solo (→ b) e porta-B2B (→ a/c permanente).

Enquanto os dois não acontecerem, o default é **(c)**. Quando acontecerem: **ADR de produto de sucessão,
ratificado pelo dono**, escolhendo (a)/(b)/manter-(c) com o fato do operador real na mão.

## 7. O que este ADR NÃO decide (fronteiras)

- **NÃO** decide o desenho do seam de receita CRM→razão (subrazão AR 1.1.5 vs receita direta; binding
  conta-por-papel como dado; guard terminal em `advanceOpportunity`; dead-letter do Won-imbookável) — isso é
  o **ADR-CRM-revenue-seam**, com parecer `luminaris-accounting-architect`, bloqueante e independente.
- **NÃO** reabre a fronteira DynamicTable×Prisma — Lead e Opportunity **são** presets DynamicTable e
  continuam sendo; o balde tecnológico está correto (board v1, camada DEFENDIDA).
- **NÃO** ratifica a aposta da tese ERP-gen nem a ordem exercitar-gerador × aprofundar-à-mão (board v3, D2) —
  este ADR só escolhe o que o **molde salão** expõe, não a estratégia de plataforma.
- **NÃO** autoriza deletar código (opção b) nem reescrever modelo (opção a) sem o gatilho de §6 + sinal do
  dono.

## 8. Riscos e vieses nomeados (T8)

1. **[verificado] Decisão sobre um molde nunca operado.** Todo o eixo B2C-solo × porta-B2B é apostado sob
   incerteza estrutural: zero usuários, zero deploy. O interino (c) é a resposta honesta a isso — não decide
   o que não pode ser decidido sem fato.
2. **[inferido] O interino pode não ocultar de verdade.** (c) assume que não-instalar `crmOpportunities` no
   preset do salão realmente esconde a 2ª pipeline de ponta a ponta (aba, botão, board). **Checagem que
   falharia se eu estivesse errado:** instalar o preset salão num tenant limpo e confirmar que nenhuma
   superfície de Opportunity aparece. Obrigatória antes de considerar (c) entregue.
3. **[assumido] Reversibilidade barata da (c).** Assume-se que reativar Lead+Opportunity por config é barato.
   Se o preset acumular acoplamento ao funil-único, a reversibilidade encarece silenciosamente — nomeado.
4. **[verificado] Viés de moldura salão-solo (importado do board v2).** Tratar Lead+Opportunity como "aparato
   a remover" pode impor uma lente B2C-solo a um produto cuja tese é gerar verticais que **podem** ser B2B.
   O interino (c) é deliberadamente o movimento que **não** compra essa moldura — mantém as duas leituras
   vivas até o fato chegar.
5. **[verificado] Adiar pode virar nunca-decidir.** O maior risco de (c) é a dívida dormente; o gatilho §6
   com condição de saída explícita é a mitigação, não a eliminação, do risco.

---

**STATUS: PROPOSTO — aguarda sinal humano (§5.1).** Recomendação: **(c) interino reversível** (ocultar a 2ª
pipeline no preset do salão sem deletar código) como default de menor arrependimento, com reabertura no
gatilho **kit verde + sinal do 1º operador de salão real**. A escolha definitiva (a)/(b)/manter-(c) é do
**dono** — nenhuma cadeira executiva a fecha. Este PRE-ADR abre o desenho; não escreve código de modelo.

## 9. Sinal do dono — 2026-09-29 (registrado; NÃO ratifica este ADR)

> Dono, chat, 29/09, na sessão da emenda do BRIEF CRM-RB (PR #448): *"Pode atrelar a oportunidade ao lead tendo historico de informações e se atualizar a oportunidade atualiza o lead"*.
> Na mesma sessão: *"Aqui vamos apenas documentar, quem vai autorizar oque, é em outra sessão"*. Esta seção só documenta.

**Leitura (inferida, a confirmar na sessão que autorizar):** é uma opção **(d) VINCULAR E ESPELHAR**, fora de
(a)/(b)/(c). Lead e Oportunidade continuam existindo. A oportunidade fica atrelada ao lead que a originou, com o histórico
do lead à vista, e passa a ser a **fonte**: mudar a oportunidade atualiza o lead, num sentido só. Difere de (a) porque o
lead não é rebaixado nem consumido. Difere de (c) porque decide o modelo em vez de adiar.

**O que o código faz hoje (lido em `origin/main` `251f0fd9`):**
- O vínculo existe e é **opcional**: `crmOpportunities.leadId` tem `required: false` (`OpportunitiesModule.ts:28-35`).
  `convert-lead-to-opportunity` preenche o vínculo e **não consome** o lead (`CrmPipelineService.ts:383-386`).
- **Nada sobe da oportunidade para o lead:** `advanceOpportunity` (`CrmPipelineService.ts:327-380`) só grava a
  oportunidade. O único espelho que existe é proposta → lead (`createProposal`, `CrmPipelineService.ts:271-278`, campos
  `latestProposal*`).
- O **histórico mora no lead:** `leadActivities` tem `leadId` e não tem vínculo com oportunidade (`LeadActivitiesModule.ts:16`).
- Não achei trava de "uma oportunidade por lead" em `convertLeadToOpportunity` (grep no corpo, `:394-480`). **Inferido**:
  um lead pode gerar várias.
- Desde 20/07 o contexto mudou:
  - Oportunidades virou submódulo selecionável (`registry.ts:108-117`, `fixed: false`).
  - O Won gera título a receber (`crmController.ts:94-135`) e fica imutável (dono, 25/09; `OpportunitiesModule.ts:116`).
  - As métricas de receita vêm da oportunidade (dono, 25/09; `CrmAnalyticsService.ts:86-97`).

**Perguntas abertas para a sessão que autorizar (nenhuma decidida aqui):**
1. O vínculo passa a ser obrigatório? Hoje uma oportunidade sem lead é válida.
2. "Histórico de informações" quer dizer: a oportunidade **mostra** o histórico do lead (atividades, propostas, BANT)
   pelo vínculo; e/ou cada atualização espelhada **vira registro** no histórico do lead (ex.: atividade "valor atualizado
   pela oportunidade X" — `leadActivities` tem `type` e `payload`)?
3. Quais campos sobem: valor **com** moeda (sempre em par — F-RB8 do CRM-RB), probabilidade, previsão, etapa, status?
   Espelhar o Won/Lost no lead reabre o CA1 ("o lead ainda carrega Won").
4. Com N oportunidades por lead, qual atualiza o lead: a última alterada, todas (lista no lead), ou só uma é permitida?
5. Sentido contrário (lead → oportunidade): a frase cobre só oportunidade → lead.
6. Por onde a oportunidade é editada: o caminho do pipeline (`advanceOpportunity`) é serviço de aplicação; a edição pela
   tela genérica da tabela passa pelo motor DynamicTable. Espelhar ali pede regra/plugin do preset CRM (é intra-CRM; o
   AC-2.1-B4 proíbe mexer em `DynamicTableService` para isso).
7. O §6 põe como gatilho o kit verde + o operador real. Este sinal chega antes do gatilho. Se valer como decisão de
   sucessão, a sessão que autorizar registra que o dono dispensou o gatilho.
8. Efeito no "valor de pipeline" (BRIEF CRM-RB §4.2): com o lead espelhando a oportunidade, a visão geral e o analytics
   passam a ver o mesmo valor nos negócios vinculados. A diferença que sobra é o filtro (Won incluído) e os registros sem
   vínculo.

### 9.1 Respostas do dono às perguntas do §9 (29/09) — documentadas, não ratificadas

| # | Pergunta | Resposta (literal) | Leitura registrada |
|---|---|---|---|
| 1 | Vínculo obrigatório? | *"sim"* | Toda oportunidade nasce de um lead (hoje `leadId` é opcional, `OpportunitiesModule.ts:28-35`) |
| 2 | Histórico: mostrar × registrar | *"ambos"* | A oportunidade mostra o histórico do lead, **e** cada espelho vira registro em `leadActivities` |
| 3 | Quais campos sobem | *"Somente os campos que tem sinergia com o lead"* (+ pergunta: "como espelhar poderia ser um problema?") | Só campos com correspondente no lead — mapa e riscos abaixo |
| 4 | N oportunidades por lead | *"Atualiza o lead a oportunidade em aberto"* | Só a oportunidade **aberta** espelha. Consequência a confirmar: no máximo **uma aberta por lead** (hoje não há trava — inferido) |
| 5 | Sentido lead → oportunidade | *"Esse é o caminho correto não? O lead vira oportunidade, pq oportunidade é chance de venda"* | Modelo do dono: o lead se **converte** em oportunidade (a chance de venda); o espelho tem **um sentido só** (oportunidade → lead) e o lead vira ficha + histórico |
| 6 | Onde o espelho mora | *"Me de sugestoes"* | Sugestões abaixo; recomendação (A) |
| 7 | Gatilho do §6 | *"Pode disparar a decsião a partir da validação"* | Leitura **inferida**: a decisão é disparada quando o **kit de validação** (§6.1) fechar; o sinal do operador real (§6.2) deixa de ser condição. Confirmar |
| 8 | Efeito no valor de pipeline | *"Preciso de mais informação"* | Explicação com exemplo no BRIEF CRM-RB §4.2; segue aberta |

**Mapa de campos com sinergia (lido em `LeadsModule.ts` e `OpportunitiesModule.ts`):**

| Oportunidade | → Lead | Observação |
|---|---|---|
| `amount` + `currency` | `latestProposalAmount` + `latestProposalCurrency` | sempre **em par** (F-RB8 do CRM-RB) |
| `winProbability` | `latestProposalWinProbability` | — |
| `estimatedCloseDate` | `latestProposalEtaClose` | — |
| `pipelineId` + `stageId` | `pipelineId` + `stageId` | sempre **juntos** (risco 2) |
| `ownerId` | `assigneeId` | — |
| `accountId`, `contactId` | `accountId`, `contactId` | — |
| `status` (Open/Won/Lost) | `status`? | risco 3 — sugestão: não espelhar o status |
| `name`, `notes`, `closedAt` | — | sem correspondente no lead |

**Por que espelhar pode ser um problema (resposta à pergunta do item 3).** Espelhar em si não é o problema; estes são os
pontos que precisam de regra:
1. **Dois escritores no mesmo campo.** A proposta **já** escreve `latestProposal*` no lead (`LeadsPlugin.ts:194-213`,
   `upsertLatestProposalSnapshot` em `:335-353`). Se a oportunidade também escrever ali, vale quem escreveu por último, e o
   lead pode voltar a mostrar a proposta velha depois que a oportunidade mudou. Sugestão, coerente com a resposta 4:
   **enquanto houver oportunidade aberta, ela manda**, e a proposta só atualiza o lead sem oportunidade aberta.
2. **Etapa sem o funil.** Lead e oportunidade usam as mesmas etapas, mas a oportunidade pode estar em outro funil
   (`pipelineId` escolhido na criação). Espelhar `stageId` sem `pipelineId` põe o lead numa etapa de outro funil. Os dois
   vão juntos, ou nenhum vai.
3. **Status.** Só o Won da **oportunidade** gera título a receber (`crmController.ts:94-135`); o Won do lead não gera
   nada. Espelhar o status não duplica dinheiro no razão, mas faz o lead parecer "ganho" nos números que somam leads (a
   visão geral soma leads Won — BRIEF CRM-RB §4.2), e reabre o CA1 ("o lead ainda carrega Won"). Sugestão: na conversão
   o lead vai para `Converted` e **fica** assim; o resultado aparece pelo vínculo com a oportunidade.
4. **Edição do lado do lead.** Se alguém editar no lead um campo espelhado, ele diverge até a próxima mudança da
   oportunidade. Sugestão: com oportunidade aberta, os campos espelhados ficam **só-leitura no lead**; a edição é na
   oportunidade. É isso que a resposta 5 pede (sentido único).
5. **Depois do ganho.** A oportunidade ganha é imutável (25/09, `OpportunitiesModule.ts:116`). O último espelho é o do
   ganho, e o lead não muda mais por ela. Está correto.

**Sugestões para o item 6 (onde o espelho mora):**
- **(A) Recomendada — um ramo novo no `LeadsPlugin`.** Hoje ele **não** roda para oportunidades: o `supports` exige a
  categoria **e** o nome interno da tabela (`rules/shared/tableFinder.ts`, `tableMatches`). A categoria já bate
  (`category: 'leads'`, `OpportunitiesModule.ts:23`); falta pôr `crmOpportunities` na lista de nomes do plugin
  (`LeadsPlugin.ts:80-86`). O padrão do espelho já existe: proposta → lead + registro em `leadActivities`
  (`LeadsPlugin.ts:194-213,335-367`). No `afterCreate`/`afterUpdate` da oportunidade aberta, o ramo atualiza o lead e grava
  a atividade. Vantagens:
  - roda em **todo** caminho de escrita — API do pipeline (mesmo com `isSystem`), tela genérica da tabela e importação;
  - roda **dentro da mesma transação**: `runRules` recebe o repositório da tx (`DynamicTableService.ts:587,812`);
  - é intra-CRM: não injeta serviço Prisma (AC-2.1-B1) nem mexe no `DynamicTableService` (AC-2.1-B4);
  - a escrita no lead usa `ctx.repository.updateData`, a mesma do espelho de proposta, que não dispara as regras de novo.
- **(B) No serviço do pipeline (`CrmPipelineService.advanceOpportunity`).** Cobre só a API do pipeline; a edição pela tela
  genérica escapa e diverge. Só serve se os campos da oportunidade virarem só-leitura na tela genérica.
- **(C) Sem cópia: o lead lê a oportunidade aberta na hora de mostrar.** Não há divergência possível, mas lista, kanban
  e relatórios de leads teriam de juntar as duas tabelas (o construtor de relatórios limita a 2 joins), e o registro no
  histórico (resposta 2) não nasce sozinho.

**Pergunta nova que as respostas abrem (para a sessão que autorizar):** hoje existem duas "conversões". `convert-lead`
encerra o lead, mas cria conta + contato, não oportunidade (`CrmPipelineService.ts:106-113`). `convert-lead-to-opportunity`
cria a oportunidade e **não** encerra o lead (`:383-386`). No modelo do dono ("o lead vira oportunidade"), o natural é
**unificar**: converter cria a oportunidade (mais conta + contato quando houver) e leva o lead para `Converted`, como
ficha + histórico espelhado. Isso muda duas ações e a UX do botão; não decidido aqui.

### 9.2 O lead encerra ao virar oportunidade? (29/09) — documentado, não ratificado

**Pergunta do dono:** *"Antes de tudo, o lead deveria encerrar ao virar oportunidade?"* Na primeira rodada, ele devolveu:
*"Mas lead que não fechou negócio é lead fechado?"*. Esclarecido na sessão: o que acaba é a **fase de lead** (a
qualificação), não o negócio. O status é **"Convertido"**, que já existe em `leads.status` (`LeadsModule.ts:109-113`), e
não "fechado". Ganho e perda são status **só da oportunidade**.

| Situação do lead | Significado | Onde está o negócio |
|---|---|---|
| Aberto | em qualificação, sem oportunidade | não existe ainda |
| Convertido | virou oportunidade | na oportunidade: aberta, ganha ou perdida |
| Desqualificado | nunca virou oportunidade | não existe |

**Respostas (questionário, 29/09):**
- *"Sim, vira 'Convertido'"*: criar a oportunidade leva o lead para `Converted`. Ele sai do funil de leads, mas continua
  como ficha (histórico + espelho da oportunidade aberta). "Converter Lead" e "Criar Oportunidade" viram **um botão só**.
  Isso responde, como direção, à "pergunta nova" do §9.1 (unificar as duas conversões).
- Se a oportunidade for **perdida**: *"Fica Convertido; nova oportunidade"*. O lead não reabre nem herda o resultado; uma
  nova tentativa é uma nova oportunidade a partir dele, e o histórico mostra todas. Hoje isso já é possível: o botão
  "Criar Oportunidade" aparece para lead convertido (`Lead360Modal.tsx:182-188`) e o serviço não barra.

**Consequências para quem autorizar (não decididas aqui):**
1. **O espelho encolhe.** Com o lead fora do funil, etapa/funil e status **não** são espelhados. Saem do mapa do §9.1 as
   linhas `pipelineId + stageId` e `status`, e caem os riscos 2 e 3. Ficam: valor + moeda, probabilidade, previsão,
   responsável, conta e contato. O andamento do negócio aparece pelo vínculo.
2. **`Won`/`Lost` do lead perdem uso.** Resultado é da oportunidade. Isso resolve o CA1 do conselho na direção. Em aberto:
   o que fazer com as opções `Won`/`Lost` do preset de leads e com os leads que já estão marcados assim.
3. **Um botão só.** A ação unificada cria a oportunidade (mais conta + contato quando houver) e leva o lead para
   `Converted`. A trava atual de `convertLead` ("Lead already converted", `CrmPipelineService.ts:167-168`) muda de sentido: num
   lead já convertido, converter de novo é **criar outra oportunidade**, respeitando "uma aberta por vez" (resposta 4 do §9.1).
4. **Valor de pipeline** (BRIEF CRM-RB §4.2): com os convertidos fora do funil de leads, somar leads passa a medir só quem
   está em qualificação. O pipeline de negócios fica nas oportunidades, que é o caminho (a) do §4.2. A escolha do número
   continua do dono.

### 9.3 Comparação com o Salesforce (pesquisa pedida pelo dono, 29/09) — documentado

Fontes oficiais lidas em 29/09 no navegador: *SOAP API Developer Guide*, `convertLead()`
(developer.salesforce.com/docs/platform/api/guide/sforce-api-calls-convertlead.html) e *Object Reference*, `Lead`
(developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm).

**O que o Salesforce faz (verificado nas fontes):**
- A conversão é **uma ação só**: o lead vira conta + contato e, **por padrão, também oportunidade**. O flag
  `doNotCreateOpportunity` existe para quando não se quer a oportunidade (*"An opportunity is created by default"*).
  Também dá para converter para uma conta/contato/oportunidade **já existentes** (merge) ou para *person account* (B2C).
- Quando converter: *"Typically, a lead can be converted when it becomes a real opportunity that you want to forecast."*
- O lead ganha um status do tipo convertido (o exemplo oficial usa `"Closed - Converted"`), `IsConverted = true`,
  `ConvertedDate` e os vínculos `ConvertedOpportunityId`, `ConvertedAccountId` e `ConvertedContactId`.
- Depois disso o lead **congela**: *"After a lead has been converted, it's read only."* Só quem tem a permissão *View and
  Edit Converted Leads* consegue editá-lo.

**Comparação com as direções do §9.1–9.2:**

| Ponto | Salesforce | Direção do dono (29/09) | |
|---|---|---|---|
| Converter = criar oportunidade, uma ação só | sim (oportunidade por padrão) | sim (botão único) | **igual** |
| Lead sai do funil com status convertido | sim ("Closed - Converted") | sim ("Convertido") | **igual** |
| Vínculo lead → oportunidade guardado | sim (`ConvertedOpportunityId`) | sim (vínculo obrigatório) | **igual** |
| Lead convertido recebe atualização da oportunidade | **não** — fica só-leitura, congelado | **sim** — espelho da oportunidade aberta | **diverge** |
| Nova venda depois (ou após perda) | nova oportunidade na **conta/contato**; o lead não converte de novo | nova oportunidade **a partir do lead** | **diverge** |
| Onde fica a "ficha" viva do cliente | conta + contato (ou *person account*) | o lead | **diverge** |

**Leitura (inferida):** o Salesforce confirma a espinha do modelo: converter = virar oportunidade, lead convertido fora
do funil, vínculo guardado. As três divergências têm a mesma raiz. No Salesforce a ficha permanente é **conta/contato**,
e o lead é descartável depois de convertido. Na direção de 29/09, a ficha permanente é o **próprio lead**. Aqui, contas e
contatos são submódulos opcionais (`registry.ts`, CRM-2A/2B), o que ajuda a explicar a escolha, sobretudo no balcão B2C.
Quem autorizar escolhe entre:
- manter o lead como ficha (espelho + nova oportunidade a partir dele);
- seguir o Salesforce: lead congelado; espelho e novas oportunidades na conta/contato. Isso exigiria contatos sempre
  instalados.
Não decidido aqui.
