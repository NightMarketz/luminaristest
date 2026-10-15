---
id: "D-2026-10-15-W6-CUSTOMIZE-FIELDS"
tipo: "decisao"
dominio: "plataforma"
titulo: "W6: implementar a customização de campos por IA (ADR primeiro), proposta + confirmação, campo sensível marcado"
estado: "decided"
autorizacao: "dono, chat, 2026-10-15: \"Autorizo planejar o BRIEF do W6 — sessao-planejamento, sem código, sem 'executa'\"; questionários do mesmo dia: F-W6-1 → \"Fazer a IA de verdade: ADR primeiro\"; F-W6-2 → \"Manter sem import\"; F-W6-3/5/6/7 → as recomendações"
atualizado: "2026-10-15"
---
# D-2026-10-15-W6-CUSTOMIZE-FIELDS — painel de campos do wizard

**Estado:** `decided`
**Autorização:** dono, chat, 2026-10-15. Abre o planejamento do [[W6]]. **Não cobre** código, o arquivo de ADR
nem "executa". BRIEF: [`WIZARD-W6-CUSTOMIZE-FIELDS-brief.md`](../../accounting/WIZARD-W6-CUSTOMIZE-FIELDS-brief.md).

## Decisões

| # | Fork | Decisão | Palavras |
|---|---|---|---|
| 1 | F-W6-1: remover ou implementar o modo IA | **(b) implementar, ADR primeiro** (contra a recomendação (a), remover). O 404 fica na tela até o PR de FE | 1º questionário: "outra opção" sem texto; 2º, de esclarecimento: *"Fazer a IA de verdade: ADR primeiro"* |
| 2 | F-W6-2: `AIChatMode.tsx` | **Manter** (perguntado sob (a); sob (b), o arquivo é adaptado) | *"Manter sem import"* |
| 3 | F-W6-3: contrato | **Rota própria `POST /api/dashboard/ai/CustomizeFields`, histórico no servidor** (sessão do W4); o front para de mandar histórico | *"Rota própria, histórico no servidor (Recomendado)"* |
| 4 | F-W6-5: quem aplica | **Proposta + confirmação**: o modelo nunca muda estado; "Aplicar" é determinístico | *"Proposta + confirmação (Recomendado)"* |
| 5 | F-W6-6: campo sensível (LGPD art. 5º, II; art. 46, §2º) | **Marcar e exigir confirmação explícita**; a marca vive na sessão | *"Marcar e exigir confirmação (Recomendado)"* |
| 6 | F-W6-7: ordem × W4 | **W6 só executa após o W4 mergeado** | *"W6 só executa após W4 (Recomendado)"* |

Ficam pendentes no BRIEF: **F-W6-4** (saída do modelo em `json_schema` strict + `gpt-4o-mini`) e **F-W6-8**
(persistir a marca sensível no schema da tabela criada).
