# BRIEF — FIX-TESTES-I1B-BOOT-POS-REKEY (nó I1b): o boot relê o binding re-chaveado, provado por teste

> **Estado:** BRIEF de correção, 04/11/2026. Sem código e sem `executa`. Os forks estão em **RATIFICAÇÃO PENDENTE**.
> Régua: [`APRENDIZADOS-TESTES-2026-11-04.md`](../operating-manual/APRENDIZADOS-TESTES-2026-11-04.md) (A1, A2, A5, A6).

## 0. Contexto fixo

- **Item:** passo 10 do `RUNBOOK-I1B-UNIT-REKEY.md` (l. 85–88): *"Restart e boot … boot sem `Boot ABORTADO`;
  `GET /api/accounting/accounts?unitId=<novo>` responde 200 com as contas re-chaveadas"*. No inventário de testes (PR #1065,
  §3 e §4.4), esse passo é **AUTO** e está classificado como "falta".
- **Autorização:** dono, chat, 04/11 (sessão "Playwright: screenshot, CLI e DevTools"): *"Já vai atualizando todas os
  aprendizados nos locais onde são briefs, e onde já estiver implementado, você também já cria briefs de correção de acordo
  com o aprendizado."* Cobre **este BRIEF**. Executar pede `executa` próprio (ORCH-006).
- **Fatos lidos (verificado, 04/11, `origin/main` 66f2d5d97):**
  - `server/src/server.ts:41–42`: o `bootstrap()` chama `ApplicationFactory.getInstance().initializeAccountingSyncFromBindings()`
    antes do `app.listen()`. Falha → `Boot ABORTADO` (`:69`) e `process.exit(1)`.
  - `server/src/jobs/rekeyLegacyUnitCli.ts:51`: `AccountingBinding` está na lista REKEY. Ou seja, o CLI move o binding para
    o `unitId` novo.
  - `server/src/jobs/__tests__/rekeyLegacyUnitCli.integration.test.ts`: 14 casos (`:149`–`:468`). **Nenhum** semeia
    `AccountingBinding` no legado, e nenhum chama o alimentador depois do `--apply`. O
    `rekeyLegacyUnitCli.boot.test.ts` só confere que o boot não chama o rekey.
  - `server/src/lib/__tests__/factory.initializeAccountingSyncFromBindings.integration.test.ts`: prova o alimentador sobre
    SQLite real (zero binding → `NoActiveAccountingBindingsError`; com binding → mapper por unidade, sem empréstimo). É o molde.
- **Por que é lacuna (A2):** o passo 10 só falha num estado que nenhum teste monta: um binding `Active` que **nasceu sob o
  legado** e foi movido pelo `--apply`. É o mesmo padrão do IMO-1 (o teste existe, mas não no estado do bug).

## 1. Checklist de comportamentos

Sessão: **`sessao-instrumentacao`** primeiro, porque não se sabe se o passo 10 passa. Se o teste sair verde, ele é só
cobertura e o runbook perde o passo. Se sair vermelho, o PR fica vermelho de propósito (molde #1053) e segue para a
`sessao-correcao`.

1. **[direto] Cenário no estado do bug.** No `rekeyLegacyUnitCli.integration.test.ts` (ou num arquivo irmão
   `rekeyLegacyUnitCli.bootAfter.integration.test.ts`, F-I1B-1), o dono onboardado recebe, **sob o `unitId` legado**:
   o plano de contas do legado e um `AccountingBinding` `Active` (o `SALE_BINDING_V1` da fixture, como no molde do
   alimentador). Antes do `--apply`, confere que o binding está sob o legado.
2. **[direto] `--apply`** pelo mesmo `cli(applyArgs(...))` dos casos vizinhos, com backup válido. Exit 0.
3. **[direto] Boot relido.** Uma instância nova do alimentador (F-I1B-2) chama `initializeAccountingSyncFromBindings()`
   sobre o mesmo banco. Asserções:
   (a) não rejeita;
   (b) o mapper resolve para o `unitId` **novo** (`to`);
   (c) o `unitId` legado não tem mais mapper (`NoMapperForUnitError`): nada ficou para trás nem foi duplicado.
4. **[direto] Rota relida (A6).** `GET /api/accounting/accounts?unitId=<to>` pela HTTP (`makeApp` + `authHeader` do dono)
   → 200, com as mesmas contas (código e nome) que o legado tinha antes do `--apply`. E
   `GET …?unitId=<legado>` → a resposta que o código dá hoje para unidade inexistente (o teste cita a linha).
5. **[direto] Runbook encolhe (A5).** Se 1–4 passarem, o passo 10 do `RUNBOOK-I1B-UNIT-REKEY.md` passa a citar o teste e
   fica só com o que é OPS: subir o build de produção sobre o dado real e colar o log. A edição do runbook vai no mesmo PR.
6. **[cond: vermelho]** Se 3 ou 4 reprovar, o PR para aqui, vermelho de propósito, e a causa vira o item da
   `sessao-correcao` (diff mínimo no CLI ou no alimentador, só no que o teste aponta).

## 2. Contratos

Nenhum contrato novo. O teste usa:
- `cli(args) → { code: number; out: string }` (helper do arquivo);
- `ApplicationFactory` com instância nova (F-I1B-2);
- `SALE_BINDING_V1` de `features/accountingBinding/fixtures/saleBinding`.

Gates do diff: `tsc` do server com `tsconfig.test.json`. Rodar local só o arquivo:
`cd server && npx jest src/jobs/__tests__/<arquivo> --selectProjects integration --runInBand`.

## 3. Forks (RATIFICAÇÃO PENDENTE)

### F-I1B-1 — Onde o caso mora
- (a) No `rekeyLegacyUnitCli.integration.test.ts`, como 15º caso. Reaproveita `onboardedOwner`, `seedLegacy` e `backup`.
- (b) Arquivo irmão. O shard fica mais leve, mas os helpers locais são duplicados ou extraídos.
- **Recomendação:** (a). O arquivo já tem os helpers, e extrair muda arquivo além do item.

### F-I1B-2 — Como obter um alimentador "recém-bootado"
- (a) `ApplicationFactory` novo por construtor ou reset, se o código permitir (a sessão confere em `lib/factory.ts`).
- (b) `AccountingBindingFeederService` direto sobre o repositório real, sem a factory.
- **Recomendação:** (a), porque é o que o `server.ts` chama. Se não houver reset sem tocar código de produção, (b), e o
  BRIEF registra que o `server.ts` em si continua sem teste (como o molde já declara).

## 4. Pendente de validação externa

Nenhum. É ligação de código, sem regra fiscal.

## 5. Insumos ausentes

- Se a `ApplicationFactory` é singleton sem reset (decide o F-I1B-2). Não li `lib/factory.ts` inteiro.

## 6. Achados fora de escopo

- O `server.ts` sobe sozinho no import, e não há teste dele (o molde declara isso). Não se planeja aqui.
