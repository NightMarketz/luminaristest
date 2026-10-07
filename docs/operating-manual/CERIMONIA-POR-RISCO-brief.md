# BRIEF — Cerimônia por risco, fold automático, CLAUDE.md enxuto (3 itens)

> Saída da `sessao-planejamento`. Não escreve código, não ratifica fork. Pronto = forks LISTADOS.

## Contexto fixo

- **Item:** 3 mudanças de processo de execução de tarefas, propostas na comparação com a prática de
  mercado (spec-driven development / TDD agêntico) feita na sessão de 2026-10-07.
- **Autorização:** dono, chat, 2026-10-07: *"autorizo os três, prepara o BRIEF"*, sobre a lista
  (1) cerimônia em 2 níveis por risco, (2) fold automático do plano, (3) enxugar o CLAUDE.md raiz.
  **Cobre o BRIEF dos 3 — não cobre "executa"** (leitura do CLAUDE.md: "sem 'executa' não autoriza código").
  Não é nó do vault `docs/plano/`; precedente de item de processo com autorização em chat:
  `CERCA-DE-EXECUCAO-brief.md`.
- **Estado medido (`origin/main` = `286f9df5`, 2026-10-07):**
  - Desde 2026-09-07: 297 commits, 155 `docs(...)`, 118 `feat`/`fix` (git log).
  - `CLAUDE.md` raiz = **150 linhas**; `server/CLAUDE.md` 26, `my-app/CLAUDE.md` 30.
    ⚠ **Correção da premissa:** na análise eu disse que o contexto sempre-ativo "passa de ~200 com folga";
    o CLAUDE.md raiz **sozinho já está em 150**. O excesso está em CLAUDE.md + `MEMORY.md` (~100
    entradas, muitas com 150+ caracteres) — ver F-3.1.
  - Fold hoje (`docs/plano/README.md:48-55`): editar frontmatter + cabeçalho da nota → `plano-vault.mjs
    index` → `check` (CI já roda `check`, `.github/workflows/ci.yml:265`) → nota em `decisoes/` se houver.
  - O fold em PR separado é **regra escrita**: `sessao-correcao/SKILL.md:90-91` e
    `sessao-instrumentacao/SKILL.md:36-39` — "a nota não entra no diff (regra 1); o relatório traz a
    linha de fold para o fold pós-merge".
- **Insumos:** `CLAUDE.md`, `docs/plano/README.md` §Fold, `scripts/plano-vault.mjs` (+ `.test.mjs`),
  `.claude/skills/sessao-{correcao,instrumentacao,feature,integracao}/SKILL.md`, `_OPERATING-GATES.md`,
  `MODEL-TUNING.md`.
- **Nós vizinhos:** `skill-audit.mjs` (gate obrigatório ao tocar `.claude/skills/**`, 0 findings);
  regra ⛔ do CLAUDE.md (nada aqui monta aparato de auditoria — os 3 itens **removem** cerimônia).

## Checklist numerado

### Item 1 — Cerimônia em 2 níveis

1. Definir o predicado do **nível leve** como lista fechada e checável no diff (F-1.1):
   `fix`/`test`; ≤ N linhas de código de aplicação (F-1.2); **nenhum** arquivo em
   `server/prisma/**` (schema/migração), nenhum caminho de dinheiro/fiscal/auth (F-1.3).
   Qualquer "não" → nível completo, sem discussão.
2. No nível leve: teste-guarda vermelho **e** correção no **mesmo PR** (dois commits: `test:` vermelho,
   depois `fix:`), em vez de sessão de instrumentação + sessão de correção separadas.
   Teste: o commit `test:` sozinho falha no CI/local; o `fix:` o faz passar.
3. Nível leve continua exigindo autorização citável (ORCH-006 não muda) e `tsc` limpo.
4. Nível completo = fluxo atual, intocado.
5. Registrar a regra num só lugar (`_OPERATING-GATES.md`, novo **OPS-006** — OPS-005 já era o gate de fila) e **citá-la** nas skills
   `sessao-instrumentacao` e `sessao-correcao` (T4: formular 1×, citar depois) — não duplicar texto.
6. `node .claude/skills/skill-audit/skill-audit.mjs run` → 0 findings.

### Item 2 — Fold automático

7. Novo subcomando `node scripts/plano-vault.mjs fold <NÓ> --pr <n> [--estado <e>]`: atualiza
   frontmatter (`estado`, `prs`, `atualizado`) **e** o cabeçalho espelhado `**Estado:**`/`**PRs:**`,
   depois roda `index`. Teste em `plano-vault.test.mjs`: nota fixture antes/depois + `check` sai 0.
8. O fold passa a entrar **no próprio PR** do trabalho (F-2.1), retirando a cláusula "a nota não entra
   no diff" de `sessao-correcao:90-91` e `sessao-instrumentacao:36-39` e o §Fold do README vira
   "rode `fold` antes do push".
9. `estado: done` continua só com merge em `main` (README:52): no PR o fold grava `inflight`/`review`;
   a virada para `done` é F-2.2.
10. Decisão nova do dono → nota em `decisoes/` continua manual (é conteúdo, não estado).

### Item 3 — CLAUDE.md enxuto

11. Meta de linhas do raiz (F-3.2). Candidatos a mover para doc linkado, mantendo 1 linha de índice:
    tabela do cbm (§"Antes de escrever código"), bloco CBM-001, "Ponytail × este projeto",
    T1–T8 detalhado (já existe em `REASONING-TRAITS.md`), histórico da bancada (manter só a regra).
12. **Fica no raiz, sem redução:** STOP DynamicTable×Prisma, regra ⛔ (a regra, não a medida),
    gates rápidos, OPS-001 (5 perguntas) — são contrato (`MODEL-TUNING.md` §1: contrato não entra em dose).
13. Teste: `wc -l CLAUDE.md` ≤ meta; todo link novo resolve (`ls` de cada caminho citado);
    nenhuma regra some — lista das regras antes/depois no PR, item a item.

## Contratos (esboço)

```ts
// plano-vault.mjs fold
type FoldArgs = { no: string; pr: number; estado?: 'inflight' | 'review' | 'done' | 'blocked' };
// efeito: nota.fm.prs ∪= [pr]; nota.fm.estado = estado ?? fm.estado; nota.fm.atualizado = hoje (YYYY-MM-DD)
//         corpo: linhas **Estado:** e **PRs:** reescritas a partir do fm; depois `index`.
// erro (exit 1): nó inexistente | estado='done' sem flag --merged (ver F-2.2)

// OPS-005 nível leve — predicado sobre o diff
type NivelLeve = {
  tipo: 'fix' | 'test';
  linhasAplicacao: number;   // <= N (F-1.2), excluindo __tests__
  tocaPrisma: false;         // server/prisma/**
  tocaRiscoDominio: false;   // lista de F-1.3
};
```

## Forks — RATIFICADOS (dono, chat, 2026-10-07: "ratifico todas as recomendações, executa")

- **F-1.1 — Quem decide o nível.** (a) o agente aplica o predicado e declara no PR; (b) o dono marca
  na autorização ("leve"). **Rec.: (a)** com predicado fechado — é checável no diff; dono pode vetar.
- **F-1.2 — N linhas.** (a) 30; (b) 50; (c) sem limite, só os critérios de risco. **Rec.: (a) 30** —
  cobre os fixes recentes (ex. #564) sem abrir porta para feature disfarçada.
- **F-1.3 — Caminhos de risco que forçam nível completo.** (a) `server/prisma/**` + `server/src/features/accounting/**`
  + `server/src/features/accountingBinding/**` (fiscal vive em accounting) + `server/src/middleware/auth.ts`; (b) só prisma + auth. **Rec.: (a)** — no Luminaris quase
  todo fix relevante é fiscal; aceito que isso reduz o alcance do nível leve (ver Riscos).
- **F-2.1 — Onde roda o fold.** (a) no próprio PR, pelo agente, via `fold`; (b) job pós-merge no CI
  com commit automático em `main`; (c) manter PR separado, só automatizar a edição.
  **Rec.: (a)** — (b) exige token de push em `main` e mexe em proteção de branch (decisão de config do
  dono); (c) não reduz os PRs.
- **F-2.2 — Virada para `done`.** (a) o PR grava `done` antecipado (o merge confirma); (b) grava
  `review` e a virada `done` acumula num fold-lote semanal; (c) job pós-merge só para isso.
  **Rec.: (a)** — README:52 diz "done só com merge"; PR não mergeado não chega a `main`, então a nota
  em `main` nunca mente. Contra: branch aberta mostra `done` localmente.
- **F-3.1 — Escopo do enxugamento.** (a) só `CLAUDE.md`; (b) também consolidar `MEMORY.md` (índice).
  **Rec.: (b)** — é onde está o excesso medido; mas (b) passa pela skill `consolidate-memory`, fora do repo.
- **F-3.2 — Meta.** (a) ≤ 100 linhas; (b) ≤ 120. **Rec.: (b)** — os itens do checklist 12 sozinhos
  ocupam ~70.

## Pendente de validação externa

- Nenhuma regra contábil/fiscal/legal envolvida.

## Insumos ausentes

- Não medi tokens do contexto sempre-ativo (só linhas). Medição = contar tokens do CLAUDE.md +
  MEMORY.md + nested numa sessão; fica como checagem do item 13, não bloqueia.
- Não medi quantos dos 118 `feat`/`fix` passariam no predicado leve — o ganho real do item 1 é
  **inferido**. Checagem barata: aplicar o predicado de F-1.2/F-1.3 ao `git log --numstat` desde 09/07.

## Riscos

- Com F-1.3 (a), o nível leve pode cobrir poucos PRs → o grosso do ganho vem do item 2 (≈ metade
  dos PRs `docs(plano): fold`).
- Meu viés (T8): a análise que originou isto buscava diferenças com o mercado; o item 3 já se mostrou
  menor do que eu disse (150 linhas, não >200).

## Achados fora de escopo

- As "Pendências de ratificação do próprio template" da `sessao-planejamento` (regra 2 × leitura de
  código; regra 1 órfã o BRIEF) seguem abertas; a 2ª some se F-2.1 (a) for ratificado.
