---
id: "D-2026-10-15-FE-SIMPLES-PR-B-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacuna de spec do PR-B das telas do Simples Nacional (PDF do DAS) — por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-15, questionário na sessão de feature do PR-B — PDF do DAS: 'PR-B sem o PDF (Recomendado)'"
atualizado: "2026-10-15"
---
# D-2026-10-15-FE-SIMPLES-PR-B-LACUNAS — lacuna de spec do PR-B do [[FE-INCR-SIMPLES]]

**Estado:** `decided` (1 cédula, na recomendação).
**Autorização:** dono, chat, 15/10/2026, questionário, na sessão de feature do PR-B.

Origem: `docs/accounting/FE-INCR-SIMPLES-brief.md` item 9 ("PDF como `SourceDocument` [P4-5]") e §6 ("componente
canônico … de upload de `SourceDocument`: localizar na execução").

| Lacuna | O que a spec não decidia | Decisão | Contra? |
|---|---|---|---|
| Item 9 (PDF do DAS como `SourceDocument`, P4-5 a) | Não existe rota que crie um `SourceDocument` a partir de um arquivo: só `POST /journal-entries/:id/source-documents` (exige lançamento já existente — a provisão do DAS nasce no próprio PUT) e `POST /attachments` (devolve `DocumentAttachment`, não `SourceDocument`). O `sourceDocumentId` do DAS é opcional no DTO e gravado como string solta | **PR-B sem o PDF**: o formulário do DAS sai completo menos o anexo. A rota de BE que cria o `SourceDocument` a partir do arquivo vira frente própria; o PDF entra numa emenda quando ela existir. Vale também para o documento do histórico pré-adoção (PR-C, item 11) | não |

## Consequências

- `SimplesDasRegistro.tsx` não tem campo de arquivo; o corpo do `PUT …/das` vai sem `sourceDocumentId`.
- Achado fora de escopo para o BE: rota (ou parâmetro no `PUT …/das` e no `PUT /historico/:competencia`) que receba o
  arquivo e crie o `SourceDocument` + `DocumentAttachment` no escopo — exige autorização própria.
