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
| **P2b** | **[EMENDA 2026-08-27] Migrações pendentes aplicadas + binding `Active` no banco** — sem isso o `npm start` do P3 **aborta com exit 1** e nada abaixo é executável | ver "P0 de boot" abaixo | [ ] |
| P3 | Server e app rodando em **build de produção** do commit exato (nunca `next dev`; servidor de dev longo serve código velho) | ver "Subir o ambiente" abaixo | [ ] |
| P4 | PVA da **ECD** e PVA da **ECF** instalados na versão vigente — **[EMENDA 2026-09-07]** origem, versão, tamanho e passos em **"P4 detalhado"** abaixo; o Manual da ECF (Leiaute 12) é insumo do passo 6 | abrir cada validador → menu Ajuda/Sobre → versão igual à de "P4 detalhado" (ou mais nova, com a página oficial como prova) | [ ] |
| P5 | Mapeamento referencial com cobertura pronta + **nome da versão** em mãos (a ECD exige `mappingVersion`) | aba **Compliance** → painel de mapeamento; ou `GET /api/accounting/referential/coverage?unitId=…` | [ ] |
| P6 | Dados do declarante/livro/signatários fornecidos pelo contador (lista exata abaixo) | conferir campo a campo | [ ] |
| P7 | Dezembro do ano-calendário **OPEN** no controle de períodos (o encerramento tem gate de período) | aba **Períodos** | [ ] |

Se qualquer pré-condição não se sustentar → desfecho **BLOQUEADO**, não execute nada.

### P4 detalhado — validadores oficiais e Manual (EMENDA 2026-09-07)

> Até esta data a P4 dizia só "site do SPED/Receita Federal". O que segue foi **verificado pelo
> agente em 2026-09-07** lendo as páginas oficiais e baixando os arquivos (tamanho conferido byte a
> byte com o `Content-Length` do servidor; cabeçalho `MZ`/`%PDF` conferido). **O que o agente NÃO
> fez e não faz:** instalar, abrir ou executar qualquer binário — isso é do executor humano, e a
> versão "vigente" só se prova abrindo o programa (evidência abaixo).

**Onde está (fonte oficial, única que vale):** portal gov.br/receitafederal → Centrais de Conteúdo →
Download → SPED. As duas páginas:

| Validador | Página oficial | Arquivo Windows x64 (vigente em 2026-09-07) | Bytes | Página "Atualizado em" |
|---|---|---|---|---|
| **ECD** (Sped Contábil) | <https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/download/sped/ecd> | [`SPEDContabil_w64-10.4.1.exe`](https://servicos.receita.fazenda.gov.br/publico/programas/Sped/SpedContabil/SPEDContabil_w64-10.4.1.exe) | 129.667.328 | 19/05/2026 |
| **ECF** | <https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/download/sped/ecf> | [`SpedEcf_w64-12.2.6.exe`](https://servicos.receita.fazenda.gov.br/publico/programas/Sped/ECF/SpedEcf_w64-12.2.6.exe) | 143.753.984 | **03/09/2026** |

As páginas também oferecem `w32` (Windows 32 bits) e Linux (`.sh`, exige `chmod +x` segundo a
própria página). O atalho `gov.br/sped → Centrais de Conteúdo → Downloads → "Validador ECD/ECF"`
redireciona para as mesmas páginas. Cópia local baixada em 2026-09-07:
`C:\Users\smurf\Downloads\luminaris-gates\` (os dois `.exe` + os dois PDFs abaixo).

**Leitura de versão (grau: inferido, confirmar no "Sobre"):** o major do validador da ECF (**12**.x)
acompanha o **Leiaute 12** do Manual; a página da ECF foi atualizada em **03/09/2026**, quatro dias
antes desta emenda — se ao abrir o programa a versão for maior que 12.2.6, a página oficial é a
verdade e este quadro é histórico. Para a ECD, o número (10.4.1) **não** é o número do leiaute da
ECD; não infira nada dele.

**Manual da ECF — Leiaute 12 (insumo dos passos 5 e 6):**
[`Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026.pdf`](http://sped.rfb.gov.br/arquivo/download/8003)
(6.410.931 bytes, 621 páginas; página 1 carimba "Anexo ao Ato Declaratório Executivo Cofis nº
02/2026 — Atualização: maio/2026", coerente com o 20/05/2026 do índice
<http://sped.rfb.gov.br/pasta/show/1644>). O host `sped.rfb.gov.br` **só responde em `http://`**.
É nele que se traduz cada crítica do PVA da ECF para o registro/campo (passo 6) e é ele que os
Forks 2/3/4 da ECF Fase 3 esperam. O carimbo `[DONO confere]` do BRIEF da Fase 3 e do RUNBOOK-X2
continua sendo do dono; a evidência está na página 1 do arquivo.

**Passos de instalação (executor humano; cada linha é uma ação, evidência ao final):**

1. Confira na **página oficial** de cada validador se o nome do arquivo ainda é o do quadro. Se
   mudou, baixe o novo da página e **atualize o quadro** nesta emenda antes de seguir — não instale
   a cópia local antiga.
2. Execute `SPEDContabil_w64-10.4.1.exe` como o usuário que vai rodar o H1 (o programa grava a base
   local do validador no perfil desse usuário). Aceite o diretório padrão.
3. Execute `SpedEcf_w64-12.2.6.exe` da mesma forma. São **dois programas independentes**; o da ECF
   não substitui nem contém o da ECD.
4. Abra cada um, vá em **Ajuda → Sobre** (ou equivalente) e anote a versão exibida.
5. Se o programa oferecer **atualização automática** ao abrir, aceite e anote a versão final — o que
   conta é a versão com que o passo 4/6 do runbook vai rodar, não a do instalador.

EVIDÊNCIA P4: [screenshot do "Sobre" de cada validador com a versão legível + `dir` (ou `ls -l`) da
pasta `luminaris-gates` mostrando os 4 arquivos com os bytes do quadro]

**O que cada validador faz no fluxo deste runbook** (para não importar no programa errado):

| Passo | Programa | Entrada | Saída que vira evidência |
|---|---|---|---|
| 4 | Validador **ECD** | `sped-ecd-<ano>.txt` gerado no passo 3 (não reabra em editor — codificação) | tela de resultado do import + lista de críticas com **código do registro** (I050, J930…) |
| 6 | Validador **ECF** | `sped-ecf-<ano>.txt` gerado no passo 5 | idem; cada crítica traduzida pelo Manual (registro/campo/página) |

Ambos rodam **offline** para validar; nenhum passo deste runbook transmite nada à RFB
(transmitir é ato do contador com certificado, fora do H1 — ver pedido ao contador, item 0).

**Fora do H1, mas baixado na mesma sessão:** `Ato_Conjunto_RFB_CGIBS_4_2026.pdf` (867.240 bytes,
3 páginas, <https://cgibs.gov.br/upload/arquivos/202607/31091735-20260730-16h30-ato-conjunto-rfb-cgibs-na-c2-ba-4-260731-090909.pdf>)
— calendário de obrigatoriedade NFS-e/NF-e com IBS/CBS; insumo do ADR de emissão via parceiro
(cédula de módulos F-M7), não deste gate.

### P0 de boot (EMENDA 2026-08-27 — fazer ANTES de "Subir o ambiente")

> **O boot mudou depois que este runbook foi escrito.** Desde o PR #213 (`cd853d2e`, 2026-08-25),
> `bootstrap()` em [server.ts:36](../../server/src/server.ts:36) aguarda o alimentador de bindings
> antes do `app.listen()` e **mata o processo com exit 1** se houver zero `AccountingBinding`
> `Active` (F-FEEDER-4/5). **Medido em 2026-08-27 sobre cópia do `dev.db` real: a tabela
> `accounting_bindings` NÃO EXISTE** — 29 das 31 migrações aplicadas, faltando
> `20260821090000_accounting_binding` e `20260825120000_rename_salon_to_sale_vocabulary`.
>
> Ordem obrigatória (ADR-INCR-BINDING-FEEDER §8: chart de contas → binding compilado → boot), a
> mesma do P0 do [RUNBOOK-H2](RUNBOOK-H2-BROWSER-SIGNOFF.md), onde está o detalhe completo:
> 1. `node scripts/smoke-migration-gate.mjs` sobre cópia (S1 garante o original intocado) — só siga com PASS.
> 2. Backup + `prisma migrate deploy` no `dev.db` real — escreve em dado real, decisão do dono.
> 3. `node scripts/activate-salon-binding.mjs` — a tabela nasce vazia; migrar não basta.
>
> Fechou quando `npm start` imprime `Luminaris Server running on ...` em vez de `Boot ABORTADO`.

### Subir o ambiente (build de produção)

> ✅ **Bloqueador de boot RESOLVIDO (2026-08-19):** o pré-voo de agente encontrou o `npm run build`
> emitindo `require('@/...')` literal (boot do dist morria em `Cannot find module '@/lib/factory'`);
> o fix (`tsc-alias` no build + 2º alvo `../generated/prisma` no tsconfig, commit `556d1421`) foi
> **mergeado na main via PR #204 em 2026-08-19, CI verde**. Esta sessão pode ser agendada.
> O restante do caminho está ensaiado: sobre cópia do dev.db real, encerramento
> (201 balanceado), ECD (com mapeamento placeholder: artefato 243 registros, Latin-1 confirmado) e
> ECF (201 direto) geraram — o gerador funciona.

```bash
cd server && npm run build && npm start
```

```bash
cd my-app && npm run build && npm start
```

Server em `http://localhost:3001`, app em `http://localhost:3000`. Logue na aplicação e abra
**Contabilidade → aba Compliance**; escolha a unidade no seletor. Para o `unitId` do passo 1, abra
DevTools → Network e leia o parâmetro `unitId=` de qualquer request da tela.

### Dados que precisam ser levantados antes de gerar ECD/ECF (P6) — formatos validados pelo backend

> **[CORREÇÃO 2026-09-01]** A versão anterior desta seção divergia dos DTOs reais em 5 pontos — a
> pior: `identQualif` do signatário da ECD é **obrigatório** no backend e estava **ausente** daqui,
> o que levava a coletar dado incompleto do contador. Fonte de verdade, releia se o backend mudar:
> [SpedEcdDto.ts](../../server/src/features/accounting/dtos/SpedEcdDto.ts) e
> [SpedEcfDto.ts](../../server/src/features/accounting/dtos/SpedEcfDto.ts). Campo **obrigatório**
> sem default → a geração recusa com 400 se faltar; campo com **default** pode ficar de fora do
> formulário, o backend preenche sozinho.

**Separe por origem antes de escrever para o contador** — o formulário da tela mistura os dois, mas
pedir ao contador o que já está no CNPJ/contrato social da empresa é ida-e-volta desnecessária:
- 🏢 **Do dono/empresa** — está no cartão CNPJ, contrato social ou já cadastrado no sistema.
- 📗 **Do contador** — classificação técnica/SPED; exige julgamento contábil, peça a ele.

#### ECD — declarante (registro 0000)

| Campo | Origem | Formato | Obrigatório / default |
|---|---|---|---|
| `cnpj` | 🏢 dono | 14 dígitos | **obrigatório** |
| `nome` | 🏢 dono | texto ≤150 | **obrigatório** |
| `uf` | 🏢 dono | sigla UF | **obrigatório** |
| `codMun` | 🏢 dono | 7 dígitos (IBGE) | **obrigatório** |
| `ie` | 🏢 dono | texto | opcional |
| `im` | 🏢 dono | texto | opcional |
| `indNire` | 🏢 dono | `0`/`1` | **obrigatório** (sem default) |
| `indGrandePorte` | 📗 contador | `0`/`1` | **obrigatório** (sem default) |
| `indSitEsp` | 📗 contador | `1`–`4` (cisão/fusão/incorp./extinção) | opcional |
| `indSitIniPer` | 📗 contador | `0`/`1`/`2` | opcional — **default `'0'`** |
| `indFinEsc` | 📗 contador | `0`/`1` | opcional — **default `'0'` (Original)** |
| `tipEcd` | 📗 contador | `0`/`1`/`2` | opcional — **default `'0'`** |
| `codHashSub` | 📗 contador | texto | opcional |
| `codScp` | 📗 contador | CNPJ, 14 dígitos | opcional |
| `identMf` | 📗 contador | `S`/`N` | opcional — **default `'N'`** |
| `indEscCons` | 📗 contador | `S`/`N` | opcional — **default `'N'`** |
| `indCentralizada` | 📗 contador | `0`/`1` | opcional — **default `'0'`** |
| `indMudancPc` | 📗 contador | `0`/`1` | opcional — **default `'0'`** |
| `codPlanRef` | 📗 contador | `1`–`10` | opcional |

#### ECD — livro (I030/J900)

| Campo | Origem | Formato | Obrigatório / default |
|---|---|---|---|
| `numOrd` | 📗 contador | texto | **obrigatório** |
| `natLivr` | 📗 contador | texto ≤80 | **obrigatório** |
| `dtExSocial` | 📗 contador | `YYYY-MM-DD` | **obrigatório** |
| `nire` | 📗 contador | texto | opcional |
| `dtArq` | 📗 contador | `YYYY-MM-DD` | opcional |
| `dtArqConv` | 📗 contador | `YYYY-MM-DD` | opcional |
| `descMun` | 📗 contador | texto | opcional |

#### ECD — signatários (J930; lista, mínimo 1)

⚠️ `identQualif` é **obrigatório** e estava **ausente** na versão anterior — sem ele o backend
rejeita a geração (400). Regra do backend (rejeita fora disso —
[SpedEcdDto.ts:96-116](../../server/src/features/accounting/dtos/SpedEcdDto.ts)): **exatamente um**
signatário com `indRespLegal = 'S'`; **pelo menos um** com `codAssin = '900'` (contador) **e pelo
menos um** com `codAssin` diferente de `'900'`.

| Campo | Formato | Obrigatório / default |
|---|---|---|
| `identNom` | texto | **obrigatório** |
| `identCpfCnpj` | CPF (11) ou CNPJ (14) dígitos | **obrigatório** |
| `identQualif` | texto (descrição da qualificação) | **obrigatório** |
| `codAssin` | 3 dígitos | **obrigatório** |
| `indRespLegal` | `S`/`N` | **obrigatório** |
| `indCrc` | texto | opcional (o DTO da ECD não exige CRC nem do signatário contador) |
| `email` | texto | opcional |
| `fone` | texto | opcional |
| `ufCrc` | sigla UF | opcional |
| `numSeqCrc` | texto | opcional |
| `dtCrc` | `YYYY-MM-DD` | opcional |

#### ECF — declarante (registros 0000/0030)

| Campo | Origem | Formato | Obrigatório / default |
|---|---|---|---|
| `cnpj` | 🏢 dono | 14 dígitos | **obrigatório** |
| `nome` | 🏢 dono | texto ≤150 | **obrigatório** |
| `codNat` | 🏢 dono | 3–4 dígitos (natureza jurídica) | **obrigatório** |
| `cnaeFiscal` | 🏢 dono | 7 dígitos | **obrigatório** |
| `endereco` | 🏢 dono | texto ≤150 | **obrigatório** |
| `bairro` | 🏢 dono | texto ≤50 | **obrigatório** |
| `uf` | 🏢 dono | sigla UF | **obrigatório** |
| `codMun` | 🏢 dono | 7 dígitos (IBGE) | **obrigatório** |
| `cep` | 🏢 dono | 8 dígitos, só números | **obrigatório** |
| `email` | 🏢 dono | e-mail válido | **obrigatório** |
| `num` | 🏢 dono | texto ≤6 | opcional — **default `'S/N'`** |
| `compl` | 🏢 dono | texto ≤50 | opcional |
| `numTel` | 🏢 dono | texto ≤15 | opcional |

#### ECF — parâmetros fiscais (0010/0020)

> **[EMENDA 2026-09-02 — regime ratificado pelo dono]** O regime-alvo do produto é **Lucro Real**
> (critério: *"o mais completo que englobe todos os outros e produza prova de evidência que os
> runbooks exigem"*). **Este H1 roda em Lucro Presumido assim mesmo, e isso é deliberado:** o
> serializer é Presumido MVP (`server/src/lib/ecf.ts:4`), emite `FORMA_TRIB='5'` fixo (`:145`), deixa
> os blocos **L/M/N vazios por desenho** (`:330`) e nem expõe `formaTrib` no `SpedEcfDto` — pedir
> Lucro Real hoje seria **FALHOU garantido** no PVA, não um parâmetro diferente.
>
> O que este H1 prova, então: a cadeia **ECD + encerramento + ECF** contra o validador oficial —
> oráculo do **módulo**, que é o que a fila §5.1 item 3 cobra. O que ele **não** prova: a ECF do
> regime-alvo. Isso fica com a **2ª passada do H1** após a frente *ECF Fase 3 — Lucro Real*
> (Bloco B item 10 do `ACCOUNTING-MASTER-MAP.md`), obrigatória **antes de operar cliente real**.
>
> Efeito prático nos campos abaixo: nenhum. `indAliqCsll`/`indRecReceita` seguem como estão; não
> acrescente campo de regime a este request — a API não tem onde recebê-lo.


O bloco inteiro pode ficar de fora do request — se omitido, o backend assume
`indAliqCsll: '1'`, `indRecReceita: '2'`.

| Campo | Origem | Formato | Obrigatório / default |
|---|---|---|---|
| `indAliqCsll` | 📗 contador | `1` (9%) ou `4` (15%) | opcional — **default `'1'`** |
| `indRecReceita` | 📗 contador | `1` ou `2` (Regime de Competência) | opcional — **default `'2'`** |

#### ECF — signatários (0930; lista, 1 a 2)

Regra do backend: **pelo menos um** com `identQualif = '900'` (contador — exige `identCpfCnpj` de
11 dígitos **e** `indCrc` preenchido) **e pelo menos um** não-`900`.

| Campo | Formato | Obrigatório / default |
|---|---|---|
| `identNom` | texto | **obrigatório** |
| `identCpfCnpj` | CPF (11) ou CNPJ (14) dígitos | **obrigatório** |
| `identQualif` | 3 dígitos | **obrigatório** |
| `email` | e-mail válido | **obrigatório** |
| `fone` | texto ≤14 | **obrigatório** |
| `indCrc` | texto | opcional — **na prática obrigatório se `identQualif = '900'`** |

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

---

## 2ª passada — Lucro Real (Blocos L/M/N) — preparada pelo agente em 2026-09-11, EM BRANCO

> **[BRIEF 3B item 20]** Preparado pela `sessao-feature` do BRIEF `BE-INCR-SPED-ECF-FASE3B-blocos-LMN`
> (Forks 2→d, 3→a, 4→b, 6→b, 7→a ratificados em 2026-09-11). O agente redigiu os passos e as
> pré-condições; **EVIDÊNCIA, desfecho e assinatura são do humano** (RUNBOOK-FORMAT). A rota é
> `POST /api/accounting/sped/ecf/real/generate` (`fiscal.formaTribPer` obrigatório, ex. `RRRR`); os
> ajustes do e-Lalur vêm de `/api/lalur` (cadastrados ANTES de gerar — o corpo da geração não os carrega).
> A tela de cadastro é `FE-INCR-LALUR`, incremento separado: nesta passada o cadastro é por API (curl/Insomnia).

### Pré-condições adicionais (além das da 1ª passada)

- [ ] `year` da geração tem leiaute na tabela `ECF_COD_VER_BY_YEAR` (`server/src/lib/ecf.ts`) — hoje só
      **2025**; AC 2026 exige o Manual do Leiaute 13 no corpus + uma linha na tabela (ou `fiscal.codVer`).
- [ ] Pelo menos **1 ajuste** cadastrado em `/api/lalur/entries` (adição ou exclusão, linha `E` da aba
      M300A) e, se houver Parte B, a conta em `/api/lalur/parte-b` — senão o Bloco M sai só com períodos e
      a passada prova estrutura, não o e-Lalur (resíduo do Fork 4→(c), registrado no ADR §7).

### 2P-1. Recuperar a ECF do período anterior no PVA ANTES de validar

Manual do Leiaute 12, p.14: a partir do **2º exercício** em `FORMA_TRIB=1`, a transmissão verifica se
existe ECF transmitida do período anterior com o hashcode informado; o `.txt` do Luminaris emite
`0010.HASH_ECF_ANTERIOR` **vazio** (p.70, campo 2: *"preenchido automaticamente pelo sistema"*, Fork 2→d).
No PVA: abrir a escrituração → **Recuperar ECF anterior** → confirmar que o hash apareceu no 0010 e que os
saldos da Parte B (`E020`) recuperados batem com os `M010` do arquivo (`REGRA_SALDOS_M010_E020`, p.237 —
é erro, não aviso). **1º exercício em Real**: registrar "não se aplica" com o motivo.

Resultado esperado: recuperação sem erro; `E020` × `M010` iguais para cada `COD_CTA_B + COD_TRIBUTO`.

EVIDÊNCIA: [tela do PVA após a recuperação — hash do 0010 e lista E020/M010, tarjados]

### 2P-2. Importar a ECF do Real no PVA — e o que fazer se recusar E990/M990/S990

Importar o `.txt` gerado. Tabela de Registros do Manual (pp.44/47): `E990` e `M990` têm **Entrada = N**
("não deve existir" na importação) e `S990` **não consta** da tabela — o Luminaris emite os três por
regra "todos os blocos obrigatórios" (p.41), como no Presumido. **Se a importação acusar** exatamente uma
dessas linhas: anotar o código da crítica, remover a linha correspondente em `EMPTY_BLOCKS_*`
(`server/src/lib/ecfReal.ts`; no Presumido, `ecf.ts`) por `sessao-correcao` de uma linha, regerar e
reimportar. Se acusar **outro** registro, é FALHOU deste passo — não editar nada.

Resultado esperado: import sem críticas impeditivas; `L030/M030/N030` aceitos; `M300/M350` com seus
filhos `M305/M310` sem `REGRA_RELACAO_INEXISTENTE`/`REGRA_PEA`/`REGRA_VALOR_DETALHADO`; linhas `E` de
`N630/N670` aceitas e as `CNA` (IRPJ 15%, adicional) computadas pelo PVA.

EVIDÊNCIA: [tela/protocolo do PVA + lista de críticas com código do registro, se houver]

### 2P-3. Oráculo da leitura INFERIDA (Nota N-3 do BRIEF)

Se o PVA recusar `M300` por `REGRA_OBRIGATORIO_TIPO_E` / `REGRA_NAO_PREENCHER_TIPO_DIFERENTE_E`
(p.247 — os dois textos se contradizem; o serializer emite `TIPO_LANCAMENTO` e `IND_RELACAO` em toda
linha `E`), registrar a crítica literal: muda o **serviço**, não o DTO.

EVIDÊNCIA: [crítica literal do PVA ou "nenhuma crítica de TIPO_LANCAMENTO"]

## Desfecho da 2ª passada (marcar UM)

- [ ] **PASSOU** — 2P-1 (ou "não se aplica" justificado) e 2P-2 com evidência conferindo; 2P-3 sem crítica
- [ ] **FALHOU** — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi
      executado após a falha
- [ ] **BLOQUEADO** — pré-condição __ não se sustentava; execução nem começou

## Registro da 2ª passada

- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha do master map §5.1 Bloco B item 10 atualizada com o
  desfecho + data]
- Assinatura do executor: ____________
