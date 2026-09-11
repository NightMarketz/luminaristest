# BRIEF — BE-INCR-NFE-COST-REGIME (custo de aquisição D3 da NF-e por REGIME do tenant) — nó X6

> Produzido em `sessao-planejamento` (2026-09-11), rodada 10 do
> [plano SDD](PLANO-SDD-SEQUENCIAL-2026-09-07.md), nó **X6** do [grafo 11/09](GRAFO-DEPENDENCIAS-2026-09-11.md).
> **É a emenda do `ADR-INCR-NFE §D3`** que o próprio ADR exigia antes de qualquer molde não-salão reusar
> `lib/nfe.ts` ("flag/guarda de regime — recuperabilidade de ICMS por tenant — que troque a fórmula").
> **Este documento NÃO escreve código** — checklist + contratos esboçados + forks PENDENTES.

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** X6 — o custo de aquisição que valoriza o estoque na importação de NF-e de compra
  (`NfeImportService.acquisitionCost`, D3/F-NFE6) deixa de ser fórmula fixa do molde-salão e passa a ser
  **configuração por tenant**. `PLANO-SDD-SEQUENCIAL-2026-09-07.md` §2 rodada 10 (reescrita pelo grafo
  11/09: "deixa de esperar D1 — resposta 5").
- **Autorização:** [`CEDULA-DECISAO-2026-09-10-entrevista.md`](CEDULA-DECISAO-2026-09-10-entrevista.md) §2
  **resposta 5** — pergunta *"ICMS entra no custo ou é crédito"*, resposta literal *"Cobrir todas as
  possibilidades"*, consequência registrada: *"O custo D3 vira configuração por tenant (contribuinte/não,
  ST, monofásico), não uma fórmula fixa. Emenda o `ADR-INCR-NFE §D3` sem depender do contador."*
  Instrução do dono de 2026-09-11 §2.6.c: *"Rodada 10 — X6 custo D3 sob Lucro Real: emenda do ADR-INCR-NFE
  §D3 para CONFIGURAÇÃO por tenant (contribuinte/não, ST, monofásico) → `sessao-planejamento` → feature."*
  **Cobre exatamente:** o mecanismo de configuração + a fórmula por regime. **Não cobre:** apuração de
  PIS/COFINS/ICMS (ADR X7/X8), emissão (X10), nem a posição de risco do contador (item 2 do pedido — vira
  verificação a posteriori, CTD-002).
- **Insumos existentes (lidos nesta sessão, arquivo:linha):**
  - `docs/adr/ADR-INCR-NFE-fiscal-ingestion.md` §D3 (:134-151), §6 risco 1 (:229-233), F-NFE6 (:222),
    "o que NÃO muda" (:335 — `vICMS` como dívida de contador, agora superada pela resposta 5).
  - `server/src/features/accounting/services/NfeImportService.ts:101-111,147-151` — `acquisitionCost(t)`
    = `vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vST` (header `ICMSTot`), rateio por `vProd` com
    resíduo na última linha (:155-210).
  - `server/src/lib/nfe.ts:46-69,201-216` — `NfeItem` NÃO carrega imposto por item; `NfeTotais` traz
    `vICMSCents` (W04) lido e **não usado**. Transcrição `BE-INCR-NFE-layout-transcription.md:9` declara
    os IDs de imposto por item (`vICMSST`/`vIPI` por grupo de CST) como **PARCIAL, fora do MVP**.
  - `docs/accounting/TRIAGEM-CONTADOR-2026-09-03-SIMULACAO.md:82-83` — T1a (split custo × base de crédito)
    e T1b (recuperabilidade por tenant/fornecedor; IPI na base) e as fontes que cita.
  - `docs/accounting/CEDULA-DECISAO-2026-09-03-integracao.md:108` regra **(j)**: "o resultado de D3 sai com
    dois campos, `custoEstoqueCents` e `baseCreditoPisCofinsCents`" — **verificado: NÃO está no código**
    (`grep baseCredito server/src` = 0). Ver §6 achado 1.
  - `docs/adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md:116-120,180` — F-DFE-6 → **(a)** `FiscalProfile` Prisma
    por `unitId` (IM, CNAE, regime tributário, `codMun`, `optanteSimples`, …), ainda **não implementado**
    (espera D5/X10i). É o candidato natural a hospedar a configuração deste item (Fork F-X6-1).
  - `docs/accounting/PEDIDO-CONTADOR-2026-09-03.md:43-50` item 2 — a posição de risco (não a regra).
  - `server/src/features/accounting/scope/AccountingScope.ts:41-42` — a única "configuração" de tenant
    hoje é constante (`baseCurrencyCode`, `timeZone`); não há entidade de settings contábeis.
- **Nós vizinhos:** consome `lib/nfe.ts` (parser, F0-2), `NfeImportService.importPurchase` →
  `PayableService.createPayable` (débito 1.1.6 pelo `amountCents` = custo) → `InventoryService.receiveStock`
  (custo médio móvel). É consumido por: tie-out de estoque (LAC-E, Σ `totalValueCents` × 1.1.6), CMV. **Não
  toca** o AR/venda (`NfeSaleReconciliationService`) nem a conciliação. Tensão R8 (`units.cnpj` × "1 instância
  = 1 CNPJ") atinge a chave do perfil (por `unitId`) — apresentada, não resolvida (Fork F-X6-1, nota).

## Definição de pronto

Igual ao formulário: checklist numerado + contratos esboçados + forks listados, não decididos.

---

## 1. Checklist de comportamentos

Tags: **[direto]** implementável sem fork; **[cond:F-X6-n]** pausa até o fork; **[pendente-externa]** só §4.

### Fase 0 — Schema (serial)

1. **[cond:F-X6-1]** Entidade de configuração fiscal do tenant (Prisma first-class, §2.1 — invariante de
   dinheiro nunca vira campo solto de preset) com, no mínimo, os eixos que decidem o custo D3:
   `icmsContribuinte: Boolean` (crédito de ICMS próprio recuperável na compra para revenda),
   `pisCofinsRegime: 'SIMPLES' | 'CUMULATIVO' | 'NAO_CUMULATIVO'` (persistido já; efeito no custo só sob
   F-X6-3), `regimeTributario: 'SIMPLES' | 'PRESUMIDO' | 'REAL'` (informativo/consistência). Chave =
   escopo (`userId` + `unitId`), soft-delete, `@@unique([userId, unitId])`. Migração **aditiva pura**
   (`CREATE TABLE IF NOT EXISTS`, prólogo da classe `migracao-sqlite-nao-e-transacional`). Testável:
   `prisma migrate diff` = no difference; smoke sobre cópia do `dev.db` real (tabela nova = sem dado, PASS
   não-vacuoso por classe).
2. **[direto]** Repositório + interface (`IFiscalProfileRepository`: `findByScope`, `upsert`, `softDelete`,
   `tx?` em todos), policy (`canReadFiscalProfile`/`canManageFiscalProfile` em `IAccountingPolicy` —
   escrita = mesma régua de `canManageData`), factory (injeção, zero `new` em serviço).
3. **[direto]** DTOs Zod `.strict()`: `UpsertFiscalProfileSchema` (§2), `FiscalProfileScopeQuerySchema`;
   snapshot de shape regenerado. Testável: campo extra → 400; enum fora do alfabeto → 400.
4. **[direto]** Rotas (ACC-016, 2 toques: `index.ts` + `docs.paths.ts`): `GET /api/accounting/fiscal-profile`
   e `PUT /api/accounting/fiscal-profile` (upsert por escopo — comando idempotente, não `PATCH` genérico).
   `npm run docs:generate` + BASELINE do `openapi-paths.test.ts` (+1 path, 2 operações; contar PATHS).
5. **[direto]** Auditoria: `fiscal_profile.updated` na allowlist de `auditCanonical.ts` **na mesma mudança**,
   payload id-only + os 3 eixos (enum/boolean, sem texto livre — nada em `auditFreeTextMask`). Testável:
   teste-guarda do padrão #255/#258.

### Fórmula por regime (o núcleo — cada linha com a fonte que a sustenta, §4 para o grau)

6. **[cond:F-X6-1, F-X6-6]** `NfeImportService.importPurchase` lê o perfil fiscal do escopo **antes** de
   computar o custo. Sem perfil → comportamento do Fork **F-X6-6** (bloquear × default). Testável: teste de
   serviço com perfil ausente reproduz exatamente o caminho ratificado.
7. **[direto]** Fórmula base **inalterada** para o tenant não-contribuinte (o que hoje existe vira o ramo
   `icmsContribuinte=false`): `custo = vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vST` — ICMS próprio
   **incluso** (tributo não recuperável integra o custo — RIR/2018 art. 301 §3 a contrario; CPC 16 item 11).
   Testável: fixture atual do `NfeImportService.test.ts:20` continua dando 19333 sob perfil não-contribuinte.
8. **[cond:F-X6-2]** Ramo `icmsContribuinte=true`: ICMS próprio recuperável **sai** do custo —
   `custo = … − vICMS_recuperável`. O que é "recuperável" por item depende do Fork **F-X6-2** (parser por item
   × total do header). **ICMS-ST nunca sai** (não é recuperável para o substituído — compõe custo; §4 f2).
   Testável: mesma nota, perfil contribuinte → custo menor exatamente pelo `vICMS` (ou pela Σ dos `vICMS`
   dos itens com direito a crédito, sob F-X6-2 a); perfil não-contribuinte → 19333.
9. **[direto]** Invariante de rateio preservado: `Σ custo_item === custoTotalCents` em **ambos** os ramos
   (resíduo na última linha, BigInt). Testável: nota com desconto+frete+IPI+ICMS que não dividem exato.
10. **[cond:F-X6-3]** PIS/COFINS: sob a recomendação (a) o custo **não** subtrai crédito de PIS/COFINS neste
    incremento; `pisCofinsRegime` é persistido e **lido** só para (i) rejeitar combinação inconsistente
    (`SIMPLES` + `icmsContribuinte=true` → 400, ver §4 f4) e (ii) preencher o segundo campo da regra (j)
    (`baseCreditoPisCofinsCents = custo − vST`, sem ICMS próprio até T1b) **sem efeito contábil**. Testável:
    o campo aparece no resultado do preview/import e o passivo/estoque não mudam por ele.
11. **[cond:F-X6-4]** Monofásico: **por produto, não por tenant** — só faz sentido com o crédito de PIS/COFINS
    (F-X6-3). Sob a recomendação, **nada no custo** neste incremento; entra como pendência nomeada (§4 f3).
12. **[direto]** `POST /api/nfe/preview` devolve `custoEstoqueCents`, `baseCreditoPisCofinsCents` e o
    `regimeAplicado` (eco do perfil) — o operador vê **antes** de importar qual fórmula vai valer.
    Testável: preview HTTP com os dois perfis devolve custos diferentes para o mesmo XML.
13. **[direto]** Auditoria do import (`payable.created` já existe): payload ganha `costRegime`
    (`'NAO_CONTRIBUINTE' | 'CONTRIBUINTE_ICMS'`) — allowlist na mesma mudança. Rastreia qual fórmula
    valorizou o estoque. Testável: guarda de allowlist.

### Migração de dado e retro-compatibilidade

14. **[cond:F-X6-5]** Notas **já importadas** (custo capitalizado sob a fórmula antiga): sob a recomendação
    (a) **não são reprocessadas** — custo médio móvel e postings já feitos não se reescrevem (ACC-018: correção é
    lançamento novo, nunca edição). Registro no BRIEF; se um tenant contribuinte já importou nota, é ajuste
    manual de estoque (fora deste incremento). Testável: nenhuma migração de dado toca `payables`/
    `stock_movements` (o smoke prova ausência de rebuild).
15. **[direto]** `reconcilePayables`/re-drive (Gap 2 do INVENTORY) **não recomputa** custo — usa o
    `amountCents` persistido. Testável: teste existente do re-drive continua verde com perfil contribuinte.

### Gates que o diff aciona

16. **[direto]** `tsc` ×2; unit + `npm run test:integration`; snapshot de shape; `docs:generate` + BASELINE;
    allowlist (itens 5 e 13); smoke sobre cópia do `dev.db` real (tabela nova).
17. **[direto]** Emenda do `ADR-INCR-NFE §D3` **no mesmo PR** (o ADR dizia "antes de qualquer molde
    não-salão reusar `lib/nfe.ts`": este item é o cumprimento; a linha :335 "vICMS como dívida de contador"
    é HISTÓRICA — a resposta 5 descondicionou).

---

## 2. Contratos esboçados

### Prisma — `FiscalProfile` (sob F-X6-1 a)

```prisma
model FiscalProfile {
  id                 String   @id @default(cuid())
  userId             String   // AccountingScope.ownerUserId
  unitId             String   // 1 perfil por unidade (tensão R8: "1 instância = 1 CNPJ" — apresentada, não resolvida aqui)
  regimeTributario   String   // SIMPLES | PRESUMIDO | REAL (informativo; consistência com os dois abaixo)
  icmsContribuinte   Boolean  @default(false) // crédito de ICMS próprio na compra para revenda
  pisCofinsRegime    String   // SIMPLES | CUMULATIVO | NAO_CUMULATIVO (persistido; efeito no custo só sob F-X6-3)
  createdById        String?
  updatedById        String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  deletedAt          DateTime?
  @@unique([userId, unitId])
  @@map("fiscal_profiles")
}
```

Campos do ADR-DFE (IM, CNAE, `codMun`, série) **não entram aqui** — chegam pelo BRIEF `BE-INCR-DFE` como
`ADD COLUMN` sobre esta tabela (regra 5: não dimensionar além do item).

### Zod — entrada

```ts
export const UpsertFiscalProfileSchema = z
  .object({
    unitId: z.string().min(1),
    regimeTributario: z.enum(['SIMPLES', 'PRESUMIDO', 'REAL']),
    icmsContribuinte: z.boolean(),
    pisCofinsRegime: z.enum(['SIMPLES', 'CUMULATIVO', 'NAO_CUMULATIVO']),
  })
  .strict()
  .superRefine((v, ctx) => {
    // §4 f4 — combinações sem base: Simples Nacional não apura ICMS/PIS/COFINS pelo regime normal.
    if (v.regimeTributario === 'SIMPLES' && (v.icmsContribuinte || v.pisCofinsRegime !== 'SIMPLES')) ctx.addIssue({ code: 'custom', message: '…' });
    if (v.regimeTributario !== 'SIMPLES' && v.pisCofinsRegime === 'SIMPLES') ctx.addIssue({ code: 'custom', message: '…' });
  });
```

### Função pura de custo (substitui `acquisitionCost` privado)

```ts
export interface CostRegime { icmsContribuinte: boolean }
export interface AcquisitionCost {
  custoEstoqueCents: number;            // valoriza 1.1.6 (amountCents do Payable)
  baseCreditoPisCofinsCents: number;    // regra (j): custo − vST (sem ICMS próprio até T1b); SEM efeito contábil neste incremento
  regimeAplicado: 'NAO_CONTRIBUINTE' | 'CONTRIBUINTE_ICMS';
}
export function acquisitionCost(t: NfeTotais, itens: NfeItem[], regime: CostRegime): AcquisitionCost;
// não-contribuinte: vProd − vDesc + vFrete + vSeg + vOutro + vIPI + vST
// contribuinte:     idem − ICMS recuperável  (F-X6-2 a: Σ vICMS dos itens com crédito · b: ICMSTot.vICMS)
```

### Saída do preview (`POST /api/nfe/preview`) — campos novos

```ts
{ ...resumoAtual, custo: { custoEstoqueCents: string, baseCreditoPisCofinsCents: string, regimeAplicado: string } }
```

---

## 3. Forks NOVOS — RATIFICAÇÃO PENDENTE (nenhum se auto-ratifica)

### F-X6-1 — Onde vive a configuração
- **(a) `FiscalProfile` Prisma por escopo, criado AGORA com os eixos do custo** (é a mesma entidade que o
  `ADR-INCR-DFE` F-DFE-6 → (a) já ratificou para IM/CNAE/regime/`codMun`; o DFE acrescenta colunas depois).
  Custo de errar: o DFE pode querer outra granularidade (por CNPJ, não por `unitId`) — tensão R8; mitigado
  porque a chave hoje é o escopo contábil real (`userId`+`unitId`).
- (b) tabela estreita `InventoryCostPolicy` só para o custo — duplica "regime" quando o DFE chegar.
- (c) campos no preset `units` (DynamicTable) — **rejeitado pela fronteira §2.1** (F-DFE-6 já descartou).
- **Recomendação: (a).** Uma entidade canônica de regime por tenant; o DFE herda em vez de duplicar.

### F-X6-2 — De onde sai o ICMS recuperável do contribuinte
- **(a) Parser lê o ICMS por item** (`det/imposto/ICMS/ICMS00|10|20|51|70|90…/vICMS`, MOC 7.0 Anexo I grupo N —
  fonte pública, mesma da transcrição F0-2) e o crédito é a Σ dos `vICMS` dos itens; a base de rateio do
  custo por item passa a ser `vProd_item − vICMS_item`. Exato por item; custo de errar: estende a
  transcrição F0-2 (grupo N, marcado PARCIAL em `:9`) e o parser — teste com fixture que misture itens
  com e sem ICMS.
- (b) `ICMSTot.vICMS` (W04, já parseado) subtraído do total e rateado proporcional a `vProd` — 0 mudança no
  parser; **aproxima** quando itens da mesma nota têm CST diferentes (um com crédito, outro ST/isento):
  o item isento absorveria parte do desconto de ICMS que não é dele.
- **Recomendação: (a)** — invariante de dinheiro por item (custo médio móvel é por SKU; rateio errado entre
  SKUs distorce CMV mesmo com Σ correta). Preferência registrada do dono: completude, não MVP.

### F-X6-3 — Crédito de PIS/COFINS no custo, neste incremento?
- **(a) Não agora.** Persiste `pisCofinsRegime`, preenche `baseCreditoPisCofinsCents` (regra (j)) **sem
  efeito** contábil; a subtração do crédito (1,65% + 7,6% sobre a base) e suas exceções (monofásico, ICMS
  fora da base desde a Lei 14.592/23, IPI na base — IN 2.121/22 contestada, fornecedor do Simples — ADI SRF
  15/2007) ficam para o ADR de apuração (X7/X8), que é onde o crédito é escriturado. É o T1b: "aguarda
  contador + advogado".
- (b) Subtrair já — exige decidir hoje as 4 exceções acima sem fonte no corpus e sem a posição do contador.
- **Recomendação: (a).** A resposta 5 perguntou sobre **ICMS**; PIS/COFINS entra como configuração persistida
  (para não migrar duas vezes), não como fórmula.

### F-X6-4 — Monofásico
- (a) Atributo **do produto** (NCM/flag) que só tem efeito sob crédito de PIS/COFINS → **diferido junto
  com F-X6-3**, nomeado aqui para não sumir.
- (b) Flag por tenant "todas as compras monofásicas" — modelo errado (é por produto).
- **Recomendação: (a).**

### F-X6-5 — Notas já importadas sob a fórmula antiga
- **(a) Não reprocessar** (ACC-018; custo médio e postings já feitos); ajuste é lançamento manual.
- (b) CLI de recálculo que estorna e re-lança — reabre postings fechados, toca período.
- **Recomendação: (a).** `dev.db` real tem `payables` **vazias** (medido 2026-09-11) — hoje o custo de (a) é zero.

### F-X6-6 — Import de NF-e sem perfil fiscal cadastrado
- **(a) Bloquear:** `POST /api/nfe/purchase` e `/preview` → 400 "perfil fiscal da unidade não cadastrado"
  (precedente do dono 2026-09-07: "nenhum sistema nasce com dado inventado" — `unit` obrigatório, F-I1-2 b).
  Custo de errar: o fluxo de sign-off H2 (parte NF-e) passa a exigir o cadastro do perfil antes — o runbook
  ganha um passo; o onboarding (nó I1/W-wizard) ganha o perfil como campo.
- (b) Default `NAO_CONTRIBUINTE` com aviso no preview — mantém o H2 como está; risco: tenant contribuinte
  importa sob fórmula errada em silêncio (exatamente o risco ALTO que o ADR nomeou).
- **Recomendação: (a).**

---

## 4. Pendente de validação externa (regra de domínio — fonte citada, grau declarado)

| # | Regra | Fonte | Grau / o que falta |
|---|---|---|---|
| f1 | Tributo **recuperável** não integra o custo de aquisição; o não-recuperável integra | RIR/2018 (Decreto 9.580/2018) art. 301 §3; CPC 16 (R1) item 11 | **[NC] — citado de memória de norma pública; NÃO está em `docs/accounting/fontes-oficiais` (que, por sua vez, não está em `main` — nó D3b).** Incorporar ao corpus antes da `sessao-feature` |
| f2 | ICMS-ST não é recuperável para o substituído → compõe o custo | STJ Tema 1231 (repetitivo) — `TRIAGEM-CONTADOR-2026-09-03-SIMULACAO.md:41` confirma o teor por URL oficial do TJRO/NUGEPNAC | **verificado por URL** na triagem; não no corpus |
| f3 | Monofásico: aquisição de bem sujeito a alíquota zero/monofásica não gera crédito | Lei 10.833/2003 art. 3º §2º II | [NC]; só tem efeito sob F-X6-3 — fora do custo neste incremento |
| f4 | Simples Nacional não apura ICMS/PIS/COFINS pelo regime normal (sem crédito na compra) | LC 123/2006 art. 23 | [NC]; sustenta o `superRefine` do DTO |
| f5 | ICMS fora da base do crédito de PIS/COFINS (05/2023) · IPI na base (IN 2.121/22) · fornecedor do Simples (ADI SRF 15/2007) | Lei 14.592/2023; IN RFB 2.121/2022; ADI SRF 15/2007 | [NC] — **pertencem ao ADR de apuração**, listadas aqui porque a regra (j) as toca; item 2 do pedido ao contador cobre a **posição de risco** |

**Posição do contador (item 2 do pedido)** continua útil como verificação a posteriori (CTD-002) — a
configuração existe para refletir a posição dele por tenant; não é gate deste BRIEF.

## 5. Insumos ausentes

- **D3b** — corpus `docs/accounting/fontes-oficiais/` não está em `main` (branch local
  `claude/mit-api-integration-queue-0e8847`); e mesmo lá **não contém** RIR/2018, CPC 16, Lei 10.833, LC 123.
  A `sessao-feature` precisa de f1/f2 no corpus (ou de link oficial verificado) antes de escrever a regra.
- **Transcrição do grupo N do MOC** (ICMS por item) — F0-2 a estender sob F-X6-2 (a); fonte pública já citada
  na transcrição existente.
- **Volume real**: `payables` do `dev.db` real vazias (2026-09-11) — F-X6-5 sem custo hoje; smoke da tabela
  nova é PASS por classe (tabela nova), não por dado.

## 6. Achados fora de escopo

1. **Regra (j) da cédula de integração (T1a) NÃO foi implementada** no rebase da NF-e: o resultado de D3 tem
   um campo só (`custoTotalCents`), sem `baseCreditoPisCofinsCents`. Este BRIEF a absorve no item 10 (sem
   efeito contábil) — registrado como dívida do #267, não como decisão nova.
2. **`InventoryService.receiveStock` recebe `totalValueCents` por SKU** — sob F-X6-2 (a) a base de rateio muda
   (`vProd − vICMS` por item); o custo médio móvel absorve sem mudança de contrato. Verificar no
   implementador que o `Σ shares === custoTotalCents` continua sendo a guarda.
3. **Tensão R8** (`units.cnpj` × "1 instância = 1 CNPJ"): a chave do perfil por `unitId` é a do escopo
   contábil de hoje; se o M2 fixar 1 CNPJ por instância, o perfil colapsa para 1 linha — sem migração
   destrutiva. Apresentado ao dono no grafo 11/09 (R8), não resolvido aqui.
4. **Onboarding (nós I1/W do wizard)** deve ganhar o perfil fiscal como passo sob F-X6-6 (a) — frente do
   plano do wizard, não deste BRIEF.

---

## 7. Plano de execução por fatias (para a `sessao-feature`)

**Fase 0 — Schema + entidade (serial):** itens 1–5 (perfil: model, repo, policy, factory, DTO, rotas,
auditoria) — independe dos forks de fórmula; abre assim que F-X6-1 e F-X6-6 forem ratificados.
**Fase A — Fórmula:** itens 6–13 (parser por item sob F-X6-2 a; função pura; preview; auditoria do import).
**Fase B — Docs:** itens 14–17 (ADR emendado no mesmo PR).
`luminaris-reviewer` independente ao fim; mutação manual obrigatória sobre a função de custo (trocar o
sinal de `vICMS`, trocar `vST` de lado) e sobre o `superRefine`.

## 8. Gates de envio [OPS-001]

1. **Objetivo:** a resposta 5 pediu "cobrir todas as possibilidades" do ICMS no custo — este BRIEF cobre
   contribuinte/não (fórmula), ST (sempre custo, f2) e monofásico (nomeado, diferido com o crédito de
   PIS/COFINS — F-X6-4) — e diz onde cada um vive.
2. **Grau:** o que está no código foi lido (`NfeImportService.ts:150-151`, `nfe.ts:46-69`); as regras
   fiscais f1–f5 são **[NC]** até entrarem no corpus — por isso estão na §4, não como decididas.
3. **Adversarial:** tentei fechar o item sem entidade nova (constante em `AccountingScope`) — cai na
   primeira segunda unidade com regime diferente; tentei "só header `vICMS`" (F-X6-2 b) — uma nota com item
   ST + item tributado rateia crédito para o item errado.
4. **Checagem que teria falhado:** `grep baseCredito server/src` vazio provou que a regra (j) não existe —
   se existisse, o item 10 seria "manter", não "criar".
5. **Risco principal:** as fontes fiscais desta fórmula não estão no repositório; o viés é tratar norma
   lembrada como norma verificada — declarado como [NC] em toda linha.
