---
name: sessao-planejamento
description: Sessão de PLANEJAMENTO — produz o BRIEF (checklist numerado + contratos esboçados + forks pendentes) que a sessão de feature exige. Nunca escreve código, nunca ratifica fork. Use quando um item autorizado ainda não tem spec. Triggers "planeja o incremento X", "escreve o brief", "sessão de planejamento", "abre a spec de", "preciso do BRIEF antes de implementar".
argument-hint: "[item a planejar + onde está a autorização do dono]"
allowed-tools: Read, Grep, Glob, Write, Bash
metadata:
  governance-skill-id: "SKL-SESS-PLAN"
  governance-version: "1.0.0"
  governance-status: "validated"
  governance-owner: "engineering"
---

# Sessão de planejamento — a única da cadeia que produz decisão, não código

As travas desta sessão são sobre **autoridade**, não sobre diff. Ela existe para transformar um item
autorizado num BRIEF que a `sessao-feature` consegue executar sem inventar nada.

## Roteamento — quando NÃO é esta sessão

| Situação | Sessão correta |
|---|---|
| Já existe spec/BRIEF com comportamentos listados | `sessao-feature` |
| A lacuna está no GAP-MAP e falta o teste que falha | `sessao-instrumentacao` |
| Existe teste-guarda vermelho reproduzindo a lacuna | `sessao-correcao` |
| **Não há autorização citável do dono** | **Nenhuma — recuse o preenchimento** (ORCH-006) |
| Gate humano (PVA, sign-off de browser, deploy) ou dado externo (XML de NF-e, arquivo RFB) | **Nenhuma** — é runbook humano; agente não substitui oráculo |
| Rebase/merge de branch pronta (ex.: `claude/nfe-fase-a`) | **Nenhuma das quatro** — é sessão de integração, ainda sem template |

## Onde achar os campos do formulário

- **Autorização:** `docs/accounting/ACCOUNTING-MASTER-MAP.md` §5.1 (fila ratificada) ou `docs/adr/`.
  Re-fetch `origin/main` antes de citar — a fila muda, e já houve near-miss de planejar sobre `main` stale.
- **Insumos:** ADR do item, BRIEFs irmãos em `docs/accounting/`, e o código que o item toca.
- **Nós vizinhos:** use o codebase-memory para localizar (`search_graph`, `trace_path`) e **confirme lendo
  o arquivo** — CBM-001: nenhuma conclusão comportamental se sustenta só no grafo.

---

## O formulário — preencher ANTES de executar

> Pré-requisito: este prompt só é preenchível para item que já tem
> autorização citável do dono (ADR, ratificação em master map, decisão
> datada). Frente nova NUNCA nasce de iniciativa do agente — nasce de
> ADR + sinal humano (ORCH-006). Sem autorização citável, a resposta
> correta é recusar o preenchimento, não planejar "provisoriamente".

### Contexto fixo (não rediscutir)
> Regra de preenchimento: todo campo abaixo deve conter conteúdo real do
> repositório. Campo que não se aplica deve ser APAGADO antes de abrir a
> sessão — placeholder ou exemplo deixado no formulário conta como
> decisão não coberta e dispara pausa imediata (regra 4).

- Item a planejar: [nome + referência ao plano/onda — documento e linha]
- Autorização: [citação exata da decisão do dono que abriu esta frente —
  documento, seção, data]
- Insumos existentes: [specs parciais, ADRs, código já implementado que
  o plano deve respeitar como fato consumado — listar artefatos, não
  descrever de memória]
- Nós vizinhos no grafo: [o que este item consome e o que o consome —
  com referência aos contratos existentes desses nós, se houver]

### Definição de pronto (única)
Um documento BRIEF contendo: (1) checklist numerado de comportamentos
implementáveis, cada um testável individualmente; (2) contratos de
entrada e saída em forma materializável (schema esboçado, não prosa);
(3) lista de forks — toda decisão com mais de um caminho razoável —
cada um com os caminhos descritos, uma recomendação com justificativa,
e status RATIFICAÇÃO PENDENTE. Nenhum fork se auto-ratifica: o BRIEF
está pronto quando os forks estão LISTADOS, não quando estão decididos.
Decisão é do dono, fora desta sessão.

### Regras de escopo — invioláveis
1. Esta sessão NÃO escreve código de aplicação, NÃO cria branch, NÃO
   edita spec existente de outro item. Saída é um documento novo, nada
   mais.
2. Moratória: planejar item já autorizado é permitido; abrir rodada de
   descoberta não. Se o planejamento revelar que falta informação que
   exigiria varrer o repo além dos insumos listados, registre como
   "Insumo ausente" no BRIEF e pause esse trecho — não saia varrendo.
3. Regra de domínio: comportamento que dependa de regra contábil,
   fiscal ou legal só entra no checklist com artefato de origem citado.
   Sem artefato, entra na seção "Pendente de validação externa" do
   BRIEF — nunca no checklist como se fosse decidido.
4. Qualquer decisão não coberta por este documento deve ser registrada
   e a execução pausada nesse ponto. Em planejamento, a forma correta
   de pausar é registrar o fork com recomendação — não escolher.
5. Não dimensione além do item autorizado: se durante o planejamento
   aparecer frente adjacente que "valeria a pena", registre em "Achados
   fora de escopo" e não planeje. Frente nova exige nova autorização
   (ORCH-006).

### Sequência obrigatória
1. Cite a autorização e confirme que ela cobre exatamente o item a
   planejar. Se cobrir mais ou menos que o item, PARE e reporte a
   divergência.
2. Leia os insumos listados. Produza o esqueleto do BRIEF: lista de
   comportamentos candidatos, ainda sem detalhe.
3. Para cada comportamento: detalhe, contrato tocado, e classificação —
   direto (sem fork) ou fork (caminhos + recomendação + PENDENTE).
4. Esboce os contratos de entrada/saída em forma de schema.
5. BRIEF final com as seções: checklist numerado, contratos, forks
   pendentes de ratificação, pendências de validação externa, insumos
   ausentes, achados fora de escopo (mesmo vazias).

---

## Notas de operação neste repo (aditivas — não alteram as regras acima)

- **Saída padrão:** `docs/accounting/<NOME-DO-INCREMENTO>-brief.md`, espelhando os BRIEFs existentes
  (`BE-INCR-NFE-impl-plan.md` é o exemplar mais completo — inclui a seção de forks com ratificação).
- **Escopo do BRIEF = backend por padrão.** A casa separa `BE-INCR-*` de `FE-INCR-*` em incrementos
  distintos; empacotar os dois colide com a regra 3 (o FE é nó vizinho).
- **Gates que o diff aciona** e por isso pertencem ao checklist, não à improvisação do implementador:
  snapshot de shape dos DTOs Zod, paridade i18n pt/en, allowlist do `auditCanonical.ts` (todo eventType
  novo entra na mesma mudança) e o guard de path-count do openapi.
- **Padrão de camada é requisito, não over-engineering:** a cadeia `Route → Controller → Service →
  Repository → Prisma` (+ Policy), Factory, DTO Zod `.strict()` e soft-delete entram no checklist mesmo
  quando o item parece pequeno (Contrato §2/§3).

## Pendências de ratificação do próprio template

Registradas, **não aplicadas** — o texto acima segue valendo como está até o dono decidir:

1. **Regra 2 × leitura de código.** Ela manda pausar ao precisar olhar além dos insumos listados. O BRIEF
   da NF-e registra que foi exatamente a leitura do código além do ADR que expôs os dois furos de design
   (F-NFE7 nota multi-item, F-NFE8 `saleId` ausente) que teriam travado a implementação no primeiro XML
   real. Proposta: estreitar para *"descoberta de lacuna fora do item"*, deixando explícito que ler o
   código tocado é insumo, não varredura.
2. **Regra 1 órfã o BRIEF.** "Saída é um documento novo, nada mais" impede registrar o BRIEF na fila do
   master map — o artefato nasce sem quem aponte para ele. Proposta: permitir a linha de índice, ou
   aceitar um fold posterior.
3. **"Decisão é do dono, fora desta sessão"** é mais estrito que a prática registrada: os forks da NF-e e
   do INCR-DIM foram ratificados **dentro** da sessão, fork-a-fork, com o dono respondendo na hora.
