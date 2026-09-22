# BRIEF — Cerca de execução (7 itens)

> Princípio único, em quatro pontos do repo: **o estado observável é a autoridade; o LLM só interpreta.**
> `PASSOU` nasce de reexecução, nunca de texto.

## Contexto fixo

- **Item:** cerca de execução — os 7 testes do dono (sessão de 2026-09-22).
- **Autorização:** dono, 2026-09-22, nesta sessão: *"Autorizo todos faça o guia do que fazer"*, sobre a
  lista dos 7 itens com o teste binário de cada um. Cobre exatamente os 7; nada além.
- **Estado medido (2026-09-22, `main` = `26e75bf2`):** 0/7 no repo. `CONTRATO-DE-RETORNO.md` cita
  `scripts/retorno-check.mjs`, `scripts/reporte-humano-check.mjs` e
  `.claude/hooks/capture-subagent-return.mjs` — **nenhum existe no disco nem em commit algum**
  (`git log --all --diff-filter=AD` vazio). `.gitignore:32` citado não existe (arquivo tem 27 linhas).
  O doc descreve um harness que só viveu numa máquina.
- **Insumos:** `CONTRATO-DE-RETORNO.md` (formato do retorno, seção "O que ele não alcança"),
  `_OPERATING-GATES.md` (OPS-001), `luminaris-reviewer/SKILL.md` (REV-001/003/005),
  `MODEL-TUNING.md`, `.claude/settings.json` (deny de Edit/Write no próprio settings).
- **Nós vizinhos:** `skill-audit.mjs` (único gate mecânico ativo; não toca retornos);
  `.claude/workflows/parallel-batch.js` (despacha subagentes; consumidor natural do proof runner).

## Travas conhecidas (não são forks — são fatos)

- **T-A** `settings.json` está em `deny` para o agente e o classificador barra hook até em
  `settings.local.json`. O item 3 **termina na mão do dono**: o agente entrega o script e o bloco JSON;
  o dono cola.
- **T-B** CLAUDE.md §⛔ (moratória de aparato de auditoria). Leitura adotada: proof runner é **gate de
  execução** (reexecuta comando), não rodada/revisor — fora da moratória. O item 5 (reviewer agente)
  **é** um revisor; entra como *arquivo versionado sem despacho automático* — instala, não roda rodada.
  → **F-1** abaixo.

## Checklist numerado (cada um testável sozinho)

Ordem = ordem de execução. 1–4 são um script e um caso; 5–6 são dois arquivos; 3 é do dono.

1. **`scripts/prova-runner.mjs` — o único emissor de `PASSOU`.**
   Lê um retorno (`.claude/retornos/<slug>.md`), extrai o bloco `PROVA`, **reexecuta cada `command`**
   (cwd do repo, timeout 10 min), compara `exit_code` real com o declarado e com o `VEREDITO`,
   e **sobrescreve** a linha `veredicto:` do arquivo com `PASSOU | FALHOU | INCONSISTENTE`.
   - `PASSOU` ⇔ todo command reexecutado dá exit 0 **e** o declarado era PASS.
   - `FALHOU` ⇔ algum exit ≠ 0 (independente do declarado).
   - `INCONSISTENTE` ⇔ exit real ≠ exit declarado (mesmo que ambos ≠ 0) — alegação não bate com fato.
   - Exit do script: 0 só em `PASSOU`. Item 1 ✔ quando `grep -c PASSOU` no retorno só muda via runner.
2. **Schema de `PROVA` (contrato, item 2).** Bloco YAML fenceado no retorno:
   ```yaml
   PROVA:
     - command: "cd server && npx tsc --noEmit"
       exit_code: 0
       log: .claude/retornos/_logs/<slug>-1.log   # gravado pelo subagente via `> log 2>&1; echo $? `
       sha256: <do log>
   VEREDITO: PASS
   ```
   Runner confere: `log` existe, `sha256` bate, `exit_code` é inteiro. `PROVA: npm test` (string solta)
   → `SEM-PROVA`, tratado como `FALHOU`. Zod não entra (script Node solto; `ponytail:` regex + JSON.parse
   de YAML mínimo — só lista de mapas planos).
3. **Hook `Stop` + `SubagentStop` bloqueante (item 3 — dono cola).**
   `.claude/hooks/prova-gate.mjs`: lê `agent_transcript_path`/`last_assistant_message` do payload
   (esquema 2.1.260 já documentado), acha o `slug`, chama o runner; se ≠ `PASSOU` → `stdout`
   `{"decision":"block","reason":"<linha do runner>"}` e exit 2. Bloco a colar em `settings.json`:
   ```json
   "hooks": { "Stop": [{"hooks":[{"type":"command","command":"node .claude/hooks/prova-gate.mjs"}]}],
              "SubagentStop": [{"hooks":[{"type":"command","command":"node .claude/hooks/prova-gate.mjs"}]}] }
   ```
   Retorno sem bloco `PROVA` (tarefa read-only) → hook deixa passar **só** se `veredicto: N/A` explícito;
   ausência total = block (ausência não pode parecer sucesso — regra já do CONTRATO).
4. **Controle negativo (item 4).** `scripts/prova-runner.test.mjs` (node:test, sem framework):
   - N1 — PROVA declara `exit_code: 0`, command é `node -e "process.exit(1)"` → esperado `FALHOU`.
   - N2 — declara `exit_code: 1`, VEREDITO FAIL, command sai 0 → `INCONSISTENTE`.
   - N3 — PROVA como string solta → `FALHOU` com razão `SEM-PROVA`.
   - P1 — declara 0, command `node -e "process.exit(0)"` → `PASSOU`.
   - CRLF: N1 repetido com `\r\n` (classe `sintetico-nao-cobre-formato-de-dado-real`).
   Item 4 ✔ quando N1 existe e falha se o runner confiar no declarado.
5. **`.claude/agents/revisor-independente.md` (item 5).** Frontmatter `model: opus`, `tools: Read, Grep,
   Glob, Bash`. Prompt, nesta ordem: (a) **antes de ler o diff**, listar os invariantes do alvo
   (`_ARCHITECTURE-CONTRACT.md §2/§3`, REV-005) e o que *deveria* mudar; (b) só então `git diff`;
   (c) reportar **só** corretude e requisito declarado — "gap" sem consequência de runtime não entra;
   (d) proibido ler `.claude/retornos/` do executor e transcript. Isolamento: despachado com
   `isolation: worktree`. Não substitui `luminaris-reviewer` (que é doutrina); é o mecanismo.
6. **Modelo por papel commitado (item 6).** Três agentes em `.claude/agents/`: `classificador.md`
   (`model: haiku` — triagem/rotulagem), `executor.md` (`model: sonnet` — implementa spec),
   `revisor-independente.md` (`model: opus`, item 5). `.gitignore` não os cobre (verificado: nada em
   `.claude/agents`). Item 6 ✔ = `git ls-files .claude/agents` lista os 3.
7. **Ordem do pipeline (item 7).** No runner e no hook, a ordem é fixa e nomeada no código:
   `prova-runner` → `skill-audit`/`tsc` (invariantes, quando o retorno toca `.claude/skills` ou `src`) →
   review LLM (opcional, nunca condição de `PASSOU`). Documentar em `CONTRATO-DE-RETORNO.md` §"A guarda"
   que **voto de modelo não é gate**; segundo modelo de outra família só como comentário em PR.

## Contratos

- **Entrada do runner:** caminho do retorno; ou `--all` sobre `.claude/retornos/*.md`.
- **Saída do runner (stdout, 1 linha/retorno):** `<slug> <PASSOU|FALHOU|INCONSISTENTE> <n cmds> <razão>`;
  exit 0 ⇔ todos `PASSOU`.
- **Saída do hook:** JSON `{decision, reason}` + exit 2 em bloqueio; exit 0 silencioso caso contrário.
- **Efeito colateral único:** reescrita da linha `veredicto:` do retorno. Nada mais é editado.

## Forks — RATIFICADOS nas recomendações (dono, 2026-09-22)

- **F-1 Moratória × item 5.** Caminhos: (a) commitar o agente e **não** despachar até Bloco A fechar;
  (b) commitar e usar. **Recomendo (a)**: satisfaz o teste do dono ("existe agente versionado") sem
  abrir rodada. Status: RATIFICADO (recomendação).
- **F-2 `.claude/retornos/` no git?** (a) gitignored como o doc previa — hook/CI nunca o veem;
  (b) versionar só `_logs/*.sha256` e o retorno, nunca o log. **Recomendo (b)**: o runner na CI
  reexecuta o command de qualquer forma; o que se versiona é a alegação e o hash. Status: RATIFICADO (recomendação).
- **F-3 Timeout/cwd de reexecução.** Comandos de integração levam minutos (`--runInBand`). (a) runner
  reexecuta tudo; (b) allowlist de commands "caros" que o runner só confere pelo log+hash. **Recomendo
  (a)** com timeout 10 min — a allowlist reabre a porta do texto. Status: RATIFICADO (recomendação).
- **F-4 `Stop` além de `SubagentStop`.** `Stop` bloqueia a sessão-mãe; em tarefa sem retorno isso
  vira atrito. (a) só `SubagentStop`; (b) ambos com `veredicto: N/A`. **Recomendo (b)**. Status: RATIFICADO (recomendação).

## Pendente de validação externa

- Esquema do payload de hook na versão **atual** do binário — o doc mediu 2.1.260; conferir a versão
  em uso antes de confiar em `agent_transcript_path` (classe `stale-dev-server-serves-old-code`).

## Insumos ausentes

- Os "13 casos de formato" e o `retorno-check` citados pelo dono e pelo doc **não estão no repo**.
  O runner nasce sem eles; o checker de formato é reconstruído só no que o runner precisa (cabeçalho,
  `veredicto:`, bloco `PROVA`).

## Achados fora de escopo (não planejados)

- `CONTRATO-DE-RETORNO.md` cita 3 scripts inexistentes e uma linha de `.gitignore` inexistente —
  errata pendente (fold junto do item 7 ou PR próprio).
- `.claude/rules/` com `paths:`, `PreToolUse` filtrando `npm test`, plugin `security-guidance`:
  otimização/defesa em profundidade, sem autorização — ficam fora.

## Ordem de entrega proposta

1. PR-1: itens 1, 2, 4, 7 (runner + teste + doc). Gate: `node --test scripts/prova-runner.test.mjs` verde
   e N1 vermelho se o runner for sabotado para confiar no declarado.
2. PR-2: itens 5, 6 (3 agentes). Gate: `git ls-files .claude/agents` = 3.
3. Dono: item 3 — colar o bloco `hooks`, rodar uma sonda (`# gate-liveness-probe`) com PROVA falsa e
   confirmar bloqueio. Sem essa sonda, o item 3 é prosa.
