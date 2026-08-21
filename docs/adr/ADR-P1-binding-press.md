# ADR-P1 — A Prensa: engine de binding em tempo de geração (mappers compilados)

> **Status: Accepted — RATIFICADO FORK-A-FORK 2026-08-21** (dono, via AskUserQuestion, após parecer
> independente `PARECER-ARCHITECT-ADR-P1.md` produzido por agente separado). Resultado:
> **F-P1-1→(b)** corpus com AS DUAS classes (postEntry-direto + comando-de-subrazão) — divergiu da
> recomendação (a); **F-P1-2→(b)** tabela Prisma própria `AccountingBinding` — divergiu da rec. (a);
> **F-P1-3→(a)** swap do salão em produção após golden verde — divergiu da rec. (b);
> **F-P1-4→(a)** dinheiro no intérprete + discriminador de slot (`float-reais` | `cents-int`, achado
> A2 do parecer); **F-P1-5→(a)** papel→conta resolvido na compilação; **F-P1-6→(b1)** validador
> estrutural + dry-run via modo **validate-only** do PostingService (refatoração interna preservando
> o contrato público — emenda ao §8); **F-P1-7 (novo, do parecer)→módulo irmão**
> `server/src/features/accountingBinding/` (nem accounting, nem interview). **As 6 emendas do parecer
> foram aceitas em bloco** (§11). Pré-condição de PVA do §9 **revogada pelo dono** na mesma sessão.
> Próximo passo: BRIEF via sessão de planejamento → implementação.
>
> **Origem:** `docs/ROADMAP-PLATAFORMA.md` Fase P1 + tese de produto fixada pelo dono 2026-07-13
> (memória `luminaris-product-thesis`). **Classe:** DECISÃO ARQUITETURAL — toca a fronteira dos dois
> mundos (Contrato §2.1) e carrega o ônus de provar que **não** reabre o Motor de Regras rejeitado
> (master map §4).
>
> Criado: 2026-08-21.

---

## 1. Contexto e problema

A tese de produto: Luminaris **gera** ERPs setoriais — módulos canônicos + onboarding com IA; o salão
é o molde, a contabilidade é a peça setor-invariante que todo vertical herda. Hoje a ligação
vertical→contabilidade é **escrita à mão**: cada tipo de evento operacional tem um mapper TypeScript
próprio. Isso funciona para 1 vertical; não escala para N — cada setor novo exigiria uma sessão de
engenharia por evento contábil.

**Objetivo do P1:** substituir mappers à mão por **1 intérprete fixo de runtime + N bindings
compilados na geração do preset**. A engine (dinâmica, com IA) roda **apenas** no pipeline de geração
do sistema (ao lado de `PresetMatcher`/`CustomizationService`); o caminho do dinheiro em runtime nunca
vê engine — só um intérprete burro que faz lookup do arquétipo, preenche slots com o binding e entrega
um `PostEntryInput` ao `PostingService.postEntry` imutável.

## 2. Evidência de código — o corpus existente (verificado 2026-08-21)

O material de extração dos arquétipos **já existe e está testado em produção de testes** (todos em
`server/src/features/accounting/sync/`):

| Classe | Artefato | Arquétipo que materializa |
|---|---|---|
| postEntry direto | `mappers/SalonSaleFinalizedMapper.ts` | **Reconhecimento de receita** — D controle (1.1.2) / C receita split por natureza (3.1/3.3 via `revenueSplit.ts` canônico) |
| postEntry direto | `mappers/SalonSaleSettledMapper.ts` | **Liquidação** — D caixa-por-método / C controle |
| postEntry direto | `mappers/SalonSaleReturnedMapper.ts` | **Estorno de origem** (T5: lançamento novo, nunca edição) |
| postEntry direto | `mappers/SalonPackageSoldMapper.ts` | **Passivo de performance** (pacote: caixa × receita diferida) |
| postEntry direto | `mappers/SalonSaleCogsMapper.ts` | **CMV** — D 4.2 / C 1.1.6 (bridge INVENTORY) |
| comando de subrazão | `bridges/CrmReceivableBridge.ts` | **Criação de título** — não posta; cria `Receivable` no subledger AR (o post vem do ciclo AR) |

Contrato vigente que a prensa deve preservar (`mappers/IAccountingEventMapper.ts`): o mapper detém o
conhecimento do plano de contas **e a fronteira de dinheiro** (float reais → centavos int, com guards
`Number.isFinite`/`Math.round`/`Number.isSafeInteger` — ver `SalonSaleFinalizedMapper.ts:25-47`), e
**não** re-implementa o invariante de balanceamento — `PostingService.postEntry` continua a autoridade
de Σdébito === Σcrédito (defesa em profundidade que o binding não remove).

O corpus revela **duas classes de arquétipo distintas**: (1) evento → lançamento balanceado
(`PostEntryInput`); (2) evento → **comando de subrazão** (criar `Receivable`/`Payable`, que gera o
lançamento pelo próprio ciclo do subledger). O fork F-P1-1 decide se a v1 cobre as duas.

## 3. Proposta (uma frase por camada)

1. **Arquétipos de lançamento em CÓDIGO testado** — catálogo fixo extraído do corpus acima
   (reconhecimento, liquidação, estorno, passivo-de-performance, CMV; + criação-de-título se F-P1-1(b)).
   O arquétipo define as partidas e **balanceia por construção**; o binding só preenche slots.
2. **Binding = DADO versionado emitido na geração** — para cada evento do preset do setor: qual
   arquétipo, quais campos das tabelas operacionais alimentam quais slots, quais papéis de conta
   resolvem para quais códigos do chart.
3. **Validador determinístico pré-ativação** — binding proposto pela IA na entrevista só ativa depois
   de aprovado por validação sem IA (princípio PROPOSED do chat agent).
4. **Intérprete fixo de runtime** — lookup do arquétipo + preenchimento de slots + entrega ao
   `PostingService` imutável. **Zero branch de decisão de negócio.**

## 4. Invariantes que o ADR final DEVE travar (fixados pelo dono 2026-07-13 — não são forks)

1. **Arquétipos em código testado** — binding preenche slots, **nunca define partidas**.
2. **Contas por PAPEL** (role→código por tenant), validado contra o chart — padrão INCR-9.
3. **Binding proposto pela IA passa por validador determinístico antes de ativar.**
4. **Binding versionado** — customização de campo bound = RE-COMPILAR (engine re-roda, binding v2),
   nunca edição manual do artefato.
5. **Anti-erosão:** o intérprete de runtime **não contém branch de decisão de negócio** — toda
   condicional pertence à engine de geração e vira dado no binding. Cada decisão que migrar para o
   runtime é regressão ao §4.

E os dois de localização, herdados do Contrato §2.1 e da tese:

6. **Onde vive:** pipeline de geração (`features/interview/*` / presets) — **nunca** em
   `features/accounting`, **nunca** no motor DynamicTable (`DynamicTableService`/`RuleContext`/plugin).
7. **A fronteira de dinheiro é do intérprete** (código com guards), não do binding — ver F-P1-4, que
   só ratifica a forma, não a existência.

## 5. Reconciliação com §4 (Motor de Regras REJEITADO) e T10 (bridges explícitas) — o ônus da prova

O §4 rejeitou `conditionsJson`/`templateJson` gerando lançamento porque: (a) ninguém valida que o
template balanceia; (b) sem versionamento; (c) engine no ponto mais crítico do runtime. O ADR final
deve demonstrar, ponto a ponto, que binding-compilado é o **oposto estrutural**:

| Rejeitado (§4) | Prensa (P1) |
|---|---|
| Template define as partidas | Arquétipo em código testado define as partidas; binding só preenche slots |
| Quem valida o balanceamento? | Balanceia por construção do arquétipo + `postEntry` continua autoridade in-tx |
| Template sem versão | Binding versionado; mudança = recompilar (invariante 4) |
| Engine roda no caminho do dinheiro | Engine roda SÓ na geração; runtime é lookup fixo (invariante 5) |
| Regra dinâmica avaliada por lançamento | Toda decisão acontece **antes de existir lançamento** |

T10 permanece: a entrada do runtime continua sendo a bridge pós-commit explícita por origem
(`AccountingSyncPort`/registro de mappers) — a prensa troca a **implementação** dos mappers (código à
mão → intérprete+binding), não o padrão de integração.

## 6. Forks — RATIFICADOS 2026-08-21 (resultado no cabeçalho; tabela original mantida por rastreabilidade)

| # | Pergunta | Opções | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-P1-1** | Escopo do corpus v1 | (a) só a classe postEntry-direto (5 mappers de venda) · (b) incluir a classe comando-de-subrazão (criação de título AR/AP, padrão `CrmReceivableBridge`) | **(a)** — a classe 2 tem semântica própria (idempotência por `documentNumber`, tombstone) e pode entrar como v2 sem retrabalho; v1 menor = prensa provada antes |
| **F-P1-2** | Forma/persistência do binding compilado | (a) dado serializado do preset (JSON versionado junto ao `SystemPreset`) · (b) tabela Prisma própria (`AccountingBinding`) · (c) artefato em disco | **(a)** — o preset já é o artefato de geração versionável; de graça vira o formato de um futuro marketplace (P5). (b) só se precisarmos de query/audit sobre bindings |
| **F-P1-3** | Cutover do salão | (a) re-expressar como binding + **swap** em produção após golden test · (b) re-expressar + golden test, mas salão **permanece** nos mappers à mão até o P2 provar a prensa | **(b)** — o golden test byte-idêntico é obrigatório de qualquer forma (prova de saída); o swap é reversível e pode esperar a prova do vertical 2 |
| **F-P1-4** | Fronteira de dinheiro | (a) conversão float→cents + guards no intérprete fixo (código) · (b) declarada no binding (dado) | **(a)** — dinheiro é invariante (T4), não decisão de setor; os guards existentes do mapper migram para o intérprete uma única vez |
| **F-P1-5** | Resolução papel→conta | (a) na compilação: binding carrega o `accountCode` literal já validado (recompila se o chart mudar) · (b) em runtime: binding carrega o papel; intérprete resolve papel→conta por tenant a cada evento (lookup, não branch) | **(a)** — determinismo máximo e falha na compilação, não no lançamento; exige gatilho de recompilação quando conta bound for arquivada (validador acusa) |
| **F-P1-6** | Escopo mínimo do validador determinístico | (a) estrutural: arquétipo existe + contas existem/folha/`acceptsEntries` + natureza compatível + todo slot preenchido · (b) (a) + simulação: compila 1 lançamento sintético e roda contra `postEntry` em dry-run | **(b)** — a simulação é barata e é a única checagem que exercita o caminho real (lição `gate-eval-prova-o-texto-nao-o-app`) |

## 7. Prova de saída (gate objetivo do incremento)

Os mappers de salão re-expressos como binding compilado produzem lançamentos **byte-idênticos** aos
atuais — golden test contra o corpus real (eventos das suítes existentes de
`AccountingSync`/mappers). A prensa reproduz o molde **antes** de prensar coisa nova. Gates padrão por
cima: tsc×2 limpo, jest accounting verde, review independente por agente separado, zero import de
`features/accounting` a partir do pipeline de geração (checável por grep/teste de fronteira).

## 8. Não-objetivos

- **Não** reabre o Motor de Regras (§4) — ver §5; qualquer condicional de negócio no runtime é FAIL de review.
- **Não** toca `PostingService`/`PeriodService`/`AuditService`/repos do ledger (núcleo imutável).
  **EMENDADO 2026-08-21 (F-P1-6→b1):** fica permitida UMA refatoração interna do `PostingService` —
  o modo **validate-only** de `postEntry` (roda todas as validações, não persiste) — desde que o
  contrato público e o comportamento do caminho de escrita permaneçam byte-idênticos (par de testes
  de caracterização antes/depois obrigatório). Qualquer outro toque no núcleo segue proibido.
- **Não** cria UI de edição de binding — customização passa pela entrevista/re-compilação (invariante 4).
- **Não** cobre localização por país (P-i18n) nem NF-e — eixos ortogonais.
- **Não** é aparato de auditoria — a moratória do `CLAUDE.md` segue intacta e este incremento não a viola
  (é código de produto), mas **a entrada da fase é gated**: ver §9.

## 9. Pré-condições de entrada (do roadmap, Parte B)

~~**Parte A terminada + PVA verde** — a fábrica se constrói sobre um vertical 1 completo e validado;
senão compila-se um molde não-provado.~~ **PRÉ-CONDIÇÃO REVOGADA PELO DONO 2026-08-21** (decisão
explícita via AskUserQuestion: "Implementar P1 já"): a implementação do P1 fica autorizada a iniciar
após a ratificação fork-a-fork, **sem esperar o PVA**. Registro honesto do risco que a revogação
assume (era o fundamento da pré-condição do roadmap): os arquétipos serão extraídos de um molde cujos
SPEDs ainda não passaram no validador oficial — se o PVA reprovar algo que toque os mappers, o
catálogo de arquétipos herda a correção (mitigado pelo golden test: corrigir o mapper quebra o golden
e força re-visita do arquétipo). Os 4 oráculos do Degrau 0 continuam abertos e continuam sendo o
gate do "100% provado" do vertical 1.

## 10. Próximos passos de governança

1. ~~Parecer do `luminaris-accounting-architect`~~ ✅ FEITO 2026-08-21 (`PARECER-ARCHITECT-ADR-P1.md`,
   agente independente; veredito: apto com 6 emendas).
2. ~~Ratificação fork-a-fork pelo dono~~ ✅ FEITA 2026-08-21 (ver cabeçalho).
3. ~~Promover a **Accepted**~~ ✅ (este doc); registrado no `INDEX.md`; nó ⏳ no master map.
4. BRIEF via sessão de planejamento; implementação via sessão de feature (candidato a `parallel-batch`:
   arquétipos ∥ validador ∥ intérprete após a Fase 0 do schema de binding). **← passo corrente.**

## 11. Emendas do parecer — ACEITAS EM BLOCO pelo dono (2026-08-21)

Fonte: `PARECER-ARCHITECT-ADR-P1.md` (detalhe e citações lá). O BRIEF/implementação DEVE honrá-las:

1. **Legenda T5 corrigida:** `SalonSaleReturnedMapper` é **devolução** (lançamento inverso novo), não
   o mecanismo de `reversedById` — o estorno real roda via `reverseEntry` no núcleo, **fora** do
   catálogo de arquétipos e fora do golden test. O catálogo v1 não tem arquétipo "estorno-reversedById".
2. **Slot de dimensão:** o schema do binding ganha slot opcional de etiqueta de dimensão — conta com
   `requiresDimension=true` num vertical novo NÃO pode travar o intérprete em runtime (INCR-DIM-COMPLETENESS).
3. **Discriminador de fronteira de dinheiro:** slot declara `float-reais` (guards Finite/round/safeInt)
   ou `cents-int` (pass-through com teto `MAX_CENTS`, padrão CogsMapper) — acolhido em F-P1-4(a).
4. **Gatilhos de recompilação enumerados no ADR/BRIEF:** sync aditivo de preset (mecanismo existente,
   `PresetSyncService`), customização de campo bound, mudança de chart/arquivamento de conta bound
   (hoje SEM ponte — o validador rodado proativamente é a cobertura mínima).
5. **Passthrough puro de `sourceType`/`sourceId`:** idempotência T7 nunca vira dado de binding — o
   intérprete propaga a identidade do evento byte-idêntica, como os mappers fazem hoje.
6. **Mecanismo de dry-run fixado:** modo validate-only interno ao `postEntry` (F-P1-6→b1, emenda §8),
   nunca commit-e-reverte (poluiria a hash-chain T8) nem validador paralelo (drift).

**Registro adicional da ratificação F-P1-1(b):** os 3 guards de idempotência do
`CrmReceivableBridge` (chave por `documentNumber`, lookup tombstone-aware, não-ressuscitar
cancelado) permanecem em **CÓDIGO do arquétipo classe-2**, nunca em dado do binding — condição
anti-§4 que o parecer apontou como risco da opção (b); o dono a escolheu ciente, com esta cerca.
O tipo `Archetype` vira union de 2 membros (efeito `postEntry` × efeito `subledger-command`) e o
intérprete emite os dois efeitos por dispatch de classe, sem branch de negócio.
