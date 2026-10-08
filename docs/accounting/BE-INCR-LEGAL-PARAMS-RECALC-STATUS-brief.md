# BE/FE-INCR-LEGAL-PARAMS-RECALC-STATUS — status do recálculo dos parâmetros legais (BRIEF)

> **Autorização:** dono, chat, 08/10: *"executa a rota do status do recálculo"* (achado fora de escopo do
> [FE-INCR-LEGAL-PARAMS](FE-INCR-LEGAL-PARAMS-brief.md) §5–§6) + questionário do mesmo dia.
> **Nó:** LEGAL-PARAMS. **Base:** `origin/main`. Fila = `legal_parameter_recalc_jobs` (BE PR-4, #576).

## Forks — ratificados 08/10 (questionário)

| Fork | Decisão |
|---|---|
| Escopo | *"Rota BE + mostrar na aba"* (Recomendado) |
| Quem lê | *"Qualquer autenticado"* (dono, contra a recomendação "só PLATFORM_ADMIN") — mesma régua da leitura dos parâmetros |
| Conteúdo | *"Jobs com a linha legal junto"* (Recomendado) |

## Checklist

1. `GET /api/legal-parameters/recalc-jobs?status=&legalParameterId=&page=&pageSize=` — antes de `/:id` na rota; 401 sem
   login; `LegalParameterPolicy.canRead`.
2. DTO `ListRecalcJobsQuerySchema` (`.strict()`): `status` PENDING|DONE, `legalParameterId`, `page` ≥ 1 (default 1),
   `pageSize` 1..100 (default 20). Fora disso ⇒ 400.
3. Resposta `{ items: RecalcJobView[], total, page, pageSize }`, mais recentes primeiro (`createdAt desc`).
   `RecalcJobView` = id, evento, status, tentativas, ultimoErro, resumo `{reconfirmadas, avisos, inalteradas}` | null,
   createdAt, processedAt, `linha` (tabela, chave, discriminador, vigenteDesde, vigenteAte, status) | null.
4. Repositório: `findMany(filtro, skip, take)` + `count(filtro)`; linhas legais em lote por id (sem N+1).
5. OpenAPI (docs.paths + `public/openapi.json`), snapshot de shape do DTO.
6. FE: seção "Recálculos" na aba Parâmetros legais — tabela com status, evento, linha, resumo, tentativas/erro, datas;
   filtro por status; paginação (`StandardPagination`); botão atualizar; i18n pt/en.
7. Testes: integração da rota (401, 400, filtro, ordem, linha junto, paginação) + vitest da seção.

## Pendente de validação externa / insumos ausentes / fora de escopo

Nenhum. Fora de escopo: reprocessar job pela tela, e o `avisoParametroLegal` nas telas de apuração (não existem).
