---
name: sessao-feature
description: Sessão de IMPLEMENTAÇÃO de feature especificada — executa um BRIEF/spec existente comportamento a comportamento, materializando os contratos em Zod antes da lógica. Exige spec escrita e forks já ratificados. Triggers "implementa o incremento", "executa o brief", "sessão de feature", "constrói o que a spec pede", "implementa BE-INCR-X".
argument-hint: "[documento e seção da spec + onde está a autorização]"
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
metadata:
  governance-skill-id: "SKL-SESS-FEAT"
  governance-version: "1.0.0"
  governance-status: "validated"
  governance-owner: "engineering"
---

# Sessão de feature — a spec é o limite superior E inferior

Não implemente menos ("deixei preparado pra depois") nem mais ("aproveitei e já fiz"). Toda ambiguidade
da spec é **lacuna de spec**: registra e pausa, nunca escolhe.

## Roteamento — quando NÃO é esta sessão

| Situação | Sessão correta |
|---|---|
| Não existe spec com comportamentos listados | `sessao-planejamento` |
| Existem forks `RATIFICAÇÃO PENDENTE` na spec | **Nenhuma** — o dono ratifica primeiro |
| É defeito em comportamento que já deveria funcionar | `sessao-instrumentacao` → `sessao-correcao` |
| O contrato de entrada de um nó vizinho é insuficiente | **Nenhuma** — regra 3: é lacuna de spec, não conserto no vizinho |
| Rebase/merge de branch já implementada | **Nenhuma das quatro** — sessão de integração, ainda sem template |

---

## O formulário — preencher ANTES de executar

> Pré-requisito: este prompt só é preenchível para feature que já tem
> spec escrita e contratos de entrada/saída identificáveis em artefato
> real. Sem spec, a sessão correta é a de PLANEJAMENTO, não esta.

### Contexto fixo (não rediscutir)
> Regra de preenchimento: todo campo abaixo deve conter conteúdo real do
> repositório. Campo que não se aplica ao repo deve ser APAGADO antes de
> abrir a sessão — placeholder ou exemplo deixado no formulário conta como
> decisão não coberta e dispara pausa imediata (regra 2).

- Feature: [nome e referência à spec — documento e seção exatos]
- Autorização: [referência à decisão do dono que priorizou esta feature —
  documento/linha + data]
- Nó do grafo: [qual sub-módulo é, quais nós consome, quais o consomem]
- Contratos de entrada: [o que este nó RECEBE dos nós anteriores —
  colar o schema ou referenciar o artefato exato, não descrever de
  memória]
- Contratos de saída: [o que este nó PROMETE aos nós seguintes — idem]

### Definição de pronto (única)
Todos os comportamentos listados na spec referenciada estão
implementados, cada um com teste que o exercita, e os contratos de
entrada e saída estão validados por schema materializado (não só por
suposição no código). Nada além da spec.

### Regras de escopo — invioláveis
1. A spec é o limite superior E inferior: não implemente menos ("deixei
   preparado pra depois") nem mais ("aproveitei e já fiz"). Preparação
   pra feature futura só se a spec pedir explicitamente.
2. Toda lacuna da spec — caso não coberto, decisão de formato não
   especificada, comportamento ambíguo — deve ser registrada numa seção
   "Lacunas de spec" e a execução PAUSADA nesse ponto. Nunca escolha um
   caminho por conta própria, mesmo que pareça rotineiro ou de baixo
   risco. Se houver partes independentes da lacuna, continue apenas
   nelas e liste o que ficou bloqueado.
3. Não modifique nós vizinhos. Se o contrato de entrada recebido for
   insuficiente pra feature (falta campo, falta garantia), isso é lacuna
   de spec — registre e pause; não "resolva" mudando o outro módulo.
4. Regra de domínio: qualquer regra contábil, fiscal ou legal
   implementada deve citar o artefato de origem (trecho da spec,
   documento, decisão registrada do dono). Regra sem artefato citável
   não é implementada — entra em "Lacunas de spec" como pendente de
   validação externa.
5. Não adicione verificação além dos testes que a spec pede. Você já
   verifica seu próprio trabalho por padrão.

### Sequência obrigatória
1. Leia a spec e os contratos. Produza a lista de comportamentos a
   implementar (checklist numerado) ANTES de escrever código, e as
   lacunas de spec já visíveis. Se houver lacuna bloqueante nesta fase,
   PARE aqui — é mais barato agora.
2. Materialize os contratos de entrada/saída como schema (Zod) com teste
   de contrato, ANTES da lógica interna.
3. Implemente comportamento por comportamento, marcando o checklist,
   cada um com seu teste.
4. Rode a suíte completa do nó + testes de contrato.
5. Relatório final: checklist com status por item, diff resumido, seção
   "Lacunas de spec" (mesmo vazia) e seção "Achados fora de escopo"
   (mesmo vazia).

---

## Notas de operação neste repo (aditivas — não alteram as regras acima)

**Padrão de camada é requisito, não over-engineering.** A cadeia `Route → Controller → Service →
Repository → Prisma` (+ Policy), injeção via Factory, DTO Zod `.strict()` e soft-delete são exigência do
Contrato §2/§3. Não inline uma policy, não pule um DTO, não corte o factory "pra ser enxuto" — o
minimalismo perde para o contrato quando os dois divergem.

**Fronteira dura (Contrato §2.1):** entidade com invariante financeiro/legal é **Prisma first-class**,
nunca DynamicTable; nunca injete serviço Prisma em `DynamicTableService`/`RuleContext`/`RulePlugin`.
Integração cross-módulo sobe a controller/rota.

**Reuse antes de recriar.** Consulte o codebase-memory para localizar o canônico (`search_graph`,
`semantic_query`) e **confirme lendo o arquivo** (CBM-001). Bespoke só com divergência sancionada pelo
critério de reuso, justificada no relatório.

**Comandos de gate no passo 4:**

```bash
cd server && npx tsc --noEmit && npm run test:integration
```

Nunca `npx jest --selectProjects integration` cru (29/41 suítes colidem no mesmo SQLite). `cd my-app &&
npx tsc --noEmit` fecha o outro lado. Se tocar rota/DTO documentado: `npm run docs:generate`.

**Worktree novo:** `npm ci` + `.env` com `OPENAI_API_KEY=ci-dummy-openai-key`.

**Gates que o diff aciona — leia junto com a regra 5.** Eles não são verificação adicional; são
consequência mecânica da mudança, e o CI cobra:

| Se a feature toca… | O gate que acende |
|---|---|
| Qualquer DTO Zod | Snapshot de shape comitado dos DTOs |
| Emissão de eventType novo | Allowlist do `auditCanonical.ts`, **na mesma mudança** |
| Rota nova ou alterada | Guard de path-count do openapi (`npm run docs:generate`) |
| String de UI | Paridade i18n pt/en |
| Migração em tabela com dado | `npm run smoke:migration` sobre cópia do `dev.db` real (`server/prisma/prisma/dev.db`) |

Se a spec não listar o gate que a mudança aciona, isso é **lacuna de spec** (regra 2) — não improvise
nem ignore.

**Review independente não é opcional:** PASS emitido pela mesma sequência que implementou é rejeitado;
delegue a agente isolado.
