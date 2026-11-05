---
id: "FIX-TESTES"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Correções de teste pela régua de 04/11: boot pós-rekey, textos da venda de pacote, pipeline do CRM pela pilha real, rotas contábeis sem integração, mensagens com id interno"
estado: "inflight"
estado_detalhe: "05/11 (fold, medido com gh): itens 1 (#1080) e 4 (#1089) e lotes 1–3 do item 5 (#1092, #1094, #1097) em main; itens 2 (#1078) e 3 (#1077) com guarda verde, à espera do merge do dono (classe vermelha); item 5 lote 4+ (120 lugares) aberto · 04/11: executa dos 5 BRIEFs e forks ratificados na recomendação (questionário); 5 BRIEFs escritos no PR #1075 (sem merge); Q1–Q5 do PR decididas por questionário ([[D-2026-11-04-APRENDIZADOS-TESTES]])."
autorizacao: "**EXECUTA** (dono, chat, 2026-11-04, questionário): \"Executa, forks na recomendação (Recomendado)\" — executa dos 5 BRIEFs inteiros (todos os lotes), forks ratificados na recomendação, sem merge; o lote 1 do item 5 espera a correção do IMO-1 (mesmo arquivo) · antes: dono, chat, 2026-11-04: \"Já vai atualizando todas os aprendizados nos locais onde são briefs, e onde já estiver implementado, você também já cria briefs de correção de acordo com o aprendizado.\" — só os BRIEFs (sessao-planejamento); sem código, sem 'executa' · dono, chat, 2026-11-04, questionário do #1075: Q5 \"Nó FIX-TESTES (Recomendado)\""
atualizado: "2026-11-05"
prs: ["#1075", "#1080", "#1089", "#1092", "#1094", "#1097", "#1077", "#1078"]
---
# FIX-TESTES — correções de teste pela régua de 04/11

**Estado:** `inflight` (05/11; andamento por item na seção abaixo da tabela). **EXECUTA** dos 5 BRIEFs inteiros (dono,
chat, 04/11, questionário: *"Executa, forks na recomendação (Recomendado)"*), sem merge, com os forks ratificados na recomendação. O lote 1 do item 5 (imobilizado)
espera a correção do IMO-1 entrar, porque toca o mesmo serviço e o mesmo teste.
**Autorização:** dono, chat, 04/11, para escrever os BRIEFs (campo `autorizacao`). Q5 do questionário do #1075 para
esta nota.
**Depende de:** — (o item 5 tem o 1º lote ligado ao IMO-1, #1053)
**Origem:** [[D-2026-11-04-APRENDIZADOS-TESTES]] · régua em
[`APRENDIZADOS-TESTES-2026-11-04.md`](../../operating-manual/APRENDIZADOS-TESTES-2026-11-04.md) · inventário de testes do
PR #1065.

## Itens

| # | BRIEF | Sessão | Forks |
|---|---|---|---|
| 1 | [`FIX-TESTES-I1B-BOOT-POS-REKEY`](../../accounting/FIX-TESTES-I1B-BOOT-POS-REKEY-brief.md): o boot relê o binding re-chaveado (passo 10 do RUNBOOK-I1B) | instrumentação → correção | ✅ F-I1B-1 a, F-I1B-2 a |
| 2 | [`FIX-TESTES-VENDA-PACOTE-TEXTOS`](../../accounting/FIX-TESTES-VENDA-PACOTE-TEXTOS-brief.md): os 5 avisos da venda de pacote pelo texto pt exibido | feature (vermelho → correção) | ✅ F-VPT-1 a, F-VPT-2 b, F-VPT-3 a |
| 3 | [`FIX-TESTES-CRM-PIPELINE-PILHA-REAL`](../../crm/FIX-TESTES-CRM-PIPELINE-PILHA-REAL-brief.md): 7 rotas do pipeline pela HTTP com repositório real | feature (vermelho → correção) | ✅ F-CRM-1 a, F-CRM-2 a |
| 4 | [`FIX-TESTES-REPO-FALSO-POR-ROTA`](../../accounting/FIX-TESTES-REPO-FALSO-POR-ROTA-brief.md): medição por rota (inventário, F-RF-1 a ✅) e lotes de integração | feature por lote | ✅ F-RF-2 a, F-RF-3 b |
| 5 | [`FIX-MENSAGENS-ID-INTERNO`](../../accounting/FIX-MENSAGENS-ID-INTERNO-brief.md): mensagem ao cliente com id interno, varredura de classe; 1º lote = imobilizado | instrumentação → correção, por lote | ✅ F-MSG-1 a, F-MSG-2 a1, F-MSG-3 a |

**Fora desta nota, por decisão (Q4):** o aperto do teste concorrente do imobilizado para `[200, 409]` vai na sessão de
correção do IMO-1 (#1053). O DFE-1 segue no PILOTO-DFE (#1067, F-PIL-5).

## Andamento (05/11, medido com `gh` e `git log origin/main`)

| # | Estado | PR |
|---|---|---|
| 1 | ✅ em main | #1080 |
| 2 | guarda verde 16/16 depois da correção; **espera o merge do dono** (classe vermelha) | #1078 |
| 3 | guarda verde 14/14 depois da correção do no-show duplicado; **espera o merge do dono** (classe vermelha, draft) | #1077 |
| 4 | ✅ em main; `/api/accounting` sem rota fora da integração | #1089 |
| 5 | lotes 1–3 ✅ em main; **lote 4 em diante aberto** (120 lugares, pelo corpo do #1096) | #1092, #1094, #1097 |

- **Fork novo do item 2** (dono, chat, 05/11/2026, questionário): *"Habilitar o botão (Recomendado)"*. Na Nova Venda,
  Rascunho e Finalizar desabilitam só por validade e envio, e o `handleSubmit` mostra o texto do aviso e troca de aba.
- **Fork do item 3** (dono, chat, 05/11/2026, questionário): *"Serviço cede"*. No no-show com revert, só o
  `LeadsPlugin` grava a atividade `meeting_no_show`.
- Os drafts #1093 e #1096 (guardas dos lotes 2 e 3 do item 5) foram substituídos pelas correções #1094 e #1097.
