---
id: "D-2026-11-21-CICLO-FISCAL-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "CICLO-FISCAL: F-CF-1..10 ratificados por questionário (F-CF-4 e F-CF-5 contra a recomendação; F-CF-6 perguntado de novo)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-21, questionário (AskUserQuestion) da sessao-planejamento do nó CICLO-FISCAL, sob a autorização \"Executa tudo pra liberar e poder rodar em xhigh até terminar\"; não é 'executa' de código nem autoriza merge"
atualizado: "2026-11-21"
---
# D-2026-11-21-CICLO-FISCAL-FORKS

**Estado:** `decided`. **Autorização:** dono, chat, 21/11/2026 (citação no frontmatter). **Não é `executa`**
(ORCH-006). Com isto o BRIEF fica sem fork pendente, mas o código do [[CICLO-FISCAL]] continua pedindo um "executa"
citável (`D-2026-10-28-FLUXO-AUTONOMO`).

BRIEF: [`BE-INCR-CICLO-FISCAL-brief.md`](../../accounting/BE-INCR-CICLO-FISCAL-brief.md) §8.

## Cédula

| Fork | Pergunta (resumo) | Resposta do dono | Recomendação |
|---|---|---|---|
| F-CF-1 | calendário gravado ou derivado | **Tabela própria** (`ObrigacaoFiscalOcorrencia`) | = |
| F-CF-2 | prazo como dado ou código | **Linha de parâmetro legal** (`PRAZO_OBRIGACAO`) | = |
| F-CF-3 | o job confirma sem humano? | **Por política**, opt-in por família, desligado por padrão | = |
| F-CF-4 | que arquivos o job gera | **+ rascunho ECD/ECF** (Reinf, MIT, ECD, ECF) | ≠ (era Reinf + MIT) |
| F-CF-4a | quando gera o ECD/ECF | **Exercício encerrado**; de novo só se o razão do ano mudar | = |
| F-CF-4b | de onde vem a entrada do ECD/ECF | **Perfil do ano + entrada da última geração** (coluna nova `requestJson`); a 1ª é do humano | = |
| F-CF-5 | Simples: prévia ou provisão estimada | **Provisão estimada**, estornada no registro do DAS oficial | ≠ (era parar na prévia) |
| F-CF-5a | a estimada segue a política? | **Mesma política** (família `SIMPLES`, opt-in) e dia de corte | = |
| F-CF-5b | período da competência fechado no registro do DAS | **Ajuste no período aberto**: a estimada fica, a diferença vai ao 1º período aberto (mudança de estimativa, CPC 23 a conferir) | = |
| F-CF-6 | quando confirma e provisiona | **Dia de corte, com o período aberto** (padrão: 5º dia útil do mês seguinte) | = (corrigida) |
| F-CF-7 | como o usuário fica sabendo | **No calendário** (`VENCE_EM_BREVE`); e-mail com o `EMAIL-TRANSPORT` | = |
| F-CF-8 | dado muda depois de confirmada | **Reconfirma se nada foi entregue**; se foi, só avisa | = |
| F-CF-9 | quais obrigações | **Só o que o sistema apura** (FGTS/eSocial com o PES-4; ISS quando houver apuração) | = |
| F-CF-10 | qual unidade no escopo | **Histórico ou única**; 2+ unidades sem histórico ⇒ aguardando, campo no perfil do ano | = |

## Notas

1. **F-CF-6 perguntado duas vezes.** Na 1ª rodada, a recomendação era "a confirmação automática exige `SOFT_CLOSED`", e
   o dono a aceitou. A sessão então leu o `PostingService` (`:131`, `:148`): o `postEntry` exige período `OPEN`, e com
   aquela resposta a provisão ficaria sempre pendente. A pergunta foi refeita com isso explícito. **Vale a 2ª resposta.**
   Ela também substitui a janela "≤ 5 dias úteis antes do vencimento" do F-CF-3.
2. **F-CF-5 → (b) emenda o F-SN-10 → (a)** ([[D-2026-10-07-SIMPLES-FORKS]]) só neste ponto. A provisão **definitiva**
   continua pelo valor oficial do DAS. A estimada é lançada pelo job. No `registrarDas`, com o período aberto, ela é
   estornada e a oficial lançada (uma viva). Com o período fechado, a estimada fica e só a diferença vai ao 1º período
   aberto (F-CF-5b). BRIEF item 17b.
3. **F-CF-4 → (b)** acrescenta o item 21 (rascunho de ECD/ECF por `*PeloSistema`). Assinar e transmitir no PVA continua
   humano (gate H1).
4. **3ª rodada (F-CF-4b, F-CF-5b).** Surgiu na revisão do BRIEF depois das respostas contra a recomendação. O
   `postEntry`/`reverseEntry` exigem `OPEN`, então o estorno da estimada falha com o período fechado. E a geração do
   SPED recebe entrada digitada, sem pré-preenchimento. As duas perguntas foram ao dono no mesmo dia.
