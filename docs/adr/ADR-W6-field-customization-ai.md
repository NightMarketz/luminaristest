# ADR-W6 — Customização de campos por IA no painel do wizard (`POST /dashboard/ai/CustomizeFields`)

- **Data:** 2026-10-15
- **Status:** **Proposed** — escrito sob *"Autorizo escrever o ADR do W6 — Proposed, só docs, sem código, sem
  'executa'"* (dono, chat, 2026-10-15, questionário). Passa a `Accepted` só com OK do dono; não autoriza código.
- **Classe:** DECISÃO ARQUITETURAL (plataforma: IA no caminho de configuração do wizard)
- **Nó:** [W6](../plano/nos/W6.md) · **BRIEF:** [`WIZARD-W6-CUSTOMIZE-FIELDS-brief.md`](../accounting/WIZARD-W6-CUSTOMIZE-FIELDS-brief.md)
  · **Decisão de 15/10:** [`D-2026-10-15-W6-CUSTOMIZE-FIELDS`](../plano/decisoes/D-2026-10-15-W6-CUSTOMIZE-FIELDS.md)
- **Exigido por:** [ADR-P2 §3, F-P2-5](ADR-P2-second-vertical.md) (25/08): ligar o `FieldCustomizationService` é
  "incremento próprio com ADR próprio". Este é esse ADR.
- **Depende de (dura):** [W4](../plano/nos/W4.md) — `InterviewSession` persistida, com dono e TTL
  ([`BE-INCR-INTERVIEW-SESSION-brief.md`](../accounting/BE-INCR-INTERVIEW-SESSION-brief.md)).
- **Dá valor só com:** [W1](../plano/nos/W1.md) — a customização chegar ao `/dashboard/create`.
- **Insumo legal:** [`pesquisas-legais/w6-campos-ia-dado-saude/relatorio.md`](../../pesquisas-legais/w6-campos-ia-dado-saude/relatorio.md)
  ([D01] Lei 13.709/2018 compilada, Planalto, baixada em 15/10).

## TLDR (2 linhas)

O modo IA do painel de campos deixa de dar 404 e passa a ter rota própria, com a sessão e o histórico no servidor (W4).
O modelo **só propõe**: a saída é presa a schema, cada campo passa pela validação canônica, campo de dado sensível
(LGPD art. 5º, II) vem marcado e exige confirmação explícita, e quem aplica é um passo determinístico, nunca o modelo.

## 1. Contexto

Medido em `main` `8ba1ed8f` (BRIEF, "Estado de partida"; cada linha lá tem arquivo e linha):

- `AIChatMode.tsx:110,176` chama `/dashboard/ai/CustomizeFields`, que não existe (`routes/dashboard.ts:39` só registra
  `/ai/ChatInterview`). O usuário vê 404 ao usar o modo IA do painel.
- O `FieldCustomizationService` não tem chamador no servidor. Ele lê a sessão de um `Map` em memória sem dono nem TTL
  (`StateManager`), aplica a mudança na tabela no mesmo turno sem o usuário ver, extrai JSON de texto livre por regex
  e faz duas chamadas a `gpt-4-turbo` por turno (a segunda casa preset). As formas de resposta do serviço e do front
  não batem, e o papel `'ai'` chega cru à OpenAI.
- O F-P2-5 adiou esta fiação de propósito: pôr um LLM definindo, em runtime, campos que podem guardar **dado de
  saúde** pedia decisão própria. A prova do P2 seguiu por módulo determinístico e não depende deste ADR.

Em 15/10 o dono escolheu **implementar** o modo IA em vez de removê-lo (F-W6-1 (b), contra a recomendação de remover),
com a ordem "ADR primeiro".

## 2. Decisão

### 2.1 Forma

| # | Decisão | Fork | Ratificação |
|---|---|---|---|
| D1 | Implementar a customização por IA; o 404 fica na tela até o PR de FE (nada de esconder no meio do caminho) | F-W6-1 (b) | dono, 15/10: *"Fazer a IA de verdade: ADR primeiro"* (contra a recomendação) |
| D2 | `AIChatMode.tsx` fica e é adaptado ao contrato novo | F-W6-2 | dono, 15/10: *"Manter sem import"* |
| D3 | **Rota própria** `POST /api/dashboard/ai/CustomizeFields`, cadeia Route → Controller → Service (por factory, sem singleton) → repositório da sessão do W4. **O histórico por tabela mora no servidor**; o front para de mandá-lo | F-W6-3 (a) | dono, 15/10, recomendação |
| D4 | **Saída do modelo presa a schema**: `response_format` `json_schema` strict, modelo `FALLBACK` (`gpt-4o-mini`), **uma chamada por turno**, casamento com preset no mesmo schema (`presetKey` ∈ enum das chaves do `FieldPresetKnowledgeBase` ou `null`). Tipos que a IA pode propor: `string, number, boolean, date, datetime, textarea, select`; **`relation` e `json` ficam fora** (relação exige alvo que a IA não escolhe com segurança; continua possível pelo modo manual) | **F-W6-4 (a)** | **dono, 15/10, questionário desta sessão: *"Schema strict (Recomendado)"*** |
| D5 | **O modelo propõe, nunca aplica.** O turno devolve `proposal {id, changes[]}`; a sessão guarda uma proposta pendente por tabela. Aplicar/descartar é um segundo pedido (`kind:'decision'`), determinístico; proposta velha → 409 `PROPOSAL_STALE` | F-W6-5 (a) | dono, 15/10, recomendação |
| D6 | **Campo sensível é marcado e exige confirmação explícita.** O schema traz `sensitiveCategory` (enum das categorias do art. 5º, II, ou `null`); uma rede determinística de radicais só **acrescenta** marca, nunca tira. Proposta com campo sensível sem `acknowledgeSensitive:true` → 400 `SENSITIVE_FIELD_NOT_ACKNOWLEDGED` e nada é aplicado | F-W6-6 (a) | dono, 15/10, recomendação |
| D7 | **A marca sensível vive só na sessão e na confirmação.** Não entra no schema da tabela criada (`ISchemaField`); persistir a marca vira nó próprio, se o dono quiser | **F-W6-8 (a)** | **dono, 15/10, questionário desta sessão: *"Só na sessão (Recomendado)"*** |
| D8 | **O código do W6 só começa com o W4 mergeado** | F-W6-7 (a) | dono, 15/10, recomendação |

### 2.2 Invariantes que o código tem de manter

1. **Nenhuma escrita sai do modelo.** Toda mudança em `fields` passa por `kind:'decision'` com `decision:'apply'` e o
   `proposalId` da proposta pendente. O turno `message` deixa `fields` idêntico.
2. **Validação canônica, sem cópia.** Cada `add`/`update` passa pelo `AdvancedFieldSchema` de
   `dynamicTables/dtos/DynamicTable.dto.ts` (exportado, não duplicado; `_REUSE-CRITERION`: mesmo objeto de domínio e
   mesma posse). O que o modelo devolver fora disso é descartado com motivo, não corrigido.
3. **Sessão com dono.** Toda leitura é por `(sessionId, userId)` no repositório do W4; sessão de outro usuário,
   expirada ou inexistente → 404 `INTERVIEW_SESSION_NOT_FOUND` (F-W4-2 b), e a sessão alheia fica intacta.
4. **A marca sensível só cresce.** Nenhum caminho (modelo, rede de radicais, normalização) remove uma marca já posta
   numa proposta.
5. **Falha do modelo não derruba a sessão.** Exceção ou saída fora do schema → 200 com `proposal:null` e mensagem
   padrão; nada muda na sessão além da linha do usuário no histórico.

### 2.3 Fronteira (Contrato §2.1, ADR-PERSISTENCE-BOUNDARY)

O W6 não cria tabela nem modelo: o estado (proposta pendente, histórico) entra no `state Json` da `InterviewSession`
do W4, sem coluna nova. Não toca `DynamicTableService` nem o motor de plugins; o resultado aplicado é a mesma forma
de campo que o `/dashboard/create` já revalida. É dado que **o usuário desenha** — DynamicTable, como manda o §2.1.

Contratos (DTO de entrada em união discriminada `.strict()`, saída `CustomizeFieldsResult`, schema do modelo, acréscimo
ao `state`) estão no BRIEF §2 e são parte desta decisão por referência.

## 3. Consequências

**Dependência dura do W4.** Sem a `InterviewSession` persistida, a sessão continua no `Map` em memória, sem dono:
qualquer usuário com o `sessionId` leria a tabela de outro e a proposta pendente se perderia num restart. O W6 não
tem caminho "antes do W4" (F-W6-7 (a) descartou o `Map` com dono). Dois efeitos herdados do W4:
- todo `saveState` do W6 renova o TTL de 24 h (F-W4-3 a), então conversar no painel mantém a sessão viva;
- se o F-W4-4 ficar em (b) "último a gravar vence", duas abas na mesma sessão podem sobrescrever a proposta uma da
  outra. O `proposalId` + 409 `PROPOSAL_STALE` impede aplicar a proposta errada, mas não impede perder a pendente.

**O valor só chega com o W1.** Hoje o front cria o sistema só com `suiteKey`; a customização aplicada na sessão para
no painel e não chega ao `/dashboard/create`. O W1 não bloqueia o W6 (dá para construir e testar o painel), mas sem
o W1 o usuário customiza e o sistema criado não recebe o campo. Ordem que entrega valor: W4 → W6 BE → W6 FE, com o
W1 antes do sign-off de browser (item 20 do BRIEF) para o roteiro fechar ponta a ponta.

**Custo e modelo.** Uma chamada a `gpt-4o-mini` por turno, no lugar de duas a `gpt-4-turbo`. Precedente em `main`:
`OpenAIService.classifyIntoEnum` (structured outputs; o modelo `CHAT` não suporta). Com o BYOK do M2, a chave é do
cliente.

**LGPD.** A leitura que sustenta D6 é a mais segura das duas do relatório (§4): o art. 46, §2º pede segurança desde a
concepção e o art. 6º, III pede o mínimo necessário, mas **a lei não obriga em texto literal** a marcar o campo nem
a pedir confirmação. A decisão de produto não depende de resolver essa ambiguidade. Escolher a hipótese do art. 11 e
colher consentimento continua sendo do controlador (o cliente), não do Luminaris como operador.

**O que D7 deixa de fora.** A tabela criada não "lembra" que o campo é sensível: export, mascaramento e auditoria não
sabem distinguir esse campo. Trilha da decisão do controlador também não existe aqui (a sessão é efêmera; o ato
persistente é o `/dashboard/create`, do W1). Se o dono quiser isso, é nó próprio sobre `ISchemaField` e o motor.

**O que sai.** O `FieldPresetMatcher.findFieldPreset` (2ª chamada de LLM) e o parse por regex do `FieldIntentParser`
deixam o caminho; o `findExactFieldMatch` determinístico continua. O `StateManager` em memória sai com o W4.

## 4. Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Remover o modo IA (F-W6-1 a) ou deixá-lo "em breve" (a') | Escolha do dono: implementar |
| Histórico vindo do front (F-W6-3 b) ou customização dentro do `ChatInterview` (c) | O front poderia reescrever o histórico; o `ChatInterview` mistura dois fluxos com estados diferentes |
| Manter regex + `JSON.parse` + `gpt-4-turbo` + 2 chamadas (F-W6-4 b) | Classe de erro "JSON fora do lugar" e o dobro de chamadas, sem ganho |
| IA aplica direto (F-W6-5 b), ou direto exceto sensível (c) | O usuário veria a mudança depois de feita; a confirmação é o único ponto em que o controlador decide |
| IA proibida de criar campo sensível (F-W6-6 b), ou só aviso (c) | (b) inutiliza o caso da ficha clínica; (c) não pede decisão do controlador |
| Marca sensível no `ISchemaField` agora (F-W6-8 b) | Mexe no motor e em todos os leitores de schema; amplia o W6 e o acopla ao W1 |

## 5. Gatilhos de reabertura

- O W4 mudar a forma do repositório (`findActive`/`saveState`) ou do erro 404 antes de mergear.
- O dono pedir persistência da marca sensível (abre o nó de D7 (b)) ou trilha de auditoria da confirmação.
- Parecer jurídico responder a pergunta do relatório §4 no sentido de que o operador deve **impedir**, não só marcar.
- O `gpt-4o-mini` deixar de suportar structured outputs, ou o BYOK de um cliente apontar para provedor sem esse recurso.

## 6. Próximos passos (fora deste ADR)

`Accepted` pelo dono → W4 mergeado → "executa" do dono para o BE (`BE-INCR-W6-CUSTOMIZE-FIELDS`, itens 1–12 do BRIEF,
`sessao-feature`) → FE (itens 13–19) → sign-off de browser pelo dono (item 20).
