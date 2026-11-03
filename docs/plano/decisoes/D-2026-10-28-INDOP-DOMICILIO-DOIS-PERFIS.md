---
id: "D-2026-10-28-INDOP-DOMICILIO-DOIS-PERFIS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Atendimento a domicílio = serviço próprio no catálogo, com perfil fiscal de indOp 030102; a NFS-e exige o endereço da cliente (E0234)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-28: \"Aqui precisamos de dois perfis.\" e \"Registra no #936 a decisão dos dois perfis (atendimento a domicílio = serviço próprio com indOp 030102) e pesquisa, só leitura, se a NFS-e exige o endereço do tomador com o 030102.\""
atualizado: "2026-10-28"
---
# D-2026-10-28-INDOP-DOMICILIO-DOIS-PERFIS

**Estado:** `decided`. **Autorização:** dono, chat, 28/10/2026 (citação no frontmatter). Não autoriza código: a emenda abaixo
precisa de BRIEF e `executa` próprios.

## Decisão
- O serviço feito na casa da cliente é **outro serviço do catálogo** (ex.: "Corte" e "Corte a domicílio"), cada um com o seu
  `ServiceFiscalProfile`: **030101** (estabelecimento do fornecedor) para o salão e **030102** (endereço do adquirente) para o
  domicílio. Não há escolha de indOp por nota.
- Cabe no modelo de `main` sem mudança de schema: o perfil é único por usuário, unidade e serviço
  (`@@unique([userId, unitId, serviceRef])`), e o `cIndOp` é validado contra o Anexo C (`ServiceFiscalProfileDto.ts:23`).

## O que a pesquisa achou (dossiê [`fila-2026-10-28-indop-domicilio`](../../../pesquisas-legais/fila-2026-10-28-indop-domicilio/relatorio.md))
- **Verificado:** com o 030102, o endereço do tomador é obrigatório e a DPS sem ele é rejeitada (Anexo I v1.01, regra **E0234**);
  o grupo do tomador também (E0187), e esse a emissão já manda sempre. A regra roda nos emissores públicos, inclusive o web.
- **Lacuna em `main`:** a emissão não preenche `toma/end` (previsto só para ISS retido, F-DFE-14, não feito). Um perfil com
  030102 hoje geraria DPS rejeitada pela Sefin (inferido, não testado).
- **No portal (D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO):** quem emite a nota de domicílio digita o endereço da cliente.

## Próximo passo (não autorizado aqui)
- Emenda do BRIEF `BE-INCR-DFE`: preencher `toma/end` quando o perfil do serviço tiver um indOp da lista da E0234, e bloquear a
  emissão com faltante se o endereço da cliente não existir. A fonte do endereço (cadastro do cliente ou campo na venda) fica
  para o BRIEF.
- Até lá, o atendimento a domicílio sai pelo portal.

## Ligações
- [[X10b]] (emissão de NFS-e, BE-INCR-DFE) · [[D1f]] (indOp 030101 conferido) · [[X10i]] (emissão real)
