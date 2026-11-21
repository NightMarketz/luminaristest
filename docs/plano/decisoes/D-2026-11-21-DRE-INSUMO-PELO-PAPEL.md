# D-2026-11-21 — DRE classifica o insumo pelo papel da conta (lacuna 051e)

Decisão do dono, no chat, em 21/11/2026, por AskUserQuestion (fork da lacuna `L-20261121-034042-051e`, PR #1302).

**Pergunta:** que regra vale para o perfil fiscal já gravado com insumo fora da 4.2/4.7 (ex.: 4.1.9)? Três fontes da spec
divergiam: a decisão (a) das 04:00 (só o PUT valida), o registro das 11:45 em `D-2026-11-21-FORKS-DA-CAIXA` (DRE pelo
papel) e a fala citada no commit `138e4ac72` do PR ("Aplica a regra também no kit e no plano padrão").

**Resposta literal do dono:** "Não faço ideia, qual é o correto na lei, não faz sentido" → recomendada (c) → "Sim, pelo papel".

**Base legal (grau: art. 187 verificado; "insumo = custo" inferido):** Lei 6.404/76 art. 187, II e III — a DRE separa o custo
das mercadorias e serviços vendidos (acima do lucro bruto) das despesas operacionais (abaixo). O critério é o papel da conta,
não o código. Dossiê: `pesquisas-legais/insumo-servico-dre-custo/relatorio.md`. Lacuna da base: a composição do custo do
serviço (CPC) não foi lida; pergunta ao contador no relatório, §4.

## Decisão

1. **Destino (c):** a DRE e o J150 classificam como custo dos serviços a conta apontada em `insumoExpenseAccountId` do perfil
   fiscal, pelo papel, não pelo prefixo do código (`StatementMappingFixture.ts`, `AccountingReportService.ts`). Perfil legado
   com insumo fora da 4.2/4.7 passa a sair certo na DRE sem migração.
2. **#1302 é a etapa de contenção, não o destino:** o PUT do perfil recusa insumo fora do custo da DRE (400 nomeado), **só quando
   o PUT traz o campo**. Perfil já gravado continua valendo para kit, upgrade e pendências (corrige o achado A1 do revisor:
   `FiscalProfileService.writeAccounts` revalidava o registro inteiro). A exceção `insumoSemTroca` volta.
3. Ao entrar o (c), a recusa do PUT deixa de ser necessária para a DRE; sai ou fica como validação de coerência — decide a
   sessão do (c), sem reabrir a regra legal.
4. Nenhuma execução está autorizada por esta cédula sozinha além do que o chat do dono já cobriu (lacunas da caixa,
   D-2026-11-11-LACUNA-VAI-AO-MAESTRO e emenda de 21/11).
