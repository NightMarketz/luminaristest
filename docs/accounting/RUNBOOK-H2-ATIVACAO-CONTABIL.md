# RUNBOOK: H2 — Ativação da contabilidade pela tela (LAC-B)

> Formato: [`RUNBOOK-FORMAT.md`](../operating-manual/RUNBOOK-FORMAT.md). Preparado **em branco** pelo agente
> (FE-INCR-BINDING-ACTIVATION-screen-brief item 12). **Evidência, desfecho e assinatura são do dono.**

Executor: ____________           Data: ____
Autorização: FE-INCR-BINDING-ACTIVATION-screen-brief.md item 12 + EMENDA-1 (13/10); execução da LAC-B pedida pelo dono no chat em 14/10/2026
Pré-condições:
- PR-0 (guarda 409 + recarga dos mappers) e PR-1 (faixa) da LAC-B integrados (commit ___)
- Servidor e `my-app` em **build de produção** (`npm run build && npm start`), a partir desse commit
- Um usuário com uma unidade **sem** binding `Active` (linha nova em `units`), e perfil fiscal cadastrado nela
  (aba "Perfil fiscal"). Sem o perfil, a ativação devolve `KIT_FISCAL_PROFILE_REQUIRED` (emenda E-5 do KIT-SETOR)

## Passos

1. Abrir Contabilidade e selecionar a unidade sem binding.
   Resultado esperado: acima das abas aparece a faixa âmbar *"A contabilidade automática desta unidade não está ativa —
   as vendas não geram lançamento."*, com o seletor "Setor" (Salão de beleza / Clínica de estética) e o botão
   "Ativar contabilidade".
   EVIDÊNCIA: [screenshot]

2. Clicar "Ativar contabilidade".
   Resultado esperado: a confirmação mostra o setor e os 2 efeitos (plano de contas padrão se vazio; período do mês
   corrente se não existir).
   EVIDÊNCIA: [screenshot]

3. Confirmar.
   Resultado esperado: um toast de sucesso aparece e a faixa some. A aba Pendências ainda não existe (I5 PR-3), então o
   link "Ver pendências da unidade" não aparece.
   EVIDÊNCIA: [screenshot]

4. **Sem reiniciar o servidor**, finalizar uma venda dessa unidade no módulo de vendas.
   Resultado esperado: a aba "Lançamentos" da unidade mostra o lançamento da venda (`sale.finalized`).
   EVIDÊNCIA: [screenshot]

5. (Guarda do 2º setor) Na mesma unidade, chamar `POST /api/accounting-binding/activate-default` com
   `{"unitId":"<id>","sectorKey":"aestheticClinic"}`.
   Resultado esperado: HTTP 409, `code: BINDING_SECTOR_CONFLICT`. Nenhum binding novo.
   EVIDÊNCIA: [saída do comando]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): ____
- Atualização do artefato de rastreio: nota [LAC-B](../plano/nos/LAC-B.md) (`estado_detalhe`) com o desfecho + data
- Assinatura do executor: ____________

---

## Execução 2026-11-04 — AI tester (C7, runbooks irmãos do H2)

Executor: agente claude-opus-5-5, AI tester           Data: 2026-11-04
Autorização (citada literalmente): dono, chat, 2026-11-02: *"gates humanos H1 e H2, as cédulas de decisão pendentes e o
#907. Faz e me substitui nas decisões"*; e dono, chat, 2026-11-04: *"Pode disparar uma sessão pra corrigir os achados e
outra para cada não feito"*.

**Ambiente.** Build de produção do commit `3077cda9` (= `origin/main` `f5dc79b7` + só docs; `git diff --stat 3077cda9
origin/main` sem arquivo fora de `docs/`), worktree `agent-af93873e91c9b426b`: server `node dist/server.js` em
`127.0.0.1:4100`, app `next start -H 127.0.0.1 -p 3100`, contra o dev.db real
`C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db`. Nenhuma migração nova em `main` desde `f5dc79b7`
(`git log f5dc79b7..origin/main -- server/prisma/migrations` vazio), então sem `migrate deploy` e sem re-semear. Tela
pelo runner Puppeteer headless (clique por DOM), usuário `seed-presumido`.

```text
PRAGMA integrity_check -> ok        (antes da 1ª escrita)
journal_mode -> wal
backup por cópia de bytes → server/prisma/backups/c7-irmaos-2026-11-04-20261104-001134/
dd54afa10d9385293ea216f3d3054110b30fff30b71f6210579485387d68eba8 *prisma/dev.db
193e707baae768a53c2dfba26afa83c5641821066f31275aa6f23cf6925d4db6 *prisma/dev.db-wal
92e741835b23eed530281897b5c9b8b7ce803c6963f1bbe28e28564e7828313e *prisma/dev.db-shm
dd54afa10d9385293ea216f3d3054110b30fff30b71f6210579485387d68eba8 *backups/c7-irmaos-2026-11-04-20261104-001134/dev.db
193e707baae768a53c2dfba26afa83c5641821066f31275aa6f23cf6925d4db6 *backups/c7-irmaos-2026-11-04-20261104-001134/dev.db-wal
92e741835b23eed530281897b5c9b8b7ce803c6963f1bbe28e28564e7828313e *backups/c7-irmaos-2026-11-04-20261104-001134/dev.db-shm
```

**Pré-condições.**
- PR-0/PR-1 da LAC-B em `main`: a faixa, o seletor e a guarda 409 respondem (passos 1 e 5). Grau: verificado pela tela.
- Unidade **sem** binding `Active`: o `seed-presumido` só tinha `seed-unit-presumido`, com binding `Active`. **Desvio de
  dado:** criei pela tela (Negócios → Unidades → Novo Registro) a unidade `Unidade C7 Ativacao`
  ([print](runbook-evidence/ATIVACAO-CONTABIL-2026-11-04/pre-01-nova-unidade-form.png)):
  ```text
  [net] POST /api/dynamic-tables/cmuw4yqut0001cii02g0qg04n/data -> 201  req: {"data":{"name":"Unidade C7 Ativacao","cnpj":"11.222.333/0001-81","city":"Sao Paulo","state":"SP","type":"Own","isActive":true}}
  ```
  id `cmw1jmmm80001cio0p4jszyhm`.
- Perfil fiscal da unidade (emenda E-5): **desvio de dado**, salvo pela aba "Perfil fiscal"
  ([print](runbook-evidence/ATIVACAO-CONTABIL-2026-11-04/pre-02-perfil-fiscal-salvo.png)):
  ```text
  [net] GET /api/accounting/fiscal-profile?unitId=cmw1jmmm80001cio0p4jszyhm -> 404
  [net] PUT /api/accounting/fiscal-profile -> 200  req: {"unitId":"cmw1jmmm80001cio0p4jszyhm","regimeTributario":"PRESUMIDO","icmsContribuinte":false,"pisCofinsRegime":"CUMULATIVO",…,"codMun":"3550308","inscricaoMunicipal":"12345678","cnae":"9602501","dpsSerie":900,"regEspTrib":0,…,"issAliquotaBp":200,…,"emissaoForaDoMes":"AVISAR"}
  ```

**Passo 1 — faixa.** Contabilidade → unidade `Unidade C7 Ativacao`.
[print](runbook-evidence/ATIVACAO-CONTABIL-2026-11-04/passo1-01-faixa-ambar.png): faixa âmbar com ⚠, o seletor "Setor"
(opções `beautySalon:Salão de beleza;aestheticClinic:Clínica de estética`) e o botão "Ativar contabilidade".
```text
[eval] A contabilidade automática desta unidade não está ativa — as vendas não geram lançamento.
```
Grau: verificado. **Confere.**

**Passo 2 — confirmação.** [print](runbook-evidence/ATIVACAO-CONTABIL-2026-11-04/passo2-01-confirmacao.png)
```text
[texto [role=dialog]]
Ativar a contabilidade desta unidade?
Setor: Salão de beleza. Ao confirmar, (1) o plano de contas padrão é instalado se o da unidade estiver vazio e (2) o período do mês corrente é aberto se ainda não existir.
Cancelar
Ativar
```
Grau: verificado. **Confere.** Nota (inferido, lido no código): o plano já estava instalado antes da confirmação — as 55
contas da unidade nasceram às 03:15:05Z, no `GET /api/accounting/accounts` da aba Perfil fiscal, porque
`PostingService.listAccounts` semeia no 1º acesso (`server/src/features/accounting/services/PostingService.ts:875`). O
efeito (1) foi, portanto, no-op nesta execução. Achado A-1.

**Passo 3 — confirmar.** Clique em "Ativar".
```text
[net] POST /api/accounting-binding/activate-default -> 200  req: {"unitId":"cmw1jmmm80001cio0p4jszyhm","sectorKey":"beautySalon","installChartIfEmpty":true,"openCurrentPeriodIfMissing":true}
   res: {"success":true,"data":{"status":"Active","bindingVersion":1,"kit":{"kitKey":"beautySalon","kitVersion":6,"status":"INSTALLED"}}}
[eval] toasts: ["Contabilidade automática ativa.\nVer pendências da unidade"]
[eval] {"faixa":false,"linkPendencias":true,"abaPendencias":true}
```
[print do toast](runbook-evidence/ATIVACAO-CONTABIL-2026-11-04/passo3-01-toast.png) ·
[print sem a faixa](runbook-evidence/ATIVACAO-CONTABIL-2026-11-04/passo3-02-faixa-sumiu.png). No banco (leitura):
```text
accounting_bindings: cmw1jrmd8005hcio0ihdmv4qr | cmw1jmmm80001cio0p4jszyhm | Active | beautySalon
accounting_periods:  2026/11 OPEN; 2026/1..10 e 2026/12 FUTURE
```
Grau: verificado. **Confere**, com desvio do roteiro escrito: o roteiro diz que o link "Ver pendências da unidade" **não**
aparece porque a aba Pendências ainda não existia (I5 PR-3). Hoje a aba existe (`abaPendencias: true`), e o link aparece. A
premissa do roteiro venceu; o comportamento segue a condição que o roteiro descreve.

**Passo 4 — venda sem reiniciar o servidor.** O servidor (PID do `:4100`) ficou de pé desde o boot. Nova Venda → Serviços,
unidade `Unidade C7 Ativacao`, cliente `Cliente H2`, serviço `Corte H2`; **Salvar Rascunho** e **Finalizar** pela lista
(caminho da emenda F11 do `RUNBOOK-H2-VENDA-PACOTE.md`) — [print dos itens](runbook-evidence/ATIVACAO-CONTABIL-2026-11-04/passo4-01-venda-itens.png).
```text
[net] POST /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data -> 201  req: {"data":{"date":"2026-11-04","customerId":"cmvtxuu6b000pci9c3yk4b6n2","simpleCustomer":false,"unitId":"cmw1jmmm80001cio0p4jszyhm","status":"Draft","paymentStatus":"Pending","subtotal":80,"totalAmount":80,"paymentMethod":"Pix"}}
[net] POST /api/dynamic-tables/cmuw4yqvo0011cii0biovlxj9/data -> 201  req: {"data":{"saleId":"cmw1jt7q2005jcio0ob5flzox","serviceId":"cmvtxuu71000tci9chpnj578o","type":"Service","quantity":1,"unitPrice":80}}
[net] PUT /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data/cmw1jt7q2005jcio0ob5flzox -> 200  req: {"data":{"status":"Finalized"}}
```
Aba "Lançamentos" da unidade ([print](runbook-evidence/ATIVACAO-CONTABIL-2026-11-04/passo4-02-lancamentos-unidade.png)):
```text
2026/0001	04/11/2026	Receita salão — Venda cmw1jt7q2005jcio0ob5flzox	R$ 80,00	R$ 80,00	Postado
journal_entries: cmw1jzdco005xcio07svwdap8 | Posted | sale.finalized | cmw1jt7q2005jcio0ob5flzox
```
Grau: verificado. **Confere.**

**Passo 5 — guarda do 2º setor.** `fetch` no navegador logado (cookie `auth_token`), mesma unidade:
```text
[net] POST /api/accounting-binding/activate-default -> 409  req: {"unitId":"cmw1jmmm80001cio0p4jszyhm","sectorKey":"aestheticClinic"}
[eval] HTTP 409 {"code":"BINDING_SECTOR_CONFLICT","message":"A unidade 'cmw1jmmm80001cio0p4jszyhm' já tem a contabilidade do setor 'beautySalon'; um setor por unidade — não ativa 'aestheticClinic'."}
accounting_bindings depois: cmw1jrmd8005hcio0ihdmv4qr | cmw1jmmm80001cio0p4jszyhm | Active | beautySalon   (nenhum binding novo)
```
Grau: verificado. **Confere.**

Console: dois vermelhos, os dois esperados pelo roteiro — `404` do `GET /fiscal-profile` antes do perfil existir
(pré-condição) e `409` do passo 5.

### Desfecho (execução 2026-11-04)
[x] PASSOU — os passos 1–5 com evidência conferindo com o esperado. Desvios escritos: unidade e perfil fiscal criados pela
tela para cumprir a pré-condição; passo 3 com o link de Pendências presente porque a aba já existe; passo 4 finalizado pela
lista (emenda F11), não pelo botão do modal.

### Registro (execução 2026-11-04)
- Achados: **A-1** (baixo, desenho) — a confirmação promete "(1) o plano de contas padrão é instalado se o da unidade
  estiver vazio", mas qualquer leitura da aba que liste contas já semeia o plano (`PostingService.ts:875`, comentário
  "Idempotently seeds the canonical chart of accounts first"). A frase não mente, mas o efeito (1) quase nunca acontece
  pela ativação. Sem teste-guarda: é pergunta de texto/desenho, não bug.
- Desvios de dado no dev.db: unidade `cmw1jmmm80001cio0p4jszyhm` + 55 contas + perfil fiscal + binding
  `cmw1jrmd8005hcio0ihdmv4qr` + 12 períodos 2026 + venda `cmw1jt7q2005jcio0ob5flzox` e o lançamento
  `cmw1jzdco005xcio07svwdap8`.
- Rastreio: a nota LAC-B fica para o fold do dono (este PR não toca `docs/plano/`).
- Assinatura do executor: agente claude-opus-5-5, AI tester, sob autorização do dono (chat, 2026-11-02). A assinatura
  atesta a execução e a conferência da evidência; não substitui oráculo externo.
