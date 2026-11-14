# Testes: o que cada um prova e o que rodar

Guia de uso diário, para o dono e para qualquer sessão de agente. Responde duas perguntas: **que tipo de teste prova
o quê** (§1) e **mudei X, rodo o quê** (§2). O porquê de cada escolha, com números e fontes, está em
`PESQUISA-TESTES-2026-11-04.md`. O que existe e o que falta, por runbook e por área, está em
`INVENTARIO-TESTES-RUNBOOKS-2026-11-04.md` (PR NightMarketz/luminaristest#1065). O detalhe técnico do backend fica em
`server/TESTING.md`.

## 1. Que tipo de teste prova o quê

| Tipo | Prova | Não prova | Onde |
|---|---|---|---|
| **Unit** (server) | a regra: cálculo, validação, policy, DTO, máquina de estados | que a regra está ligada à rota, ao banco e à transação | `**/__tests__/*.test.ts` / `*.spec.ts` |
| **Integração** (server) | a ligação: rota → serviço → repositório real → SQLite; status HTTP, transação, constraint, erro tipado | a tela | `*.integration.test.ts` |
| **Front** (vitest) | componente/hook renderiza e reage; payload tipado pelo contrato `.gen.ts` | o backend de verdade (o `fetch` é stub) | `my-app/**/__tests__` |
| **Tela** (`scripts/runbook-tela.mjs`) | a ligação da tela com a API real, num build de produção, com print + texto + Network | a regra (já provada embaixo) | roteiro JSON + `docs/accounting/runbook-evidence/` |
| **Runbook** | só o que precisa de oráculo externo ou de decisão do dono (PVA, SEFAZ, portal, contador, LLM real, deploy, dado real) | nada que a máquina consiga provar | `docs/accounting/RUNBOOK-*.md` |
| **Gates estáticos** | tipos, fronteira de camada, lint, shape de DTO, wiring de rota/i18n, vault | comportamento | CI (`tsc`, `check:arch`, `lint:gate`, `dtoShapeSnapshot`, `skill-audit`…) |

**Regras que valem para todos:**

1. **Cada coisa se prova uma vez, na camada mais barata que a enxerga.** A regra vai em unit; a ligação, em
   integração; a tela, no runner. Se um teste de integração repete o caso de um unit (mesmos valores, mesmo
   resultado), ele deve testar só o que o unit não vê: status, persistência, transação.
2. **"Existe teste" não é "o teste cobre o caso".** Leia a asserção **e o estado montado**. O bug IMO-1 (400 em vez
   de 409) passou por um teste de concorrência que existia, porque o bem do teste estava pendente e o do caso real
   estava ativo. O estado do teste tem de ser o estado em que o bug mora.
3. **Toda regra testa também o ramo de erro**, uma falta por vez, com mensagem que nomeia o dado (nunca id interno).
4. **Pré-condição tem dono:** ou um seed de cenário (comando) ou o dono do produto (escrito no runbook). "O banco
   precisa estar assim" sem dizer quem o põe assim é lacuna.
5. **Runbook não prova regra.** Passo de runbook que a máquina consegue provar vira teste (régua EXT/DEC · OPS · AUTO
   do inventário). O runbook cita o teste e fica só com o oráculo; a saída do oráculo (XML real, protocolo) vira
   fixture versionada.

## 2. Mudei X, rodo o quê

Local é **sempre com escopo** (dono, 03/11): a suíte inteira só roda no CI ou com `FULL_SUITE=1`
(`scripts/test-scope-guard.cjs`). Não repita um gate sem ter editado o código que ele cobre. Jest de integração,
`next build` e o runner de tela pegam vaga de trabalho pesado (`node scripts/heavy-slot.cjs status` mostra quem está
usando). A vaga só é dada com pelo menos 6 GB de memória virtual livre (`LUMINARIS_HEAVY_MIN_FREE_GB`; dono, 07/11:
o PC travava na sabotagem do revisor, e o Windows registrou memória virtual insuficiente com RAM física sobrando).

| Mudei… | Rodo localmente | Fica para o CI |
|---|---|---|
| só `.md` | nada | o CI pula testes e build (job `changes`) |
| regra pura do server (cálculo, DTO, policy) | `npx jest <pasta-ou-arquivo> --selectProjects unit` (caminho **antes** do `--selectProjects`) ou `cd server && npm run test:changed` | integração |
| serviço com repositório, rota, controller, transação | o(s) `*.integration.test.ts` do domínio, um por vez: `npx jest <arquivo> --selectProjects integration --runInBand` | o resto da integração |
| `schema.prisma` ou migração | `cd server && npm run smoke:migration` + o teste de integração da migração | tudo |
| DTO do server | o teste do DTO + `UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot` e commite o JSON + os `.gen.ts` | — |
| componente ou hook do front | `cd my-app && npx vitest run <pasta>` ou `npm run test:changed` | suíte inteira |
| data/fuso no front | o mesmo; o `vitest.config.ts` fixa `TZ=America/Sao_Paulo` em toda execução, local e CI (PR NightMarketz/luminaristest#1070) | — |
| tipos do front | `cd my-app && npx tsc --noEmit` e `npm run test:types` | build |
| `scripts/*.mjs` / `*.cjs` da raiz | `node --test scripts/<nome>.test.mjs` | **ninguém roda hoje** (pesquisa §6.2) |
| `.claude/skills/**` | `node .claude/skills/skill-audit/skill-audit.mjs run` (0 findings) | o mesmo |
| tela atrás de `withAuth` | `node scripts/runbook-tela.mjs <roteiro.json>` contra **build de produção** em `127.0.0.1` | — |
| caso só verificável por oráculo externo | o runbook, só os passos EXT/DEC | — |

**Quem roda o quê numa entrega de agente:** a sessão roda os comandos com escopo enquanto desenvolve; a passada que
vale como prova é a do CI do PR (o `prova-runner` e o bloco PROVA foram aposentados em 2026-11-10,
`docs/plano/decisoes/D-2026-11-10-METODO-FABLE-5-2.md`). Repetir localmente a confirmação que o CI já dá é repetição.

## 3. Mutação (só quando vale)

Stryker roda fora do CI. `cd server && npm run test:mutation` muta só as linhas alteradas contra `origin/main`; vale ao
fechar um nó de domínio crítico (contabilidade, fiscal, parâmetros legais), não a cada PR. A rodada inteira
(`test:mutation:slices`, ~40 h em fatias) é para quando o dono pedir.

## 4. O que está proposto e ainda não existe

Lista em `PESQUISA-TESTES-2026-11-04.md` §9 e no inventário §7. Nenhum item é regra até ser ratificado. Os principais:
seed de cenário por runbook em banco descartável; emenda "quem põe de pé" no `RUNBOOK-FORMAT`; `test:affected` de
integração por domínio; vitest em job paralelo no CI; testes de `scripts/` no CI; LLM falso para o wizard; e2e.
