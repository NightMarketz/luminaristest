# Playbook do operador — como dirigir o sistema nas próximas tarefas

> Guia para o **humano** que opera o pipeline. As camadas de agente (gates OPS, guia portável,
> traços T1–T8, tuning de modelo) são lidas pelos agentes; este doc diz **como você as aciona**:
> onde achar a próxima tarefa, qual prompt colar, o que exigir de volta e como fechar o ciclo.

---

## 0. O mapa em 30 segundos

| Peça | Onde | Papel |
|---|---|---|
| Gates de envio OPS-001..004 | `.claude/skills/_OPERATING-GATES.md` | O que todo relatório/handoff precisa provar |
| Guia portável (6 passos) | `docs/operating-manual/PORTABLE-GUIDE.md` | Como o sistema compensa o modelo |
| Traços T1–T8 | `docs/operating-manual/REASONING-TRAITS.md` | Como o agente pensa durante o trabalho |
| Tuning por modelo | `docs/operating-manual/MODEL-TUNING.md` | Opus 4.8 ativo: gatilhos explícitos, micro-autonomia |
| Trio de agentes | `luminaris-orchestrator` → `luminaris-implementer` → `luminaris-reviewer` | Planeja → executa → reprova/aprova com evidência |
| Gates mecânicos | `tsc` ×2, `skill-audit governance-check`, `skill-audit wiring`, CI | O que não depende de ninguém lembrar |

Validação: teste de sistema 2026-07-07 — 9/10, mutação de controle reprovada por forma
(`_OPERATING-GATES.md § Validação empírica`).

---

## 1. Onde achar a próxima tarefa (fontes ranqueadas)

Consulte nesta ordem — a primeira que der tarefa concreta vence:

1. **`docs/accounting/ACCOUNTING-MASTER-MAP.md`** — roadmap contábil real. O nó **⏳** é a
   próxima tarefa de produto por definição; §1/§4 dizem o que NÃO propor. (ORCH-006 manda o
   orquestrador lê-lo; você também deve.)
2. **`MEMORY.md` do projeto** (auto-memória do agente) — quase toda entrada carrega "pending:"
   explícito (sign-off humano, smoke em dev.db real, FE deferido, re-run A–K…). Grep mental:
   "pending", "deferred", "HELD", "não merjado".
3. **Chips de task pendentes** (spawn_task) — trabalho já escopado com prompt pronto; um clique
   abre sessão em worktree fresco.
4. **Relatórios de teste de sistema** — `docs/operating-manual/system-test-*/` lista
   não-conformidades preteridas (ex.: NC-2 do CRM, formatters clonados) — backlog pronto com
   evidência arquivo:linha.
5. **`docs/learnings/<esforço>.md`** — decisões/pitfalls por esforço; itens `pitfall` sem fix
   viram tarefa.
6. **Varreduras sob demanda:** `node .claude/skills/skill-audit/skill-audit.mjs run` (drift de
   skills/clones/hotspots) e `/ponytail-debt` (shortcuts `ponytail:` esquecidos no código).

**Regra de decisão entre fontes:** invariante quebrado > pendência de incremento já aberto >
padronização (CRM) > débito de skill/lint. Em empate, menor blast radius primeiro.

---

## 2. Fluxo padrão de um incremento (o prompt que você cola)

Sessão nova, e adapte:

```
Tarefa: [1-3 frases — o quê + INTENÇÃO: por que / para quem / o que habilita]

Regras: worktree/branch isolada (nunca main); effort alto; micro-decisões: decida e anote,
pare só para escopo/destrutivo; NÃO faça merge — entregue branch + relatório.

Fluxo:
1. Invoque a skill luminaris-orchestrator com a tarefa. Se ela pedir esclarecimento, responda
   e siga. Guarde o plano.
2. Invoque a skill luminaris-implementer com o plano. O handoff DEVE ter a seção rotulada
   "Gates de envio OPS-001" (caso adversarial tentado + checagem falseável + risco nº 1) e
   checks com exit codes reais.
3. Delegue a revisão a um agente SEPARADO em worktree isolado, contexto fresco, lendo só:
   o diff, o handoff e .claude/skills/luminaris-reviewer/SKILL.md. Ambiente sem deps
   resolvidas = BLOCKED, não PASS/FAIL.
4. Se REPROVADO: devolva os FAILs ao implementer (nunca ao revisor), re-submeta à revisão.
   Máximo 3 ciclos; travou → pare e me traga o aberto.
5. Closeout: registre "Decisões a registrar" via learning-log; se contábil, promova o nó no
   ACCOUNTING-MASTER-MAP (ORCH-007).

Relatório final: 1ª linha = veredicto; 2ª = risco principal; depois evidências.
```

**O que você confere ao receber (2 min, binário):** plano tem linha *Intenção* + STEP 0 §2.1?
Handoff tem a seção OPS-001 rotulada? Revisão veio de contexto fresco com tsc+wiring executados
(exit codes)? Veredicto REPROVADO com evidência boa = o sistema funcionou — não é má notícia.

---

## 3. Revisão avulsa (PR já aberto / diff pronto)

```
Revise o diff da branch [X] como agente independente: worktree isolado, contexto fresco.
Leia apenas o diff, o handoff (se houver) e .claude/skills/luminaris-reviewer/SKILL.md.
Re-derive tudo (tsc server+my-app, wiring gate, checklists por camada). Sem handoff OPS-001
rotulado = FAIL de forma. Cobertura antes de filtro: reporte TODO achado com confiança +
severidade. Não corrija nada — reporte e devolva.

SE a mudança for observável no app: RODE-A. Build de produção contra cópia do dev.db real
(nunca `next dev` para tela atrás de withAuth), caminho feliz E caminho de erro. No relatório,
separe "o que EXECUTEI" de "o que LI", e nomeie qual superfície você NÃO alcançou.
```

**Por que a última linha existe (medido, n=6).** Nas seis revisões independentes de 2026-08-07,
**só uma rodou o app** — e foi a única que achou defeito de comportamento do produto
(`REVIEW-PR170.md` — artefato removido em 2026-08-09 junto com a bancada; recuperável em
`b617d8f1`). As outras cinco leram texto e acharam defeito de texto.
Persona afiada muda a mira do revisor, não a abertura dele.

---

## 4. Sessão de descoberta ("o que fazer agora?")

```
Monte a fila de trabalho atual deste repo. Consulte nesta ordem e cite evidência:
(1) docs/accounting/ACCOUNTING-MASTER-MAP.md — nó ⏳ e pendências dos ✅ recentes;
(2) MEMORY.md — entradas com pending/deferred/HELD;
(3) docs/operating-manual/system-test-*/ — não-conformidades preteridas;
(4) docs/learnings/ — pitfalls sem fix;
(5) node .claude/skills/skill-audit/skill-audit.mjs run — findings.
Saída: tabela [tarefa | fonte | invariante em risco | blast radius | pronta-pra-rodar?],
ordenada por (invariante > incremento aberto > padronização > débito). Para as 3 primeiras,
escreva o prompt de incremento (§2) pronto pra colar. Não implemente nada.
```

---

## 5. Quando NÃO usar o pipeline

- **Fix de 1 linha óbvio / typo / doc:** sessão direta, gates de envio manuais (OPS-001 no
  texto da resposta), sem trio. O pipeline custa mais que o bug.
- **Pergunta/diagnóstico:** o deliverable é o parecer — nada de implementar (T-boundary).
- **Decisão arquitetural** (colide com §1/§4 do master map, novo módulo Prisma vs DynamicTable
  ambíguo): não roteie geração — exija ADR + seu sinal humano primeiro.
- **Tarefa contábil:** sempre com a persona `luminaris-accounting-architect` anexando parecer
  ao plano (o orquestrador já faz; confira que o parecer veio).

## 6. Higiene entre sessões

- Sessões concorrentes: cada uma em seu worktree (memória: checkout pode ser roubado por outra
  sessão DEPOIS de verificado).
- Revisor nunca é a sessão que implementou (norma dura da casa).
- Todo bug que escapar: pergunte "qual gate teria pego?" e transforme em patch de gate/skill —
  foi assim que P3/P4 nasceram. **Com uma condição, acrescentada em 2026-08-09 e medida:** só vale a
  pena se o gate proposto **lê o APP**. Gate que lê texto sobre o app aumenta a superfície a auditar
  sem mover o produto — entre 2026-08-02 e 08-08 o `bancada-gate.mjs` foi de **217 para 822 linhas** e
  de **9 para 17 checagens**, e no mesmo período as correções emitidas mudaram **0 linha de código de
  aplicação**. Se o gate que "teria pego" não roda o app, **registre o achado e não escreva o gate**;
  a resposta certa é um oráculo, não mais uma checagem. Ver `ORACLE-DEFICIT.md` §2.1–§2.2.
  **Desfecho (2026-08-09):** o dono desligou a bancada inteira por causa dessa medida — os dois gates
  e o `docs/audit/` inteiro saíram do repositório (`b617d8f1`). Enquanto houver oráculo externo aberto
  há >14 dias no Bloco A, **não se monta aparato de auditoria novo**. Isto não é conselho; é o estado.
- Screenshot/validação viva de tela `withAuth`: build de produção, nunca `next dev`; servidor
  fresco do commit exato (memória: stale dev server já mentiu antes).

---

## 7. Você não precisa ser o especialista (OPS-006)

O dono deste repo não é dev sênior nem especialista em fiscal/contabilidade. Isso **não** é um limite
do projeto — é uma divisão de trabalho que precisava estar escrita. A regra do agente está em
`_OPERATING-GATES.md` **[OPS-006]**; o que muda do seu lado:

**Três respostas que você sempre pode dar, e que fecham a pergunta:**

1. **"Aceito o recomendado."** Toda pergunta tem de vir com recomendação. Isso é resposta completa,
   não é abdicar.
2. **"Não sei, isso é do contador."** Se a pergunta exige saber que conta debitar, qual CFOP, ou se
   um aviso do PVA é grave — a pergunta foi mal formada. Devolver assim é o comportamento certo.
3. **"Rodei e vi isto: `<cola o que apareceu>`."** Você fornece **observação**; o veredito é do
   agente ou do contador. Nunca precisa julgar se o que você viu está certo.

**Se você travar duas vezes na mesma frente, o problema é a fatia, não você.** Peça: *"reformula
como consequência, não como opção técnica"*.

### O que o nível da pergunta significa pra você

Toda pergunta chega etiquetada (`C<n> · D<n>` — escala em `DECISION-SCALE.md`). Você só precisa ler
o **D**:

| Etiqueta | O que se espera de você | Quanto tempo |
|---|---|---|
| **D1 · D2** | **Nada.** Não vira pergunta — eu decido e anoto. Se discordar depois, é barato reverter | 0 |
| **D3** | Uma escolha, com recomendação pronta. *"Aceito o recomendado"* fecha | segundos |
| **D4** | **Pare e leia.** Toca dado ou schema que já existe; desfazer é caro. Vem com ADR | minutos |
| **D5** | **Nada sai daqui sem você.** Arquivo fiscal, dinheiro, dado a terceiro. Exige também um oráculo externo (contador/PVA) | o que precisar |

E o **C** te diz de quem é a resposta — se vier **C3** (contábil/fiscal/legal), a pergunta está mal
endereçada: é do contador, não sua. Devolver *"isso é C3, não é meu"* é o comportamento certo.

### O que da fila trava em você — reclassificado

Os quatro itens do Bloco A não têm o mesmo custo, e tratá-los como um bloco só é o que os manteve
parados. Pela classificação do OPS-006 §1:

| Bloco A | Tipo real | Precisa de especialista? |
|---|---|---|
| **4 — sign-offs de browser** (upload OFX/CNAB por clique, recibos PDF, carimbo final) | **acesso à realidade** — é clicar e olhar | **Não. Nenhum.** É o único item que você fecha sozinho hoje |
| **5 — Chromium smoke-launch no deploy** | acesso à realidade | Não — só relevante no próximo deploy real |
| **3 — sign-off no PVA** (ECD/Apuração/ECF) | **misto** — gerar+importar é seu; **julgar o que o PVA reclamar não é** | Só na 2ª metade. Sua parte: rodar e **colar a saída** |
| **6 — arquivo oficial RFB "PJ em Geral"** | acesso à realidade (baixar um arquivo público) | **A verificar** — está registrado como "espera o contador", mas pode ser só um download. Vale confirmar antes de continuar esperando |

**Ordem sugerida por isso:** 4 → 5 → 3 (só a metade que é sua) → 6. O item **4** é o que destrava
mais e não exige nada que você não tenha.
