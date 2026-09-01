# RUNBOOK: B4 — Ensaio de restauração (backup → restore → conferência)

> Preparado por agente em 2026-08-30 contra `origin/main` `41884c8a`. **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`).

Executor: [nome — humano]           Data: [____]
Autorização: item B-1/B-4 do plano pré-dados-reais (Wave 1, "Pode disparar" — dono, 2026-08-30);
BRIEF-W1-C. Não há entrada B-1/B-4 explícita em `docs/accounting/ACCOUNTING-MASTER-MAP.md` nem em
`docs/accounting/PROXIMOS-PASSOS-2026-08-28.md` no momento em que este runbook foi preparado
(grep = 0 hits) — se o mapa ganhar uma linha correspondente, aponte-a no campo "Rastreio a
atualizar" abaixo antes de assinar.
Rastreio a atualizar no fim: [linha do master map / plano-mãe que este runbook fecha — humano aponta]

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = `main` `41884c8a` ou posterior, com `server/scripts/db-backup.mjs` e `npm run db:backup` presentes | `git log origin/main --oneline -1`; `cat server/package.json \| grep db:backup` | [ ] |
| P2 | `dev.db` real existe e está populado (o passo 1 só LÊ, mas confirme antes de mexer) | `ls -la server/prisma/prisma/dev.db` (o populado; `server/prisma/dev.db` é isca de 0 byte) | [ ] |
| P3 | `cd server && npm ci && npx prisma generate` rodado (client do Prisma presente) | `ls server/generated/prisma` | [ ] |
| P4 | Porta 3001 (server) e 3000 (app) livres para o boot do passo 3 | `netstat -ano \| grep ":3001\|:3000"` sem processo Luminaris já ativo | [ ] |
| P5 | Duas leituras de referência do banco ORIGINAL anotadas ANTES de restaurar (balancete e uma
listagem — comparar depois contra o restaurado) | ver "Leituras de referência" abaixo | [ ] |
| P6 | `OPENAI_API_KEY` presente em `server/.env`, qualquer valor não vazio — sem ela `new OpenAIService()` lança na construção do factory e o boot aborta ANTES de tocar no banco (verificado); nenhum passo deste runbook exercita IA, então um valor dummy serve só para este ensaio | `grep OPENAI_API_KEY server/.env` — se vazio/ausente, acrescente uma linha como `OPENAI_API_KEY=sk-rehearsal-dummy-nao-real` | [ ] |
| P7 | `unitId` da unidade a testar, resolvido ANTES de P5 (os curls de P5 e do passo 4 exigem `unitId`, e não é um valor óbvio) | ver "Como descobrir o unitId" abaixo | [ ] |

Se qualquer pré-condição não se sustentar → desfecho **BLOQUEADO**, não execute nada.

### Como descobrir o `unitId` (P7)

Caminho mais simples — tela **Contabilidade** do app (`/accounting`, componente `my-app/features/accounting/AccountingView.tsx`): o dropdown "Unidade" no cabeçalho lista as unidades pelo nome amigável, mas o `unitId` (o valor interno que os curls precisam) não aparece na tela — só no DOM/na rede. Abra o DevTools do navegador (F12) → aba Network, entre na tela e selecione a unidade; qualquer request para `/api/accounting/...` que dispare mostra `unitId=<valor>` na query string — copie esse valor.

Sem acesso à tela (ex.: ambiente sem frontend rodando): `cd server && npx prisma studio` (script já existe em `package.json`), abra a tabela `JournalEntry` e leia a coluna `unitId` de qualquer linha — todos os lançamentos da mesma unidade compartilham o valor.

### Leituras de referência (P5) — tirar ANTES do passo 1

Com o server rodando contra o `dev.db` real (ambiente atual, sem alterar nada):

```bash
curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"SEU_USUARIO\",\"password\":\"SUA_SENHA\"}"
```

```bash
curl -s "http://localhost:3001/api/accounting/trial-balance?unitId=SEU_UNIT_ID" -H "Authorization: Bearer SEU_TOKEN"
```

```bash
curl -s "http://localhost:3001/api/accounting/entries?unitId=SEU_UNIT_ID" -H "Authorization: Bearer SEU_TOKEN"
```

Guarde as duas respostas — são a base de comparação do passo 4.

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

EVIDÊNCIA: [colar a saída completa do comando, incluindo o path do backup gerado]

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

EVIDÊNCIA: [colar `ls -la` do arquivo restaurado com tamanho em bytes, e o path absoluto usado]

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

EVIDÊNCIA: [colar as linhas de log do boot até "running on", e a linha `DATABASE_URL` usada no
`.env` durante o teste]

### 4. Conferência — 2 a 3 leituras contra a restauração

Com o server do passo 3 no ar (porta 3001 apontando para o restaurado):

```bash
curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"SEU_USUARIO\",\"password\":\"SUA_SENHA\"}"
```

```bash
curl -s "http://localhost:3001/api/accounting/trial-balance?unitId=SEU_UNIT_ID" -H "Authorization: Bearer SEU_TOKEN"
```

```bash
curl -s "http://localhost:3001/api/accounting/entries?unitId=SEU_UNIT_ID" -H "Authorization: Bearer SEU_TOKEN"
```

Resultado esperado: balancete e listagem de lançamentos **idênticos** aos capturados em "Leituras
de referência" (P5) contra o banco original.

EVIDÊNCIA: [colar as duas respostas + confirmação lado a lado com P5 — iguais ou diferença exata]

> **Encerrar o server do passo 3, reverter o `DATABASE_URL` do `server/.env` (passo 3.4) e apagar o
> `restored-<data>.db` do path absoluto do passo 2 ao final do ensaio** — arquivo de teste, não deve
> sobreviver fora do descarte combinado (já coberto pelo `.gitignore` global `*.db` se ficar dentro
> do repo, mas apague por higiene de qualquer forma).

---

## Desfecho (marcar UM)

- [ ] **PASSOU** — todos os passos com evidência conferindo com o esperado (restauração sobe e as
      leituras batem com o original)
- [ ] **FALHOU** — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte
      foi executado após a falha
- [ ] **BLOQUEADO** — pré-condição __ não se sustentava; execução nem começou

## Registro

- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha do plano/mapa atualizada com o desfecho + data —
  aponte a linha correta se `ACCOUNTING-MASTER-MAP.md` ganhar uma entrada B-1/B-4 explícita]
- Assinatura do executor: ____________
