---
id: "D-2026-11-21-FORKS-DA-CAIXA"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks da caixa de lacunas decididos pelo dono em 21/11 (7 lacunas)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-21, questionário (AskUserQuestion) da sessão maestro de 21/11; não é 'executa'"
atualizado: "2026-11-24"
---
# D-2026-11-21 — Forks da caixa de lacunas decididos pelo dono

Decisão do dono, no chat, em 21/11/2026, por AskUserQuestion. Cada fork abaixo é a escolha registrada; a sessão que
executar não reabre a escolha.

| Lacuna | Fork | Decisão |
| --- | --- | --- |
| L-20261114-222614-b556 | Onde morar as primitivas de plataforma (models/dates, money, AccountingScope, AuditService) | Subir para camada compartilhada, fora de `features/accounting` |
| L-20261115-013846-1cb6 | Organização da allowlist de auditoria | Allowlist por domínio, com composição central |
| L-20261115-013846-764a | Mensagens do servidor em português fixo | Catálogo de mensagens por módulo, incremental |
| L-20261121-034042-051e | Classificação da DRE para conta de insumo | Classificar pelo papel `insumoExpenseAccountId`, não pelo prefixo |
| L-20261120-214158-7928 | Fechamento definitivo com obrigações em aberto | Exigir obrigações quitadas ou entregues (regra na máquina de estados) |
| L-20261121-040921-13dd | Conta canônica em escopo legado com código colidido | Identificar pelo papel/natureza, não só pelo código |
| L-20261120-221259-a3a5 | Partição do Anexo III 2027-2028 soma 100,01% | Reescalar as fatias para somar 100% e documentar |

Pendentes (não decididos aqui): L-20261120-194338-0208 (CLT art. 466 §1º) e L-20261120-220809-7064 (LC 123 art. 13
§§10–11), por dependerem de leitura legal antes da pergunta ao dono.

**Como aplicar:** cada decisão vira sessão de instrumentação/correção ou de planejamento conforme a classe original
da lacuna. Nenhuma execução está autorizada por esta cédula sozinha; o `executa` continua sendo do dono no chat.

**Publicação (24/11):** a cédula ficou não rastreada na worktree `claude/roda-maestro-dia-099ee9` desde 21/11. A sessão maestro de 24/11 a publicou sem mudar o conteúdo, só com o frontmatter e esta nota. Sobre a L-20261120-194338-0208: a lacuna registra "Decidido pelo dono 21/11" (comissão no mês da venda), mas esta cédula a lista como pendente. Vale o destino da lacuna, e a divergência está anotada em `D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA.md`. A L-20261120-220809-7064 foi fechada em 24/11 por leitura da norma (mesma cédula).
