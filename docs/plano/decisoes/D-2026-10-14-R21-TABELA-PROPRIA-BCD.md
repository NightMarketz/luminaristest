---
id: "D-2026-10-14-R21-TABELA-PROPRIA-BCD"
tipo: "decisao"
dominio: "plataforma"
titulo: "R21 — extensão a B/C/D da sanção de tabela própria (D-2026-10-13 item 2)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-14: 'ratifico a extensão da decisão de 13/10 para B/C/D'. Só a decisão; sem 'executa'"
atualizado: "2026-10-14"
---
# D-2026-10-14-R21-TABELA-PROPRIA-BCD — tabela própria em financeiro, contábil e fiscal

**Estado:** `decided`.
**Autorização:** dono, chat, 14/10/2026, cédula literal: *"ratifico a extensão da decisão de 13/10 para B/C/D"*.
Isso reverte o "Não ratifico agora" dado no mesmo dia, registrado na auditoria
(`docs/operating-manual/AUDITORIA-REGRESSAO-ARQUITETURAL-2026-10.md` §6).

## O que se estende

A regra do item 2 de [[D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS]] diz: **tabela própria** (no padrão visual `neutral-*`,
`rounded-2xl`) é bespoke sancionado quando o dado é **Prisma first-class**. O `GenericTable` é preso a registro de
DynamicTable, então há divergência de objeto (critério de reuso, estágio 1). Essa regra passa a valer também para os grupos:

- **B — financeiro** (AP/AR, conciliação, baixa bancária)
- **C — contábil** (plano de contas, razão, demonstrativos, entregas)
- **D — fiscal** (NF-e, NFS-e, DF-e, apuração, compliance)

## Limites

- A sanção vale para `<table>` que renderiza **dado Prisma first-class**. Se uma tabela nesses grupos renderiza linha de
  DynamicTable, ela continua obrigada a usar `GenericTable`.
- Não sanciona os outros itens do R21: `router.push` para detalhe, paginador local e overlay sem `Modal`.
- O `GenericTable` não muda.

## Consequências

- Na auditoria, R21 B/C/D passa de **FALHA (L)** para **PASSA (L)**, com 14, 34 e 6 tabelas sancionadas por esta nota.
- **Assumido, não verificado tabela a tabela:** que todas as 54 renderizam dado Prisma. Os grupos B, C e D são Prisma
  first-class pelo Contrato §2.1, mas ninguém conferiu cada componente.
- O gate sugerido na auditoria (lint `JSXOpeningElement[name.name='table']` com allowlist) teria como allowlist os
  componentes desta nota mais a `CrmReportList.tsx`. Nada foi implementado; ficaria para um nó próprio.
