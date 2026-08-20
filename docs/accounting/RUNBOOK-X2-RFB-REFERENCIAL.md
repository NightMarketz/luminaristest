# RUNBOOK: X2 — Import do arquivo oficial RFB "PJ em Geral" (referencial)

> Preparado por agente em 2026-08-17 (runbook EM BRANCO — `docs/operating-manual/RUNBOOK-FORMAT.md`).
> O conversor está pronto (`server/scripts/rfb-referential-to-catalog.mjs`); o que falta é o DADO
> oficial — do contador ou do portal SPED da RFB.

Executor: [nome — humano]           Data: [____]
Autorização: decisão do dono "vamos fechar o bloco A" (2026-08-17) + fila §5.1 Bloco A item 6
  (Fork 2 do referencial, BE-INCR9).
Pré-condições (verificar antes de começar):
- Arquivo oficial do plano referencial **"PJ em Geral"** obtido (contador ou portal SPED/RFB) —
  registrar versão/vigência do arquivo.
- Server de produção local de pé contra o `dev.db` real (`server/prisma/prisma/dev.db`), login admin.
- Formato de entrada esperado pelo conversor (`server/scripts/rfb-referential-to-catalog.mjs:1-18`):
  arquivo TEXTO com colunas separadas por `|` (pipe), leiaute posicional default —
  `code=col0, name=col1, ini=col2, fim=col3, tipo=col5, parent=col6` — confirme contra o
  header/manual do arquivo baixado ANTES de rodar (a ordem posicional pode variar por
  leiaute/entidade; os índices são parâmetros, não hardcoded). Linha-amostra real (leiaute
  Senior F043RFB, embutida no `--selfcheck` do script):
  `3.1.8.2.1.91.00|VARIAÇÕES...|01012020|31122020|539|S|3.1.8.2.1.00.00|6|04`
  (coluna `tipo` = `S` sintética / `A` analítica — qualquer outro token é erro duro, sem linha
  gravada).

## Passos

1. Rodar o conversor sobre o arquivo oficial (comando exato — ajuste `--in`/`--out` para os
   caminhos reais; acrescente `--year AAAA` se o import for filtrado por ano-calendário; só
   passe `--code/--name/--tipo/--parent/--ini/--fim/--sep` se o leiaute baixado divergir do
   default acima):
   `node server/scripts/rfb-referential-to-catalog.mjs --in <arquivo-oficial> --out <catalogo.csv>`
   Saída (stdout) em sucesso: `OK: <N> contas (<A> analíticas / <S> sintéticas) -> <catalogo.csv>`.
   Em erro de tipo (coluna `tipo` fora de S/A), o script sai com código 1, NADA é escrito
   (all-or-nothing) e lista as primeiras 20 linhas inválidas no stderr.
   O `--out` gerado é um CSV com cabeçalho fixo `code,name,isAnalytic,parentCode` — é esse o
   formato consumido pelo passo 2 (`REQUIRED_CATALOG_COLS` em
   `server/src/lib/referentialCatalog.ts:42`: `code`,`name`,`isAnalytic` obrigatórios,
   `parentCode` opcional).
   Resultado esperado: catálogo convertido gerado, contagem de contas plausível.
   EVIDÊNCIA: [saída completa do conversor]

2. Importar o catálogo (upload multipart, campo `file`, CSV/XLSX ≤10MB) via
   `POST /api/accounting/referential/catalog/import` (rota registrada em
   `server/src/routes/accounting.ts:146`; controller
   `server/src/controllers/referentialCatalogController.ts:29-66`). Body multipart precisa de
   `unitId` (escopo de autorização — o catálogo em si é global, sem tenancy) e `layoutVersion`
   (string livre, ex. `"2025"`). **Admin-only**: o controller checa `user.role !== 'ADMIN'` e
   devolve 403 (`referentialCatalogController.ts:38-42`) — qualquer outro papel não passa daqui.
   Na UI isso corresponde ao upload do catálogo referencial na aba **Compliance**.
   Resultado esperado: catálogo versionado ativo no painel.
   EVIDÊNCIA: [screenshot do painel com a versão importada]

3. **Prova de validação viva:** tentar salvar um de-para INVÁLIDO (conta-folha → código
   referencial inexistente no catálogo).
   Resultado esperado: REJEITADO com o erro específico — é a prova de que a validação ficou
   viva, não só instalada.
   EVIDÊNCIA: [print da rejeição]

4. Conferir a cobertura na aba Compliance após o import (a geração de ECD depende dela).
   Resultado esperado: cobertura calculada sobre o catálogo oficial.
   EVIDÊNCIA: [print da cobertura]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [§5.1 Bloco A item 6 do master map + data]
- Assinatura do executor: ____________
