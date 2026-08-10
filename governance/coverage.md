---
type: governance-coverage
phase: 1
generated-by: skill-audit governance-check
last-updated: "2026-06-24"
piloted-skills:
  - dynamic-table-preset-generator
  - backend-workflow-transition-generator
---

# Cobertura de governança — Fase 1 (pilotos)

Mapa **regra → gate → status** das skills já governadas (com `governance.md`). Adoção é
incremental — skills sem `governance.md` ainda não aparecem aqui e **não** falham o check.

> **Correção de proveniência (2026-08-10).** O cabeçalho desta página dizia "não é editado à mão:
> é a projeção que o `skill-audit governance-check` materializa a cada corrida". **Isso é falso** —
> o runner escreve `governance/coverage-auto.md` e `governance/INVENTORY.md`, nunca este arquivo
> (`grep -n "writeFileSync" skill-audit.mjs` → só essas duas saídas). Esta página é mantida à mão
> desde sempre; o `generated-by` no frontmatter é herdado, não executado. Registro, não conserto:
> reapontar a proveniência é patch de instrumento e fica para quando o Bloco A fechar.

## Matriz

| Regra | Texto (contrato) | Skill responsável | Gate | Tipo | Status |
|---|---|---|---|---|---|
| `AC-2.1-B1` | Não injetar serviço Prisma first-class no motor | backend-workflow-transition-generator | `skill-audit/G6` | executável (grep) — **declarado, nunca executado** | ⚠️ **G6 NÃO ENFORÇADO** (ver nota abaixo). Cobertura real da regra: `server/src/features/dynamicTables/__tests__/no-accounting-imports.boundary.test.ts`, que roda no job `Server – typecheck & test` |
| `AC-2.1-B2` | Não modelar invariante como linha de DynamicTable | dynamic-table-preset-generator | `luminaris-reviewer/fronteira-2.1` | design-time | ✅ coberto |
| `AC-2.1-B3` | Preset não é persistência de módulo ERP | dynamic-table-preset-generator | `luminaris-reviewer/fronteira-2.1` | design-time | ✅ coberto |
| `AC-2.1-B4` | Não editar DynamicTableService p/ integração | backend-workflow-transition-generator | `luminaris-reviewer/fronteira-2.1` | design-time | ✅ coberto |
| `AC-2.2-2` | `unique` de preset ≠ constraint de DB | dynamic-table-preset-generator | `skill-audit/P6` | design-time | ✅ coberto |
| `AC-2.2-3` | Sem self-relation provada | dynamic-table-preset-generator | `skill-audit/G5` | executável (grep) — **declarado, nunca executado** | ⚠️ **G5 NÃO ENFORÇADO** (mesmo mecanismo). Sem cobertura substituta conhecida |

### Nota — o que "executável (grep)" significa hoje (2026-08-10)

**"Executável" nunca significou executado, em nenhuma linha, desde sempre. É defeito de um *kind*
inteiro, não de duas regras.** Censo, resolvido pelo próprio runner em `governance/coverage-auto.md`
(269 mapeamentos, 34 `governance.md`):

| Tipo de gate resolvido | N | Exercido? |
|---|---|---|
| `eval:` | 262 | sim — `batch-eval` |
| `review:` | 4 | design-time (julgamento nomeado, rastreável) |
| `static:` | 1 | sim — assertion estática |
| **`command:`** | **2** | **não — 2 de 2 inertes (100% do kind)** |

Os dois são exatamente `AC-2.1-B1` (`skill-audit/G6`) e `AC-2.2-3` (`skill-audit/G5`), as duas linhas
⚠️ da Matriz. Não são duas exceções num documento saudável: são **a totalidade** da classe
"executável" deste repo. A causa é única — o `governance-check` valida a *presença da string* do
comando, não a saída dele:

```js
// skill-audit.mjs:318 — gateTargetExists()
if (gate.type === 'command') return t.trim().length > 0; // comando: presença basta no check estrutural
```

E `execSync` no runner aparece só três vezes (`skill-audit.mjs:161, 556, 833`): `git rev-parse`,
`git diff --name-only` e os scripts co-localizados (`check-registries.mjs` / `check-i18n-keys.mjs`).
Nenhuma delas roda um `gates[].command`. Consequência para a legenda abaixo: o "alvo do gate
encontrado" do ✅ significa **"a string do comando não está vazia"**, nunca "o comando rodou e
voltou vazio". As duas linhas ⚠️ acima são as afetadas.

Além disso, o grep documentado do G6 (`skill-audit/SKILL.md:157`) **não discrimina**: rodado hoje,
volta 1 hit, e o hit é o próprio teste de fronteira que enforça a regra — o gate como escrito
reprovaria uma árvore limpa. O teste jest, esse sim, se auto-exclui
(`no-accounting-imports.boundary.test.ts:34`), que é exatamente a discriminação que falta ao grep.

### O débito de enforcement é **uma** regra, não duas

Da classe inteira, quase tudo é contabilidade. O que resta descoberto de verdade:

| Regra | Situação real | Conserto | Tamanho |
|---|---|---|---|
| `AC-2.1-B1` | **Guardada** — por `no-accounting-imports.boundary.test.ts`, gate mais forte que o G6 jamais foi. O gate *nomeado* é que está errado | reapontar o campo `gate:` do `governance.md` para o teste que já roda | minutos; anda sozinho e cedo |
| `AC-2.2-3` | **Descoberta** — sem substituto conhecido. Este é o débito | precisa de um verificador de verdade (teste, lint ou execução no runner) | item próprio |

**Por que os dois consertos NÃO entram juntos** (correção de 2026-08-10 — o agrupamento anterior
estava errado): são ordens de grandeza diferentes. Reapontar um campo `gate:` é edição de uma linha
de frontmatter. Fazer o runner executar `gates[].command` é **introduzir execução de comando
arbitrário a partir de string parseada de markdown** — mecanismo novo, com superfície própria, que
exige decisão do dono sobre (a) allowlist de comandos e (b) o que acontece quando o comando falha
por ambiente, e não por violação. O cenário (b) não é hipotético: os 9 `CONTROL_FAILED` de
`_ast-harness` numa sessão sem `server/node_modules` são exatamente ele. Agrupados, ou a janela
incha ou a parte cara entra apressada atrás da barata.

**Ordem:** reapontar `AC-2.1-B1` é barato e independente da moratória (é correção de registro
errado, não aparato novo). Execução no runner é item próprio, atrás do **CM-12**. Corrigir só o
grep do G6, isolado, continua proibido — produz gate que *parece* consertado e segue inerte.

Contexto completo em
[`docs/operating-manual/BANCADA-RS-RESISTENCIA-DE-SKILL.md`](../docs/operating-manual/BANCADA-RS-RESISTENCIA-DE-SKILL.md) §3.3.

Ainda **sem dono governado** (referência §2.1/§2.2 existe, mas nenhuma skill-piloto a reivindica
em `governs-rules` — entra na próxima leva de skills, não é falha na Fase 1):
`AC-2.1-B5` (gêmeo de `AC-2.2-2`), `AC-2.2-1` (money=centavos), `AC-2.2-4` (delete ignora `immutableAfter`).

## A prova de que o modelo pega o drift que nos queimou

`AC-2.1-B1` (a regra que o incidente de 2026-06-24 violou — `PostingService` injetado no motor)
mapeia para `skill-audit/G6`. **G6 não existia até esta sessão.** Rodar o `governance-check`
*antes* do fix teria reportado:

```
RULE_WITHOUT_GATE: AC-2.1-B1 (contrato §2.1) não tem entrada em nenhum governance.md.gates
```

Era exatamente esse o buraco: a regra escrita no contrato, sem verificador. Com G6 + este mapa,
o buraco vira um FAIL objetivo em vez de um esquecimento silencioso.

> **Emenda 2026-08-10 — a prova acima vale menos do que afirma.** O que o `governance-check` passou
> a pegar foi a regra **órfã** (`RULE_WITHOUT_GATE`), e isso é real: sem entrada em `gates:`, FAIL.
> O que ele **não** passou a pegar é a violação em si — G6 nunca foi executado (nota da Matriz), e
> o `AC-2.1-B1` só não regrediu porque existe um teste jest independente do G6. Lido literalmente,
> o parágrafo acima diz que o incidente de 2026-06-24 teria sido pego pelo instrumento; o que o
> instrumento pega é a **ausência de gate declarado**, não o `PostingService` no motor. A diferença
> é a mesma que o `ORACLE-DEFICIT.md` descreve: declarar a trava não é exercê-la.

## Legenda de status

- ✅ **coberto** — regra tem gate; gate existe; alvo do gate encontrado. **Para `kind: executable`,
  "alvo encontrado" significa apenas que a string do comando não está vazia** — o runner não o executa.
- ⚠️ **design-time** — gate é julgamento do reviewer/audit (não mecanizável por grep), mas é um gate nomeado e rastreável.
- ⚠️ **NÃO ENFORÇADO** — gate declarado que nunca rodou (nem no CI, nem no runner). Não conta como
  cobertura. Se a regra tem guarda por outro caminho (teste, lint, build), ela é nomeada na própria linha.
- ❌ **órfã** — regra sem gate (`RULE_WITHOUT_GATE`). Zero toleradas entre as skills governadas.

Ver incidentes em [`incidents/`](./incidents/); o registro fundador é
[`incidents/2026-06-24-prisma-service-into-dynamictable-engine.md`](./incidents/2026-06-24-prisma-service-into-dynamictable-engine.md).
