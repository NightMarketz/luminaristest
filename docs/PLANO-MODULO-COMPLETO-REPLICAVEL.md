# Plano de alto nível — módulo contábil 100% + replicável para outros setores

> **Relação com os outros docs:** o `ACCOUNTING-MASTER-MAP.md` segue a fonte de verdade operacional;
> o `ROADMAP-PLATAFORMA.md` é a camada de horizonte. Este plano é a **sequência executável** que liga
> os dois ao objetivo declarado pelo dono (2026-08-21): *"um módulo completo e replicável para outros
> setores"*. Ele **não autoriza código** — cada degrau entra pelo fluxo de governança normal
> (PRE-ADR → parecer → ADR ratificado → BRIEF → sessão de feature → review independente).
>
> **Definição de pronto (2 linhas):** o vertical 1 provado pelos 4 oráculos externos + deploy real
> (Degrau 0); a prensa de binding reproduz o molde byte-idêntico (Degrau 1); um setor novo sai da
> máquina com `git diff` vazio no motor/ledger/intérprete e gera a própria ECD (Degrau 2).
>
> Criado: 2026-08-21 · Base: master map fold 2026-08-13 + `origin/main` `1f6caf5b`.

---

## Degrau 0 — Fechar e provar o vertical 1 (gates humanos/dado externo; nenhum código novo)

Todos os passos são do **humano** (agente prepara runbooks em branco por `RUNBOOK-FORMAT.md`; não
preenche evidência, não marca desfecho, não assina). Ordem sugerida por dependência:

1. **Rodada única de PVA** — gerar ECD + Apuração + ECF pelo produto e importar no PGE/PVA oficial.
   Saída: `docs/accounting/PVA-SIGNOFF-<data>.md` (um desfecho por arquivo). Fecha o residual de 3
   incrementos de uma vez — ou revela o gap campo-a-campo que nenhum teste interno pega.
2. **Browser sign-off final** — o carimbo humano nas telas já de-riscadas pela varredura de agente
   (PR #151), mais os dois fluxos que o agente não exercita: upload de extrato OFX/CNAB **por clique**
   e recibos PDF (puppeteer).
3. **NF-e real anonimizada** — obter 1 NF-e 4.00 de compra + 1 de venda, anonimizar preservando
   estrutura e números (runbook em `server/src/lib/__tests__/fixtures/nfe/README.md`), substituir os
   `*.SYNTHETIC.xml`. Depois, sessão de integração da branch `claude/nfe-fase-a`:
   **rebase (≈156 commits atrás) → tsc×2 → jest accounting → re-review de conflito → merge**
   (o `NfeDto` novo exige atualizar o snapshot de shape dos DTOs).
4. **Arquivo oficial RFB "PJ em Geral"** (contador) → conversor já pronto
   (`server/scripts/rfb-referential-to-catalog.mjs`) → validação analytic-only fica viva.
5. **Deploy real** — primeiro deploy do módulo, com o smoke-launch-gate do Chromium (recibos).

**Critério de saída:** 4 oráculos fechados + deploy feito. **Enquanto isso:** a moratória do
`CLAUDE.md` segue — nenhum aparato de auditoria novo; nenhum código contábil pendente existe para
"preencher o tempo" (a fila drenou).

## Degrau 1 — Fase P1: a prensa (engine de binding na geração)

PRE-ADR escrito: [`docs/adr/ADR-P1-binding-press.md`](adr/ADR-P1-binding-press.md). Sequência:

1. **Parecer** do `luminaris-accounting-architect` sobre o PRE-ADR.
2. **Ratificação fork-a-fork** pelo dono — F-P1-1..6 (escopo do corpus, forma do binding, cutover do
   salão, fronteira de dinheiro, papel→conta, escopo do validador).
3. **ADR Accepted** → linha no `INDEX.md` → nó ⏳ no master map.
4. **BRIEF** via sessão de planejamento; fatias candidatas a `parallel-batch` (Fase 0 = schema do
   binding, serial; corpos: catálogo de arquétipos ∥ validador determinístico ∥ intérprete fixo;
   Fase B = registro/wiring, serial).
5. **Implementação** via sessão de feature + review independente por agente separado.
6. **Gate objetivo de saída:** golden test — mappers de salão re-expressos como binding produzem
   lançamentos **byte-idênticos** aos atuais; teste de fronteira prova que o pipeline de geração não
   importa `features/accounting`.

**Entrada da fase (do roadmap):** Degrau 0 fechado (PVA verde). O PRE-ADR pode ser ratificado antes;
a implementação não inicia antes — salvo decisão explícita do dono revogando a pré-condição.

## Degrau 2 — Fase P2: o segundo vertical (a prova)

PRE-ADR escrito: [`docs/adr/ADR-P2-second-vertical.md`](adr/ADR-P2-second-vertical.md). Sequência:

1. **Ratificar F-P2-1 (setor) cedo** — a escolha orienta o corpus do P1 (recomendação: anel 1,
   barbearia/clínica estética; anel 2 puxaria o módulo de Compras/AP operacional = P4).
2. Após o P1 fechar: ratificar F-P2-3/F-P2-4 (**F-P2-2 já ratificado em 2026-08-22 → tenant-fixture
   sintético**, ver `docs/adr/ADR-P2-second-vertical.md`) → gerar o vertical pela entrevista (preset + binding
   compilado + contas por papel).
3. **Prova:** tenant percorre entrevista → ERP operante → fechamento mensal → **gera a própria ECD**;
   `git diff` do motor/ledger/intérprete **vazio**; métrica *time-to-first-ECD* registrada.
4. **Gate humano final:** import PVA-limpo da ECD do vertical 2 (se F-P2-3(b)) — runbook assinado.

**Se a prova exigir diff no motor/ledger/intérprete:** não é ajuste, é lacuna da prensa — volta ao
Degrau 1 via sessão de instrumentação (teste-guarda) → sessão de correção.

## Regras transversais (valem nos 3 degraus)

- **ORCH-006:** nenhum incremento roteia sem autorização citável do dono; forks abertos nunca são
  decididos por agente.
- **Moratória de auditoria** (CLAUDE.md): sem aparato novo enquanto oráculos do Bloco A abertos.
- **Demand-gated é demand-gated:** Compras/AP operacional (P4), Folha, Imobilizado, LGPD fino,
  IA/analytics, inbox/outbox — só entram por gatilho nomeado, nunca por completude.
- **Decisões travadas/rejeitadas** (master map §1/§4) não reabrem por este plano — em especial, o ADR
  do P1 carrega o ônus de provar que binding-compilado ≠ rule-engine rejeitado (5 condições).
- Ao fechar cada degrau: atualizar master map (nós/§7), `ROADMAP-PLATAFORMA.md` (prova cumprida),
  memória (`luminaris-product-thesis`).
