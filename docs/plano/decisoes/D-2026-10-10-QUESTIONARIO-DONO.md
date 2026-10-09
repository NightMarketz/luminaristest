---
id: "D-2026-10-10-QUESTIONARIO-DONO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Questionário do dono de 10/10: F-PR4-8/10 (X14), caixa vira pedido ao contador, F-GOV-1, executa F5 PR-2/3 e CSLL-LC224, fecha #588/#590"
estado: "decided"
autorizacao: "dono, chat, 2026-10-10: respostas Q1..Q7 do QUESTIONARIO-DONO-2026-10-10 + autorização permanente da mesma noite: \"O que for liberando pra fazer por conta do que esta sendo feito aqui e não depende de mim, pode ir fazendo\""
atualizado: "2026-10-10"
---
# D-2026-10-10-QUESTIONARIO-DONO — respostas do questionário de 10/10

**Estado:** `decided`. Questionário: [`QUESTIONARIO-DONO-2026-10-10.md`](../QUESTIONARIO-DONO-2026-10-10.md).
Base das recomendações: pacote da persona contábil de 09/10. A base legal não foi conferida de novo naquela noite
(o Planalto deu ECONNRESET); os artigos vêm da `PESQUISA-X14-PR4-LACUNAS-2026-10-09.md`.

## Cédulas

| Q | Fork / item | Decisão do dono | Efeito |
|---|---|---|---|
| Q1 | F-PR4-8 teto do ISS ausente ([[X14]]) | (a) erro `PARAMETRO_LEGAL_AUSENTE` só no Anexo III/IV antes de 2033 | executa (autorização permanente de 10/10), PR sem merge |
| Q2 | F-PR4-10 alerta NFSE_DIVERGE do ME ([[X14]]) | (a) tira `LOCACAO_MOVEL` da soma + documento municipal informativo até 31/10/2026 | executa, PR sem merge |
| Q3.1 | F-PR4-12 regime de caixa ([[X14]]) | **Sim (b)** — 1ª resposta foi "Não sei / perguntar ao contador", substituída na mesma noite: campo novo no perfil fiscal (regime de apuração do Simples: caixa ou competência); o alerta NFSE_DIVERGE vira informativo para quem é de caixa; tarefa imediata de auditar se a base do DAS aplica a variante por recebimento | executa (campo + alerta) + auditoria da base do DAS, PR sem merge |
| Q4 | F-GOV-1 consulta ao CRC-SP ([[GOV-CONTADOR]]) | (a) enviar agora; não vender "com contador incluso" até a resposta | o dono envia `CONSULTA-CRC-SP-2026-10-02-F-GOV-1.md` |
| Q5 | [[F5]] PR-2 e PR-3 | "Executa o PR-2 e o PR-3, sem merge" | PR-3 fica engatilhado até a sonda de colunas no M2 |
| Q6 | [[CSLL-LC224]] | executa depois de conferir P-CA-1/2 na fonte oficial; P-CA-3/4 viram aviso no PR | P-CA-1/2 fechadas em 10/10 (LC 224 art. 7º e art. 14 I b no Planalto; Lei 7.689 compilada), confirmam o BRIEF → executa liberado. Achado fora do BRIEF: Lei 15.525/2026 cria CSLL de 9% para resseguradora local, sem código no leiaute 12 da ECF — aviso no PR |
| Q7 | PRs #588 e #590 | (a) fechar sem merge | fechados em 10/10 (o #591 já corrigiu na raiz) |
