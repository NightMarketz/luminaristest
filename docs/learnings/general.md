# Learnings — geral (processo, git, paralelismo)

Ledger de aprendizados que não pertencem a um esforço de domínio. Formato e regras: skill `learning-log`.
Entradas mais novas no topo.

---

### 2026-10-16 · assumption-correction · A fila de merge não era o gargalo; o paralelismo era
- **Contexto:** diagnóstico dos conflitos do lote de 16/10 (18 PRs de I6, I7, I11, W4, W5, X14).
- **Aprendizado:** em 80 PRs mergeados desde 09/10, a mediana entre abrir e mergear foi 1 h e nenhum passou de 24 h. A espera pelo OK do dono não gera conflito. O conflito vem de muitas frentes partindo da mesma `main` ao mesmo tempo (~17 merges só em 15/10).
- **Evidência:** `gh pr list --state merged --json createdAt,mergedAt` desde 2026-10-09 (mediana 1 h, 0 acima de 24 h).
- **Como aplicar:** diante de conflito em massa, meça a concorrência (PRs abertos sobre a mesma base, arquivos em comum) antes de propor merge mais rápido ou auto-merge.
- **Durável?** não

### 2026-10-16 · pattern · Mudança que só move conteúdo se prova pela saída canônica antes e depois
- **Contexto:** divisão do `server/src/routes/docs.paths.ts` em 64 arquivos por feature (PR #748).
- **Aprendizado:** a comparação byte a byte do spec canônico (chaves ordenadas) pegou na hora um bug invisível: o texto `**/*.ts` dentro de um comentário `/** */` fechava o comentário, e o swagger-jsdoc perdeu os blocos calado (289 → 37 paths). Depois da correção, a mesma comparação provou o spec idêntico, e de novo no rebase sobre a `main`.
- **Evidência:** PR #748, seção Prova; `server/scripts/split-docs-paths.py`.
- **Como aplicar:** antes de mover blocos entre arquivos lidos por glob ou gerados, salve a saída canônica (chaves ordenadas), faça a mudança, gere de novo e compare com `cmp`. Diferença zero é a prova; contagem igual não basta.
- **Durável?** não (o caso OpenAPI está em [[openapi-wiring-static-artifact]])

### 2026-10-16 · pitfall · Commitar em branches de um lote que outra sessão está integrando
- **Contexto:** para tirar conflito, mandei 1 commit (`_INDEX` voltando ao lado da `main`) em 6 branches do lote de 16/10.
- **Aprendizado:** os commits deixaram o check do vault vermelho (a regra nova ainda não estava na `main`), e a sessão de integração pediu que eu parasse: ela ia regenerar o `_INDEX` em cada PR e anular meus commits. O `list_sessions` mostrava a sessão com `isRunning: false`, mas ela continuava dona do lote.
- **Evidência:** commits `bd1e5085`, `4c9ad673`, `1ac3f868`, `a14abfd4`, `535d161d`, `fc559fc1`; mensagem da sessão "Próximos passos atualizados" (16/10).
- **Como aplicar:** antes de commitar em branch de PR que faz parte de um lote, pergunte à sessão que integra o lote. Sessão parada não é sessão sem dono.
- **Durável?** sim → [[sessoes-paralelas-mesmo-tema-checar-antes-de-commitar]]

### 2026-10-16 · assumption-correction · O contrato de paralelização existia; ninguém o rodava ao abrir sessões
- **Contexto:** lote de 16/10 aberto como sessões soltas.
- **Aprendizado:** a PAR-001..006 já mandava separar os registros (Fase B, em série). O lote foi aberto sem ela e cada PR fez o próprio registro. Rodado depois sobre os arquivos reais, o cálculo aponta 28 pares em conflito e 4 ondas.
- **Evidência:** `.claude/skills/_PARALLELIZATION-CONTRACT.md`; `scripts/paralelo.mjs` (PR #746), rodada retroativa no corpo do PR.
- **Como aplicar:** é o mesmo caso da entrada de 15/07 em `accounting-buildout.md` ("memória descreve, só gate segura"), refinada lá: o cálculo tem de estar no caminho de quem abre as sessões.
- **Durável?** já coberto por [[ops-operating-gates]]

### 2026-10-16 · gotcha · O GitHub ignora merge drivers do `.gitattributes`
- **Contexto:** `merge=regen` no `_INDEX.md`, `openapi.json` e snapshots de DTO desde o #497.
- **Aprendizado:** o driver resolve o conflito no rebase/merge local, mas a checagem de mergeabilidade do GitHub, o botão de merge e o "Update branch" não o executam. O PR continua `CONFLICTING` mesmo quando local resolveria sozinho.
- **Evidência:** consenso da comunidade, sem documentação oficial: GitHub Discussion [#9288](https://github.com/orgs/community/discussions/9288) (citação do suporte: o GitHub não considera `.gitattributes` do usuário). No repo: `.gitattributes` com `merge=regen`; PRs do lote marcados CONFLICTING só no `_INDEX.md`.
- **Como aplicar:** driver local só ajuda quem rebaseia na própria máquina e dá push. Para o botão do GitHub, tire o arquivo do PR (gerar na `main` depois do merge) ou divida o arquivo para que dois PRs não toquem o mesmo.
- **Durável?** sim → [[github-ignora-merge-driver]]

### 2026-10-16 · pitfall · Regra que manda todo PR atualizar um valor compartilhado fabrica conflito
- **Contexto:** diagnóstico dos conflitos de 09–16/10.
- **Aprendizado:** a maior parte dos conflitos veio de regras do próprio processo, não de código: o `fold` no PR com o `check` exigindo `_INDEX.md` em dia (65 de 118 commits), a subida manual do `BASELINE` do `openapi-paths.test.ts` (38 commits em 30 dias, todos na mesma linha) e o `docs.paths.ts` central (10 de 18 PRs do lote).
- **Evidência:** `git log origin/main --since=2026-10-09 --name-only`; `scripts/plano-vault.mjs:161` (check do índice, antes do #745); `server/src/__tests__/openapi-paths.test.ts` (antes do #748).
- **Como aplicar:** antes de criar regra que todo PR cumpre, pergunte se ela escreve num arquivo comum. Se escreve: o valor é derivado na `main` depois do merge (#745, #748), ou o arquivo é dividido por dono (um por feature).
- **Durável?** sim → [[valor-derivado-calcula-na-main-nao-no-pr]]
