# Mapa de Lacunas × Instrumentos — versão medida

- **Status:** ativo como referência; a **coluna Status é derivada de comando**, nunca escrita à mão.
- **Origem:** o dono trouxe um mapa em 2026-08-11; testado contra o repositório na mesma data, **5 de 6
  células [COBERTO] do original eram falsas** (fast-check, Stryker, Toxiproxy, Playwright não instalados;
  "Bancada AV" removida em `b617d8f1`). Esta versão substitui a original, com cada status acompanhado do
  comando que o prova. Diagnóstico-mãe: `docs/operating-manual/ORACLE-DEFICIT.md`.
- **Regra nº 1 deste documento (aprendida do próprio teste):** célula de status sem comando ao lado é
  opinião, e opinião com cara de medida é a classe de defeito que o `lint-layer-gate.md` já teve (declarava
  5 supressões, existiam 3). Ao editar, rode o comando; se não há comando, o status é `[?]`.

Convenção: **[COBERTO]** instrumento existe e é exercido · **[PARCIAL]** cobre parte · **[PAPEL]**
declarado, sem executável · **[ABERTO]** sem instrumento · **[ORÁCULO]** só validador externo alcança.

---

## Nível 1 — Local (dentro de uma função)

| Lacuna | Instrumento real | Status | Comando que prova |
|---|---|---|---|
| Tratamento de erro incompleto | **Jest** (server, 133 suítes/1590 unit) · **Vitest** (my-app, 29 arq/137) — o original atribuía tudo a Vitest; as invariantes de dinheiro vivem no lado **Jest** | [COBERTO] | `grep '"test"' server/package.json my-app/package.json` |
| Borda de entrada | **DTO Zod `.strict()`** na fronteira + testes de rejeição por DTO (12 de 21 DTOs de accounting com teste próprio). ~~fast-check~~ **não é dependência** — só transitiva de `effect`, zero uso | [PARCIAL] | `grep '"fast-check"' server/package.json my-app/package.json` → vazio; `grep -rE "fc\.(assert\|property)" server/src my-app` → 0 |
| Aritmética / off-by-one monetário | Invariantes explícitas em teste (Σdébito=Σcrédito, centavos int, `MAX_CENTS`) + **mutação MANUAL com `.bak`** — ~~Stryker~~ não instalado. Ressalva OPS-003: mordida prova *observação*, não *captura* | [PARCIAL] | `grep -i stryker server/package.json my-app/package.json` → vazio |

## Nível 2 — Intra-módulo

| Lacuna | Instrumento real | Status | Comando que prova |
|---|---|---|---|
| Código morto / desconectado | ~~Bancada AV~~ (removida `b617d8f1`). Resta: **cbm** (grafo, com ressalva CBM-001 — in-degree subreporta frontend) + **`skill-audit wiring`** (rota/KPI/preset órfãos) | [PARCIAL] | `node .claude/skills/skill-audit/skill-audit.mjs wiring` |
| Invariante quebrada | testes de invariante escritos à mão (sem property-based) | [PARCIAL] | idem fast-check acima |
| Estado inconsistente entre funções | — | [ABERTO] | — |

## Nível 3 — Fronteira (contrato entre nós)

| Lacuna | Instrumento real | Status | Comando que prova |
|---|---|---|---|
| Contrato implícito | Zod valida formato em runtime — só o contrato escrito | [PARCIAL] | `grep -rc "safeParse" server/src/controllers/` |
| Evolução assimétrica (B muda schema, A lê o antigo) | **snapshot de shape Zod dos DTOs** (Fase 4 deste plano; teste jest, snapshot comitado, diff obrigatório no PR). Limite: só server-side — o espelho FE é tipo TS à mão, comparar exige codegen (resíduo declarado) | [ABERTO] → [PARCIAL] após F4 | `ls server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot*` |
| Idempotência sob redelivery | testes de chave de idempotência existem por write-path (classe varrida — memória `idempotency-class-fix-discipline`); redelivery *forçado* na fronteira, não | [PARCIAL] | `grep -rln "P2002" server/src --include=*.test.ts` |

## Nível 4 — Runtime sistêmico

| Lacuna | Instrumento real | Status | Comando que prova |
|---|---|---|---|
| Corrida de concorrência | Harness real existe para o razão: `PostingRepository.concurrency.test.ts` (50 escritores, `Promise.all`, SQLite WAL serializa). **Agendamentos (`noOverlap`) descobertos**: scan read-then-write sem constraint (`DynamicTableService.ts:1094-1120`), TOCTOU aberto, zero teste concorrente → Fase 3 deste plano o expõe como `it.failing` | [PARCIAL] | `grep -rln "Promise.all" server/src --include=*concurrency*.test.ts` |
| Redelivery / rajada / fora de ordem | — (não há canal assíncrono exercido; scheduler é in-process) | [ABERTO] | — |
| Rede degradada | ~~Toxiproxy~~ **não existe no repo** | [ABERTO] | `grep -ri toxiproxy . --include=package.json` → 0 |
| Transação parcial | Parcial via harness de integração: mutações M3 (perna fora da tx trava contra o lock) provaram atomicidade em sites específicos; kill-no-meio sistemático, não | [PARCIAL] | `grep -ln "runTransaction" server/src/features/accounting/services/__tests__/*.integration.test.ts` |
| Caminho feliz ponta a ponta | ~~Playwright~~ **não instalado**; não há `e2e/`. O que existe: **supertest** (HTTP real, 3 arquivos de controller de accounting) + a varredura de browser de 2026-07-23 foi **sessão de agente, não instrumento** (achou os 2 bugs do §5.2) | [PARCIAL] | `ls playwright.config.* e2e/ 2>/dev/null` → vazio; `grep -l supertest server/package.json` |
| Migração / integridade de dado | smoke-migration-gate: **13 relatórios manuais, zero script** → Fase 2 deste plano escreve `scripts/smoke-migration-gate.mjs` (roda contra cópia do dev.db real; não entra no CI — o dado real não existe lá) | [PAPEL] → [COBERTO] após F2 | `ls docs/accounting/SMOKE-MIGRATION-GATE-*.md \| wc -l` → 13; `ls scripts/smoke*` |

## Nível 5 — Domínio (código correto, factualmente errado)

| Lacuna | Instrumento real | Status | Comando que prova |
|---|---|---|---|
| Regra plausível mas errada | **Oráculo externo** (PVA/contador — Bloco A itens 3/6, **nunca rodados**, abertos >14 dias) | [ORÁCULO] | `ACCOUNTING-MASTER-MAP.md` §Bloco A |
| Compliance (LGPD, fiscal, retenção) | Oráculo externo | [ORÁCULO] | idem |
| Detector de "regra sem lastro" (censo AV) | **SUSPENSO** — é rodada de auditoria; a regra permanente do `CLAUDE.md` veda aparato novo enquanto houver oráculo do Bloco A aberto >14 dias (hoje 4/4) | [SUSPENSO] | `CLAUDE.md` §⛔ |

## Nível O — Omissão (linha que faltava no original)

> **A classe mais cara não tem onde o código está errado — é onde não há código.** O BUG-1 do
> `ACCOUNTING-MASTER-MAP.md §5.2` (13 eventTypes **faltando** na allowlist → 500+rollback em três
> increments) não cabia em célula nenhuma do mapa original. E não é raro: **17% das faltas reais não
> acoplam a mutante nenhum** (Just et al., FSE 2014), dominadas por algoritmo trocado e código ausente.

| Lacuna | Instrumento real | Status | Comando que prova |
|---|---|---|---|
| Emitido sem par declarado (allowlist, registro, mapa) | **Teste de classe**: varre a fonte e cruza emitido-vs-declarado. Exemplar: `auditAllowlistCoverage.test.ts` (pegou 2 casos que o grep manual perdeu). Segundo exemplar: guard de path-count do openapi | [PARCIAL] — o padrão existe, cada nova superfície emitido/declarado precisa do seu | `ls server/src/features/accounting/audit/__tests__/auditAllowlistCoverage.test.ts` |
| Checagem exigida por invariante e nunca escrita | sem instrumento genérico (é o limite estrutural — mutação não gera mutante do que não existe) | [ABERTO] | — |

## Transversais

| Lacuna | Instrumento real | Status | Comando que prova |
|---|---|---|---|
| Segurança | deny-by-default no auth (RISK-SEC-AUTH-001) + `lib/uploadSecurity` + testes de permissão; ~~semgrep~~ ausente | [PARCIAL] | `grep -i semgrep server/package.json` → vazio |
| Camada / arquitetura | **lint-layer-gate** (`my-app/eslint.gate.config.mjs`, `npm run lint:gate` no CI) + zinc-guard diff-scoped — **instrumentos que o mapa original nem listava** | [PARCIAL] (confinamento prisma/apiClient; não cobre tudo do Contrato §2) | `grep -n "lint:gate" .github/workflows/ci.yml` |
| Configuração de implantação | `dockerCompose.qdrant.test.ts` + `nextPublicEnvWiring.test.ts` — nasceram da triagem R1-R3; antes deles, **nenhum arquivo do repo lia o compose** | [PARCIAL] | `ls server/src/config/__tests__/dockerCompose.qdrant.test.ts` |
| Observabilidade / falha silenciosa | logger JSON estruturado (133 `logger.error` em 47 arquivos não-teste — o 134/48 contava 1 teste) + **sink de arquivo NDJSON** (`server/logs/errors-YYYY-MM-DD.ndjson`, error+warn, retenção 14d), lido por `npm run logs:errors`. **Agrega, não alerta**; `Metrics` continua logger disfarçado | [ABERTO] → [PARCIAL] | `cd server && npm run logs:errors` |

---

## Backtest de completude — o corpus real contra as células

Método: os defeitos de produto **reais** deste repositório (2 do §5.2, 8 triados pela bancada —
recuperáveis via `git show b617d8f1:docs/audit/TRIAGEM-*.json` — e o #176), classificados nas células
desta versão do mapa. **Contaminação declarada:** o mapa conheceu estes defeitos; isto mede **ajuste
(completude)**, não predição.

| Defeito real | Célula | Cabe? |
|---|---|---|
| BUG-1 §5.2 — 13 eventTypes fora da allowlist | **Nível O** (omissão) | só depois da linha nova |
| BUG-2 §5.2 — FE descarta `costOfGoodsSold` que a API devolve | Nível 3 · evolução assimétrica | ✅ caso de manual |
| #176 — editar rascunho apaga etiquetas (read não devolvia o que o write destrói) | Nível 3 · contrato implícito read↔write | ✅ com nota |
| `analyticsdefs-sem-parse-runtime` (AV-L1) | Nível 3 · contrato implícito (fronteira HTTP sem parse) | ✅ |
| `strict-de-dto-neutralizado` (AV-R8) | Nível 3 · contrato implícito (o `.strict()` nunca vê o query inteiro) | ✅ |
| `retry-409-reenvia-versao-velha` (AV-R8) | Nível 2 · estado inconsistente (o `action` capturado sobrevive ao refetch) | ✅ |
| `lead360-dateonly-utc-shift` (AV-L1) | Nível 1 · borda de entrada (classe de 7 sites) | ✅ |
| `qdrant-publicado-sem-chave` (R1) | **Transversal · configuração de implantação** | só depois da linha nova |
| `compose-NEXT_PUBLIC-nome-divergente` (R1) | idem | idem |
| `tres-imports-sem-declaracao` (R1) | idem (manifesto) | idem |
| `documentscontroller-bypassa-factory` (AV-L1) | **Transversal · camada/arquitetura** | só depois da linha nova |

**Resultado: 5 de 11 não cabiam no mapa original** (1 omissão + 3 configuração/manifesto + 1 camada).
As três linhas novas desta versão (Nível O, config de implantação, camada) fecham os cinco. A classe
"configuração" ausente bate com a literatura: Mäntylä & Lassenius acharam **zero** defeitos de
suporte/configuração em 759 achados de revisão — é a classe que ninguém enxerga sem instrumento próprio.

**E uma correção contra a fila do mapa original:** ele apostava que nível 3 é o buraco mais valioso com
0 evidência local; o backtest dá **4 de 11 no nível 3** — a aposta é plausível, mas o corpus também dá
**4 de 11 em configuração/camada**, que o original nem listava.

## Predição pré-registrada — 2026-08-11

> **Aposta do mapa (registrada antes dos dados):** dos próximos **10** defeitos de produto reais
> encontrados neste repositório (por qualquer via — teste novo, oráculo, uso), **≥4 serão Nível 3**
> (contrato de fronteira, incluindo read↔write e FE↔BE).
>
> **Baseline no corpus retroativo:** 4 de 11.
> **Falsificador:** manter a lista dos próximos 10 nesta seção; se <4 forem nível 3, a fila de
> prioridade deste mapa está errada e o item "contrato de fronteira" desce.
>
> Registro (preencher conforme aparecem): _—_

## Fila corrigida (ordem por valor ÷ atrito, com a regra permanente aplicada)

1. ~~Script do smoke-migration-gate~~ → **Fase 2 deste plano** (13 relatórios já são a spec; lê o app).
2. ~~Harness de concorrência noOverlap~~ → **Fase 3** (`it.failing` expõe o TOCTOU; conserto é decisão à parte).
3. ~~Snapshot de shape Zod~~ → **Fase 4** (evolução assimétrica server-side; sem dep nova, sem passo de CI).
4. ~~Observabilidade (transversal)~~ → **decidido pelo dono em 2026-08-12: F1→(a)**, sink de arquivo
   NDJSON + `npm run logs:errors`. Zero dependência nova, zero dado saindo do processo, sem acionar o
   gate de LGPD. Razão de peso contra (b) Sentry: **o app nunca foi implantado** — alerta remoto compra
   uma produção que não existe, e forçaria hoje a decisão de privacidade que o Bloco A lista como
   oráculo aberto. **O que continua aberto:** agrega mas não *alerta*; alguém tem de rodar o comando.
   Se houver data de implantação, a razão contra (b) cai e ele volta à fila.
5. Censo AV / detector de regra sem lastro — **SUSPENSO** pela regra permanente até um oráculo do
   Bloco A fechar.
6. Estado inconsistente intra-módulo — menor prioridade (1 caso no corpus, já consertado no #176-adjacente).

## Uso em projeto em andamento (o processo do original, com duas emendas)

O fluxo censo → triagem → instrumentar-antes-de-corrigir → gate de módulo novo continua válido, com:

1. **"Instrumentar antes de corrigir" é regra da casa comprovada** — o teste que falha vem antes do fix
   (foi assim no #176: mordida provada nos dois elos antes do merge). Mantido.
2. **O censo está suspenso** (regra permanente do `CLAUDE.md`) e a triagem por "framework C-D" foi
   removida — o framework não existe neste repositório; a triagem aqui é decisão do dono sobre a lista,
   sem aparato novo.
3. Censo e correção em sessões separadas: mantido — é o mesmo "achado não triado não se conserta" que
   esta casa já praticava.
