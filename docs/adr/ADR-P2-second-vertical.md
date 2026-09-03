# ADR-P2 — O segundo vertical: provar a prensa

> **Status: ACCEPTED — promovido pelo dono em 2026-09-03 (F-Q1 → "promover agora", contra a recomendação de esperar H1/H2; registro em `docs/accounting/CEDULA-DECISAO-2026-09-03-modulos.md` §B). Ressalva mantida: a pré-condição "vertical 1 validado" segue FALSA — o sign-off é o RUNBOOK-H3.** ~~Status: Draft — 8/8 FORKS RATIFICADOS (2026-08-25); promoção a Accepted PENDENTE.~~ Os oito forks
> (F-P2-1..F-P2-10) estão decididos — ver bloco de ratificação de 2026-08-25 e §3. O ADR **segue
> `Draft` de propósito**: a pré-condição §5 item 2 ("vertical 1 validado: PVA verde + sign-offs")
> **continua insatisfeita**, e promover a Accepted é decisão separada do dono. Nada roteável sem ela
> (ORCH-006). **Depende de ADR-P1 Accepted + implementado + golden test verde.**
>
> **RATIFICAÇÃO 2026-08-21 (dono, via AskUserQuestion): F-P2-1 → CLÍNICA ESTÉTICA.** Decisão
> corroborada a posteriori pelo achado OQ-1 do `docs/accounting/P2-DOSSIER-prova.md`: o
> `PresetMatcher` já resolveria "barbearia" para o preset `beautySalon` existente
> (`PresetKnowledgeBase.ts:17`) — a prova com barbearia seria trivialmente verdadeira sem exercitar
> a prensa. Clínica estética exige customização real (campos novos em `customers`) e por isso é a
> prova honesta do anel 1. F-P2-3 e F-P2-4 seguem abertos.
>
> **RATIFICAÇÃO 2026-08-22 (dono, via AskUserQuestion): F-P2-2 → (a) TENANT-FIXTURE INTERNO
> SINTÉTICO.** Isola a variável sob prova (a prensa, não o domínio) e não reabre o oráculo "dado real"
> que o Degrau 0 está tentando fechar — misturar as duas provas faria uma falha de dado real parecer
> falha da prensa. **F-P2-3 continua aberto POR DEPENDÊNCIA** (não por indecisão): depende do H1/PVA,
> que ainda não rodou. F-P2-4 segue aberto.
>
> **EMENDA 2026-08-22 (dono, via AskUserQuestion) ao §2 — `factory.ts` entra no perímetro zero-diff.**
> `server/src/lib/factory.ts` passa a fazer parte do perímetro da prova de saída (§2, item 2): todo
> `git diff` nesse arquivo entre o vertical 1 e o vertical 2 conta como falha da prensa, no mesmo grau
> que um diff em `features/dynamicTables` ou `features/accounting` núcleo. Esta é a emenda que o
> `PARECER-ARCHITECT-ADR-P2.md` §1.5 já recomendava ("INCLUIR... ou provar que pós-P1 a composição é
> genérica") e que nunca tinha sido incorporada ao texto ratificado — o texto anterior do §2 citava só
> motor+ledger+intérprete, sem mencionar `factory.ts` nem para incluir nem para excluir. A emenda só é
> **ALCANÇÁVEL** depois do alimentador (`ADR-INCR-BINDING-FEEDER.md`, Accepted 2026-08-22): antes dele,
> `factory.ts` MUDARIA por vertical por construção (import estático + entrada no array de mappers por
> setor), e exigir zero-diff nesse arquivo falharia trivialmente para qualquer vertical novo — não por
> a prensa ter falhado, mas por o alimentador ainda não existir. Ver `ADR-INCR-BINDING-FEEDER.md` para
> o achado, as seis decisões do alimentador e o que ele deixa aberto.
>
> **RATIFICAÇÃO 2026-08-25 (dono, via `AskUserQuestion`, três rodadas) — OS SEIS FORKS RESTANTES.**
> Fecha F-P2-3, F-P2-4 e os seis novos levantados pelo
> [BRIEF](../accounting/BE-INCR-P2-VERTICAL-CLINICA-brief.md) (F-P2-5..F-P2-10). Tabela completa no §3.
> **Quatro decisões contrariaram a recomendação do agente** (F-P2-3, F-P2-4, F-P2-6, F-P2-9) —
> registrado aqui porque a recomendação é não-vinculante por desenho e a divergência é o dado, não o
> ruído. **Três consequências estruturais que o BRIEF não previa:**
>
> 1. **O P2 deixou de ser o próximo incremento.** F-P2-6 → (b) renomear `salon.*` → `sale.*` **antes**
>    do P2, e o dono ratificou que isso vira **ciclo próprio** (instrumentação → correção), não uma
>    emenda ao perímetro no meio do P2. Motivo: `features/accounting/sync/**` está DENTRO do perímetro
>    zero-diff, então mexer nele durante o P2 tornaria negociável exatamente o critério que o P2 existe
>    para julgar. **Consequência de fila: um incremento novo entra na frente do P2.**
> 2. **O escopo do P2 cresceu duas vezes.** F-P2-4 → (b) instrumentação no produto exige **criar o evento
>    de T0, que hoje não existe** (o wizard termina em `COMPLETED` sem persistir marco — insumo ausente 1
>    do BRIEF §8). F-P2-3 → (b) acrescenta **uma rodada humana de PVA sobre a ECD do vertical 2**, no fim.
> 3. **Nasceu um terceiro incremento diferido.** F-P2-5 → híbrido: a prova roda por **módulo novo**
>    (determinístico), e **plugar o `FieldCustomizationService` vira incremento próprio com ADR próprio**.
>    Decidido depois de o agente verificar em disco que o serviço **não tem chamador nenhum** em
>    `server/src` (código morto do ponto de vista do servidor), depende de `StateManager` em memória e faz
>    chamada a `gpt-4-turbo` no caminho de execução — três custos ausentes do BRIEF. **Correção ao
>    BRIEF §8 insumo 2:** a entrevista **NÃO** está "sem controller/rota" —
>    `interviewController.postChatInterview` existe e está roteado por `routes/dashboard.ts`. O buraco é
>    específico do `FieldCustomizationService`.
>
> **Refinamento do dono sobre F-P2-6 (segunda metade).** O gate de cobertura de evento vive **no
> alimentador, mas roda na GERAÇÃO do sistema** — não no boot. Um binding incompleto **nunca chega a
> virar `Active`**, em vez de derrubar o processo depois. **Resíduo registrado, não resolvido:** o CLI de
> ativação é um **segundo caminho de escrita** (F-P2-7 → (a) o mantém vivo com registry), e gate só na
> geração **não cobre** binding que nasce por CLI ou por migração. Decidir na execução do P2.
>
> **EMENDA 2026-08-25 (dono, via `AskUserQuestion`) — T0 da métrica DEFINIDO (pré-trabalho do
> F-P2-4b, §6 passo 4).** O T0 do *time-to-first-ECD* é um **marco explícito persistido na mesma
> transação do `installPresetAsSystem`** (ex.: coluna/evento `onboardingCompletedAt`) — o único fim
> automático e one-shot do wizard hoje: `useAiInterview` dispara a criação do sistema quando
> `nextStage === 'COMPLETED'`, e o `dashboardController` barra reinstalação com 403. Rejeitados no
> levantamento (agente B4, read-only): `MIN(DynamicTable.createdAt)` (dedução implícita — quebra em
> silêncio se nascer outro caminho de escrita na tabela), `User.createdAt` (o signup redireciona para
> login, não para o wizard — mediria tempo ocioso que a fixture sintética do F-P2-2a jamais exporia) e
> binding-ativo / primeiro período OPEN (CLI/bootstrap manual fora do wizard — mede o motor, não o
> usuário). Nome e shape exatos do marco são decisão da execução do P2; a **âncora semântica está
> fechada**.
>
> **Origem:** `docs/ROADMAP-PLATAFORMA.md` Fase P2. **Classe:** PROVA DE PRODUTO (preset + binding;
> zero código de motor/ledger — se exigir código lá, a prova falhou).
>
> Criado: 2026-08-21.

---

## 1. Objetivo

Um setor novo sai da máquina **sem nenhum diff no motor DynamicTable, no ledger ou no intérprete de
runtime** — só: preset do setor + binding compilado na geração + (se preciso) contas novas no chart
**via papel** (F-P1-5). É a definição operacional da aspiração "Shopify dos sistemas de empresa".

## 2. Prova de saída (a definição de sucesso — objetiva e falseável)

1. O tenant do setor 2 percorre **entrevista → ERP operante → fechamento mensal → gera a própria ECD**.
2. `git diff` do motor (`features/dynamicTables`), do ledger (`features/accounting` núcleo), do
   intérprete, de `server/src/lib/factory.ts` (**EMENDA 2026-08-22**) **e de
   `server/src/controllers/dynamicTablesController.ts`** (**EMENDA 2026-08-25, F-P2-10 → (c)** — ele
   invoca as pontes de salão incondicionalmente, o acoplamento vertical mais claro que estava fora do
   perímetro) entre antes e depois do vertical é **vazio**. **`presets/ai/PresetKnowledgeBase.ts` fica
   FORA do perímetro** pela mesma emenda: o comportamento 3 do BRIEF **precisa** de uma entrada nova
   nele, e exigir zero-diff ali reprovaria a prova por fazer o que o §1 autoriza. Um diff não-vazio não é "ajuste" — é defeito da
   prensa e volta para o P1 como lacuna (sessão de instrumentação → correção).
3. **Métrica instaurada: *time-to-first-ECD*** — do onboarding ao primeiro arquivo validável (análogo
   do "minutes to first sale" da Shopify). **EMENDA 2026-08-25 (F-P2-4 → (b)): instrumentada no
   produto**, não só no runbook — timestamp de onboarding → timestamp do 1º `EXPORT_SPED_ECD`,
   persistidos. **Pré-trabalho obrigatório:** o evento de T0 **não existe** hoje (o wizard termina em
   `COMPLETED` sem persistir marco nenhum) — criá-lo faz parte do P2, e o que conta como T0 tem de ser
   definido antes de instrumentar. **DEFINIDO 2026-08-25 (dono):** marco explícito persistido na mesma
   transação do `installPresetAsSystem` — ver emenda no cabeçalho.
4. **EMENDA 2026-08-25 (F-P2-3 → (b)): a prova só fecha com import PVA-limpo da ECD do vertical 2.**
   Gerar o arquivo e passar os gates internos **não basta** — o PVA é o único oráculo que falseia a
   ECD. Consequência aceita pelo dono: o P2 passa a depender de **mais uma rodada humana de PVA**,
   somada à do vertical 1 (item 3 do Bloco A da §5.1, aberta).

A validação final da ECD do vertical 2 no PVA é **gate humano** (runbook `RUNBOOK-FORMAT.md`, assinatura
do dono) — o agente prepara o runbook em branco, não o preenche.

## 3. Forks — TODOS RATIFICADOS (F-P2-1..F-P2-10)

| # | Pergunta | Opções | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-P2-1** ✅ RATIFICADO 2026-08-21 → (a) | Setor do vertical 2 | (a) anel 1 — serviço, Presumido, shape adjacente ao salão (barbearia / clínica estética) · (b) anel 2 — petshop/varejo (estoque comprado a prazo) | **(a)** — maximiza reuso de arquétipo e isola a variável sob prova (a prensa, não um domínio novo). (b) puxa o módulo operacional de Compras/AP (P4) — dois incrementos numa prova só |
| **F-P2-2** ✅ RATIFICADO 2026-08-22 → (a) | Tenant da prova | (a) tenant-fixture interno (dados sintéticos realistas) · (b) tenant real (operação de verdade do setor) | **(a) — RATIFICADO** para a prova zero-diff + time-to-first-ECD; (b) é o passo seguinte natural e reabre o oráculo "dado real" — não misturar as duas provas |
| **F-P2-3** ✅ RATIFICADO 2026-08-25 → **(b)** (contra a recomendação) | Profundidade da prova contábil | (a) até ECD gerada (arquivo existe e passa os gates internos) · (b) (a) + import PVA-limpo da ECD do vertical 2 | **(b)** — o PVA é o único oráculo que falseia o arquivo; sem ele a prova herda o mesmo déficit do vertical 1. Custo: mais uma rodada humana de PVA |
| **F-P2-4** ✅ RATIFICADO 2026-08-25 → **(b)** (contra a recomendação) | Onde registrar a métrica | (a) runbook manual da prova (doc) · (b) instrumentação no produto (timestamp de onboarding → timestamp do 1º EXPORT_SPED_ECD) | **(a)** para a prova única; (b) só quando houver mais de um tenant medindo — YAGNI antes disso |
| **F-P2-5** ✅ RATIFICADO 2026-08-25 → **híbrido (a)+(b) diferido** | Mecanismo da ficha clínica | (a) módulo novo `AestheticClinicCustomerModule.ts` composto pelo preset · (b) `customerModule` + `FieldCustomizationService` em runtime · (c) editar `CustomerModule.ts` compartilhado | **RATIFICADO: a prova roda por (a)**; plugar o `FieldCustomizationService` vira **incremento próprio com ADR próprio**. (c) VETADO. Razão do híbrido: (b) prova o invariante 4 do ADR-P1 mas põe um LLM no caminho da prova (se falhar, "foi a prensa ou o modelo?" fica sem resposta), exige fiação não planejada, e deixa o modelo definir campos de **dado de saúde sob LGPD** em runtime |
| **F-P2-6** ✅ RATIFICADO 2026-08-25 → **(b)** (contra a recomendação) **+ ciclo próprio + gate na geração** | Vocabulário `salon.*` e onde mora o gate de cobertura | (a) vincular `salon.*` como está, gate no boot · (b) renomear para `sale.*` neutro **antes** do P2 · (c) gate só como teste da fixture | **RATIFICADO (b)**, e o rename vira **incremento próprio ANTES do P2** (instrumentação → correção), não emenda ao perímetro no meio do P2. **Gate de cobertura: no alimentador, na GERAÇÃO do sistema** — binding incompleto nunca vira `Active`. Resíduo aberto: o CLI é 2º caminho de escrita e não passa pela geração |
| **F-P2-7** ✅ RATIFICADO 2026-08-25 → **(a)** | Parametrização do CLI de ativação | (a) registry `sectorKey → {binding, operationalSchema}` no CLI atual · (b) 2º CLI · (c) CLI lê payload JSON por flag | **(a)** — o CLI está fora do perímetro zero-diff, então editá-lo é legítimo; um caminho só, e mata o footgun verificado (`activateAccountingBindingCli.ts:61` lê `--sector-key`, `:123` grava **sempre** `SALON_BINDING_V1.eventBindings`) |
| **F-P2-8** ✅ RATIFICADO 2026-08-25 → **(a)** | Amplitude operacional da clínica na prova | (a) serviço + revenda de cosmético + pacote (5 arquétipos) · (b) serviço puro (3) | **(a)** — sob (b), `cogs` e `performance_liability` nunca disparam (a ponte de CMV sai cedo com zero linhas de produto) e a prova do vertical 2 cobriria MENOS que o vertical 1 já cobre |
| **F-P2-9** ✅ RATIFICADO 2026-08-25 → **(a)** (contra a recomendação) | Fechamento dos meses da fixture | (a) `SOFT_CLOSED` (reabrível) · (b) `HARD_CLOSED` (terminal) | **(a) RATIFICADO** — permite iterar a fixture sem reconstruir. Consequência aceita: a prova afirma menos que "exercício encerrado"; **ao redigir o runbook da prova, não descrever a ECD do P2 como saída de exercício hard-closed** |
| **F-P2-10** ✅ RATIFICADO 2026-08-25 → **(c)** — era BLOQUEANTE | Perímetro: `dynamicTablesController.ts` e `presets/ai/` | (a) incluir os dois no zero-diff · (b) manter só o que a emenda de 08-22 nomeou · (c) incluir o controller, excluir `presets/ai/` | **(c)** — `dynamicTablesController.ts` **ENTRA** no perímetro (invoca as pontes de salão incondicionalmente); `presets/ai/PresetKnowledgeBase.ts` **SAI** (verificado: tem **1 entrada só**, `beautySalon`, cuja `aiDescription` já reivindica "clínicas de estética" — sem entrada nova o matcher devolveria o preset do vertical 1 e a prova mediria a si mesma) |

## 4. Não-objetivos

- **Não** é um domínio contábil novo: nenhum arquétipo novo deveria nascer aqui (se nascer, registrar
  como achado — significa que o corpus do P1 estava incompleto).
- **Não** inclui módulo de Compras/AP operacional (P4; gatilho = vertical com estoque comprado a prazo).
- **Não** decide escala/multi-tenant de infraestrutura (P3; T11/T1 seguem travadas).
- **Não** autoriza marketing/venda do vertical — é prova de engenharia de produto.

## 5. Pré-condições de entrada

1. **ADR-P1 Accepted + implementado + golden test byte-idêntico verde.** ✅ (PR #211).
2. Vertical 1 validado (Parte A: PVA verde + sign-offs) — herdado da entrada do P1.
   ⛔ **INSATISFEITA** (itens 3 e 4 do Bloco A da §5.1 seguem abertos). **É o que segura a promoção
   deste ADR a Accepted**, mesmo com 8/8 forks ratificados.
3. F-P2-1 ratificado (pode ser cedo — orienta o P1). ✅
4. **NOVA (2026-08-25, consequência de F-P2-6 → (b)): o rename `salon.*` → `sale.*` fechado como
   incremento próprio.** Enquanto as pontes emitirem `salon.*`, o binding da clínica vincularia um
   vocabulário errado por construção. O rename toca `features/accounting/sync/**`, que está **dentro**
   do perímetro zero-diff — por isso corre ANTES, com ciclo próprio de instrumentação → correção,
   e não dentro do P2. ✅ **SATISFEITA 2026-08-25 — PR #222 mergeado** (`aff170a0`): ciclo completo
   instrumentação → correção com review independente PASS em cada etapa; F-RN-1..4 implementados
   conforme ratificados. Detalhe no `ADR-RN-salon-to-sale-rename.md` §7. **A promoção deste ADR a
   Accepted agora depende só do item 2** (gates humanos do vertical 1).

## 6. Próximos passos de governança

~~1. Ratificar **F-P2-1 agora**; demais forks após o P1 fechar.~~ ✅ **CUMPRIDO** — F-P2-1/F-P2-2 em
08-21/08-22, os seis restantes em 2026-08-25. **8/8 ratificados.**
~~2. BRIEF (sessão de planejamento).~~ ✅ **CUMPRIDO** — PR #214, registrado na fila §5.1 pela PR #215.

**Passos restantes, na ordem (atualizado 2026-08-25):**

1. ✅ FEITO 2026-08-25 — **Incremento do rename `salon.*` → `sale.*`** (pré-condição §5 item 4):
   ADR-RN/BRIEF (PR #220, forks ratificados) → instrumentação → correção → **PR #222 mergeado**.
2. **Gates humanos do vertical 1** (PVA + browser sign-off) — são o que satisfaz a pré-condição §5
   item 2 e destrava a promoção deste ADR a **Accepted**.
3. **Promover a Accepted** — decisão do dono. Alternativa conhecida: revogar a pré-condição por
   ratificação explícita, como já foi feito no ADR-P1 §9. **NÃO feito por padrão.**
4. ✅ FEITO 2026-08-25 — **Definir o T0 da métrica** (pré-trabalho do F-P2-4b, §2 item 3): marco
   explícito na tx do `installPresetAsSystem` (emenda no cabeçalho).
5. Parecer do `luminaris-accounting-architect` quando o preset do setor esboçar contas novas por papel.
6. Execução do P2 (sessão de feature) → runbooks humanos: prova + **PVA da ECD do vertical 2**
   (F-P2-3b) + o incremento diferido de plugar o `FieldCustomizationService` (F-P2-5, ADR próprio).
