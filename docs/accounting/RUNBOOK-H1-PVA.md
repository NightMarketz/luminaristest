# RUNBOOK: H1 — Sign-off no PVA (ECD → Apuração → ECF)

> Preparado por agente em 2026-08-13 contra `origin/main` `f14dc262`. **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`).

Executor: [nome — humano]           Data: [____]
Autorização: dono em chat, 24/09: "pode seguir pro H1" / "assinei o X2, pode seguir pro H1" — campo `autorizacao` de
[`docs/plano/gates/H1.md`](../plano/gates/H1.md) *(emenda 05/10; antes: fila §5.1 Bloco A item 3 do master map, já sem arquivo)*
Rastreio a atualizar no fim: nota [`docs/plano/gates/H1.md`](../plano/gates/H1.md) (ex-master map §5.1 Bloco A, item 3)

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
| P7-seed | **[EMENDA 2026-09-24 — decisão do dono (a)] Tenants do seed (`seed-presumido`/`seed-real`): P7 NÃO SE APLICA** — o exercício 2025 já foi encerrado (`closeExercise`) e `HARD_CLOSED` pelo `db:seed:accounting`. Confira em vez disso que dezembro/2025 está `HARD_CLOSED` | aba **Períodos** (ano 2025) | [ ] |

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
| **ECF** | <https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/download/sped/ecf> | [`SpedEcf_w64-12.2.7.exe`](https://servicos.receita.fazenda.gov.br/publico/programas/Sped/ECF/SpedEcf_w64-12.2.7.exe) | 143.751.424 | **18/09/2026** |

> **[EMENDA 2026-10-05 — dono: "Pode emendar, junta o cabeçalho também"]** A ECF passou de 12.2.6 para **12.2.7**: página
> oficial "Atualizado em 18/09/2026 10h54", `Content-Length` 143.751.424 e cabeçalho `MZ` conferidos pelo agente em 05/10
> (nada instalado nem executado). A 12.2.6 (143.753.984 bytes, página de 03/09) é a que a reconciliação de 17/09
> registrou como instalada — **está superada**: baixe e instale a 12.2.7 antes do passo 6. A ECD segue 10.4.1 (página
> de 19/05, conferida em 05/10). A cópia local de 07/09 em `luminaris-gates` tem o `.exe` da ECF velho.

As páginas também oferecem `w32` (Windows 32 bits) e Linux (`.sh`, exige `chmod +x` segundo a
própria página). O atalho `gov.br/sped → Centrais de Conteúdo → Downloads → "Validador ECD/ECF"`
redireciona para as mesmas páginas. Cópia local baixada em 2026-09-07:
`C:\Users\smurf\Downloads\luminaris-gates\` (os dois `.exe` + os dois PDFs abaixo).

**Leitura de versão (grau: inferido, confirmar no "Sobre"):** o major do validador da ECF (**12**.x)
acompanha o **Leiaute 12** do Manual; a página da ECF foi atualizada em **03/09/2026**, quatro dias
antes desta emenda — se ao abrir o programa a versão for maior que 12.2.7 (vigente desde 18/09, emenda 05/10), a página oficial é a
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
3. Execute `SpedEcf_w64-12.2.7.exe` da mesma forma. São **dois programas independentes**; o da ECF
   não substitui nem contém o da ECD.
4. Abra cada um, vá em **Ajuda → Sobre** (ou equivalente) e anote a versão exibida.
5. Se o programa oferecer **atualização automática** ao abrir, aceite e anote a versão final — o que
   conta é a versão com que o passo 4/6 do runbook vai rodar, não a do instalador.

EVIDÊNCIA P4: [screenshot do "Sobre" de cada validador com a versão legível + `dir` (ou `ls -l`) da
pasta `luminaris-gates` mostrando os 4 arquivos com os bytes do quadro]

> Preenchida pelo agente sob comando do dono (2026-10-07). **ECF:** screenshot do "Sobre" colado pelo dono no
> chat em 2026-10-07 — "Sped ECF · Versão: 12.2.7". **ECD:** screenshot do "Sobre" colado pelo dono no chat
> em 2026-10-07 — "Sped Contábil · Versão: 10.4.1 · Versão JVM Utilizada: 21.0.3".
> Leitura do agente (`.install4j/i4jparams.conf`, `applicationVersion`), medida antes e depois da reinstalação:
>
> ```text
> antes (2026-10-07):  SpedContabil 10.4.1 · SpedECF 12.2.6 (i4jparams de 2026-09-14; registro "Escrituração Digital ECF 12.2.6")
> depois (2026-10-07): SpedContabil: applicationVersion="10.4.1"
>                      SpedECF: applicationVersion="12.2.7"   (.install4j/* regravado em 2026-10-07)
> ls -l Downloads/luminaris-gates:
>   867240     Ato_Conjunto_RFB_CGIBS_4_2026.pdf
>   6410931    Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026.pdf
>   129667328  SPEDContabil_w64-10.4.1.exe
>   143753984  SpedEcf_w64-12.2.6.exe        ← o instalador 12.2.7 NÃO está nesta pasta (baixado em outro lugar)
> ```

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

> **[EMENDA 2026-09-24 — SEED-MY] Alvo = seed multi-exercício (`db:seed:accounting`).** O `dev.db` é
> seed de testes (decisão do dono 12/09). Depois do `npm run db:backup`, rode
> `cd server && SEED_ACCOUNTING_PASSWORD=<senha> npm run db:seed:accounting -- --years 2025,2026 --i-have-a-backup`:
> cria os tenants `seed-presumido`/`seed-real` (uma unidade por tenant, de **nome** `seed-unit-presumido` / `seed-unit-real` — o `unitId` é o **id gerado**, impresso pelo seed) com o salão instalado e o chart completo (19 contas,
> `1.1.6/3.3/4.2` inclusas), 2025 encerrado + `HARD_CLOSED`, 2026 `OPEN` até o mês corrente, AP/AR e
> `FiscalProfile` por regime; sai 1 se o tie-out não fechar. Em seguida rode o
> `activate-salon-binding.mjs` impresso pelo comando para cada tenant (o seed não ativa binding). Com isso o
> P0.2b (completar chart + abrir mês) fica coberto para esses tenants. A 2ª passada (Lucro Real) usa
> `seed-real`.
>
> **[EMENDA 2026-10-03 — SEED-UNITS, F-S1c → a] Re-semear.** Um `dev.db` semeado ANTES do BE-INCR-SEED-UNIDADE-E-ENV tem o razão sob o id
> literal `seed-unit-*` (que a tela não oferece). Depois do `npm run db:backup`, **re-semeie** (o comando acima) e rode o
> `activate-salon-binding.mjs` com o **novo** `unitId` impresso para cada tenant; os lançamentos e bindings antigos sob `seed-unit-*`
> ficam (órfãos, sem colisão — F-P5). Atenção: se o usuário `seed-*` já tem tabelas e nenhuma unidade com o nome pedido, o seed **recusa**
> com mensagem nomeada (não instala o sistema uma 2ª vez).
>
> **[EMENDA 2026-10-05 — preflight `luminaris-gate-copilot` pós-#487] A ordem acima está incompleta para o `dev.db` de hoje.**
> Medido em 05/10 sobre cópia do `dev.db` real (md5 `9de3277d…`, original intocado): (i) **4 migrações pendentes**
> (`20261003130000_add_fiscal_profile_pacote_ctribnac`, `20261003130100_add_fiscal_profile_pacote_cnbs`,
> `20261004130000_add_company_fiscal_profile_prestadora_exclusiva`, `20261004150000_add_accounting_policy_versions`) *[emenda do número, 05/10 — dono: "pode emendar o número de migrações do H1"; delta `d8616a4..3829fd3`
> do gate-copilot: a lista acima é a de um checkout anterior às duas migrações de 05/10. Em `main` (`3829fd3`) espere
> **6 pendentes** — as 4 acima + `20261005120000_add_package_validity_acceptances` (#530) e
> `20261005120000_add_tax_assessment_anual_fields` (#529) —, ou **7** se `20261004120000_add_tax_assessments` (#504) também
> não estiver aplicada (inferido: ela é anterior às 4 medidas e não apareceu na medição, logo deve já estar no banco).
> As 3 são só aditivas (`CREATE … IF NOT EXISTS` / `ADD COLUMN` com default ou anulável), lidas, não executadas. O critério
> do passo 2 é `migrate status` = up to date, não a contagem; diverge só migração fora destas 7]* —
> `smoke-migration-gate.mjs` PASS na cópia; (ii) o Prisma client do checkout principal estava velho — `db:seed:accounting`
> e `activate-salon-binding.mjs` morrem com `TSError` (`generated/prisma` sem `AccountingPolicyVersion`); (iii)
> `seed-presumido`/`seed-real` têm **0 tabelas dinâmicas** ⇒ o seed instala o salão + unidade (não cai na recusa);
> (iv) usuário já existente **não tem a senha reescrita** (`ensureUser`) — `SEED_ACCOUNTING_PASSWORD` é ignorado, logue
> com a senha de hoje. Ordem completa (checkout principal em `main`, server e app **parados**, Git Bash):
>
> 1. `cd server && npm run db:backup` — espera `backup gerado: …` + `integrity_check: ok`.
> 2. `npx prisma migrate deploy` — espera as pendentes aplicadas; `npx prisma migrate status` = up to date.
> 3. `npx prisma generate` — sem isto os passos 4 e 5 dão `TSError`.
> 4. `npm run db:seed:accounting -- --years 2025,2026 --i-have-a-backup` — espera JSON com 2 relatórios de `unitId`
>    **gerado** (não `seed-unit-*`), `closedYears: [2025]`, duas linhas "próximo passo" e `OK: … tie-out fechado.`
> 5. Da raiz do repo, as **duas** linhas "próximo passo" impressas (`node scripts/activate-salon-binding.mjs
>    --owner-user-id <userId> --unit-id <unitId novo>`) — espera `alvo: …\server\prisma\prisma\dev.db` e
>    `OK: binding 'beautySalon' ativado`. O script acha o banco pelo `server/.env` (via client gerado), sem `--db`.
> 6. "Subir o ambiente" abaixo; logado como `seed-presumido`, o seletor da Contabilidade mostra `seed-unit-presumido`.
>
> EVIDÊNCIA da re-semeadura (passos 1–5; preenchida pelo agente sob comando do dono, 2026-10-07 — checkout
> principal em `main` 080cb4dd; o passo 6 é do dono, na tela):
>
> ```text
> 1. backup gerado: C:\Users\smurf\Downloads\Luminaris\server\prisma\backups\dev-20261007154732.db
>    integrity_check: ok
>    journal_entries: fonte=1477 · cópia=1477
> 2. prisma migrate deploy: All migrations have been successfully applied. (incl. 20261007120000_add_mit_exports)
>    prisma migrate status: Database schema is up to date!
> 3. prisma generate: ok
> 4. npm run db:seed:accounting -- --years 2025,2026 --i-have-a-backup
>    seed-presumido · userId cmufn7n590000cixkxbls0agh · unitId cmuw4yqxg001jcii0iz2yb9rw
>    seed-real      · userId cmufn7te50279cixko3lvgj5x · unitId cmuw4z7zj02ehcii0st3unfr4
>    seed-real: entriesCreated 0 · entriesExisting 100 · closedYears [2025]
>    seed-real tieOut 2025-12-31: debitCents 71339559 = creditCents 71339559 · trialBalanceBalanced true · balanceSheetBalanced true
>    seed-real tieOut 2026-10-07: debitCents 112477535 = creditCents 112477535 · trialBalanceBalanced true · balanceSheetBalanced true
>    seed-presumido tieOut (último): debitCents 118923562 = creditCents 118923562 · balanced true
>    OK: seed multi-exercício aplicado e tie-out fechado.
> 5. node scripts/activate-salon-binding.mjs (as 2 linhas "próximo passo"):
>    JÁ ATIVO: binding 'beautySalon' (unidade 'cmuw4yqxg001jcii0iz2yb9rw') já é Active — versão 1, id cmuw4zxq90001ci6g5xdmykwh. Nada a fazer (idempotente).
>    JÁ ATIVO: binding 'beautySalon' (unidade 'cmuw4z7zj02ehcii0st3unfr4') já é Active — versão 1, id cmuw5077k0001ci9g5qlnwxfq. Nada a fazer (idempotente).
> ```
>
> Leitura: o `dev.db` já estava re-semeado antes desta rodada (0 lançamentos criados, bindings já ativos);
> a rodada aplicou as migrações pendentes.
>
> Passo 6 (2026-10-07, build de produção do `main` 080cb4dd — `server: npm run start` :3001, `my-app: next start` :3000;
> login `seed-presumido`; texto da página `/pt/accounting` extraído pelo agente):
>
> ```text
> Contabilidade · Razão de partida dobrada — balancete por unidade
> Unidade: seed-unit-presumido        (única opção do seletor; id cmuw4yqxg001jcii0iz2yb9rw)
> Balancete · Balanceado (Σdébito = Σcrédito)
> Total  R$ 1.189.235,62  R$ 1.189.235,62  R$ 0,00   (= tieOut do seed: 118923562 centavos)
> ```
>
> Nota: a senha do `seed-presumido` era aleatória (criado sem `SEED_ACCOUNTING_PASSWORD`); redefinida pelo dono em
> 2026-10-07 só no `dev.db`. Qdrant fora do ar no boot (só RAG; não afeta a Contabilidade).

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
>
> **[EXECUTADO 2026-09-14 — ordem do dono, agente disparou; evidência no PR desta emenda]** sobre o
> `dev.db` real (`server/prisma/prisma/dev.db`, md5 antes `bf4f8bb4…`): backup `dev-20260914135952.db`
> (`integrity_check: ok`) → `migrate deploy` 29→42 migrações (S6/S7 do smoke gate re-medidos como falso
> positivo: 30 postings valor-a-valor iguais; índice `…_type_name_key` → `…_type_nameNormalized_key`)
> → P0.2b: contas `1.1.6`/`3.3`/`4.2` criadas + `2026/09` `OPEN` → `activate-salon-binding.mjs`
> `OK: binding 'beautySalon' ativado — versão 1` → `node dist/server.js` (build de produção, `c96e2227`)
> `Luminaris Server running on http://localhost:3001`, `/health` `database: ok`. ~~**P2b está satisfeito
> neste banco; não repita o `migrate deploy` — `prisma migrate status` diz "up to date".**~~ *(Superado
> em 05/10: havia migrações pendentes (4 medidas; 6–7 em `main` de 05/10, ver a EMENDA) — rode o `migrate deploy` conforme a EMENDA 2026-10-05 acima.)*

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
**Contabilidade → aba Compliance**; escolha no seletor a unidade `seed-unit-presumido` (ou `seed-unit-real` no `seed-real`). Para o
`unitId` do passo 1, use o impresso pelo seed (ou abra DevTools → Network e leia o parâmetro `unitId=` de qualquer request da tela).

### Dados que precisam ser levantados antes de gerar ECD/ECF (P6) — formatos validados pelo backend

> **[CORREÇÃO 2026-09-01]** A versão anterior desta seção divergia dos DTOs reais em 5 pontos — a
> pior: `identQualif` do signatário da ECD é **obrigatório** no backend e estava **ausente** daqui,
> o que levava a coletar dado incompleto do contador. Fonte de verdade, releia se o backend mudar:
> [SpedEcdDto.ts](../../server/src/features/accounting/dtos/SpedEcdDto.ts) e
> [SpedEcfDto.ts](../../server/src/features/accounting/dtos/SpedEcfDto.ts). Campo **obrigatório**
> sem default → a geração recusa com 400 se faltar; campo com **default** pode ficar de fora do
> formulário, o backend preenche sozinho.
>
> **[EMENDA 2026-09-28]** A frase acima sobre `identQualif` **deixou de valer com o C12** (#353, commit
> `edb80ec8`, 20/09): o J930 **não aceita mais** `identQualif` (derivado de `codAssin` pelo gerador —
> F-C12-1 → a; mandar a chave = 400), e o signatário contador (`codAssin = '900'`) passou a exigir
> CPF de 11 dígitos + `indCrc` + `ufCrc` + `email` + `fone` (REGRA_OBRIGATORIO_CONTADOR, Manual ECD
> L9 p. 202). A tabela *ECD — signatários (J930)* abaixo foi reescrita por
> [SpedEcdDto.ts:134-218 e :396-445](../../server/src/features/accounting/dtos/SpedEcdDto.ts).

> **[2026-10-13]** Versão de teste com dado público (CVM/IBGE) e pessoas fictícias, já conferida contra o schema: [`H1-P6-DADOS-PUBLICOS-2026-10-13.md`](H1-P6-DADOS-PUBLICOS-2026-10-13.md).

**Separe por origem antes de escrever para o contador** — o formulário da tela mistura os dois, mas
pedir ao contador o que já está no CNPJ/contrato social da empresa é ida-e-volta desnecessária:
- 🏢 **Do dono/empresa** — está no cartão CNPJ, contrato social ou já cadastrado no sistema.
- 📗 **Do contador** — classificação técnica/SPED; exige julgamento contábil, peça a ele.

#### ECD — declarante (registro 0000)

| Campo | Origem | Formato | Obrigatório / default |
|---|---|---|---|
| `cnpj` | 🏢 dono | 14 posições sem máscara (12 alfanuméricas maiúsculas + 2 dígitos verificadores; o CNPJ numérico de hoje cabe) | **obrigatório** |
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
| `codScp` | 📗 contador | CNPJ, 14 posições (alfanumérico, como `cnpj`) | opcional |
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

⚠️ **`identQualif` não existe mais no J930** (ver [EMENDA 2026-09-28] acima) — a qualificação sai de
`codAssin`. Regras do backend sobre a lista (rejeita fora disso —
[SpedEcdDto.ts:396-445](../../server/src/features/accounting/dtos/SpedEcdDto.ts)):
- **exatamente um** signatário com `indRespLegal = 'S'`, e ele **nunca** é o de `codAssin = '900'`
  (o contador nunca é o responsável legal);
- **pelo menos um** contador (`codAssin = '900'`) **e pelo menos um** não-contador;
- a dupla `identCpfCnpj` + `codAssin` não se repete (a mesma pessoa pode assinar com códigos diferentes).

⚠️ `indCrc`/`ufCrc`/`numSeqCrc`/`dtCrc` mandados **vazios** (`''`) são 400 de formato, e `email`/`fone`
vazios contam como ausentes na linha `900` — no formulário, deixe em branco o que não tiver (a tela omite a chave).

> **Dependência:** CRC / UF do CRC / e-mail / fone só aparecem na **tela** após o merge da correção
> FE-FIX-SPED-ECD-SIGNERS (branch `claude/fe-dto-asymmetry-scan-fb5c0a`, ainda não mergeada); até lá a ECD pela tela dá 400. *(Atualização 28/09: mergeada no #427 — os campos já estão na tela.)*

| Campo | Origem | Formato | Obrigatório / default |
|---|---|---|---|
| `identNom` | 🏢 dono (não-contador) · 📗 contador (linha `900`) | texto | **obrigatório** |
| `identCpfCnpj` | 🏢 dono (não-contador) · 📗 contador (linha `900`) | CPF (11, com DV) ou CNPJ (14) | **obrigatório** — **CPF de 11 dígitos se `codAssin = '900'`** |
| `codAssin` | 🏢 dono (não-contador) · 📗 contador (`900`) | código da Tabela de Qualificação do Assinante (Manual ECD L9 pp. 201-202: `001`, `203`–`207`, `220`, `222`, `223`, `226`, `309`, `312`, `313`, `315`, `401`, `801`, `900`, `940`, `999`) | **obrigatório** |
| `indRespLegal` | 🏢 dono | `S`/`N` | **obrigatório** |
| `indCrc` | 📗 contador | CRC no formato do CFC `UF-NNNNNN/O-D` (ex.: `SP-123456/O-1`); registro transferido/secundário com o sufixo: `SP-123456/O-3 T-MG`; a grafia compacta `SP1234567` é aceita e convertida. Recusados: sem dígito verificador (`1SP123456`) e provisório (`/P-`, extinto) | **obrigatório se `codAssin = '900'`**; opcional nos demais |
| `ufCrc` | 📗 contador | sigla UF, **igual à UF embutida no `indCrc`** (transferido/secundário: a de origem **ou** a do sufixo — confirme com o contador qual o CRC dele usa) | **obrigatório se `codAssin = '900'`**; opcional nos demais |
| `email` | 📗 contador | texto | **obrigatório se `codAssin = '900'`**; opcional nos demais |
| `fone` | 📗 contador | texto | **obrigatório se `codAssin = '900'`**; opcional nos demais |
| `numSeqCrc` | 📗 contador | `UF/AAAA/NÚMERO` (nº da Certidão de Regularidade Profissional) | opcional no backend — **no `900`, em branco gera AVISO no PVA** (`REGRA_ADVERTENCIA_CONTADOR`) |
| `dtCrc` | 📗 contador | `YYYY-MM-DD` (validade da certidão) | opcional no backend — **no `900`, em branco gera AVISO no PVA** (`REGRA_ADVERTENCIA_CONTADOR`) |
| ~~`identQualif`~~ | — | — | **NÃO mande** — chave desconhecida = 400 (derivado de `codAssin`) |

#### ECF — declarante (registros 0000/0030)

| Campo | Origem | Formato | Obrigatório / default |
|---|---|---|---|
| `cnpj` | 🏢 dono | 14 posições sem máscara (12 alfanuméricas maiúsculas + 2 dígitos verificadores; o CNPJ numérico de hoje cabe) | **obrigatório** |
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

> **[EMENDA 2026-09-28]** Tabela conferida contra o Manual ECF Leiaute 12 (abril/2026, pp. 103-105) e o
> [SpedEcfDto.ts](../../server/src/features/accounting/dtos/SpedEcfDto.ts): `identQualif` é fechado na
> tabela da ECF (≠ tabela da ECD), CPF com dígito verificador, CNPJ alfanumérico.

Regra do backend: **pelo menos um** com `identQualif = '900'` (contador — exige `identCpfCnpj` de
11 dígitos **e** `indCrc` preenchido) **e pelo menos um** não-`900`.

| Campo | Formato | Obrigatório / default |
|---|---|---|
| `identNom` | texto | **obrigatório** |
| `identCpfCnpj` | CPF (11, com DV) ou CNPJ (14 posições, alfanumérico) | **obrigatório** — CPF de 11 se `identQualif = '900'` |
| `identQualif` | código da tabela da ECF (Manual ECF L12 p. 104 — 17 códigos: `203`–`207`, `220`, `222`, `223`, `226`, `309`, `312`, `313`, `315`, `401`, `801`, `900`, `999`). **`001` e `940` valem na ECD mas NÃO na ECF** — não copie o código do J930 sem conferir | **obrigatório** |
| `email` | e-mail válido | **obrigatório** |
| `fone` | texto ≤14 | **obrigatório** |
| `indCrc` | mesmo formato do J930 da ECD (`UF-NNNNNN/O-D`, transferido com sufixo `T-UF`) — o PVA não valida formato (Manual ECF L12 pp. 103-105), a máscara é da casa para ECD e ECF saírem iguais | opcional — **obrigatório se `identQualif = '900'`** (`REGRA_OBRIGATORIO_CONTADOR`) |

---

## Passos

Cada passo tem três campos. **EVIDÊNCIA é obrigatória e é sempre artefato colado** (tela do PVA,
protocolo, saída de comando) — nunca uma frase dizendo que deu certo.

### 1. Encerramento do exercício (apuração do resultado)

> **[EMENDA 2026-09-24 — decisão do dono (a)] Tenants do seed:** NÃO chame o `POST /closing/exercise`
> (dezembro/2025 está `HARD_CLOSED`; o `postEntry` checa o período antes da idempotência e responderia
> erro de período). O passo 1 vira **conferir que o encerramento de 2025 já está no razão**: aba
> **Razão/Lançamentos** do ano 2025 → existe o lançamento *"Encerramento do exercício 2025 — apuração do
> resultado"* datado de 31/12/2025 (origem `closing`, `sourceId` 2025), zerando 3.x/4.x contra `2.3.1`.
> EVIDÊNCIA do passo 1 nesse caso = screenshot desse lançamento. Os passos 2–6 seguem iguais.

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

> Preenchida pelo agente sob comando do dono (2026-10-07), tenant `seed-presumido`, unidade `cmuw4yqxg001jcii0iz2yb9rw`
> (variante seed da emenda 24/09 — conferir, não chamar). Leitura do `dev.db` real (Prisma), não screenshot:
>
> ```text
> P7-seed  GET /api/accounting/cmuw4yqxg001jcii0iz2yb9rw/periods?year=2025
>          1..12: HARD_CLOSED (todos os 12 meses)
> passo 1  journal_entries where unitId=cmuw4yqxg001jcii0iz2yb9rw and sourceType contains 'clos':
>          id cmuw4yz7y01arcii049qrb7vj · 2025-12-31 · "Encerramento do exercício 2025 — apuração do resultado"
>          sourceType closing · sourceId 2025 · status Posted
>          pernas (débito/crédito em centavos): 3.1 16248790/0 · 3.3 4893996/0 · 4.1 0/7515345 · 4.2 0/2550807 · 2.3.1 0/11076634
>          (Σdébito 21142786 = Σcrédito 21142786)
> ```
>
> **P5 — achado de 07/10 (não estava no plano):** a re-semeadura (SEED-UNITS) moveu o razão para a unidade gerada,
> mas os 14 mapeamentos referenciais (versão `2025`) ficaram sob o id literal antigo `seed-unit-presumido` /
> `seed-unit-real`, e o plano de contas também é por unidade (ids novos). Com o OK do dono ("Pode seguir com a (a)"),
> o agente copiou os 14 mapeamentos para a unidade nova **casando pelo código da conta**, sem escolha contábil nova,
> via `POST /api/accounting/referential/mappings/batch` (HTTP 200, nos dois tenants). Cobertura depois da cópia:
>
> ```text
> GET /referential/coverage?unitId=cmuw4yqxg001jcii0iz2yb9rw&version=2025 → mappedCount 14 / leafAccountCount 15 · ready false
>     unmappedAccounts: [3.4 "Receita de Pacotes Não Utilizados" (Revenue)]
> GET /referential/coverage?unitId=cmuw4z7zj02ehcii0st3unfr4&version=2025 → 14/15 · ready false · unmapped [3.4]
> POST /sped/ecd/generate (seed-presumido, 2025) → HTTP 400 VALIDATION_ERROR
>     "Cobertura referencial incompleta: mapeie todas as contas analíticas antes de gerar a ECD." unmappedAccounts [3.4]
> ```
>
> A 3.4 entrou com a PACOTE-VALIDADE e nunca teve código referencial; o código é dado humano (D1/D10), não do agente.
> **P5 não se sustenta até o contador responder** — pergunta incluída no item 3b do
> [`PEDIDO-CONTADOR-2026-10-02-PACOTE-VALIDADE.md`](PEDIDO-CONTADOR-2026-10-02-PACOTE-VALIDADE.md) (dono, 07/10).
> Com o código: `PUT /referential/mappings` da 3.4 nas duas unidades → cobertura 15/15 → passo 3.
>
> **EMENDA 2026-10-11 (BE-INCR-H1-REFERENCIAL-3-4 item 14).** O código saiu por delegação, não do contador:
> `3.01.01.01.01.98` "Outras Receitas da Atividade Geral" (D-1 de 10/10 e decisão (b) do dono em 11/10,
> [`D-2026-10-11-QUESTIONARIO-DONO`](../plano/decisoes/D-2026-10-11-QUESTIONARIO-DONO.md); PROPOSTA-REFERENCIAL-D1 §3).
> **Quem executa é o dono**, ou o agente sob comando literal do dono no chat, colando a saída aqui. Desfecho e
> assinatura são do dono. Em cada uma das duas unidades:
>
> 1. Pegar o `id` da conta 3.4 da unidade, com `GET /api/accounting/accounts?unitId=<unidade>`.
> 2. `PUT /api/accounting/referential/mappings` com corpo
>    `{"unitId":"<unidade>","accountId":"<id da 3.4>","referentialCode":"3.01.01.01.01.98","label":"Outras Receitas da Atividade Geral","mappingVersion":"2025"}`.
> 3. `GET /referential/coverage?unitId=<unidade>&version=2025`. Esperado: `15/15 · ready true`.
> 4. Gerar a ECD do P5 de novo. Esperado: 200.
>
> Para a **ECF Presumido** do H1, a 3.4 com movimento só passa depois do merge do PR-1 do
> BE-INCR-H1-REFERENCIAL-3-4, porque antes dele o gate de exaustividade dá 400.
>
> ```text
> EVIDÊNCIA (P5, 3.4): preenchida pelo agente sob comando do dono no chat (2026-10-11), dev.db real
> (server/prisma/prisma/dev.db), backend de main 3af9a6b5 em :3001. Saída literal do script da sessão:
>
> pré-condição  o dev.db estava 23 migrações atrás (20261007160000_add_legal_parameters_v2 … 20261012120000_
>               add_payment_account_release_report_block) e o boot abortava (P2021 legal_parameters). Com o OK do
>               dono: backup em server/prisma/backups/dev-20261011-pre-3-4.db (7581696 B) e `prisma migrate deploy`
>               → "All migrations have been successfully applied." (exit 0)
>
> === seed-presumido · unidade cmuw4yqxg001jcii0iz2yb9rw · login HTTP 200
> passo 1  GET /accounting/accounts?unitId=cmuw4yqxg001jcii0iz2yb9rw → HTTP 200 · 3.4 = cmuw4yr69003xcii0vk9k1tr9 "Receita de Pacotes Não Utilizados"
> antes    GET /referential/coverage → HTTP 200 · 14/15 · ready false
> passo 2  PUT /referential/mappings {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","accountId":"cmuw4yr69003xcii0vk9k1tr9","referentialCode":"3.01.01.01.01.98","label":"Outras Receitas da Atividade Geral","mappingVersion":"2025"} → HTTP 200 · id cmv4fuoqy0001ciawe8fs0wvr
> passo 3  GET /referential/coverage?unitId=cmuw4yqxg001jcii0iz2yb9rw&version=2025 → HTTP 200 · mappedCount 15 / leafAccountCount 15 · ready true · unmapped []
> passo 4  POST /sped/ecd/generate (seed-presumido, 2025) → HTTP 400 · fieldErrors: declarant "expected object, received undefined" · book (2× "expected string") · signers "expected array"
>
> === seed-real · unidade cmuw4z7zj02ehcii0st3unfr4 · login HTTP 200
> passo 1  GET /accounting/accounts?unitId=cmuw4z7zj02ehcii0st3unfr4 → HTTP 200 · 3.4 = cmuw4z86m02gvcii0dnen1ldv "Receita de Pacotes Não Utilizados"
> antes    GET /referential/coverage → HTTP 200 · 14/15 · ready false
> passo 2  PUT /referential/mappings {"unitId":"cmuw4z7zj02ehcii0st3unfr4","accountId":"cmuw4z86m02gvcii0dnen1ldv","referentialCode":"3.01.01.01.01.98","label":"Outras Receitas da Atividade Geral","mappingVersion":"2025"} → HTTP 200 · id cmv4fuouq0003ciaw6elejnx7
> passo 3  GET /referential/coverage?unitId=cmuw4z7zj02ehcii0st3unfr4&version=2025 → HTTP 200 · mappedCount 15 / leafAccountCount 15 · ready true · unmapped []
> passo 4  POST /sped/ecd/generate (seed-real, 2025) → HTTP 400 · mesmos fieldErrors (declarant/book/signers)
>
> leitura   passos 1–3 fecham a cobertura (15/15 · ready true nas duas unidades). O passo 4 NÃO rodou até o gate de
>           cobertura: o corpo mínimo foi rejeitado no Zod porque as unidades seed não têm perfil fiscal para
>           preencher declarant/book/signers — esses são os dados do P6 (do dono). O agente não inventou declarante.
>           A ECD 200 fica para a geração do passo 3 com o P6 preenchido.
>
> DESFECHO: [dono]   ASSINATURA: [dono]
> ```

> **[EMENDA 2026-10-13 — emenda 3.3 PR-1, F-HR-4 a (dono, 11/10); tarifa em 4.6 (dono, 13/10)]** Depois do merge do
> PR-1 da emenda 3.3, o plano canônico ganha 9 folhas (3.5.1–3.5.3, 4.3.1–4.3.3, 4.4.1, 4.4.2, 4.6). Elas nascem nos
> escopos que já existem na primeira chamada que roda o `ensureChartOfAccounts` (`GET /accounts`, ou qualquer
> lançamento), e o gate da ECD conta toda folha ativa: **sem o lote abaixo, a ECD volta a dar 400 nas duas unidades**.
> Instalação nova pelo kit v5 já sai mapeada; o lote é só para as unidades do seed. Mesmos códigos em Presumido e Real
> (PROPOSTA-REFERENCIAL-D1 §1.2; descrições oficiais conferidas em `referential_accounts` 2025 do dev.db em 13/10).
>
> Nas duas unidades (seed-presumido e seed-real):
>
> 1. `GET /api/accounting/accounts?unitId=<unidade>`. Cria as 9 folhas, se faltarem, e devolve os ids. Anote o `id`
>    de cada código da tabela.
> 2. `GET /api/accounting/referential/coverage?unitId=<unidade>&version=2025`. Esperado: `15/24 · ready false`, e as
>    9 folhas novas entre as não mapeadas.
> 3. `POST /api/accounting/referential/mappings/batch` com
>    `{"unitId":"<unidade>","mappingVersion":"2025","items":[ … 9 itens {accountId, referentialCode, label} … ]}`:
>
>    | Conta | referentialCode | label |
>    |---|---|---|
>    | 3.5.1, 3.5.2, 3.5.3 | `3.01.01.05.01.05` | Outras Receitas Financeiras |
>    | 4.3.1, 4.3.3 | `3.01.01.09.01.08` | (-) Outras Despesas Financeiras |
>    | 4.3.2, 4.4.1, 4.4.2 | `3.01.01.07.01.22` | (-) Multas |
>    | 4.6 | `3.01.01.07.01.04` | (-) Outros Serviços Prestados por Pessoa Física ou Jurídica |
>
>    Esperado: HTTP 200 (lote atômico; um id errado derruba os 9).
> 4. Repita o passo 2. Esperado: `24/24 · ready true`.
>
> Se a unidade já tiver as contas fiscais do kit v3 (2.1.3–2.1.6, 3.6.x, 4.5.x), os totais sobem 8 nos dois
> lados (23/32 → 32/32). O critério é `ready true` e nenhuma folha não mapeada.
>
> Quem executa é o dono, ou o agente sob comando literal dele no chat, colando a saída aqui. Desfecho e assinatura são
> do dono.
>
> ```
> EVIDÊNCIA (P5, emenda 3.3): [colar a saída dos passos 1–4 nas duas unidades]
>
> DESFECHO: [dono]   ASSINATURA: [dono]
> ```

### 2. Conferir que o encerramento entrou no razão

Na aplicação, aba **Balancete** (e DRE) do ano-calendário: as contas de resultado devem estar zeradas
e o resultado transferido para lucros/prejuízos acumulados.

Resultado esperado: DRE do exercício encerrado sem saldo residual nas contas de resultado.

> **[EMENDA 2026-10-13 — dono: "Pode emendar o passo 2 e documentar se temos lacunas reais aqui"]** O texto acima
> **não é executável** e levaria a um FALHOU falso. Nem o Balancete nem a DRE mostram o resultado zerado de um exercício
> encerrado:
>
> - O **Balancete** não tem data. A tela chama `GET /trial-balance?unitId=` e a rota ignora `from`/`to` (lacuna L1 abaixo),
>   então o saldo vai até HOJE e mistura o movimento de 2026. No seed, 3.1/3.3/4.1/4.2 aparecem com saldo.
> - A **DRE** exclui de propósito o lançamento de encerramento (`CLOSING_SOURCE_TYPE`). Ela mostra o resultado do ano
>   ANTES do encerramento, que é o certo para uma DRE, e não aceita `from` (`FROM_DATE_NOT_SUPPORTED_IN_INCR4`).
>
> **Passo 2 vigente:** aba **Balanço Patrimonial**, campo de data em **31/12/<ano>** (no seed: 31/12/2025). Resultado
> esperado, as três coisas juntas:
> 1. linha **"Resultado do exercício"** = **0** (`netResultLine.amountCents = 0`);
> 2. **Lucros ou Prejuízos Acumulados (2.3.1)** = o **resultado líquido da DRE** do mesmo ano (aba DRE com data
>    31/12/<ano>; é o valor transferido pelo encerramento);
> 3. balanço **fechado** (ativo = passivo + PL), sem aviso de "resultado de exercício anterior não encerrado".
>
> EVIDÊNCIA = screenshot do BP em 31/12/<ano> + screenshot da DRE em 31/12/<ano>.
>
> Conferência prévia do agente (13/10, `seed-presumido`, unidade `cmuw4yqxg001jcii0iz2yb9rw`, build de produção de
> `9f6477d8`; **é preflight, NÃO é a evidência do passo**):
>
> ```text
> GET /balance-sheet?asOf=2025-12-31     → HTTP 200 · netResultLine 0 · 2.3.1 = 11076634 · balanced true
>                                          · hasUnclosedPriorYearResult false
> GET /income-statement?asOf=2025-12-31  → HTTP 200 · receita 21142786 · CMV −2550807 · despesas −7515345
>                                          · netResult 11076634   (= 2.3.1 ✔)
> GET /trial-balance?asOf=2025-12-31     → HTTP 200 · 3.1 −12865009 · 3.3 −4951464 · 4.1 6256866 · 4.2 2188515
>                                          (asOf ignorado → acumulado até hoje; ver L1)
> razão (leitura Prisma, 2025)           → Σ 3.x/4.x com o encerramento = 0 em todas as contas
> ```
>
> #### Lacunas achadas no preflight de 13/10 (grau por linha; agente não corrigiu, achado ≠ hotfix)
>
> | # | Lacuna | Grau | Efeito | Trilho sugerido |
> |---|---|---|---|---|
> | **L1** | `GET /api/accounting/trial-balance` aceita `from`/`to` no `ReportQuerySchema` (`PostingDto.ts:142-146`) e **ignora**: `getTrialBalance` (`accountingController.ts:74`) chama `trialBalance(scope)` sem data, mas o serviço já aceita `asOf` (`AccountingReportService.ts:402`, C6b). O `accounting.service.ts:667-669` do front também manda `from`/`to`. É a classe "param aceito e ignorado". | **verificado** (leitura + resposta HTTP idêntica com e sem data) | Não existe balancete de exercício encerrado pela API nem pela tela. O conferente vê saldo em conta de resultado e lê "encerramento não zerou". | instrumentação → correção (expor `asOf` ou recusar com 400), dentro do CONT-08 |
> | **L2** | A tela do Balancete não tem seletor de data: `useAccountingData.ts:92` chama `getTrialBalance({ unitId })`. | **verificado** (leitura) | Mesmo com L1 corrigida, a tela só mostra o acumulado até hoje. | FE, junto com L1 |
> | **L3** | `indNire = '1'` sem `book.nire` passa no backend (`SpedEcdDto.ts:104,123`: `nire` opcional, sem refine cruzado). Se o PVA exigir o NIRE no I030 quando `IND_NIRE = 1`, a crítica só aparece no passo 4. | **inferido** (regra do Manual ECD não relida nesta sessão) | Possível FALHOU no passo 4 por dado do livro, não por código contábil. | o passo 4 é o oráculo; se a crítica aparecer → emenda do DTO |
> | **L4** | "Subir o ambiente" ainda manda escolher a unidade `seed-unit-presumido`; desde a re-semeadura (07/10) a unidade tem id gerado (`cmuw4yqxg001jcii0iz2yb9rw` / `cmuw4z7zj02ehcii0st3unfr4`). | **verificado** | Só texto: o conferente procura uma unidade que não existe com esse nome. | emenda de runbook (fora do escopo desta) |
>
> **Não são lacunas** (desenho documentado): a DRE excluir o lançamento de encerramento e não aceitar `from`.

EVIDÊNCIA: [screenshot do BP em 31/12/<ano> + screenshot da DRE em 31/12/<ano> — ver EMENDA 2026-10-13]

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

> Preenchida pelo agente sob comando do dono no chat (2026-10-13: *"pode gerar a ECD"*), tenant `seed-presumido`, unidade
> `cmuw4yqxg001jcii0iz2yb9rw`, build de produção de `9f6477d8`. Gerado pela API (o mesmo endpoint que a tela chama), com o P6 de
> [`H1-P6-DADOS-PUBLICOS-2026-10-13`](H1-P6-DADOS-PUBLICOS-2026-10-13.md). CNPJ tarjado (`08.845.676/…` → `08845676XXXXXX`); os
> CPFs são fictícios. Saída literal:
>
> ```text
> POST /accounting/sped/ecd/generate → HTTP 201
>   job cmv645m6d0000ciys9pc2w2fj · EXPORT_SPED_ECD · EXPORTED · fileName ecd_08845676XXXXXX_2025.txt · sizeBytes 48403
>   sha256 d026d00e3e3e99f8aa8e6a99c7e432041e369ef1952b5f6de6e55a8063a2c598 · totalRows 888 · período 2025-01-01..2025-12-31
>   avisos: ["perfil fiscal da empresa ausente para 2025: a geração usou só o corpo da requisição (F-XP-1 c)."]
> GET /accounting/data-exchange/jobs/cmv645m6d0000ciys9pc2w2fj/download?unitId=… → HTTP 200 · text/plain
>   48403 bytes · 888 linhas · CRLF · 233 bytes > 0x7F (Latin-1) · sha256 igual ao do job
> |0000|LECD|01012025|31122025|CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.|08845676XXXXXX|SP||3550308|||0|1|0||0|0||N|N|0|0||
> |I030|TERMO DE ABERTURA|1|LIVRO DIARIO|888|CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.||08845676XXXXXX||||31122025|
> |J930|DIRETOR FICTICIO DE TESTE|12345678062|Diretor|203|||||||S|
> |J930|CONTADOR FICTICIO DE TESTE|23456789173|Contador|900|SP-123456/O-1|contador.teste@example.com|1148583340|SP|SP/2026/000001|31122026|N|
> |9999|888|
> registros: 0000 0001 0990 · I001 I010 I030 I050×20 I051×15 I052×15 I150×12 I155×144 I200×204 I250×411 I350 I355×4 I990
>            · J001 J005 J100×10 J150×9 J900 J930×2 J990 · 9001 9900×27 9990 9999
> ```
>
> Observação para o passo 4: o NIRE do I030 saiu **vazio** com `IND_NIRE = 1` no 0000 (lacuna L3). Se o PVA criticar o I030,
> é essa a causa. Arquivo para importar: `C:\Users\smurf\Downloads\H1-PVA\ecd_08845676000198_2025.txt` (não abra nem salve
> em editor).
>
> DESFECHO: [dono]   ASSINATURA: [dono]

> **Tentativa 3 — 2026-10-21.** Preenchida pelo agente sob comando do dono no chat (2026-10-21: *"gera a ECD do passo 3
> como seed-presumido com o P6 de dados públicos, codPlanRef = '1' e indNire = '0', e preenche a EVIDÊNCIA com a saída
> literal"*), tenant `seed-presumido`, unidade `cmuw4yqxg001jcii0iz2yb9rw`, build de produção de `3ddd33dc` (ambiente na
> tentativa 3 do passo 4). Gerado pela API (o mesmo endpoint que a tela chama), com o P6 de
> [`H1-P6-DADOS-PUBLICOS-2026-10-13`](H1-P6-DADOS-PUBLICOS-2026-10-13.md), trocando `indNire` para `'0'` (L3) e com
> `codPlanRef = '1'` (L5). CNPJ tarjado; os CPFs são fictícios. Saída literal:
>
> ```text
> POST /accounting/sped/ecd/generate → HTTP 201
>   job cmviryahj0000ciwcjo9lpkw4 · EXPORT_SPED_ECD · EXPORTED · fileName ecd_08845676XXXXXX_2025.txt · sizeBytes 52221
>   sha256 924f32cc0b23aade2d78fb9ad943b28a7c445741f42c716c44cf17125a764ad6 · totalRows 956
> GET /accounting/data-exchange/jobs/cmviryahj0000ciwcjo9lpkw4/download?unitId=… → HTTP 200 · text/plain
>   52221 bytes · 956 linhas · CRLF · 0 byte(s) de controle · 250 bytes > 0x7F (Latin-1) · sha256 924f32cc0b23aade2d78fb9ad943b28a7c445741f42c716c44cf17125a764ad6
> |0000|LECD|01012025|31122025|CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.|08845676XXXXXX|SP||3550308|||0|0|0||0|0||N|N|0|0|1|
> |0007|00||
> |I030|TERMO DE ABERTURA|1|LIVRO DIARIO|956|CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.||08845676XXXXXX||||31122025|
> |I051||1.01.01.02.01|
> |J150|1|DRE_RECEITA|T|2|DRE_RESULTADO|RECEITA BRUTA|0,00|D|211427,86|C|R||
> |J150|2|3.1|D|3|DRE_RECEITA|Receita de Serviços|0,00|D|162487,90|C|R||
> |J150|3|3.3|D|3|DRE_RECEITA|Receita de Revenda de Mercadorias|0,00|D|48939,96|C|R||
> |J150|4|DRE_DEDUCOES|T|2|DRE_RESULTADO|DEDUÇÕES DA RECEITA|0,00|D|0,00|D|D||
> |J150|5|DRE_CMV|T|2|DRE_RESULTADO|CUSTO DAS MERCADORIAS VENDIDAS|0,00|D|25508,07|D|D||
> |J150|6|4.2|D|3|DRE_CMV|Custo das Mercadorias Vendidas|0,00|D|25508,07|D|D||
> |J150|7|DRE_FINANCEIRO|T|2|DRE_RESULTADO|RESULTADO FINANCEIRO|0,00|D|0,00|D|R||
> |J150|8|DRE_DESPESAS|T|2|DRE_RESULTADO|DESPESAS|0,00|D|75153,45|D|D||
> |J150|9|4.1|D|3|DRE_DESPESAS|Despesas Operacionais|0,00|D|75153,45|D|D||
> |J150|10|DRE_RESULTADO|T|1||RESULTADO LÍQUIDO DO EXERCÍCIO|0,00|D|110766,34|C|R||
> |9999|956|
> registros: 9001 9900×28 9990 9999 0000 0001 0007 0990 I001 I010 I030 I050×51 I051×32 I052×32 I150×12 I155×144 I200×204 I250×411 I350 I355×4 I990 J001 J005 J100×10 J150×10 J900 J930×2 J990
> I050: 51 contas · analíticas (A) por nível: {"2":7,"3":12,"4":13} · COD_CTA_SUP vazio fora do nível 1: 0
> nat 01 nivel 4: 1.1.1.01 1.1.1.02 1.1.2.01 1.1.2.02 1.1.2.03 1.1.3.01
> nat 02 nivel 4: 2.1.1.01 2.1.2.01 2.1.3.01 2.1.3.02 2.1.3.03 2.1.3.04
> nat 03 nivel 4: 2.3.1.01
> nat 04 nivel 2: 3.1 3.2 3.3 3.4 4.1 4.2 4.6
> nat 04 nivel 3: 3.5.1 3.5.2 3.5.3 3.6.1 3.6.2 4.3.1 4.3.2 4.3.3 4.4.1 4.4.2 4.5.1 4.5.2
> ```
>
> Leitura para o passo 4 (inferida; o oráculo é o PVA): a tentativa 2 tinha 23 erros em L3/L7/L8/L9. No arquivo,
> `IND_NIRE = 0` (L3); o 0007 está presente (L7); as analíticas patrimoniais estão todas no nível 4, sem `COD_CTA_SUP` vazio
> (L8); e o J150 tem um único nível 1 (o Resultado, com as filhas no nível 2), com CMV e despesas em `D` (L9). Arquivo
> para importar: `C:\Users\smurf\Downloads\H1-PVA\ecd_08845676000198_2025-tentativa3.txt` (não abra nem salve em editor).
>
> DESFECHO: [dono]   ASSINATURA: [dono]

### 4. Importar a ECD no PVA

> **[EMENDA 2026-10-13 — BE-INCR-PLANO-4-NIVEIS (L8), item 12 do BRIEF] Pré-condição da tentativa 3.** O plano canônico
> passou a 4 níveis (analítica patrimonial `x.y.z.NN`; ADR-PLANO-CONTAS-4-NIVEIS). Antes de subir o build que contém a
> mudança, com o servidor **parado** e depois do backup do `dev.db` (P2):
>
> ```bash
> cd server && npx ts-node -r tsconfig-paths/register src/jobs/migratePlano4NiveisCli.ts --all
> ```
>
> Esperado: `OK {...}` por unidade, com `saldoAntesDepoisIgual: true` e `renomeadas` com as 9 linhas do de-para na
> primeira rodada; uma 2ª rodada devolve `renomeadas: []` (idempotente). O período corrente de cada unidade com binding
> precisa estar **aberto** (o binding é recompilado com dry-run); se não estiver, a CLI recusa sem alterar nada.
> **Nunca suba o servidor novo antes da migração:** o `ensureChartOfAccounts` criaria a analítica nova vazia ao lado da
> antiga com saldo.
>
> **[EMENDA 2026-10-15 — L8 refeito sobre a main de 15/10]** A unidade com o kit v3–v5 também tem as 4 contas a recolher
> renomeadas (`2.1.3`→`2.1.3.01` … `2.1.6`→`2.1.3.04`, F-L8-10 a), e ganha as sintéticas `2.1.3`, `3.6` e `4.5` (F-L8-11 a).
> Nesse caso `renomeadas` tem 13 linhas, e `kitAtualizado` termina em `para: 6`. Unidade com kit abaixo do v5 (as 5 do
> `dev.db` estão no v1) passa antes pelo upgrade real até o v5 (F-L8-12 a): `kitPreparado: {de: 1, para: 5}`, e aí as
> contas fiscais já existem quando a renomeação roda. Se esse upgrade não aplicar (forward, conflito ou falha de passo),
> a unidade é listada como `FALHOU`, sem nada renomeado.
>
> **[EMENDA 2026-10-15 — F-L8-13 a] De-para de 2025 nas unidades do H1, antes de gerar a ECD.** Com 2025 `HARD_CLOSED`,
> o upgrade do kit não grava o de-para de 2025 das contas novas (fica como pendência do kit, listada em
> `kitPreparado.pendenciasAnoCongelado`). A ECD exige de-para de toda folha viva, então grave os 17 abaixo nas duas
> unidades (`cmuw4yqxg001jcii0iz2yb9rw` e `cmuw4z7zj02ehcii0st3unfr4`) com `POST /api/accounting/referential/mappings/batch`
> (o mesmo do P5), `mappingVersion: "2025"`, e confira `GET /referential/coverage?unitId=<unidade>&version=2025` →
> `ready true`. Os códigos são os do kit v6 (`REFERENCIAL_2025_FISCAL_V2` + `REFERENCIAL_2025_EMENDA_3_3`):
>
> | Conta | Referencial 2025 | Nome |
> |---|---|---|
> | `2.1.3.01` | `2.01.01.09.13` | IRPJ a Recolher  – Circulante |
> | `2.1.3.02` | `2.01.01.09.14` | CSLL a Recolher  – Circulante |
> | `2.1.3.03` | `2.01.01.09.04` | PIS a Recolher – Circulante |
> | `2.1.3.04` | `2.01.01.09.05` | COFINS a Recolher – Circulante |
> | `3.6.1` | `3.01.01.01.02.05` | (-) PIS/PASEP Sobre Receita Bruta |
> | `3.6.2` | `3.01.01.01.02.04` | (-) COFINS Sobre Receita Bruta |
> | `4.5.1` | `3.02.01.01.01.02` | (-) Provisão para Imposto de Renda - Pessoa Jurídica (Atividade Geral e Rural) |
> | `4.5.2` | `3.02.01.01.01.01` | (-) Provisão para Contribuição Social sobre o Lucro Líquido (Atividade Geral) |
> | `3.5.1` | `3.01.01.05.01.05` | Outras Receitas Financeiras |
> | `3.5.2` | `3.01.01.05.01.05` | Outras Receitas Financeiras |
> | `3.5.3` | `3.01.01.05.01.05` | Outras Receitas Financeiras |
> | `4.3.1` | `3.01.01.09.01.08` | (-) Outras Despesas Financeiras |
> | `4.3.2` | `3.01.01.07.01.22` | (-) Multas |
> | `4.3.3` | `3.01.01.09.01.08` | (-) Outras Despesas Financeiras |
> | `4.4.1` | `3.01.01.07.01.22` | (-) Multas |
> | `4.4.2` | `3.01.01.07.01.22` | (-) Multas |
> | `4.6` | `3.01.01.07.01.04` | (-) Outros Serviços Prestados por Pessoa Física ou Jurídica |
>
> Prova na cópia do `dev.db` (15/10, agente): `seed-unit-presumido`, `seed-unit-real` e `cmr2jyirc006oci1kscm61n6n`
> recusados pela pré-condição (período 2026-10 `FUTURE`; abra o período antes de migrar, se forem usados).
>
> EVIDÊNCIA da pré-condição da tentativa 3 (backup, `migrate deploy`, migração L8 em 2 rodadas e os 17 de-para de 2025;
> preenchida pelo agente sob comando do dono no chat, 2026-10-15 — *"Preenche a EVIDÊNCIA do RUNBOOK-H1 com a saída
> literal do backup, da migração (2 rodadas) e dos 17 de-para"*). Banco: `server/prisma/prisma/dev.db` (real), via
> `DATABASE_URL` absoluto, rodado do worktree `h1-h2-m2-bloqueadores-e477eb` em `main` `f73da6e5` (#691); nenhum servidor
> do Luminaris no ar (portas 3000/3001 livres). As saídas da migração são os logs completos; as do `migrate deploy` e do
> `mapear` são as linhas filtradas por `grep` como saíram na sessão.
>
> 1. Backup (API de backup do SQLite, origem aberta só para leitura):
>
> ```text
> integrity ok
> -rw-r--r-- 1 smurf 197609 8929280 Oct 15 01:53 /c/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev-20261015-pre-l8.db
> b69b26fe26193b852c5a4303b8a91851a368a6f6ca48a21931993d8c55f702fd */c/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev-20261015-pre-l8.db
> ```
>
> 2. `npx prisma migrate deploy` (`grep -E "Applying|applied|migrations found|Error"`):
>
> ```text
> 99 migrations found in prisma/migrations
> Applying migration `20261013120000_add_ptax_rates`
> Applying migration `20261013150000_add_crm_report_definitions`
> Applying migration `20261013180000_encargos_descontos_emenda_3_3`
> Applying migration `20261013200000_add_role_account_overrides`
> Applying migration `20261013210000_add_kit_upgrade`
> Applying migration `20261013210000_journal_entry_binding_ref`
> The following migration(s) have been applied:
> All migrations have been successfully applied.
> ```
>
> 3. `npx ts-node -r tsconfig-paths/register src/jobs/migratePlano4NiveisCli.ts --all` — 1ª rodada (exit 1: as 3 unidades
> legadas recusadas pela pré-condição, sem alteração):
>
> ```text
> banco: C:\Users\smurf\Downloads\Luminaris\server\prisma\prisma\dev.db
> OK {"ownerUserId":"cmr2jfl4v0000ciakz7tduht3","unitId":"unit-incr6-val","criadas":["1.1","1.1.1","1.1.2","1.1.3","2.1","2.1.1","2.1.2","2.3","2.3.1","3.5","4.3","4.4"],"renomeadas":[{"de":"1.1.1","para":"1.1.1.01"},{"de":"1.1.3","para":"1.1.1.02"},{"de":"1.1.2","para":"1.1.2.01"},{"de":"1.1.4","para":"1.1.2.02"},{"de":"1.1.5","para":"1.1.2.03"},{"de":"2.1.1","para":"2.1.1.01"}],"personalizadasNaoTocadas":[{"code":"1.4.1","name":"Estoque de Produtos"}],"bindingRecompilado":null,"kitPreparado":null,"kitAtualizado":null,"saldoAntesDepoisIgual":true}
> OK {"ownerUserId":"cmr2jfl4v0000ciakz7tduht3","unitId":"unit-incr6-val-1782938879534","criadas":["1.1","1.1.1","1.1.2","1.1.3","2.1","2.1.1","2.1.2","2.3","2.3.1","3.5","4.3","4.4"],"renomeadas":[{"de":"1.1.1","para":"1.1.1.01"},{"de":"1.1.3","para":"1.1.1.02"},{"de":"1.1.2","para":"1.1.2.01"},{"de":"1.1.4","para":"1.1.2.02"},{"de":"1.1.5","para":"1.1.2.03"},{"de":"2.1.1","para":"2.1.1.01"}],"personalizadasNaoTocadas":[{"code":"1.4.1","name":"Estoque de Produtos"}],"bindingRecompilado":null,"kitPreparado":null,"kitAtualizado":null,"saldoAntesDepoisIgual":true}
> FALHOU unidade cmr2jyirc006oci1kscm61n6n (dono cmr2jfl4v0000ciakz7tduht3): pré-condição: o período 2026-10 da unidade precisa estar aberto (hoje: FUTURE) — o binding é recompilado com dry-run de lançamento. Abra o período e rode de novo; nada foi alterado.
> FALHOU unidade seed-unit-presumido (dono cmufn7n590000cixkxbls0agh): pré-condição: o período 2026-10 da unidade precisa estar aberto (hoje: FUTURE) — o binding é recompilado com dry-run de lançamento. Abra o período e rode de novo; nada foi alterado.
> FALHOU unidade seed-unit-real (dono cmufn7te50279cixko3lvgj5x): pré-condição: o período 2026-10 da unidade precisa estar aberto (hoje: FUTURE) — o binding é recompilado com dry-run de lançamento. Abra o período e rode de novo; nada foi alterado.
> OK {"ownerUserId":"cmufn7n590000cixkxbls0agh","unitId":"cmuw4yqxg001jcii0iz2yb9rw","criadas":["1.1","1.1.1","1.1.2","1.1.3","2.1","2.1.1","2.1.2","2.3.1","3.5","4.3","4.4","2.1.3","3.6","4.5"],"renomeadas":[{"de":"1.1.1","para":"1.1.1.01"},{"de":"1.1.3","para":"1.1.1.02"},{"de":"1.1.2","para":"1.1.2.01"},{"de":"1.1.4","para":"1.1.2.02"},{"de":"1.1.5","para":"1.1.2.03"},{"de":"1.1.6","para":"1.1.3.01"},{"de":"2.1.1","para":"2.1.1.01"},{"de":"2.1.2","para":"2.1.2.01"},{"de":"2.3.1","para":"2.3.1.01"},{"de":"2.1.3","para":"2.1.3.01"},{"de":"2.1.4","para":"2.1.3.02"},{"de":"2.1.5","para":"2.1.3.03"},{"de":"2.1.6","para":"2.1.3.04"}],"personalizadasNaoTocadas":[],"bindingRecompilado":{"de":1,"para":2},"kitPreparado":{"kitKey":"beautySalon","de":1,"para":5,"pendenciasAnoCongelado":["referential:2025:2.1.3","referential:2025:2.1.4","referential:2025:2.1.5","referential:2025:2.1.6","referential:2025:3.6.1","referential:2025:3.6.2","referential:2025:4.5.1","referential:2025:4.5.2"]},"kitAtualizado":{"kitKey":"beautySalon","de":5,"para":6},"saldoAntesDepoisIgual":true}
> OK {"ownerUserId":"cmufn7te50279cixko3lvgj5x","unitId":"cmuw4z7zj02ehcii0st3unfr4","criadas":["1.1","1.1.1","1.1.2","1.1.3","2.1","2.1.1","2.1.2","2.3.1","3.5","4.3","4.4","2.1.3","3.6","4.5"],"renomeadas":[{"de":"1.1.1","para":"1.1.1.01"},{"de":"1.1.3","para":"1.1.1.02"},{"de":"1.1.2","para":"1.1.2.01"},{"de":"1.1.4","para":"1.1.2.02"},{"de":"1.1.5","para":"1.1.2.03"},{"de":"1.1.6","para":"1.1.3.01"},{"de":"2.1.1","para":"2.1.1.01"},{"de":"2.1.2","para":"2.1.2.01"},{"de":"2.3.1","para":"2.3.1.01"},{"de":"2.1.3","para":"2.1.3.01"},{"de":"2.1.4","para":"2.1.3.02"},{"de":"2.1.5","para":"2.1.3.03"},{"de":"2.1.6","para":"2.1.3.04"}],"personalizadasNaoTocadas":[],"bindingRecompilado":{"de":1,"para":2},"kitPreparado":{"kitKey":"beautySalon","de":1,"para":5,"pendenciasAnoCongelado":["referential:2025:2.1.3","referential:2025:2.1.4","referential:2025:2.1.5","referential:2025:2.1.6","referential:2025:3.6.1","referential:2025:3.6.2","referential:2025:4.5.1","referential:2025:4.5.2"]},"kitAtualizado":{"kitKey":"beautySalon","de":5,"para":6},"saldoAntesDepoisIgual":true}
> ```
>
> 4. Mesmo comando — 2ª rodada (idempotente: `renomeadas: []`, `criadas: []` nas unidades migradas; exit 1 pelas mesmas 3):
>
> ```text
> banco: C:\Users\smurf\Downloads\Luminaris\server\prisma\prisma\dev.db
> OK {"ownerUserId":"cmr2jfl4v0000ciakz7tduht3","unitId":"unit-incr6-val","criadas":[],"renomeadas":[],"personalizadasNaoTocadas":[{"code":"1.4.1","name":"Estoque de Produtos"}],"bindingRecompilado":null,"kitPreparado":null,"kitAtualizado":null,"saldoAntesDepoisIgual":true}
> OK {"ownerUserId":"cmr2jfl4v0000ciakz7tduht3","unitId":"unit-incr6-val-1782938879534","criadas":[],"renomeadas":[],"personalizadasNaoTocadas":[{"code":"1.4.1","name":"Estoque de Produtos"}],"bindingRecompilado":null,"kitPreparado":null,"kitAtualizado":null,"saldoAntesDepoisIgual":true}
> FALHOU unidade cmr2jyirc006oci1kscm61n6n (dono cmr2jfl4v0000ciakz7tduht3): pré-condição: o período 2026-10 da unidade precisa estar aberto (hoje: FUTURE) — o binding é recompilado com dry-run de lançamento. Abra o período e rode de novo; nada foi alterado.
> FALHOU unidade seed-unit-presumido (dono cmufn7n590000cixkxbls0agh): pré-condição: o período 2026-10 da unidade precisa estar aberto (hoje: FUTURE) — o binding é recompilado com dry-run de lançamento. Abra o período e rode de novo; nada foi alterado.
> FALHOU unidade seed-unit-real (dono cmufn7te50279cixko3lvgj5x): pré-condição: o período 2026-10 da unidade precisa estar aberto (hoje: FUTURE) — o binding é recompilado com dry-run de lançamento. Abra o período e rode de novo; nada foi alterado.
> OK {"ownerUserId":"cmufn7n590000cixkxbls0agh","unitId":"cmuw4yqxg001jcii0iz2yb9rw","criadas":[],"renomeadas":[],"personalizadasNaoTocadas":[],"bindingRecompilado":null,"kitPreparado":null,"kitAtualizado":null,"saldoAntesDepoisIgual":true}
> OK {"ownerUserId":"cmufn7te50279cixko3lvgj5x","unitId":"cmuw4z7zj02ehcii0st3unfr4","criadas":[],"renomeadas":[],"personalizadasNaoTocadas":[],"bindingRecompilado":null,"kitPreparado":null,"kitAtualizado":null,"saldoAntesDepoisIgual":true}
> ```
>
> 5. Os 17 de-para de 2025 (`ensureChartOfAccounts` + `ReferentialMappingService.batchSet` com o DTO
> `BatchSetReferentialMappingSchema` + `coverage`, os mesmos serviços da rota `POST /referential/mappings/batch`):
>
> ```text
> banco: C:\Users\smurf\Downloads\Luminaris\server\prisma\prisma\dev.db
> batchSet: 17 de-para gravados em cmuw4yqxg001jcii0iz2yb9rw
> coverage cmuw4yqxg001jcii0iz2yb9rw 2025: 32/32 · ready true · unmapped []
> banco: C:\Users\smurf\Downloads\Luminaris\server\prisma\prisma\dev.db
> batchSet: 17 de-para gravados em cmuw4z7zj02ehcii0st3unfr4
> coverage cmuw4z7zj02ehcii0st3unfr4 2025: 32/32 · ready true · unmapped []
> ```
>
> 6. Conferência final (leitura do `dev.db`, só leitura):
>
> ```text
> cmuw4yqxg001jcii0iz2yb9rw rasas [] | sem superior sintético [] | kit v 6
> cmuw4z7zj02ehcii0st3unfr4 rasas [] | sem superior sintético [] | kit v 6
> ```
>
> Fica de fora, por decisão registrada no chat (15/10): as 3 unidades legadas (`seed-unit-presumido`, `seed-unit-real`,
> `cmr2jyirc006oci1kscm61n6n`) seguem no plano de 3 níveis. Com o período aberto, o upgrade até o v5 delas tem 1 forward
> (binding do `sale.package.expired`; ensaio na cópia), que o F-L8-12 (a) recusa. Não devem ser abertas no servidor novo.
> Próximo do dono: subir o build de `f73da6e5`, regerar a ECD (passo 3, com `indNire = '0'` ou o NIRE real — L3) e importar
> no PVA (tentativa 3).
>
> DESFECHO: [dono]   ASSINATURA: [dono]

Abra o PVA da ECD → importar o `.txt` gerado. Anote **cada crítica** com o código do registro
(ex.: I050, J930), não só a mensagem.

Resultado esperado: import **sem críticas impeditivas**.

EVIDÊNCIA: [tela/protocolo do PVA com o resultado do import + lista de críticas, se houver]

> **Tentativa 1 — 2026-10-13.** O dono importou no PVA da ECD 10.4.1 o arquivo do passo 3 (`ecd_08845676XXXXXX_2025.txt`, sha256
> `d026d00e…`) e colou no chat a tela e o relatório de erros em PDF (28 páginas, sha256 `6f64fa76…b52485`). O agente transcreveu
> o relatório e o cruzou com o arquivo, sob o comando do dono (*"mexa por mim"*). O PVA não pôde ser operado pelo agente: as
> janelas rodam como administrador e o Windows (UIPI) bloqueia a entrada.
>
> ```text
> PVA ECD: "O arquivo contém erros e não será importado."     Total de Erros 189
>   1   Bloco não importado. — "O bloco I não foi importado pois contém erros."
>  15   Registro não deve existir neste tipo de escrituração. Não houve informação de plano referencial no registro 0000 (COD_PLAN_REF).
>       → I051 nas linhas 9, 12, 15, 18, 21, 24, 28, 31, 35, 39, 42, 45, 48, 52, 55 (todos os 15)
> 173   Conteúdo do campo inválido. → campo HIST do I250, a partir da linha 220
>       ex.: |I250|2.1.2||769,06|C|||Contas a pagar  Fornecedor Seed (NF SEED-AP-2025-01-1)||
> cruzamento com o arquivo (agente): 173 de 411 I250 têm o byte 0x14 no HIST e são exatamente os 173 criticados.
>       HIST hex: … 70 61 67 61 72 20 14 20 46 6f 72 6e …   ("pagar \x14 Fornecedor")
> ```
>
> **Diagnóstico (achado, não hotfix; GHC-003):**
>
> | # | Achado | Causa no código | Grau | Saída com dado (sem código)? |
> |---|---|---|---|---|
> | **L5** | 0000.`COD_PLAN_REF` vazio com 15 I051 emitidos | `codPlanRef` é opcional em `SpedEcdDto.ts:117` e o gerador emite I051 assim mesmo (`sped.ts:211`). A tabela P6 deste runbook também o dava como opcional. O enum aceita 1–10, e a tabela vai até 11 (TEF). | **verificado pelo PVA** | sim: `codPlanRef = '1'`, porque o catálogo mapeado é `L100A`+`L300A` (PJ em geral, Real; RUNBOOK-X2). O valor exato é inferido até o PVA aceitar. |
> | **L6** | Caractere fora do Latin-1 vira byte de controle no arquivo | `Buffer.from(text, 'latin1')` trunca o code point para o byte baixo: o "—" (U+2014) dos históricos de AP/AR (`PayableService.ts:1439,1453` e `ReceivableService.ts:774,785`) sai como `0x14`. Mesma conversão em `SpedGenerationService.ts:172`, `SpedEcfGenerationService.ts:144` e `SpedEcfRealGenerationService.ts:474`, então a ECF corre o mesmo risco com qualquer texto livre. | **verificado** (PVA + bytes do arquivo + leitura do código) | **não**: os históricos vêm do razão gravado. É preciso corrigir o gerador (transliterar ou recusar antes de codificar). |
>
> Desfecho desta tentativa pela regra acima: **FALHOU no passo 4**; passos 5 e 6 não executados. A marcação é do dono e foi
> diferida ao go-live (13/10). Reexecução só depois da correção de L6 (sessão de instrumentação → correção, que exige "executa").
>
> DESFECHO: [dono]   ASSINATURA: [dono]

> **Tentativa 2 — 2026-10-13, depois do #642 (L5/L6 corrigidas; main `c00e7b8e`, build de produção).** O agente gerou de
> novo a ECD sob comando do dono, com o P6 + `codPlanRef = '1'`: job `cmv66y0st0000civkawovszls`, 48.404 bytes, 888 linhas,
> sha256 `ea7cb533…e8afd8`. 0000 termina em `|1|`, 0 byte de controle e 173 I250 com " - ". O dono importou no PVA 10.4.1
> (`…-tentativa2.txt`) e colou as telas e o relatório de validação em PDF (9 páginas, sha256 `a9b657c2…`). O agente o
> transcreveu.
>
> ```text
> PVA: "A importação foi concluída com êxito. A escrituração não possui erros de estrutura."   ← L5 e L6 resolvidas
> validação de conteúdo: "O arquivo contém erros e avisos."     Total de Erros 23 · Total de Advertências 21
> ERROS
>  1  Registro obrigatório não encontrado. → 0007
>  1  O campo NIRE é obrigatório quando a escrituração possui registro na Junta Comercial. → I030 campo 7 (linha 6)
>  9  Plano de contas deve conter no mínimo 4 níveis (Res. CFC 1299/2010): analítica de Ativo/Passivo/PL deve ser nível ≥ 4
>     → I050 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6, 2.1.1, 2.1.2 (NIVEL 3) e 2.3.1 (NIVEL 3, sup 2.3)
>  8  Campo obrigatório não preenchido. → I050 campo 7 COD_CTA_SUP vazio em 1.1.1..1.1.6, 2.1.1, 2.1.2
>  1  Não deve existir mais de uma linha de nível igual a 1 na DRE. → J150 linha 850 (DRE_CMV, nível 1)
>  2  VL_CTA_FIN da linha de detalhe da DRE ≠ calculado de I155/I355 → J150 4.2 (−25508,07 × 25508,07 C) e 4.1
>     (−75153,45 × 75153,45 C)
>  1  Totalizador da DRE ≠ soma das linhas de nível imediatamente inferior → J150 DRE_RESULTADO (110766,34 × esperado 0,00)
> ADVERTÊNCIAS
> 11  I155 com todos os campos zerados → 2.3.1 nos meses sem movimento
>  1  Não houve recuperação da ECD anterior.
>  8  Conta de nível superior deverá ter a mesma natureza da subconta → I050 1.1.x, 2.1.x (consequência do COD_CTA_SUP vazio)
>  1  Data de arquivamento dos atos constitutivos (I030 DT_ARQ) não informada.
> ```
>
> **Diagnóstico (achado, não hotfix; GHC-003).** Os 23 erros fecham em 4 grupos:
>
> | # | Erros | Causa | Grau | Trilho |
> |---|---|---|---|---|
> | **L3** | 1 | NIRE vazio com `IND_NIRE = 1` (P6 de teste) | **verificado pelo PVA** | dado: `indNire = '0'` ou o NIRE real (JUCESP). Fica aberto o refine do DTO (exigir `nire` se `indNire = 1`) |
> | **L7** | 1 | o gerador não emite o registro **0007** (outras inscrições cadastrais), obrigatório | verificado pelo PVA; causa no código a conferir | instrumentação → correção |
> | **L8** | 9 + 8 (+ 8 adv.) | **o plano de contas canônico é raso**: as analíticas patrimoniais estão no nível 3 e as sintéticas intermediárias (`1.1`, `2.1`) não existem. A Res. CFC 1.299/2010 exige ≥ 4 níveis. | verificado pelo PVA | **domínio: ADR** (plano canônico + migração dos tenants instalados). Não é correção mínima |
> | **L9** | 1 + 2 + 1 | **DRE (J150)**: cada grupo sai no nível 1; despesa/CMV com `IND_DC_CTA_FIN = C`; o totalizador "Resultado" não tem filhas | verificado pelo PVA | instrumentação → correção (gerador do bloco J) |
>
> Desfecho desta tentativa pela regra acima: **FALHOU no passo 4** (marcação do dono, diferida ao go-live). Para a
> tentativa 3: L3 sai por dado; L7 e L9 exigem "executa"; L8 exige ADR com decisão do dono antes de qualquer código.
>
> DESFECHO: [dono]   ASSINATURA: [dono]

> **Tentativa 3 — ambiente (2026-10-21).** L7 e L9 corrigidos no #645 (`d9519f45`), L8 no #691 (`f73da6e5`), ambos em
> `main`. A `main` andou até `3ddd33dc`, com 15 migrações a mais que o `dev.db` de 15/10, e a ensaiei antes numa cópia do
> banco (exit 0, `integrity_check ok`, sem violação de FK).
>
> EVIDÊNCIA do ambiente da tentativa 3 (backup, `migrate deploy` e build de produção; preenchida pelo agente sob comando
> do dono no chat, 2026-10-21 — *"faz o backup do dev.db real, aplica as 15 migrações, sobe o build de produção da main e
> preenche a EVIDÊNCIA com a saída literal"*). Banco: `server/prisma/prisma/dev.db` (real), via `DATABASE_URL` absoluto
> no `server/.env` do worktree `goofy-heisenberg-91171d`, em `main` `3ddd33dc`; portas 3000/3001 livres antes do passo 1.
> As saídas do `migrate deploy` e dos builds são as linhas filtradas por `grep`/`tail` como saíram na sessão.
>
> 1. Backup. Primeiro pela API de backup do SQLite (origem aberta só para leitura); como a API reescreve as páginas e o hash
> sai diferente, fiz também a cópia byte a byte (WAL com 0 byte, nenhum processo escrevendo). O rollback usa a cópia exata.
>
> ```text
> integrity ok
> -rw-r--r-- 1 smurf 197609 9187328 Oct 21 20:12 C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev-20261021-pre-h1-t3.db
> 4bfcdbfcdbda08d6167de7cfada72b5faf9a51689d01029ca451032f7a20bdbe *C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db
> cb2f84ee6514ade770c414dc58f227df9fcfced5479339c236d942970ab291c7 *C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev-20261021-pre-h1-t3.db
> -rw-r--r-- 1 smurf 197609       0 Oct 15 01:56 C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db-wal
> 4bfcdbfcdbda08d6167de7cfada72b5faf9a51689d01029ca451032f7a20bdbe *C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db
> 4bfcdbfcdbda08d6167de7cfada72b5faf9a51689d01029ca451032f7a20bdbe *C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev-20261021-pre-h1-t3.copia-exata.db
> ```
>
> 2. `npx prisma migrate deploy` (exit 0; `grep -E "Datasource|Applying|applied|migrations found|Error"`):
>
> ```text
> Datasource "db": SQLite database "dev.db" at "file:C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db"
> 114 migrations found in prisma/migrations
> Applying migration `20261013120000_add_fiscal_certificates`
> Applying migration `20261016120000_add_interview_session`
> Applying migration `20261016120000_add_receita_fiscal_recebimentos`
> Applying migration `20261016120000_chat_message_usage`
> Applying migration `20261016150000_add_simples_creditos_incobraveis`
> Applying migration `20261017153700_seed_simples_res_cgsn_190`
> Applying migration `20261017180000_legal_parameters_v8_csll_bancos_historico`
> Applying migration `20261017190000_legal_parameters_lp9_pis_cofins_ncm`
> Applying migration `20261017200000_legal_parameters_fer_feriado_local`
> Applying migration `20261017210000_add_dynamic_table_schema_version`
> Applying migration `20261017210100_add_dynamic_table_version_ledger`
> Applying migration `20261021120000_add_partners_irrf_distribuicao`
> Applying migration `20261021120000_add_user_token_version`
> Applying migration `20261021120000_legal_parameters_ibs_cbs`
> Applying migration `20261021120100_service_fiscal_profile_cclasstrib`
> The following migration(s) have been applied:
> All migrations have been successfully applied.
> ```
>
> 3. Conferência depois da migração (leitura do `dev.db`, só leitura):
>
> ```text
> integrity ok | fk 0 | migracoes aplicadas 114
> cmuw4yqxg001jcii0iz2yb9rw | folhas 32 | sem de-para 2025 0 | kit v 6 | 2025 HARD_CLOSED 12
> cmuw4z7zj02ehcii0st3unfr4 | folhas 32 | sem de-para 2025 0 | kit v 6 | 2025 HARD_CLOSED 12
> ```
>
> 4. Build de produção de `3ddd33dc`: `server` com `npm run build` (inclui `prisma generate`; exit 0) e `my-app` com
> `npm run build` (exit 0):
>
> ```text
> -rw-r--r-- 1 smurf 197609 5290 Oct 21 20:21 dist/server.js
>  ✓ Compiled successfully in 10.0s
> ```
>
> 5. No ar (`npm run start` nos dois, configurações `backend-prod`/`frontend-prod`):
>
> ```text
> Luminaris Server running on http://localhost:3001
> {"status":"degraded","uptime":24.1505263,"checks":{"database":"ok","qdrant":"error"}}
> HTTP 503
> front / HTTP 200
> POST /api/auth/login (seed-presumido) → HTTP 200 | token true | chaves [ 'user', 'token' ]
> ```
>
> O 503 vem só do Qdrant fora do ar (RAG do chat; o H1 não usa). O login confere que a migração `add_user_token_version` não
> quebrou a autenticação do seed. Próximo do dono: passo 3 (gerar a ECD como `seed-presumido`, unidade
> `cmuw4yqxg001jcii0iz2yb9rw`, P6 com `codPlanRef = '1'` e `indNire = '0'` ou o NIRE real — L3) e importar no PVA (tentativa 3).
>
> DESFECHO: [dono]   ASSINATURA: [dono]

> **Tentativa 3 — 2026-10-21, resultado do PVA.** O dono importou no PVA da ECD o arquivo do passo 3 (tentativa 3,
> sha256 `924f32cc…764ad6`) e colou no chat a página "Pendências de Validação" (1 página). O agente a transcreveu.
>
> ```text
> Pendências de Validação
> Contribuinte: CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.        CNPJ: 08.845.676/XXXX-XX
> Período da Escrituração: 01/01/2025 a 31/12/2025
> Arquivo de referência: C:/Users/smurf/Downloads/H1-PVA/ecd_08845676000198_2025-tentativa3.txt
> Data / Hora Avaliação: 21/10/2026 21:22:15
> Total de Erros 1
>   1  O campo NIRE é obrigatório quando a escrituração possui registro na Junta Comercial. Caso contrário, o campo não deve ser preenchido.
> Total de Advertências 13
>  11  Pelo menos um dos campos (saldo inicial, total de débitos, total de créditos ou saldo final) deve conter valor diferente de zero.
>   1  Não houve recuperação da ECD anterior. Verifique se a situação está correta.
>   1  A data do arquivamento dos atos constitutivos ou a data de arquivamento dos atos de conversão devem ser informados. Verifique se esta situação está correta.
> ```
>
> **Diagnóstico (achado, não hotfix; GHC-003).** De 23 erros na tentativa 2 para 1: L7, L8 e L9 sumiram do relatório
> (**verificado pelo PVA**). As 13 advertências não impedem (as 11 de I155 zerado e a da ECD anterior já vinham da
> tentativa 2; a do `DT_ARQ` também).
>
> | # | Erros | Causa | Grau | Trilho |
> |---|---|---|---|---|
> | **L3b** | 1 | O PVA acusa a regra do NIRE com `IND_NIRE = 0` (0000 campo 13) e NIRE vazio (I030 campo 07). Pelo Manual ECD L9 jan/2026 (ADE Cofis 01/2026, sha256 `7ddf4775…`), p. 115, `REGRA_CAMPO_OBRIGATORIO_NIRE` só dá erro em `IND_NIRE = 0` **com** NIRE preenchido, ou em `IND_NIRE = 1` **sem** NIRE. O arquivo está no caso que passa. | erro **verificado pelo PVA**; causa **em aberto**: a página colada não traz registro/linha | 1º: o detalhe da pendência (registro, linha, campo) colado pelo dono. Saída por dado que satisfaz a regra nos dois ramos: `indNire = '1'` com o NIRE real da JUCESP (11 dígitos, começando por 35, `REGRA_NIRE_UF`) |
>
> **Detalhe da pendência (2026-10-22).** O dono colou o relatório detalhado da mesma validação (3 páginas, avaliação de
> 22/10/2026 01:30:55, sha256 `ec284efd0316bdab…`). O agente o transcreveu e o cruzou com o arquivo:
>
> ```text
> ERRO  O campo NIRE é obrigatório quando a escrituração possui registro na Junta Comercial. ...
>       I030 · campo 7 - NIRE · linha 7
>       |I030|TERMO DE ABERTURA|1|LIVRO DIARIO|960|CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.||08845676XXXXXX| | | |31122025|
> ADV   Não houve recuperação da ECD anterior. → 0000 · linha 1
>       |0000|LECD|01012025|31122025|CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.|08845676XXXXXX|SP| |3550308| | |0|1|0| |0|0| |N|N|0|0|1|
> ADV   DT_ARQ → I030 · campo 9 · linha 7
> ADV   ×11 I155 2.3.1.01 zerado → linhas 131, 144, 157, 170, 183, 196, 209, 222, 235, 248, 261
> o arquivo importado (tentativa 3, sha256 924f32cc…):
>       |0000|...|SP||3550308|||0|0|0||0|0||N|N|0|0|1|      ← IND_NIRE (campo 13) = 0
>       |I030|TERMO DE ABERTURA|1|LIVRO DIARIO|956|...      ← 956 linhas
> o arquivo da tentativa 2 (sha256 ea7cb533…): 0000 com |0|1|0| (IND_NIRE = 1) e I030 com 888
> ```
>
> **O PVA valida um 0000 com `IND_NIRE = 1`, e o arquivo da tentativa 3 tem `IND_NIRE = 0`** (verificado: bytes do arquivo
> × relatório). A regra do NIRE, portanto, disparou corretamente sobre o que o PVA tem na base. O defeito não está no
> gerador. O `QTD_LIN` 960 contra 956 sugere que o PVA reescreve o I030 com as próprias linhas (inferido). A causa mais
> provável do `IND_NIRE = 1` é a base local do PVA: as três tentativas têm a mesma identificação (CNPJ, período, livro G,
> `NUM_ORD` 1), e o indicador da tentativa 2 ficou na escrituração gravada (**inferido**). Teste que decide: excluir da base
> do PVA as escriturações desse CNPJ, importar a tentativa 3 de novo e validar. Se o erro sumir, o L3b fecha sem código.
>
> **Revalidação com a base limpa (2026-10-22).** O dono excluiu da base do PVA as escriturações desse CNPJ, importou de
> novo o mesmo arquivo (tentativa 3, sha256 `924f32cc…`) e colou o relatório detalhado (3 páginas, avaliação de
> 22/10/2026 01:42:00, sha256 `5f4a14b8e73816b6…`). O agente o transcreveu:
>
> ```text
> Pendências de Validação — "No relatório abaixo estão descritas as advertências encontradas durante a validação."
> (sem a seção ERROS)
> Total de Advertências 13
>  11  Pelo menos um dos campos (saldo inicial, total de débitos, total de créditos ou saldo final) deve conter valor diferente de zero.
>      → I155 2.3.1.01 nas linhas 131, 144, 157, 170, 183, 196, 209, 222, 235, 248, 261
>   1  Não houve recuperação da ECD anterior. → 0000 linha 1
>      |0000|LECD|01012025|31122025|CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.|08845676XXXXXX|SP| |3550308| | |0|0|0| |0|0| |N|N|0|0|1|
>   1  A data do arquivamento dos atos constitutivos ou a data de arquivamento dos atos de conversão devem ser informados.
>      → I030 campo 9 (DT_ARQ), linha 7
>      |I030|TERMO DE ABERTURA|1|LIVRO DIARIO|960|CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.||08845676XXXXXX| | | |31122025|
> ```
>
> **L3b fechado sem código (verificado pelo PVA):** o 0000 agora sai com `IND_NIRE = 0` (`|0|0|0|`), igual ao arquivo, e o
> erro do NIRE sumiu. A causa era a escrituração da tentativa 2 gravada na base local do PVA, com a mesma identificação.
> Lição para as próximas reimportações (inclusive a ECF do passo 6): excluir antes a escrituração anterior da base do PVA.
> O `QTD_LIN` 960 persiste com a base limpa, então é o PVA reescrevendo o I030, não resíduo (verificado).
>
> As 13 advertências não impedem a importação. As 11 de I155 vêm da 2.3.1.01, sem movimento nos meses. A da ECD anterior
> é esperada: não há ECD de 2024 no PVA. A do `DT_ARQ` sai por dado (`book.dtArq`, já aceito pelo DTO) se o dono quiser.
>
> Desfecho desta tentativa pela regra acima: na 1ª validação, **FALHOU no passo 4** (1 erro). Na revalidação com a base
> limpa, **resultado esperado atingido: import sem críticas impeditivas** — o passo 5 está liberado. A marcação é do dono.
>
> DESFECHO: [dono]   ASSINATURA: [dono]

> **Se houver crítica:** desfecho **FALHOU**, e **pare aqui — não execute os passos 5 e 6.**
> Crítica do PVA é **achado de domínio**: vira ADR ou emenda do ADR existente, **nunca hotfix**.

### 5. Gerar a ECF

Só depois que a ECD importou limpa. Mesma aba **Compliance** → formulário **ECF**: ano, declarante,
dados fiscais e signatários (P6). Clique em gerar — gera e baixa.

Resultado esperado: download de `sped-ecf-<ano>.txt`. Se vier **400 com `unmappedRevenueAccounts`**,
existe conta de receita com movimento fora de {3.1, 3.3} — achado de domínio, registre e pare.

EVIDÊNCIA: [nome do arquivo + primeiras linhas do 0000, tarjadas]

> Preenchida pelo agente sob comando do dono no chat (2026-10-22: *"gera a ECF do passo 5 como seed-presumido com o P6 de
> dados públicos e preenche a EVIDÊNCIA com a saída literal"*), tenant `seed-presumido`, unidade `cmuw4yqxg001jcii0iz2yb9rw`,
> build de produção de `3ddd33dc`, depois de a ECD da tentativa 3 importar sem crítica impeditiva (passo 4). Gerado pela API
> (o mesmo endpoint que a tela chama), com o bloco `ecf` do P6 de
> [`H1-P6-DADOS-PUBLICOS-2026-10-13`](H1-P6-DADOS-PUBLICOS-2026-10-13.md), sem alteração. CNPJ tarjado; os CPFs são fictícios.
>
> Ambiente: o app tinha parado o backend desta sessão, e a porta 3001 estava ocupada por um `node dist/server.js` de outra
> sessão, que não enxerga o `dev.db` real (o job da ECD da tentativa 3 dava 404 nele). Não foi derrubado. O backend deste
> worktree subiu na porta **3101** (o `PORT` do `server/.env` vence a variável de ambiente), com o mesmo `DATABASE_URL`
> absoluto, e o job da ECD da tentativa 3 aparece nele (`200 cmviryahj0000ciwcjo9lpkw4 EXPORTED`). Saída literal:
>
> ```text
> POST /accounting/sped/ecf/generate → HTTP 201
>   job cmvj286120000ciss7xqbk271 · EXPORT_SPED_ECF · EXPORTED · fileName ecf_08845676XXXXXX_2025.txt · sizeBytes 2102
>   sha256 6aa2d41e4f09a207f8c2a1afe11438be54992556d90076c7512526131cfde09f · totalRows 109
> GET /accounting/data-exchange/jobs/cmvj286120000ciss7xqbk271/download?unitId=… → HTTP 200 · text/plain
>   2102 bytes · 109 linhas · CRLF · 0 byte(s) de controle · 3 bytes > 0x7F (Latin-1) · sha256 6aa2d41e4f09a207f8c2a1afe11438be54992556d90076c7512526131cfde09f
> |0000|LECF|0012|08845676XXXXXX|CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.|0|0|||01012025|31122025|N||0||
> |0010||N|5|T|01|PPPP||C||||2|
> |0020|1|0|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N|N||
> |0030|2046|8650004|AVENIDA DOS EUCALIPTOS|762||INDIANOPOLIS|SP|3550308|04517050|1148583340|dri@espacolaser.com.br|
> |P200|8||37671,94|
> |P200|4||9112,00|
> |P200|8||44430,38|
> |P200|4||7312,37|
> |P200|8||37838,21|
> |P200|4||16006,73|
> |P200|8||42547,37|
> |P200|4||16508,86|
> |P400|4||37671,94|
> |P400|2||9112,00|
> |P400|4||44430,38|
> |P400|2||7312,37|
> |P400|4||37838,21|
> |P400|2||16006,73|
> |P400|4||42547,37|
> |P400|2||16508,86|
> |9999|109|
> registros: 9001 9900×46 9990 9999 0000 0001 0010 0020 0030 0930×2 0990 C001 C990 E001 E990 J001 J990 K001 K990 L001 L990 M001 M990 N001 N990 P001 P030×4 P200×8 P400×8 P990 Q001 Q990 S001 S990 T001 T990 U001 U990 V001 V990 W001 W990 X001 X990 Y001 Y990
> ```
>
> Conferência (agente): a receita de serviço nos 4 trimestres (P200 linha 8 / P400 linha 4) soma 162.487,90, e a de revenda
> (P200 linha 4 / P400 linha 2) soma 48.939,96. As duas são iguais às linhas 3.1 e 3.3 do J150 da ECD da tentativa 3
> (verificado). O arquivo não traz P300/P500 nem os blocos C/E/J/K preenchidos, por desenho (`src/lib/ecf.ts:25-31`, ADR
> §Emenda FASE 2): o PVA da ECF calcula a presunção e o imposto pelas fórmulas da RFB e recupera C/E/J/K da ECD
> (`0010.TIP_ESC_PRE = 'C'`). Para o passo 6: o PVA da ECF vai pedir a ECD de 2025 para a recuperação. Arquivo para
> importar: `C:\Users\smurf\Downloads\H1-PVA\ecf_08845676000198_2025.txt` (não abra nem salve em editor).
>
> DESFECHO: [dono]   ASSINATURA: [dono]

> **Tentativa 2 — 2026-10-22, depois da correção do L10 (#837, branch `claude/h1-l10-ecf-ordem-bloco-p` em `62c9d255`).**
> Preenchida pelo agente sob comando do dono no chat (2026-10-22: *"faz o backup do dev.db real, aplica a migração nova, sobe
> o build deste branch, regera a ECF do passo 5 e preenche a EVIDÊNCIA com a saída literal"*). Banco
> `server/prisma/prisma/dev.db` (real), mesmo `DATABASE_URL` absoluto; backend na porta 3101 (a 3001 segue com o servidor de
> outra sessão). Mesmo P6 da tentativa 1, sem alteração.
>
> 1. Backup. A WAL tinha 82.432 bytes (o backend anterior foi encerrado à força, sem checkpoint), então a cópia byte a byte
> do `dev.db` sozinha ficaria incompleta. Ela foi descartada, e o backup foi feito pela API do SQLite (origem só leitura,
> lê a WAL):
>
> ```text
> -rw-r--r-- 1 smurf 197609   82432 Oct 22 01:58 C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db-wal
> integrity ok
> jobs ECF no backup: 1
> migracoes: 114
> -rw-r--r-- 1 smurf 197609 9326592 Oct 22 02:04 C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev-20261022-pre-h1-ecf-t2.db
> 7c293dedb5675a46a12cca89a0bd0e4a5b115133dc0c47c9088ad201f33a9707 *C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev-20261022-pre-h1-ecf-t2.db
> ```
>
> 2. `npx prisma migrate deploy` (exit 0) e conferência:
>
> ```text
> Datasource "db": SQLite database "dev.db" at "file:C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db"
> 115 migrations found in prisma/migrations
> Applying migration `20261021130000_add_consumption_tax_assessments`
> The following migration(s) have been applied:
> All migrations have been successfully applied.
> integrity ok | fk 0 | migracoes 115
> ```
>
> 3. Build do `server` em `62c9d255` (`npm run build`, exit 0); a correção está no `dist`:
>
> ```text
> 177:            blockP.push(buildPLine('P200', exports.P_LINE.revenda.p200, q.revendaCents));
> 179:            blockP.push(buildPLine('P400', exports.P_LINE.servico.p400, q.servicoCents));
> Luminaris Server running on http://localhost:3101
> {"status":"degraded","uptime":6.9528651,"checks":{"database":"ok","qdrant":"error"}}
> ```
>
> 4. Geração (saída literal) e o bloco P do arquivo:
>
> ```text
> POST /accounting/sped/ecf/generate → HTTP 201
>   job cmvj2v1gv0000ci2k61c4ku45 · EXPORT_SPED_ECF · EXPORTED · fileName ecf_08845676XXXXXX_2025.txt · sizeBytes 2102
>   sha256 4ef7345d3fe5ca43711b5ae2288debe74d193d4d763d5e37fde5b86be8871e1c · totalRows 109
> GET /accounting/data-exchange/jobs/cmvj2v1gv0000ci2k61c4ku45/download?unitId=… → HTTP 200 · text/plain
>   2102 bytes · 109 linhas · CRLF · 0 byte(s) de controle · 3 bytes > 0x7F (Latin-1) · sha256 4ef7345d3fe5ca43711b5ae2288debe74d193d4d763d5e37fde5b86be8871e1c
> |0000|LECF|0012|08845676XXXXXX|CORPÓREOS - SERVIÇOS TERAPÊUTICOS S.A.|0|0|||01012025|31122025|N||0||
> |0010||N|5|T|01|PPPP||C||||2|
>  23 |P001|0|
>  24 |P030|01012025|31032025|T01|
>  25 |P200|8||37671,94|
>  26 |P200|4||9112,00|
>  27 |P400|4||37671,94|
>  28 |P400|2||9112,00|
>  29 |P030|01042025|30062025|T02|
>  30 |P200|8||44430,38|
>  31 |P200|4||7312,37|
>  32 |P400|4||44430,38|
>  33 |P400|2||7312,37|
>  34 |P030|01072025|30092025|T03|
>  35 |P200|8||37838,21|
>  36 |P200|4||16006,73|
>  37 |P400|4||37838,21|
>  38 |P400|2||16006,73|
>  39 |P030|01102025|31122025|T04|
>  40 |P200|8||42547,37|
>  41 |P200|4||16508,86|
>  42 |P400|4||42547,37|
>  43 |P400|2||16508,86|
>  44 |P990|22|
> registros: 9001 9900×46 9990 9999 0000 0001 0010 0020 0030 0930×2 0990 C001 C990 E001 E990 J001 J990 K001 K990 L001 L990 M001 M990 N001 N990 P001 P030×4 P200×8 P400×8 P990 Q001 Q990 S001 S990 T001 T990 U001 U990 V001 V990 W001 W990 X001 X990 Y001 Y990
> ```
>
> Em cada P030, os dois P200 vêm antes dos dois P400; valores, contagens e tamanho iguais aos da tentativa 1. Para o
> passo 6: excluir antes a ECF da tentativa 1 da base do PVA da ECF. Arquivo para importar:
> `C:\Users\smurf\Downloads\H1-PVA\ecf_08845676000198_2025-tentativa2.txt` (não abra nem salve em editor).
>
> DESFECHO: [dono]   ASSINATURA: [dono]

### 6. Importar a ECF no PVA

Abra o PVA da ECF → importar o `.txt`. Anote cada crítica com o código do registro.

Resultado esperado: import sem críticas impeditivas.

EVIDÊNCIA: [tela/protocolo do PVA + lista de críticas, se houver]

> **Tentativa 1 — 2026-10-22.** O dono importou no PVA da ECF o arquivo do passo 5 (`ecf_08845676000198_2025.txt`,
> sha256 `6aa2d41e…cfde09f`) e colou o "Relatório de Erros de Importação" em PDF (2 páginas, sha256 `d08cf1804e2b90da…`).
> O agente o transcreveu e o cruzou com o arquivo, sob o comando do dono.
>
> ```text
> Relatório de Erros de Importação          Versões - PVA: 12.2.7 / Descritor: 12003.1 / Java: 21.0.3 (64 bits)
> Total de Erros 9
>  8  Organização hierárquica dos blocos/registros do arquivo está fora dos padrões estabelecidos.
>     campo 1 - REG · valor esperado P500:
>     linha 27 |P200|4||9112,00|      linha 28 |P400|2||9112,00|
>     linha 32 |P200|4||7312,37|      linha 33 |P400|2||7312,37|
>     linha 37 |P200|4||16006,73|     linha 38 |P400|2||16006,73|
>     linha 42 |P200|4||16508,86|     linha 43 |P400|2||16508,86|
>  1  Quantidade de linhas do bloco P informada não confere com a calculada pelo sistema.
>     linha 44 · campo 2 - QTD_LIN_P · informado 22 · calculado 14 · |P990|22|
> ordem no arquivo (agente), igual nos 4 trimestres:
>     24 |P030|01012025|31032025|T01|
>     25 |P200|8||37671,94|   26 |P400|4||37671,94|   27 |P200|4||9112,00|   28 |P400|2||9112,00|
> ```
>
> **Diagnóstico (achado, não hotfix; GHC-003):**
>
> | # | Erros | Causa | Grau | Trilho |
> |---|---|---|---|---|
> | **L10** | 8 + 1 | Dentro de cada P030, o gerador intercala os registros por atividade: P200 + P400 de serviço, depois P200 + P400 de revenda (`src/lib/ecf.ts:416-424`). Depois do primeiro P400, o PVA só aceita P500 ou o próximo P030, e rejeita as 8 linhas de revenda. O P990 é consequência: 22 informadas, 14 aceitas (22 − 8). | ordem: **verificado** (PVA + linhas do arquivo + leitura do código); ordem dos códigos de linha dentro do mesmo registro (4 antes de 8, 2 antes de 4): **inferido** | instrumentação → correção (emitir, por período, todos os P200 e depois todos os P400). **Exige o "executa" do dono.** Sem saída por dado: com receita só de serviço o arquivo passaria, mas o seed tem as duas atividades |
>
> Desfecho desta tentativa pela regra acima: **FALHOU no passo 6** (erro de importação; a escrituração não entrou no PVA, sem
> validação de conteúdo). A marcação é do dono. Reexecução depois da correção de L10: regerar a ECF (passo 5) e importar de novo.
>
> DESFECHO: [dono]   ASSINATURA: [dono]

> **Tentativa 2 — 2026-10-22, importação.** O dono importou no PVA da ECF o arquivo do passo 5, tentativa 2
> (`ecf_08845676000198_2025-tentativa2.txt`, sha256 `4ef7345d…71e1c`), e colou o "Relatório de Importação" em PDF (3 páginas,
> sha256 `a5c9a3e89b91b816…`). O agente o transcreveu:
>
> ```text
> Relatório de Importação — "No relatório abaixo estão descritas as advertências encontradas durante a importação."
> Versões - PVA: 12.2.7 / Descritor: 12003.1 / Java: 21.0.3 (64 bits)
> (sem a seção ERROS)
> Total de Advertências 16
>  16  Dados atualizados na Linha de acordo com a tabela da RFB.  (campo 2 - CODIGO)
>      linhas 25 |P200|8| |37671,94|   26 |P200|4| |9112,00|    27 |P400|4| |37671,94|   28 |P400|2| |9112,00|
>             30 |P200|8| |44430,38|   31 |P200|4| |7312,37|    32 |P400|4| |44430,38|   33 |P400|2| |7312,37|
>             35 |P200|8| |37838,21|   36 |P200|4| |16006,73|   37 |P400|4| |37838,21|   38 |P400|2| |16006,73|
>             40 |P200|8| |42547,37|   41 |P200|4| |16508,86|   42 |P400|4| |42547,37|   43 |P400|2| |16508,86|
> ```
>
> **L10 fechado (verificado pelo PVA):** a escrituração importou sem erro de hierarquia nem de QTD_LIN. As 16 advertências
> são uma por linha `E` enviada: o PVA completa a descrição da linha pela tabela dinâmica da RFB, que o gerador manda vazia
> por desenho (`|P200|8||…|`, `src/lib/ecf.ts`). Não impedem nada. Falta a **validação de conteúdo** do PVA (o relatório
> acima é só da importação): é ela que confere a presunção e o IRPJ/CSLL que o PVA calcula a partir dessas receitas.
>
> DESFECHO: [dono]   ASSINATURA: [dono]

> **Tentativa 2 — 2026-10-22, validação.** O dono abriu a escrituração no PVA da ECF, rodou a verificação de pendências
> **sem recuperar a ECD** e colou o relatório detalhado (5 páginas, avaliação de 22/10/2026 10:17:00, sha256
> `aa1f0891c878e318…`). O agente o transcreveu:
>
> ```text
> Pendências de Validação — PVA 12.2.7 / Descritor 12003.1
> Total de Erros 19
>   1  Deve haver recuperação de ECD pois a pessoa jurídica indicou possuir contabilidade.  → C040 (|C001|1|)
>  10  Registro obrigatório não preenchido.
>      → J050 (|J001|1|) · K155 e K355 nos 4 K030 (T01..T04) · Y600 (|Y001|1|)
>   4  Total das receitas brutas informadas (P200(2)+P200(4)+P200(6)+P200(8)+P200(9)+P300(16)) diferente da receita
>      calculada [P150("3.01.01.01.01")-P150("3.01.01.01.02.01")-P150("3.01.01.01.02.02")-P150("3.01.01.01.01.35")]
>      → P200 linha 10 (RESULTADO DA APLICAÇÃO DOS PERCENTUAIS ...): 12783,98 · 14802,71 · 13388,77 · 14935,87
>   4  idem para a CSLL (P400(2)+P400(4)+P400(5)+P500(14))
>      → P400 linha 6: 13148,46 · 15095,21 · 14029,03 · 15596,22
> Total de Advertências 4
>   4  A RECEITA BRUTA da atividade geral (Linha 3.01.01.01.01) está com saldo zero (0).
>      → |P150|3.01.01.01.01|RECEITA BRUTA|S|5|04|3.01.01.01|0,00|C|V|  (nos 4 trimestres)
> ```
>
> **Diagnóstico (achado, não hotfix; GHC-003):**
>
> | # | Erros | Causa | Grau | Trilho |
> |---|---|---|---|---|
> | **R1** | 18 + 4 adv. | A ECD não foi recuperada na ECF (`0010.TIP_ESC_PRE = 'C'`: C, J050/J051, K155/K355 e o P150 vêm da ECD). Sem ela, o P150 tem receita 0 e o PVA acusa diferença entre a receita do P200/P400 e a "calculada". | C040: **verificado pelo PVA** (mensagem explícita); que os outros 17 erros e as 4 advertências somem com a recuperação: **inferido** | operação, sem código: recuperar a ECD da tentativa 3 no PVA da ECF e validar de novo. Risco a conferir: se o PVA exigir a ECD **assinada** para recuperar, o H1 com dados públicos esbarra nisso (a regra do P6 é não assinar) |
> | **L11** | 1 | O bloco Y sai vazio, e o PVA exige o **Y600** (identificação e remuneração de sócios ou titular). O gerador não emite Y600 (`src/lib/ecf.ts:381`, Y entre os blocos vazios), e o P6 não tem dado de sócio. | erro **verificado pelo PVA**; causa no código: **verificada** (leitura de `ecf.ts:381`) | domínio/feature: exige dado de sócio no request ou vindo do cadastro de sócios (o IRRF-DISTRIBUICAO cria `partners`). Vai a planejamento, não a correção mínima |
>
> Conferência (agente): o PVA calculou a presunção a partir das receitas enviadas e fechou com elas. T01: 37.671,94 × 32% +
> 9.112,00 × 8% = 12.783,98 (P200 linha 10) e 37.671,94 × 32% + 9.112,00 × 12% = 13.148,46 (P400 linha 6); verificado nos
> 4 trimestres, com o PVA arredondando a soma, não cada parcela (T02 CSLL: 14.217,7216 + 877,4844 = 15.095,21). Desfecho desta validação pela regra acima: **FALHOU no passo 6** (marcação do dono). Próximo: recuperar a
> ECD no PVA da ECF e validar de novo; o L11 segue para planejamento.
>
> DESFECHO: [dono]   ASSINATURA: [dono]

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

### Preflight do agente (2026-09-12, `luminaris-gate-copilot`) — grau por linha; NÃO é evidência do runbook

> Medido sobre **cópia** do `dev.db` real (`server/prisma/prisma/dev.db`, md5 `bf4f8bb4…`, 1.208.320 bytes;
> o original não foi tocado — gate S1). `main` = `197cc9fc` (#313). Tudo abaixo é `preflight`; a evidência
> que vale é a que o executor cola nos campos EVIDÊNCIA durante a execução dele.

| Pré-condição | Como verifiquei | Resultado | Grau |
|---|---|---|---|
| P1 código em `main` | `git log origin/main -1` | `197cc9fc` (L/M/N + `/api/lalur` em `main`) | verificado |
| `year=2025` tem leiaute | `lib/ecf.ts:48` `ECF_COD_VER_BY_YEAR = { 2025: '0012' }` | só 2025; `year=2026` ⇒ 400 explícito | verificado |
| P2b migrações pendentes | `smoke-migration-gate.mjs --db <real>` | **12 pendentes** (29/41 aplicadas); gate **FALHA S6/S7** — **ambas falso positivo**: S7 = índice `counterparties_…_type_name_key` foi **substituído** por `…_type_nameNormalized_key` (migração `20260830160349`), não perdido; S6 = rebuild int→bigint de `postings` muda a representação byte-a-byte, mas `count/Σdébito/Σcrédito/ids` são **idênticos** antes e depois (30 linhas, 1.897.300 / 1.897.300). Classe já registrada (`smoke-gate-s6-x-migracao-de-dado`). `prisma migrate deploy` na cópia aplica as 12 limpo e cria `lalur_entries`/`lalur_parte_b_accounts` | verificado |
| P2b binding `Active` | `activate-salon-binding.mjs` sobre a cópia migrada | **FALHA — binding compila como `Draft`**: o chart real do salão (13 contas) **não tem `1.1.6` Estoques, `3.3` Receita de Revenda e `4.2` CMV** (LAC-D, #259, posteriores ao seed do banco) e o **mês corrente (2026/09) está `FUTURE`** — o compilador roda dry-run e exige o mês OPEN. O RUNBOOK-H2 P0 só previa "chart ausente", não incompleto. ⇒ **novo passo P0.2b abaixo** | verificado |
| P3 build de produção sobe | `npm run build` + `node dist/server.js` sobre a cópia com binding `Active` | `Luminaris Server running` · `/health` `database: ok` (`qdrant: error` = degradado, não bloqueia) | verificado (na cópia) |
| ≥1 ajuste + 1 conta da Parte B | curls abaixo, na cópia | `POST /parte-b` 201 · `POST /entries` ×2 (A rel=4; P rel=1→Parte B) 201 · `POST …/ecf/real/generate` **201**, 108 linhas, `M010`/`M030`/`M300`/`M305` presentes (trecho colado em "Corpo dos curls") | verificado (na cópia) — **no real, é o executor que cadastra** |
| Dado do tenant × ano | `journal_entries` por ano na cópia | **todo o razão real é de 2026** (datas `1767225600000`…`1798675200000` = 01/01 a 31/12/2026); períodos só 2026; **nada em 2025**. A ECF Real de 2025 sai com Bloco M/N preenchidos pelo e-Lalur e L/K vazios (o PVA recupera da ECD — que também seria vazia em 2025). O PVA 12.2.6 valida **AC 2025** (Manual "AC_2025_SIT_ESP_2026"); AC 2026 normal só com o Leiaute 13 | verificado — **[DONO decide]** ver "Achados" |
| P4 PVA instalados / P5 mapeamento / P6 dados do contador / P7 dezembro OPEN | credencial/julgamento/dado externo | `[DONO confere]` — P7: em 2025 **não existe período** no controle; a geração da ECF não tem gate de período, mas o encerramento (passo 1 da 1ª passada) tem | — |

**Armadilhas deste repo que mordem neste gate (novas, medidas hoje):**
1. **`server/.env` sobrescreve o ambiente** (`src/config/env.ts:16` `override: NODE_ENV !== 'test'`): `--db` do
   `activate-salon-binding.mjs` e `DATABASE_URL`/`PORT` passados por env ao `npm start` são **ignorados** quando
   `server/.env` define os mesmos. Para ensaiar sobre cópia, aponte o `DATABASE_URL` **do `.env`** para a cópia
   (e restaure depois). No real, o `.env` já aponta para o real — funciona "por acidente".
2. **Ordem do P0 para este banco:** migrar → **completar o chart (3 contas) + abrir o mês corrente** → ativar binding
   → boot. O compilador não cria conta nem abre período.

#### P0.2b — completar o chart do salão e abrir o mês corrente (decisão do dono; escreve em dado real)

Sem isto o `activate-salon-binding.mjs` devolve `Draft` e o boot aborta. Fazer **depois** do `migrate deploy`
(P0 passo 2) e **antes** do passo 3. Duas formas equivalentes; a (a) é a que o ensaio usou:

- **(a) script descartável sobre o banco** (Prisma, mesmos códigos/nomes/naturezas de
  `ChartOfAccountsFixture.ts`): criar `Account {code:'1.1.6', name:'Estoques', nature:'Asset'}`,
  `{'3.3','Receita de Revenda','Revenue'}`, `{'4.2','CMV','Expense'}` (`acceptsEntries: true`) para
  `userId=<admin> unitId=<salão>`, e `AccountingPeriod {year: <ano atual>, month: <mês atual>}` → `OPEN`
  (`openedById=<admin>`). É seed de **conta/período**, não de binding — o ADR-INCR-BINDING-FEEDER §7 proíbe
  seed direto de *binding*.
- **(b) pela API** — impossível antes do boot (o boot exige o binding) — só serve se houver um servidor
  anterior ao #213 de pé, o que este runbook proíbe (commit exato).

Confirmação: `node scripts/activate-salon-binding.mjs --owner-user-id <admin> --unit-id <salão>` imprime
`OK: binding 'beautySalon' ativado — … versão N`. EVIDÊNCIA: [saída colada pelo executor]

#### Corpo exato dos curls da 2ª passada (ordem: login → Parte B → Parte A → gerar → baixar)

`<TOKEN>` = `data.token` do login; `<UNIT>` = unidade do salão (`cmr2jyirc006oci1kscm61n6n` no `dev.db` real);
`<PB_ID>` = `data.id` devolvido pelo passo 2. Valores de exemplo do ensaio — o executor troca pelos reais.

```bash
curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"<SENHA>\"}"
```

```bash
curl -s -X POST http://localhost:3001/api/lalur/parte-b -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"unitId\":\"<UNIT>\",\"codCtaB\":\"PB-PREJ-2024\",\"descricao\":\"Prejuizo fiscal acumulado ate 2024\",\"dtCriacao\":\"2024-12-31\",\"codPbRfb\":\"1000\",\"codTributo\":\"I\",\"saldoIniCents\":1000000,\"indSaldoIni\":\"D\"}"
```

```bash
curl -s -X POST http://localhost:3001/api/lalur/entries -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"unitId\":\"<UNIT>\",\"year\":2025,\"quarter\":\"T01\",\"livro\":\"lalur\",\"codigo\":\"7\",\"valorCents\":150000,\"indRelacao\":\"4\",\"histLancamento\":\"Custos nao dedutiveis\"}"
```

```bash
curl -s -X POST http://localhost:3001/api/lalur/entries -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"unitId\":\"<UNIT>\",\"year\":2025,\"quarter\":\"T01\",\"livro\":\"lalur\",\"codigo\":\"173\",\"valorCents\":40000,\"indRelacao\":\"1\",\"parteBId\":\"<PB_ID>\"}"
```

```bash
curl -s -X POST http://localhost:3001/api/accounting/sped/ecf/real/generate -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"unitId\":\"<UNIT>\",\"year\":2025,\"declarant\":{\"cnpj\":\"<CNPJ14>\",\"nome\":\"<RAZAO SOCIAL>\",\"codNat\":\"2062\",\"cnaeFiscal\":\"9602501\",\"endereco\":\"<LOGRADOURO>\",\"num\":\"100\",\"bairro\":\"<BAIRRO>\",\"uf\":\"SP\",\"codMun\":\"3550308\",\"cep\":\"01001000\",\"email\":\"<EMAIL>\"},\"fiscal\":{\"formaTrib\":\"1\",\"formaTribPer\":\"RRRR\",\"formaApur\":\"T\",\"indAliqCsll\":\"1\",\"indRecReceita\":\"2\"},\"signers\":[{\"identNom\":\"<CONTADOR>\",\"identCpfCnpj\":\"<CPF11>\",\"identQualif\":\"900\",\"indCrc\":\"<CRC>\",\"email\":\"<EMAIL>\",\"fone\":\"<FONE>\"},{\"identNom\":\"<SOCIO>\",\"identCpfCnpj\":\"<CPF11>\",\"identQualif\":\"203\",\"email\":\"<EMAIL>\",\"fone\":\"<FONE>\"}]}"
```

```bash
curl -s -o ecf_real_2025.txt "http://localhost:3001/api/accounting/data-exchange/jobs/<JOB_ID>/download?unitId=<UNIT>" -H "Authorization: Bearer <TOKEN>"
```

Trecho do arquivo do ensaio (cópia; Latin-1; `sha256 1525ca39…`, 2.306 bytes, 108 linhas) — o que o executor deve
reconhecer no dele antes de importar no PVA:

```
|0000|LECF|0012|<CNPJ>|<NOME>|0|0|||01012025|31122025|N||0||
|0010||N|1|T|01|RRRR||C||||2|
|M010|PB-PREJ-2024|Prejuizo fiscal acumulado ate 2024|31122024|1000||I|10000,00|D||
|M030|01012025|31032025|T01|
|M300|173|(-) Compensação de Prejuízos Fiscais de Períodos Anteriores - Atividades em Geral|P|1|400,00||
|M305|PB-PREJ-2024|400,00|C|
|M300|7|Custos não dedutíveis|A|4|1500,00|Custos nao dedutiveis|
|M990|10|
```

**Achados do preflight para o dono (fora do runbook, trilho = fila/ADR):**
- **A1 — Ano do dado × ano do PVA.** O razão real é 100% de 2026 e o PVA vigente valida AC 2025. Para o H1 (as duas
  passadas) provar *dado real* e não só estrutura, ou (i) o tenant ganha um exercício 2025 (cópia do banco com as
  datas deslocadas −1 ano, script descartável, **decisão do dono**), ou (ii) a passada roda em 2025 com razão vazio
  e prova a cadeia estrutural + e-Lalur (o que o ensaio fez), registrando que o L/K/ECD-recuperada saem vazios.
  (iii) Esperar Leiaute 13 + PVA AC 2026 (2027). Nenhuma das três é do agente.
  **→ DECISÃO DO DONO (2026-09-12, questionário):** *"o dev.db é só seed de testes, só popular a seed com dados para vários anos"* —
  nenhuma das três: o `dev.db` **é seed de desenvolvimento**, e a correção é a **seed cobrir vários exercícios** (2025 + 2026:
  períodos, lançamentos, AP/AR, e o chart completo com `1.1.6/3.3/4.2`). Vira item de fila (`job-generator` → seed fixture),
  com autorização própria; enquanto não existir, o H1 roda como (ii). Consequência para P2: o backup continua obrigatório
  (o passo 1 escreve), mas o banco não é "real" — é o seed que os runbooks passam a chamar de alvo.
- **A2 — P0 incompleto nos dois runbooks (H1/H2):** falta o passo "completar chart + abrir mês corrente" — esta
  emenda cobre o H1; o H2 precisa do mesmo parágrafo (docs-only, fora desta sessão).
- **A3 — `.env` com `override`** defeita o `--db` do script e o `PORT`/`DATABASE_URL` por env fora de teste. Classe
  `gate-predicate-environment-class`; não corrigido (fora de escopo — mudar o `override` toca o boot de todos).

### 2P-1. Recuperar a ECF do período anterior no PVA ANTES de validar

Manual do Leiaute 12, p.14: a partir do **2º exercício** em `FORMA_TRIB=1`, a transmissão verifica se
existe ECF transmitida do período anterior com o hashcode informado; o `.txt` do Luminaris emite
`0010.HASH_ECF_ANTERIOR` **vazio** (p.70, campo 2: *"preenchido automaticamente pelo sistema"*, Fork 2→d).
No PVA: abrir a escrituração → **Recuperar ECF anterior** → confirmar que o hash apareceu no 0010 e que os
saldos da Parte B (`E020`) recuperados batem com os `M010` do arquivo (`REGRA_SALDOS_M010_E020`, p.237 —
é erro, não aviso). **1º exercício em Real**: registrar "não se aplica" com o motivo.

Resultado esperado: recuperação sem erro; `E020` × `M010` iguais para cada `COD_CTA_B + COD_TRIBUTO`.

EVIDÊNCIA: [tela do PVA após a recuperação — hash do 0010 e lista E020/M010, tarjados]

> **[EMENDA 2026-09-28 — FE-INCR-LALUR-PR2]** Antes de gerar a ECF Real que o 2P-2 importa, os movimentos
> M410 da Parte B, o fechamento de cada trimestre (materializa o M500 e deriva o PF/BC) e o diagnóstico de saldos
> (materializado × recomputado, com os avisos X4-14) **podem ser feitos pela tela**: Contabilidade → Compliance →
> e-Lalur, sub-seção "Movimentos da Parte B (M410)". Antes eram só API. Os passos 2P-2/2P-3 e a evidência pedida
> não mudam.

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

### 2P-4. Parte B fechada — M410 (PF/BC), M500 × E020 e as 7 leituras INFERIDAS do BRIEF 3C (preparado em 2026-09-12, EM BRANCO)

Pré-requisito no Luminaris (ECF 3C, ADR EMENDA 3ª): os 4 trimestres do exercício **fechados** em
`POST /api/lalur/parte-b/close` (a geração recusa com 400 nomeando o primeiro aberto) e
`GET /api/lalur/parte-b/balances?unitId&year` com `divergences: []`. Ao menos UM trimestre com
**prejuízo** (base do IRPJ negativa) para que o `M410 … PF` derivado pelo sistema exista no arquivo, e ao
menos uma conta da Parte B com saldo de abertura ≠ 0 (para o transporte).

Conferir no PVA, nesta ordem, e colar a evidência de cada item (o que não for verificável nesta passada,
marcar "não exercitado" com o motivo — nunca em branco):

1. **REGRA_PREJUIZO_FISCAL / REGRA_BC_NEGATIVA (p.269, erro):** Σ `M410 PF` do período = base negativa do
   IRPJ que o PVA computa a partir da ECD recuperada + Parte A; idem `BC` × CSLL. Divergiu ⇒ a fórmula
   `base = resultado(T) + ΣA − ΣE` (D-P3.3, INFERIDA) está errada ou o razão difere do L300 — anotar os dois
   números. Origem: BRIEF 3C §4 itens 1 e 6.
2. **REGRA_SALDOS_M010_E020 (p.237, erro):** com a ECF anterior recuperada (2P-1), `M010.VL_SALDO_INI` de cada
   conta = `E020` = `M500(T04 do exercício anterior).SD_FIM_LAL` (C3 — âncora implícita). Divergiu ⇒ anotar
   `COD_CTA_B`, os dois valores e se o exercício anterior foi **refechado** após transmitido.
3. **Ordem intra-período (§4 item 3):** o PVA aceitou `M410` e `M500` depois de todos os `M300/M350` do
   mesmo `M030` (ordem hierárquica da p.236)? Crítica de ordem ⇒ registrar literal; mudança só no
   `ecfReal.ts`.
4. **`M500` para conta sem movimento e saldo zero (§4 item 4):** o Luminaris emite uma linha por conta viva do
   M010 ("visão sintética", p.271). O PVA aceitou / avisou / recusou? Registrar.
5. **`M410.COD_CTA_B` sempre preenchido (§4 item 2):** nenhuma crítica pedindo vazio? Registrar.
6. **`M312/M362` (p.254):** nos ajustes com conta contábil e valor **parcial** (menor que os 4 agregados do
   K155/K355), o PVA exigiu os `NUM_LCTO`? Os que o Luminaris emitiu bateram com o `I200` recuperado?
7. **Indicador do saldo zero = `C` (D-P3.1, INFERIDO):** conta com `SD_FIM_LAL = 0,00` saiu com `C`; o PVA
   aceitou? Registrar.

Resultado esperado: import sem erro em `M410/M415/M500/M510/M312/M315/M362/M365`; itens 1 e 2 **iguais**;
itens 3–7 aceitos (ou a crítica literal colada — é ela que muda o código, nunca a leitura do agente).

EVIDÊNCIA: [tela do PVA por item 1–7 — valores tarjados quando forem do tenant real; "não exercitado: <motivo>" onde couber]

## Desfecho da 2ª passada (marcar UM)

- [ ] **PASSOU** — 2P-1 (ou "não se aplica" justificado), 2P-2 e 2P-4 (itens 1 e 2 iguais) com evidência
      conferindo; 2P-3 sem crítica; 2P-4 itens 3–7 registrados
- [ ] **FALHOU** — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi
      executado após a falha
- [ ] **BLOQUEADO** — pré-condição __ não se sustentava; execução nem começou

## Registro da 2ª passada

- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha do master map §5.1 Bloco B item 10 atualizada com o
  desfecho + data]
- Assinatura do executor: ____________
