# Próximos passos — 2026-08-31

> **Substitui** `PROXIMOS-PASSOS-2026-08-28.md`, que segue válido como registro histórico. O que mudou
> em três dias: o arquivo da RFB deixou de ser espera por terceiro, a ordem dos gates ganhou uma
> dependência que não era preferência, e o insumo ausente §8.3 daquele doc foi **fechado por varredura**.
>
> **A frase que resume:** *continua não havendo item de fila que um agente possa executar hoje* — e
> agora isso está **medido**, não presumido. O gargalo é humano e é o mesmo: B-4, X2, H1, H2, M2.
>
> **O que este doc é:** enumeração e ordem do que já está autorizado. **O que não é:** ratificação.
> Nenhum fork abaixo se auto-ratifica (ORCH-006), e nenhum runbook se auto-assina.

---

## 1. A ordem — com uma mudança de hoje

| # | Gate | Runbook | Por que nesta posição |
|---|---|---|---|
| 1 | **B-4** — ensaio de restauração | `RUNBOOK-B4-RESTORE-REHEARSAL.md` | **Dependência, não preferência.** A pré-condição **P2** do H1 exige backup do `dev.db` real porque o **passo 1 do H1 escreve no razão**. Sem B-4, o H1 começa em desfecho BLOQUEADO. E não há migração *down* no repositório (B-2 diferido): o backup **é** o rollback. |
| 2 | **X2** — import do referencial RFB | `RUNBOOK-X2-RFB-REFERENCIAL.md` | **Novo nesta posição.** Antes vinha depois; com o arquivo em mãos, importar **antes** do H1 faz a cobertura do passo 3 do H1 medir alguma coisa. Sem ele você leva ao PVA um de-para cuja validade ninguém checou — o gate atual só confere *presença* de código, não *existência* na tabela da Receita. Mesmo ambiente do H1: server de produção contra o `dev.db` real, login admin. |
| 3 | **H1** — PVA | `RUNBOOK-H1-PVA.md` | Fecha E-2 e é o único jeito de provar os 3 SPEDs. Destrava o P2. Confira a pré-condição **P2b** (migrações aplicadas + binding `Active`) antes: sem isso o `npm start` aborta com exit 1. |
| 4 | **H2** — sign-off de browser | `RUNBOOK-H2-BROWSER-SIGNOFF.md` | Mesmo ambiente já de pé do passo 3. Inclui o fluxo de salão pós-swap da prensa de binding. |
| 5 | **M2** — 1º deploy real | `RUNBOOK-M2-DEPLOY-SMOKE.md` | Antes de **operar** com cliente, não antes de **testar**. Alvo já decidido em ADR; falta provisionar o host. |

**X2 e H1 cabem na mesma sessão de máquina** — um sobe o ambiente, o outro reusa.

> **[EMENDA 2026-08-31] no X2:** o arquivo oficial foi baixado
> (`Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_2026.xlsx`, de
> <http://sped.rfb.gov.br/arquivo/download/8002>). Duas ressalvas, ambas detalhadas na emenda do próprio
> runbook: o arquivo é **XLSX** e o conversor lê texto pipe (ou pule o conversor, ou use
> `--tipo 4 --parent 5`); e ele é do **ano-calendário 2025**, que precisa bater com o exercício
> encerrado no passo 1 do H1.

**Não existe sexto item.** `RUNBOOK-H3-P2-CLINICA.md` existe e está em branco, mas depende do P2, que
depende dos passos 3 e 4 acima.

---

## 2. O insumo ausente §8.3 do doc de 28/08 — FECHADO

Aquele doc registrou explicitamente que não sabia se havia trabalho executável fora do que tinha lido.
Varredura de 2026-08-31 (agente separado, read-only): `docs/adr/` inteiro, `docs/` fora de
`docs/accounting/`, corpos de commit/PR recentes, `TODO`/`FIXME` em `server/src` e `my-app`,
`skill-audit`, abas do `my-app`, `gh pr list --state open`.

**Resultado: nada passa nas quatro condições** (autorizado · especificado · não é gate humano · não
bloqueado), exceto um comentário obsoleto de **uma linha** em `scripts/activate-salon-binding.mjs:3`,
que cita `SALON_BINDING_V1` — identificador que morreu no rename RN. Resíduo já declarado na PR #222,
com task chip aberto.

Os que chegaram mais perto e onde morreram:

| Candidato | Morreu em |
|---|---|
| **FE-INCR-AGING** | **falta spec** — ver §3 |
| Item 6 (import do referencial) | **é gate humano** — virou o passo 2 do §1 |
| **F-W2F-3** (rescan do item fault-isolated) | **fork aberto do dono** — ver §4 |

Descartados com motivo registrado, para o insumo não reabrir: `skill-audit` com **0 findings** em
`validate`/`governance-check`/`sync-metadata`/`controls`/`self-check`/`wiring`; `docs/tech-debt/`
e `docs/crm/` sem ADR nem sinal citável; `GAP-MAP.md` pedindo instrumento novo (vedado pela regra
permanente do `CLAUDE.md` com 4 de 4 oráculos do Bloco A abertos); FE de recibos, CRUD de estoque e
F-AD5 diferidos por decisão explícita; nenhuma PR aberta carregando resíduo.

> **Correção a um achado da varredura:** ela reportou os cabeçalhos de `ADR-ACCOUNTING-TIMEZONE` e
> `ADR-RECIBOS` como carimbos stale. Conferindo: o texto diz *"implementação NÃO iniciada **nesta
> sessão**"* — o qualificador torna a frase correta. Não há doc rot a consertar ali.

---

## 3. FE-INCR-AGING — disponível, e ainda assim não é o próximo passo

O backend de aging está vivo (`GET /reports/aging`, `AgingReportService` first-class, tie-out na PR
#143). A tela **nunca foi feita** — e o buraco é maior do que o mapa registrava: **zero** ocorrência de
`aging` em todo o `my-app`; os únicos hits são a substring de `staging`. Não existe componente **nem
função no cliente de API**. O `ACCOUNTING-MASTER-MAP.md` listava o resíduo do B3 como só browser
sign-off; **emendado hoje**.

**Por que não é o próximo passo, mesmo estando desbloqueado:**

1. **Falta spec.** O ADR só diz "clona o padrão dos outros reports" — ponteiro, não spec. Fechar exige
   `sessao-planejamento` produzindo BRIEF **antes** de qualquer `sessao-feature`.
2. **Não destrava nada.** Nenhum gate humano, nenhum incremento, nenhuma decisão depende dela.
3. **É dívida de FE declarada**, coerente com a estratégia de tela-diferida já adotada no projeto.

**Se você quiser uma frente paralela** que não toque o caminho crítico, esta é a única candidata real —
e o primeiro passo dela é um BRIEF, não código. **Precisa do seu sinal** (ORCH-006).

---

## 4. Forks abertos — dois, não um

| Fork | Decisão pendente | Recomendação | Custo de deixar parado |
|---|---|---|---|
| **F-Q1** | Promover **ADR-P2** a `Accepted` agora, ou esperar os gates humanos? | **(a) esperar.** O ADR-P2 tem como pré-condição *"vertical 1 validado"*, que é falso hoje. O `Draft` não é burocracia — é o que segura a execução; promovê-lo cedo troca bloqueio real por bloqueio de papel. Reabrir se os gates passarem de meses (hoje ~14 dias). | Baixo — o P2 está bloqueado de qualquer forma |
| **F-W2F-3** | Item que falha no reconcile é pulado e a watermark avança por cima dele; ele nunca é re-varrido. Rescan periódico? Isentar o item falho da marca? | **Sem recomendação de forma** — não li o job a fundo o bastante para propor implementação. O **princípio** que eu defenderia: a marca não deve ultrapassar uma falha não resolvida. Confirmar lendo `accountingSyncReconcile.job.ts` antes de fixar a opção. | Silencioso: um item pode sumir da reconciliação sem ninguém notar |

> **Por que eu recomendo e não ratifico.** Decidir **ordem e prioridade** de trabalho já autorizado é
> julgamento que cabe a mim. **Ratificar fork** não cabe — é ORCH-006, e vale a mesma regra da
> assinatura de runbook: decisão de agente ali é nula por desenho, não por cautela.

---

## 5. A pergunta que governa tudo e ainda não tem resposta

**Qual o regime tributário do primeiro cliente real?**

Optante do **Simples Nacional** é dispensado de ECD e ECF — e paga **DAS todo mês**. Se for esse o caso,
o H1/PVA continua sendo o oráculo certo do **módulo**, mas deixa de ser o oráculo do **produto**, e a
apuração mensal (registrada hoje no §5 do master map como diferida) passa na frente do Núcleo 5 inteiro.

Não é fork que se ratifique num questionário: muda o alvo do produto, não a implementação.

---

## 6. O que NÃO fazer

- **Não recriar aparato de auditoria** — nem gate, nem rodada, nem mais um revisor. Regra permanente do
  `CLAUDE.md` enquanto houver item do Bloco A travado em oráculo externo há mais de 14 dias (hoje 4/4).
- **Não abrir frente nova** sem ADR + sinal do dono (ORCH-006). Inclui a apuração de tributos, que hoje
  está **registrada, não aberta**.
- **Não apagar** `nfe-fase-a-preserved` nem `nfe-fase-b-preserved`.
- **Não tratar runbook preenchido por agente como sign-off.** Nulo por desenho.
- **Não disparar `sessao-feature` no P2.** Fork ratificado ≠ execução autorizada; o ADR-P2 segue `Draft`.

---

## 7. O que eu não sei

1. **Quanto tempo os gates humanos vão levar.** Governa a ordem inteira e a recomendação do F-Q1.
2. **O regime do primeiro cliente real** (§5) — insumo do dono, não do repositório.
3. **A forma certa do F-W2F-3** — declarado acima, não chutado.
4. **Se o Leiaute 12 corrente é o de 28/05/2026 ou o de 25/07/2026.** O portal SPED e a página do gov.br
   divergem; a página do gov.br é SPA e não entregou o link do arquivo. Conferir na hora do X2 e
   registrar versão/vigência, que o passo 2 do runbook exige de qualquer forma.
