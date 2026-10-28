---
id: "D-2026-10-28-LACUNA-8-OPENAPI-DERIVA"
tipo: "decisao"
dominio: "plataforma"
titulo: "Lacuna 8 da cédula D-2026-10-28-LACUNAS-EXECUTA-27-28: openapi.json da main divergia do código em 3 paths; regenerado, sem mudança de comportamento"
estado: "done"
autorizacao: "dono, chat, 2026-10-28: \"Pode fechar as lacunas então?\", com a escolha \"Sessões paralelas\", uma por lacuna"
atualizado: "2026-10-28"
---
# D-2026-10-28-LACUNA-8-OPENAPI-DERIVA

**Estado:** `done` no PR desta nota (sem merge até o OK do dono).

**Origem:** item 8 da cédula `D-2026-10-28-LACUNAS-EXECUTA-27-28` (PR #937): o `server/public/openapi.json`
da main divergia do código em 5 paths, relatado pelos PRs #928 e #933.

## O que a medição mostrou (main `0ea9f136`, `npm run docs:generate`, comparação semântica por path)

| Path | Divergência | Quem estava certo |
|---|---|---|
| `/api/dashboard-layout/{id}` | o artefato tinha `GET`; o gerador não | **código**: o `GET` foi removido de propósito no #839 (FIX-AUTH-CONTA #14) |
| `/api/reports/generate-chart-data` | path inteiro só no artefato | **código**: removido de propósito no #839 (FIX-AUTH-CONTA #13) |
| `/api/dashboard/create` | o artefato não tinha `addedTables` | **código**: `CreateDashboard.dto.ts` aceita `addedTables` desde o W1 (#889) |
| `/api/dashboard/ai/ChatInterview`, `/api/dashboard/ai/InterviewModules` | só a posição no arquivo | sem divergência de conteúdo |

Causa provável (inferido): a união por chave do `746f9b74` (#935) juntou o artefato de branches anteriores ao
#839 e ao #889, recolocando os paths removidos e perdendo o `addedTables`, além de anexar chaves fora da ordem
do gerador. Por isso o diff textual tem ~15,7 mil linhas (1,8 mil com `--diff-algorithm=histogram`) e o
semântico só 3 paths.

**Ordem (verificado):** o `glob` 7.1.6 do `swagger-jsdoc` ordena os arquivos com `localeCompare`, sem depender do
`readdir` do SO. Gerando o spec com a lista de arquivos ordenada por `en-US`, `pt-BR`, `en-US-u-va-posix` e code
point, a ordem dos **paths** sai idêntica nas quatro. A main tinha 21 paths fora dessa ordem, todos de entradas da
união: profit-distributions, jcp, withholdings, reinf, danfe e afins. Só a ordem de `components.schemas` depende da
colação: o artefato sai igual sob `en-US`/`pt-BR`, e a colação POSIX daria 74 linhas a mais. A main já seguia
`en-US`/`pt-BR`: 3 schemas fora de ordem, todos da união, contra 7 sob POSIX. O CI não regenera o artefato. Não
foi possível rodar num Linux aqui, porque o WSL não respondeu e o Docker estava parado.

## O que mudou

- `server/public/openapi.json` regenerado (340 → 339 paths, 426 operações). Um segundo `docs:generate` sai
  idêntico byte a byte.
- `server/src/routes/docs/dashboard.paths.ts:43`: a `description` do `suiteKey` ganhou aspas. Sem elas o YAML
  lia `e.g. "agronegocio"` como uma chave, e o spec publicava `"e.g. \"agronegocio\"": null`.
- Nenhuma rota, controller ou DTO mudou. Não há cópia em `my-app/public/openapi.json`.

## Fora de escopo (follow-up)

- A mesma falta de aspas em 5 `description` de `server/src/routes/docs/accounting.referential.paths.ts`
  (linhas 24, 74, 110, 111, 166).
- A guarda `openapi-paths.test.ts` é um piso de contagem (`BASELINE = 293`): não pega artefato velho com
  path a mais. Registrado, sem aparato novo (regra ⛔ do CLAUDE.md).
- Fixar a colação em `scripts/generate-openapi.js` (ordenar `apis` com `localeCompare(…, 'en-US')`) tornaria
  a ordem dos schemas independente do locale de quem regenera. É ferramenta, fora de um PR só de docs.
