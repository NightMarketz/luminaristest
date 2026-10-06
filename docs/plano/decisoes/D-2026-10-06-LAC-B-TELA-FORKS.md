---
id: "D-2026-10-06-LAC-B-TELA-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks da tela de ativação do binding (F-BA-1..6, LAC-B) — ratificados por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-06, questionário — F-BA-1..6, todos na recomendação. Sem 'executa'"
atualizado: "2026-10-06"
---
# D-2026-10-06-LAC-B-TELA-FORKS — forks da tela da [[LAC-B]]

**Estado:** `decided` (6 cédulas, todas na recomendação; a do F-BA-2 é condicional).
**Autorização:** dono, chat, 06/10/2026, questionário. **Não é "executa"** (ORCH-006). O "executa" de 01/10 dado à
LAC-B é anterior à spec e não a cobre sem confirmação do dono.

Origem: `docs/accounting/FE-INCR-BINDING-ACTIVATION-screen-brief.md` §5 (PR #552).

| Fork | Pergunta (resumo) | Decisão | Contra? |
|---|---|---|---|
| F-BA-1 | Onde a ativação aparece | **(a)** faixa na `AccountingView`, só quando a unidade não tem binding `Active` | não |
| F-BA-2 | A unidade ativada pela tela lança sem reiniciar | **(a)** depende do **F-I4-4 → (a′)** do BRIEF I4/I5 (recarga no `compile()` → `Active`). **Condicional:** o F-I4-4 segue PENDENTE; se for decidido diferente de (a′), este fork **volta ao dono** | não |
| F-BA-3 | A tela e a aba Pendências | **(b)** só link para a aba Pendências; o "Re-varrer" vive lá | não |
| F-BA-4 | Botão manual × ativação automática do I4 | **(a)** convivem sempre | não |
| F-BA-5 | Setor e a 2ª ativação na mesma unidade | **(a)** seletor de setor na tela + guarda 409 `BINDING_SECTOR_CONFLICT` no PR-0 (BE) | não |
| F-BA-6 | Flags `installChartIfEmpty` / `openCurrentPeriodIfMissing` | **(a)** `ConfirmModal` lista os 2 efeitos; a confirmação manda as duas `true` | não |

## Risco que o F-BA-5 (a) NÃO fecha

O PR-0 guarda só a rota `POST /accounting-binding/activate-default`. **O CLI continua sem guarda**: ele chama
`BindingCompileService.compile()` direto (`activateAccountingBindingCli.ts:138-139`, lido no BRIEF), e o
`POST /compile` também fica fora. Por esses caminhos, ativar um 2º setor na mesma unidade grava um 2º binding `Active`
com os mesmos 6 eventos, e o próximo boot aborta por colisão de mapper **para todos os tenants da instância**
(`AccountingSyncService.ts:78-84`, `server.ts:36-58`). **Lacuna para o GAP-MAP**, grau **inferido por leitura** (não
executado). O registro no GAP-MAP não foi feito nesta rodada.

## Consequências

- Ordem: **PR-0 (BE, guarda do 2º setor) → PR-1 (FE)**.
- O F-BA-2 amarra a tela ao F-I4-4: entregar a tela sem a recarga dá um `Active` que não lança até o reinício.
