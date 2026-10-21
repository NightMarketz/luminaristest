---
id: "D-2026-10-21-FORKS-EFICIENCIA-FISCAL"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-EF-1..13 do ADR-INCR-EFICIENCIA-FISCAL ratificados por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-21: \"dispara os chats A, C e F agora\" — Chat F: \"ratificar por questionário os forks de IBS-CBS-2027, RETENCOES-FONTE, EFD-REINF e EFICIENCIA-FISCAL — grava as decisões, sem BRIEF, sem 'executa'\". Respostas no AskUserQuestion de 21/10. NÃO é BRIEF nem 'executa'"
atualizado: "2026-10-21"
---
# D-2026-10-21-FORKS-EFICIENCIA-FISCAL

**Estado:** `decided`. **Autorização:** dono, chat, 21/10/2026 — *"dispara os chats A, C e F agora"* (Chat F: questionário
+ gravar decisões, sem BRIEF, sem 'executa'). As respostas vieram do AskUserQuestion de 21/10. As opções foram preparadas a
partir de [[EFICIENCIA-FISCAL]] / `docs/adr/ADR-INCR-EFICIENCIA-FISCAL.md`, com as normas citadas pelo dossiê
`pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs`.

## Respostas do dono

| Fork | Resposta | O que fica decidido |
|---|---|---|
| F-EF-1 piso do serviço | **Custo → catálogo** (a) | Custo informado com evidência; sem ele, preço mínimo publicado; sem nenhum, só proporcional (evidência = P-EF-1) |
| F-EF-2 critério de alocação | **Por unidade** (a) | Padrão CARGA, proporcional escolhível; troca vira sugestão com trilha |
| F-EF-3 quem aceita sugestão | **Contador, senão admin** (a) | Contador responsável ACTIVE decide; sem ele, ADMIN; quem propõe não decide |
| F-EF-4 kit sem NCM própria | **Explode; kit-bem com contador** (c) | Padrão itemizado (LC 214 art. 7º); kit como bem único só com classificação do contador por kit (P-EF-3) |
| F-EF-5 fonte da NCM/ST | **ProductFiscalProfile** (a) | NCM no model Prisma do X10a; ST por NCM×UF em LEGAL-PARAMS DRAFT |
| F-EF-6 fatiamento | **5 PRs** (a) | PR-1 isola a guarda de emissão; 'executa' por PR |
| F-EF-7 simulador | **Completo** (a) | Simples × Presumido × Real, com PIS/Cofins não cumulativo |
| F-EF-8 estética 2027 | **Sem redução** (a) | Sem redução de 60%; só com código de saúde e profissional habilitado, com aviso "não confirmado" (P-EF-4) |
| F-EF-9 desconto condicional | **discountKind obrigatório** (a) | Desconto condicional nunca abate receita nem vai como redutor na nota |
| F-EF-10 equiparação hospitalar | **Por serviço + checklist** (a) | Requisito faltando ⇒ 32% com aviso (P-EF-7) |
| F-EF-11 procedimento estético | **32%/cheia, contador reclassifica** (a) | Reclassificação só por sugestão aceita pelo contador (P-EF-7) |
| F-EF-12 ISS fixo SUP | **Simular e apurar** (a) | Simulador + checklist + modo ISS fixo no X7, só com a inscrição anexada; vedado no Simples (P-EF-8) |
| F-EF-13 NFS-e do pacote | **Política por unidade** (a) | Padrão: por consumo no Simples, na venda fora dele; aviso IBS/CBS 2027 |

## Fora do questionário do dono

Pacote P-EF-1..10 ao contador ([[D1]]) segue como no ADR §9.

## O que NÃO decide

Não há BRIEF, não há 'executa' e não há merge. O BRIEF precisa de pedido próprio.
