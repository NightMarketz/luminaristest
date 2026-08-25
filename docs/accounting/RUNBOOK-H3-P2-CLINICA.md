# RUNBOOK: H3 — Prova do P2 (vertical 2, clínica estética) + PVA da ECD do vertical 2

> Preparado por agente B3 em 2026-08-25 contra `worktree-agent-a120bd375070caef2` `c1b4db84`.
> **Autorização citável (ORCH-006):** dono, 2026-08-25, "Pode disparar" — lote multi-agente no qual
> B3 = "runbook EM BRANCO da prova do P2 (vertical clínica estética)".
> **Em branco de propósito:** EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem
> assinatura é nulo (`docs/operating-manual/RUNBOOK-FORMAT.md`). O agente que preparou este runbook
> **não** preencheu nenhum campo de evidência, **não** marcou desfecho e **não** assinou.
>
> Corresponde ao runbook **"P2-1"** citado no comportamento 10 do
> [BRIEF](../accounting/BE-INCR-P2-VERTICAL-CLINICA-brief.md) §3 Bloco IV — nomeado no padrão H-série
> deste diretório (`RUNBOOK-H1-PVA.md`, `RUNBOOK-H2-BROWSER-SIGNOFF.md`) por ser, como aqueles, um gate
> humano. **Ainda não está na tabela dos "cinco runbooks" do `RUNBOOK-FORMAT.md` §"Os cinco runbooks"**
> — esse texto antecede o P2; quando o dono promover o ADR-P2, a tabela deveria ganhar esta linha.

Executor: [nome — humano]           Data: [____]
Autorização: [decisão que pede esta execução — doc + data]
Rastreio a atualizar no fim: `docs/adr/ADR-P2-second-vertical.md` §6 (passos restantes) e
`docs/accounting/ACCOUNTING-MASTER-MAP.md` §5.1 (se este gate ganhar linha própria na fila)

---

## O que este runbook cobre — e o que ele explicitamente NÃO cobre

**Cobre** os comportamentos 5, 7, 8, 9, 10 e 11 do BRIEF (o gate de cobertura de evento, o
tenant-fixture, a operação do ano-calendário, o script de prova zero-diff, este próprio runbook, e a
métrica), fechando com o comportamento do **F-P2-3(b)**: import PVA-limpo da ECD do vertical 2.

**NÃO cobre:**
- Os comportamentos 1–4 e 6 (preset, ficha clínica, matcher, binding, ativação por CLI) — são
  **implementação** (sessão de feature), não prova humana. Este runbook assume que já estão
  mergeados e com `tsc` limpo antes do passo 1.
- O **PVA do vertical 1** — é o `RUNBOOK-H1-PVA.md`, gate diferente, tenant diferente. Este runbook
  **não reaproveita** aquela evidência (BRIEF §7 item 1).
- O **browser sign-off pós-swap do salão** — é o `RUNBOOK-H2-BROWSER-SIGNOFF.md`.
- Decidir se o ADR-P2 é promovido a `Accepted` — decisão do dono, fora do escopo de execução.

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | **ADR-P2 promovido a `Accepted`** (ou pré-condição §5.2 revogada explicitamente pelo dono, como no ADR-P1 §9) | ler cabeçalho de `docs/adr/ADR-P2-second-vertical.md` | [ ] |
| P2 | **Incremento do rename `salon.*` → `sale.*`** (F-P2-6b) mergeado — pré-condição §5 item 4 do ADR-P2; sem ele o binding da clínica vincularia vocabulário do vertical 1 | `git log` do incremento; ADR/BRIEF próprio dele fechado | [ ] |
| P3 | **BE-INCR-P2-VERTICAL-CLINICA implementado e mergeado** — comportamentos 1–6 do BRIEF (preset, ficha clínica, matcher, binding, gate de cobertura, ativação) | PR mergeado; `tsc --noEmit` limpo em `server/` | [ ] |
| P4 | Código = commit do PR acima ou posterior, em `main` | `git log origin/main --oneline -1` | [ ] |
| P5 | **Backup do `dev.db` real feito** — os passos 3–5 ESCREVEM no razão | copiar `server/prisma/prisma/dev.db` (o populado; `server/prisma/dev.db` é isca de 0 byte) | [ ] |
| P6 | Server e app rodando em **build de produção** do commit exato (nunca `next dev`) | `cd server && npm run build && npm start` / `cd my-app && npm run build && npm start` | [ ] |
| P7 | PVA da **ECD** instalado (mesma versão usada no `RUNBOOK-H1-PVA.md`, para não introduzir variável nova) | abrir o validador | [ ] |
| P8 | Mapeamento referencial do tenant-fixture da clínica com cobertura pronta + **nome da versão** em mãos | aba **Compliance** → painel de mapeamento, com o tenant da clínica selecionado | [ ] |
| P9 | Dados do declarante/livro/signatários da fixture (mesma lista de campos do H1, ver `RUNBOOK-H1-PVA.md` §"Dados que o contador precisa fornecer") | conferir campo a campo | [ ] |
| P10 | Dezembro do ano-calendário da fixture **OPEN** no controle de períodos, ANTES do passo 4 | aba **Períodos**, tenant da clínica | [ ] |

Se qualquer pré-condição não se sustentar → desfecho **BLOQUEADO**, não execute nada.

**Nota sobre F-P2-9:** os meses da fixture fecham `SOFT_CLOSED` (reabrível), não `HARD_CLOSED`
(ratificado 2026-08-25, contra a recomendação do agente). **Ao registrar o desfecho, não descrever a
ECD deste runbook como saída de "exercício encerrado de forma terminal"** — ela é reabrível por
desenho.

---

## Passos

Cada passo tem três campos. **EVIDÊNCIA é obrigatória e é sempre artefato colado** — nunca uma frase
dizendo que deu certo.

### 1. Rodar o script da prova zero-diff (comportamento 9)

```bash
cd server && npm run <script-da-prova-zero-diff>
```

(nome exato do script definido na implementação do comportamento 9 — confirmar em `package.json` antes
de rodar; se o script não existir, é **BLOQUEADO**, não falha deste runbook.)

Resultado esperado: saída indicando **zero arquivos** no perímetro (`features/dynamicTables/{services,
repositories, policies, rules, validation, dtos, models, utils}`, `presets/PresetManager.ts`,
`presets/fields/`, núcleo de `features/accounting`, `features/accounting/sync/`,
`features/accountingBinding/{archetypes,interpreter,models}`, `server/src/lib/factory.ts`,
`server/src/controllers/dynamicTablesController.ts`) entre o commit pré-P2 e o commit atual.
`presets/ai/PresetKnowledgeBase.ts` **fica fora** do zero-diff estrito (F-P2-10 → (c) — ele
**precisa** ter mudado para o comportamento 3 existir).

EVIDÊNCIA: [colar a saída completa do script]

> **Se o diff não for vazio no perímetro:** desfecho **FALHOU** — é defeito da prensa, não ajuste. Volta
> para o P1 como lacuna (sessão de instrumentação → correção), **não conserte aqui**.

### 2. Confirmar o self-check do tenant-fixture (comportamento 7)

```bash
node <script-de-seed-da-clinica> --self-check
```

(espelho de `scripts/activate-salon-binding.mjs --self-check`; não toca em banco do projeto.)

Resultado esperado: self-check passa sem tocar em `dev.db`.

EVIDÊNCIA: [colar a saída do comando]

### 3. Confirmar o gate de cobertura de evento (comportamento 5)

Na aba **Compliance** (ou endpoint equivalente), para o tenant da clínica: conferir que o binding
`Active` cobre **todos** os `eventKey` que as tabelas instaladas podem emitir — sem `missing`.

Resultado esperado: `BindingCoverageReport.missing` **vazio**. Se não vazio, o binding está
incompleto e a ECD sairia silenciosamente errada (§ comportamento 5 do BRIEF) — **pare aqui**.

EVIDÊNCIA: [colar o relatório de cobertura]

### 4. Postar, fechar e exportar a operação do ano-calendário (comportamento 8)

Seed/operação da fixture: vendas (`sales`/`saleItems`), pacotes, revenda de cosmético e despesas
(F-P2-8 → (a), os 5 arquétipos), cobrindo o **ano-calendário inteiro** (o encerramento lê piso em
1º-jan — ver `docs/operating-manual` classe "apuração lê piso em 1º-jan"). Fechar cada período tocado;
rodar `closeExercise` para o ano.

Resultado esperado: balancete da clínica fecha; Σ do subrazão casa com o razão; `closeExercise` retorna
201 balanceado (mesmo padrão do `RUNBOOK-H1-PVA.md` passo 1).

EVIDÊNCIA: [colar JSON do `closeExercise` + screenshot do balancete/DRE fechado]

### 5. Gerar a ECD do vertical 2

Aba **Compliance**, tenant da clínica → formulário **ECD**: ano, versão do mapeamento (P8),
declarante, livro, signatários (P9). Clique em gerar — um clique gera **e baixa** o `.txt`.

Resultado esperado: download do arquivo. Se vier **400 com `unmappedAccounts`**, é **BLOQUEADO**
(cobertura do mapeamento com buraco), não falha de execução.

> **Não reabra e re-salve o `.txt` em editor de texto** — corrompe a codificação e produz crítica
> falsa no PVA.

EVIDÊNCIA: [nome do arquivo baixado + tamanho; primeiras linhas do registro 0000 — **tarje CNPJ/CPF**
se este runbook for commitado preenchido]

### 6. Importar a ECD do vertical 2 no PVA — F-P2-3(b)

Abra o PVA da ECD → importar o `.txt` do passo 5. Anote **cada crítica** com o código do registro.

Resultado esperado: import **sem críticas impeditivas**. Este é o passo que fecha o comportamento
mais profundo do checklist — **o PVA é o único oráculo que falseia a ECD**; sem ele a prova do
vertical 2 herdaria o mesmo déficit do vertical 1.

EVIDÊNCIA: [tela/protocolo do PVA com o resultado do import + lista de críticas, se houver]

> **Se houver crítica:** desfecho **FALHOU**, e **pare aqui**. Crítica do PVA é achado de domínio —
> vira ADR ou emenda, nunca hotfix.

### 7. Registrar (ou marcar N/A) a métrica *time-to-first-ECD* (comportamento 11)

F-P2-4 decide **onde** a métrica é registrada (runbook manual vs. instrumentação no produto) e depende
de T0 estar definido no produto (BRIEF §8 insumo 1 — o wizard hoje não persiste marco de "sistema
pronto"). Se T0 **não** estiver definido por escrito na implementação mergeada (P3), este passo é
**N/A** — registrar isso explicitamente, não inventar um T0 ad hoc.

Resultado esperado: T1 = timestamp do `EXPORT_SPED_ECD` do passo 5. T0 = o que a implementação
mergeada definiu, ou "N/A — T0 não instrumentado" se F-P2-4 ainda estiver aberto.

EVIDÊNCIA: [T0, T1, delta — ou "N/A" com a razão]

---

## Desfecho (marcar UM)

- [ ] **PASSOU** — todos os passos com evidência conferindo com o esperado (zero-diff vazio, cobertura
      sem `missing`, operação fechada, ECD importou limpa no PVA)
- [ ] **FALHOU** — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi
      executado após a falha
- [ ] **BLOQUEADO** — pré-condição __ não se sustentava; execução nem começou

## Registro

- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [ADR-P2 §6 e/ou master map §5.1 atualizados com o desfecho + data]
- Assinatura do executor: ____________
