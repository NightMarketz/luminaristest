# Luminaris — Orientação para agentes (Antigravity, Codex, Claude Code)

As regras do repositório vivem em `CLAUDE.md` (raiz) e nos docs que ele aponta; este arquivo guarda só o
contrato com a memória externa, que vale para qualquer agente.

## Fonte de Verdade Externa — ObsidianVault (`Luminaris`)

- **Vault:** `c:\Users\smurf\ObsidianVault`
- **Índice do projeto:** `c:\Users\smurf\ObsidianVault\30 Projects\Luminaris\MEMORY.md`
- **Topologia Git deste projeto:** `GitHub+PR+worktrees` (repo `NightMarketz/luminaristest`; merge por classe de risco — ver `CLAUDE.md`)
- **Modelo de Tenancy:** `B2B Multi-Tenant (userId)` — contabilidade escopada por `AccountingScope` (owner/actor userId + unitId), sem multiempresa
- **Origem desta máquina:** `este PC`

- **Auto-memória do Claude Code (dono, 24/11/2026):** continua em uso, em `C:\Users\smurf\.claude\projects\C--Users-smurf-Downloads-Luminaris\memory\MEMORY.md`,
  e tem **o mesmo peso do vault** na consulta. Nenhuma das duas manda na outra; conflito entre elas se resolve pela
  hierarquia de verdade (decisão recente do dono → código/git → nota semântica → procedural → episódica).

### 1. Leitura Obrigatória (Pre-Flight)
Antes de planejar, criar cercas/testes, abrir worktrees ou perguntar forks ao dono:
1. Leia `30 Projects\Luminaris\MEMORY.md` para decisões e armadilhas específicas deste projeto — e, no Claude Code,
   também a auto-memória (o índice já vem carregado no contexto; abra as notas relevantes), com o mesmo peso.
2. Consulte o acervo transversal (1.013+ notas, ~3 ms):
   `node "$env:USERPROFILE\.gemini\config\plugins\engineering-rigor\scripts\vault-search.mjs" --query "<termos>" --top 5`
3. Em caso de conflito entre nota episódica antiga e código atual, **re-derive no código/git** antes de agir.

### 2. Escrita Governada (Quando e Como Gravar no Vault)
No Claude Code, a gravação na auto-memória segue como o harness instrui; o protocolo abaixo vale para a escrita no vault.

Grave no vault **somente** conhecimento durável (nova armadilha/falso verde, correção explícita do dono, decisão-marco de arquitetura/domínio ou falha de primeira classe). **Nunca** grave logs crus, segredos, tokens, PII real ou texto duplicado de commit/PR.

Ao gravar uma nota nova:
1. **Busque antes** com `vault-search.mjs` para evitar duplicatas — se já existir nota sobre o tema, atualize ou faça supersessão.
2. Salve arquivo **atômico novo** em `c:\Users\smurf\ObsidianVault\20 Topics\<01..12-topico>\<slug>.md` (UTF-8, LF) com `name:` no frontmatter **exatamente igual** ao nome do arquivo sem `.md`, e campos `name`, `description` (com o antídoto na 1ª frase), `tipo` (`procedural|episodico|semantico`), `projeto: Luminaris`, `origem`, `status: ativo`, `revisao: ok`, `revisao_motivo`.
3. Anexe **1 linha curta** (preservando o antídoto, sem contagem manual) ao final da seção adequada em `30 Projects\Luminaris\MEMORY.md`.
4. **Não edite** `_indice-*.md` nem `MEMORY.md` de outros projetos (evita conflitos de concorrência no OneDrive).
5. **Nunca delete** nota incorreta ou superada: marque `status: superseded` + `superseded_by: "[[nota-nova]]"`, mova para `30 Projects\Luminaris\_legado\` e registre 1 linha em `candidatos-a-superseded.md`.

### Fronteira com o repositório (zero duplicata)
Fica no repo, não no vault: porquê de commit/PR, estado vivo de fila/sessão (handoff), ADRs (`docs/adr/`),
plano e decisões do dono (`docs/plano/`), lacunas (`node scripts/lacunas.mjs add`). No vault entra só a lição
durável que sai desses artefatos, com ponteiro para eles.
