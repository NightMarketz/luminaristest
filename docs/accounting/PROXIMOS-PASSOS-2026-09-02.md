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
| 5 | **ECF Fase 3 — Lucro Real** | ADR + `sessao-planejamento` (**não autorizada ainda**) | **NOVA.** Blocos L (balanço/DRE), M (e-Lalur/e-Lacs), N (IRPJ/CSLL), `HASH_ECF_ANTERIOR` e `0010` parametrizável. Delta medido no §5.1 Bloco B item 10 do master map. |
| 6 | **H1 — 2ª passada, em Lucro Real** | `RUNBOOK-H1-PVA.md` (reexecução) | **NOVA. Obrigatória antes de operar cliente real.** É ela que prova a ECF do regime-alvo; o passo 3 não prova. |
| 7 | **M2** — provisionar host + 1º deploy | `RUNBOOK-M2-DEPLOY-SMOKE.md` | **Adiado por decisão do dono** — última tarefa antes de operar cliente real. Topologia ratificada (VPS própria, 1 instância/cliente, disco local) **continua valendo**; o adiamento é de provedor concreto. |

**Sem custo de fila:** nenhum gate de 1 a 4 depende do host (todos rodam contra o `dev.db` real local),
e nenhum depende da ECF Fase 3.

**Permanece diferida:** **LAC-B** — UI da Prensa de binding. O CLI atende até onboarding self-service/P2.

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
| **ECF Fase 3 — Lucro Real** | ADR + `sessao-planejamento` | **Alvo e ordem ratificados; execução NÃO autorizada** (ORCH-006). Primeiro passo é o ADR, não código. |
| **PRs abertas** — [#250](https://github.com/NightMarketz/luminaristest/pull/250), [#252](https://github.com/NightMarketz/luminaristest/pull/252), [#254](https://github.com/NightMarketz/luminaristest/pull/254) | `sessao-integracao` / `sessao-correcao` | ⚠️ A **#254** são 13 testes-guarda **vermelhos por desenho** (varredura date-only UTC shift): não pode entrar em `main` sem os fixes correspondentes. A #250 é um desses fixes. |

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
- **Não mergear a #254 sozinha** — os 13 testes são vermelhos por desenho.
- **Não apagar** `nfe-fase-a-preserved` nem `nfe-fase-b-preserved`.
- **Não tratar runbook preenchido por agente como sign-off.** Nulo por desenho.
- **Não pular a 2ª passada do H1** antes de cliente real: o passo 3 prova o módulo, não o regime-alvo.

---

## 6. O que eu não sei

1. **Quanto tempo os gates humanos vão levar** — governa a ordem inteira e a recomendação do F-Q1.
2. **O tamanho real da ECF Fase 3.** O delta está nomeado (blocos L/M/N + e-Lalur), não dimensionado;
   dimensionar é trabalho do ADR/BRIEF, não deste doc.
3. **A forma certa do F-W2F-3 e do F-W2F-5** — declarados, não chutados.
4. ~~**Se o Leiaute 12 corrente é o de 28/05/2026 ou o de 25/07/2026**~~ — **[EMENDA 2026-09-02]**
   **[RESOLVIDO 2026-09-02, fonte secundária — carimbo oficial `[DONO confere]`]** A versão vigente do Manual da ECF Leiaute 12 (Anexo ao ADE Cofis nº 2/2026) **não é nem 28/05 nem 25/07**: recebeu atualização em **23/07/2026**, superando a de 20/05/2026. Fonte: ATVI, citando o Sped como origem; a página oficial `sped.rfb.gov.br` bloqueia fetch automatizado, então o carimbo exato de "Atualização" no PDF ainda deve ser conferido pelo dono antes de fechar o `layoutVersion`. Ressalva registrada: a resposta é sobre o **Manual** (PDF); o XLSX das Tabelas Dinâmicas já baixado carrega `28_05_2026` no nome, e se a atualização de 23/07 republicou também o XLSX é parte do que o dono confere na página oficial. Fecha também a pendência de versão do BRIEF da ECF Fase 3 (§4). Detalhe no
   `KITS-PREFLIGHT-2026-09-02.md`, kit do X2.
