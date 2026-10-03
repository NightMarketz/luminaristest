---
id: "D-2026-10-02-PACOTE-VALIDADE-FORKS"
tipo: "decisao"
dominio: "financeiro"
titulo: "Ratificação por questionário: forks F-PV-1..11 (+ 3b, 9b, 9c, 9d) do BRIEF BE-INCR-PACOTE-VALIDADE"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02: rodada de ratificação por questionário dos forks pendentes (AskUserQuestion) — só decisão, sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-PACOTE-VALIDADE-FORKS — cédulas da ratificação do BRIEF de validade do pacote

**Estado:** `decided` (F-PV 11/11 + 4 sub-forks abertos pelas respostas)
**Autorização:** dono, chat, 02/10/2026: *"Autorizo uma rodada de ratificação por questionário dos forks pendentes
abaixo (dono, 02/10). Só decisão: não escreva código nem BRIEF novo, não dê 'executa'."* O agente apresentou cada
fork com contexto e recomendação; o dono decidiu. Frontmatter de [[PACOTE-VALIDADE]] conferido antes: os 11 seguiam
pendentes.
**Não é "executa"** (ORCH-006). **PE-1..PE-6 não foram perguntados**: são do contador e do jurídico (dado externo).

Documento dos forks: [`BE-INCR-PACOTE-VALIDADE-brief.md`](../../accounting/BE-INCR-PACOTE-VALIDADE-brief.md) §5 (texto),
§5.1 (tabela) e §5.2 (efeitos no checklist).

| Fork | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| F-PV-1 | Onde mora o prazo (+ feriado do CC 132 § 1º) | (a) catálogo, copiado no crédito | *"(a) Catálogo, copiado no crédito (Recommended)"* | não |
| F-PV-2 | Granularidade da validade | (a) por saldo, com junção | *"(a) Por saldo, com junção (Recommended)"* | não |
| F-PV-3 | Saldos vendidos antes do deploy | (a) sem retroatividade | *"(b) Backfill"* | **sim** |
| F-PV-3b | Backfill cujo prazo já passou | (a) prazo conta do deploy | *"(a) Prazo conta do deploy (Recommended)"* | não |
| F-PV-4 | Conta da receita por não uso | (a) folha nova 3.4 | *"(a) Folha nova 3.4 (Recommended)"* | não |
| F-PV-5 | Competência do lançamento | (a) `expiresOn + 1` | *"(a) expiresOn + 1 (Recommended)"* | não |
| F-PV-6 | Chegada aos bindings Active | (a) evento pelo binding | *"(a) Evento pelo binding (Recommended)"* | não |
| F-PV-7 | Onde roda o job | (a) passe no reconcile | *"(a) Passe no reconcile (Recommended)"* | não |
| F-PV-8 | Origem cancelada/devolvida (E-1) | (a) não vence | *"(a) Não vence (Recommended)"* | não |
| F-PV-9 | Efeito fiscal do vencimento | (a) nenhum documento agora | *"(b) Emitir NFS-e em CONSUMO"* | **sim** |
| F-PV-9b | `cTribNac` da NFS-e do vencido | (a) campo no perfil fiscal | *"(a) Campo no perfil fiscal (Recommended)"* | não |
| F-PV-9c | Gatilho dessa NFS-e | (a) manual, lista de vencidos | *"(b) Automático no job"* | **sim** |
| F-PV-9d | Identidade no `FiscalDocument` | (a) venda de origem + chave do vencimento | *"(a) Venda de origem + chave do vencimento (Recommended)"* | não |
| F-PV-10 | Evento de auditoria | (a) nenhum eventType novo | *"(a) Nenhum eventType novo (Recommended)"* | não |
| F-PV-11 | Aviso ao cliente | (a) passivo + filtro | *"(a) Passivo + filtro (Recommended)"* | não |

## Por que os sub-forks existem

- **F-PV-3b:** o backfill literal faria vencer, no 1º passe do job, todo saldo cujo prazo recalculado já passou. Uma
  escolha contra a recomendação abriu uma pergunta que o BRIEF não respondia.
- **F-PV-9b/9c/9d:** o pacote é crédito monetário, sem serviço ligado (`PackageCatalogModule.ts`), e o próprio código
  recusa o pacote `VENDA` por não saber o `cTribNac` (`FiscalDocumentEmissionService.ts:437-443`). O gatilho
  ratificado de emissão é manual (F-DFE-3 a). O `FiscalDocument` exige `saleId` e é único por
  `(saleKey, kind, cTribNac)`. Sem as três respostas, a NFS-e do vencido seria campo com placeholder.

## Consequências registradas (contra a recomendação)

- **F-PV-3 (b) + 3b (a):** CLI de backfill, idempotente, rodado pelo dono: `expiresAt = dataDoBackfill + N` para todo
  saldo vivo de pacote com prazo no catálogo. Risco CDC art. 46 (prazo não informado na compra) **agravado**: o PE-6
  vira pré-condição de rodar o CLI em produção.
- **F-PV-9 (b) + 9c (b):** o passe de vencimento emite a NFS-e do vencido sozinho, só em `CONSUMO`. Reabre o F-DFE-3 (a)
  só para este caso. Pela letra da LC 116 art. 1º / RISS-SP art. 1º, não há ISS sobre serviço não prestado (PE-4).
  O ponto de controle é o `pacoteCTribNac`: sem ele no perfil, nada sai.
- **F-PV-9b (a):** quebra a premissa "zero migração" do BRIEF (uma coluna aditiva em `FiscalProfile`). Também fecha a
  lacuna do pacote `VENDA` do X10b.
