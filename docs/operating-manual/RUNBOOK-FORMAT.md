# Runbook humano — formato padrão

> **Isto não é prompt e não deve ser colado em agente nenhum.** Está fora de `.claude/skills/` de
> propósito: skill é a superfície que o agente enxerga, e este artefato não pertence a ela.

## Por que existe um formato separado

Cinco itens do plano contábil são gates que **nenhum agente fecha** — não por falta de ferramenta, mas
por natureza. Um agente que receba "faça o sign-off no PVA" produz **narrativa plausível**, que é
indistinguível de execução real quando o registro aceita "fiz e funcionou". É a classe de falha que o
`ORACLE-DEFICIT.md` descreve e que a moratória do `CLAUDE.md` protege.

O formato abaixo tem três propriedades que um prompt não teria, e cada uma resiste a um modo de fraude:

| Propriedade | O que ela impede |
|---|---|
| **Evidência é artefato colado**, nunca frase | Narrativa plausível — protocolo do PVA, screenshot, saída de comando não se inventam |
| **Desfecho em três estados**, não binário | O binário convida a forçar um "passou"; `BLOQUEADO` dá saída honesta |
| **Assinatura do executor** | Nenhum agente pode preencher — é o campo que ancora a responsabilidade num humano |

## Fronteira do agente — o que ele pode e o que não pode

- **PODE preparar:** redigir os passos, verificar e listar as pré-condições, apurar comandos e caminhos,
  e depois **entregar o runbook em branco** ao humano.
- **NÃO PODE:** preencher EVIDÊNCIA, marcar desfecho, ou assinar. Runbook sem assinatura de executor
  humano é **nulo** — não vale como gate fechado, não promove nó de mapa, não libera deploy.

## Os cinco runbooks e onde o desfecho é registrado

| ID | Gate | Rastreio a atualizar |
|---|---|---|
| **H1** | Sign-off no PVA — ECD → Apuração → ECF (nessa ordem: a ECD de-risca a família) | Master map §5.1 Bloco A, item 3 |
| **H2** | Browser sign-off final — carimbo humano, upload de extrato **por clique** (OFX/CNAB), recibos PDF | §5.1 Bloco A, item 4 (+ §5.2 se achar bug) |
| **M2** | 1º deploy real + Chromium smoke-launch-gate | §5.1 Bloco A, item 5 |
| **X1** | NF-e 4.00 real anonimizada como fixture | §3 e fila item 11 — destrava o merge P1 |
| **X2** | Import do arquivo oficial RFB "PJ em Geral" | §5.1 Bloco A, item 6 |

---

## O formato

```
# RUNBOOK: [H1 — Sign-off PVA | H2 | M2 | X1 | X2]

Executor: [nome — humano]           Data: [____]
Autorização: [decisão que pede esta execução — doc + data]
Pré-condições: [o que precisa estar pronto antes — com verificação:
  "branch X integrada (commit ___)", "dado Y disponível em ___"]

## Passos
Cada passo tem três campos. EVIDÊNCIA é obrigatória e é sempre um
artefato colado ou anexado (screenshot, saída de comando, protocolo,
nº de recibo) — nunca uma frase descrevendo que deu certo.

1. [Ação exata, com onde e como]
   Resultado esperado: [o que deve aparecer/acontecer]
   EVIDÊNCIA: [colar aqui]

2. [...]
   Resultado esperado: [...]
   EVIDÊNCIA: [...]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha do plano/mapa atualizada
  com o desfecho + data]
- Assinatura do executor: ____________
```

---

## Notas de operação neste repo

**Onde os runbooks preenchidos vivem:** `docs/accounting/` — ao lado dos `SMOKE-MIGRATION-GATE-*.md`,
que são o precedente do gênero (13 relatórios de execução com evidência colada, antes de virarem script).

**O que conta como evidência, por gate:**

| Gate | Evidência aceitável |
|---|---|
| H1 · PVA | Tela ou protocolo do validador oficial com o resultado do import; lista de críticas se houver |
| H2 · Browser | Screenshot da tela + console limpo; para upload, o arquivo subido **por clique**, não por fetch |
| M2 · Deploy | Saída do `npm run smoke:migration`, do launch do Chromium e do `npm run logs:errors` pós-deploy |
| X1 · NF-e | O teste `nfe-fixture-provenance.test.ts` **verde** — o CI é a evidência, e ele não se deixa convencer |
| X2 · RFB | Saída do conversor + a rejeição de um de-para inválido (prova de que a validação ficou **viva**, não só instalada) |

**FALHOU não é fracasso da execução — é resultado.** No H1 especialmente: crítica do PVA é achado de
**domínio**, vira ADR ou emenda, não hotfix. A varredura de browser de 2026-07-23 é o precedente: ela
"falhou" achando 2 bugs de runtime, e foi a sessão mais produtiva do gate.

**Pré-condição de ambiente que costuma ser esquecida:** o `dev.db` populado fica em
`server/prisma/prisma/dev.db` (o `server/prisma/dev.db` é isca de 0 byte), e telas atrás de `withAuth`
só valem contra **build de produção**, nunca `next dev`. Servidor de dev longo serve código velho —
reinicie do commit exato antes de confiar em qualquer tela.
