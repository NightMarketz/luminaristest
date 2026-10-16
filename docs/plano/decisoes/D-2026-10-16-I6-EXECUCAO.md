---
id: "D-2026-10-16-I6-EXECUCAO"
tipo: "decisao"
dominio: "plataforma"
titulo: "I6 — F-I6-11 e as lacunas de execução L-I6-1..3 ratificadas por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-16: \"Pode começar agora e disparar as sessões com brief autorizado\" ('executa' do I6, merge não autorizado); cédulas respondidas por questionário na mesma data, relayadas pela sessão de orquestração"
atualizado: "2026-10-16"
---
# D-2026-10-16-I6-EXECUCAO — decisões da execução do [[I6]]

**Estado:** `decided`. 4 cédulas: o fork F-I6-11, deixado pendente no BRIEF, e as 3 lacunas que a `sessao-feature` achou
durante a execução. Os forks F-I6-1..10 estão em [[D-2026-10-15-I6-FORKS]].

| Cédula | Opções | Resposta literal | Decisão |
|---|---|---|---|
| F-I6-11 OpenAPI dos códigos novos | (a) componente compartilhado referenciado por endpoint · (b) descrição geral da API | (a) | **(a)** — `UnitNotFound` 404 / `UnitDeleted` 409 em `components/responses` |
| L-I6-1 endpoint que já declara `'404'`/`'409'` (77 e 19 de 186) | (A) `$ref` só onde o código está livre · (B) substituir pelo componente | *"Substituir pelo componente"* | **(B)** — contra a recomendação (A); o que a resposta antiga dizia de específico vai para a `description` da operação |
| L-I6-2 (BRIEF §7.1) GETs que gravam só trilha de auditoria: `verify-chain`, download de anexo, download de job de exportação | (A) `write` · (B) `read` · (C) misto | *"Leitura nas 3"* | **(B)** — em unidade apagada respondem 200 e a trilha segue sendo gravada |
| L-I6-3 `crmController.ts` só usa a função síncrona no hook Won interno (regra do item 5 × baseline zero do item 13) | (A) exceção nomeada na regra · (B) o hook passa ao resolver · (C) mover o hook | *"Exceção nomeada"* | **(A)** — `pathNot` só para `crmController.ts`, motivo no ADR-ARCH-BOUNDARIES; o comportamento do hook não muda |

BRIEF: [`docs/accounting/BE-INCR-SCOPE-UNIT-GUARD-brief.md`](../../accounting/BE-INCR-SCOPE-UNIT-GUARD-brief.md) §1, §4 e §9.
PRs: #732 → #737 → #742 → #743 → #744 (empilhados; merge só com OK do dono, PR por PR).
