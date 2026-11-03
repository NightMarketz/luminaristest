---
id: "D-2026-10-31-FE-NFCE-ASSINADOR-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "FE-INCR-NFCE-ASSINADOR (tela do assinador local): F-FEAS-1..7 ratificados pela recomendação"
estado: "decided"
autorizacao: "dono, chat, 2026-10-31, na sessão de planejamento do FE-INCR-NFCE-ASSINADOR, sobre a lista F-FEAS-1..7 com recomendação: \"Pode decidir os forks pelo recomendado, todos\"; não é 'executa' nem autoriza merge"
atualizado: "2026-10-31"
---
# D-2026-10-31-FE-NFCE-ASSINADOR-FORKS

**Estado:** `decided`. **Autorização:** dono, chat, 31/10/2026 (citação no frontmatter). **Não é `executa`**
(ORCH-006): o BRIEF fica pronto para execução, mas a implementação pede pedido próprio. Abertura do planejamento:
[[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]] item 4.

## Decisão: os 7 forks pela recomendação

BRIEF: [`FE-INCR-NFCE-ASSINADOR-brief.md`](../../accounting/FE-INCR-NFCE-ASSINADOR-brief.md) §5.

| Fork | Ramo ratificado |
|---|---|
| F-FEAS-1 | (a) seção "Assinador local" na aba Perfil fiscal, depois do `FiscalProfilePanel` |
| F-FEAS-2 | (a) código num modal, com copiar e contagem regressiva; fechado, só gerando outro |
| F-FEAS-3 | (a) o aviso no balcão só informa; a emissão segue pelo servidor (`PENDING_SIGNATURE` + retomada) |
| F-FEAS-4 | (a) aviso no topo da `FiscalDocumentsSection` da venda + contagem de pendentes na seção do assinador |
| F-FEAS-5 | (a) `online`, `diasParaVencer` e `versaoMinima` calculados no servidor, na `DfeSignerView` |
| F-FEAS-6 | (a) releitura a cada 30 s com a aba visível + botão "atualizar" |
| F-FEAS-7 | (a) download e SHA-256 nesta seção, como FA-PR-3, quando o AL-PR-6 existir |

## Efeitos

- Nenhum fork do FE-INCR-NFCE-ASSINADOR segue pendente. Falta o `executa` do dono.
- **F-FEAS-5 → (a) pede ao AL-PR-2** (EMENDA-4) os campos `online` (limiar de 90 s do AL-13), `diasParaVencer` e
  `versaoMinima` na view do `GET /api/accounting/dfe-assinador/:unitId`. O BRIEF BE não foi editado; o implementador
  do AL-PR-2 lê este pedido aqui e no §2 do BRIEF FE.
- Seguem abertos os insumos do §7 do BRIEF (alcance do `DELETE` com N unidades, forma final da view), que são do
  AL-PR-2.
