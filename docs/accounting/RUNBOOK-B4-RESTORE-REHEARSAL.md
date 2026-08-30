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

Se qualquer pré-condição não se sustentar → desfecho **BLOQUEADO**, não execute nada.

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

Copie o arquivo de backup do passo 1 para um path alternativo, fora de `server/prisma/` (para não
colidir com o `dev.db` real que o `.env` aponta):

```bash
cp "<path do backup do passo 1>" "server/restored-<data>.db"
```

Resultado esperado: arquivo copiado, mesmo tamanho em bytes do backup de origem.

EVIDÊNCIA: [colar `ls -la` do arquivo restaurado, com tamanho em bytes]

### 3. Subir o server apontando para a restauração

**Nunca `next dev`** — mesma ressalva de build de produção do `RUNBOOK-H1-PVA.md`. Em uma sessão de
shell separada, com `DATABASE_URL` apontando para o arquivo restaurado do passo 2:

```bash
cd server && DATABASE_URL="file:./restored-<data>.db" npm run build && DATABASE_URL="file:./restored-<data>.db" npm start
```

Resultado esperado: log de boot chegando em `Luminaris Server running on ...` (não
`Boot ABORTADO`) — se o boot exigir `AccountingBinding` `Active` e o backup restaurado não tiver
um, isso é achado do próprio ensaio, não falha de script; registre e trate como **FALHOU** ou
**BLOQUEADO** conforme o caso.

EVIDÊNCIA: [colar as linhas de log do boot até "running on"]

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

> **Encerrar o server do passo 3 e apagar `server/restored-<data>.db` ao final do ensaio** —
> arquivo de teste, não deve sobreviver no working tree nem ser commitado (já coberto pelo
> `.gitignore` global `*.db`, mas apague por higiene).

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
