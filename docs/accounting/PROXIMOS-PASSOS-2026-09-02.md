# Próximos passos — 2026-09-02

> **Substitui** `PROXIMOS-PASSOS-2026-09-01.md`, que segue válido como registro histórico. O que mudou
> em um dia: as cinco lacunas do fluxo venda→SPED **foram implementadas e mergeadas** (PR #259, merge
> `f28ac87c`; fold das linhas pelo #260), e o dono ratificou **duas decisões** que reordenam o fim da
> fila — o host do M2 e o regime tributário.
>
> **A frase que resume:** *a faixa de agente executável esvaziou de novo* — as LAC-A/C/D/E entraram em
> `main` no mesmo dia em que foram planejadas. O gargalo volta a ser humano, **mas mais barato do que
> era ontem**: o H2 perdeu o vermelho conhecido (botão Pagar quebrado) que garantiria FALHOU.
>
> **Autorizações citáveis desta emenda** (dono, 2026-09-02, em sessão):
> 1. *"Deixe o host para só na finalização do app."*
> 2. *"Regime tributário deve ser o mais completo que englobe todos os outros e produza prova de
>    evidencia que os runbooks exigem."* → **Lucro Real** como alvo, com a ordem do §1 resolvida por
>    fork ratificado (ver §2).
>
> **O que este doc é:** enumeração e ordem do que já está autorizado. **O que não é:** ratificação.

---

## 1. A ordem — dois itens novos no fim, nada mudou no começo

| # | Gate / frente | Runbook ou ciclo | Estado |
|---|---|---|---|
| 1 | **B-4** — ensaio de restauração | `RUNBOOK-B4-RESTORE-REHEARSAL.md` | Inalterado. Pré-condição P2 do H1: o backup **é** o rollback (não há migração *down*). |
| 2 | **X2** — import do referencial RFB | `RUNBOOK-X2-RFB-REFERENCIAL.md` | Inalterado. Arquivo oficial já baixado; ressalvas de XLSX × conversor pipe e ano-calendário 2025 na emenda do próprio runbook. |
| 3 | **H1** — PVA, **em Lucro Presumido** | `RUNBOOK-H1-PVA.md` | **Emendado 2026-09-02.** Roda em Presumido *de propósito* — é o que o serializer emite; prova a cadeia ECD + encerramento + ECF contra o validador oficial. Oráculo do **módulo**. |
| 4 | **H2** — sign-off de browser | `RUNBOOK-H2-BROWSER-SIGNOFF.md` | **Pré-condição LAC-A: CUMPRIDA** (#259). O fluxo de salão pós-swap agora tem Pagar/Cancelar/Devolver pela tela. |
| 5 | **ECF Fase 3 — Lucro Real** | ~~ADR + `sessao-planejamento` (**não autorizada ainda**)~~ **[EMENDA 2026-09-02] ADR escrito, Forks 1/5 ratificados, esqueleto MERGEADO (`02fc802b`, PR #263); falta o conteúdo de L/M/N (Forks 2/3/4, dependentes do Manual)** | **NOVA.** Blocos L (balanço/DRE), M (e-Lalur/e-Lacs), N (IRPJ/CSLL), `HASH_ECF_ANTERIOR` e `0010` parametrizável. Delta medido no §5.1 Bloco B item 10 do master map. |
| 6 | **H1 — 2ª passada, em Lucro Real** | `RUNBOOK-H1-PVA.md` (reexecução) | **NOVA. Obrigatória antes de operar cliente real.** É ela que prova a ECF do regime-alvo; o passo 3 não prova. |
| 7 | **M2** — provisionar host + 1º deploy | `RUNBOOK-M2-DEPLOY-SMOKE.md` | **Adiado por decisão do dono** — última tarefa antes de operar cliente real. Topologia ratificada (VPS própria, 1 instância/cliente, disco local) **continua valendo**; o adiamento é de provedor concreto. |
| **∥** | **NF-e — BE (rebase da `nfe-fase-b-preserved`) + FE (`FE-INCR-NFE`)** — **[EMENDA 2026-09-03]** | [CEDULA-DECISAO-2026-09-03-integracao.md](CEDULA-DECISAO-2026-09-03-integracao.md) §E | **NOVA, em PARALELO aos itens 1–4 (F-I3), começa agora (F-I6).** Destravada por decisão, não por dado: merge com fixture sintético e dívida declarada (**F-I2**); F-D1 reaberto → **rebasear**, não refazer (**F-I7**). Fecha o Núcleo 3 de 6/9 para 8/9; o 9/9 é o upload por clique no H2. |

**Sem custo de fila:** nenhum gate de 1 a 4 depende do host (todos rodam contra o `dev.db` real local),
e nenhum depende da ECF Fase 3 **nem da NF-e** (e a NF-e não depende de nenhum deles — cédula §E).

**Permanece diferida:** **LAC-B** — UI da Prensa de binding. O CLI atende até onboarding self-service/P2.

**[EMENDA 2026-09-03 — fechamento por módulo.** Doze decisões do dono (9 + rodadas 2 e 3)
([CEDULA-DECISAO-2026-09-03-modulos.md](CEDULA-DECISAO-2026-09-03-modulos.md)): partição contábil /
financeiro / fiscal ratificada (F-M1), escopo **máximo** nos três (F-M2/F-M3/F-M4 — reabre apuração de
tributos, EFD-Contribuições, DCTFWeb, baixa parcial, caixa projetado, remessa bancária, e-mail ao
contador, mais 4 telas do já-existente), ordem **contábil → financeiro → fiscal** (F-M6). A fila 1–7
acima **não muda**; as frentes novas entram por ADR + BRIEF, listadas na cédula §E. **Ação do dono com
maior latência: enviar hoje o [pedido ao contador](PEDIDO-CONTADOR-2026-09-03.md)** (F-M5) — os três
ADRs fiscais e a emenda do custo D3 esperam a resposta.**]

---

## 2. O regime — a pergunta de 31/08 está respondida, e a resposta tem três consequências

**Alvo: Lucro Real.** Registrado no §5 e no §5.1 Bloco B item 10 do `ACCOUNTING-MASTER-MAP.md`.

1. **O cenário de inversão morreu.** Lucro Real não dispensa ECD/ECF → o Núcleo 5 mantém a prioridade
   e a linha "Apuração de tributos" segue diferida. Era exatamente o risco que a pergunta guardava.
2. **Ressalva registrada:** Lucro Real **não engloba** o Simples de fato — DAS/PGDAS-D é obrigação
   paralela, não subconjunto, e **nenhum** dos dois regimes a gera.
3. **As duas cláusulas do critério divergiam hoje, e a divergência foi medida antes de aplicar:** o
   serializer é Presumido MVP (`server/src/lib/ecf.ts:4`), emite `FORMA_TRIB='5'` fixo (`:145`), deixa
   L/M/N como marcadores vazios (`:330`) e nem expõe `formaTrib` no `SpedEcfDto`. Levar Lucro Real ao
   PVA hoje seria **FALHOU garantido**, não um parâmetro diferente. Fork resolvido pelo dono: H1 em
   Presumido agora → ECF Fase 3 → 2ª passada do H1.

---

## 3. Faixa de agente — o que existe hoje

| Item | Ciclo | Estado |
|---|---|---|
| **ECF Fase 3 — Lucro Real** | ~~ADR + `sessao-planejamento`~~ `sessao-feature` (restante) | ~~**Alvo e ordem ratificados; execução NÃO autorizada** (ORCH-006). Primeiro passo é o ADR, não código.~~ **[EMENDA 2026-09-02]** ADR `Accepted` parcial, Forks **1** (endpoint dedicado) e **5** (trimestral) ratificados, `FORMA_TRIB` default `'1'` ratificado, e o **esqueleto foi implementado e mergeado** (`02fc802b`): 14 dos 18 itens do BRIEF. **Os 4 restantes seguem pausados** — Forks 2/3/4 exigem as seções L/M/N do Manual do Leiaute 12, que não está no repo. |
| **PRs abertas** — ~~[#250](https://github.com/NightMarketz/luminaristest/pull/250)~~ **[EMENDA 2026-09-02: #250 MERGEADA (`64d8e675`)]**, [#252](https://github.com/NightMarketz/luminaristest/pull/252), [#254](https://github.com/NightMarketz/luminaristest/pull/254) | `sessao-integracao` / `sessao-correcao` | ~~⚠️ A **#254** são 13 testes-guarda **vermelhos por desenho** (varredura date-only UTC shift): não pode entrar em `main` sem os fixes correspondentes. A #250 é um desses fixes.~~ **[EMENDA 2026-09-02: caracterização OBSOLETA.** Às 18:45Z a #254 deixou de ser só instrumentação — passou a carregar o ciclo completo (`fecha a classe date-only-utc-shift no frontend — 12 sites, forks F1..F5 ratificados`, +753/-110, 6 commits) e está **verde na CI** (10/10 checks `SUCCESS`). O que a bloqueia hoje é `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`, não teste vermelho: precisa de **rebase sobre `main`**, não dos fixes de terceiros.**] |
| **NF-e — BE + FE** | `sessao-integracao` (rebase da tag, regras pré-decididas na cédula §E2) → review → `sessao-planejamento` (`FE-INCR-NFE`) → `sessao-feature` | **[EMENDA 2026-09-03] PASSA nas quatro condições** — autorizado (F-I2/F-I6/F-I7, cédula §B), especificado (`BE-INCR-NFE-fase-b-spec.md` como spec de aceitação; BRIEF do FE a escrever), não é gate humano, não bloqueado (o XML real virou item E9 do Bloco A). |

Fora isso, **nada passa nas quatro condições** (autorizado · especificado · não é gate humano · não
bloqueado): as LAC estão mergeadas, o FE-INCR-AGING fechou no #248, o P2 depende do H1/H2.

---

## 4. Forks abertos — três

| Fork | Decisão pendente | Custo de deixar parado |
|---|---|---|
| **F-Q1** | Promover **ADR-P2** a `Accepted` agora ou esperar os gates humanos? Recomendação inalterada: **esperar** — a pré-condição "vertical 1 validado" é falsa hoje. | Baixo — o P2 está bloqueado de qualquer forma |
| **F-W2F-3** | Item que falha no reconcile é pulado e a watermark avança por cima dele; nunca é re-varrido. | Silencioso: um item some da reconciliação sem ninguém notar |
| **F-W2F-5** | Mesmo mecanismo do F-W2F-4 (marca congela com `failed>0`), agora para item **blocked por período**. Candidato aberto na cédula B². | Mesmo padrão do F-W2F-3 |

---

## 5. O que NÃO fazer

- **Não recriar aparato de auditoria.** Regra permanente do `CLAUDE.md` — Bloco A ainda tem oráculo
  externo aberto há mais de 14 dias.
- **Não abrir a ECF Fase 3 sem ADR + autorização de sessão.** A ratificação fixou **alvo e ordem**,
  não execução.
- ~~**Não mergear a #254 sozinha** — os 13 testes são vermelhos por desenho.~~ **[EMENDA 2026-09-02:
  REGRA OBSOLETA — não se aplica mais.** Verificado por `gh pr view 254` nesta data: a PR agora
  contém os fixes (12 sites) além dos guardas, está **verde na CI**, e o único bloqueio é conflito
  com `main`. A restrição vigente é outra: **rebasear a #254 antes de mergear** — a superfície de
  conflito é `JournalEntriesPanel.tsx` (+ teste), `accounting.service.ts`, `openapi.json` e
  `__dto-shapes__.json`; os dois últimos se resolvem por regeneração (`npm run docs:generate`,
  `UPDATE_DTO_SNAPSHOT=1`), nunca à mão.**]
- **Não apagar** `nfe-fase-a-preserved` nem `nfe-fase-b-preserved`. **[EMENDA 2026-09-03]** A `fase-b`
  agora é a **base do rebase** (F-I7), não só cópia de segurança; a `fase-a` segue histórico.
- **[EMENDA 2026-09-03] Não mergear a NF-e sem os 3 marcadores da dívida sintética** (F-I8): `it.todo`
  em `nfe-fixture-provenance.test.ts`, item E9 no Bloco A, emenda §10 no ADR-INCR-NFE. Dívida declarada
  em um lugar só é dívida esquecida.
- **Não tratar runbook preenchido por agente como sign-off.** Nulo por desenho.
- **Não pular a 2ª passada do H1** antes de cliente real: o passo 3 prova o módulo, não o regime-alvo.

---

## 6. O que eu não sei

1. **Quanto tempo os gates humanos vão levar** — governa a ordem inteira e a recomendação do F-Q1.
2. **O tamanho real da ECF Fase 3.** O delta está nomeado (blocos L/M/N + e-Lalur), não dimensionado;
   dimensionar é trabalho do ADR/BRIEF, não deste doc.
3. **A forma certa do F-W2F-3 e do F-W2F-5** — declarados, não chutados.
4. ~~**Se o Leiaute 12 corrente é o de 28/05/2026 ou o de 25/07/2026**~~ — **[EMENDA 2026-09-02]**
   **[RESOLVIDO 2026-09-02, fonte secundária — carimbo oficial `[DONO confere]`] **[CORRIGIDO 2026-09-03 — verificado no índice oficial <http://sped.rfb.gov.br/pasta/show/1644>: a atualização vigente do Manual Leiaute 12 é de **20/05/2026** (PDF `arquivo/show/8003`), anterior 28/04/2026; NÃO encontrei versão de 23/07 em nenhuma fonte — o "23/07" abaixo veio de fonte secundária (ATVI) e está SUPERADO. Detalhe: `TRIAGEM-CONTADOR-2026-09-03-SIMULACAO.md` §A.2.]**** A versão vigente do Manual da ECF Leiaute 12 (Anexo ao ADE Cofis nº 2/2026) **não é nem 28/05 nem 25/07**: recebeu atualização em **23/07/2026**, superando a de 20/05/2026. Fonte: ATVI, citando o Sped como origem; a página oficial `sped.rfb.gov.br` bloqueia fetch automatizado, então o carimbo exato de "Atualização" no PDF ainda deve ser conferido pelo dono antes de fechar o `layoutVersion`. Ressalva registrada: a resposta é sobre o **Manual** (PDF); o XLSX das Tabelas Dinâmicas já baixado carrega `28_05_2026` no nome, e se a atualização de 23/07 republicou também o XLSX é parte do que o dono confere na página oficial. Fecha também a pendência de versão do BRIEF da ECF Fase 3 (§4). Detalhe no
   `KITS-PREFLIGHT-2026-09-02.md`, kit do X2.
