# RUNBOOK: B4 — Ensaio de restauração (backup → restore → conferência)

> Preparado por agente em 2026-08-30 contra `origin/main` `41884c8a`. **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`).
>
> **[EMENDA 2026-09-14 — referência por SQL]** P5 e o passo 4 deixam de depender de um server de
> pé + login + `unitId`: a leitura de referência é uma **impressão digital SQL** do arquivo (mesmo
> script nos dois lados, saída idêntica = restauração fiel). Motivos medidos: (i) o P5 original exigia
> o server rodando contra o original, e o server escreve sozinho (`accounting_sync_reconcile` a cada
> 5 min desde o boot) — referência tirada com o server no ar pode divergir do backup por causa do
> próprio job, FALHOU falso; (ii) `/trial-balance` e `/entries` cobrem 2 tabelas; a impressão digital
> cobre todas (55 hoje). Os curls seguem como prova **opcional** de que a API lê o restaurado; o
> boot do passo 3 já prova que o código abre o arquivo. P7 (`unitId`) só é necessário se usar os
> curls opcionais. Pré-condição nova: **Python 3 no PATH** (o repo não tem `sqlite3` CLI nem
> `better-sqlite3`; o Python vem com `sqlite3` embutido).

Executor: [Raphael]           Data: 2026-09-24
Autorização: item B-1/B-4 do plano pré-dados-reais (Wave 1, "Pode disparar" — dono, 2026-08-30);
BRIEF-W1-C. Não há entrada B-1/B-4 explícita em `docs/accounting/ACCOUNTING-MASTER-MAP.md` nem em
`docs/accounting/PROXIMOS-PASSOS-2026-08-28.md` no momento em que este runbook foi preparado
(grep = 0 hits) — se o mapa ganhar uma linha correspondente, aponte-a no campo "Rastreio a
atualizar" abaixo antes de assinar.
Rastreio a atualizar no fim: `docs/plano/gates/B-4.md` (frontmatter `estado`)

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = `main` `41884c8a` ou posterior, com `server/scripts/db-backup.mjs` e `npm run db:backup` presentes | `git log origin/main --oneline -1`; `cat server/package.json \| grep db:backup` | [x] |
| P2 | `dev.db` real existe e está populado (o passo 1 só LÊ, mas confirme antes de mexer) | `ls -la server/prisma/prisma/dev.db` (o populado; `server/prisma/dev.db` é isca de 0 byte) | [x] |
| P3 | `cd server && npm ci && npx prisma generate` rodado (client do Prisma presente) | `ls server/generated/prisma` | [x] |
| P4 | Porta 3001 (server) e 3000 (app) livres para o boot do passo 3 | `netstat -ano \| grep ":3001\|:3000"` sem processo Luminaris já ativo | [x] |
| P5 | Impressão digital SQL do banco ORIGINAL anotada ANTES do passo 1, **com o server parado** (P4) — comparar depois contra o restaurado | ver "Leitura de referência por SQL" abaixo | [x] |
| P5b | `python --version` responde (3.x) — o script de referência usa o `sqlite3` embutido do Python | `python --version` | [x] |
| P6 | `OPENAI_API_KEY` presente em `server/.env`, qualquer valor não vazio — sem ela `new OpenAIService()` lança na construção do factory e o boot aborta ANTES de tocar no banco (verificado); nenhum passo deste runbook exercita IA, então um valor dummy serve só para este ensaio | `grep OPENAI_API_KEY server/.env` — se vazio/ausente, acrescente uma linha como `OPENAI_API_KEY=sk-rehearsal-dummy-nao-real` | [x] |
| P7 | *(opcional — só se for rodar os curls opcionais do passo 4)* `unitId` da unidade a testar | ver "Como descobrir o unitId" abaixo | [ n/a ] |

EVIDÊNCIA pré-condições:
> _Transcrito pelo agente, sem edição, das saídas do terminal do executor nesta sessão (24/09). O executor confere antes de assinar._

```
d827bcdf (HEAD -> main, origin/main, origin/HEAD) docs(accounting): triagem da resposta do contador (23/09) (#369)

server\package.json:23:    "db:backup": "node ./scripts/db-backup.mjs",

FullName : C:\Users\smurf\Downloads\Luminaris\server\prisma\prisma\dev.db
Length   : 3911680

True
1
Python 3.12.10
```

Nota: comando rodado APÓS o ensaio — o `dev.db` já estava alterado (ver Achado 4); no P5 o arquivo tinha 1.675.264 bytes. P4 (portas): `netstat -ano | findstr ":3001"` vazio no encerramento.

Se qualquer pré-condição não se sustentar → desfecho **BLOQUEADO**, não execute nada.

### Como descobrir o `unitId` (P7)

Caminho mais simples — tela **Contabilidade** do app (`/accounting`, componente `my-app/features/accounting/AccountingView.tsx`): o dropdown "Unidade" no cabeçalho lista as unidades pelo nome amigável, mas o `unitId` (o valor interno que os curls precisam) não aparece na tela — só no DOM/na rede. Abra o DevTools do navegador (F12) → aba Network, entre na tela e selecione a unidade; qualquer request para `/api/accounting/...` que dispare mostra `unitId=<valor>` na query string — copie esse valor.

Sem acesso à tela (ex.: ambiente sem frontend rodando): `cd server && npx prisma studio` (script já existe em `package.json`), abra a tabela `JournalEntry` e leia a coluna `unitId` de qualquer linha — todos os lançamentos da mesma unidade compartilham o valor.

### Leitura de referência por SQL (P5) — tirar ANTES do passo 1, com o server PARADO

Salve o script uma vez (fora do repo, ex.: `%TEMP%/db-fingerprint.py`) — é o MESMO script que o
passo 4 roda sobre o restaurado; a comparação só vale se o texto for idêntico dos dois lados:

```bash
cat > "$TEMP/db-fingerprint.py" <<'EOF'
import sqlite3, hashlib, sys
c = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
tabs = [r[0] for r in c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not in ('_prisma_migrations','job_watermarks') order by name")]
print("integrity_check:", c.execute("pragma integrity_check").fetchone()[0])
print("migracoes:", c.execute("select count(*) from _prisma_migrations").fetchone()[0])
print("journal_entries/postings/accounts/accounting_bindings:", [c.execute(f"select count(*) from {t}").fetchone()[0] for t in ("journal_entries","postings","accounts","accounting_bindings")])
print("postings debito/credito:", c.execute("select sum(debitCents), sum(creditCents) from postings").fetchone())
h = hashlib.sha256()
for t in tabs:
    for r in c.execute(f"select * from {t} order by 1"):
        h.update(repr(r).encode())
print("tabelas:", len(tabs), "| sha256(linhas):", h.hexdigest())
EOF
```

Abre em `mode=ro` (nunca escreve no arquivo lido) e cobre **todas** as tabelas, exceto
`_prisma_migrations` (só a contagem — o conteúdo tem timestamps de aplicação) e `job_watermarks`
(ver ERRATA abaixo). O `sha256(linhas)` é sobre todas as linhas das demais tabelas, ordenadas pela
1ª coluna (o `id`).

> **[ERRATA 2026-09-24 — `job_watermarks` fora do hash]** No ensaio de 24/09 o passo 4 (server de
> pé, como pede o passo) divergiu do P5 (`25c787d2…` × `c0da602d…`) por **1 linha** em
> `job_watermarks` — `('accounting_sync_reconcile', …)`, gravada pelo próprio job do boot do passo 3
> no restaurado; as outras 67 tabelas eram idênticas, e o backup (nunca aberto pelo server) bateu
> com o P5. A emenda de 14/09 previa a escrita do job no P5, não no passo 4. `job_watermarks` é
> estado operacional do agendador, não dado contábil — excluída do hash. Consequência: `tabelas:`
> cai de 68 para 67; o `sha256` de um banco com `job_watermarks` vazia **não muda** (conferido nos
> 3 arquivos do ensaio de 24/09: os três dão `c0da602d…` com o filtro novo). P5 e passo 4 precisam
> rodar a MESMA versão do script — não compare hash do script antigo com o novo.

```bash
python "$TEMP/db-fingerprint.py" server/prisma/prisma/dev.db
```

Guarde a saída inteira — é a base de comparação do passo 4. Se `integrity_check` não for `ok` aqui,
o problema é o ORIGINAL, não o backup: desfecho **BLOQUEADO** em P5.

EVIDÊNCIA P5:
> _Transcrito pelo agente, sem edição, das saídas do terminal do executor nesta sessão (24/09). O executor confere antes de assinar._

```
PS C:\Users\smurf\Downloads\Luminaris\server> npx prisma migrate deploy
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": SQLite database "dev.db" at "file:./prisma/dev.db"

50 migrations found in prisma/migrations

Applying migration `20260923200000_add_fixed_asset_source_item_ref`

The following migration(s) have been applied:

migrations/
  └─ 20260923200000_add_fixed_asset_source_item_ref/
    └─ migration.sql

All migrations have been successfully applied.
PS C:\Users\smurf\Downloads\Luminaris\server> python "$env:TEMP\db-fingerprint.py" prisma\prisma\dev.db
integrity_check: ok
migracoes: 50
journal_entries/postings/accounts/accounting_bindings: [15, 30, 44, 1]
postings debito/credito: (1897300, 1897300)
tabelas: 68 | sha256(linhas): c0da602d0d7048aef37628179e3d68d28a3ced9e2a3235e13b60fc14b9e46bc1
```

Nota: leitura anterior à migração (49/50) deu o mesmo sha256 `c0da602d…`; script = versão
anterior à ERRATA 2026-09-24 (68 tabelas).
---

## Passos

Cada passo tem três campos. **EVIDÊNCIA é obrigatória e é sempre artefato colado** (saída de
comando, screenshot) — nunca uma frase dizendo que deu certo.

### 1. Gerar o backup

```bash
cd server && npm run db:backup
```

Resultado esperado: stdout terminando em `OK: backup íntegro em <path>.`, com `integrity_check: ok`
e a contagem de `journal_entries` da fonte igual à da cópia. Anote o `<path>` impresso — é o
arquivo do passo 2.

EVIDÊNCIA:
> _Transcrito pelo agente, sem edição, das saídas do terminal do executor nesta sessão (24/09). O executor confere antes de assinar._

```
PS C:\Users\smurf\Downloads\Luminaris\server> npm run db:backup

> luminaris-server@1.0.0 db:backup
> node ./scripts/db-backup.mjs

origem: C:\Users\smurf\Downloads\Luminaris\server\prisma\prisma\dev.db
backup gerado: C:\Users\smurf\Downloads\Luminaris\server\prisma\backups\dev-20260924024331.db
integrity_check: ok
journal_entries: fonte=15 · cópia=15

OK: backup íntegro em C:\Users\smurf\Downloads\Luminaris\server\prisma\backups\dev-20260924024331.db.
```

> **Se sair `FALHOU`:** desfecho **FALHOU** neste passo — não prossiga para o passo 2. A causa
> (`integrity_check` distinto de `ok`, ou contagem de `journal_entries` divergente) é achado de
> domínio sobre o próprio dado, não bug de script — registre e pare.

### 2. Restaurar em path alternativo

Volte à raiz do repo antes de copiar — o passo 1 te deixou dentro de `server/` por causa do
`cd server &&`, e um `cp` com destino relativo `server/restored-<data>.db` executado de dentro de
`server/` tenta escrever em `server/server/...` e falha (`No such file or directory`;
verificado). Rode `cd ..` se necessário. Use um path **absoluto**, fora de `server/prisma/` (para
não colidir com o `dev.db` real que o `.env` aponta) — o path absoluto é exigido pelo passo 3, veja
a nota lá sobre como o Prisma resolve `file:` relativo:

```bash
cp "<path do backup do passo 1>" "<path absoluto fora do repo>/restored-<data>.db"
```

Resultado esperado: arquivo copiado, mesmo tamanho em bytes do backup de origem.

EVIDÊNCIA:
> _Transcrito pelo agente, sem edição, das saídas do terminal do executor nesta sessão (24/09). O executor confere antes de assinar._

Path absoluto usado: `C:\Users\smurf\b4-restore\restored-20260924.db`

```
FullName                                                                        Length
--------                                                                        ------
C:\Users\smurf\Downloads\Luminaris\server\prisma\backups\dev-20260924024331.db 1658880
C:\Users\smurf\b4-restore\restored-20260924.db                                 1658880
```

### 3. Subir o server apontando para a restauração

**Nunca em modo de desenvolvimento** (`npm run dev` / `ts-node-dev`) — só build de produção, mesma
ressalva do `RUNBOOK-H1-PVA.md` (lá é sobre `next dev` do frontend; aqui o equivalente é `npm run
dev`, que também serve código instrumentado/velho).

**Não use `DATABASE_URL=... npm start` na mesma linha — não funciona quando `server/.env` existe.**
`server/src/config/env.ts` carrega `server/.env` com `dotenv.config({ override: true })` sempre que
`NODE_ENV !== 'test'`, e `npm start` não seta `NODE_ENV` — então o `.env` sobrescreve
silenciosamente qualquer `DATABASE_URL` passada na frente do comando (verificado contra o
`dist/config/env.js` real: `DATABASE_URL=file:./restored-X.db` na frente do comando virou
`file:./prisma/dev.db` depois do load do `.env`). O boot sobe contra o `dev.db` normal, não contra
a restauração — e o passo 4 bateria com a referência por estar lendo o banco de sempre, dando
**PASSOU falso** sem nunca ter validado a restauração.

Em vez disso, edite `server/.env` temporariamente:

1. Anote a linha `DATABASE_URL` atual do `server/.env` (para reverter depois).
2. Troque por um path **absoluto** apontando para o arquivo do passo 2 — estilo Windows `C:/...`,
   não `/c/...` de git-bash (o Prisma/SQLite não abre `/c/...`; verificado):
   `DATABASE_URL=file:C:/caminho/absoluto/restored-<data>.db`
   Path **relativo não funciona** aqui mesmo apontando para o arquivo certo: o Prisma resolve
   `file:` relativo à pasta de `schema.prisma` (`server/prisma/`), não ao cwd do `npm start` nem ao
   path usado no passo 2 — um `file:./restored-<data>.db` te deixaria lendo (ou criando vazio, sem
   erro claro — mesma classe de armadilha do `dev.db` "isca de 0 byte") um arquivo em
   `server/prisma/restored-<data>.db`, que não é onde o passo 2 colocou o arquivo.
3. `cd server && npm run build && npm start`
4. Ao final do passo 4, reverta a linha `DATABASE_URL` do `.env` para o valor original.

Resultado esperado: log de boot chegando em `Luminaris Server running on ...` (não
`Boot ABORTADO`).

> **Dois motivos de `Boot ABORTADO` que NÃO significam "o backup está corrompido"** — os dois
> travam o boot antes de `app.listen()` com uma mensagem que, sob pressão, lê como "a
> restauração falhou", mas são estado do AMBIENTE/dado, não do arquivo restaurado em si.
> Distinga pela mensagem, não assuma corrupção:
>
> - **Migração pendente** — erro Prisma `P2021` ("The table `main.<tabela>` does not exist in
>   the current database"). O arquivo restaurado carrega o schema de quando o backup foi
>   tirado, que pode ser anterior ao schema do código atual (verificado no pré-ensaio: 6
>   migrações pendentes num snapshot). Confira ANTES do boot com `cd server && npx prisma
>   migrate status` (mesmo `DATABASE_URL` do passo 3.2, apontando pro restaurado) — se houver
>   pendência, é achado do ensaio (dado desatualizado), não falha de script; registre e trate
>   como **FALHOU** ou **BLOQUEADO**. Não aplique a migração no arquivo restaurado como parte
>   deste runbook — isso muda o artefato que você está tentando validar.
> - **`AccountingBinding` `Active` ausente** — erro `NoActiveAccountingBindingsError`
>   ("Nenhum AccountingBinding com status Active encontrado"), ver
>   `docs/adr/ADR-INCR-BINDING-FEEDER.md` §5/§8. Também achado do próprio ensaio, não falha de
>   script; registre e trate como **FALHOU** ou **BLOQUEADO** conforme o caso.

EVIDÊNCIA:
> _Transcrito pelo agente, sem edição, das saídas do terminal do executor nesta sessão (24/09). O executor confere antes de assinar._

```
PS C:\Users\smurf\Downloads\Luminaris\server> Select-String -Path .env -Pattern '^DATABASE_URL'

.env:1:DATABASE_URL=file:C:/Users/smurf/b4-restore/restored-20260924.db

PS C:\Users\smurf\Downloads\Luminaris\server> npx prisma migrate status
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": SQLite database "restored-20260924.db" at "file:C:/Users/smurf/b4-restore/restored-20260924.db"

50 migrations found in prisma/migrations

Database schema is up to date!

> luminaris-server@1.0.0 start
> node dist/server.js

[env] Assigned variables from manual parse: [ 'QDRANT_API_KEY' ]
Api key is used with unsecure connection.
Luminaris Server running on http://localhost:3001
Health check: http://localhost:3001/health
```

Nota: erros "fetch failed" do Qdrant no boot (serviço de IA fora do ar) — fora do escopo do ensaio.

### 4. Conferência — impressão digital SQL do restaurado

Com o server do passo 3 ainda no ar (prova que o arquivo é utilizável), rode o MESMO script de P5
sobre o arquivo restaurado (o `mode=ro` não briga com o server aberto no mesmo arquivo):

```bash
python "$TEMP/db-fingerprint.py" "<path absoluto do passo 2>/restored-<data>.db"
```

Resultado esperado: as 5 linhas **idênticas** às de P5 — em especial `sha256(linhas)` igual e
`integrity_check: ok`. `migracoes` diferente = o backup NÃO é do schema atual (achado, ver nota do
passo 3); `sha256` diferente com contagens iguais = alguma linha mudou entre P5 e o passo 1 (o
server estava de pé durante P5? — refaça P5 com o server parado antes de concluir FALHOU) **ou o
server do passo 3 gravou no restaurado** — desempate rodando o mesmo script sobre o **backup** do
passo 1 (o server nunca o abre): backup = P5 ⇒ a cópia é fiel e a diferença é escrita do próprio
ensaio; localize a tabela comparando hash por tabela antes de concluir (ERRATA 2026-09-24).

EVIDÊNCIA:
> _Transcrito pelo agente, sem edição, das saídas do terminal do executor nesta sessão (24/09). O executor confere antes de assinar._

Restaurado (server do passo 3 no ar):
```
integrity_check: ok
migracoes: 50
journal_entries/postings/accounts/accounting_bindings: [15, 30, 44, 1]
postings debito/credito: (1897300, 1897300)
tabelas: 68 | sha256(linhas): 25c787d2bb47f4715809b68b295b9c9b22981b438521f31e0717368acbd8dee4
```

Backup do passo 1 (nunca aberto pelo server):
```
integrity_check: ok
migracoes: 50
journal_entries/postings/accounts/accounting_bindings: [15, 30, 44, 1]
postings debito/credito: (1897300, 1897300)
tabelas: 68 | sha256(linhas): c0da602d0d7048aef37628179e3d68d28a3ced9e2a3235e13b60fc14b9e46bc1
```

Lado a lado com P5:
- P5:          c0da602d0d7048aef37628179e3d68d28a3ced9e2a3235e13b60fc14b9e46bc1
- Backup:      c0da602d0d7048aef37628179e3d68d28a3ced9e2a3235e13b60fc14b9e46bc1  (igual)
- Restaurado:  25c787d2bb47f4715809b68b295b9c9b22981b438521f31e0717368acbd8dee4  (difere)

Diferença exata: 1 linha em `job_watermarks` — `('accounting_sync_reconcile', 1790229683282, 1790230583296)`
— gravada pelo job do server do passo 3; demais 67 tabelas idênticas. Com o script da
ERRATA 2026-09-24 (PR #371, exclui `job_watermarks`) o restaurado dá `tabelas: 67 | c0da602d…`.

Encerramento:
```
PS C:\Users\smurf\Downloads\Luminaris\server> Select-String -Path .env -Pattern '^DATABASE_URL'

.env:1:DATABASE_URL=file:./prisma/dev.db

PS C:\Users\smurf\Downloads\Luminaris\server> taskkill /PID 42064 /F
ÊXITO: o processo com PID 42064 foi finalizado.
PS C:\Users\smurf\Downloads\Luminaris\server> netstat -ano | findstr ":3001"
PS C:\Users\smurf\Downloads\Luminaris\server>
```

*(Opcional — prova de que a API lê o restaurado, exige P7 e credencial; não substitui a comparação
SQL acima.)*

```bash
curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"SEU_USUARIO\",\"password\":\"SUA_SENHA\"}"
```

```bash
curl -s "http://localhost:3001/api/accounting/trial-balance?unitId=SEU_UNIT_ID" -H "Authorization: Bearer SEU_TOKEN"
```

Esperado: balancete cujos Σdébito/Σcrédito batem com `select sum(debitCents), sum(creditCents) from postings where unitId='<UNIT>'` sobre o restaurado — **da unidade**, não o total de P5 (que soma todas as unidades; no ensaio de 2026-09-14: 861.300 da unidade × 1.897.300 total).

> **Encerrar o server do passo 3, reverter o `DATABASE_URL` do `server/.env` (passo 3.4) e apagar o
> `restored-<data>.db` do path absoluto do passo 2 ao final do ensaio** — arquivo de teste, não deve
> sobreviver fora do descarte combinado (já coberto pelo `.gitignore` global `*.db` se ficar dentro
> do repo, mas apague por higiene de qualquer forma).

---

## Desfecho (marcar UM)

- [x] **PASSOU** — todos os passos com evidência conferindo com o esperado (restauração sobe e as
      leituras batem com o original)
- [ ] **FALHOU** — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte
      foi executado após a falha
- [ ] **BLOQUEADO** — pré-condição __ não se sustentava; execução nem começou

## Registro

- Achados no caminho (fora do escopo deste runbook):
  1. `dev.db` em 49/50 migrações; `20260923200000_add_fixed_asset_source_item_ref` aplicada antes do passo 1 (P5 refeito com 50).
  2. Passo 4 com server no ar diverge por 1 linha em `job_watermarks` → ERRATA 2026-09-24 (PR #371).
  3. Qdrant fora do ar no boot (IA) — sem efeito no ensaio.
  4. `dev.db` alterado às 10:41 de 24/09, DEPOIS do ensaio (645 lançamentos, 3.911.680 bytes); o backup `dev-20260924024331.db` preserva o estado ensaiado.
- Atualização do artefato de rastreio: `docs/plano/gates/B-4.md` — desfecho + 2026-09-24
- Assinatura do executor: RKtz
