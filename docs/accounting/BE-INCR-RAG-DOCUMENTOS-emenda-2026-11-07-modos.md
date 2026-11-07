# BE-INCR-RAG-DOCUMENTOS — emenda de 07/11: dois modos de resposta no RAG (item 15)

> Emenda ao [`BE-INCR-RAG-DOCUMENTOS-brief.md`](BE-INCR-RAG-DOCUMENTOS-brief.md), item 15 do RAG-PR-B. **Só docs.**
> Os forks abaixo estão com **RATIFICAÇÃO PENDENTE**. O item 15 continua parado até o dono responder; os itens 13,
> 14, 16, 17 e 18 do RAG-PR-B não dependem desta emenda.

## Contexto fixo

- **Item:** RAG-PR-B, item 15 ("Modo RAG do chat mantido", F-RAG-3 a), do BRIEF §1.
- **Autorização:** nota `docs/plano/nos/RAG-DOCUMENTOS.md`, campo `autorizacao`, com **EXECUTA** (dono, chat,
  2026-11-06, questionário: "BUILDER-VERTICAIS,TEAMMATES,RAG-DOCUMENTOS"), que cobre o BRIEF inteiro. O pedido
  novo é a resposta do dono no questionário de 07/11, à pergunta sobre `chunkId` no acerto, citada literalmente:
  "Ele tem que ter dois modos no RAG, o descritivo onde mostra chunkID, cita fonte e em hover demonstra dados
  tecnicos e o modo rapido que só da a resposta". O pedido não está no BRIEF. Por isso vira emenda com forks, e
  não código (D-2026-10-28-FLUXO-AUTONOMO: fork novo dentro do nó vira pergunta).
- **Não confundir com o F-RAG-3** ("dois modos de chat": RAG com seleção × agente). Os dois modos desta emenda
  ficam **dentro** do modo RAG.

## Insumos lidos (estado do código em `claude/rag-pr-b`, 1bd7b69b6)

- `server/src/features/chat/dtos/ChatDto.ts`:
  - `ChatRequestSchema` tem `query`, `documentIds`, `history`, `chatInstanceId` e `confirmedProposalId`, e não é
    `.strict()`.
  - `ChatResponseSchema.sourceDocuments[]` **já traz** `id`, `score` e `payload { documentId, userId,
    textContent, fileName, chunkId, index }`.
- `server/src/features/chat/services/ChatService.ts`:
  - o caminho RAG busca na vec0, monta o contexto juntando os trechos com `---`, sem numeração, e chama o
    modelo com `RAG_SYSTEM_PROMPT`;
  - devolve `sourceDocuments` com os acertos. A resposta **não** diz qual trecho sustenta qual frase.
- `prisma/schema.prisma`, `ChatMessage`: grava `content` e o uso do turno (I11), **sem** as fontes. Quando o chat
  é reaberto, a resposta volta sem nada do que o modo descritivo mostraria.
- `my-app`: nenhum componente do chat lê `sourceDocuments`. Só aparece no tipo gerado
  `types/contracts/chat/ChatDto.gen.ts`. O dado técnico existe na resposta, mas a tela não o mostra.

## 1. Checklist (substitui a prova do item 15 e acrescenta 15a–15e)

15. **Modo RAG do chat mantido** (F-RAG-3 a), sem mudança no texto do BRIEF, exceto a prova:
    - "snapshot do `ChatResponseDto` igual" passa a ser "igual, salvo os campos que a 15b acrescenta";
    - o resto da prova fica como está.
15a. **Modo no pedido.**
   - `ChatRequestSchema` ganha `ragMode` (forma e padrão nos forks M1 e M2).
   - Fora do modo RAG (sem `documentIds`), o campo é ignorado (fork M6).
   - **Prova:** sem o campo, o turno cai no padrão; com valor fora do enum, 400.
15b. **Modo descritivo.**
   - Os trechos vão ao modelo numerados (`[1]`…`[n]`), ainda delimitados como dado não confiável (item 17).
   - O prompt manda citar o número do trecho em cada afirmação.
   - A resposta ganha `citations[]`, que liga cada marcador ao `chunkId`.
   - Marcador que não corresponde a um trecho entregue ao modelo é descartado, nunca inventado (fork M4).
   - **Prova:** com um modelo falso que responde "x [2] y [9]" sobre 3 trechos, `citations` traz só o `[2]`,
     com o `chunkId` do 2º trecho.
15c. **Modo rápido.**
   - Mesmo pipeline de busca e o prompt de hoje, sem numeração e sem `citations`.
   - `sourceDocuments` segue o fork M3.
   - **Prova:** a resposta não tem `citations` e o prompt enviado não tem marcadores.
15d. **Dados técnicos do acerto** (o que o hover mostra; a lista sai do fork M5).
   - Saem do servidor em cada item de `sourceDocuments`; o front só exibe.
   - **Prova:** snapshot do DTO com os campos novos; nenhum campo carrega `userId` de outro usuário nem texto
     além do trecho.
15e. **Persistência no histórico** (fork M7). Se a resposta for "persiste", grava as citações e os dados técnicos
   com a mensagem do ASSISTANT, para o chat reaberto mostrar o mesmo. **Prova:** reabrir a instância devolve as
   mesmas `citations`.

Gates que o diff aciona (BRIEF §1, "Gates de todo PR"):
- snapshot de shape dos DTOs (`ChatDto.ts`);
- `.gen.ts` do front;
- `openapi.json` de `POST /chat`;
- migração, se M7 = persiste, com prólogo defensivo.

## 2. Contratos (esboço)

```ts
// ChatDto.ts — pedido
export const RagModeSchema = z.enum(['DESCRITIVO', 'RAPIDO']);
// em ChatRequestSchema:
ragMode: RagModeSchema.optional(), // padrão no service (fork M2); fora do modo RAG, ignorado (fork M6)

// ChatDto.ts — resposta (acréscimos)
citations: z.array(z.object({
  marker: z.number().int().min(1),   // o [n] que aparece em `answer`
  chunkId: z.string(),               // aponta para um item de sourceDocuments
})).optional(),                      // só no DESCRITIVO
// em cada sourceDocuments[i], os dados técnicos (fork M5, recomendação):
technical: z.object({
  chunkId: z.string(),
  documentId: z.string(),
  fileName: z.string(),
  chunkIndex: z.number().int(),
  score: z.number(),                 // 1 - distância de cosseno, como hoje
  embeddingStamp: z.string(),        // ex.: "openai:text-embedding-3-small@768"
}).strict().optional(),
// no topo da resposta (fork M5): answerModel: z.string().optional()
```

```prisma
// só se M7 = persiste
model ChatMessage {
  // …
  ragDetail Json? // { mode, citations[], sources[].technical } — NULL fora do modo RAG ou antes desta emenda
}
```

## 3. Forks — RATIFICAÇÃO PENDENTE

| ID | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| F-RAG-M1 | Onde o modo é escolhido? | (a) campo `ragMode` em cada pedido; (b) preferência salva no usuário ou na instância do chat; (c) só no front: o servidor manda tudo e a tela esconde | **(a)**. O modo muda o prompt (citar ou não), então o servidor precisa saber. A preferência salva pode ser do front (lembrar o último valor) sem schema novo. Com (c), o rápido pagaria o prompt do descritivo |
| F-RAG-M2 | Modo padrão quando o pedido não diz | (a) RÁPIDO; (b) DESCRITIVO | **(a) RÁPIDO**. É o comportamento de hoje, então cliente antigo não muda, e a resposta é mais curta |
| F-RAG-M3 | O rápido devolve `sourceDocuments`? | (a) sim, a tela não mostra; (b) não, devolve `[]` | **(a)**. A busca já foi feita, devolver não custa nada e mantém a prova do item 15 ("`sourceDocuments` igual"). "Só dá a resposta" vale para a tela |
| F-RAG-M4 | Como o descritivo cita a fonte? | (a) marcadores `[n]` no texto, mapeados no servidor para `chunkId`, com o marcador inválido descartado; (b) saída estruturada (JSON) do modelo com frases e fontes; (c) só a lista de fontes no fim, sem ligar frase a trecho | **(a)**. Funciona com qualquer provedor e não depende de modo JSON, porque o modelo vem da credencial do usuário (TEAMMATES PR-1). O servidor valida o marcador, então o modelo não inventa fonte. (c) não atende "cita fonte" por afirmação |
| F-RAG-M5 | O que o hover mostra ("dados técnicos")? | (a) `chunkId`, `documentId`, arquivo, índice do trecho, score, carimbo do embedding e modelo da resposta; (b) (a) + tokens do turno (I11); (c) só `chunkId` e score | **(a)**. Explica de onde veio cada trecho e com que índice foi achado. Os tokens já ficam no uso do turno (I11) e não dizem respeito a um trecho só. `userId` sai do payload: é sempre o próprio usuário e não informa nada |
| F-RAG-M6 | O descritivo vale também para a ferramenta `search_documents` do modo agente? | (a) não, só no modo RAG com seleção; (b) sim, o agente também numera e cita | **(a)** nesta emenda. O agente combina várias ferramentas numa resposta e o mapeamento de marcadores ali é outro problema. Fica em "Achados fora de escopo" |
| F-RAG-M7 | As citações e os dados técnicos ficam no histórico? | (a) sim, coluna `ChatMessage.ragDetail Json?` (migração no PR do item 15); (b) não: só a resposta ao vivo tem citações, o chat reaberto mostra só o texto | **(a)**. Sem isso, os `[n]` do texto salvo perdem a referência ao reabrir e viram ruído. Custo: uma coluna anulável |

## 4. Pendente de validação externa

Nenhum. A emenda não depende de regra contábil, fiscal ou legal.

## 5. Insumos ausentes

- **Desenho do hover.** É nó de frontend (FE-INCR), vizinho deste BE. O BRIEF entrega os dados; como a tela os
  mostra, inclusive o seletor dos dois modos, fica para o FE.
- **Eval de citação.** Não há medida de quanto o modelo real respeita os marcadores. A prova do 15b usa modelo
  falso. Medir com o modelo real é do runbook de tela.

## 6. Achados fora de escopo (registrados, não planejados)

- Modo descritivo na ferramenta `search_documents` do agente (se o dono escolher M6 = b, vira item novo).
- Componente do chat no `my-app` que exiba `sourceDocuments`: hoje nenhum lê o campo.
- `ChatRequestSchema` não é `.strict()`. Deixar estrito é mudança de contrato à parte, que o item 15 não pede.

## 7. Ordem

O item 15 com 15a–15e entra no RAG-PR-B (#1126) depois da ratificação, ou num PR próprio empilhado sobre ele,
se o #1126 já tiver ido ao lote. O nó FE do hover depende deste.
