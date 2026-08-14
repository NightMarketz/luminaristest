# RUNBOOK: H1 — Sign-off no PVA (ECD → Apuração → ECF)

> Preparado por agente em 2026-08-13 contra `origin/main` `f14dc262`. **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`).

Executor: [nome — humano]           Data: [____]
Autorização: fila §5.1 Bloco A item 3 do `docs/accounting/ACCOUNTING-MASTER-MAP.md` (gate aberto)
Rastreio a atualizar no fim: master map §5.1 Bloco A, item 3

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = `main` `f14dc262` ou posterior | `git log origin/main --oneline -1` | [ ] |
| P2 | **Backup do `dev.db` real feito** — o passo 1 ESCREVE no razão | copiar `server/prisma/prisma/dev.db` (o populado; `server/prisma/dev.db` é isca de 0 byte) | [ ] |
| P3 | Server e app rodando em **build de produção** do commit exato (nunca `next dev`; servidor de dev longo serve código velho) | ver "Subir o ambiente" abaixo | [ ] |
| P4 | PVA da **ECD** e PVA da **ECF** instalados (versão vigente, site do SPED/Receita Federal) | abrir cada validador | [ ] |
| P5 | Mapeamento referencial com cobertura pronta + **nome da versão** em mãos (a ECD exige `mappingVersion`) | aba **Compliance** → painel de mapeamento; ou `GET /api/accounting/referential/coverage?unitId=…` | [ ] |
| P6 | Dados do declarante/livro/signatários fornecidos pelo contador (lista exata abaixo) | conferir campo a campo | [ ] |
| P7 | Dezembro do ano-calendário **OPEN** no controle de períodos (o encerramento tem gate de período) | aba **Períodos** | [ ] |

Se qualquer pré-condição não se sustentar → desfecho **BLOQUEADO**, não execute nada.

### Subir o ambiente (build de produção)

```bash
cd server && npm run build && npm start
```

```bash
cd my-app && npm run build && npm start
```

Server em `http://localhost:3001`, app em `http://localhost:3000`. Logue na aplicação e abra
**Contabilidade → aba Compliance**; escolha a unidade no seletor. Para o `unitId` do passo 1, abra
DevTools → Network e leia o parâmetro `unitId=` de qualquer request da tela.

### Dados que o contador precisa fornecer (P6) — formatos validados pelo backend

**ECD — declarante:** `nome` (≤150), `uf` (sigla), `codMun` (7 dígitos IBGE), `ie`/`im` (opcionais),
`indNire` (0/1), `indGrandePorte` (0/1), `indSitIniPer` (0/1/2), `indFinEsc` (0=Original),
`tipEcd` (0/1/2), `codPlanRef` (1–10, opcional).
**ECD — livro:** `numOrd`, `natLivr` (≤80), `nire` (opcional), `dtExSocial`.
**ECD — signatários** (regra J930, o backend rejeita fora disso): **exatamente um** com
`indRespLegal = S`; **pelo menos um contador** (`codAssin = 900`) **e pelo menos um não-contador**.
Cada um: `identNom`, `identCpfCnpj`, `codAssin`.

**ECF — declarante:** `nome`, `codNat` (3–4 dígitos), `cnaeFiscal` (7 dígitos), `endereco`, `num`,
`bairro`, `uf`, `codMun` (7 dígitos), `cep` (8 dígitos, só números), `email` válido, `numTel` (opc.).
**ECF — fiscal:** `indAliqCsll` (1 ou 4), `indRecReceita` (1 ou 2).
**ECF — signatários:** **1 ou 2** (máximo 2); pelo menos um com `identQualif = 900` (contador, exige
CRC) e pelo menos um não-900. Cada um: `identNom`, `identCpfCnpj`, `identQualif` (3 dígitos), `email`, `fone`.

---

## Passos

Cada passo tem três campos. **EVIDÊNCIA é obrigatória e é sempre artefato colado** (tela do PVA,
protocolo, saída de comando) — nunca uma frase dizendo que deu certo.

### 1. Encerramento do exercício (apuração do resultado)

Não há tela para isto — é chamada de API. Pegue o token e dispare (substitua `SEU_USUARIO`,
`SUA_SENHA`, `SEU_UNIT_ID`, `ANO`):

```bash
curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"SEU_USUARIO\",\"password\":\"SUA_SENHA\"}"
```

```bash
curl -s -X POST http://localhost:3001/api/accounting/closing/exercise -H "Content-Type: application/json" -H "Authorization: Bearer SEU_TOKEN" -d "{\"unitId\":\"SEU_UNIT_ID\",\"year\":ANO}"
```

Resultado esperado: HTTP **201** com `{ success: true, data: … }` descrevendo o lançamento de
encerramento (balanceado, zera as contas de resultado contra lucros acumulados). É **idempotente por
exercício** — rodar de novo não duplica. Se responder 400 "sem saldo de resultado a encerrar", não há
o que encerrar no ano; se o erro for de período, dezembro está fechado (volte a P7).
Para desfazer: estorne o lançamento retornado via `POST /api/accounting/reverse` (isso libera a chave
de idempotência para um novo encerramento).

EVIDÊNCIA: [colar o JSON da resposta 201 — id do lançamento e as pernas]

### 2. Conferir que o encerramento entrou no razão

Na aplicação, aba **Balancete** (e DRE) do ano-calendário: as contas de resultado devem estar zeradas
e o resultado transferido para lucros/prejuízos acumulados.

Resultado esperado: DRE do exercício encerrado sem saldo residual nas contas de resultado.

EVIDÊNCIA: [screenshot do balancete/DRE após o encerramento]

### 3. Gerar a ECD

Aba **Compliance** → formulário **ECD**: preencha ano, a **versão do mapeamento** (P5), declarante,
livro e signatários (P6). Clique em gerar — um clique gera **e baixa** o `.txt`.

Resultado esperado: download do arquivo (`sped-ecd-<ano>.txt`). Se vier **400 com
`unmappedAccounts`**, a cobertura do mapeamento tem buraco: isso é **BLOQUEADO** (pré-condição P5),
não falha de execução — feche a cobertura e recomece.

> **Não reabra e re-salve o `.txt` em editor de texto.** O arquivo é gerado na codificação que o PVA
> espera; salvar por cima (ex.: como UTF-8) corrompe o import e produz crítica falsa.

EVIDÊNCIA: [nome do arquivo baixado + tamanho; e as primeiras linhas do registro 0000 — **tarje
CNPJ/CPF** se este runbook for commitado]

### 4. Importar a ECD no PVA

Abra o PVA da ECD → importar o `.txt` gerado. Anote **cada crítica** com o código do registro
(ex.: I050, J930), não só a mensagem.

Resultado esperado: import **sem críticas impeditivas**.

EVIDÊNCIA: [tela/protocolo do PVA com o resultado do import + lista de críticas, se houver]

> **Se houver crítica:** desfecho **FALHOU**, e **pare aqui — não execute os passos 5 e 6.**
> Crítica do PVA é **achado de domínio**: vira ADR ou emenda do ADR existente, **nunca hotfix**.

### 5. Gerar a ECF

Só depois que a ECD importou limpa. Mesma aba **Compliance** → formulário **ECF**: ano, declarante,
dados fiscais e signatários (P6). Clique em gerar — gera e baixa.

Resultado esperado: download de `sped-ecf-<ano>.txt`. Se vier **400 com `unmappedRevenueAccounts`**,
existe conta de receita com movimento fora de {3.1, 3.3} — achado de domínio, registre e pare.

EVIDÊNCIA: [nome do arquivo + primeiras linhas do 0000, tarjadas]

### 6. Importar a ECF no PVA

Abra o PVA da ECF → importar o `.txt`. Anote cada crítica com o código do registro.

Resultado esperado: import sem críticas impeditivas.

EVIDÊNCIA: [tela/protocolo do PVA + lista de críticas, se houver]

---

## Desfecho (marcar UM)

- [ ] **PASSOU** — todos os passos com evidência conferindo com o esperado (ECD e ECF importaram limpo)
- [ ] **FALHOU** — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi
      executado após a falha
- [ ] **BLOQUEADO** — pré-condição __ não se sustentava; execução nem começou

## Registro

- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha do master map §5.1 Bloco A item 3 atualizada com o
  desfecho + data]
- Assinatura do executor: ____________
