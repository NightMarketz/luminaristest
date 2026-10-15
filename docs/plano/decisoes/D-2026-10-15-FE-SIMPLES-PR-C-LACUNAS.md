---
id: "D-2026-10-15-FE-SIMPLES-PR-C-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas de spec do PR-C das telas do Simples Nacional (onde ficam os formulários; toast do 404) — por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-15, questionário na sessão de feature do PR-C — onde ficam: 'Modal próprio + no detalhe (Recomendado)'; toast do 404: 'Aceitar o toast'"
atualizado: "2026-10-15"
---
# D-2026-10-15-FE-SIMPLES-PR-C-LACUNAS — lacunas de spec do PR-C do [[FE-INCR-SIMPLES]]

**Estado:** `decided` (2 cédulas; 1 na recomendação, 1 contra).
**Autorização:** dono, chat, 15/10/2026, questionário, na sessão de feature do PR-C.

Origem: `docs/accounting/FE-INCR-SIMPLES-brief.md` itens 11–12 (e o item 6/7 do §3.1 do FE-INCR-TAX-ASSESSMENT que eles
referem). A sessão parou antes de escolher (regra 2).

| Lacuna | O que a spec não decidia | Decisão | Contra? |
|---|---|---|---|
| Itens 11–12 (onde ficam os formulários) | O BRIEF diz "formulário por competência" + atalho do `RBT12_INCOMPLETO`; o histórico pré-adoção costuma ser de meses do **ano anterior** (janela do RBT12), fora da grade do ano aberto | **Histórico em modal próprio** com competência livre, aberto por um botão "Histórico pré-adoção" na grade e pelo atalho do alerta (um botão por mês faltante citado no `detalhe`); **segregação como seção do detalhe** da competência | não |
| GET de entrada responde 404 sem registro (F-GE-1) | O `apiClient` mostra toast de erro em todo 404; abrir um mês ainda vazio (o caso normal) mostra "Sem histórico declarado…" como erro | **Aceitar o toast**: o formulário abre vazio e o toast aparece (o dedupe do PR-A evita repetição) | **sim** (recomendação era um flag `silent` no `apiClient` só para estes 2 GETs) |

## Consequências

- `SimplesHistoricoModal.tsx` (default: dezembro do ano anterior ao da grade) e `SimplesSegregacaoSection.tsx`; o
  atalho mora em `AlertasSimples` (`competenciasCitadas` lê as competências do `detalhe` do BE).
- Gravar histórico recarrega o ano inteiro (o RBT12 de várias competências muda); gravar segregação relê a competência e
  descarta a prévia dela (o registro do DAS daria 409).
- Os tributos "fora do DAS" de cada parcela vêm da resposta do BE (`excluir`); a tela não os deduz do motivo.
- Toast de erro em mês vazio é comportamento aceito — não é defeito a corrigir sem nova decisão.
